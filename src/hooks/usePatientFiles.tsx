import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { PatientFile, PatientFileCategory } from '@/types/patientFile';

const PATIENT_FILES_BUCKET = 'patient-files';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

type PatientFileRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  evolution_id: string | null;
  name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  category: string;
  notes: string;
  tooth_number: number | null;
  rotation: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapFile(row: PatientFileRow, signedUrl?: string | null): PatientFile {
  const rotation = ([0, 90, 180, 270].includes(row.rotation) ? row.rotation : 0) as
    | 0
    | 90
    | 180
    | 270;

  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    evolutionId: row.evolution_id,
    name: row.name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    fileSize: row.file_size || 0,
    category: (row.category as PatientFileCategory) || 'outro',
    notes: row.notes || '',
    toothNumber: row.tooth_number,
    rotation,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    signedUrl: signedUrl ?? null,
  };
}

async function createSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error('Erro ao assinar URL do arquivo clínico:', error);
    return null;
  }
  return data.signedUrl;
}

function sanitizeFileName(name: string): string {
  return (name || 'arquivo').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60) || 'arquivo';
}

export function usePatientFiles(patientId: string | undefined) {
  const { clinicId } = useClinic();

  const { data: files, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-files', clinicId, patientId],
    queryFn: async () => {
      if (!clinicId || !patientId) return [];

      const { data, error } = await supabase
        .from('patient_files')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as PatientFileRow[];
      return Promise.all(
        rows.map(async (row) => {
          const signedUrl = await createSignedUrl(row.file_path);
          return mapFile(row, signedUrl);
        })
      );
    },
    enabled: !!clinicId && !!patientId,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
    refetchInterval: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });

  return {
    files: files || [],
    isLoading,
    error,
    refetch,
  };
}

export function usePatientFileMutations(patientId: string | undefined) {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['patient-files', clinicId, patientId] });
  };

  const uploadFile = useMutation({
    mutationFn: async (input: {
      file: File;
      name?: string;
      category: PatientFileCategory;
      notes?: string;
      toothNumber?: number | null;
      evolutionId?: string | null;
    }) => {
      if (!clinicId || !patientId) throw new Error('Clínica ou paciente não encontrado');
      if (!ALLOWED_MIME_TYPES.has(input.file.type)) {
        throw new Error('Formato inválido. Use JPG, PNG, WEBP, GIF ou PDF.');
      }
      if (input.file.size > MAX_FILE_SIZE) {
        throw new Error('O arquivo deve ter no máximo 10 MB.');
      }

      const ext = (input.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const baseName = sanitizeFileName(input.name || input.file.name.replace(/\.[^.]+$/, ''));
      const path = `${clinicId}/${patientId}/${Date.now()}-${baseName}.${ext || 'bin'}`;

      const { error: uploadError } = await supabase.storage
        .from(PATIENT_FILES_BUCKET)
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error: insertError } = await supabase
        .from('patient_files')
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          evolution_id: input.evolutionId || null,
          name: (input.name || input.file.name).trim() || 'Arquivo',
          file_path: path,
          mime_type: input.file.type,
          file_size: input.file.size,
          category: input.category,
          notes: (input.notes || '').trim(),
          tooth_number: input.toothNumber ?? null,
          rotation: 0,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from(PATIENT_FILES_BUCKET).remove([path]);
        throw new Error(insertError.message);
      }

      return mapFile(data as PatientFileRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Arquivo anexado!');
    },
    onError: (error: Error) => {
      console.error('Erro ao anexar arquivo clínico:', error);
      toast.error(error.message || 'Erro ao anexar arquivo');
    },
  });

  const updateFile = useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      notes?: string;
      category?: PatientFileCategory;
      toothNumber?: number | null;
      evolutionId?: string | null;
      rotation?: 0 | 90 | 180 | 270;
    }) => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.notes !== undefined) payload.notes = input.notes.trim();
      if (input.category !== undefined) payload.category = input.category;
      if (input.toothNumber !== undefined) payload.tooth_number = input.toothNumber;
      if (input.evolutionId !== undefined) payload.evolution_id = input.evolutionId;
      if (input.rotation !== undefined) payload.rotation = input.rotation;

      const { data, error } = await supabase
        .from('patient_files')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapFile(data as PatientFileRow);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Alterações salvas!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar arquivo clínico:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (id: string) => {
      const { data: file, error: lookupError } = await supabase
        .from('patient_files')
        .select('file_path')
        .eq('id', id)
        .single();
      if (lookupError) throw lookupError;

      if (file?.file_path) {
        const { error: storageError } = await supabase.storage
          .from(PATIENT_FILES_BUCKET)
          .remove([file.file_path]);
        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase.from('patient_files').delete().eq('id', id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Arquivo removido');
    },
    onError: (error) => {
      console.error('Erro ao remover arquivo clínico:', error);
      toast.error('Erro ao remover arquivo');
    },
  });

  return { uploadFile, updateFile, deleteFile };
}
