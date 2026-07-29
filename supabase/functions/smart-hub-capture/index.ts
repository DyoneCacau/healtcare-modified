/**
 * Captação pública do Smart Hub → CRM.
 *
 * Deploy: `npx supabase functions deploy smart-hub-capture --no-verify-jwt`
 * (visitante anônimo em /hub/:slug não tem JWT).
 *
 * Reutiliza `ingestLead` (mesma camada da API universal de leads).
 * O clinic_id NUNCA vem do browser — é resolvido pelo slug do hub publicado.
 */
import { serviceClient } from '../_shared/integrations.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { HttpError } from '../_shared/httpError.ts'
import { assertRateLimit } from '../_shared/rateLimit.ts'
import { assertClinicModules } from '../_shared/clinicAccess.ts'
import { ingestLead } from '../_shared/leads.ts'

const MAX_BODY_BYTES = 50_000
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

const ALLOWED_STAGES = new Set(['new', 'contact', 'scheduled', 'won', 'lost'])

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function asString(value: unknown, max = 500): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function sanitizeText(value: unknown, max = 1000): string | null {
  const text = asString(value, max)
  return text || null
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options

  if (req.method !== 'POST') {
    return json(req, { error: 'Método não permitido' }, 405)
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Payload muito grande')
    }

    const raw = await req.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Payload muito grande')
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw || '{}') as Record<string, unknown>
    } catch {
      throw new HttpError(400, 'JSON inválido')
    }

    // Honeypot: bots preenchem "website"
    if (asString(body.website) || asString(body.company_url)) {
      return json(req, {
        ok: true,
        created: false,
        duplicate: false,
        message: 'Recebemos seus dados. Nossa equipe entrará em contato.',
      })
    }

    const slug = asString(body.slug, 120).toLowerCase()
    if (!slug) throw new HttpError(400, 'Hub inválido')

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    assertRateLimit(`sh-capture:${slug}:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)

    const supabase = serviceClient()

    const { data: hub, error: hubError } = await supabase
      .from('smart_hubs')
      .select('id, clinic_id, slug, title, status, capture_config, template_id, style_preset')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (hubError) throw new HttpError(500, 'Falha ao carregar hub')
    if (!hub) throw new HttpError(404, 'Página não encontrada')
    if (hub.status !== 'published') {
      throw new HttpError(403, 'Este hub não está disponível no momento')
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('id', hub.clinic_id)
      .maybeSingle()

    if (!clinic || clinic.is_active === false) {
      throw new HttpError(403, 'Clínica indisponível')
    }

    await assertClinicModules(supabase, hub.clinic_id, ['smart_hub', 'crm'])

    const capture =
      hub.capture_config && typeof hub.capture_config === 'object' && !Array.isArray(hub.capture_config)
        ? (hub.capture_config as Record<string, unknown>)
        : {}

    const buttonId = asString(body.button_id, 80) || null
    let buttonCapture: Record<string, unknown> = {}
    let buttonTitle: string | null = null

    if (buttonId) {
      const { data: button } = await supabase
        .from('smart_hub_buttons')
        .select('id, title, click_action, capture_config, hub_id, clinic_id')
        .eq('id', buttonId)
        .eq('hub_id', hub.id)
        .eq('clinic_id', hub.clinic_id)
        .is('deleted_at', null)
        .maybeSingle()

      if (button) {
        buttonTitle = button.title
        if (
          button.capture_config &&
          typeof button.capture_config === 'object' &&
          !Array.isArray(button.capture_config)
        ) {
          buttonCapture = button.capture_config as Record<string, unknown>
        }
      }
    }

    const requirePrivacy = Boolean(capture.require_privacy_accept ?? true)
    if (requirePrivacy && body.privacy_accepted !== true) {
      throw new HttpError(400, 'É necessário autorizar o uso dos dados')
    }

    const name = asString(body.name ?? body.nome, 120)
    const phone = asString(body.phone ?? body.whatsapp ?? body.telefone, 40)
    if (!name) throw new HttpError(400, 'Informe seu nome.')
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      throw new HttpError(400, 'Informe um WhatsApp válido.')
    }

    const email = sanitizeText(body.email, 160)
    const interest = sanitizeText(body.interest ?? body.servico ?? body.service, 200)
    const message = sanitizeText(body.message ?? body.mensagem, 1500)
    const preferredTime = sanitizeText(body.preferred_time ?? body.melhor_horario, 120)
    const preferredDate = sanitizeText(body.preferred_date ?? body.data_preferida, 40)

    const stageRaw = asString(
      buttonCapture.initial_stage ?? capture.initial_stage ?? 'new',
      20,
    )
    const stage = ALLOWED_STAGES.has(stageRaw) ? stageRaw : 'new'

    const ownerUserId =
      asString(buttonCapture.owner_user_id ?? capture.default_owner_user_id, 80) || null

    const notesParts = [
      message ? `Mensagem: ${message}` : null,
      preferredTime ? `Melhor horário: ${preferredTime}` : null,
      preferredDate ? `Data preferida: ${preferredDate}` : null,
      buttonTitle ? `Botão: ${buttonTitle}` : null,
      `Origem: Smart Hub (${hub.slug})`,
    ].filter(Boolean)

    const sourcePayload = {
      provider: 'smart_hub',
      source: 'smart_hub',
      source_detail: 'smart_hub_form',
      hub_id: hub.id,
      hub_slug: hub.slug,
      hub_title: hub.title,
      button_id: buttonId,
      button_title: buttonTitle,
      template_id: hub.template_id,
      style_preset: hub.style_preset,
      referrer: sanitizeText(body.referrer, 500),
      landing_url: sanitizeText(body.landing_url, 500),
      utm_source: sanitizeText(body.utm_source, 120),
      utm_medium: sanitizeText(body.utm_medium, 120),
      utm_campaign: sanitizeText(body.utm_campaign, 120),
      utm_content: sanitizeText(body.utm_content, 120),
      utm_term: sanitizeText(body.utm_term, 120),
      device_type: sanitizeText(body.device_type, 40),
      privacy_accepted: true,
      privacy_accepted_at: new Date().toISOString(),
      privacy_version: asString(capture.privacy_version, 40) || 'v1',
      preferred_time: preferredTime,
      preferred_date: preferredDate,
    }

    const result = await ingestLead(supabase, {
      clinicId: hub.clinic_id,
      integrationId: null,
      provider: 'smart_hub',
      defaultLeadSource: 'smart_hub',
      dedupe: 'auto',
      ownerUserId: ownerUserId || undefined,
      payload: {
        name,
        phone,
        email,
        interest,
        notes: notesParts.join('\n'),
        stage,
        source: 'smart_hub',
        ...sourcePayload,
      },
    })

    const activityType = result.created ? 'smart_hub_form_submitted' : 'smart_hub_contact_updated'
    const activityDesc = result.created
      ? 'Lead criado pelo Smart Hub'
      : 'Novo contato recebido pelo Smart Hub'

    await supabase.rpc('add_crm_lead_activity', {
      p_lead_id: result.leadId,
      p_activity_type: activityType,
      p_description: activityDesc,
      p_result: null,
      p_origin: 'smart_hub',
      p_metadata: {
        hub_id: hub.id,
        button_id: buttonId,
        duplicate: result.duplicate,
        matched_by: result.matchedBy,
      },
    })

    // Evento de analytics do hub
    await supabase.from('smart_hub_events').insert({
      clinic_id: hub.clinic_id,
      hub_id: hub.id,
      event_type: result.created ? 'form_submitted' : 'form_duplicate',
      event_name: buttonTitle || 'Captura Smart Hub',
      payload: {
        button_id: buttonId,
        lead_created: result.created,
        duplicate: result.duplicate,
      },
      status: 'active',
    })

    const notifyTitle = result.created
      ? 'Novo lead pelo Smart Hub'
      : 'Contato atualizado pelo Smart Hub'
    const notifyMessage = [
      name,
      phone ? `Tel: ${phone}` : null,
      interest ? `Interesse: ${interest}` : null,
      `Origem: Smart Hub`,
    ]
      .filter(Boolean)
      .join(' · ')

    await supabase.rpc('notify_clinic_crm_users', {
      p_clinic_id: hub.clinic_id,
      p_title: notifyTitle,
      p_message: notifyMessage,
      p_reference_id: result.leadId,
      p_owner_user_id: ownerUserId,
    })

    const redirectWhatsapp = Boolean(
      buttonCapture.redirect_whatsapp_after_submit ??
        capture.redirect_whatsapp_after_submit ??
        false,
    )

    let whatsappUrl: string | null = null
    if (redirectWhatsapp) {
      const waNumber = asString(
        buttonCapture.whatsapp_phone ?? capture.whatsapp_phone ?? '',
        40,
      )
      const digits = waNumber.replace(/\D/g, '')
      if (digits) {
        const tpl =
          asString(capture.whatsapp_followup_message, 500) ||
          `Olá! Acabei de enviar meus dados pelo site. Meu nome é ${name}.`
        whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(tpl)}`
      }
    }

    const successMessage =
      asString(capture.success_message, 300) ||
      (result.duplicate
        ? 'Já recebemos seu contato e atualizamos seu atendimento.'
        : 'Recebemos seus dados. Nossa equipe entrará em contato.')

    return json(req, {
      ok: true,
      created: result.created,
      duplicate: result.duplicate,
      message: successMessage,
      redirect_url: sanitizeText(
        buttonCapture.redirect_url ?? capture.redirect_url,
        500,
      ),
      whatsapp_url: whatsappUrl,
    })
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, { ok: false, error: err.message }, err.status)
    }
    console.error('[smart-hub-capture]', err)
    return json(req, { ok: false, error: 'Não foi possível enviar agora. Tente novamente.' }, 500)
  }
})
