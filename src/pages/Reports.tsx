import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart, DollarSign, Calendar, Users, TrendingUp, Percent, Loader2, BarChart3, ArrowUpRight, ArrowDownRight, Trophy, AlertCircle, UserCheck, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths, subYears, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFeatureAccess } from '@/components/subscription/FeatureAction';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { useProfessionals } from '@/hooks/useProfessionals';
import { leadSourceLabels, LeadSource } from '@/types/agenda';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
  voucher: 'Voucher/Parceria',
  split: 'Pagamento Dividido',
};

const appointmentStatusLabels: Record<string, string> = {
  completed: 'Concluído',
  cancelled: 'Cancelado',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  no_show: 'Faltou',
  return: 'Retorno',
};

export default function Reports() {
  const { canAccess: canExport } = useFeatureAccess('relatorios');
  const { clinicId, clinic } = useClinic();
  const { professionals } = useProfessionals();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 6)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [biComparePeriod, setBiComparePeriod] = useState<'3' | '6' | '12' | 'custom'>('6');
  const [activeTab, setActiveTab] = useState('financial');
  const [showBiDetails, setShowBiDetails] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [financialData, setFinancialData] = useState<any>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    byPaymentMethod: [],
    byCategory: [],
    byExpenseCategory: [],
    dailyTrend: [],
  });
  
  const [appointmentData, setAppointmentData] = useState<any>({
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    byStatus: [],
    byProfessional: [],
  });
  
  const [patientData, setPatientData] = useState<any>({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  });

  const [biData, setBiData] = useState<any>({
    patients: { current: { newCount: 0, byLeadSource: [] }, prevMonth: { newCount: 0 }, prevYear: { newCount: 0 } },
    appointments: { current: { total: 0, completed: 0, byLeadSource: [] }, prevMonth: { total: 0, completed: 0 }, prevYear: { total: 0, completed: 0 } },
    sellers: [],
    individualPerformance: null,
  });

  useEffect(() => {
    if (clinicId) {
      fetchReportData();
    }
  }, [clinicId, startDate, endDate, selectedProfessional, selectedSeller]);

  const applyBiPeriod = (months: '3' | '6' | '12') => {
    const n = parseInt(months, 10);
    const end = new Date();
    const start = subMonths(end, n);
    setStartDate(format(startOfMonth(start), 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setBiComparePeriod(months);
  };

  const fetchReportData = async () => {
    if (!clinicId) return;
    setIsLoading(true);

    try {
      // Fetch financial transactions
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (transactions) {
        const incomeTotal = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        
        const byMethod = new Map<string, number>();
        transactions.filter(t => t.type === 'income').forEach(t => {
          const method = t.payment_method || 'Outros';
          byMethod.set(method, (byMethod.get(method) || 0) + Number(t.amount));
        });

        const byCategory = new Map<string, number>();
        transactions.forEach(t => {
          const cat = t.category || 'Sem categoria';
          byCategory.set(cat, (byCategory.get(cat) || 0) + Number(t.amount));
        });

        const byExpenseCategory = new Map<string, number>();
        transactions.filter(t => t.type === 'expense').forEach(t => {
          const cat = t.category || 'Sem categoria';
          byExpenseCategory.set(cat, (byExpenseCategory.get(cat) || 0) + Number(t.amount));
        });

        setFinancialData({
          totalIncome: incomeTotal,
          totalExpense: expenseTotal,
          netBalance: incomeTotal - expenseTotal,
          byPaymentMethod: Array.from(byMethod.entries()).map(([name, value]) => ({
            name: paymentMethodLabels[name] || name,
            value,
          })),
          byCategory: Array.from(byCategory.entries()).map(([name, value]) => ({ name, value })),
          byExpenseCategory: Array.from(byExpenseCategory.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name)),
          dailyTrend: [],
        });
      }

      // Fetch appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (selectedProfessional !== 'all') {
        appointmentsQuery = appointmentsQuery.eq('professional_id', selectedProfessional);
      }
      if (selectedSeller !== 'all') {
        appointmentsQuery = appointmentsQuery.eq('seller_id', selectedSeller);
      }

      const { data: appointments } = await appointmentsQuery;

      if (appointments) {
        const byStatus = new Map<string, number>();
        const byProf = new Map<string, number>();
        
        appointments.forEach(a => {
          byStatus.set(a.status, (byStatus.get(a.status) || 0) + 1);
          byProf.set(a.professional_id, (byProf.get(a.professional_id) || 0) + 1);
        });

        setAppointmentData({
          total: appointments.length,
          completed: appointments.filter(a => a.status === 'completed').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length,
          pending: appointments.filter(a => a.status === 'pending').length,
          byStatus: Array.from(byStatus.entries()).map(([name, value]) => ({ 
            name: appointmentStatusLabels[name] || name,
            value 
          })),
          byProfessional: Array.from(byProf.entries()).map(([id, value]) => {
            const prof = professionals.find(p => p.id === id);
            return { name: prof?.name || 'Profissional', value };
          }),
        });
      }

      // Fetch patients
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId);

      if (patients) {
        const thisMonth = format(new Date(), 'yyyy-MM');
        const newPatients = patients.filter(p => p.created_at.startsWith(thisMonth)).length;
        
        setPatientData({
          total: patients.length,
          active: patients.filter(p => p.status === 'active').length,
          inactive: patients.filter(p => p.status === 'inactive').length,
          newThisMonth: newPatients,
        });
      }

      // BI: períodos para comparação
      const start = new Date(startDate);
      const end = new Date(endDate);
      const prevMonthStart = format(startOfMonth(subMonths(start, 1)), 'yyyy-MM-dd');
      const prevMonthEnd = format(endOfMonth(subMonths(start, 1)), 'yyyy-MM-dd');
      const prevYearStart = format(subYears(start, 1), 'yyyy-MM-dd');
      const prevYearEnd = format(subYears(end, 1), 'yyyy-MM-dd');

      // Pacientes novos por período
      const { data: patientsCurrent } = await supabase
        .from('patients')
        .select('id, created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);
      const { data: patientsPrevMonth } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${prevMonthStart}T00:00:00`)
        .lte('created_at', `${prevMonthEnd}T23:59:59`);
      const { data: patientsPrevYear } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .gte('created_at', `${prevYearStart}T00:00:00`)
        .lte('created_at', `${prevYearEnd}T23:59:59`);

      // Agendamentos por período (com lead_source)
      let aptsPrevMonth: any[] = [];
      let aptsPrevYear: any[] = [];
      const basePrevMonth = supabase.from('appointments').select('id, status, lead_source').eq('clinic_id', clinicId).gte('date', prevMonthStart).lte('date', prevMonthEnd);
      const basePrevYear = supabase.from('appointments').select('id, status, lead_source').eq('clinic_id', clinicId).gte('date', prevYearStart).lte('date', prevYearEnd);
      let q1 = selectedProfessional !== 'all' ? basePrevMonth.eq('professional_id', selectedProfessional) : basePrevMonth;
      let q2 = selectedProfessional !== 'all' ? basePrevYear.eq('professional_id', selectedProfessional) : basePrevYear;
      if (selectedSeller !== 'all') {
        q1 = q1.eq('seller_id', selectedSeller);
        q2 = q2.eq('seller_id', selectedSeller);
      }
      const [res1, res2] = await Promise.all([q1, q2]);
      aptsPrevMonth = res1.data || [];
      aptsPrevYear = res2.data || [];

      const aptsCurrent = appointments || [];
      // Para "melhor profissional/vendedor" sempre usar TODOS os agendamentos do período (ignora filtro de profissional)
      const { data: aptsAllPeriod } = await supabase
        .from('appointments')
        .select('id, status, professional_id, seller_id')
        .eq('clinic_id', clinicId)
        .gte('date', startDate)
        .lte('date', endDate);
      const aptsForBest = aptsAllPeriod || [];
      const byLeadSource = new Map<string, number>();
      aptsCurrent.forEach((a: any) => {
        const src = a.lead_source || 'other';
        byLeadSource.set(src, (byLeadSource.get(src) || 0) + 1);
      });
      const byLeadSourceArr = Array.from(byLeadSource.entries())
        .map(([k, v]) => ({ name: leadSourceLabels[k as LeadSource] || k, value: v }))
        .sort((a, b) => b.value - a.value);

      const newPatientsCurrent = patientsCurrent?.length ?? 0;
      const newPatientsPrevMonth = patientsPrevMonth?.length ?? 0;
      const newPatientsPrevYear = patientsPrevYear?.length ?? 0;

      const pctPatientsVsPrevMonth = newPatientsPrevMonth > 0
        ? ((newPatientsCurrent - newPatientsPrevMonth) / newPatientsPrevMonth) * 100
        : (newPatientsCurrent > 0 ? 100 : 0);
      const pctPatientsVsPrevYear = newPatientsPrevYear > 0
        ? ((newPatientsCurrent - newPatientsPrevYear) / newPatientsPrevYear) * 100
        : (newPatientsCurrent > 0 ? 100 : 0);

      const aptsCompletedCurrent = aptsCurrent.filter((a: any) => a.status === 'completed').length;
      const aptsCompletedPrevMonth = aptsPrevMonth.filter((a: any) => a.status === 'completed').length;
      const aptsCompletedPrevYear = aptsPrevYear.filter((a: any) => a.status === 'completed').length;

      const pctAptsVsPrevMonth = aptsPrevMonth.length > 0
        ? ((aptsCurrent.length - aptsPrevMonth.length) / aptsPrevMonth.length) * 100
        : (aptsCurrent.length > 0 ? 100 : 0);
      const pctAptsVsPrevYear = aptsPrevYear.length > 0
        ? ((aptsCurrent.length - aptsPrevYear.length) / aptsPrevYear.length) * 100
        : (aptsCurrent.length > 0 ? 100 : 0);

      const pctAptsCompletedVsPrevMonth = aptsCompletedPrevMonth > 0
        ? ((aptsCompletedCurrent - aptsCompletedPrevMonth) / aptsCompletedPrevMonth) * 100
        : (aptsCompletedCurrent > 0 ? 100 : 0);
      const pctAptsCompletedVsPrevYear = aptsCompletedPrevYear > 0
        ? ((aptsCompletedCurrent - aptsCompletedPrevYear) / aptsCompletedPrevYear) * 100
        : (aptsCompletedCurrent > 0 ? 100 : 0);

      const referralCount = byLeadSource.get('referral') || 0;

      // Dados mensais para comparação (melhor/pior mês em vendas)
      const incomeTx = (await supabase.from('financial_transactions').select('type, amount, created_at').eq('clinic_id', clinicId).eq('type', 'income').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)).data || [];
      const monthNames: Record<string, string> = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
      const monthlyMap = new Map<string, { revenue: number; appointments: number; completed: number; newPatients: number }>();
      let monthCursor = new Date(startDate);
      monthCursor.setDate(1);
      const endMonth = new Date(endDate);
      endMonth.setDate(1);
      while (monthCursor <= endMonth) {
        const key = format(monthCursor, 'yyyy-MM');
        monthlyMap.set(key, { revenue: 0, appointments: 0, completed: 0, newPatients: 0 });
        monthCursor = addMonths(monthCursor, 1);
      }
      (incomeTx as any[]).forEach((t: any) => {
        const key = t.created_at?.slice(0, 7) || '';
        if (monthlyMap.has(key)) {
          const m = monthlyMap.get(key)!;
          m.revenue += Number(t.amount || 0);
          monthlyMap.set(key, m);
        }
      });
      (aptsCurrent as any[]).forEach((a: any) => {
        const key = (a.date || '').slice(0, 7);
        if (monthlyMap.has(key)) {
          const m = monthlyMap.get(key)!;
          m.appointments += 1;
          if (a.status === 'completed') m.completed += 1;
          monthlyMap.set(key, m);
        }
      });
      (patientsCurrent || []).forEach((p: any) => {
        const key = (p.created_at || '').slice(0, 7);
        if (monthlyMap.has(key)) {
          const m = monthlyMap.get(key)!;
          m.newPatients += 1;
          monthlyMap.set(key, m);
        }
      });
      const monthlyData = Array.from(monthlyMap.entries())
        .map(([key, v]) => {
          const [y, m] = key.split('-');
          return { monthKey: key, monthLabel: `${monthNames[m] || m}/${y}`, ...v };
        })
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      const withRevenue = monthlyData.filter((m) => m.revenue > 0);
      const bestMonth = withRevenue.length ? withRevenue.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null;
      const worstMonth = withRevenue.length ? withRevenue.reduce((a, b) => (b.revenue < a.revenue ? b : a)) : null;

      // Top vendedor e profissional (sempre do período total, muda só ao alterar datas)
      const bySeller = new Map<string, number>();
      const byProfCompleted = new Map<string, number>();
      (aptsForBest as any[]).forEach((a: any) => {
        if (a.seller_id) {
          bySeller.set(a.seller_id, (bySeller.get(a.seller_id) || 0) + 1);
        }
        if (a.status === 'completed') {
          byProfCompleted.set(a.professional_id, (byProfCompleted.get(a.professional_id) || 0) + 1);
        }
      });
      const sellerIds = Array.from(bySeller.keys());
      let sellerNames: Record<string, string> = {};
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', sellerIds);
        (profiles || []).forEach((p: any) => { sellerNames[p.user_id] = p.name || 'Vendedor'; });
      }
      const topSellerEntry = Array.from(bySeller.entries()).sort((a, b) => b[1] - a[1])[0];
      const topSeller = topSellerEntry ? { name: sellerNames[topSellerEntry[0]] || 'Vendedor', count: topSellerEntry[1] } : null;
      const topProfEntry = Array.from(byProfCompleted.entries()).sort((a, b) => b[1] - a[1])[0];
      const topProfessional = topProfEntry ? { name: professionals.find(p => p.id === topProfEntry[0])?.name || 'Profissional', count: topProfEntry[1] } : null;

      // Lista de vendedores (para filtro)
      const sellersList = Array.from(bySeller.entries()).map(([id]) => ({ id, name: sellerNames[id] || 'Vendedor' }));

      // Desempenho individual (quando profissional ou vendedor selecionado)
      let individualPerformance: { name: string; type: 'professional' | 'seller'; total: number; completed: number; revenue: number } | null = null;
      if (selectedProfessional !== 'all' || selectedSeller !== 'all') {
        const aptsFiltered = aptsCurrent as any[];
        const aptIds = aptsFiltered.map((a: any) => a.id);
        let revenue = 0;
        if (aptIds.length > 0) {
          const { data: txList } = await supabase
            .from('financial_transactions')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('type', 'income')
            .eq('reference_type', 'appointment')
            .in('reference_id', aptIds);
          revenue = (txList || []).reduce((s, t) => s + Number(t.amount || 0), 0);
        }
        const name = selectedProfessional !== 'all'
          ? professionals.find(p => p.id === selectedProfessional)?.name || 'Profissional'
          : sellerNames[selectedSeller] || 'Vendedor';
        individualPerformance = {
          name,
          type: selectedProfessional !== 'all' ? 'professional' : 'seller',
          total: aptsFiltered.length,
          completed: aptsFiltered.filter((a: any) => a.status === 'completed').length,
          revenue,
        };
      }

      setBiData({
        patients: {
          current: { newCount: newPatientsCurrent, byLeadSource: byLeadSourceArr, referralCount },
          prevMonth: { newCount: newPatientsPrevMonth },
          prevYear: { newCount: newPatientsPrevYear },
          pctVsPrevMonth: pctPatientsVsPrevMonth,
          pctVsPrevYear: pctPatientsVsPrevYear,
        },
        appointments: {
          current: { total: aptsCurrent.length, completed: aptsCompletedCurrent, byLeadSource: byLeadSourceArr, referralCount },
          prevMonth: { total: aptsPrevMonth.length, completed: aptsCompletedPrevMonth },
          prevYear: { total: aptsPrevYear.length, completed: aptsCompletedPrevYear },
          pctVsPrevMonth: pctAptsVsPrevMonth,
          pctVsPrevYear: pctAptsVsPrevYear,
          pctCompletedVsPrevMonth: pctAptsCompletedVsPrevMonth,
          pctCompletedVsPrevYear: pctAptsCompletedVsPrevYear,
        },
        periodLabels: {
          current: `${format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}`,
          prevMonth: `${format(new Date(prevMonthStart), 'MM/yyyy', { locale: ptBR })}`,
          prevYear: `${format(new Date(prevYearStart), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(prevYearEnd), 'dd/MM/yyyy', { locale: ptBR })}`,
        },
        monthlyData,
        bestMonth,
        worstMonth,
        topSeller,
        topProfessional,
        sellers: sellersList,
        individualPerformance,
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buildPrintReportHTML = (): string => {
    const clinicName = clinic?.name || 'HealthCare';
    const periodStr = `${format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}`;
    const emissionStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const byMethodRows = (financialData.byPaymentMethod as { name: string; value: number }[])
      .map((r) => `<tr><td>${r.name}</td><td class="text-right">R$ ${fmt(r.value)}</td></tr>`)
      .join('');
    const byCategoryRows = (financialData.byCategory as { name: string; value: number }[])
      .map((r) => `<tr><td>${r.name}</td><td class="text-right">R$ ${fmt(r.value)}</td></tr>`)
      .join('');
    const byStatusRows = (appointmentData.byStatus as { name: string; value: number }[])
      .map((r) => `<tr><td>${r.name}</td><td class="text-right">${r.value}</td></tr>`)
      .join('');
    const byProfRows = (appointmentData.byProfessional as { name: string; value: number }[])
      .map((r) => `<tr><td>${r.name}</td><td class="text-right">${r.value}</td></tr>`)
      .join('');

    return `
      <div class="report-header">
        <h1>Relatório Gerencial</h1>
        <p class="clinic-name">${clinicName}</p>
        <p class="meta">Período: ${periodStr} &nbsp;|&nbsp; Emissão: ${emissionStr}</p>
      </div>

      <section class="section-dre">
        <h2>Demonstração do resultado (DRE)</h2>
        <table class="dre-table">
          <tr><td>Receitas</td><td class="text-right">R$ ${fmt(financialData.totalIncome)}</td></tr>
          <tr><td class="sub">(-) Despesas</td><td class="text-right sub">R$ ${fmt(financialData.totalExpense)}</td></tr>
          ${((financialData.byExpenseCategory || []) as { name: string; value: number }[])
            .map((r, i) => `<tr><td class="sub indent">1.${i + 1} ${r.name}</td><td class="text-right sub">R$ ${fmt(r.value)}</td></tr>`)
            .join('')}
          <tr class="result"><td>Saldo líquido</td><td class="text-right">R$ ${fmt(financialData.netBalance)}</td></tr>
        </table>
      </section>

      <section class="section-block">
        <h3>Receitas por forma de pagamento</h3>
        <table class="data-table">
          <thead><tr><th>Forma</th><th class="text-right">Valor</th></tr></thead>
          <tbody>${byMethodRows || '<tr><td colspan="2">Nenhum dado</td></tr>'}</tbody>
        </table>
      </section>

      <section class="section-block">
        <h3>Movimentação por categoria</h3>
        <table class="data-table">
          <thead><tr><th>Categoria</th><th class="text-right">Valor</th></tr></thead>
          <tbody>${byCategoryRows || '<tr><td colspan="2">Nenhum dado</td></tr>'}</tbody>
        </table>
      </section>

      <section class="section-block">
        <h3>Agendamentos no período</h3>
        <table class="data-table">
          <thead><tr><th>Indicador</th><th class="text-right">Quantidade</th></tr></thead>
          <tbody>
            <tr><td>Total</td><td class="text-right">${appointmentData.total}</td></tr>
            <tr><td>Concluídos</td><td class="text-right">${appointmentData.completed}</td></tr>
            <tr><td>Pendentes</td><td class="text-right">${appointmentData.pending}</td></tr>
            <tr><td>Cancelados</td><td class="text-right">${appointmentData.cancelled}</td></tr>
          </tbody>
        </table>
        ${byStatusRows ? `<h4>Por status</h4><table class="data-table"><tbody>${byStatusRows}</tbody></table>` : ''}
        ${byProfRows ? `<h4>Por profissional</h4><table class="data-table"><tbody>${byProfRows}</tbody></table>` : ''}
      </section>

      <section class="section-block">
        <h3>Pacientes</h3>
        <table class="data-table">
          <thead><tr><th>Indicador</th><th class="text-right">Quantidade</th></tr></thead>
          <tbody>
            <tr><td>Total</td><td class="text-right">${patientData.total}</td></tr>
            <tr><td>Ativos</td><td class="text-right">${patientData.active}</td></tr>
            <tr><td>Inativos</td><td class="text-right">${patientData.inactive}</td></tr>
            <tr><td>Novos este mês</td><td class="text-right">${patientData.newThisMonth}</td></tr>
          </tbody>
        </table>
      </section>

      <footer class="report-footer">Documento gerado pelo HealthCare em ${emissionStr}</footer>
    `;
  };

  const openPrintWindow = (title: string) => {
    if (!canExport) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para imprimir ou exportar.');
      return;
    }
    const body = buildPrintReportHTML();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${title} - ${clinic?.name || 'HealthCare'}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 24px 20px; max-width: 800px; margin: 0 auto; font-size: 13px; color: #1a1a1a; line-height: 1.4; background: #fff; }
            .report-header { text-align: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 3px solid #0d9488; }
            .report-header h1 { color: #0d9488; margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
            .report-header .clinic-name { font-size: 16px; font-weight: 600; color: #333; margin: 0 0 4px 0; }
            .report-header .meta { font-size: 12px; color: #666; margin: 0; }
            section { margin-bottom: 24px; break-inside: avoid; }
            h2 { font-size: 14px; color: #0d9488; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
            h3 { font-size: 13px; color: #374151; margin: 0 0 10px 0; font-weight: 600; }
            h4 { font-size: 12px; color: #6b7280; margin: 12px 0 6px 0; font-weight: 600; }
            .section-dre { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; }
            .dre-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .dre-table td { padding: 8px 12px; border-bottom: 1px solid #ccfbf1; }
            .dre-table tr:last-child td { border-bottom: none; }
            .dre-table .sub { color: #6b7280; }
            .dre-table .indent { padding-left: 24px !important; }
            .dre-table .result { font-weight: 700; font-size: 15px; color: #0d9488; }
            .dre-table .result td { padding-top: 12px; border-top: 2px solid #0d9488; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            .data-table th, .data-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .data-table th { background: #f9fafb; font-weight: 600; color: #374151; }
            .data-table .text-right { text-align: right; }
            .section-block { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
            .section-block:last-of-type { border-bottom: none; }
            .report-footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
            @media print { body { padding: 16px; } section { break-inside: avoid; } }
          </style>
        </head>
        <body>
          ${body}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleExportPDF = () => {
    if (!canExport) {
      toast.error('Exportação não disponível no seu plano');
      return;
    }
    openPrintWindow('Relatório');
    toast.success('Use "Salvar como PDF" na janela de impressão para gerar o PDF.');
  };

  const handleExportExcel = () => {
    if (!canExport) {
      toast.error('Exportação não disponível no seu plano');
      return;
    }
    const period = `${startDate}_${endDate}`;
    const rows: string[] = [
      'Relatório Gerencial - ' + (clinic?.name || 'HealthCare'),
      'Período,' + startDate + ',' + endDate,
      '',
      'Resumo Financeiro',
      'Receitas,' + financialData.totalIncome.toFixed(2),
      'Despesas,' + financialData.totalExpense.toFixed(2),
      'Saldo Líquido,' + financialData.netBalance.toFixed(2),
      '',
      'Agendamentos',
      'Total,' + appointmentData.total,
      'Concluídos,' + appointmentData.completed,
      'Pendentes,' + appointmentData.pending,
      'Cancelados,' + appointmentData.cancelled,
      '',
      'Pacientes',
      'Total,' + patientData.total,
      'Ativos,' + patientData.active,
      'Novos este mês,' + patientData.newThisMonth,
    ];
    const csv = rows.map(r => r.replace(/,/g, ';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação CSV baixada.');
  };

  const handlePrint = () => {
    if (!canExport) return;
    openPrintWindow('Relatório');
  };

  const clinics = clinic
    ? [{
        id: clinic.id,
        name: clinic.name,
        address: clinic.address || '',
        phone: clinic.phone || '',
        cnpj: clinic.cnpj || '',
      }]
    : [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-7 w-7 text-primary" />
            Relatórios Gerenciais
          </h1>
          <p className="text-muted-foreground">Análise completa do desempenho da clínica</p>
        </div>

        <div>
          <ReportFilters
              startDate={startDate} endDate={endDate} selectedClinic={selectedClinic} selectedProfessional={selectedProfessional} selectedSeller={selectedSeller}
              onStartDateChange={(d) => { setStartDate(d); setBiComparePeriod('custom'); }} onEndDateChange={(d) => { setEndDate(d); setBiComparePeriod('custom'); }} onClinicChange={setSelectedClinic} onProfessionalChange={setSelectedProfessional} onSellerChange={setSelectedSeller}
              clinics={clinics} professionals={professionals.map(p => ({ id: p.id, name: p.name, specialty: p.specialty, cro: p.cro }))} sellers={biData.sellers || []}
              onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onPrint={handlePrint}
              onPeriodShortcut={(m) => applyBiPeriod(m)} activePeriodShortcut={biComparePeriod}
            />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financial" className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Financeiro</TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Agendamentos</TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2"><Users className="h-4 w-4" />Pacientes</TabsTrigger>
            <TabsTrigger value="bi" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />BI</TabsTrigger>
          </TabsList>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Receitas</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    R$ {financialData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Despesas</p>
                  <p className="text-2xl font-bold text-red-600">
                    R$ {financialData.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                  <p className={`text-2xl font-bold ${financialData.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {financialData.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receitas por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialData.byPaymentMethod.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={financialData.byPaymentMethod}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: R$ ${value.toFixed(0)}`}
                        >
                          {financialData.byPaymentMethod.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível para o período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialData.byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={financialData.byCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível para o período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{appointmentData.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold text-emerald-600">{appointmentData.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">{appointmentData.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-2xl font-bold text-red-600">{appointmentData.cancelled}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointmentData.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={appointmentData.byStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {appointmentData.byStatus.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Por Profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointmentData.byProfessional.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={appointmentData.byProfessional}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                  <p className="text-2xl font-bold">{patientData.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">{patientData.active}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold text-muted-foreground">{patientData.inactive}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Novos este mês</p>
                  <p className="text-2xl font-bold text-blue-600">{patientData.newThisMonth}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BI Tab */}
          <TabsContent value="bi" className="space-y-4">
            {/* Desempenho individual (quando profissional ou vendedor selecionado) */}
            {biData.individualPerformance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {biData.individualPerformance.type === 'professional' ? <Stethoscope className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                    Desempenho de {biData.individualPerformance.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {biData.individualPerformance.type === 'professional' ? 'Produção e receita do profissional no período' : 'Vendas e parcerias fechadas no período'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Total de agendamentos</p>
                        <p className="text-2xl font-bold">{biData.individualPerformance.total}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Consultas realizadas</p>
                        <p className="text-2xl font-bold text-emerald-600">{biData.individualPerformance.completed}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Receita gerada</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          R$ {biData.individualPerformance.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Melhor e Pior mês em vendas */}
            {(biData.bestMonth || biData.worstMonth) && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Desempenho mensal em vendas</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Identifique os meses de maior e menor faturamento para planejar promoções e ações de marketing
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="bi-details" checked={showBiDetails} onCheckedChange={setShowBiDetails} />
                      <Label htmlFor="bi-details" className="text-sm cursor-pointer">Mostrar vendedor(a) e profissional</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`grid gap-4 ${showBiDetails ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
                    {biData.bestMonth && (
                      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <Trophy className="h-5 w-5" />
                            <span className="font-semibold">Melhor mês em vendas</span>
                          </div>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                            {biData.bestMonth.monthLabel}
                          </p>
                          <p className="text-lg font-medium">
                            R$ {biData.bestMonth.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {biData.bestMonth.appointments} agendamentos · {biData.bestMonth.completed} concluídos · {biData.bestMonth.newPatients} novos pacientes
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {biData.worstMonth && biData.worstMonth.monthKey !== biData.bestMonth?.monthKey && (
                      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">Mês com menor faturamento</span>
                          </div>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">
                            {biData.worstMonth.monthLabel}
                          </p>
                          <p className="text-lg font-medium">
                            R$ {biData.worstMonth.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Oportunidade para promoções e campanhas de marketing
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {showBiDetails && biData.topSeller && (
                      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <UserCheck className="h-5 w-5" />
                            <span className="font-semibold">Vendedor(a) com melhor desempenho</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                            {biData.topSeller.name}
                          </p>
                          <p className="text-lg font-medium">
                            {biData.topSeller.count} vendas/parcerias fechadas
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Quem mais fechou vendas, indicações e parcerias (ex.: traz cliente, ganha procedimento)
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {showBiDetails && biData.topProfessional && (
                      <Card className="bg-violet-50 dark:bg-violet-950/30 border-violet-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
                            <Stethoscope className="h-5 w-5" />
                            <span className="font-semibold">Profissional com melhor desempenho</span>
                          </div>
                          <p className="text-2xl font-bold text-violet-700 dark:text-violet-400 mt-2">
                            {biData.topProfessional.name}
                          </p>
                          <p className="text-lg font-medium">
                            {biData.topProfessional.count} consultas realizadas
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Maior número de atendimentos concluídos
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {biData.monthlyData?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-3">Receita por mês</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={biData.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']} />
                          <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <p className="text-sm text-muted-foreground">
              Comparação com mês anterior ({biData.periodLabels?.prevMonth}) e mesmo período ano anterior ({biData.periodLabels?.prevYear})
            </p>

            {/* Pacientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Pacientes no período</CardTitle>
                <p className="text-sm text-muted-foreground">Novos cadastros e origem do lead</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Novos pacientes</p>
                      <p className="text-2xl font-bold">{biData.patients?.current?.newCount ?? 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        {biData.patients?.pctVsPrevMonth != null && (
                          <span className={biData.patients.pctVsPrevMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.patients.pctVsPrevMonth >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                            {biData.patients.pctVsPrevMonth >= 0 ? '+' : ''}{biData.patients.pctVsPrevMonth.toFixed(1)}% vs mês ant.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        {biData.patients?.pctVsPrevYear != null && (
                          <span className={biData.patients.pctVsPrevYear >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.patients.pctVsPrevYear >= 0 ? '+' : ''}{biData.patients.pctVsPrevYear.toFixed(1)}% vs ano ant.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Por indicação</p>
                      <p className="text-2xl font-bold">{biData.patients?.current?.referralCount ?? biData.appointments?.current?.referralCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Agendamentos com origem Indicação</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Mês anterior</p>
                      <p className="text-2xl font-bold">{biData.patients?.prevMonth?.newCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Novos em {biData.periodLabels?.prevMonth}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Ano anterior</p>
                      <p className="text-2xl font-bold">{biData.patients?.prevYear?.newCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Mesmo período ano passado</p>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">Origem do lead (agendamentos)</h4>
                  {biData.appointments?.current?.byLeadSource?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={biData.appointments.current.byLeadSource} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Agendamentos" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                      Nenhum dado de origem de lead no período
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agendamentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Agendamentos no período</CardTitle>
                <p className="text-sm text-muted-foreground">Total e concluídos com comparação</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total de agendamentos</p>
                      <p className="text-2xl font-bold">{biData.appointments?.current?.total ?? 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        {biData.appointments?.pctVsPrevMonth != null && (
                          <span className={biData.appointments.pctVsPrevMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.appointments.pctVsPrevMonth >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                            {biData.appointments.pctVsPrevMonth >= 0 ? '+' : ''}{biData.appointments.pctVsPrevMonth.toFixed(1)}% vs mês ant.
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {biData.appointments?.pctVsPrevYear != null && (
                          <span className={biData.appointments.pctVsPrevYear >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.appointments.pctVsPrevYear >= 0 ? '+' : ''}{biData.appointments.pctVsPrevYear.toFixed(1)}% vs ano ant.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Concluídos</p>
                      <p className="text-2xl font-bold text-emerald-600">{biData.appointments?.current?.completed ?? 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        {biData.appointments?.pctCompletedVsPrevMonth != null && (
                          <span className={biData.appointments.pctCompletedVsPrevMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.appointments.pctCompletedVsPrevMonth >= 0 ? '+' : ''}{biData.appointments.pctCompletedVsPrevMonth.toFixed(1)}% vs mês ant.
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {biData.appointments?.pctCompletedVsPrevYear != null && (
                          <span className={biData.appointments.pctCompletedVsPrevYear >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {biData.appointments.pctCompletedVsPrevYear >= 0 ? '+' : ''}{biData.appointments.pctCompletedVsPrevYear.toFixed(1)}% vs ano ant.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Mês anterior</p>
                      <p className="text-2xl font-bold">{biData.appointments?.prevMonth?.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total: {biData.appointments?.prevMonth?.total ?? 0} · Concl.: {biData.appointments?.prevMonth?.completed ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Ano anterior</p>
                      <p className="text-2xl font-bold">{biData.appointments?.prevYear?.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total: {biData.appointments?.prevYear?.total ?? 0} · Concl.: {biData.appointments?.prevYear?.completed ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>
                {biData.appointments?.current?.byLeadSource?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Distribuição por origem do lead</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={biData.appointments.current.byLeadSource}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {biData.appointments.current.byLeadSource.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Produtividade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Produtividade</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Desempenho baseado em agendamentos e taxa de conclusão no período
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Taxa de conclusão</p>
                      <p className="text-2xl font-bold">
                        {appointmentData.total > 0
                          ? ((appointmentData.completed / appointmentData.total) * 100).toFixed(1)
                          : '0'}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {appointmentData.completed} de {appointmentData.total} consultas realizadas
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Média diária</p>
                      <p className="text-2xl font-bold">
                        {(() => {
                          const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)));
                          return (appointmentData.total / days).toFixed(1);
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Consultas por dia no período</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Cancelados</p>
                      <p className="text-2xl font-bold text-red-600">{appointmentData.cancelled}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {appointmentData.total > 0
                          ? ((appointmentData.cancelled / appointmentData.total) * 100).toFixed(1)
                          : '0'}% do total
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {appointmentData.byProfessional?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Consultas por profissional</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={appointmentData.byProfessional}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
