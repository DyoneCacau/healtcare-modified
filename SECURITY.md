# Guia de Segurança — Deploy em Produção

## ⚠️ Antes de colocar em produção, configure obrigatoriamente:

---

## 1. Variáveis de ambiente no Supabase

Acesse: **Supabase Dashboard → Edge Functions → Manage Secrets**

| Variável | Descrição | Como obter |
|----------|-----------|------------|
| `INIT_SECRET` | Senha para criar superadmin | Gere uma senha aleatória forte (mín. 32 chars) |
| `CRON_SECRET` | Protege o endpoint de cron | Gere uma senha aleatória forte |
| `APP_URL` | URL da sua aplicação | Ex: `https://seuapp.com.br` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role | Supabase Dashboard → Settings → API |

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

## 3. Configurar cron job (verificação de assinaturas)

Configure um cron job externo (EasyCron, GitHub Actions, Render Cron) para chamar:

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-subscriptions \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

Frequência recomendada: **1x por dia** (ex.: 6h da manhã)

---

## 4. Variáveis no .env (frontend)

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPPORT_EMAIL=suporte@healthcare.com.br
VITE_SUPPORT_WHATSAPP=5511999999999
```

> **Nunca** coloque secrets de backend em variáveis `VITE_` — elas ficam expostas no bundle.

---

## 5. Checklist de segurança pré-launch

- [ ] Senhas de superadmin com mínimo 12 caracteres
- [ ] `INIT_SECRET` configurado e diferente de qualquer senha
- [ ] `.env` fora do repositório git
- [ ] Email de superadmin não óbvio (evite admin@, root@)
- [ ] Supabase Auth → Email confirmação habilitado
- [ ] Supabase Auth → Rate limiting habilitado (padrão já vem ativo)

---

## Vulnerabilidades corrigidas nesta versão

| ID | Tipo | Gravidade | Status |
|----|------|-----------|--------|
| 1 | Privilege escalation via user_roles INSERT | Crítico | ✅ Corrigido |
| 2 | Superadmin email exposto no bundle JS | Crítico | ✅ Corrigido |
| 3 | init-superadmin sem autenticação | Crítico | ✅ Corrigido |
| 4 | financial_audit sem RLS | Alto | ✅ Corrigido |
| 5 | audit_events sem RLS | Alto | ✅ Corrigido |
| 6 | check-subscriptions sem proteção | Alto | ✅ Corrigido |
| 7 | Professionals visíveis entre clínicas | Médio | ✅ Corrigido |
| 8 | user_roles DELETE sem escopo de clínica | Médio | ✅ Corrigido |
| 9 | payment_history inacessível para clínicas | Baixo | ✅ Corrigido |
