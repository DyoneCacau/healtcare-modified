import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import type { ClinicMedication, ClinicMedicationInput } from '@/types/clinicMedication';
import { toast } from 'sonner';

const QUERY_KEY = 'clinic-medications';

function normalizeMedication(row: Record<string, unknown>): ClinicMedication {
  return {
    id: String(row.id),
    clinic_id: String(row.clinic_id),
    name: String(row.name),
    is_controlled: row.is_controlled === true,
    default_posologia: row.default_posologia ? String(row.default_posologia) : null,
    is_active: row.is_active !== false,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Catálogo de medicamentos da clínica, usado como sugestão/autocomplete no Receituário. */
export function useClinicMedications(clinicIdOverride?: string | null) {
  const { clinicId: selectedClinicId } = useClinic();
  const clinicId = clinicIdOverride || selectedClinicId;

  const query = useQuery({
    queryKey: [QUERY_KEY, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      // Tabela nova (PRODUCAO_21); cast evita depender da regeneração de tipos.
      const { data, error } = await (supabase as any)
        .from('clinic_medications')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return ((data || []) as Record<string, unknown>[]).map(normalizeMedication);
    },
    enabled: !!clinicId,
    retry: false,
  });

  const medications = query.data || [];
  return {
    ...query,
    medications,
    activeMedications: medications.filter((m) => m.is_active),
    clinicId,
  };
}

export function useClinicMedicationMutations() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const createMedication = useMutation({
    mutationFn: async (input: ClinicMedicationInput) => {
      if (!clinicId) throw new Error('Selecione uma clínica');
      const { data, error } = await (supabase as any)
        .from('clinic_medications')
        .insert({ ...input, clinic_id: clinicId })
        .select()
        .single();
      if (error) throw error;
      return normalizeMedication(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, clinicId] });
      toast.success('Medicamento salvo no catálogo da clínica!');
    },
    onError: (error: Error) => {
      toast.error(
        error.message.includes('uq_clinic_medications_name')
          ? 'Já existe esse medicamento no catálogo'
          : 'Erro ao salvar no catálogo'
      );
    },
  });

  return { createMedication };
}
