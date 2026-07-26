export type PatientFileCategory = 'radiografia' | 'foto' | 'documento' | 'outro';

export interface PatientFile {
  id: string;
  clinicId: string;
  patientId: string;
  evolutionId: string | null;
  name: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  category: PatientFileCategory;
  notes: string;
  toothNumber: number | null;
  rotation: 0 | 90 | 180 | 270;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** URL assinada para visualização (preenchida no hook). */
  signedUrl?: string | null;
}

export const PATIENT_FILE_CATEGORY_LABELS: Record<PatientFileCategory, string> = {
  radiografia: 'Radiografia',
  foto: 'Foto',
  documento: 'Documento',
  outro: 'Outro',
};
