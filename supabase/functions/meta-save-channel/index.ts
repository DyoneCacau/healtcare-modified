import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const appUrl = Deno.env.get('APP_URL') || 'null'
const corsHeaders = {
  'Access-Control-Allow-Origin': appUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders })

const isUuid = (value: unknown): value is string =>
  typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const bearer = req.headers.get('authorization')
    const token = bearer?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return json({ error: 'Não autenticado' }, 401)

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) return json({ error: 'Serviço não configurado' }, 503)

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Sessão inválida' }, 401)

    const body = await req.json().catch(() => null) as {
      id?: unknown
      clinic_id?: unknown
      display_name?: unknown
      phone_number?: unknown
      phone_number_id?: unknown
      waba_id?: unknown
      access_token?: unknown
    } | null

    if (!body || !isUuid(body.clinic_id)) return json({ error: 'Clínica inválida' }, 400)
    if (body.id !== undefined && !isUuid(body.id)) return json({ error: 'Canal inválido' }, 400)
    if (typeof body.display_name !== 'string' || body.display_name.trim().length < 2
      || body.display_name.length > 120) {
      return json({ error: 'Nome do canal inválido' }, 400)
    }
    if (typeof body.phone_number_id !== 'string'
      || !/^[0-9]{5,30}$/.test(body.phone_number_id)) {
      return json({ error: 'Phone Number ID inválido' }, 400)
    }
    if (body.access_token !== undefined
      && (typeof body.access_token !== 'string'
        || body.access_token.length < 20
        || body.access_token.length > 5000)) {
      return json({ error: 'Token Meta inválido' }, 400)
    }

    const [{ data: membership }, { data: superadminRole }, { data: adminRole }] = await Promise.all([
      supabase.from('clinic_users').select('is_owner')
        .eq('clinic_id', body.clinic_id).eq('user_id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role')
        .eq('user_id', user.id).eq('role', 'superadmin').maybeSingle(),
      supabase.from('user_roles').select('role')
        .eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
    ])
    const canManage = Boolean(superadminRole)
      || Boolean(membership && (membership.is_owner === true || adminRole))
    if (!canManage) return json({ error: 'Sem permissão para configurar o canal' }, 403)

    const row: Record<string, unknown> = {
      clinic_id: body.clinic_id,
      channel_type: 'whatsapp',
      display_name: body.display_name.trim(),
      phone_number: typeof body.phone_number === 'string'
        ? body.phone_number.replace(/\D/g, '').slice(0, 20)
        : null,
      phone_number_id: body.phone_number_id,
      waba_id: typeof body.waba_id === 'string' ? body.waba_id.trim().slice(0, 100) : null,
      status: 'active',
      updated_at: new Date().toISOString(),
    }
    if (typeof body.access_token === 'string') row.access_token = body.access_token

    const query = body.id
      ? supabase.from('chat_channels').update(row)
        .eq('id', body.id).eq('clinic_id', body.clinic_id)
      : supabase.from('chat_channels').insert(row)
    const { data: channel, error } = await query
      .select('id, clinic_id, channel_type, display_name, phone_number, waba_id, phone_number_id, status, metadata, created_at, updated_at')
      .single()
    if (error) {
      console.error('meta-save-channel database error', { code: error.code })
      return json({ error: 'Não foi possível salvar o canal' }, 500)
    }

    return json({ channel, has_token: true })
  } catch (error) {
    console.error('meta-save-channel unexpected error', error instanceof Error ? error.name : 'unknown')
    return json({ error: 'Erro interno ao salvar canal' }, 500)
  }
})
