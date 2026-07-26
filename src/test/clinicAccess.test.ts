import { describe, expect, it } from 'vitest';

/**
 * Espelha a regra de escopo→módulo de `clinicAccess.ts` sem subir o client
 * Supabase: leads exigem CRM; qualquer rota da API exige Integrações.
 */
function requiredFeaturesForScope(scope: string): string[] {
  const features = ['integracoes'];
  if (scope.startsWith('leads:')) features.push('crm');
  return features;
}

describe('gate de plano da API de integrações', () => {
  it('rotas de automação/webhook exigem só integracoes', () => {
    expect(requiredFeaturesForScope('automations:read')).toEqual(['integracoes']);
    expect(requiredFeaturesForScope('webhooks:read')).toEqual(['integracoes']);
  });

  it('rotas de leads exigem integracoes e crm', () => {
    expect(requiredFeaturesForScope('leads:write')).toEqual(['integracoes', 'crm']);
    expect(requiredFeaturesForScope('leads:read')).toEqual(['integracoes', 'crm']);
  });
});
