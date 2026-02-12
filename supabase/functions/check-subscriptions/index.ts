import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingResult {
  expired_trials: number
  near_expiry_alerts: number
  suspended_overdue: number
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
      suspended_overdue: 0,
      errors: [],
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
              payment_status: 'overdue',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) {
            throw updateError
          }

          // TODO: Enviar email de trial expirado
          console.log(`📧 TODO: Send trial expired email to clinic ${sub.clinics?.name}`)

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
      .lt('current_period_end', threeDaysFromNow.toISOString())
      .gt('current_period_end', now.toISOString())

    if (nearExpiryError) {
      console.error('❌ Error fetching near expiry subscriptions:', nearExpiryError)
      result.errors.push(`Near expiry: ${nearExpiryError.message}`)
    } else if (nearExpiry && nearExpiry.length > 0) {
      console.log(`⚠️ Found ${nearExpiry.length} subscriptions expiring soon`)

      for (const sub of nearExpiry) {
        try {
          // TODO: Enviar email de lembrete de renovação
          console.log(`📧 TODO: Send renewal reminder to clinic ${sub.clinics?.name}`)

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
    // 3. SUSPENDER INADIMPLENTES (7 dias após vencimento)
    // ========================================
    console.log('📋 Checking overdue subscriptions...')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: overdue, error: overdueError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .in('status', ['active', 'expired'])
      .eq('payment_status', 'overdue')
      .lt('current_period_end', sevenDaysAgo.toISOString())

    if (overdueError) {
      console.error('❌ Error fetching overdue subscriptions:', overdueError)
      result.errors.push(`Overdue: ${overdueError.message}`)
    } else if (overdue && overdue.length > 0) {
      console.log(`🚫 Found ${overdue.length} overdue subscriptions to suspend`)

      for (const sub of overdue) {
        try {
          // Atualizar status para suspended
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'suspended',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) {
            throw updateError
          }

          // TODO: Enviar email de suspensão
          console.log(`📧 TODO: Send suspension email to clinic ${sub.clinics?.name}`)

          result.suspended_overdue++
        } catch (error) {
          console.error(`❌ Error processing overdue ${sub.id}:`, error)
          result.errors.push(`Overdue ${sub.id}: ${error.message}`)
        }
      }

      console.log(`✅ Suspended ${result.suspended_overdue} overdue subscriptions`)
    } else {
      console.log('✓ No overdue subscriptions found')
    }

    // ========================================
    // 4. ALERTAR ASSINATURAS VENCIDAS HOJE
    // ========================================
    console.log('📋 Checking subscriptions expiring today...')

    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const { data: expiringToday, error: expiringError } = await supabase
      .from('subscriptions')
      .select('*, clinics(*)')
      .eq('status', 'active')
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', endOfToday.toISOString())

    if (expiringError) {
      console.error('❌ Error fetching expiring today:', expiringError)
      result.errors.push(`Expiring today: ${expiringError.message}`)
    } else if (expiringToday && expiringToday.length > 0) {
      console.log(`📅 Found ${expiringToday.length} subscriptions expiring today`)

      for (const sub of expiringToday) {
        try {
          // Marcar como overdue se não renovado
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              payment_status: 'overdue',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (updateError) {
            throw updateError
          }

          // TODO: Enviar email urgente
          console.log(`📧 TODO: Send urgent payment email to clinic ${sub.clinics?.name}`)
        } catch (error) {
          console.error(`❌ Error processing expiring today ${sub.id}:`, error)
          result.errors.push(`Expiring today ${sub.id}: ${error.message}`)
        }
      }
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
