/**
 * Lista única de procedimentos usada no agendamento e nas regras de comissão.
 * Assim o procedimento do atendimento bate exatamente com o da regra (sem erro de digitação).
 * Inclui estética (harmonização, facetas) e opção "Outros" para procedimentos customizados.
 */
export const PROCEDURE_OPTIONS = [
  'Consulta',
  'Retorno',
  'Limpeza',
  'Clareamento',
  'Restauração',
  'Extração',
  'Canal',
  'Implante',
  'Prótese',
  'Ortodontia',
  'Periodontia',
  'Harmonização',
  'Facetas',
  'Lente de contato',
  'Outros',
] as const;

export type ProcedureOption = (typeof PROCEDURE_OPTIONS)[number];

export function isKnownProcedure(name: string): boolean {
  return PROCEDURE_OPTIONS.includes(name as ProcedureOption);
}
