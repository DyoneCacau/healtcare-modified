# 📋 PLANO DE MIGRAÇÃO: Self-Service → Vendas Diretas B2B

## 🎯 Objetivo da Mudança

Migrar de um modelo **self-service** com pagamentos automáticos (Mercado Pago) para um modelo **B2B de vendas diretas** onde:

- ✅ Você cria manualmente o cadastro do cliente admin
- ✅ Você configura as clínicas do cliente (2+ unidades)
- ✅ Você define quais módulos cada cliente pode acessar
- ✅ Você gerencia status: adimplente, atrasado, suspenso, ativo
- ✅ Você pode liberar/bloquear módulos sob demanda
- ✅ Cobrança manual: adesão + mensalidade

---

## 📊 Estrutura Atual vs Nova

### ATUAL (Self-Service)
```
Usuário → Cadastro na tela de Login → Trial 7 dias → Pagamento Mercado Pago → Upgrade de Plano
```

### NOVA (Vendas Diretas)
```
Cliente interessado → Você cria Admin + Clínicas → Define módulos → Acompanha status → Cobra manualmente
```

---

## 🗂️ Arquivos que Precisam ser Modificados

### 1️⃣ **FRONTEND - Páginas**

#### `src/pages/Login.tsx`
**Ações:**
- ❌ Comentar/remover todo o formulário de cadastro (isSignUp)
- ❌ Remover campos: nome, clinicName, phone
- ❌ Remover chamada para `create-clinic-on-signup`
- ✅ Deixar apenas o formulário de login
- ✅ Remover botão "Criar conta grátis"

**Código a comentar:**
```typescript
// Linhas 15-20: campos do formulário de cadastro
// Linhas 34-73: lógica de signup
// Linhas 94-99: trialFeatures
// Linhas 127-144: painel de trial grátis
// Linhas 192-240: campos de cadastro no form
// Linhas 304-310: termos de uso
// Linhas 327-341: toggle entre login/signup
```

---

#### `src/pages/Billing.tsx`
**Ações:**
- ❌ Remover toda a página de cobrança/pagamentos
- ❌ Ou comentar completamente o conteúdo
- ✅ Deixar apenas mensagem: "Gestão de pagamentos feita manualmente pelo administrador"

---

#### `src/pages/Settings.tsx`
**Ações:**
- ❌ Remover seções de upgrade de plano
- ❌ Remover botões de pagamento
- ✅ Manter apenas configurações operacionais da clínica

---

### 2️⃣ **FRONTEND - Componentes**

#### `src/components/subscription/*`
**Arquivos a comentar/desabilitar:**
- `CardSubscriptionForm.tsx` - formulário de assinatura com cartão
- `TrialExpiredScreen.tsx` - tela de trial expirado
- `FeatureBlockedScreen.tsx` - pode manter, mas ajustar mensagem

**Ajustes:**
- ✅ Manter `FeatureGate.tsx` e `RequireFeature.tsx` (controle de acesso)
- ✅ Ajustar mensagens: ao invés de "Faça upgrade", mostrar "Módulo não contratado. Entre em contato."

---

#### `src/components/layout/Sidebar.tsx` e `Header.tsx`
**Ações:**
- ❌ Remover links para `/billing`
- ❌ Remover badges/alertas de trial
- ❌ Remover botões "Upgrade"

---

### 3️⃣ **HOOKS**

#### `src/hooks/useSubscription.tsx`
**Ajustes:**
- ✅ **Manter a estrutura** (é essencial para controle de módulos)
- ✅ Remover lógica de trial (`isTrialExpired`)
- ✅ Ajustar `isBlocked` para verificar apenas `status === 'suspended' | 'blocked'`
- ✅ Simplificar: não precisa verificar data de expiração de trial

**Novo código:**
```typescript
// Remover verificação de trial
const isTrialExpired = false; // Não usa mais trial

// Simplificar isBlocked
const isBlocked = 
  !isSuperAdmin && 
  subscription !== null && 
  (subscription.status === 'suspended' || 
   subscription.status === 'blocked' ||
   subscription.status === 'cancelled');
```

---

### 4️⃣ **BACKEND - Supabase Functions**

#### Funções a DESABILITAR/COMENTAR:

1. **`supabase/functions/create-clinic-on-signup/`**
   - ❌ Não será mais chamada (cadastro manual)

2. **`supabase/functions/mp-create-subscription/`**
   - ❌ Integração Mercado Pago assinatura

3. **`supabase/functions/mp-create-payment/`**
   - ❌ Integração Mercado Pago pagamento único

4. **`supabase/functions/mp-webhook/`**
   - ❌ Webhook Mercado Pago

5. **`supabase/functions/mercadopago-webhook/`**
   - ❌ Webhook Mercado Pago (duplicado?)

6. **`supabase/functions/check-subscriptions/`**
   - ❌ Verificação automática de expiração

7. **`supabase/functions/create-payment-preference/`**
   - ❌ Preferência de pagamento MP

---

### 5️⃣ **BACKEND - Migrations e Banco**

#### Tabelas a MANTER (são essenciais):
- ✅ `clinics` - dados das clínicas
- ✅ `clinic_users` - relação usuário-clínica
- ✅ `users` - dados dos usuários
- ✅ `plans` - planos disponíveis
- ✅ `subscriptions` - assinaturas das clínicas

#### Campos da tabela `subscriptions` a AJUSTAR:

**Campos a REMOVER/IGNORAR:**
```sql
-- Não precisa mais:
trial_ends_at
mp_subscription_id
mp_payer_id
mp_card_id
```

**Campos a MANTER/USAR:**
```sql
-- Essenciais:
clinic_id
plan_id
status -- valores: 'active', 'suspended', 'blocked', 'cancelled'
features_override -- JSON com módulos customizados
created_at
updated_at
```

**NOVO campo sugerido:**
```sql
billing_status -- 'paid', 'pending', 'overdue', 'suspended'
```

---

### 6️⃣ **PAINEL SUPERADMIN**

#### `src/pages/SuperAdmin.tsx`

**Ações:**
- ✅ **EXPANDIR** este painel - é aqui que você vai gerenciar tudo
- ❌ Remover aba de "Pagamentos" (era do Mercado Pago)
- ✅ Adicionar novas abas:
  - 📊 **Dashboard** - visão geral dos clientes
  - 🏢 **Clientes** - lista de clínicas
  - 📋 **Status** - adimplentes, atrasados, suspensos
  - 🔧 **Módulos** - habilitar/desabilitar por cliente
  - 📄 **Contratos** - info de adesão + mensalidade

---

#### `src/components/superadmin/ClinicsManagement.tsx`

**Expandir com novas funcionalidades:**

1. **Criar Cliente Completo:**
```typescript
interface NovoCliente {
  // Admin
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_phone?: string;
  
  // Clínicas (array, pois cliente pode ter 2+)
  clinics: {
    name: string;
    address: string;
    cnpj: string;
    phone: string;
    email: string;
  }[];
  
  // Contrato
  plan_id: string;
  features: string[]; // módulos contratados
  billing_status: 'paid' | 'pending';
  monthly_fee: number;
  setup_fee: number;
}
```

2. **Gerenciar Status:**
```typescript
enum ClientStatus {
  ACTIVE = 'active',         // ativo, pagando
  PENDING = 'pending',       // aguardando pagamento
  OVERDUE = 'overdue',       // atrasado
  SUSPENDED = 'suspended',   // suspenso por falta de pagamento
  BLOCKED = 'blocked'        // bloqueado manualmente
}
```

3. **Gerenciar Módulos:**
```typescript
// Adicionar/remover módulos de um cliente
async function updateClientModules(
  clinicId: string, 
  modules: string[]
) {
  await supabase
    .from('subscriptions')
    .update({ 
      features_override: modules 
    })
    .eq('clinic_id', clinicId);
}
```

---

#### `src/components/superadmin/SubscriptionsManagement.tsx`

**Ajustar para mostrar:**
- ✅ Lista de clientes
- ✅ Status de pagamento (adimplente, atrasado, suspenso)
- ✅ Módulos contratados
- ✅ Ações: Bloquear, Ativar, Editar módulos

**Exemplo de tabela:**
```
| Cliente      | Clínicas | Status     | Módulos              | Ações           |
|--------------|----------|------------|----------------------|-----------------|
| Dr. João     | 2        | Adimplente | Todos exceto Estoque | Editar, Bloquear|
| Dra. Maria   | 3        | Atrasado   | Básicos              | Suspender       |
```

---

### 7️⃣ **ROTAS**

#### `src/App.tsx`
**Ações:**
- ❌ Remover rota `/billing`
- ✅ Manter todas as outras rotas
- ✅ Manter proteção de rotas por `RequireFeature`

---

## 🔄 Fluxo Completo do Novo Modelo

### 1. Cliente Interessado (Fora do Sistema)
```
Cliente entra em contato → Você negocia adesão + mensalidade
```

### 2. Você Cria o Cliente (Painel SuperAdmin)
```
SuperAdmin → Clientes → "Novo Cliente"

Preenche:
- Nome do admin
- Email do admin  
- Senha temporária
- Telefone

- Nome da clínica 1
- CNPJ
- Endereço
- etc.

- Nome da clínica 2
- CNPJ
- Endereço
- etc.

- Plano base
- Módulos: [financeiro, agenda, pacientes, termos]
- Status: "pending" (aguardando primeiro pagamento)
```

### 3. Sistema Cria Automaticamente
```sql
-- 1. Cria usuário no auth.users
INSERT INTO auth.users (email, password, ...)

-- 2. Cria entrada em public.users
INSERT INTO users (id, name, email, role = 'admin', is_superadmin = false)

-- 3. Cria clínicas
INSERT INTO clinics (name, cnpj, address, ...) -- clínica 1
INSERT INTO clinics (name, cnpj, address, ...) -- clínica 2

-- 4. Vincula usuário às clínicas
INSERT INTO clinic_users (user_id, clinic_id, role = 'admin')
INSERT INTO clinic_users (user_id, clinic_id, role = 'admin')

-- 5. Cria assinatura para cada clínica
INSERT INTO subscriptions (clinic_id, plan_id, status = 'pending', features_override = [...])
```

### 4. Cliente Faz Primeiro Pagamento
```
Cliente → Transferência/PIX → Você confirma

Você → SuperAdmin → Cliente → "Marcar como Pago"
Sistema → Atualiza status para "active"
```

### 5. Cliente Acessa o Sistema
```
Cliente → Login (email + senha temporária)
Sistema → Verifica subscription.status = 'active'
Sistema → Libera acesso aos módulos contratados
```

### 6. Acompanhamento Mensal
```
SuperAdmin → Dashboard → Mostra:
- 15 clientes adimplentes
- 3 clientes atrasados (mensalidade vencida há 5+ dias)
- 1 cliente suspenso (bloqueado por falta de pagamento)
```

### 7. Cliente Quer Novo Módulo
```
Cliente → Solicita "Módulo de Estoque"

Você → SuperAdmin → Cliente → "Editar Módulos"
Você → Adiciona "estoque" na lista
Você → Salva

Sistema → Imediatamente libera o módulo de Estoque para o cliente
```

---

## 🛠️ Implementação Prática

### Fase 1: Desabilitar Self-Service (1-2 horas)

**Passo 1: Comentar cadastro na tela de login**
```bash
# Editar src/pages/Login.tsx
# Comentar linhas de signup (34-73, 192-240, 327-341)
```

**Passo 2: Remover integrações de pagamento**
```bash
# Comentar functions do Supabase
# supabase/functions/mp-*
# supabase/functions/mercadopago-webhook
# supabase/functions/create-payment-preference
```

**Passo 3: Limpar UI**
```bash
# Remover componentes de subscription não essenciais
# src/components/subscription/CardSubscriptionForm.tsx
# src/components/subscription/TrialExpiredScreen.tsx

# Ajustar mensagens em FeatureBlockedScreen.tsx
```

---

### Fase 2: Criar Interface SuperAdmin (3-4 horas)

**Passo 1: Expandir ClinicsManagement.tsx**

Adicionar formulário "Novo Cliente Completo":
```typescript
const NovoClienteForm = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>+ Novo Cliente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <form onSubmit={handleCreateClient}>
          {/* Admin */}
          <section>
            <h3>Dados do Administrador</h3>
            <Input name="admin_name" label="Nome" />
            <Input name="admin_email" label="Email" />
            <Input name="admin_password" label="Senha" type="password" />
          </section>

          {/* Clínicas */}
          <section>
            <h3>Clínicas</h3>
            {clinics.map((clinic, i) => (
              <div key={i}>
                <Input name={`clinic_${i}_name`} label="Nome da Clínica" />
                <Input name={`clinic_${i}_cnpj`} label="CNPJ" />
                <Input name={`clinic_${i}_address`} label="Endereço" />
                <Button onClick={() => removeClinic(i)}>Remover</Button>
              </div>
            ))}
            <Button onClick={addClinic}>+ Adicionar Clínica</Button>
          </section>

          {/* Plano e Módulos */}
          <section>
            <h3>Contrato</h3>
            <Select name="plan_id" label="Plano Base" />
            <CheckboxGroup label="Módulos">
              <Checkbox value="agenda">Agenda</Checkbox>
              <Checkbox value="pacientes">Pacientes</Checkbox>
              <Checkbox value="financeiro">Financeiro</Checkbox>
              <Checkbox value="termos">Termos</Checkbox>
              <Checkbox value="relatorios">Relatórios</Checkbox>
              <Checkbox value="comissoes">Comissões</Checkbox>
              <Checkbox value="estoque">Estoque</Checkbox>
              <Checkbox value="ponto">Ponto</Checkbox>
            </CheckboxGroup>
          </section>

          <Button type="submit">Criar Cliente</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

**Passo 2: Criar função de criação completa**

```typescript
async function createCompleteClient(data: NovoClienteData) {
  // 1. Criar usuário admin
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.admin_email,
    password: data.admin_password,
    email_confirm: true,
    user_metadata: { name: data.admin_name }
  });

  if (authError) throw authError;

  // 2. Inserir em users
  await supabase.from('users').insert({
    id: authUser.user.id,
    email: data.admin_email,
    name: data.admin_name,
    role: 'admin',
    is_superadmin: false
  });

  // 3. Criar clínicas
  for (const clinic of data.clinics) {
    const { data: newClinic } = await supabase
      .from('clinics')
      .insert(clinic)
      .select()
      .single();

    // 4. Vincular admin à clínica
    await supabase.from('clinic_users').insert({
      user_id: authUser.user.id,
      clinic_id: newClinic.id,
      role: 'admin'
    });

    // 5. Criar assinatura
    await supabase.from('subscriptions').insert({
      clinic_id: newClinic.id,
      plan_id: data.plan_id,
      status: 'pending', // aguardando primeiro pagamento
      features_override: data.modules
    });
  }

  return { success: true };
}
```

**Passo 3: Dashboard de Status**

Criar componente `ClientsStatusDashboard.tsx`:
```typescript
const ClientsStatusDashboard = () => {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        clinic_id,
        clinics (name, cnpj),
        plans (name)
      `);

    setClients(data);
  }

  const adimplentes = clients.filter(c => c.status === 'active');
  const atrasados = clients.filter(c => c.status === 'overdue');
  const suspensos = clients.filter(c => c.status === 'suspended');

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Adimplentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{adimplentes.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-600">Atrasados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{atrasados.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Suspensos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{suspensos.length}</div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### Fase 3: Gerenciamento de Módulos (2 horas)

**Passo 1: Criar botão "Gerenciar Módulos"**

Em `ClinicsManagement.tsx`:
```typescript
const ManageModulesDialog = ({ clinicId, currentModules }) => {
  const [modules, setModules] = useState(currentModules);

  async function saveModules() {
    await supabase
      .from('subscriptions')
      .update({ features_override: modules })
      .eq('clinic_id', clinicId);

    toast.success('Módulos atualizados!');
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Gerenciar Módulos</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Módulos do Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {ALL_FEATURES.map(feature => (
            <label key={feature} className="flex items-center gap-2">
              <Checkbox 
                checked={modules.includes(feature)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setModules([...modules, feature]);
                  } else {
                    setModules(modules.filter(m => m !== feature));
                  }
                }}
              />
              <span className="capitalize">{feature}</span>
            </label>
          ))}
        </div>

        <Button onClick={saveModules}>Salvar</Button>
      </DialogContent>
    </Dialog>
  );
};
```

**Passo 2: Atualização em tempo real**

O hook `useSubscription` já tem listener real-time, então quando você alterar os módulos no SuperAdmin, o cliente verá a mudança instantaneamente.

---

### Fase 4: Controle de Status (1 hora)

**Passo 1: Botões de ação rápida**

```typescript
const ClientActions = ({ clinic }) => {
  async function suspendClient() {
    await supabase
      .from('subscriptions')
      .update({ status: 'suspended' })
      .eq('clinic_id', clinic.id);
    
    toast.warning('Cliente suspenso');
  }

  async function activateClient() {
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('clinic_id', clinic.id);
    
    toast.success('Cliente ativado');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">Ações</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={activateClient}>
          ✅ Ativar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={suspendClient}>
          ⛔ Suspender
        </DropdownMenuItem>
        <DropdownMenuItem>
          🔧 Gerenciar Módulos
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-600">
          🗑️ Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Comentar edge functions de pagamento
- [ ] Adicionar campo `billing_status` em `subscriptions`
- [ ] Criar função `create_complete_client()`
- [ ] Ajustar RLS policies (admin pode criar usuários)

### Frontend - Remoções
- [ ] Comentar signup em Login.tsx
- [ ] Remover página Billing.tsx (ou deixar vazia)
- [ ] Remover CardSubscriptionForm.tsx
- [ ] Remover TrialExpiredScreen.tsx
- [ ] Ajustar mensagens em FeatureBlockedScreen.tsx

### Frontend - SuperAdmin
- [ ] Expandir ClinicsManagement.tsx
  - [ ] Formulário "Novo Cliente Completo"
  - [ ] Tabela com status e módulos
  - [ ] Botão "Gerenciar Módulos"
  - [ ] Ações: Ativar, Suspender, Bloquear
- [ ] Criar ClientsStatusDashboard.tsx
  - [ ] Cards: Adimplentes, Atrasados, Suspensos
  - [ ] Gráfico de evolução
- [ ] Ajustar SubscriptionsManagement.tsx
  - [ ] Remover integração com Mercado Pago
  - [ ] Focar em status manual

### Hooks
- [ ] Ajustar useSubscription.tsx
  - [ ] Remover lógica de trial
  - [ ] Simplificar isBlocked

### Testes
- [ ] Criar cliente completo via SuperAdmin
- [ ] Verificar vinculação de clínicas
- [ ] Testar bloqueio de módulos
- [ ] Testar suspensão de cliente
- [ ] Verificar atualização em tempo real

---

## 📝 Observações Importantes

1. **Não delete tabelas ou colunas antigas** - apenas pare de usar. Isso evita quebrar dados existentes.

2. **Features sempre usam o hook `useSubscription`** - ele verifica se o usuário tem acesso àquele módulo.

3. **SuperAdmin tem acesso total** - a lógica já está implementada (`isSuperAdmin` bypassa todas as verificações).

4. **Real-time funciona automaticamente** - quando você alterar módulos, o cliente vê na hora.

5. **Mantenha planos no banco** - mesmo que não venda mais online, os planos ajudam a organizar os preços base.

---

## 🚀 Próximos Passos Após Implementação

1. **Documentar processo de onboarding**:
   - Como criar novo cliente
   - Como definir módulos
   - Como gerenciar pagamentos

2. **Criar processo de cobrança**:
   - Sistema de notificações (email/WhatsApp)
   - Lembretes de pagamento
   - Controle de inadimplência

3. **Dashboard financeiro para você**:
   - MRR (Monthly Recurring Revenue)
   - Churn
   - Ticket médio

4. **Relatórios**:
   - Clientes por plano
   - Módulos mais contratados
   - Taxa de inadimplência

---

## 💡 Dicas Extras

### Como criar senha temporária para cliente
```typescript
// Ao criar cliente, gere senha aleatória
const tempPassword = Math.random().toString(36).slice(-8);

// Envie por email ou WhatsApp
sendEmail({
  to: client.email,
  subject: 'Acesso ao sistema',
  body: `Sua senha temporária é: ${tempPassword}`
});
```

### Como forçar troca de senha no primeiro login
```typescript
// Adicionar campo em users
first_login: boolean

// No login, verificar
if (user.first_login) {
  navigate('/change-password');
}
```

### Como cobrar automaticamente (futuro)
Integrar com gateway de pagamento:
- Iugu
- Asaas
- Stripe

Mas manter a gestão manual como opção sempre disponível.

---

## 📞 Resumo Final

Com essas mudanças, você terá:

✅ Controle total sobre quem tem acesso
✅ Capacidade de criar clientes com múltiplas unidades
✅ Gerenciamento de módulos por cliente
✅ Dashboard para acompanhar status de pagamento
✅ Sistema flexível para adicionar/remover funcionalidades

🎯 **Modelo ideal para vendas B2B diretas com adesão + mensalidade!**
