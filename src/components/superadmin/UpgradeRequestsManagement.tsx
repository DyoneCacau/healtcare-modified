import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Search, TrendingUp, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
}

interface UpgradeRequest {
  id: string;
  clinic_id: string;
  subscription_id: string | null;
  requested_by: string;
  requested_feature: string | null;
  requested_plan_id: string | null;
  current_plan_id: string | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  clinic?: {
    name: string;
    email: string;
  };
  current_plan?: {
    name: string;
  };
  requested_plan?: {
    name: string;
  };
}

export function UpgradeRequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processAction, setProcessAction] = useState<'approve' | 'reject'>('approve');
  const [processForm, setProcessForm] = useState({
    plan_id: "",
    admin_notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [requestsResult, plansResult] = await Promise.all([
        supabase
          .from('upgrade_requests')
          .select(`
            *,
            clinics:clinic_id(name, email),
            current_plan:current_plan_id(name),
            requested_plan:requested_plan_id(name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name, slug, price_monthly').eq('is_active', true).order('price_monthly'),
      ]);

      if (requestsResult.error) throw requestsResult.error;
      if (plansResult.error) throw plansResult.error;

      setRequests(requestsResult.data.map((r: any) => ({
        ...r,
        clinic: r.clinics,
        current_plan: r.current_plan,
        requested_plan: r.requested_plan,
      })));
      setPlans(plansResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setIsLoading(false);
    }
  }

  function openProcessDialog(request: UpgradeRequest, action: 'approve' | 'reject') {
    setSelectedRequest(request);
    setProcessAction(action);
    setProcessForm({
      plan_id: request.requested_plan_id || "",
      admin_notes: "",
    });
    setIsProcessDialogOpen(true);
  }

  async function handleProcess() {
    if (!selectedRequest || !user) return;

    try {
      // Atualizar solicitação
      const { error: requestError } = await supabase
        .from('upgrade_requests')
        .update({
          status: processAction === 'approve' ? 'approved' : 'rejected',
          admin_notes: processForm.admin_notes || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // Se aprovado, atualizar assinatura com novo plano
      if (processAction === 'approve' && processForm.plan_id && selectedRequest.subscription_id) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: processForm.plan_id,
            status: 'active',
            payment_status: 'paid',
            last_payment_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', selectedRequest.subscription_id);

        if (subError) throw subError;
      }

      toast.success(
        processAction === 'approve' 
          ? 'Solicitação aprovada e plano atualizado!' 
          : 'Solicitação rejeitada'
      );
      setIsProcessDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Erro ao processar solicitação');
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.clinic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.clinic?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requested_feature?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Solicitações de Upgrade
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por clínica ou módulo..."
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
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de upgrade encontrada</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Módulo Solicitado</TableHead>
                  <TableHead>Plano Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className={request.status === 'pending' ? 'bg-yellow-50/50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.clinic?.name || '-'}</p>
                        <p className="text-sm text-muted-foreground">{request.clinic?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.requested_feature || '-'}</span>
                        {request.notes && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            title={request.notes}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.current_plan?.name || 'Sem plano'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => openProcessDialog(request, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => openProcessDialog(request, 'reject')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {request.status !== 'pending' && request.processed_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.processed_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approve' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'approve'
                ? 'Selecione o plano para ativar e adicione observações.'
                : 'Informe o motivo da rejeição.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Clínica:</strong> {selectedRequest?.clinic?.name}</p>
              <p className="text-sm"><strong>Módulo solicitado:</strong> {selectedRequest?.requested_feature}</p>
              <p className="text-sm"><strong>Plano atual:</strong> {selectedRequest?.current_plan?.name || 'Sem plano'}</p>
              {selectedRequest?.notes && (
                <p className="text-sm"><strong>Mensagem do cliente:</strong> {selectedRequest.notes}</p>
              )}
            </div>

            {processAction === 'approve' && (
              <div className="space-y-2">
                <Label>Novo Plano *</Label>
                <Select 
                  value={processForm.plan_id} 
                  onValueChange={(v) => setProcessForm({ ...processForm, plan_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price_monthly.toFixed(2)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{processAction === 'approve' ? 'Observações (opcional)' : 'Motivo da rejeição *'}</Label>
              <Textarea
                value={processForm.admin_notes}
                onChange={(e) => setProcessForm({ ...processForm, admin_notes: e.target.value })}
                placeholder={processAction === 'approve' ? 'Observações internas...' : 'Informe o motivo...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleProcess}
              variant={processAction === 'approve' ? 'default' : 'destructive'}
              disabled={
                (processAction === 'approve' && !processForm.plan_id) ||
                (processAction === 'reject' && !processForm.admin_notes)
              }
            >
              {processAction === 'approve' ? 'Aprovar e Ativar Plano' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
