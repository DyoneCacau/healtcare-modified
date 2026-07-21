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

type BillingChoice = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

interface AsaasPayment {
  id: string
  status?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  billingType?: string
  dueDate?: string
  value?: number
  subscription?: string
  externalReference?: string
  customer?: string
}

interface AsaasSubscription {
  id: string
  customer?: string
  value?: number
  nextDueDate?: string
  billingType?: string
  status?: string
}

interface AsaasList<T> {
  data?: T[]
}

interface PixQrCode {
  encodedImage?: string
  payload?: string
  expirationDate?: string
}

interface IdentificationField {
  identificationField?: string
  barCode?: string
}

const OPEN_STATUSES = new Set([
  'PENDING',
  'OVERDUE',
  'AWAITING_RISK_ANALYSIS',
])

const ALLOWED: ReadonlySet<string> = new Set(['PIX', 'BOLETO', 'CREDIT_CARD'])

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function pickOpenPayment(payments: AsaasPayment[]): AsaasPayment | null {
  const open = payments.filter((p) => OPEN_STATUSES.has(String(p.status || '').toUpperCase()))
  open.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
  return open[0] || null
}

async function loadCandidatePayments(
  subscriptionId: string,
  asaasSubscriptionId: string | null,
): Promise<AsaasPayment[]> {
  const extras = await Promise.all([
    asaasRequest<AsaasList<AsaasPayment>>(
      `/v3/payments?externalReference=${encodeURIComponent(`${subscriptionId}:proration`)}&limit=5`,
    ).catch(() => ({ data: [] as AsaasPayment[] })),
    asaasRequest<AsaasList<AsaasPayment>>(
      `/v3/payments?externalReference=${encodeURIComponent(`${subscriptionId}:setup_fee`)}&limit=5`,
    ).catch(() => ({ data: [] as AsaasPayment[] })),
  ])

  let recurring: AsaasPayment[] = []
  if (asaasSubscriptionId) {
    const list = await asaasRequest<AsaasList<AsaasPayment>>(
      `/v3/subscriptions/${encodeURIComponent(asaasSubscriptionId)}/payments?limit=30`,
    )
    recurring = list.data || []
  }

  const seen = new Set<string>()
  const merged: AsaasPayment[] = []
  for (const payment of [...(extras[0].data || []), ...(extras[1].data || []), ...recurring]) {
    if (!payment?.id || seen.has(payment.id)) continue
    seen.add(payment.id)
    merged.push(payment)
  }
  return merged
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const body = await req.json().catch(() => {
      throw new HttpError(400, 'JSON inválido')
    }) as {
      subscription_id?: string
      payment_id?: string
      billing_type?: string
    }

    assertUuid(body.subscription_id, 'subscription_id')
    const billingType = String(body.billing_type || '').toUpperCase()
    if (!ALLOWED.has(billingType)) {
      throw new HttpError(400, 'Escolha PIX, BOLETO ou CREDIT_CARD')
    }
    const choice = billingType as BillingChoice

    const supabase = serviceClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id,clinic_id,status,asaas_subscription_id,monthly_fee,clinics(asaas_customer_id)')
      .eq('id', body.subscription_id)
      .single()
    if (error || !subscription) throw new HttpError(404, 'Assinatura não encontrada')

    await authorizeClinic(req, supabase, subscription.clinic_id, true)

    if (subscription.status === 'cancelled') {
      throw new HttpError(409, 'Assinatura cancelada')
    }

    const asaasSubId = (subscription.asaas_subscription_id as string | null) || null
    const candidates = await loadCandidatePayments(subscription.id, asaasSubId)

    let target: AsaasPayment | null = null
    if (body.payment_id && typeof body.payment_id === 'string') {
      target = candidates.find((p) => p.id === body.payment_id) || null
      if (!target) {
        // Pagamento pode existir mas não ter entrado na lista; busca direto.
        target = await asaasRequest<AsaasPayment>(
          `/v3/payments/${encodeURIComponent(body.payment_id)}`,
        )
      }
      if (!OPEN_STATUSES.has(String(target.status || '').toUpperCase())) {
        throw new HttpError(409, 'Esta cobrança já não está aberta para pagamento')
      }
    } else {
      target = pickOpenPayment(candidates)
    }

    // Cartão sem fatura aberta: gera cobrança para cadastro (mesmo padrão do set-card-recurring).
    if (!target && choice === 'CREDIT_CARD' && asaasSubId) {
      const asaasSub = await asaasRequest<AsaasSubscription>(
        `/v3/subscriptions/${encodeURIComponent(asaasSubId)}`,
      )
      const clinicRow = subscription.clinics as { asaas_customer_id?: string | null } | null
      const customerId = asaasSub.customer || clinicRow?.asaas_customer_id
      if (!customerId) throw new HttpError(409, 'Cliente Asaas não encontrado')

      const value = Number(asaasSub.value ?? subscription.monthly_fee ?? 0)
      if (!Number.isFinite(value) || value < 0.01) {
        throw new HttpError(409, 'Mensalidade inválida')
      }

      await asaasRequest(`/v3/subscriptions/${encodeURIComponent(asaasSubId)}`, {
        method: 'POST',
        body: JSON.stringify({
          billingType: 'CREDIT_CARD',
          updatePendingPayments: true,
        }),
      })

      const refreshed = await loadCandidatePayments(subscription.id, asaasSubId)
      target = pickOpenPayment(refreshed)

      if (!target?.invoiceUrl) {
        target = await asaasRequest<AsaasPayment>('/v3/payments', {
          method: 'POST',
          headers: { 'asaas-idempotency-key': `card-register-${subscription.id}` },
          body: JSON.stringify({
            customer: customerId,
            billingType: 'CREDIT_CARD',
            value,
            dueDate: todayIso(),
            description: 'Cadastro de cartão para débito mensal',
            externalReference: `${subscription.id}:card_register`,
          }),
        })
      }
    }

    if (!target?.id) {
      throw new HttpError(409, 'Nenhuma cobrança pendente para pagar')
    }

    // Atualiza a cobrança para o método escolhido na plataforma.
    target = await asaasRequest<AsaasPayment>(
      `/v3/payments/${encodeURIComponent(target.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ billingType: choice }),
      },
    )

    // Preferência da assinatura (próximas faturas) quando houver vínculo.
    if (asaasSubId) {
      try {
        await asaasRequest(`/v3/subscriptions/${encodeURIComponent(asaasSubId)}`, {
          method: 'POST',
          body: JSON.stringify({
            billingType: choice,
            updatePendingPayments: true,
          }),
        })
      } catch (subError) {
        console.error(
          'Could not update subscription billingType',
          subError instanceof Error ? subError.message : 'unknown',
        )
      }
    }

    let pix: PixQrCode | null = null
    if (choice === 'PIX') {
      pix = await asaasRequest<PixQrCode>(
        `/v3/payments/${encodeURIComponent(target.id)}/pixQrCode`,
      )
    }

    let boleto: IdentificationField | null = null
    if (choice === 'BOLETO') {
      boleto = await asaasRequest<IdentificationField>(
        `/v3/payments/${encodeURIComponent(target.id)}/identificationField`,
      ).catch(() => null)
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        payment_method: choice,
        payment_provider: 'asaas',
        billing_mode: 'asaas',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
    if (updateError) {
      console.error('Failed to store payment_method preference', updateError.code)
    }

    const labels: Record<BillingChoice, string> = {
      PIX: 'Pix',
      BOLETO: 'Boleto',
      CREDIT_CARD: 'Cartão',
    }

    return json(req, {
      billing_type: choice,
      payment_id: target.id,
      status: target.status ?? null,
      value: target.value ?? null,
      due_date: target.dueDate ?? null,
      invoice_url: target.invoiceUrl ?? null,
      bank_slip_url: target.bankSlipUrl ?? null,
      pix: pix && {
        encoded_image: pix.encodedImage ?? null,
        payload: pix.payload ?? null,
        expiration_date: pix.expirationDate ?? null,
      },
      boleto: boleto && {
        identification_field: boleto.identificationField ?? null,
        bar_code: boleto.barCode ?? null,
      },
      message: `Método ${labels[choice]} selecionado. Conclua o pagamento.`,
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
