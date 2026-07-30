import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClinic } from '@/hooks/useClinic';
import * as scheduleService from '@/services/scheduleService';
import { friendlyScheduleError } from '@/lib/scheduleValidation';
import type { ScheduleBlockInput } from '@/types/schedule';

const QUERY_KEY = 'schedule-blocks';

export function useScheduleBlocks(options?: {
  clinicId?: string | null;
  professionalId?: string | null;
  futureOnly?: boolean;
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  const { clinicId: selectedClinicId } = useClinic();
  const clinicId = options?.clinicId ?? selectedClinicId;

  const query = useQuery({
    queryKey: [
      QUERY_KEY,
      clinicId,
      options?.professionalId ?? 'any',
      options?.futureOnly !== false,
      options?.activeOnly !== false,
    ],
    queryFn: async () => {
      if (!clinicId) return [];
      return scheduleService.listScheduleBlocks({
        clinicId,
        professionalId: options?.professionalId,
        futureOnly: options?.futureOnly,
        activeOnly: options?.activeOnly,
      });
    },
    enabled: (options?.enabled !== false) && !!clinicId,
    retry: false,
  });

  return {
    ...query,
    blocks: query.data ?? [],
    clinicId,
  };
}

export function useScheduleBlockMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const createBlock = useMutation({
    mutationFn: (input: ScheduleBlockInput) => scheduleService.createScheduleBlock(input),
    onSuccess: () => {
      invalidate();
      toast.success('Bloqueio criado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const updateBlock = useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<ScheduleBlockInput> & { id: string }) =>
      scheduleService.updateScheduleBlock(id, input),
    onSuccess: () => {
      invalidate();
      toast.success('Bloqueio atualizado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const deactivateBlock = useMutation({
    mutationFn: scheduleService.deactivateScheduleBlock,
    onSuccess: () => {
      invalidate();
      toast.success('Bloqueio desativado');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  const deleteBlock = useMutation({
    mutationFn: scheduleService.deleteScheduleBlock,
    onSuccess: () => {
      invalidate();
      toast.success('Bloqueio excluído');
    },
    onError: (error: unknown) => toast.error(friendlyScheduleError(error)),
  });

  return { createBlock, updateBlock, deactivateBlock, deleteBlock, invalidate };
}
