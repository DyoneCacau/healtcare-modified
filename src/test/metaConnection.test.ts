import { describe, expect, it } from 'vitest';
import SQL from '../../supabase/PRODUCAO_29_META_CONNECTION.sql?raw';
import {
  assertMetaConfigHasNoSecrets,
  emptyMetaPublicConfig,
  readMetaPublicConfig,
} from '@/lib/metaConnection';
import { META_OAUTH_SCOPES } from '../../supabase/functions/_shared/metaGraph.ts';
import { META_WEBHOOK_PROVIDERS } from '../../supabase/functions/_shared/webhookSignature.ts';

describe('config público Meta', () => {
  it('lê fase e ids sem inventar token', () => {
    const meta = readMetaPublicConfig({
      meta: {
        page_id: '123',
        page_name: 'Clínica Exemplo',
        connection_phase: 'ready',
      },
      lead_capture: false,
    });
    expect(meta.page_id).toBe('123');
    expect(meta.page_name).toBe('Clínica Exemplo');
    expect(meta.connection_phase).toBe('ready');
    expect(meta.ad_account_id).toBeNull();
  });

  it('rejeita vazamento de campos de token no config', () => {
    const hits = assertMetaConfigHasNoSecrets({
      meta: { page_id: '1', access_token: 'SECRET' },
    });
    expect(hits).toContain('meta.access_token');
    expect(assertMetaConfigHasNoSecrets({ meta: emptyMetaPublicConfig('ready') })).toEqual([]);
  });
});

describe('PRODUCAO_29 — credenciais isoladas', () => {
  it('revoga acesso de authenticated às tabelas de secret/OAuth', () => {
    expect(SQL).toMatch(
      /REVOKE ALL PRIVILEGES ON public\.integration_credentials FROM PUBLIC, anon, authenticated/i,
    );
    expect(SQL).toMatch(
      /REVOKE ALL PRIVILEGES ON public\.integration_oauth_states FROM PUBLIC, anon, authenticated/i,
    );
  });

  it('inclui provedor meta no CHECK', () => {
    expect(SQL).toMatch(/'meta'/);
    expect(SQL).toMatch(/integrations_provider_check/);
  });

  it('logs de conexão são legíveis, sem INSERT pelo cliente', () => {
    expect(SQL).toMatch(/GRANT SELECT ON public\.integration_connection_logs TO authenticated/i);
    expect(SQL).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON public\.integration_connection_logs FROM authenticated/i,
    );
  });
});

describe('escopos OAuth desta etapa (só Página)', () => {
  it('pede apenas permissões disponíveis no app Meta atual', () => {
    const scopes = META_OAUTH_SCOPES.split(',');
    expect(scopes).toEqual([
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ]);
  });

  it('não pede Instagram, ads nem Lead Ads nesta etapa', () => {
    const scopes = META_OAUTH_SCOPES.split(',');
    expect(scopes).not.toContain('leads_retrieval');
    expect(scopes).not.toContain('ads_read');
    expect(scopes).not.toContain('instagram_basic');
    expect(scopes).not.toContain('instagram_manage_insights');
    expect(scopes).not.toContain('pages_manage_metadata');
    expect(scopes).not.toContain('email');
  });

  it('provedor meta usa HMAC no webhook genérico', () => {
    expect(META_WEBHOOK_PROVIDERS).toContain('meta');
  });
});
