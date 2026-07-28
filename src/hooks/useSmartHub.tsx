import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { HubService, ThemeService, PageService, TemplateService, DomainService } from '@/services/smartHub';
import type { SmartHubUpdate } from '@/types/smartHub';

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

  const createHub = useMutation({
    mutationFn: async (input: { title: string; slug?: string }) => {
      if (!clinicId) throw new Error('Selecione uma clínica.');
      return HubService.create(clinicId, { ...input, userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-hub', clinicId] });
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
      queryClient.invalidateQueries({ queryKey: ['smart-hub', clinicId] });
      toast.success('Smart Hub atualizado.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar Smart Hub.'),
  });

  const checkSlug = useMutation({
    mutationFn: async (slug: string) => {
      return HubService.isSlugAvailable(slug, hubQuery.data?.id);
    },
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
