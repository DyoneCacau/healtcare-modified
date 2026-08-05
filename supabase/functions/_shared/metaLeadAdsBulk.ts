/**
 * Bulk Read de Lead Ads (fallback App Review / atraso de webhook).
 *
 * Parsing e filtros puros — sem I/O — para Vitest.
 * Orquestração com Graph + processLeadgenChange fica em runMetaLeadgenBulkSync.
 */
import type { MetaLeadgenChange } from './metaLeadAdsParse.ts'
import {
  shouldSkipLeadgenEvent,
  type MetaLeadgenEventStatusView,
} from './metaLeadgenEventsLogic.ts'

export const META_BULK_DEFAULT_WINDOW_HOURS = 48
/** Teto de chamadas Graph por integração em um ciclo (forms + páginas de leads). */
export const META_BULK_MAX_GRAPH_CALLS_PER_INTEGRATION = 25
/** Máximo de formulários ativos consultados por página. */
export const META_BULK_MAX_FORMS_PER_PAGE = 10
/** Máximo de leads considerados por formulário na janela. */
export const META_BULK_MAX_LEADS_PER_FORM = 50

export interface MetaBulkFormSummary {
  id: string
  status: string | null
  leadsCount: number | null
}

export interface MetaBulkLeadSummary {
  leadgenId: string
  formId: string | null
  adId: string | null
  createdTime: string | null
  createdUnix: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseLeadgenFormsResponse(body: unknown): MetaBulkFormSummary[] {
  if (!isRecord(body) || !Array.isArray(body.data)) return []
  const out: MetaBulkFormSummary[] = []
  for (const row of body.data) {
    if (!isRecord(row) || typeof row.id !== 'string' || !row.id.trim()) continue
    out.push({
      id: row.id.trim(),
      status: typeof row.status === 'string' ? row.status : null,
      leadsCount: typeof row.leads_count === 'number' ? row.leads_count : null,
    })
  }
  return out
}

export function parseFormLeadsResponse(body: unknown, formId?: string | null): MetaBulkLeadSummary[] {
  if (!isRecord(body) || !Array.isArray(body.data)) return []
  const out: MetaBulkLeadSummary[] = []
  for (const row of body.data) {
    if (!isRecord(row)) continue
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id) continue

    let createdUnix: number | null = null
    let createdTime: string | null = null
    if (typeof row.created_time === 'string') {
      createdTime = row.created_time
      const ms = Date.parse(row.created_time)
      if (Number.isFinite(ms)) createdUnix = Math.floor(ms / 1000)
    } else if (typeof row.created_time === 'number') {
      createdUnix = row.created_time
      createdTime = new Date(row.created_time * 1000).toISOString()
    }

    out.push({
      leadgenId: id,
      formId: typeof row.form_id === 'string' ? row.form_id : (formId ?? null),
      adId: typeof row.ad_id === 'string' ? row.ad_id : null,
      createdTime,
      createdUnix,
    })
  }
  return out
}

/** Filtra leads criados dentro da janela (segundos unix). */
export function filterLeadsWithinWindow(
  leads: MetaBulkLeadSummary[],
  windowStartUnix: number,
): MetaBulkLeadSummary[] {
  return leads.filter((lead) => {
    if (lead.createdUnix == null) return true // sem timestamp: processa (idempotência cobre)
    return lead.createdUnix >= windowStartUnix
  })
}

export function windowStartUnix(
  nowMs: number = Date.now(),
  windowHours: number = META_BULK_DEFAULT_WINDOW_HOURS,
): number {
  return Math.floor((nowMs - windowHours * 60 * 60 * 1000) / 1000)
}

export function selectFormsForBulkSync(forms: MetaBulkFormSummary[]): MetaBulkFormSummary[] {
  const active = forms.filter((form) => {
    if (!form.status) return true
    const status = form.status.toUpperCase()
    return status === 'ACTIVE' || status === 'ACTIVE_LOCKED'
  })
  const pool = active.length > 0 ? active : forms
  return pool.slice(0, META_BULK_MAX_FORMS_PER_PAGE)
}

export function toLeadgenChangesFromBulk(input: {
  pageId: string
  leads: MetaBulkLeadSummary[]
  platform?: MetaLeadgenChange['platform']
}): MetaLeadgenChange[] {
  return input.leads.map((lead) => ({
    leadgenId: lead.leadgenId,
    pageId: input.pageId,
    formId: lead.formId,
    adId: lead.adId,
    createdTime: lead.createdTime,
    platform: input.platform ?? null,
  }))
}

/**
 * Decide se o bulk deve pular este leadgen_id com base no evento já visto.
 * Terminal success / skip permanente → skip.
 */
export function shouldBulkSkipLeadgen(
  event: MetaLeadgenEventStatusView | null | undefined,
): boolean {
  return shouldSkipLeadgenEvent(event)
}

export interface MetaBulkSyncCounters {
  integrations: number
  formsQueried: number
  leadsSeen: number
  processed: number
  duplicates: number
  skipped: number
  failed: number
  graphCalls: number
  rateLimitedIntegrations: number
}
