-- ============================================================
-- PRODUÇÃO 46 — FUNÇÃO DO USUÁRIO (SUPERADMIN VÊ E GRAVA)
-- ============================================================
-- INSTRUÇÕES:
-- 1. Revise este arquivo antes de executar.
-- 2. No Supabase: SQL Editor > New query.
-- 3. Cole TODO o conteúdo e clique em Run.
-- 4. Script IDEMPOTENTE. Não apaga usuários nem clínicas.
--
-- Por que:
-- - A lista de usuários mostrava "Sem função" para todo mundo quando
--   quem olha é superadmin: a leitura só liberava o papel admin, não o superadmin.
-- - Trocar a função não gravava: não existia política de UPDATE em user_roles.
--   O salvamento parecia certo e, ao atualizar a página, voltava "Sem função".
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Superadmins can view all roles" ON public.user_roles;
CREATE POLICY "Superadmins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Superadmins can update roles" ON public.user_roles;
CREATE POLICY "Superadmins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (
  public.is_superadmin(auth.uid())
  AND role::text <> 'superadmin'
);

DROP POLICY IF EXISTS "Admins can update roles in own clinic" ON public.user_roles;
CREATE POLICY "Admins can update roles in own clinic"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  AND role::text <> 'superadmin'
  AND user_id IN (
    SELECT cu.user_id
    FROM public.clinic_users cu
    WHERE cu.clinic_id IN (
      SELECT cu2.clinic_id FROM public.clinic_users cu2 WHERE cu2.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  AND role::text <> 'superadmin'
  AND user_id IN (
    SELECT cu.user_id
    FROM public.clinic_users cu
    WHERE cu.clinic_id IN (
      SELECT cu2.clinic_id FROM public.clinic_users cu2 WHERE cu2.user_id = auth.uid()
    )
  )
);

COMMIT;

-- Verificação: as 3 políticas novas devem aparecer (SELECT e dois UPDATE)
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_roles'
  AND policyname IN (
    'Superadmins can view all roles',
    'Superadmins can update roles',
    'Admins can update roles in own clinic'
  )
ORDER BY cmd, policyname;
