import { describe, expect, it } from 'vitest';
import {
  hmacSha256Hex,
  META_SIGNATURE_HEADER,
  META_WEBHOOK_PROVIDERS,
  parseMetaSignatureHeader,
  readWebhookChallenge,
  sha256Hex,
  SHARED_SECRET_HEADER,
  timingSafeEqualHex,
  webhookAuthScheme,
} from '../../supabase/functions/_shared/webhookSignature.ts';
import { LEAD_CAPTURE_PROVIDERS } from '../../supabase/functions/_shared/leadPayload.ts';
import {
  INTEGRATION_PROVIDERS,
  META_WEBHOOK_PROVIDERS as APP_META_PROVIDERS,
  isMetaWebhookProvider,
} from '@/lib/integrationProviders';

describe('esquema de autenticação por provedor', () => {
  it('provedores da Meta usam HMAC', () => {
    for (const provider of META_WEBHOOK_PROVIDERS) {
      expect(webhookAuthScheme(provider)).toBe('meta_hmac');
    }
  });

  it('demais provedores usam segredo compartilhado', () => {
    for (const provider of ['landing_page', 'webhook', 'n8n', 'make', 'zapier', 'external_api']) {
      expect(webhookAuthScheme(provider)).toBe('shared_secret');
    }
  });

  it('a lista da Meta no app bate com a das Edge Functions', () => {
    expect([...APP_META_PROVIDERS].sort()).toEqual([...META_WEBHOOK_PROVIDERS].sort());
    expect(isMetaWebhookProvider('facebook_lead_ads')).toBe(true);
    expect(isMetaWebhookProvider('n8n')).toBe(false);
  });

  it('todo provedor da Meta existe no catálogo e recebe webhook', () => {
    for (const provider of META_WEBHOOK_PROVIDERS) {
      const definition = INTEGRATION_PROVIDERS.find((p) => p.id === provider);
      expect(definition).toBeDefined();
      expect(definition?.supportsInboundWebhook).toBe(true);
    }
  });

  it('provedor que cria lead pela Meta continua coberto pelos dois esquemas', () => {
    // facebook/instagram criam lead e autenticam por HMAC
    for (const provider of ['facebook_lead_ads', 'instagram_lead_ads']) {
      expect(LEAD_CAPTURE_PROVIDERS as readonly string[]).toContain(provider);
      expect(webhookAuthScheme(provider)).toBe('meta_hmac');
    }
  });

  it('nomes de header são os esperados pelos provedores', () => {
    expect(SHARED_SECRET_HEADER).toBe('x-healthcare-secret');
    expect(META_SIGNATURE_HEADER).toBe('x-hub-signature-256');
  });
});

describe('assinatura HMAC da Meta', () => {
  it('assina o corpo exatamente como a Meta faz', async () => {
    // Vetor conhecido: HMAC-SHA256 de "hello" com a chave "key"
    const hex = await hmacSha256Hex('key', 'hello');
    expect(hex).toBe('9307b3b915efb5171ff14d8cb55fbcc798c6c0ef1456d66ded1a6aa723a58b7b');
  });

  it('corpo diferente gera assinatura diferente', async () => {
    const a = await hmacSha256Hex('segredo', '{"lead":1}');
    const b = await hmacSha256Hex('segredo', '{"lead":2}');
    expect(a).not.toBe(b);
  });

  it('chave diferente gera assinatura diferente', async () => {
    const a = await hmacSha256Hex('app-secret-a', '{"lead":1}');
    const b = await hmacSha256Hex('app-secret-b', '{"lead":1}');
    expect(a).not.toBe(b);
  });

  it('extrai o hex do header sha256=', () => {
    const hex = 'a'.repeat(64);
    expect(parseMetaSignatureHeader(`sha256=${hex}`)).toBe(hex);
    expect(parseMetaSignatureHeader(`SHA256=${hex.toUpperCase()}`)).toBe(hex);
  });

  it('recusa header ausente ou mal formado', () => {
    expect(parseMetaSignatureHeader(null)).toBeNull();
    expect(parseMetaSignatureHeader('sha1=abc')).toBeNull();
    expect(parseMetaSignatureHeader('sha256=curto')).toBeNull();
    expect(parseMetaSignatureHeader('a'.repeat(64))).toBeNull();
  });
});

describe('comparação em tempo constante', () => {
  it('aceita hex igual ignorando caixa', () => {
    expect(timingSafeEqualHex('abcd', 'ABCD')).toBe(true);
  });

  it('recusa valores diferentes e tamanhos diferentes', () => {
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abcd00')).toBe(false);
    expect(timingSafeEqualHex('', 'abcd')).toBe(false);
  });

  it('serve para comparar hash de segredo', async () => {
    const stored = await sha256Hex('whsec_correto');
    expect(timingSafeEqualHex(await sha256Hex('whsec_correto'), stored)).toBe(true);
    expect(timingSafeEqualHex(await sha256Hex('whsec_errado'), stored)).toBe(false);
  });
});

describe('desafio de verificação do endpoint', () => {
  const url = (query: string) =>
    new URL(`https://projeto.supabase.co/functions/v1/integrations-webhook/slug${query}`);

  it('lê os parâmetros hub.* da Meta', () => {
    const challenge = readWebhookChallenge(
      url('?hub.mode=subscribe&hub.verify_token=whsec_abc&hub.challenge=1158201444'),
    );
    expect(challenge).toEqual({
      mode: 'subscribe',
      verifyToken: 'whsec_abc',
      challenge: '1158201444',
    });
  });

  it('não é desafio quando falta hub.mode', () => {
    expect(readWebhookChallenge(url(''))).toBeNull();
    expect(readWebhookChallenge(url('?hub.challenge=1'))).toBeNull();
  });

  it('campos ausentes viram string vazia, nunca undefined', () => {
    const challenge = readWebhookChallenge(url('?hub.mode=subscribe'));
    expect(challenge?.verifyToken).toBe('');
    expect(challenge?.challenge).toBe('');
  });
});
