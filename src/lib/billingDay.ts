/** Dia de vencimento comercial (1–28), agenda da 1ª cobrança e pró-rata. */

export const DEFAULT_BILLING_DAY = 10;
export const BILLING_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** @deprecated mantido para compat; preferir scheduleFirstCharge + firstDueDate */
export const BILLING_DEFER_OPTIONS = [
  { value: 0, label: "Imediato (com proporcional)" },
  { value: 30, label: "1ª mensalidade em 30 dias (promo)" },
  { value: 60, label: "1ª mensalidade em 60 dias (promo)" },
] as const;

export type BillingDeferDays = 0 | 30 | 60;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeBillingDay(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BILLING_DAY;
  return Math.min(28, Math.max(1, Math.trunc(n)));
}

export function normalizeDeferDays(value: unknown): BillingDeferDays {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 30 || n === 60) return n;
  return 0;
}

export function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Próxima ocorrência do dia D estritamente após `from` (UTC date). */
export function nextBillingDate(billingDay: number, from: Date = new Date()): string {
  const day = normalizeBillingDay(billingDay);
  const today = startOfUtcDay(from);
  let candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day));
  if (candidate.getTime() <= today.getTime()) {
    candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, day));
  }
  return toIsoDate(candidate);
}

/** 1º vencimento: data escolhida (promo) ou próximo dia D (imediato). */
export function resolveFirstDueDate(
  billingDay: number,
  options: {
    deferDays?: number;
    firstDueDate?: string | null;
    from?: Date;
  } = {},
): string {
  const from = options.from ?? new Date();
  if (isIsoDate(options.firstDueDate)) {
    const today = toIsoDate(startOfUtcDay(from));
    if (options.firstDueDate > today) return options.firstDueDate;
  }
  const defer = normalizeDeferDays(options.deferDays ?? 0);
  if (defer === 0) return nextBillingDate(billingDay, from);
  const afterPromo = startOfUtcDay(from);
  afterPromo.setUTCDate(afterPromo.getUTCDate() + defer);
  return nextBillingDate(billingDay, afterPromo);
}

export function daysUntil(isoDate: string, from: Date = new Date()): number {
  const today = startOfUtcDay(from);
  const target = startOfUtcDay(new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`));
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function prorationAmount(monthlyFee: number, days: number): number {
  if (!Number.isFinite(monthlyFee) || monthlyFee <= 0 || days <= 0) return 0;
  return Math.round(((monthlyFee * days) / 30) * 100) / 100;
}

/** Sugere dia D a partir da data da 1ª cobrança (cap 28). */
export function billingDayFromIsoDate(isoDate: string): number {
  const day = Number(isoDate.slice(8, 10));
  return normalizeBillingDay(Number.isFinite(day) ? day : DEFAULT_BILLING_DAY);
}

export interface BillingSchedulePreview {
  billingDay: number;
  scheduleFirstCharge: boolean;
  nextDueDate: string;
  days: number;
  amount: number;
  monthlyFee: number;
  summary: string;
}

/** @deprecated use buildBillingSchedulePreview */
export type BillingProrationPreview = BillingSchedulePreview & { deferDays: BillingDeferDays };

export function buildBillingSchedulePreview(
  monthlyFee: number,
  billingDay: number,
  options: {
    scheduleFirstCharge?: boolean;
    firstDueDate?: string | null;
    from?: Date;
  } = {},
): BillingSchedulePreview {
  const from = options.from ?? new Date();
  const scheduleFirstCharge = Boolean(options.scheduleFirstCharge && isIsoDate(options.firstDueDate));
  const day = normalizeBillingDay(billingDay);
  const nextDueDate = resolveFirstDueDate(day, {
    firstDueDate: scheduleFirstCharge ? options.firstDueDate : null,
    deferDays: 0,
    from,
  });
  const days = daysUntil(nextDueDate, from);
  const amount = scheduleFirstCharge ? 0 : prorationAmount(monthlyFee, days);
  const toLabel = new Date(`${nextDueDate}T12:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
  const fromLabel = startOfUtcDay(from).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  let summary: string;
  if (scheduleFirstCharge) {
    summary =
      `Promo / implantação: 1ª mensalidade de ${money.format(monthlyFee)} em ${toLabel}. `
      + `Sem proporcional até lá. Depois, recorrência todo dia ${day}. `
      + `Taxa de adesão (se houver) pode ser cobrada agora.`;
  } else if (days > 0 && amount >= 0.01) {
    summary =
      `Cobrança imediata — proporcional: ${fromLabel} a ${toLabel} (${days} dias) → ${money.format(amount)} agora. `
      + `A partir de ${toLabel}: ${money.format(monthlyFee)} todo dia ${day}.`;
  } else {
    summary =
      `Cobrança imediata: mensalidade de ${money.format(monthlyFee)} todo dia ${day}, `
      + `1º vencimento em ${toLabel}.`;
  }

  return { billingDay: day, scheduleFirstCharge, nextDueDate, days, amount, monthlyFee, summary };
}

/** Compatível com chamadas antigas (defer 0/30/60). */
export function buildProrationPreview(
  monthlyFee: number,
  billingDay: number,
  from: Date = new Date(),
  deferDays: number = 0,
  firstDueDate?: string | null,
): BillingProrationPreview {
  const defer = normalizeDeferDays(deferDays);
  const scheduled = Boolean(firstDueDate) || defer > 0;
  const resolvedFirst = resolveFirstDueDate(billingDay, { deferDays: defer, firstDueDate, from });
  const preview = buildBillingSchedulePreview(monthlyFee, billingDay, {
    scheduleFirstCharge: scheduled,
    firstDueDate: scheduled ? resolvedFirst : null,
    from,
  });
  return { ...preview, deferDays: defer };
}

/** Default sugerido: +30 dias a partir de hoje. */
export function defaultPromoFirstDueDate(from: Date = new Date()): string {
  const d = startOfUtcDay(from);
  d.setUTCDate(d.getUTCDate() + 30);
  return toIsoDate(d);
}
