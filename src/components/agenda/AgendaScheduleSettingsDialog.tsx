import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WorkScheduleEditor } from '@/components/agenda/WorkScheduleEditor';
import { ScheduleBlocksPanel } from '@/components/agenda/ScheduleBlocksPanel';
import { useWorkSchedules, useWorkScheduleMutations } from '@/hooks/useWorkSchedules';
import type { WorkSchedulePeriodInput } from '@/types/schedule';
import { validateWorkSchedulePeriods } from '@/lib/scheduleValidation';

interface ProfessionalOption {
  id: string;
  name: string;
}

interface AgendaScheduleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string | null | undefined;
  professionals: ProfessionalOption[];
  initialProfessionalId?: string | null;
  defaultTab?: 'schedules' | 'blocks';
}

export function AgendaScheduleSettingsDialog({
  open,
  onOpenChange,
  clinicId,
  professionals,
  initialProfessionalId,
  defaultTab = 'schedules',
}: AgendaScheduleSettingsDialogProps) {
  const [professionalId, setProfessionalId] = useState(initialProfessionalId || '');
  const [periods, setPeriods] = useState<WorkSchedulePeriodInput[]>([]);

  const { schedules, isLoading } = useWorkSchedules({
    clinicId,
    professionalId: professionalId || null,
    activeOnly: false,
    enabled: open && !!clinicId && !!professionalId,
  });
  const { replaceSchedules } = useWorkScheduleMutations();

  useEffect(() => {
    if (!open) return;
    if (initialProfessionalId) {
      setProfessionalId(initialProfessionalId);
      return;
    }
    if (!professionalId && professionals[0]?.id) {
      setProfessionalId(professionals[0].id);
    }
  }, [open, initialProfessionalId, professionalId, professionals]);

  useEffect(() => {
    if (!professionalId) {
      setPeriods([]);
      return;
    }
    setPeriods(
      schedules.map((schedule) => ({
        weekday: schedule.weekday,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active,
      })),
    );
  }, [professionalId, schedules]);

  const validationError = useMemo(
    () => validateWorkSchedulePeriods(periods),
    [periods],
  );

  const handleSave = async () => {
    if (!clinicId || !professionalId || validationError) return;
    await replaceSchedules.mutateAsync({
      clinicId,
      professionalId,
      periods,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horários e bloqueios</DialogTitle>
          <DialogDescription>
            Jornadas e bloqueios desta clínica (`professional_work_schedules` /
            `schedule_blocks`).
          </DialogDescription>
        </DialogHeader>

        {!clinicId ? (
          <p className="text-sm text-muted-foreground">Selecione uma clínica para continuar.</p>
        ) : (
          <Tabs defaultValue={defaultTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedules">Horários</TabsTrigger>
              <TabsTrigger value="blocks">Bloqueios</TabsTrigger>
            </TabsList>

            <TabsContent value="schedules" className="space-y-4 mt-4">
              {isLoading && professionalId ? (
                <p className="text-sm text-muted-foreground">Carregando jornadas…</p>
              ) : (
                <WorkScheduleEditor
                  showProfessionalSelect
                  professionals={professionals}
                  selectedProfessionalId={professionalId}
                  onProfessionalChange={setProfessionalId}
                  periods={periods}
                  onChange={setPeriods}
                />
              )}
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  !professionalId ||
                  !!validationError ||
                  replaceSchedules.isPending
                }
              >
                Salvar horários
              </Button>
            </TabsContent>

            <TabsContent value="blocks" className="mt-4">
              <ScheduleBlocksPanel
                clinicId={clinicId}
                professionals={professionals}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
