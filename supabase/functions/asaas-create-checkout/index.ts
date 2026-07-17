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
import {
  daysUntil,
  DEFAULT_BILLING_DAY,
  isIsoDate,
  normalizeBillingDay,
  normalizeDeferDays,
  prorationAmount,
  resolveFirstDueDate,
} from '../_shared/billingDay.ts'

interface Customer {
  id: string
}

interface AsaasList<T> {
  data: T[]
}

interface AsaasSubscription {
  id: string
  nextDueDate?: string
}

interface Payment {
  id: string
  invoiceUrl?: string
  bankSlipUrl?: string
}

function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false
  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce(
      (total, digit, index) => total + Number(digit) * weights[index],
      0,
    )
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = calculateDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )
  const second = calculateDigit(
    `${digits.slice(0, 12)}${first}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )
  return digits.endsWith(`${first}${second}`)
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
      include_setup_fee?: boolean
      billing_day?: number
      billing_defer_days?: number
      first_due_date?: string | null
    }
    assertUuid(body.subscription_id, 'subscription_id')

    const supabase = serviceClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        id, clinic_id, monthly_fee, setup_fee, asaas_subscription_id,
        billing_day, billing_defer_days, billing_first_due_date,
        clinics!inner(id, name, email, phone, cnpj, asaas_customer_id)
      `)
      .eq('id', body.subscription_id)
      .single()

    if (error || !subscription) throw new HttpError(404, 'Assinatura não encontrada')
    await authorizeClinic(req, supabase, subscription.clinic_id, true)

    const clinic = subscription.clinics as unknown as {
      id: string
      name: string
      email: string
      phone?: string | null
      cnpj?: string | null
      asaas_customer_id?: string | null
    }
    const monthlyFee = Number(subscription.monthly_fee || 0)
    const setupFee = Number(subscription.setup_fee || 0)
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      throw new HttpError(409, 'Mensalidade não configurada')
    }
    if (!clinic.cnpj) throw new HttpError(409, 'CNPJ/CPF da clínica não configurado')
    if (!isValidCnpj(clinic.cnpj)) {
      throw new HttpError(409, 'CNPJ da clínica inválido; atualize o cadastro antes de ativar o Asaas')
    }

    const billingDay = normalizeBillingDay(
      body.billing_day ?? subscription.billing_day ?? DEFAULT_BILLING_DAY,
    )
    const deferDays = normalizeDeferDays(
      body.billing_defer_days ?? subscription.billing_defer_days ?? 0,
    )
    const requestedFirstDue = isIsoDate(body.first_due_date)
      ? body.first_due_date
      : isIsoDate(subscription.billing_first_due_date)
      ? subscription.billing_first_due_date
      : null
    const todayIso = new Date().toISOString().slice(0, 10)
    if (requestedFirstDue && requestedFirstDue <= todayIso) {
      throw new HttpError(400, 'A data da 1ª mensalidade deve ser futura')
    }
    const schedulePromo = Boolean(requestedFirstDue) || deferDays > 0
    const firstDueDate = resolveFirstDueDate(billingDay, {
      deferDays,
      firstDueDate: requestedFirstDue,
    })
    const prorataDays = schedulePromo ? 0 : daysUntil(firstDueDate)
    const prorataValue = schedulePromo ? 0 : prorationAmount(monthlyFee, prorataDays)

    let customerId = clinic.asaas_customer_id || null
    if (!customerId) {
      const existing = await asaasRequest<AsaasList<Customer>>(
        `/v3/customers?externalReference=${encodeURIComponent(clinic.id)}&limit=1`,
      )
      customerId = existing.data?.[0]?.id || null
    }
    if (!customerId) {
      const customer = await asaasRequest<Customer>('/v3/customers', {
        method: 'POST',
        headers: { 'asaas-idempotency-key': `clinic-customer-${clinic.id}` },
        body: JSON.stringify({
          name: clinic.name,
          email: clinic.email,
          mobilePhone: clinic.phone || undefined,
          cpfCnpj: clinic.cnpj.replace(/\D/g, ''),
          externalReference: clinic.id,
          notificationDisabled: false,
        }),
      })
      customerId = customer.id
    }

    let asaasSubscriptionId = subscription.asaas_subscription_id as string | null
    let nextDueDate: string | undefined
    if (!asaasSubscriptionId) {
      const created = await asaasRequest<AsaasSubscription>('/v3/subscriptions', {
        method: 'POST',
        headers: { 'asaas-idempotency-key': `clinic-subscription-${subscription.id}` },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: monthlyFee,
          nextDueDate: firstDueDate,
          cycle: 'MONTHLY',
          description: `Mensalidade ${clinic.name}`,
          externalReference: subscription.id,
        }),
      })
      asaasSubscriptionId = created.id
      nextDueDate = created.nextDueDate || firstDueDate
    } else {
      nextDueDate = firstDueDate
    }

    const { error: metaError } = await supabase
      .from('subscriptions')
      .update({
        billing_day: billingDay,
        billing_defer_days: schedulePromo ? (deferDays || 0) : 0,
        billing_first_due_date: schedulePromo ? firstDueDate : null,
        proration_days: prorataDays > 0 && prorataValue >= 0.01 ? prorataDays : null,
        proration_amount: prorataDays > 0 && prorataValue >= 0.01 ? prorataValue : null,
        // Promo: libera uso durante implantação; cobrança só no 1º vencimento.
        ...(schedulePromo
          ? { status: 'active', billing_status: 'pending', payment_status: 'pending' }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
    if (metaError) {
      console.error('Failed to store billing_day/proration', metaError.code)
      throw new HttpError(500, 'Não foi possível salvar o dia de vencimento')
    }

    const { error: bindingError } = await supabase.rpc('asaas_store_billing_binding', {
      p_subscription_id: subscription.id,
      p_customer_id: customerId,
      p_asaas_subscription_id: asaasSubscriptionId,
      p_next_due_date: nextDueDate || null,
    })
    if (bindingError) {
      console.error('Failed to store Asaas binding', bindingError.code)
      throw new HttpError(500, 'Não foi possível salvar os dados da cobrança')
    }

    const today = new Date().toISOString().slice(0, 10)

    let prorationPayment: Payment | null = null
    if (prorataDays > 0 && prorataValue >= 0.01) {
      const reference = `${subscription.id}:proration`
      const existingProration = await asaasRequest<AsaasList<Payment>>(
        `/v3/payments?externalReference=${encodeURIComponent(reference)}&limit=1`,
      )
      prorationPayment = existingProration.data?.[0] || null
      if (!prorationPayment) {
        prorationPayment = await asaasRequest<Payment>('/v3/payments', {
          method: 'POST',
          headers: { 'asaas-idempotency-key': `clinic-proration-${subscription.id}` },
          body: JSON.stringify({
            customer: customerId,
            billingType: 'UNDEFINED',
            value: prorataValue,
            dueDate: today,
            description:
              `Período proporcional ${clinic.name} (${prorataDays} dias até ${nextDueDate || firstDueDate})`,
            externalReference: reference,
          }),
        })
      }
    }

    let setupPayment: Payment | null = null
    if (body.include_setup_fee && setupFee > 0) {
      const reference = `${subscription.id}:setup_fee`
      const existingSetup = await asaasRequest<AsaasList<Payment>>(
        `/v3/payments?externalReference=${encodeURIComponent(reference)}&limit=1`,
      )
      setupPayment = existingSetup.data?.[0] || null
      if (!setupPayment) {
        setupPayment = await asaasRequest<Payment>('/v3/payments', {
          method: 'POST',
          headers: { 'asaas-idempotency-key': `clinic-setup-fee-${subscription.id}` },
          body: JSON.stringify({
            customer: customerId,
            billingType: 'UNDEFINED',
            value: setupFee,
            dueDate: today,
            description: `Taxa de adesão ${clinic.name}`,
            externalReference: reference,
          }),
        })
      }
    }

    const recurringPayments = await asaasRequest<AsaasList<Payment>>(
      `/v3/payments?subscription=${encodeURIComponent(asaasSubscriptionId)}&limit=1`,
    )
    const recurringPayment = recurringPayments.data?.[0] || null

    return json(req, {
      subscription_id: subscription.id,
      asaas_subscription_id: asaasSubscriptionId,
      billing_type: 'UNDEFINED',
      billing_day: billingDay,
      billing_defer_days: schedulePromo ? (deferDays || 0) : 0,
      first_due_date: schedulePromo ? firstDueDate : null,
      next_due_date: nextDueDate || firstDueDate,
      proration_days: prorataDays > 0 && prorataValue >= 0.01 ? prorataDays : 0,
      proration_amount: prorataDays > 0 && prorataValue >= 0.01 ? prorataValue : 0,
      recurring_payment: recurringPayment && {
        id: recurringPayment.id,
        invoice_url: recurringPayment.invoiceUrl,
        bank_slip_url: recurringPayment.bankSlipUrl,
      },
      proration_payment: prorationPayment && {
        id: prorationPayment.id,
        invoice_url: prorationPayment.invoiceUrl,
        bank_slip_url: prorationPayment.bankSlipUrl,
      },
      setup_payment: setupPayment && {
        id: setupPayment.id,
        invoice_url: setupPayment.invoiceUrl,
        bank_slip_url: setupPayment.bankSlipUrl,
      },
    }, 201)
  } catch (error) {
    return errorResponse(req, error)
  }
})
