import { LeadSource } from './agenda';

export type CalculationType = 'percentage' | 'fixed';

export type CalculationUnit = 'appointment' | 'ml' | 'arch' | 'unit' | 'session';

export type BeneficiaryType = 'professional' | 'seller' | 'reception';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all';

export interface CommissionRule {
  id: string;
  clinicId: string;
  professionalId: string | 'all';
  beneficiaryType: BeneficiaryType;
  beneficiaryId?: string; // For seller/reception specific rules
  beneficiaryName?: string;
  procedure: string | 'all';
  dayOfWeek: DayOfWeek;
  calculationType: CalculationType;
  calculationUnit: CalculationUnit;
  value: number; // percentage (0-100) or fixed amount
  isActive: boolean;
  priority: number; // higher priority rules are applied first (auto-calculated based on specificity)
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface CommissionCalculation {
  id: string;
  appointmentId: string;
  professionalId: string;
  professionalName: string;
  beneficiaryType: BeneficiaryType;
  beneficiaryId?: string;
  beneficiaryName?: string;
  clinicId: string;
  clinicName: string;
  procedure: string;
  serviceValue: number;
  quantity: number; // For ml, arch, unit calculations
  commissionRuleId: string;
  calculationType: CalculationType;
  calculationUnit: CalculationUnit;
  ruleValue: number;
  commissionAmount: number;
  date: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  transactionId?: string;
  // New fields for tracking
  sellerId?: string;
  sellerName?: string;
  leadSource?: LeadSource;
}

export interface CommissionSummary {
  professionalId: string;
  professionalName: string;
  beneficiaryType: BeneficiaryType;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  averageCommissionRate: number;
}

export interface ProcedurePrice {
  id: string;
  clinicId: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

// Staff members (sellers, receptionists)
export interface StaffMember {
  id: string;
  name: string;
  role: BeneficiaryType;
  clinicId: string;
  isActive: boolean;
}

export const daysOfWeekLabels: Record<DayOfWeek, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
  all: 'Todos os dias',
};

export const calculationTypeLabels: Record<CalculationType, string> = {
  percentage: 'Percentual (%)',
  fixed: 'Valor Fixo (R$)',
};

export const calculationUnitLabels: Record<CalculationUnit, string> = {
  appointment: 'Por Atendimento',
  ml: 'Por mL',
  arch: 'Por Arcada',
  unit: 'Por Unidade',
  session: 'Por Sessão',
};

export const beneficiaryTypeLabels: Record<BeneficiaryType, string> = {
  professional: 'Profissional',
  seller: 'Vendedor',
  reception: 'Recepção',
};

/**
 * Calculates automatic priority based on rule specificity
 * More specific rules get higher priority
 */
export function calculateAutoPriority(rule: Partial<CommissionRule>): number {
  let priority = 1;
  
  // Specific professional adds 20
  if (rule.professionalId && rule.professionalId !== 'all') {
    priority += 20;
  }
  
  // Specific procedure adds 15
  if (rule.procedure && rule.procedure !== 'all') {
    priority += 15;
  }
  
  // Specific day of week adds 10
  if (rule.dayOfWeek && rule.dayOfWeek !== 'all') {
    priority += 10;
  }
  
  // Specific beneficiary adds 5
  if (rule.beneficiaryId) {
    priority += 5;
  }
  
  return priority;
}
