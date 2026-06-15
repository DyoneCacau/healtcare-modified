import { describe, it, expect } from 'vitest';
import { parsePlanFeatures } from '@/lib/planFeatures';

describe('parsePlanFeatures', () => {
  it('returns array as-is', () => {
    expect(parsePlanFeatures(['agenda', 'pacientes'])).toEqual(['agenda', 'pacientes']);
  });

  it('parses JSON string', () => {
    expect(parsePlanFeatures('["financeiro"]')).toEqual(['financeiro']);
  });

  it('returns empty array on invalid JSON', () => {
    expect(parsePlanFeatures('{invalid')).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(parsePlanFeatures(null)).toEqual([]);
    expect(parsePlanFeatures(undefined)).toEqual([]);
  });
});
