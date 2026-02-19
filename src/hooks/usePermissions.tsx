import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export function usePermissions() {
  const { user, isSuperAdmin } = useAuth();
  const { clinicId } = useClinic();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', user?.id, clinicId, isSuperAdmin],
    queryFn: async () => {
      if (!user?.id || !clinicId) return null;
      if (isSuperAdmin) {
        return 'full' as const; // superadmin tem tudo
      }

      // Verificar se tem função personalizada nesta clínica
      const { data: customRoleRow } = await supabase
        .from('user_clinic_custom_roles')
        .select('clinic_custom_role_id')
        .eq('user_id', user.id)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (customRoleRow?.clinic_custom_role_id) {
        const { data: perms } = await supabase
          .from('clinic_custom_role_permissions')
          .select('feature, can_view, can_create, can_edit, can_delete')
          .eq('clinic_custom_role_id', customRoleRow.clinic_custom_role_id);
        const map: Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};
        (perms || []).forEach((p: any) => {
          map[p.feature] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
        });
        return map;
      }

      // Buscar role do sistema (user_roles)
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'receptionist', 'seller', 'professional'])
        .maybeSingle();

      const role = roleRow?.role as string | undefined;
      if (!role) return null;

      const { data: perms } = await supabase
        .from('clinic_role_permissions')
        .select('feature, can_view, can_create, can_edit, can_delete')
        .eq('clinic_id', clinicId)
        .eq('role', role);

      const map: Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};
      (perms || []).forEach((p: any) => {
        map[p.feature] = { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      });

      // Se não há permissões salvas para esta clínica/role, mantém comportamento atual (acesso pelo plano)
      if (Object.keys(map).length === 0) return 'full';
      return map;
    },
    enabled: !!user?.id && !!clinicId,
  });

  const can = (feature: string, action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    if (permissions === 'full') return true;
    if (!permissions || typeof permissions !== 'object') return false;
    const p = permissions[feature];
    if (!p) return false;
    return p[action] === true;
  };

  return { permissions, isLoading, can };
}
