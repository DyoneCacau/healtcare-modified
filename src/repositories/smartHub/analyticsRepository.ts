import { supabase } from '@/integrations/supabase/client';
import type {
  ListQueryParams,
  PaginatedResult,
  SmartHubClick,
  SmartHubDashboardMetrics,
  SmartHubEvent,
  SmartHubStatus,
  SmartHubVisit,
} from '@/types/smartHub';
import { paginateRange } from './base';

export const analyticsRepository = {
  async listVisits(
    hubId: string,
    clinicId: string,
    params: Omit<ListQueryParams, 'clinicId'> = {}
  ): Promise<PaginatedResult<SmartHubVisit>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const { from, to } = paginateRange(page, pageSize);

    const { data, error, count } = await supabase
      .from('smart_hub_visits')
      .select('*', { count: 'exact' })
      .eq('hub_id', hubId)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order(params.orderBy ?? 'created_at', { ascending: params.ascending ?? false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as SmartHubVisit[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async listClicks(
    hubId: string,
    clinicId: string,
    params: Omit<ListQueryParams, 'clinicId'> = {}
  ): Promise<PaginatedResult<SmartHubClick>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const { from, to } = paginateRange(page, pageSize);

    const { data, error, count } = await supabase
      .from('smart_hub_clicks')
      .select('*', { count: 'exact' })
      .eq('hub_id', hubId)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order(params.orderBy ?? 'created_at', { ascending: params.ascending ?? false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as SmartHubClick[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async listEvents(
    hubId: string,
    clinicId: string,
    params: Omit<ListQueryParams, 'clinicId'> = {}
  ): Promise<PaginatedResult<SmartHubEvent>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const { from, to } = paginateRange(page, pageSize);

    let query = supabase
      .from('smart_hub_events')
      .select('*', { count: 'exact' })
      .eq('hub_id', hubId)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null);

    if (params.search) {
      query = query.or(`event_type.ilike.%${params.search}%,event_name.ilike.%${params.search}%`);
    }

    const { data, error, count } = await query
      .order(params.orderBy ?? 'created_at', { ascending: params.ascending ?? false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as SmartHubEvent[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  /**
   * Métricas agregadas — skeleton para Fase Analytics.
   * Retorna contagens básicas sem lógica avançada.
   */
  async getDashboardMetrics(
    hubId: string,
    clinicId: string,
    status: SmartHubStatus,
    publicUrl: string
  ): Promise<SmartHubDashboardMetrics> {
    const [visitsRes, clicksRes, lastVisitRes, topClicksRes, visitsSampleRes] = await Promise.all([
      supabase
        .from('smart_hub_visits')
        .select('id', { count: 'exact', head: true })
        .eq('hub_id', hubId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null),
      supabase
        .from('smart_hub_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('hub_id', hubId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null),
      supabase
        .from('smart_hub_visits')
        .select('created_at')
        .eq('hub_id', hubId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('smart_hub_clicks')
        .select('*')
        .eq('hub_id', hubId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('smart_hub_visits')
        .select('device_type, referrer, utm_source, utm_campaign')
        .eq('hub_id', hubId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const views = visitsRes.count ?? 0;
    const clicks = clicksRes.count ?? 0;
    const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;

    const clickRows = (topClicksRes.data || []) as Array<{
      button_id: string | null;
      target_url: string | null;
      metadata: Record<string, unknown> | null;
    }>;

    const buttonCounts = new Map<string, { count: number; label: string }>();
    for (const row of clickRows) {
      const metaTitle =
        row.metadata && typeof row.metadata.button_title === 'string'
          ? row.metadata.button_title
          : null;
      const key = row.button_id || row.target_url || 'unknown';
      const label =
        metaTitle ||
        (row.target_url && /wa\.me|whatsapp/i.test(row.target_url)
          ? 'Falar no WhatsApp'
          : row.target_url) ||
        'Botão';
      const prev = buttonCounts.get(key);
      buttonCounts.set(key, { count: (prev?.count || 0) + 1, label: prev?.label || label });
    }
    let topButton: string | null = null;
    let topCount = 0;
    for (const entry of buttonCounts.values()) {
      if (entry.count > topCount) {
        topCount = entry.count;
        topButton = entry.label;
      }
    }

    const visitRows = (visitsSampleRes.data || []) as Array<{
      device_type: string | null;
      referrer: string | null;
      utm_source: string | null;
      utm_campaign: string | null;
    }>;
    const mode = (values: Array<string | null | undefined>) => {
      const map = new Map<string, number>();
      for (const v of values) {
        if (!v) continue;
        map.set(v, (map.get(v) || 0) + 1);
      }
      let best: string | null = null;
      let n = 0;
      for (const [k, c] of map) {
        if (c > n) {
          n = c;
          best = k;
        }
      }
      return best;
    };

    return {
      publicUrl,
      status,
      online: status === 'published',
      views,
      clicks,
      leads: 0,
      appointments: 0,
      conversions: 0,
      ctr,
      topButton,
      mainOrigin: mode(visitRows.map((v) => v.utm_source || v.referrer || 'Direto')),
      mainDevice: mode(visitRows.map((v) => v.device_type)),
      mainCampaign: mode(visitRows.map((v) => v.utm_campaign)),
      lastVisitAt: (lastVisitRes.data as { created_at?: string } | null)?.created_at ?? null,
    };
  },

  async trackVisit(hubId: string, payload: Record<string, unknown> = {}): Promise<string> {
    const { data, error } = await supabase.rpc('track_smart_hub_visit' as never, {
      p_hub_id: hubId,
      p_payload: payload,
    } as never);
    if (error) throw error;
    return data as string;
  },

  async trackClick(
    hubId: string,
    buttonId: string | null,
    payload: Record<string, unknown> = {}
  ): Promise<string> {
    const { data, error } = await supabase.rpc('track_smart_hub_click' as never, {
      p_hub_id: hubId,
      p_button_id: buttonId,
      p_payload: payload,
    } as never);
    if (error) throw error;
    return data as string;
  },
};
