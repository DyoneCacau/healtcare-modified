import { describe, expect, it } from 'vitest';
import {
  buttonRequiresDestination,
  validateButtonInput,
} from '@/services/smartHub/buttonUtils';
import { applyButtonIntent } from '@/components/smart-hub/buttonIntentOptions';
import { buttonEditorShortSummary } from '@/components/smart-hub/buttonEditorCopy';
import {
  BUTTON_ICON_OPTIONS,
  isKnownButtonIcon,
} from '@/components/smart-hub/buttonIconOptions';

describe('Smart Hub — booking online sem target_url', () => {
  it('applyButtonIntent online_booking gera click_action booking', () => {
    expect(
      applyButtonIntent('appointment', { contactMethod: 'online_booking', hasCrm: true })
    ).toEqual({ type: 'appointment', click_action: 'booking' });
  });

  it('booking / form / info não exigem destino', () => {
    expect(buttonRequiresDestination('appointment', 'booking')).toBe(false);
    expect(buttonRequiresDestination('appointment', 'form')).toBe(false);
    expect(buttonRequiresDestination('form', 'form')).toBe(false);
    expect(buttonRequiresDestination('info', 'info')).toBe(false);
    expect(buttonRequiresDestination('appointment', 'auto')).toBe(false);
    expect(buttonRequiresDestination('procedure', null)).toBe(false);
  });

  it('link e whatsapp exigem destino', () => {
    expect(buttonRequiresDestination('link', 'link')).toBe(true);
    expect(buttonRequiresDestination('whatsapp', 'whatsapp')).toBe(true);
    expect(buttonRequiresDestination('appointment', 'link')).toBe(true);
    expect(buttonRequiresDestination('appointment', 'whatsapp')).toBe(true);
  });

  it('botão de booking online valida sem target_url', () => {
    const check = validateButtonInput({
      title: 'Agendar consulta',
      type: 'appointment',
      url: null,
      click_action: 'booking',
    });
    expect(check.valid).toBe(true);
    expect(check.error).toBeUndefined();
  });

  it('formulário valida sem target_url', () => {
    expect(
      validateButtonInput({
        title: 'Solicitar contato',
        type: 'form',
        url: null,
        click_action: 'form',
      }).valid
    ).toBe(true);
  });

  it('link externo sem URL falha com a mensagem esperada', () => {
    const check = validateButtonInput({
      title: 'Site',
      type: 'link',
      url: null,
      click_action: 'link',
    });
    expect(check.valid).toBe(false);
    expect(check.error).toBe('Informe o destino do botão.');
  });

  it('WhatsApp sem telefone falha', () => {
    const check = validateButtonInput({
      title: 'WhatsApp',
      type: 'whatsapp',
      url: '',
      click_action: 'whatsapp',
    });
    expect(check.valid).toBe(false);
    expect(check.error).toBe('Informe o destino do botão.');
  });

  it('appointment + whatsapp valida telefone sem exigir URL http', () => {
    const check = validateButtonInput({
      title: 'Agendar no WhatsApp',
      type: 'appointment',
      url: '5511999999999',
      click_action: 'whatsapp',
    });
    expect(check.valid).toBe(true);
  });

  it('rodapé de booking comunica abertura na própria página', () => {
    expect(buttonEditorShortSummary({ action: 'booking' })).toBe(
      'Este botão abrirá o agendamento online na própria página.'
    );
  });

  it('seletor de ícones não lista nomes técnicos como label', () => {
    for (const opt of BUTTON_ICON_OPTIONS) {
      expect(opt.label).not.toMatch(/message-circle|external-link|file-text|map-pin/i);
    }
    expect(isKnownButtonIcon('calendar')).toBe(true);
    expect(isKnownButtonIcon('sparkles')).toBe(false);
  });
});
