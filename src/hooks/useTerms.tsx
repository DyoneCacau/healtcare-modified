import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { toast } from 'sonner';
import { ConsentTerm, ClinicBranding, ClinicDocument, ClinicDocumentType } from '@/types/terms';

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

  const rawColor = (clinic as { primary_color?: string | null })?.primary_color;
  const branding: ClinicBranding = {
    clinicId: clinicId || '',
    logo: clinic?.logo_url || undefined,
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
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
      if (!allowed.includes(ext)) throw new Error('Formato invalido. Use PNG, JPG, JPEG, GIF, WEBP ou SVG.');
      const path = `${clinicId}/logo/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('clinic-documents')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from('clinic-documents').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('clinics')
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', clinicId);
      if (updateError) throw new Error(updateError.message);
      return urlData.publicUrl;
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
      return (data || []).map(rows => ({
        id: rows.id,
        clinicId: rows.clinic_id,
        name: rows.name,
        type: rows.type as ClinicDocumentType,
        fileUrl: rows.file_url,
        content: rows.content,
        isUpload: rows.is_upload,
        createdAt: rows.created_at,
        updatedAt: rows.updated_at,
      })) as ClinicDocument[];
    },
    enabled: !!clinicId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, name, type }: { file: File; name: string; type: ClinicDocumentType }) => {
      if (!clinicId) throw new Error('Clinic ID required');
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safeName = (name || 'documento').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'doc';
      const path = `${clinicId}/${Date.now()}-${safeName}.${ext || 'pdf'}`;
      const { error: uploadError } = await supabase.storage
        .from('clinic-documents')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from('clinic-documents').getPublicUrl(path);
      const { error: insertError } = await supabase.from('clinic_documents').insert({
        clinic_id: clinicId,
        name,
        type,
        file_url: urlData.publicUrl,
        is_upload: true,
      });
      if (insertError) throw new Error(insertError.message);
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
      const { error } = await supabase.from('clinic_documents').delete().eq('id', id);
      if (error) throw error;
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
