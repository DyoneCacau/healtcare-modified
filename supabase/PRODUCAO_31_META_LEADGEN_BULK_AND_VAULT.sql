-- ============================================================
-- PRODUÇÃO 31 — META LEADGEN EVENTS + VAULT (TOKENS) + BULK
-- ============================================================
-- INSTRUÇÕES:
-- 1. Execute antes: PRODUCAO_25 … PRODUCAO_30.
-- 2. Revise este arquivo antes de executar.
-- 3. No Supabase: SQL Editor > New query > cole TODO o conteúdo > Run.
-- 4. Confirme as consultas de verificação no final.
--
-- Este script NÃO sobe com o deploy da Vercel.
--
-- O que faz:
-- - Tabela `meta_leadgen_events`: controle de idempotência / tentativas
--   (webhook + bulk sync), inclusive falhas que nunca viram crm_lead.
-- - Criptografia dos tokens Meta via Supabase Vault
--   (`access_token_vault_id`, `page_access_token_vault_id`).
-- - RPCs service_role-only para gravar/ler/migrar/apagar secrets.
-- - Migração one-shot dos tokens plaintext existentes para o Vault.
--
-- Mantém a unique em crm_leads(external_lead_id) como 2ª camada.
-- NÃO altera WhatsApp / meta_channels.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Extensão Vault (idempotente)
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ------------------------------------------------------------
-- 1. meta_leadgen_events — controle de leads Meta
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meta_leadgen_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leadgen_id text NOT NULL,
  page_id text NOT NULL,
  form_id text,
  ad_id text,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  source text NOT NULL
    CHECK (source IN ('webhook', 'bulk_sync')),
  status text NOT NULL
    CHECK (status IN (
      'received',
      'processing',
      'ingested',
      'duplicate',
      'skipped',
      'failed'
    )),
  reason text,
  crm_lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  platform text,
  attempt_count integer NOT NULL DEFAULT 1,
  last_error text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_leadgen_events_leadgen_id_key UNIQUE (leadgen_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_leadgen_events_page_id
  ON public.meta_leadgen_events (page_id);

CREATE INDEX IF NOT EXISTS idx_meta_leadgen_events_clinic_status
  ON public.meta_leadgen_events (clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_meta_leadgen_events_status_seen
  ON public.meta_leadgen_events (status, first_seen_at DESC);

DROP TRIGGER IF EXISTS meta_leadgen_events_updated_at ON public.meta_leadgen_events;
CREATE TRIGGER meta_leadgen_events_updated_at
  BEFORE UPDATE ON public.meta_leadgen_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meta_leadgen_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON public.meta_leadgen_events FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.meta_leadgen_events IS
  'Controle de leadgen Meta (webhook + bulk). Sem PII. Somente service_role.';

COMMENT ON COLUMN public.meta_leadgen_events.leadgen_id IS
  'Id do lead na Meta. Unique — idempotência primária.';

COMMENT ON COLUMN public.meta_leadgen_events.status IS
  'received/processing/ingested/duplicate/skipped/failed';

-- ------------------------------------------------------------
-- 2. Colunas Vault em integration_credentials
-- ------------------------------------------------------------
ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS access_token_vault_id uuid;

ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS page_access_token_vault_id uuid;

-- Tokens plaintext passam a ser opcionais (legado até migração / limpeza)
ALTER TABLE public.integration_credentials
  ALTER COLUMN access_token DROP NOT NULL;

COMMENT ON COLUMN public.integration_credentials.access_token IS
  'LEGADO plaintext. Preferir access_token_vault_id (Vault). Nunca expor ao browser.';

COMMENT ON COLUMN public.integration_credentials.page_access_token IS
  'LEGADO plaintext. Preferir page_access_token_vault_id (Vault). Nunca expor ao browser.';

COMMENT ON COLUMN public.integration_credentials.access_token_vault_id IS
  'UUID em vault.secrets do user access token Meta. Somente service_role.';

COMMENT ON COLUMN public.integration_credentials.page_access_token_vault_id IS
  'UUID em vault.secrets do page access token Meta. Somente service_role.';

-- ------------------------------------------------------------
-- 3. RPCs Vault (service_role only)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.meta_vault_store_token(
  p_credential_id uuid,
  p_kind text,
  p_plaintext text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_name text;
  v_desc text;
  v_existing uuid;
BEGIN
  IF p_plaintext IS NULL OR length(trim(p_plaintext)) = 0 THEN
    RAISE EXCEPTION 'token vazio';
  END IF;

  IF p_kind NOT IN ('access_token', 'page_access_token') THEN
    RAISE EXCEPTION 'kind inválido: %', p_kind;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.integration_credentials c WHERE c.id = p_credential_id
  ) THEN
    RAISE EXCEPTION 'credencial inexistente';
  END IF;

  v_name := 'meta_' || p_kind || '_' || p_credential_id::text;
  v_desc := 'Meta ' || p_kind || ' credential ' || p_credential_id::text;

  IF p_kind = 'access_token' THEN
    SELECT access_token_vault_id INTO v_existing
    FROM public.integration_credentials WHERE id = p_credential_id;
  ELSE
    SELECT page_access_token_vault_id INTO v_existing
    FROM public.integration_credentials WHERE id = p_credential_id;
  END IF;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, p_plaintext, v_name, v_desc);
    v_secret_id := v_existing;
  ELSE
    -- Pode já existir pelo name (retry / corrida)
    SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_name LIMIT 1;
    IF v_secret_id IS NOT NULL THEN
      PERFORM vault.update_secret(v_secret_id, p_plaintext, v_name, v_desc);
    ELSE
      v_secret_id := vault.create_secret(p_plaintext, v_name, v_desc);
    END IF;
  END IF;

  IF p_kind = 'access_token' THEN
    UPDATE public.integration_credentials
    SET
      access_token_vault_id = v_secret_id,
      access_token = NULL
    WHERE id = p_credential_id;
  ELSE
    UPDATE public.integration_credentials
    SET
      page_access_token_vault_id = v_secret_id,
      page_access_token = NULL
    WHERE id = p_credential_id;
  END IF;

  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.meta_vault_read_token(
  p_credential_id uuid,
  p_kind text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_plain text;
  v_legacy text;
BEGIN
  IF p_kind NOT IN ('access_token', 'page_access_token') THEN
    RAISE EXCEPTION 'kind inválido: %', p_kind;
  END IF;

  IF p_kind = 'access_token' THEN
    SELECT access_token_vault_id, access_token
      INTO v_secret_id, v_legacy
    FROM public.integration_credentials
    WHERE id = p_credential_id;
  ELSE
    SELECT page_access_token_vault_id, page_access_token
      INTO v_secret_id, v_legacy
    FROM public.integration_credentials
    WHERE id = p_credential_id;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_plain
    FROM vault.decrypted_secrets
    WHERE id = v_secret_id;

    IF v_plain IS NOT NULL AND length(trim(v_plain)) > 0 THEN
      RETURN v_plain;
    END IF;
  END IF;

  -- Fallback legado (pré-migração)
  IF v_legacy IS NOT NULL AND length(trim(v_legacy)) > 0 THEN
    RETURN v_legacy;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.meta_vault_delete_credential_secrets(
  p_credential_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_access uuid;
  v_page uuid;
BEGIN
  SELECT access_token_vault_id, page_access_token_vault_id
    INTO v_access, v_page
  FROM public.integration_credentials
  WHERE id = p_credential_id;

  IF v_access IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_access;
  END IF;
  IF v_page IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_page;
  END IF;

  UPDATE public.integration_credentials
  SET
    access_token_vault_id = NULL,
    page_access_token_vault_id = NULL,
    access_token = NULL,
    page_access_token = NULL
  WHERE id = p_credential_id;
END;
$$;

-- Migra todos os tokens plaintext restantes para o Vault (idempotente)
CREATE OR REPLACE FUNCTION public.meta_vault_migrate_plaintext_tokens()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  r record;
  migrated_access int := 0;
  migrated_page int := 0;
  skipped int := 0;
BEGIN
  FOR r IN
    SELECT id, access_token, page_access_token,
           access_token_vault_id, page_access_token_vault_id
    FROM public.integration_credentials
    WHERE provider = 'meta'
  LOOP
    IF r.access_token IS NOT NULL
       AND length(trim(r.access_token)) > 0
       AND r.access_token_vault_id IS NULL THEN
      PERFORM public.meta_vault_store_token(r.id, 'access_token', r.access_token);
      migrated_access := migrated_access + 1;
    ELSIF r.access_token_vault_id IS NOT NULL THEN
      -- já migrado; limpa plaintext residual se ainda houver
      IF r.access_token IS NOT NULL THEN
        UPDATE public.integration_credentials
        SET access_token = NULL WHERE id = r.id;
      END IF;
      skipped := skipped + 1;
    END IF;

    IF r.page_access_token IS NOT NULL
       AND length(trim(r.page_access_token)) > 0
       AND r.page_access_token_vault_id IS NULL THEN
      PERFORM public.meta_vault_store_token(r.id, 'page_access_token', r.page_access_token);
      migrated_page := migrated_page + 1;
    ELSIF r.page_access_token_vault_id IS NOT NULL AND r.page_access_token IS NOT NULL THEN
      UPDATE public.integration_credentials
      SET page_access_token = NULL WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'migrated_access_tokens', migrated_access,
    'migrated_page_tokens', migrated_page,
    'already_vaulted_rows_touched', skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.meta_vault_store_token(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_vault_read_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_vault_delete_credential_secrets(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_vault_migrate_plaintext_tokens() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.meta_vault_store_token(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.meta_vault_read_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.meta_vault_delete_credential_secrets(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.meta_vault_migrate_plaintext_tokens() TO service_role;

-- ------------------------------------------------------------
-- 4. Migração imediata dos tokens existentes
-- ------------------------------------------------------------
SELECT public.meta_vault_migrate_plaintext_tokens();

COMMIT;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT extname FROM pg_extension WHERE extname IN ('supabase_vault', 'pgsodium');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'integration_credentials'
--   AND column_name IN ('access_token_vault_id', 'page_access_token_vault_id');
--
-- SELECT to_regclass('public.meta_leadgen_events');
--
-- SELECT COUNT(*) AS plaintext_residual
-- FROM public.integration_credentials
-- WHERE provider = 'meta'
--   AND (
--     (access_token IS NOT NULL AND length(trim(access_token)) > 0)
--     OR (page_access_token IS NOT NULL AND length(trim(page_access_token)) > 0)
--   );
--
-- SELECT proname FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname LIKE 'meta_vault_%';
