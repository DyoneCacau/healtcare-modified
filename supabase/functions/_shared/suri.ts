/**
 * Cliente da API Suri (chatbot por clínica).
 *
 * Docs: https://documenter.getpostman.com/view/17684221/UUxz9mt5
 * Base: endpoint do chatbot (Portal > Configurações) + `/api`.
 * Auth: `Authorization: Bearer <token>` — o token vive só em
 * `integration_credentials` e nunca volta para o navegador.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './httpError.ts'
import { SURI_PROVIDER } from './suriReminder.ts'

const REQUEST_TIMEOUT_MS = 15_000

interface SuriEnvelope<T> {
  success?: boolean
  data?: T
  error?: string | null
}

export interface SuriTemplateSummary {
  message_id: string
  title: string
  body: string
  parameters: number
  status: number | null
  channel_id: string
  channel_name: string
  quick_replies: string[]
}

async function suriRequest<T>(
  baseUrl: string,
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      method: init.method || 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError'
    throw new HttpError(502, timedOut ? 'Suri não respondeu a tempo' : 'Não foi possível acessar a Suri')
  } finally {
    clearTimeout(timer)
  }

  const payload = await response.json().catch(() => null) as SuriEnvelope<T> | null
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(502, 'Token da Suri inválido ou sem permissão')
  }
  if (!response.ok || !payload || payload.success === false) {
    const reason = typeof payload?.error === 'string' && payload.error
      ? payload.error.slice(0, 300)
      : `HTTP ${response.status}`
    const channelGone = /channel not found/i.test(reason)
    throw new HttpError(
      502,
      channelGone
        ? 'O canal de WhatsApp desse modelo não existe mais na Suri. Desconecte, conecte de novo e salve: o modelo antigo é deixado de lado.'
        : `Suri recusou a requisição: ${reason}`,
    )
  }
  return payload.data as T
}

export async function listSuriTemplates(
  baseUrl: string,
  token: string,
): Promise<SuriTemplateSummary[]> {
  const data = await suriRequest<unknown[]>(baseUrl, token, '/templates')
  if (!Array.isArray(data)) return []

  return data
    .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : {}))
    .filter((item) => item.isWhatsappTemplate === true && typeof item.messageId === 'string')
    .map((item) => {
      const buttons = Array.isArray(item.buttons) ? item.buttons : []
      return {
        message_id: String(item.messageId),
        title: String(item.title || ''),
        body: String(item.body || ''),
        parameters: Number(item.parameters) || 0,
        status: typeof item.status === 'number' ? item.status : null,
        channel_id: String(item.channelId || ''),
        channel_name: String(item.channelName || ''),
        quick_replies: buttons
          .map((b) => (b && typeof b === 'object' ? b as Record<string, unknown> : {}))
          .filter((b) => b.type === 2 && typeof b.text === 'string')
          .map((b) => String(b.text)),
      }
    })
}

export interface SuriChannel {
  id: string
  name: string
  /** Só dígitos, quando a Suri informa o telefone do canal. */
  phone: string
}

function channelPhone(item: Record<string, unknown>): string {
  const candidates = [item.phone, item.Phone, item.phoneNumber, item.number]
  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const digits = value.replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 15) return digits
  }
  return ''
}

/** Nome e telefone para a clínica reconhecer o canal, sem o id interno. */
export function formatSuriChannelLabel(channel: { name: string; phone: string }): string {
  const name = channel.name.trim()
  const phone = channel.phone ? `+${channel.phone}` : ''
  if (name && phone) return `${name} — ${phone}`
  return name || phone || 'WhatsApp'
}

/** Canais WhatsApp do chatbot (`ChannelType` 1 = WhatsApp). */
export async function listSuriWhatsAppChannels(
  baseUrl: string,
  token: string,
): Promise<SuriChannel[]> {
  const data = await suriRequest<unknown[]>(baseUrl, token, '/channels')
  if (!Array.isArray(data)) return []
  return data
    .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : {}))
    .filter((item) => typeof item.id === 'string' && item.id && item.type === 1)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || item.Name || 'WhatsApp'),
      phone: channelPhone(item),
    }))
}

export interface CreateSuriTemplateInput {
  title: string
  body: string
  channelId: string
  category: 'UTILITY' | 'MARKETING'
  quickReplies: string[]
  templateExample: string
  bodyExamples: string[]
}

/** Cria template de WhatsApp na Suri (vai para análise da Meta). Devolve o `messageId`. */
export async function createSuriTemplate(
  baseUrl: string,
  token: string,
  input: CreateSuriTemplateInput,
): Promise<string> {
  const data = await suriRequest<Record<string, unknown> | null>(baseUrl, token, '/templates', {
    method: 'POST',
    body: {
      template: {
        title: input.title,
        body: input.body,
        channelId: input.channelId,
        category: input.category,
        buttons: input.quickReplies.map((text) => ({ text, type: 2 })),
      },
      templateExample: input.templateExample,
      bodyExamples: input.bodyExamples,
    },
  })
  return data && typeof data.messageId === 'string' ? data.messageId : ''
}

export interface SendSuriTemplateInput {
  name: string
  phone: string
  channelId: string
  templateId: string
  bodyParameters: string[]
  responseFlowId?: string | null
}

/**
 * Envia template importando o contato pelo telefone (a Suri não sobrescreve
 * contato existente). Devolve o id da mensagem no WhatsApp (`wamid...`).
 */
export async function sendSuriTemplate(
  baseUrl: string,
  token: string,
  input: SendSuriTemplateInput,
): Promise<string> {
  const message: Record<string, unknown> = { templateId: input.templateId }
  if (input.bodyParameters.length > 0) message.bodyParameters = input.bodyParameters

  const body: Record<string, unknown> = {
    user: {
      name: input.name,
      phone: input.phone,
      email: null,
      gender: 2,
      channelId: input.channelId,
      channelType: 1,
      defaultDepartmentId: null,
    },
    message,
  }
  if (input.responseFlowId) {
    body.responseAction = { type: 1, sendTo: input.responseFlowId, ignorePortfolio: false }
  }

  const data = await suriRequest<unknown>(baseUrl, token, '/messages/send', {
    method: 'POST',
    body,
  })
  return typeof data === 'string' ? data : ''
}

export async function readSuriToken(
  supabase: SupabaseClient,
  clinicId: string,
  integrationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('access_token')
    .eq('clinic_id', clinicId)
    .eq('integration_id', integrationId)
    .eq('provider', SURI_PROVIDER)
    .maybeSingle()
  if (error) throw new HttpError(500, 'Falha ao ler credencial da Suri')
  return data?.access_token ?? null
}
