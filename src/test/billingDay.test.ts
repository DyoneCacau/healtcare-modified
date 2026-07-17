import { describe, expect, it } from "vitest";
import {
  daysUntil,
  nextBillingDate,
  prorationAmount,
  buildProrationPreview,
  buildBillingSchedulePreview,
  resolveFirstDueDate,
  billingDayFromIsoDate,
} from "@/lib/billingDay";

describe("billingDay", () => {
  it("nextBillingDate pula para o próximo mês se o dia já passou", () => {
    const from = new Date("2026-07-16T15:00:00.000Z");
    expect(nextBillingDate(10, from)).toBe("2026-08-10");
    expect(nextBillingDate(20, from)).toBe("2026-07-20");
  });

  it("calcula pró-rata com mês comercial de 30 dias", () => {
    expect(prorationAmount(300, 15)).toBe(150);
    expect(prorationAmount(219.9, 25)).toBe(183.25);
  });

  it("daysUntil conta dias corridos", () => {
    const from = new Date("2026-07-16T12:00:00.000Z");
    expect(daysUntil("2026-08-10", from)).toBe(25);
  });

  it("buildProrationPreview monta resumo imediato", () => {
    const from = new Date("2026-07-16T12:00:00.000Z");
    const preview = buildProrationPreview(300, 10, from, 0);
    expect(preview.days).toBe(25);
    expect(preview.amount).toBe(250);
    expect(preview.summary).toContain("25 dias");
    expect(preview.summary).toContain("todo dia 10");
  });

  it("promo por data escolhida não cobra pró-rata", () => {
    const from = new Date("2026-07-16T12:00:00.000Z");
    const preview = buildBillingSchedulePreview(300, 15, {
      scheduleFirstCharge: true,
      firstDueDate: "2026-08-15",
      from,
    });
    expect(preview.amount).toBe(0);
    expect(preview.nextDueDate).toBe("2026-08-15");
    expect(preview.summary).toContain("Promo");
    expect(preview.summary).toContain("15/08/2026");
  });

  it("legacy promo 30 dias atrasa 1º vencimento", () => {
    const from = new Date("2026-07-16T12:00:00.000Z");
    expect(resolveFirstDueDate(10, { deferDays: 30, from })).toBe("2026-09-10");
    const preview = buildProrationPreview(300, 10, from, 30);
    expect(preview.amount).toBe(0);
    expect(preview.summary).toContain("Promo");
  });

  it("billingDayFromIsoDate usa o dia da data (máx 28)", () => {
    expect(billingDayFromIsoDate("2026-08-15")).toBe(15);
    expect(billingDayFromIsoDate("2026-01-31")).toBe(28);
  });
});
