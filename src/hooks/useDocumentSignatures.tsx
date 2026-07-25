import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import type { DocumentSignatureRequest, DocumentSignatureRequestInput } from '@/types/documentSignature';
import { toast } from 'sonner';

function normalizeRequest(row: Record<string, unknown>): DocumentSignatureRequest {
  return {
    id: String(row.id),
    clinic_id: String(row.clinic_id),
    patient_id: row.patient_id ? String(row.patient_id) : null,
    document_type: String(row.document_type),
    document_name: String(row.document_name),
    file_path: String(row.file_path),
    signer_name: String(row.signer_name),
    signer_cpf: row.signer_cpf ? String(row.signer_cpf) : null,
    signer_cro: row.signer_cro ? String(row.signer_cro) : null,
    signer_state: row.signer_state ? String(row.signer_state) : null,
    signer_whatsapp: String(row.signer_whatsapp),
    signer_birth_date: row.signer_birth_date ? String(row.signer_birth_date) : null,
    consent_text: String(row.consent_text),
    status: row.status as DocumentSignatureRequest['status'],
    token: String(row.token),
    signed_at: row.signed_at ? String(row.signed_at) : null,
    created_at: String(row.created_at),
  };
}

/** Cria uma solicitação de assinatura eletrônica pra um documento já gerado (patient_files). */
export function useDocumentSignatureMutations() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createSignatureRequest = useMutation({
    mutationFn: async (input: DocumentSignatureRequestInput) => {
      if (!clinicId) throw new Error('Clínica não identificada');
      const token = crypto.randomUUID();
      const { data, error } = await (supabase as any)
        .from('document_signature_requests')
        .insert({
          ...input,
          clinic_id: clinicId,
          token,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return normalizeRequest(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-signature-requests'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar solicitação de assinatura:', error);
      toast.error('Erro ao criar a solicitação de assinatura');
    },
  });

  return { createSignatureRequest };
}
