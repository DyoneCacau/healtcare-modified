# Garantias: dados por clínica e permissões por função

## 1. Quem garante que dyone.cacau01 vê só a clínica dele?

### No banco (Supabase) – Row Level Security (RLS)

Todas as tabelas que têm `clinic_id` (pacientes, agenda, financeiro, profissionais, etc.) têm **políticas RLS** que permitem acesso só quando:

- O `clinic_id` da linha é uma das clínicas em que o usuário está em `clinic_users`:

```sql
clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
```

Ou usam a função:

```sql
clinic_id = public.get_user_clinic_id(auth.uid())
```

Ou seja:

- **Quem garante** é o próprio **Postgres/Supabase**: mesmo que o frontend mande outro `clinic_id`, o banco **não devolve** linhas de outras clínicas.
- O dyone.cacau01 só tem linha em `clinic_users` para a “Clínica Teste piloto”. Então ele **só consegue** ler/escrever dados onde `clinic_id` é dessa clínica.

### No frontend

- O `clinicId` usado nas telas vem do hook `useClinic()` → baseado em `clinic_users` do usuário logado.
- As queries usam esse `clinicId` (ex.: `.eq('clinic_id', clinicId)`). Mesmo que alguém tentasse trocar no código do frontend, as **políticas RLS** continuariam bloqueando qualquer dado de outra clínica.

**Resumo:** o isolamento por clínica é garantido no **banco** (RLS + `clinic_users`). O frontend só reflete o que o banco já permite.

---

## 2. O que existe hoje: “permissão” por plano da clínica

Hoje o que controla “o que pode ou não acessar” é:

- **Plano da clínica** (assinatura): cada plano tem um conjunto de **features** (agenda, pacientes, financeiro, comissões, estoque, relatórios, ponto, termos, administração, etc.).
- A função `user_has_feature(user_id, feature)` no banco verifica se **a clínica do usuário** tem um plano ativo com essa feature. **Não** verifica a **função** do usuário (admin, recepcionista, vendedor, profissional).
- No frontend, o menu e as rotas usam `hasFeature(feature)` do `useSubscription`, que vem do **plano da clínica**, não da role do usuário.
- A única diferença por “função” hoje é: **Administração** só é acessível para quem tem role **admin** (ou superadmin), checado no frontend e em políticas que usam `is_admin(auth.uid())`.

Ou seja: hoje **não** existe “admin (cliente) edita o que cada função pode acessar”. Existe “o plano da clínica define quais módulos a clínica tem” e “só admin acessa Administração”.

---

## 3. Caminho para “função → permissão” editável pelo admin (cliente)

Para que o **admin da clínica** possa definir o que cada **função** (recepcionista, vendedor, profissional) pode ou não acessar:

### 3.1 Modelo sugerido

- **Funções (roles)** já existem em `user_roles`: admin, receptionist, seller, professional.
- Criar uma tabela de **permissões por função** (por clínica ou global), por exemplo:

  - **Opção A – global (todas as clínicas):**  
    `role_permissions(role, feature)`  
    Ex.: (receptionist, agenda), (receptionist, pacientes), (seller, comissoes).

  - **Opção B – por clínica (cada admin configura sua clínica):**  
    `clinic_role_permissions(clinic_id, role, feature)`  
    O admin em Administração > Usuários (ou nova tela “Permissões”) marca quais módulos cada função pode acessar.

- Regra de acesso: usuário pode acessar a feature X se:
  1. A **clínica** tem a feature no **plano** (como hoje), **e**
  2. A **função** do usuário naquela clínica tem permissão para X (nova regra, definida na tabela acima).

### 3.2 No banco

- Nova função, por exemplo: `user_can_access_feature(_user_id uuid, _feature text)` que:
  - continua respeitando superadmin e plano da clínica;
  - e passa a checar se a **role** do usuário (em `user_roles`) está permitida para `_feature` na tabela de permissões (global ou por clínica).
- Substituir (ou combinar) o uso de `user_has_feature` nas políticas RLS por `user_can_access_feature` onde fizer sentido (módulos que devem ser restringidos por função).

### 3.3 No frontend

- Nova tela (ex.: Administração > **Permissões**) ou seção em Administração onde o admin:
  - escolhe a função (Recepcionista, Vendedor, Profissional);
  - marca/desmarca módulos (Agenda, Pacientes, Financeiro, etc.).
- Salvar em `role_permissions` ou `clinic_role_permissions`.
- O menu e as rotas continuam usando “pode acessar X?”, mas a resposta passa a vir de uma API/hook que considera **plano da clínica + permissão da função** (usando a nova função do banco ou um endpoint que a chame).

Assim, **quem garante** que dyone vê só a clínica dele continua sendo o **RLS + clinic_users**. Quem passa a garantir “dyone, como recepcionista, só acessa o que o admin liberou para recepcionista” é a **nova tabela de permissões por função** + a função no banco + o frontend que usa isso para menu e rotas.

---

## 4. Resumo

| O que | Quem garante hoje |
|-------|-------------------|
| dyone só vê dados da **clínica** em que está | **RLS** no Supabase: políticas usam `clinic_users` / `get_user_clinic_id(auth.uid())`. O banco não devolve linhas de outras clínicas. |
| Quais **módulos** a clínica tem (agenda, financeiro, etc.) | **Plano da assinatura** (features do plano). Função `user_has_feature` + frontend `hasFeature`. |
| Quem acessa **Administração** | Role **admin** (ou superadmin): `is_admin(auth.uid())` e checagem no frontend. |
| Controle futuro por **função** (admin edita o que cada role acessa) | A implementar: tabela role/clinic_role_permissions + função `user_can_access_feature` + tela de Permissões e uso no menu/rotas. |

Para o futuro, o próximo passo é criar a tabela de permissões por função e a função no banco; em seguida, a tela onde o admin (cliente) edita essas permissões e o frontend passar a usá-las junto com o plano.
