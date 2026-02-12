import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePreferenceRequest {
  plan_id: string
  subscription_id?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verificar usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const { plan_id, subscription_id }: CreatePreferenceRequest = await req.json()

    if (!plan_id) {
      throw new Error('plan_id is required')
    }

    // Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      throw new Error('Plan not found')
    }

    // Buscar clínica do usuário
    const { data: clinicUser, error: clinicError } = await supabase
      .from('clinic_users')
      .select('clinic_id, clinics(*)')
      .eq('user_id', user.id)
      .single()

    if (clinicError || !clinicUser) {
      throw new Error('User clinic not found')
    }

    const clinic = clinicUser.clinics

    // Buscar ou criar subscription
    let subscriptionIdToUse = subscription_id

    if (!subscriptionIdToUse) {
      // Buscar subscription existente da clínica
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('clinic_id', clinicUser.clinic_id)
        .maybeSingle()

      if (existingSub) {
        subscriptionIdToUse = existingSub.id
      } else {
        // Criar nova subscription
        const { data: newSub, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            clinic_id: clinicUser.clinic_id,
            plan_id: plan_id,
            status: 'trial',
            payment_status: 'pending',
          })
          .select('id')
          .single()

        if (subError || !newSub) {
          throw new Error('Failed to create subscription')
        }

        subscriptionIdToUse = newSub.id
      }
    }

    // Criar preferência no Mercado Pago
    const mercadoPagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mercadoPagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured')
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const webhookUrl = Deno.env.get('WEBHOOK_URL') || `${supabaseUrl}/functions/v1/mercadopago-webhook`

    const preference = {
      items: [
        {
          id: plan.id,
          title: `${plan.name} - Assinatura Mensal`,
          description: plan.description || '',
          quantity: 1,
          unit_price: Number(plan.price_monthly),
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: user.email,
        name: clinic.name,
      },
      external_reference: subscriptionIdToUse,
      notification_url: webhookUrl,
      back_urls: {
        success: `${appUrl}/configuracoes?payment=success`,
        failure: `${appUrl}/configuracoes?payment=failure`,
        pending: `${appUrl}/configuracoes?payment=pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'HEALTHCARE',
      metadata: {
        clinic_id: clinicUser.clinic_id,
        user_id: user.id,
        plan_slug: plan.slug,
      },
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify(preference),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mercado Pago API error: ${response.status} - ${errorText}`)
    }

    const preferenceData = await response.json()

    return new Response(
      JSON.stringify({
        preference_id: preferenceData.id,
        init_point: preferenceData.init_point,
        sandbox_init_point: preferenceData.sandbox_init_point,
        subscription_id: subscriptionIdToUse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating payment preference:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
