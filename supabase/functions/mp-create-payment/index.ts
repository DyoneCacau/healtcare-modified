import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

type PaymentMethod = 'pix' | 'boleto'

interface CreatePaymentRequest {
  plan_id: string
  payment_method: PaymentMethod
  notes?: string | null
  user_id?: string
  clinic_id?: string
  date_of_expiration?: string | null
  payer?: {
    email?: string
    first_name?: string
    last_name?: string
    address?: {
      zip_code?: string
      street_name?: string
      street_number?: string
      neighborhood?: string
      city?: string
      federal_unit?: string
    }
    identification?: {
      type?: string
      number?: string
    }
  }
}

const getBasePrice = (plan: any) => {
  if (plan.promo_active && plan.promo_price_monthly) {
    return Number(plan.promo_price_monthly)
  }
  return Number(plan.price_monthly || 0)
}

const getFinalPrice = (plan: any, method: PaymentMethod) => {
  const base = getBasePrice(plan)
  if (method === 'pix' && plan.discount_pix_percent && Number(plan.discount_pix_percent) > 0) {
    const discount = Number(plan.discount_pix_percent) / 100
    return Math.max(0, base * (1 - discount))
  }
  return base
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!
    const webhookUrl = Deno.env.get('MP_WEBHOOK_URL')

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as CreatePaymentRequest
    if (!body?.plan_id || !body?.payment_method) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    const user = userData?.user
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let clinicUserQuery = supabaseAdmin
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)

    if (body.clinic_id) {
      clinicUserQuery = clinicUserQuery.eq('clinic_id', body.clinic_id)
    }

    const { data: clinicUser, error: clinicUserError } = await clinicUserQuery.maybeSingle()

    if (clinicUserError || !clinicUser) {
      return new Response(JSON.stringify({ error: 'Clinic not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('id, address, city, state, zip_code, cnpj, name')
      .eq('id', clinicUser.clinic_id)
      .maybeSingle()

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan_id')
      .eq('clinic_id', clinicUser.clinic_id)
      .maybeSingle()

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id, name, price_monthly, promo_price_monthly, promo_active, discount_pix_percent')
      .eq('id', body.plan_id)
      .eq('is_active', true)
      .maybeSingle()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const finalAmount = Number(getFinalPrice(plan, body.payment_method).toFixed(2))

    const payerAddress = {
      zip_code: body.payer?.address?.zip_code || clinic?.zip_code || undefined,
      street_name: body.payer?.address?.street_name || clinic?.address || undefined,
      street_number: body.payer?.address?.street_number || undefined,
      neighborhood: body.payer?.address?.neighborhood || undefined,
      city: body.payer?.address?.city || clinic?.city || undefined,
      federal_unit: body.payer?.address?.federal_unit || clinic?.state || undefined,
    }

    const payerIdentification = body.payer?.identification?.number
      ? body.payer.identification
      : clinic?.cnpj
        ? { type: 'CNPJ', number: String(clinic.cnpj).replace(/\D/g, '') }
        : undefined

    const payerName = {
      first_name: body.payer?.first_name || clinic?.name,
      last_name: body.payer?.last_name || clinic?.name,
    }

    if (body.payment_method === 'boleto') {
      const missing = [
        !payerAddress.zip_code && 'payer.address.zip_code',
        !payerAddress.street_name && 'payer.address.street_name',
        !payerAddress.street_number && 'payer.address.street_number',
        !payerAddress.neighborhood && 'payer.address.neighborhood',
        !payerAddress.city && 'payer.address.city',
        !payerAddress.federal_unit && 'payer.address.federal_unit',
        !payerIdentification?.number && 'payer.identification.number',
      ].filter(Boolean)

      if (missing.length > 0) {
        return new Response(JSON.stringify({ error: 'Missing payer address fields', missing }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: upgradeRequest, error: upgradeError } = await supabaseAdmin
      .from('upgrade_requests')
      .insert({
        clinic_id: clinicUser.clinic_id,
        subscription_id: subscription?.id || null,
        requested_by: user.id,
        requested_plan_id: plan.id,
        current_plan_id: subscription?.plan_id || null,
        notes: body.notes || null,
        status: 'pending',
        payment_provider: 'mercadopago',
        payment_method: body.payment_method,
      })
      .select()
      .single()

    if (upgradeError) {
      return new Response(JSON.stringify({ error: upgradeError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentMethodId = body.payment_method === 'pix' ? 'pix' : 'bolbradesco'
    const paymentPayload: Record<string, unknown> = {
      transaction_amount: finalAmount,
      description: `HealthCare - ${plan.name}`,
      payment_method_id: paymentMethodId,
      payer: {
        email: body.payer?.email || user.email,
        first_name: payerName.first_name,
        last_name: payerName.last_name,
        identification: payerIdentification,
        address: body.payment_method === 'boleto' ? payerAddress : undefined,
      },
      external_reference: upgradeRequest.id,
    }

    if (body.date_of_expiration) {
      paymentPayload.date_of_expiration = body.date_of_expiration
    }

    if (webhookUrl) {
      paymentPayload.notification_url = webhookUrl
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentPayload),
    })

    const mpData = await mpResponse.json()
    if (!mpResponse.ok) {
      return new Response(JSON.stringify({ error: 'MP error', details: mpData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('upgrade_requests')
      .update({ mp_payment_id: mpData.id })
      .eq('id', upgradeRequest.id)

    if (subscription?.id) {
      await supabaseAdmin.from('payment_history').insert({
        subscription_id: subscription.id,
        amount: finalAmount,
        payment_method: body.payment_method,
        status: 'pending',
        notes: `Mercado Pago pagamento ${mpData.id}`,
      })
    }

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        amount: finalAmount,
        qr_code: mpData?.point_of_interaction?.transaction_data?.qr_code || null,
        qr_code_base64: mpData?.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        boleto_url: mpData?.transaction_details?.external_resource_url || null,
        init_point: mpData?.init_point || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
