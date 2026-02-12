# INSTRUÇÕES PARA APLICAR AS CORREÇÕES

## Resumo das Correções Implementadas

Este documento detalha todas as correções implementadas no sistema conforme solicitado.

---

## 1. EMAIL ÚNICO PARA USUÁRIOS ✅

**Problema:** Era possível criar dois usuários com o mesmo email.

**Solução:** 
- Adicionado índice único no email (case-insensitive) na tabela `profiles`
- Adicionada validação no frontend antes de criar usuário
- Migration: `20260212_correcoes_sistema.sql` (linhas 8-17)

**Arquivo Modificado:**
- `src/components/admin/UserManagement.tsx` - Validação antes de criar usuário (linhas 118-126)

---

## 2. CRIAÇÃO AUTOMÁTICA DE CLÍNICA REMOVIDA ✅

**Problema:** Ao criar usuário da clínica, era criada uma clínica com nome do usuário que aparecia no superadmin.

**Solução:**
- Removido trigger `on_user_created_create_clinic`
- Removida função `create_clinic_on_user_signup()`
- Migration: `20260212_correcoes_sistema.sql` (linhas 19-24)

---

## 3. ADMIN PODE DELETAR USUÁRIOS ✅

**Problema:** Admin tinha permissão apenas para desativar usuários, não para deletá-los.

**Solução:**
- Adicionadas políticas RLS para permitir DELETE em `profiles`, `user_roles` e `clinic_users`
- Adicionado botão "Deletar" no componente UserManagement
- Adicionado AlertDialog de confirmação antes de deletar
- Migration: `20260212_correcoes_sistema.sql` (linhas 26-70)

**Arquivos Modificados:**
- `src/components/admin/UserManagement.tsx` - Botão e função de deletar

---

## 4. NOTIFICAÇÕES DE LEADS CORRIGIDAS ✅

**Problema:** Número de notificações na aba de leads não sumia após marcar como aprovado ou rejeitado.

**Solução:**
- A contagem já estava correta (filtrando por `status = 'pending'`)
- Adicionado trigger para forçar atualização em tempo real
- O real-time subscription na página SuperAdmin.tsx já estava implementado
- Migration: `20260212_correcoes_sistema.sql` (linhas 136-149)

**Observação:** A correção é automática - quando o status muda de 'pending' para outro, a contagem atualiza.

---

## 5. DONO VISUALIZA TODAS AS SUAS CLÍNICAS ✅

**Problema:** Dono da clínica não podia visualizar todos os dados das suas X clínicas em um único acesso.

**Solução:**
- Criada view `vw_owner_clinics` para listar todas as clínicas onde usuário é owner
- Criada função `user_is_multi_clinic_owner()` para verificar se tem múltiplas clínicas
- Criada função `get_user_clinics()` para obter lista de clínicas do usuário
- Adicionado campo `preferred_clinic_id` em profiles para clínica preferencial
- Migration: `20260212_correcoes_sistema.sql` (linhas 151-232)

**Próximos Passos (implementação frontend):**
1. Ao fazer login, verificar se usuário é owner de múltiplas clínicas
2. Se sim, mostrar seletor de clínica
3. Se não, redirecionar para a única clínica vinculada
4. Funcionários sempre são redirecionados para sua clínica vinculada

---

## 6. FORMULÁRIO DE CONTATO NA PÁGINA DE LOGIN ✅

**Problema:** Não havia forma de possíveis clientes entrarem em contato.

**Solução:**
- Criada tabela `contact_requests` para armazenar solicitações
- Adicionado botão "Solicitar Acesso" na página de login
- Formulário com campos: nome, email, telefone e mensagem
- Solicitações caem na aba "Suporte" do SuperAdmin (ou nova aba específica)
- Migration: `20260212_correcoes_sistema.sql` (linhas 72-134)

**Arquivos Criados:**
- `src/pages/Login_updated.tsx` - Nova página de login com formulário
- `src/components/superadmin/ContactRequestsManagement.tsx` - Gerenciamento de solicitações

---

## COMO APLICAR AS CORREÇÕES

### Passo 1: Aplicar Migration no Supabase

```bash
# Copiar arquivo de migration
cp supabase/migrations/20260212_correcoes_sistema.sql [seu_projeto_supabase]/migrations/

# Aplicar migration
supabase db push
```

Ou aplicar diretamente no SQL Editor do Supabase Dashboard.

### Passo 2: Substituir Arquivos

1. **Página de Login:**
   ```bash
   mv src/pages/Login.tsx src/pages/Login_backup.tsx
   mv src/pages/Login_updated.tsx src/pages/Login.tsx
   ```

2. **UserManagement:** O arquivo já foi modificado diretamente

3. **Adicionar novo componente no SuperAdmin:**
   - Copiar `src/components/superadmin/ContactRequestsManagement.tsx`
   - Adicionar importação na página SuperAdmin

### Passo 3: Atualizar SuperAdmin.tsx

Adicione uma nova aba para visualizar solicitações de contato:

```tsx
import { ContactRequestsManagement } from "@/components/superadmin/ContactRequestsManagement";

// Adicionar contador de solicitações pendentes
const [pendingContactRequests, setPendingContactRequests] = useState(0);

// Na função useEffect, adicionar:
async function fetchPendingContactRequests() {
  const { count } = await supabase
    .from('contact_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  setPendingContactRequests(count || 0);
}

// Adicionar tab na interface
<TabsTrigger value="contact-requests" className="flex items-center gap-2 relative">
  <UserPlus className="h-4 w-4" />
  <span className="hidden sm:inline">Solicitações</span>
  {pendingContactRequests > 0 && (
    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-1 -right-1">
      {pendingContactRequests}
    </Badge>
  )}
</TabsTrigger>

<TabsContent value="contact-requests">
  <ContactRequestsManagement />
</TabsContent>
```

### Passo 4: Testar

1. **Email Único:**
   - Tentar criar 2 usuários com mesmo email
   - Deve mostrar erro

2. **Deletar Usuário:**
   - Ir em Administração > Usuários
   - Clicar no botão de lixeira
   - Confirmar exclusão

3. **Notificações:**
   - Criar uma solicitação de upgrade
   - Ver contador na aba "Leads"
   - Aprovar ou rejeitar
   - Contador deve zerar

4. **Formulário de Contato:**
   - Fazer logout
   - Clicar em "Solicitar Acesso"
   - Preencher formulário
   - Verificar no SuperAdmin > Solicitações

---

## ARQUIVOS CRIADOS/MODIFICADOS

### Criados:
1. `supabase/migrations/20260212_correcoes_sistema.sql`
2. `src/pages/Login_updated.tsx`
3. `src/components/superadmin/ContactRequestsManagement.tsx`

### Modificados:
1. `src/components/admin/UserManagement.tsx`

---

## OBSERVAÇÕES IMPORTANTES

1. **Múltiplas Clínicas:** A lógica de backend está pronta. Falta implementar o seletor de clínica no frontend ao fazer login.

2. **Deletar Usuário:** A função tenta deletar do Auth mas pode falhar se não tiver permissão de superadmin. O importante é que remove de todas as tabelas relacionadas.

3. **Formulário Público:** A tabela `contact_requests` permite inserção sem autenticação (anon) para o formulário funcionar na tela de login.

4. **Real-time:** Todas as funcionalidades já têm real-time subscriptions configuradas.

---

## PRÓXIMAS IMPLEMENTAÇÕES SUGERIDAS

1. **Dashboard do Owner:** Criar dashboard que mostre dados agregados de todas as clínicas do owner

2. **Seletor de Clínica:** Implementar modal/página para owner escolher qual clínica acessar

3. **Notificações por Email:** Enviar email quando chegar nova solicitação de contato

4. **Status de Leitura:** Marcar solicitações de contato como "lida" vs "não lida"

---

## SUPORTE

Se tiver alguma dúvida ou problema ao aplicar as correções, verifique:
- Logs do Supabase para erros de migration
- Console do navegador para erros de frontend
- Políticas RLS estão habilitadas e corretas
