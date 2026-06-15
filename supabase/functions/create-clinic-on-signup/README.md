# create-clinic-on-signup (LEGADO)

**Status:** descontinuada no modelo vendas diretas B2B.

Clientes são criados manualmente pelo SuperAdmin (`CreateCompleteClient`). O frontend não chama mais esta função.

A clínica automática no signup (se existir) é tratada por trigger SQL em `supabase/migrations/`, não por esta Edge Function.

Esta pasta pode ser removida do deploy. Mantida apenas como referência histórica.
