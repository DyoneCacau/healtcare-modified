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
| [PENDENCIAS_DEPLOY.md](PENDENCIAS_DEPLOY.md) | Pendências técnicas e operacionais para produção |
| [docs/ASAAS_SANDBOX_E_PRODUCAO.md](docs/ASAAS_SANDBOX_E_PRODUCAO.md) | Configuração segura do Asaas em Sandbox e produção |
| [docs/ASAAS_MATRIZ_HOMOLOGACAO.md](docs/ASAAS_MATRIZ_HOMOLOGACAO.md) | Cenários obrigatórios de homologação do faturamento |
| [SECURITY.md](SECURITY.md) | Práticas, secrets e checklist de segurança |
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
- **Assinatura** – Cobrança manual ou recorrente pelo Asaas, separada por clínica

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

## 💳 Produção segura e integração Asaas (15/07/2026)

### Implementado

- Infraestrutura de cobrança recorrente por clínica no Supabase
- Integração Asaas Sandbox para assinatura mensal e taxa de implantação opcional
- Checkout hospedado pelo Asaas com Pix, boleto e cartão
- Webhook autenticado e idempotente para pagamentos, atrasos, estornos e cancelamentos
- Reconciliação financeira e tolerância de sete dias para inadimplência
- Autosserviço de faturas e regularização na tela de cobrança
- Controles de assinatura e pagamentos para SuperAdmin
- Criação segura de clientes pelo backend
- RLS e buckets privados reforçados, credenciais Meta protegidas e CORS restrito
- SQL de segurança e faturamento aplicado manualmente ao projeto Supabase
- Edge Functions de cobrança publicadas e webhook Sandbox validado com HTTP 200
- Backup manual de schema, dados e roles realizado antes das alterações
- Typecheck, testes, build e auditoria incorporados ao CI

### Falta antes da produção

- Concluir todos os cenários de [homologação no Sandbox](docs/ASAAS_MATRIZ_HOMOLOGACAO.md), incluindo Pix, boleto, cartão, atraso, estorno, duplicidade e cancelamento
- Publicar o frontend e substituir `APP_URL=http://localhost:8080` pela URL HTTPS definitiva
- Configurar monitoramento, alertas e rotina confiável de backups; o plano Free do Supabase não oferece backup automático
- Revogar definitivamente qualquer credencial de produção anteriormente exposta
- Somente após a homologação, criar novos secrets e webhook exclusivos no Asaas de produção
- Fazer uma cobrança real controlada de baixo valor e liberar clientes gradualmente

> O ambiente ainda não está liberado para cobranças reais. Enquanto `ASAAS_ENV=sandbox`, use somente dados fictícios.

---

## 🗑️ Limpeza do Banco

O arquivo `LIMPAR_BANCO_DEFINITIVO.sql` remove dados de teste. Execute via Supabase SQL Editor. **Faça backup antes!**

---

## 📋 Pré-Lançamento

Consulte [CHECKLIST_PENDENCIAS.md](CHECKLIST_PENDENCIAS.md) para o checklist completo de itens antes de colocar em produção.
