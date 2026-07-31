import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import type { ClinicProcedure, ClinicProcedureInput } from '@/types/clinicProcedure';
import { toast } from 'sonner';

const EMPTY_PROCEDURES: ClinicProcedure[] = [];

const QUERY_KEY = 'clinic-procedures';

function normalizeProcedure(row: {
  id: string;
  clinic_id: string;
  name: string;
  category: string;
  description: string | null;
  default_price: number;
  duration_minutes: number;
  billing_unit: string;
  default_commission: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): ClinicProcedure {
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    name: row.name,
    category: row.category || 'Odontologia',
    description: row.description,
    default_price: Number(row.default_price || 0),
    duration_minutes: Number(row.duration_minutes || 30),
    billing_unit: (row.billing_unit || 'appointment') as ClinicProcedure['billing_unit'],
    default_commission: row.default_commission == null ? null : Number(row.default_commission),
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useClinicProcedures(clinicIdOverride?: string | null) {
  const { clinicId: selectedClinicId } = useClinic();
  const clinicId = clinicIdOverride || selectedClinicId;

  const query = useQuery({
    queryKey: [QUERY_KEY, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('clinic_procedures')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []).map(normalizeProcedure);
    },
    enabled: !!clinicId,
    retry: false,
  });

  const procedures = query.data ?? EMPTY_PROCEDURES;
  const activeProcedures = useMemo(
    () => procedures.filter((procedure) => procedure.is_active),
    [procedures],
  );
  return {
    ...query,
    procedures,
    activeProcedures,
    clinicId,
  };
}

export function useClinicProcedureMutations() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const createProcedure = useMutation({
    mutationFn: async (input: ClinicProcedureInput) => {
      if (!clinicId) throw new Error('Selecione uma clínica');
      const { data, error } = await supabase
        .from('clinic_procedures')
        .insert({ ...input, clinic_id: clinicId })
        .select()
        .single();
      if (error) throw error;
      return normalizeProcedure(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, clinicId] });
      toast.success('Procedimento cadastrado!');
    },
    onError: (error: Error) => {
      toast.error(error.message.includes('uq_clinic_procedures_name')
        ? 'Já existe um procedimento com esse nome'
        : 'Erro ao cadastrar procedimento');
    },
  });

  const updateProcedure = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ClinicProcedureInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('clinic_procedures')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizeProcedure(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, clinicId] });
      toast.success('Procedimento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar procedimento'),
  });

  return { createProcedure, updateProcedure };
}
