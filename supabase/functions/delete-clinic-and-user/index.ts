import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester } } = await supabase.auth.getUser(token)
    if (!requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)
      .eq('role', 'superadmin')
      .maybeSingle()
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Apenas superadmin pode excluir clínica e usuário.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let body: { clinic_id?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const clinic_id = body?.clinic_id
    if (!clinic_id) {
      return new Response(JSON.stringify({ error: 'clinic_id é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, owner_user_id')
      .eq('id', clinic_id)
      .single()
    if (clinicError || !clinic) {
      return new Response(JSON.stringify({ error: 'Clínica não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let userIdToDelete: string | null = clinic.owner_user_id
    if (!userIdToDelete) {
      const { data: ownerRow } = await supabase
        .from('clinic_users')
        .select('user_id')
        .eq('clinic_id', clinic_id)
        .eq('is_owner', true)
        .limit(1)
        .maybeSingle()
      userIdToDelete = ownerRow?.user_id ?? null
    }

    const { data: subIds } = await supabase.from('subscriptions').select('id').eq('clinic_id', clinic_id)
    const subscriptionIds = (subIds || []).map((s: { id: string }) => s.id)
    for (const sid of subscriptionIds) {
      await supabase.from('payment_history').delete().eq('subscription_id', sid)
    }

    await supabase.from('cash_closings').delete().eq('clinic_id', clinic_id)
    await supabase.from('financial_transactions').delete().eq('clinic_id', clinic_id)
    await supabase.from('appointments').delete().eq('clinic_id', clinic_id)
    await supabase.from('patients').delete().eq('clinic_id', clinic_id)
    await supabase.from('professionals').delete().eq('clinic_id', clinic_id)
    await supabase.from('terms').delete().eq('clinic_id', clinic_id)
    await supabase.from('upgrade_requests').delete().eq('clinic_id', clinic_id)
    await supabase.from('commissions').delete().eq('clinic_id', clinic_id)
    await supabase.from('inventory_movements').delete().eq('clinic_id', clinic_id)
    await supabase.from('inventory_products').delete().eq('clinic_id', clinic_id)
    await supabase.from('subscriptions').delete().eq('clinic_id', clinic_id)
    await supabase.from('clinic_users').delete().eq('clinic_id', clinic_id)
    await supabase.from('clinics').delete().eq('id', clinic_id)

    if (userIdToDelete) {
      await supabase.from('user_roles').delete().eq('user_id', userIdToDelete)
      await supabase.from('profiles').delete().eq('user_id', userIdToDelete)
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(userIdToDelete)
      if (delAuthErr) console.error('auth.users delete:', delAuthErr)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Clínica e usuário excluídos.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('delete-clinic-and-user:', error)
    return new Response(
      JSON.stringify({ error: 'Erro ao excluir', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
