import { BOOKING_FEE_CATEGORY } from '@/lib/bookingFee';
import { netRevenue, sumRegularExpenses, type FinancialAggregationTransaction } from '@/lib/financialAggregation';

/** Statuses que ainda são “agenda futura” (não realizados). */
export const OPEN_APPOINTMENT_STATUSES = new Set(['pending', 'confirmed', 'return']);

export function isOpenAppointmentStatus(status: string | null | undefined): boolean {
  return OPEN_APPOINTMENT_STATUSES.has((status || '').trim().toLowerCase());
}

export type ChartAppointment = {
  id: string;
  date: string;
  status: string;
  procedure_price?: number | string | null;
  booking_fee?: number | string | null;
};

/** Valor usado na projeção: preço do procedimento ou, na falta, o sinal. */
export function projectedAppointmentValue(apt: ChartAppointment): number {
  return Number(apt.procedure_price || 0) || Number(apt.booking_fee || 0) || 0;
}

export type ChartTransaction = FinancialAggregationTransaction & {
  created_at: string;
  reference_type?: string | null;
  reference_id?: string | null;
};

/**
 * Projeção: valor esperado dos agendamentos ainda abertos no mês (procedure_price).
 * Cancelados / concluídos / falta não entram.
 */
export function sumProjectedAppointments(
  appointments: ChartAppointment[],
  monthStartDate: string,
  monthEndDate: string,
): number {
  return appointments.reduce((sum, apt) => {
    if (!isOpenAppointmentStatus(apt.status)) return sum;
    if (apt.date < monthStartDate || apt.date > monthEndDate) return sum;
    return sum + projectedAppointmentValue(apt);
  }, 0);
}

/**
 * Receita realizada no gráfico: caixa real, excluindo sinal de agendamentos ainda abertos
 * (esse valor aparece na projeção via procedure_price; ao finalizar/cancelar/falta o sinal
 * passa a contar como receita).
 */
export function filterRealizedChartIncome(
  transactions: ChartTransaction[],
  appointmentsById: Record<string, ChartAppointment>,
): ChartTransaction[] {
  return transactions.filter((t) => {
    const category = (t.category || '').trim();
    if (category !== BOOKING_FEE_CATEGORY) return true;
    if (t.reference_type !== 'appointment' || !t.reference_id) return true;
    const apt = appointmentsById[t.reference_id];
    // Sem vínculo ou ainda aberto → não entra no verde
    if (!apt || isOpenAppointmentStatus(apt.status)) return false;
    return true;
  });
}

export function buildMonthChartPoint(input: {
  label: string;
  monthStartDate: string;
  monthEndDate: string;
  monthStartIso: string;
  monthEndIso: string;
  transactions: ChartTransaction[];
  appointments: ChartAppointment[];
  appointmentsById: Record<string, ChartAppointment>;
}) {
  const monthTransactions = input.transactions.filter(
    (t) => t.created_at >= input.monthStartIso && t.created_at <= input.monthEndIso,
  );
  const realized = filterRealizedChartIncome(monthTransactions, input.appointmentsById);

  return {
    month: input.label,
    projecao: sumProjectedAppointments(
      input.appointments,
      input.monthStartDate,
      input.monthEndDate,
    ),
    receitas: netRevenue(realized),
    despesas: sumRegularExpenses(monthTransactions),
  };
}
