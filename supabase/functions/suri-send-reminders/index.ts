/**
 * Cron: envia as confirmações do dia pelas clínicas com Suri conectada.
 *
 * Chamado de hora em hora (GitHub Actions) com `Authorization: Bearer CRON_SECRET`.
 * Cada clínica só dispara a partir do próprio horário (`config.suri.send_hour`);
 * chamadas seguintes no mesmo dia só pegam agendamentos ainda não enviados
 * e falhas com tentativas restantes.
 *
 * Deploy: supabase functions deploy suri-send-reminders --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { timingSafeEqualHex, sha256Hex } from '../_shared/webhookSignature.ts'
import { dispatchClinicReminders, type DispatchSummary, type SuriIntegrationRow } from '../_shared/suriDispatch.ts'
import { SURI_PROVIDER } from '../_shared/suriReminder.ts'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('[SECURITY] CRON_SECRET is not configured')
    return json({ error: 'Service unavailable' }, 503)
  }
  const provided = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!provided || !timingSafeEqualHex(await sha256Hex(provided), await sha256Hex(cronSecret))) {
    console.warn('[SECURITY] Unauthorized suri-send-reminders attempt')
    return json({ error: 'Unauthorized' }, 401)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'Service unavailable' }, 503)
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('id, clinic_id, config, status, is_active')
    .eq('provider', SURI_PROVIDER)
    .eq('is_active', true)
    .eq('status', 'connected')
  if (error) {
    console.error('[suri-send-reminders] falha ao listar integrações', error.code)
    return json({ error: 'Falha ao listar integrações' }, 500)
  }

  const now = new Date()
  const results: DispatchSummary[] = []
  const errors: { integration_id: string; message: string }[] = []

  for (const integration of (integrations || []) as SuriIntegrationRow[]) {
    try {
      results.push(await dispatchClinicReminders(supabase, integration, { now }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'erro desconhecido'
      errors.push({ integration_id: integration.id, message })
      console.error('[suri-send-reminders] falha na clínica', integration.clinic_id, message)
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
    }),
    { sent: 0, failed: 0, skipped: 0 },
  )
  console.log('[suri-send-reminders] concluído', JSON.stringify({ clinics: results.length, ...totals, errors: errors.length }))

  return json({ ok: true, clinics: results.length, ...totals, errors })
})
