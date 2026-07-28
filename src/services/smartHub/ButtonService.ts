import { buttonRepository } from '@/repositories/smartHub';
import type {
  ListQueryParams,
  PaginatedResult,
  SmartHubButton,
  SmartHubButtonInsert,
  SmartHubButtonUpdate,
} from '@/types/smartHub';

export const ButtonService = {
  listByHub(
    hubId: string,
    clinicId: string,
    params?: Omit<ListQueryParams, 'clinicId'>
  ): Promise<PaginatedResult<SmartHubButton>> {
    return buttonRepository.listByHub(hubId, clinicId, params);
  },

  create(
    payload: SmartHubButtonInsert,
    userId?: string | null
  ): Promise<SmartHubButton> {
    return buttonRepository.create({
      ...payload,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    });
  },

  update(
    id: string,
    clinicId: string,
    payload: SmartHubButtonUpdate,
    userId?: string | null
  ): Promise<SmartHubButton> {
    return buttonRepository.update(id, clinicId, {
      ...payload,
      updated_by: userId ?? null,
    });
  },

  softDelete(id: string, clinicId: string, userId?: string | null): Promise<void> {
    return buttonRepository.softDelete(id, clinicId, userId);
  },

  reorder(
    clinicId: string,
    items: { id: string; order_index: number }[]
  ): Promise<void> {
    return buttonRepository.reorder(clinicId, items);
  },
};
