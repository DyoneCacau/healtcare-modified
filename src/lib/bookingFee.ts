/** Categoria usada em financial_transactions para o sinal/taxa de agendamento. */
export const BOOKING_FEE_CATEGORY = 'Taxa de agendamento';

/** Valor padrão do sinal no formulário de agendamento. */
export const DEFAULT_BOOKING_FEE = 50;

/** Saldo do procedimento após abater o sinal já pago. */
export function remainingAfterBookingFee(
  serviceValue: number,
  bookingFee: number | null | undefined,
): number {
  const fee = Math.max(0, Number(bookingFee) || 0);
  return Math.max(0, serviceValue - fee);
}

export function bookingFeeIncomeDescription(patientName: string, suffix?: string): string {
  const base = `Sinal de agendamento - ${patientName}`;
  return suffix ? `${base} (${suffix})` : base;
}
