/**
 * Ações do módulo de Integrações chamadas pelo app autenticado.
 *
 * Deploy: `supabase functions deploy integrations-dispatch`
 *
 * Ações: test_connection | run_flow | replay_webhook.
 * O tenant vem sempre do registro consultado no banco, e o usuário precisa
 * pertencer àquela clínica.
 *
 * Nenhum provedor está implementado: as ações que dependem de provedor
 * respondem 501 e ficam registradas em automation_logs como `skipped`.
 */
import {
  assertUuid,
  authorizeClinicUser,
  closeAutomationLog,
  errorResponse,
  getProviderWebhookHandler,
  handleOptions,
  HttpError,
  json,
  openAutomationLog,
  serviceClient,
} from '../_shared/integrations.ts'

type DispatchAction = 'test_connection' | 'run_flow' | 'replay_webhook'

interface DispatchBody {
  action?: DispatchAction
  integration_id?: string
  flow_id?: string
  webhook_log_id?: string
  payload?: Record<string, unknown>
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405)

  try {
    const body = await req.json().catch(() => {
      throw new HttpError(400, 'JSON inválido')
    }) as DispatchBody

    const supabase = serviceClient()

    switch (body.action) {
      case 'test_connection':
        return await testConnection(req, supabase, body)
      case 'run_flow':
        return await runFlow(req, supabase, body)
      case 'replay_webhook':
        return await replayWebhook(req, supabase, body)
      default:
        throw new HttpError(400, 'Ação não suportada')
    }
  } catch (error) {
    return errorResponse(req, error)
  }
})

async function testConnection(
  req: Request,
  supabase: ReturnType<typeof serviceClient>,
  body: DispatchBody,
): Promise<Response> {
  const integrationId = assertUuid(body.integration_id, 'integration_id')

  const { data: integration, error } = await supabase
    .from('integrations')
    .select('id, clinic_id, provider, status, is_active')
    .eq('id', integrationId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'Falha ao carregar integração')
  if (!integration) throw new HttpError(404, 'Integração não encontrada')

  await authorizeClinicUser(req, supabase, integration.clinic_id)

  if (!getProviderWebhookHandler(integration.provider)) {
    return json(
      req,
      {
        ok: false,
        message: `Integração ${integration.provider} ainda não implementada. Infraestrutura pronta.`,
        checkedAt: new Date().toISOString(),
      },
      501,
    )
  }

  return json(req, {
    ok: true,
    message: 'Conexão validada',
    checkedAt: new Date().toISOString(),
  })
}

async function runFlow(
  req: Request,
  supabase: ReturnType<typeof serviceClient>,
  body: DispatchBody,
): Promise<Response> {
  const flowId = assertUuid(body.flow_id, 'flow_id')

  const { data: flow, error } = await supabase
    .from('automation_flows')
    .select('id, clinic_id, integration_id, trigger_type, actions, status')
    .eq('id', flowId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'Falha ao carregar fluxo')
  if (!flow) throw new HttpError(404, 'Fluxo não encontrado')

  await authorizeClinicUser(req, supabase, flow.clinic_id)

  const actions = Array.isArray(flow.actions) ? flow.actions : []
  const startedAtMs = Date.now()
  const logId = await openAutomationLog(supabase, {
    clinicId: flow.clinic_id,
    flowId: flow.id,
    integrationId: flow.integration_id,
    triggerType: 'manual',
    stepsTotal: actions.length,
    payload: body.payload ?? null,
    correlationId: crypto.randomUUID(),
  })

  // Sem executor de ações implementado: a execução fica registrada como
  // `skipped`, deixando o histórico coerente para quando existir runtime.
  if (logId) {
    await closeAutomationLog(supabase, logId, {
      status: 'skipped',
      stepsCompleted: 0,
      result: { reason: 'action_runtime_not_implemented' },
      startedAtMs,
    })
  }

  return json(
    req,
    { logId, status: 'skipped', reason: 'action_runtime_not_implemented' },
    501,
  )
}

async function replayWebhook(
  req: Request,
  supabase: ReturnType<typeof serviceClient>,
  body: DispatchBody,
): Promise<Response> {
  const webhookLogId = assertUuid(body.webhook_log_id, 'webhook_log_id')

  const { data: log, error } = await supabase
    .from('webhook_logs')
    .select('id, clinic_id, integration_id, provider, payload')
    .eq('id', webhookLogId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'Falha ao carregar webhook')
  if (!log) throw new HttpError(404, 'Webhook não encontrado')

  await authorizeClinicUser(req, supabase, log.clinic_id)

  const startedAtMs = Date.now()
  const logId = await openAutomationLog(supabase, {
    clinicId: log.clinic_id,
    flowId: null,
    integrationId: log.integration_id,
    triggerType: 'webhook',
    payload: log.payload,
    correlationId: log.id,
  })

  if (logId) {
    await closeAutomationLog(supabase, logId, {
      status: 'skipped',
      result: { reason: 'provider_handler_not_implemented' },
      startedAtMs,
    })
  }

  return json(
    req,
    { logId, status: 'skipped', reason: 'provider_handler_not_implemented' },
    501,
  )
}
