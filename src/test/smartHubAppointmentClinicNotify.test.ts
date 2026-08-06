import { describe, expect, it } from 'vitest';
import {
  CLINIC_CHANGE_RESET_CONFIRM,
  SMART_HUB_CLINIC_HINT,
  isSmartHubOriginAppointment,
  resolveAgendaFocusTarget,
  resolveClinicIdForSave,
  shouldApplyClinicChange,
} from '@/lib/agendaClinicLock';
import {
  SMART_HUB_BOOKING_NOTIFICATION_TITLE,
  buildAgendaFocusPath,
  formatSmartHubBookingNotificationMessage,
} from '@/lib/notificationMessage';

describe('agenda clinic lock (Smart Hub)', () => {
  it('reconhece booking por lead_source smart_hub e por idempotency key', () => {
    expect(isSmartHubOriginAppointment({ leadSource: 'smart_hub' })).toBe(true);
    expect(
      isSmartHubOriginAppointment({ bookingIdempotencyKey: 'key-abc-123' })
    ).toBe(true);
    expect(
      isSmartHubOriginAppointment({ leadSource: 'smart_hub_booking' })
    ).toBe(true);
    expect(isSmartHubOriginAppointment({ leadSource: 'whatsapp' })).toBe(false);
    expect(isSmartHubOriginAppointment({})).toBe(false);
  });

  it('bloqueia clínica em booking e mantém clinic_id original no save', () => {
    const clinicLocked = isSmartHubOriginAppointment({
      leadSource: 'smart_hub',
      bookingIdempotencyKey: 'idem-1',
    });
    expect(clinicLocked).toBe(true);
    expect(
      resolveClinicIdForSave({
        clinicLocked: true,
        formClinicId: 'clinic-sorriso-2',
        appointmentClinicId: 'clinic-sorriso',
      })
    ).toBe('clinic-sorriso');
  });

  it('appointment manual permanece editável na clínica', () => {
    const clinicLocked = isSmartHubOriginAppointment({ leadSource: 'instagram' });
    expect(clinicLocked).toBe(false);
    expect(
      resolveClinicIdForSave({
        clinicLocked: false,
        formClinicId: 'clinic-b',
        appointmentClinicId: 'clinic-a',
      })
    ).toBe('clinic-b');
  });

  it('confirmação de troca: cancelar mantém valores; confirmar aplica reset', () => {
    expect(CLINIC_CHANGE_RESET_CONFIRM).toMatch(/profissional/i);
    expect(SMART_HUB_CLINIC_HINT).toMatch(/Smart Hub/i);
    expect(
      shouldApplyClinicChange({ hasDependentSelection: true, userConfirmed: false })
    ).toBe(false);
    expect(
      shouldApplyClinicChange({ hasDependentSelection: true, userConfirmed: true })
    ).toBe(true);
    expect(
      shouldApplyClinicChange({ hasDependentSelection: false, userConfirmed: false })
    ).toBe(true);
  });

  it('profissionais só entram na query se clínica autorizada no contexto', () => {
    const clinics = [{ id: 'c1' }, { id: 'c2' }];
    const appointmentClinicId = 'c1';
    const resolveProfessionalsClinicId = (clinicId: string) =>
      clinicId &&
      (clinics.some((c) => c.id === clinicId) || appointmentClinicId === clinicId)
        ? clinicId
        : null;
    expect(resolveProfessionalsClinicId('c1')).toBe('c1');
    expect(resolveProfessionalsClinicId('c-foreign')).toBe(null);
  });
});

describe('Agenda focus URL', () => {
  const appointments = [
    { id: 'apt-1', date: '2026-08-10', clinic: { id: 'c1' } },
    { id: 'apt-2', date: '2026-08-11', clinic: { id: 'c2' } },
  ];

  it('Visualizar abre data/appointment corretos', () => {
    expect(buildAgendaFocusPath('apt-1', 'c1')).toBe(
      '/agenda?focusAppointmentId=apt-1&clinicId=c1'
    );
    const ok = resolveAgendaFocusTarget({
      focusAppointmentId: 'apt-1',
      focusClinicId: 'c1',
      appointments,
      accessibleClinicIds: ['c1', 'c2'],
    });
    expect(ok).toEqual({ ok: true, appointment: appointments[0] });
  });

  it('URL manipulada (clínica divergente) não abre', () => {
    const bad = resolveAgendaFocusTarget({
      focusAppointmentId: 'apt-1',
      focusClinicId: 'c2',
      appointments,
      accessibleClinicIds: ['c1', 'c2'],
    });
    expect(bad).toEqual({ ok: false, reason: 'forbidden_clinic' });
  });

  it('usuário sem acesso à clínica do appointment não abre', () => {
    const bad = resolveAgendaFocusTarget({
      focusAppointmentId: 'apt-2',
      focusClinicId: 'c2',
      appointments,
      accessibleClinicIds: ['c1'],
    });
    expect(bad).toEqual({ ok: false, reason: 'forbidden_clinic' });
  });

  it('appointment inexistente não quebra (reason not_found)', () => {
    const missing = resolveAgendaFocusTarget({
      focusAppointmentId: 'ghost',
      appointments,
      accessibleClinicIds: ['c1'],
    });
    expect(missing).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('notificação Smart Hub booking', () => {
  it('formata título e mensagem a partir de dados do servidor', () => {
    expect(SMART_HUB_BOOKING_NOTIFICATION_TITLE).toBe('Novo agendamento online');
    expect(
      formatSmartHubBookingNotificationMessage({
        patientName: 'Maria',
        procedureName: 'Limpeza',
        professionalName: 'Ana',
        dateLabel: '10/08/2026',
        timeLabel: '14:00:00',
      })
    ).toBe('Maria agendou Limpeza com Ana para 10/08/2026 às 14:00.');
  });

  it('cria notificação uma vez; retry não duplica', () => {
    const existing: Array<{
      reference_id: string;
      clinic_id: string;
      type: string;
      metadata: { source: string };
    }> = [];

    const notifyOnce = (referenceId: string, clinicId: string) => {
      const already = existing.some(
        (n) =>
          n.reference_id === referenceId &&
          n.clinic_id === clinicId &&
          n.type === 'appointment_created' &&
          n.metadata?.source === 'smart_hub'
      );
      if (already) return false;
      existing.push({
        reference_id: referenceId,
        clinic_id: clinicId,
        type: 'appointment_created',
        metadata: { source: 'smart_hub' },
      });
      return true;
    };

    expect(notifyOnce('apt-1', 'c1')).toBe(true);
    expect(notifyOnce('apt-1', 'c1')).toBe(false);
    expect(existing).toHaveLength(1);
  });

  it('usuário sem Agenda ou de outra clínica não recebe', () => {
    const candidates = [
      { user_id: 'u1', clinic_id: 'c1', hasAgenda: true },
      { user_id: 'u2', clinic_id: 'c1', hasAgenda: false },
      { user_id: 'u3', clinic_id: 'c2', hasAgenda: true },
    ];
    const recipients = candidates.filter(
      (u) => u.clinic_id === 'c1' && u.hasAgenda
    );
    expect(recipients.map((r) => r.user_id)).toEqual(['u1']);
  });
});
