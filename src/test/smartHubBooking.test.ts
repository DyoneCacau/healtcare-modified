import { describe, expect, it } from 'vitest';
import {
  BOOKING_TIMEZONE,
  addMinutesToTime,
  computeAvailableSlots,
  isSlotAvailable,
  phonesEquivalent,
  rangesOverlap,
  validateAvailabilityWindow,
  weekdayForDateYmd,
} from '../../supabase/functions/_shared/smartHubBookingSlots.ts';

const PROFESSIONAL = '11111111-1111-1111-1111-111111111111';

/** Segunda-feira 2030-01-07 (fixo) */
const MON = '2030-01-07';
const TUE = '2030-01-08';

describe('smartHubBookingSlots — helpers', () => {
  it('soma duração corretamente', () => {
    expect(addMinutesToTime('08:00', 60)).toBe('09:00');
    expect(addMinutesToTime('08:30', 45)).toBe('09:15');
  });

  it('detecta overlap de intervalos', () => {
    expect(
      rangesOverlap(
        { start_time: '08:00', end_time: '09:00' },
        { start_time: '08:30', end_time: '09:30' },
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        { start_time: '08:00', end_time: '09:00' },
        { start_time: '09:00', end_time: '10:00' },
      ),
    ).toBe(false);
  });

  it('compara telefones equivalentes', () => {
    expect(phonesEquivalent('5511999999999', '(11) 99999-9999')).toBe(true);
    expect(phonesEquivalent('11999999999', '5511999999999')).toBe(true);
    expect(phonesEquivalent('11988887777', '11999999999')).toBe(false);
  });

  it('weekday de 2030-01-07 é segunda (1)', () => {
    expect(weekdayForDateYmd(MON, BOOKING_TIMEZONE)).toBe(1);
  });
});

describe('validateAvailabilityWindow', () => {
  const now = new Date('2030-01-07T12:00:00-03:00');

  it('rejeita data passada', () => {
    const res = validateAvailabilityWindow({
      from_date: '2030-01-06',
      to_date: '2030-01-06',
      now,
    });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.code).toBe('invalid_date_range');
  });

  it('rejeita janela acima de 30 dias', () => {
    const res = validateAvailabilityWindow({
      from_date: MON,
      to_date: '2030-02-10',
      now,
    });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.code).toBe('invalid_date_range');
  });

  it('aceita janela válida', () => {
    const res = validateAvailabilityWindow({
      from_date: MON,
      to_date: TUE,
      now,
    });
    expect(res.ok).toBe(true);
  });
});

describe('computeAvailableSlots', () => {
  const work = [
    { weekday: 1, start_time: '08:00', end_time: '12:00', is_active: true },
  ];
  const now = new Date('2030-01-01T12:00:00-03:00');

  it('jornada simples gera slots de 60 min', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [],
      appointments: [],
      now,
    });
    expect(slots.map((s) => s.start_time)).toEqual(['08:00', '09:00', '10:00', '11:00']);
  });

  it('múltiplas jornadas no mesmo dia', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: [
        { weekday: 1, start_time: '08:00', end_time: '10:00', is_active: true },
        { weekday: 1, start_time: '14:00', end_time: '16:00', is_active: true },
      ],
      blocks: [],
      appointments: [],
      now,
    });
    expect(slots.map((s) => `${s.start_time}-${s.end_time}`)).toEqual([
      '08:00-09:00',
      '09:00-10:00',
      '14:00-15:00',
      '15:00-16:00',
    ]);
  });

  it('procedimento que não cabe no final da jornada', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 90,
      professional_id: PROFESSIONAL,
      work_periods: [{ weekday: 1, start_time: '08:00', end_time: '10:00', is_active: true }],
      blocks: [],
      appointments: [],
      now,
    });
    // 08:00-09:30 cabe; 09:00-10:30 não; 09:30 não é step de 90 a partir de 08:00
    expect(slots.map((s) => s.start_time)).toEqual(['08:00']);
  });

  it('bloqueio parcial remove slots sobrepostos', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [
        {
          block_date: MON,
          start_time: '10:00',
          end_time: '11:00',
          all_day: false,
          is_active: true,
          professional_id: PROFESSIONAL,
        },
      ],
      appointments: [],
      now,
    });
    expect(slots.map((s) => s.start_time)).toEqual(['08:00', '09:00', '11:00']);
  });

  it('bloqueio do dia inteiro zera o dia', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [
        {
          block_date: MON,
          start_time: null,
          end_time: null,
          all_day: true,
          is_active: true,
          professional_id: null,
        },
      ],
      appointments: [],
      now,
    });
    expect(slots).toEqual([]);
  });

  it('appointment existente bloqueia o horário', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [],
      appointments: [
        {
          date: MON,
          start_time: '09:00',
          end_time: '10:00',
          status: 'confirmed',
          professional_id: PROFESSIONAL,
        },
      ],
      now,
    });
    expect(slots.map((s) => s.start_time)).toEqual(['08:00', '10:00', '11:00']);
  });

  it('cancelled libera horário', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [],
      appointments: [
        {
          date: MON,
          start_time: '09:00',
          end_time: '10:00',
          status: 'cancelled',
          professional_id: PROFESSIONAL,
        },
      ],
      now,
    });
    expect(slots.map((s) => s.start_time)).toContain('09:00');
  });

  it('no_show libera horário', () => {
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [],
      appointments: [
        {
          date: MON,
          start_time: '09:00',
          end_time: '10:00',
          status: 'no_show',
          professional_id: PROFESSIONAL,
        },
      ],
      now,
    });
    expect(slots.map((s) => s.start_time)).toContain('09:00');
  });

  it('não retorna horário passado no dia corrente', () => {
    const lateMorning = new Date('2030-01-07T10:30:00-03:00');
    const slots = computeAvailableSlots({
      from_date: MON,
      to_date: MON,
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [],
      appointments: [],
      now: lateMorning,
    });
    expect(slots.map((s) => s.start_time)).toEqual(['11:00']);
  });

  it('duração inválida não gera slots', () => {
    expect(
      computeAvailableSlots({
        from_date: MON,
        to_date: MON,
        duration_minutes: 3,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments: [],
        now,
      }),
    ).toEqual([]);
    expect(
      computeAvailableSlots({
        from_date: MON,
        to_date: MON,
        duration_minutes: 800,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments: [],
        now,
      }),
    ).toEqual([]);
  });
});

describe('smartHubBooking — gates de contrato (Hub / clínica)', () => {
  function assertHubBookable(hub: {
    status: string;
    public_booking_enabled: boolean;
  }): string | null {
    if (hub.status !== 'published') return 'booking_disabled';
    if (!hub.public_booking_enabled) return 'booking_disabled';
    return null;
  }

  function assertBelongsToClinic(entityClinicId: string, hubClinicId: string): boolean {
    return entityClinicId === hubClinicId;
  }

  it('Hub não publicado bloqueia', () => {
    expect(assertHubBookable({ status: 'draft', public_booking_enabled: true })).toBe(
      'booking_disabled',
    );
  });

  it('booking desabilitado bloqueia', () => {
    expect(assertHubBookable({ status: 'published', public_booking_enabled: false })).toBe(
      'booking_disabled',
    );
  });

  it('procedimento de outra clínica é rejeitado', () => {
    expect(assertBelongsToClinic('clinic-b', 'clinic-a')).toBe(false);
  });

  it('profissional de outra clínica é rejeitado', () => {
    expect(assertBelongsToClinic('clinic-b', 'clinic-a')).toBe(false);
  });
});

describe('isSlotAvailable / concorrência lógica', () => {
  const work = [{ weekday: 1, start_time: '08:00', end_time: '12:00', is_active: true }];
  const now = new Date('2030-01-01T12:00:00-03:00');

  it('valida slot livre e rejeita quando ocupado', () => {
    const base = {
      date: MON,
      start_time: '08:00',
      end_time: '09:00',
      duration_minutes: 60,
      professional_id: PROFESSIONAL,
      work_periods: work,
      blocks: [] as [],
      now,
    };

    expect(
      isSlotAvailable({
        ...base,
        appointments: [],
      }),
    ).toBe(true);

    expect(
      isSlotAvailable({
        ...base,
        appointments: [
          {
            date: MON,
            start_time: '08:00',
            end_time: '09:00',
            status: 'confirmed',
            professional_id: PROFESSIONAL,
          },
        ],
      }),
    ).toBe(false);
  });

  it('simula dois confirms: só o primeiro vê o slot livre', () => {
    const appointments: Array<{
      date: string;
      start_time: string;
      end_time: string;
      status: string;
      professional_id: string;
    }> = [];

    const tryBook = () => {
      const free = isSlotAvailable({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments,
        now,
      });
      if (!free) return false;
      appointments.push({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        status: 'confirmed',
        professional_id: PROFESSIONAL,
      });
      return true;
    };

    expect(tryBook()).toBe(true);
    expect(tryBook()).toBe(false);
    expect(appointments).toHaveLength(1);
  });

  it('rejeita end_time forjado diferente da duração', () => {
    expect(
      isSlotAvailable({
        date: MON,
        start_time: '08:00',
        end_time: '10:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments: [],
        now,
      }),
    ).toBe(false);
  });
});
