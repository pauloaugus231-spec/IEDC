# Segregacao de dados em 4 bancos

## Estado atual: etapa 1

O Albergue usa uma conexao PostgreSQL e um volume exclusivos. O banco `core`
continua temporariamente com autenticacao, auditoria, observabilidade, Creche e
Associados ate que os tres bancos restantes sejam estruturados nas proximas etapas.

Os pontos principais que mostram isso sao:

- `backend/src/config/database.config.ts`
- `backend/src/app.module.ts`
- `backend/src/database/data-source.ts`

## Meta de arquitetura

Separar em 4 bancos distintos, com permissao restrita por departamento:

1. `iedc_auth`
2. `iedc_albergue`
3. `iedc_creche`
4. `iedc_associados`

Cada banco deve ter:

- um usuario PostgreSQL proprio
- credenciais proprias no `.env`
- conexao propria no backend
- nenhum grant de leitura/escrita para os outros dominios

## Banco 1: `iedc_auth`

Finalidade:

- usuarios do sistema
- perfis, roles, escopos e hash de senha
- auditoria de acesso
- eventos de observabilidade de seguranca

Entidades/tabelas relacionadas hoje:

- `usuarios`
- `auditoria`
- `observability_events`

## Banco 2: `iedc_albergue`

Finalidade:

- cadastros de pessoas que passaram pelo Albergue
- estadias
- bloqueios
- ocorrencias
- solicitacoes
- camas
- triagem operacional do Albergue
- escalas e apoio operacional ligados ao Albergue

Entidades/tabelas relacionadas hoje:

- `pessoas`
- `estadias`
- `bloqueios`
- `ocorrencias`
- `solicitacoes`
- `camas`
- `colaboradores`
- `turnos`
- `regras_escala`
- `plantoes`
- `escala`

## Banco 3: `iedc_creche`

Finalidade:

- criancas
- turmas
- responsaveis
- frequencia
- acompanhamentos
- rotinas da E.E.I.

Tabelas usadas hoje pelo modulo:

- `creche_criancas`
- `creche_turmas`
- `creche_responsaveis`
- `creche_frequencias`
- `creche_professoras`
- `creche_acompanhamentos`

## Banco 4: `iedc_associados`

Finalidade:

- clientes das lojas
- produtos
- comandas
- pagamentos
- caixas
- retiradas
- eventos do comercio

Tabelas usadas hoje pelo modulo:

- `comercio_lojas`
- `comercio_clientes`
- `comercio_produtos`
- `comercio_comandas`
- `comercio_comanda_itens`
- `comercio_pagamentos`
- `comercio_eventos_comanda`
- `comercio_retiradas`
- `comercio_caixas`
- `comercio_caixa_metodos`

## Importacao do legado do Albergue

O backup legado `backup_triagem_20260618_1513.sql` deve ser carregado somente no banco `iedc_albergue`.

Mapeamento principal:

- `iedc_usuario` -> `pessoas`
- `iedc_entradas` / `iedc_triagem` -> `estadias`
- `iedc_bloqueio` -> `bloqueios`
- `iedc_observacao` -> `ocorrencias`
- observacoes de prorrogacao -> `solicitacoes`

Escopo de importacao:

- apenas cadastros que tiveram entrada no Albergue
- historico operacional relevante
- sem fotos

## Regra de isolamento

Para garantir que um departamento nao acesse o banco do outro:

- cada banco deve ter usuario PostgreSQL proprio
- o backend deve usar conexoes separadas por dominio
- os modulos de Albergue nao devem receber repositorios do banco de Creche ou Lojas
- os modulos de Lojas nao devem ler tabelas de Albergue
- o modulo de Auth nao deve compartilhar schema operacional

## Implementacao da etapa 1

- `postgres-albergue` hospeda somente o schema operacional do Albergue.
- `iedc_albergue_postgres_data` e o volume persistente exclusivo.
- `DB_ALBERGUE_*` e a unica familia de credenciais aceita pelo importador legado.
- Modulos de Creche e Associados recebem explicitamente a conexao `core`.
- Perfis de Creche e Lojas continuam excluidos das rotas do Albergue pelos guards.

Ainda falta, nas proximas etapas, extrair do `core` os bancos definitivos
`iedc_auth`, `iedc_creche` e `iedc_associados`.
