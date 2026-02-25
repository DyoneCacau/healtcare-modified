-- Forma de pagamento da taxa de agendamento (dinheiro, pix, cartão etc.)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS booking_fee_payment_method TEXT NULL;

COMMENT ON COLUMN public.appointments.booking_fee_payment_method IS 'Forma de pagamento da taxa de agendamento: cash, pix, credit, debit. Se faltar/desistir, usado no lançamento do caixa.';
