import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const MAX_BODY_BYTES = 64_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AVAILABLE_MODULES = new Set([
  'dashboard',
  'agenda',
  'pacientes',
  'pacientes_basico',
  'profissionais',
  'financeiro',
  'financeiro_basico',
  'comissoes',
  'estoque',
  'relatorios',
  'ponto',
  'administracao',
  'termos',
  'multi_clinica',
])

interface ClinicInput {
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
}

interface ClientInput {
  adminName: string
  adminEmail: string
  adminPassword: string
  adminPhone: string | null
  clinics: ClinicInput[]
  planId: string
  modules: string[]
  setupFee: number
  billingDay: number
  billingDeferDays: number
  billingFirstDueDate: string | null
  adminNotes: string | null
}

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
  if (!requestOrigin) return
  const allowed = configuredOrigin()
  if (requestOrigin !== allowed) {
    throw new HttpError(403, `Origem não autorizada. Use APP_URL=${allowed}`)
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

function validEmail(value: unknown, field: string, required: boolean): string | null {
  const email = required
    ? requiredString(value, field, 3, 254).toLowerCase()
    : optionalString(value, field, 254)?.toLowerCase() ?? null
  if (email && !EMAIL_PATTERN.test(email)) throw new HttpError(400, `${field} inválido`)
  return email
}

function validPassword(value: unknown): string {
  const hasControlCharacter = typeof value === 'string'
    && [...value].some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
  if (
    typeof value !== 'string'
    || value.length < 12
    || value.length > 128
    || hasControlCharacter
  ) {
    throw new HttpError(400, 'Senha inválida')
  }
  return value
}

function validMoney(value: unknown, field: string): number {
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

function validatePayload(value: unknown): ClientInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Payload inválido')
  }
  const body = value as Record<string, unknown>
  const adminName = requiredString(body.adminName, 'Nome do administrador', 2, 120)
  const adminEmail = validEmail(body.adminEmail, 'Email do administrador', true)!
  const adminPassword = validPassword(body.adminPassword)
  const adminPhone = optionalString(body.adminPhone, 'Telefone do administrador', 30)

  if (!Array.isArray(body.clinics) || body.clinics.length < 1 || body.clinics.length > 20) {
    throw new HttpError(400, 'Informe entre 1 e 20 clínicas')
  }
  const cnpjs = new Set<string>()
  const clinics = body.clinics.map((rawClinic, index): ClinicInput => {
    if (!rawClinic || typeof rawClinic !== 'object' || Array.isArray(rawClinic)) {
      throw new HttpError(400, `Clínica ${index + 1} inválida`)
    }
    const clinic = rawClinic as Record<string, unknown>
    const prefix = `Clínica ${index + 1}`
    const cnpj = requiredString(clinic.cnpj, `${prefix}: CNPJ`, 14, 18).replace(/\D/g, '')
    if (!isValidCnpj(cnpj)) throw new HttpError(400, `${prefix}: CNPJ inválido`)
    if (cnpjs.has(cnpj)) throw new HttpError(400, 'CNPJ duplicado no cadastro')
    cnpjs.add(cnpj)

    const state = optionalString(clinic.state, `${prefix}: estado`, 2)?.toUpperCase() ?? null
    if (state && !/^[A-Z]{2}$/.test(state)) throw new HttpError(400, `${prefix}: estado inválido`)
    const zipcode = optionalString(clinic.zipcode, `${prefix}: CEP`, 9)?.replace(/\D/g, '') ?? null
    if (zipcode && !/^\d{8}$/.test(zipcode)) throw new HttpError(400, `${prefix}: CEP inválido`)

    return {
      name: requiredString(clinic.name, `${prefix}: nome`, 2, 160),
      unit_name: optionalString(clinic.unit_name, `${prefix}: unidade`, 120),
      cnpj,
      address: optionalString(clinic.address, `${prefix}: endereço`, 200),
      address_number: optionalString(clinic.address_number, `${prefix}: número`, 30),
      neighborhood: optionalString(clinic.neighborhood, `${prefix}: bairro`, 100),
      city: optionalString(clinic.city, `${prefix}: cidade`, 100),
      state,
      zipcode,
      phone: optionalString(clinic.phone, `${prefix}: telefone`, 30),
      email: validEmail(clinic.email, `${prefix}: email`, false),
    }
  })

  const planId = requiredString(body.planId, 'Plano', 36, 36)
  if (!UUID_PATTERN.test(planId)) throw new HttpError(400, 'Plano inválido')
  if (!Array.isArray(body.modules) || body.modules.length < 1 || body.modules.length > AVAILABLE_MODULES.size) {
    throw new HttpError(400, 'Módulos inválidos')
  }
  const modules = [...new Set(body.modules.map((module) => {
    if (typeof module !== 'string' || !AVAILABLE_MODULES.has(module)) {
      throw new HttpError(400, 'Módulos inválidos')
    }
    return module
  }))]
  if (!modules.includes('dashboard')) throw new HttpError(400, 'O módulo Dashboard é obrigatório')

  const rawBillingDay = body.billingDay
  let billingDay = 10
  if (rawBillingDay !== undefined && rawBillingDay !== null && rawBillingDay !== '') {
    if (typeof rawBillingDay !== 'number' || !Number.isInteger(rawBillingDay) || rawBillingDay < 1 || rawBillingDay > 28) {
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
    adminName,
    adminEmail,
    adminPassword,
    adminPhone,
    clinics,
    planId,
    modules,
    setupFee: validMoney(body.setupFee, 'Taxa de adesão'),
    billingDay,
    billingDeferDays,
    billingFirstDueDate,
    adminNotes: optionalString(body.adminNotes, 'Notas administrativas', 2_000),
  }
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

async function compensate(supabase: SupabaseClient, clinicIds: string[], userId: string | null): Promise<void> {
  if (clinicIds.length > 0) {
    const { error } = await supabase.from('clinics').delete().in('id', clinicIds)
    if (error) console.error('Client creation compensation failed for clinics', error.code)
  }
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) console.error('Client creation compensation failed for auth user', error.status)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    try {
      assertAllowedOrigin(req)
      return new Response(null, { status: 204, headers: corsHeaders(req) })
    } catch (error) {
      return json(req, { error: error instanceof HttpError ? error.message : 'Serviço indisponível' },
        error instanceof HttpError ? error.status : 503)
    }
  }
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  let supabase: SupabaseClient | null = null
  let createdUserId: string | null = null
  const createdClinicIds: string[] = []

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

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, price_monthly, promo_active, promo_price_monthly, max_clinics')
      .eq('id', input.planId)
      .maybeSingle()
    if (planError) throw new Error(dbErrorMessage('Failed to validate plan', planError))
    if (!plan) throw new HttpError(400, 'Plano não encontrado')
    const monthlyFee = Number(
      plan.promo_active && plan.promo_price_monthly != null
        ? plan.promo_price_monthly
        : plan.price_monthly,
    )
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
      throw new HttpError(409, 'Plano sem mensalidade válida')
    }
    const maxClinics = Number(plan.max_clinics ?? 999)
    if (Number.isFinite(maxClinics) && maxClinics > 0 && input.clinics.length > maxClinics) {
      throw new HttpError(
        409,
        `Este plano permite no máximo ${maxClinics} unidade(s)`,
      )
    }

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', input.adminEmail)
      .limit(1)
      .maybeSingle()
    if (profileLookupError) throw new Error(dbErrorMessage('Failed to validate email', profileLookupError))
    if (existingProfile) throw new HttpError(409, 'Email já cadastrado')

    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email: input.adminEmail,
      password: input.adminPassword,
      email_confirm: true,
      user_metadata: {
        name: input.adminName,
        phone: input.adminPhone,
        // Impede o trigger legado de criar uma clínica/trial paralela.
        skip_auto_clinic: true,
      },
    })
    if (createAuthError || !authData.user) {
      throw new HttpError(
        409,
        createAuthError?.message
          ? `Não foi possível criar o usuário: ${createAuthError.message}`
          : 'Não foi possível criar o usuário; verifique o email',
      )
    }
    createdUserId = authData.user.id

    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: createdUserId,
      name: input.adminName,
      email: input.adminEmail,
      phone: input.adminPhone,
      is_active: true,
    }, { onConflict: 'user_id' })
    if (profileError) throw new Error(dbErrorMessage('Failed to create profile', profileError))

    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: createdUserId,
      role: 'admin',
    }, { onConflict: 'user_id,role' })
    if (roleError) throw new Error(dbErrorMessage('Failed to create role', roleError))

    const { data: organizationId, error: orgError } = await supabase.rpc(
      'ensure_organization_for_owner',
      {
        p_owner_user_id: createdUserId,
        p_name: `${input.adminName} — Grupo`,
      },
    )
    if (orgError || !organizationId) {
      throw new Error(dbErrorMessage('Failed to create organization', orgError))
    }

    const created: Array<{ clinic_id: string; subscription_id: string }> = []
    for (const clinic of input.clinics) {
      const { data: clinicRow, error: clinicError } = await supabase.from('clinics').insert({
        name: clinic.name,
        slug: slugifyClinicName(clinic.name),
        unit_name: clinic.unit_name,
        cnpj: clinic.cnpj,
        address: clinic.address,
        address_number: clinic.address_number,
        neighborhood: clinic.neighborhood,
        city: clinic.city,
        state: clinic.state,
        zip_code: clinic.zipcode,
        phone: clinic.phone,
        email: clinic.email || input.adminEmail,
        owner_user_id: createdUserId,
        organization_id: organizationId,
      }).select('id').single()
      if (clinicError || !clinicRow) {
        throw new Error(dbErrorMessage('Failed to create clinic', clinicError))
      }
      createdClinicIds.push(clinicRow.id)

      const { error: membershipError } = await supabase.from('clinic_users').insert({
        clinic_id: clinicRow.id,
        user_id: createdUserId,
        is_owner: true,
      })
      if (membershipError) {
        throw new Error(dbErrorMessage('Failed to create clinic membership', membershipError))
      }

      const { data: subscription, error: subscriptionError } = await supabase.from('subscriptions').insert({
        clinic_id: clinicRow.id,
        plan_id: input.planId,
        status: 'pending',
        billing_mode: 'manual',
        billing_status: 'pending',
        payment_status: 'pending',
        features_override: input.modules,
        monthly_fee: monthlyFee,
        setup_fee: input.setupFee,
        billing_day: input.billingDay,
        billing_defer_days: input.billingDeferDays,
        billing_first_due_date: input.billingFirstDueDate,
        admin_notes: input.adminNotes,
      }).select('id').single()
      if (subscriptionError || !subscription) {
        throw new Error(dbErrorMessage('Failed to create subscription', subscriptionError))
      }
      created.push({ clinic_id: clinicRow.id, subscription_id: subscription.id })
    }

    return json(req, {
      user_id: createdUserId,
      organization_id: organizationId,
      clinics: created,
    }, 201)
  } catch (error) {
    if (supabase && createdUserId) await compensate(supabase, createdClinicIds, createdUserId)
    if (error instanceof HttpError) return json(req, { error: error.message }, error.status)
    const message = error instanceof Error ? error.message : 'Não foi possível criar o cliente'
    console.error('Unexpected create-complete-client error', message)
    return json(req, { error: message }, 500)
  }
})
