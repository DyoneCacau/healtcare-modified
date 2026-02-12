import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { ConsentTerm, ClinicBranding } from '@/types/terms';

export function useTerms() {
  const { clinicId } = useClinic();

  const { data: terms, isLoading, error, refetch } = useQuery({
    queryKey: ['terms', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to frontend types
      return (data || []).map(term => ({
        id: term.id,
        clinicId: term.clinic_id,
        title: term.title,
        content: term.content,
        type: term.type as ConsentTerm['type'],
        isActive: term.is_active,
        createdAt: term.created_at,
        updatedAt: term.updated_at,
      })) as ConsentTerm[];
    },
    enabled: !!clinicId,
  });

  return { 
    terms: terms || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useTermMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  const createTerm = useMutation({
    mutationFn: async (data: Omit<ConsentTerm, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      
      const { data: term, error } = await supabase
        .from('terms')
        .insert({
          clinic_id: clinicId,
          title: data.title,
          content: data.content,
          type: data.type,
          is_active: data.isActive,
        })
        .select()
        .single();

      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating term:', error);
      toast.error('Erro ao criar termo');
    },
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ConsentTerm> & { id: string }) => {
      const { data: term, error } = await supabase
        .from('terms')
        .update({
          title: data.title,
          content: data.content,
          type: data.type,
          is_active: data.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating term:', error);
      toast.error('Erro ao atualizar termo');
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting term:', error);
      toast.error('Erro ao excluir termo');
    },
  });

  return { createTerm, updateTerm, deleteTerm };
}

// Hook for clinic branding (stored in clinics table)
export function useClinicBranding() {
  const { clinic, clinicId } = useClinic();
  const queryClient = useQueryClient();

  const branding: ClinicBranding = {
    clinicId: clinicId || '',
    logo: clinic?.logo_url || undefined,
    primaryColor: '#0ea5e9',
    headerText: clinic?.name,
    footerText: `${clinic?.address || ''} - ${clinic?.phone || ''}`,
  };

  const updateBranding = useMutation({
    mutationFn: async (data: Partial<ClinicBranding>) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      
      const { error } = await supabase
        .from('clinics')
        .update({
          logo_url: data.logo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      console.error('Error updating branding:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return { branding, updateBranding };
}
