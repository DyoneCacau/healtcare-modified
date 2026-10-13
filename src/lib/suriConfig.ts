/**
 * Configuração pública da integração Suri (`integrations.config.suri`).
 *
 * Espelha `supabase/functions/_shared/suriReminder.ts`: a Edge Function valida
 * e grava; aqui só lemos para montar o formulário.
 */

export const SURI_VARIABLE_FIELDS = [
  'patient_first_name',
  'patient_name',
  'date',
  'time',
  'professional',
  'procedure',
  'clinic_name',
  'clinic_address',
  'clinic_phone',
] as const;

export type SuriVariableField = (typeof SURI_VARIABLE_FIELDS)[number];

export const SURI_VARIABLE_LABELS: Record<SuriVariableField, string> = {
  patient_first_name: 'Primeiro nome do paciente',
  patient_name: 'Nome completo do paciente',
  date: 'Data (dd/mm/aaaa)',
  time: 'Horário (hh:mm)',
  professional: 'Profissional',
  procedure: 'Procedimento',
  clinic_name: 'Nome da clínica',
  clinic_address: 'Endereço da clínica',
  clinic_phone: 'Telefone da clínica',
};

export const SURI_DEFAULT_SEND_HOUR = 7;
export const SURI_DEFAULT_TIMEZONE = 'America/Sao_Paulo';
export const SURI_DEFAULT_CONFIRM_KEYWORDS = ['confirmar', 'confirmo', 'confirmado', 'sim', '1'];
export const SURI_DEFAULT_CANCEL_KEYWORDS = ['cancelar', 'cancelo', 'nao', 'nao vou', '2'];

export const SURI_TIMEZONES = [
  { id: 'America/Sao_Paulo', label: 'Brasília (SP, RJ, MG, Sul, GO, DF)' },
  { id: 'America/Fortaleza', label: 'Nordeste (CE, RN, PB, PE, AL, SE, PI, MA)' },
  { id: 'America/Bahia', label: 'Bahia' },
  { id: 'America/Belem', label: 'Pará / Amapá' },
  { id: 'America/Manaus', label: 'Amazonas / RR / RO' },
  { id: 'America/Cuiaba', label: 'Mato Grosso / MS' },
  { id: 'America/Rio_Branco', label: 'Acre' },
];

export interface SuriTemplateConfig {
  template_id: string;
  title: string;
  body: string;
  channel_id: string;
  parameters: SuriVariableField[];
}

export type SuriProvisionStatus = 'created' | 'exists' | 'failed';

/** Resultado da criação automática dos modelos na Suri (`config.suri.provisioning`). */
export interface SuriProvisioning {
  ran_at: string;
  channel_name: string | null;
  results: { model_id: string; title: string; status: SuriProvisionStatus; error: string | null }[];
}

export interface SuriPublicConfig {
  endpoint_url: string | null;
  reminders_enabled: boolean;
  send_hour: number;
  timezone: string;
  consultation_template: SuriTemplateConfig | null;
  exam_template: SuriTemplateConfig | null;
  exam_categories: string[];
  confirm_keywords: string[];
  cancel_keywords: string[];
  response_flow_id: string | null;
  provisioning: SuriProvisioning | null;
}

/** Template como a Suri devolve em `list_templates`. */
export interface SuriTemplateOption {
  message_id: string;
  title: string;
  body: string;
  parameters: number;
  /** 0 aprovado, 1 aguardando, 2 rejeitado, 3 excluído, 4 desabilitado, 5 pausado */
  status: number | null;
  channel_id: string;
  channel_name: string;
  quick_replies: string[];
}

export const SURI_TEMPLATE_STATUS_LABELS: Record<number, string> = {
  0: 'Aprovado',
  1: 'Aguardando aprovação',
  2: 'Rejeitado',
  3: 'Excluído',
  4: 'Desabilitado',
  5: 'Pausado',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringList(value: unknown, fallback: string[]): string[] {
  const list = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  return list.length > 0 ? list : [...fallback];
}

function readTemplate(value: unknown): SuriTemplateConfig | null {
  const raw = asRecord(value);
  if (typeof raw.template_id !== 'string' || !raw.template_id) return null;
  return {
    template_id: raw.template_id,
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    channel_id: String(raw.channel_id || ''),
    parameters: Array.isArray(raw.parameters)
      ? raw.parameters.filter((p): p is SuriVariableField =>
          (SURI_VARIABLE_FIELDS as readonly string[]).includes(String(p)),
        )
      : [],
  };
}

export function readSuriConfig(config: unknown): SuriPublicConfig {
  const raw = asRecord(asRecord(config).suri);
  const hour = Number(raw.send_hour);
  return {
    endpoint_url: typeof raw.endpoint_url === 'string' && raw.endpoint_url ? raw.endpoint_url : null,
    reminders_enabled: raw.reminders_enabled === true,
    send_hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : SURI_DEFAULT_SEND_HOUR,
    timezone: typeof raw.timezone === 'string' && raw.timezone ? raw.timezone : SURI_DEFAULT_TIMEZONE,
    consultation_template: readTemplate(raw.consultation_template),
    exam_template: readTemplate(raw.exam_template),
    exam_categories: stringList(raw.exam_categories, []),
    confirm_keywords: stringList(raw.confirm_keywords, SURI_DEFAULT_CONFIRM_KEYWORDS),
    cancel_keywords: stringList(raw.cancel_keywords, SURI_DEFAULT_CANCEL_KEYWORDS),
    response_flow_id:
      typeof raw.response_flow_id === 'string' && raw.response_flow_id ? raw.response_flow_id : null,
    provisioning: readProvisioning(raw.provisioning),
  };
}

function readProvisioning(value: unknown): SuriProvisioning | null {
  const raw = asRecord(value);
  if (typeof raw.ran_at !== 'string') return null;
  const results = Array.isArray(raw.results) ? raw.results.map(asRecord) : [];
  return {
    ran_at: raw.ran_at,
    channel_name: typeof raw.channel_name === 'string' ? raw.channel_name : null,
    results: results.map((r) => ({
      model_id: String(r.model_id || ''),
      title: String(r.title || ''),
      status: r.status === 'created' || r.status === 'exists' ? r.status : 'failed',
      error: typeof r.error === 'string' ? r.error : null,
    })),
  };
}

/** Lista separada por vírgula → itens limpos. */
export function parseKeywordList(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}
