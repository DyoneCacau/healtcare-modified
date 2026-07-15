import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingResult {
  near_expiry_alerts: number
  marked_overdue: number
  suspended_overdue: number
  expiring_today_alerts: number
  errors: string[]
}

function secretsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder()
  const providedBytes = encoder.encode(provided)
  const expectedBytes = encoder.encode(expected)
  let difference = providedBytes.length ^ expectedBytes.length
  const length = Math.max(providedBytes.length, expectedBytes.length)

  for (let index = 0; index < length; index++) {
    difference |= (providedBytes[index] || 0) ^ (expectedBytes[index] || 0)
  }

  return difference === 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('[SECURITY] CRON_SECRET is not configured')
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization') || ''
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!provided || !secretsMatch(provided, cronSecret)) {
    console.warn('[SECURITY] Unauthorized check-subscriptions attempt')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log('🔄 Starting subscription check job (vendas diretas)...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const result: ProcessingResult = {
      near_expiry_alerts: 0,
      marked_overdue: 0,
      suspended_overdue: 0,
      expiring_today_alerts: 0,
      errors: [],
    }

    const insertNotification = async (
      type: string,
      title: string,
      message: string,
      referenceType: string,
      referenceId: string
    ) => {
      await supabase.from('admin_notifications').insert({
        type,
        title,
        message,
        reference_type: referenceType,
        reference_id: referenceId,
      })
    }

    // 1. Alertar vencimentos próximos (3 dias)
    console.log('📋 Checking near expiry subscriptions...')

    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const { data: nearExpiry, error: nearExpiryError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'active')
      .eq('billing_status', 'paid')
      .lt('current_period_end', threeDaysFromNow.toISOString())
      .gt('current_period_end', now.toISOString())

    if (nearExpiryError) {
      console.error('❌ Error fetching near expiry subscriptions:', nearExpiryError)
      result.errors.push(`Near expiry: ${nearExpiryError.message}`)
    } else if (nearExpiry && nearExpiry.length > 0) {
      for (const sub of nearExpiry) {
        try {
          await insertNotification(
            'near_expiry',
            `Vencimento em 3 dias: ${sub.clinics?.name || 'Clínica'}`,
            `A assinatura da clínica ${sub.clinics?.name || 'N/A'} vence em até 3 dias. Período até: ${sub.current_period_end?.slice(0, 10) || 'N/A'}.`,
            'subscription',
            sub.id
          )
          result.near_expiry_alerts++
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Near expiry ${sub.id}: ${msg}`)
        }
      }
    }

    // 2. Marcar como atrasado (período já venceu)
    console.log('📋 Checking expired periods (mark as overdue)...')

    const { data: periodExpired, error: periodExpiredError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'active')
      .eq('billing_status', 'paid')
      .lt('current_period_end', now.toISOString())

    if (periodExpiredError) {
      result.errors.push(`Period expired: ${periodExpiredError.message}`)
    } else if (periodExpired && periodExpired.length > 0) {
      for (const sub of periodExpired) {
        try {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              billing_status: 'overdue',
              payment_status: 'overdue',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) throw updateError

          await insertNotification(
            'period_expired',
            `Período vencido: ${sub.clinics?.name || 'Clínica'}`,
            `A assinatura da clínica ${sub.clinics?.name || 'N/A'} venceu. Renovação necessária para evitar suspensão em 7 dias.`,
            'subscription',
            sub.id
          )
          result.marked_overdue++
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Mark overdue ${sub.id}: ${msg}`)
        }
      }
    }

    // 3. Suspender inadimplentes (7 dias após vencimento)
    console.log('📋 Checking overdue subscriptions to suspend...')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: overdue, error: overdueError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .in('status', ['active', 'expired'])
      .eq('billing_status', 'overdue')
      .lt('current_period_end', sevenDaysAgo.toISOString())

    if (overdueError) {
      result.errors.push(`Overdue: ${overdueError.message}`)
    } else if (overdue && overdue.length > 0) {
      for (const sub of overdue) {
        try {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'suspended',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) throw updateError

          await insertNotification(
            'suspended',
            `Assinatura suspensa: ${sub.clinics?.name || 'Clínica'}`,
            `A assinatura da clínica ${sub.clinics?.name || 'N/A'} foi suspensa por inadimplência (7+ dias em atraso).`,
            'subscription',
            sub.id
          )
          result.suspended_overdue++
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Suspend ${sub.id}: ${msg}`)
        }
      }
    }

    // 4. Alertar assinaturas vencendo hoje
    console.log('📋 Checking subscriptions expiring today...')

    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const { data: expiringToday, error: expiringError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'active')
      .eq('billing_status', 'paid')
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', endOfToday.toISOString())

    if (expiringError) {
      result.errors.push(`Expiring today: ${expiringError.message}`)
    } else if (expiringToday && expiringToday.length > 0) {
      for (const sub of expiringToday) {
        try {
          await insertNotification(
            'expiring_today',
            `Vence hoje: ${sub.clinics?.name || 'Clínica'}`,
            `A assinatura da clínica ${sub.clinics?.name || 'N/A'} vence hoje. Renovação urgente para evitar interrupção.`,
            'subscription',
            sub.id
          )
          result.expiring_today_alerts++
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Expiring today ${sub.id}: ${msg}`)
        }
      }
    }

    console.log('✅ Subscription check job completed', result)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('💥 Critical error in subscription check job:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
