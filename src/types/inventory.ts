export interface InventoryProduct {
  id: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  sku: string;
  unit: 'unidade' | 'caixa' | 'pacote' | 'ml' | 'g';
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  sellingPrice?: number;
  supplier?: string;
  clinicId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InventoryCategory = 
  | 'material_consumo' 
  | 'material_escritorio'
  | 'medicamento'
  | 'equipamento'
  | 'epi'
  | 'limpeza'
  | 'outros';

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  material_consumo: 'Material de Consumo',
  material_escritorio: 'Material de Escritório',
  medicamento: 'Medicamento',
  equipamento: 'Equipamento',
  epi: 'EPI',
  limpeza: 'Limpeza',
  outros: 'Outros',
};

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  clinicId: string;
  date: string;
  time: string;
  notes?: string;
}

export const movementTypeLabels: Record<InventoryMovement['type'], string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
};
