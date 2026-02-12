import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CreditCard, MoreHorizontal, CheckCircle, XCircle, Clock, Play, Pause, Trash2, Copy } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  slug: string;
}

interface Subscription {
  id: string;
  clinic_id: string;
  plan_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_status: string;
  last_payment_at: string | null;
  notes: string | null;
  created_at: string;
  clinic: {
    name: string;
    email: string;
  };
  plan: Plan | null;
}

export function SubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    plan_id: "",
    status: "",
    payment_status: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [subsResult, plansResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*, clinics(name, email), plans(id, name, slug)')
          .order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name, slug').eq('is_active', true),
      ]);

      if (subsResult.error) throw subsResult.error;
      if (plansResult.error) throw plansResult.error;

      setSubscriptions(subsResult.data.map(s => ({
        ...s,
        clinic: s.clinics as any,
        plan: s.plans as any,
      })));
      setPlans(plansResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  function openEditDialog(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setEditForm({
      plan_id: subscription.plan_id || "",
      status: subscription.status,
      payment_status: subscription.payment_status,
      notes: subscription.notes || "",
    });
    setIsEditDialogOpen(true);
  }

  async function handleSave() {
    if (!selectedSubscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: editForm.plan_id || null,
          status: editForm.status,
          payment_status: editForm.payment_status,
          notes: editForm.notes || null,
          current_period_start: editForm.status === 'active' ? new Date().toISOString() : selectedSubscription.current_period_start,
          current_period_end: editForm.status === 'active' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
            : selectedSubscription.current_period_end,
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Assinatura atualizada!');
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao atualizar assinatura');
    }
  }

  async function activateSubscription(subscription: Subscription) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          payment_status: 'paid',
          last_payment_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Assinatura ativada!');
      fetchData();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Erro ao ativar assinatura');
    }
  }

  async function markPaymentPaid(subscription: Subscription) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          payment_status: 'paid',
          last_payment_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Pagamento confirmado e assinatura liberada!');
      fetchData();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  }

  async function suspendSubscription(subscription: Subscription) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Assinatura suspensa!');
      fetchData();
    } catch (error) {
      console.error('Error suspending subscription:', error);
      toast.error('Erro ao suspender assinatura');
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.clinic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.clinic?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || sub.payment_status === filterPayment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Trial</Badge>;
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Ativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><Pause className="h-3 w-3 mr-1" /> Suspenso</Badge>;
      case 'expired':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Atrasado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Gestão de Assinaturas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por clínica..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.clinic?.name || '-'}</p>
                        <p className="text-sm text-muted-foreground">{sub.clinic?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{sub.plan?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(sub.status)}
                        {sub.status === 'trial' && sub.trial_ends_at && (
                          <p className="text-xs text-muted-foreground">
                            {isPast(new Date(sub.trial_ends_at))
                              ? 'Expirou'
                              : `Expira ${formatDistanceToNow(new Date(sub.trial_ends_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}`
                            }
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPaymentBadge(sub.payment_status)}</TableCell>
                    <TableCell>
                      {sub.current_period_end ? (
                        <span className="text-sm">
                          até {format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                            Editar
                          </DropdownMenuItem>
                          {sub.payment_status !== 'paid' && (
                            <DropdownMenuItem onClick={() => markPaymentPaid(sub)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar Pagamento
                            </DropdownMenuItem>
                          )}
                          {sub.status !== 'active' && (
                            <DropdownMenuItem onClick={() => activateSubscription(sub)}>
                              <Play className="h-4 w-4 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                          )}
                          {sub.status === 'active' && (
                            <DropdownMenuItem onClick={() => suspendSubscription(sub)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSubscriptionToDelete(sub);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.clinic?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={editForm.plan_id} onValueChange={(v) => setEditForm({ ...editForm, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status de Pagamento</Label>
              <Select value={editForm.payment_status} onValueChange={(v) => setEditForm({ ...editForm, payment_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notas internas..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) setSubscriptionToDelete(null); setIsDeleteDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deletar clínica e usuário</DialogTitle>
            <DialogDescription>
              Tem certeza? Isso removerá permanentemente a clínica &quot;{subscriptionToDelete?.clinic?.name}&quot; e o usuário associado (incluindo todos os dados: agendamentos, pacientes, financeiro, etc.). Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {/* Alternativa: script SQL para copiar e rodar no SQL Editor (ex.: PC corporativo sem deploy da Edge Function) */}
          {subscriptionToDelete?.clinic?.name != null && subscriptionToDelete?.clinic?.email != null && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground mb-2">Sem exclusão automática? (PC corporativo / Edge Function não publicada)</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  const name = String(subscriptionToDelete.clinic?.name ?? '').replace(/'/g, "''");
                  const email = String(subscriptionToDelete.clinic?.email ?? '').replace(/'/g, "''");
                  const sql = `-- Cole no SQL Editor do Supabase (Dashboard > SQL Editor) e execute.
DO $$
DECLARE
  v_clinic_id UUID;
  v_user_id UUID;
  v_clinic_name TEXT := '${name}';
  v_email TEXT := '${email}';
BEGIN
  SELECT id INTO v_clinic_id FROM clinics WHERE name = v_clinic_name LIMIT 1;
  IF v_clinic_id IS NULL THEN
    RAISE NOTICE 'Clínica "%" não encontrada.', v_clinic_name;
    RETURN;
  END IF;
  RAISE NOTICE 'Removendo clínica: %', v_clinic_name;
  DELETE FROM payment_history WHERE subscription_id IN (SELECT id FROM subscriptions WHERE clinic_id = v_clinic_id);
  DELETE FROM cash_closings WHERE clinic_id = v_clinic_id;
  DELETE FROM financial_transactions WHERE clinic_id = v_clinic_id;
  DELETE FROM appointments WHERE clinic_id = v_clinic_id;
  DELETE FROM patients WHERE clinic_id = v_clinic_id;
  DELETE FROM professionals WHERE clinic_id = v_clinic_id;
  DELETE FROM terms WHERE clinic_id = v_clinic_id;
  DELETE FROM upgrade_requests WHERE clinic_id = v_clinic_id;
  DELETE FROM commissions WHERE clinic_id = v_clinic_id;
  DELETE FROM inventory_movements WHERE clinic_id = v_clinic_id;
  DELETE FROM inventory_products WHERE clinic_id = v_clinic_id;
  DELETE FROM subscriptions WHERE clinic_id = v_clinic_id;
  DELETE FROM clinic_users WHERE clinic_id = v_clinic_id;
  DELETE FROM clinics WHERE id = v_clinic_id;
  SELECT user_id INTO v_user_id FROM profiles WHERE LOWER(email) = LOWER(v_email);
  IF v_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = v_user_id;
    DELETE FROM profiles WHERE user_id = v_user_id;
    BEGIN
      DELETE FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Remova o usuário manualmente em Authentication > Users.';
    END;
  END IF;
  RAISE NOTICE 'Concluído.';
END $$;`;
                  navigator.clipboard.writeText(sql).then(() => {
                    toast.success('Script SQL copiado. Cole no SQL Editor do Supabase e execute (Run).');
                  }).catch(() => toast.error('Não foi possível copiar.'));
                }}
              >
                <Copy className="h-4 w-4" />
                Copiar script SQL para colar no SQL Editor
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSubscriptionToDelete(null); }} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={async () => {
              if (!subscriptionToDelete) return;
              setIsDeleting(true);
              try {
                const { data, error } = await supabase.functions.invoke('delete-clinic-and-user', {
                  body: { clinic_id: subscriptionToDelete.clinic_id },
                });
                if (error) throw error;
                const err = (data as { error?: string })?.error;
                if (err) throw new Error(err);
                toast.success('Clínica e usuário excluídos.');
                setIsDeleteDialogOpen(false);
                setSubscriptionToDelete(null);
                fetchData();
              } catch (e: any) {
                const msg = e?.message || '';
                if (msg.includes('Edge Function') || msg.includes('Failed to send')) {
                  toast.error('Função de exclusão não está publicada no Supabase. Publique com: supabase functions deploy delete-clinic-and-user');
                } else {
                  toast.error(msg || 'Erro ao excluir.');
                }
              } finally {
                setIsDeleting(false);
              }
            }}>
              {isDeleting ? 'Excluindo...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
