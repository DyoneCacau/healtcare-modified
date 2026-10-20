import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

const ASSIGNABLE = ['admin', 'receptionist', 'seller', 'professional'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester } } = await supabase.auth.getUser(token)
    if (!requester) return json({ error: 'Unauthorized' }, 401)

    const { data: requesterRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)

    const isSuperAdmin = (requesterRoles || []).some((row) => row.role === 'superadmin')
    const isClinicAdmin = (requesterRoles || []).some((row) => row.role === 'admin')
    if (!isSuperAdmin && !isClinicAdmin) {
      return json({ error: 'Sem permissão para alterar função' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action === 'list' ? 'list' : 'set'

    if (action === 'list') {
      const clinicId = typeof body?.clinic_id === 'string' ? body.clinic_id : ''
      if (!clinicId) return json({ error: 'clinic_id obrigatório' }, 400)
      if (!isSuperAdmin) {
        const { data: membership } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', requester.id)
          .eq('clinic_id', clinicId)
          .maybeSingle()
        if (!membership) return json({ error: 'Sem permissão nesta clínica' }, 403)
      }

      const { data: members, error: membersError } = await supabase
        .from('clinic_users')
        .select('user_id')
        .eq('clinic_id', clinicId)
      if (membersError) return json({ error: membersError.message }, 500)

      const userIds = (members || []).map((row) => row.user_id)
      if (userIds.length === 0) return json({ roles: [] })

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', [...ASSIGNABLE])
      if (rolesError) return json({ error: rolesError.message }, 500)
      return json({ roles: roles || [] })
    }

    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    const role = typeof body?.role === 'string' ? body.role : ''
    if (!userId || !ASSIGNABLE.includes(role as (typeof ASSIGNABLE)[number])) {
      return json({ error: 'Função inválida' }, 400)
    }

    if (!isSuperAdmin) {
      const { data: targetLink } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', userId)
      const targetClinics = new Set((targetLink || []).map((row) => row.clinic_id))
      const { data: mine } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', requester.id)
      const sameClinic = (mine || []).some((row) => targetClinics.has(row.clinic_id))
      if (!sameClinic) return json({ error: 'Sem permissão neste usuário' }, 403)
    }

    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .neq('role', 'superadmin')
      .neq('role', role)
    if (deleteError) return json({ error: deleteError.message }, 500)

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role })
    if (insertError && insertError.code !== '23505') {
      return json({ error: insertError.message }, 500)
    }

    return json({ success: true, user_id: userId, role })
  } catch (error) {
    console.error('set-user-role', error)
    return json({ error: 'Erro interno' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
