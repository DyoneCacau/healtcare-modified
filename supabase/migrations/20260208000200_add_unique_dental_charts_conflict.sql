-- Ensure upsert conflict target exists for dental_charts
ALTER TABLE public.dental_charts
  ADD CONSTRAINT dental_charts_unique_patient_clinic_tooth
  UNIQUE (patient_id, clinic_id, tooth_number);
