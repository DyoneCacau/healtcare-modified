# Smart Hub — go-live operacional

Runbook para publicar o Smart Hub (página pública + captação + agendamento online) em uma clínica.

O frontend sobe com o deploy da Vercel. **SQL e Edge Functions não sobem com o frontend** — executar/deployar à parte.

## Atenção — numeração duplicada de PRODUCAO

Existem arquivos com o **mesmo número** e propósitos diferentes:

| Número | Arquivos |
|--------|----------|
| 29 | `PRODUCAO_29_SMART_HUB_FASE2.sql` e `PRODUCAO_29_META_CONNECTION.sql` |
| 30 | `PRODUCAO_30_SMART_HUB_FIX_PREVIEW_VALIDATE.sql` e `PRODUCAO_30_META_LEAD_ADS.sql` |

Não execute “o 29” ou “o 30” pelo número sozinho — escolha o arquivo pelo **nome completo**.

## Ordem SQL recomendada (Smart Hub)

Execute no SQL Editor, na ordem, apenas o que ainda não estiver aplicado:

1. `PRODUCAO_29_SMART_HUB_FASE2.sql`
2. `PRODUCAO_30_SMART_HUB_FIX_PREVIEW_VALIDATE.sql`
3. `PRODUCAO_31_SMART_HUB_VISUAL_ASSETS.sql`
4. `PRODUCAO_32_SMART_HUB_CRM_CAPTURE.sql`
5. `PRODUCAO_33_SMART_HUB_CAPTURE_FIX.sql`
6. `PRODUCAO_35_PUBLIC_BOOKING_FOUNDATION.sql` (jornadas/bloqueios, se aplicável)
7. `PRODUCAO_36_SMART_HUB_PUBLIC_BOOKING.sql` (`public_booking_enabled` + booking)
8. `PRODUCAO_37_SMART_HUB_TEMPLATES_BANNER.sql`
9. `PRODUCAO_38_SMART_HUB_CLICK_ACTION_BOOKING.sql`
10. `PRODUCAO_39_PROFESSIONAL_PROCEDURES.sql`
11. `PRODUCAO_40_SMART_HUB_PUBLIC_PAYLOAD.sql` (whitelist de `get_public_smart_hub`)
12. `PRODUCAO_41_SMART_HUB_BOOKING_NOTIFY.sql` (notificação interna do booking)

Pré-requisitos frequentes fora da cadeia Hub: procedimentos (`PRODUCAO_09` / `10`), módulos (`PRODUCAO_16`).

## Edge Functions

```bash
npx supabase functions deploy smart-hub-capture --no-verify-jwt --project-ref <ref>
npx supabase functions deploy smart-hub-booking --no-verify-jwt --project-ref <ref>
```

`--no-verify-jwt` é necessário porque o visitante é anônimo; a Edge resolve a clínica pelo slug do Hub, nunca pelo `clinic_id` do body.

## Pré-requisitos de produto

1. Feature `smart_hub` ativa no plano da clínica.
2. Para agendamento online: também `agenda` no plano.
3. Procedimento ativo com duração 5–720 min; profissional ativo; jornada ativa; combinação elegível profissional ↔ procedimento.

## Ativar agendamento online (self-serve)

1. **Smart Hub → Configurações → Agendamento online**.
2. Ligar **Permitir agendamento online pelo Smart Hub**.
3. Se faltar requisito, o switch **não ativa** e mostra checklist (não cria dados automaticamente).
4. Salvar configurações.
5. Em **Botões**, usar método **Agendamento online pelo sistema** (badge **Desativado** some quando a flag está on).
6. Publicar o Hub se necessário e testar `/hub/<slug>`.

### Rollback do booking

- **Pelo painel:** desligar o mesmo switch e salvar (recomendado).
- **Por SQL (emergência):**

```sql
UPDATE public.smart_hubs
SET public_booking_enabled = false,
    updated_at = now()
WHERE slug = '<slug>';
```

### Rollback do payload público (PRODUCAO_40)

Só se precisar reverter a whitelist (não recomendado em produção estável). Restaure a definição anterior de `get_public_smart_hub` a partir do backup/migration `20260728120000_smart_hub.sql` (versão `to_jsonb`) ou do snapshot do banco — e rode `NOTIFY pgrst, 'reload schema'`.

## Checklist por clínica

- [ ] SQLs da cadeia Hub aplicados (36–40 conforme necessidade)
- [ ] Edges `smart-hub-capture` e `smart-hub-booking` deployadas
- [ ] Feature `smart_hub` (e `agenda` se booking) no plano
- [ ] Página pública carrega com slug correto
- [ ] Logo, banner, template e cores ok
- [ ] Contatos públicos e botões (WhatsApp / link / formulário) ok
- [ ] Lead de teste (Configurações) chega no CRM, se CRM ativo
- [ ] Booking: ativar pelo toggle; catalog/horários/confirm ok
- [ ] Booking off: badge **Desativado**; Edge `booking_disabled`
- [ ] Após PRODUCAO_40: resposta pública sem `clinic_id` / `default_owner_user_id` / `storage_path`

## Observações

- Domínio customizado do Hub ainda não é self-serve (ver tela Domínio — texto “Em breve” ali é de domínio, não de booking).
- Detalhes de deploy geral: `DEPLOY.md`.
