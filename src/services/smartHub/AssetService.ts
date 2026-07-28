import { assetRepository } from '@/repositories/smartHub';
import type { ListQueryParams, PaginatedResult, SmartHubAsset } from '@/types/smartHub';

export const AssetService = {
  listByHub(
    hubId: string,
    clinicId: string,
    params?: Omit<ListQueryParams, 'clinicId'>
  ): Promise<PaginatedResult<SmartHubAsset>> {
    return assetRepository.listByHub(hubId, clinicId, params);
  },

  async upload(
    clinicId: string,
    hubId: string,
    file: File,
    userId?: string | null
  ): Promise<SmartHubAsset> {
    const uploaded = await assetRepository.uploadFile(clinicId, hubId, file);
    return assetRepository.create({
      clinic_id: clinicId,
      hub_id: hubId,
      file_name: uploaded.file_name,
      file_type: uploaded.file_type,
      storage_path: uploaded.storage_path,
      public_url: uploaded.public_url,
      status: 'active',
      created_by: userId ?? null,
      updated_by: userId ?? null,
    });
  },

  softDelete(id: string, clinicId: string, userId?: string | null): Promise<void> {
    return assetRepository.softDelete(id, clinicId, userId);
  },
};
