/**
 * Cron / fallback Bulk Read de Facebook/Instagram Lead Ads.
 *
 * URL:
 *   POST https://<PROJECT>.supabase.co/functions/v1/meta-leadgen-bulk-sync
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Deploy: supabase functions deploy meta-leadgen-bulk-sync --no-verify-jwt
 *
 * Agenda recomendada: a cada 10 minutos (GitHub Actions).
 * Janela padrão: 48h. Rate limit por integração via teto de chamadas Graph.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { HttpError } from '../_shared/httpError.ts'
import { runMetaLeadgenBulkSync } from '../_shared/metaLeadAdsBulkSync.ts'
import { META_BULK_DEFAULT_WINDOW_HOURS } from '../_shared/metaLeadAdsBulk.ts'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), ...JSON_HEADERS },
  })
}

function secretsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder()
  const providedBytes = encoder.encode(provided)
  const expectedBytes = encoder.encode(expected)
  let difference = providedBytes.length ^ expectedBytes.length
  const length = Math.max(providedBytes.length, expectedBytes.length)
  for (let index = 0; index < length; index++) {
    difference |= (providedBytes[index] || 0) ^ (expectedBytes[index] || 0)
  }
  return difference === 0
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new HttpError(503, 'Serviço não configurado')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  if (!cronSecret) {
    console.error('[meta-leadgen-bulk-sync] CRON_SECRET ausente')
    return json(req, { error: 'Service unavailable' }, 503)
  }

  const authHeader = req.headers.get('authorization') || ''
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!provided || !secretsMatch(provided, cronSecret)) {
    console.warn('[meta-leadgen-bulk-sync] unauthorized')
    return json(req, { error: 'Unauthorized' }, 401)
  }

  let windowHours = META_BULK_DEFAULT_WINDOW_HOURS
  try {
    const body = await req.json().catch(() => ({}))
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const raw = (body as Record<string, unknown>).window_hours
      if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 && raw <= 168) {
        windowHours = Math.floor(raw)
      }
    }
  } catch {
    // body opcional
  }

  try {
    const supabase = serviceClient()
    const started = Date.now()
    const counters = await runMetaLeadgenBulkSync(supabase, { windowHours })
    return json(req, {
      ok: true,
      window_hours: windowHours,
      elapsed_ms: Date.now() - started,
      ...counters,
    })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof HttpError ? error.message : 'Bulk sync falhou'
    console.error('[meta-leadgen-bulk-sync] erro', JSON.stringify({ status, message }))
    return json(req, { error: message }, status >= 400 && status < 600 ? status : 500)
  }
})
