import { describe, expect, it } from 'vitest';
import {
  META_BULK_DEFAULT_WINDOW_HOURS,
  META_BULK_MAX_GRAPH_CALLS_PER_INTEGRATION,
  filterLeadsWithinWindow,
  parseFormLeadsResponse,
  parseLeadgenFormsResponse,
  selectFormsForBulkSync,
  shouldBulkSkipLeadgen,
  toLeadgenChangesFromBulk,
  windowStartUnix,
} from '../../supabase/functions/_shared/metaLeadAdsBulk.ts';
import { shouldSkipLeadgenEvent } from '../../supabase/functions/_shared/metaLeadgenEventsLogic.ts';
import SQL from '../../supabase/PRODUCAO_31_META_LEADGEN_BULK_AND_VAULT.sql?raw';

describe('metaLeadAdsBulk parsers', () => {
  it('parseia formulários leadgen', () => {
    const forms = parseLeadgenFormsResponse({
      data: [
        { id: 'F1', status: 'ACTIVE', leads_count: 3 },
        { id: 'F2', status: 'ARCHIVED', leads_count: 0 },
        { name: 'sem id' },
      ],
    });
    expect(forms).toHaveLength(2);
    expect(forms[0]).toEqual({ id: 'F1', status: 'ACTIVE', leadsCount: 3 });
  });

  it('prioriza forms ACTIVE no bulk', () => {
    const selected = selectFormsForBulkSync([
      { id: 'OLD', status: 'ARCHIVED', leadsCount: 10 },
      { id: 'NEW', status: 'ACTIVE', leadsCount: 1 },
    ]);
    expect(selected.map((f) => f.id)).toEqual(['NEW']);
  });

  it('parseia leads e filtra janela 48h', () => {
    const now = Date.now();
    const since = windowStartUnix(now, META_BULK_DEFAULT_WINDOW_HOURS);
    const recentIso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const oldIso = new Date(now - 72 * 60 * 60 * 1000).toISOString();

    const leads = parseFormLeadsResponse({
      data: [
        { id: 'L_NEW', created_time: recentIso, form_id: 'F1', ad_id: 'A1' },
        { id: 'L_OLD', created_time: oldIso, form_id: 'F1' },
        { id: 'L_NO_TIME', form_id: 'F1' },
      ],
    }, 'F1');

    expect(leads).toHaveLength(3);
    const filtered = filterLeadsWithinWindow(leads, since);
    expect(filtered.map((l) => l.leadgenId).sort()).toEqual(['L_NEW', 'L_NO_TIME'].sort());
  });

  it('converte leads bulk em MetaLeadgenChange', () => {
    const changes = toLeadgenChangesFromBulk({
      pageId: 'PAGE_1',
      leads: [{
        leadgenId: 'LEAD_1',
        formId: 'FORM_1',
        adId: 'AD_1',
        createdTime: '2026-01-01T00:00:00.000Z',
        createdUnix: 1767225600,
      }],
    });
    expect(changes).toEqual([{
      leadgenId: 'LEAD_1',
      pageId: 'PAGE_1',
      formId: 'FORM_1',
      adId: 'AD_1',
      createdTime: '2026-01-01T00:00:00.000Z',
      platform: null,
    }]);
  });

  it('define teto de rate limit por integração', () => {
    expect(META_BULK_MAX_GRAPH_CALLS_PER_INTEGRATION).toBeGreaterThanOrEqual(10);
    expect(META_BULK_DEFAULT_WINDOW_HOURS).toBe(48);
  });
});

describe('idempotência meta_leadgen_events', () => {
  it('pula ingested/duplicate', () => {
    expect(shouldSkipLeadgenEvent({ status: 'ingested', reason: null })).toBe(true);
    expect(shouldSkipLeadgenEvent({ status: 'duplicate', reason: null })).toBe(true);
    expect(shouldBulkSkipLeadgen({ status: 'ingested', reason: null })).toBe(true);
  });

  it('pula skips permanentes e reprocessa falhas', () => {
    expect(shouldSkipLeadgenEvent({
      status: 'skipped',
      reason: 'lead_sem_dados_uteis',
    })).toBe(true);
    expect(shouldSkipLeadgenEvent({
      status: 'failed',
      reason: 'token_expirado',
    })).toBe(false);
    expect(shouldSkipLeadgenEvent({
      status: 'processing',
      reason: null,
    })).toBe(false);
  });
});

describe('PRODUCAO_31 SQL', () => {
  it('cria meta_leadgen_events, vault ids e RPCs', () => {
    expect(SQL).toMatch(/meta_leadgen_events/);
    expect(SQL).toMatch(/leadgen_id text NOT NULL/);
    expect(SQL).toMatch(/access_token_vault_id/);
    expect(SQL).toMatch(/page_access_token_vault_id/);
    expect(SQL).toMatch(/meta_vault_store_token/);
    expect(SQL).toMatch(/meta_vault_read_token/);
    expect(SQL).toMatch(/meta_vault_migrate_plaintext_tokens/);
    expect(SQL).toMatch(/supabase_vault/);
  });
});
