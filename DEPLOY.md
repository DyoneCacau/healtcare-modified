# Guia de Deploy - HealthCare

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)
- Repositório no GitHub

---

## 1. Supabase (Produção)

1. Crie um novo projeto em [supabase.com](https://supabase.com)
2. Em **Settings > API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
3. Em **SQL Editor**, execute as migrations na ordem:
   - Todas as migrations em `supabase/migrations/` (por data)
   - Ou use: `npx supabase db push` (se configurado)
4. Em **Authentication > URL Configuration**, adicione a URL do seu app em produção

---

## 2. Variáveis de Ambiente

Crie `.env` na raiz (ou configure no painel da hospedagem):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx  # opcional, para pagamentos
```

**No Supabase Dashboard** (Edge Functions Secrets):
- `SUPABASE_SERVICE_ROLE_KEY`
- `MP_ACCESS_TOKEN` (Mercado Pago)
- `MP_WEBHOOK_SECRET`
- `INIT_SECRET` (para init superadmin)
- `CRON_SECRET` (para check-subscriptions)

---

## 3. Deploy no Vercel

1. Conecte o repositório GitHub ao Vercel
2. **Framework Preset:** Vite (detectado automaticamente)
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Adicione as variáveis de ambiente em **Settings > Environment Variables**
6. Deploy

O arquivo `vercel.json` já está configurado para SPA (redirects).

---

## 4. Deploy no Netlify

1. Conecte o repositório ao Netlify
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. Adicione variáveis em **Site settings > Environment variables**
5. Deploy

O arquivo `netlify.toml` já está configurado.

---

## 5. Domínio

- **Vercel:** Settings > Domains > Add
- **Netlify:** Domain settings > Add custom domain

Atualize no Supabase: **Authentication > URL Configuration** com a URL final.

---

## 6. Checklist Pós-Deploy

- [ ] Login funciona
- [ ] Supabase conectado (sem erros no console)
- [ ] Migrations aplicadas
- [ ] SuperAdmin inicializado (se necessário)
- [ ] Política de Privacidade acessível em `/privacidade`
- [ ] Contato/Suporte configurado (e-mail/WhatsApp no ContactAdminScreen)

---

## 7. Backup

- **Supabase:** Dashboard > Database > Backups (automático no plano Pro)
- Configure backups manuais se necessário
