import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { CommissionRule, CommissionCalculation, CommissionSummary } from '@/types/commission';

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
