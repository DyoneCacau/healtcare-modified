import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type {
  AccountReceivable,
  AccountReceivableInput,
  ReceivableStatus,
} from '@/types/receivable';

type ReceivableRow = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  description: string;
  amount: number;
  due_date: string;
  status: ReceivableStatus;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  financial_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patients?: { name?: string | null } | null;
};

function mapRow(row: ReceivableRow): AccountReceivable {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patients?.name ?? null,
    appointmentId: row.appointment_id,
    description: row.description,
    amount: Number(row.amount || 0),
    dueDate: row.due_date,
    status: row.status,
    paidAt: row.paid_at,
    paidAmount: row.paid_amount == null ? null : Number(row.paid_amount),
    paymentMethod: row.payment_method,
    financialTransactionId: row.financial_transaction_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useReceivables() {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['accounts-receivable', clinicId],
    queryFn: async () => {
      if (!clinicId) return [] as AccountReceivable[];

      const { data, error } = await supabase
        .from('accounts_receivable' as any)
        .select('*, patients(name)')
        .eq('clinic_id', clinicId)
        .order('due_date', { ascending: true });

      if (error) {
        // Tabela ainda não criada no Supabase
        if (error.code === '42P01' || error.message?.includes('accounts_receivable')) {
          return [] as AccountReceivable[];
        }
        throw error;
      }

      return ((data || []) as unknown as ReceivableRow[]).map(mapRow);
    },
    enabled: !!clinicId,
  });
}

export function useReceivableMutations() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['revenue-chart'] });
  };

  const createReceivable = useMutation({
    mutationFn: async (input: AccountReceivableInput) => {
      if (!clinicId || !user?.id) throw new Error('Clínica ou usuário não identificado');

      const { data, error } = await supabase
        .from('accounts_receivable' as any)
        .insert({
          clinic_id: clinicId,
          patient_id: input.patient_id ?? null,
          appointment_id: input.appointment_id ?? null,
          description: input.description,
          amount: input.amount,
          due_date: input.due_date,
          status: 'open',
          notes: input.notes ?? null,
          created_by: user.id,
        })
        .select('*, patients(name)')
        .single();

      if (error) throw error;
      return mapRow(data as unknown as ReceivableRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Conta a receber registrada');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Erro ao criar conta a receber. Execute o SQL PRODUCAO_13 no Supabase.');
    },
  });

  const settleReceivable = useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
      paidAmount,
    }: {
      id: string;
      paymentMethod: string;
      paidAmount?: number;
    }) => {
      if (!clinicId || !user?.id) throw new Error('Clínica ou usuário não identificado');

      const { data: current, error: fetchError } = await supabase
        .from('accounts_receivable' as any)
        .select('*')
        .eq('id', id)
        .eq('clinic_id', clinicId)
        .single();

      if (fetchError) throw fetchError;
      const row = current as unknown as ReceivableRow;
      if (row.status !== 'open') throw new Error('Esta conta já foi liquidada ou cancelada');

      const amount = paidAmount ?? Number(row.amount);

      const { data: tx, error: txError } = await supabase
        .from('financial_transactions')
        .insert({
          clinic_id: clinicId,
          user_id: user.id,
          type: 'income',
          amount,
          description: `Baixa: ${row.description}`,
          category: 'Contas a receber',
          payment_method: paymentMethod,
          reference_type: row.appointment_id ? 'appointment' : 'receivable',
          reference_id: row.appointment_id || row.id,
        })
        .select('id')
        .single();

      if (txError) throw txError;

      const { error: updateError } = await supabase
        .from('accounts_receivable' as any)
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: amount,
          payment_method: paymentMethod,
          financial_transaction_id: tx.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (row.appointment_id) {
        await supabase
          .from('appointments')
          .update({ payment_status: 'paid' })
          .eq('id', row.appointment_id);
      }

      return id;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Baixa registrada e lançamento criado no Caixa');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Erro ao dar baixa');
    },
  });

  const cancelReceivable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts_receivable' as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Conta cancelada');
    },
    onError: () => toast.error('Erro ao cancelar'),
  });

  return { createReceivable, settleReceivable, cancelReceivable };
}
