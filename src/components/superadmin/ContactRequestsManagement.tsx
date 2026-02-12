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
import { toast } from "sonner";
import { 
  Search, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Phone,
  Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  status: string;
  notes: string | null;
  contacted_by: string | null;
  contacted_at: string | null;
  created_at: string;
}

const STATUS_LABELS = {
  pending: { label: "Pendente", color: "bg-amber-500" },
  contacted: { label: "Contatado", color: "bg-blue-500" },
  converted: { label: "Convertido", color: "bg-green-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500" },
};

export function ContactRequestsManagement() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchRequests();

    // Real-time updates
    const channel = supabase
      .channel('contact-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_requests' },
        fetchRequests
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setIsLoading(false);
    }
  }

  function openDetailDialog(request: ContactRequest) {
    setSelectedRequest(request);
    setNotes(request.notes || "");
    setNewStatus(request.status);
    setIsDetailDialogOpen(true);
  }

  async function handleUpdate() {
    if (!selectedRequest) return;

    try {
      const updates: any = {
        status: newStatus,
        notes: notes || null,
      };

      // Se mudou para contacted e ainda não tinha sido contatado
      if (newStatus === "contacted" && !selectedRequest.contacted_at) {
        updates.contacted_at = new Date().toISOString();
        updates.contacted_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from("contact_requests")
        .update(updates)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Solicitação atualizada com sucesso!");
      setIsDetailDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast.error(error.message || "Erro ao atualizar solicitação");
    }
  }

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phone.includes(searchTerm);

    const matchesStatus = filterStatus === "all" || req.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_LABELS[status as keyof typeof STATUS_LABELS];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Solicitações de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="contacted">Contatado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {request.email}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {request.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(request.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailDialog(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Visualize e gerencie a solicitação de contato
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status Atual</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedRequest.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedRequest.phone}
                </p>
              </div>

              {selectedRequest.message && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mensagem</Label>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Recebido em
                </Label>
                <p className="text-sm">
                  {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Alterar Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Pendente
                        </div>
                      </SelectItem>
                      <SelectItem value="contacted">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contatado
                        </div>
                      </SelectItem>
                      <SelectItem value="converted">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Convertido
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Rejeitado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adicione observações sobre esta solicitação..."
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
