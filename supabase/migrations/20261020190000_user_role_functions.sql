-- Funções para gravar e listar a função do usuário sem esbarrar no RLS da tela.
-- O ajuste do Elivelton fica só em supabase/PRODUCAO_48_FUNCAO_E_MODULOS.sql.

CREATE OR REPLACE FUNCTION public.set_user_system_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem sessão';
  END IF;
  IF p_role NOT IN ('admin', 'receptionist', 'seller', 'professional') THEN
    RAISE EXCEPTION 'Função inválida';
  END IF;
  IF NOT (
    public.is_superadmin(auth.uid())
    OR (
      public.is_admin(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.clinic_users mine
        JOIN public.clinic_users target ON target.clinic_id = mine.clinic_id
        WHERE mine.user_id = auth.uid()
          AND target.user_id = p_user_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para definir função';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role::text <> 'superadmin'
    AND role::text <> p_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_clinic_user_roles(p_clinic_id uuid)
RETURNS TABLE (user_id uuid, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem sessão';
  END IF;
  IF NOT (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.clinic_users cu
      JOIN public.user_roles ur ON ur.user_id = cu.user_id
      WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = p_clinic_id
        AND ur.role::text IN ('admin', 'superadmin')
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar funções';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role::text
  FROM public.user_roles ur
  JOIN public.clinic_users cu ON cu.user_id = ur.user_id
  WHERE cu.clinic_id = p_clinic_id
    AND ur.role::text IN ('admin', 'receptionist', 'seller', 'professional');
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_system_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_clinic_user_roles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_system_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_clinic_user_roles(uuid) TO authenticated;
