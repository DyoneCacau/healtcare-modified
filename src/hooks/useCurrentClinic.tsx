import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSelectedClinicId } from './useSelectedClinicId';

export interface CurrentClinic {
  id: string;
  name: string;
  unit_name?: string | null;
  is_owner: boolean;
  role: string;
}

export function useCurrentClinic() {
  const { user, isSuperAdmin } = useAuth();
  const { selectedClinicId } = useSelectedClinicId();

  const { data: currentClinic, isLoading, error } = useQuery({
    queryKey: ['current-clinic', user?.id, selectedClinicId, isSuperAdmin],
    queryFn: async () => {
      if (!user?.id) return null;

      // Para superadmins: usar apenas a clínica selecionada (ou null se escolheu "Nenhuma")
      if (isSuperAdmin) {
        if (!selectedClinicId) return null;

        const { data: clinic, error: clinicError } = await supabase
          .from('clinics')
          .select('id, name, unit_name')
          .eq('id', selectedClinicId)
          .maybeSingle();

        if (clinicError) {
          console.error('Erro ao buscar clínica:', clinicError);
          throw clinicError;
        }
        
        if (clinic) {
          return {
            id: clinic.id,
            name: clinic.name,
            unit_name: clinic.unit_name,
            is_owner: false,
            role: 'superadmin',
          };
        }
        return null;
      }

      // Para usuários normais: buscar clínica via clinic_users (sem coluna role, que pode não existir)
      const { data: clinicUserRows, error: clinicUserError } = await supabase
        .from('clinic_users')
        .select(`
          clinic_id,
          is_owner,
          clinics (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (clinicUserError) {
        console.error('Erro ao buscar clínica do usuário:', clinicUserError);
        throw clinicUserError;
      }

      const clinicUser = clinicUserRows?.[0];
      if (!clinicUser || !clinicUser.clinics) return null;

      const clinic = Array.isArray(clinicUser.clinics)
        ? clinicUser.clinics[0]
        : clinicUser.clinics;

      return {
        id: clinic.id,
        name: clinic.name,
        is_owner: clinicUser.is_owner ?? false,
        role: 'admin', // papel vem de user_roles; aqui só precisamos da clínica para exibição
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    currentClinic,
    isLoading,
    error,
  };
}
