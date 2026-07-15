import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { ConsentTerm, ClinicBranding, ClinicDocument, ClinicDocumentType } from '@/types/terms';

const CLINIC_DOCUMENTS_BUCKET = 'clinic-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function getStorageObjectPath(value: string | null | undefined, bucket: string): string | null {
  if (!value) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const markerIndex = value.indexOf(marker);
  const signedMarkerIndex = value.indexOf(signedMarker);

  if (markerIndex >= 0) {
    return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
  }
  if (signedMarkerIndex >= 0) {
    return decodeURIComponent(value.slice(signedMarkerIndex + signedMarker.length).split('?')[0]);
  }
  if (value.startsWith(`${bucket}/`)) return value.slice(bucket.length + 1);
  if (!value.includes('://')) return value.replace(/^\/+/, '');
  return null;
}

async function createClinicDocumentSignedUrl(
  storedValue: string | null | undefined
): Promise<string | null> {
  const path = getStorageObjectPath(storedValue, CLINIC_DOCUMENTS_BUCKET);
  if (!path) return storedValue || null;

  const { data, error } = await supabase.storage
    .from(CLINIC_DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export function useTerms() {
  const { clinicId } = useClinic();

  const { data: terms, isLoading, error, refetch } = useQuery({
    queryKey: ['terms', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to frontend types
      return (data || []).map(term => ({
        id: term.id,
        clinicId: term.clinic_id,
        title: term.title,
        content: term.content,
        type: term.type as ConsentTerm['type'],
        isActive: term.is_active,
        createdAt: term.created_at,
        updatedAt: term.updated_at,
      })) as ConsentTerm[];
    },
    enabled: !!clinicId,
  });

  return { 
    terms: terms || [], 
    isLoading, 
    error,
    refetch 
  };
}

export function useTermMutations() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  const createTerm = useMutation({
    mutationFn: async (data: Omit<ConsentTerm, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      
      const { data: term, error } = await supabase
        .from('terms')
        .insert({
          clinic_id: clinicId,
          title: data.title,
          content: data.content,
          type: data.type,
          is_active: data.isActive,
        })
        .select()
        .single();

      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating term:', error);
      toast.error('Erro ao criar termo');
    },
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ConsentTerm> & { id: string }) => {
      const { data: term, error } = await supabase
        .from('terms')
        .update({
          title: data.title,
          content: data.content,
          type: data.type,
          is_active: data.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating term:', error);
      toast.error('Erro ao atualizar termo');
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Termo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting term:', error);
      toast.error('Erro ao excluir termo');
    },
  });

  return { createTerm, updateTerm, deleteTerm };
}

// Hook for clinic branding (stored in clinics table)
export function useClinicBranding() {
  const { clinic, clinicId } = useClinic();
  const queryClient = useQueryClient();
  const storedLogo = clinic?.logo_url || null;
  const { data: signedLogoUrl } = useQuery({
    queryKey: ['clinic-logo-signed-url', clinicId, storedLogo],
    queryFn: () => createClinicDocumentSignedUrl(storedLogo),
    enabled: !!clinicId && !!storedLogo,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
    refetchInterval: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });

  const rawColor = (clinic as { primary_color?: string | null })?.primary_color;
  const branding: ClinicBranding = {
    clinicId: clinicId || '',
    logo: signedLogoUrl || undefined,
    primaryColor: rawColor || '#000000',
    hasCustomColor: !!rawColor,
  };

  const updateBranding = useMutation({
    mutationFn: async (data: Partial<ClinicBranding>) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      
      const updatePayload: Record<string, unknown> = {
        logo_url: data.logo,
        updated_at: new Date().toISOString(),
      };
      if (data.primaryColor !== undefined) {
        updatePayload.primary_color = data.primaryColor ?? null;
      }
      const { error } = await supabase
        .from('clinics')
        .update(updatePayload)
        .eq('id', clinicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      console.error('Error updating branding:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!clinicId) throw new Error('Clinic ID is required');
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const allowed = ['png', 'jpg', 'jpeg', 'webp'];
      if (!allowed.includes(ext)) throw new Error('Formato inválido. Use PNG, JPG, JPEG ou WEBP.');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        throw new Error('O conteúdo do arquivo não corresponde a uma imagem permitida.');
      }
      if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.');
      const path = `${clinicId}/logo/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(CLINIC_DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { error: updateError } = await supabase
        .from('clinics')
        .update({ logo_url: path, updated_at: new Date().toISOString() })
        .eq('id', clinicId);
      if (updateError) throw new Error(updateError.message);
      const signedUrl = await createClinicDocumentSignedUrl(path);
      if (!signedUrl) throw new Error('Não foi possível gerar a URL assinada do logo');
      return signedUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Logo atualizado com sucesso!');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao enviar logo'),
  });

  return { branding, updateBranding, uploadLogo };
}

export function useClinicDocuments() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['clinic-documents', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('clinic_documents')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return Promise.all((data || []).map(async rows => ({
          id: rows.id,
          clinicId: rows.clinic_id,
          name: rows.name,
          type: rows.type as ClinicDocumentType,
          fileUrl: await createClinicDocumentSignedUrl(rows.file_url),
          content: rows.content,
          isUpload: rows.is_upload,
          createdAt: rows.created_at,
          updatedAt: rows.updated_at,
        }))) as Promise<ClinicDocument[]>;
    },
    enabled: !!clinicId,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
    refetchInterval: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, name, type }: { file: File; name: string; type: ClinicDocumentType }) => {
      if (!clinicId) throw new Error('Clinic ID required');
      const allowedMimeTypes = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
      if (!allowedMimeTypes.has(file.type)) {
        throw new Error('Formato inválido. Use PDF, DOC, DOCX, JPG, PNG ou WEBP.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('O arquivo deve ter no máximo 10 MB.');
      }
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safeName = (name || 'documento').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'doc';
      const path = `${clinicId}/${Date.now()}-${safeName}.${ext || 'pdf'}`;
      const { error: uploadError } = await supabase.storage
        .from(CLINIC_DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error: insertError } = await supabase.from('clinic_documents').insert({
        clinic_id: clinicId,
        name,
        type,
        file_url: path,
        is_upload: true,
      });
      if (insertError) {
        await supabase.storage.from(CLINIC_DOCUMENTS_BUCKET).remove([path]);
        throw new Error(insertError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-documents'] });
      toast.success('Documento enviado com sucesso!');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao enviar documento'),
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('clinic_documents')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-documents'] });
      toast.success('Documento renomeado!');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao renomear'),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { data: document, error: lookupError } = await supabase
        .from('clinic_documents')
        .select('file_url')
        .eq('id', id)
        .single();
      if (lookupError) throw lookupError;
      const path = getStorageObjectPath(document.file_url, CLINIC_DOCUMENTS_BUCKET);
      if (path) {
        const { error: storageError } = await supabase.storage
          .from(CLINIC_DOCUMENTS_BUCKET)
          .remove([path]);
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await supabase.from('clinic_documents').delete().eq('id', id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-documents'] });
      toast.success('Documento excluído!');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  return {
    documents: documents || [],
    isLoading,
    refetch,
    uploadDocument,
    updateDocument,
    deleteDocument,
  };
}
