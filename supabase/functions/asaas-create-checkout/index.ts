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

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const body = await req.json().catch(() => {
      throw new HttpError(400, 'JSON inválido')
    }) as { subscription_id?: string; include_setup_fee?: boolean }
    assertUuid(body.subscription_id, 'subscription_id')

    const supabase = serviceClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        id, clinic_id, monthly_fee, setup_fee, asaas_subscription_id,
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
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
      const created = await asaasRequest<AsaasSubscription>('/v3/subscriptions', {
        method: 'POST',
        headers: { 'asaas-idempotency-key': `clinic-subscription-${subscription.id}` },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: monthlyFee,
          nextDueDate: tomorrow,
          cycle: 'MONTHLY',
          description: `Mensalidade ${clinic.name}`,
          externalReference: subscription.id,
        }),
      })
      asaasSubscriptionId = created.id
      nextDueDate = created.nextDueDate || tomorrow
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
            dueDate: new Date().toISOString().slice(0, 10),
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
      recurring_payment: recurringPayment && {
        id: recurringPayment.id,
        invoice_url: recurringPayment.invoiceUrl,
        bank_slip_url: recurringPayment.bankSlipUrl,
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
