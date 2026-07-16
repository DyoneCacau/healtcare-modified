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
  if (roleError) throw new Error('Failed to verify requester role')
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

    const { data: profileRows, error: profileError } = await supabase.rpc('get_admin_by_email', {
      p_email: input.adminEmail,
    })
    if (profileError) throw new Error('Failed to lookup admin')
    const profile = Array.isArray(profileRows) && profileRows.length > 0
      ? profileRows[0] as { user_id: string; name?: string | null }
      : null
    if (!profile?.user_id) throw new HttpError(404, 'Administrador não encontrado')

    const ownerUserId = profile.user_id as string

    const { data: ownedClinics, error: ownedError } = await supabase
      .from('clinics')
      .select('id, organization_id')
      .eq('owner_user_id', ownerUserId)
    if (ownedError) throw new Error('Failed to count clinics')

    let unitCount = ownedClinics?.length ?? 0
    if (unitCount === 0) {
      const { data: memberships, error: membershipError } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', ownerUserId)
        .eq('is_owner', true)
      if (membershipError) throw new Error('Failed to count clinic memberships')
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

    const { data: referenceSub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_id, features_override, plans(id, name, price_monthly, promo_active, promo_price_monthly, max_clinics)')
      .eq('clinic_id', referenceClinicId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (subError) throw new Error('Failed to load reference subscription')
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
    if (orgError || !organizationId) throw new Error('Failed to ensure organization')

    const { data: clinicRow, error: clinicError } = await supabase.from('clinics').insert({
      name: input.name,
      unit_name: input.unit_name,
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
    if (clinicError || !clinicRow) throw new Error('Failed to create clinic')
    createdClinicId = clinicRow.id

    const { error: membershipError } = await supabase.from('clinic_users').insert({
      clinic_id: clinicRow.id,
      user_id: ownerUserId,
      is_owner: true,
    })
    if (membershipError) throw new Error('Failed to create clinic membership')

    const modules = Array.isArray(referenceSub.features_override)
      ? referenceSub.features_override
      : ['dashboard']

    const { data: subscription, error: createSubError } = await supabase.from('subscriptions').insert({
      clinic_id: clinicRow.id,
      plan_id: referenceSub.plan_id,
      status: 'pending',
      billing_mode: input.billingProvider === 'asaas' ? 'manual' : 'manual',
      billing_status: 'pending',
      payment_status: 'pending',
      features_override: modules,
      monthly_fee: monthlyFee,
      setup_fee: input.setupFee,
      admin_notes: 'Nova unidade — cobrança própria por clínica',
    }).select('id').single()
    if (createSubError || !subscription) throw new Error('Failed to create subscription')

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
    console.error(
      'Unexpected add-clinic-unit error',
      error instanceof Error ? error.message : 'unknown',
    )
    return json(req, { error: 'Não foi possível criar a unidade' }, 500)
  }
})
