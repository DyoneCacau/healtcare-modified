import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const MAX_BODY_BYTES = 32_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function configuredOrigin(): string {
  const appUrl = Deno.env.get('APP_URL')
  if (!appUrl) throw new HttpError(503, 'Serviço temporariamente indisponível')
  try {
    return new URL(appUrl).origin
  } catch {
    throw new HttpError(503, 'Serviço temporariamente indisponível')
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigin = configuredOrigin()
  const requestOrigin = req.headers.get('origin')
  return {
    'Access-Control-Allow-Origin': requestOrigin === allowedOrigin ? allowedOrigin : 'null',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, '
      + 'x-supabase-client-platform, x-supabase-client-platform-version, '
      + 'x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  let headers: Record<string, string>
  try {
    headers = corsHeaders(req)
  } catch {
    headers = { 'Content-Type': 'application/json', 'Vary': 'Origin' }
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

function assertAllowedOrigin(req: Request): void {
  const requestOrigin = req.headers.get('origin')
  if (requestOrigin && requestOrigin !== configuredOrigin()) {
    throw new HttpError(403, 'Origem não autorizada')
  }
}

function requiredString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, `${field} inválido`)
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw new HttpError(400, `${field} inválido`)
  }
  return normalized
}

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new HttpError(400, `${field} inválido`)
  const normalized = value.trim()
  if (normalized.length > max) throw new HttpError(400, `${field} inválido`)
  return normalized || null
}

function validMoney(value: unknown, field: string): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new HttpError(400, `${field} inválido`)
  }
  return Math.round(value * 100) / 100
}

function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false
  const calculateDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculateDigit(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digits.endsWith(`${first}${second}`)
}

function dbErrorMessage(
  step: string,
  error: { message?: string; code?: string; details?: string; hint?: string } | null,
): string {
  const parts = [step, error?.code, error?.message, error?.details, error?.hint]
    .filter((part): part is string => Boolean(part && String(part).trim()))
  return parts.join(' | ')
}

function slugifyClinicName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return `${base || 'clinica'}-${suffix}`
}

function parseModules(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      }
    } catch {
      /* ignore */
    }
  }
  return []
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service configuration')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireSuperadmin(req: Request, supabase: SupabaseClient): Promise<void> {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new HttpError(401, 'Não autenticado')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) throw new HttpError(401, 'Sessão inválida')
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'superadmin')
    .maybeSingle()
  if (roleError) throw new Error(dbErrorMessage('Falha ao verificar perfil', roleError))
  if (!role) throw new HttpError(403, 'Operação permitida apenas para superadmin')
}

interface UnitPayload {
  adminEmail: string
  name: string
  unit_name: string | null
  cnpj: string
  address: string | null
  address_number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipcode: string | null
  phone: string | null
  email: string | null
  setupFee: number
  billingDay: number
  billingDeferDays: number
  billingFirstDueDate: string | null
  billingProvider: 'manual' | 'asaas'
}

function validatePayload(value: unknown): UnitPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Payload inválido')
  }
  const body = value as Record<string, unknown>
  const adminEmail = requiredString(body.adminEmail, 'Email do administrador', 3, 254).toLowerCase()
  if (!EMAIL_PATTERN.test(adminEmail)) throw new HttpError(400, 'Email do administrador inválido')

  const cnpj = requiredString(body.cnpj, 'CNPJ', 14, 18).replace(/\D/g, '')
  if (!isValidCnpj(cnpj)) throw new HttpError(400, 'CNPJ inválido')

  const state = optionalString(body.state, 'estado', 2)?.toUpperCase() ?? null
  if (state && !/^[A-Z]{2}$/.test(state)) throw new HttpError(400, 'Estado inválido')
  const zipcode = optionalString(body.zipcode, 'CEP', 9)?.replace(/\D/g, '') ?? null
  if (zipcode && !/^\d{8}$/.test(zipcode)) throw new HttpError(400, 'CEP inválido')

  const billingProvider = body.billingProvider === 'asaas' ? 'asaas' : 'manual'
  const rawBillingDay = body.billingDay
  let billingDay = 10
  if (rawBillingDay !== undefined && rawBillingDay !== null && rawBillingDay !== '') {
    if (
      typeof rawBillingDay !== 'number'
      || !Number.isInteger(rawBillingDay)
      || rawBillingDay < 1
      || rawBillingDay > 28
    ) {
      throw new HttpError(400, 'Dia de vencimento inválido (use 1 a 28)')
    }
    billingDay = rawBillingDay
  }

  const rawDefer = body.billingDeferDays
  let billingDeferDays = 0
  if (rawDefer !== undefined && rawDefer !== null && rawDefer !== '') {
    if (typeof rawDefer !== 'number' || ![0, 30, 60].includes(rawDefer)) {
      throw new HttpError(400, 'Atraso da cobrança inválido (use 0, 30 ou 60)')
    }
    billingDeferDays = rawDefer
  }

  let billingFirstDueDate: string | null = null
  const rawFirstDue = body.billingFirstDueDate
  if (typeof rawFirstDue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawFirstDue)) {
    const today = new Date().toISOString().slice(0, 10)
    if (rawFirstDue <= today) {
      throw new HttpError(400, 'A data da 1ª mensalidade deve ser futura')
    }
    billingFirstDueDate = rawFirstDue
  }

  return {
    adminEmail,
    name: requiredString(body.name, 'Nome da clínica', 2, 160),
    unit_name: optionalString(body.unit_name, 'Unidade', 120),
    cnpj,
    address: optionalString(body.address, 'Endereço', 200),
    address_number: optionalString(body.address_number, 'Número', 30),
    neighborhood: optionalString(body.neighborhood, 'Bairro', 100),
    city: optionalString(body.city, 'Cidade', 100),
    state,
    zipcode,
    phone: optionalString(body.phone, 'Telefone', 30),
    email: optionalString(body.email, 'Email da clínica', 254)?.toLowerCase() ?? null,
    setupFee: validMoney(body.setupFee, 'Taxa de adesão'),
    billingDay,
    billingDeferDays,
    billingFirstDueDate,
    billingProvider,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    try {
      assertAllowedOrigin(req)
      return new Response(null, { status: 204, headers: corsHeaders(req) })
    } catch (error) {
      return json(
        req,
        { error: error instanceof HttpError ? error.message : 'Serviço indisponível' },
        error instanceof HttpError ? error.status : 503,
      )
    }
  }
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  let createdClinicId: string | null = null
  let supabase: SupabaseClient | null = null

  try {
    assertAllowedOrigin(req)
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'Content-Type inválido')
    }
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) throw new HttpError(413, 'Payload muito grande')

    supabase = serviceClient()
    await requireSuperadmin(req, supabase)

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Payload muito grande')
    }
    let decoded: unknown
    try {
      decoded = JSON.parse(rawBody)
    } catch {
      throw new HttpError(400, 'JSON inválido')
    }
    const input = validatePayload(decoded)

    // Service role: busca direta (RPC antiga barrava service_role com "Acesso negado")
    let profile: { user_id: string; name?: string | null } | null = null

    const { data: profileByEmail, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .ilike('email', input.adminEmail)
      .limit(1)
      .maybeSingle()
    if (profileError) {
      throw new Error(dbErrorMessage('Falha ao buscar administrador em profiles', profileError))
    }
    if (profileByEmail?.user_id) {
      profile = { user_id: profileByEmail.user_id, name: profileByEmail.name }
    } else {
      // Fallback RPC (após PRODUCAO_18 aceita service_role)
      const { data: profileRows, error: rpcError } = await supabase.rpc('get_admin_by_email', {
        p_email: input.adminEmail,
      })
      if (rpcError) {
        throw new Error(dbErrorMessage('Falha ao buscar administrador', rpcError))
      }
      const row = Array.isArray(profileRows) && profileRows.length > 0
        ? profileRows[0] as { user_id: string; name?: string | null }
        : null
      if (row?.user_id) profile = row
    }
    if (!profile?.user_id) throw new HttpError(404, 'Administrador não encontrado')

    const ownerUserId = profile.user_id

    const { data: ownedClinics, error: ownedError } = await supabase
      .from('clinics')
      .select('id, organization_id')
      .eq('owner_user_id', ownerUserId)
    if (ownedError) throw new Error(dbErrorMessage('Falha ao listar clínicas do dono', ownedError))

    let unitCount = ownedClinics?.length ?? 0
    if (unitCount === 0) {
      const { data: memberships, error: membershipError } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', ownerUserId)
        .eq('is_owner', true)
      if (membershipError) {
        throw new Error(dbErrorMessage('Falha ao listar memberships', membershipError))
      }
      unitCount = memberships?.length ?? 0
      if (unitCount === 0) {
        throw new HttpError(409, 'Administrador não é dono de nenhuma clínica')
      }
    }

    const referenceClinicId = ownedClinics?.[0]?.id
      ?? (await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', ownerUserId)
        .eq('is_owner', true)
        .limit(1)
        .maybeSingle()).data?.clinic_id

    if (!referenceClinicId) {
      throw new HttpError(409, 'Não foi possível localizar a clínica de referência')
    }

    const { data: referenceRows, error: subError } = await supabase
      .from('subscriptions')
      .select(
        'plan_id, features_override, plans(id, name, price_monthly, promo_active, promo_price_monthly, max_clinics)',
      )
      .eq('clinic_id', referenceClinicId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (subError) throw new Error(dbErrorMessage('Falha ao carregar assinatura de referência', subError))

    const referenceSub = Array.isArray(referenceRows) && referenceRows.length > 0
      ? referenceRows[0]
      : null
    if (!referenceSub?.plan_id) {
      throw new HttpError(409, 'Cliente sem plano. Use Criar Cliente Completo.')
    }

    const plan = referenceSub.plans as unknown as {
      id: string
      name: string
      price_monthly: number
      promo_active: boolean | null
      promo_price_monthly: number | null
      max_clinics: number | null
    } | null
    if (!plan) throw new HttpError(409, 'Plano de referência não encontrado')

    const maxClinics = Number(plan.max_clinics ?? 999)
    if (Number.isFinite(maxClinics) && maxClinics > 0 && unitCount >= maxClinics) {
      throw new HttpError(
        409,
        `Limite do plano atingido: ${unitCount}/${maxClinics} unidade(s)`,
      )
    }

    const monthlyFee = Number(
      plan.promo_active && plan.promo_price_monthly != null
        ? plan.promo_price_monthly
        : plan.price_monthly,
    )
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      throw new HttpError(409, 'Plano sem mensalidade válida para cobrança')
    }

    const { data: organizationId, error: orgError } = await supabase.rpc(
      'ensure_organization_for_owner',
      {
        p_owner_user_id: ownerUserId,
        p_name: `${profile.name || input.name} — Grupo`,
      },
    )
    if (orgError || !organizationId) {
      throw new Error(
        dbErrorMessage(
          'Falha ao garantir organização (rode PRODUCAO_03_ORGANIZATIONS.sql se ainda não rodou)',
          orgError,
        ),
      )
    }

    const { data: clinicRow, error: clinicError } = await supabase.from('clinics').insert({
      name: input.name,
      unit_name: input.unit_name,
      slug: slugifyClinicName(input.name),
      cnpj: input.cnpj,
      address: input.address,
      address_number: input.address_number,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      zip_code: input.zipcode,
      phone: input.phone,
      email: input.email || input.adminEmail,
      owner_user_id: ownerUserId,
      organization_id: organizationId,
    }).select('id').single()
    if (clinicError || !clinicRow) {
      throw new Error(dbErrorMessage('Falha ao criar clínica', clinicError))
    }
    createdClinicId = clinicRow.id

    const { error: membershipError } = await supabase.from('clinic_users').insert({
      clinic_id: clinicRow.id,
      user_id: ownerUserId,
      is_owner: true,
    })
    if (membershipError) {
      throw new Error(dbErrorMessage('Falha ao vincular dono à clínica', membershipError))
    }

    const modules = parseModules(referenceSub.features_override)

    const { data: subscription, error: createSubError } = await supabase.from('subscriptions').insert({
      clinic_id: clinicRow.id,
      plan_id: referenceSub.plan_id,
      status: 'pending',
      billing_mode: 'manual',
      billing_status: 'pending',
      payment_status: 'pending',
      features_override: modules.length > 0 ? modules : ['dashboard', 'administracao'],
      monthly_fee: monthlyFee,
      setup_fee: input.setupFee,
      billing_day: input.billingDay,
      billing_defer_days: input.billingDeferDays,
      billing_first_due_date: input.billingFirstDueDate,
      admin_notes: 'Nova unidade — cobrança própria por clínica',
    }).select('id').single()
    if (createSubError || !subscription) {
      throw new Error(dbErrorMessage('Falha ao criar assinatura da unidade', createSubError))
    }

    return json(req, {
      clinic_id: clinicRow.id,
      subscription_id: subscription.id,
      organization_id: organizationId,
      plan_id: referenceSub.plan_id,
      plan_name: plan.name,
      monthly_fee: monthlyFee,
      setup_fee: input.setupFee,
      billing_provider: input.billingProvider,
      unit_count: unitCount + 1,
      max_clinics: maxClinics,
    }, 201)
  } catch (error) {
    if (supabase && createdClinicId) {
      await supabase.from('clinics').delete().eq('id', createdClinicId)
    }
    if (error instanceof HttpError) return json(req, { error: error.message }, error.status)
    const message = error instanceof Error ? error.message : 'Não foi possível criar a unidade'
    console.error('Unexpected add-clinic-unit error', message)
    return json(req, { error: message }, 500)
  }
})
