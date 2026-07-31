import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClinic } from '@/hooks/useClinic';
import * as scheduleService from '@/services/scheduleService';
import { friendlyScheduleError } from '@/lib/scheduleValidation';
import type { WorkSchedulePeriodInput } from '@/types/schedule';

const QUERY_KEY = 'work-schedules';

export function useWorkSchedules(options?: {
  clinicId?: string | null;
  professionalId?: string | null;
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  const { clinicId: selectedClinicId } = useClinic();
  const clinicId = options?.clinicId ?? selectedClinicId;

  const query = useQuery({
    queryKey: [QUERY_KEY, clinicId, options?.professionalId ?? null, options?.activeOnly !== false],
    queryFn: async () => {
      if (!clinicId) return [];
      return scheduleService.listWorkSchedules({
        clinicId,
        professionalId: options?.professionalId,
        activeOnly: options?.activeOnly,
      });
    },
    enabled: (options?.enabled !== false) && !!clinicId,
    retry: false,
  });

  return {
    ...query,
    schedules: query.data ?? [],
    clinicId,
  };
}

export function useWorkScheduleMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const replaceSchedules = useMutation({
    mutationFn: (input: {
      clinicId: string;
      professionalId: string;
      periods: WorkSchedulePeriodInput[];
      createdBy?: string | null;
      silent?: boolean;
    }) =>
      scheduleService.replaceProfessionalWorkSchedules({
        clinicId: input.clinicId,
        professionalId: input.professionalId,
        periods: input.periods,
        createdBy: input.createdBy,
      }),
    onSuccess: (_data, variables) => {
      invalidate();
      if (!variables.silent) {
        toast.success('Horários salvos');
      }
    },
    onError: (error: unknown) => {
      toast.error(friendlyScheduleError(error));
    },
  });

  const createSchedule = useMutation({
    mutationFn: scheduleService.createWorkSchedule,
    onSuccess: () => {
      invalidate();
      toast.success('Período adicionado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const updateSchedule = useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      weekday?: WorkSchedulePeriodInput['weekday'];
      startTime?: string;
      endTime?: string;
      isActive?: boolean;
    }) => scheduleService.updateWorkSchedule(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success('Período atualizado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const deleteSchedule = useMutation({
    mutationFn: scheduleService.deleteWorkSchedule,
    onSuccess: () => {
      invalidate();
      toast.success('Período removido');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      scheduleService.setWorkScheduleActive(id, isActive),
    onSuccess: () => {
      invalidate();
      toast.success('Status do período atualizado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  return {
    replaceSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    setActive,
    invalidate,
  };
}
