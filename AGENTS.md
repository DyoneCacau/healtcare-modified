# AGENTS.md — HealthCare

Instruções obrigatórias para qualquer agente de IA (Cursor, Claude, Codex, etc.) que tocar neste repositório.

**Sempre seguir a documentação oficial das ferramentas usadas.** Em caso de conflito entre este arquivo e a doc oficial, preferir a doc oficial e alinhar o código ao padrão atual do vendor.

---

## 1. O que é este produto

SaaS multi-clínica de **gestão odontológica** (B2B): agenda, pacientes/prontuário, financeiro, comissões, estoque, ponto, assinatura por unidade via Asaas.

- **Não é Next.js.** Frontend é SPA React + Vite.
- **Não há servidor Node próprio.** Backend = Supabase (Postgres + Auth + RLS + Edge Functions).
- **CRM completo não é o escopo atual** (há atribuição de origem / vendedor / atendimento parcial). Não inventar módulo CRM sem pedido explícito.

---

## 2. Stack (fonte da verdade)

| Camada | Tecnologia |
|--------|------------|
| Linguagem | TypeScript |
| UI | React 18, Vite 7, React Router 6 |
| Estilo | Tailwind CSS, shadcn/ui, Radix UI |
| Estado servidor | TanStack Query |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions em Deno) |
| Pagamentos | Asaas (API v3, webhooks) |
| Hosting frontend | Vercel |
| Domínio produção | `https://www.healthcare.app.br` |
| Repo / CI | GitHub + GitHub Actions |
| Testes | Vitest + Testing Library |
| Lint | ESLint |

### Documentação oficial (consultar antes de inventar)

- React: https://react.dev
- Vite: https://vite.dev
- TypeScript: https://www.typescriptlang.org/docs
- Tailwind: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest
- React Router: https://reactrouter.com
- Zod: https://zod.dev
- Supabase: https://supabase.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Asaas API: https://docs.asaas.com
- Vercel: https://vercel.com/docs
- Vitest: https://vitest.dev

Docs internas do repo (ler quando a tarefa tocar o tema):

- `README.md`, `DEPLOY.md`, `SECURITY.md`
- `docs/ASAAS_SANDBOX_E_PRODUCAO.md`, `docs/ASAAS_MATRIZ_HOMOLOGACAO.md`, `docs/GO_LIVE_CHECKLIST.md`
- `supabase/functions/README.md`, `supabase/functions/ASAAS_README.md`
- `.env.example`

---

## 3. Arquitetura

```
Browser (React SPA / Vercel)
    │  supabase-js (anon key)
    ▼
Supabase Auth + Postgres (RLS)
    │
    ├─ Edge Functions (Deno) ──► Asaas API / webhooks
    ├─ SQL RPCs (billing, admin)
    └─ GitHub Actions crons ──► check-subscriptions / asaas-reconcile
```

### Multi-tenant

- 1 banco, isolamentoação por clínica / organização.
- Grupo por dono (`organizations`); **1 assinatura Asaas por unidade (clínica)**.
- SuperAdmin: gestão da plataforma (não confundir com admin da clínica).

### Pastas importantes

```
src/
  pages/           # rotas
  components/      # UI por domínio (patients, agenda, superadmin, …)
  hooks/           # data hooks (TanStack Query)
  services/        # chamadas a Edge Functions / APIs
  integrations/supabase/  # client + types
supabase/
  functions/       # Edge Functions
  migrations/      # schema versionado
  PRODUCAO_*.sql   # scripts manuais de produção (painel SQL)
docs/              # runbooks Asaas / go-live
```

---

## 4. Padrões de desenvolvimento

### Geral

1. Mudanças **mínimas e focadas** no pedido; sem refatoração oportunista.
2. Seguir o estilo do arquivo vizinho (imports, nomes, componentes).
3. Não criar docs markdown a menos que o usuário peça.
4. Não commitar secrets (`.env`, `.env.local`, chaves Asaas, service role).
5. Responder e comentar código em **português** quando for texto de UI/docs do produto; nomes de código em inglês como o restante do repo.

### Frontend

- Componentes funcionais React; rotas em `src/App.tsx`.
- Features gated por `RequireFeature` / permissões de role.
- Dados remotos via hooks + TanStack Query; mutações com feedback (`sonner` / toasts).
- Formulários: React Hook Form + Zod.
- UI: preferir componentes já existentes em `src/components/ui` (shadcn).
- Variáveis públicas só com prefixo `VITE_`. Elas entram no **build** da Vercel — após mudar env na Vercel, é obrigatório **Redeploy**.

### Supabase / SQL

- Nunca enfraquecer RLS sem justificativa explícita e revisão.
- Novas mudanças de schema: preferir migration em `supabase/migrations/` **ou** script `supabase/PRODUCAO_*.sql` / arquivo descritivo com instruções no topo.
- **Regra do projeto:** para SQL no Supabase, criar/atualizar arquivo em `supabase/` e orientar execução **manual** no SQL Editor (ver `.cursor/rules/supabase-sql-scripts.mdc`).
- Client frontend: apenas anon key. Service role **somente** em Edge Functions / secrets.

### Edge Functions

- Código em `supabase/functions/<nome>/index.ts` + shared em `_shared/`.
- CORS: origem autorizada via secret `APP_URL`.
- Webhook Asaas: `asaas-webhook` valida header `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN` (não JWT Supabase).
- Crons: `CRON_SECRET`; não expor endpoints sem autenticação.
- Deploy: `npx supabase functions deploy <nome>` (seguir README das functions).
- **Sandbox ≠ Produção:** nunca misturar `ASAAS_ENV`, base URL e API key.

### Pagamentos (Asaas)

- Cobrança recorrente por clínica; eventos processados de forma **idempotente**.
- Cliente escolhe Pix/boleto/cartão na plataforma (`asaas-choose-payment-method`); cartão sensível no fluxo Asaas.
- Homologar no sandbox antes de produção (`docs/ASAAS_MATRIZ_HOMOLOGACAO.md`).
- Dados de assinatura sandbox **não** existem na conta produção — recriar vínculo ao migrar.

### Deploy / produção

- Push na branch de Production da Vercel (ex.: `principal` / `main`) dispara deploy do frontend.
- Editar local **sem push** não sobe para produção.
- Edge Functions e SQL **não** sobem com o frontend — deploy/SQL separados.
- Auth URLs no Supabase: Site URL sem wildcard; Redirect URLs com `https://www.healthcare.app.br/**` e `/reset-password`.

### Git

- Commit / push / PR **somente** se o usuário pedir.
- Não usar `--force` em main/master, não alterar git config, não commitar `.env*`.

### Segurança

- Ver `SECURITY.md`.
- Não logar tokens, API keys ou PII desnecessária.
- Não gerar exploits, malware ou payloads de ataque.
- LGPD: cuidado com dados de pacientes.

---

## 5. Comandos úteis

```bash
npm install
npm run dev          # Vite (porta 8080)
npm run build
npm run typecheck
npm run lint
npm run test
```

Supabase (CLI linkada ao projeto):

```bash
npx supabase secrets set KEY=value --project-ref <ref>
npx supabase functions deploy <nome>
```

---

## 6. O que NÃO fazer

- Não introduzir Next.js, Express, Nest ou outro BFF sem decisão explícita do dono do produto.
- Não colocar `SUPABASE_SERVICE_ROLE_KEY` ou `ASAAS_API_KEY` no frontend.
- Não “corrigir” CSP / vercel.json / billing sem entender o impacto em produção.
- Não apagar clínicas/usuários reais sem script revisado e confirmação.
- Não assumir que Atendimento/WhatsApp omnichannel está ativo em produção (pode estar desligado nas rotas).

---

## 7. Checklist antes de considerar uma tarefa pronta

- [ ] Compila / typecheck ok no que foi tocado
- [ ] RLS / auth considerados se houve dado sensível
- [ ] Secrets só no lugar certo (Vercel `VITE_*` vs Supabase secrets)
- [ ] Doc oficial consultada para API nova (Supabase/Asaas/React)
- [ ] Mudança mínima; sem arquivos órfãos ou docs não pedidos

---

*Última alinhamento de stack: React + Vite + Supabase + Asaas + Vercel (2026).*

---

## Cursor Cloud specific instructions

Contexto para agentes rodando no Cursor Cloud (o *update script* já rodou `npm install`).

### O que é / como roda

- Produto = **SPA React + Vite** (porta **8080**). Backend = **Supabase** (Postgres + Auth + RLS + Edge Functions). Não há servidor Node próprio.
- O client Supabase (`src/integrations/supabase/client.ts`) **lança erro no carregamento** se `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` não existirem. Sem `.env`, a SPA nem monta. `.env` é gitignored.
- Lint/test/build/typecheck: usar os scripts já documentados no `README.md` / `package.json` (`npm run lint`, `npm run test`, `npm run build`, `npm run typecheck`). Não precisam do Supabase no ar (o throw do client é em runtime, não no build).

### Backend para desenvolvimento (duas opções)

1. **Supabase remoto (caminho oficial de prod):** definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (secrets) apontando para um projeto hospedado com as migrations já aplicadas. É o mais confiável; não exige Docker.
2. **Supabase local (fallback offline, usado neste setup):** requer **Docker** (rodar `sudo dockerd` — no Cloud usar `storage-driver: fuse-overlayfs` e `iptables-legacy`) + **Supabase CLI**. Então `supabase start` sobe tudo em `http://127.0.0.1:54321`. A `anon key` local é a chave demo padrão do CLI (não é segredo). Criar `.env` com essa URL/anon key.

### Caveat importante das migrations (não "consertar" sem pedido)

- `supabase start` / `supabase db reset` **falham** ao aplicar `supabase/migrations/` porque a pasta mistura migrations reais com **scripts SQL manuais one-off** (arquivos ALL-CAPS: `*_SQL_EDITOR.sql`, `LIMPAR_*`, `REMOVER_*`, `HOTFIX_*`, etc.) **e** há um problema de ordenação: `20260212100000_fix_vw_clients_status_vendas_diretas.sql` ordena **antes** de `20260212_vendas_diretas.sql` (que cria a coluna `subscriptions.billing_status`). Em produção o SQL foi aplicado manualmente, então nunca quebrou.
- **Workaround para subir o schema local:** aplicar apenas os arquivos com prefixo de timestamp `2026*.sql`, em ordem, com tolerância a erro. Como as migrations usam guardas idempotentes (`IF NOT EXISTS`, blocos `DO $$`), o schema completo (44 tabelas + triggers de signup) é construído mesmo com alguns erros esperados de view/coluna fora de ordem:

  ```bash
  DB=$(docker ps --format '{{.Names}}' | grep supabase_db)
  for f in $(ls supabase/migrations/2026*.sql | sort); do
    docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=0 < "$f"
  done
  ```

  Não editar os arquivos de migration para "corrigir" a ordem a menos que explicitamente pedido.

- **Grants (obrigatório após aplicar migrations manualmente):** como as migrations foram aplicadas como `postgres` (fora do fluxo do `supabase db reset`), os `GRANT` padrão do Supabase para `anon`/`authenticated`/`service_role` **não** são aplicados e o PostgREST retorna `42501 permission denied for table` (HTTP 403). O RLS continua valendo linha a linha, então basta replicar os grants padrão:

  ```bash
  docker exec -i "$DB" psql -U postgres -d postgres <<'SQL'
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  SQL
  ```

### Signup / usuário de teste

- **Não há tela de auto-cadastro** (o Login só faz sign-in; clientes novos usam "Solicitar acesso"). Para obter uma conta de teste, criar o usuário pela **Auth admin API** com a `service_role key` local — o trigger `create_clinic_on_signup` provisiona automaticamente clínica + assinatura `trial` (7 dias) + role `admin`:

  ```bash
  curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
    -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"email":"dra.ana@healthcare.dev","password":"HealthCare123!","email_confirm":true,"user_metadata":{"name":"Dra. Ana","clinic_name":"Clínica Teste"}}'
  ```

- Confirmação de e-mail está desabilitada por padrão no Supabase local, então o login funciona logo após criar o usuário.

### Provisionar um tenant (modelo "vendas diretas")

- Os scripts `PRODUCAO_*.sql` **removem** o trigger de auto-criação de clínica no signup (`create_clinic_on_signup`). No modelo atual, a clínica é provisionada pelo SuperAdmin/backend — signup sozinho **não** cria clínica.
- Sem assinatura, o app mostra "Clínica pendente de ativação" (`needsActivation` em `useSubscription.tsx`). As features (ex.: `pacientes`) vêm das `plans.features` da assinatura. Para um tenant funcional, criar clínica + `clinic_users` (owner) + `user_roles` (admin) + `subscriptions` `status=active`, `billing_status=paid`, `billing_mode=manual`, com um `plan_id` que inclua as features desejadas (ex.: `premium`). Ver o bloco `DO $$ ... $$` usado neste setup como referência.
- **Ordem completa de setup local:** `supabase start` → aplicar `2026*.sql` → grants → aplicar `PRODUCAO_*.sql` (pular o `PRODUCAO_04_*`, que apaga dados) → grants de novo → criar usuário via Auth admin API → provisionar o tenant via SQL.
- **NÃO aplicar o `PRODUCAO_04_LIMPAR_DADOS_EXCETO_SUPERADMIN.sql`** em dev: ele apaga todas as clínicas/usuários exceto um superadmin específico de produção.
