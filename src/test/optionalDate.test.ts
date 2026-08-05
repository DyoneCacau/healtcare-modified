import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_DATE_FALLBACK,
  formatOptionalAge,
  formatOptionalDate,
  formatOptionalText,
  getOptionalAgeYears,
  parseOptionalDate,
} from '@/lib/optionalDate';

describe('optionalDate — pacientes incompletos (Smart Hub)', () => {
  it('parseOptionalDate rejeita null, vazio e inválido', () => {
    expect(parseOptionalDate(null)).toBeNull();
    expect(parseOptionalDate(undefined)).toBeNull();
    expect(parseOptionalDate('')).toBeNull();
    expect(parseOptionalDate('   ')).toBeNull();
    expect(parseOptionalDate('inválida')).toBeNull();
    expect(parseOptionalDate('not-a-date')).toBeNull();
  });

  it('parseOptionalDate aceita YYYY-MM-DD', () => {
    const d = parseOptionalDate('1990-05-15');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(1990);
  });

  it('formatOptionalDate não lança e usa fallback', () => {
    expect(formatOptionalDate(null)).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalDate('')).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalDate('inválida')).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalDate('2026-08-05')).toBe('05/08/2026');
  });

  it('idade opcional não produz NaN', () => {
    expect(getOptionalAgeYears(null)).toBeNull();
    expect(getOptionalAgeYears('')).toBeNull();
    expect(formatOptionalAge(null)).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalAge('')).toBe(OPTIONAL_DATE_FALLBACK);
    const age = getOptionalAgeYears('1990-01-01', new Date('2026-08-05T12:00:00'));
    expect(age).toBe(36);
    expect(formatOptionalAge('1990-01-01')).toMatch(/^\d+ anos$/);
  });

  it('formatOptionalText para CPF vazio', () => {
    expect(formatOptionalText(null)).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalText('')).toBe(OPTIONAL_DATE_FALLBACK);
    expect(formatOptionalText('123.456.789-00')).toBe('123.456.789-00');
  });
});
