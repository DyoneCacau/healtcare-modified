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
  Play
} from "lucide-react";

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
}

export function ClientsStatusDashboard() {
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

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
      // Carregar estatísticas
      const { data: statsData } = await supabase.rpc('get_superadmin_stats');
      setStats(statsData);

      // Carregar lista de clientes via view
      const { data: clientsData } = await supabase
        .from('vw_clients_status')
        .select('*')
        .order('clinic_name');

      if (clientsData) {
        setClients(clientsData as any);
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
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
    }
  }

  async function suspendClient(subscriptionId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.warning('Cliente suspenso');
      loadData();
    } catch (error: any) {
      console.error('Erro ao suspender:', error);
      toast.error(error.message || 'Erro ao suspender cliente');
    }
  }

  async function activateClient(subscriptionId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Cliente ativado');
      loadData();
    } catch (error: any) {
      console.error('Erro ao ativar:', error);
      toast.error(error.message || 'Erro ao ativar cliente');
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

      {/* TABELA DE CLIENTES */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            Para alterar plano ou módulos, use as abas <strong>Assinaturas</strong> e <strong>Planos</strong>. Para registrar pagamento e ativar plano, use a aba <strong>Pagamentos</strong>.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Status Assinatura</TableHead>
                <TableHead>Status Pagamento</TableHead>
                <TableHead>Desde último pagamento</TableHead>
                <TableHead>Próx. vencimento</TableHead>
                <TableHead>Mensalidade</TableHead>
                <TableHead>Total Pago</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.clinic_id} className={getRowClassName(client)}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.clinic_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.cnpj}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{client.admin_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.admin_email}
                      </div>
                      {client.total_clinics_of_admin > 1 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {client.total_clinics_of_admin} clínicas
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.plan_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.modules?.slice(0, 3).map(module => (
                        <Badge key={module} variant="secondary" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                      {client.modules?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{client.modules.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSubscriptionStatusBadge(client.subscription_status)}
                  </TableCell>
                  <TableCell>
                    {getBillingStatusBadge(client.billing_status)}
                  </TableCell>
                  <TableCell>
                    <span className={formatDaysInfo(client).className}>
                      {formatDaysInfo(client).text}
                    </span>
                  </TableCell>
                  <TableCell>
                    {client.current_period_end ? (
                      <span className={getDaysUntilDue(client) !== null && (getDaysUntilDue(client) ?? 0) <= 5 ? "text-amber-600 font-medium" : ""}>
                        {new Date(client.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    R$ {client.monthly_fee?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>
                    R$ {client.total_paid?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {client.subscription_status === 'suspended' ? (
                          <DropdownMenuItem
                            onClick={() => activateClient(client.subscription_id)}
                            className="text-green-600"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Ativar Cliente
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => suspendClient(client.subscription_id)}
                            className="text-red-600"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Suspender Cliente
                          </DropdownMenuItem>
                        )}

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}

