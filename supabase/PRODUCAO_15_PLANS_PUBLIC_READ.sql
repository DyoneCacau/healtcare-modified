-- ============================================================
-- PRODUÇÃO 15 — PLANOS VISÍVEIS NA LANDING (leitura pública)
-- ============================================================
-- INSTRUÇÕES:
-- 1. No Supabase: SQL Editor > New query.
-- 2. Cole TODO este arquivo e clique em Run.
--
-- Permite que a landing (chave anon) leia apenas planos ativos
-- (nome, preço, descrição, features). Não sobe com a Vercel.

BEGIN;

DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;

-- Landing e app autenticado: só planos ativos
CREATE POLICY "Public can view active plans"
ON public.plans FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_superadmin(auth.uid()));

COMMIT;

-- VERIFICAÇÃO:
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'plans'
ORDER BY policyname;
