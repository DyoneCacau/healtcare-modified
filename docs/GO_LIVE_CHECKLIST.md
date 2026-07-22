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
2. **Crons GitHub** — `CRON_SECRET` já está no Supabase; falta autenticar o `gh` e gravar os secrets no repositório (ou cadastrar manualmente em Settings → Secrets → Actions):
   - `SUPABASE_PROJECT_URL` = `https://jahjwuydesfytlmjwucx.supabase.co`
   - `CRON_SECRET` = o mesmo valor do Supabase  
3. **Asaas produção:** conta, API key, webhook, `ASAAS_ENV=production`  
4. Liberação de **cartão** no Asaas produção (se for oferecer)  
5. **1 cobrança real** de teste  
6. **Backup** do banco + alerta se webhook falhar  

Enquanto isso, manter `ASAAS_ENV=sandbox`.

### Como ativar os crons (quando o `gh` estiver logado)

```bash
gh secret set SUPABASE_PROJECT_URL --body "https://jahjwuydesfytlmjwucx.supabase.co"
# CRON_SECRET: use o mesmo valor configurado no Supabase Edge Functions → Secrets
gh secret set CRON_SECRET
```

Depois: Actions → **Check Subscriptions** / **Reconcile Asaas Billing** → Run workflow (teste manual).
