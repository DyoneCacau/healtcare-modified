/**
 * Modelos prontos de template de confirmação (Suri / WhatsApp).
 *
 * Sem dependências externas: usado pela Edge Function (criação automática na
 * Suri ao conectar) e pelo frontend (aba Modelos), via `src/lib/suriTemplateModels.ts`.
 */
import {
  SURI_VARIABLE_FIELDS,
  type SuriConfig,
  type SuriTemplateConfig,
  type SuriVariableField,
} from './suriReminder.ts'

export type SuriModelKind = 'consultation' | 'exam'

/**
 * O corpo usa `{{campo}}` com os campos da plataforma; para a Suri/Meta vira
 * `{{1}}`, `{{2}}`… na ordem em que aparecem.
 */
export interface SuriTemplateModel {
  id: string
  kind: SuriModelKind
  title: string
  description: string
  /** Título do template na Suri (único por conta, para sempre). */
  suggestedName: string
  body: string
  /** Botões de resposta rápida; precisam bater com as palavras de confirmação/cancelamento. */
  buttons: string[]
}

/** Consulta, exame ou procedimento: o nome vem do agendamento. */
const ATENDIMENTO_BODY =
  'Olá, {{patient_name}} 👋\n\nDaqui a pouco você tem um atendimento.\n\n📅 Data do agendamento: {{date}}\n⏰ Horário: {{time}}\nProcedimento: {{procedure}}\nProfissional: {{professional}}\n\n🚨 Lembre-se de chegar com 15 minutos de antecedência.\n\nVocê confirma sua presença?'

/** Títulos antigos da plataforma. Quando o modelo novo for aprovado, eles são trocados. */
const REPLACEABLE_TITLES = new Set([
  'confirmacao_consulta_agenda',
  'confirmacao_exame_agenda',
])

export const SURI_TEMPLATE_MODELS: SuriTemplateModel[] = [
  {
    id: 'consulta_unimed',
    kind: 'consultation',
    title: 'Atendimento — geral',
    description: 'Serve para consulta, exame e procedimento. Mostra paciente, data, horário, procedimento e profissional. Confirmar e Cancelar atualizam a agenda. Reagendar só aparece na mensagem.',
    suggestedName: 'confirmacao_atendimento',
    body: ATENDIMENTO_BODY,
    buttons: ['Confirmar', 'Cancelar', 'Reagendar'],
  },
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
  {
    id: 'exame_unimed',
    kind: 'exam',
    title: 'Atendimento — exame',
    description: 'O mesmo texto do atendimento geral, usado quando o procedimento é um exame.',
    suggestedName: 'confirmacao_atendimento_exame',
    body: ATENDIMENTO_BODY,
    buttons: ['Confirmar', 'Cancelar', 'Reagendar'],
  },
]

/** Ordem de preferência ao ligar automaticamente um template aprovado a cada tipo. */
const LINK_PREFERENCE: Record<SuriModelKind, string[]> = {
  consultation: ['consulta_unimed', 'consulta_padrao', 'consulta_completa'],
  exam: ['exame_unimed', 'exame_padrao'],
}

export type SuriModelValues = Record<SuriVariableField, string>

/** Exemplos genéricos enviados à Meta na aprovação. */
export function defaultModelExamples(kind: SuriModelKind): SuriModelValues {
  return {
    patient_first_name: 'Maria',
    patient_name: 'Maria Oliveira',
    date: '15/10/2026',
    time: '14:30',
    professional: 'Dra. Ana Souza',
    procedure: kind === 'exam' ? 'Exame' : 'Consulta',
    clinic_name: 'Clínica Sorriso',
    clinic_address: 'Rua das Flores, nº 100 - Centro',
    clinic_phone: '(11) 3333-4444',
  }
}

const FIELD_TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g

function isField(value: string): value is SuriVariableField {
  return (SURI_VARIABLE_FIELDS as readonly string[]).includes(value)
}

/** Campos na ordem do `{{1}}`, `{{2}}`… (repetidos reaproveitam o número). */
export function modelFields(model: SuriTemplateModel): SuriVariableField[] {
  const fields: SuriVariableField[] = []
  for (const match of model.body.matchAll(FIELD_TOKEN)) {
    const field = match[1]
    if (isField(field) && !fields.includes(field)) fields.push(field)
  }
  return fields
}

/** Texto para a Suri, com `{{1}}`, `{{2}}`… */
export function modelSuriBody(model: SuriTemplateModel): string {
  const fields = modelFields(model)
  return model.body.replace(FIELD_TOKEN, (token, field: string) => {
    const index = isField(field) ? fields.indexOf(field) : -1
    return index >= 0 ? `{{${index + 1}}}` : token
  })
}

/** Corpo com os valores no lugar dos campos (prévia). */
export function fillModelBody(model: SuriTemplateModel, values: SuriModelValues): string {
  return model.body.replace(FIELD_TOKEN, (token, field: string) =>
    isField(field) ? values[field] || '-' : token
  )
}

/** `templateExample` da API da Suri: cada variável vira `[exemplo]`. */
export function modelTemplateExample(model: SuriTemplateModel, values: SuriModelValues): string {
  return model.body.replace(FIELD_TOKEN, (token, field: string) =>
    isField(field) ? `[${values[field] || '-'}]` : token
  )
}

/** `bodyExamples` da API da Suri, na ordem das variáveis. */
export function modelBodyExamples(model: SuriTemplateModel, values: SuriModelValues): string[] {
  return modelFields(model).map((field) => values[field] || '-')
}

function normalizeBody(text: string): string {
  return text
    .replace(/\{\{\s*(\d+)\s*\}\}/g, '{{$1}}')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Título comparável: sem acento, minúsculo, espaços e hífens viram `_`. */
export function normalizeTemplateName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

interface TemplateLike {
  title: string
  body: string
  parameters: number
}

/**
 * Reconhece um template da Suri criado a partir de um modelo: mesmo texto
 * ou mesmo título sugerido, com a mesma quantidade de variáveis.
 */
export function findModelForTemplate(template: TemplateLike): SuriTemplateModel | null {
  const body = normalizeBody(template.body || '')
  const title = normalizeTemplateName(template.title || '')
  return SURI_TEMPLATE_MODELS.find((model) => {
    if (modelFields(model).length !== template.parameters) return false
    return normalizeBody(modelSuriBody(model)) === body || model.suggestedName === title
  }) ?? null
}

/** Templates da Suri que correspondem ao modelo (aprovados primeiro). */
export function findTemplatesForModel<T extends TemplateLike & { status: number | null }>(
  model: SuriTemplateModel,
  templates: T[],
): T[] {
  return templates
    .filter((template) => findModelForTemplate(template)?.id === model.id)
    .sort((a, b) => Number(a.status !== 0) - Number(b.status !== 0))
}

/** O título já existe na Suri? (títulos são únicos, mesmo após excluir o template) */
export function isTemplateTitleTaken(title: string, templates: { title: string }[]): boolean {
  const wanted = normalizeTemplateName(title)
  return templates.some((t) => normalizeTemplateName(t.title || '') === wanted)
}

interface LinkableTemplate extends TemplateLike {
  message_id: string
  status: number | null
  channel_id: string
}

function isReplaceableTemplate(template: SuriTemplateConfig | null): boolean {
  return Boolean(template && REPLACEABLE_TITLES.has(normalizeTemplateName(template.title)))
}

/**
 * Para cada tipo ainda sem template (e nunca ligado automaticamente), escolhe
 * o template aprovado que veio de um modelo. Não sobrescreve escolha da clínica.
 * Troca os modelos antigos de agenda quando o atendimento geral já foi aprovado.
 */
export function linkApprovedModelTemplates(
  config: Pick<SuriConfig, 'consultation_template' | 'exam_template'>,
  templates: LinkableTemplate[],
  alreadyLinked: Partial<Record<SuriModelKind, boolean>> = {},
): Partial<Record<SuriModelKind, SuriTemplateConfig>> {
  const current: Record<SuriModelKind, SuriTemplateConfig | null> = {
    consultation: config.consultation_template,
    exam: config.exam_template,
  }
  const result: Partial<Record<SuriModelKind, SuriTemplateConfig>> = {}

  for (const kind of ['consultation', 'exam'] as SuriModelKind[]) {
    const replaceable = isReplaceableTemplate(current[kind])
    if (current[kind] && !replaceable) continue
    if (!current[kind] && alreadyLinked[kind]) continue
    for (const modelId of LINK_PREFERENCE[kind]) {
      const model = SURI_TEMPLATE_MODELS.find((m) => m.id === modelId)
      if (!model) continue
      const approved = findTemplatesForModel(model, templates)
        .find((t) => t.status === 0 && t.channel_id)
      if (!approved) continue
      result[kind] = {
        template_id: approved.message_id,
        title: approved.title.slice(0, 200),
        body: approved.body.slice(0, 2000),
        channel_id: approved.channel_id,
        parameters: modelFields(model),
      }
      break
    }
  }
  return result
}
