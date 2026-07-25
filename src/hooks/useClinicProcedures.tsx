import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import type { ClinicProcedure, ClinicProcedureInput } from '@/types/clinicProcedure';
import { toast } from 'sonner';

const EMPTY_PROCEDURES: ClinicProcedure[] = [];

const QUERY_KEY = 'clinic-procedures';

function normalizeProcedure(row: Record<string, unknown>): ClinicProcedure {
  return {
    id: String(row.id),
    clinic_id: String(row.clinic_id),
    name: String(row.name),
    category: String(row.category || 'Odontologia'),
    description: row.description ? String(row.description) : null,
    default_price: Number(row.default_price || 0),
    duration_minutes: Number(row.duration_minutes || 30),
    billing_unit: (row.billing_unit || 'appointment') as ClinicProcedure['billing_unit'],
    default_commission: row.default_commission == null ? null : Number(row.default_commission),
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function useClinicProcedures(clinicIdOverride?: string | null) {
  const { clinicId: selectedClinicId } = useClinic();
  const clinicId = clinicIdOverride || selectedClinicId;

  const query = useQuery({
    queryKey: [QUERY_KEY, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      // Os tipos gerados serão atualizados após executar o SQL e regenerar
      // o schema. O cast mantém esta branch visualizável antes disso.
      const { data, error } = await (supabase as any)
        .from('clinic_procedures')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('category')
        .order('name');
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(normalizeProcedure);
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
      const { data, error } = await (supabase as any)
        .from('clinic_procedures')
        .insert({ ...input, clinic_id: clinicId })
        .select()
        .single();
      if (error) throw error;
      return normalizeProcedure(data as Record<string, unknown>);
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
      const { data, error } = await (supabase as any)
        .from('clinic_procedures')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizeProcedure(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, clinicId] });
      toast.success('Procedimento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar procedimento'),
  });

  return { createProcedure, updateProcedure };
}
