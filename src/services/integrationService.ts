import { supabase } from '@/integrations/supabase/client';
import type { AutomationLog } from '@/types/integration';

/**
 * Orquestração das Edge Functions do módulo de Integrações.
 *
 * Nenhum provedor é implementado aqui: este service é o ponto único de
 * saída do frontend para as functions, no mesmo formato de
 * `asaasBillingService`. Cada integração futura ganha um método.
 */

interface FunctionError {
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function functionErrorMessage(error: unknown): Promise<string> {
  if (isRecord(error) && error.context instanceof Response) {
    const payload: unknown = await error.context.clone().json().catch(() => null);
    if (isRecord(payload) && typeof payload.error === 'string') return payload.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível concluir a operação de integração';
}

async function invokeIntegrations<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | FunctionError>(functionName, {
    body,
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (isRecord(data) && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  return data as T;
}

export interface IntegrationTestResult {
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface FlowRunResult {
  logId: string;
  status: AutomationLog['status'];
}

export const integrationService = {
  /**
   * Testa a conexão do provedor. A function responde 501 enquanto o
   * provedor não tiver handler implementado.
   */
  async testConnection(integrationId: string): Promise<IntegrationTestResult> {
    return invokeIntegrations<IntegrationTestResult>('integrations-dispatch', {
      action: 'test_connection',
      integration_id: integrationId,
    });
  },

  /** Dispara um fluxo manualmente (trigger_type = manual). */
  async runFlow(flowId: string, payload?: Record<string, unknown>): Promise<FlowRunResult> {
    return invokeIntegrations<FlowRunResult>('integrations-dispatch', {
      action: 'run_flow',
      flow_id: flowId,
      payload: payload || {},
    });
  },

  /** Reprocessa um webhook já recebido (usa webhook_logs como origem). */
  async replayWebhook(webhookLogId: string): Promise<FlowRunResult> {
    return invokeIntegrations<FlowRunResult>('integrations-dispatch', {
      action: 'replay_webhook',
      webhook_log_id: webhookLogId,
    });
  },
};
