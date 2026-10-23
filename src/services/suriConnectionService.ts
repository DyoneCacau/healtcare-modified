import { supabase } from '@/integrations/supabase/client';
import type { SuriProvisioning, SuriTemplateOption, SuriVariableField } from '@/lib/suriConfig';

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
  return 'Não foi possível concluir a operação com a Suri';
}

async function invokeSuri<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | FunctionError>('suri-connection', {
    body,
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (isRecord(data) && typeof data.error === 'string') throw new Error(data.error);
  return data as T;
}

export interface SuriTemplateSelection {
  template_id: string;
  parameters: SuriVariableField[];
}

export interface SuriSaveInput {
  endpoint_url?: string;
  token?: string;
  settings: {
    reminders_enabled: boolean;
    send_hour: number;
    timezone: string;
    consultation_template: SuriTemplateSelection | null;
    exam_template: SuriTemplateSelection | null;
    exam_categories: string[];
    confirm_keywords: string[];
    cancel_keywords: string[];
    response_flow_id: string | null;
  };
}

export interface SuriSaveResult {
  ok: boolean;
  integration_id: string;
  /** Só vem na criação: a URL contém o segredo e não é exibida de novo. */
  webhook_url: string | null;
  templates_count: number;
  provisioning: SuriProvisioning | null;
  /** Modelos da conexão anterior que a Suri atual não tem mais. */
  dropped?: string[];
}

export interface SuriDispatchSummary {
  skipped_reason: string | null;
  sent: number;
  failed: number;
  skipped: number;
  already_handled: number;
}

export const suriConnectionService = {
  save(clinicId: string, input: SuriSaveInput) {
    return invokeSuri<SuriSaveResult>({ action: 'save', clinic_id: clinicId, ...input });
  },

  async listTemplates(
    clinicId: string,
  ): Promise<{ templates: SuriTemplateOption[]; linked: ('consultation' | 'exam')[] }> {
    const result = await invokeSuri<{
      templates: SuriTemplateOption[];
      linked?: ('consultation' | 'exam')[];
    }>({
      action: 'list_templates',
      clinic_id: clinicId,
    });
    return { templates: result.templates || [], linked: result.linked || [] };
  },

  async provisionTemplates(clinicId: string): Promise<SuriProvisioning> {
    const result = await invokeSuri<{ provisioning: SuriProvisioning }>({
      action: 'provision_templates',
      clinic_id: clinicId,
    });
    return result.provisioning;
  },

  testSend(clinicId: string, phone: string, kind: 'consultation' | 'exam') {
    return invokeSuri<{ ok: boolean; message_id: string }>({
      action: 'test_send',
      clinic_id: clinicId,
      phone,
      kind,
    });
  },

  async runNow(clinicId: string): Promise<SuriDispatchSummary> {
    const result = await invokeSuri<{ summary: SuriDispatchSummary }>({
      action: 'run_now',
      clinic_id: clinicId,
    });
    return result.summary;
  },

  async rotateWebhook(clinicId: string): Promise<string> {
    const result = await invokeSuri<{ webhook_url: string }>({
      action: 'rotate_webhook',
      clinic_id: clinicId,
    });
    return result.webhook_url;
  },

  disconnect(clinicId: string) {
    return invokeSuri<{ ok: boolean }>({ action: 'disconnect', clinic_id: clinicId });
  },
};
