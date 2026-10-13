/**
 * Regras puras da confirmação de agendamentos via Suri.
 *
 * Sem dependências de propósito: roda no Deno (Edge Functions) e no Vitest.
 * Nada aqui lê banco, rede ou variáveis de ambiente.
 */

export const SURI_PROVIDER = 'suri'

export const SURI_DEFAULT_TIMEZONE = 'America/Sao_Paulo'
export const SURI_DEFAULT_SEND_HOUR = 7

/** Campos do agendamento que podem preencher as variáveis {{n}} do template. */
export const SURI_VARIABLE_FIELDS = [
  'patient_first_name',
  'patient_name',
  'date',
  'time',
  'professional',
  'procedure',
  'clinic_name',
  'clinic_address',
  'clinic_phone',
] as const

export type SuriVariableField = (typeof SURI_VARIABLE_FIELDS)[number]

export type ReminderKind = 'consultation' | 'exam'

export type ReplyAction = 'confirm' | 'cancel'

/** Status de agendamento que recebem confirmação no dia. */
export const REMINDER_ELIGIBLE_STATUSES = ['pending', 'confirmed', 'return'] as const

export const SURI_DEFAULT_CONFIRM_KEYWORDS = ['confirmar', 'confirmo', 'confirmado', 'sim', '1']
export const SURI_DEFAULT_CANCEL_KEYWORDS = ['cancelar', 'cancelo', 'nao', 'nao vou', '2']

export interface SuriTemplateConfig {
  /** `messageId` da Suri: é o id aceito no envio (o `id` interno não serve). */
  template_id: string
  title: string
  body: string
  channel_id: string
  parameters: SuriVariableField[]
}

export interface SuriConfig {
  endpoint_url: string | null
  reminders_enabled: boolean
  send_hour: number
  timezone: string
  consultation_template: SuriTemplateConfig | null
  exam_template: SuriTemplateConfig | null
  exam_categories: string[]
  confirm_keywords: string[]
  cancel_keywords: string[]
  /** Fluxo da Suri que assume a conversa quando o paciente responde (opcional). */
  response_flow_id: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const text = cleanString(item, maxLength)
    if (text && !out.includes(text)) out.push(text)
    if (out.length >= maxItems) break
  }
  return out
}

function isVariableField(value: unknown): value is SuriVariableField {
  return typeof value === 'string' && (SURI_VARIABLE_FIELDS as readonly string[]).includes(value)
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function readTemplate(value: unknown): SuriTemplateConfig | null {
  const raw = asRecord(value)
  const templateId = cleanString(raw.template_id, 120)
  if (!templateId) return null
  const parameters = Array.isArray(raw.parameters)
    ? raw.parameters.slice(0, 20).map((p) => (isVariableField(p) ? p : 'patient_first_name'))
    : []
  return {
    template_id: templateId,
    title: cleanString(raw.title, 200),
    body: cleanString(raw.body, 2000),
    channel_id: cleanString(raw.channel_id, 120),
    parameters,
  }
}

function readKeywords(value: unknown, fallback: string[]): string[] {
  const list = cleanStringList(value, 20, 60).map(normalizeReplyText).filter(Boolean)
  return list.length > 0 ? Array.from(new Set(list)) : [...fallback]
}

/** Lê `integrations.config.suri` aplicando padrões; nunca lança. */
export function readSuriConfig(config: unknown): SuriConfig {
  const raw = asRecord(asRecord(config).suri)
  const hour = Number(raw.send_hour)
  const timezone = cleanString(raw.timezone, 60)
  return {
    endpoint_url: cleanString(raw.endpoint_url, 300) || null,
    reminders_enabled: raw.reminders_enabled === true,
    send_hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : SURI_DEFAULT_SEND_HOUR,
    timezone: timezone && isValidTimezone(timezone) ? timezone : SURI_DEFAULT_TIMEZONE,
    consultation_template: readTemplate(raw.consultation_template),
    exam_template: readTemplate(raw.exam_template),
    exam_categories: cleanStringList(raw.exam_categories, 50, 80),
    confirm_keywords: readKeywords(raw.confirm_keywords, SURI_DEFAULT_CONFIRM_KEYWORDS),
    cancel_keywords: readKeywords(raw.cancel_keywords, SURI_DEFAULT_CANCEL_KEYWORDS),
    response_flow_id: cleanString(raw.response_flow_id, 120) || null,
  }
}

/**
 * Valida a URL do chatbot (Configurações do Portal Suri) e devolve a base sem
 * `/api` e sem barra final. Só https e host nomeado: a function faz fetch
 * nessa URL, então IP literal e localhost são recusados.
 */
export function normalizeSuriEndpoint(value: string): string | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.localhost')) return null
  if (/^[0-9.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return null

  const path = url.pathname.replace(/\/+$/, '').replace(/\/api$/i, '')
  return `${url.origin}${path}`
}

/** Telefone no formato da Suri: 55 + DDD + número (com o 9). */
export function toSuriPhone(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits
  return null
}

/**
 * Chave para comparar telefones vindos da Suri com o do paciente.
 * O WhatsApp às vezes devolve celulares sem o nono dígito.
 */
export function phoneMatchKey(phone: string | null | undefined): string | null {
  let digits = (phone || '').replace(/\D/g, '')
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  if (digits.length === 11 && digits[2] === '9') digits = digits.slice(0, 2) + digits.slice(3)
  return digits.length === 10 ? digits : null
}

export function normalizeReplyText(text: string | null | undefined): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Só a resposta inteira conta: "não sei" não pode cancelar a consulta. */
export function classifyReply(
  text: string | null | undefined,
  confirmKeywords: string[],
  cancelKeywords: string[],
): ReplyAction | null {
  const normalized = normalizeReplyText(text)
  if (!normalized) return null
  if (cancelKeywords.map(normalizeReplyText).includes(normalized)) return 'cancel'
  if (confirmKeywords.map(normalizeReplyText).includes(normalized)) return 'confirm'
  return null
}

/** Novo status do agendamento para a resposta, ou null quando não muda. */
export function nextAppointmentStatus(current: string, action: ReplyAction): string | null {
  if (action === 'confirm') return current === 'pending' ? 'confirmed' : null
  return ['pending', 'confirmed', 'return'].includes(current) ? 'cancelled' : null
}

export function reminderKind(
  procedureCategory: string | null | undefined,
  examCategories: string[],
): ReminderKind {
  const category = normalizeReplyText(procedureCategory)
  if (!category) return 'consultation'
  return examCategories.some((c) => normalizeReplyText(c) === category) ? 'exam' : 'consultation'
}

export function pickTemplate(config: SuriConfig, kind: ReminderKind): SuriTemplateConfig | null {
  if (kind === 'exam' && config.exam_template) return config.exam_template
  return config.consultation_template
}

export interface ReminderContext {
  patientName: string
  date: string
  time: string
  professional: string
  procedure: string
  clinicName: string
  clinicAddress: string
  clinicPhone: string
}

/** A Meta rejeita variável com quebra de linha, TAB ou mais de 4 espaços seguidos. */
export function sanitizeTemplateVariable(value: string): string {
  const text = value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  return text || '-'
}

export function formatDateBr(dateYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateYmd)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateYmd
}

export function buildBodyParameters(
  fields: SuriVariableField[],
  ctx: ReminderContext,
): string[] {
  const firstName = ctx.patientName.trim().split(/\s+/)[0] || ctx.patientName
  const values: Record<SuriVariableField, string> = {
    patient_first_name: firstName,
    patient_name: ctx.patientName,
    date: formatDateBr(ctx.date),
    time: ctx.time.slice(0, 5),
    professional: ctx.professional,
    procedure: ctx.procedure,
    clinic_name: ctx.clinicName,
    clinic_address: ctx.clinicAddress,
    clinic_phone: ctx.clinicPhone,
  }
  return fields.map((field) => sanitizeTemplateVariable(values[field] ?? ''))
}

export interface SuriReplyEvent {
  eventId: string | null
  /** Textos candidatos: texto digitado/do botão e o postback de resposta rápida. */
  texts: string[]
  /** `mid` da mensagem respondida — o template, quando o paciente usa o botão. */
  replyToMessageId: string | null
  phone: string | null
}

/**
 * Extrai a resposta do paciente do evento `message-received` da Suri.
 * Neste evento a mensagem vem em `payload.Message` (M maiúsculo) e o contato
 * em PascalCase. Outros eventos devolvem null.
 */
export function parseSuriReplyEvent(body: unknown): SuriReplyEvent | null {
  const envelope = asRecord(body)
  if (envelope.type !== 'message-received') return null
  const payload = asRecord(envelope.payload)
  const message = asRecord(payload.Message ?? payload.message)
  if (message.is_echo === true || message.is_deleted === true) return null

  const texts = [message.text, asRecord(message.quick_reply).payload]
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
  if (texts.length === 0) return null

  const user = asRecord(payload.user)
  const author = asRecord(message.Author)
  const phone = [user.Phone, author.Phone, author.id]
    .find((p): p is string => typeof p === 'string' && p.replace(/\D/g, '').length >= 10) ?? null
  const replyTo = asRecord(message.reply_to).mid

  return {
    eventId: typeof envelope.id === 'string' ? envelope.id : null,
    texts,
    replyToMessageId: typeof replyTo === 'string' && replyTo ? replyTo : null,
    phone,
  }
}

/** Data (YYYY-MM-DD), hora e minutos do dia no fuso da clínica. */
export function localNow(
  now: Date,
  timezone: string,
): { date: string; hour: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  const hour = Number(get('hour'))
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minutes: hour * 60 + Number(get('minute')),
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}
