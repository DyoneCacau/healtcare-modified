/**
 * Registro de handlers de webhook por provedor.
 *
 * Cada integração futura registra o seu handler aqui — o webhook genérico e o
 * dispatch continuam iguais.
 */
import type { IntegrationRow, ProviderWebhookHandler } from './integrations.ts'
import { leadWebhookHandler } from './leadWebhook.ts'
import { LEAD_CAPTURE_PROVIDERS, providerCreatesLeads } from './leadPayload.ts'

const PROVIDER_WEBHOOK_HANDLERS: Partial<Record<string, ProviderWebhookHandler>> =
  Object.fromEntries(LEAD_CAPTURE_PROVIDERS.map((provider) => [provider, leadWebhookHandler]))

/**
 * Resolve o handler da integração.
 *
 * `config.lead_capture` tem a palavra final: permite ligar a captação num
 * provedor de mensagens ou desligar num provedor de anúncios.
 */
export function resolveWebhookHandler(
  integration: IntegrationRow,
): ProviderWebhookHandler | null {
  const leadCapture = integration.config?.lead_capture
  if (leadCapture === false) return null
  if (leadCapture === true) return leadWebhookHandler
  return PROVIDER_WEBHOOK_HANDLERS[integration.provider] ?? null
}

export { LEAD_CAPTURE_PROVIDERS, providerCreatesLeads }
