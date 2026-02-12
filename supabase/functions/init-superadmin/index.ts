import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-init-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ─── SECURITY: Protected by INIT_SECRET env var ───
  // Configure in: Supabase Dashboard > Edge Functions > Secrets > INIT_SECRET
  const initSecret = Deno.env.get('INIT_SECRET')
  if (!initSecret) {
    console.error('INIT_SECRET not configured — function disabled for safety')
    return new Response(
      JSON.stringify({ error: 'Function disabled. Set INIT_SECRET to enable.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let body: { email?: string; password?: string; name?: string; secret?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const providedSecret = req.headers.get('x-init-secret') || body.secret
  if (!providedSecret || providedSecret !== initSecret) {
    console.warn(`[SECURITY] Unauthorized init-superadmin attempt`)
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { email, password, name } = body

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 12) {
      return new Response(
        JSON.stringify({ error: 'Superadmin password must be at least 12 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    let userId: string

    if (existingUser) {
      userId = existingUser.id
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password, email_confirm: true
      })
      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name: name || 'Super Admin' }
      })
      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create user', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userId = newUser.user.id
    }

    await supabase.from('profiles').upsert({
      user_id: userId, name: name || 'Super Admin', email, is_active: true,
    }, { onConflict: 'user_id' })

    await supabase.from('user_roles').delete().eq('user_id', userId)
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId, role: 'superadmin',
    })

    if (roleError) {
      return new Response(
        JSON.stringify({ error: 'Failed to assign role', details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[SECURITY] Superadmin provisioned: ${email}`)
    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
