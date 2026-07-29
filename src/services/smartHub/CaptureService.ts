import { supabase } from '@/integrations/supabase/client';

export interface SmartHubCaptureSubmitInput {
  slug: string;
  button_id?: string | null;
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
  preferred_time?: string;
  preferred_date?: string;
  privacy_accepted: boolean;
  referrer?: string;
  landing_url?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  device_type?: string;
  /** Honeypot — deve permanecer vazio */
  website?: string;
}

export interface SmartHubCaptureSubmitResult {
  ok: boolean;
  created?: boolean;
  duplicate?: boolean;
  message?: string;
  redirect_url?: string | null;
  whatsapp_url?: string | null;
  error?: string;
}

export const CaptureService = {
  async submitPublicForm(
    input: SmartHubCaptureSubmitInput
  ): Promise<SmartHubCaptureSubmitResult> {
    const { data, error } = await supabase.functions.invoke('smart-hub-capture', {
      body: {
        ...input,
        website: input.website || '',
      },
    });

    if (error) {
      return {
        ok: false,
        error: 'Não foi possível enviar agora. Tente novamente.',
      };
    }

    const result = (data || {}) as SmartHubCaptureSubmitResult;
    if (!result.ok) {
      return {
        ok: false,
        error: result.error || 'Não foi possível enviar agora. Tente novamente.',
      };
    }
    return result;
  },
};
