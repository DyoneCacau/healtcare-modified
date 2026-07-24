import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  CalendarPlus,
  KanbanSquare,
  Phone,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useCrmLeads, useCrmLeadMutations } from '@/hooks/useCrmLeads';
import { useClinicStaffOptions } from '@/hooks/useClinicStaffOptions';
import { usePatientMutations } from '@/hooks/usePatients';
import { formatCurrencyBRL } from '@/lib/currency';
import { leadSourceLabels, type LeadSource } from '@/types/agenda';
import {
  CRM_STAGES,
  type CrmLead,
  type CrmLeadStage,
} from '@/types/crm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  stage: 'new' as CrmLeadStage,
  lead_source: '' as '' | LeadSource,
  referral_name: '',
  interest: '',
  estimated_value: 0,
  next_follow_up: '',
  notes: '',
  owner_user_id: '',
  lost_reason: '',
};

export default function Crm() {
  const navigate = useNavigate();
  const { can, isLoading: permLoading } = usePermissions();
  const { user } = useAuth();
  const { data: leads = [], isLoading, error } = useCrmLeads();
  const { createLead, updateLead, moveLeadStage, deleteLead } = useCrmLeadMutations();
  const { createPatient } = usePatientMutations();
  const { staff } = useClinicStaffOptions();

  const canView = can('crm', 'can_view');
  const canCreate = can('crm', 'can_create');
  const canEdit = can('crm', 'can_edit');
  const canDelete = can('crm', 'can_delete');

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CrmLead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const today = startOfDay(new Date());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => {
      const hay = `${lead.name} ${lead.phone || ''} ${lead.interest || ''} ${lead.ownerName || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [leads, search]);

  const byStage = useMemo(() => {
    const map: Record<CrmLeadStage, CrmLead[]> = {
      new: [],
      contact: [],
      scheduled: [],
      won: [],
      lost: [],
    };
    filtered.forEach((lead) => {
      map[lead.stage]?.push(lead);
    });
    return map;
  }, [filtered]);

  const overdueCount = filtered.filter(
    (l) =>
      l.nextFollowUp &&
      !['won', 'lost'].includes(l.stage) &&
      isBefore(parseISO(l.nextFollowUp), today),
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      owner_user_id: user?.id || '',
    });
    setDialogOpen(true);
  };

  const openEdit = (lead: CrmLead) => {
    setEditing(lead);
    setForm({
      name: lead.name,
      phone: lead.phone || '',
      email: lead.email || '',
      stage: lead.stage,
      lead_source: lead.leadSource || '',
      referral_name: lead.referralName || '',
      interest: lead.interest || '',
      estimated_value: lead.estimatedValue || 0,
      next_follow_up: lead.nextFollowUp || '',
      notes: lead.notes || '',
      owner_user_id: lead.ownerUserId || '',
      lost_reason: lead.lostReason || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      stage: form.stage,
      lead_source: form.lead_source || null,
      referral_name: form.referral_name || null,
      interest: form.interest || null,
      estimated_value: form.estimated_value > 0 ? form.estimated_value : null,
      next_follow_up: form.next_follow_up || null,
      notes: form.notes || null,
      owner_user_id: form.owner_user_id || user?.id || null,
      lost_reason: form.stage === 'lost' ? form.lost_reason || null : null,
    };

    if (editing) {
      await updateLead.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createLead.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  /** Cria paciente (se preciso) e abre Agenda com origem/interesse do CRM */
  const handleScheduleFromLead = async (lead: CrmLead) => {
    setConvertingId(lead.id);
    try {
      let patientId = lead.patientId;
      if (!patientId) {
        const originLabel = lead.leadSource ? leadSourceLabels[lead.leadSource] : null;
        const created = await createPatient.mutateAsync({
          name: lead.name,
          cpf: null,
          phone: lead.phone,
          email: lead.email,
          address: null,
          birth_date: null,
          clinical_notes: [
            originLabel ? `Origem (CRM): ${originLabel}` : null,
            lead.referralName ? `Indicação: ${lead.referralName}` : null,
            lead.interest ? `Interesse: ${lead.interest}` : null,
            lead.notes || null,
          ]
            .filter(Boolean)
            .join('\n') || null,
          allergies: [],
          status: 'active',
        });
        patientId = created.id;
        await updateLead.mutateAsync({
          id: lead.id,
          patient_id: patientId,
        });
      }

      const params = new URLSearchParams({
        fromCrm: '1',
        patientId,
        crmLeadId: lead.id,
        crmTargetStage: lead.stage === 'won' ? 'won' : 'scheduled',
      });
      if (lead.interest) params.set('procedure', lead.interest);
      if (lead.leadSource) params.set('leadSource', lead.leadSource);
      if (lead.referralName) params.set('referralName', lead.referralName);
      if (lead.ownerUserId) params.set('sellerId', lead.ownerUserId);
      if (lead.notes) params.set('notes', lead.notes.slice(0, 400));

      setDialogOpen(false);
      navigate(`/agenda?${params.toString()}`);
      toast.success('Abrindo agenda com dados do lead');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível criar o paciente / abrir a agenda');
    } finally {
      setConvertingId(null);
    }
  };

  if (permLoading || isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!canView) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Você não tem permissão para ver o CRM.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KanbanSquare className="h-6 w-6" />
              CRM de Vendas
            </h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de leads: contato, follow-up e conversão — separado da Agenda e do Caixa
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo lead
            </Button>
          )}
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3 py-4 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                Não foi possível carregar os leads. Se ainda não rodou o SQL, execute
                {' '}<code className="font-mono">supabase/PRODUCAO_14_CRM_LEADS.sql</code> no painel.
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, telefone, interesse ou responsável"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="w-fit">
              {overdueCount} follow-up atrasado{overdueCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2 lg:grid-cols-3">
          {CRM_STAGES.map((stage) => (
            <Card key={stage.id} className={cn('border', stage.tone)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span>{stage.label}</span>
                  <Badge variant="secondary">{byStage[stage.id].length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                {byStage[stage.id].length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">Nenhum lead</p>
                ) : (
                  byStage[stage.id].map((lead) => {
                    const overdue =
                      lead.nextFollowUp &&
                      !['won', 'lost'].includes(lead.stage) &&
                      isBefore(parseISO(lead.nextFollowUp), today);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => canEdit && openEdit(lead)}
                        className={cn(
                          'w-full rounded-lg border bg-background p-3 text-left transition hover:shadow-sm',
                          canEdit ? 'cursor-pointer' : 'cursor-default',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight">{lead.name}</p>
                          {lead.estimatedValue != null && lead.estimatedValue > 0 && (
                            <span className="text-xs font-semibold text-emerald-700 shrink-0">
                              R$ {formatCurrencyBRL(lead.estimatedValue)}
                            </span>
                          )}
                        </div>
                        {lead.interest && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{lead.interest}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.leadSource && (
                            <Badge variant="outline" className="text-[10px]">
                              {leadSourceLabels[lead.leadSource]}
                            </Badge>
                          )}
                          {overdue && (
                            <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                          {lead.phone && (
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </p>
                          )}
                          {lead.ownerName && (
                            <p className="flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              {lead.ownerName}
                            </p>
                          )}
                          {lead.nextFollowUp && (
                            <p>
                              Follow-up:{' '}
                              {format(parseISO(lead.nextFollowUp), "d MMM", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.stage}
                              onValueChange={(v) =>
                                moveLeadStage.mutate({ id: lead.id, stage: v as CrmLeadStage })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CRM_STAGES.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {lead.stage !== 'lost' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-full text-xs"
                                disabled={convertingId === lead.id}
                                onClick={() => handleScheduleFromLead(lead)}
                              >
                                <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                {lead.patientId ? 'Agendar' : 'Paciente + Agenda'}
                              </Button>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lead' : 'Novo lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do lead"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v as CrmLeadStage })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRM_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={form.lead_source || 'none'}
                  onValueChange={(v) =>
                    setForm({ ...form, lead_source: v === 'none' ? '' : (v as LeadSource) })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem origem</SelectItem>
                    {(Object.keys(leadSourceLabels) as LeadSource[]).map((key) => (
                      <SelectItem key={key} value={key}>{leadSourceLabels[key]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.lead_source === 'referral' && (
              <div className="space-y-2">
                <Label>Quem indicou</Label>
                <Input
                  value={form.referral_name}
                  onChange={(e) => setForm({ ...form, referral_name: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Interesse / procedimento</Label>
              <Input
                value={form.interest}
                onChange={(e) => setForm({ ...form, interest: e.target.value })}
                placeholder="Ex.: Implante, clareamento, avaliação"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor estimado</Label>
                <CurrencyInput
                  value={form.estimated_value}
                  onValueChange={(v) => setForm({ ...form, estimated_value: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo follow-up</Label>
                <DateInput
                  value={form.next_follow_up}
                  onChange={(v) => setForm({ ...form, next_follow_up: v })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={form.owner_user_id || 'none'}
                onValueChange={(v) => setForm({ ...form, owner_user_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.stage === 'lost' && (
              <div className="space-y-2">
                <Label>Motivo da perda</Label>
                <Input
                  value={form.lost_reason}
                  onChange={(e) => setForm({ ...form, lost_reason: e.target.value })}
                  placeholder="Ex.: preço, foi para concorrente"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            {editing && canDelete && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={async () => {
                  await deleteLead.mutateAsync(editing.id);
                  setDialogOpen(false);
                }}
              >
                Excluir
              </Button>
            )}
            {editing && canEdit && editing.stage !== 'lost' && (
              <Button
                variant="secondary"
                disabled={convertingId === editing.id}
                onClick={() => handleScheduleFromLead(editing)}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                {editing.patientId ? 'Abrir na Agenda' : 'Criar paciente e agendar'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || createLead.isPending || updateLead.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
