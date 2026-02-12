-- ============================================================================
-- LIMPAR TESTES: pagamentos rejeitados e leads (upgrade_requests)
-- ============================================================================
-- Use no SQL Editor do Supabase quando mudou para vendas fechadas e quer
-- remover dados de teste (comprovantes rejeitados e pedidos de upgrade antigos).
-- ============================================================================

-- 1) Remove comprovantes de pagamento com status rejeitado
DELETE FROM payment_history WHERE status = 'rejected';

-- 2) Remove todos os pedidos de upgrade/leads (não há mais fluxo self-service)
DELETE FROM upgrade_requests;

-- Opcional: ver quantos foram removidos (rode antes e depois se quiser)
-- SELECT COUNT(*) FROM payment_history WHERE status = 'rejected';
-- SELECT COUNT(*) FROM upgrade_requests;
