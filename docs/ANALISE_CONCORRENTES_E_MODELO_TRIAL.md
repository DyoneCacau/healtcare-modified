# Analise Comparativa: Concorrentes vs HealthCare

**Data**: 14/02/2026  
**Concorrentes analisados**: Clinicorp, Simples Dental, Codental

---

## 1. Resumo dos Concorrentes (extraido das imagens)

### Clinicorp (clinicorp.com)
- **Modelo**: Trial gratuito + planos pagos
- **Gestao Estrategica**: Dashboard Analitico, Relatorios Especializados, Controle de Estoque
- **Gestao da Agenda**: Alerta de Retorno, Confirmacao de agendamentos via WhatsApp, Relatorios especializados
- **Dashboard Analitico**: Indicadores de ocupacao de agenda, metas, receita e faturamento
- **Depoimentos de clientes**: Prova social com citacoes de dentistas reais (Dra. Alana, Dra. Andreza Sgrott)
- **Lista de Tarefas Inteligente**: Centralizar, delegar e acompanhar tarefas em um so lugar
- **BI Personalizado**: Relatorios personalizados com indicadores visuais, graficos de linha
- **Integracao com WhatsApp**: Informacoes da clinica direto no WhatsApp, sem acessar o sistema
- **CTA principal**: "Venda mais tratamentos com o Clinicorp IA"

### Simples Dental (simplesdental.com)
- **Modelo**: Trial 7 dias gratuito + planos pagos
- **Plano Pro**: R$ 297,83/mes (cobrado anualmente, desconto de 10% no anual)
- **Toggle**: Anual (-10%) / Mensal
- **Social Proof**: ReclameAqui 9.6/10, +150 Reviews
- **Selo**: "Mais popular" no plano Pro

### Codental (codental.com.br)
- **Modelo**: Trial 7 dias + planos com desconto progressivo
- **Planos**:
  - Essencial: R$ 82,71/mes (8% OFF) - ate 3 agendas
  - Controle: R$ 118,71/mes (12% OFF) - mais ferramentas
  - Avancado: R$ 151,12/mes (16% OFF) - "O MAIS VENDIDO"
- **Central de Mensagens**: Marketing (30), Confirmacoes (50), SMS (30)
- **Campanhas automaticas** e Historico de envio
- **Financeiro**: Painel, Fluxo de caixa, Boletos, Comissoes
- **Menu de apps extras**: Controle de Estoque, Campanhas automaticas, Relatorios de Inteligencia, Galeria de Videos, Site da Clinica, Extensao para WhatsApp
- **Onboarding**: Tela de boas-vindas personalizada ("Boas-vindas, Dyone!") com video tutorial de 8 minutos
- **Trial banner**: "Voce tem 7 dias restantes para experimentar. Assinar Codental."

---

## 2. Estado Atual do HealthCare

### O que ja temos implementado:
| Funcionalidade | Status | Observacao |
|---|---|---|
| Dashboard com KPIs | OK | Agendamentos hoje, pacientes, profissionais, saldo |
| Agenda (Dia/Semana/Mes) | OK | Visualizacoes completas com filtros |
| Gestao de Pacientes | OK | Cadastro, busca, odontograma |
| Profissionais | OK | Cadastro e gestao |
| Financeiro | OK | Transacoes, caixa, sangria |
| Comissoes | OK | Regras e relatorios |
| Estoque | OK | Controle basico |
| Relatorios | OK | Financeiro, agendamentos, pacientes, produtividade |
| Controle de Ponto | OK | Para funcionarios |
| Termos e Documentos | OK | Com editor e impressao |
| Administracao (multi-clinica) | OK | Usuarios, permissoes, clinicas |
| Confirmacao WhatsApp | OK | Mensagem manual por paciente |
| Sistema de Planos/Assinatura | OK | Basico, Profissional, Premium |
| Pagamento (Pix/Cartao/Boleto) | OK | Via MercadoPago |
| SuperAdmin | OK | Gestao centralizada |
| Suporte ao cliente | OK | Tab dentro de Configuracoes |
| Bloqueio por plano (FeatureGate) | OK | Modulos bloqueados por plano |

### O que **NAO** temos (e os concorrentes tem):
| Funcionalidade | Quem tem | Prioridade | Complexidade |
|---|---|---|---|
| **Trial gratuito (7 dias)** | Todos os 3 | ALTA | MEDIA |
| **Onboarding (boas-vindas + video tutorial)** | Codental | ALTA | BAIXA |
| **Alerta de Retorno** (lembrete pos-consulta) | Clinicorp | ALTA | MEDIA |
| **Campanhas automaticas de mensagens** | Codental | MEDIA | ALTA |
| **Central de Mensagens** (marketing/confirmacao/SMS) | Codental | MEDIA | ALTA |
| **Lista de Tarefas Inteligente** | Clinicorp | MEDIA | MEDIA |
| **BI Personalizado** (graficos avancados) | Clinicorp | MEDIA | MEDIA |
| **Banner de trial restante** | Codental | ALTA | BAIXA |
| **Selo "Mais Popular" / "Mais Vendido"** nos planos | Todos | BAIXA | BAIXA |
| **Toggle Anual/Mensal** com desconto | Simples Dental | MEDIA | BAIXA |
| **Social Proof** (avaliacoes, depoimentos) | Clinicorp, SD | BAIXA | BAIXA |
| **Site da Clinica** (mini-site) | Codental | BAIXA | ALTA |
| **Galeria de Videos** (tutoriais) | Codental | BAIXA | BAIXA |
| **Extensao para WhatsApp** | Codental | MEDIA | ALTA |
| **Desconto progressivo por plano** | Codental | MEDIA | BAIXA |

---

## 3. Analise do Modelo Trial

### Situacao atual no HealthCare:
O sistema **ja possui a infraestrutura para trial**, mas foi desativado:
- `useSubscription.tsx`: `isTrialExpired = false` (hardcoded)
- `TrialExpiredScreen.tsx`: Tela completa ja existe com selecao de planos e pagamento
- `Settings.tsx`: Ja mostra status "Trial" e data de expiracao
- Tabela `subscriptions` no Supabase ja tem campo `trial_ends_at`
- Tabela `plans` ja tem slug `trial`

### O que os concorrentes fazem com Trial:
1. **Codental**: Banner fixo no rodape "Voce tem X dias restantes. Assinar Codental."
2. **Simples Dental**: Botao "Teste gratis por 7 dias" em cada plano
3. **Clinicorp**: Trial com acesso completo para demonstrar valor

### Para REATIVAR o Trial no HealthCare, seria necessario:

#### A. Mudancas no Backend (Supabase):
1. Ao criar clinica, criar subscription com `status: 'trial'` e `trial_ends_at: now() + 7 days`
2. Vincular ao plano trial (que libera todas as features por 7 dias)
3. Cron job ou Edge Function para verificar trials expirados e mudar status para `expired`

#### B. Mudancas no Frontend:
1. **Reativar logica de trial** em `useSubscription.tsx`:
   - Remover `isTrialExpired = false` hardcoded
   - Calcular baseado em `trial_ends_at`
2. **Banner de trial** na barra superior ou inferior:
   - "Voce tem X dias restantes. Assinar agora!"
   - Contador regressivo
3. **Tela de Trial Expirado** (ja existe - `TrialExpiredScreen.tsx`):
   - Ja tem selecao de planos
   - Ja tem pagamento via Pix/Cartao/Boleto
4. **Fluxo de onboarding** apos cadastro:
   - Tela de boas-vindas personalizada
   - Video tutorial embarcado (YouTube/Vimeo)
   - Checklist de primeiros passos

---

## 4. Funcionalidades Recomendadas para Implementacao

### FASE 1 - Prioridade ALTA (implementar primeiro)

#### 1.1 Reativar Modelo Trial (7 dias)
- **Esforco**: Medio
- **Impacto**: Alto (conversao de novos usuarios)
- **O que fazer**:
  - Reativar logica de expiracao em `useSubscription.tsx`
  - Criar banner de dias restantes
  - Configurar criacao automatica de trial no cadastro
  - A `TrialExpiredScreen` ja esta pronta

#### 1.2 Banner de Trial Restante
- **Esforco**: Baixo
- **Impacto**: Alto (urgencia para conversao)
- **O que fazer**:
  - Componente `TrialBanner` fixo no topo do layout
  - Mostra "X dias restantes - Assinar agora"
  - Link direto para pagina de planos

#### 1.3 Fluxo de Onboarding (Boas-vindas)
- **Esforco**: Baixo
- **Impacto**: Alto (reducao de churn)
- **O que fazer**:
  - Tela de boas-vindas apos primeiro login
  - Video tutorial embarcado
  - Checklist de primeiros passos (criar profissional, agendar, etc)
  - Flag `onboarding_completed` no perfil do usuario

#### 1.4 Alerta de Retorno (pos-consulta)
- **Esforco**: Medio
- **Impacto**: Alto (fidelizacao de pacientes)
- **O que fazer**:
  - Configuracao de alerta de retorno por procedimento (ex: limpeza = 6 meses)
  - Lista de pacientes que precisam retornar
  - Botao de enviar lembrete via WhatsApp
  - Tabela `return_alerts` no Supabase

### FASE 2 - Prioridade MEDIA

#### 2.1 Toggle Anual/Mensal nos Planos
- **Esforco**: Baixo
- **Impacto**: Medio (incentiva plano anual)
- **O que fazer**:
  - Toggle na tela de planos (ja temos `price_yearly` na tabela `plans`)
  - Badge de desconto (ex: "-10%")
  - Calculo automatico do valor mensal equivalente

#### 2.2 Lista de Tarefas Inteligente
- **Esforco**: Medio
- **Impacto**: Medio (produtividade da equipe)
- **O que fazer**:
  - Nova pagina `/tarefas`
  - CRUD de tarefas com atribuicao a usuarios
  - Status: pendente, em andamento, concluida
  - Vinculacao opcional a paciente
  - Notificacoes de tarefas pendentes

#### 2.3 Dashboard Analitico Avancado (BI)
- **Esforco**: Medio
- **Impacto**: Medio (valor percebido)
- **O que fazer**:
  - Melhorar Dashboard atual com:
    - Grafico de ocupacao da agenda (% de horarios preenchidos)
    - Meta mensal de faturamento com barra de progresso
    - Ticket medio por atendimento
    - Taxa de comparecimento
    - Grafico de tendencia (linha) dos ultimos 6 meses

#### 2.4 Desconto Progressivo por Plano
- **Esforco**: Baixo
- **Impacto**: Medio (incentiva planos maiores)
- **O que fazer**:
  - Badge de "X% OFF" nos planos (ja temos campos `promo_*` na tabela)
  - Selo "MAIS VENDIDO" no plano intermediario
  - Preco original riscado + preco com desconto

### FASE 3 - Prioridade BAIXA (futuro)

#### 3.1 Central de Mensagens
- Campanhas de marketing automaticas
- Confirmacao automatica de agendamentos
- Historico de envios
- Creditos de SMS

#### 3.2 Site da Clinica (mini-site publico)
- Pagina publica com info da clinica
- Agendamento online pelo paciente
- Link compartilhavel

#### 3.3 Galeria de Videos/Tutoriais
- Secao de ajuda com videos
- Tutoriais por funcionalidade

---

## 5. Comparativo de Precos

| Plano | Codental | Simples Dental | HealthCare (atual) |
|---|---|---|---|
| Basico | R$ 82,71/mes | - | Definido pelo admin |
| Intermediario | R$ 118,71/mes | R$ 297,83/mes | Definido pelo admin |
| Avancado/Premium | R$ 151,12/mes | - | Definido pelo admin |

**Observacao**: Os concorrentes tem precos fixos e publicos. O HealthCare usa modelo de venda direta com precos configurados pelo SuperAdmin. Se reativar o trial, faz sentido ter uma pagina publica de precos tambem.

---

## 6. Conclusao e Recomendacao

### Reativar o Trial e VIAVEL porque:
1. A infraestrutura ja existe (tabelas, tela de expiracao, logica de planos)
2. Todos os 3 concorrentes usam trial de 7 dias
3. O custo de implementacao e baixo (a maior parte do codigo ja existe)
4. O impacto na aquisicao de clientes e alto

### Ordem de implementacao sugerida:
1. Reativar Trial (7 dias) + Banner de dias restantes
2. Onboarding (boas-vindas + video)
3. Alerta de Retorno
4. Toggle Anual/Mensal
5. Dashboard Analitico melhorado
6. Lista de Tarefas
7. Central de Mensagens (mais complexo)

### O que da para fazer RAPIDO (< 1 dia cada):
- Banner de trial restante
- Toggle anual/mensal nos planos
- Selo "Mais Popular" nos planos
- Tela de onboarding basica
- Reativar logica de trial no `useSubscription`

### O que precisa mais tempo (2-5 dias cada):
- Alerta de Retorno completo
- Lista de Tarefas
- Dashboard Analitico avancado
- Campanhas automaticas de mensagens
