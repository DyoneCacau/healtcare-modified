import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth as startOfMonthFn } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { netBalance } from '@/lib/financialAggregation';
import { useClinic } from './useClinic';

export function useDashboardStats() {
  const { clinicId } = useClinic();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;

      // Datas locais (mesmo cálculo usado ao salvar agendamentos), não UTC.
      // `toISOString()` usaria o dia em UTC, o que faz "hoje" pular pro dia
      // seguinte entre ~21h e 23h59 no horário do Brasil (UTC-3), fazendo os
      // agendamentos de hoje somem das estatísticas nesse intervalo.
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
      const startOfMonth = format(startOfMonthFn(now), 'yyyy-MM-dd');

      // Today's appointments (cancelados não contam no card nem no comparativo)
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .eq('date', today)
        .neq('status', 'cancelled');

      if (todayError) throw todayError;

      // Yesterday's appointments for comparison
      const { data: yesterdayAppointments, error: yesterdayError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .eq('date', yesterday)
        .neq('status', 'cancelled');

      if (yesterdayError) throw yesterdayError;

      // Total patients this month
      const { data: monthPatients, error: monthPatientsError } = await supabase
        .from('patients')
        .select('id, created_at')
        .eq('clinic_id', clinicId);

      if (monthPatientsError) throw monthPatientsError;

      const newPatientsThisMonth = (monthPatients || []).filter(
        p => p.created_at >= startOfMonth
      ).length;

      // Active professionals
      const { data: activeProfessionals, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      if (profError) throw profError;

      // Today's financial balance
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      const { data: todayTransactions, error: transError } = await supabase
        .from('financial_transactions')
        .select('type, amount, category, refunded_at, deleted_at')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (transError) throw transError;

      // Estornos (refunded_at) e despesas "Estorno" legadas saem do saldo do dia
      const todayBalance = netBalance(todayTransactions || []);

      // Calculate trends
      const todayCount = (todayAppointments || []).length;
      const yesterdayCount = (yesterdayAppointments || []).length;
      const appointmentTrend = yesterdayCount > 0
        ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
        : todayCount > 0 ? 100 : 0;

      return {
        appointmentsToday: todayCount,
        appointmentsByStatus: {
          confirmed: (todayAppointments || []).filter((a) => a.status === 'confirmed').length,
          pending: (todayAppointments || []).filter((a) => a.status === 'pending').length,
          completed: (todayAppointments || []).filter((a) => a.status === 'completed').length,
        },
        appointmentTrend,
        totalPatients: (monthPatients || []).length,
        newPatientsThisMonth,
        activeProfessionals: (activeProfessionals || []).length,
        todayBalance,
      };
    },
    enabled: !!clinicId,
    refetchInterval: 60000, // Refetch every minute
  });

  return { stats, isLoading, error };
}
