import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface AppointmentData {
  id: string;
  clinic_id: string;
  patient_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  end_time: string;
  procedure: string;
  status: string;
  payment_status: string;
  notes: string | null;
  seller_id: string | null;
  lead_source: string | null;
  referral_name?: string | null;
  booking_fee?: number | null;
  booking_fee_payment_method?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    name: string;
    phone: string | null;
  };
  professional?: {
    id: string;
    name: string;
    specialty: string;
    cro: string;
  };
}

export function useAppointments(dateFilter?: string, clinicIdsOverride?: string[]) {
  const { clinicId } = useClinic();

  const effectiveClinicIds =
    clinicIdsOverride && clinicIdsOverride.length > 0
      ? clinicIdsOverride
      : clinicId
      ? [clinicId]
      : [];

  const { data: appointments, isLoading, error, refetch } = useQuery({
    queryKey: ['appointments', effectiveClinicIds.join(','), dateFilter],
    queryFn: async () => {
      if (!effectiveClinicIds.length) return [];

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, phone),
          professional:professionals(id, name, specialty, cro)
        `)
        .in('clinic_id', effectiveClinicIds)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: effectiveClinicIds.length > 0,
  });

  return { 
    appointments: appointments || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  return useAppointments(today);
}

export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const createAppointment = useMutation({
    mutationFn: async (
      data: Omit<AppointmentData, 'id' | 'clinic_id' | 'created_at' | 'updated_at' | 'patient' | 'professional'> & {
        clinic_id?: string;
      }
    ) => {
      const targetClinicId = data.clinic_id ?? clinicId;
      if (!targetClinicId) throw new Error('Clínica não encontrada');

      // Evita depender de RLS de SELECT no retorno do INSERT.
      // (Quando usa .select().single(), o PostgREST precisa "ler" a linha inserida.)
      const appointmentId = crypto.randomUUID();
      const { clinic_id: _ignoreClinicId, ...rest } = data as any;
      const appointmentPayload = {
        id: appointmentId,
        ...rest,
        clinic_id: targetClinicId,
      };

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentPayload);

      if (error) throw error;

      if (clinicId && user?.id) {
        const { error: eventError } = await supabase.from('audit_events').insert({
          clinic_id: targetClinicId,
          entity_type: 'appointment',
          entity_id: appointmentId,
          action: 'create',
          before: null,
          after: appointmentPayload,
          reason: null,
          user_id: user.id,
        });

        if (eventError && (eventError as { code?: string }).code !== '42P01') {
          // Log de auditoria e "best-effort": nao deve impedir o agendamento.
          console.warn('Failed to insert audit event (appointment create):', eventError);
        }
      }
      // Notificar membros da clínica destino sobre o novo agendamento
      if (user?.id) {
        const dateStr = data.date || '';
        const timeStr = data.start_time || '';
        supabase.rpc('notify_clinic_users_on_appointment', {
          p_clinic_id: targetClinicId,
          p_title: 'Novo agendamento',
          p_message: `Novo agendamento em ${dateStr} às ${timeStr}`,
          p_reference_id: appointmentId,
          p_creator_id: user.id,
        }).catch((err: unknown) => console.warn('Falha ao notificar clínica:', err));
      }

      return appointmentPayload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.refetchQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating appointment:', error);
      const e = (error || {}) as { message?: string; code?: string; details?: string; hint?: string };
      const parts = [
        e.message,
        e.code ? `code=${e.code}` : '',
        e.details ? `details=${e.details}` : '',
        e.hint ? `hint=${e.hint}` : '',
      ].filter(Boolean);

      toast.error(parts.length ? `Erro ao criar agendamento: ${parts.join(' | ')}` : 'Erro ao criar agendamento');
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AppointmentData> & { id: string }) => {
      // Remove joined data before update
      const { patient, professional, ...updateData } = data as any;

      const { data: beforeData } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (clinicId && user?.id) {
        const action = appointment.status === 'cancelled' ? 'cancel' : 'update';
        const { error: eventError } = await supabase.from('audit_events').insert({
          clinic_id: clinicId,
          entity_type: 'appointment',
          entity_id: id,
          action,
          before: beforeData || null,
          after: appointment,
          reason: null,
          user_id: user.id,
        });

        if (eventError && (eventError as { code?: string }).code !== '42P01') {
          throw eventError;
        }
      }
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Agendamento atualizado!');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { data: beforeData } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (clinicId && user?.id) {
        const { error: eventError } = await supabase.from('audit_events').insert({
          clinic_id: clinicId,
          entity_type: 'appointment',
          entity_id: id,
          action: 'cancel',
          before: beforeData || null,
          after: appointment || null,
          reason: null,
          user_id: user.id,
        });

        if (eventError && (eventError as { code?: string }).code !== '42P01') {
          throw eventError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
      toast.success('Agendamento cancelado!');
    },
    onError: (error) => {
      console.error('Error canceling appointment:', error);
      toast.error('Erro ao cancelar agendamento');
    },
  });

  return { createAppointment, updateAppointment, deleteAppointment };
}
