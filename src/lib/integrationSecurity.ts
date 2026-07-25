/**
 * Geração e conferência de credenciais do módulo de Integrações.
 *
 * Regra do módulo: o banco guarda apenas hash + prefixo. O valor em claro
 * é mostrado uma única vez, no momento da criação.
 */

const TOKEN_PREFIX = 'hc';
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase36(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length])
    .join('');
}

/** Slug do endpoint de entrada: /functions/v1/integrations-webhook/<slug> */
export function generateWebhookSlug(): string {
  return toBase36(randomBytes(24));
}

/** Segredo do webhook, enviado pelo provedor no header `x-healthcare-signature`. */
export function generateWebhookSecret(): string {
  return `whsec_${toBase36(randomBytes(40))}`;
}

/** Token de API do tenant. Formato: hc_<env>_<random>. */
export function generateApiToken(environment: 'live' | 'test' = 'live'): string {
  return `${TOKEN_PREFIX}_${environment}_${toBase36(randomBytes(40))}`;
}

/**
 * Prefixo exibido na UI. Mantém o suficiente para identificar o token
 * sem permitir reconstruí-lo.
 */
export function tokenPrefix(token: string): string {
  return token.slice(0, 12);
}

/** Máscara para listagem: hc_live_ab12••••••••. */
export function maskToken(prefix: string): string {
  return `${prefix}${'•'.repeat(8)}`;
}

/** SHA-256 hex — mesmo algoritmo usado na Edge Function que valida o token. */
export async function hashSecret(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** URL pública do webhook de entrada da integração. */
export function buildWebhookUrl(slug: string): string {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  return `${baseUrl}/functions/v1/integrations-webhook/${slug}`;
}

/** Token expirado ou revogado não autentica. */
export function isApiTokenUsable(
  token: { status: string; expires_at: string | null },
  now = new Date(),
): boolean {
  if (token.status !== 'active') return false;
  if (!token.expires_at) return true;
  const expires = new Date(token.expires_at);
  return !Number.isNaN(expires.getTime()) && expires.getTime() > now.getTime();
}
