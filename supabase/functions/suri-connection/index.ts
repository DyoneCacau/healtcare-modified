/**
 * Gestão da conexão Suri da clínica (confirmação de consultas/exames).
 *
 * POST /suri-connection
 *   action: save | list_templates | provision_templates | test_send | run_now
 *           | rotate_webhook | disconnect
 *
 * Na primeira conexão, cria na Suri os modelos prontos de confirmação
 * (categoria Utilidade, botões Confirmar/Cancelar). Quando a Meta aprova,
 * `list_templates` e o cron ligam cada template ao tipo correspondente.
 *
 * O token da Suri entra por aqui e vai direto para `integration_credentials`
 * (service_role). O navegador só recebe status, templates e a URL do webhook
 * (exibida uma única vez, ao criar ou rotacionar).
 *
 * Deploy: supabase functions deploy suri-connection
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { HttpError } from '../_shared/httpError.ts'
import { authorizeClinicIntegrationsManager } from '../_shared/metaConnection.ts'
import {
  generateWebhookSecret,
  hashSha256Hex,
  randomNonce,
} from '../_shared/metaConnectionCrypto.ts'
import { listSuriTemplates, readSuriToken, sendSuriTemplate, type SuriTemplateSummary } from '../_shared/suri.ts'
import { clinicAddress, dispatchClinicReminders } from '../_shared/suriDispatch.ts'
import {
  autoLinkApprovedTemplates,
  linkPendingTemplates,
  provisionModelTemplates,
  readProvisioning,
  type ClinicExampleData,
} from '../_shared/suriProvision.ts'
import { linkApprovedModelTemplates, SURI_TEMPLATE_MODELS } from '../_shared/suriTemplateModels.ts'
import {
  buildBodyParameters,
  isValidTimezone,
  localNow,
  normalizeSuriEndpoint,
  pickTemplate,
  readSuriConfig,
  SURI_PROVIDER,
  SURI_VARIABLE_FIELDS,
  toSuriPhone,
  type SuriTemplateConfig,
  type SuriVariableField,
} from '../_shared/suriReminder.ts'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const INTEGRATION_COLUMNS = 'id, clinic_id, provider, status, config, is_active, webhook_slug'

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), ...JSON_HEADERS },
  })
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new HttpError(503, 'Serviço não configurado')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type Supabase = ReturnType<typeof serviceClient>

interface IntegrationRow {
  id: string
  clinic_id: string
  provider: string
  status: string
  config: Record<string, unknown> | null
  is_active: boolean
  webhook_slug: string | null
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function webhookUrl(slug: string, secret: string): string {
  const base = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '')
  return `${base}/functions/v1/suri-webhook/${slug}?token=${secret}`
}

async function loadSuriIntegration(supabase: Supabase, clinicId: string): Promise<IntegrationRow | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select(INTEGRATION_COLUMNS)
    .eq('clinic_id', clinicId)
    .eq('provider', SURI_PROVIDER)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new HttpError(500, 'Falha ao carregar conexão Suri')
  return data as IntegrationRow | null
}

async function requireConnection(supabase: Supabase, clinicId: string) {
  const integration = await loadSuriIntegration(supabase, clinicId)
  if (!integration) throw new HttpError(404, 'Suri não conectada nesta clínica')
  const config = readSuriConfig(integration.config)
  const token = await readSuriToken(supabase, clinicId, integration.id)
  if (!config.endpoint_url || !token) throw new HttpError(409, 'Conexão Suri sem endpoint ou token')
  return { integration, config, token, endpoint: config.endpoint_url }
}

/**
 * Monta o template salvo a partir do que a Suri devolveu: título, corpo e
 * canal vêm da Suri, não do navegador. Só a ordem das variáveis é da clínica.
 */
function resolveTemplate(
  raw: unknown,
  templates: SuriTemplateSummary[],
  label: string,
): SuriTemplateConfig | null {
  const input = asRecord(raw)
  const templateId = typeof input.template_id === 'string' ? input.template_id.trim() : ''
  if (!templateId) return null

  const found = templates.find((t) => t.message_id === templateId)
  // Modelo de uma conexão anterior: não trava o salvamento do token novo.
  if (!found) return null
  if (found.status !== null && found.status !== 0) {
    throw new HttpError(400, `Template de ${label} ainda não está aprovado no WhatsApp`)
  }
  if (!found.channel_id) throw new HttpError(400, `Template de ${label} sem canal WhatsApp`)

  const parameters = Array.isArray(input.parameters) ? input.parameters : []
  if (parameters.length !== found.parameters) {
    throw new HttpError(400, `Template de ${label} tem ${found.parameters} variável(is); defina todas`)
  }
  for (const field of parameters) {
    if (!(SURI_VARIABLE_FIELDS as readonly string[]).includes(String(field))) {
      throw new HttpError(400, `Variável inválida no template de ${label}`)
    }
  }

  return {
    template_id: found.message_id,
    title: found.title.slice(0, 200),
    body: found.body.slice(0, 2000),
    channel_id: found.channel_id,
    parameters: parameters as SuriVariableField[],
  }
}

function cleanList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, maxItems)
}

/** Dados reais da clínica usados como exemplo das variáveis na aprovação da Meta. */
async function loadClinicExamples(supabase: Supabase, clinicId: string): Promise<ClinicExampleData> {
  const { data } = await supabase
    .from('clinics')
    .select('name, phone, address, address_number, neighborhood, city, state')
    .eq('id', clinicId)
    .maybeSingle()
  const clinic = (data || {}) as Record<string, unknown>
  return {
    name: typeof clinic.name === 'string' ? clinic.name : null,
    phone: typeof clinic.phone === 'string' ? clinic.phone : null,
    address: clinicAddress(clinic) || null,
  }
}

async function handleSave(
  req: Request,
  supabase: Supabase,
  clinicId: string,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const existing = await loadSuriIntegration(supabase, clinicId)
  const currentConfig = readSuriConfig(existing?.config)

  const endpointInput = typeof body.endpoint_url === 'string' ? body.endpoint_url.trim() : ''
  const endpoint = endpointInput ? normalizeSuriEndpoint(endpointInput) : currentConfig.endpoint_url
  if (endpointInput && !endpoint) {
    throw new HttpError(400, 'Endpoint inválido: use a URL https do chatbot (Portal Suri > Configurações)')
  }
  if (!endpoint) throw new HttpError(400, 'Informe o endpoint do chatbot Suri')

  const tokenInput = typeof body.token === 'string' ? body.token.trim() : ''
  if (tokenInput && (tokenInput.length < 10 || tokenInput.length > 4000)) {
    throw new HttpError(400, 'Token da Suri inválido')
  }
  const token = tokenInput || (existing ? await readSuriToken(supabase, clinicId, existing.id) : null)
  if (!token) throw new HttpError(400, 'Informe o token da API da Suri')

  // Também valida endpoint + token: a Suri recusa se algum estiver errado.
  const templates = await listSuriTemplates(endpoint, token)

  const settings = asRecord(body.settings)
  const sendHour = Number(settings.send_hour ?? currentConfig.send_hour)
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    throw new HttpError(400, 'Horário de envio inválido')
  }
  const timezone = typeof settings.timezone === 'string' && settings.timezone
    ? settings.timezone
    : currentConfig.timezone
  if (!isValidTimezone(timezone)) throw new HttpError(400, 'Fuso horário inválido')

  const askedConsultation = Boolean(asRecord(settings.consultation_template).template_id)
  const askedExam = Boolean(asRecord(settings.exam_template).template_id)
  let consultationTemplate = resolveTemplate(settings.consultation_template, templates, 'consulta')
  let examTemplate = resolveTemplate(settings.exam_template, templates, 'exame')
  const dropped: string[] = []
  if (askedConsultation && !consultationTemplate) dropped.push('consulta')
  if (askedExam && !examTemplate) dropped.push('exame')
  // Sem template ainda é aceito: o envio começa quando o modelo criado for aprovado.
  const remindersEnabled = settings.reminders_enabled === true

  let provisioning = readProvisioning(existing?.config)
  const links = linkApprovedModelTemplates(
    { consultation_template: consultationTemplate, exam_template: examTemplate },
    templates,
    provisioning?.linked ?? {},
  )
  consultationTemplate = links.consultation ?? consultationTemplate ?? null
  examTemplate = links.exam ?? examTemplate ?? null

  const createdIds = new Set(
    (provisioning?.results || [])
      .filter((item) => item.status === 'created' || item.status === 'exists')
      .map((item) => item.model_id),
  )
  const missingModel = SURI_TEMPLATE_MODELS.some((model) => !createdIds.has(model.id))
  if (!provisioning || missingModel) {
    provisioning = await provisionModelTemplates(
      endpoint,
      token,
      templates,
      await loadClinicExamples(supabase, clinicId),
      provisioning,
    )
  }
  provisioning = {
    ...provisioning,
    linked: {
      ...provisioning.linked,
      ...(links.consultation ? { consultation: true } : {}),
      ...(links.exam ? { exam: true } : {}),
    },
  }

  const responseFlowId = typeof settings.response_flow_id === 'string'
    ? settings.response_flow_id.trim().slice(0, 120)
    : ''

  const suriConfig = {
    endpoint_url: endpoint,
    reminders_enabled: remindersEnabled,
    send_hour: sendHour,
    timezone,
    consultation_template: consultationTemplate,
    exam_template: examTemplate,
    exam_categories: cleanList(settings.exam_categories, 50),
    confirm_keywords: cleanList(settings.confirm_keywords, 20),
    cancel_keywords: cleanList(settings.cancel_keywords, 20),
    response_flow_id: responseFlowId || null,
    provisioning,
  }

  let integrationId = existing?.id ?? null
  let revealedWebhookUrl: string | null = null

  if (!existing) {
    const secret = generateWebhookSecret()
    const slug = randomNonce(24)
    const { data, error } = await supabase
      .from('integrations')
      .insert({
        clinic_id: clinicId,
        provider: SURI_PROVIDER,
        category: 'messaging',
        name: 'Suri',
        description: 'Confirmação de consultas e exames pelo WhatsApp',
        direction: 'bidirectional',
        status: 'connected',
        config: { suri: suriConfig },
        webhook_slug: slug,
        webhook_secret_hash: await hashSha256Hex(secret),
        is_active: true,
        created_by: userId,
      })
      .select('id')
      .single()
    if (error || !data) throw new HttpError(500, 'Não foi possível criar a conexão Suri')
    integrationId = data.id
    revealedWebhookUrl = webhookUrl(slug, secret)
  } else {
    const { error } = await supabase
      .from('integrations')
      .update({
        config: { ...(existing.config || {}), suri: suriConfig },
        status: 'connected',
        is_active: true,
        last_error: null,
      })
      .eq('id', existing.id)
      .eq('clinic_id', clinicId)
    if (error) throw new HttpError(500, 'Não foi possível salvar a conexão Suri')
  }

  if (tokenInput || !existing) {
    const { data: credential, error: credError } = await supabase
      .from('integration_credentials')
      .upsert(
        {
          clinic_id: clinicId,
          integration_id: integrationId,
          provider: SURI_PROVIDER,
          access_token: token,
          token_type: 'bearer',
        },
        { onConflict: 'integration_id' },
      )
      .select('id')
      .single()
    if (credError || !credential) throw new HttpError(500, 'Não foi possível guardar o token da Suri')
    await supabase.from('integrations')
      .update({ credentials_ref: credential.id })
      .eq('id', integrationId)
  }

  return json(req, {
    ok: true,
    integration_id: integrationId,
    webhook_url: revealedWebhookUrl,
    templates_count: templates.length,
    provisioning,
    dropped,
  })
}

async function handleProvision(req: Request, supabase: Supabase, clinicId: string): Promise<Response> {
  const { integration, token, endpoint } = await requireConnection(supabase, clinicId)
  const templates = await listSuriTemplates(endpoint, token)
  const provisioning = await provisionModelTemplates(
    endpoint,
    token,
    templates,
    await loadClinicExamples(supabase, clinicId),
    readProvisioning(integration.config),
  )

  const config = asRecord(integration.config)
  const { error } = await supabase
    .from('integrations')
    .update({ config: { ...config, suri: { ...asRecord(config.suri), provisioning } } })
    .eq('id', integration.id)
    .eq('clinic_id', clinicId)
  if (error) throw new HttpError(500, 'Não foi possível salvar o resultado da criação dos modelos')
  return json(req, { ok: true, provisioning })
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!bearer) throw new HttpError(401, 'Não autenticado')
    const supabase = serviceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer)
    if (authError || !user) throw new HttpError(401, 'Sessão inválida')

    const body = asRecord(await req.json().catch(() => null))
    const action = typeof body.action === 'string' ? body.action : ''
    if (!action) throw new HttpError(400, 'action obrigatória')
    if (!isUuid(body.clinic_id)) throw new HttpError(400, 'clinic_id inválido')
    const clinicId = body.clinic_id

    await authorizeClinicIntegrationsManager(supabase, user.id, clinicId)

    switch (action) {
      case 'save':
        return await handleSave(req, supabase, clinicId, user.id, body)

      case 'list_templates': {
        const integration = await loadSuriIntegration(supabase, clinicId)
        const config = readSuriConfig(integration?.config)
        const token = integration
          ? await readSuriToken(supabase, clinicId, integration.id)
          : null
        if (!integration || integration.status !== 'connected' || !config.endpoint_url || !token) {
          return json(req, { templates: [], linked: [] })
        }
        const templates = await listSuriTemplates(config.endpoint_url, token)
        const linked = await autoLinkApprovedTemplates(supabase, integration, templates)
        return json(req, { templates, linked })
      }

      case 'provision_templates':
        return await handleProvision(req, supabase, clinicId)

      case 'test_send': {
        const { config, token, endpoint } = await requireConnection(supabase, clinicId)
        const phone = toSuriPhone(typeof body.phone === 'string' ? body.phone : '')
        if (!phone) throw new HttpError(400, 'Celular inválido: use DDD + número')
        const kind = body.kind === 'exam' ? 'exam' : 'consultation'
        const template = pickTemplate(config, kind)
        if (!template) throw new HttpError(400, 'Nenhum template configurado')

        const { data: clinic } = await supabase
          .from('clinics').select('name, phone').eq('id', clinicId).maybeSingle()
        const today = localNow(new Date(), config.timezone).date
        const messageId = await sendSuriTemplate(endpoint, token, {
          name: 'Teste HealthCare',
          phone,
          channelId: template.channel_id,
          templateId: template.template_id,
          bodyParameters: buildBodyParameters(template.parameters, {
            patientName: 'Paciente Teste',
            date: today,
            time: '09:00',
            professional: 'Dr(a). Exemplo',
            procedure: kind === 'exam' ? 'Exame de exemplo' : 'Consulta de exemplo',
            clinicName: String(clinic?.name || 'Clínica'),
            clinicAddress: 'Endereço da clínica',
            clinicPhone: String(clinic?.phone || ''),
          }),
          responseFlowId: config.response_flow_id,
        })
        return json(req, { ok: true, message_id: messageId })
      }

      case 'run_now': {
        const integration = await loadSuriIntegration(supabase, clinicId)
        if (!integration) throw new HttpError(404, 'Suri não conectada nesta clínica')
        await linkPendingTemplates(supabase, integration, { requireEnabled: false })
        const summary = await dispatchClinicReminders(supabase, integration, {
          now: new Date(),
          manual: true,
        })
        return json(req, { ok: true, summary })
      }

      case 'rotate_webhook': {
        const integration = await loadSuriIntegration(supabase, clinicId)
        if (!integration) throw new HttpError(404, 'Suri não conectada nesta clínica')
        const secret = generateWebhookSecret()
        const slug = integration.webhook_slug || randomNonce(24)
        const { error } = await supabase
          .from('integrations')
          .update({ webhook_slug: slug, webhook_secret_hash: await hashSha256Hex(secret) })
          .eq('id', integration.id)
          .eq('clinic_id', clinicId)
        if (error) throw new HttpError(500, 'Não foi possível gerar nova URL do webhook')
        return json(req, { ok: true, webhook_url: webhookUrl(slug, secret) })
      }

      case 'disconnect': {
        const integration = await loadSuriIntegration(supabase, clinicId)
        if (!integration) return json(req, { ok: true })
        await supabase.from('integration_credentials')
          .delete()
          .eq('clinic_id', clinicId)
          .eq('integration_id', integration.id)
        const config = asRecord(integration.config)
        const suri = asRecord(config.suri)
        const { error } = await supabase
          .from('integrations')
          .update({
            status: 'disconnected',
            is_active: false,
            credentials_ref: null,
            config: {
              ...config,
              suri: {
                ...suri,
                reminders_enabled: false,
                consultation_template: null,
                exam_template: null,
                provisioning: null,
              },
            },
          })
          .eq('id', integration.id)
          .eq('clinic_id', clinicId)
        if (error) throw new HttpError(500, 'Não foi possível desconectar a Suri')
        return json(req, { ok: true })
      }

      default:
        throw new HttpError(400, 'Ação não suportada')
    }
  } catch (error) {
    if (error instanceof HttpError) return json(req, { error: error.message }, error.status)
    console.error('[suri-connection] erro inesperado', error instanceof Error ? error.name : 'unknown')
    return json(req, { error: 'Erro interno na conexão Suri' }, 500)
  }
})
