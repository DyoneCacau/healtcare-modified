/** Normaliza digitação de quantidade (aceita vírgula ou ponto). */
export function parseQuantityInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000) / 1000;
}

export function formatQuantity(value: number): string {
  return Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}
