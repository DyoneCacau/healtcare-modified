import { describe, expect, it } from 'vitest';
import {
  BOOKING_FEE_CATEGORY,
  DEFAULT_BOOKING_FEE,
  bookingFeeIncomeDescription,
  remainingAfterBookingFee,
} from '@/lib/bookingFee';

describe('bookingFee helpers', () => {
  it('mantém categoria rastreável no financeiro', () => {
    expect(BOOKING_FEE_CATEGORY).toBe('Taxa de agendamento');
    expect(DEFAULT_BOOKING_FEE).toBe(50);
  });

  it('abate o sinal do valor do procedimento', () => {
    expect(remainingAfterBookingFee(1500, 50)).toBe(1450);
    expect(remainingAfterBookingFee(50, 50)).toBe(0);
    expect(remainingAfterBookingFee(40, 50)).toBe(0);
    expect(remainingAfterBookingFee(1500, null)).toBe(1500);
    expect(remainingAfterBookingFee(1500, undefined)).toBe(1500);
  });

  it('monta descrição com origem do sinal', () => {
    expect(bookingFeeIncomeDescription('João')).toBe('Sinal de agendamento - João');
    expect(bookingFeeIncomeDescription('João', 'faltou — retido')).toBe(
      'Sinal de agendamento - João (faltou — retido)',
    );
  });
});
