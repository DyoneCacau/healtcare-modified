/** Tipos da Fase 0 — jornadas e bloqueios (schema auditado em produção). */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** Ordem de exibição: segunda → domingo */
export const WEEKDAYS_DISPLAY: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAYS_BUSINESS: Weekday[] = [1, 2, 3, 4, 5];

export type ScheduleBlockType =
  | 'break'
  | 'absence'
  | 'vacation'
  | 'holiday'
  | 'meeting'
  | 'maintenance'
  | 'other';

export const SCHEDULE_BLOCK_TYPE_LABELS: Record<ScheduleBlockType, string> = {
  break: 'Intervalo',
  absence: 'Ausência',
  vacation: 'Férias',
  holiday: 'Feriado',
  meeting: 'Reunião',
  maintenance: 'Manutenção',
  other: 'Outro',
};

export const SCHEDULE_BLOCK_TYPES = Object.keys(
  SCHEDULE_BLOCK_TYPE_LABELS,
) as ScheduleBlockType[];

export interface ProfessionalWorkSchedule {
  id: string;
  clinic_id: string;
  professional_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ScheduleBlock {
  id: string;
  clinic_id: string;
  professional_id: string | null;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string | null;
  block_type: ScheduleBlockType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface WorkSchedulePeriodInput {
  weekday: Weekday;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface ScheduleBlockInput {
  clinic_id: string;
  professional_id?: string | null;
  block_date: string;
  start_time?: string | null;
  end_time?: string | null;
  all_day: boolean;
  reason?: string | null;
  block_type?: ScheduleBlockType;
  is_active?: boolean;
  created_by?: string | null;
}
