-- Profissionais: superadmin grava em qualquer clínica; admin em qualquer
-- clínica da qual é membro (antes: só a primeira, via get_user_clinic_id).
-- Espelho de supabase/PRODUCAO_44_PROFESSIONALS_RLS_SUPERADMIN.sql.

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
