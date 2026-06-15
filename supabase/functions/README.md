# Edge Functions — HealthCare

Modelo **vendas diretas B2B**. Integrações de pagamento automático (Mercado Pago) foram removidas.

## Funções ativas

| Função | Descrição | Secrets necessários |
|--------|-----------|---------------------|
| `check-subscriptions` | Cron: alertas de vencimento, inadimplência e suspensão | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` |
| `init-superadmin` | Cria o primeiro superadmin (uma vez) | `INIT_SECRET` |
| `reset-user-password` | Reset de senha administrativo | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-clinic-and-user` | Exclusão de clínica e usuário | `SUPABASE_SERVICE_ROLE_KEY` |
| `meta-webhook` | Webhook Meta WhatsApp (receber mensagens + fluxo bot) | `META_WEBHOOK_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| `meta-send-message` | Enviar mensagem outbound via Cloud API | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |

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
supabase functions deploy meta-webhook
supabase functions deploy meta-send-message
```

Secrets adicionais (Dashboard → Edge Functions → Secrets):

- `META_WEBHOOK_VERIFY_TOKEN` — token usado na verificação do webhook no Meta Developers

## Cron diário (`check-subscriptions`)

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Frequência recomendada: **1x por dia** (ex.: 6h).

Veja também: [PENDENCIAS_DEPLOY.md](../PENDENCIAS_DEPLOY.md) e [.github/workflows/check-subscriptions-cron.yml](../.github/workflows/check-subscriptions-cron.yml).
