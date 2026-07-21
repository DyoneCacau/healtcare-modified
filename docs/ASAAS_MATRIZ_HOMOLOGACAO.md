# Matriz de homologação Asaas

**Última atualização:** 2026-07-21  
**Ambiente:** Asaas Sandbox + Supabase `jahjwuydesfytlmjwucx`  
**Clínica de teste:** Clínica Sorriso  
**Resultado da bateria:** **OK**

---

## Status rápido — homologação sandbox **APROVADA**

| Item | Resultado |
|------|-----------|
| Pix na plataforma + confirmação sandbox → app atualiza | OK (manual) |
| Cartão `4444…` → `CONFIRMED` + fatura Asaas | OK |
| Assinatura Asaas em `CREDIT_CARD` (débito automático) | OK |
| Atraso → suspensão (regra 7 dias / `current_period_end`) | OK |
| Reativação após atraso → `active` + `paid` | OK |
| Cancelamento Asaas (assinatura descartável) | OK |
| Reconcile / fila de webhooks (órfãos arquivados) | OK |
| Webhook sem token → 401 | OK |
| Listar cobranças da assinatura | OK |
| Functions MP legado removidas (`mp-*`, `create-clinic-on-signup`) | OK |
| Function temporária de homologação removida | OK |

### Observação cartão / página Asaas
No sandbox o sucesso da página hospedada é o mesmo caminho de API (`CREDIT_CARD` + cartão fictício `4444…` → `CONFIRMED`).  
Fatura de evidência: `https://sandbox.asaas.com/i/rf6ba7xws7k753eg`

---

## Ainda falta só para **produção / go-live** (não é mais sandbox)

1. Publicar frontend em **HTTPS** + secret `APP_URL`
2. Configurar crons no GitHub (`CRON_SECRET`, `SUPABASE_PROJECT_URL`) para `check-subscriptions` e `asaas-reconcile`
3. Conta Asaas **produção** + webhook + secrets novos (`ASAAS_ENV=production`, etc.)
4. Habilitar cartão/tokenização no Asaas produção (se for usar)
5. Uma cobrança real controlada de baixo valor
6. Backup + alerta de falha
7. (Opcional) Digitar cartão manualmente uma vez na página Asaas hospedada em sandbox, só para ver o UX

Detalhes: [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)

## Aprovação sandbox

| Campo | Valor |
|-------|--------|
| Data | 2026-07-21 |
| Ambiente | Sandbox |
| Liberar Asaas produção? | **Ainda não** — falta go-live operacional acima |
| Homologação de cobrança sandbox? | **Sim — OK** |
