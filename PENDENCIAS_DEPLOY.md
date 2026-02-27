# Pendências de deploy (executar fora do ambiente corporativo)

> **Status:** Aguardando execução em ambiente com acesso liberado (máquina pessoal, etc.)

---

## 1. Deploy da Edge Function `check-subscriptions`

**Comando:**
```bash
cd "caminho/do/projeto/healtcare-vendas-diretas-FINAL (1)"
supabase functions deploy check-subscriptions
```

**Pré-requisitos:**
- Supabase CLI instalado: `npm install -g supabase`
- Login: `supabase login`
- Projeto linkado (se necessário): `supabase link --project-ref SEU_PROJECT_REF`

---

## 2. Configurar secret CRON_SECRET

Após o deploy:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto
3. Vá em **Edge Functions** → **check-subscriptions** → **Secrets**
4. Adicione: `CRON_SECRET` = senha forte (ex.: gerada em random.org)

---

## 3. Configurar cron para rodar diariamente

Use um serviço externo (EasyCron, GitHub Actions, Render Cron, etc.) para chamar:

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Frequência sugerida:** 1x por dia (ex.: 6h da manhã)

---

## 4. Scripts SQL adicionais (executar no SQL Editor)

**Script A – Atualizar view vw_clients_status** (adiciona last_payment_at, current_period_end):
```sql
-- Ver conteúdo em: supabase/migrations/20260230000001_vw_clients_status_due_dates.sql
```

**Script B – Atualizar register_payment** (adiciona parâmetro opcional p_next_due_date):
```sql
-- Ver conteúdo em: supabase/migrations/20260230000000_register_payment_period_and_notifications.sql
-- (rodar novamente para incluir o parâmetro p_next_due_date)
```

---

## O que já foi feito

- [x] Migration `register_payment` (Script 1) – executado
- [x] Correção assinaturas antigas (Script 2) – executado
- [x] Código da Edge Function `check-subscriptions` atualizado no projeto
- [x] Fluxo manual: notificação no sino do cliente, "dias desde último pagamento" no dashboard SuperAdmin

---

## O que falta

- [ ] Executar Script A (vw_clients_status) no SQL Editor
- [ ] Executar Script B (register_payment com p_next_due_date) no SQL Editor
- [ ] Deploy da Edge Function
- [ ] Configurar CRON_SECRET
- [ ] Configurar cron externo
