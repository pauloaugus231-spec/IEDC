# Caixa Financeiro V1

Data: 2026-06-03

## Objetivo

Implantar um ciclo operacional de caixa para o financeiro das lojas: abrir caixa, registrar pagamentos durante a operação, conferir valores por método e fechar o caixa convertendo comandas não pagas em desistência auditável.

## Escopo

O caixa pertence ao perfil `financeiro`. A rota operacional é:

- `/lojas/secretaria/caixa`

A gestão pode acompanhar o relatório financeiro consolidado, mas a operação de abertura e fechamento do caixa fica restrita ao financeiro.

## Regra central

Pagamento só deve ser registrado com caixa aberto.

No fechamento, toda comanda com saldo aberto e status `aberta` ou `aguardando_pagamento` é encerrada como `desistencia`, com motivo automático vinculado ao código do caixa. A comanda também recebe evento `desistencia_fechamento_caixa` em `comercio_eventos_comanda`.

Esta regra torna a desistência uma consequência operacional do fechamento, não uma decisão manual dispersa.

## Entidades

### `comercio_caixas`

Guarda uma sessão de caixa.

Campos principais:

- `codigo`
- `status`
- `aberto_por`
- `fechado_por`
- `saldo_inicial`
- `total_sistema`
- `total_conferido`
- `diferenca`
- `comandas_pagas`
- `comandas_desistidas`
- `observacoes_abertura`
- `observacoes_fechamento`
- `aberto_em`
- `fechado_em`

### `comercio_caixa_metodos`

Guarda a conferência por método de pagamento no fechamento.

Campos principais:

- `caixa_id`
- `metodo`
- `valor_sistema`
- `valor_informado`
- `diferenca`
- `quantidade_pagamentos`

### `comercio_pagamentos.caixa_id`

Vincula cada pagamento ao caixa aberto no momento do recebimento.

## Fluxo operacional

1. Financeiro abre o caixa.
2. Sistema passa a aceitar pagamentos.
3. Cada pagamento é vinculado ao caixa aberto.
4. Tela de caixa mostra totais por método, pendências e histórico.
5. Financeiro informa valores conferidos por método.
6. Financeiro confirma que revisou comandas pendentes.
7. Sistema fecha o caixa.
8. Comandas não pagas viram desistência.
9. Histórico passa a exibir o caixa fechado.

## Validações

- Não abrir outro caixa quando já existe caixa aberto.
- Não registrar pagamento sem caixa aberto.
- Não fechar caixa inexistente.
- Registrar diferença entre sistema e conferência manual.
- Manter evento de auditoria operacional nas comandas encerradas como desistência.
- Atualizar `qa:profiles` para bloquear caixa fora do perfil financeiro.

## Evolução futura

- PDF/Excel específico do caixa.
- Reabertura controlada por perfil autorizado.
- Leitura somente para `gestora` em histórico de caixas fechados.
- Conciliação fiscal quando houver integração com API fiscal.
