import {
  asaasRequest,
  assertUuid,
  authorizeClinic,
  errorResponse,
  handleOptions,
  HttpError,
  json,
  serviceClient,
} from '../_shared/asaas.ts'

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const body = await req.json().catch(() => {
      throw new HttpError(400, 'JSON inválido')
    }) as { subscription_id?: string }
    assertUuid(body.subscription_id, 'subscription_id')

    const supabase = serviceClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id,clinic_id,status,asaas_subscription_id')
      .eq('id', body.subscription_id)
      .single()
    if (error || !subscription) throw new HttpError(404, 'Assinatura não encontrada')

    await authorizeClinic(req, supabase, subscription.clinic_id, true)
    if (subscription.status === 'cancelled') {
      return json(req, { cancelled: true, duplicate: true })
    }
    if (!subscription.asaas_subscription_id) {
      throw new HttpError(409, 'Assinatura não vinculada ao Asaas')
    }

    await asaasRequest(`/v3/subscriptions/${encodeURIComponent(subscription.asaas_subscription_id)}`, {
      method: 'DELETE',
    })

    const { error: updateError } = await supabase.rpc('asaas_mark_subscription_cancelled', {
      p_subscription_id: subscription.id,
    })
    if (updateError) {
      console.error('Failed to persist cancellation', updateError.code)
      throw new HttpError(500, 'Cancelamento realizado, mas a atualização local falhou')
    }

    return json(req, { cancelled: true })
  } catch (error) {
    return errorResponse(req, error)
  }
})
