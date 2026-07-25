import { describe, expect, it } from 'vitest';
import { formatQuantity, parseQuantityInput } from '@/lib/quantityInput';

describe('quantityInput', () => {
  it('aceita digitação com vírgula e ponto', () => {
    expect(parseQuantityInput('0,2')).toBe(0.2);
    expect(parseQuantityInput('0.2')).toBe(0.2);
    expect(parseQuantityInput('1')).toBe(1);
    expect(parseQuantityInput('2,5')).toBe(2.5);
  });

  it('rejeita valores inválidos', () => {
    expect(parseQuantityInput('')).toBeNull();
    expect(parseQuantityInput('0')).toBeNull();
    expect(parseQuantityInput('-1')).toBeNull();
    expect(parseQuantityInput('abc')).toBeNull();
  });

  it('formata para exibição pt-BR', () => {
    expect(formatQuantity(0.2)).toBe('0,2');
    expect(formatQuantity(1)).toBe('1');
  });
});
