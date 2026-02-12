import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSelectedClinicId } from './useSelectedClinicId';

export function useClinic() {
  const { user, isSuperAdmin } = useAuth();
  const { selectedClinicId } = useSelectedClinicId();

  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['clinic', user?.id, isSuperAdmin, selectedClinicId],
    queryFn: async () => {
      if (!user?.id) return null;

      if (isSuperAdmin) {
        if (selectedClinicId) {
          const { data: selectedClinic, error: selectedClinicError } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', selectedClinicId)
            .maybeSingle();

          if (selectedClinicError) throw selectedClinicError;
          if (selectedClinic) {
            return {
              ...selectedClinic,
              isOwner: false,
            };
          }
        }

        const { data: adminClinic, error: adminClinicError } = await supabase
          .from('clinics')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (adminClinicError) throw adminClinicError;
        if (!adminClinic) return null;

        return {
          ...adminClinic,
          isOwner: false,
        };
      }

      const { data: clinicUser, error: clinicUserError } = await supabase
        .from('clinic_users')
        .select('clinic_id, is_owner, clinics(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clinicUserError) throw clinicUserError;
      if (!clinicUser) return null;

      return {
        ...clinicUser.clinics,
        isOwner: clinicUser.is_owner,
      };
    },
    enabled: !!user?.id,
  });

  return {
    clinic,
    clinicId: clinic?.id,
    isOwner: clinic?.isOwner,
    isLoading,
    error,
  };
}

export function useClinics() {
  const { user, isSuperAdmin } = useAuth();

  const { data: clinics, isLoading, error } = useQuery({
    queryKey: ['all-clinics', user?.id, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        return data || [];
      }

      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('clinic_users')
        .select('clinics(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const clinicsFromUser = (data || [])
        .map((row: any) => row.clinics)
        .filter(Boolean)
        .filter((c: any) => c.is_active !== false);

      return clinicsFromUser;
    },
    enabled: !!user?.id || isSuperAdmin,
  });

  return { clinics: clinics || [], isLoading, error };
}
