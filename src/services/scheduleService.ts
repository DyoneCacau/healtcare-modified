import { supabase } from '@/integrations/supabase/client';
import {
  friendlyScheduleError,
  validateScheduleBlockInput,
  validateWorkSchedulePeriods,
} from '@/lib/scheduleValidation';
import type {
  ProfessionalWorkSchedule,
  ScheduleBlock,
  ScheduleBlockInput,
  ScheduleBlockType,
  Weekday,
  WorkSchedulePeriodInput,
} from '@/types/schedule';

function displayTime(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function normalizeTimeForDb(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 8);
  return trimmed;
}

function mapWorkSchedule(row: {
  id: string;
  clinic_id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}): ProfessionalWorkSchedule {
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    professional_id: row.professional_id,
    weekday: Number(row.weekday) as Weekday,
    start_time: displayTime(row.start_time),
    end_time: displayTime(row.end_time),
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
  };
}

function mapBlock(row: {
  id: string;
  clinic_id: string;
  professional_id: string | null;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string | null;
  block_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}): ScheduleBlock {
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    professional_id: row.professional_id,
    block_date: row.block_date,
    start_time: row.start_time ? displayTime(row.start_time) : null,
    end_time: row.end_time ? displayTime(row.end_time) : null,
    all_day: row.all_day === true,
    reason: row.reason,
    block_type: (row.block_type || 'other') as ScheduleBlockType,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
  };
}

function throwFriendly(error: unknown): never {
  throw new Error(friendlyScheduleError(error));
}

export async function listWorkSchedules(options: {
  clinicId: string;
  professionalId?: string | null;
  activeOnly?: boolean;
}) {
  let query = supabase
    .from('professional_work_schedules')
    .select('*')
    .eq('clinic_id', options.clinicId)
    .order('weekday')
    .order('start_time');

  if (options.professionalId) {
    query = query.eq('professional_id', options.professionalId);
  }
  if (options.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throwFriendly(error);
  return (data || []).map(mapWorkSchedule);
}

export async function createWorkSchedule(input: {
  clinicId: string;
  professionalId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  createdBy?: string | null;
}) {
  const validationError = validateWorkSchedulePeriods([
    {
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      is_active: input.isActive !== false,
    },
  ]);
  if (validationError) throw new Error(validationError);

  const { data, error } = await supabase
    .from('professional_work_schedules')
    .insert({
      clinic_id: input.clinicId,
      professional_id: input.professionalId,
      weekday: input.weekday,
      start_time: normalizeTimeForDb(input.startTime),
      end_time: normalizeTimeForDb(input.endTime),
      is_active: input.isActive !== false,
      created_by: input.createdBy || null,
    })
    .select('*')
    .single();

  if (error) throwFriendly(error);
  return mapWorkSchedule(data);
}

export async function updateWorkSchedule(
  id: string,
  patch: Partial<{
    weekday: Weekday;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>,
) {
  const payload: {
    weekday?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
  } = {};
  if (patch.weekday !== undefined) payload.weekday = patch.weekday;
  if (patch.startTime !== undefined) payload.start_time = normalizeTimeForDb(patch.startTime);
  if (patch.endTime !== undefined) payload.end_time = normalizeTimeForDb(patch.endTime);
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;

  const { data, error } = await supabase
    .from('professional_work_schedules')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throwFriendly(error);
  return mapWorkSchedule(data);
}

export async function deleteWorkSchedule(id: string) {
  const { error } = await supabase.from('professional_work_schedules').delete().eq('id', id);
  if (error) throwFriendly(error);
}

export async function setWorkScheduleActive(id: string, isActive: boolean) {
  return updateWorkSchedule(id, { isActive });
}

/** Substitui a jornada ativa do profissional na clínica pela lista informada. */
export async function replaceProfessionalWorkSchedules(options: {
  clinicId: string;
  professionalId: string;
  periods: WorkSchedulePeriodInput[];
  createdBy?: string | null;
}) {
  const validationError = validateWorkSchedulePeriods(options.periods);
  if (validationError) throw new Error(validationError);

  const { error: delError } = await supabase
    .from('professional_work_schedules')
    .delete()
    .eq('clinic_id', options.clinicId)
    .eq('professional_id', options.professionalId);
  if (delError) throwFriendly(delError);

  const activePeriods = options.periods.filter((p) => p.is_active !== false);
  if (activePeriods.length === 0) return [] as ProfessionalWorkSchedule[];

  const rows = activePeriods.map((period) => ({
    clinic_id: options.clinicId,
    professional_id: options.professionalId,
    weekday: period.weekday,
    start_time: normalizeTimeForDb(period.start_time),
    end_time: normalizeTimeForDb(period.end_time),
    is_active: true,
    created_by: options.createdBy || null,
  }));

  const { data, error } = await supabase
    .from('professional_work_schedules')
    .insert(rows)
    .select('*');
  if (error) throwFriendly(error);
  return (data || []).map(mapWorkSchedule);
}

export async function listScheduleBlocks(options: {
  clinicId: string;
  professionalId?: string | null;
  fromDate?: string;
  activeOnly?: boolean;
  futureOnly?: boolean;
}) {
  let query = supabase
    .from('schedule_blocks')
    .select('*')
    .eq('clinic_id', options.clinicId)
    .order('block_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (options.professionalId === null) {
    query = query.is('professional_id', null);
  } else if (options.professionalId) {
    query = query.eq('professional_id', options.professionalId);
  }

  if (options.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  const fromDate =
    options.fromDate ||
    (options.futureOnly !== false ? new Date().toISOString().slice(0, 10) : undefined);
  if (fromDate) {
    query = query.gte('block_date', fromDate);
  }

  const { data, error } = await query;
  if (error) throwFriendly(error);
  return (data || []).map(mapBlock);
}

export async function createScheduleBlock(input: ScheduleBlockInput) {
  const validationError = validateScheduleBlockInput(input);
  if (validationError) throw new Error(validationError);

  const payload = {
    clinic_id: input.clinic_id,
    professional_id: input.professional_id || null,
    block_date: input.block_date,
    all_day: input.all_day,
    start_time:
      input.all_day || !input.start_time ? null : normalizeTimeForDb(input.start_time),
    end_time: input.all_day || !input.end_time ? null : normalizeTimeForDb(input.end_time),
    reason: input.reason || null,
    block_type: input.block_type || 'other',
    is_active: input.is_active !== false,
    created_by: input.created_by || null,
  };

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert(payload)
    .select('*')
    .single();
  if (error) throwFriendly(error);
  return mapBlock(data);
}

export async function updateScheduleBlock(
  id: string,
  input: Partial<ScheduleBlockInput>,
) {
  if (
    input.block_date !== undefined ||
    input.all_day !== undefined ||
    input.start_time !== undefined ||
    input.end_time !== undefined
  ) {
    const validationError = validateScheduleBlockInput({
      block_date: input.block_date || '1970-01-01',
      all_day: input.all_day ?? false,
      start_time: input.start_time,
      end_time: input.end_time,
    });
    // Se block_date não veio, não forçar erro de data vazia — validar só janela
    if (input.block_date === undefined) {
      const windowError = validateScheduleBlockInput({
        block_date: '1970-01-01',
        all_day: input.all_day ?? false,
        start_time: input.start_time,
        end_time: input.end_time,
      });
      if (windowError && !/data do bloqueio/i.test(windowError)) {
        throw new Error(windowError);
      }
    } else if (validationError) {
      throw new Error(validationError);
    }
  }

  const payload: {
    professional_id?: string | null;
    block_date?: string;
    all_day?: boolean;
    reason?: string | null;
    block_type?: string;
    is_active?: boolean;
    start_time?: string | null;
    end_time?: string | null;
  } = {};
  if (input.professional_id !== undefined) payload.professional_id = input.professional_id;
  if (input.block_date !== undefined) payload.block_date = input.block_date;
  if (input.all_day !== undefined) payload.all_day = input.all_day;
  if (input.reason !== undefined) payload.reason = input.reason;
  if (input.block_type !== undefined) payload.block_type = input.block_type;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (input.all_day === true) {
    payload.start_time = null;
    payload.end_time = null;
  } else {
    if (input.start_time !== undefined) {
      payload.start_time = input.start_time
        ? normalizeTimeForDb(input.start_time)
        : null;
    }
    if (input.end_time !== undefined) {
      payload.end_time = input.end_time ? normalizeTimeForDb(input.end_time) : null;
    }
  }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throwFriendly(error);
  return mapBlock(data);
}

export async function deactivateScheduleBlock(id: string) {
  return updateScheduleBlock(id, { is_active: false });
}

export async function deleteScheduleBlock(id: string) {
  const { error } = await supabase.from('schedule_blocks').delete().eq('id', id);
  if (error) throwFriendly(error);
}
