import { describe, expect, it } from 'vitest';
import {
  BUTTON_INTENT_OPTIONS,
  LEGACY_BUTTON_INTENT_OPTIONS,
  applyButtonIntent,
  inferButtonIntent,
  isLegacyButtonIntent,
  isSelectableButtonIntent,
  listVisibleIntents,
} from '@/components/smart-hub/buttonIntentOptions';
import { buttonEditorShortSummary } from '@/components/smart-hub/buttonEditorCopy';

describe('Smart Hub — editor de botão simplificado', () => {
  it('dropdown mostra apenas 4 opções ativas (com CRM)', () => {
    const visible = listVisibleIntents(true);
    expect(visible).toHaveLength(4);
    expect(visible.map((o) => o.id)).toEqual([
      'capture_form',
      'whatsapp',
      'appointment',
      'website',
    ]);
    expect(BUTTON_INTENT_OPTIONS).toHaveLength(4);
  });

  it('sem CRM, remove captar formulário da lista', () => {
    const visible = listVisibleIntents(false);
    expect(visible.map((o) => o.id)).toEqual(['whatsapp', 'appointment', 'website']);
  });

  it('opções removidas existem só como legado e não entram em listVisibleIntents', () => {
    const legacyIds = LEGACY_BUTTON_INTENT_OPTIONS.map((o) => o.id);
    expect(legacyIds).toEqual(['procedure', 'social', 'phone', 'email', 'info']);
    const visible = listVisibleIntents(true).map((o) => o.id);
    for (const id of legacyIds) {
      expect(visible).not.toContain(id);
      expect(isLegacyButtonIntent(id)).toBe(true);
      expect(isSelectableButtonIntent(id)).toBe(false);
    }
  });

  it('inferência legado preserva intenção sem alterar type/action', () => {
    expect(inferButtonIntent('procedure', 'form').intent).toBe('procedure');
    expect(inferButtonIntent('instagram', 'link').intent).toBe('social');
    expect(inferButtonIntent('phone', 'phone').intent).toBe('phone');
    expect(inferButtonIntent('email', 'email').intent).toBe('email');
    expect(inferButtonIntent('info', 'info').intent).toBe('info');
  });

  it('applyButtonIntent ainda mapeia legado internamente', () => {
    expect(applyButtonIntent('procedure', { contactMethod: 'whatsapp' })).toEqual({
      type: 'procedure',
      click_action: 'whatsapp',
    });
    expect(applyButtonIntent('phone')).toEqual({ type: 'phone', click_action: 'phone' });
  });

  it('resumo curto do rodapé', () => {
    expect(buttonEditorShortSummary({ action: 'form' })).toContain('formulário');
    expect(buttonEditorShortSummary({ action: 'whatsapp' })).toContain('WhatsApp');
    expect(buttonEditorShortSummary({ action: 'booking' })).toContain('agendamento online');
  });
});
