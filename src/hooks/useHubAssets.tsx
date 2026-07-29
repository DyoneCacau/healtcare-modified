import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { AssetService } from '@/services/smartHub';
import type { SmartHubAssetKind } from '@/types/smartHub';

export type HubAssetUploadInput = {
  file: File;
  kind?: SmartHubAssetKind;
  previousStoragePath?: string | null;
  buttonId?: string | null;
};

export function useHubAssets(hubId?: string | null) {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['smart-hub-assets', clinicId, hubId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['smart-hub-preview', hubId] });
  };

  const query = useQuery({
    queryKey: ['smart-hub-assets', clinicId, hubId],
    queryFn: async () => {
      if (!clinicId || !hubId) return { data: [], total: 0, page: 1, pageSize: 50 };
      return AssetService.listByHub(hubId, clinicId);
    },
    enabled: !!clinicId && !!hubId,
  });

  const uploadAsset = useMutation({
    mutationFn: async (input: File | HubAssetUploadInput) => {
      if (!clinicId || !hubId) throw new Error('Hub não encontrado.');
      const file = input instanceof File ? input : input.file;
      const kind = input instanceof File ? undefined : input.kind;
      const previousStoragePath =
        input instanceof File ? undefined : input.previousStoragePath;
      const buttonId = input instanceof File ? undefined : input.buttonId;

      return AssetService.upload(clinicId, hubId, file, {
        userId: user?.id,
        kind,
        previousStoragePath,
        buttonId,
      });
    },
    onSuccess: () => {
      invalidateRelated();
      toast.success('Imagem enviada com sucesso.');
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Não foi possível enviar a imagem.'),
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      if (!clinicId) throw new Error('Clínica não selecionada.');
      return AssetService.softDelete(id, clinicId, user?.id);
    },
    onSuccess: () => {
      invalidateRelated();
      toast.success('Arquivo removido.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao remover arquivo.'),
  });

  return {
    assets: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    uploadAsset,
    deleteAsset,
    refetch: query.refetch,
  };
}
