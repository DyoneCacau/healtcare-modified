import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const API_TIMEOUT_MS = 12_000
const USER_AGENT = 'HealthCare-Billing/1.0'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const configuredOrigin = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '')
  const allowedOrigin = configuredOrigin && requestOrigin === configuredOrigin
    ? requestOrigin
    : configuredOrigin || 'null'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, asaas-access-token, x-cron-secret, '
      + 'x-supabase-client-platform, x-supabase-client-platform-version, '
      + 'x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), ...JSON_HEADERS },
  })
}

export function handleOptions(req: Request): Response | null {
  return req.method === 'OPTIONS'
    ? new Response(null, { status: 204, headers: corsHeaders(req) })
    : null
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service configuration missing')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface AuthContext {
  user: User
  isSuperadmin: boolean
  membership: { clinic_id: string; is_owner: boolean } | null
}

export async function authorizeClinic(
  req: Request,
  supabase: SupabaseClient,
  clinicId: string,
  ownerRequired = false,
): Promise<AuthContext> {
  const bearer = req.headers.get('authorization')
  const token = bearer?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new HttpError(401, 'Não autenticado')

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new HttpError(401, 'Sessão inválida')

  const [{ data: role }, { data: membership }] = await Promise.all([
    supabase.from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'superadmin').maybeSingle(),
    supabase.from('clinic_users').select('clinic_id,is_owner')
      .eq('clinic_id', clinicId).eq('user_id', user.id).maybeSingle(),
  ])

  const isSuperadmin = Boolean(role)
  if (!isSuperadmin && !membership) throw new HttpError(403, 'Sem acesso à clínica')
  if (!isSuperadmin && ownerRequired && !membership?.is_owner) {
    throw new HttpError(403, 'Operação permitida apenas ao proprietário da clínica')
  }
  return { user, isSuperadmin, membership }
}

export function requireCron(req: Request): void {
  const expected = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    || req.headers.get('x-cron-secret')
  if (!expected) throw new HttpError(503, 'Reconciliação não configurada')
  if (!provided || provided !== expected) throw new HttpError(401, 'Não autorizado')
}

export function verifyWebhookToken(req: Request): void {
  const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
  const provided = req.headers.get('asaas-access-token')
  if (!expected) throw new HttpError(503, 'Webhook não configurado')
  if (!provided || provided !== expected) throw new HttpError(401, 'Webhook não autorizado')
}

function resolveAsaasApiRoot(rawBaseUrl: string, environment: string): string {
  let url: URL
  try {
    url = new URL(rawBaseUrl)
  } catch {
    throw new Error('Invalid ASAAS_API_BASE_URL')
  }

  const expectedHost = environment === 'sandbox'
    ? 'api-sandbox.asaas.com'
    : 'api.asaas.com'
  const normalizedPath = url.pathname.replace(/\/+$/, '')
  if (
    url.protocol !== 'https:'
    || url.hostname.toLowerCase() !== expectedHost
    || !['', '/v3'].includes(normalizedPath)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('ASAAS_API_BASE_URL does not match ASAAS_ENV')
  }

  return `${url.origin}/v3`
}

function normalizeAsaasPath(path: string): string {
  const withoutLeadingSlash = path.replace(/^\/+/, '')
  const withoutVersion = withoutLeadingSlash.replace(/^v3(?:\/+|$)/, '')
  return withoutVersion ? `/${withoutVersion}` : ''
}

export async function asaasRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = Deno.env.get('ASAAS_API_KEY')
  const rawBaseUrl = Deno.env.get('ASAAS_API_BASE_URL')
  const environment = Deno.env.get('ASAAS_ENV')?.trim().toLowerCase()
  if (!apiKey || !rawBaseUrl || !environment) {
    throw new Error('Asaas configuration missing')
  }
  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('Invalid ASAAS_ENV')
  }
  const baseUrl = resolveAsaasApiRoot(rawBaseUrl, environment)
  const normalizedPath = normalizeAsaasPath(path)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    headers.set('access_token', apiKey)
    headers.set('User-Agent', USER_AGENT)
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      ...init,
      signal: controller.signal,
      headers,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('Asaas request failed', {
        path: normalizedPath,
        status: response.status,
        errorCount: Array.isArray(payload?.errors) ? payload.errors.length : undefined,
      })
      throw new HttpError(502, 'O provedor de pagamentos recusou a operação')
    }
    return payload as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(504, 'O provedor de pagamentos excedeu o tempo limite')
    }
    throw new HttpError(502, 'Não foi possível comunicar com o provedor de pagamentos')
  } finally {
    clearTimeout(timeout)
  }
}

export function errorResponse(req: Request, error: unknown): Response {
  if (error instanceof HttpError) return json(req, { error: error.message }, error.status)
  console.error('Unexpected billing error', error instanceof Error ? error.message : 'unknown')
  return json(req, { error: 'Erro interno de cobrança' }, 500)
}

export function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `${field} inválido`)
  }
}
