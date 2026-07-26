/**
 * Cliente mínimo da Graph API da Meta para o fluxo de conexão OAuth.
 *
 * Não importa leads, não envia mensagens e não gerencia campanhas —
 * só autenticação, listagem de ativos e health-check do token.
 */
import { HttpError } from './httpError.ts'

export const META_GRAPH_VERSION = 'v21.0'
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`
export const META_OAUTH_DIALOG = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`

/**
 * Escopos do OAuth nesta etapa (app Meta com permissões limitadas).
 * Objetivo: concluir Login, listar/selecionar Página e salvar por clínica.
 * Lead Ads / Instagram / anúncios ficam para quando o app tiver as permissões.
 */
export const META_OAUTH_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',')

/** Ativos ainda sem permissão no app Meta — não listar nem pedir no OAuth. */
export const META_ASSETS_UNAVAILABLE = {
  instagram: true,
  adAccounts: true,
  leadAds: true,
} as const

export interface MetaTokenExchange {
  accessToken: string
  tokenType: string
  expiresIn: number | null
}

export interface MetaPageAsset {
  id: string
  name: string
  accessToken: string
  tasks: string[]
}

export interface MetaInstagramAsset {
  id: string
  username: string | null
  pageId: string
}

export interface MetaAdAccountAsset {
  id: string
  accountId: string
  name: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function metaGraphGet<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${META_GRAPH_BASE}${path}`)
  url.searchParams.set('access_token', accessToken)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), { method: 'GET' })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const graphError = isRecord(body) && isRecord(body.error) ? body.error : null
    const message = graphError && typeof graphError.message === 'string'
      ? graphError.message
      : 'Falha na Graph API da Meta'
    const code = graphError && typeof graphError.code === 'number' ? graphError.code : null
    const subcode = graphError && typeof graphError.error_subcode === 'number'
      ? graphError.error_subcode
      : null
    // Log sem access_token / secrets
    console.error('[meta-graph] erro', JSON.stringify({
      path: path.replace(/\?.*/, ''),
      httpStatus: response.status,
      code,
      subcode,
      message,
    }))
    // 190 = token inválido/expirado
    throw new HttpError(code === 190 ? 401 : 502, message)
  }

  return body as T
}

export async function exchangeCodeForToken(input: {
  code: string
  redirectUri: string
  appId: string
  appSecret: string
}): Promise<MetaTokenExchange> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('client_id', input.appId)
  url.searchParams.set('client_secret', input.appSecret)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('code', input.code)

  const response = await fetch(url.toString())
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(body) || typeof body.access_token !== 'string') {
    throw new HttpError(401, 'Não foi possível trocar o código OAuth da Meta')
  }

  return {
    accessToken: body.access_token,
    tokenType: typeof body.token_type === 'string' ? body.token_type : 'bearer',
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : null,
  }
}

export async function exchangeForLongLivedToken(input: {
  shortLivedToken: string
  appId: string
  appSecret: string
}): Promise<MetaTokenExchange> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', input.appId)
  url.searchParams.set('client_secret', input.appSecret)
  url.searchParams.set('fb_exchange_token', input.shortLivedToken)

  const response = await fetch(url.toString())
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(body) || typeof body.access_token !== 'string') {
    throw new HttpError(401, 'Não foi possível obter token de longa duração da Meta')
  }

  return {
    accessToken: body.access_token,
    tokenType: typeof body.token_type === 'string' ? body.token_type : 'bearer',
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : null,
  }
}

export async function fetchMetaUser(
  accessToken: string,
): Promise<{ id: string; name: string | null }> {
  const data = await metaGraphGet<{ id?: string; name?: string }>('/me', accessToken, {
    fields: 'id,name',
  })
  if (!data.id) throw new HttpError(502, 'Usuário Meta sem id')
  return { id: data.id, name: data.name ?? null }
}

/**
 * Lista Páginas administradas (`pages_show_list`).
 * Nesta etapa só precisamos de id/nome para seleção — não exigir
 * `access_token` da Página (Login for Business às vezes omite o campo
 * e filtrar por ele esvaziava a lista).
 */
export async function listMetaPages(accessToken: string): Promise<MetaPageAsset[]> {
  const data = await metaGraphGet<{
    data?: Array<{
      id?: string
      name?: string
      access_token?: string
      tasks?: string[]
    }>
  }>('/me/accounts', accessToken, {
    fields: 'id,name',
    limit: '100',
  })

  return (data.data || [])
    .filter((page) => typeof page.id === 'string')
    .map((page) => ({
      id: page.id as string,
      name: typeof page.name === 'string' ? page.name : page.id as string,
      accessToken: typeof page.access_token === 'string' ? page.access_token : '',
      tasks: Array.isArray(page.tasks)
        ? page.tasks.filter((t): t is string => typeof t === 'string')
        : [],
    }))
}

export async function listInstagramForPages(
  pages: MetaPageAsset[],
): Promise<MetaInstagramAsset[]> {
  const out: MetaInstagramAsset[] = []
  for (const page of pages) {
    try {
      const data = await metaGraphGet<{
        instagram_business_account?: { id?: string; username?: string }
      }>(`/${page.id}`, page.accessToken, {
        fields: 'instagram_business_account{id,username}',
      })
      const ig = data.instagram_business_account
      if (ig?.id) {
        out.push({
          id: ig.id,
          username: typeof ig.username === 'string' ? ig.username : null,
          pageId: page.id,
        })
      }
    } catch {
      // Página sem Instagram Business vinculado — ignora
    }
  }
  return out
}

export async function listAdAccounts(accessToken: string): Promise<MetaAdAccountAsset[]> {
  const data = await metaGraphGet<{
    data?: Array<{ id?: string; account_id?: string; name?: string }>
  }>('/me/adaccounts', accessToken, {
    fields: 'id,account_id,name',
    limit: '100',
  })

  return (data.data || [])
    .filter((row) => typeof row.id === 'string')
    .map((row) => ({
      id: row.id as string,
      accountId: typeof row.account_id === 'string' ? row.account_id : (row.id as string),
      name: typeof row.name === 'string' ? row.name : (row.id as string),
    }))
}

/** Health-check leve: confirma se o token ainda autentica. */
export async function probeMetaToken(accessToken: string): Promise<{
  ok: boolean
  metaUserId: string | null
  errorMessage: string | null
}> {
  try {
    const user = await fetchMetaUser(accessToken)
    return { ok: true, metaUserId: user.id, errorMessage: null }
  } catch (error) {
    const message = error instanceof HttpError ? error.message : 'Token Meta inválido'
    return { ok: false, metaUserId: null, errorMessage: message }
  }
}

export function expiresAtFromSeconds(expiresIn: number | null): string | null {
  if (expiresIn == null || !Number.isFinite(expiresIn) || expiresIn <= 0) return null
  return new Date(Date.now() + expiresIn * 1000).toISOString()
}

export function buildMetaOAuthUrl(input: {
  appId: string
  redirectUri: string
  state: string
  scopes?: string
}): string {
  const url = new URL(META_OAUTH_DIALOG)
  url.searchParams.set('client_id', input.appId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('state', input.state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', input.scopes || META_OAUTH_SCOPES)
  return url.toString()
}
