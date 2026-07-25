export interface ClinicProcedureMaterial {
  id: string;
  clinic_id: string;
  procedure_id: string;
  product_id: string;
  default_quantity: number;
  sort_order: number;
  product_name?: string | null;
  product_unit?: string | null;
  current_stock?: number | null;
}

export interface ProcedureMaterialDraft {
  /** id temporário na UI */
  key: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: string;
  currentStock: number;
  fromTemplate: boolean;
}

export interface AppointmentMaterialUsageInput {
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  overridden: boolean;
  overrideReason?: string;
}

export interface AppointmentMaterialRow {
  id: string;
  appointment_id: string;
  product_id: string;
  product_name: string;
  product_unit: string | null;
  quantity: number;
  overridden: boolean;
  override_reason: string | null;
  created_at: string;
}
