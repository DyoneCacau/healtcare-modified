import { describe, expect, it } from 'vitest';
import {
  buildBodyParameters,
  classifyReply,
  localNow,
  nextAppointmentStatus,
  normalizeSuriEndpoint,
  parseSuriReplyEvent,
  phoneMatchKey,
  pickTemplate,
  readSuriConfig,
  reminderKind,
  sanitizeTemplateVariable,
  SURI_DEFAULT_CANCEL_KEYWORDS,
  SURI_DEFAULT_CONFIRM_KEYWORDS,
  SURI_VARIABLE_FIELDS,
  toSuriPhone,
} from '../../supabase/functions/_shared/suriReminder.ts';
import {
  SURI_VARIABLE_FIELDS as APP_VARIABLE_FIELDS,
  SURI_VARIABLE_LABELS,
  readSuriConfig as readAppSuriConfig,
} from '@/lib/suriConfig';

describe('espelho frontend ↔ Edge Function', () => {
  it('mesmas variáveis de template', () => {
    expect([...APP_VARIABLE_FIELDS]).toEqual([...SURI_VARIABLE_FIELDS]);
    for (const field of SURI_VARIABLE_FIELDS) expect(SURI_VARIABLE_LABELS[field]).toBeTruthy();
  });

  it('lê a mesma configuração', () => {
    const config = {
      suri: {
        endpoint_url: 'https://bot.example.com',
        reminders_enabled: true,
        send_hour: 8,
        exam_categories: ['Exames'],
        consultation_template: {
          template_id: 'tpl-1',
          title: 'Confirmação',
          body: 'Olá {{1}}',
          channel_id: 'wp1',
          parameters: ['patient_first_name'],
        },
      },
    };
    const server = readSuriConfig(config);
    const app = readAppSuriConfig(config);
    expect(app.send_hour).toBe(server.send_hour);
    expect(app.reminders_enabled).toBe(server.reminders_enabled);
    expect(app.consultation_template?.template_id).toBe(server.consultation_template?.template_id);
  });
});

describe('readSuriConfig', () => {
  it('aplica padrões quando vazio', () => {
    const config = readSuriConfig({});
    expect(config.reminders_enabled).toBe(false);
    expect(config.send_hour).toBe(7);
    expect(config.timezone).toBe('America/Sao_Paulo');
    expect(config.confirm_keywords).toEqual(SURI_DEFAULT_CONFIRM_KEYWORDS);
    expect(config.cancel_keywords).toEqual(SURI_DEFAULT_CANCEL_KEYWORDS);
  });

  it('recusa hora e fuso inválidos', () => {
    const config = readSuriConfig({ suri: { send_hour: 30, timezone: 'Lua/Base' } });
    expect(config.send_hour).toBe(7);
    expect(config.timezone).toBe('America/Sao_Paulo');
  });
});

describe('normalizeSuriEndpoint', () => {
  it('remove /api e barra final', () => {
    expect(normalizeSuriEndpoint('https://cb123.azurewebsites.net/api/')).toBe(
      'https://cb123.azurewebsites.net',
    );
  });

  it('recusa http, IP e localhost', () => {
    expect(normalizeSuriEndpoint('http://cb123.azurewebsites.net')).toBeNull();
    expect(normalizeSuriEndpoint('https://10.0.0.1')).toBeNull();
    expect(normalizeSuriEndpoint('https://localhost')).toBeNull();
    expect(normalizeSuriEndpoint('nao é url')).toBeNull();
  });
});

describe('telefones', () => {
  it('formata para a Suri com 55', () => {
    expect(toSuriPhone('(85) 98775-5801')).toBe('5585987755801');
    expect(toSuriPhone('5585987755801')).toBe('5585987755801');
    expect(toSuriPhone('123')).toBeNull();
  });

  it('casa número com e sem o nono dígito', () => {
    expect(phoneMatchKey('5585987755801')).toBe(phoneMatchKey('558587755801'));
    expect(phoneMatchKey('5585987755801')).not.toBe(phoneMatchKey('5511987755801'));
  });
});

describe('classifyReply', () => {
  const confirm = ['Confirmar', 'sim'];
  const cancel = ['Cancelar', 'não'];

  it('reconhece botão e texto, ignorando acento e caixa', () => {
    expect(classifyReply('CONFIRMAR', confirm, cancel)).toBe('confirm');
    expect(classifyReply('Sim!', confirm, cancel)).toBe('confirm');
    expect(classifyReply('Não', confirm, cancel)).toBe('cancel');
  });

  it('não age em frases que só contêm a palavra', () => {
    expect(classifyReply('não sei ainda', confirm, cancel)).toBeNull();
    expect(classifyReply('sim, mas posso atrasar?', confirm, cancel)).toBeNull();
    expect(classifyReply('', confirm, cancel)).toBeNull();
  });
});

describe('nextAppointmentStatus', () => {
  it('confirma só pendente', () => {
    expect(nextAppointmentStatus('pending', 'confirm')).toBe('confirmed');
    expect(nextAppointmentStatus('confirmed', 'confirm')).toBeNull();
  });

  it('cancela ativos, nunca concluído', () => {
    expect(nextAppointmentStatus('confirmed', 'cancel')).toBe('cancelled');
    expect(nextAppointmentStatus('return', 'cancel')).toBe('cancelled');
    expect(nextAppointmentStatus('completed', 'cancel')).toBeNull();
  });
});

describe('template por tipo', () => {
  const base = readSuriConfig({
    suri: {
      exam_categories: ['Exames de imagem'],
      consultation_template: { template_id: 'c', parameters: [] },
      exam_template: { template_id: 'e', parameters: [] },
    },
  });

  it('categoria marcada usa template de exame', () => {
    expect(reminderKind('exames de IMAGEM', base.exam_categories)).toBe('exam');
    expect(reminderKind('Odontologia', base.exam_categories)).toBe('consultation');
    expect(reminderKind(null, base.exam_categories)).toBe('consultation');
    expect(pickTemplate(base, 'exam')?.template_id).toBe('e');
  });

  it('sem template de exame cai no de consulta', () => {
    const config = { ...base, exam_template: null };
    expect(pickTemplate(config, 'exam')?.template_id).toBe('c');
  });
});

describe('buildBodyParameters', () => {
  it('preenche na ordem do template', () => {
    const params = buildBodyParameters(['patient_first_name', 'date', 'time', 'clinic_name'], {
      patientName: 'Maria  Souza',
      date: '2026-10-13',
      time: '14:30:00',
      professional: 'Ana',
      procedure: 'Limpeza',
      clinicName: 'Clínica\nCentro',
      clinicAddress: '',
      clinicPhone: '',
    });
    expect(params).toEqual(['Maria', '13/10/2026', '14:30', 'Clínica Centro']);
  });

  it('nunca envia variável vazia', () => {
    expect(sanitizeTemplateVariable('   ')).toBe('-');
    expect(sanitizeTemplateVariable('a\t\tb     c')).toBe('a b c');
  });
});

describe('localNow', () => {
  it('converte para o fuso da clínica', () => {
    const now = new Date('2026-10-13T10:30:00Z');
    expect(localNow(now, 'America/Sao_Paulo')).toEqual({ date: '2026-10-13', hour: 7, minutes: 450 });
  });
});

describe('parseSuriReplyEvent', () => {
  it('lê resposta ao template no message-received', () => {
    const event = parseSuriReplyEvent({
      id: 'cb1:abc',
      type: 'message-received',
      payload: {
        user: { Id: 'u1', Phone: '5585987755801' },
        Message: { text: 'Confirmar', reply_to: { mid: 'wamid.123' }, is_echo: false },
      },
    });
    expect(event).toEqual({
      eventId: 'cb1:abc',
      texts: ['Confirmar'],
      replyToMessageId: 'wamid.123',
      phone: '5585987755801',
    });
  });

  it('ignora outros eventos e eco', () => {
    expect(parseSuriReplyEvent({ type: 'new-contact', payload: {} })).toBeNull();
    expect(
      parseSuriReplyEvent({
        type: 'message-received',
        payload: { Message: { text: 'oi', is_echo: true } },
      }),
    ).toBeNull();
  });
});
