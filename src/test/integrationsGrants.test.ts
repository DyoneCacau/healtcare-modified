import { describe, expect, it } from 'vitest';
import SQL from '../../supabase/PRODUCAO_27_INTEGRACOES_HARDENING.sql?raw';
import { INTEGRATION_READABLE_COLUMNS } from '@/lib/integrationColumns';

/**
 * O PRODUCAO_27 troca o privilégio de tabela de `integrations` por privilégio
 * por coluna. A partir daí, qualquer coluna que o app leia ou escreva sem estar
 * no GRANT correspondente vira erro em produção — e só em produção.
 *
 * Estes testes travam essa divergência.
 */

/** Lê a lista de colunas de um `GRANT <priv> (col, col) ON public.integrations`. */
function grantedColumns(privilege: 'SELECT' | 'INSERT' | 'UPDATE'): string[] {
  const match = SQL.match(
    new RegExp(`GRANT ${privilege} \\(([^)]*)\\) ON public\\.integrations`, 'i'),
  );
  if (!match) return [];
  return match[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

/** Colunas que o hook grava ao criar a conexão (useIntegrations.createIntegration). */
const COLUMNS_WRITTEN_ON_CREATE = [
  'clinic_id',
  'provider',
  'category',
  'name',
  'description',
  'direction',
  'config',
  'is_active',
  'status',
  'webhook_slug',
  'webhook_secret_hash',
  'created_by',
];

/** Colunas que o hook grava ao editar / rotacionar o segredo. */
const COLUMNS_WRITTEN_ON_UPDATE = [
  'name',
  'description',
  'status',
  'direction',
  'config',
  'is_active',
  'external_account_id',
  'webhook_secret_hash',
];

const CREDENTIAL_COLUMNS = ['webhook_secret_hash', 'credentials_ref'];

describe('PRODUCAO_27 — privilégios por coluna em integrations', () => {
  it('o script revoga o privilégio de tabela antes de reconceder', () => {
    expect(SQL).toMatch(/REVOKE ALL PRIVILEGES ON public\.integrations FROM anon, authenticated/i);
  });

  it('toda coluna lida pelo app tem GRANT SELECT', () => {
    const granted = grantedColumns('SELECT');
    const missing = INTEGRATION_READABLE_COLUMNS.filter((column) => !granted.includes(column));
    expect(missing).toEqual([]);
  });

  it('credencial nunca aparece no GRANT SELECT', () => {
    const granted = grantedColumns('SELECT');
    for (const column of CREDENTIAL_COLUMNS) {
      expect(granted).not.toContain(column);
    }
  });

  it('toda coluna gravada na criação tem GRANT INSERT', () => {
    const granted = grantedColumns('INSERT');
    const missing = COLUMNS_WRITTEN_ON_CREATE.filter((column) => !granted.includes(column));
    expect(missing).toEqual([]);
  });

  it('toda coluna gravada na edição tem GRANT UPDATE', () => {
    const granted = grantedColumns('UPDATE');
    const missing = COLUMNS_WRITTEN_ON_UPDATE.filter((column) => !granted.includes(column));
    expect(missing).toEqual([]);
  });

  it('credentials_ref não é gravável pelo cliente', () => {
    expect(grantedColumns('INSERT')).not.toContain('credentials_ref');
    expect(grantedColumns('UPDATE')).not.toContain('credentials_ref');
  });

  it('webhook_slug e campos de telemetria não são editáveis pelo cliente', () => {
    const granted = grantedColumns('UPDATE');
    expect(granted).not.toContain('webhook_slug');
    expect(granted).not.toContain('last_event_at');
    expect(granted).not.toContain('last_error');
  });
});
