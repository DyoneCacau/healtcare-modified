import { afterEach, describe, expect, it } from 'vitest';
import {
  assertRateLimit,
  resetRateLimitBuckets,
} from '../../supabase/functions/_shared/rateLimit.ts';

describe('assertRateLimit', () => {
  afterEach(() => {
    resetRateLimitBuckets();
  });

  it('permite até o limite na janela', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(() => assertRateLimit('test:ok', 3, 60_000)).not.toThrow();
    }
  });

  it('estoura com 429 após o limite', () => {
    assertRateLimit('test:fail', 2, 60_000);
    assertRateLimit('test:fail', 2, 60_000);
    try {
      assertRateLimit('test:fail', 2, 60_000);
      expect.fail('deveria ter lançado');
    } catch (error) {
      expect(error).toMatchObject({ status: 429 });
    }
  });

  it('chaves diferentes não compartilham contador', () => {
    assertRateLimit('a', 1, 60_000);
    expect(() => assertRateLimit('b', 1, 60_000)).not.toThrow();
  });
});
