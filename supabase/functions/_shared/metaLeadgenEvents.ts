/**
 * Controle de idempotência / tentativas de leadgen Meta.
 * Sem PII — só ids e status.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  shouldSkipLeadgenEvent,
  type MetaLeadgenEventSource,
  type MetaLeadgenEventStatus,
} from './metaLeadgenEventsLogic.ts'

export {
  shouldSkipLeadgenEvent,
  META_LEADGEN_TERMINAL_SUCCESS,
  META_LEADGEN_PERMANENT_SKIP_REASONS,
  type MetaLeadgenEventSource,
  type MetaLeadgenEventStatus,
} from './metaLeadgenEventsLogic.ts'

export interface MetaLeadgenEventRow {
  id: string
  leadgen_id: string
  page_id: string
  form_id: string | null
  ad_id: string | null
  clinic_id: string | null
  integration_id: string | null
  source: MetaLeadgenEventSource
  status: MetaLeadgenEventStatus
  reason: string | null
  crm_lead_id: string | null
  platform: string | null
  attempt_count: number
  last_error: string | null
  first_seen_at: string
  processed_at: string | null
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01'
    || (error.message || '').toLowerCase().includes('meta_leadgen_events')
}

/**
 * Upsert "seen": cria ou incrementa attempt se ainda não terminal.
 * Retorna a linha atual (ou null se tabela ainda não existe).
 */
export async function claimMetaLeadgenEvent(
  supabase: SupabaseClient,
  input: {
    leadgenId: string
    pageId: string
    formId?: string | null
    adId?: string | null
    platform?: string | null
    source: MetaLeadgenEventSource
    clinicId?: string | null
    integrationId?: string | null
  },
): Promise<MetaLeadgenEventRow | null> {
  const { data: existing, error: readError } = await supabase
    .from('meta_leadgen_events')
    .select('*')
    .eq('leadgen_id', input.leadgenId)
    .maybeSingle()

  if (readError) {
    if (isMissingTable(readError)) return null
    console.error('[meta-leadgen-events] read', readError.message)
    return null
  }

  if (existing) {
    const row = existing as MetaLeadgenEventRow
    if (shouldSkipLeadgenEvent(row)) return row

    const { data: updated, error: updateError } = await supabase
      .from('meta_leadgen_events')
      .update({
        status: 'processing',
        source: input.source,
        page_id: input.pageId,
        form_id: input.formId ?? row.form_id,
        ad_id: input.adId ?? row.ad_id,
        platform: input.platform ?? row.platform,
        clinic_id: input.clinicId ?? row.clinic_id,
        integration_id: input.integrationId ?? row.integration_id,
        attempt_count: (row.attempt_count || 1) + 1,
        last_error: null,
      })
      .eq('id', row.id)
      .select('*')
      .maybeSingle()

    if (updateError) {
      console.error('[meta-leadgen-events] reclaim', updateError.message)
      return row
    }
    return (updated as MetaLeadgenEventRow) || row
  }

  const { data: inserted, error: insertError } = await supabase
    .from('meta_leadgen_events')
    .insert({
      leadgen_id: input.leadgenId,
      page_id: input.pageId,
      form_id: input.formId ?? null,
      ad_id: input.adId ?? null,
      platform: input.platform ?? null,
      source: input.source,
      status: 'processing',
      clinic_id: input.clinicId ?? null,
      integration_id: input.integrationId ?? null,
      attempt_count: 1,
    })
    .select('*')
    .maybeSingle()

  if (insertError) {
    // Corrida: unique violado — relê
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('meta_leadgen_events')
        .select('*')
        .eq('leadgen_id', input.leadgenId)
        .maybeSingle()
      return (raced as MetaLeadgenEventRow) || null
    }
    if (isMissingTable(insertError)) return null
    console.error('[meta-leadgen-events] insert', insertError.message)
    return null
  }

  return inserted as MetaLeadgenEventRow
}

export async function finalizeMetaLeadgenEvent(
  supabase: SupabaseClient,
  leadgenId: string,
  patch: {
    status: MetaLeadgenEventStatus
    reason?: string | null
    clinicId?: string | null
    integrationId?: string | null
    crmLeadId?: string | null
    lastError?: string | null
    formId?: string | null
    adId?: string | null
    platform?: string | null
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    status: patch.status,
    reason: patch.reason ?? null,
    last_error: patch.lastError ?? null,
    processed_at: new Date().toISOString(),
  }
  if (patch.clinicId !== undefined) payload.clinic_id = patch.clinicId
  if (patch.integrationId !== undefined) payload.integration_id = patch.integrationId
  if (patch.crmLeadId !== undefined) payload.crm_lead_id = patch.crmLeadId
  if (patch.formId !== undefined) payload.form_id = patch.formId
  if (patch.adId !== undefined) payload.ad_id = patch.adId
  if (patch.platform !== undefined) payload.platform = patch.platform

  const { error } = await supabase
    .from('meta_leadgen_events')
    .update(payload)
    .eq('leadgen_id', leadgenId)

  if (error && !isMissingTable(error)) {
    console.error('[meta-leadgen-events] finalize', error.message)
  }
}

export async function findMetaLeadgenEvent(
  supabase: SupabaseClient,
  leadgenId: string,
): Promise<MetaLeadgenEventRow | null> {
  const { data, error } = await supabase
    .from('meta_leadgen_events')
    .select('*')
    .eq('leadgen_id', leadgenId)
    .maybeSingle()

  if (error) {
    if (isMissingTable(error)) return null
    console.error('[meta-leadgen-events] find', error.message)
    return null
  }
  return (data as MetaLeadgenEventRow) || null
}
