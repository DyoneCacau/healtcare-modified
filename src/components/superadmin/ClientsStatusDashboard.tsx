// ============================================================================
// COMPONENTE: Dashboard de Status dos Clientes
// Arquivo: src/components/superadmin/ClientsStatusDashboard.tsx
// ============================================================================

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  DollarSign,
  Ban,
  Play,
  RefreshCw
} from "lucide-react";
import { asaasBillingService, type BillingProvider } from "@/services/asaasBillingService";

interface ClientStatus {
  clinic_id: string;
  clinic_name: string;
  cnpj: string;
  admin_name: string;
  admin_email: string;
  subscription_id: string;
  subscription_status: string;
  billing_status: string;
  monthly_fee: number;
  setup_fee: number;
  modules?: string[];
  plan_name: string;
  total_clinics_of_admin: number;
  total_paid: number;
  last_payment_at?: string | null;
  current_period_end?: string | null;
  billing_provider: BillingProvider;
  asaas_subscription_id?: string | null;
}

interface DashboardStats {
  total_clients?: number;
  total_mrr?: number;
}

export function ClientsStatusDashboard() {
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadData();

    // Real-time updates
    const channel = supabase
      .channel('clients-status-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_history' }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    setLoading(true);
    
    try {
      const [statsResult, clientsResult, providersResult] = await Promise.all([
        supabase.rpc('get_superadmin_stats'),
        supabase.from('vw_clients_status').select('*').order('clinic_name'),
        supabase.from('subscriptions').select('id, payment_provider'),
      ]);
      const statsData = statsResult.data;
      setStats(statsData as DashboardStats | null);

      const clientsData = clientsResult.data;
      const providerBySubscription = new Map(
        (providersResult.data ?? []).map((item) => [
          item.id,
          item.payment_provider === "asaas" ? "asaas" : "manual",
        ] as const),
      );

      if (clientsData) {
        setClients(clientsData.map((item) => {
          const row = item as unknown as Omit<ClientStatus, "billing_provider"> & {
            billing_provider?: BillingProvider | null;
            asaas_subscription_id?: string | null;
          };
          return {
            ...row,
            billing_provider: providerBySubscription.get(row.subscription_id)
              ?? (row.billing_provider === "asaas" || row.asaas_subscription_id ? "asaas" : "manual"),
          };
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function updateBillingStatus(subscriptionId: string, newStatus: string) {
    try {
      const { error } = await supabase.rpc('update_billing_status', {
        p_subscription_id: subscriptionId,
        p_new_status: newStatus
      });

      if (error) throw error;

      toast.success('Status atualizado com sucesso!');
      loadData();
    } catch (error: unknown) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status');
    }
  }

  async function suspendUnit(subscriptionId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.warning('Unidade suspensa (acesso bloqueado). Cobrança Asaas, se existir, continua até cancelar a recorrência.');
      loadData();
    } catch (error: unknown) {
      console.error('Erro ao suspender:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao suspender unidade');
    }
  }

  async function activateUnit(subscriptionId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Unidade reativada');
      loadData();
    } catch (error: unknown) {
      console.error('Erro ao ativar:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao ativar unidade');
    }
  }

  async function cancelAsaasUnit(subscriptionId: string) {
    if (!window.confirm('Cancelar apenas a recorrência Asaas desta unidade? O acesso pode permanecer até você suspender a assinatura.')) {
      return;
    }
    try {
      await asaasBillingService.cancelSubscription(subscriptionId);
      toast.success('Recorrência Asaas cancelada nesta unidade.');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar recorrência.');
    }
  }

  async function syncAsaas(subscriptionId: string) {
    try {
      await asaasBillingService.listPayments(subscriptionId, 1);
      toast.success("Cobranças do Asaas atualizadas.");
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao sincronizar cobrança.");
    }
  }

  function getBillingStatusBadge(status: string) {
    const variants = {
      paid: { variant: "default" as const, icon: CheckCircle2, label: "Pago", className: "bg-green-500" },
      pending: { variant: "secondary" as const, icon: Clock, label: "Pendente", className: "bg-yellow-500" },
      overdue: { variant: "destructive" as const, icon: AlertTriangle, label: "Atrasado", className: "bg-red-500" }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  function getSubscriptionStatusBadge(status: string) {
    const variants = {
      active: { variant: "default" as const, label: "Ativo", className: "bg-green-500" },
      pending: { variant: "secondary" as const, label: "Pendente", className: "bg-gray-500" },
      suspended: { variant: "destructive" as const, label: "Suspenso", className: "bg-red-500" },
      cancelled: { variant: "outline" as const, label: "Cancelado", className: "" }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  }

  function getDaysSinceLastPayment(client: ClientStatus): number | null {
    if (!client.last_payment_at) return null;
    const last = new Date(client.last_payment_at);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  }

  function getDaysUntilDue(client: ClientStatus): number | null {
    if (!client.current_period_end) return null;
    const due = new Date(client.current_period_end);
    const now = new Date();
    return Math.floor((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }

  function formatDaysInfo(client: ClientStatus): { text: string; className: string } {
    const daysSince = getDaysSinceLastPayment(client);
    const daysUntil = getDaysUntilDue(client);

    if (client.billing_status === "pending" && !client.last_payment_at) {
      return { text: "Aguardando 1º pagamento", className: "text-amber-600 font-medium" };
    }
    if (client.billing_status === "overdue") {
      const d = daysSince ?? 0;
      return { text: `${d} dia${d !== 1 ? "s" : ""} em atraso`, className: "text-red-600 font-semibold" };
    }
    if (daysSince !== null) {
      if (daysSince <= 7) return { text: `${daysSince} dia${daysSince !== 1 ? "s" : ""}`, className: "text-green-600" };
      if (daysSince <= 30) return { text: `${daysSince} dias`, className: "text-amber-600" };
      return { text: `${daysSince} dias`, className: "text-orange-600 font-medium" };
    }
    return { text: "—", className: "text-muted-foreground" };
  }

  function getRowClassName(client: ClientStatus): string {
    if (client.billing_status === "overdue") return "bg-red-50 dark:bg-red-950/20";
    const daysSince = getDaysSinceLastPayment(client);
    if (daysSince !== null && daysSince > 30) return "bg-amber-50/50 dark:bg-amber-950/10";
    return "";
  }

  const adimplentes = clients.filter(c => c.billing_status === 'paid' && c.subscription_status === 'active');
  const pendentes = clients.filter(c => c.billing_status === 'pending');
  const atrasados = clients.filter(c => c.billing_status === 'overdue');
  const suspensos = clients.filter(c => c.subscription_status === 'suspended');

  const groups = Object.values(
    clients.reduce<Record<string, {
      key: string;
      admin_name: string;
      admin_email: string;
      units: ClientStatus[];
    }>>((acc, client) => {
      const key = client.admin_email || client.clinic_id;
      if (!acc[key]) {
        acc[key] = {
          key,
          admin_name: client.admin_name || "Sem admin",
          admin_email: client.admin_email || "—",
          units: [],
        };
      }
      acc[key].units.push(client);
      return acc;
    }, {}),
  ).sort((a, b) => a.admin_name.localeCompare(b.admin_name, "pt-BR"));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clínicas cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Adimplentes
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {adimplentes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ativos e em dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasados
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {atrasados.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamento em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.total_mrr || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita mensal recorrente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Todos ({clients.length})
        </Button>
        <Button variant="outline" size="sm" className="text-green-600">
          Adimplentes ({adimplentes.length})
        </Button>
        <Button variant="outline" size="sm" className="text-yellow-600">
          Pendentes ({pendentes.length})
        </Button>
        <Button variant="outline" size="sm" className="text-yellow-800">
          Atrasados ({atrasados.length})
        </Button>
        <Button variant="outline" size="sm" className="text-red-600">
          Suspensos ({suspensos.length})
        </Button>
      </div>

      {/* CLIENTES AGRUPADOS POR DONO/GRUPO */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes e unidades</CardTitle>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            Agrupado por dono/grupo. Cada unidade tem cobrança própria.
            <strong> Suspender unidade</strong> bloqueia o acesso;
            <strong> Cancelar recorrência Asaas</strong> para a cobrança;
            <strong> Desativar clínica</strong> fica na aba Clínicas.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {groups.map((group) => {
            const groupMrr = group.units.reduce(
              (sum, unit) => sum + (unit.subscription_status === "active" ? Number(unit.monthly_fee || 0) : 0),
              0,
            );
            return (
              <div key={group.key} className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <div>
                    <p className="font-medium">{group.admin_name}</p>
                    <p className="text-xs text-muted-foreground">{group.admin_email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {group.units.length} unidade{group.units.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary">
                      MRR do grupo: R$ {groupMrr.toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status Assinatura</TableHead>
                      <TableHead>Status Pagamento</TableHead>
                      <TableHead>Próx. vencimento</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.units.map((client) => (
                      <TableRow key={client.clinic_id} className={getRowClassName(client)}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.clinic_name}</div>
                            <div className="text-xs text-muted-foreground">{client.cnpj}</div>
                          </div>
                        </TableCell>
                        <TableCell>{client.plan_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={client.billing_provider === "asaas" ? "default" : "outline"}>
                            {client.billing_provider === "asaas" ? "Asaas" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getSubscriptionStatusBadge(client.subscription_status)}
                        </TableCell>
                        <TableCell>
                          {getBillingStatusBadge(client.billing_status)}
                        </TableCell>
                        <TableCell>
                          {client.current_period_end ? (
                            <span className={getDaysUntilDue(client) !== null && (getDaysUntilDue(client) ?? 0) <= 5 ? "text-amber-600 font-medium" : ""}>
                              {new Date(client.current_period_end).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          R$ {client.monthly_fee?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {client.billing_provider === "asaas" && (
                                <>
                                  <DropdownMenuItem onClick={() => syncAsaas(client.subscription_id)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Atualizar cobranças
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => cancelAsaasUnit(client.subscription_id)}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancelar recorrência Asaas
                                  </DropdownMenuItem>
                                </>
                              )}
                              {client.subscription_status === "suspended" ? (
                                <DropdownMenuItem
                                  onClick={() => activateUnit(client.subscription_id)}
                                  className="text-green-600"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Reativar acesso da unidade
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => suspendUnit(client.subscription_id)}
                                  className="text-red-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspender acesso da unidade
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </CardContent>
      </Card>

    </div>
  );
}

