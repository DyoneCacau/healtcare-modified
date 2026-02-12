import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
}

// Verify MercadoPago HMAC-SHA256 signature
async function verifyMpSignature(req: Request, webhookSecret: string): Promise<boolean> {
  try {
    const signatureHeader = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')
    if (!signatureHeader || !requestId) return false

    const parts = signatureHeader.split(',')
    const tsPart = parts.find((p: string) => p.startsWith('ts='))
    const v1Part = parts.find((p: string) => p.startsWith('v1='))
    if (!tsPart || !v1Part) return false

    const ts = tsPart.split('=')[1]
    const receivedHash = v1Part.split('=')[1]
    const urlObj = new URL(req.url)
    const dataId = urlObj.searchParams.get('data.id') || ''
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b: number) => b.toString(16).padStart(2, '0')).join('')

    return computedHash === receivedHash
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Webhook received from Mercado Pago')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mercadoPagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MP_ACCESS_TOKEN')
    const mpWebhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')

    if (!mercadoPagoAccessToken) {
      throw new Error('MP access token not configured')
    }

    // ─── SECURITY: Verify MP signature ───
    if (mpWebhookSecret) {
      const isValid = await verifyMpSignature(req, mpWebhookSecret)
      if (!isValid) {
        console.warn('[SECURITY] Rejected webhook with invalid signature')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }
    } else {
      console.warn('[SECURITY] MP_WEBHOOK_SECRET not set — signature verification disabled!')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const payload = await req.json()
    console.log('📦 Payload:', JSON.stringify(payload, null, 2))

    if (payload.type !== 'payment') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${payload.data.id}`,
      { headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` } }
    )

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment details: ${paymentResponse.statusText}`)
    }

    const payment = await paymentResponse.json()

    if (!payment.external_reference) {
      return new Response(JSON.stringify({ received: true, warning: 'No external_reference' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    const subscriptionId = payment.external_reference
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      console.error('❌ Subscription not found:', subscriptionId)
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    if (payment.status === 'approved') {
      const now = new Date()
      const nextPeriodEnd = new Date(now)
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30)

      await supabase.from('subscriptions').update({
        status: 'active',
        payment_status: 'paid',
        last_payment_at: payment.date_approved || now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: nextPeriodEnd.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', subscriptionId)

      await supabase.from('payment_history').insert({
        subscription_id: subscriptionId,
        amount: payment.transaction_amount,
        payment_method: payment.payment_type_id,
        status: 'confirmed',
        confirmed_at: payment.date_approved || now.toISOString(),
        notes: `Mercado Pago Payment ID: ${payment.id}`,
      })
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabase.from('payment_history').insert({
        subscription_id: subscriptionId,
        amount: payment.transaction_amount,
        payment_method: payment.payment_type_id,
        status: 'rejected',
        notes: `MP ID: ${payment.id} - ${payment.status} - ${payment.status_detail}`,
      })
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      await supabase.from('subscriptions').update({
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      }).eq('id', subscriptionId)
    }

    return new Response(
      JSON.stringify({ received: true, payment_id: payment.id, status: payment.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('💥 Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message, received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
