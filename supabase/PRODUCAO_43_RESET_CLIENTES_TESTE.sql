-- ============================================================================
-- PRODUÇÃO 43 — APAGAR TODOS OS CLIENTES DE TESTE (MANTÉM SUPERADMIN E PLANOS)
-- ============================================================================
-- INSTRUÇÕES (execute MANUALMENTE no SQL Editor do Supabase, projeto de produção):
--
-- 1. Faça backup antes: Database → Backups (ou exporte o que quiser guardar).
--
-- 2. Rode só a PARTE 1 (selecione do início até "FIM DA PARTE 1" e execute).
--    Ela NÃO altera nada. Confira:
--      • 1A: clínicas que serão apagadas e se têm assinatura no Asaas;
--      • 1B: usuários que serão apagados;
--      • 1C: superadmins que serão preservados;
--      • 1D: tabelas que serão esvaziadas.
--
-- 3. Se a 1A mostrar asaas_subscription_id preenchido, CANCELE essas assinaturas
--    no painel do Asaas (produção) ANTES da parte 2. Apagar no banco não cancela
--    a cobrança no Asaas.
--
-- 4. Na PARTE 2, troque v_confirmacao para 'APAGAR TUDO' e execute a parte 2.
--    Tudo roda numa transação: se der qualquer erro, nada é apagado.
--
-- PRESERVA: usuários com role superadmin (login, profile e role), planos
--           (plans / plan_modules), templates da galeria do Smart Hub.
-- APAGA:    todas as clínicas, organizações, assinaturas, pagamentos, pacientes,
--           agenda, financeiro, CRM, Smart Hub das clínicas, integrações (Suri,
--           Meta), estoque, ponto e todos os usuários que não são superadmin.
-- NÃO APAGA: arquivos no Storage (fotos, documentos) e dados na Suri/Asaas.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — PRÉVIA (somente leitura)
-- ============================================================================

-- 1A) Clínicas que serão apagadas
SELECT
  c.name AS clinica,
  c.created_at::date AS criada_em,
  u.email AS dono,
  s.status AS assinatura,
  to_jsonb(s) ->> 'asaas_subscription_id' AS asaas_subscription_id,
  to_jsonb(s) ->> 'asaas_customer_id' AS asaas_customer_id,
  (SELECT COUNT(*) FROM public.patients p WHERE p.clinic_id = c.id) AS pacientes,
  (SELECT COUNT(*) FROM public.appointments a WHERE a.clinic_id = c.id) AS agendamentos
FROM public.clinics c
LEFT JOIN auth.users u ON u.id = c.owner_user_id
LEFT JOIN public.subscriptions s ON s.clinic_id = c.id
ORDER BY c.created_at;

-- 1B) Usuários que serão apagados (todos que não são superadmin)
SELECT u.email, u.created_at::date AS criado_em, p.name
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'superadmin'
)
ORDER BY u.email;

-- 1C) Superadmins preservados (precisa ter pelo menos 1)
SELECT u.email
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'superadmin'
ORDER BY u.email;

-- 1D) Tabelas que serão esvaziadas (dependem de clinics/organizations)
WITH RECURSIVE deps(tbl) AS (
  SELECT 'public.clinics'::regclass
  UNION
  SELECT to_regclass('public.organizations') WHERE to_regclass('public.organizations') IS NOT NULL
  UNION
  SELECT con.conrelid::regclass
  FROM pg_constraint con
  JOIN deps d ON con.confrelid = d.tbl
  WHERE con.contype = 'f'
)
SELECT tbl::text AS tabela FROM deps ORDER BY 1;

-- FIM DA PARTE 1
-- ============================================================================


-- ============================================================================
-- PARTE 2 — EXECUÇÃO (apaga de verdade)
-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_confirmacao CONSTANT text := 'NAO';  -- troque para 'APAGAR TUDO'
  v_keep_count int;
  v_users int := 0;
  v_clinics int := 0;
  fk record;
BEGIN
  IF v_confirmacao <> 'APAGAR TUDO' THEN
    RAISE EXCEPTION 'ABORTADO: troque v_confirmacao para ''APAGAR TUDO''. Nada foi apagado.';
  END IF;

  CREATE TEMP TABLE keep_users ON COMMIT DROP AS
    SELECT DISTINCT user_id AS id FROM public.user_roles WHERE role = 'superadmin';
  SELECT COUNT(*) INTO v_keep_count FROM keep_users;
  IF v_keep_count = 0 THEN
    RAISE EXCEPTION 'ABORTADO: nenhum superadmin encontrado. Nada foi apagado.';
  END IF;

  -- Cópia do que é do superadmin, caso o TRUNCATE em cascata alcance essas tabelas
  CREATE TEMP TABLE keep_profiles ON COMMIT DROP AS
    SELECT * FROM public.profiles WHERE user_id IN (SELECT id FROM keep_users);
  CREATE TEMP TABLE keep_roles ON COMMIT DROP AS
    SELECT * FROM public.user_roles WHERE user_id IN (SELECT id FROM keep_users);

  -- Trava: o cascade não pode alcançar tabelas da plataforma
  IF EXISTS (
    WITH RECURSIVE deps(tbl) AS (
      SELECT 'public.clinics'::regclass
      UNION
      SELECT to_regclass('public.organizations') WHERE to_regclass('public.organizations') IS NOT NULL
      UNION
      SELECT con.conrelid::regclass
      FROM pg_constraint con
      JOIN deps d ON con.confrelid = d.tbl
      WHERE con.contype = 'f'
    )
    SELECT 1 FROM deps
    WHERE tbl::text IN ('plans', 'public.plans', 'plan_modules', 'public.plan_modules',
                        'smart_hub_templates', 'public.smart_hub_templates')
  ) THEN
    RAISE EXCEPTION 'ABORTADO: o cascade alcançaria planos/templates da plataforma. Nada foi apagado.';
  END IF;

  SELECT COUNT(*) INTO v_clinics FROM public.clinics;

  -- 1) Billing, auditoria e ponto
  IF to_regclass('public.payment_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payment_history';
  END IF;
  IF to_regclass('public.billing_webhook_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.billing_webhook_events';
  END IF;
  IF to_regclass('public.audit_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.audit_events';
  END IF;
  IF to_regclass('public.financial_audit') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.financial_audit';
  END IF;
  IF to_regclass('public.time_clock_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.time_clock_entries';
  END IF;

  -- 2) Clínicas, organizações e tudo que depende delas (independe de ON DELETE)
  IF to_regclass('public.organizations') IS NOT NULL THEN
    EXECUTE 'TRUNCATE public.clinics, public.organizations CASCADE';
  ELSE
    EXECUTE 'TRUNCATE public.clinics CASCADE';
  END IF;

  -- 3) Restaura profile/role do superadmin, se o cascade os tiver alcançado
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_clinic_id'
  ) THEN
    EXECUTE 'UPDATE keep_profiles SET preferred_clinic_id = NULL';
  END IF;
  INSERT INTO public.profiles SELECT * FROM keep_profiles ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles SELECT * FROM keep_roles ON CONFLICT DO NOTHING;

  -- 4) Referências a usuários que vão sair e que bloqueariam o delete
  FOR fk IN
    SELECT
      con.conrelid::regclass AS tbl,
      att.attname AS col,
      att.attnotnull AS not_null
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND con.confdeltype IN ('a', 'r')
      AND array_length(con.conkey, 1) = 1
      AND cls.relnamespace = 'public'::regnamespace
  LOOP
    IF fk.not_null THEN
      EXECUTE format(
        'DELETE FROM %s WHERE %I NOT IN (SELECT id FROM keep_users)', fk.tbl, fk.col
      );
    ELSE
      EXECUTE format(
        'UPDATE %s SET %I = NULL WHERE %I IS NOT NULL AND %I NOT IN (SELECT id FROM keep_users)',
        fk.tbl, fk.col, fk.col, fk.col
      );
    END IF;
  END LOOP;

  -- 5) Usuários que não são superadmin
  WITH doomed AS (
    DELETE FROM auth.users u
    WHERE u.id NOT IN (SELECT id FROM keep_users)
    RETURNING u.id
  )
  SELECT COUNT(*) INTO v_users FROM doomed;

  RAISE NOTICE 'Limpeza concluída: % clínica(s) e % usuário(s) apagados; % superadmin(s) preservado(s).',
    v_clinics, v_users, v_keep_count;
END $$;

-- Conferência (deve mostrar 0 clínicas e só os superadmins)
SELECT
  (SELECT COUNT(*) FROM public.clinics) AS clinicas_restantes,
  (SELECT COUNT(*) FROM public.subscriptions) AS assinaturas_restantes,
  (SELECT COUNT(*) FROM public.plans) AS planos_preservados,
  (SELECT COUNT(*) FROM auth.users) AS usuarios_restantes;

SELECT u.email, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
ORDER BY u.email;

COMMIT;
