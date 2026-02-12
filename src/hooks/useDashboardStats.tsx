import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';

export function useDashboardStats() {
  const { clinicId } = useClinic();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Today's appointments
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .eq('date', today);

      if (todayError) throw todayError;

      // Yesterday's appointments for comparison
      const { data: yesterdayAppointments, error: yesterdayError } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('date', yesterday);

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
        .select('type, amount')
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (transError) throw transError;

      const todayBalance = (todayTransactions || []).reduce((sum, t) => {
        return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
      }, 0);

      // Calculate trends
      const todayCount = (todayAppointments || []).length;
      const yesterdayCount = (yesterdayAppointments || []).length;
      const appointmentTrend = yesterdayCount > 0 
        ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) 
        : 0;

      return {
        appointmentsToday: todayCount,
        appointmentsByStatus: {
          confirmed: (todayAppointments || []).filter(a => a.status === 'confirmed').length,
          pending: (todayAppointments || []).filter(a => a.status === 'pending').length,
          completed: (todayAppointments || []).filter(a => a.status === 'completed').length,
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
