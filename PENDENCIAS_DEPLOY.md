# Pendências de deploy

> **Código:** pronto para vendas diretas B2B (sem Mercado Pago).  
> **Infra:** executar no ambiente com Supabase CLI e acesso ao projeto.

---

## 1. Aplicar migrations no Supabase

```bash
cd "caminho/do/projeto/healtcare-modified"
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

As migrations abaixo já estão em `supabase/migrations/` (não é necessário SQL manual separado):

- `20260230000000_register_payment_period_and_notifications.sql` — `register_payment` com `p_next_due_date`
- `20260230000001_vw_clients_status_due_dates.sql` — view `vw_clients_status`

Se o banco foi criado antes dessas migrations, o `db push` aplica o que faltar.

---

## 2. Deploy das Edge Functions

```bash
supabase functions deploy check-subscriptions
supabase functions deploy init-superadmin
# opcional:
supabase functions deploy reset-user-password
supabase functions deploy delete-clinic-and-user
```

Detalhes: [supabase/functions/README.md](supabase/functions/README.md)

---

## 3. Secrets no Supabase Dashboard

**Edge Functions → Secrets:**

| Secret | Uso |
|--------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Funções server-side |
| `CRON_SECRET` | Protege `check-subscriptions` |
| `INIT_SECRET` | Cria superadmin (uma vez) |

---

## 4. Cron diário

**Opção A — GitHub Actions** (template em `.github/workflows/check-subscriptions-cron.yml`):

Configure secrets `SUPABASE_PROJECT_URL` e `CRON_SECRET` no repositório.

**Opção B — Serviço externo** (EasyCron, Render Cron, etc.):

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Frequência: **1x por dia** (ex.: 6h da manhã).

---

## 5. Frontend (Vercel / Netlify)

Variáveis obrigatórias — ver [.env.example](.env.example):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPPORT_EMAIL` (opcional)
- `VITE_SUPPORT_WHATSAPP` (opcional)

```bash
npm run build
```

---

## Checklist

- [ ] `supabase db push` executado
- [ ] Edge Functions deployadas
- [ ] Secrets configurados
- [ ] Cron configurado
- [ ] Superadmin criado (`init-superadmin`)
- [ ] Deploy frontend com variáveis de ambiente
- [ ] Remover funções MP antigas do Dashboard (se ainda existirem): `mp-*`, `mercadopago-*`, `create-payment-preference`

---

## Já implementado no código

- [x] Modelo vendas diretas (Settings, bloqueio de assinatura, sem checkout MP)
- [x] Remoção Mercado Pago (Edge Functions + SDK frontend)
- [x] Exportação CSV de comissões
- [x] WhatsApp unificado na agenda
- [x] Onboarding reativado
- [x] Rota `/selecionar-clinica`
- [x] `check-subscriptions` sem lógica de trial

---

## Asaas e hardening de produção

Não use a chave de produção antes de concluir o Sandbox:

- [ ] Revogar qualquer chave Asaas anteriormente exposta
- [ ] Confirmar projeto Supabase e criar backup
- [ ] Revisar e executar manualmente `supabase/PRODUCAO_01_SECURITY_HARDENING.sql`
- [ ] Revisar e executar manualmente `supabase/PRODUCAO_02_ASAAS_BILLING.sql`
- [ ] Configurar secrets Sandbox conforme `docs/ASAAS_SANDBOX_E_PRODUCAO.md`
- [ ] Fazer deploy das funções `asaas-*`
- [ ] Cadastrar webhook Sandbox com token próprio
- [ ] Concluir `docs/ASAAS_MATRIZ_HOMOLOGACAO.md`
- [ ] Solicitar ao Asaas habilitação de cartão/tokenização para produção
- [ ] Gerar chave e token de webhook novos para produção
- [ ] Testar cobrança real controlada antes da liberação gradual
