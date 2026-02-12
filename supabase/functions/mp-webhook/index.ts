import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// Webhooks are server-to-server — no browser CORS needed
// Only allow preflight for Supabase internal tooling
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const fetchMp = async (path: string, accessToken: string) => {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(JSON.stringify(data))
  }
  return data
}

// ─── Verify MercadoPago HMAC-SHA256 signature ───
// https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
async function verifyMpSignature(
  req: Request,
  rawBody: string,
  webhookSecret: string
): Promise<boolean> {
  try {
    const signatureHeader = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')

    if (!signatureHeader || !requestId) {
      console.warn('[SECURITY] Missing x-signature or x-request-id headers')
      return false
    }

    // Parse: ts=<timestamp>,v1=<hash>
    const parts = signatureHeader.split(',')
    const tsPart = parts.find(p => p.startsWith('ts='))
    const v1Part = parts.find(p => p.startsWith('v1='))

    if (!tsPart || !v1Part) {
      console.warn('[SECURITY] Malformed x-signature header')
      return false
    }

    const ts = tsPart.split('=')[1]
    const receivedHash = v1Part.split('=')[1]

    // Build the signed template
    const urlObj = new URL(req.url)
    const dataId = urlObj.searchParams.get('data.id') || ''
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
    const computedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedHash !== receivedHash) {
      console.warn(`[SECURITY] MP signature mismatch. Got: ${receivedHash}`)
      return false
    }

    return true
  } catch (err) {
    console.error('[SECURITY] Error verifying signature:', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!
    const mpWebhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Read raw body for signature verification
    const rawBody = await req.text()

    // ─── SECURITY: Verify MP signature if secret is configured ───
    // Set MP_WEBHOOK_SECRET in Supabase Edge Function Secrets
    // Get it from MercadoPago Dashboard → Webhooks → Secret key
    if (mpWebhookSecret) {
      const isValid = await verifyMpSignature(req, rawBody, mpWebhookSecret)
      if (!isValid) {
        console.warn('[SECURITY] Rejected webhook with invalid signature')
        // Return 200 to prevent MP from retrying with fake requests
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      console.warn('[SECURITY] MP_WEBHOOK_SECRET not set — signature verification disabled!')
    }

    const url = new URL(req.url)
    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = {}
    }

    const topic =
      url.searchParams.get('topic') ||
      url.searchParams.get('type') ||
      (body?.type as string) ||
      (body?.topic as string)

    const resourceId =
      (body?.data as Record<string, unknown>)?.id ||
      body?.id ||
      url.searchParams.get('id') ||
      (body?.data as Record<string, unknown>)?.resource_id

    if (!topic || !resourceId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (topic.includes('payment')) {
      const payment = await fetchMp(`/v1/payments/${resourceId}`, mpAccessToken)
      const upgradeId = payment.external_reference

      if (!upgradeId) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: upgradeRequest } = await supabaseAdmin
        .from('upgrade_requests')
        .select('id, clinic_id, subscription_id, requested_plan_id')
        .eq('id', upgradeId)
        .maybeSingle()

      if (!upgradeRequest) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (payment.status === 'approved') {
        const now = new Date()

        await supabaseAdmin
          .from('upgrade_requests')
          .update({
            status: 'approved',
            admin_notes: 'Aprovado automaticamente via Mercado Pago',
            processed_at: now.toISOString(),
          })
          .eq('id', upgradeRequest.id)

        if (upgradeRequest.subscription_id) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_id: upgradeRequest.requested_plan_id,
              status: 'active',
              payment_status: 'paid',
              last_payment_at: now.toISOString(),
              current_period_start: now.toISOString(),
              current_period_end: addDays(now, 30).toISOString(),
              payment_provider: 'mercadopago',
              payment_method: payment.payment_method_id || null,
              mp_payment_id: String(payment.id),
            })
            .eq('id', upgradeRequest.subscription_id)

          await supabaseAdmin.from('payment_history').insert({
            subscription_id: upgradeRequest.subscription_id,
            amount: payment.transaction_amount || 0,
            payment_method: payment.payment_method_id || null,
            status: 'confirmed',
            notes: `Mercado Pago pagamento ${payment.id}`,
          })
        }
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await supabaseAdmin
          .from('upgrade_requests')
          .update({
            status: 'rejected',
            admin_notes: `Pagamento ${payment.status} no Mercado Pago`,
            processed_at: new Date().toISOString(),
          })
          .eq('id', upgradeRequest.id)
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (topic.includes('preapproval')) {
      const preapproval = await fetchMp(`/preapproval/${resourceId}`, mpAccessToken)
      const upgradeId = preapproval.external_reference

      if (!upgradeId) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: upgradeRequest } = await supabaseAdmin
        .from('upgrade_requests')
        .select('id, clinic_id, subscription_id, requested_plan_id')
        .eq('id', upgradeId)
        .maybeSingle()

      if (!upgradeRequest) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (preapproval.status === 'authorized' || preapproval.status === 'active') {
        const now = new Date()

        await supabaseAdmin
          .from('upgrade_requests')
          .update({
            status: 'approved',
            admin_notes: 'Assinatura autorizada no Mercado Pago',
            processed_at: now.toISOString(),
          })
          .eq('id', upgradeRequest.id)

        if (upgradeRequest.subscription_id) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_id: upgradeRequest.requested_plan_id,
              status: 'active',
              payment_status: 'paid',
              last_payment_at: now.toISOString(),
              current_period_start: now.toISOString(),
              current_period_end: addDays(now, 30).toISOString(),
              payment_provider: 'mercadopago',
              payment_method: 'card',
              mp_preapproval_id: preapproval.id,
            })
            .eq('id', upgradeRequest.subscription_id)

          await supabaseAdmin.from('payment_history').insert({
            subscription_id: upgradeRequest.subscription_id,
            amount: preapproval.auto_recurring?.transaction_amount || 0,
            payment_method: 'card',
            status: 'confirmed',
            notes: `Mercado Pago assinatura ${preapproval.id}`,
          })
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Webhook error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
