-- ############################################################
-- HABILITAR FEATURE "ponto" PARA REGISTRO DE PONTO
-- 
-- Como usar:
-- 1. Abra o painel do Supabase.
-- 2. Vá em SQL Editor.
-- 3. Copie TODO o conteúdo deste arquivo e cole em um novo script.
-- 4. Confirme se os planos/clinicas afetados estão corretos.
-- 5. Execute o script.
--
-- Este script:
-- - Garante que a feature "ponto" exista nos planos desejados.
-- - Isso é necessário porque as policies de RLS em time_clock_entries
--   exigem public.user_has_feature(auth.uid(), 'ponto').
-- - Sem essa feature, o usuário leva erro 403 / RLS ao registrar ponto.
-- ############################################################

-- 1) VER PLANOS E FEATURES ATUAIS
--    Rode primeiro para ver quais planos existem e quais features já têm.
--    NÃO altera nada.
SELECT id, name, features
FROM public.plans
ORDER BY name;

-- 2) (OPCIONAL) Habilitar "ponto" em TODOS os planos que já têm "agenda"
--    Isso é útil se todo plano com agenda também deve ter registro de ponto.
--    Descomente e execute se fizer sentido para você.
-- UPDATE public.plans
-- SET features = features || '["ponto"]'::jsonb
-- WHERE NOT (features @> '["ponto"]'::jsonb)
--   AND features @> '["agenda"]'::jsonb;

-- 3) (ALTERNATIVO) Habilitar "ponto" apenas em um plano específico
--    - Substitua :PLAN_ID pelo id do plano retornado na consulta do passo 1.
--    - Descomente e execute.
-- UPDATE public.plans
-- SET features = features || '["ponto"]'::jsonb
-- WHERE id = ':PLAN_ID'
--   AND NOT (features @> '["ponto"]'::jsonb);

-- 4) (DEBUG) Verificar se user_has_feature está funcionando para um usuário
--    - Substitua :USER_ID pelo UUID do usuário que está tentando registrar ponto.
--    - Rode para confirmar se retorna true.
-- SELECT public.user_has_feature('00000000-0000-0000-0000-000000000000'::uuid, 'ponto') AS has_ponto;

