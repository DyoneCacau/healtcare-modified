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

const OPEN_STATUSES = new Set([
  'PENDING',
  'OVERDUE',
  'AWAITING_RISK_ANALYSIS',
])

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function pickOpenPayment(payments: AsaasPayment[]): AsaasPayment | null {
  const open = payments.filter((p) => OPEN_STATUSES.has(String(p.status || '').toUpperCase()))
  open.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
  return open[0] || null
}

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
      .select('id,clinic_id,status,asaas_subscription_id,monthly_fee,clinics(asaas_customer_id)')
      .eq('id', body.subscription_id)
      .single()
    if (error || !subscription) throw new HttpError(404, 'Assinatura não encontrada')

    await authorizeClinic(req, supabase, subscription.clinic_id, true)

    if (subscription.status === 'cancelled') {
      throw new HttpError(409, 'Assinatura cancelada')
    }
    if (!subscription.asaas_subscription_id) {
      throw new HttpError(409, 'Assinatura não vinculada ao Asaas')
    }

    const asaasSubId = subscription.asaas_subscription_id as string
    const today = todayIso()

    // 1) Assinatura passa a ser cartão (futuras + pendentes).
    await asaasRequest(`/v3/subscriptions/${encodeURIComponent(asaasSubId)}`, {
      method: 'POST',
      body: JSON.stringify({
        billingType: 'CREDIT_CARD',
        updatePendingPayments: true,
      }),
    })

    // 2) Busca cobrança aberta da assinatura.
    let payments = await asaasRequest<AsaasList<AsaasPayment>>(
      `/v3/subscriptions/${encodeURIComponent(asaasSubId)}/payments?limit=30`,
    )
    let target = pickOpenPayment(payments.data || [])

    // 3) Se não há fatura aberta (mês já pago), cria cobrança CREDIT_CARD agora
    //    para o cliente informar o cartão na página hospedada do Asaas.
    if (!target?.invoiceUrl) {
      const asaasSub = await asaasRequest<AsaasSubscription>(
        `/v3/subscriptions/${encodeURIComponent(asaasSubId)}`,
      )
      const clinicRow = subscription.clinics as { asaas_customer_id?: string | null } | null
      const customerId = asaasSub.customer || clinicRow?.asaas_customer_id
      if (!customerId) {
        throw new HttpError(409, 'Cliente Asaas não encontrado para cadastrar o cartão')
      }

      const value = Number(asaasSub.value ?? subscription.monthly_fee ?? 0)
      if (!Number.isFinite(value) || value < 0.01) {
        throw new HttpError(409, 'Mensalidade inválida para gerar cobrança de cartão')
      }

      const cardRef = `${subscription.id}:card_register`
      const existing = await asaasRequest<AsaasList<AsaasPayment>>(
        `/v3/payments?externalReference=${encodeURIComponent(cardRef)}&limit=5`,
      )
      const existingOpen = pickOpenPayment(existing.data || [])
      if (existingOpen?.invoiceUrl) {
        target = existingOpen
      } else {
        // Antecipa a geração da próxima fatura da assinatura para hoje (cartão).
        try {
          await asaasRequest(`/v3/subscriptions/${encodeURIComponent(asaasSubId)}`, {
            method: 'POST',
            body: JSON.stringify({
              billingType: 'CREDIT_CARD',
              nextDueDate: today,
              updatePendingPayments: true,
            }),
          })
          payments = await asaasRequest<AsaasList<AsaasPayment>>(
            `/v3/subscriptions/${encodeURIComponent(asaasSubId)}/payments?limit=30`,
          )
          target = pickOpenPayment(payments.data || [])
        } catch (advanceError) {
          console.error(
            'Could not advance subscription due date',
            advanceError instanceof Error ? advanceError.message : 'unknown',
          )
        }

        if (!target?.invoiceUrl) {
          target = await asaasRequest<AsaasPayment>('/v3/payments', {
            method: 'POST',
            headers: { 'asaas-idempotency-key': `card-register-${subscription.id}` },
            body: JSON.stringify({
              customer: customerId,
              billingType: 'CREDIT_CARD',
              value,
              dueDate: today,
              description: 'Cadastro de cartão para débito mensal',
              externalReference: cardRef,
            }),
          })
        }
      }
    }

    if (!target?.invoiceUrl) {
      throw new HttpError(
        502,
        'Não foi possível abrir a fatura de cartão. Tente de novo ou use o painel Asaas.',
      )
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        payment_method: 'CREDIT_CARD',
        payment_provider: 'asaas',
        billing_mode: 'asaas',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
    if (updateError) {
      console.error('Failed to store CREDIT_CARD preference', updateError.code)
    }

    return json(req, {
      billing_type: 'CREDIT_CARD',
      payment_id: target.id,
      invoice_url: target.invoiceUrl,
      has_open_payment: true,
      message:
        'Informe o cartão na página do Asaas agora. Depois disso a mensalidade será debitada automaticamente.',
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
