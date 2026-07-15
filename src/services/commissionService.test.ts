import { describe, expect, it } from "vitest";
import type { AgendaAppointment } from "@/types/agenda";
import type { CommissionCalculation, CommissionRule } from "@/types/commission";
import {
  calculateCommissionAmount,
  findApplicableRule,
  findApplicableRules,
  hasExistingCommission,
  validateAppointmentCompletion,
  validateCommissionDelete,
  validateCommissionEdit,
} from "./commissionService";

const appointment: AgendaAppointment = {
  id: "appointment-1",
  date: "2026-07-15",
  startTime: "09:00",
  endTime: "10:00",
  patientId: "patient-1",
  patientName: "Paciente",
  professional: { id: "professional-1", name: "Profissional", specialty: "Clínica", cro: "123" },
  procedure: "Limpeza",
  status: "completed",
  paymentStatus: "paid",
  clinic: { id: "clinic-1", name: "Clínica" },
};

const rule = (overrides: Partial<CommissionRule> = {}): CommissionRule => ({
  id: "rule-1",
  clinicId: "clinic-1",
  professionalId: "professional-1",
  beneficiaryType: "professional",
  procedure: "all",
  dayOfWeek: "all",
  calculationType: "percentage",
  calculationUnit: "appointment",
  value: 10,
  isActive: true,
  priority: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const calculation = (overrides: Partial<CommissionCalculation> = {}): CommissionCalculation => ({
  id: "calculation-1",
  appointmentId: appointment.id,
  professionalId: appointment.professional.id,
  professionalName: appointment.professional.name,
  beneficiaryType: "professional",
  clinicId: appointment.clinic.id,
  clinicName: appointment.clinic.name,
  procedure: appointment.procedure,
  serviceValue: 200,
  quantity: 1,
  commissionRuleId: "rule-1",
  calculationType: "percentage",
  calculationUnit: "appointment",
  ruleValue: 10,
  commissionAmount: 20,
  date: appointment.date,
  status: "pending",
  ...overrides,
});

describe("commissionService", () => {
  it("calcula percentual e valor fixo por quantidade", () => {
    expect(calculateCommissionAmount(rule(), 250)).toBe(25);
    expect(
      calculateCommissionAmount(
        rule({ calculationType: "fixed", calculationUnit: "unit", value: 12 }),
        250,
        3,
      ),
    ).toBe(36);
  });

  it("seleciona a regra profissional mais prioritária e normaliza procedimento", () => {
    const general = rule({ id: "general", professionalId: "all", priority: 1 });
    const specific = rule({ id: "specific", procedure: "  LIMPEZA ", priority: 20 });

    expect(findApplicableRule([general, specific], "professional-1", "clinic-1", "limpeza", new Date("2026-07-15"))?.id)
      .toBe("specific");
  });

  it("inclui regra de vendedor apenas quando há vendedor associado", () => {
    const sellerRule = rule({
      id: "seller",
      beneficiaryType: "seller",
      beneficiaryId: "seller-1",
      professionalId: "all",
    });

    expect(findApplicableRules([sellerRule], "professional-1", "clinic-1", "Limpeza", new Date("2026-07-15")))
      .toHaveLength(0);
    expect(findApplicableRules([sellerRule], "professional-1", "clinic-1", "Limpeza", new Date("2026-07-15"), "seller-1"))
      .toEqual([sellerRule]);
  });

  it("impede duplicidade e alteração ou exclusão de comissão paga", () => {
    const paid = calculation({ status: "paid" });

    expect(hasExistingCommission(appointment.id, "professional", [paid])).toBe(true);
    expect(validateAppointmentCompletion(appointment, [rule()], [paid])).toMatchObject({
      isValid: false,
      errorCode: "DUPLICATE",
    });
    expect(validateCommissionEdit(paid).errorCode).toBe("ALREADY_PAID");
    expect(validateCommissionDelete(paid).errorCode).toBe("ALREADY_PAID");
  });

  it("exige regra aplicável somente quando configurado", () => {
    expect(validateAppointmentCompletion(appointment, [], [], true).errorCode).toBe("NO_RULE");
    expect(validateAppointmentCompletion(appointment, [], [], false)).toEqual({ isValid: true });
  });
});
