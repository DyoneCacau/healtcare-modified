# Matriz de homologação Asaas

Preencha esta matriz no Sandbox antes de configurar qualquer chave de produção.
Use uma clínica e dados fictícios exclusivos para cada cenário.

## Segurança e isolamento

- [ ] Chave da API não aparece no bundle, console, rede do navegador ou banco.
- [ ] Webhook sem `asaas-access-token` válido retorna 401.
- [ ] Usuário comum não invoca operações de SuperAdmin.
- [ ] Usuário da clínica A não consulta ou altera cobranças da clínica B.
- [ ] Evento repetido mantém um único histórico e um único avanço de período.
- [ ] Payload inválido não altera assinatura e fica auditável.

## Adesão e assinatura

- [ ] Cliente Asaas é criado uma única vez por clínica.
- [ ] Taxa de implantação zero não cria cobrança avulsa.
- [ ] Taxa de implantação positiva cria cobrança separada.
- [ ] Assinatura mensal usa o valor configurado para a clínica.
- [ ] Falha parcial não deixa IDs externos inconsistentes.
- [ ] Cliente manual existente continua funcionando sem Asaas.

## Formas de pagamento

- [ ] Pix: checkout abre, pagamento é simulado e webhook ativa a assinatura.
- [ ] Boleto: documento abre, recebimento ativa a assinatura.
- [ ] Cartão: checkout hospedado é usado e nenhum dado do cartão é persistido.
- [ ] Método escolhido aparece corretamente na tela de cobrança.
- [ ] Segunda via usa URL HTTPS do Asaas.

## Ciclo financeiro

- [ ] `PAYMENT_CREATED` registra cobrança pendente sem liberar acesso.
- [ ] `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` não duplicam a renovação.
- [ ] `PAYMENT_OVERDUE` marca atraso e inicia tolerância de sete dias.
- [ ] Durante a tolerância, a clínica vê a ação de regularização.
- [ ] Após sete dias, o cron suspende o acesso.
- [ ] Pagamento após suspensão reativa a assinatura.
- [ ] Estorno é registrado e aplica a regra de acesso definida.
- [ ] Cancelamento impede novas cobranças e preserva auditoria.

## Resiliência e reconciliação

- [ ] Reenvio de webhook retorna 2xx rapidamente.
- [ ] Eventos fora de ordem convergem para o estado financeiro correto.
- [ ] Falha temporária da API não expõe detalhes internos ao usuário.
- [ ] Reconciliação importa uma cobrança ausente localmente.
- [ ] Reconciliação repetida não duplica dados.
- [ ] Cron sem `CRON_SECRET` falha de forma visível.

## Aplicação e operação

- [ ] Login, pacientes, agenda, financeiro e relatórios continuam funcionando.
- [ ] Lint, typecheck, testes e build passam no CI.
- [ ] Logs não contêm dados de saúde, tokens ou payload de cartão.
- [ ] Alertas indicam falha de webhook/reconciliação.
- [ ] Backup e procedimento de rollback foram validados.

## Aprovação

Registre data, responsável, ambiente e evidências dos testes. A produção só pode
ser liberada quando todos os itens aplicáveis estiverem aprovados e a
tokenização/cartão estiver habilitada pelo Asaas.
