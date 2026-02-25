import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';

/** Dias mínimos após a consulta para mostrar o alerta (evita contato imediato) */
const MIN_DAYS_AFTER_APPOINTMENT = 7;

/** Dias máximos - consultas mais antigas não aparecem */
const MAX_DAYS_AFTER_APPOINTMENT = 60;

export interface ReturnAlert {
  id: string;
  date: string;
  startTime: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  procedure: string;
  professionalName: string;
  clinicName: string;
  clinicPhone: string | null;
}

export function useReturnAlerts() {
  const { clinicId, clinic } = useClinic();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['return-alerts', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const today = new Date();
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() - MAX_DAYS_AFTER_APPOINTMENT);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() - MIN_DAYS_AFTER_APPOINTMENT);

      const minDateStr = minDate.toISOString().split('T')[0];
      const maxDateStr = maxDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_time,
          procedure,
          patient:patients(id, name, phone),
          professional:professionals(name)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .is('return_contacted_at', null)
        .gte('date', minDateStr)
        .lte('date', maxDateStr)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.start_time?.slice(0, 5) || '',
        patientId: apt.patient?.id,
        patientName: apt.patient?.name || 'Paciente',
        patientPhone: apt.patient?.phone || null,
        procedure: apt.procedure || 'Consulta',
        professionalName: apt.professional?.name || 'Profissional',
        clinicName: clinic?.name || '',
        clinicPhone: clinic?.phone || null,
      }));
    },
    enabled: !!clinicId,
  });

  const markContacted = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ return_contacted_at: new Date().toISOString() })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-alerts'] });
    },
  });

  return { alerts, isLoading, markContacted };
}
