export type DocumentSignatureStatus = 'pending' | 'viewed' | 'signed' | 'cancelled' | 'expired';

export interface DocumentSignatureRequest {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  document_type: string;
  document_name: string;
  file_path: string;
  signer_name: string;
  signer_cpf: string | null;
  signer_cro: string | null;
  signer_state: string | null;
  signer_whatsapp: string;
  signer_birth_date: string | null;
  consent_text: string;
  status: DocumentSignatureStatus;
  token: string;
  signed_at: string | null;
  created_at: string;
}

export type DocumentSignatureRequestInput = Pick<
  DocumentSignatureRequest,
  | 'patient_id'
  | 'document_type'
  | 'document_name'
  | 'file_path'
  | 'signer_name'
  | 'signer_cpf'
  | 'signer_cro'
  | 'signer_state'
  | 'signer_whatsapp'
  | 'signer_birth_date'
  | 'consent_text'
>;

export const SIGNATURE_CONSENT_TEXT =
  'Estou ciente de que, ao enviar para assinatura, esse documento não poderá ser alterado e, ' +
  'após assinado, possui valor de assinatura eletrônica simples (Lei 14.063/2020), ficando ' +
  'registrados meu nome, CPF, IP e data/hora da confirmação.';
