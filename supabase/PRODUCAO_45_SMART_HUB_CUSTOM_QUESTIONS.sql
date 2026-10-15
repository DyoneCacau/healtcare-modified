-- ============================================================
-- PRODUÇÃO 45 — SMART HUB: PERGUNTAS PERSONALIZADAS NO FORMULÁRIO
-- ============================================================
-- INSTRUÇÕES:
-- 1. Pré-requisito: PRODUCAO_40 (payload público restrito).
-- 2. Revise este arquivo antes de executar.
-- 3. No Supabase: SQL Editor > New query.
-- 4. Cole TODO o conteúdo e clique em Run.
-- 5. Script IDEMPOTENTE (CREATE OR REPLACE). Não altera tabelas nem RLS.
-- 6. Depois: publique a Edge Function `smart-hub-capture --no-verify-jwt`.
--
-- O que faz:
-- - Inclui `custom_questions` (perguntas extras criadas pela clínica) no
--   subset público de capture_config devolvido por get_public_smart_hub.
--   Sem isso, a página publicada não mostra as perguntas novas.
-- - Continua sem expor responsável, etapa do CRM e regra de duplicidade.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.smart_hub_public_capture_config(p_cfg jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_cfg IS NULL OR jsonb_typeof(p_cfg) <> 'object' THEN '{}'::jsonb
    ELSE jsonb_strip_nulls(jsonb_build_object(
      'mode', p_cfg->'mode',
      'form_title', p_cfg->'form_title',
      'form_description', p_cfg->'form_description',
      'submit_label', p_cfg->'submit_label',
      'success_message', p_cfg->'success_message',
      'redirect_url', p_cfg->'redirect_url',
      'redirect_whatsapp_after_submit', p_cfg->'redirect_whatsapp_after_submit',
      'whatsapp_phone', p_cfg->'whatsapp_phone',
      'whatsapp_message', p_cfg->'whatsapp_message',
      'whatsapp_followup_message', p_cfg->'whatsapp_followup_message',
      'require_privacy_accept', p_cfg->'require_privacy_accept',
      'privacy_text', p_cfg->'privacy_text',
      'privacy_url', p_cfg->'privacy_url',
      'privacy_version', p_cfg->'privacy_version',
      'fields', p_cfg->'fields',
      'custom_questions', p_cfg->'custom_questions',
      'manual_copy_message', p_cfg->'manual_copy_message'
    ))
  END;
$$;

COMMENT ON FUNCTION public.smart_hub_public_capture_config(jsonb) IS
  'Subset público de capture_config do Hub (sem owner/etapa/dedupe), com perguntas personalizadas.';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verificação: deve retornar true
SELECT public.smart_hub_public_capture_config(
  '{"custom_questions":[{"id":"q_1","label":"Teste","type":"text","required":false}],"initial_stage":"new"}'::jsonb
) ? 'custom_questions' AS custom_questions_publico,
NOT (public.smart_hub_public_capture_config('{"initial_stage":"new"}'::jsonb) ? 'initial_stage') AS etapa_oculta;
