import { Clinic } from './clinic';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  cro: string; // Only CRO for dentistry
}

export type LeadSource = 'instagram' | 'whatsapp' | 'referral' | 'paid_traffic' | 'other';

export const leadSourceLabels: Record<LeadSource, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  referral: 'Indicação',
  paid_traffic: 'Tráfego Pago',
  other: 'Outros',
};

export interface AgendaAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  professional: Professional;
  procedure: string;
  status: 'confirmed' | 'pending' | 'return' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus: 'paid' | 'pending' | 'partial' | 'refunded';
  notes?: string;
  clinic: Clinic;
  // New fields for seller tracking
  sellerId?: string;
  sellerName?: string;
  leadSource?: LeadSource;
  /** Nome de quem indicou (quando leadSource = Indicação). Usado em bonificações. */
  referralName?: string | null;
  /** Taxa de agendamento (ex: R$50). Se faltar/desistir, entra no caixa. */
  bookingFee?: number | null;
  /** Forma de pagamento da taxa (dinheiro, PIX, cartão). */
  bookingFeePaymentMethod?: 'cash' | 'pix' | 'credit' | 'debit' | null;
}

export type AgendaView = 'day' | 'week' | 'month';
