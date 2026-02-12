# 🎯 CONFIGURAÇÃO RÁPIDA - RESUMO

## ✅ O QUE JÁ ESTÁ CONFIGURADO

Você **NÃO precisa fazer nada** com relação a:

- ✅ `.env` (arquivo principal) → **JÁ ESTÁ CORRETO**
- ✅ Credenciais do Supabase → **JÁ CONFIGURADAS**
- ✅ Email do SuperAdmin → **JÁ CONFIGURADO**
- ✅ Credenciais de TESTE do Mercado Pago → **JÁ CONFIGURADAS**

## ⚠️ O QUE VOCÊ PRECISA FAZER

### 1️⃣ Única Ação Necessária (OPCIONAL)

Se você quiser testar pagamentos via Mercado Pago localmente:

**Obter a Service Role Key do Supabase**

1. Acesse: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/api
2. Procure: **"service_role" (secret)**
3. Clique em **"Reveal"**
4. Copie a chave
5. Cole em: `supabase/.env.local` na linha `SUPABASE_SERVICE_ROLE_KEY=`

**Se você NÃO for testar pagamentos agora, pode pular este passo.**

### 2️⃣ Rodar o Sistema

```bash
# Instalar dependências
npm install

# Rodar o sistema
npm run dev
```

Acesse: http://localhost:5173

### 3️⃣ Fazer Login

- Email: **dyonecacau@gmail.com**
- Senha: **(a senha que você cadastrou no Supabase)**

---

## 🔍 VERIFICAR CONFIGURAÇÃO

Quer ter certeza que está tudo OK?

```bash
# Rodar script de verificação
bash verify-config.sh
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, consulte:

- **CONFIGURACAO_MERCADOPAGO.md** - Guia completo do Mercado Pago
- **README_CONFIGURACAO.md** - Configuração geral do sistema

---

## 🆘 PROBLEMAS COMUNS

### ❌ Erro ao fazer upgrade

**Se aparecer erro ao tentar fazer upgrade de plano:**

1. Verifique se você configurou a `SUPABASE_SERVICE_ROLE_KEY` em `supabase/.env.local`
2. Certifique-se de que está usando cartões de **TESTE** do Mercado Pago

**Cartão de Teste que funciona:**
- Número: `4509 9535 6623 3704`
- CVV: `123`
- Validade: `11/25`
- Nome: `APRO`

---

## 📋 ARQUIVOS IMPORTANTES

```
.env                           ← Configuração do FRONTEND (✅ já configurado)
supabase/.env.local           ← Configuração das EDGE FUNCTIONS (⚠️ precisa da SERVICE_ROLE_KEY)
CONFIGURACAO_MERCADOPAGO.md   ← Guia completo
verify-config.sh              ← Script de verificação
```

---

## 🎯 DIFERENÇA ENTRE OS ARQUIVOS .env

| Arquivo                | Usado por              | Precisa Configurar? |
|------------------------|------------------------|---------------------|
| `.env`                 | Frontend (React/Vite)  | ✅ Já configurado    |
| `.env.example`         | Modelo de exemplo      | ❌ Não use este     |
| `supabase/.env.local`  | Edge Functions (API)   | ⚠️ Opcional (só para pagamentos) |

---

## ✅ TESTE vs PRODUÇÃO

**Você está usando credenciais de TESTE** (correto para desenvolvimento).

As chaves de TESTE começam com `TEST-` e:
- ❌ NÃO processam pagamentos reais
- ✅ Permitem testar toda a funcionalidade
- ✅ Usam cartões de teste do Mercado Pago

**Quando for para produção**, troque as chaves de `TEST-` para `APP_USR-`.

---

**Pronto! Sistema configurado e pronto para uso! 🚀**
