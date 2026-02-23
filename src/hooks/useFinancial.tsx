import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { AuditEvent } from '@/types/audit';

export interface TransactionData {
  id: string;
  clinic_id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  category: string | null;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: string | null;
  patient_id?: string | null;
  notes?: string | null;
  voucher_discount?: number | null;
  payment_split?: Record<string, unknown> | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useTransactions(dateFilter?: string) {
  const { clinicId } = useClinic();

  const { data: transactions, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', clinicId, dateFilter],
    queryFn: async () => {
      if (!clinicId) return [];

      const runQuery = async (withDeletedFilter: boolean) => {
        let query = supabase
          .from('financial_transactions')
          .select('*')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false });

        if (withDeletedFilter) {
          query = query.is('deleted_at', null);
        }

        if (dateFilter) {
          const startOfDay = `${dateFilter}T00:00:00`;
          const endOfDay = `${dateFilter}T23:59:59`;
          query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }

        return query;
      };

      let { data, error } = await runQuery(true);
      if (error && (error as { code?: string }).code === '42703') {
        ({ data, error } = await runQuery(false));
      }

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  return { 
    transactions: transactions || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useTodayTransactions() {
  const today = new Date().toISOString().split('T')[0];
  return useTransactions(today);
}

export function useFinancialSummary() {
  const { clinicId } = useClinic();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['financial-summary', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;

      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const runSummaryQuery = async (withDeletedFilter: boolean) => {
        let query = supabase
          .from('financial_transactions')
          .select('type, amount, payment_method')
          .eq('clinic_id', clinicId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        if (withDeletedFilter) {
          query = query.is('deleted_at', null);
        }

        return query;
      };

      let { data, error } = await runSummaryQuery(true);
      if (error && (error as { code?: string }).code === '42703') {
        ({ data, error } = await runSummaryQuery(false));
      }

      if (error) throw error;

      const transactions = data || [];
      
      let totalIncome = 0;
      let totalExpense = 0;
      let totalCash = 0;
      let totalCredit = 0;
      let totalDebit = 0;
      let totalPix = 0;

      transactions.forEach((t) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
          totalIncome += amount;
          switch (t.payment_method) {
            case 'cash': totalCash += amount; break;
            case 'credit': totalCredit += amount; break;
            case 'debit': totalDebit += amount; break;
            case 'pix': totalPix += amount; break;
          }
        } else {
          totalExpense += amount;
          if (t.payment_method === 'cash') {
            totalCash -= amount;
          }
        }
      });

      return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        totalCash,
        totalCredit,
        totalDebit,
        totalPix,
        transactionCount: transactions.length,
      };
    },
    enabled: !!clinicId,
  });

  return { summary, isLoading, error };
}

export function useFinancialAudit(enabled: boolean) {
  const { clinicId } = useClinic();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-audit', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data: auditData, error: auditError } = await supabase
        .from('financial_audit')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (auditError) {
        const code = (auditError as { code?: string }).code;
        if (code === '42P01') {
          return [];
        }
        throw auditError;
      }

      const entries = auditData || [];
      const userIds = Array.from(new Set(entries.map((e: { user_id: string }) => e.user_id)));
      if (userIds.length === 0) return entries;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profilesData || []).map((p: { user_id: string; name: string; email: string }) => [p.user_id, p])
      );

      return entries.map((entry: { user_id: string }) => ({
        ...entry,
        user_name: profileMap.get(entry.user_id)?.name || null,
        user_email: profileMap.get(entry.user_id)?.email || null,
      }));
    },
    enabled: enabled && !!clinicId,
  });

  return { audit: data || [], isLoading, error, refetch };
}

export function useAuditEvents(enabled: boolean) {
  const { clinicId } = useClinic();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-events', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data: auditData, error: auditError } = await supabase
        .from('audit_events')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(300);

      if (auditError) {
        const code = (auditError as { code?: string }).code;
        if (code === '42P01') {
          return [];
        }
        throw auditError;
      }

      const entries = (auditData || []) as AuditEvent[];
      const userIds = Array.from(new Set(entries.map((e) => e.user_id)));
      if (userIds.length === 0) return entries;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profilesData || []).map((p: { user_id: string; name: string; email: string }) => [p.user_id, p])
      );

      return entries.map((entry) => ({
        ...entry,
        user_name: profileMap.get(entry.user_id)?.name || null,
        user_email: profileMap.get(entry.user_id)?.email || null,
      }));
    },
    enabled: enabled && !!clinicId,
  });

  return { auditEvents: data || [], isLoading, error, refetch };
}

export function useTransactionMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const createTransaction = useMutation({
    mutationFn: async (data: Partial<Omit<TransactionData, 'id' | 'clinic_id' | 'user_id' | 'created_at' | 'updated_at'>> & { type: string; amount: number }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Evita depender de RLS de SELECT no retorno do INSERT (insert(...).select().single()).
      const transactionId = crypto.randomUUID();

      const basePayload = {
        id: transactionId,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        category: data.category || null,
        payment_method: data.payment_method || null,
        clinic_id: clinicId,
        user_id: user.id,
        reference_type: data.reference_type ?? null,
        reference_id: data.reference_id ?? null,
      };

      const extendedPayload = {
        ...basePayload,
        patient_id: data.patient_id ?? null,
        notes: data.notes ?? null,
        voucher_discount: data.voucher_discount ?? null,
        payment_split: data.payment_split ?? null,
      };

      let { error } = await supabase
        .from('financial_transactions')
        .insert(extendedPayload);

      if (error && ['42703', 'PGRST204'].includes((error as { code?: string }).code || '')) {
        ({ error } = await supabase
          .from('financial_transactions')
          .insert(basePayload));
      }

      if (error) throw error;
      return extendedPayload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Transação registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      const e = (error || {}) as { message?: string; code?: string; details?: string; hint?: string };
      const parts = [
        e.message,
        e.code ? `code=${e.code}` : '',
        e.details ? `details=${e.details}` : '',
        e.hint ? `hint=${e.hint}` : '',
      ].filter(Boolean);
      toast.error(parts.length ? `Erro ao registrar transação: ${parts.join(' | ')}` : 'Erro ao registrar transação');
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({
      id,
      previous,
      reason,
      ...data
    }: Partial<TransactionData> & { id: string; previous: TransactionData; reason?: string | null }) => {
      const baseUpdate = {
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        category: data.category || null,
        payment_method: data.payment_method || null,
        updated_at: data.updated_at,
      };

      const extendedUpdate = {
        ...baseUpdate,
        patient_id: data.patient_id ?? null,
        notes: data.notes ?? null,
        voucher_discount: data.voucher_discount ?? null,
        payment_split: data.payment_split ?? null,
      };

      let { data: transaction, error } = await supabase
        .from('financial_transactions')
        .update(extendedUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error && ['42703', 'PGRST204'].includes((error as { code?: string }).code || '')) {
        ({ data: transaction, error } = await supabase
          .from('financial_transactions')
          .update(baseUpdate)
          .eq('id', id)
          .select()
          .single());
      }

      if (error) throw error;

      if (clinicId && user?.id) {
        const { error: auditError } = await supabase.from('financial_audit').insert({
          clinic_id: clinicId,
          transaction_id: id,
          action: 'update',
          before: previous,
          after: transaction,
          reason: reason || null,
          user_id: user.id,
        });

        if (auditError && (auditError as { code?: string }).code !== '42P01') {
          throw auditError;
        }

        const { error: eventError } = await supabase.from('audit_events').insert({
          clinic_id: clinicId,
          entity_type: 'financial',
          entity_id: id,
          action: 'update',
          before: previous,
          after: transaction,
          reason: reason || null,
          user_id: user.id,
        });

        if (eventError && (eventError as { code?: string }).code !== '42P01') {
          throw eventError;
        }
      }
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['financial-audit'] });
      toast.success('Transação atualizada!');
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      toast.error('Erro ao atualizar transação');
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async ({
      id,
      previous,
      reason,
    }: { id: string; previous: TransactionData; reason: string }) => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      if (!user?.id) throw new Error('Usuário não autenticado');

      const softDeletePayload = {
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from('financial_transactions')
        .update(softDeletePayload)
        .eq('id', id);

      if (error && (error as { code?: string }).code === '42703') {
        ({ error } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', id));
      }

      if (error) throw error;

      const { error: auditError } = await supabase.from('financial_audit').insert({
        clinic_id: clinicId,
        transaction_id: id,
        action: 'delete',
        before: previous,
        after: null,
        reason,
        user_id: user.id,
      });

      if (auditError && (auditError as { code?: string }).code !== '42P01') {
        throw auditError;
      }

      const { error: eventError } = await supabase.from('audit_events').insert({
        clinic_id: clinicId,
        entity_type: 'financial',
        entity_id: id,
        action: 'cancel',
        before: previous,
        after: null,
        reason,
        user_id: user.id,
      });

      if (eventError && (eventError as { code?: string }).code !== '42P01') {
        throw eventError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['financial-audit'] });
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
      toast.success('Transação cancelada!');
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast.error('Erro ao cancelar transação');
    },
  });

  return { createTransaction, updateTransaction, deleteTransaction };
}

/** Normaliza data para YYYY-MM-DD (Supabase pode retornar string ISO ou Date). */
function toDateOnly(value: string | Date | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const CASH_REGISTER_STATUS_QUERY_KEY = 'cash-register-status';
const CAIXA_STORAGE_PREFIX = 'healthcare-caixa';

function getCaixaStorageKey(clinicId: string, date: string) {
  return `${CAIXA_STORAGE_PREFIX}-${clinicId}-${date}`;
}

/** Status do caixa (aberto/fechado) - Supabase quando tabela existe, senão localStorage. */
export function useCashRegisterStatus() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: status, isLoading, isError } = useQuery({
    queryKey: [CASH_REGISTER_STATUS_QUERY_KEY, clinicId, today],
    queryFn: async () => {
      if (!clinicId) return { isOpen: false, openedAt: null, openedBy: null };
      try {
        const { data, error } = await supabase
          .from('cash_register_status')
          .select('is_open, opened_at, opened_by')
          .eq('clinic_id', clinicId)
          .eq('status_date', today)
          .maybeSingle();
        if (error) throw error;
        let isOpen = data?.is_open ?? false;
        let openedAt = data?.opened_at ?? null;
        if (!isOpen && user?.id) {
          const key = getCaixaStorageKey(clinicId, today);
          const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          if (saved === 'open') {
            const now = new Date().toISOString();
            await supabase.from('cash_register_status').upsert(
              {
                clinic_id: clinicId,
                status_date: today,
                is_open: true,
                opened_by: user.id,
                opened_at: now,
                closed_at: null,
              },
              { onConflict: ['clinic_id', 'status_date'] }
            );
            if (typeof window !== 'undefined') localStorage.removeItem(key);
            isOpen = true;
            openedAt = now;
          }
        }
        return { isOpen, openedAt, openedBy: data?.opened_by ?? null };
      } catch {
        const key = getCaixaStorageKey(clinicId, today);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        return {
          isOpen: saved === 'open',
          openedAt: saved === 'open' ? new Date().toISOString() : null,
          openedBy: null,
        };
      }
    },
    enabled: !!clinicId,
    retry: false,
  });

  const setOpen = useMutation({
    mutationFn: async () => {
      if (!clinicId || !user?.id) throw new Error('Clínica ou usuário não encontrado');
      const now = new Date().toISOString();
      try {
        const { error } = await supabase.from('cash_register_status').upsert(
          {
            clinic_id: clinicId,
            status_date: today,
            is_open: true,
            opened_by: user.id,
            opened_at: now,
            closed_at: null,
          },
          { onConflict: ['clinic_id', 'status_date'] }
        );
        if (error) throw error;
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.setItem(getCaixaStorageKey(clinicId, today), 'open');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASH_REGISTER_STATUS_QUERY_KEY, clinicId, today] });
    },
  });

  const setClosed = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error('Clínica não encontrada');
      const now = new Date().toISOString();
      try {
        const { error } = await supabase.from('cash_register_status').upsert(
          {
            clinic_id: clinicId,
            status_date: today,
            is_open: false,
            opened_by: null,
            opened_at: null,
            closed_at: now,
          },
          { onConflict: ['clinic_id', 'status_date'] }
        );
        if (error) throw error;
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.setItem(getCaixaStorageKey(clinicId, today), 'closed');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASH_REGISTER_STATUS_QUERY_KEY, clinicId, today] });
    },
  });

  return {
    isOpen: status?.isOpen ?? false,
    openedAt: status?.openedAt ?? null,
    isLoading,
    setOpen,
    setClosed,
  };
}

/** Registra fechamento de caixa no dia (e marca dias passados com movimentação como fechados para remover a notificação). */
export function useRegisterCashClosing() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (closingDate: string) => {
      if (!clinicId || !user?.id) throw new Error('Clínica ou usuário não encontrado');
      const today = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 31);
      const startStr = start.toISOString().split('T')[0];

      const { data: txDates } = await supabase
        .from('financial_transactions')
        .select('created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${startStr}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);
      const daysWithTx = new Set<string>();
      (txDates || []).forEach((r: { created_at: string }) => daysWithTx.add(r.created_at.slice(0, 10)));

      const { data: closed } = await supabase
        .from('cash_closings')
        .select('closing_date')
        .eq('clinic_id', clinicId)
        .gte('closing_date', startStr)
        .lte('closing_date', today);
      const closedSet = new Set((closed || []).map((r: { closing_date: string | Date }) => toDateOnly(r.closing_date)));

      const toClose = Array.from(daysWithTx).filter((d) => !closedSet.has(d));
      for (const d of toClose) {
        const { error } = await supabase.from('cash_closings').upsert(
          {
            clinic_id: clinicId,
            closing_date: d,
            closed_at: new Date().toISOString(),
            closed_by: user.id,
          },
          { onConflict: ['clinic_id', 'closing_date'] }
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unclosed-cash-days', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['cash-closings'] });
    },
  });
}

/** Dias com movimentação financeira e sem registro de fechamento (últimos 31 dias). Para alerta ao admin. */
export function useUnclosedCashDays() {
  const { clinicId } = useClinic();

  const { data: dates, isLoading } = useQuery({
    queryKey: ['unclosed-cash-days', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const today = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 31);
      const startStr = start.toISOString().split('T')[0];

      const { data: txDates } = await supabase
        .from('financial_transactions')
        .select('created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${startStr}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      const daysWithTx = new Set<string>();
      (txDates || []).forEach((r: { created_at: string }) => {
        daysWithTx.add(toDateOnly(r.created_at));
      });

      const { data: closed, error: closedError } = await supabase
        .from('cash_closings')
        .select('closing_date')
        .eq('clinic_id', clinicId)
        .gte('closing_date', startStr)
        .lte('closing_date', today);

      if (closedError) {
        console.error('Erro ao buscar fechamentos de caixa:', closedError);
        return [];
      }

      const closedSet = new Set((closed || []).map((r: { closing_date: string | Date }) => toDateOnly(r.closing_date)));
      const unclosed = Array.from(daysWithTx)
        .filter((d) => d < today && !closedSet.has(d))
        .sort();
      return unclosed;
    },
    enabled: !!clinicId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return { unclosedDates: dates || [], isLoading };
}
