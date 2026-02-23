/**
 * Lista única de procedimentos usada no agendamento e nas regras de comissão.
 * Assim o procedimento do atendimento bate exatamente com o da regra (sem erro de digitação).
 */
export const PROCEDURE_OPTIONS = [
  'Consulta',
  'Limpeza',
  'Clareamento',
  'Restauração',
  'Extração',
  'Canal',
  'Implante',
  'Prótese',
  'Ortodontia',
  'Periodontia',
] as const;

export type ProcedureOption = (typeof PROCEDURE_OPTIONS)[number];

export function isKnownProcedure(name: string): boolean {
  return PROCEDURE_OPTIONS.includes(name as ProcedureOption);
}
