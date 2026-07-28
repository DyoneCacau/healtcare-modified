import { supabase } from '@/integrations/supabase/client';
import type {
  ListQueryParams,
  PaginatedResult,
  PublicSmartHubPayload,
  SmartHub,
  SmartHubInsert,
  SmartHubUpdate,
} from '@/types/smartHub';
import { paginateRange } from './base';

const TABLE = 'smart_hubs';

export const hubRepository = {
  async getByClinicId(clinicId: string): Promise<SmartHub | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as SmartHub | null;
  },

  async getById(id: string, clinicId: string): Promise<SmartHub | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as SmartHub | null;
  },

  async list(params: ListQueryParams): Promise<PaginatedResult<SmartHub>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const { from, to } = paginateRange(page, pageSize);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('clinic_id', params.clinicId)
      .is('deleted_at', null);

    if (params.search) {
      query = query.or(
        `title.ilike.%${params.search}%,slug.ilike.%${params.search}%,subtitle.ilike.%${params.search}%`
      );
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    query = query
      .order(params.orderBy ?? 'updated_at', { ascending: params.ascending ?? false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data || []) as SmartHub[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async create(payload: SmartHubInsert): Promise<SmartHub> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload as never)
      .select('*')
      .single();

    if (error) throw error;
    return data as SmartHub;
  },

  async update(id: string, clinicId: string, payload: SmartHubUpdate): Promise<SmartHub> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload as never)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) throw error;
    return data as SmartHub;
  },

  async softDelete(id: string, clinicId: string, userId?: string | null): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId ?? null,
        status: 'archived',
      } as never)
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (error) throw error;
  },

  async isSlugAvailable(slug: string, excludeHubId?: string | null): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_smart_hub_slug_available' as never, {
      p_slug: slug,
      p_exclude_hub_id: excludeHubId ?? null,
    } as never);

    if (error) throw error;
    return Boolean(data);
  },

  async getPublicBySlug(slug: string): Promise<PublicSmartHubPayload | null> {
    const { data, error } = await supabase.rpc('get_public_smart_hub' as never, {
      p_slug: slug,
    } as never);

    if (error) throw error;
    if (!data) return null;
    return data as unknown as PublicSmartHubPayload;
  },
};
