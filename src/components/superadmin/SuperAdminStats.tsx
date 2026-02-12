import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Banknote,
  Building,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  suspendedClinics: number;
  paidSubscriptions: number;
  overdueSubscriptions: number;
  planDistribution: { name: string; value: number }[];
  mrr: number;
  revenue30d: number;
  activeSubscriptions: number;
  inactiveClinics: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

interface ClinicRow {
  id: string;
  name: string;
  is_active: boolean | null;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  clinic_id: string;
  status: string;
  payment_status: string | null;
  plan_id: string | null;
  last_payment_at: string | null;
  current_period_end: string | null;
  plans?: { name?: string | null; price_monthly?: number | null } | null;
}

interface PaymentRow {
  subscription_id: string;
  amount: number | string;
  status: string;
  created_at: string;
}

interface TopClinic {
  id: string;
  name: string;
  planName: string;
  statusLabel: string;
  paymentLabel: string;
  lastPayment: string;
  revenue30d: number;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function SuperAdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalClinics: 0,
    activeClinics: 0,
    trialClinics: 0,
    suspendedClinics: 0,
    paidSubscriptions: 0,
    overdueSubscriptions: 0,
    planDistribution: [],
    mrr: 0,
    revenue30d: 0,
    activeSubscriptions: 0,
    inactiveClinics: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [topClinics, setTopClinics] = useState<TopClinic[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id,name,is_active,created_at");

      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select(
          "id, clinic_id, status, payment_status, plan_id, last_payment_at, current_period_end, plans(name, price_monthly)"
        );

      const { data: payments } = await supabase
        .from("payment_history")
        .select("subscription_id, amount, status, created_at");

      const clinicsList = (clinics || []) as ClinicRow[];
      const subscriptionsList = (subscriptions || []) as SubscriptionRow[];
      const paymentsList = (payments || []) as PaymentRow[];

      const totalClinics = clinicsList.length;
      const activeClinics = clinicsList.filter((c) => c.is_active).length;
      const inactiveClinics = clinicsList.filter((c) => c.is_active === false).length;

      const trialClinics = subscriptionsList.filter((s) => s.status === "trial").length;
      const suspendedClinics = subscriptionsList.filter((s) => s.status === "suspended").length;
      const paidSubscriptions = subscriptionsList.filter((s) => s.payment_status === "paid").length;
      const overdueSubscriptions = subscriptionsList.filter((s) => s.payment_status === "overdue").length;
      const activeSubscriptions = subscriptionsList.filter((s) => s.status === "active").length;

      const planCounts: Record<string, number> = {};
      subscriptionsList.forEach((sub) => {
        const planName = sub.plans?.name || "Sem plano";
        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });
      const planDistribution = Object.entries(planCounts).map(([name, value]) => ({
        name,
        value,
      }));

      const paidActive = subscriptionsList.filter(
        (s) => s.status === "active" && s.payment_status === "paid"
      );
      const mrr = paidActive.reduce((sum, s) => sum + Number(s.plans?.price_monthly || 0), 0);

      const now = new Date();
      const from30d = new Date();
      from30d.setDate(now.getDate() - 30);

      const payments30d = paymentsList.filter((p) => {
        if (p.status !== "confirmed") return false;
        const dt = new Date(p.created_at);
        return dt >= from30d && dt <= now;
      });

      const revenue30d = payments30d.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const subscriptionById = new Map(subscriptionsList.map((s) => [s.id, s]));
      const paymentsBySubscription = new Map<string, number>();
      payments30d.forEach((p) => {
        const prev = paymentsBySubscription.get(p.subscription_id) || 0;
        paymentsBySubscription.set(p.subscription_id, prev + Number(p.amount || 0));
      });

      const revenueByPlanMap = new Map<string, number>();
      payments30d.forEach((p) => {
        const sub = subscriptionById.get(p.subscription_id);
        const planName = sub?.plans?.name || "Sem plano";
        const prev = revenueByPlanMap.get(planName) || 0;
        revenueByPlanMap.set(planName, prev + Number(p.amount || 0));
      });
      const revenueByPlanData = Array.from(revenueByPlanMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      const subscriptionByClinic = new Map<string, SubscriptionRow>();
      subscriptionsList.forEach((s) => {
        if (!subscriptionByClinic.has(s.clinic_id)) {
          subscriptionByClinic.set(s.clinic_id, s);
        }
      });

      const topClinicsData = clinicsList.map((clinic) => {
        const sub = subscriptionByClinic.get(clinic.id);
        const planName = sub?.plans?.name || "Sem plano";
        const revenue = sub ? paymentsBySubscription.get(sub.id) || 0 : 0;
        const statusLabel =
          sub?.status === "active"
            ? "Ativa"
            : sub?.status === "trial"
              ? "Trial"
              : sub?.status === "suspended"
                ? "Suspensa"
                : sub?.status === "cancelled"
                  ? "Cancelada"
                  : sub?.status === "expired"
                    ? "Expirada"
                    : "Indefinida";
        const paymentLabel =
          sub?.payment_status === "paid"
            ? "Pago"
            : sub?.payment_status === "overdue"
              ? "Atrasado"
              : sub?.payment_status === "failed"
                ? "Falhou"
                : "Pendente";
        const lastPayment = sub?.last_payment_at
          ? new Date(sub.last_payment_at).toLocaleDateString("pt-BR")
          : "-";
        return {
          id: clinic.id,
          name: clinic.name,
          planName,
          statusLabel,
          paymentLabel,
          lastPayment,
          revenue30d: revenue,
        };
      });

      topClinicsData.sort((a, b) => b.revenue30d - a.revenue30d);
      const topClinicsFinal = topClinicsData.slice(0, 8);

      setStats({
        totalClinics,
        activeClinics,
        trialClinics,
        suspendedClinics,
        paidSubscriptions,
        overdueSubscriptions,
        planDistribution,
        mrr,
        revenue30d,
        activeSubscriptions,
        inactiveClinics,
      });
      setTopClinics(topClinicsFinal);
      setRevenueByPlan(revenueByPlanData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusData = [
    { name: "Trial", value: stats.trialClinics },
    { name: "Ativas", value: stats.activeClinics - stats.trialClinics },
    { name: "Suspensas", value: stats.suspendedClinics },
    { name: "Inativas", value: stats.inactiveClinics },
  ].filter((d) => d.value > 0);

  const hasRevenueByPlan = revenueByPlan.length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-300">Visao SuperAdmin</p>
            <h2 className="text-2xl font-semibold">Operacao Geral da Plataforma</h2>
            <p className="text-sm text-slate-300 mt-1">
              Acompanhamento global de clientes, planos e receita.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-300">MRR estimado</p>
              <p className="text-lg font-semibold">{currency.format(stats.mrr)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clinicas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClinics}</div>
            <p className="text-xs text-muted-foreground">{stats.activeClinics} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialClinics}</div>
            <p className="text-xs text-muted-foreground">7 dias de teste</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adimplentes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Pagamentos em dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Pagamentos atrasados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita 30d</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency.format(stats.revenue30d)}</div>
            <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas ativas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Em operacao</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponÃ­vel
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das Clinicas</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponÃ­vel
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top clientes (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinica</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Ultimo pagamento</TableHead>
                  <TableHead className="text-right">Receita 30d</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClinics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum dado disponivel
                    </TableCell>
                  </TableRow>
                )}
                {topClinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>{clinic.planName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{clinic.statusLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={clinic.paymentLabel === "Pago" ? "default" : "destructive"}>
                        {clinic.paymentLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{clinic.lastPayment}</TableCell>
                    <TableCell className="text-right">{currency.format(clinic.revenue30d)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita 30d por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {hasRevenueByPlan ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByPlan}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponÃ­vel
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
