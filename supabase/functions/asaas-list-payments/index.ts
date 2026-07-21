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

interface Payment {
  id: string
  status: string
  value: number
  netValue?: number
  billingType?: string
  dueDate?: string
  paymentDate?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  externalReference?: string
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (!['GET', 'POST'].includes(req.method)) {
    return json(req, { error: 'Método não permitido' }, 405)
  }

  try {
    const url = new URL(req.url)
    const body = req.method === 'POST'
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : {}
    const subscriptionId = body.subscription_id ?? url.searchParams.get('subscription_id')
    assertUuid(subscriptionId, 'subscription_id')

    const requestedLimit = Number(body.limit ?? url.searchParams.get('limit') ?? 20)
    const requestedOffset = Number(body.offset ?? url.searchParams.get('offset') ?? 0)
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20
    const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0
      ? requestedOffset
      : 0

    const supabase = serviceClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id,clinic_id,asaas_subscription_id')
      .eq('id', subscriptionId)
      .single()
    if (error || !subscription) throw new HttpError(404, 'Assinatura não encontrada')

    await authorizeClinic(req, supabase, subscription.clinic_id, false)

    const mapPayment = (payment: Payment) => ({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      net_value: payment.netValue,
      billing_type: payment.billingType,
      due_date: payment.dueDate,
      payment_date: payment.paymentDate,
      invoice_url: payment.invoiceUrl,
      bank_slip_url: payment.bankSlipUrl,
      external_reference: payment.externalReference,
      description: payment.externalReference?.includes(':proration')
        ? 'Período proporcional'
        : payment.externalReference?.includes(':setup_fee')
        ? 'Taxa de adesão'
        : null,
    })

    // Cobranças avulsas (pró-rata / adesão) não vêm no endpoint da assinatura.
    const [prorationList, setupList] = await Promise.all([
      asaasRequest<{ data: Payment[] }>(
        `/v3/payments?externalReference=${encodeURIComponent(`${subscriptionId}:proration`)}&limit=5`,
      ).catch(() => ({ data: [] as Payment[] })),
      asaasRequest<{ data: Payment[] }>(
        `/v3/payments?externalReference=${encodeURIComponent(`${subscriptionId}:setup_fee`)}&limit=5`,
      ).catch(() => ({ data: [] as Payment[] })),
    ])

    if (!subscription.asaas_subscription_id) {
      const standalone = [...(prorationList.data || []), ...(setupList.data || [])]
      return json(req, {
        data: standalone.map(mapPayment),
        has_more: false,
        total_count: standalone.length,
      })
    }

    const result = await asaasRequest<{
      data: Payment[]
      hasMore: boolean
      totalCount: number
    }>(
      `/v3/payments?subscription=${encodeURIComponent(subscription.asaas_subscription_id)}`
        + `&limit=${limit}&offset=${offset}`,
    )

    const seen = new Set((result.data || []).map((p) => p.id))
    const extras = [...(prorationList.data || []), ...(setupList.data || [])]
      .filter((p) => p.id && !seen.has(p.id))

    const merged = offset === 0
      ? [...extras, ...(result.data || [])]
      : (result.data || [])

    return json(req, {
      data: merged.map(mapPayment),
      has_more: Boolean(result.hasMore),
      total_count: (result.totalCount || 0) + (offset === 0 ? extras.length : 0),
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
