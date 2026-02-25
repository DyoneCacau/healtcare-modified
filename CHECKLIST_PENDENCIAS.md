# 📋 Checklist de Pendências - HealthCare

**Última atualização:** 12/02/2026

---

## 🟢 INFRAESTRUTURA

### Supabase (Produção)
- [ ] Criar projeto em [supabase.com](https://supabase.com)
- [ ] Executar todas as migrations em `supabase/migrations/` (ordem por data)
- [ ] Migration `20260221000000_financial_transactions_refunded_at.sql` (coluna refunded_at)
- [ ] Migration `20260220000000_commissions_beneficiary_name.sql`
- [ ] Migration `20260219000000_commissions_rls_clinic_members.sql`
- [ ] Configurar **Authentication > URL Configuration** com URL do app em produção
- [ ] Configurar **Edge Functions Secrets** (MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, INIT_SECRET, CRON_SECRET)

### Hospedagem
- [ ] Escolher provedor (Vercel ou Netlify)
- [ ] Conectar repositório GitHub
- [ ] Configurar variáveis de ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Fazer primeiro deploy
- [ ] Verificar build sem erros

### Domínio
- [ ] Adicionar domínio customizado (opcional)
- [ ] Atualizar URL no Supabase após domínio configurado

---

## 🟢 VARIÁVEIS DE AMBIENTE

### Obrigatórias (Frontend)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

### Opcionais (Frontend)
- [ ] `VITE_MERCADOPAGO_PUBLIC_KEY` (para pagamentos)
- [ ] `VITE_SUPPORT_EMAIL` (tela "Clínica pendente de ativação")
- [ ] `VITE_SUPPORT_WHATSAPP` (tela "Clínica pendente de ativação")

### Supabase Edge Functions (Secrets)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MP_ACCESS_TOKEN`
- [ ] `MP_WEBHOOK_SECRET`
- [ ] `INIT_SECRET`
- [ ] `CRON_SECRET`

---

## 🟢 VALIDAÇÃO PÓS-DEPLOY

### Funcionalidades Básicas
- [ ] Login funciona
- [ ] Recuperação de senha funciona
- [ ] Dashboard carrega
- [ ] Nome da clínica aparece na sidebar
- [ ] Sem erros no console do navegador

### Módulos
- [ ] Agenda (criar/editar agendamento)
- [ ] Pacientes (CRUD)
- [ ] Financeiro (entrada, saída, estorno, fechamento)
- [ ] Comissões (regras e relatório)
- [ ] Profissionais (CRUD)
- [ ] Estoque (se habilitado)
- [ ] Ponto (se habilitado)

### Segurança
- [ ] Apenas admin vê botão de excluir lançamento
- [ ] Exclusão exige senha
- [ ] Estorno exige justificativa
- [ ] Clínica sem assinatura mostra tela "Contacte o administrador"

### Páginas Públicas
- [ ] `/login` acessível
- [ ] `/privacidade` acessível (Política de Privacidade)
- [ ] `/forgot-password` funciona

---

## 🟢 COMERCIALIZAÇÃO

### Documentação
- [ ] Atualizar e-mail e WhatsApp no ContactAdminScreen (via .env)
- [ ] Revisar texto da Política de Privacidade (nome da empresa, contato)
- [ ] Termos de Uso / Contrato (se necessário)

### Onboarding
- [ ] Definir fluxo de criação de cliente (SuperAdmin > CreateCompleteClient)
- [ ] Documentar processo para equipe de vendas
- [ ] Testar criação completa: clínica + admin + assinatura

### Suporte
- [ ] Canal de contato definido (e-mail/WhatsApp)
- [ ] Processo para solicitações de acesso (tela de login)
- [ ] Processo para clínicas pendentes de ativação

---

## 🟢 LGPD / LEGAL

- [ ] Política de Privacidade publicada e linkada
- [ ] Revisar coleta de dados (contact_requests, etc.)
- [ ] Definir DPO ou responsável (se aplicável)
- [ ] Processo para solicitações de direitos do titular (acesso, exclusão, etc.)

---

## 🟢 BACKUP E MONITORAMENTO

- [ ] Backup do Supabase configurado (plano Pro ou manual)
- [ ] Monitoramento de erros (ex: Sentry) — opcional
- [ ] Alertas de indisponibilidade — opcional

---

## ✅ JÁ IMPLEMENTADO

- [x] Estorno com justificativa obrigatória
- [x] Card Estorno separado de Saídas
- [x] Exclusão de lançamento: apenas admin + senha
- [x] Tela "Clínica pendente de ativação" (needsActivation)
- [x] Política de Privacidade (LGPD)
- [x] Config deploy (vercel.json, netlify.toml)
- [x] Guia de deploy (DEPLOY.md)
- [x] .env.example completo
- [x] Modelo vendas fechadas (sem trial aberto)
- [x] useSubscription usa clínica selecionada (multi-clínica)

---

## 📊 RESUMO

| Categoria           | Total | Concluído | Pendente |
|---------------------|-------|-----------|----------|
| Infraestrutura      | 12    | 0         | 12       |
| Variáveis           | 10    | 0         | 10       |
| Validação           | 18    | 0         | 18       |
| Comercialização     | 8     | 0         | 8        |
| LGPD                | 4     | 0         | 4        |
| Backup/Monitoramento| 3     | 0         | 3       |
| **Já implementado** | 9     | 9         | 0        |

---

*Use este checklist para acompanhar o progresso até o lançamento.*
