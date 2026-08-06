import { describe, expect, it } from 'vitest';
import {
  evaluateBookingReadiness,
  formatBookingReadinessChecklist,
  isValidBookingDuration,
} from '@/services/smartHub/bookingReadiness';
import {
  buildPublicHubJson,
  findForbiddenPublicKeys,
  sanitizePublicCaptureConfig,
  PUBLIC_ASSET_FORBIDDEN_KEYS,
  PUBLIC_CAPTURE_FORBIDDEN_KEYS,
  PUBLIC_HUB_FORBIDDEN_KEYS,
} from '@/services/smartHub/publicSmartHubContract';
import { CONTACT_METHOD_ONLINE_BOOKING } from '@/components/smart-hub/buttonIntentOptions';

const baseReady = {
  hasSmartHubModule: true,
  hasAgendaModule: true,
  procedures: [{ id: 'proc1', is_active: true, duration_minutes: 30 }],
  professionals: [{ id: 'prof1', is_active: true, performs_all_procedures: true }],
  workSchedules: [{ professional_id: 'prof1', is_active: true }],
  links: [] as Array<{ professional_id: string; procedure_id: string }>,
};

describe('booking readiness (toggle pré-ativação)', () => {
  it('libera quando módulos, procedimento, profissional, jornada e elegibilidade ok', () => {
    const result = evaluateBookingReadiness(baseReady);
    expect(result.ok).toBe(true);
    expect(result.items.every((i) => i.ok)).toBe(true);
  });

  it('bloqueia sem módulo Agenda ou Smart Hub', () => {
    expect(
      evaluateBookingReadiness({ ...baseReady, hasAgendaModule: false }).ok
    ).toBe(false);
    expect(
      evaluateBookingReadiness({ ...baseReady, hasSmartHubModule: false }).ok
    ).toBe(false);
  });

  it('bloqueia sem procedimento ativo com duração válida', () => {
    expect(
      evaluateBookingReadiness({
        ...baseReady,
        procedures: [{ id: 'x', is_active: false, duration_minutes: 30 }],
      }).ok
    ).toBe(false);
    expect(
      evaluateBookingReadiness({
        ...baseReady,
        procedures: [{ id: 'x', is_active: true, duration_minutes: 2 }],
      }).ok
    ).toBe(false);
    expect(isValidBookingDuration(30)).toBe(true);
    expect(isValidBookingDuration(2)).toBe(false);
  });

  it('bloqueia sem profissional ativo', () => {
    expect(
      evaluateBookingReadiness({
        ...baseReady,
        professionals: [{ id: 'prof1', is_active: false, performs_all_procedures: true }],
      }).ok
    ).toBe(false);
  });

  it('bloqueia sem jornada ativa', () => {
    expect(
      evaluateBookingReadiness({
        ...baseReady,
        workSchedules: [],
      }).ok
    ).toBe(false);
  });

  it('bloqueia combinação inelegível profissional ↔ procedimento', () => {
    const result = evaluateBookingReadiness({
      ...baseReady,
      professionals: [
        { id: 'prof1', is_active: true, performs_all_procedures: false },
      ],
      links: [],
    });
    expect(result.ok).toBe(false);
    expect(result.items.find((i) => i.id === 'eligible_combo')?.ok).toBe(false);
  });

  it('aceita vínculo específico quando performs_all = false', () => {
    const result = evaluateBookingReadiness({
      ...baseReady,
      professionals: [
        { id: 'prof1', is_active: true, performs_all_procedures: false },
      ],
      links: [{ professional_id: 'prof1', procedure_id: 'proc1' }],
    });
    expect(result.ok).toBe(true);
  });

  it('checklist textual lista falhas objetivas', () => {
    const result = evaluateBookingReadiness({
      ...baseReady,
      hasAgendaModule: false,
      workSchedules: [],
    });
    const text = formatBookingReadinessChecklist(result.items);
    expect(text).toContain('✗');
    expect(text).toMatch(/Agenda/i);
    expect(text).toMatch(/jornada/i);
  });
});

describe('texto Desativado (booking)', () => {
  it('não usa Em breve no badge do agendamento online', () => {
    expect(CONTACT_METHOD_ONLINE_BOOKING.badgeDisabled).toBe('Desativado');
    expect(CONTACT_METHOD_ONLINE_BOOKING.badgeDisabled.toLowerCase()).not.toContain(
      'breve'
    );
  });
});

describe('contrato get_public_smart_hub (whitelist)', () => {
  it('remove clinic_id, owners CRM e campos internos do hub', () => {
    const raw = {
      id: 'h1',
      clinic_id: 'c1',
      slug: 'clinica',
      title: 'Clínica',
      created_by: 'u1',
      updated_by: 'u2',
      owner_id: 'o1',
      capture_config: {
        form_title: 'Fale conosco',
        default_owner_user_id: 'owner-secret',
        initial_stage: 'new',
        dedupe_mode: 'update',
        fields: [],
      },
      public_booking_enabled: true,
    };

    const pub = buildPublicHubJson(raw);
    expect(findForbiddenPublicKeys(pub, PUBLIC_HUB_FORBIDDEN_KEYS)).toEqual([]);
    expect(pub).not.toHaveProperty('clinic_id');
    expect(pub).not.toHaveProperty('created_by');
    expect(pub).not.toHaveProperty('updated_by');
    expect(pub).not.toHaveProperty('owner_id');
    expect(pub.slug).toBe('clinica');
    expect(pub.public_booking_enabled).toBe(true);

    const capture = pub.capture_config as Record<string, unknown>;
    expect(
      findForbiddenPublicKeys(capture, PUBLIC_CAPTURE_FORBIDDEN_KEYS)
    ).toEqual([]);
    expect(capture.form_title).toBe('Fale conosco');
    expect(capture).not.toHaveProperty('default_owner_user_id');
    expect(capture).not.toHaveProperty('initial_stage');
  });

  it('sanitizePublicCaptureConfig não vazam responsáveis internos', () => {
    const sanitized = sanitizePublicCaptureConfig({
      form_title: 'Oi',
      default_owner_user_id: 'x',
      owner_user_id: 'y',
      initial_stage: 'contact',
      dedupe_mode: 'block',
      fields: [{ key: 'name' }],
    });
    expect(sanitized.form_title).toBe('Oi');
    expect(sanitized.fields).toEqual([{ key: 'name' }]);
    expect(sanitized).not.toHaveProperty('default_owner_user_id');
    expect(sanitized).not.toHaveProperty('owner_user_id');
    expect(sanitized).not.toHaveProperty('initial_stage');
    expect(sanitized).not.toHaveProperty('dedupe_mode');
  });

  it('assets públicos não incluem storage_path nem clinic_id', () => {
    const asset = {
      id: 'a1',
      hub_id: 'h1',
      public_url: 'https://cdn.example/logo.png',
      asset_kind: 'logo',
      status: 'active',
    };
    expect(findForbiddenPublicKeys(asset, PUBLIC_ASSET_FORBIDDEN_KEYS)).toEqual([]);
    expect(
      findForbiddenPublicKeys(
        { ...asset, clinic_id: 'c1', storage_path: 'clinic/x' },
        PUBLIC_ASSET_FORBIDDEN_KEYS
      )
    ).toEqual(['clinic_id', 'storage_path']);
  });
});
