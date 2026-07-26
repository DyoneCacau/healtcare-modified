export interface ClinicMedication {
  id: string;
  clinic_id: string;
  name: string;
  is_controlled: boolean;
  default_posologia: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ClinicMedicationInput = Pick<ClinicMedication, 'name' | 'is_controlled' | 'default_posologia' | 'is_active'>;
