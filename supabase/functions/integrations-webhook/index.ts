/**
 * Webhook genérico de entrada do módulo de Integrações.
 *
 * URL: POST /functions/v1/integrations-webhook/<webhook_slug>
 * Deploy: `supabase functions deploy integrations-webhook --no-verify-jwt`
 * (o provedor externo não tem JWT do Supabase; a autenticação é o segredo
 * da integração no header `x-healthcare-signature`).
 *
 * O tenant NUNCA vem da requisição: o slug resolve a integração e o
 * clinic_id é lido do banco.
 *
 * Nenhum provedor está implementado. Sem handler registrado, o evento é
 * gravado em webhook_logs e a resposta é 202 — o payload fica auditável
 * para quando a integração for construída.
 */
import {
  errorResponse,
  extractExternalEventId,
  handleOptions,
  HttpError,
  json,
  logWebhook,
  resolveIntegrationBySlug,
  sanitizeHeaders,
  serviceClient,
  verifyIntegrationSignature,
} from '../_shared/integrations.ts'
import { resolveWebhookHandler } from '../_shared/providerRegistry.ts'

const MAX_BODY_BYTES = 1_000_000

function slugFromUrl(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean)
  // .../functions/v1/integrations-webhook/<slug>
  const index = segments.indexOf('integrations-webhook')
  return index >= 0 ? (segments[index + 1] || '') : (segments[segments.length - 1] || '')
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const slug = slugFromUrl(req.url)
    const supabase = serviceClient()
    const integration = await resolveIntegrationBySlug(supabase, slug)

    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Payload muito grande')
    }

    const signatureValid = await verifyIntegrationSignature(req, integration)
    const headers = sanitizeHeaders(req)

    if (!signatureValid) {
      await logWebhook(supabase, {
        clinicId: integration.clinic_id,
        integrationId: integration.id,
        provider: integration.provider,
        httpMethod: req.method,
        endpoint: slug,
        status: 'failed',
        statusCode: 401,
        signatureValid: false,
        headers,
        errorMessage: 'Assinatura inválida',
      })
      throw new HttpError(401, 'Assinatura inválida')
    }

    let payload: unknown = null
    try {
      payload = rawBody ? JSON.parse(rawBody) : null
    } catch {
      // Provedores de formulário podem enviar texto puro; guardamos como está
      payload = { raw: rawBody }
    }

    const externalEventId = extractExternalEventId(req, payload)
    const handler = resolveWebhookHandler(integration)

    // Sem handler: registra e devolve 202 (aceito, ainda não processado)
    if (!handler) {
      const { duplicate } = await logWebhook(supabase, {
        clinicId: integration.clinic_id,
        integrationId: integration.id,
        provider: integration.provider,
        httpMethod: req.method,
        endpoint: slug,
        status: 'received',
        statusCode: 202,
        signatureValid: true,
        headers,
        payload,
        externalEventId,
      })

      await supabase
        .from('integrations')
        .update({ last_event_at: new Date().toISOString(), last_error: null })
        .eq('id', integration.id)

      return json(
        req,
        {
          received: true,
          duplicate,
          processed: false,
          reason: 'provider_handler_not_implemented',
        },
        202,
      )
    }

    const result = await handler({ req, supabase, integration, payload, rawBody })
    const { duplicate } = await logWebhook(supabase, {
      clinicId: integration.clinic_id,
      integrationId: integration.id,
      provider: integration.provider,
      eventType: result.eventType,
      httpMethod: req.method,
      endpoint: slug,
      status: result.handled ? 'processed' : 'ignored',
      statusCode: 200,
      signatureValid: true,
      headers,
      payload,
      externalEventId: result.externalEventId ?? externalEventId,
    })

    await supabase
      .from('integrations')
      .update({ last_event_at: new Date().toISOString(), last_error: null })
      .eq('id', integration.id)

    return json(req, { received: true, duplicate, processed: result.handled })
  } catch (error) {
    return errorResponse(req, error)
  }
})
