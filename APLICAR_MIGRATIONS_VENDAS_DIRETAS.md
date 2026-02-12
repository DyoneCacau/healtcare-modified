# Aplicar migrations – Vendas diretas

As alterações para o modelo **vendas fechadas** (sem trial, cadastro só pelo superadmin) incluem migrations no Supabase.

## Como aplicar

1. **Pelo Supabase Dashboard (recomendado)**  
   - Acesse [Supabase](https://app.supabase.com) → seu projeto → **SQL Editor**.  
   - Se ainda não tiver rodado a migration de vendas diretas, execute na ordem:
     - `supabase/migrations/20260212_vendas_diretas.sql`
     - (opcional) `supabase/migrations/20260212100000_fix_vw_clients_status_vendas_diretas.sql` — só se a view ou políticas ainda falharem.

2. **Pelo CLI (se tiver Supabase CLI configurado)**  
   No terminal (PowerShell ou CMD), na pasta do projeto:
   ```bash
   npx supabase db push
   ```
   Ou, com o CLI instalado globalmente:
   ```bash
   supabase db push
   ```

## O que foi alterado no código (já aplicado)

- **SuperAdmin → Nova clínica**: cria assinatura **ativa** com plano padrão (primeiro plano ativo que não seja trial), sem trial de 7 dias.
- **Login**: não cria mais clínica automaticamente; usuários sem clínica devem ser cadastrados pelo superadmin.
- **Tela “Acesso bloqueado”**: texto alterado para “Acesso suspenso” (vendas diretas).
- **Relatórios**: impressão abre janela só com o relatório (não a página inteira); exportar PDF usa a mesma janela (Salvar como PDF); exportar Excel gera CSV e faz download.
- **Migrations**: view `vw_clients_status` e políticas RLS passam a usar `profiles` e `is_superadmin(auth.uid())` em vez da tabela `users`.

## Cadastro do cliente (vendas diretas)

1. Superadmin cria a **clínica** em SuperAdmin → Gestão de Clínicas → Nova Clínica.  
2. O **usuário admin** da clínica precisa existir em `auth.users` e estar vinculado à clínica.  
   - Se o cliente já tiver usuário criado por você (ex.: via Dashboard do Supabase ou função server-side), vincule-o à clínica em `clinic_users` com `is_owner = true` e em `user_roles` com `role = 'admin'`.  
   - Para **definir/resetar senha** do proprietário: use o menu (três pontos) da clínica → “Resetar Senha” (usa a Edge Function `reset-user-password`).

Para criar o usuário admin pelo sistema (sem usar o Dashboard do Supabase), seria necessária uma Edge Function que use a API Admin do Supabase para criar o usuário e depois vinculá-lo à clínica; isso pode ser implementado em um próximo passo.
