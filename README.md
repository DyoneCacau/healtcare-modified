# HealthCare - Sistema de Gestão Odontológica

Sistema completo de gestão para clínicas odontológicas: agenda, pacientes, financeiro, comissões, estoque, ponto e mais.

---

## 🚀 Instalação Rápida

```bash
npm install
cp .env.example .env
# Edite .env com suas credenciais do Supabase
npx supabase db push   # ou execute as migrations manualmente
npm run dev
```

---

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [DEPLOY.md](DEPLOY.md) | Guia de deploy (Vercel, Netlify, Supabase) |
| [CHECKLIST_PENDENCIAS.md](CHECKLIST_PENDENCIAS.md) | Checklist para lançamento e comercialização |
| [.env.example](.env.example) | Variáveis de ambiente necessárias |

---

## ✨ Funcionalidades Principais

- **Agenda** – Agendamentos, confirmação, finalização com pagamento
- **Pacientes** – CRUD, prontuário, WhatsApp
- **Financeiro** – Caixa, entradas, saídas, estorno (com justificativa), sangria, fechamento
- **Comissões** – Regras por procedimento, relatório com filtros
- **Profissionais** – Cadastro e gestão
- **Estoque** – Controle de materiais
- **Ponto** – Registro de ponto eletrônico
- **Permissões** – Por role (admin, recepcionista, etc.) e por feature
- **Multi-clínica** – Suporte a várias clínicas por usuário
- **Assinatura** – Planos, Mercado Pago (modelo vendas fechadas)

### Segurança

- Exclusão de lançamento: apenas admin, com senha obrigatória
- Estorno: justificativa obrigatória (registrada em auditoria)
- Clínica sem assinatura: tela "Contacte o administrador"
- Política de Privacidade (LGPD) em `/privacidade`

---

## 🔧 Correções e Melhorias (12/02/2026)

- Nome da clínica na sidebar e dashboard
- Administração bloqueada para não-admins
- Usuários duplicados prevenidos (índice único)
- Estorno com card dedicado e justificativa
- Exclusão com senha (apenas admin)
- Tela de clínica pendente de ativação
- Política de Privacidade (LGPD)
- Config de deploy (Vercel, Netlify)

---

## 🗑️ Limpeza do Banco

O arquivo `LIMPAR_BANCO_DEFINITIVO.sql` remove dados de teste. Execute via Supabase SQL Editor. **Faça backup antes!**

---

## 📋 Pré-Lançamento

Consulte [CHECKLIST_PENDENCIAS.md](CHECKLIST_PENDENCIAS.md) para o checklist completo de itens antes de colocar em produção.
