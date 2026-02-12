export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'voucher' | 'split';

export interface PaymentSplit {
  method1: Exclude<PaymentMethod, 'split'>;
  amount1: number;
  method2: Exclude<PaymentMethod, 'split'>;
  amount2: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentSplit?: PaymentSplit;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  category: string;
  date: string;
  time: string;
  userId: string;
  userName: string;
  voucherDiscount?: number;
  notes?: string;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  openedBy: string;
  openedByName: string;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  initialBalance: number;
  finalBalance?: number;
  transactions: Transaction[];
  status: 'open' | 'closed';
  managerSignature?: string;
  closerSignature?: string;
}

export interface CashSummary {
  totalCash: number;
  totalCredit: number;
  totalDebit: number;
  totalPix: number;
  totalVoucher: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

export interface FinancialAuditEntry {
  id: string;
  clinicId: string;
  transactionId: string;
  action: 'update' | 'delete';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string | null;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  createdAt: string;
}
