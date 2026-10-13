-- ============================================================
-- PRODUÇÃO 42 — INTEGRAÇÃO SURI (CONFIRMAÇÃO DE CONSULTAS/EXAMES)
-- ============================================================
-- INSTRUÇÕES:
-- 1. Execute antes: PRODUCAO_25 a 29 (módulo Integrações + credenciais).
-- 2. Revise este arquivo antes de executar.
-- 3. No Supabase, abra SQL Editor > New query.
-- 4. Cole TODO o conteúdo e clique em Run.
-- 5. Confirme as consultas de verificação no final.
--
-- Este script NÃO sobe com o deploy da Vercel. Depois dele, publique as
-- Edge Functions: suri-connection, suri-send-reminders e suri-webhook
-- (esta última com --no-verify-jwt).
--
-- O que faz:
-- - Libera o provedor `suri` em `integrations` (uma conta Suri por clínica).
-- - Cria `appointment_reminders`: um envio por agendamento/dia, com o id da
--   mensagem no WhatsApp e a resposta do paciente (confirmou/cancelou).
--   A UNIQUE (appointment_id, provider, reminder_date) impede envio duplicado.
-- - Leitura: membros da clínica com permissão `integracoes`.
--   Escrita: somente Edge Functions (service_role).
--
-- O token da Suri fica em `integration_credentials` (já criada no
-- PRODUCAO_29), nunca em `integrations.config`.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Provedor `suri` no CHECK de integrations.provider
-- ------------------------------------------------------------
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'meta',
    'facebook_lead_ads',
    'instagram_lead_ads',
    'whatsapp_business',
    'suri',
    'landing_page',
    'webhook',
    'external_api',
    'n8n',
    'make',
    'zapier'
  ));

-- ------------------------------------------------------------
-- 2. Envios de confirmação por agendamento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'suri',
  reminder_date date NOT NULL,
  kind text NOT NULL DEFAULT 'consultation'
    CHECK (kind IN ('consultation', 'exam')),
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'sent', 'failed', 'skipped', 'confirmed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 1,
  patient_phone text,
  template_id text,
  external_message_id text,
  error_message text,
  sent_at timestamptz,
  responded_at timestamptz,
  response_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, provider, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_clinic_date
  ON public.appointment_reminders (clinic_id, reminder_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_message
  ON public.appointment_reminders (integration_id, external_message_id)
  WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_awaiting
  ON public.appointment_reminders (integration_id, sent_at DESC)
  WHERE status = 'sent';

DROP TRIGGER IF EXISTS appointment_reminders_updated_at ON public.appointment_reminders;
CREATE TRIGGER appointment_reminders_updated_at
  BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view appointment reminders"
  ON public.appointment_reminders;
CREATE POLICY "Clinic members can view appointment reminders"
  ON public.appointment_reminders
  FOR SELECT
  USING (public.user_can_clinic_action(clinic_id, 'integracoes', 'can_view'));

DROP POLICY IF EXISTS "Superadmins manage appointment reminders"
  ON public.appointment_reminders;
CREATE POLICY "Superadmins manage appointment reminders"
  ON public.appointment_reminders
  FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.appointment_reminders FROM authenticated;
GRANT SELECT ON public.appointment_reminders TO authenticated;

COMMENT ON TABLE public.appointment_reminders IS
  'Confirmações de agendamento enviadas por integração (Suri). Escrita só via Edge Functions.';

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (somente leitura)
-- ============================================================

SELECT pg_get_constraintdef(oid) AS provider_check
FROM pg_constraint
WHERE conrelid = 'public.integrations'::regclass
  AND conname = 'integrations_provider_check';

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'appointment_reminders';

-- authenticated deve ter apenas SELECT:
SELECT privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND table_name = 'appointment_reminders'
ORDER BY privilege_type;
