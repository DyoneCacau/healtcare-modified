# Edge Functions — HealthCare

Modelo **vendas diretas B2B**, com pagamentos manuais mantidos e integração
Asaas opcional por clínica. Mercado Pago permanece removido.

## Funções ativas

| Função | Descrição | Secrets necessários |
|--------|-----------|---------------------|
| `check-subscriptions` | Cron: alertas de vencimento, inadimplência e suspensão | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` |
| `init-superadmin` | Cria o primeiro superadmin (uma vez) | `INIT_SECRET` |
| `reset-user-password` | Reset de senha administrativo | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-clinic-and-user` | Exclusão de clínica e usuário | `SUPABASE_SERVICE_ROLE_KEY` |
| `create-complete-client` | Criação segura de cliente completo por superadmin | `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` |
| `meta-webhook` | Webhook Meta WhatsApp (receber mensagens + fluxo bot) | `META_WEBHOOK_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| `meta-send-message` | Enviar mensagem outbound via Cloud API | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| `meta-save-channel` | Salva credenciais Meta sem expô-las ao PostgREST | `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` |
| `asaas-webhook` | Persistência e processamento idempotente de eventos | `ASAAS_WEBHOOK_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| `asaas-create-checkout` | Cria cliente/assinatura e taxa de adesão opcional | `ASAAS_API_KEY`, `ASAAS_API_BASE_URL`, `ASAAS_ENV` |
| `asaas-list-payments` | Lista faturas da assinatura com isolamento por clínica | Secrets Asaas |
| `asaas-cancel-subscription` | Cancela recorrência Asaas e estado local | Secrets Asaas |
| `asaas-reconcile` | Reconciliação diária de eventos/cobranças | Secrets Asaas e `CRON_SECRET` |

## Legado (não usar em vendas diretas)

| Função | Status |
|--------|--------|
| `create-clinic-on-signup` | Descontinuada — cadastro é manual pelo SuperAdmin |

## Deploy

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF

supabase functions deploy check-subscriptions
supabase functions deploy init-superadmin
supabase functions deploy reset-user-password
supabase functions deploy delete-clinic-and-user
supabase functions deploy create-complete-client
supabase functions deploy meta-webhook
supabase functions deploy meta-send-message
supabase functions deploy meta-save-channel
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy asaas-create-checkout
supabase functions deploy asaas-list-payments
supabase functions deploy asaas-cancel-subscription
supabase functions deploy asaas-reconcile --no-verify-jwt
```

Secrets adicionais (Dashboard → Edge Functions → Secrets):

- `META_WEBHOOK_VERIFY_TOKEN` — token usado na verificação do webhook no Meta Developers
- `META_APP_SECRET` — obrigatório para validar `X-Hub-Signature-256`
- `APP_URL` — origem autorizada para chamadas do navegador
- `ASAAS_ENV`, `ASAAS_API_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`

Antes do deploy Asaas, execute manualmente
`supabase/PRODUCAO_02_ASAAS_BILLING.sql`. Veja `ASAAS_README.md` e
`../../docs/ASAAS_SANDBOX_E_PRODUCAO.md`.

## Cron diário (`check-subscriptions`)

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Frequência recomendada: **1x por dia** (ex.: 6h).

Veja também: [PENDENCIAS_DEPLOY.md](../PENDENCIAS_DEPLOY.md) e [.github/workflows/check-subscriptions-cron.yml](../.github/workflows/check-subscriptions-cron.yml).
