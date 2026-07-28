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
    const [visitsRes, clicksRes, lastVisitRes] = await Promise.all([
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
    ]);

    const views = visitsRes.count ?? 0;
    const clicks = clicksRes.count ?? 0;
    const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;

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
      topButton: null,
      mainOrigin: null,
      mainDevice: null,
      mainCampaign: null,
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
