import { useState, useEffect } from 'react';
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
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { useClinics } from '@/hooks/useClinic';
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
  /** Ao cadastrar, cria o mesmo profissional também nestas outras clínicas */
  additionalClinicIds?: string[];
}

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSave: (professional: Professional) => void;
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
  });
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  /** Clínicas onde já existe um profissional com o mesmo CRO (não removíveis por aqui) */
  const [existingClinicIds, setExistingClinicIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedulePeriods, setSchedulePeriods] = useState<WorkSchedulePeriodInput[]>([]);
  const { clinics } = useClinics();

  const isEditing = !!professional;
  const otherClinics = clinics.filter((c: { id: string }) => c.id !== currentClinicId);

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
      setFormData({
        id: professional.id,
        name: professional.name,
        specialty: professional.specialty,
        cro: professional.cro,
        email: professional.email || '',
        phone: professional.phone || '',
        is_active: professional.is_active,
        hire_date: professional.hire_date || new Date().toISOString().split('T')[0],
      });

      // Busca em quais outras clínicas (que o usuário tem acesso) já existe
      // um profissional com o mesmo CRO, para pré-marcar e travar essas opções.
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
    } else {
      setFormData({
        name: '',
        specialty: '',
        cro: '',
        email: '',
        phone: '',
        is_active: true,
        hire_date: new Date().toISOString().split('T')[0],
      });
      setExistingClinicIds([]);
      setSelectedClinicIds([]);
    }
  }, [open, professional, currentClinicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.specialty || !formData.cro) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      // Só as clínicas marcadas agora que ainda não tinham este profissional
      const additionalClinicIds = selectedClinicIds.filter((id) => !existingClinicIds.includes(id));
      await onSave({ ...formData, additionalClinicIds });
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
                <WorkScheduleEditor
                  periods={schedulePeriods}
                  onChange={setSchedulePeriods}
                />
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={
                  !!validateWorkSchedulePeriods(schedulePeriods) ||
                  replaceSchedules.isPending
                }
                onClick={async () => {
                  const error = validateWorkSchedulePeriods(schedulePeriods);
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  await replaceSchedules.mutateAsync({
                    clinicId: currentClinicId,
                    professionalId: professional.id!,
                    periods: schedulePeriods,
                  });
                }}
              >
                Salvar horários
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : professional ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
