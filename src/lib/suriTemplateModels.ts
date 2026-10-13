import type { SuriTemplateOption, SuriVariableField } from '@/lib/suriConfig';
import { SURI_VARIABLE_FIELDS } from '@/lib/suriConfig';

export type SuriModelKind = 'consultation' | 'exam';

/**
 * Modelo pronto de template de confirmação. O corpo usa `{{campo}}` com os
 * campos da plataforma; para a Suri/Meta vira `{{1}}`, `{{2}}`… na ordem em
 * que aparecem.
 */
export interface SuriTemplateModel {
  id: string;
  kind: SuriModelKind;
  title: string;
  description: string;
  /** Nome do template na Suri/Meta: minúsculas, números e `_`. */
  suggestedName: string;
  body: string;
  buttons: string[];
}

export const SURI_TEMPLATE_MODELS: SuriTemplateModel[] = [
  {
    id: 'consulta_padrao',
    kind: 'consultation',
    title: 'Consulta — padrão',
    description: 'Curto e direto: data, horário, profissional e clínica.',
    suggestedName: 'confirmacao_consulta',
    body:
      'Olá, {{patient_first_name}}! Passando para lembrar da sua consulta hoje, {{date}}, às {{time}}, com {{professional}} na {{clinic_name}}.\n\nVocê confirma sua presença?',
    buttons: ['Confirmar', 'Cancelar'],
  },
  {
    id: 'consulta_completa',
    kind: 'consultation',
    title: 'Consulta — com procedimento e endereço',
    description: 'Inclui o procedimento, o endereço e o telefone da clínica.',
    suggestedName: 'confirmacao_consulta_completa',
    body:
      'Olá, {{patient_first_name}}! Sua consulta de {{procedure}} está marcada para hoje, {{date}}, às {{time}}, com {{professional}}.\n\nLocal: {{clinic_name}} - {{clinic_address}}\n\nPrecisa falar com a gente? Ligue {{clinic_phone}}.\n\nVocê confirma sua presença?',
    buttons: ['Confirmar', 'Cancelar'],
  },
  {
    id: 'exame_padrao',
    kind: 'exam',
    title: 'Exame — padrão',
    description: 'Lembra o exame do dia e pede para chegar com antecedência.',
    suggestedName: 'confirmacao_exame',
    body:
      'Olá, {{patient_first_name}}! Lembramos que seu exame de {{procedure}} está agendado para hoje, {{date}}, às {{time}}, na {{clinic_name}}.\n\nEndereço: {{clinic_address}}\n\nPor favor, chegue com 15 minutos de antecedência. Você confirma sua presença?',
    buttons: ['Confirmar', 'Cancelar'],
  },
];

const FIELD_TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g;

function isField(value: string): value is SuriVariableField {
  return (SURI_VARIABLE_FIELDS as readonly string[]).includes(value);
}

/** Campos na ordem do `{{1}}`, `{{2}}`… (repetidos reaproveitam o número). */
export function modelFields(model: SuriTemplateModel): SuriVariableField[] {
  const fields: SuriVariableField[] = [];
  for (const match of model.body.matchAll(FIELD_TOKEN)) {
    const field = match[1];
    if (isField(field) && !fields.includes(field)) fields.push(field);
  }
  return fields;
}

/** Texto para colar na Suri, com `{{1}}`, `{{2}}`… */
export function modelSuriBody(model: SuriTemplateModel): string {
  const fields = modelFields(model);
  return model.body.replace(FIELD_TOKEN, (token, field: string) => {
    const index = isField(field) ? fields.indexOf(field) : -1;
    return index >= 0 ? `{{${index + 1}}}` : token;
  });
}

/** Corpo com os valores no lugar dos campos (prévia). */
export function fillModelBody(
  model: SuriTemplateModel,
  values: Record<SuriVariableField, string>,
): string {
  return model.body.replace(FIELD_TOKEN, (token, field: string) =>
    isField(field) ? values[field] || '-' : token,
  );
}

function normalizeBody(text: string): string {
  return text
    .replace(/\{\{\s*(\d+)\s*\}\}/g, '{{$1}}')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Reconhece um template da Suri criado a partir de um modelo: mesmo texto
 * ou mesmo nome sugerido, com a mesma quantidade de variáveis.
 */
export function findModelForTemplate(
  template: Pick<SuriTemplateOption, 'title' | 'body' | 'parameters'>,
): SuriTemplateModel | null {
  const body = normalizeBody(template.body || '');
  const title = normalizeName(template.title || '');
  return (
    SURI_TEMPLATE_MODELS.find((model) => {
      if (modelFields(model).length !== template.parameters) return false;
      return normalizeBody(modelSuriBody(model)) === body || model.suggestedName === title;
    }) ?? null
  );
}

/** Templates da Suri que correspondem ao modelo (aprovados primeiro). */
export function findTemplatesForModel(
  model: SuriTemplateModel,
  templates: SuriTemplateOption[],
): SuriTemplateOption[] {
  return templates
    .filter((template) => findModelForTemplate(template)?.id === model.id)
    .sort((a, b) => Number(a.status !== 0) - Number(b.status !== 0));
}
