import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SMART_HUB_CLICK_ACTION_LABELS,
  type SmartHubClickAction,
} from '@/types/smartHub';
import { ALL_CLICK_ACTIONS } from '@/components/smart-hub/buttonTypeActionMap';
import { validateButtonInput } from '@/services/smartHub/buttonUtils';

/** Valores permitidos pela constraint atualizada (espelho do SQL). */
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

function readSql(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function extractClickActionInList(sql: string): string[] {
  const match = sql.match(
    /smart_hub_buttons_click_action_check[\s\S]*?CHECK\s*\(\s*click_action\s+IN\s*\(([\s\S]*?)\)\s*\)/i
  );
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

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

  it('migration e PRODUCAO recriam a constraint com a mesma lista', () => {
    const migration = readSql(
      'supabase/migrations/20260805190000_smart_hub_click_action_booking.sql'
    );
    const producao = readSql('supabase/PRODUCAO_38_SMART_HUB_CLICK_ACTION_BOOKING.sql');

    expect(migration).toContain('DROP CONSTRAINT IF EXISTS smart_hub_buttons_click_action_check');
    expect(producao).toContain('DROP CONSTRAINT IF EXISTS smart_hub_buttons_click_action_check');

    const fromMigration = extractClickActionInList(migration);
    const fromProducao = extractClickActionInList(producao);

    expect(fromMigration.sort()).toEqual([...SMART_HUB_CLICK_ACTION_DB_VALUES].sort());
    expect(fromProducao.sort()).toEqual([...SMART_HUB_CLICK_ACTION_DB_VALUES].sort());
    expect(fromMigration.sort()).toEqual(fromProducao.sort());
  });
});
