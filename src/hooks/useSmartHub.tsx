import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { HubService, ThemeService, PageService, TemplateService, DomainService } from '@/services/smartHub';
import type { SmartHubUpdate, SmartHubValidationResult } from '@/types/smartHub';

export function useSmartHub() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const hubQuery = useQuery({
    queryKey: ['smart-hub', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      return HubService.getByClinicId(clinicId);
    },
    enabled: !!clinicId,
  });

  const pagesQuery = useQuery({
    queryKey: ['smart-hub-pages', clinicId, hubQuery.data?.id],
    queryFn: async () => {
      if (!clinicId || !hubQuery.data?.id) return [];
      return PageService.listByHub(hubQuery.data.id, clinicId);
    },
    enabled: !!clinicId && !!hubQuery.data?.id,
  });

  const themeQuery = useQuery({
    queryKey: ['smart-hub-theme', clinicId, hubQuery.data?.id],
    queryFn: async () => {
      if (!clinicId || !hubQuery.data?.id) return null;
      return ThemeService.getByHubId(hubQuery.data.id, clinicId);
    },
    enabled: !!clinicId && !!hubQuery.data?.id,
  });

  const templatesQuery = useQuery({
    queryKey: ['smart-hub-templates'],
    queryFn: () => TemplateService.list(),
  });

  const domainsQuery = useQuery({
    queryKey: ['smart-hub-domains', clinicId, hubQuery.data?.id],
    queryFn: async () => {
      if (!clinicId || !hubQuery.data?.id) return [];
      return DomainService.listByHub(hubQuery.data.id, clinicId);
    },
    enabled: !!clinicId && !!hubQuery.data?.id,
  });

  const invalidateHub = () => {
    queryClient.invalidateQueries({ queryKey: ['smart-hub', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub-pages', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub-theme', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub-analytics-metrics', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub-preview', hubQuery.data?.id] });
  };

  const createHub = useMutation({
    mutationFn: async (input: { title: string; slug?: string }) => {
      if (!clinicId) throw new Error('Selecione uma clínica.');
      return HubService.create(clinicId, { ...input, userId: user?.id });
    },
    onSuccess: () => {
      invalidateHub();
      toast.success('Smart Hub criado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao criar Smart Hub.'),
  });

  const updateHub = useMutation({
    mutationFn: async (payload: SmartHubUpdate) => {
      if (!clinicId || !hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return HubService.update(hubQuery.data.id, clinicId, payload, user?.id);
    },
    onSuccess: () => {
      invalidateHub();
      toast.success('Smart Hub atualizado.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar Smart Hub.'),
  });

  const checkSlug = useMutation({
    mutationFn: async (slug: string) => {
      return HubService.isSlugAvailable(slug, hubQuery.data?.id);
    },
  });

  const validateHub = useMutation({
    mutationFn: async () => {
      if (!hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return HubService.validateForPublish(hubQuery.data.id);
    },
    onSuccess: (result: SmartHubValidationResult) => {
      invalidateHub();
      if (result.ok) toast.success('Validação ok. Pronto para publicar.');
      else toast.error(result.errors[0]?.message || 'Corrija os erros antes de publicar.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao validar.'),
  });

  const publishHub = useMutation({
    mutationFn: async () => {
      if (!hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return HubService.publish(hubQuery.data.id);
    },
    onSuccess: (result) => {
      invalidateHub();
      if (result.ok) toast.success('Smart Hub publicado.');
      else toast.error(result.validation?.errors[0]?.message || 'Não foi possível publicar.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao publicar.'),
  });

  const pauseHub = useMutation({
    mutationFn: async () => {
      if (!hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return HubService.pause(hubQuery.data.id);
    },
    onSuccess: () => {
      invalidateHub();
      toast.success('Smart Hub pausado (offline).');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao pausar.'),
  });

  const revertToDraft = useMutation({
    mutationFn: async () => {
      if (!hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return HubService.revertToDraft(hubQuery.data.id);
    },
    onSuccess: () => {
      invalidateHub();
      toast.success('Hub voltou para rascunho.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao reverter.'),
  });

  const applyTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!hubQuery.data?.id) throw new Error('Hub não encontrado.');
      return TemplateService.apply(hubQuery.data.id, templateId);
    },
    onSuccess: () => {
      invalidateHub();
      toast.success('Template aplicado.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao aplicar template.'),
  });

  return {
    clinicId,
    hub: hubQuery.data ?? null,
    pages: pagesQuery.data ?? [],
    theme: themeQuery.data ?? null,
    templates: templatesQuery.data ?? [],
    domains: domainsQuery.data ?? [],
    isLoading: hubQuery.isLoading,
    isLoadingPages: pagesQuery.isLoading,
    publicUrl: hubQuery.data ? HubService.getPublicUrl(hubQuery.data.slug) : null,
    createHub,
    updateHub,
    checkSlug,
    validateHub,
    publishHub,
    pauseHub,
    revertToDraft,
    applyTemplate,
    refetch: hubQuery.refetch,
  };
}

export function usePublicSmartHub(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-smart-hub', slug],
    queryFn: async () => {
      if (!slug) return null;
      return HubService.getPublicBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function usePreviewSmartHub(hubId: string | undefined) {
  return useQuery({
    queryKey: ['smart-hub-preview', hubId],
    queryFn: async () => {
      if (!hubId) return null;
      return HubService.getPreviewById(hubId);
    },
    enabled: !!hubId,
    staleTime: 10_000,
  });
}
