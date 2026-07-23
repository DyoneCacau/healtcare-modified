export type ProcedureBillingUnit = 'appointment' | 'session' | 'unit' | 'ml' | 'arch';

export interface ClinicProcedure {
  id: string;
  clinic_id: string;
  name: string;
  category: string;
  description: string | null;
  default_price: number;
  duration_minutes: number;
  billing_unit: ProcedureBillingUnit;
  default_commission: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ClinicProcedureInput = Pick<
  ClinicProcedure,
  | 'name'
  | 'category'
  | 'description'
  | 'default_price'
  | 'duration_minutes'
  | 'billing_unit'
  | 'default_commission'
  | 'is_active'
>;

export const BILLING_UNIT_LABELS: Record<ProcedureBillingUnit, string> = {
  appointment: 'Atendimento',
  session: 'Sessão',
  unit: 'Unidade',
  ml: 'ml',
  arch: 'Arcada',
};
