# 🚀 GUIA COMPLETO DE CONFIGURAÇÃO - MERCADO PAGO

## 📋 ÍNDICE
1. [Arquivos de Configuração](#arquivos-de-configuração)
2. [Configuração do Frontend](#configuração-do-frontend)
3. [Configuração das Edge Functions](#configuração-das-edge-functions)
4. [Testando Localmente](#testando-localmente)
5. [Deploy em Produção](#deploy-em-produção)
6. [Troubleshooting](#troubleshooting)

---

## 📁 ARQUIVOS DE CONFIGURAÇÃO

Existem **2 arquivos de configuração** diferentes:

### 1. `.env` (Frontend - React/Vite)
- **Localização**: Raiz do projeto
- **Uso**: Configurações do frontend (variáveis começam com `VITE_`)
- **Já está configurado** ✅

### 2. `supabase/.env.local` (Edge Functions - Backend)
- **Localização**: Pasta `supabase/`
- **Uso**: Configurações das funções serverless do Supabase
- **PRECISA DE UMA CHAVE ADICIONAL** ⚠️

---

## ⚙️ CONFIGURAÇÃO DO FRONTEND

### ✅ Já Configurado

O arquivo `.env` na raiz do projeto já está correto:

```env
# Supabase
VITE_SUPABASE_URL=https://jahjwuydesfytlmjwucx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# SuperAdmin
VITE_SUPERADMIN_EMAILS=dyonecacau@gmail.com

# Mercado Pago (TESTE)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-88aca571-dbac-4775-8665-d4201283c4a2
VITE_MERCADOPAGO_ACCESS_TOKEN=TEST-4718711848135686-020609-461228711bcaaace0304c28e1c98286b-1880199034
```

**Nada precisa ser alterado aqui!** 👍

---

## 🔧 CONFIGURAÇÃO DAS EDGE FUNCTIONS

### ⚠️ Ação Necessária

Você precisa obter a **SERVICE_ROLE_KEY** do Supabase.

### Passo a Passo:

#### 1️⃣ Acesse o Dashboard do Supabase
```
https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/api
```

#### 2️⃣ Localize a Service Role Key
- Role a página até a seção **"Project API keys"**
- Procure pela linha **"service_role"** (marcada como `secret`)
- Clique no ícone de **"Reveal"** ou olho 👁️
- Copie a chave completa (começa com `eyJhbGc...`)

#### 3️⃣ Configure o Arquivo
Abra o arquivo: `supabase/.env.local`

Encontre esta linha:
```env
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_SUA_SERVICE_ROLE_KEY
```

Cole sua chave:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaGp3dXlkZXNmeXRsbWp3dWN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM1NTQzNywiZXhwIjoyMDg1OTMxNDM3fQ.RESTO_DA_CHAVE_AQUI
```

---

## 🧪 TESTANDO LOCALMENTE

### 1. Instalar Dependências
```bash
npm install
```

### 2. Rodar o Frontend
```bash
npm run dev
```

O sistema estará disponível em: http://localhost:5173

### 3. Testar Funcionalidade de Upgrade

1. **Faça login** com: dyonecacau@gmail.com
2. Vá em **"Configurações"** → **"Assinatura"**
3. Clique em **"Fazer Upgrade"** ou **"Alterar Plano"**
4. Preencha os dados do cartão de **TESTE**

#### 🔐 Dados de Teste do Mercado Pago

**Cartões de Crédito de Teste:**

| Bandeira    | Número           | CVV | Validade | Nome          | Status   |
|-------------|------------------|-----|----------|---------------|----------|
| Visa        | 4509 9535 6623 3704 | 123 | 11/25    | APRO          | Aprovado |
| Mastercard  | 5031 4332 1540 6351 | 123 | 11/25    | APRO          | Aprovado |
| Visa        | 4074 0996 3460 0896 | 123 | 11/25    | OTHE          | Rejeitado|

**Documentos de Teste:**
- CPF: 12345678909
- Email: test_user_XXXXXXXX@testuser.com

### 4. Verificar Edge Functions (Opcional)

Se quiser testar as funções localmente:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Logar no Supabase
supabase login

# Servir funções localmente
supabase functions serve
```

---

## 🚀 DEPLOY EM PRODUÇÃO

### Quando Estiver Pronto para Produção:

#### 1️⃣ Obter Credenciais REAIS do Mercado Pago

Acesse: https://www.mercadopago.com.br/developers/panel

1. Vá em **"Credenciais"**
2. Ative o **"Modo Produção"**
3. Copie:
   - **Public Key** (começa com `APP_USR-...`)
   - **Access Token** (começa com `APP_USR-...`)

#### 2️⃣ Atualizar `.env` (Frontend)

```env
# Trocar de TEST para PRODUÇÃO:
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx-sua-chave-real
VITE_MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx-seu-token-real
```

#### 3️⃣ Configurar Variáveis no Supabase

Acesse: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/functions

1. Clique em **"Edge Functions"**
2. Vá em **"Secrets"** ou **"Environment Variables"**
3. Adicione:
   - `MP_ACCESS_TOKEN` = seu access token REAL
   - `MP_PUBLIC_KEY` = sua public key REAL
   - `APP_URL` = URL do seu site em produção

#### 4️⃣ Deploy das Edge Functions

```bash
# Deploy de todas as funções
supabase functions deploy mp-create-subscription
supabase functions deploy mp-webhook
supabase functions deploy create-payment-preference
```

---

## 🐛 TROUBLESHOOTING

### Erro ao fazer Upgrade

#### ❌ "Missing authorization header"
**Causa**: Usuário não está logado
**Solução**: Faça login novamente

#### ❌ "MP error" ou "502 Bad Gateway"
**Causa**: Credenciais do Mercado Pago inválidas
**Solução**: 
1. Verifique se as chaves de TESTE estão corretas
2. Verifique se copiou as chaves SEM espaços extras

#### ❌ "Invalid token" ou "Clinic not found"
**Causa**: Problema com o banco de dados
**Solução**:
1. Verifique se as migrations foram executadas
2. Verifique se o usuário tem uma clínica associada

#### ❌ "Plan not found"
**Causa**: Plano não existe ou está inativo
**Solução**:
1. Acesse o painel SuperAdmin
2. Vá em "Planos" e crie/ative os planos

### Verificar Logs das Edge Functions

```bash
# Via CLI
supabase functions logs mp-create-subscription

# Via Dashboard
https://app.supabase.com/project/jahjwuydesfytlmjwucx/logs
```

### Resetar Configuração

Se algo der errado:

```bash
# Limpar e reinstalar
rm -rf node_modules
rm -rf .vite
npm install

# Rodar novamente
npm run dev
```

---

## 📊 DIFERENÇAS: TESTE vs PRODUÇÃO

| Item                    | TESTE (Atual)              | PRODUÇÃO (Futuro)        |
|-------------------------|----------------------------|--------------------------|
| Chaves começam com      | `TEST-`                    | `APP_USR-`               |
| Cobranças reais         | ❌ Não                      | ✅ Sim                    |
| Cartões                 | Apenas de teste            | Reais                    |
| Notificações (webhook)  | Funcionam                  | Funcionam                |
| Ambiente                | Sandbox                    | Produção                 |

---

## ✅ CHECKLIST COMPLETO

### Frontend (.env)
- [x] VITE_SUPABASE_URL configurado
- [x] VITE_SUPABASE_ANON_KEY configurado
- [x] VITE_SUPERADMIN_EMAILS configurado
- [x] VITE_MERCADOPAGO_PUBLIC_KEY configurado (TESTE)
- [x] VITE_MERCADOPAGO_ACCESS_TOKEN configurado (TESTE)

### Edge Functions (supabase/.env.local)
- [ ] SUPABASE_SERVICE_ROLE_KEY configurado
- [x] MP_ACCESS_TOKEN configurado
- [x] MP_PUBLIC_KEY configurado
- [x] APP_URL configurado

### Sistema
- [ ] npm install executado
- [ ] Migrations aplicadas no Supabase
- [ ] SuperAdmin criado (dyonecacau@gmail.com)
- [ ] Sistema rodando (npm run dev)
- [ ] Teste de upgrade realizado

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Configure a SERVICE_ROLE_KEY** (único passo pendente)
2. ✅ **Rode o sistema**: `npm run dev`
3. ✅ **Teste o upgrade** com cartões de teste
4. 🚀 **Quando pronto**, troque para credenciais de produção

---

**Precisa de ajuda?**
- Documentação Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
- Dashboard Supabase: https://app.supabase.com/project/jahjwuydesfytlmjwucx

**Versão**: 1.0
**Data**: Fevereiro 2026
