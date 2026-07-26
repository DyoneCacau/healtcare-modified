import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PatientEvolution {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string | null;
  professionalName: string;
  evolutionDate: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapEvolution(row: {
  id: string;
  clinic_id: string;
  patient_id: string;
  professional_id: string | null;
  professional_name: string;
  evolution_date: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): PatientEvolution {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    professionalId: row.professional_id,
    professionalName: row.professional_name || '',
    evolutionDate: row.evolution_date,
    content: row.content || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePatientEvolutions(patientId: string | undefined) {
  const { clinicId } = useClinic();

  const { data: evolutions, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-evolutions', clinicId, patientId],
    queryFn: async () => {
      if (!clinicId || !patientId) return [];

      const { data, error } = await supabase
        .from('patient_evolutions')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('evolution_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapEvolution);
    },
    enabled: !!clinicId && !!patientId,
  });

  return {
    evolutions: evolutions || [],
    isLoading,
    error,
    refetch,
  };
}

export function usePatientEvolutionMutations(patientId: string | undefined) {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const createEvolution = useMutation({
    mutationFn: async (input: {
      content: string;
      evolutionDate: string;
      professionalId?: string | null;
      professionalName: string;
    }) => {
      if (!clinicId || !patientId) throw new Error('Clínica ou paciente não encontrado');
      if (!input.content.trim()) throw new Error('Descreva a evolução do tratamento');

      const { data, error } = await supabase
        .from('patient_evolutions')
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          professional_id: input.professionalId || null,
          professional_name: input.professionalName.trim(),
          evolution_date: input.evolutionDate,
          content: input.content.trim(),
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapEvolution(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-evolutions', clinicId, patientId] });
      toast.success('Evolução registrada!');
    },
    onError: (error: Error) => {
      console.error('Erro ao salvar evolução:', error);
      toast.error(error.message || 'Erro ao salvar evolução');
    },
  });

  const updateEvolution = useMutation({
    mutationFn: async (input: {
      id: string;
      content: string;
      evolutionDate: string;
      professionalId?: string | null;
      professionalName: string;
    }) => {
      const { data, error } = await supabase
        .from('patient_evolutions')
        .update({
          content: input.content.trim(),
          evolution_date: input.evolutionDate,
          professional_id: input.professionalId || null,
          professional_name: input.professionalName.trim(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapEvolution(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-evolutions', clinicId, patientId] });
      toast.success('Evolução atualizada!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar evolução:', error);
      toast.error(error.message || 'Erro ao atualizar evolução');
    },
  });

  const deleteEvolution = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patient_evolutions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-evolutions', clinicId, patientId] });
      toast.success('Evolução removida');
    },
    onError: (error) => {
      console.error('Erro ao remover evolução:', error);
      toast.error('Erro ao remover evolução');
    },
  });

  return { createEvolution, updateEvolution, deleteEvolution };
}
