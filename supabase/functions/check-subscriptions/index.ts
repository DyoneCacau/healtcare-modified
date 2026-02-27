import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingResult {
  expired_trials: number
  near_expiry_alerts: number
  marked_overdue: number
  suspended_overdue: number
  expiring_today_alerts: number
  errors: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ─── SECURITY: Protect cron job with CRON_SECRET ───
  // Set CRON_SECRET in Supabase Edge Function Secrets.
  // Include it as Authorization: Bearer <secret> in your cron call.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') || ''
    const provided = authHeader.replace('Bearer ', '').trim()
    if (!provided || provided !== cronSecret) {
      console.warn('[SECURITY] Unauthorized check-subscriptions attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    console.log('🔄 Starting subscription check job...')

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const result: ProcessingResult = {
      expired_trials: 0,
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

    // ========================================
    // 1. BLOQUEAR TRIALS EXPIRADOS
    // ========================================
    console.log('📋 Checking expired trials...')

    const { data: expiredTrials, error: trialsError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'trial')
      .lt('trial_ends_at', now.toISOString())

    if (trialsError) {
      console.error('❌ Error fetching expired trials:', trialsError)
      result.errors.push(`Expired trials: ${trialsError.message}`)
    } else if (expiredTrials && expiredTrials.length > 0) {
      console.log(`⏰ Found ${expiredTrials.length} expired trials`)

      for (const sub of expiredTrials) {
        try {
          // Atualizar status para expired
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'expired',
              billing_status: 'overdue',
              payment_status: 'overdue',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) throw updateError

          await insertNotification(
            'trial_expired',
            `Trial expirado: ${sub.clinics?.name || 'Clínica'}`,
            `O período de teste da clínica ${sub.clinics?.name || 'N/A'} expirou.`,
            'subscription',
            sub.id
          )

          result.expired_trials++
        } catch (error) {
          console.error(`❌ Error processing expired trial ${sub.id}:`, error)
          result.errors.push(`Trial ${sub.id}: ${error.message}`)
        }
      }

      console.log(`✅ Expired ${result.expired_trials} trials`)
    } else {
      console.log('✓ No expired trials found')
    }

    // ========================================
    // 2. ALERTAR VENCIMENTOS PRÓXIMOS (3 dias)
    // ========================================
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
      console.log(`⚠️ Found ${nearExpiry.length} subscriptions expiring soon`)

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
          console.error(`❌ Error processing near expiry ${sub.id}:`, error)
          result.errors.push(`Near expiry ${sub.id}: ${error.message}`)
        }
      }

      console.log(`✅ Sent ${result.near_expiry_alerts} renewal reminders`)
    } else {
      console.log('✓ No near expiry subscriptions found')
    }

    // ========================================
    // 3. MARCAR COMO ATRASADO (período já venceu)
    // ========================================
    console.log('📋 Checking expired periods (mark as overdue)...')

    const { data: periodExpired, error: periodExpiredError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'active')
      .eq('billing_status', 'paid')
      .lt('current_period_end', now.toISOString())

    if (periodExpiredError) {
      console.error('❌ Error fetching period expired:', periodExpiredError)
      result.errors.push(`Period expired: ${periodExpiredError.message}`)
    } else if (periodExpired && periodExpired.length > 0) {
      console.log(`⏰ Found ${periodExpired.length} subscriptions with expired period`)

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
          console.error(`❌ Error marking overdue ${sub.id}:`, error)
          result.errors.push(`Mark overdue ${sub.id}: ${error.message}`)
        }
      }
      console.log(`✅ Marked ${result.marked_overdue} as overdue`)
    } else {
      console.log('✓ No expired periods to mark')
    }

    // ========================================
    // 4. SUSPENDER INADIMPLENTES (7 dias após vencimento)
    // ========================================
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
      console.error('❌ Error fetching overdue subscriptions:', overdueError)
      result.errors.push(`Overdue: ${overdueError.message}`)
    } else if (overdue && overdue.length > 0) {
      console.log(`🚫 Found ${overdue.length} overdue subscriptions to suspend`)

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
          console.error(`❌ Error suspending ${sub.id}:`, error)
          result.errors.push(`Suspend ${sub.id}: ${error.message}`)
        }
      }
      console.log(`✅ Suspended ${result.suspended_overdue} overdue subscriptions`)
    } else {
      console.log('✓ No overdue subscriptions to suspend')
    }

    // ========================================
    // 5. ALERTAR ASSINATURAS VENCENDO HOJE (ainda válidas)
    // ========================================
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
      console.error('❌ Error fetching expiring today:', expiringError)
      result.errors.push(`Expiring today: ${expiringError.message}`)
    } else if (expiringToday && expiringToday.length > 0) {
      console.log(`📅 Found ${expiringToday.length} subscriptions expiring today`)

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
          console.error(`❌ Error processing expiring today ${sub.id}:`, error)
          result.errors.push(`Expiring today ${sub.id}: ${error.message}`)
        }
      }
      console.log(`✅ Sent ${result.expiring_today_alerts} expiring today alerts`)
    } else {
      console.log('✓ No subscriptions expiring today')
    }

    console.log('✅ Subscription check job completed')
    console.log('📊 Results:', JSON.stringify(result, null, 2))

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
    console.error('💥 Critical error in subscription check job:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
