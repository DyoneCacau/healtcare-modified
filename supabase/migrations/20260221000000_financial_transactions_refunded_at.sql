-- Adiciona coluna refunded_at para marcar transacoes de entrada estornadas
-- Em vez de criar nova transacao de despesa, a entrada original e marcada como estornada
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID;
