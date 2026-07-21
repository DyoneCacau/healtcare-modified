# O que falta para colocar a plataforma no ar

**Data:** 2026-07-21  
**Homologação Asaas Sandbox:** **OK**

---

## Já está ok

- Pix / Boleto / Cartão na Minha Cobrança
- Pix confirmado no sandbox e status atualizado no app
- Cartão sandbox `4444…` aprovado (`CONFIRMED`)
- Atraso → suspensão → reativação
- Cancelamento Asaas (fluxo validado)
- Reconcile / webhook 401
- Functions Mercado Pago legadas **removidas**
- Build, typecheck e testes unitários OK

---

## Falta para ir ao ar (produção)

1. **Deploy do frontend** (HTTPS) + `APP_URL` no Supabase  
2. **Crons** no GitHub Actions com `CRON_SECRET` + `SUPABASE_PROJECT_URL`  
3. **Asaas produção:** conta, API key, webhook, `ASAAS_ENV=production`  
4. Liberação de **cartão** no Asaas produção (se for oferecer)  
5. **1 cobrança real** de teste  
6. **Backup** do banco + alerta se webhook falhar  

Enquanto isso, manter `ASAAS_ENV=sandbox`.
