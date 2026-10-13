-- Integração Suri: provedor `suri` + confirmações de agendamento por WhatsApp.
-- Equivalente operacional: supabase/PRODUCAO_42_SURI_CONFIRMACOES.sql
-- Preferir execução manual do PRODUCAO_42 no SQL Editor em produção.

ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'meta',
    'facebook_lead_ads',
    'instagram_lead_ads',
    'whatsapp_business',
    'suri',
    'landing_page',
    'webhook',
    'external_api',
    'n8n',
    'make',
    'zapier'
  ));

CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'suri',
  reminder_date date NOT NULL,
  kind text NOT NULL DEFAULT 'consultation'
    CHECK (kind IN ('consultation', 'exam')),
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'sent', 'failed', 'skipped', 'confirmed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 1,
  patient_phone text,
  template_id text,
  external_message_id text,
  error_message text,
  sent_at timestamptz,
  responded_at timestamptz,
  response_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, provider, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_clinic_date
  ON public.appointment_reminders (clinic_id, reminder_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_message
  ON public.appointment_reminders (integration_id, external_message_id)
  WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_awaiting
  ON public.appointment_reminders (integration_id, sent_at DESC)
  WHERE status = 'sent';

DROP TRIGGER IF EXISTS appointment_reminders_updated_at ON public.appointment_reminders;
CREATE TRIGGER appointment_reminders_updated_at
  BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view appointment reminders"
  ON public.appointment_reminders;
CREATE POLICY "Clinic members can view appointment reminders"
  ON public.appointment_reminders
  FOR SELECT
  USING (public.user_can_clinic_action(clinic_id, 'integracoes', 'can_view'));

DROP POLICY IF EXISTS "Superadmins manage appointment reminders"
  ON public.appointment_reminders;
CREATE POLICY "Superadmins manage appointment reminders"
  ON public.appointment_reminders
  FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.appointment_reminders FROM authenticated;
GRANT SELECT ON public.appointment_reminders TO authenticated;

COMMENT ON TABLE public.appointment_reminders IS
  'Confirmações de agendamento enviadas por integração (Suri). Escrita só via Edge Functions.';
