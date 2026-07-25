import { describe, expect, it } from 'vitest';
import {
  INTEGRATION_PROVIDERS,
  getProviderDefinition,
  getProviderLabel,
} from '@/lib/integrationProviders';
import {
  generateApiToken,
  generateWebhookSecret,
  generateWebhookSlug,
  hashSecret,
  isApiTokenUsable,
  maskToken,
  tokenPrefix,
} from '@/lib/integrationSecurity';

describe('catálogo de provedores', () => {
  it('cobre todos os provedores previstos', () => {
    expect(INTEGRATION_PROVIDERS.map((p) => p.id).sort()).toEqual(
      [
        'external_api',
        'facebook_lead_ads',
        'instagram_lead_ads',
        'landing_page',
        'make',
        'n8n',
        'webhook',
        'whatsapp_business',
        'zapier',
      ].sort(),
    );
  });

  it('não repete id de provedor', () => {
    const ids = INTEGRATION_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolve definição e label', () => {
    expect(getProviderDefinition('n8n')?.category).toBe('automation');
    expect(getProviderLabel('whatsapp_business')).toBe('WhatsApp Business');
    expect(getProviderDefinition('inexistente')).toBeUndefined();
    // Provedor desconhecido cai no próprio id, sem quebrar a UI
    expect(getProviderLabel('inexistente')).toBe('inexistente');
  });

  it('provedor de saída não expõe webhook de entrada', () => {
    expect(getProviderDefinition('external_api')?.supportsInboundWebhook).toBe(false);
  });
});

describe('credenciais das integrações', () => {
  it('gera slug e segredo distintos a cada chamada', () => {
    expect(generateWebhookSlug()).not.toBe(generateWebhookSlug());
    expect(generateWebhookSecret()).toMatch(/^whsec_[a-z0-9]{40}$/);
  });

  it('gera token com prefixo identificável', () => {
    const token = generateApiToken('live');
    expect(token).toMatch(/^hc_live_[a-z0-9]{40}$/);
    expect(tokenPrefix(token)).toBe(token.slice(0, 12));
    expect(tokenPrefix(token)).toHaveLength(12);
  });

  it('mascara o token sem revelar o restante', () => {
    const masked = maskToken('hc_live_ab12');
    expect(masked.startsWith('hc_live_ab12')).toBe(true);
    expect(masked).toBe('hc_live_ab12••••••••');
  });

  it('hash é estável e não é o valor em claro', async () => {
    const hash = await hashSecret('hc_live_exemplo');
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('hc_live_exemplo');
    expect(await hashSecret('hc_live_exemplo')).toBe(hash);
    expect(await hashSecret('hc_live_outro')).not.toBe(hash);
  });
});

describe('validade do token de API', () => {
  const now = new Date('2026-07-26T12:00:00.000Z');

  it('aceita token ativo sem expiração', () => {
    expect(isApiTokenUsable({ status: 'active', expires_at: null }, now)).toBe(true);
  });

  it('recusa token revogado', () => {
    expect(isApiTokenUsable({ status: 'revoked', expires_at: null }, now)).toBe(false);
  });

  it('recusa token expirado e aceita dentro do prazo', () => {
    expect(
      isApiTokenUsable({ status: 'active', expires_at: '2026-07-25T12:00:00.000Z' }, now),
    ).toBe(false);
    expect(
      isApiTokenUsable({ status: 'active', expires_at: '2026-07-27T12:00:00.000Z' }, now),
    ).toBe(true);
  });

  it('recusa data de expiração inválida', () => {
    expect(isApiTokenUsable({ status: 'active', expires_at: 'não-é-data' }, now)).toBe(false);
  });
});
