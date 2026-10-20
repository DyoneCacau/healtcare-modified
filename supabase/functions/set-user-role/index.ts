import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || 'https://www.healthcare.app.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

function withCors(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowed = origin.endsWith('healthcare.app.br') || origin === 'http://localhost:8080'
    ? origin
    : (Deno.env.get('APP_URL') || 'https://www.healthcare.app.br')
  return { ...corsHeaders, 'Access-Control-Allow-Origin': allowed }
}

const ASSIGNABLE = ['admin', 'receptionist', 'seller', 'professional'] as const

Deno.serve(async (req) => {
  activeRequest = req
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: withCors(req) })
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
    const action = body?.action === 'list' || body?.action === 'attach' ? body.action : 'set'

    if (action === 'attach') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      const role = typeof body?.role === 'string' ? body.role : ''
      const clinicIds = Array.isArray(body?.clinic_ids)
        ? body.clinic_ids.filter((id: unknown) => typeof id === 'string' && id)
        : []
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
      if (!email || !ASSIGNABLE.includes(role as (typeof ASSIGNABLE)[number]) || clinicIds.length === 0) {
        return json({ error: 'Dados inválidos para vincular o usuário' }, 400)
      }
      if (!isSuperAdmin) {
        const { data: mine } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', requester.id)
        const allowed = new Set((mine || []).map((row) => row.clinic_id))
        if (clinicIds.some((id: string) => !allowed.has(id))) {
          return json({ error: 'Sem permissão nesta clínica' }, 403)
        }
      }

      const userId = await findUserIdByEmail(supabase, supabaseUrl, supabaseServiceKey, email)
      if (!userId) return json({ found: false })

      const { error: linkError } = await supabase.from('clinic_users').upsert(
        clinicIds.map((clinicId: string) => ({
          clinic_id: clinicId,
          user_id: userId,
          is_owner: false,
        })),
        { onConflict: 'clinic_id,user_id', ignoreDuplicates: true },
      )
      if (linkError) return json({ error: linkError.message }, 500)

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role', 'superadmin')
        .neq('role', role)
      if (deleteError) return json({ error: deleteError.message }, 500)

      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role })
      if (insertError && insertError.code !== '23505') return json({ error: insertError.message }, 500)

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: userId,
          name: name || email.split('@')[0],
          email,
          phone: phone || null,
          is_active: true,
        })
        if (profileError) return json({ error: profileError.message }, 500)
      } else if (name || phone) {
        await supabase.from('profiles').update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          email,
        }).eq('user_id', userId)
      }

      return json({ found: true, attached: true, user_id: userId, role })
    }

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
        .in('role', [...ASSIGNABLE, 'superadmin'])
      if (rolesError) return json({ error: rolesError.message }, 500, req)
      return json({ roles: roles || [] }, 200, req)
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
      return json({ error: insertError.message }, 500, req)
    }

    const { data: saved, error: savedError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle()
    if (savedError || !saved) {
      return json({ error: 'A função não ficou gravada.' }, 500, req)
    }

    return json({ success: true, user_id: userId, role: saved.role }, 200, req)
  } catch (error) {
    console.error('set-user-role', error)
    return json({ error: 'Erro interno' }, 500, req)
  }
})

let activeRequest: Request | null = null

function json(body: unknown, status = 200, req?: Request) {
  const source = req || activeRequest
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...(source ? withCors(source) : corsHeaders), 'Content-Type': 'application/json' },
  })
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  email: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('email', email)
    .maybeSingle()
  if (profile?.user_id) return profile.user_id

  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  )
  if (!response.ok) return null
  const payload = await response.json()
  const users = Array.isArray(payload?.users) ? payload.users : []
  const match = users.find((user: { email?: string; id?: string }) =>
    (user.email || '').toLowerCase() === email
  )
  return match?.id ?? null
}
