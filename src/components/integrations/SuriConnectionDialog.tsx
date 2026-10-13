import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, RefreshCw, Send, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecretRevealField } from './SecretRevealField';
import { SuriTemplateModels } from './SuriTemplateModels';
import { SuriTemplatePicker, type TemplateSelectionState } from './SuriTemplatePicker';
import { useClinicProcedures } from '@/hooks/useClinicProcedures';
import {
  useSuriConnectionMutations,
  useSuriReminders,
  useSuriTemplates,
  type AppointmentReminderStatus,
} from '@/hooks/useSuriConnection';
import { parseKeywordList, readSuriConfig, SURI_TIMEZONES } from '@/lib/suriConfig';
import type { SuriModelKind } from '@/lib/suriTemplateModels';
import type { Integration } from '@/types/integration';

interface SuriConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: Integration | null;
  canEdit: boolean;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);

const REMINDER_STATUS: Record<AppointmentReminderStatus, { label: string; className: string }> = {
  sending: { label: 'Enviando', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Aguardando resposta', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  confirmed: { label: 'Confirmou', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelou', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  failed: { label: 'Falhou', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  skipped: { label: 'Não enviado', className: 'bg-muted text-muted-foreground' },
};

export function SuriConnectionDialog({
  open,
  onOpenChange,
  integration,
  canEdit,
}: SuriConnectionDialogProps) {
  const connected = Boolean(integration && integration.status === 'connected');
  const config = useMemo(() => readSuriConfig(integration?.config), [integration?.config]);

  const { save, testSend, runNow, rotateWebhook, disconnect } = useSuriConnectionMutations();
  const templatesQuery = useSuriTemplates(open && connected);
  const remindersQuery = useSuriReminders(open && Boolean(integration));
  const { procedures } = useClinicProcedures();

  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [sendHour, setSendHour] = useState(7);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [consultation, setConsultation] = useState<TemplateSelectionState | null>(null);
  const [exam, setExam] = useState<TemplateSelectionState | null>(null);
  const [examCategories, setExamCategories] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [cancelText, setCancelText] = useState('');
  const [responseFlowId, setResponseFlowId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [tab, setTab] = useState('conexao');

  useEffect(() => {
    if (!open) return;
    setTab(connected ? 'confirmacoes' : 'conexao');
    setEndpoint(config.endpoint_url || '');
    setToken('');
    setEnabled(config.reminders_enabled);
    setSendHour(config.send_hour);
    setTimezone(config.timezone);
    setConsultation(
      config.consultation_template
        ? {
            template_id: config.consultation_template.template_id,
            parameters: config.consultation_template.parameters,
          }
        : null,
    );
    setExam(
      config.exam_template
        ? { template_id: config.exam_template.template_id, parameters: config.exam_template.parameters }
        : null,
    );
    setExamCategories(config.exam_categories);
    setConfirmText(config.confirm_keywords.join(', '));
    setCancelText(config.cancel_keywords.join(', '));
    setResponseFlowId(config.response_flow_id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez por abertura/integração; refetch após salvar não pode apagar o formulário
  }, [open, integration?.id]);

  useEffect(() => {
    if (!open) setWebhookUrl(null);
  }, [open]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([...procedures.map((p) => p.category).filter(Boolean), ...examCategories]),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [procedures, examCategories],
  );

  const templates = templatesQuery.data ?? [];
  const busy = save.isPending;

  const handleSave = async () => {
    const result = await save.mutateAsync({
      endpoint_url: endpoint.trim() || undefined,
      token: token.trim() || undefined,
      settings: {
        reminders_enabled: enabled,
        send_hour: sendHour,
        timezone,
        consultation_template: consultation,
        exam_template: exam,
        exam_categories: examCategories,
        confirm_keywords: parseKeywordList(confirmText),
        cancel_keywords: parseKeywordList(cancelText),
        response_flow_id: responseFlowId.trim() || null,
      },
    });
    setToken('');
    if (result.webhook_url) setWebhookUrl(result.webhook_url);
  };

  const handleApplyModel = (kind: SuriModelKind, selection: TemplateSelectionState) => {
    if (kind === 'exam') setExam(selection);
    else setConsultation(selection);
    setTab('confirmacoes');
    toast.success('Template e variáveis preenchidos. Clique em “Salvar confirmações”.');
  };

  const toggleCategory = (category: string, checked: boolean) => {
    setExamCategories((current) =>
      checked ? [...current, category] : current.filter((c) => c !== category),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suri — confirmação de consultas e exames</DialogTitle>
          <DialogDescription>
            No dia do procedimento, a plataforma envia o template escolhido pelo WhatsApp da
            sua Suri. Quando o paciente responde, o status do agendamento é atualizado.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="conexao">Conexão</TabsTrigger>
            <TabsTrigger value="modelos">Modelos</TabsTrigger>
            <TabsTrigger value="confirmacoes" disabled={!connected}>
              Confirmações
            </TabsTrigger>
            <TabsTrigger value="envios" disabled={!integration}>
              Envios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conexao" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="suri-endpoint">Endpoint do chatbot</Label>
              <Input
                id="suri-endpoint"
                placeholder="https://xxxx.azurewebsites.net"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-[11px] text-muted-foreground">
                Portal Suri → Configurações → campo Endpoint.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suri-token">Token da API</Label>
              <Input
                id="suri-token"
                type="password"
                autoComplete="off"
                placeholder={connected ? '•••••••• (salvo — preencha só para trocar)' : 'Cole o token'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-[11px] text-muted-foreground">
                Fica guardado só no servidor; o navegador não volta a vê-lo.
              </p>
            </div>

            {webhookUrl ? (
              <Alert>
                <AlertDescription className="space-y-2">
                  <p className="text-sm">
                    Copie esta URL e cole em Portal Suri → Configurações → Webhook, com o evento
                    <strong> Mensagem recebida</strong> habilitado. Ela não será exibida de novo.
                  </p>
                  <SecretRevealField label="URL do webhook" value={webhookUrl} />
                </AlertDescription>
              </Alert>
            ) : (
              connected && (
                <p className="text-xs text-muted-foreground">
                  A URL do webhook foi exibida ao conectar. Perdeu? Gere uma nova e atualize no
                  Portal Suri (a anterior deixa de funcionar).
                </p>
              )
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={!canEdit || busy}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {connected ? 'Salvar conexão' : 'Conectar Suri'}
              </Button>
              {connected && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEdit || rotateWebhook.isPending}
                    onClick={async () => setWebhookUrl(await rotateWebhook.mutateAsync())}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Gerar nova URL do webhook
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    disabled={!canEdit || disconnect.isPending}
                    onClick={() => disconnect.mutate()}
                  >
                    <Unplug className="mr-1 h-4 w-4" />
                    Desconectar
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="modelos">
            <SuriTemplateModels
              templates={templates}
              templatesLoading={connected && templatesQuery.isLoading}
              canEdit={canEdit && connected}
              consultationTemplateId={consultation?.template_id ?? null}
              examTemplateId={exam?.template_id ?? null}
              onApply={handleApplyModel}
            />
          </TabsContent>

          <TabsContent value="confirmacoes" className="space-y-4">
            {templatesQuery.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(templatesQuery.error as Error)?.message || 'Não foi possível listar os templates'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">Envio automático no dia</p>
                <p className="text-xs text-muted-foreground">
                  Agendamentos pendentes, confirmados e retornos do dia, ainda não iniciados.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Horário de envio</Label>
                <Select
                  value={String(sendHour)}
                  onValueChange={(v) => setSendHour(Number(v))}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((hour) => (
                      <SelectItem key={hour} value={String(hour)}>
                        {`${String(hour).padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fuso horário da clínica</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURI_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.id} value={tz.id}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {templatesQuery.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates da Suri…
              </p>
            ) : (
              <>
                <SuriTemplatePicker
                  label="Template de consulta"
                  templates={templates}
                  value={consultation}
                  savedTitle={config.consultation_template?.title}
                  disabled={!canEdit}
                  onChange={setConsultation}
                />
                <SuriTemplatePicker
                  label="Template de exame (opcional)"
                  templates={templates}
                  value={exam}
                  savedTitle={config.exam_template?.title}
                  allowNone
                  noneLabel="Usar o template de consulta"
                  disabled={!canEdit}
                  onChange={setExam}
                />
              </>
            )}

            <div className="space-y-2 rounded-md border p-3">
              <Label>Categorias de procedimento que são exames</Label>
              <p className="text-xs text-muted-foreground">
                Agendamentos com procedimento destas categorias usam o template de exame.
              </p>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={examCategories.includes(category)}
                        onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                        disabled={!canEdit}
                      />
                      {category}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Respostas que confirmam</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Respostas que cancelam</Label>
                <Input
                  value={cancelText}
                  onChange={(e) => setCancelText(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Separe por vírgula e inclua o texto exato dos botões do template. Só a resposta
                inteira conta (acentos e maiúsculas são ignorados).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="suri-flow">ID do fluxo da Suri para a resposta (opcional)</Label>
              <Input
                id="suri-flow"
                placeholder="Ex.: id do fluxo que agradece a confirmação"
                value={responseFlowId}
                onChange={(e) => setResponseFlowId(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={!canEdit || busy}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Salvar confirmações
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="envios" className="space-y-4">
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="suri-test-phone">Testar no seu celular</Label>
                <Input
                  id="suri-test-phone"
                  placeholder="(11) 99999-9999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!connected || !testPhone || testSend.isPending}
                onClick={() => testSend.mutate({ phone: testPhone, kind: 'consultation' })}
              >
                <Send className="mr-1 h-4 w-4" />
                Consulta
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!connected || !testPhone || !config.exam_template || testSend.isPending}
                onClick={() => testSend.mutate({ phone: testPhone, kind: 'exam' })}
              >
                <Send className="mr-1 h-4 w-4" />
                Exame
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Últimos envios. “Enviar agora” dispara os agendamentos de hoje que ainda não
                receberam a confirmação.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!connected || !canEdit || runNow.isPending}
                onClick={() => runNow.mutate()}
              >
                {runNow.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Enviar agora
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(remindersQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        Nenhum envio ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (remindersQuery.data ?? []).map((reminder) => {
                      const status = REMINDER_STATUS[reminder.status] ?? REMINDER_STATUS.sending;
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(parseISO(reminder.reminder_date), 'dd/MM')}
                            {reminder.start_time ? ` ${reminder.start_time.slice(0, 5)}` : ''}
                          </TableCell>
                          <TableCell className="text-sm">
                            {reminder.patient_name || '—'}
                            {reminder.procedure && (
                              <span className="block text-xs text-muted-foreground">
                                {reminder.procedure}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {reminder.kind === 'exam' ? 'Exame' : 'Consulta'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                            {reminder.error_message && (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {reminder.error_message}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
