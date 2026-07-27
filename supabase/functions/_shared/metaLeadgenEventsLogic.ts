/**
 * Regras puras de idempotência leadgen (Vitest + Deno).
 * Sem I/O / Supabase.
 */

export type MetaLeadgenEventSource = 'webhook' | 'bulk_sync'

export type MetaLeadgenEventStatus =
  | 'received'
  | 'processing'
  | 'ingested'
  | 'duplicate'
  | 'skipped'
  | 'failed'

export interface MetaLeadgenEventStatusView {
  status: MetaLeadgenEventStatus
  reason: string | null
}

/** Statuses que não devem ser reprocessados pelo bulk/webhook. */
export const META_LEADGEN_TERMINAL_SUCCESS: MetaLeadgenEventStatus[] = [
  'ingested',
  'duplicate',
]

/** Skips permanentes (não vale reprocessar no bulk). */
export const META_LEADGEN_PERMANENT_SKIP_REASONS = new Set([
  'page_id_desconhecido_ou_captura_inativa',
  'page_id_nao_corresponde',
  'lead_inexistente',
  'lead_sem_dados_uteis',
  'permissao_ausente',
])

export function shouldSkipLeadgenEvent(
  event: MetaLeadgenEventStatusView | null | undefined,
): boolean {
  if (!event) return false
  if (META_LEADGEN_TERMINAL_SUCCESS.includes(event.status)) return true
  if (event.status === 'skipped' && event.reason
    && META_LEADGEN_PERMANENT_SKIP_REASONS.has(event.reason)) {
    return true
  }
  return false
}
