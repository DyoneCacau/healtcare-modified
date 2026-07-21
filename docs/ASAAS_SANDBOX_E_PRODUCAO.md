# Asaas: homologação e produção

Este guia deve ser seguido primeiro no Sandbox. Nunca envie chaves por chat,
commit, variável `VITE_*` ou código do navegador.

## 1. Pré-requisitos

1. Revogue qualquer chave de produção que tenha sido exposta.
2. Confirme o projeto Supabase e faça backup do banco.
3. Crie uma conta separada em <https://sandbox.asaas.com>.
4. Gere uma chave de API Sandbox no painel web do Asaas.
5. Gere um token aleatório de webhook com 32 a 255 caracteres. Ele não pode ser
   a chave da API.

## 2. Aplicar SQL manualmente

Abra o SQL Editor do Supabase, revise e execute, nesta ordem:

1. `supabase/PRODUCAO_01_SECURITY_HARDENING.sql`
2. `supabase/PRODUCAO_02_ASAAS_BILLING.sql`

Os scripts incluem instruções no cabeçalho e são idempotentes. Não continue se
alguma instrução falhar; salve o erro completo e corrija antes da próxima etapa.

## 3. Secrets das Edge Functions

No Supabase Dashboard, acesse Edge Functions > Secrets e configure:

```text
APP_URL=https://URL-DO-FRONTEND
ASAAS_ENV=sandbox
ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=CHAVE-GERADA-NO-SANDBOX
ASAAS_WEBHOOK_TOKEN=TOKEN-ALEATORIO-DO-WEBHOOK
CRON_SECRET=OUTRO-TOKEN-ALEATORIO
META_APP_SECRET=SEGREDO-DO-APP-META
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados pelo ambiente
das Edge Functions. Não os copie para o frontend.

## 4. Publicar as funções

Depois de aplicar os scripts:

```bash
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy asaas-create-checkout
supabase functions deploy asaas-list-payments
supabase functions deploy asaas-cancel-subscription
supabase functions deploy asaas-reconcile
supabase functions deploy check-subscriptions
supabase functions deploy create-complete-client
supabase functions deploy meta-save-channel
```

Não publique `asaas-sandbox-card-test` (removida após homologação do cartão fictício).

Somente `asaas-webhook` é público sem JWT Supabase; ele exige o token próprio do
Asaas. As demais funções validam usuário ou `CRON_SECRET`.

## 5. Cadastrar webhook Sandbox

No Asaas Sandbox, acesse Integrações > Webhooks:

- URL: `https://PROJECT_REF.supabase.co/functions/v1/asaas-webhook`
- Token de autenticação: exatamente o valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: criação, confirmação, recebimento, atraso, estorno e cancelamento de
  cobranças/assinaturas

Monitore os logs do webhook no Asaas e no Supabase. Respostas diferentes de 2xx
devem ser investigadas imediatamente.

## 6. Homologação obrigatória

Use somente dados fictícios e valide:

- uma assinatura por clínica;
- taxa de implantação avulsa opcional;
- Pix, boleto e cartão;
- confirmação e liberação de acesso;
- evento duplicado sem duplicar pagamento;
- atraso com tolerância de sete dias;
- estorno, cancelamento e reconciliação;
- usuário de outra clínica sem acesso às cobranças;
- indisponibilidade temporária do Asaas sem perda de evento.

## 7. Entrada em produção

Somente após todos os testes:

1. Solicite ao Asaas a habilitação necessária para cartão/tokenização.
2. Gere uma nova chave de produção.
3. Troque diretamente no Supabase:
   - `ASAAS_ENV=production`
   - `ASAAS_API_BASE_URL=https://api.asaas.com/v3`
   - `ASAAS_API_KEY` pela nova chave
   - `ASAAS_WEBHOOK_TOKEN` por um novo token
4. Cadastre um webhook separado no Asaas de produção.
5. Faça uma cobrança controlada de baixo valor.
6. Ative a cobrança automática gradualmente, mantendo clientes antigos em modo
   manual até a migração individual.

## Resposta a incidentes

- Chave exposta: revogar, gerar outra, atualizar o secret e revisar logs.
- Webhook pausado: corrigir a causa, reconciliar pagamentos e reativar no Asaas.
- Divergência financeira: executar a reconciliação; nunca editar histórico sem
  trilha de auditoria.
