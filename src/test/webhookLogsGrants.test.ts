import { describe, expect, it } from 'vitest';
import SQL from '../../supabase/PRODUCAO_28_WEBHOOK_LOGS_HARDENING.sql?raw';
import { WEBHOOK_LOG_READABLE_COLUMNS } from '@/lib/webhookLogColumns';

/** Lê a lista de colunas de um `GRANT SELECT (col, col) ON public.<table>`. */
function grantedSelectColumns(table: string): string[] {
  const match = SQL.match(
    new RegExp(`GRANT SELECT \\(([^)]*)\\) ON public\\.${table}`, 'i'),
  );
  if (!match) return [];
  return match[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

const SENSITIVE_WEBHOOK_COLUMNS = ['payload', 'headers', 'response'];
const SENSITIVE_AUTOMATION_COLUMNS = ['payload', 'result'];

describe('PRODUCAO_28 — logs sem corpo bruto no browser', () => {
  it('revoga privilégio de tabela em webhook_logs e automation_logs', () => {
    expect(SQL).toMatch(/REVOKE ALL PRIVILEGES ON public\.webhook_logs FROM anon, authenticated/i);
    expect(SQL).toMatch(
      /REVOKE ALL PRIVILEGES ON public\.automation_logs FROM anon, authenticated/i,
    );
  });

  it('toda coluna lida pelo app tem GRANT SELECT em webhook_logs', () => {
    const granted = grantedSelectColumns('webhook_logs');
    const missing = WEBHOOK_LOG_READABLE_COLUMNS.filter((column) => !granted.includes(column));
    expect(missing).toEqual([]);
  });

  it('payload/headers/response nunca aparecem no GRANT SELECT de webhook_logs', () => {
    const granted = grantedSelectColumns('webhook_logs');
    for (const column of SENSITIVE_WEBHOOK_COLUMNS) {
      expect(granted).not.toContain(column);
    }
  });

  it('payload/result nunca aparecem no GRANT SELECT de automation_logs', () => {
    const granted = grantedSelectColumns('automation_logs');
    for (const column of SENSITIVE_AUTOMATION_COLUMNS) {
      expect(granted).not.toContain(column);
    }
  });
});
