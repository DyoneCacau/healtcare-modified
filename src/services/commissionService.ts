import { CommissionRule, CommissionCalculation, CalculationType, BeneficiaryType, calculateAutoPriority } from '@/types/commission';
import { Transaction } from '@/types/financial';
import { AgendaAppointment } from '@/types/agenda';

export interface CompleteAppointmentResult {
  commissions: CommissionCalculation[];
  incomeTransaction: Transaction;
  commissionTransactions: Transaction[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: 'NO_RULE' | 'DUPLICATE' | 'ALREADY_PAID' | 'INVALID_VALUE';
}

/**
 * Validates if an appointment can be completed with commission
 */
export function validateAppointmentCompletion(
  appointment: AgendaAppointment,
  rules: CommissionRule[],
  existingCalculations: CommissionCalculation[],
  requireRule: boolean = true
): ValidationResult {
  // Check for duplicate calculation
  const existingCalc = existingCalculations.find(
    calc => calc.appointmentId === appointment.id && calc.beneficiaryType === 'professional'
  );
  
  if (existingCalc) {
    return {
      isValid: false,
      error: 'Este atendimento já possui comissão calculada.',
      errorCode: 'DUPLICATE',
    };
  }

  // Check for valid commission rule (if required)
  if (requireRule) {
    const applicableRule = findApplicableRule(
      rules,
      appointment.professional.id,
      appointment.clinic.id,
      appointment.procedure,
      new Date(appointment.date)
    );

    if (!applicableRule) {
      return {
        isValid: false,
        error: 'Nenhuma regra de comissão válida encontrada para este atendimento. Configure uma regra antes de finalizar.',
        errorCode: 'NO_RULE',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates if a commission calculation can be edited
 */
export function validateCommissionEdit(
  calculation: CommissionCalculation
): ValidationResult {
  if (calculation.status === 'paid') {
    return {
      isValid: false,
      error: 'Não é possível editar uma comissão já paga.',
      errorCode: 'ALREADY_PAID',
    };
  }

  return { isValid: true };
}

/**
 * Validates if a commission calculation can be deleted
 */
export function validateCommissionDelete(
  calculation: CommissionCalculation
): ValidationResult {
  if (calculation.status === 'paid') {
    return {
      isValid: false,
      error: 'Não é possível excluir uma comissão já paga.',
      errorCode: 'ALREADY_PAID',
    };
  }

  return { isValid: true };
}

/**
 * Checks if a commission already exists for an appointment
 */
export function hasExistingCommission(
  appointmentId: string,
  beneficiaryType: BeneficiaryType = 'professional',
  existingCalculations: CommissionCalculation[] = []
): boolean {
  return existingCalculations.some(
    calc => calc.appointmentId === appointmentId && calc.beneficiaryType === beneficiaryType
  );
}

/**
 * Finds all applicable commission rules for an appointment (professional + staff)
 */
export function findApplicableRules(
  rules: CommissionRule[],
  professionalId: string,
  clinicId: string,
  procedure: string,
  date: Date,
  sellerId?: string
): CommissionRule[] {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    date.getDay()
  ] as CommissionRule['dayOfWeek'];

  // Filter applicable rules and sort by priority (higher first)
  const applicableRules = rules
    .filter((rule) => {
      if (!rule.isActive) return false;
      if (rule.clinicId !== clinicId) return false;

      // Check professional match (for professional type rules)
      if (rule.beneficiaryType === 'professional') {
        if (rule.professionalId !== 'all' && rule.professionalId !== professionalId) return false;
      }

      // Check procedure match
      if (rule.procedure !== 'all' && rule.procedure !== procedure) return false;

      // Check day of week match
      if (rule.dayOfWeek !== 'all' && rule.dayOfWeek !== dayOfWeek) return false;

      // For seller rules, only include if seller is assigned
      if (rule.beneficiaryType === 'seller') {
        if (!sellerId) return false;
        // Either a general seller rule or specific to this seller
        if (rule.beneficiaryId && rule.beneficiaryId !== sellerId) return false;
      }

      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  // Group by beneficiary type and get best rule for each
  const rulesByBeneficiary = new Map<string, CommissionRule>();
  
  applicableRules.forEach(rule => {
    const key = `${rule.beneficiaryType}-${rule.beneficiaryId || 'general'}`;
    if (!rulesByBeneficiary.has(key)) {
      rulesByBeneficiary.set(key, rule);
    }
  });

  return Array.from(rulesByBeneficiary.values());
}

/**
 * Legacy function for backward compatibility
 */
export function findApplicableRule(
  rules: CommissionRule[],
  professionalId: string,
  clinicId: string,
  procedure: string,
  date: Date
): CommissionRule | null {
  const allRules = findApplicableRules(rules, professionalId, clinicId, procedure, date);
  // Return the professional rule
  return allRules.find(r => r.beneficiaryType === 'professional') || null;
}

/**
 * Calculates commission amount based on the rule and quantity
 */
export function calculateCommissionAmount(
  rule: CommissionRule,
  serviceValue: number,
  quantity: number = 1
): number {
  if (rule.calculationType === 'percentage') {
    return (serviceValue * rule.value) / 100;
  }
  
  // Fixed value - multiply by quantity for unit-based calculations
  if (rule.calculationUnit !== 'appointment') {
    return rule.value * quantity;
  }
  return rule.value;
}

/**
 * Gets the price for a procedure - returns default if not found
 */
export function getProcedurePrice(
  procedure: string,
  clinicId: string
): number {
  // Return default price - in production this would query the database
  return 150;
}

/**
 * Completes an appointment and generates all related financial entries
 */
export function completeAppointment(
  appointment: AgendaAppointment,
  serviceValue: number,
  paymentMethod: Transaction['paymentMethod'],
  rules: CommissionRule[] = [],
  quantity: number = 1,
  sellerId?: string,
  receptionistId?: string
): CompleteAppointmentResult {
  const appointmentDate = new Date(appointment.date);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  // Use seller from appointment if not provided explicitly
  const effectiveSellerId = sellerId || appointment.sellerId;

  // Find all applicable commission rules (now with seller)
  const applicableRules = findApplicableRules(
    rules,
    appointment.professional.id,
    appointment.clinic.id,
    appointment.procedure,
    appointmentDate,
    effectiveSellerId
  );

  // Create income transaction
  const incomeTransaction: Transaction = {
    id: `tr${Date.now()}`,
    type: 'income',
    description: `${appointment.procedure} - ${appointment.patientName}`,
    amount: serviceValue,
    paymentMethod,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    appointmentId: appointment.id,
    category: 'Procedimento Odontológico',
    date: dateStr,
    time: timeStr,
    userId: 'user1',
    userName: 'Recepcionista',
  };

  const commissions: CommissionCalculation[] = [];
  const commissionTransactions: Transaction[] = [];

  applicableRules.forEach((rule, index) => {
    // Skip staff rules if no staff is assigned
    if (rule.beneficiaryType === 'seller' && !effectiveSellerId && !rule.beneficiaryId) return;
    if (rule.beneficiaryType === 'reception' && !receptionistId && !rule.beneficiaryId) return;

    const commissionAmount = calculateCommissionAmount(rule, serviceValue, quantity);
    
    // Determine beneficiary info
    let beneficiaryId = rule.beneficiaryId;
    let beneficiaryName = rule.beneficiaryName;
    
    if (rule.beneficiaryType === 'seller' && effectiveSellerId) {
      beneficiaryId = effectiveSellerId;
      beneficiaryName = appointment.sellerName || 'Vendedor';
    } else if (rule.beneficiaryType === 'reception' && receptionistId) {
      beneficiaryId = receptionistId;
      beneficiaryName = 'Recepcionista';
    }

    // Create commission calculation record with seller and lead info
    const commission: CommissionCalculation = {
      id: `calc${Date.now()}_${index}`,
      appointmentId: appointment.id,
      professionalId: appointment.professional.id,
      professionalName: appointment.professional.name,
      beneficiaryType: rule.beneficiaryType,
      beneficiaryId,
      beneficiaryName,
      clinicId: appointment.clinic.id,
      clinicName: appointment.clinic.name,
      procedure: appointment.procedure,
      serviceValue,
      quantity,
      commissionRuleId: rule.id,
      calculationType: rule.calculationType,
      calculationUnit: rule.calculationUnit,
      ruleValue: rule.value,
      commissionAmount,
      date: dateStr,
      status: 'pending',
      // Track seller and lead source
      sellerId: appointment.sellerId,
      sellerName: appointment.sellerName,
      leadSource: appointment.leadSource,
    };
    
    commissions.push(commission);

    // Create commission expense transaction
    const displayName = beneficiaryName || appointment.professional.name;
    const unitLabel = rule.calculationUnit !== 'appointment' ? ` (${quantity}x)` : '';
    
    const commissionTransaction: Transaction = {
      id: `tr${Date.now() + index + 1}`,
      type: 'expense',
      description: `Comissão ${displayName} - ${appointment.procedure}${unitLabel}`,
      amount: commissionAmount,
      paymentMethod: 'cash',
      category: 'Comissão',
      date: dateStr,
      time: timeStr,
      userId: 'user1',
      userName: 'Sistema',
      notes: `Ref. atendimento ${appointment.id} | Tipo: ${rule.beneficiaryType} | Regra: ${rule.calculationType === 'percentage' ? `${rule.value}%` : `R$ ${rule.value}/${rule.calculationUnit}`}`,
    };
    
    commissionTransactions.push(commissionTransaction);
  });

  return {
    commissions,
    incomeTransaction,
    commissionTransactions,
  };
}

/**
 * Formats commission info for display
 */
export function formatCommissionInfo(rule: CommissionRule | null): string {
  if (!rule) {
    return 'Sem regra de comissão aplicável';
  }

  if (rule.calculationType === 'percentage') {
    return `${rule.value}% do valor`;
  }
  
  const unitLabel = rule.calculationUnit === 'appointment' ? '' : `/${rule.calculationUnit}`;
  return `R$ ${rule.value.toFixed(2)}${unitLabel}`;
}

/**
 * Gets available staff members by role - returns empty array (use hooks to get real data)
 */
export function getStaffByRole(role: BeneficiaryType, clinicId?: string): { id: string; name: string; role: string; isActive: boolean; clinicId?: string }[] {
  return [];
}
