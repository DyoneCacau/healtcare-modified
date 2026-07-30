import type {
  ScheduleBlockInput,
  Weekday,
  WorkSchedulePeriodInput,
} from '@/types/schedule';

function normalizeTime(value: string): string {
  const trimmed = (value || '').trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 5);
  return trimmed;
}

export function isValidWeekday(value: number): value is Weekday {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function isValidTimeRange(start: string, end: string): boolean {
  const s = normalizeTime(start);
  const e = normalizeTime(end);
  if (!/^\d{2}:\d{2}$/.test(s) || !/^\d{2}:\d{2}$/.test(e)) return false;
  return e > s;
}

export function periodsOverlap(
  a: WorkSchedulePeriodInput,
  b: WorkSchedulePeriodInput,
): boolean {
  if (a.weekday !== b.weekday) return false;
  if (a.is_active === false || b.is_active === false) return false;
  const aStart = normalizeTime(a.start_time);
  const aEnd = normalizeTime(a.end_time);
  const bStart = normalizeTime(b.start_time);
  const bEnd = normalizeTime(b.end_time);
  return aStart < bEnd && bStart < aEnd;
}

export function validateWorkSchedulePeriods(
  periods: WorkSchedulePeriodInput[],
): string | null {
  for (const period of periods) {
    if (!isValidWeekday(period.weekday)) {
      return 'Dia da semana inválido (use 0 a 6).';
    }
    if (!period.start_time || !period.end_time) {
      return 'Informe início e fim de cada período.';
    }
    if (!isValidTimeRange(period.start_time, period.end_time)) {
      return 'O horário final deve ser posterior ao inicial.';
    }
  }

  const active = periods.filter((p) => p.is_active !== false);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (periodsOverlap(active[i], active[j])) {
        return 'Este período se sobrepõe a outro horário.';
      }
    }
  }

  return null;
}

export function validateScheduleBlockInput(
  input: Pick<
    ScheduleBlockInput,
    'all_day' | 'start_time' | 'end_time' | 'block_date'
  >,
): string | null {
  if (!input.block_date) {
    return 'Informe a data do bloqueio.';
  }

  if (input.all_day) {
    if (input.start_time || input.end_time) {
      return 'Bloqueio de dia inteiro não deve ter horário.';
    }
    return null;
  }

  if (!input.start_time || !input.end_time) {
    return 'Informe início e fim do bloqueio parcial.';
  }

  if (!isValidTimeRange(input.start_time, input.end_time)) {
    return 'O horário final deve ser posterior ao inicial.';
  }

  return null;
}

/** Extrai mensagem compreensível de erros do Postgres/Supabase. */
export function friendlyScheduleError(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : String(error || '');

  if (/sobrepõe/i.test(message)) {
    return 'Este período se sobrepõe a outro horário.';
  }
  if (/não pertence a esta clínica/i.test(message)) {
    return 'Profissional não pertence a esta clínica.';
  }
  if (/não encontrado/i.test(message)) {
    return 'Profissional não encontrado.';
  }
  if (/uq_professional_work_schedules_period/i.test(message)) {
    return 'Já existe um período idêntico para este profissional.';
  }
  if (/schedule_blocks_window_check|schedule_blocks_block_type/i.test(message)) {
    return 'Dados do bloqueio inválidos. Verifique dia inteiro e horários.';
  }
  if (/professional_work_schedules_time_check|weekday_check/i.test(message)) {
    return 'Horário ou dia da semana inválido.';
  }

  return message || 'Não foi possível salvar. Tente novamente.';
}
