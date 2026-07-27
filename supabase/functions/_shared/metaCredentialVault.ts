/**
 * Leitura/gravação de tokens Meta via Supabase Vault (RPCs service_role).
 *
 * Nunca loga o plaintext. Fallback transparente para colunas legado
 * enquanto PRODUCAO_31 não rodou / migração parcial.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './httpError.ts'

export type MetaTokenKind = 'access_token' | 'page_access_token'

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return error.code === 'PGRST202'
    || error.code === '42883'
    || msg.includes('could not find the function')
    || msg.includes('meta_vault_')
}

export async function vaultStoreMetaToken(
  supabase: SupabaseClient,
  credentialId: string,
  kind: MetaTokenKind,
  plaintext: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('meta_vault_store_token', {
    p_credential_id: credentialId,
    p_kind: kind,
    p_plaintext: plaintext,
  })

  if (error) {
    if (isMissingRpc(error)) return null
    console.error('[meta-vault] store falhou', JSON.stringify({
      kind,
      code: error.code,
      message: error.message,
    }))
    throw new HttpError(500, 'Falha ao criptografar token Meta no Vault')
  }

  return typeof data === 'string' ? data : null
}

export async function vaultReadMetaToken(
  supabase: SupabaseClient,
  credentialId: string,
  kind: MetaTokenKind,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('meta_vault_read_token', {
    p_credential_id: credentialId,
    p_kind: kind,
  })

  if (error) {
    if (isMissingRpc(error)) return null
    console.error('[meta-vault] read falhou', JSON.stringify({
      kind,
      code: error.code,
      message: error.message,
    }))
    throw new HttpError(500, 'Falha ao ler token Meta do Vault')
  }

  if (typeof data !== 'string' || !data.trim()) return null
  return data
}

export async function vaultDeleteCredentialSecrets(
  supabase: SupabaseClient,
  credentialId: string,
): Promise<void> {
  const { error } = await supabase.rpc('meta_vault_delete_credential_secrets', {
    p_credential_id: credentialId,
  })
  if (error && !isMissingRpc(error)) {
    console.error('[meta-vault] delete falhou', JSON.stringify({
      code: error.code,
      message: error.message,
    }))
    // Não bloqueia delete da linha de credencial
  }
}
