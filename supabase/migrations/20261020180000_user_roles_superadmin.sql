-- Superadmin lê as funções; admin e superadmin podem atualizar user_roles.
-- Espelho de supabase/PRODUCAO_46_USER_ROLES_SUPERADMIN.sql.

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
