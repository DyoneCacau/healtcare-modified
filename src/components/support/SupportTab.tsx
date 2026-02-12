import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Plus,
  Paperclip,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileText,
  Image,
  Film,
  Eye,
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
}

const TICKET_TYPES = [
  { value: 'request', label: 'Solicitação', icon: '📋' },
  { value: 'bug', label: 'Erro / Bug', icon: '🐛' },
  { value: 'billing', label: 'Financeiro / Cobrança', icon: '💳' },
  { value: 'feature', label: 'Sugestão de Melhoria', icon: '💡' },
  { value: 'other', label: 'Outro', icon: '📝' },
];

const TICKET_PRIORITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  open: { label: 'Aberto', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'Em Andamento', variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  resolved: { label: 'Resolvido', variant: 'outline', icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
  closed: { label: 'Fechado', variant: 'outline', icon: <X className="h-3 w-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType.startsWith('video/')) return <Film className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportTab() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: 'request',
    subject: '',
    message: '',
    priority: 'normal',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  useEffect(() => {
    if (user) {
      loadClinicAndTickets();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel('support-tickets-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `clinic_id=eq.${clinicId}` },
        () => loadTickets(clinicId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  const loadClinicAndTickets = async () => {
    if (!user) return;
    try {
      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clinicUser?.clinic_id) {
        setClinicId(clinicUser.clinic_id);
        await loadTickets(clinicUser.clinic_id);
      }
    } catch (err) {
      console.error('Error loading clinic:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTickets = async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('clinic_id', cid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []).map(t => ({
        ...t,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      })));
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: tipo não permitido`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: maior que 10MB`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    const combined = [...files, ...valid].slice(0, MAX_FILES);
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<Attachment[]> => {
    if (files.length === 0) return [];
    setUploadProgress(true);

    const uploaded: Attachment[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('support-attachments')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(path);

      uploaded.push({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    setUploadProgress(false);
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!user || !clinicId) return;

    if (!form.subject.trim()) {
      toast.error('Por favor, informe o assunto');
      return;
    }
    if (!form.message.trim()) {
      toast.error('Por favor, descreva sua mensagem');
      return;
    }

    setIsSubmitting(true);
    try {
      const attachments = await uploadFiles();

      const { error } = await supabase.from('support_tickets').insert({
        clinic_id: clinicId,
        user_id: user.id,
        type: form.type,
        subject: form.subject.trim(),
        message: form.message.trim(),
        priority: form.priority,
        attachments,
        status: 'open',
      });

      if (error) throw error;

      // Create admin notification
      await supabase.from('admin_notifications').insert({
        type: 'support_ticket',
        title: `Novo ticket: ${form.subject.trim()}`,
        message: `Tipo: ${TICKET_TYPES.find(t => t.value === form.type)?.label} | Prioridade: ${TICKET_PRIORITIES.find(p => p.value === form.priority)?.label}`,
        reference_type: 'support_ticket',
        reference_id: clinicId,
      });

      toast.success('Ticket enviado com sucesso! Responderemos em breve.');
      setForm({ type: 'request', subject: '', message: '', priority: 'normal' });
      setFiles([]);
      setIsDialogOpen(false);
      loadTickets(clinicId);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      toast.error(err.message || 'Erro ao enviar ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const openAttachment = (att: Attachment) => {
    window.open(att.url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suporte</h3>
          <p className="text-sm text-muted-foreground">
            Envie mensagens, reporte erros ou solicite ajuda à nossa equipe.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">Nenhum ticket ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Novo Ticket" para entrar em contato com o suporte.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            const typeConf = TICKET_TYPES.find(t => t.value === ticket.type);
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm">{typeConf?.icon}</span>
                        <span className="font-medium truncate">{ticket.subject}</span>
                        {ticket.admin_reply && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                            Respondido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {ticket.attachments.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {ticket.attachments.length} anexo{ticket.attachments.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={cn("text-xs font-medium", PRIORITY_COLORS[ticket.priority])}>
                          Prioridade: {TICKET_PRIORITIES.find(p => p.value === ticket.priority)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={statusConf.variant} className="gap-1 text-xs">
                        {statusConf.icon}
                        {statusConf.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Novo Ticket de Suporte
            </DialogTitle>
            <DialogDescription>
              Descreva sua solicitação. Nossa equipe responderá em breve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={PRIORITY_COLORS[p.value]}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Resumo do problema ou solicitação"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">{form.subject.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Descreva detalhadamente sua solicitação, erro ou dúvida..."
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <Label>Anexos (opcional)</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para anexar ou arraste arquivos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Imagens, PDFs e vídeos • Máx. 10MB por arquivo • Até {MAX_FILES} arquivos
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
              />

              {files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2 bg-muted/20">
                      <span className="text-muted-foreground">{getFileIcon(file.type)}</span>
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || uploadProgress} className="gap-2">
              {isSubmitting || uploadProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress ? 'Enviando arquivos...' : 'Enviando...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2 pr-8">
                  <DialogTitle className="text-lg leading-tight">
                    {TICKET_TYPES.find(t => t.value === selectedTicket.type)?.icon}{' '}
                    {selectedTicket.subject}
                  </DialogTitle>
                  <Badge variant={STATUS_CONFIG[selectedTicket.status]?.variant || 'default'}>
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </Badge>
                </div>
                <DialogDescription>
                  Enviado em {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo: </span>
                    <span className="font-medium">
                      {TICKET_TYPES.find(t => t.value === selectedTicket.type)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prioridade: </span>
                    <span className={cn("font-medium", PRIORITY_COLORS[selectedTicket.priority])}>
                      {TICKET_PRIORITIES.find(p => p.value === selectedTicket.priority)?.label}
                    </span>
                  </div>
                </div>

                {/* Original message */}
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Sua mensagem</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                {/* Attachments */}
                {selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Anexos</p>
                    <div className="grid gap-2">
                      {selectedTicket.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/30"
                          onClick={() => openAttachment(att)}
                        >
                          <span className="text-muted-foreground">{getFileIcon(att.type)}</span>
                          <span className="flex-1 text-sm truncate">{att.name}</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(att.size)}</span>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Reply */}
                {selectedTicket.admin_reply && (
                  <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-xs font-medium text-primary uppercase tracking-wide">Resposta do Suporte</p>
                      {selectedTicket.admin_replied_at && (
                        <p className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(selectedTicket.admin_replied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                  </div>
                )}

                {!selectedTicket.admin_reply && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border p-3 bg-muted/10">
                    <Clock className="h-4 w-4" />
                    <span>Aguardando resposta da equipe de suporte.</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
