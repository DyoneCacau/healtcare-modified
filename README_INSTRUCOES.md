# 🚀 INSTRUÇÕES DE MIGRAÇÃO - Passo a Passo

## ✅ O QUE VOCÊ RECEBEU

1. **PLANO_MIGRACAO_VENDAS_DIRETAS.md** - Documento completo com todo o planejamento
2. **migration_database_CORRIGIDO.sql** - Script SQL corrigido e pronto para executar
3. **CreateCompleteClient.tsx** - Componente React para criar clientes
4. **ClientsStatusDashboard.tsx** - Dashboard React para gerenciar clientes

---

## 📋 PASSO 1: EXECUTAR MIGRAÇÃO DO BANCO DE DADOS

### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **+ New Query**
4. Copie TODO o conteúdo do arquivo `migration_database_CORRIGIDO.sql`
5. Cole no editor SQL
6. Clique em **RUN** (ou pressione Ctrl+Enter)
7. Aguarde a execução (pode levar 10-30 segundos)
8. Você verá mensagens de sucesso ao final, como:
   ```
   NOTICE: Colunas adicionadas em subscriptions: billing_status, monthly_fee, setup_fee, admin_notes
   NOTICE: Tabela payment_history criada com sucesso!
   NOTICE: Função get_superadmin_stats criada com sucesso!
   NOTICE: Função register_payment criada com sucesso!
   NOTICE: MIGRAÇÃO CONCLUÍDA COM SUCESSO!
   ```

### Opção B: Via Supabase CLI

```bash
# Se você usa Supabase CLI localmente
supabase db reset
cat migration_database_CORRIGIDO.sql | supabase db execute
```

### ✅ Verificar se funcionou

Execute esta query no SQL Editor para testar:

```sql
-- Testar estatísticas
SELECT * FROM get_superadmin_stats();

-- Verificar view
SELECT * FROM vw_clients_status LIMIT 5;

-- Verificar novos campos
SELECT 
  id, 
  billing_status, 
  monthly_fee, 
  setup_fee, 
  admin_notes 
FROM subscriptions 
LIMIT 5;
```

---

## 📋 PASSO 2: ADICIONAR COMPONENTES REACT AO PROJETO

### 2.1 - Criar Componente de Criação de Cliente

1. No seu projeto, crie o arquivo:
   ```
   src/components/superadmin/CreateCompleteClient.tsx
   ```

2. Copie TODO o conteúdo do arquivo `CreateCompleteClient.tsx` para este arquivo

3. Verifique se as importações estão corretas (ajuste caminhos se necessário)

### 2.2 - Criar Dashboard de Status

1. No seu projeto, crie o arquivo:
   ```
   src/components/superadmin/ClientsStatusDashboard.tsx
   ```

2. Copie TODO o conteúdo do arquivo `ClientsStatusDashboard.tsx` para este arquivo

---

## 📋 PASSO 3: INTEGRAR NO PAINEL SUPERADMIN

### 3.1 - Atualizar SuperAdmin.tsx

Edite o arquivo `src/pages/SuperAdmin.tsx` e adicione:

```typescript
import { CreateCompleteClient } from "@/components/superadmin/CreateCompleteClient";
import { ClientsStatusDashboard } from "@/components/superadmin/ClientsStatusDashboard";

// Dentro do componente, na aba de dashboard:
<TabsContent value="dashboard">
  <div className="space-y-6">
    {/* Botão para criar novo cliente */}
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Gestão de Clientes</h2>
      <CreateCompleteClient />
    </div>
    
    {/* Dashboard de status */}
    <ClientsStatusDashboard />
  </div>
</TabsContent>
```

---

## 📋 PASSO 4: COMENTAR CÓDIGO DE SELF-SERVICE

### 4.1 - Página de Login (src/pages/Login.tsx)

Encontre e comente estas seções:

```typescript
// COMENTAR: Estado de signup
// const [isSignUp, setIsSignUp] = useState(false);
// const [name, setName] = useState("");
// const [clinicName, setClinicName] = useState("");
// const [phone, setPhone] = useState("");

// COMENTAR: Lógica de signup (linhas 34-73)
// if (isSignUp) { ... }

// COMENTAR: Campos do formulário de cadastro (linhas 192-240)
// {isSignUp && ( ... )}

// COMENTAR: Toggle entre login/signup (linhas 327-341)
// <button onClick={() => setIsSignUp(!isSignUp)}>
```

**Alternativa mais fácil:** Substitua todo o conteúdo de `Login.tsx` por uma versão simplificada apenas com login.

### 4.2 - Remover/Comentar Página de Billing

Opção 1: Comentar rota em `App.tsx`:
```typescript
// <Route path="/billing" element={<Billing />} />
```

Opção 2: Esvaziar o componente:
```typescript
// src/pages/Billing.tsx
export default function Billing() {
  return (
    <MainLayout>
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Gestão de Pagamentos</h1>
        <p className="text-muted-foreground">
          A gestão de pagamentos é feita manualmente pelo administrador.
        </p>
      </div>
    </MainLayout>
  );
}
```

### 4.3 - Ajustar useSubscription (src/hooks/useSubscription.tsx)

Encontre e modifique:

```typescript
// ANTES:
const isTrialExpired = 
  subscription?.status === 'trial' && 
  subscription?.trial_ends_at && 
  isPast(new Date(subscription.trial_ends_at));

// DEPOIS:
const isTrialExpired = false; // Não usa mais trial

// ANTES:
const isBlocked = 
  !isSuperAdmin && 
  subscription !== null && 
  (isTrialExpired || 
   subscription.status === 'suspended' || 
   subscription.status === 'expired' ||
   subscription.status === 'cancelled');

// DEPOIS:
const isBlocked = 
  !isSuperAdmin && 
  subscription !== null && 
  (subscription.status === 'suspended' || 
   subscription.status === 'blocked' ||
   subscription.status === 'cancelled');
```

---

## 📋 PASSO 5: TESTAR O SISTEMA

### 5.1 - Criar Primeiro Cliente de Teste

1. Faça login como SuperAdmin
2. Vá em **SuperAdmin → Dashboard**
3. Clique em **"Novo Cliente"**
4. Preencha o formulário:
   - **Admin:** Teste Silva / teste@teste.com / senha123
   - **Clínica:** Clínica Teste / 00.000.000/0000-00
   - **Módulos:** Selecione alguns módulos
   - **Mensalidade:** R$ 500,00
   - **Adesão:** R$ 1000,00
5. Clique em **"Criar Cliente"**

### 5.2 - Verificar se Cliente foi Criado

Execute no SQL Editor:

```sql
-- Ver clientes criados
SELECT * FROM vw_clients_status;

-- Ver detalhes do último cliente
SELECT 
  u.name as admin_name,
  u.email,
  c.name as clinic_name,
  s.billing_status,
  s.monthly_fee,
  s.features_override as modules
FROM users u
JOIN clinic_users cu ON cu.user_id = u.id
JOIN clinics c ON c.id = cu.clinic_id
JOIN subscriptions s ON s.clinic_id = c.id
WHERE u.is_superadmin = false
ORDER BY u.created_at DESC
LIMIT 1;
```

### 5.3 - Testar Login do Cliente

1. Faça logout do SuperAdmin
2. Tente fazer login com:
   - Email: teste@teste.com
   - Senha: senha123
3. Você deve conseguir logar
4. Verifique se apenas os módulos selecionados estão acessíveis

### 5.4 - Testar Suspensão de Cliente

1. Volte ao SuperAdmin
2. No dashboard, encontre o cliente de teste
3. Clique em **"Ações" → "Suspender Cliente"**
4. Faça logout e tente logar novamente como o cliente
5. O acesso deve ser bloqueado

### 5.5 - Testar Registro de Pagamento

1. Como SuperAdmin, vá no cliente
2. Clique em **"Ações" → "Registrar Pagamento"**
3. Preencha:
   - Valor: R$ 500,00
   - Data: hoje
   - Método: PIX
4. Salve
5. Verifique que o status mudou para "Pago" e "Ativo"

---

## 🔧 TROUBLESHOOTING

### Erro: "Function get_superadmin_stats does not exist"
**Solução:** Execute o script SQL novamente, pode ser que alguma parte não tenha sido executada.

### Erro: "Permission denied for table payment_history"
**Solução:** As policies RLS foram criadas. Verifique se você está logado como SuperAdmin.

### Cliente não consegue acessar módulos contratados
**Solução:** Verifique se:
1. O campo `features_override` na subscription está preenchido corretamente
2. O status da subscription é 'active'
3. O billing_status é 'paid'

### Componentes React dão erro de importação
**Solução:** Ajuste os caminhos das importações para corresponder à estrutura do seu projeto.

---

## 📊 PRÓXIMOS PASSOS (Opcional)

Depois que tudo estiver funcionando, você pode:

1. **Personalizar o formulário de criação** para seus campos específicos
2. **Adicionar envio de email** com credenciais ao criar cliente
3. **Criar relatório financeiro** mensal
4. **Implementar cobrança automática** (integrar com Asaas, Iugu, etc)
5. **Adicionar notificações** de vencimento

---

## ❓ DÚVIDAS?

Consulte o documento **PLANO_MIGRACAO_VENDAS_DIRETAS.md** para mais detalhes sobre:
- Arquitetura do sistema
- Fluxo completo de negócio
- Exemplos de código
- Boas práticas

---

## ✅ CHECKLIST FINAL

- [ ] Script SQL executado com sucesso
- [ ] Componentes React adicionados ao projeto
- [ ] Login simplificado (sem cadastro)
- [ ] Página de Billing removida/desabilitada
- [ ] useSubscription ajustado (sem trial)
- [ ] Cliente de teste criado
- [ ] Login do cliente funcionando
- [ ] Módulos sendo controlados corretamente
- [ ] Suspensão de cliente funcionando
- [ ] Registro de pagamento funcionando

**Quando todos os itens estiverem marcados, sua migração está completa! 🎉**
