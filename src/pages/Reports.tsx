import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart, DollarSign, Calendar, Users, TrendingUp, Percent, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFeatureAccess } from '@/components/subscription/FeatureAction';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { useProfessionals } from '@/hooks/useProfessionals';
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

export default function Reports() {
  const { canAccess: canExport } = useFeatureAccess('relatorios');
  const { clinicId, clinic } = useClinic();
  const { professionals } = useProfessionals();
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [financialData, setFinancialData] = useState<any>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    byPaymentMethod: [],
    byCategory: [],
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

  useEffect(() => {
    if (clinicId) {
      fetchReportData();
    }
  }, [clinicId, startDate, endDate, selectedProfessional]);

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

        setFinancialData({
          totalIncome: incomeTotal,
          totalExpense: expenseTotal,
          netBalance: incomeTotal - expenseTotal,
          byPaymentMethod: Array.from(byMethod.entries()).map(([name, value]) => ({ name, value })),
          byCategory: Array.from(byCategory.entries()).map(([name, value]) => ({ name, value })),
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
            name: name === 'completed' ? 'Concluído' : name === 'cancelled' ? 'Cancelado' : name === 'pending' ? 'Pendente' : name === 'confirmed' ? 'Confirmado' : name,
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
              startDate={startDate} endDate={endDate} selectedClinic={selectedClinic} selectedProfessional={selectedProfessional}
              onStartDateChange={setStartDate} onEndDateChange={setEndDate} onClinicChange={setSelectedClinic} onProfessionalChange={setSelectedProfessional}
              clinics={clinics} professionals={professionals.map(p => ({ id: p.id, name: p.name, specialty: p.specialty, cro: p.cro }))}
              onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onPrint={handlePrint}
            />

        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financial" className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Financeiro</TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Agendamentos</TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2"><Users className="h-4 w-4" />Pacientes</TabsTrigger>
            <TabsTrigger value="productivity" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Produtividade</TabsTrigger>
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

          {/* Productivity Tab */}
          <TabsContent value="productivity" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Relatórios de produtividade serão baseados nos dados de agendamentos e transações.</p>
                  <p className="text-sm mt-2">Período: {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
