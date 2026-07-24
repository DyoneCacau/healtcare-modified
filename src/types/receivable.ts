export type ReceivableStatus = 'open' | 'paid' | 'cancelled';

export interface AccountReceivable {
  id: string;
  clinicId: string;
  patientId: string | null;
  patientName?: string | null;
  appointmentId: string | null;
  description: string;
  amount: number;
  dueDate: string;
  status: ReceivableStatus;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  financialTransactionId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountReceivableInput {
  patient_id?: string | null;
  appointment_id?: string | null;
  description: string;
  amount: number;
  due_date: string;
  notes?: string | null;
}

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  open: 'Em aberto',
  paid: 'Quitada',
  cancelled: 'Cancelada',
};
