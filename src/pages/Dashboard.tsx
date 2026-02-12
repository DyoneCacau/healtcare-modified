import { Calendar, Users, Stethoscope, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentsList } from "@/components/dashboard/AppointmentsList";
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
        <div className="p-6">
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

      <div className="p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Agendamentos Hoje"
            value={stats?.appointmentsToday || 0}
            subtitle="vs ontem"
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Appointments List */}
        <div className="mt-6">
          <AppointmentsList />
        </div>
      </div>
    </div>
  );
}
