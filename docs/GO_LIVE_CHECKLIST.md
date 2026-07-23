# O que falta para colocar a plataforma no ar

**Data:** 2026-07-22  
**Homologação Asaas Sandbox:** **OK**  
**Crons GitHub:** **OK**

---

## Já está ok

- Pix / Boleto / Cartão na Minha Cobrança
- Pix confirmado no sandbox e status atualizado no app
- Cartão sandbox aprovado
- Atraso → suspensão → reativação
- Cancelamento Asaas
- Crons diários (Check Subscriptions + Reconcile Asaas)
- Functions Mercado Pago legadas removidas
- Build / typecheck / testes OK

---

## Falta para ir ao ar

1. **Publicar o frontend** em HTTPS (Vercel/Netlify/etc.) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
2. No Supabase, secret **`APP_URL`** = essa URL HTTPS (CORS)
3. **Asaas produção**
   - Conta de produção
   - Nova API key
   - Novo `ASAAS_WEBHOOK_TOKEN`
   - Secrets: `ASAAS_ENV=production`, `ASAAS_API_BASE_URL=https://api.asaas.com/v3`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`
   - Webhook apontando para `https://jahjwuydesfytlmjwucx.supabase.co/functions/v1/asaas-webhook`
4. Pedir ao Asaas a **liberação de cartão** (se for usar cartão em produção)
5. Fazer **1 cobrança real** de baixo valor e validar
6. **Backup** do banco + algum alerta se o webhook falhar

Enquanto isso, manter `ASAAS_ENV=sandbox`.
