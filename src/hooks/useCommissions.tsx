import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { CommissionRule, CommissionCalculation, CommissionSummary } from '@/types/commission';

type DbRow = {
  id: string;
  clinic_id: string;
  professional_id: string;
  beneficiary_type: string;
  beneficiary_id: string | null;
  beneficiary_name: string | null;
  procedure: string;
  day_of_week: string;
  calculation_type: string;
  calculation_unit: string;
  value: number;
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function dbRowToRule(row: DbRow): CommissionRule {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    professionalId: row.professional_id as CommissionRule['professionalId'],
    beneficiaryType: row.beneficiary_type as CommissionRule['beneficiaryType'],
    beneficiaryId: row.beneficiary_id ?? undefined,
    beneficiaryName: row.beneficiary_name ?? undefined,
    procedure: row.procedure as CommissionRule['procedure'],
    dayOfWeek: row.day_of_week as CommissionRule['dayOfWeek'],
    calculationType: row.calculation_type as CommissionRule['calculationType'],
    calculationUnit: row.calculation_unit as CommissionRule['calculationUnit'],
    value: Number(row.value),
    isActive: row.is_active,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes ?? undefined,
  };
}

function ruleToDb(rule: Partial<CommissionRule>, clinicId: string): Omit<DbRow, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  return {
    clinic_id: clinicId,
    professional_id: rule.professionalId ?? 'all',
    beneficiary_type: rule.beneficiaryType ?? 'professional',
    beneficiary_id: rule.beneficiaryId ?? null,
    beneficiary_name: rule.beneficiaryName ?? null,
    procedure: rule.procedure ?? 'all',
    day_of_week: rule.dayOfWeek ?? 'all',
    calculation_type: rule.calculationType ?? 'percentage',
    calculation_unit: rule.calculationUnit ?? 'appointment',
    value: Number(rule.value ?? 0),
    is_active: rule.isActive ?? true,
    priority: rule.priority ?? 1,
    notes: rule.notes ?? null,
  };
}

const COMMISSION_RULES_QUERY_KEY = 'commission-rules';
const LEGACY_STORAGE_KEY_PREFIX = 'commission_rules_';

function loadLegacyRulesFromStorage(clinicId: string): CommissionRule[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY_PREFIX + clinicId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearLegacyRulesFromStorage(clinicId: string) {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY_PREFIX + clinicId);
  } catch {
    // ignore
  }
}

/**
 * Regras de comissão persistidas no Supabase por clínica (todos os usuários da clínica veem as mesmas regras).
 * Usado na página Comissões (cadastro) e na Agenda (finalizar atendimento).
 */
export function useCommissionRules() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: [COMMISSION_RULES_QUERY_KEY, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('priority', { ascending: false });
      if (error) throw error;
      let result = (data || []).map((row) => dbRowToRule(row as DbRow));
      // Migração única: se o banco está vazio e há regras no localStorage, enviar para o Supabase
      if (result.length === 0) {
        const legacy = loadLegacyRulesFromStorage(clinicId);
        if (legacy.length > 0) {
          for (const rule of legacy) {
            const row = ruleToDb(rule, clinicId);
            await supabase.from('commission_rules').insert({
              ...row,
              created_at: rule.createdAt,
              updated_at: rule.updatedAt,
            });
          }
          clearLegacyRulesFromStorage(clinicId);
          const { data: refetch } = await supabase
            .from('commission_rules')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('priority', { ascending: false });
          result = (refetch || []).map((row) => dbRowToRule(row as DbRow));
        }
      }
      return result;
    },
    enabled: !!clinicId,
  });

  const addRule = useMutation({
    mutationFn: async (ruleData: Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!clinicId) throw new Error('Clínica não selecionada');
      const row = ruleToDb(ruleData, clinicId);
      const { data, error } = await supabase
        .from('commission_rules')
        .insert({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return dbRowToRule(data as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_QUERY_KEY, clinicId] });
      toast.success('Regra criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar regra'),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...ruleData }: Partial<CommissionRule> & { id: string }) => {
      if (!clinicId) throw new Error('Clínica não selecionada');
      const row = ruleToDb(ruleData, clinicId);
      const { data, error } = await supabase
        .from('commission_rules')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return dbRowToRule(data as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_QUERY_KEY, clinicId] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar regra'),
  });

  const removeRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('commission_rules').delete().eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_QUERY_KEY, clinicId] });
      toast.success('Regra excluída com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir regra'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('commission_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId)
        .select()
        .single();
      if (error) throw error;
      return dbRowToRule(data as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMISSION_RULES_QUERY_KEY, clinicId] });
      toast.success('Status da regra atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  return {
    rules,
    isLoading,
    addRule,
    updateRule,
    removeRule,
    toggleActive,
  };
}

export function useCommissions() {
  const { clinicId } = useClinic();

  const { data: commissions, isLoading, error, refetch } = useQuery({
    queryKey: ['commissions', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  return { 
    commissions: commissions || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useCommissionMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  const createCommission = useMutation({
    mutationFn: async (data: Omit<CommissionCalculation, 'id'>) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      
      const { data: commission, error } = await supabase
        .from('commissions')
        .insert({
          clinic_id: clinicId,
          beneficiary_id: data.beneficiaryId || data.professionalId,
          beneficiary_type: data.beneficiaryType,
          appointment_id: data.appointmentId,
          amount: data.commissionAmount,
          base_value: data.serviceValue,
          percentage: data.calculationType === 'percentage' ? data.ruleValue : null,
          status: data.status || 'pending',
          notes: `Procedimento: ${data.procedure}`,
        })
        .select()
        .single();

      if (error) throw error;
      return commission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Comissão registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating commission:', error);
      toast.error('Erro ao registrar comissão');
    },
  });

  const updateCommissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('commissions')
        .update({ 
          status, 
          paid_at: status === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Status da comissão atualizado!');
    },
    onError: (error) => {
      console.error('Error updating commission:', error);
      toast.error('Erro ao atualizar comissão');
    },
  });

  return { createCommission, updateCommissionStatus };
}

// Helper function to generate commission summary from calculations
export function generateCommissionSummary(calculations: CommissionCalculation[]): CommissionSummary[] {
  const summaryMap = new Map<string, CommissionSummary>();

  calculations.forEach((calc) => {
    const key = `${calc.beneficiaryType}-${calc.beneficiaryId || calc.professionalId}`;
    
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        professionalId: calc.professionalId,
        professionalName: calc.beneficiaryName || calc.professionalName,
        beneficiaryType: calc.beneficiaryType,
        totalServices: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingCommission: 0,
        paidCommission: 0,
        averageCommissionRate: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalServices++;
    summary.totalRevenue += calc.serviceValue;
    summary.totalCommission += calc.commissionAmount;
    
    if (calc.status === 'pending') {
      summary.pendingCommission += calc.commissionAmount;
    } else if (calc.status === 'paid') {
      summary.paidCommission += calc.commissionAmount;
    }
  });

  // Calculate average commission rates
  summaryMap.forEach((summary) => {
    summary.averageCommissionRate = summary.totalRevenue > 0
      ? (summary.totalCommission / summary.totalRevenue) * 100
      : 0;
  });

  return Array.from(summaryMap.values());
}

// Empty arrays for components that need default data
export const emptyCommissionRules: CommissionRule[] = [];
export const emptyCommissionCalculations: CommissionCalculation[] = [];
export const emptyProcedurePrices: { name: string; clinicId: string; price: number; isActive: boolean }[] = [];
export const emptyStaffMembers: { id: string; name: string; role: string; isActive: boolean; clinicId?: string }[] = [];
