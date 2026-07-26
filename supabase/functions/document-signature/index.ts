import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// Endpoint PÚBLICO (sem JWT de usuário — verify_jwt = false no config.toml).
// A autorização é feita só pelo token aleatório da solicitação de assinatura,
// nunca por sessão de usuário. Usa a service role internamente para ler/
// atualizar a solicitação e gerar a signed URL do documento no Storage.

const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{20,128}$/
const PATIENT_FILES_BUCKET = 'patient-files'
const DOCUMENT_URL_TTL_SECONDS = 10 * 60

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function configuredOrigin(): string | null {
  const appUrl = Deno.env.get('APP_URL')
  if (!appUrl) return null
  try {
    return new URL(appUrl).origin
  } catch {
    return null
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const allowed = configuredOrigin()
  const requestOrigin = req.headers.get('origin')
  return {
    'Access-Control-Allow-Origin': allowed && requestOrigin === allowed ? allowed : (allowed || 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service configuration')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

interface SignatureRequestRow {
  id: string
  clinic_id: string
  document_type: string
  document_name: string
  file_path: string
  signer_name: string
  signer_cpf: string | null
  consent_text: string
  status: string
  token: string
  signed_at: string | null
  expires_at: string
  clinics?: { name: string | null } | null
}

async function findRequestByToken(supabase: SupabaseClient, token: string): Promise<SignatureRequestRow> {
  const { data, error } = await supabase
    .from('document_signature_requests')
    .select('*, clinics(name)')
    .eq('token', token)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new HttpError(404, 'Link de assinatura não encontrado ou inválido.')
  return data as unknown as SignatureRequestRow
}

// API única via POST + campo `action` no corpo (evita depender de query
// string, que o helper `supabase.functions.invoke` do cliente não repassa
// facilmente em GET).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const supabase = serviceClient()
    const body = await req.json().catch(() => ({})) as { action?: string; token?: string; accept?: boolean }
    const token = body.token
    if (!token || !TOKEN_PATTERN.test(token)) throw new HttpError(400, 'Token inválido.')

    if (body.action === 'fetch') {
      const record = await findRequestByToken(supabase, token)
      const isExpired = new Date(record.expires_at).getTime() < Date.now()

      let documentUrl: string | null = null
      if (record.status !== 'cancelled') {
        const { data: signed } = await supabase.storage
          .from(PATIENT_FILES_BUCKET)
          .createSignedUrl(record.file_path, DOCUMENT_URL_TTL_SECONDS)
        documentUrl = signed?.signedUrl ?? null
      }

      if (record.status === 'pending' && !isExpired) {
        await supabase
          .from('document_signature_requests')
          .update({ status: 'viewed' })
          .eq('id', record.id)
          .eq('status', 'pending')
      }

      return json(req, {
        documentType: record.document_type,
        documentName: record.document_name,
        clinicName: record.clinics?.name ?? '',
        signerName: record.signer_name,
        signerCpf: record.signer_cpf,
        consentText: record.consent_text,
        status: isExpired && record.status !== 'signed' ? 'expired' : record.status,
        signedAt: record.signed_at,
        documentUrl,
      })
    }

    if (body.action === 'sign') {
      if (body.accept !== true) throw new HttpError(400, 'É necessário confirmar a concordância para assinar.')

      const record = await findRequestByToken(supabase, token)
      if (record.status === 'cancelled') throw new HttpError(409, 'Esta solicitação de assinatura foi cancelada.')
      if (record.status === 'signed') throw new HttpError(409, 'Este documento já foi assinado.')
      if (new Date(record.expires_at).getTime() < Date.now()) {
        throw new HttpError(410, 'Este link de assinatura expirou.')
      }

      const signedAt = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('document_signature_requests')
        .update({
          status: 'signed',
          signed_at: signedAt,
          signed_ip: getClientIp(req),
          signed_user_agent: req.headers.get('user-agent') || null,
        })
        .eq('id', record.id)
        .in('status', ['pending', 'viewed'])
      if (updateError) throw new Error(updateError.message)

      return json(req, { signed: true, signedAt })
    }

    throw new HttpError(400, 'Ação inválida.')
  } catch (error) {
    if (error instanceof HttpError) return json(req, { error: error.message }, error.status)
    console.error('Unexpected document-signature error', error instanceof Error ? error.message : error)
    return json(req, { error: 'Erro interno' }, 500)
  }
})
