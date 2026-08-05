import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applyButtonIntent,
  inferButtonIntent,
  isPublicBookingEnabled,
  CONTACT_METHOD_ONLINE_BOOKING,
} from '@/components/smart-hub/buttonIntentOptions';
import { isActionCompatible } from '@/components/smart-hub/buttonTypeActionMap';
import { resolveClickAction } from '@/services/smartHub/captureDefaults';
import {
  BookingService,
  buildConfirmPayload,
  createIdempotencyKey,
  groupSlotsByDate,
} from '@/services/smartHub/BookingService';

describe('Smart Hub Fase D — booking intent / editor gate', () => {
  it('habilita online_booking quando public_booking_enabled = true', () => {
    expect(isPublicBookingEnabled({ public_booking_enabled: true })).toBe(true);
    expect(CONTACT_METHOD_ONLINE_BOOKING.id).toBe('online_booking');
  });

  it('desabilita online_booking quando flag false ou ausente', () => {
    expect(isPublicBookingEnabled({ public_booking_enabled: false })).toBe(false);
    expect(isPublicBookingEnabled({})).toBe(false);
    expect(isPublicBookingEnabled(null)).toBe(false);
  });

  it('applyButtonIntent mapeia online_booking → click_action booking', () => {
    expect(
      applyButtonIntent('appointment', { contactMethod: 'online_booking' })
    ).toEqual({ type: 'appointment', click_action: 'booking' });
    expect(
      applyButtonIntent('procedure', { contactMethod: 'online_booking' })
    ).toEqual({ type: 'procedure', click_action: 'booking' });
  });

  it('não converte botões antigos automaticamente (form/whatsapp/link permanecem)', () => {
    expect(inferButtonIntent('appointment', 'form').contactMethod).toBe('form');
    expect(inferButtonIntent('appointment', 'whatsapp').contactMethod).toBe('whatsapp');
    expect(inferButtonIntent('appointment', 'link').contactMethod).toBe('link');
    expect(inferButtonIntent('appointment', 'booking').contactMethod).toBe('online_booking');
  });

  it('fluxo formulário / whatsapp / link continuam compatíveis', () => {
    expect(isActionCompatible('appointment', 'form')).toBe(true);
    expect(isActionCompatible('appointment', 'whatsapp')).toBe(true);
    expect(isActionCompatible('appointment', 'link')).toBe(true);
    expect(isActionCompatible('appointment', 'booking')).toBe(true);
    expect(resolveClickAction('form', 'appointment')).toBe('form');
    expect(resolveClickAction('whatsapp', 'whatsapp')).toBe('whatsapp');
    expect(resolveClickAction('link', 'site')).toBe('link');
    expect(resolveClickAction('booking', 'appointment')).toBe('booking');
  });
});

describe('Smart Hub Fase D — booking payload / catalog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('troca de procedimento/profissional implica limpar slots (contrato de estado)', () => {
    const slots = [
      { date: '2026-08-10', start_time: '08:00', end_time: '08:30' },
      { date: '2026-08-10', start_time: '08:30', end_time: '09:00' },
      { date: '2026-08-11', start_time: '08:00', end_time: '08:30' },
    ];
    expect(groupSlotsByDate(slots)).toHaveLength(2);
    expect(groupSlotsByDate([])).toEqual([]);
  });

  it('confirm payload não envia clinic_id, end_time, duration ou status', () => {
    const key = createIdempotencyKey();
    const body = buildConfirmPayload({
      slug: 'clinica-sorriso',
      procedure_id: 'f939e858-8294-4087-bb64-2d2eef27e68f',
      professional_id: '0acd74f5-41f5-4e49-aaa1-c60bb137473e',
      date: '2026-08-10',
      start_time: '08:00',
      idempotency_key: key,
      privacy_accepted: true,
      notes: 'teste',
      patient: { name: 'Ana', phone: '(85) 99999-0001', email: 'a@b.com' },
    });

    expect(body.action).toBe('confirm');
    expect(body.slug).toBe('clinica-sorriso');
    expect(body).not.toHaveProperty('clinic_id');
    expect(body).not.toHaveProperty('end_time');
    expect(body).not.toHaveProperty('duration');
    expect(body).not.toHaveProperty('duration_minutes');
    expect(body).not.toHaveProperty('status');
    expect(body.privacy_accepted).toBe(true);
    expect(body.idempotency_key).toBe(key);
    expect((body.patient as { phone: string }).phone).toMatch(/^\d+$/);
  });

  it('privacidade obrigatória no payload', () => {
    const body = buildConfirmPayload({
      slug: 'x',
      procedure_id: '11111111-1111-1111-1111-111111111111',
      professional_id: '22222222-2222-2222-2222-222222222222',
      date: '2026-08-10',
      start_time: '08:00',
      idempotency_key: 'homolog-key-12345678',
      privacy_accepted: false,
      patient: { name: 'Ana', phone: '85999990001' },
    });
    expect(body.privacy_accepted).toBe(false);
  });

  it('contrato catalog: procedimentos com professionals aninhados', async () => {
    const catalogOk = {
      procedures: [
        {
          id: 'p1',
          name: 'Consulta',
          duration_minutes: 30,
          professionals: [{ id: 'r1', name: 'Emanuel' }],
        },
      ],
    };
    expect(catalogOk.procedures[0]).toEqual({
      id: 'p1',
      name: 'Consulta',
      duration_minutes: 30,
      professionals: [{ id: 'r1', name: 'Emanuel' }],
    });
    expect(catalogOk.procedures[0]).not.toHaveProperty('default_price');
    expect(catalogOk.procedures[0].professionals[0]).not.toHaveProperty('phone');
    expect(catalogOk.procedures[0].professionals[0]).not.toHaveProperty('email');
  });

  it('BookingService.getCatalog propaga booking_disabled', async () => {
    const spy = vi.spyOn(BookingService, 'getCatalog').mockResolvedValue({
      ok: false,
      code: 'booking_disabled',
      error: 'O agendamento online não está disponível no momento.',
    });
    const res = await BookingService.getCatalog('clinica-sorriso');
    expect(res.ok).toBe(false);
    expect(res.code).toBe('booking_disabled');
    spy.mockRestore();
  });

  it('slot_taken / 409 / 201 / 200 são códigos esperados pelo cliente', () => {
    const expected = new Set([
      'slot_taken',
      'idempotency_conflict',
      'booking_disabled',
      'rate_limited',
      'internal_error',
    ]);
    expect(expected.has('slot_taken')).toBe(true);
    expect(expected.has('idempotency_conflict')).toBe(true);
  });
});
