import { supabase } from '@/integrations/supabase/client';
import type {
  MetaAdAccountOption,
  MetaInstagramOption,
  MetaPageOption,
  MetaPublicConfig,
} from '@/types/integration';

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
  return 'Não foi possível concluir a operação Meta';
}

async function invokeMeta<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | FunctionError>(functionName, {
    body,
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (isRecord(data) && typeof data.error === 'string') throw new Error(data.error);
  return data as T;
}

export interface MetaOAuthStartResult {
  authorizationUrl: string;
  integrationId: string;
  scopes: string[];
}

export interface MetaAssetsResult {
  pages: MetaPageOption[];
  instagramAccounts: MetaInstagramOption[];
  adAccounts: MetaAdAccountOption[];
  selection: {
    page_id: string | null;
    instagram_account_id: string | null;
    ad_account_id: string | null;
  };
}

export const metaConnectionService = {
  async startOAuth(clinicId: string, integrationId?: string | null): Promise<MetaOAuthStartResult> {
    return invokeMeta<MetaOAuthStartResult>('meta-oauth', {
      action: 'start',
      clinic_id: clinicId,
      integration_id: integrationId ?? null,
    });
  },

  async listAssets(clinicId: string, integrationId: string): Promise<MetaAssetsResult> {
    return invokeMeta<MetaAssetsResult>('meta-connection', {
      action: 'list_assets',
      clinic_id: clinicId,
      integration_id: integrationId,
    });
  },

  async saveAssets(
    clinicId: string,
    integrationId: string,
    selection: {
      pageId: string;
      instagramAccountId?: string | null;
      adAccountId?: string | null;
    },
  ): Promise<{ ok: boolean; meta: MetaPublicConfig }> {
    return invokeMeta('meta-connection', {
      action: 'save_assets',
      clinic_id: clinicId,
      integration_id: integrationId,
      page_id: selection.pageId,
      instagram_account_id: selection.instagramAccountId ?? null,
      ad_account_id: selection.adAccountId ?? null,
    });
  },

  async refreshStatus(
    clinicId: string,
    integrationId: string,
  ): Promise<{ ok: boolean; meta: MetaPublicConfig; reason?: string }> {
    return invokeMeta('meta-connection', {
      action: 'refresh_status',
      clinic_id: clinicId,
      integration_id: integrationId,
    });
  },

  async disconnect(clinicId: string, integrationId: string): Promise<{ ok: boolean }> {
    return invokeMeta('meta-connection', {
      action: 'disconnect',
      clinic_id: clinicId,
      integration_id: integrationId,
    });
  },
};
