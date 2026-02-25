# Análise de Concorrentes e Modelo Trial

**Fonte:** Análise realizada via Cursor Mobile

---

## O que os concorrentes têm e nós JÁ temos

O HealthCare já está bem posicionado. Temos:

- Dashboard com KPIs
- Agenda completa (dia/semana/mês)
- Pacientes com odontograma
- Financeiro com caixa/sangria
- Comissões
- Estoque
- Relatórios com gráficos
- Controle de Ponto
- Termos
- WhatsApp para confirmação
- Sistema de Planos com pagamento via Mercado Pago (PIX/Cartão/Boleto)
- SuperAdmin

---

## O que eles têm e nós NÃO temos (oportunidades)

### Prioridade ALTA

1. **Trial gratuito (7 dias)** – Todos os 3 concorrentes usam. A boa notícia é que já temos a infraestrutura no código (`trial_ends_at` no banco, `TrialExpiredScreen` pronta, lógica de planos). Foi desativado quando mudou para vendas diretas, mas reativar é rápido.

2. **Banner de trial restante** – Codental mostra "Você tem 7 dias restantes. Assinar Codental." no rodapé. Fácil de implementar.

3. **Onboarding (boas-vindas)** – Codental tem uma tela de boas-vindas personalizada com vídeo tutorial de 8 minutos. Nosso sistema não tem nenhum fluxo de primeiro acesso.

4. **Alerta de Retorno** – Clinicorp tem alertas automáticos pós-consulta para a secretária ligar/mandar WhatsApp pedindo retorno. Gera receita recorrente.

### Prioridade MÉDIA

5. **Toggle Anual/Mensal nos planos** – Já temos `price_yearly` no banco

6. **Lista de Tarefas Inteligente** – Clinicorp usa para centralizar e delegar tarefas

7. **Dashboard Analítico avançado** – Ocupação de agenda, metas, ticket médio

8. **Selo "Mais Popular"/"Mais Vendido" nos planos** – Codental e Simples Dental usam

### Prioridade BAIXA (futuro)

9. Central de Mensagens com campanhas automáticas

10. Mini-site público da clínica

11. Galeria de vídeos/tutoriais

---

## Sobre o modelo Trial

### Para reativar o trial, o principal seria:

1. **No `useSubscription.tsx`:** Remover o `isTrialExpired = false` hardcoded e voltar a calcular baseado em `trial_ends_at`

2. **No cadastro:** Ao criar clínica, criar subscription com `status: 'trial'` e `trial_ends_at: agora + 7 dias`

3. **No layout:** Adicionar banner com contador de dias restantes

4. **A tela de planos** quando o trial expira já está implementada (`TrialExpiredScreen.tsx`)

### Esforço

O esforço é relativamente baixo porque a base já existe. Os itens mais rápidos (banner, toggle anual/mensal, selo nos planos, onboarding básico) podem ser feitos em menos de 1 dia cada.

---

## Observação

Atualmente o projeto está configurado para **vendas fechadas** (sem trial aberto). A decisão de reativar o trial ou manter vendas fechadas depende da estratégia comercial.
