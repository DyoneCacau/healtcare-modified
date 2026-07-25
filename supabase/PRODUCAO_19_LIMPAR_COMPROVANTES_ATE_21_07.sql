-- ============================================================================
-- PRODUÇÃO 19 — LIMPAR COMPROVANTES DE PAGAMENTO ATÉ 21/07 (EXECUÇÃO MANUAL)
-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este arquivo MANUALMENTE no SQL Editor do painel Supabase
--    (Dashboard > SQL Editor > New query). NÃO rode via CLI/db push.
-- 2. Execute os blocos NA ORDEM abaixo, um de cada vez, conferindo o
--    resultado antes de seguir para o próximo.
-- 3. O critério de corte é a coluna `created_at` (mesma coluna exibida como
--    "Data" na tela Comprovantes de Pagamento do SuperAdmin):
--      - Remove registros com created_at até 21/07/2026 (inclusive).
--      - Mantém registros a partir de 22/07/2026 (inclusive).
-- 4. O PASSO 2 cria uma tabela de backup antes de apagar, para permitir
--    reverter caso necessário. O PASSO 4 (restaurar) só deve ser executado
--    se algo der errado.
-- ============================================================================

-- ─── PASSO 1: Preview — confira quantos registros serão afetados ──────────
SELECT
  count(*) AS total_a_remover,
  min(created_at) AS data_mais_antiga,
  max(created_at) AS data_mais_recente
FROM public.payment_history
WHERE created_at < '2026-07-22 00:00:00-00';

-- ─── PASSO 2: Backup dos registros antes de apagar ─────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_history_backup_ate_2026_07_21 AS
SELECT *
FROM public.payment_history
WHERE created_at < '2026-07-22 00:00:00-00';

-- ─── PASSO 3: Apagar os comprovantes até 21/07 (inclusive) ─────────────────
DELETE FROM public.payment_history
WHERE created_at < '2026-07-22 00:00:00-00';

-- ─── PASSO 4 (SOMENTE SE PRECISAR REVERTER): restaurar do backup ──────────
-- INSERT INTO public.payment_history
-- SELECT * FROM public.payment_history_backup_ate_2026_07_21
-- ON CONFLICT (id) DO NOTHING;

-- ─── PASSO 5 (OPCIONAL, após confirmar que está tudo certo): remover backup
-- DROP TABLE IF EXISTS public.payment_history_backup_ate_2026_07_21;

-- VALIDAÇÃO MANUAL APÓS EXECUTAR O PASSO 3:
-- SELECT count(*), min(created_at), max(created_at) FROM public.payment_history;
