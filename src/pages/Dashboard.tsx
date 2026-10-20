import { Calendar, Users, Stethoscope, DollarSign, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentsList } from "@/components/dashboard/AppointmentsList";
import { ReturnAlertsList } from "@/components/dashboard/ReturnAlertsList";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCurrentClinic } from "@/hooks/useCurrentClinic";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { stats, isLoading } = useDashboardStats();
  const { currentClinic, isLoading: isLoadingClinic } = useCurrentClinic();

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  if (isLoading || isLoadingClinic) {
    return (
      <div className="min-h-screen">
        <Header
          title="Dashboard"
          subtitle={`Bem-vindo ao HealthCare • ${today}`}
        />
        <div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="min-h-screen">
      <Header
        title={currentClinic ? currentClinic.name : "Dashboard"}
        subtitle={`Bem-vindo ao HealthCare • ${today}`}
      />

      <div>
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Agendamentos Hoje"
            value={stats?.appointmentsToday || 0}
            subtitle="exceto cancelados · vs ontem"
            icon={Calendar}
            trend={stats?.appointmentTrend ? { 
              value: Math.abs(stats.appointmentTrend), 
              isPositive: stats.appointmentTrend >= 0 
            } : undefined}
            variant="primary"
          />
          <StatCard
            title="Total de Pacientes"
            value={stats?.totalPatients?.toLocaleString('pt-BR') || "0"}
            subtitle={`${stats?.newPatientsThisMonth || 0} novos este mês`}
            icon={Users}
            trend={stats?.newPatientsThisMonth ? { 
              value: stats.newPatientsThisMonth, 
              isPositive: true 
            } : undefined}
            variant="info"
          />
          <StatCard
            title="Profissionais Ativos"
            value={stats?.activeProfessionals || 0}
            subtitle="disponíveis"
            icon={Stethoscope}
            variant="success"
          />
          <StatCard
            title="Saldo do Dia"
            value={formatCurrency(stats?.todayBalance || 0)}
            subtitle="receitas - despesas"
            icon={DollarSign}
            trend={stats?.todayBalance ? { 
              value: 100, 
              isPositive: (stats?.todayBalance || 0) >= 0 
            } : undefined}
            variant="warning"
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-emerald-500 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Confirmados</p>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats?.appointmentsByStatus.confirmed || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">paciente confirmou presença</p>
          </div>
          <div className="rounded-xl border-2 border-amber-400 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Aguardando</p>
              <Clock3 className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats?.appointmentsByStatus.pending || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">ainda sem resposta</p>
          </div>
          <div className="rounded-xl border-2 border-red-500 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Cancelados</p>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{stats?.appointmentsByStatus.cancelled || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">paciente cancelou</p>
          </div>
        </div>

        {/* Main Content Grid: chart + ações à esquerda; próximas consultas + alertas à direita */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Col 1–2: Gráfico */}
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>

          {/* Col 3: Ações rápidas */}
          <div>
            <QuickActions />
          </div>

          {/* Col 1–2: Próximas consultas (sobe e preenche espaço) */}
          <div className="lg:col-span-2">
            <AppointmentsList />
          </div>

          {/* Col 3: Alertas de retorno */}
          <div>
            <ReturnAlertsList />
          </div>
        </div>
      </div>
    </div>
  );
}
