# Relatorio Gestao 360 V1

Data: 2026-05-31

Status em 2026-06-01: planejado/pausado. A rota `/gestao/relatorios` nao fica ativa na V1 oficial IEDC; ela redireciona para `/gestao`. O contrato abaixo permanece como desenho para um ciclo futuro.

Este documento define a primeira versao do Explorador Institucional 360. A ideia e permitir que a gestao monte leituras rapidas em formato de dashboard: escolher indicador, recorte, tipo de grafico e exportar a visao atual.

O objetivo da V1 nao e substituir Power BI. O objetivo e criar uma camada institucional confiavel, bonita e segura para decisao, prestacao de contas e apresentacoes internas.

## Principio

Nem todo dado faz sentido cruzado com todo dado. O sistema deve permitir exploracao, mas com compatibilidade explicita entre indicador e recorte.

Regra central:

- dado sensivel aparece apenas agregado;
- loja operacional nao acessa consolidado financeiro;
- gestao ve o consolidado institucional quando a funcionalidade voltar ao escopo ativo;
- coordenacoes continuam vendo apenas relatorios da propria area;
- exportacao deve respeitar a mesma permissao da tela.

## Indicadores V1

| Indicador | Fonte | Formato | Observacao |
| --- | --- | --- | --- |
| Cadastros Albergue | Albergue | numero | Cadastros com passagem pelo Albergue no periodo selecionado. |
| Acessos do Albergue | Estadias | numero | Check-ins registrados no periodo. Mede fluxo, nao cadastro total. |
| Criancas ativas | E.E.I. | numero | Fotografia atual da base ativa. |
| Frequencia da E.E.I. | Frequencias | percentual | Presencas sobre registros lancados no periodo. |
| Vendas realizadas | Pagamentos das lojas | moeda | Consolidado comercial permitido para gestao, equipe tecnica e financeiro autorizado. |
| Pendencias de base | Qualidade de dados | numero | Pontos que enfraquecem relatorio, gestao ou prestacao de contas. |

## Recortes V1

| Recorte | Uso | Restricao |
| --- | --- | --- |
| Area | Comparar Albergue, E.E.I. e Lojas quando a metrica permitir. | Nao deve somar bases incompatíveis sem nota de leitura. |
| Periodo | Evolucao no tempo. | Requer data confiavel na origem. |
| Raca/cor | Leitura social agregada para impacto, editais e equidade. | Sensivel: sem abertura nominal. |
| Tipo de pendencia | Priorizar correcao da base. | Usado apenas em qualidade de dados. |

## Compatibilidade

| Indicador | Recortes permitidos | Graficos permitidos |
| --- | --- | --- |
| Cadastros Albergue | Periodo, raca/cor | Linha, barras, tabela |
| Acessos do Albergue | Periodo, raca/cor | Linha, barras, tabela |
| Criancas ativas | Raca/cor | Barras, tabela |
| Frequencia da E.E.I. | Periodo | Linha, barras, tabela |
| Vendas realizadas | Periodo | Linha, barras, tabela |
| Pendencias de base | Area, tipo de pendencia | Barras, tabela |

Cruzamentos rejeitados nesta V1:

- idade do Albergue versus idade das criancas;
- vendas das lojas versus demanda institucional;
- evolucao mensal de acessos versus frequencia escolar;
- qualquer cruzamento nominal entre pessoas do Albergue e criancas da E.E.I.

Esses cruzamentos podem existir no futuro, mas exigem pergunta institucional clara e modelagem propria. Sem isso, viram grafico bonito com conclusao fraca.

## UI Planejada

A rota planejada seria `/gestao/relatorios`, mas ela nao entra ativa na V1 oficial.

Composicao:

- seletor de periodo ja existente;
- seletor de indicador;
- seletor de recorte compativel;
- seletor de visualizacao;
- grafico ECharts em canvas executivo;
- tabela analitica curta;
- painel lateral de leitura agregada por clique;
- regra de leitura e fonte;
- exportacao CSV da visao atual;
- exportacao PNG do grafico.

## Exportacoes

V1:

- CSV da visao atual.
- PNG do grafico exibido.

Planejado:

- PDF institucional com capa, resumo, graficos e leitura por area;
- Excel analitico com abas por area, indicadores, recortes e qualidade de dados.

## Backend

Endpoint oficial:

`GET /api/relatorios/gestao-360`

Query params:

- `periodo`: `dia`, `semana`, `mes` ou `ano`;
- `metric`: indicador escolhido;
- `dimension`: recorte escolhido;
- `chart`: `bar`, `line` ou `table`.

Se uma combinacao invalida for enviada, o backend cai para o recorte e grafico padrao daquele indicador.

Endpoint de leitura agregada:

`GET /api/relatorios/gestao-360/drilldown`

Query params:

- `periodo`: `dia`, `semana`, `mes` ou `ano`;
- `metric`: indicador escolhido;
- `dimension`: recorte escolhido;
- `key`: chave estavel da linha clicada.

O drilldown retorna apenas totais, participacao, fonte, confiabilidade e acao sugerida. Nao retorna nomes de pessoas, criancas, clientes ou qualquer dado individual.

## Riscos E Regras Futuras

- O comparador nao deve permitir conclusao estatistica forte sem amostra, metodologia e contexto.
- Raça/cor deve ser tratada como leitura agregada, nao como ranking de pessoas.
- Exportacao futura em PDF precisa deixar claro periodo, fonte e data de geracao.
- Excel analitico deve separar abas por area para evitar mistura indevida.
- Toda metrica nova precisa entrar no catalogo, na matriz de compatibilidade e no QA por perfil.
