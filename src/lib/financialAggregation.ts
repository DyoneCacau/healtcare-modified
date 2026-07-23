/** Categoria legada de estorno (despesa espelho antes de refunded_at). */
export const CATEGORY_ESTORNO = 'Estorno';

export type FinancialAggregationTransaction = {
  type: string;
  amount: number | string;
  category?: string | null;
  refunded_at?: string | null;
  deleted_at?: string | null;
};

export function isDeletedTransaction(t: FinancialAggregationTransaction): boolean {
  return Boolean(t.deleted_at);
}

export function isRefundedIncome(t: FinancialAggregationTransaction): boolean {
  return t.type === 'income' && Boolean(t.refunded_at);
}

export function isLegacyRefundExpense(t: FinancialAggregationTransaction): boolean {
  return (
    t.type === 'expense' &&
    (t.category || '').trim().toLowerCase() === CATEGORY_ESTORNO.toLowerCase()
  );
}

/** Receita ativa: não estornada e não apagada. */
export function isActiveIncome(t: FinancialAggregationTransaction): boolean {
  return t.type === 'income' && !isDeletedTransaction(t) && !isRefundedIncome(t);
}

/** Despesa operacional: exclui estorno legado e apagadas. */
export function isRegularExpense(t: FinancialAggregationTransaction): boolean {
  return t.type === 'expense' && !isDeletedTransaction(t) && !isLegacyRefundExpense(t);
}

export function amountOf(t: FinancialAggregationTransaction): number {
  return Number(t.amount || 0);
}

/** Saldo líquido: receitas ativas − despesas regulares − estornos legados. */
export function netBalance(transactions: FinancialAggregationTransaction[]): number {
  let income = 0;
  let expense = 0;
  let legacyRefund = 0;

  for (const t of transactions) {
    if (isDeletedTransaction(t)) continue;
    if (isActiveIncome(t)) income += amountOf(t);
    else if (isRegularExpense(t)) expense += amountOf(t);
    else if (isLegacyRefundExpense(t)) legacyRefund += amountOf(t);
  }

  return income - expense - legacyRefund;
}

export function sumActiveIncome(transactions: FinancialAggregationTransaction[]): number {
  return transactions.filter(isActiveIncome).reduce((sum, t) => sum + amountOf(t), 0);
}

export function sumRegularExpenses(transactions: FinancialAggregationTransaction[]): number {
  return transactions.filter(isRegularExpense).reduce((sum, t) => sum + amountOf(t), 0);
}

/** Receita líquida no gráfico (desconta estorno legado; income com refunded_at já sai). */
export function netRevenue(transactions: FinancialAggregationTransaction[]): number {
  const legacyRefund = transactions
    .filter((t) => !isDeletedTransaction(t) && isLegacyRefundExpense(t))
    .reduce((sum, t) => sum + amountOf(t), 0);
  return sumActiveIncome(transactions) - legacyRefund;
}
