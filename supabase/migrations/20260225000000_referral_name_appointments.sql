-- Nome de quem indicou (para lead_source = Indicação) - usado em bonificações
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS referral_name TEXT NULL;

COMMENT ON COLUMN public.appointments.referral_name IS 'Nome de quem indicou o paciente. Usado quando lead_source = referral (Indicação).';
