import { describe, expect, it } from 'vitest';
import { SURI_DEFAULT_CANCEL_KEYWORDS, SURI_DEFAULT_CONFIRM_KEYWORDS } from '@/lib/suriConfig';
import {
  defaultModelExamples,
  fillModelBody,
  findModelForTemplate,
  findTemplatesForModel,
  isTemplateTitleTaken,
  linkApprovedModelTemplates,
  modelBodyExamples,
  modelFields,
  modelSuriBody,
  modelTemplateExample,
  SURI_TEMPLATE_MODELS,
} from '../../supabase/functions/_shared/suriTemplateModels.ts';

const consulta = SURI_TEMPLATE_MODELS.find((m) => m.id === 'consulta_padrao')!;

describe('suriTemplateModels', () => {
  it('numera as variáveis na ordem em que aparecem', () => {
    expect(modelFields(consulta)).toEqual([
      'patient_first_name',
      'date',
      'time',
      'professional',
      'clinic_name',
    ]);
    expect(modelSuriBody(consulta)).toBe(
      'Olá, {{1}}! Passando para lembrar da sua consulta hoje, {{2}}, às {{3}}, com {{4}} na {{5}}.\n\nVocê confirma sua presença?',
    );
  });

  it.each(SURI_TEMPLATE_MODELS.map((m) => [m.id, m] as const))(
    '%s respeita as regras da Meta e os botões padrão',
    (_id, model) => {
      const body = modelSuriBody(model);
      expect(body.trim().startsWith('{{')).toBe(false);
      expect(body.trim().endsWith('}}')).toBe(false);
      expect(body).not.toMatch(/\{\{[a-z_]+\}\}/);
      expect(model.suggestedName).toMatch(/^[a-z0-9_]+$/);
      const [confirm, cancel] = model.buttons.map((b) => b.toLowerCase());
      expect(SURI_DEFAULT_CONFIRM_KEYWORDS).toContain(confirm);
      expect(SURI_DEFAULT_CANCEL_KEYWORDS).toContain(cancel);
    },
  );

  it('o modelo estilo agenda leva nome, profissional, data, horário e emoji', () => {
    const agenda = SURI_TEMPLATE_MODELS.find((m) => m.id === 'consulta_unimed')!;
    expect(modelFields(agenda)).toEqual(['patient_name', 'professional', 'date', 'time']);
    expect(modelSuriBody(agenda)).toContain('📅 Data do agendamento: {{3}}');
    expect(modelSuriBody(agenda)).toContain('⏰ Horário: {{4}}');
    expect(agenda.buttons).toEqual(['Confirmar', 'Cancelar', 'Reagendar']);
  });

  it('preenche a prévia com os valores', () => {
    const text = fillModelBody(consulta, {
      patient_first_name: 'Maria',
      patient_name: 'Maria Oliveira',
      date: '13/10/2026',
      time: '14:30',
      professional: 'Dra. Ana',
      procedure: 'Limpeza',
      clinic_name: 'Clínica X',
      clinic_address: '',
      clinic_phone: '',
    });
    expect(text).toContain('Olá, Maria!');
    expect(text).toContain('com Dra. Ana na Clínica X.');
  });

  it('reconhece o template da Suri pelo texto (espaços ignorados) ou pelo nome', () => {
    const byBody = findModelForTemplate({
      title: 'meu_template',
      body: `  ${modelSuriBody(consulta).replace('\n\n', '\n')}  `,
      parameters: 5,
    });
    expect(byBody?.id).toBe('consulta_padrao');

    const byName = findModelForTemplate({
      title: 'Confirmacao Consulta',
      body: 'texto editado {{1}} {{2}} {{3}} {{4}} {{5}} fim',
      parameters: 5,
    });
    expect(byName?.id).toBe('consulta_padrao');

    expect(
      findModelForTemplate({ title: 'confirmacao_consulta', body: 'x {{1}} y', parameters: 1 }),
    ).toBeNull();
  });

  it('monta templateExample e bodyExamples no formato da API da Suri', () => {
    const values = defaultModelExamples('consultation');
    expect(modelTemplateExample(consulta, values)).toBe(
      'Olá, [Maria]! Passando para lembrar da sua consulta hoje, [15/10/2026], às [14:30], com [Dra. Ana Souza] na [Clínica Sorriso].\n\nVocê confirma sua presença?',
    );
    expect(modelBodyExamples(consulta, values)).toEqual([
      'Maria',
      '15/10/2026',
      '14:30',
      'Dra. Ana Souza',
      'Clínica Sorriso',
    ]);
  });

  it('reconhece título já usado na Suri (acentos e espaços ignorados)', () => {
    expect(isTemplateTitleTaken('confirmacao_consulta', [{ title: 'Confirmação Consulta' }])).toBe(true);
    expect(isTemplateTitleTaken('confirmacao_exame', [{ title: 'confirmacao_consulta' }])).toBe(false);
  });

  describe('linkApprovedModelTemplates', () => {
    const exame = SURI_TEMPLATE_MODELS.find((m) => m.id === 'exame_padrao')!;
    const tpl = (id: string, model: typeof consulta, status: number | null) => ({
      message_id: id,
      title: model.suggestedName,
      body: modelSuriBody(model),
      parameters: modelFields(model).length,
      status,
      channel_id: 'wp1',
    });
    const empty = { consultation_template: null, exam_template: null };

    it('liga só templates aprovados, com as variáveis do modelo', () => {
      const links = linkApprovedModelTemplates(empty, [tpl('c1', consulta, 0), tpl('e1', exame, 1)]);
      expect(links.consultation?.template_id).toBe('c1');
      expect(links.consultation?.parameters).toEqual(modelFields(consulta));
      expect(links.exam).toBeUndefined();
    });

    it('não sobrescreve escolha da clínica nem religa tipo já ligado antes', () => {
      const chosen = { template_id: 'x', title: 'x', body: 'x', channel_id: 'wp1', parameters: [] };
      const templates = [tpl('c1', consulta, 0), tpl('e1', exame, 0)];
      expect(linkApprovedModelTemplates({ ...empty, consultation_template: chosen }, templates)).toEqual({
        exam: expect.objectContaining({ template_id: 'e1' }),
      });
      expect(linkApprovedModelTemplates(empty, templates, { consultation: true, exam: true })).toEqual({});
    });
  });

  it('lista os templates do modelo com os aprovados primeiro', () => {
    const base = { body: modelSuriBody(consulta), parameters: 5, channel_id: 'c', channel_name: 'c', quick_replies: [] };
    const result = findTemplatesForModel(consulta, [
      { ...base, message_id: 'pendente', title: 'a', status: 1 },
      { ...base, message_id: 'aprovado', title: 'b', status: 0 },
      { ...base, message_id: 'outro', title: 'c', body: 'outro {{1}} texto', parameters: 1, status: 0 },
    ]);
    expect(result.map((t) => t.message_id)).toEqual(['aprovado', 'pendente']);
  });
});
