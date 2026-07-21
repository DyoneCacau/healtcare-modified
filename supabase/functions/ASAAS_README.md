# Backend Asaas

Esta integração cria cobranças por clínica. Ela usa assinatura mensal com
`billingType: UNDEFINED`, permitindo que o pagador escolha PIX, boleto ou cartão
na página hospedada pelo Asaas. Nenhum dado de cartão passa pelo sistema.

## 1. Banco de dados

Revise e execute **manualmente** no SQL Editor do Supabase:

`supabase/PRODUCAO_02_ASAAS_BILLING.sql`

O script não deve ser aplicado automaticamente.

## 2. Secrets

Configure no painel Supabase, sem salvar valores reais no repositório:

- `ASAAS_API_KEY`
- `ASAAS_API_BASE_URL`:
  - sandbox: `https://api-sandbox.asaas.com/v3`
  - produção: `https://api.asaas.com/v3`
- `ASAAS_WEBHOOK_TOKEN`
- `ASAAS_ENV` (`sandbox` ou `production`)
- `CRON_SECRET`
- `APP_URL` (origem autorizada no CORS, sem barra final)
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (fornecidos pelo Supabase)

As requisições ao Asaas enviam a chave no header `access_token`. Configure o
webhook Asaas para enviar `asaas-access-token` com o mesmo valor de
`ASAAS_WEBHOOK_TOKEN`.

O helper aceita a URL oficial com ou sem o sufixo `/v3`, normaliza as chamadas
para uma única versão e recusa hosts incompatíveis com `ASAAS_ENV`. Assim,
`sandbox` somente usa `api-sandbox.asaas.com`, enquanto `production` somente usa
`api.asaas.com`.

## 3. Funções

- `asaas-create-checkout`: proprietário da clínica ou superadmin; cria/reutiliza
  customer, assinatura mensal e taxa de adesão avulsa opcional.
- `asaas-list-payments`: membro da clínica ou superadmin; lista cobranças e URLs
  hospedadas.
- `asaas-cancel-subscription`: proprietário ou superadmin; cancela recorrência.
- `asaas-set-card-recurring`: proprietário; muda assinatura para `CREDIT_CARD` e
  abre/antecipa fatura no Asaas para o cliente cadastrar o cartão (sem dados de
  cartão no HealthCare).
- `asaas-choose-payment-method`: proprietário; escolhe `PIX`, `BOLETO` ou
  `CREDIT_CARD` na plataforma, atualiza a cobrança no Asaas e devolve QR Pix,
  boleto ou link de cartão.
- `asaas-webhook`: autentica o token, persiste `event.id` e aplica eventos de
  pagamento de forma idempotente.
- `asaas-reconcile`: protegida por `CRON_SECRET`; reaplica eventos pendentes e
  reconcilia pagamentos das assinaturas Asaas.

> A function temporária `asaas-sandbox-card-test` foi removida após a homologação
> do cartão fictício. Não republicar.

Publique cada função separadamente somente depois de aplicar o SQL e configurar
os secrets. Este repositório não realiza deploy automaticamente.

## 4. Política de atraso e estorno

Um evento `OVERDUE` atualiza `billing_status` e `payment_status` para `overdue`,
mas não suspende a assinatura imediatamente. A suspensão permanece a cargo de
`check-subscriptions`, após a tolerância de 7 dias.

Estornos e chargebacks seguem a regra conservadora: o pagamento fica rejeitado,
a cobrança fica `overdue` e o status atual da assinatura é preservado até a
avaliação do job. Um novo pagamento confirmado volta a ativar a assinatura.

## 5. Webhook e cron

URL do webhook:

`https://SEU_PROJETO.supabase.co/functions/v1/asaas-webhook`

Exemplo de chamada diária da reconciliação:

```bash
curl -X POST "https://SEU_PROJETO.supabase.co/functions/v1/asaas-reconcile" \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":50}'
```

Não reutilize a chave da API como token de webhook ou segredo do cron.
