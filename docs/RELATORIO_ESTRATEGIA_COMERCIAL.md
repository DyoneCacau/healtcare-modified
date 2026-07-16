# Relatório de Estratégia Comercial — HealthCare SaaS

**Destinatário:** yuri cainaa lula da silva  
**Produto:** Sistema de gestão para clínicas (multiunidade)  
**Data:** 16/07/2026  
**Objetivo:** Alinhar modelo comercial, cobrança e estrutura de unidades com a recomendação de go-to-market.

---

## 1. Resumo executivo

Adotamos, para o lançamento, a estratégia que você sugeriu: **cobrança por unidade**, com as unidades do mesmo dono/empresa **vinculadas no mesmo sistema**, sem banco separado por clínica.

Em uma frase:

> **Um contrato comercial por cliente (dono/grupo), várias unidades operacionais, e uma mensalidade Asaas por unidade.**

Isso facilita a venda no início (preço claro por ponto), mantém controle financeiro por unidade e prepara o terreno para pacotes/descontos de rede depois.

---

## 2. Modelo comercial atual (Fase 1 — lançamento)

### 2.1 O que se vende

| Elemento | Como funciona |
|----------|----------------|
| **Plano** | Define preço mensal e quantas unidades o cliente pode ter (`máximo de clínicas`) |
| **Unidade / clínica** | Cada ponto físico (ou CNPJ operacional) no sistema |
| **Grupo / dono** | Todas as unidades do mesmo administrador ficam ligadas entre si |
| **Cobrança** | **1 cobrança recorrente por unidade** (Pix, boleto ou cartão via Asaas) |
| **Taxa de adesão** | Opcional e **por unidade** (configurável na criação) |

### 2.2 Exemplo prático

- Plano Básico: R$ X / mês, até 3 unidades  
- Cliente abre **2 unidades**  
- Resultado: **2 assinaturas Asaas** × R$ X  

Se tentar abrir a 4ª unidade além do limite do plano, o sistema **bloqueia** até upgrade de plano.

### 2.3 Por que por unidade no início

Alinhado à sua orientação:

1. **Simplicidade de pitch** — “cada unidade custa o valor do plano”
2. **Clareza de valor** — o cliente entende o que está pagando
3. **Inadimplência isolada** — atraso em uma unidade não obriga misturar com as outras no financeiro
4. **Operação comercial** — mais fácil upsell (“quer abrir outra unidade? É +1 mensalidade”)
5. **Já combina com o gateway** — Asaas criado por assinatura/unidade

---

## 3. Estrutura técnica (visão de negócio)

Não criamos **um banco de dados por unidade**. Isso seria caro, frágil e inviável para suporte.

### O que usamos

```
Cliente (dono / grupo)
 ├── Unidade 1  →  assinatura + cobrança Asaas 1
 ├── Unidade 2  →  assinatura + cobrança Asaas 2
 └── Unidade N  →  assinatura + cobrança Asaas N

Tudo no mesmo sistema / mesmo banco, com isolamento lógico por unidade
```

| Decisão | Escolha | Motivo comercial |
|---------|---------|------------------|
| Banco | **1 banco só** | Custo, backup, suporte e evolução do produto |
| Vínculo entre unidades | **Grupo do dono** | Rede da mesma empresa aparece junta no painel |
| Isolamento de dados | Por unidade (pacientes, caixa, agenda) | Cada unidade opera com seu próprio dia a dia |
| Cobrança | Por unidade | Modelo de lançamento recomendado |

---

## 4. Jornada comercial no sistema

### 4.1 Novo cliente

1. SuperAdmin cria o cliente (admin + 1 ou mais unidades + plano)  
2. Sistema cria o **grupo do dono**  
3. Cada unidade nasce com **assinatura própria**  
4. Se marcado Asaas, abre checkout (Pix / boleto / cartão) por unidade  

### 4.2 Cliente já existente quer nova unidade

1. SuperAdmin usa **Adicionar Unidade**  
2. Sistema valida se ainda há vaga no limite do plano  
3. Cria unidade no **mesmo grupo**  
4. Cria **nova cobrança** (não “entra de graça” no contrato)  
5. Opcionalmente inicia Asaas na hora  

### 4.3 Ações operacionais (importante para CS / financeiro)

| Ação | Significado comercial |
|------|------------------------|
| **Suspender acesso da unidade** | Bloqueia o uso do sistema naquela unidade |
| **Cancelar recorrência Asaas** | Para de cobrar no gateway naquela unidade |
| **Desativar clínica** | Tira a unidade do ar (operacional / cadastro) |

São ações **diferentes**: não misturar “parou de pagar” com “fechou a unidade” com “só desliguei a cobrança”.

---

## 5. Roadmap comercial sugerido

### Fase 1 — Agora (em curso)

- Cobrança **por unidade**  
- Limite de unidades pelo plano  
- Grupo/dono visível no SuperAdmin  
- Autosserviço de regularização na tela de cobrança  
- Homologação Sandbox Asaas (Pix, boleto, cartão, atraso, cancelamento)  

### Fase 2 — Depois (quando houver volume / redes)

Sem mudar a arquitetura de banco. Só regra comercial:

- Desconto de rede (ex.: 3ª unidade com %)  
- Pacote “rede” (X unidades inclusas por preço fechado)  
- Upgrade de plano com mais unidades + módulos  

---

## 6. Pontos de atenção para vendas

1. **Não prometer “plano inclui X unidades grátis”** no modelo atual — cada unidade gera mensalidade.  
2. **Limite do plano é regra de produto** — se o cliente quer mais unidades, sobe de plano.  
3. **CNPJ válido** é obrigatório para ativar Asaas (mesmo em Sandbox/teste).  
4. **Clientes manuais** (sem Asaas) continuam existindo para migração gradual.  
5. **Produção Asaas** só depois da homologação completa no Sandbox.

---

## 7. Status atual (visão de prontidão)

| Item | Status |
|------|--------|
| Estratégia por unidade | Definida e implementada |
| Grupo/dono (vínculo entre unidades) | Implementado |
| Limite de unidades por plano | Implementado |
| Checkout Asaas por unidade | Implementado (Sandbox) |
| Webhook / faturas / regularização | Implementado (Sandbox) |
| Homologação completa de pagamentos | Em andamento |
| Go-live produção Asaas | Pendente (após homologação + backup/monitoramento) |

---

## 8. Conclusão / pedido de validação

A estrutura comercial está alinhada à recomendação de:

- **começar cobrando por unidade**  
- **vincular unidades do mesmo dono/grupo**  
- **não fragmentar banco por unidade**  

Perguntas para alinhamento com você:

1. Confirma manter **preço cheio por unidade** na Fase 1 (sem desconto automático de rede)?  
2. Qual narrativa prefere no pitch: “R$ X por unidade” ou “plano a partir de R$ X, cada unidade adicional = +R$ X”?  
3. Quer que a **taxa de adesão** seja padrão em toda unidade nova, só na primeira, ou negociável caso a caso (como está hoje)?

---

*Documento interno para alinhamento comercial. Não contém chaves, acessos nem dados sensíveis de clientes.*
