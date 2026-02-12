# 🚨 LEIA ISTO PRIMEIRO - README

## ⚠️ ALERTA CRÍTICO DE SEGURANÇA

Você compartilhou **credenciais sensíveis publicamente** neste chat!

**AÇÃO IMEDIATA NECESSÁRIA:**
1. Regenerar TODAS as credenciais expostas
2. Configurar arquivo `.env` com as novas credenciais
3. Apenas então iniciar o sistema

---

## 📚 DOCUMENTAÇÃO - Ordem de Leitura

### 🔴 URGENTE (Leia AGORA):

1. **GUIA_CORRECAO_URGENTE.md** ← COMECE AQUI!
   - Explica o problema de segurança
   - Passo a passo para regenerar credenciais
   - Como configurar o .env
   - Como resolver a tela em branco

2. **COMANDOS_RAPIDOS.md** ← COMANDOS PRONTOS
   - Comandos prontos para copy-paste
   - Sequência completa de correção
   - Troubleshooting de erros comuns

### 🟡 IMPORTANTE (Leia em seguida):

3. **DIAGRAMA_PROBLEMA_SOLUCAO.md**
   - Visualização do problema
   - Entendimento técnico
   - Fluxo da solução

4. **SECURITY.md**
   - Vulnerabilidades encontradas e corrigidas
   - Configuração para produção
   - Checklist de segurança

### 🟢 COMPLEMENTAR (Leia depois):

5. **CONFIGURACAO_RAPIDA.md**
   - Guia de configuração geral

6. **CONFIGURACAO_MERCADOPAGO.md**
   - Configuração específica do MercadoPago

7. **README_CONFIGURACAO.md**
   - Documentação técnica completa

---

## 🎯 PROBLEMA E SOLUÇÃO RESUMIDOS

### O Problema:
```
.env com valores exemplo
     ↓
Validação falha
     ↓
Aplicação trava
     ↓
Tela em branco 🖥️
```

### A Solução:
```
1. Regenerar credenciais (URGENTE!)
     ↓
2. Atualizar .env com novas credenciais
     ↓
3. Limpar cache: rm -rf node_modules/.vite
     ↓
4. Iniciar: npm run dev
     ↓
5. Sucesso! 🎉
```

---

## 🚀 INÍCIO RÁPIDO (3 Comandos)

**ANTES:** Regenere todas as credenciais!
- Supabase: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/api
- MercadoPago: https://www.mercadopago.com.br/developers/panel/app

**DEPOIS:**
```bash
# 1. Configure o .env (veja GUIA_CORRECAO_URGENTE.md)
nano .env

# 2. Limpe cache e instale
rm -rf node_modules/.vite && npm install

# 3. Inicie o servidor
npm run dev
```

---

## 📁 ESTRUTURA DOS ARQUIVOS DE AJUDA

```
healthcare-modified/
│
├── 🔴 README_PRIMEIRO.md              ← VOCÊ ESTÁ AQUI
├── 🔴 GUIA_CORRECAO_URGENTE.md        ← LEIA AGORA
├── 🔴 COMANDOS_RAPIDOS.md             ← COMANDOS PRONTOS
│
├── 🟡 DIAGRAMA_PROBLEMA_SOLUCAO.md    ← ENTENDA O PROBLEMA
├── 🟡 SECURITY.md                     ← VULNERABILIDADES CORRIGIDAS
│
├── 🟢 CONFIGURACAO_RAPIDA.md
├── 🟢 CONFIGURACAO_MERCADOPAGO.md
├── 🟢 README_CONFIGURACAO.md
│
├── ⚙️  corrigir.sh                     ← SCRIPT AUTOMÁTICO
├── ⚙️  verify-config.sh
│
└── 📝 .env.corrigido                  ← TEMPLATE DO .env
```

---

## 🛠️ SCRIPT AUTOMÁTICO

Para usar o script de correção automática:

```bash
chmod +x corrigir.sh
./corrigir.sh
```

O script vai:
1. Pedir confirmação de que você regenerou as credenciais
2. Solicitar as novas credenciais
3. Criar o arquivo .env automaticamente
4. Limpar o cache
5. Preparar o sistema para iniciar

---

## ✅ CHECKLIST RÁPIDO

Antes de executar `npm run dev`:

- [ ] Li o GUIA_CORRECAO_URGENTE.md
- [ ] Regenerei a Supabase Anon Key
- [ ] Revoquei o Supabase Access Token antigo
- [ ] Regenerei as credenciais do MercadoPago
- [ ] Atualizei o arquivo .env com as NOVAS credenciais
- [ ] Limpei o cache: `rm -rf node_modules/.vite`
- [ ] Instalei as dependências: `npm install`

Se todos os itens estão marcados, execute:
```bash
npm run dev
```

---

## 🆘 SUPORTE

### Erros Comuns:

**Erro: "Cannot find module"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Erro: "Port already in use"**
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

**Tela ainda em branco**
- Abra F12 no navegador
- Veja erros no Console
- Verifique se o .env tem valores corretos
- Certifique-se que as credenciais foram regeneradas

### Documentação:

- **Supabase**: https://supabase.com/docs
- **MercadoPago**: https://www.mercadopago.com.br/developers/pt/docs
- **Vite**: https://vitejs.dev/

---

## 🔒 SEGURANÇA

### 10 Vulnerabilidades Corrigidas:

✅ Escalação de privilégio (CRÍTICO)
✅ Email de superadmin exposto (CRÍTICO)
✅ init-superadmin sem auth (CRÍTICO)
✅ Webhook sem validação (CRÍTICO)
✅ Auditoria financeira sem RLS (ALTO)
✅ Eventos de auditoria sem RLS (ALTO)
✅ check-subscriptions sem proteção (ALTO)
✅ Profissionais visíveis entre clínicas (MÉDIO)
✅ DELETE de roles sem escopo (MÉDIO)
✅ Histórico de pagamentos inacessível (BAIXO)

Veja detalhes em: **SECURITY.md**

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Regenerar credenciais
2. ✅ Configurar .env
3. ✅ Testar localmente
4. ⏳ Configurar Edge Function Secrets (produção)
5. ⏳ Criar primeiro superadmin (produção)
6. ⏳ Configurar webhook MercadoPago (produção)
7. ⏳ Deploy em produção

---

## ⚠️ LEMBRE-SE

**NUNCA MAIS:**
- ❌ Compartilhe credenciais em chats
- ❌ Faça commit do .env no git
- ❌ Use credenciais de exemplo em produção
- ❌ Exponha tokens publicamente

**SEMPRE:**
- ✅ Use gerenciadores de senha
- ✅ Regenere se expor acidentalmente
- ✅ Mantenha .env no .gitignore
- ✅ Use HTTPS em produção

---

## 🎯 RESUMO DE 1 LINHA

**Regenere as credenciais → Configure o .env → Execute npm run dev → Pronto!**

---

**BOM TRABALHO! 🚀**

Qualquer dúvida, leia os outros arquivos MD ou consulte a documentação oficial.
