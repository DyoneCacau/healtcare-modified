# GUIA RÁPIDO - APLICAR CORREÇÕES

## 📋 Lista de Verificação

### ✅ Correções Implementadas

1. ✅ Email único para usuários (não permite duplicados)
2. ✅ Removida criação automática de clínica ao criar usuário
3. ✅ Admin pode deletar usuários (além de desativar)
4. ✅ Notificações de leads são limpas ao aprovar/rejeitar
5. ✅ Dono pode visualizar todas suas clínicas
6. ✅ Formulário de contato na página de login

---

## 🚀 PASSOS PARA APLICAR

### 1️⃣ Aplicar Migration no Banco de Dados

**No Supabase Dashboard:**
1. Vá em SQL Editor
2. Copie e execute o conteúdo do arquivo:
   ```
   supabase/migrations/20260212_correcoes_sistema.sql
   ```
3. Verifique se executou sem erros

**OU via CLI:**
```bash
supabase db push
```

---

### 2️⃣ Substituir Arquivos Frontend

Execute os seguintes comandos:

```bash
# 1. Atualizar Login
mv src/pages/Login.tsx src/pages/Login_OLD.tsx
mv src/pages/Login_updated.tsx src/pages/Login.tsx

# 2. Atualizar SuperAdmin
mv src/pages/SuperAdmin.tsx src/pages/SuperAdmin_OLD.tsx
mv src/pages/SuperAdmin_updated.tsx src/pages/SuperAdmin.tsx

# 3. UserManagement já foi atualizado automaticamente
```

---

### 3️⃣ Adicionar Nova Rota (Opcional - para múltiplas clínicas)

Se você quer implementar o seletor de clínicas, adicione esta rota no seu `App.tsx`:

```tsx
import SelectClinic from "@/pages/SelectClinic";

// Adicionar dentro das rotas:
<Route path="/select-clinic" element={<SelectClinic />} />
```

---

### 4️⃣ Testar Cada Funcionalidade

#### Teste 1: Email Único
1. Vá em Administração > Usuários
2. Tente criar um usuário com email já existente
3. ✅ Deve mostrar erro: "Este e-mail já está cadastrado"

#### Teste 2: Deletar Usuário
1. Vá em Administração > Usuários
2. Clique no ícone de lixeira (🗑️)
3. Confirme a exclusão
4. ✅ Usuário deve ser removido

#### Teste 3: Notificações de Leads
1. Vá em SuperAdmin > Leads
2. Veja o contador de notificações
3. Aprove ou rejeite um lead
4. ✅ Contador deve diminuir

#### Teste 4: Formulário de Contato
1. Faça logout
2. Na tela de login, clique em "Solicitar Acesso"
3. Preencha o formulário
4. Envie
5. ✅ Faça login como superadmin
6. ✅ Verifique na aba "Solicitações"

---

## 📁 ESTRUTURA DE ARQUIVOS

### Arquivos Criados:
```
✅ supabase/migrations/20260212_correcoes_sistema.sql
✅ src/pages/Login_updated.tsx
✅ src/pages/SuperAdmin_updated.tsx
✅ src/pages/SelectClinic.tsx
✅ src/components/auth/ClinicSelector.tsx
✅ src/components/superadmin/ContactRequestsManagement.tsx
✅ INSTRUCOES_CORRECOES.md
✅ GUIA_RAPIDO.md (este arquivo)
```

### Arquivos Modificados:
```
✅ src/components/admin/UserManagement.tsx
```

---

## 🔧 FUNCIONALIDADES POR ARQUIVO

### Login.tsx (atualizado)
- ✅ Formulário de contato
- ✅ Modal "Solicitar Acesso"
- ✅ Validação de campos

### UserManagement.tsx
- ✅ Validação de email único
- ✅ Botão de deletar usuário
- ✅ Dialog de confirmação

### SuperAdmin.tsx (atualizado)
- ✅ Nova aba "Solicitações"
- ✅ Contador de solicitações pendentes
- ✅ Real-time updates

### ContactRequestsManagement.tsx
- ✅ Listagem de solicitações
- ✅ Filtros por status
- ✅ Atualização de status
- ✅ Notas internas

### Migration SQL
- ✅ Constraint de email único
- ✅ Remoção de trigger automático
- ✅ Políticas RLS para delete
- ✅ Tabela contact_requests
- ✅ Suporte para múltiplas clínicas
- ✅ Trigger de notificações

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### Email Único
- O índice é **case-insensitive** (teste@email.com = TESTE@email.com)
- Validação acontece antes de criar usuário

### Deletar Usuário
- Remove de: profiles, user_roles, clinic_users
- Tenta remover do auth (pode falhar sem permissões)
- Requer confirmação do admin

### Notificações
- Atualizam em tempo real
- Contam apenas status 'pending'
- Limpam automaticamente ao processar

### Formulário de Contato
- Funciona sem autenticação
- Cai na aba "Solicitações" do SuperAdmin
- Pode ser aprovado/rejeitado/convertido

### Múltiplas Clínicas
- Backend pronto
- Frontend opcional (ClinicSelector)
- Owners veem todas suas clínicas

---

## 🐛 TROUBLESHOOTING

### Erro na Migration
**Problema:** "relation already exists"
**Solução:** Algumas tabelas/funções já existem. Comentar linhas específicas.

### Email ainda permite duplicados
**Problema:** Migration não aplicada
**Solução:** Verificar se migration rodou com sucesso

### Botão deletar não aparece
**Problema:** Arquivo não foi substituído
**Solução:** Verificar se UserManagement.tsx foi atualizado

### Solicitações não aparecem
**Problema:** Políticas RLS
**Solução:** Verificar se user tem role 'superadmin'

---

## 📞 PRÓXIMOS PASSOS (OPCIONAL)

1. **Dashboard Agregado:** Mostrar dados de todas as clínicas do owner
2. **Notificações por Email:** Avisar quando chegar nova solicitação
3. **Relatórios:** Gerar relatórios consolidados
4. **Permissões Granulares:** Controle fino de acesso por clínica

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído, verifique:

- [ ] Migration executada com sucesso
- [ ] Login.tsx substituído
- [ ] SuperAdmin.tsx substituído
- [ ] UserManagement.tsx atualizado
- [ ] Testado email único
- [ ] Testado deletar usuário
- [ ] Testado notificações de leads
- [ ] Testado formulário de contato
- [ ] Verificado real-time updates

---

## 💡 DICA

Mantenha backup dos arquivos originais:
```bash
# Já fizemos isso automaticamente ao usar _OLD no nome
src/pages/Login_OLD.tsx
src/pages/SuperAdmin_OLD.tsx
```

Se algo der errado, basta reverter:
```bash
mv src/pages/Login_OLD.tsx src/pages/Login.tsx
mv src/pages/SuperAdmin_OLD.tsx src/pages/SuperAdmin.tsx
```

---

**Todas as correções solicitadas foram implementadas! 🎉**
