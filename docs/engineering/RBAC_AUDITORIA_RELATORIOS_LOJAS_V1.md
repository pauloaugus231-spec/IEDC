# Matriz RBAC - Auditoria, Relatorios e Lojas

Data: 2026-05-31

Este contrato orienta as proximas entregas institucionais da V1. A regra e simples: quem opera nao necessariamente enxerga consolidado; quem decide nao precisa ver ruido tecnico; quem da suporte ve a trilha completa.

## Auditoria Institucional

| Perfil | Visao | Escopo |
| --- | --- | --- |
| `suporte` | Auditoria tecnica completa | Logs tecnicos, acessos sensiveis, usuario, acao, falha, metadados, IP/user-agent quando houver e falhas recorrentes. |
| `gestora`, coordenacoes, `financeiro`, educadores e `loja_*` | Sem console | Recebem avisos, pendencias e recibos operacionais conforme a alcada. A trilha tecnica fica no suporte. |

## Recibos Operacionais

Perfis sem console de auditoria devem receber confirmacao visual imediata quando uma acao importante for concluida. O recibo nao substitui a trilha tecnica de auditoria; ele apenas confirma a operacao para quem esta no fluxo.

Exemplos obrigatorios:

- loja: produto criado ou atualizado, comanda aberta, item lancado, item removido e retirada confirmada;
- financeiro: pagamento registrado e desistencia registrada;
- educadores: presenca, atualizacao sensivel e registros operacionais relevantes, conforme cada fluxo for padronizado.

## Central De Avisos

A rota `/api/notificacoes` entrega avisos por perfil e nao cria um novo console universal. Ela existe para trazer pendencias, recibos e eventos relevantes para a barra superior sem expor dado fora da alcada.

| Perfil | O que recebe |
| --- | --- |
| `suporte` | Saude do sistema, backup, erros de frontend/backend, requisicoes lentas, falhas e recorrencias de auditoria. |
| `gestora` | Pendencias executivas do Albergue, E.E.I. e financeiro comercial, sem console de auditoria. |
| `equipe_tecnica` | Pendencias institucionais e operacionais, sem auditoria sensivel. |
| `coordenador_albergue` | Pendencias do Albergue. |
| `coordenador_creche` | Pendencias da E.E.I. |
| `educador_albergue`, `educador_creche` | Recibos e pendencias da rotina, sem link de auditoria. |
| `financeiro` | Saldo pendente, retiradas, desistencias e eventos financeiros criticos. |
| `loja_bazar`, `loja_brecho`, `loja_feirao` | Retiradas liberadas e catalogo/produtos da propria loja, sem relatorio e sem totalizadores. |

Regra de privacidade operacional: perfil de loja pode ver produto com preco e gerar comanda, mas nao recebe venda total do dia, venda total do periodo, relatorio financeiro, saldo agregado nem historico financeiro.

Avisos podem ser encerrados pelo perfil logado para o dia corrente. Isso registra que a pessoa viu a pendencia e acionou o responsavel, sem apagar a origem operacional do dado.

## Qualidade De Dados

A qualidade de dados e uma camada operacional, nao auditoria tecnica. Ela mostra pendencias que prejudicam relatorio, acompanhamento ou decisao.

| Perfil | Escopo |
| --- | --- |
| `gestora`, `equipe_tecnica` | Visao institucional: Albergue, E.E.I. e financeiro comercial. |
| `coordenador_albergue`, `educador_albergue` | Apenas Albergue: cadastros ativos, presencas e estadias. |
| `coordenador_creche`, `educador_creche` | Apenas E.E.I.: criancas, responsaveis, turmas e frequencia. |
| `financeiro` | Apenas financeiro comercial: comandas, retiradas e produtos. |
| `suporte`, `loja_*` | Sem console de qualidade de dados. |

## Relatorios

| Area | Quem ve | Conteudo |
| --- | --- | --- |
| Gestao institucional | `gestora`, `equipe_tecnica` | Visao institucional, qualidade de dados e alertas executivos. O Relatorio 360 fica pausado ate novo ciclo. |
| Albergue | `gestora`, `coordenador_albergue`, `equipe_tecnica` | Relatorios da area, indicadores sociais, RMA, impacto social, ocupacao, fluxo e exportacoes do servico. |
| E.E.I. | `gestora`, `coordenador_creche`, `equipe_tecnica` | Relatorios da area, frequencia, turmas, criancas, afericoes e relatorios pedagogicos/operacionais. |
| Financeiro comercial | `financeiro`, `gestora` | Previsto, realizado, pendente, desistencias e retiradas. |
| Lojas operacionais | `loja_bazar`, `loja_brecho`, `loja_feirao` | Sem relatorio e sem total do dia ou periodo. |

Rotas oficiais:

- `/gestao`: visao institucional;
- `/gestao/qualidade-dados`: qualidade de dados institucional;
- `/albergue/relatorios`: relatorios do Albergue;
- `/creche/relatorios`: relatorios da E.E.I.;
- `/lojas/secretaria/relatorio-executivo`: leitura comercial e financeira.

Educadores nao acessam relatorios gerenciais por URL direta. Eles podem consultar qualidade de dados da propria area para corrigir pendencias operacionais, mas a leitura executiva fica com gestao, equipe tecnica e coordenacoes.

## Loja Operacional

Perfis de loja podem:

- manter produtos e estoque precificado da propria loja;
- criar comanda com produtos e precos normais;
- acompanhar comandas abertas da propria loja por quantidade de itens;
- confirmar retirada liberada pela secretaria.

Perfis de loja nao podem:

- acessar relatorios;
- ver venda total do dia;
- ver venda total por periodo;
- acessar historico financeiro;
- acessar dados de outra loja;
- acessar auditoria tecnica.

## Regras De Validacao

- Toda rota nova entra na suite `npm run qa:profiles`.
- Backend deve bloquear acesso direto, mesmo quando o menu nao mostra a rota.
- Frontend nao deve chamar endpoint proibido para o perfil atual.
- Dados financeiros agregados pertencem a gestao e financeiro, nunca a equipe tecnica geral nem ao painel de loja.
