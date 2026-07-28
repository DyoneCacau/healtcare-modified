import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { AssetService } from '@/services/smartHub';

export function useHubAssets(hubId?: string | null) {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['smart-hub-assets', clinicId, hubId],
    queryFn: async () => {
      if (!clinicId || !hubId) return { data: [], total: 0, page: 1, pageSize: 50 };
      return AssetService.listByHub(hubId, clinicId);
    },
    enabled: !!clinicId && !!hubId,
  });

  const uploadAsset = useMutation({
    mutationFn: async (file: File) => {
      if (!clinicId || !hubId) throw new Error('Hub não encontrado.');
      return AssetService.upload(clinicId, hubId, file, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-hub-assets', clinicId, hubId] });
      toast.success('Arquivo enviado.');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro no upload.'),
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      if (!clinicId) throw new Error('Clínica não selecionada.');
      return AssetService.softDelete(id, clinicId, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-hub-assets', clinicId, hubId] });
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
