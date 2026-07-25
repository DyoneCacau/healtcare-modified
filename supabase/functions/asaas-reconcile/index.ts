import {
  asaasRequest,
  errorResponse,
  handleOptions,
  json,
  notifyClinicOwnerOfPaymentEvent,
  requireCron,
  serviceClient,
} from '../_shared/asaas.ts'

interface Payment {
  id: string
  status: string
  subscription?: string
  externalReference?: string
  [key: string]: unknown
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    requireCron(req)
    const body = await req.json().catch(() => ({})) as { limit?: number }
    const requestedLimit = Number(body.limit ?? 50)
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50
    const supabase = serviceClient()
    const result = {
      pending_events_processed: 0,
      subscriptions_checked: 0,
      payments_applied: 0,
      errors: 0,
      error_updates_failed: 0,
    }

    const { data: pendingEvents, error: pendingEventsError } = await supabase
      .from('billing_webhook_events')
      .select('event_id')
      .is('processed_at', null)
      .order('received_at', { ascending: true })
      .limit(limit)
    if (pendingEventsError) throw pendingEventsError

    for (const event of pendingEvents || []) {
      const { data, error } = await supabase.rpc('asaas_apply_payment_event', {
        p_event_id: event.event_id,
      }) as {
        data: { subscription_id?: string; payment_id?: string } | null
        error: { code?: string; message: string } | null
      }
      if (error) {
        result.errors++
        const { error: markError } = await supabase.rpc('asaas_mark_event_error', {
          p_event_id: event.event_id,
          p_error: error.message,
        })
        if (markError) {
          result.error_updates_failed++
          console.error('Failed to persist reconciliation error', {
            eventId: event.event_id,
            code: markError.code,
          })
        }
      } else {
        result.pending_events_processed++
        if (data?.subscription_id && data?.payment_id) {
          await notifyClinicOwnerOfPaymentEvent(supabase, data.subscription_id, data.payment_id)
        }
      }
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('id,asaas_subscription_id')
      .eq('billing_mode', 'asaas')
      .not('asaas_subscription_id', 'is', null)
      .neq('status', 'cancelled')
      .order('asaas_last_synced_at', { ascending: true, nullsFirst: true })
      .limit(limit)
    if (subscriptionsError) throw subscriptionsError

    for (const subscription of subscriptions || []) {
      try {
        const response = await asaasRequest<{ data: Payment[] }>(
          `/v3/payments?subscription=${encodeURIComponent(subscription.asaas_subscription_id)}`
            + '&limit=100&offset=0',
        )
        result.subscriptions_checked++

        for (const payment of response.data || []) {
          const eventId = `reconcile:${payment.id}:${payment.status}`
          const payload = {
            id: eventId,
            event: `PAYMENT_${payment.status}`,
            payment: {
              ...payment,
              subscription: payment.subscription || subscription.asaas_subscription_id,
              externalReference: payment.externalReference || subscription.id,
            },
          }
          const { error: persistError } = await supabase.rpc('asaas_persist_webhook_event', {
            p_event_id: eventId,
            p_event_type: payload.event,
            p_payload: payload,
          })
          if (persistError) throw persistError

          const { error } = await supabase.rpc('asaas_apply_payment_event', {
            p_event_id: eventId,
          })
          if (error) {
            result.errors++
            const { error: markError } = await supabase.rpc('asaas_mark_event_error', {
              p_event_id: eventId,
              p_error: error.message,
            })
            if (markError) {
              result.error_updates_failed++
              console.error('Failed to persist reconciliation error', {
                eventId,
                code: markError.code,
              })
            }
          } else {
            result.payments_applied++
            await notifyClinicOwnerOfPaymentEvent(supabase, subscription.id, payment.id)
          }
        }
      } catch (error) {
        result.errors++
        console.error('Reconciliation item failed', {
          subscriptionId: subscription.id,
          reason: error instanceof Error ? error.message : 'unknown',
        })
      }
    }

    return json(req, result)
  } catch (error) {
    return errorResponse(req, error)
  }
})
