# HealthCare - Configuracao e Setup

## ⚠️ PROBLEMA: "Não consigo ver o front"

### SOLUÇÃO RÁPIDA (5 minutos):

```bash
# 1. Copiar arquivo de exemplo
cp .env.example .env

# 2. Editar .env e colar suas credenciais do Supabase
nano .env  # ou abra no VS Code

# 3. Instalar dependências
npm install

# 4. Rodar o sistema
npm run dev
```

---

## 📝 CONFIGURAÇÃO DETALHADA

### Passo 1: Criar arquivo .env

O arquivo `.env` é OBRIGATÓRIO para o sistema funcionar.

```bash
cp .env.example .env
```

### Passo 2: Obter Credenciais do Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Settings** → **API**
4. Copie os valores:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`

### Passo 3: Editar arquivo .env

Abra o arquivo `.env` e cole suas credenciais:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_publica_aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anonima_publica_aqui
```

**⚠️ IMPORTANTE**: Use a mesma chave para `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Passo 4: Instalar Dependências

```bash
npm install
```

### Passo 5: Executar Migrations

As migrations precisam ser executadas no Supabase para criar as tabelas.

**Opção A: Via Supabase CLI** (Recomendado)
```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Rodar migrations
supabase db push
```

**Opção B: Via Dashboard** (Manual)
1. Acesse: https://app.supabase.com/project/SEU_PROJETO/sql/new
2. Copie o conteúdo de cada arquivo em `supabase/migrations/`
3. Cole no SQL Editor e execute (em ordem numérica)

### Passo 6: Criar Usuário SuperAdmin

Siga as instruções em `CRIAR_SUPERADMIN.md` para criar o usuário:
- Email: dyonecacau@gmail.com
- Senha: 123456 (trocar depois)
- Papel: superadmin

### Passo 7: Rodar o Sistema

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🆘 TROUBLESHOOTING

### Erro: "Cannot read properties of undefined (reading 'storage')"

**Causa**: Arquivo `.env` não configurado

**Solução**:
```bash
# Verifique se .env existe
ls -la .env

# Verifique se tem valores
cat .env

# Se não tiver valores, copie do exemplo e configure
cp .env.example .env
nano .env
```

### Erro: Tela branca / Nada aparece

**Causa**: Variáveis de ambiente vazias ou incorretas

**Solução**:
1. Abra DevTools (F12) → Console
2. Veja a mensagem de erro
3. Verifique se as credenciais do Supabase estão corretas
4. Reinicie o servidor: Ctrl+C e depois `npm run dev`

### Erro: "Invalid API key"

**Causa**: Chave incorreta ou de outro projeto

**Solução**:
- Copie novamente as credenciais do dashboard do Supabase
- Certifique-se de copiar do projeto correto

### Frontend não carrega mesmo com .env configurado

**Solução**:
```bash
# Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar e rodar
npm install
npm run dev
```

---

## 📊 STATUS DO SISTEMA

### ✅ Módulos 100% Funcionais (Integrados com Supabase)

- Autenticação (Login/Logout)
- Dashboard SuperAdmin
- Gestão de Clínicas
- Gestão de Planos
- Assinaturas e Trials
- Sistema de Comissões
- Pagamentos e Histórico
- Configurações
- Profissionais
- Permissões (RLS)

### ⚠️ Módulos com Interface Pronta (Dados Mock)

- Agenda
- Pacientes
- Relatórios
- Estoque

**Nota**: Os módulos com ⚠️ têm interface completa e funcional, mas usam dados de exemplo. As funcionalidades principais estão 100% integradas.

---

## 🔐 CREDENCIAIS PADRÃO

**SuperAdmin**:
- Email: dyonecacau@gmail.com
- Senha: 123456 (trocar após primeiro login)

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- `CRIAR_SUPERADMIN.md` - Como criar usuário SuperAdmin
- `PERMISSOES_SISTEMA.md` - Diferenças SuperAdmin vs Admin
- `SETUP_COMPLETO.md` - Guia completo passo a passo

---

## ✅ CHECKLIST DE SETUP

- [ ] Arquivo `.env` criado (cp .env.example .env)
- [ ] Credenciais do Supabase configuradas no .env
- [ ] Dependências instaladas (npm install)
- [ ] Migrations executadas no Supabase
- [ ] SuperAdmin criado (dyonecacau@gmail.com)
- [ ] Sistema rodando (npm run dev)
- [ ] Login funcionando
- [ ] Menu SuperAdmin visível

---

**Tempo estimado**: 15-20 minutos
**Versão**: 2.0.1 Corrigida
**Data**: 06/02/2026
