import { describe, expect, it } from 'vitest';
import {
  extractLeadgenChanges,
  resolveMetaLeadCrmSource,
} from '../../supabase/functions/_shared/metaLeadAdsParse.ts';
import { META_OAUTH_SCOPES } from '../../supabase/functions/_shared/metaGraph.ts';
import { normalizeLeadPayload } from '../../supabase/functions/_shared/leadPayload.ts';
import { readMetaLeadCapture } from '@/lib/metaConnection';
import SQL from '../../supabase/PRODUCAO_30_META_LEAD_ADS.sql?raw';

const SAMPLE_WEBHOOK = {
  object: 'page',
  entry: [
    {
      id: 'PAGE_123',
      time: 1710000000,
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: 'LEAD_999',
            page_id: 'PAGE_123',
            form_id: 'FORM_1',
            ad_id: 'AD_1',
            created_time: 1710000000,
            platform: 'fb',
          },
        },
      ],
    },
  ],
};

describe('extractLeadgenChanges', () => {
  it('extrai evento válido de Page leadgen', () => {
    const changes = extractLeadgenChanges(SAMPLE_WEBHOOK);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      leadgenId: 'LEAD_999',
      pageId: 'PAGE_123',
      formId: 'FORM_1',
      adId: 'AD_1',
      platform: 'facebook',
    });
    expect(changes[0].createdTime).toBeTruthy();
  });

  it('ignora objeto WhatsApp', () => {
    expect(extractLeadgenChanges({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: {} }] }],
    })).toEqual([]);
  });

  it('ignora page_id ausente / leadgen_id ausente', () => {
    expect(extractLeadgenChanges({
      object: 'page',
      entry: [{ id: 'P1', changes: [{ field: 'leadgen', value: { form_id: 'x' } }] }],
    })).toEqual([]);
  });

  it('identifica Instagram quando platform=ig', () => {
    const changes = extractLeadgenChanges({
      object: 'page',
      entry: [{
        id: 'PAGE_IG',
        changes: [{
          field: 'leadgen',
          value: {
            leadgen_id: 'L1',
            page_id: 'PAGE_IG',
            platform: 'instagram',
          },
        }],
      }],
    });
    expect(changes[0].platform).toBe('instagram');
    expect(resolveMetaLeadCrmSource(changes[0].platform)).toEqual({
      crmSource: 'instagram',
      originDetail: 'instagram_ads',
    });
  });

  it('usa meta_lead_ads quando plataforma não é identificável', () => {
    expect(resolveMetaLeadCrmSource(null)).toEqual({
      crmSource: 'paid_traffic',
      originDetail: 'meta_lead_ads',
    });
  });
});

describe('normalização field_data Lead Ads', () => {
  it('aceita campos personalizados e leadgen_id', () => {
    const lead = normalizeLeadPayload({
      leadgen_id: 'LEAD_CUSTOM',
      field_data: [
        { name: 'full_name', values: ['Ana Meta'] },
        { name: 'email', values: ['ana@example.com'] },
        { name: 'procedimento_interesse', values: ['Clareamento'] },
      ],
      notes: 'Campos do formulário: procedimento_interesse: Clareamento',
    }, { provider: 'meta', defaultLeadSource: 'facebook' });

    expect(lead.name).toBe('Ana Meta');
    expect(lead.email).toBe('ana@example.com');
    expect(lead.externalLeadId).toBe('LEAD_CUSTOM');
    expect(lead.leadSource).toBe('facebook');
    expect(lead.notes).toContain('procedimento_interesse');
  });

  it('evento só com leadgen_id (sem field_data) não gera contato útil', () => {
    const lead = normalizeLeadPayload({ leadgen_id: 'ONLY_ID' }, { provider: 'meta' });
    expect(lead.externalLeadId).toBe('ONLY_ID');
    expect(lead.phone).toBeNull();
    expect(lead.email).toBeNull();
    expect(lead.name).toBe('Lead sem identificação');
  });
});

describe('OAuth scopes Lead Ads', () => {
  it('pede permissões mínimas de leadgen', () => {
    const scopes = META_OAUTH_SCOPES.split(',');
    expect(scopes).toContain('pages_show_list');
    expect(scopes).toContain('pages_read_engagement');
    expect(scopes).toContain('pages_manage_metadata');
    expect(scopes).toContain('leads_retrieval');
    expect(scopes).not.toContain('instagram_manage_insights');
    expect(scopes).not.toContain('ads_read');
  });
});

describe('config lead_capture + SQL 30', () => {
  it('lê lead_capture do config topo', () => {
    expect(readMetaLeadCapture({ lead_capture: true, lead_capture_subscribed_at: '2026-01-01' }))
      .toEqual({ enabled: true, subscribedAt: '2026-01-01' });
    expect(readMetaLeadCapture({ meta: { page_id: '1' } }).enabled).toBe(false);
  });

  it('PRODUCAO_30 cria page_access_token e índice por page_id', () => {
    expect(SQL).toMatch(/page_access_token/);
    expect(SQL).toMatch(/idx_integrations_meta_page_id/);
  });
});

describe('origem CRM Lead Ads', () => {
  it('mantém facebook|instagram + meta_origin (sem CHECK novo)', () => {
    expect(resolveMetaLeadCrmSource('facebook')).toEqual({
      crmSource: 'facebook',
      originDetail: 'facebook_ads',
    });
    expect(resolveMetaLeadCrmSource('instagram')).toEqual({
      crmSource: 'instagram',
      originDetail: 'instagram_ads',
    });
  });
});
