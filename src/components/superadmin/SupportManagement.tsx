import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Loader2,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  Image,
  Film,
  Paperclip,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface SupportTicket {
  id: string;
  clinic_id: string;
  user_id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  clinics?: { name: string; email: string } | null;
}

const TICKET_TYPES = [
  { value: 'request', label: 'Solicitação', icon: '📋' },
  { value: 'bug', label: 'Erro / Bug', icon: '🐛' },
  { value: 'billing', label: 'Financeiro', icon: '💳' },
  { value: 'feature', label: 'Sugestão', icon: '💡' },
  { value: 'other', label: 'Outro', icon: '📝' },
];

const TICKET_STATUSES = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
];

const TICKET_PRIORITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  open: { variant: 'default', label: 'Aberto' },
  in_progress: { variant: 'secondary', label: 'Em Andamento' },
  resolved: { variant: 'outline', label: 'Resolvido' },
  closed: { variant: 'outline', label: 'Fechado' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600 font-bold',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType.startsWith('video/')) return <Film className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function SupportManagement() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('admin-support-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchTickets()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          clinics (name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTickets((data || []).map(t => ({
        ...t,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      })));
    } catch (err) {
      console.error('Error fetching tickets:', err);
      toast.error('Erro ao carregar tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const openDetail = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReply(ticket.admin_reply || '');
    setNewStatus(ticket.status);
    setIsDetailOpen(true);
  };

  const handleSaveReply = async () => {
    if (!selected || !user) return;
    setIsReplying(true);

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          admin_reply: reply.trim() || null,
          admin_replied_at: reply.trim() ? new Date().toISOString() : null,
          admin_replied_by: reply.trim() ? user.id : null,
          status: newStatus,
        })
        .eq('id', selected.id);

      if (error) throw error;

      toast.success('Ticket atualizado!');
      setIsDetailOpen(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar resposta');
    } finally {
      setIsReplying(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      const clinicName = t.clinics?.name?.toLowerCase() || '';
      if (
        !t.subject.toLowerCase().includes(s) &&
        !t.message.toLowerCase().includes(s) &&
        !clinicName.includes(s)
      ) return false;
    }
    return true;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status === 'open').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Abertos</p>
            <p className="text-2xl font-bold text-primary">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Urgentes</p>
            <p className="text-2xl font-bold text-red-500">{urgentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {TICKET_STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {TICKET_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum ticket encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => {
            const typeConf = TICKET_TYPES.find(t => t.value === ticket.type);
            const statusConf = STATUS_BADGE[ticket.status] || STATUS_BADGE.open;
            return (
              <Card
                key={ticket.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all",
                  ticket.priority === 'urgent' && ticket.status === 'open' && "border-red-300 bg-red-50/30"
                )}
                onClick={() => openDetail(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm">{typeConf?.icon}</span>
                        <span className="font-medium truncate">{ticket.subject}</span>
                        {!ticket.admin_reply && ticket.status === 'open' && (
                          <Badge variant="destructive" className="text-xs">Não respondido</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ticket.clinics?.name || 'Clínica desconhecida'} · {ticket.clinics?.email}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <span className={cn("font-medium", PRIORITY_COLORS[ticket.priority])}>
                          {TICKET_PRIORITIES.find(p => p.value === ticket.priority)?.label}
                        </span>
                        {ticket.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {ticket.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Eye className="h-3 w-3" /> Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail/Reply Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2 pr-8">
                  <DialogTitle>
                    {TICKET_TYPES.find(t => t.value === selected.type)?.icon}{' '}
                    {selected.subject}
                  </DialogTitle>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>{selected.clinics?.name}</strong> · {selected.clinics?.email}
                  </p>
                  <p>
                    {format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {' · '}
                    <span className={cn(PRIORITY_COLORS[selected.priority])}>
                      Prioridade: {TICKET_PRIORITIES.find(p => p.value === selected.priority)?.label}
                    </span>
                  </p>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Client message */}
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Mensagem do cliente</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                </div>

                {/* Attachments */}
                {selected.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Anexos do cliente</p>
                    {selected.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/30"
                        onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')}
                      >
                        <span className="text-muted-foreground">{getFileIcon(att.type)}</span>
                        <span className="flex-1 text-sm truncate">{att.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(att.size)}</span>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Status change */}
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium w-16">Status:</p>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reply */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sua Resposta</p>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escreva sua resposta ao cliente..."
                    rows={5}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={isReplying}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveReply} disabled={isReplying} className="gap-2">
                  {isReplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Salvar Resposta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
