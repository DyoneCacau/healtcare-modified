# ⚡ COMANDOS RÁPIDOS - Cola e Executa

## 🚨 PASSO 1: REGENERAR CREDENCIAIS (FAÇA PRIMEIRO!)

**Supabase Anon Key:**
1. Abra: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/api
2. Role até "Project API keys"
3. Clique em "Reset" ao lado da "anon public"
4. Copie a nova chave

**Supabase Access Token:**
1. Abra: https://app.supabase.com/account/tokens
2. Revogue o token exposto (ex.: `sbp_<SEU_TOKEN_AQUI>`)
3. Clique em "Generate new token"
4. Copie e salve em lugar seguro

**MercadoPago:**
1. Abra: https://www.mercadopago.com.br/developers/panel/app
2. Vá em "Credenciais de produção"
3. Clique em "Gerar novas credenciais"
4. Copie Public Key e Access Token

---

## 🔧 PASSO 2: CONFIGURAR .env

```bash
# Entre no diretório do projeto
cd /caminho/do/seu/projeto/healthcare-modified

# Crie o arquivo .env (cole o conteúdo abaixo)
nano .env
```

**Cole isto no arquivo .env:**
```env
VITE_SUPABASE_URL='https://jahjwuydesfytlmjwucx.supabase.co'
VITE_SUPABASE_ANON_KEY='COLE_A_NOVA_ANON_KEY_AQUI'
VITE_SUPABASE_PUBLISHABLE_KEY='jahjwuydesfytlmjwucx'
VITE_MERCADOPAGO_PUBLIC_KEY='COLE_A_NOVA_PUBLIC_KEY_AQUI'
```

**Salvar no nano:** Ctrl+O, Enter, Ctrl+X

---

## ▶️ PASSO 3: INICIAR O SISTEMA

```bash
# Limpar cache do Vite
rm -rf node_modules/.vite

# Instalar dependências (se ainda não instalou)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

**Resultado esperado:**
```
VITE v5.4.19  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Abra: http://localhost:5173

---

## 🐛 SE DER ERRO

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Erro: "Port 5173 already in use"
```bash
# Matar processo na porta 5173
lsof -ti:5173 | xargs kill -9

# Ou usar outra porta
npm run dev -- --port 3000
```

### Erro: "VITE_SUPABASE_URL is not defined"
- Verifique se o arquivo .env existe
- Verifique se os valores estão ENTRE ASPAS SIMPLES
- Reinicie o terminal e execute `npm run dev` novamente

### Tela ainda em branco
```bash
# Abra o console do navegador (F12)
# Procure por erros em vermelho
# Se ver erro sobre Supabase, verifique o .env

# Limpar cache do navegador
Ctrl+Shift+Delete (Chrome/Edge)
Cmd+Shift+Delete (Mac)
```

---

## 📦 CONFIGURAÇÃO DE PRODUÇÃO (DEPOIS)

### Edge Function Secrets no Supabase

```bash
# 1. Acesse: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/functions

# 2. Clique em "Edge Functions Secrets"

# 3. Adicione estes secrets:
# ┌─────────────────────┬──────────────────────────────┐
# │ Nome                │ Valor                        │
# ├─────────────────────┼──────────────────────────────┤
# │ MP_ACCESS_TOKEN     │ Access Token do MercadoPago  │
# │ MP_WEBHOOK_SECRET   │ Secret do Webhook MP         │
# │ INIT_SECRET         │ Senha forte (min 32 chars)   │
# │ CRON_SECRET         │ Senha forte (min 32 chars)   │
# │ APP_URL             │ https://seudominio.com       │
# └─────────────────────┴──────────────────────────────┘
```

### Criar Primeiro Superadmin

```bash
# Substitua os valores abaixo pelos seus dados
curl -X POST https://jahjwuydesfytlmjwucx.supabase.co/functions/v1/init-superadmin \
  -H "Content-Type: application/json" \
  -H "x-init-secret: SEU_INIT_SECRET" \
  -d '{
    "email": "seu@email.com",
    "password": "SenhaForte123!",
    "name": "Super Admin"
  }'
```

---

## 📝 VERIFICAR CONFIGURAÇÃO

```bash
# Verificar se o .env existe
ls -la .env

# Ver conteúdo do .env (sem expor)
head -5 .env

# Verificar variáveis carregadas
npm run dev -- --debug

# Testar conexão Supabase (no console do navegador)
# Abra http://localhost:5173
# Pressione F12 > Console
# Cole:
localStorage.clear();
location.reload();
```

---

## 🎯 SEQUÊNCIA COMPLETA (COPY-PASTE)

```bash
# 1. Entre no projeto
cd /caminho/do/seu/projeto/healthcare-modified

# 2. Crie/edite o .env
nano .env
# Cole as credenciais, salve (Ctrl+O, Enter, Ctrl+X)

# 3. Limpe cache e instale
rm -rf node_modules/.vite
npm install

# 4. Inicie o servidor
npm run dev

# 5. Abra no navegador
# http://localhost:5173
```

---

## ⚠️ IMPORTANTE

- Nunca faça commit do .env
- Sempre use .env.example para templates
- Regenere credenciais se expor acidentalmente
- Teste em desenvolvimento antes de produção
- Configure SSL/HTTPS em produção
- Use senhas fortes (mínimo 12 caracteres)

---

## 📞 LINKS ÚTEIS

- Supabase Dashboard: https://app.supabase.com
- MercadoPago Developers: https://www.mercadopago.com.br/developers
- Documentação do projeto: README.md
- Guia de segurança: SECURITY.md
- Configuração rápida: CONFIGURACAO_RAPIDA.md
