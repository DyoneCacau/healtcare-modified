import { differenceInYears, format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const OPTIONAL_DATE_FALLBACK = 'Não informado';

/**
 * Converte string/ISO/Date em Date válido, ou null se vazio/inválido.
 * Evita RangeError: Invalid time value em format/differenceInYears.
 */
export function parseOptionalDate(
  value: string | Date | null | undefined
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  // YYYY-MM-DD ou ISO completo
  let parsed: Date;
  try {
    parsed = /^\d{4}-\d{2}-\d{2}/.test(raw) ? parseISO(raw) : new Date(raw);
  } catch {
    return null;
  }
  return isValid(parsed) ? parsed : null;
}

export function formatOptionalDate(
  value: string | Date | null | undefined,
  pattern = 'dd/MM/yyyy',
  fallback: string = OPTIONAL_DATE_FALLBACK
): string {
  const date = parseOptionalDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern, { locale: ptBR });
  } catch {
    return fallback;
  }
}

/** Idade em anos inteiros, ou null se birthDate ausente/inválida. */
export function getOptionalAgeYears(
  birthDate: string | Date | null | undefined,
  now: Date = new Date()
): number | null {
  const date = parseOptionalDate(birthDate);
  if (!date) return null;
  try {
    const age = differenceInYears(now, date);
    return Number.isFinite(age) && age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/** Ex.: "32 anos" | "Não informado" */
export function formatOptionalAge(
  birthDate: string | Date | null | undefined,
  fallback: string = OPTIONAL_DATE_FALLBACK
): string {
  const age = getOptionalAgeYears(birthDate);
  if (age == null) return fallback;
  return `${age} anos`;
}

/** Texto opcional (CPF, e-mail, endereço…). */
export function formatOptionalText(
  value: string | null | undefined,
  fallback: string = OPTIONAL_DATE_FALLBACK
): string {
  const text = (value ?? '').trim();
  return text || fallback;
}
