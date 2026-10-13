/**
 * Templates prontos na Suri: criação automática ao conectar e vínculo
 * automático quando a Meta aprova.
 *
 * Estado em `integrations.config.suri.provisioning` (sem segredos):
 * resultado da criação por modelo e quais tipos já foram ligados uma vez
 * (para não sobrescrever a escolha da clínica depois).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  createSuriTemplate,
  listSuriTemplates,
  listSuriWhatsAppChannels,
  readSuriToken,
  type SuriTemplateSummary,
} from './suri.ts'
import { readSuriConfig } from './suriReminder.ts'
import {
  defaultModelExamples,
  findTemplatesForModel,
  isTemplateTitleTaken,
  linkApprovedModelTemplates,
  modelBodyExamples,
  modelSuriBody,
  modelTemplateExample,
  SURI_TEMPLATE_MODELS,
  type SuriModelKind,
} from './suriTemplateModels.ts'

export type ProvisionStatus = 'created' | 'exists' | 'failed'

export interface ProvisionResult {
  model_id: string
  title: string
  status: ProvisionStatus
  error: string | null
}

export interface SuriProvisioning {
  ran_at: string
  channel_id: string | null
  channel_name: string | null
  results: ProvisionResult[]
  linked: Partial<Record<SuriModelKind, boolean>>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function readProvisioning(config: unknown): SuriProvisioning | null {
  const raw = asRecord(asRecord(asRecord(config).suri).provisioning)
  if (typeof raw.ran_at !== 'string') return null
  const linked = asRecord(raw.linked)
  return {
    ran_at: raw.ran_at,
    channel_id: typeof raw.channel_id === 'string' ? raw.channel_id : null,
    channel_name: typeof raw.channel_name === 'string' ? raw.channel_name : null,
    results: Array.isArray(raw.results) ? raw.results as ProvisionResult[] : [],
    linked: { consultation: linked.consultation === true, exam: linked.exam === true },
  }
}

export interface ClinicExampleData {
  name?: string | null
  address?: string | null
  phone?: string | null
}

/**
 * Cria na Suri os modelos que ainda não existem, no primeiro canal WhatsApp.
 * Nunca lança: falhas ficam no resultado de cada modelo.
 */
export async function provisionModelTemplates(
  endpoint: string,
  token: string,
  existing: SuriTemplateSummary[],
  clinic: ClinicExampleData,
  previous: SuriProvisioning | null,
): Promise<SuriProvisioning> {
  const base: SuriProvisioning = {
    ran_at: new Date().toISOString(),
    channel_id: null,
    channel_name: null,
    results: [],
    linked: previous?.linked ?? {},
  }

  let channel: { id: string; name: string } | null = null
  try {
    const channels = await listSuriWhatsAppChannels(endpoint, token)
    channel = channels[0] ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar canais da Suri'
    return {
      ...base,
      results: SURI_TEMPLATE_MODELS.map((m) => ({
        model_id: m.id, title: m.suggestedName, status: 'failed' as const, error: message,
      })),
    }
  }
  if (!channel) {
    return {
      ...base,
      results: SURI_TEMPLATE_MODELS.map((m) => ({
        model_id: m.id,
        title: m.suggestedName,
        status: 'failed' as const,
        error: 'Nenhum canal WhatsApp conectado na Suri',
      })),
    }
  }

  const results: ProvisionResult[] = []
  for (const model of SURI_TEMPLATE_MODELS) {
    const title = model.suggestedName
    if (findTemplatesForModel(model, existing).length > 0 || isTemplateTitleTaken(title, existing)) {
      results.push({ model_id: model.id, title, status: 'exists', error: null })
      continue
    }
    const examples = {
      ...defaultModelExamples(model.kind),
      ...(clinic.name ? { clinic_name: clinic.name } : {}),
      ...(clinic.address ? { clinic_address: clinic.address } : {}),
      ...(clinic.phone ? { clinic_phone: clinic.phone } : {}),
    }
    try {
      await createSuriTemplate(endpoint, token, {
        title,
        body: modelSuriBody(model),
        channelId: channel.id,
        category: 'UTILITY',
        quickReplies: model.buttons,
        templateExample: modelTemplateExample(model, examples),
        bodyExamples: modelBodyExamples(model, examples),
      })
      results.push({ model_id: model.id, title, status: 'created', error: null })
    } catch (error) {
      results.push({
        model_id: model.id,
        title,
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 300) : 'Falha ao criar template',
      })
    }
  }

  return { ...base, channel_id: channel.id, channel_name: channel.name, results }
}

/**
 * Liga os templates aprovados que vieram dos modelos aos tipos ainda vazios e
 * grava na integração. Devolve os tipos ligados agora.
 */
export async function autoLinkApprovedTemplates(
  supabase: SupabaseClient,
  integration: { id: string; clinic_id: string; config: Record<string, unknown> | null },
  templates: SuriTemplateSummary[],
): Promise<SuriModelKind[]> {
  const config = readSuriConfig(integration.config)
  const provisioning = readProvisioning(integration.config)
  const links = linkApprovedModelTemplates(config, templates, provisioning?.linked ?? {})
  const kinds = Object.keys(links) as SuriModelKind[]
  if (kinds.length === 0) return []

  const rawConfig = asRecord(integration.config)
  const rawSuri = asRecord(rawConfig.suri)
  const nextSuri: Record<string, unknown> = {
    ...rawSuri,
    ...(links.consultation ? { consultation_template: links.consultation } : {}),
    ...(links.exam ? { exam_template: links.exam } : {}),
    provisioning: {
      ...(provisioning ?? { ran_at: new Date().toISOString(), channel_id: null, channel_name: null, results: [] }),
      linked: {
        ...(provisioning?.linked ?? {}),
        ...Object.fromEntries(kinds.map((k) => [k, true])),
      },
    },
  }
  const nextConfig = { ...rawConfig, suri: nextSuri }

  const { error } = await supabase
    .from('integrations')
    .update({ config: nextConfig })
    .eq('id', integration.id)
    .eq('clinic_id', integration.clinic_id)
  if (error) {
    console.error('[suri] falha ao vincular templates aprovados', error.code)
    return []
  }
  integration.config = nextConfig
  return kinds
}

/**
 * Antes do envio: se falta template em algum tipo ainda não ligado, consulta
 * a Suri e liga o que já foi aprovado. Nunca lança.
 */
export async function linkPendingTemplates(
  supabase: SupabaseClient,
  integration: { id: string; clinic_id: string; config: Record<string, unknown> | null },
  options: { requireEnabled: boolean },
): Promise<SuriModelKind[]> {
  const config = readSuriConfig(integration.config)
  if (options.requireEnabled && !config.reminders_enabled) return []
  if (!config.endpoint_url) return []
  const linked = readProvisioning(integration.config)?.linked ?? {}
  const missing = (!config.consultation_template && !linked.consultation)
    || (!config.exam_template && !linked.exam)
  if (!missing) return []

  try {
    const token = await readSuriToken(supabase, integration.clinic_id, integration.id)
    if (!token) return []
    const templates = await listSuriTemplates(config.endpoint_url, token)
    return await autoLinkApprovedTemplates(supabase, integration, templates)
  } catch (error) {
    console.error('[suri] falha ao verificar templates aprovados', error instanceof Error ? error.message : 'unknown')
    return []
  }
}
