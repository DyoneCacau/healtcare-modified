-- Taxa de agendamento: valor pago ao agendar (ex: R$50). Se faltar/desistir, entra no caixa.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS booking_fee NUMERIC(10,2) NULL;

COMMENT ON COLUMN public.appointments.booking_fee IS 'Taxa de agendamento paga pelo paciente. Se faltar/desistir, valor entra no caixa como receita.';
