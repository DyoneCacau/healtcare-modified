import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

interface CreateSubscriptionRequest {
  plan_id: string
  notes?: string | null
  user_id?: string
  card_token_id?: string
  payment_method_id?: string
  issuer_id?: string
  installments?: number
  payer?: {
    email?: string
    identification?: {
      type?: string
      number?: string
    }
  }
  payer_email?: string
}

const getBasePrice = (plan: any) => {
  if (plan.promo_active && plan.promo_price_monthly) {
    return Number(plan.promo_price_monthly)
  }
  return Number(plan.price_monthly || 0)
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
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:8080'

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

    const body = (await req.json()) as CreateSubscriptionRequest
    if (!body?.plan_id) {
      return new Response(JSON.stringify({ error: 'Missing plan_id' }), {
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

    const { data: clinicUser, error: clinicUserError } = await supabaseAdmin
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clinicUserError || !clinicUser) {
      return new Response(JSON.stringify({ error: 'Clinic not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan_id')
      .eq('clinic_id', clinicUser.clinic_id)
      .maybeSingle()

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id, name, price_monthly, promo_price_monthly, promo_active')
      .eq('id', body.plan_id)
      .eq('is_active', true)
      .maybeSingle()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const finalAmount = Number(getBasePrice(plan).toFixed(2))

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
        payment_method: 'card',
      })
      .select()
      .single()

    if (upgradeError) {
      return new Response(JSON.stringify({ error: upgradeError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payerEmail = body.payer?.email || body.payer_email || user.email

    const subscriptionPayload: Record<string, unknown> = {
      reason: `HealthCare - ${plan.name}`,
      payer_email: payerEmail,
      external_reference: upgradeRequest.id,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: finalAmount,
        currency_id: 'BRL',
      },
      status: 'authorized',
    }

    if (body.card_token_id) {
      subscriptionPayload.card_token_id = body.card_token_id
      subscriptionPayload.payment_method_id = body.payment_method_id
      subscriptionPayload.issuer_id = body.issuer_id
      subscriptionPayload.installments = body.installments
      if (body.payer?.identification) {
        subscriptionPayload.payer = {
          email: payerEmail,
          identification: body.payer.identification,
        }
      }
    } else {
      subscriptionPayload.back_url = `${appUrl}/configuracoes`
    }

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(subscriptionPayload),
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
      .update({ mp_preapproval_id: mpData.id })
      .eq('id', upgradeRequest.id)

    if (subscription?.id) {
      await supabaseAdmin.from('payment_history').insert({
        subscription_id: subscription.id,
        amount: finalAmount,
        payment_method: 'card',
        status: 'pending',
        notes: `Mercado Pago assinatura ${mpData.id}`,
      })
    }

    return new Response(
      JSON.stringify({
        preapproval_id: mpData.id,
        init_point: mpData.init_point,
        amount: finalAmount,
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
