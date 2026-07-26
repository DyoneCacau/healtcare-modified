/**
 * Handler de webhook que transforma o evento recebido em lead no CRM.
 *
 * Serve qualquer provedor que envie contatos: Lead Ads, landing pages,
 * webhooks genéricos, n8n, Make e Zapier. O formato do payload não importa —
 * quem resolve isso é o normalizador em leadPayload.ts.
 */
import type { ProviderWebhookHandler } from './integrations.ts'
import { ingestLead, type LeadDedupeMode } from './leads.ts'
import type { LeadSourceValue } from './leadPayload.ts'

function configString(config: Record<string, unknown>, key: string): string | null {
  const value = config[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * A clínica pode ajustar por integração, em `integrations.config`:
 * - `default_lead_source`: origem quando o payload não informa
 * - `lead_dedupe`: 'auto' | 'external_id' | 'none'
 */
export const leadWebhookHandler: ProviderWebhookHandler = async (ctx) => {
  const config = ctx.integration.config || {}
  const dedupe = (configString(config, 'lead_dedupe') as LeadDedupeMode | null) ?? 'auto'
  const defaultLeadSource = configString(
    config,
    'default_lead_source',
  ) as LeadSourceValue | null

  const result = await ingestLead(ctx.supabase, {
    clinicId: ctx.integration.clinic_id,
    integrationId: ctx.integration.id,
    provider: ctx.integration.provider,
    payload: ctx.payload,
    defaultLeadSource,
    dedupe,
  })

  return {
    eventType: result.created ? 'lead.created' : 'lead.duplicate',
    externalEventId: result.lead.externalLeadId,
    // Duplicado é evento válido e já tratado: não conta como ignorado
    handled: true,
  }
}
