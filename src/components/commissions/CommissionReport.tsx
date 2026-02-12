import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, DollarSign, Percent, TrendingUp, Clock, CheckCircle, Instagram, MessageCircle, Share2, Megaphone, HelpCircle, Stethoscope, UserCheck, Headphones, Lock, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CommissionSummary, CommissionCalculation, beneficiaryTypeLabels, BeneficiaryType } from '@/types/commission';
import { leadSourceLabels, LeadSource } from '@/types/agenda';
import { generateCommissionSummary } from '@/hooks/useCommissions';
import { CommissionReportFilters } from './CommissionReportFilters';
import { useClinics } from '@/hooks/useClinic';
import { format, subMonths, parseISO, isWithinInterval } from 'date-fns';

interface CommissionReportProps {
  calculations: CommissionCalculation[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--accent))'];

const leadSourceIcons: Record<LeadSource, typeof Instagram> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  referral: Share2,
  paid_traffic: Megaphone,
  other: HelpCircle,
};

const beneficiaryIcons: Record<BeneficiaryType, typeof Stethoscope> = {
  professional: Stethoscope,
  seller: UserCheck,
  reception: Headphones,
};

export function CommissionReport({ calculations }: CommissionReportProps) {
  const { clinics } = useClinics();
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [selectedBeneficiaryType, setSelectedBeneficiaryType] = useState('all');

  // Filter calculations based on selected filters
  const filteredCalculations = useMemo(() => {
    return calculations.filter(calc => {
      // Filter by date range
      try {
        const calcDate = parseISO(calc.date);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (!isWithinInterval(calcDate, { start, end })) return false;
      } catch {
        return false;
      }

      // Filter by clinic
      if (selectedClinic !== 'all' && calc.clinicId !== selectedClinic) return false;

      // Filter by beneficiary type
      if (selectedBeneficiaryType !== 'all' && calc.beneficiaryType !== selectedBeneficiaryType) return false;

      return true;
    });
  }, [calculations, startDate, endDate, selectedClinic, selectedBeneficiaryType]);

  const summary = useMemo(() => generateCommissionSummary(filteredCalculations), [filteredCalculations]);

  // Separate summaries by beneficiary type
  const summaryByType = useMemo(() => {
    return {
      professional: summary.filter(s => s.beneficiaryType === 'professional'),
      seller: summary.filter(s => s.beneficiaryType === 'seller'),
      reception: summary.filter(s => s.beneficiaryType === 'reception'),
    };
  }, [summary]);

  const totals = useMemo(() => {
    return {
      totalRevenue: summary.reduce((acc, s) => acc + s.totalRevenue, 0),
      totalCommission: summary.reduce((acc, s) => acc + s.totalCommission, 0),
      pendingCommission: summary.reduce((acc, s) => acc + s.pendingCommission, 0),
      paidCommission: summary.reduce((acc, s) => acc + s.paidCommission, 0),
      totalServices: summary.reduce((acc, s) => acc + s.totalServices, 0),
    };
  }, [summary]);

  // Totals by beneficiary type
  const totalsByType = useMemo(() => {
    const byType: Record<BeneficiaryType, { total: number; pending: number; paid: number }> = {
      professional: { total: 0, pending: 0, paid: 0 },
      seller: { total: 0, pending: 0, paid: 0 },
      reception: { total: 0, pending: 0, paid: 0 },
    };

    summary.forEach(s => {
      byType[s.beneficiaryType].total += s.totalCommission;
      byType[s.beneficiaryType].pending += s.pendingCommission;
      byType[s.beneficiaryType].paid += s.paidCommission;
    });

    return byType;
  }, [summary]);

  // Lead source breakdown
  const leadSourceStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number; commission: number }> = {};
    filteredCalculations.forEach(calc => {
      const source = calc.leadSource || 'other';
      if (!stats[source]) {
        stats[source] = { count: 0, revenue: 0, commission: 0 };
      }
      if (calc.beneficiaryType === 'professional') {
        stats[source].count++;
        stats[source].revenue += calc.serviceValue;
      }
      stats[source].commission += calc.commissionAmount;
    });
    return Object.entries(stats).map(([source, data]) => ({
      name: leadSourceLabels[source as LeadSource] || source,
      source: source as LeadSource,
      ...data,
    }));
  }, [filteredCalculations]);

  // Count immutable (paid) commissions
  const paidCount = filteredCalculations.filter(c => c.status === 'paid').length;

  const chartData = summary.map((s) => ({
    name: s.professionalName.split(' ').slice(0, 2).join(' '),
    comissao: s.totalCommission,
    pendente: s.pendingCommission,
    pago: s.paidCommission,
  }));

  const pieData = Object.entries(totalsByType).map(([type, data], index) => ({
    name: beneficiaryTypeLabels[type as BeneficiaryType],
    value: data.total,
    color: COLORS[index % COLORS.length],
  })).filter(d => d.value > 0);

  const statusData = [
    { name: 'Pago', value: totals.paidCommission, color: 'hsl(var(--success))' },
    { name: 'Pendente', value: totals.pendingCommission, color: 'hsl(var(--warning))' },
  ];

  const handleExport = () => {
    console.log('Exporting commission report...');
  };

  const renderBeneficiaryTable = (data: CommissionSummary[], title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-2">{data.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma comissão neste período
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Atend.</TableHead>
                <TableHead className="text-right">Comissão Total</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
                <TableHead className="text-right">Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.professionalId}>
                  <TableCell className="font-medium">{s.professionalName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{s.totalServices}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(s.totalCommission)}
                  </TableCell>
                  <TableCell className="text-right text-warning">
                    {formatCurrency(s.pendingCommission)}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(s.paidCommission)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Subtotal</TableCell>
                <TableCell className="text-center">{data.reduce((acc, s) => acc + s.totalServices, 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.reduce((acc, s) => acc + s.totalCommission, 0))}</TableCell>
                <TableCell className="text-right text-warning">{formatCurrency(data.reduce((acc, s) => acc + s.pendingCommission, 0))}</TableCell>
                <TableCell className="text-right text-success">{formatCurrency(data.reduce((acc, s) => acc + s.paidCommission, 0))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <CommissionReportFilters
        startDate={startDate}
        endDate={endDate}
        selectedClinic={selectedClinic}
        selectedBeneficiaryType={selectedBeneficiaryType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClinicChange={setSelectedClinic}
        onBeneficiaryTypeChange={setSelectedBeneficiaryType}
        clinics={clinics}
        onExport={handleExport}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
                <DollarSign className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold">{formatCurrency(totals.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Percent className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Comissões</p>
                <p className="text-xl font-bold">{formatCurrency(totals.totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-warning">
                  {formatCurrency(totals.pendingCommission)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(totals.paidCommission)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Imutáveis</p>
                <p className="text-xl font-bold">{paidCount}</p>
                <p className="text-xs text-muted-foreground">comissões pagas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert about immutable rules */}
      {paidCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning-foreground">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
          <p className="text-sm">
            <strong>{paidCount} comissão(ões)</strong> já foi(ram) paga(s) e não pode(m) ser editada(s) ou excluída(s).
          </p>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="by-type" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-type">Por Tipo de Beneficiário</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="lead-source">Por Origem do Lead</TabsTrigger>
        </TabsList>

        {/* By Type Tab */}
        <TabsContent value="by-type" className="space-y-4">
          {/* Type summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(totalsByType) as [BeneficiaryType, { total: number; pending: number; paid: number }][]).map(([type, data]) => {
              const Icon = beneficiaryIcons[type];
              return (
                <Card key={type} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-primary/5" />
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{beneficiaryTypeLabels[type]}</p>
                          <p className="text-2xl font-bold">{formatCurrency(data.total)}</p>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pendente</span>
                      <span className="font-medium text-warning">{formatCurrency(data.pending)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-medium text-success">{formatCurrency(data.paid)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tables by type */}
          <div className="space-y-4">
            {renderBeneficiaryTable(
              summaryByType.professional,
              'Profissionais (Dentistas)',
              <Stethoscope className="h-4 w-4 text-primary" />
            )}
            {renderBeneficiaryTable(
              summaryByType.seller,
              'Vendedores',
              <UserCheck className="h-4 w-4 text-info" />
            )}
            {renderBeneficiaryTable(
              summaryByType.reception,
              'Recepção',
              <Headphones className="h-4 w-4 text-success" />
            )}
          </div>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comissões por Beneficiário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1).toFixed(0)}`} />
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="pago" name="Pago" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendente" name="Pendente" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lead Source Tab */}
        <TabsContent value="lead-source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comissões por Origem do Lead</CardTitle>
            </CardHeader>
            <CardContent>
              {leadSourceStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de origem de lead disponível
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Comissões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadSourceStats.map((stat) => {
                      const Icon = leadSourceIcons[stat.source] || HelpCircle;
                      return (
                        <TableRow key={stat.source}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {stat.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{stat.count}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(stat.revenue)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(stat.commission)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
