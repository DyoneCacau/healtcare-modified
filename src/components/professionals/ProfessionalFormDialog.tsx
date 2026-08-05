import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { useClinics } from '@/hooks/useClinic';
import { useClinicProcedures } from '@/hooks/useClinicProcedures';
import { supabase } from '@/integrations/supabase/client';
import { ClinicMultiSelect } from '@/components/common/ClinicMultiSelect';
import { SPECIALTIES } from '@/lib/specialties';
import { WorkScheduleEditor } from '@/components/agenda/WorkScheduleEditor';
import { useWorkSchedules, useWorkScheduleMutations } from '@/hooks/useWorkSchedules';
import type { WorkSchedulePeriodInput } from '@/types/schedule';
import { validateWorkSchedulePeriods } from '@/lib/scheduleValidation';

interface Professional {
  id?: string;
  name: string;
  specialty: string;
  cro: string;
  email: string;
  phone: string;
  is_active: boolean;
  hire_date: string;
  performs_all_procedures?: boolean;
  /** Ao cadastrar, cria o mesmo profissional também nestas outras clínicas */
  additionalClinicIds?: string[];
  /** Quando true, o caller exibe o toast final (evita sucesso parcial/duplicado). */
  suppressSuccessToast?: boolean;
  /** IDs de clinic_procedures quando performs_all_procedures = false */
  procedureIds?: string[];
}

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSave: (professional: Professional) => void | Promise<void>;
  /** Clínica atual (selecionada), para não listá-la entre as "outras clínicas" */
  currentClinicId?: string | null;
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  professional,
  onSave,
  currentClinicId,
}: ProfessionalFormDialogProps) {
  const [formData, setFormData] = useState<Professional>({
    name: '',
    specialty: '',
    cro: '',
    email: '',
    phone: '',
    is_active: true,
    hire_date: new Date().toISOString().split('T')[0],
    performs_all_procedures: true,
  });
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  /** Clínicas onde já existe um profissional com o mesmo CRO (não removíveis por aqui) */
  const [existingClinicIds, setExistingClinicIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulePeriods, setSchedulePeriods] = useState<WorkSchedulePeriodInput[]>([]);
  const [performsAll, setPerformsAll] = useState(true);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [loadingLinks, setLoadingLinks] = useState(false);
  const { clinics } = useClinics();
  const { procedures, isLoading: loadingProcedures } = useClinicProcedures(currentClinicId);

  const isEditing = !!professional;
  const otherClinics = clinics.filter((c: { id: string }) => c.id !== currentClinicId);
  const activeProcedures = useMemo(
    () => (procedures || []).filter((p) => p.is_active),
    [procedures]
  );
  const filteredProcedures = useMemo(() => {
    const q = procedureSearch.trim().toLowerCase();
    if (!q) return activeProcedures;
    return activeProcedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [activeProcedures, procedureSearch]);

  const { schedules, isLoading: isLoadingSchedules } = useWorkSchedules({
    clinicId: currentClinicId,
    professionalId: professional?.id || null,
    activeOnly: false,
    enabled: open && isEditing && !!professional?.id && !!currentClinicId,
  });
  const { replaceSchedules } = useWorkScheduleMutations();

  useEffect(() => {
    if (!open || !isEditing) {
      setSchedulePeriods([]);
      return;
    }
    setSchedulePeriods(
      schedules.map((schedule) => ({
        weekday: schedule.weekday,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active,
      })),
    );
  }, [open, isEditing, schedules]);

  useEffect(() => {
    if (!open) return;

    if (professional) {
      const all = professional.performs_all_procedures !== false;
      setFormData({
        id: professional.id,
        name: professional.name,
        specialty: professional.specialty,
        cro: professional.cro,
        email: professional.email || '',
        phone: professional.phone || '',
        is_active: professional.is_active,
        hire_date: professional.hire_date || new Date().toISOString().split('T')[0],
        performs_all_procedures: all,
      });
      setPerformsAll(all);
      setProcedureSearch('');

      if (professional.cro) {
        supabase
          .from('professionals')
          .select('clinic_id')
          .eq('cro', professional.cro)
          .then(({ data }) => {
            const linkedIds = (data || [])
              .map((row: { clinic_id: string | null }) => row.clinic_id)
              .filter((id): id is string => !!id && id !== currentClinicId);
            setExistingClinicIds(linkedIds);
            setSelectedClinicIds(linkedIds);
          });
      } else {
        setExistingClinicIds([]);
        setSelectedClinicIds([]);
      }

      if (professional.id && currentClinicId && !all) {
        setLoadingLinks(true);
        void supabase
          .from('professional_procedures')
          .select('procedure_id')
          .eq('professional_id', professional.id)
          .eq('clinic_id', currentClinicId)
          .then(({ data, error }) => {
            setLoadingLinks(false);
            if (error) {
              console.error(error);
              setSelectedProcedureIds([]);
              return;
            }
            setSelectedProcedureIds((data || []).map((r) => r.procedure_id));
          });
      } else {
        setSelectedProcedureIds([]);
      }
    } else {
      setFormData({
        name: '',
        specialty: '',
        cro: '',
        email: '',
        phone: '',
        is_active: true,
        hire_date: new Date().toISOString().split('T')[0],
        performs_all_procedures: true,
      });
      setPerformsAll(true);
      setSelectedProcedureIds([]);
      setProcedureSearch('');
      setExistingClinicIds([]);
      setSelectedClinicIds([]);
    }
  }, [open, professional, currentClinicId]);

  const persistWorkSchedules = async (options?: { silent?: boolean }) => {
    if (!isEditing || !professional?.id || !currentClinicId) return;

    const scheduleError = validateWorkSchedulePeriods(schedulePeriods);
    if (scheduleError) {
      toast.error(scheduleError);
      throw new Error(scheduleError);
    }

    await replaceSchedules.mutateAsync({
      clinicId: currentClinicId,
      professionalId: professional.id,
      periods: schedulePeriods,
      silent: options?.silent === true,
    });
  };

  const toggleProcedure = (procedureId: string, checked: boolean) => {
    setSelectedProcedureIds((prev) => {
      if (checked) return prev.includes(procedureId) ? prev : [...prev, procedureId];
      return prev.filter((id) => id !== procedureId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.specialty || !formData.cro) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!performsAll && selectedProcedureIds.length === 0) {
      toast.error('Selecione pelo menos um procedimento ou marque “realiza todos”.');
      return;
    }

    if (isEditing && professional?.id && currentClinicId) {
      const scheduleError = validateWorkSchedulePeriods(schedulePeriods);
      if (scheduleError) {
        toast.error(scheduleError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const additionalClinicIds = selectedClinicIds.filter((id) => !existingClinicIds.includes(id));
      const isCombinedScheduleSave = isEditing && !!professional?.id && !!currentClinicId;

      await onSave({
        ...formData,
        performs_all_procedures: performsAll,
        procedureIds: performsAll ? [] : selectedProcedureIds,
        additionalClinicIds,
        suppressSuccessToast: isCombinedScheduleSave,
      });

      if (isCombinedScheduleSave) {
        await persistWorkSchedules({ silent: true });
        toast.success('Profissional e horários atualizados com sucesso.');
      } else {
        await persistWorkSchedules();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving professional:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {professional ? 'Editar Profissional' : 'Novo Profissional'}
          </DialogTitle>
          <DialogDescription>
            {professional
              ? 'Atualize os dados do profissional'
              : 'Cadastre um novo profissional odontológico'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(v) => setFormData({ ...formData, specialty: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cro">CRO *</Label>
              <Input
                id="cro"
                value={formData.cro}
                onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                placeholder="SP-12345"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="profissional@clinica.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Data de Contratação</Label>
              <DateInput
                id="hire_date"
                value={formData.hire_date}
                onChange={(v) => setFormData({ ...formData, hire_date: v })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Profissional Ativo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <h3 className="text-sm font-semibold">Procedimentos realizados</h3>
              <p className="text-xs text-muted-foreground">
                Define em quais procedimentos este profissional aparece no agendamento online.
              </p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="performs_all">Este profissional realiza todos os procedimentos</Label>
                <p className="text-xs text-muted-foreground">
                  Com esta opção ativa, procedimentos novos da clínica também ficam disponíveis
                  automaticamente.
                </p>
              </div>
              <Switch
                id="performs_all"
                checked={performsAll}
                onCheckedChange={(checked) => {
                  setPerformsAll(checked);
                  if (checked) setSelectedProcedureIds([]);
                }}
              />
            </div>

            {!performsAll ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar procedimento…"
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    disabled={loadingProcedures || loadingLinks}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedProcedureIds.length} selecionado
                  {selectedProcedureIds.length === 1 ? '' : 's'}
                  {activeProcedures.length
                    ? ` de ${activeProcedures.length} ativo${activeProcedures.length === 1 ? '' : 's'}`
                    : ''}
                </p>
                {loadingProcedures || loadingLinks ? (
                  <p className="text-sm text-muted-foreground">Carregando procedimentos…</p>
                ) : activeProcedures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum procedimento ativo cadastrado nesta clínica.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredProcedures.map((proc) => {
                      const checked = selectedProcedureIds.includes(proc.id);
                      return (
                        <label
                          key={proc.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleProcedure(proc.id, v === true)}
                          />
                          <span className="min-w-0 truncate">{proc.name}</span>
                        </label>
                      );
                    })}
                    {filteredProcedures.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        Nenhum procedimento encontrado para essa busca.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {otherClinics.length > 0 && (
            <ClinicMultiSelect
              label="Unidades de atuação"
              clinics={otherClinics}
              selectedIds={selectedClinicIds}
              onChange={setSelectedClinicIds}
              lockedIds={existingClinicIds}
              placeholder="Também atende em outras unidades?"
              helperText={
                isEditing
                  ? 'Unidades já vinculadas a este CRO ficam marcadas e travadas aqui. Marque novas unidades para cadastrar o profissional nelas também — inclusive as que você criar no futuro, elas aparecem automaticamente nesta lista.'
                  : 'Marque em quais outras unidades este profissional também atende — o cadastro é replicado automaticamente, sem repetir os dados manualmente. Unidades criadas no futuro aparecem aqui sem precisar de nada.'
              }
            />
          )}

          {isEditing && professional?.id && currentClinicId && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <h3 className="text-sm font-semibold">Horários de atendimento</h3>
                <p className="text-xs text-muted-foreground">
                  Jornada deste profissional nesta clínica (mesma fonte da Agenda).
                </p>
              </div>
              {isLoadingSchedules ? (
                <p className="text-sm text-muted-foreground">Carregando horários…</p>
              ) : (
                <>
                  {schedules.length === 0 && schedulePeriods.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Nenhum horário salvo no banco ainda. Marque os dias e use
                      &quot;Salvar Alterações&quot; (ou &quot;Salvar horários&quot;) para
                      gravar a jornada.
                    </p>
                  )}
                  <WorkScheduleEditor
                    periods={schedulePeriods}
                    onChange={setSchedulePeriods}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      !!validateWorkSchedulePeriods(schedulePeriods) ||
                      replaceSchedules.isPending ||
                      isSubmitting
                    }
                    onClick={async () => {
                      try {
                        await persistWorkSchedules();
                      } catch {
                        // toast já tratado em persistWorkSchedules / onError
                      }
                    }}
                  >
                    Salvar horários
                  </Button>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : professional ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
