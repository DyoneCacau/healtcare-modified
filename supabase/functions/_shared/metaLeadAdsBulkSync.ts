/**
 * Orquestra o Bulk Read de Lead Ads para todas as clínicas com captura ativa.
 * Sem PII/tokens em logs — só metadados e contadores.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './httpError.ts'
import { listFormLeads, listPageLeadgenForms } from './metaGraph.ts'
import { META_PROVIDER, readMetaPublicConfig, logConnectionEvent } from './metaConnection.ts'
import { processLeadgenChange } from './metaLeadAds.ts'
import { findMetaLeadgenEvent } from './metaLeadgenEvents.ts'
import { vaultReadMetaToken } from './metaCredentialVault.ts'
import {
  META_BULK_DEFAULT_WINDOW_HOURS,
  META_BULK_MAX_GRAPH_CALLS_PER_INTEGRATION,
  META_BULK_MAX_LEADS_PER_FORM,
  filterLeadsWithinWindow,
  parseFormLeadsResponse,
  parseLeadgenFormsResponse,
  selectFormsForBulkSync,
  shouldBulkSkipLeadgen,
  toLeadgenChangesFromBulk,
  windowStartUnix,
  type MetaBulkSyncCounters,
} from './metaLeadAdsBulk.ts'

async function readPageTokenForBulk(
  supabase: SupabaseClient,
  clinicId: string,
  integrationId: string,
): Promise<{ pageAccessToken: string; expiresAt: string | null } | null> {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('id, access_token, page_access_token, expires_at')
    .eq('clinic_id', clinicId)
    .eq('integration_id', integrationId)
    .maybeSingle()

  if (error || !data?.id) return null

  const pageFromVault = await vaultReadMetaToken(supabase, data.id as string, 'page_access_token')
  const userFromVault = await vaultReadMetaToken(supabase, data.id as string, 'access_token')
  const page = pageFromVault
    || (typeof data.page_access_token === 'string' && data.page_access_token.trim()
      ? data.page_access_token.trim()
      : null)
    || userFromVault
    || (typeof data.access_token === 'string' && data.access_token.trim()
      ? data.access_token.trim()
      : null)

  if (!page) return null
  return { pageAccessToken: page, expiresAt: (data.expires_at as string | null) ?? null }
}

export async function runMetaLeadgenBulkSync(
  supabase: SupabaseClient,
  options?: {
    windowHours?: number
    maxIntegrations?: number
  },
): Promise<MetaBulkSyncCounters> {
  const windowHours = options?.windowHours ?? META_BULK_DEFAULT_WINDOW_HOURS
  const since = windowStartUnix(Date.now(), windowHours)
  const counters: MetaBulkSyncCounters = {
    integrations: 0,
    formsQueried: 0,
    leadsSeen: 0,
    processed: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
    graphCalls: 0,
    rateLimitedIntegrations: 0,
  }

  const { data: rows, error } = await supabase
    .from('integrations')
    .select('id, clinic_id, provider, config, is_active, status')
    .eq('provider', META_PROVIDER)
    .eq('is_active', true)
    .limit(options?.maxIntegrations ?? 200)

  if (error) throw new HttpError(500, 'Falha ao listar integrações Meta para bulk sync')

  const targets = (rows || []).filter((row) => {
    const config = (row.config || {}) as Record<string, unknown>
    if (config.lead_capture !== true) return false
    const meta = readMetaPublicConfig(config)
    return Boolean(meta.page_id)
  })

  for (const integration of targets) {
    counters.integrations += 1
    const config = (integration.config || {}) as Record<string, unknown>
    const meta = readMetaPublicConfig(config)
    const pageId = meta.page_id as string
    let graphCalls = 0

    const bumpGraph = (): boolean => {
      graphCalls += 1
      counters.graphCalls += 1
      return graphCalls <= META_BULK_MAX_GRAPH_CALLS_PER_INTEGRATION
    }

    try {
      const creds = await readPageTokenForBulk(
        supabase,
        integration.clinic_id as string,
        integration.id as string,
      )
      if (!creds) {
        counters.failed += 1
        console.warn('[meta-bulk] credenciais ausentes', JSON.stringify({
          integration_id: integration.id,
          page_id: pageId,
        }))
        continue
      }
      if (creds.expiresAt && new Date(creds.expiresAt).getTime() <= Date.now()) {
        counters.failed += 1
        console.warn('[meta-bulk] token expirado', JSON.stringify({
          integration_id: integration.id,
          page_id: pageId,
        }))
        await logConnectionEvent(supabase, {
          clinicId: integration.clinic_id as string,
          integrationId: integration.id as string,
          eventType: 'leadgen_bulk_token_expired',
          status: 'error',
          message: 'Token Meta expirado no bulk sync',
          metadata: { page_id: pageId },
        })
        continue
      }

      if (!bumpGraph()) {
        counters.rateLimitedIntegrations += 1
        continue
      }

      let formsBody: unknown
      try {
        formsBody = await listPageLeadgenForms(pageId, creds.pageAccessToken)
      } catch (graphError) {
        const status = graphError instanceof HttpError ? graphError.status : 502
        counters.failed += 1
        console.warn('[meta-bulk] list forms falhou', JSON.stringify({
          page_id: pageId,
          http_status: status,
        }))
        // Token inválido: não derruba o job inteiro
        continue
      }

      const forms = selectFormsForBulkSync(parseLeadgenFormsResponse(formsBody))

      for (const form of forms) {
        if (!bumpGraph()) {
          counters.rateLimitedIntegrations += 1
          break
        }

        counters.formsQueried += 1
        let leadsBody: unknown
        try {
          leadsBody = await listFormLeads(form.id, creds.pageAccessToken, {
            limit: META_BULK_MAX_LEADS_PER_FORM,
            sinceUnix: since,
          })
        } catch (graphError) {
          const status = graphError instanceof HttpError ? graphError.status : 502
          console.warn('[meta-bulk] list leads falhou', JSON.stringify({
            page_id: pageId,
            form_id: form.id,
            http_status: status,
          }))
          if (status === 401) break
          continue
        }

        const leads = filterLeadsWithinWindow(
          parseFormLeadsResponse(leadsBody, form.id),
          since,
        ).slice(0, META_BULK_MAX_LEADS_PER_FORM)

        const changes = toLeadgenChangesFromBulk({ pageId, leads })
        for (const change of changes) {
          counters.leadsSeen += 1

          const existing = await findMetaLeadgenEvent(supabase, change.leadgenId)
          if (shouldBulkSkipLeadgen(existing)) {
            counters.skipped += 1
            continue
          }

          // Cada lead ainda gasta 1 Graph call em fetchMetaLeadById
          if (!bumpGraph()) {
            counters.rateLimitedIntegrations += 1
            break
          }

          try {
            const result = await processLeadgenChange(supabase, change, { source: 'bulk_sync' })
            if (result.skipped) counters.skipped += 1
            else if (result.duplicate) counters.duplicates += 1
            else if (result.handled && result.created) counters.processed += 1
            else if (result.reason) counters.failed += 1
          } catch (processError) {
            counters.failed += 1
            const message = processError instanceof HttpError
              ? processError.message
              : 'erro_processamento'
            console.warn('[meta-bulk] process falhou', JSON.stringify({
              leadgen_id: change.leadgenId,
              page_id: pageId,
              message,
            }))
            // Continua próximos leads / clínicas
          }
        }
      }

      await logConnectionEvent(supabase, {
        clinicId: integration.clinic_id as string,
        integrationId: integration.id as string,
        eventType: 'leadgen_bulk_sync',
        status: 'info',
        message: 'Bulk sync Lead Ads executado',
        metadata: {
          page_id: pageId,
          forms_queried: forms.length,
          graph_calls: graphCalls,
          window_hours: windowHours,
        },
      })
    } catch (integrationError) {
      counters.failed += 1
      const message = integrationError instanceof Error
        ? integrationError.message
        : 'erro_integracao'
      console.error('[meta-bulk] integração falhou', JSON.stringify({
        integration_id: integration.id,
        page_id: pageId,
        message,
      }))
    }
  }

  console.log('[meta-bulk] concluído', JSON.stringify(counters))
  return counters
}
