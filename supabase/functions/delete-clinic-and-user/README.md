# Edge Function: delete-clinic-and-user

Remove uma clínica e o usuário dono do banco (apenas superadmin).

## Como publicar no Supabase

### Opção 1: Usar a CLI do Supabase (recomendado)

**1. Instalar a CLI** (se ainda não tiver):

- **Com npm:**  
  Abra o PowerShell ou CMD e rode:
  ```bash
  npm install -g supabase
  ```
- **Ou baixe o instalador:**  
  https://github.com/supabase/cli/releases — baixe o `.exe` para Windows e coloque na PATH, ou use **Scoop**: `scoop install supabase`

**2. Fazer login no Supabase** (só na primeira vez):
  ```bash
  supabase login
  ```
  Vai abrir o navegador para você autorizar.

**3. Ligar o projeto ao Supabase** (se ainda não ligou):
  Na pasta do projeto (onde está esta pasta `supabase`), rode:
  ```bash
  supabase link --project-ref SEU_PROJECT_REF
  ```
  O `SEU_PROJECT_REF` está no painel do Supabase: Project Settings > General > Reference ID.

**4. Publicar a função:**
  Na pasta do projeto:
  ```bash
  supabase functions deploy delete-clinic-and-user
  ```

Se pedir a **senha do projeto** (JWT secret), use o valor de **Project Settings > API > Project API keys > service_role** (ou o secret que o Supabase mostrar).

---

### Opção 2: Pelo painel do Supabase (Dashboard)

1. Acesse https://supabase.com/dashboard e abra o seu projeto.
2. No menu lateral: **Edge Functions**.
3. Clique em **Create a new function**.
4. Nome da função: `delete-clinic-and-user`.
5. Cole o conteúdo do arquivo `index.ts` que está nesta pasta, salve e faça o **Deploy** (se o painel tiver esse botão).

---

Depois de publicada, o botão **Deletar** em **SuperAdmin > Assinaturas** passará a funcionar.
