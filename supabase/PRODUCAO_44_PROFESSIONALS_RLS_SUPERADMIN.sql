-- ============================================================
-- PRODUÇÃO 44 — PROFISSIONAIS: SUPERADMIN E ADMIN MULTI-UNIDADE
-- ============================================================
-- INSTRUÇÕES:
-- 1. Revise este arquivo antes de executar.
-- 2. No Supabase, abra SQL Editor > New query.
-- 3. Cole TODO o conteúdo e clique em Run.
-- 4. Confira a consulta de verificação no final (3 políticas de escrita).
--
-- Corrige o erro 403 "Erro ao cadastrar profissional":
-- - Superadmin não conseguia cadastrar/editar/excluir profissionais na
--   clínica selecionada, porque não é membro dela (clinic_users).
-- - Admin com mais de uma unidade só conseguia gravar na primeira clínica
--   (get_user_clinic_id usa LIMIT 1).
--
-- Regras novas (INSERT / UPDATE / DELETE em public.professionals):
-- - Superadmin: qualquer clínica.
-- - Admin: qualquer clínica da qual seja membro, com o módulo `profissionais`.
-- Leitura (SELECT) não muda.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Admins can insert professionals with feature check" ON public.professionals;
DROP POLICY IF EXISTS "Admins can insert professionals in own clinic" ON public.professionals;
DROP POLICY IF EXISTS "Users can insert clinic professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can update professionals with feature check" ON public.professionals;
DROP POLICY IF EXISTS "Admins can update professionals in own clinic" ON public.professionals;
DROP POLICY IF EXISTS "Admins can delete professionals with feature check" ON public.professionals;
DROP POLICY IF EXISTS "Admins can delete professionals in own clinic" ON public.professionals;
DROP POLICY IF EXISTS "Clinic admins or superadmin can insert professionals" ON public.professionals;
DROP POLICY IF EXISTS "Clinic admins or superadmin can update professionals" ON public.professionals;
DROP POLICY IF EXISTS "Clinic admins or superadmin can delete professionals" ON public.professionals;

CREATE POLICY "Clinic admins or superadmin can insert professionals"
ON public.professionals FOR INSERT TO authenticated
WITH CHECK (
  public.is_superadmin(auth.uid())
  OR (
    public.is_admin(auth.uid())
    AND public.user_has_feature(auth.uid(), 'profissionais')
    AND clinic_id IN (SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid())
  )
);

CREATE POLICY "Clinic admins or superadmin can update professionals"
ON public.professionals FOR UPDATE TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR (
    public.is_admin(auth.uid())
    AND public.user_has_feature(auth.uid(), 'profissionais')
    AND clinic_id IN (SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid())
  )
)
WITH CHECK (
  public.is_superadmin(auth.uid())
  OR (
    public.is_admin(auth.uid())
    AND public.user_has_feature(auth.uid(), 'profissionais')
    AND clinic_id IN (SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid())
  )
);

CREATE POLICY "Clinic admins or superadmin can delete professionals"
ON public.professionals FOR DELETE TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR (
    public.is_admin(auth.uid())
    AND public.user_has_feature(auth.uid(), 'profissionais')
    AND clinic_id IN (SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid())
  )
);

COMMIT;

-- Verificação: deve listar as 3 políticas novas (INSERT, UPDATE, DELETE)
-- além das políticas de SELECT já existentes.
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'professionals'
ORDER BY cmd, policyname;
