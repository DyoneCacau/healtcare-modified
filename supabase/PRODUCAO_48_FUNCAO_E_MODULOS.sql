-- ============================================================
-- PRODUÇÃO 48 — FUNÇÃO DO USUÁRIO FICA GRAVADA E APARECE NA LISTA
-- ============================================================
-- INSTRUÇÕES:
-- 1. Supabase > SQL Editor > New query.
-- 2. Cole TODO este arquivo e clique em Run.
-- 3. A última consulta deve mostrar elivelto@chatbotmaker.io com role admin.
-- 4. Saia do site e entre de novo com a conta do Elivelton.
--    Contas a receber e Comissões ficam dentro do menu Financeiro.
--    CRM e Smart Hub ficam dentro de Marketing.
--
-- Não apaga clínicas, usuários nem o papel superadmin.
-- ============================================================

BEGIN;

-- Superadmin consegue ler e atualizar funções (a lista mostrava "Sem função")
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
    SELECT cu.user_id FROM public.clinic_users cu
    WHERE cu.clinic_id IN (
      SELECT cu2.clinic_id FROM public.clinic_users cu2 WHERE cu2.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  AND role::text <> 'superadmin'
  AND user_id IN (
    SELECT cu.user_id FROM public.clinic_users cu
    WHERE cu.clinic_id IN (
      SELECT cu2.clinic_id FROM public.clinic_users cu2 WHERE cu2.user_id = auth.uid()
    )
  )
);

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

-- Elivelton: deixa só administrador (não mexe em superadmin, se existir)
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND lower(u.email) IN ('elivelto@chatbotmaker.io', 'elivelton@chatbotmaker.io')
  AND ur.role::text <> 'superadmin';

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('elivelto@chatbotmaker.io', 'elivelton@chatbotmaker.io')
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;

-- Conferência: precisa aparecer role = admin
SELECT u.email, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE lower(u.email) IN ('elivelto@chatbotmaker.io', 'elivelton@chatbotmaker.io')
ORDER BY u.email, r.role;

-- Conferência dos módulos da clínica dele (override e presentes)
SELECT c.name AS clinica, s.features_override, s.feature_grants
FROM auth.users u
JOIN public.clinic_users cu ON cu.user_id = u.id
JOIN public.clinics c ON c.id = cu.clinic_id
LEFT JOIN public.subscriptions s ON s.clinic_id = c.id
WHERE lower(u.email) IN ('elivelto@chatbotmaker.io', 'elivelton@chatbotmaker.io');
