import { describe, expect, it } from 'vitest';
import {
  friendlyScheduleError,
  isValidTimeRange,
  isValidWeekday,
  periodsOverlap,
  validateScheduleBlockInput,
  validateWorkSchedulePeriods,
} from '@/lib/scheduleValidation';

describe('scheduleValidation', () => {
  it('aceita weekday 0–6 e rejeita fora', () => {
    expect(isValidWeekday(0)).toBe(true);
    expect(isValidWeekday(6)).toBe(true);
    expect(isValidWeekday(7)).toBe(false);
    expect(isValidWeekday(-1)).toBe(false);
  });

  it('valida período válido e inválido', () => {
    expect(isValidTimeRange('08:00', '12:00')).toBe(true);
    expect(isValidTimeRange('12:00', '08:00')).toBe(false);
    expect(isValidTimeRange('08:00', '08:00')).toBe(false);
  });

  it('detecta sobreposição e permite múltiplos sem overlap', () => {
    expect(
      periodsOverlap(
        { weekday: 1, start_time: '08:00', end_time: '12:00' },
        { weekday: 1, start_time: '11:00', end_time: '14:00' },
      ),
    ).toBe(true);

    expect(
      validateWorkSchedulePeriods([
        { weekday: 1, start_time: '08:00', end_time: '12:00' },
        { weekday: 1, start_time: '14:00', end_time: '18:00' },
      ]),
    ).toBeNull();

    expect(
      validateWorkSchedulePeriods([
        { weekday: 1, start_time: '08:00', end_time: '12:00' },
        { weekday: 1, start_time: '11:30', end_time: '13:00' },
      ]),
    ).toMatch(/sobrepõe/i);
  });

  it('valida bloqueio parcial e dia inteiro', () => {
    expect(
      validateScheduleBlockInput({
        block_date: '2026-08-01',
        all_day: true,
        start_time: null,
        end_time: null,
      }),
    ).toBeNull();

    expect(
      validateScheduleBlockInput({
        block_date: '2026-08-01',
        all_day: false,
        start_time: '09:00',
        end_time: '10:00',
      }),
    ).toBeNull();

    expect(
      validateScheduleBlockInput({
        block_date: '2026-08-01',
        all_day: false,
        start_time: null,
        end_time: null,
      }),
    ).toMatch(/início e fim/i);

    expect(
      validateScheduleBlockInput({
        block_date: '2026-08-01',
        all_day: true,
        start_time: '09:00',
        end_time: '10:00',
      }),
    ).toMatch(/dia inteiro/i);
  });

  it('traduz erros do banco', () => {
    expect(
      friendlyScheduleError({ message: 'Este período se sobrepõe a outro horário.' }),
    ).toMatch(/sobrepõe/i);
    expect(
      friendlyScheduleError({ message: 'Profissional não pertence a esta clínica.' }),
    ).toMatch(/não pertence/i);
  });
});
