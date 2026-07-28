import { hubRepository, pageRepository, themeRepository } from '@/repositories/smartHub';
import type {
  ListQueryParams,
  PaginatedResult,
  PublicSmartHubPayload,
  SmartHub,
  SmartHubInsert,
  SmartHubPublishResult,
  SmartHubUpdate,
  SmartHubValidationResult,
} from '@/types/smartHub';
import {
  buildPublicHubUrl,
  generateSlugFromTitle,
  normalizeSlug,
  validateSlug,
} from './slugUtils';

function asValidationResult(raw: unknown): SmartHubValidationResult {
  const data = (raw || {}) as Record<string, unknown>;
  return {
    ok: Boolean(data.ok),
    errors: Array.isArray(data.errors) ? (data.errors as SmartHubValidationResult['errors']) : [],
    warnings: Array.isArray(data.warnings)
      ? (data.warnings as SmartHubValidationResult['warnings'])
      : [],
    visible_buttons:
      typeof data.visible_buttons === 'number' ? data.visible_buttons : undefined,
  };
}

function asPublishResult(raw: unknown): SmartHubPublishResult {
  const data = (raw || {}) as Record<string, unknown>;
  return {
    ok: Boolean(data.ok),
    status: String(data.status || 'draft'),
    validation: data.validation ? asValidationResult(data.validation) : undefined,
  };
}

export const HubService = {
  list(params: ListQueryParams): Promise<PaginatedResult<SmartHub>> {
    return hubRepository.list(params);
  },

  getByClinicId(clinicId: string): Promise<SmartHub | null> {
    return hubRepository.getByClinicId(clinicId);
  },

  getById(id: string, clinicId: string): Promise<SmartHub | null> {
    return hubRepository.getById(id, clinicId);
  },

  getPublicBySlug(slug: string): Promise<PublicSmartHubPayload | null> {
    return hubRepository.getPublicBySlug(normalizeSlug(slug));
  },

  getPreviewById(hubId: string): Promise<PublicSmartHubPayload | null> {
    return hubRepository.getPreviewById(hubId);
  },

  async isSlugAvailable(slug: string, excludeHubId?: string | null): Promise<boolean> {
    const check = validateSlug(slug);
    if (!check.valid) return false;
    return hubRepository.isSlugAvailable(normalizeSlug(slug), excludeHubId);
  },

  async create(
    clinicId: string,
    input: { title: string; slug?: string; userId?: string | null }
  ): Promise<SmartHub> {
    const rawSlug = input.slug?.trim() ? input.slug : generateSlugFromTitle(input.title);
    const slugCheck = validateSlug(rawSlug);
    if (!slugCheck.valid) {
      throw new Error(slugCheck.error);
    }

    const slug = normalizeSlug(rawSlug);
    const available = await hubRepository.isSlugAvailable(slug);
    if (!available) {
      throw new Error('Este slug já está em uso. Escolha outro.');
    }

    const hub = await hubRepository.create({
      clinic_id: clinicId,
      title: input.title,
      slug,
      status: 'draft',
      layout_blocks: ['header', 'logo', 'description', 'buttons', 'footer'],
      validation_errors: [],
      created_by: input.userId ?? null,
      updated_by: input.userId ?? null,
    } as SmartHubInsert);

    await Promise.all([
      pageRepository.create({
        clinic_id: clinicId,
        hub_id: hub.id,
        title: 'Página principal',
        slug: 'home',
        is_home: true,
        status: 'draft',
        created_by: input.userId ?? null,
        updated_by: input.userId ?? null,
      }),
      themeRepository.upsert(
        clinicId,
        hub.id,
        {
          theme_name: 'default',
          primary_color: hub.primary_color,
          secondary_color: hub.secondary_color,
          font_family: hub.font_family,
        },
        input.userId
      ),
    ]);

    return hub;
  },

  async update(
    id: string,
    clinicId: string,
    payload: SmartHubUpdate,
    userId?: string | null
  ): Promise<SmartHub> {
    const next: SmartHubUpdate = {
      ...payload,
      updated_by: userId ?? payload.updated_by ?? null,
    };

    if (payload.slug) {
      const slugCheck = validateSlug(payload.slug);
      if (!slugCheck.valid) {
        throw new Error(slugCheck.error);
      }
      const slug = normalizeSlug(payload.slug);
      const available = await hubRepository.isSlugAvailable(slug, id);
      if (!available) {
        throw new Error('Este slug já está em uso. Escolha outro.');
      }
      next.slug = slug;
    }

    return hubRepository.update(id, clinicId, next);
  },

  softDelete(id: string, clinicId: string, userId?: string | null): Promise<void> {
    return hubRepository.softDelete(id, clinicId, userId);
  },

  getPublicUrl(slug: string): string {
    return buildPublicHubUrl(slug);
  },

  async validateForPublish(hubId: string): Promise<SmartHubValidationResult> {
    const raw = await hubRepository.validateForPublish(hubId);
    return asValidationResult(raw);
  },

  async publish(hubId: string): Promise<SmartHubPublishResult> {
    const raw = await hubRepository.publish(hubId);
    return asPublishResult(raw);
  },

  async pause(hubId: string): Promise<SmartHubPublishResult> {
    const raw = await hubRepository.pause(hubId);
    return asPublishResult(raw);
  },

  async revertToDraft(hubId: string): Promise<SmartHubPublishResult> {
    const raw = await hubRepository.revertToDraft(hubId);
    return asPublishResult(raw);
  },

  async applyTemplate(hubId: string, templateId: string): Promise<{ ok: boolean }> {
    const raw = await hubRepository.applyTemplate(hubId, templateId);
    const data = (raw || {}) as { ok?: boolean };
    return { ok: Boolean(data.ok) };
  },
};
