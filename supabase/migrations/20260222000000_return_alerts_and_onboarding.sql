-- Coluna para marcar quando a secretária já contactou o paciente para retorno
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS return_contacted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.appointments.return_contacted_at IS 'Data em que a secretária contactou o paciente para agendar retorno';
