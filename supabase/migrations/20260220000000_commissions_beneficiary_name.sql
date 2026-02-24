-- Adiciona coluna beneficiary_name para exibir nome no relatório
ALTER TABLE public.commissions
ADD COLUMN IF NOT EXISTS beneficiary_name text;
