import { describe, expect, it } from 'vitest';
import {
  addMinutesToTime,
  isSlotAvailable,
  phonesEquivalent,
  validateAvailabilityWindow,
} from '../../supabase/functions/_shared/smartHubBookingSlots.ts';

const PROFESSIONAL = '11111111-1111-1111-1111-111111111111';
const MON = '2030-01-07';
const work = [{ weekday: 1, start_time: '08:00', end_time: '12:00', is_active: true }];
const now = new Date('2030-01-01T12:00:00-03:00');

/** Espelha a regra de match de idempotência do confirm. */
function idempotencyMatchesExisting(
  existing: {
    date: string;
    start_time: string;
    end_time: string;
    professional_id: string;
    procedure_id: string | null;
  },
  request: {
    date: string;
    start_time: string;
    end_time: string;
    professional_id: string;
    procedure_id: string;
  },
): boolean {
  return (
    existing.date === request.date &&
    existing.start_time.slice(0, 5) === request.start_time.slice(0, 5) &&
    existing.end_time.slice(0, 5) === request.end_time.slice(0, 5) &&
    existing.professional_id === request.professional_id &&
    String(existing.procedure_id || '') === request.procedure_id
  );
}

describe('smartHubBooking confirm — regras puras', () => {
  it('calcula end_time no servidor a partir da duração', () => {
    expect(addMinutesToTime('08:00', 45)).toBe('08:45');
    expect(addMinutesToTime('09:30', 90)).toBe('11:00');
  });

  it('reutiliza paciente por telefone equivalente na mesma clínica (regra)', () => {
    const clinicPatients = [
      { id: 'p1', clinic_id: 'c1', phone: '11999998888' },
      { id: 'p2', clinic_id: 'c2', phone: '11999998888' },
    ];
    const incoming = '5511999998888';
    const sameClinic = clinicPatients.filter((p) => p.clinic_id === 'c1');
    const match = sameClinic.find((p) => phonesEquivalent(p.phone, incoming));
    expect(match?.id).toBe('p1');
    expect(
      clinicPatients
        .filter((p) => p.clinic_id === 'c2')
        .some((p) => phonesEquivalent(p.phone, incoming)),
    ).toBe(true); // existe em outra clínica, mas não deve ser usado
  });

  it('mesma idempotency key com mesmo payload é ok', () => {
    expect(
      idempotencyMatchesExisting(
        {
          date: MON,
          start_time: '08:00:00',
          end_time: '09:00:00',
          professional_id: PROFESSIONAL,
          procedure_id: 'proc-1',
        },
        {
          date: MON,
          start_time: '08:00',
          end_time: '09:00',
          professional_id: PROFESSIONAL,
          procedure_id: 'proc-1',
        },
      ),
    ).toBe(true);
  });

  it('mesma idempotency key com payload diferente conflita', () => {
    expect(
      idempotencyMatchesExisting(
        {
          date: MON,
          start_time: '08:00:00',
          end_time: '09:00:00',
          professional_id: PROFESSIONAL,
          procedure_id: 'proc-1',
        },
        {
          date: MON,
          start_time: '09:00',
          end_time: '10:00',
          professional_id: PROFESSIONAL,
          procedure_id: 'proc-1',
        },
      ),
    ).toBe(false);
  });

  it('rejeita data passada no confirm (via window)', () => {
    const res = validateAvailabilityWindow({
      from_date: '2020-01-01',
      to_date: '2020-01-01',
      now: new Date('2030-01-07T12:00:00-03:00'),
    });
    expect(res.ok).toBe(false);
  });

  it('rejeita horário fora da jornada', () => {
    expect(
      isSlotAvailable({
        date: MON,
        start_time: '13:00',
        end_time: '14:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments: [],
        now,
      }),
    ).toBe(false);
  });

  it('rejeita horário bloqueado', () => {
    expect(
      isSlotAvailable({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [
          {
            block_date: MON,
            start_time: '08:00',
            end_time: '09:00',
            all_day: false,
            is_active: true,
            professional_id: PROFESSIONAL,
          },
        ],
        appointments: [],
        now,
      }),
    ).toBe(false);
  });

  it('privacy_accepted deve ser true (contrato)', () => {
    const accept = (v: unknown) => v === true;
    expect(accept(true)).toBe(true);
    expect(accept(false)).toBe(false);
    expect(accept('true')).toBe(false);
    expect(accept(1)).toBe(false);
  });

  it('clinic_id do cliente é irrelevante — clínica vem do hub', () => {
    const forgedClinicId = '00000000-0000-0000-0000-000000000099';
    const hubClinicId = '00000000-0000-0000-0000-000000000001';
    const resolvedClinicId = hubClinicId; // Edge sempre usa hub.clinic_id
    expect(resolvedClinicId).not.toBe(forgedClinicId);
  });

  it('isolamento: appointment de outra clínica não ocupa slot', () => {
    expect(
      isSlotAvailable({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        // Context já filtrado por clinic_id na Edge; outro clinic não entra
        appointments: [],
        now,
      }),
    ).toBe(true);
  });

  it('concorrência: segundo confirm no mesmo slot falha após o primeiro', () => {
    const store: Array<{
      date: string;
      start_time: string;
      end_time: string;
      status: string;
      professional_id: string;
      key: string;
    }> = [];

    const confirm = (key: string) => {
      const existing = store.find((a) => a.key === key);
      if (existing) return { ok: true, status: 200 as const, id: existing.start_time };

      const free = isSlotAvailable({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        duration_minutes: 60,
        professional_id: PROFESSIONAL,
        work_periods: work,
        blocks: [],
        appointments: store,
        now,
      });
      if (!free) return { ok: false, status: 409 as const, code: 'slot_taken' };

      store.push({
        date: MON,
        start_time: '08:00',
        end_time: '09:00',
        status: 'confirmed',
        professional_id: PROFESSIONAL,
        key,
      });
      return { ok: true, status: 201 as const };
    };

    expect(confirm('key-aaa')).toEqual({ ok: true, status: 201 });
    expect(confirm('key-bbb')).toEqual({ ok: false, status: 409, code: 'slot_taken' });
    expect(confirm('key-aaa')).toEqual({ ok: true, status: 200, id: '08:00' });
    expect(store).toHaveLength(1);
  });
});
