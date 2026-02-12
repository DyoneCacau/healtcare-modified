# Guia de Segurança — Deploy em Produção

## ⚠️ Antes de colocar em produção, configure obrigatoriamente:

---

## 1. Variáveis de ambiente no Supabase

Acesse: **Supabase Dashboard → Edge Functions → Manage Secrets**

| Variável | Descrição | Como obter |
|----------|-----------|------------|
| `MP_ACCESS_TOKEN` | Token privado do MercadoPago | MP Dashboard → Credenciais → Access Token (produção) |
| `MP_WEBHOOK_SECRET` | Secret HMAC do webhook MP | MP Dashboard → Webhooks → Chave secreta |
| `INIT_SECRET` | Senha para criar superadmin | Gere uma senha aleatória forte (mín. 32 chars) |
| `CRON_SECRET` | Protege o endpoint de cron | Gere uma senha aleatória forte |
| `APP_URL` | URL da sua aplicação | Ex: `https://seuapp.com.br` |
| `MP_WEBHOOK_URL` | URL pública do webhook | Ex: `https://xxxx.supabase.co/functions/v1/mp-webhook` |

---

## 2. Criar o primeiro superadmin

**Só faça isso UMA VEZ após o deploy.**

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/init-superadmin \
  -H "Content-Type: application/json" \
  -H "x-init-secret: SEU_INIT_SECRET" \
  -d '{"email":"seu@email.com","password":"SenhaForte12chars!","name":"Super Admin"}'
```

Após criar o superadmin, você pode **remover ou desabilitar** a Edge Function `init-superadmin` no Dashboard.

---

## 3. Configurar webhook no MercadoPago

1. Acesse: MercadoPago Dashboard → Desenvolvedor → Webhooks
2. Configure a URL: `https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook`
3. Eventos: `payment`, `preapproval`
4. Copie a **Chave secreta** gerada e salve como `MP_WEBHOOK_SECRET` no Supabase

---

## 4. Configurar cron job (verificação de assinaturas)

Configure um cron job externo (EasyCron, GitHub Actions, Render Cron) para chamar:

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

Frequência recomendada: **a cada 6 horas**

---

## 5. Variáveis no .env (frontend)

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
```

> **Nunca** coloque `MP_ACCESS_TOKEN` ou qualquer secret em variáveis `VITE_` — elas ficam expostas no bundle.

---

## 6. Checklist de segurança pré-launch

- [ ] Senhas de superadmin com mínimo 12 caracteres
- [ ] `INIT_SECRET` configurado e diferente de qualquer senha
- [ ] `MP_WEBHOOK_SECRET` copiado do painel MP
- [ ] `.env` fora do repositório git
- [ ] Email de superadmin não óbvio (evite admin@, root@)
- [ ] Teste o webhook com pagamento de R$1,00 em sandbox antes de produção
- [ ] Supabase Auth → Email confirmação habilitado
- [ ] Supabase Auth → Rate limiting habilitado (padrão já vem ativo)

---

## Vulnerabilidades corrigidas nesta versão

| ID | Tipo | Gravidade | Status |
|----|------|-----------|--------|
| 1 | Privilege escalation via user_roles INSERT | Crítico | ✅ Corrigido |
| 2 | Superadmin email exposto no bundle JS | Crítico | ✅ Corrigido |
| 3 | init-superadmin sem autenticação | Crítico | ✅ Corrigido |
| 4 | Webhook MP sem verificação de assinatura | Crítico | ✅ Corrigido |
| 5 | financial_audit sem RLS | Alto | ✅ Corrigido |
| 6 | audit_events sem RLS | Alto | ✅ Corrigido |
| 7 | check-subscriptions sem proteção | Alto | ✅ Corrigido |
| 8 | Professionals visíveis entre clínicas | Médio | ✅ Corrigido |
| 9 | user_roles DELETE sem escopo de clínica | Médio | ✅ Corrigido |
| 10 | payment_history inacessível para clínicas | Baixo | ✅ Corrigido |
