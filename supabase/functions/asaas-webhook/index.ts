import {
  errorResponse,
  handleOptions,
  HttpError,
  json,
  notifyClinicOwnerOfPaymentEvent,
  serviceClient,
  verifyWebhookToken,
} from '../_shared/asaas.ts'

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    verifyWebhookToken(req)
    const payload = await req.json().catch(() => {
      throw new HttpError(400, 'JSON inválido')
    }) as { id?: string; event?: string }
    if (!payload.id || typeof payload.id !== 'string') {
      throw new HttpError(400, 'Evento sem id')
    }
    if (!payload.event || typeof payload.event !== 'string') {
      throw new HttpError(400, 'Evento sem tipo')
    }

    const supabase = serviceClient()
    const { data: inserted, error: persistError } = await supabase
      .rpc('asaas_persist_webhook_event', {
        p_event_id: payload.id,
        p_event_type: payload.event,
        p_payload: payload,
      })
    if (persistError) {
      console.error('Webhook persistence failed', persistError.code)
      throw new HttpError(503, 'Não foi possível persistir o evento')
    }

    const { data: result, error: processError } = await supabase
      .rpc('asaas_apply_payment_event', { p_event_id: payload.id }) as {
        data: {
          processed?: boolean
          duplicate?: boolean
          ignored?: boolean
          subscription_id?: string
          payment_id?: string
        } | null
        error: { code?: string; message: string } | null
      }

    if (processError) {
      console.error('Webhook processing deferred', {
        eventId: payload.id,
        code: processError.code,
      })
      await supabase.rpc('asaas_mark_event_error', {
        p_event_id: payload.id,
        p_error: processError.message,
      })
      // O evento já está persistido; 200 evita retentativas desnecessárias do Asaas.
      return json(req, { received: true, persisted: true, processed: false })
    }

    if (result?.processed && !result.duplicate && !result.ignored && result.subscription_id && result.payment_id) {
      await notifyClinicOwnerOfPaymentEvent(supabase, result.subscription_id, result.payment_id)
    }

    return json(req, {
      received: true,
      persisted: true,
      duplicate: inserted === false,
      processed: true,
      result,
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
