import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClinic } from './useClinic';

export interface ProfessionalData {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string;
  cro: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfessionals() {
  const { clinicId } = useClinic();
  const { data: professionals, isLoading, error, refetch } = useQuery({
    queryKey: ['professionals', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  return { 
    professionals: professionals || [], 
    activeProfessionals: (professionals || []).filter(p => p.is_active),
    isLoading, 
    error,
    refetch 
  };
}

export function useProfessionalMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  const createProfessional = useMutation({
    mutationFn: async (data: Omit<ProfessionalData, 'id' | 'created_at' | 'updated_at'>) => {
      if (!clinicId) throw new Error('Clinica nao encontrada');
      const { data: professional, error } = await supabase
        .from('professionals')
        .insert({
          ...data,
          clinic_id: clinicId,
        })
        .select()
        .single();

      if (error) throw error;
      return professional;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      toast.success('Profissional cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating professional:', error);
      toast.error('Erro ao cadastrar profissional');
    },
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProfessionalData> & { id: string }) => {
      const { data: professional, error } = await supabase
        .from('professionals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return professional;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      toast.success('Profissional atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating professional:', error);
      toast.error('Erro ao atualizar profissional');
    },
  });

  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professionals')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      toast.success('Profissional desativado!');
    },
    onError: (error) => {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao desativar profissional');
    },
  });

  return { createProfessional, updateProfessional, deleteProfessional };
}
