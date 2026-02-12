import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

interface CreateClinicRequest {
  user_id: string;
  user_email: string;
  user_name: string;
  clinic_name: string;
  phone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id, user_email, user_name, clinic_name, phone } = await req.json() as CreateClinicRequest

    if (!user_id || !user_email || !clinic_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create the clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name: clinic_name,
        email: user_email,
        phone: phone || null,
        owner_user_id: user_id,
        is_active: true,
      })
      .select()
      .single()

    if (clinicError) {
      console.error('Error creating clinic:', clinicError)
      return new Response(
        JSON.stringify({ error: 'Failed to create clinic', details: clinicError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get trial plan
    const { data: trialPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', 'trial')
      .single()

    // 3. Create subscription with 7-day trial
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        clinic_id: clinic.id,
        plan_id: trialPlan?.id || null,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_status: 'pending',
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndsAt.toISOString(),
      })

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
    }

    // 4. Link user to clinic
    const { error: clinicUserError } = await supabase
      .from('clinic_users')
      .insert({
        clinic_id: clinic.id,
        user_id: user_id,
        is_owner: true,
      })

    if (clinicUserError) {
      console.error('Error linking user to clinic:', clinicUserError)
    }

    // 5. Give user admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user_id,
        role: 'admin',
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clinic_id: clinic.id,
        message: 'Clinic created with 7-day trial'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
