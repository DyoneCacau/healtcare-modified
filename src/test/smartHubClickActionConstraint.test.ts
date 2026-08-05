import { describe, expect, it } from 'vitest';
import {
  SMART_HUB_CLICK_ACTION_LABELS,
  type SmartHubClickAction,
} from '@/types/smartHub';
import { ALL_CLICK_ACTIONS } from '@/components/smart-hub/buttonTypeActionMap';
import { validateButtonInput } from '@/services/smartHub/buttonUtils';

/** Valores permitidos pela constraint atualizada (espelho do SQL PRODUCAO_38). */
export const SMART_HUB_CLICK_ACTION_DB_VALUES = [
  'auto',
  'form',
  'whatsapp',
  'link',
  'phone',
  'email',
  'map',
  'info',
  'booking',
] as const satisfies readonly SmartHubClickAction[];

const LEGACY_WITHOUT_BOOKING = [
  'auto',
  'form',
  'whatsapp',
  'link',
  'phone',
  'email',
  'map',
  'info',
] as const;

describe('Smart Hub — constraint click_action inclui booking', () => {
  it('lista do banco inclui booking e preserva valores legados', () => {
    expect(SMART_HUB_CLICK_ACTION_DB_VALUES).toContain('booking');
    for (const value of LEGACY_WITHOUT_BOOKING) {
      expect(SMART_HUB_CLICK_ACTION_DB_VALUES).toContain(value);
    }
  });

  it('tipos do frontend batem com a constraint', () => {
    const frontend = Object.keys(SMART_HUB_CLICK_ACTION_LABELS) as SmartHubClickAction[];
    expect(frontend.sort()).toEqual([...SMART_HUB_CLICK_ACTION_DB_VALUES].sort());
    expect([...ALL_CLICK_ACTIONS].sort()).toEqual([...SMART_HUB_CLICK_ACTION_DB_VALUES].sort());
  });

  it('booking é aceito na validação de serviço com url null', () => {
    const check = validateButtonInput({
      title: 'Agendar online',
      type: 'appointment',
      url: null,
      click_action: 'booking',
    });
    expect(check.valid).toBe(true);
  });

  it('valores legados continuam aceitos na validação', () => {
    expect(
      validateButtonInput({
        title: 'Formulário',
        type: 'form',
        url: null,
        click_action: 'form',
      }).valid
    ).toBe(true);
    expect(
      validateButtonInput({
        title: 'WhatsApp',
        type: 'whatsapp',
        url: '5511999999999',
        click_action: 'whatsapp',
      }).valid
    ).toBe(true);
    expect(
      validateButtonInput({
        title: 'Site',
        type: 'link',
        url: 'https://exemplo.com',
        click_action: 'link',
      }).valid
    ).toBe(true);
  });

  it('valor inválido não está na lista da constraint', () => {
    expect(SMART_HUB_CLICK_ACTION_DB_VALUES).not.toContain('invalid_action');
    expect(SMART_HUB_CLICK_ACTION_DB_VALUES).not.toContain('crm');
  });

  it('migration/PRODUCAO documentam a mesma lista (contrato espelhado)', () => {
    // A lista canônica acima deve permanecer alinhada a:
    // supabase/PRODUCAO_38_SMART_HUB_CLICK_ACTION_BOOKING.sql
    // supabase/migrations/20260805190000_smart_hub_click_action_booking.sql
    expect(SMART_HUB_CLICK_ACTION_DB_VALUES.join(',')).toBe(
      'auto,form,whatsapp,link,phone,email,map,info,booking'
    );
  });
});
