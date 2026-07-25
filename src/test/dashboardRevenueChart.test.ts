import { describe, expect, it } from 'vitest';
import {
  buildMonthChartPoint,
  filterRealizedChartIncome,
  isOpenAppointmentStatus,
  sumProjectedAppointments,
} from '@/lib/dashboardRevenueChart';
import { BOOKING_FEE_CATEGORY } from '@/lib/bookingFee';

describe('dashboardRevenueChart', () => {
  it('considera pending/confirmed/return como abertos', () => {
    expect(isOpenAppointmentStatus('pending')).toBe(true);
    expect(isOpenAppointmentStatus('confirmed')).toBe(true);
    expect(isOpenAppointmentStatus('return')).toBe(true);
    expect(isOpenAppointmentStatus('completed')).toBe(false);
    expect(isOpenAppointmentStatus('cancelled')).toBe(false);
    expect(isOpenAppointmentStatus('no_show')).toBe(false);
  });

  it('projeta só agendamentos abertos do mês', () => {
    const total = sumProjectedAppointments(
      [
        { id: '1', date: '2026-07-10', status: 'pending', procedure_price: 1000 },
        { id: '2', date: '2026-07-11', status: 'cancelled', procedure_price: 800 },
        { id: '3', date: '2026-07-12', status: 'completed', procedure_price: 500 },
        { id: '4', date: '2026-06-01', status: 'confirmed', procedure_price: 200 },
        { id: '5', date: '2026-07-20', status: 'confirmed', procedure_price: 300 },
      ],
      '2026-07-01',
      '2026-07-31',
    );
    expect(total).toBe(1300);
  });

  it('não conta sinal de agendamento aberto como receita realizada', () => {
    const appointmentsById = {
      a1: { id: 'a1', date: '2026-07-10', status: 'pending', procedure_price: 1500 },
      a2: { id: 'a2', date: '2026-07-11', status: 'completed', procedure_price: 1500 },
    };
    const filtered = filterRealizedChartIncome(
      [
        {
          type: 'income',
          amount: 50,
          category: BOOKING_FEE_CATEGORY,
          created_at: '2026-07-10T12:00:00.000Z',
          reference_type: 'appointment',
          reference_id: 'a1',
        },
        {
          type: 'income',
          amount: 50,
          category: BOOKING_FEE_CATEGORY,
          created_at: '2026-07-11T12:00:00.000Z',
          reference_type: 'appointment',
          reference_id: 'a2',
        },
        {
          type: 'income',
          amount: 1450,
          category: 'Procedimento',
          created_at: '2026-07-11T13:00:00.000Z',
          reference_type: 'appointment',
          reference_id: 'a2',
        },
      ],
      appointmentsById,
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => Number(t.amount))).toEqual([50, 1450]);
  });

  it('monta ponto do mês com projeção, receitas e despesas', () => {
    const appointments = [
      { id: 'a1', date: '2026-07-10', status: 'pending', procedure_price: 1500 },
    ];
    const appointmentsById = { a1: appointments[0] };
    const point = buildMonthChartPoint({
      label: 'Jul',
      monthStartDate: '2026-07-01',
      monthEndDate: '2026-07-31',
      monthStartIso: '2026-07-01T00:00:00.000Z',
      monthEndIso: '2026-07-31T23:59:59.999Z',
      appointments,
      appointmentsById,
      transactions: [
        {
          type: 'income',
          amount: 50,
          category: BOOKING_FEE_CATEGORY,
          created_at: '2026-07-10T12:00:00.000Z',
          reference_type: 'appointment',
          reference_id: 'a1',
        },
        {
          type: 'expense',
          amount: 80,
          category: 'Material',
          created_at: '2026-07-15T12:00:00.000Z',
        },
      ],
    });

    expect(point.projecao).toBe(1500);
    expect(point.receitas).toBe(0);
    expect(point.despesas).toBe(80);
  });
});
