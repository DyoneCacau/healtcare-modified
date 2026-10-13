import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { suriConnectionService, type SuriSaveInput } from '@/services/suriConnectionService';

const TEMPLATES_KEY = 'suri-templates';
const REMINDERS_KEY = 'suri-reminders';

export type AppointmentReminderStatus =
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'confirmed'
  | 'cancelled';

export interface AppointmentReminder {
  id: string;
  reminder_date: string;
  kind: 'consultation' | 'exam';
  status: AppointmentReminderStatus;
  error_message: string | null;
  sent_at: string | null;
  responded_at: string | null;
  start_time: string | null;
  procedure: string | null;
  patient_name: string | null;
}

const SKIPPED_REASON_LABELS: Record<string, string> = {
  integration_inactive: 'a conexão está inativa',
  reminders_disabled: 'os envios automáticos estão desligados',
  endpoint_missing: 'falta o endpoint da Suri',
  template_missing: 'falta escolher o template de consulta',
  before_send_hour: 'ainda não chegou o horário de envio',
  token_missing: 'falta o token da Suri',
};

export function useSuriTemplates(enabled: boolean) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: [TEMPLATES_KEY, clinicId],
    queryFn: () => suriConnectionService.listTemplates(clinicId!),
    enabled: enabled && !!clinicId,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSuriReminders(enabled: boolean) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: [REMINDERS_KEY, clinicId],
    queryFn: async (): Promise<AppointmentReminder[]> => {
      if (!clinicId) return [];
      const { data, error } = await (supabase as any)
        .from('appointment_reminders')
        .select(
          'id, reminder_date, kind, status, error_message, sent_at, responded_at, appointment:appointments(start_time, procedure, patient:patients(name))',
        )
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return ((data || []) as Record<string, any>[]).map((row) => ({
        id: String(row.id),
        reminder_date: String(row.reminder_date),
        kind: row.kind === 'exam' ? 'exam' : 'consultation',
        status: row.status as AppointmentReminderStatus,
        error_message: row.error_message ?? null,
        sent_at: row.sent_at ?? null,
        responded_at: row.responded_at ?? null,
        start_time: row.appointment?.start_time ?? null,
        procedure: row.appointment?.procedure ?? null,
        patient_name: row.appointment?.patient?.name ?? null,
      }));
    },
    enabled: enabled && !!clinicId,
    retry: false,
  });
}

export function useSuriConnectionMutations() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const requireClinic = () => {
    if (!clinicId) throw new Error('Selecione uma clínica');
    return clinicId;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['integrations', clinicId] });
    queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY, clinicId] });
    queryClient.invalidateQueries({ queryKey: [REMINDERS_KEY, clinicId] });
  };

  const save = useMutation({
    mutationFn: (input: SuriSaveInput) => suriConnectionService.save(requireClinic(), input),
    onSuccess: () => {
      invalidate();
      toast.success('Configuração da Suri salva');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testSend = useMutation({
    mutationFn: ({ phone, kind }: { phone: string; kind: 'consultation' | 'exam' }) =>
      suriConnectionService.testSend(requireClinic(), phone, kind),
    onSuccess: () => toast.success('Mensagem de teste enviada pela Suri'),
    onError: (error: Error) => toast.error(error.message),
  });

  const runNow = useMutation({
    mutationFn: () => suriConnectionService.runNow(requireClinic()),
    onSuccess: (summary) => {
      invalidate();
      if (summary.skipped_reason) {
        toast.info(
          `Nada enviado: ${SKIPPED_REASON_LABELS[summary.skipped_reason] || summary.skipped_reason}`,
        );
        return;
      }
      toast.success(
        `Envio concluído: ${summary.sent} enviada(s), ${summary.failed} falha(s), ${summary.skipped} sem celular válido`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateWebhook = useMutation({
    mutationFn: () => suriConnectionService.rotateWebhook(requireClinic()),
    onSuccess: () => toast.success('Nova URL gerada. Atualize o webhook no Portal Suri.'),
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnect = useMutation({
    mutationFn: () => suriConnectionService.disconnect(requireClinic()),
    onSuccess: () => {
      invalidate();
      toast.success('Suri desconectada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { save, testSend, runNow, rotateWebhook, disconnect };
}
