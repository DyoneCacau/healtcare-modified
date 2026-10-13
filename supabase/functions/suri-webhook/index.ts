/**
 * Webhook da Suri: resposta do paciente à confirmação do dia.
 *
 * URL (configurada no Portal Suri > Configurações > Webhook):
 *   /functions/v1/suri-webhook/<webhook_slug>?token=<segredo>
 * Deploy: supabase functions deploy suri-webhook --no-verify-jwt
 *
 * A Suri não envia header de autenticação nem faz retry, e manda todos os
 * eventos do chatbot para a mesma URL. Por isso:
 * - o segredo vai na query string e é comparado com o hash da integração;
 * - só `message-received` que bate com uma confirmação enviada é processado;
 * - o resto responde 200 sem gravar nada (nenhuma conversa é armazenada).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from '../_shared/httpError.ts'
import { logWebhook } from '../_shared/integrations.ts'
import { assertRateLimit } from '../_shared/rateLimit.ts'
import { sha256Hex, timingSafeEqualHex } from '../_shared/webhookSignature.ts'
import {
  classifyReply,
  nextAppointmentStatus,
  normalizeReplyText,
  parseSuriReplyEvent,
  phoneMatchKey,
  readSuriConfig,
  SURI_PROVIDER,
  type ReplyAction,
} from '../_shared/suriReminder.ts'

const MAX_BODY_BYTES = 256_000
const RATE_LIMIT = 300
const RATE_WINDOW_MS = 60_000
const AUTH_FAIL_LIMIT = 30
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

interface ReminderRow {
  id: string
  clinic_id: string
  appointment_id: string
  status: string
  patient_phone: string | null
}

function slugFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  const index = segments.indexOf('suri-webhook')
  return index >= 0 ? (segments[index + 1] || '') : ''
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const url = new URL(req.url)
    const slug = slugFromUrl(url)
    if (slug.length < 8) return json({ error: 'Endpoint não encontrado' }, 404)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json({ error: 'Serviço não configurado' }, 503)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, clinic_id, provider, config, webhook_secret_hash, is_active')
      .eq('webhook_slug', slug)
      .eq('provider', SURI_PROVIDER)
      .maybeSingle()
    if (integrationError) throw new HttpError(500, 'Falha ao resolver integração')
    if (!integration || !integration.is_active) return json({ error: 'Endpoint não encontrado' }, 404)

    assertRateLimit(`suri-wh:${integration.id}`, RATE_LIMIT, RATE_WINDOW_MS)

    const token = url.searchParams.get('token') || ''
    const valid = Boolean(token && integration.webhook_secret_hash)
      && timingSafeEqualHex(await sha256Hex(token), integration.webhook_secret_hash!)
    if (!valid) {
      assertRateLimit(`suri-wh-authfail:${integration.id}`, AUTH_FAIL_LIMIT, RATE_WINDOW_MS)
      return json({ error: 'Não autorizado' }, 401)
    }

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload muito grande' }, 413)
    }
    let body: unknown = null
    try {
      body = JSON.parse(rawBody)
    } catch {
      return json({ received: true, processed: false })
    }

    const event = parseSuriReplyEvent(body)
    if (!event) return json({ received: true, processed: false })

    const config = readSuriConfig(integration.config)
    let action: ReplyAction | null = null
    let replyText = ''
    for (const text of event.texts) {
      action = classifyReply(text, config.confirm_keywords, config.cancel_keywords)
      if (action) {
        replyText = normalizeReplyText(text).slice(0, 100)
        break
      }
    }
    if (!action) return json({ received: true, processed: false })

    // 1º: resposta ao próprio template (botão). 2º: único envio recente ao mesmo celular.
    let reminder: ReminderRow | null = null
    if (event.replyToMessageId) {
      const { data } = await supabase
        .from('appointment_reminders')
        .select('id, clinic_id, appointment_id, status, patient_phone')
        .eq('integration_id', integration.id)
        .eq('external_message_id', event.replyToMessageId)
        .in('status', ['sent', 'confirmed', 'cancelled'])
        .maybeSingle()
      reminder = data as ReminderRow | null
    }
    if (!reminder) {
      const phoneKey = phoneMatchKey(event.phone)
      if (phoneKey) {
        const { data } = await supabase
          .from('appointment_reminders')
          .select('id, clinic_id, appointment_id, status, patient_phone')
          .eq('integration_id', integration.id)
          .eq('status', 'sent')
          .gte('sent_at', new Date(Date.now() - REPLY_WINDOW_MS).toISOString())
          .order('sent_at', { ascending: false })
          .limit(100)
        const matches = ((data || []) as ReminderRow[])
          .filter((row) => phoneMatchKey(row.patient_phone) === phoneKey)
        // Dois agendamentos no dia sem resposta ao botão: ambíguo, não mexe.
        if (matches.length === 1) reminder = matches[0]
      }
    }
    if (!reminder || reminder.clinic_id !== integration.clinic_id) {
      return json({ received: true, processed: false })
    }

    const { duplicate } = await logWebhook(supabase, {
      clinicId: integration.clinic_id,
      integrationId: integration.id,
      provider: SURI_PROVIDER,
      eventType: `reminder.${action}`,
      httpMethod: 'POST',
      endpoint: slug,
      status: 'processed',
      statusCode: 200,
      signatureValid: true,
      payload: { reminder_id: reminder.id, appointment_id: reminder.appointment_id, action },
      externalEventId: event.eventId,
    })
    if (duplicate) return json({ received: true, duplicate: true, processed: false })

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', reminder.appointment_id)
      .eq('clinic_id', integration.clinic_id)
      .maybeSingle()

    let appointmentStatus: string | null = null
    if (appointment) {
      const next = nextAppointmentStatus(appointment.status, action)
      if (next) {
        const { data: updated } = await supabase
          .from('appointments')
          .update({ status: next, updated_at: new Date().toISOString() })
          .eq('id', appointment.id)
          .eq('clinic_id', integration.clinic_id)
          .eq('status', appointment.status)
          .select('status')
          .maybeSingle()
        appointmentStatus = updated?.status ?? null
      }
    }

    await supabase
      .from('appointment_reminders')
      .update({
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        responded_at: new Date().toISOString(),
        response_text: replyText,
      })
      .eq('id', reminder.id)

    await supabase
      .from('integrations')
      .update({ last_event_at: new Date().toISOString() })
      .eq('id', integration.id)

    return json({ received: true, processed: true, action, appointment_status: appointmentStatus })
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status)
    console.error('[suri-webhook] erro inesperado', error instanceof Error ? error.name : 'unknown')
    return json({ error: 'Erro interno' }, 500)
  }
})
