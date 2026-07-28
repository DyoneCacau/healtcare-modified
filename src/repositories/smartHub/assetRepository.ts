import { supabase } from '@/integrations/supabase/client';
import type { SmartHubAsset, ListQueryParams, PaginatedResult } from '@/types/smartHub';
import { paginateRange } from './base';

const TABLE = 'smart_hub_assets';
const BUCKET = 'clinic-documents';

export const assetRepository = {
  async listByHub(
    hubId: string,
    clinicId: string,
    params: Omit<ListQueryParams, 'clinicId'> = {}
  ): Promise<PaginatedResult<SmartHubAsset>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const { from, to } = paginateRange(page, pageSize);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('hub_id', hubId)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null);

    if (params.search) {
      query = query.ilike('file_name', `%${params.search}%`);
    }

    query = query
      .order(params.orderBy ?? 'created_at', { ascending: params.ascending ?? false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data || []) as SmartHubAsset[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async create(
    payload: Partial<SmartHubAsset> & {
      clinic_id: string;
      hub_id: string;
      file_name: string;
      storage_path: string;
    }
  ): Promise<SmartHubAsset> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload as never)
      .select('*')
      .single();

    if (error) throw error;
    return data as SmartHubAsset;
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

  /** Upload no bucket existente clinic-documents */
  async uploadFile(
    clinicId: string,
    hubId: string,
    file: File
  ): Promise<{
    storage_path: string;
    public_url: string;
    file_name: string;
    file_type: string;
  }> {
    const ext = file.name.split('.').pop() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storage_path = `${clinicId}/smart-hub/${hubId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storage_path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);

    return {
      storage_path,
      public_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type || ext,
    };
  },
};
