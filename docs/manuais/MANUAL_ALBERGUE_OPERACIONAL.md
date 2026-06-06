# Manual operacional profissional do Albergue

Versao: 2026-06-06  
Sistema: Gestao Social IEDC  
Modulo: Albergue Noturno  
Publico: coordenacao, educadores, equipe tecnica e gestao

> Este manual deve ser usado junto com a versao visual em HTML/PDF, que contem
> screenshots reais do sistema e chamadas numeradas. Fonte visual principal:
> `docs/manuais/albergue-profissional/MANUAL_ALBERGUE_PROFISSIONAL.html`.

## 1. Finalidade

O modulo Albergue organiza a rotina operacional do Albergue Noturno: ocupacao,
cadastro, estadia, presenca, censo, relatorios, qualidade de dados, impacto
social e conferencia de RMA.

O objetivo do manual nao e apenas explicar botoes. O objetivo e padronizar uma
rotina: registrar corretamente, reduzir retrabalho, proteger dados sensiveis e
gerar evidencia confiavel para gestao e prestacao de contas.

## 2. Como usar este manual

- Leia primeiro o fluxo rapido do plantao.
- Use as secoes por tela quando tiver duvida sobre uma funcao especifica.
- Em treinamento, abra o sistema lado a lado com o manual visual.
- Nunca use dados reais de pessoas atendidas em apresentacoes externas sem
  autorizacao e finalidade institucional clara.

## 3. Perfis e limites de acesso

| Perfil | Acesso principal | Pode fazer |
| --- | --- | --- |
| Coordenacao do Albergue | `/albergue` | Acompanha ocupacao, busca, estadias, presencas, relatorios, qualidade de dados, impacto social e RMA. |
| Educador do Albergue | `/albergue` | Opera plantao, consulta pessoas, registra presenca e acompanha pendencias operacionais. |
| Equipe tecnica | Gestao e Albergue | Consulta dados, relatorios e indicadores conforme necessidade institucional. |
| Gestao | Gestao e leituras institucionais | Acompanha indicadores e decisoes, sem substituir a operacao cotidiana. |

Regra de governo: quem opera registra; quem coordena valida; quem gere decide
com base em dados confiaveis.

## 4. Fluxo rapido do plantao

1. Entrar no sistema com o perfil do Albergue.
2. Abrir `Painel de controle`.
3. Conferir ocupacao total, vagas livres e saidas previstas.
4. Clicar na casa correta para ver camas ocupadas e livres.
5. Buscar a pessoa antes de cadastrar.
6. Se nao existir cadastro, usar `Novo cadastro`.
7. Se a pessoa estiver apta, iniciar estadia em cama real disponivel.
8. Durante o plantao, registrar ocorrencias relevantes no perfil da pessoa.
9. Conferir presenca por quarto.
10. Encerrar triagem apenas depois de revisar presentes, pendentes e ausentes.
11. Antes de relatorio ou fechamento, abrir `Qualidade de dados`.
12. Quando necessario, usar `Relatorios`, `Impacto social` e `Conferencia de RMA`.

## 5. Login e perfil ativo

Tela: `Login`

Funcao: autenticar a pessoa usuaria e carregar o menu conforme o perfil.

Use quando: iniciar a rotina ou trocar de responsavel pela operacao.

Cuidados:

- Cada pessoa deve usar o proprio acesso.
- Se uma tela nao aparece, primeiro confira o perfil ativo em `Minha conta`.
- Senha temporaria deve ser trocada antes de uso operacional regular.

## 6. Painel de controle

Tela: `/albergue`

Funcao: mostrar a primeira leitura do plantao.

O painel informa:

- vagas livres por casa;
- ocupacao total;
- historico recente de ocupacao;
- saidas previstas;
- pendencias de presenca.

Como usar:

1. Verifique a ocupacao total.
2. Confira qual casa possui vaga livre.
3. Clique na casa para abrir camas.
4. Observe se ha pendencias de presenca no canto inferior.
5. Use a leitura de saidas previstas para antecipar checkout ou prorrogacao.

Boa pratica: o painel deve ser a primeira tela aberta no inicio do plantao.

## 7. Casas, camas e estadias

Tela: modal de casa/camas a partir do painel.

Funcao: visualizar camas ocupadas, camas livres e acoes sobre estadias ativas.

Ferramentas:

- `Prorrogar`: amplia a permanencia quando houver motivo.
- `Trocar`: move a pessoa para outra cama ou casa.
- `Checkout`: encerra a estadia e libera a cama.
- `Cards`: mostra a operacao por cama.
- `Lista`: mostra relacao de pessoas hospedadas para conferencia e copia.
- `Buscar nome ou cama`: filtra rapidamente dentro da casa.

Cuidados:

- Nao registre entrada sem cama real disponivel.
- A troca de cama altera a ocupacao e o historico.
- Prorrogacao precisa de motivo compreensivel para auditoria operacional.
- Checkout deve conferir pessoa, cama e contexto antes de confirmar.

## 8. Buscar pessoas

Tela: `/albergue/buscar`

Funcao: localizar cadastro antes de criar um novo registro.

Filtros principais:

- `Todos`
- `Hospedados`
- `Aprovados`
- `Liberados`
- `Inativos`

Como usar:

1. Pesquise por nome, nome social, CPF ou NIS.
2. Confira o status exibido no card.
3. Use `Abrir` para revisar o perfil.
4. Use `Entrada` somente quando a pessoa estiver apta e sem estadia ativa.
5. Use `Saida` quando houver estadia ativa a encerrar.

Regra critica: buscar antes de cadastrar evita duplicidade e relatorio fraco.

## 9. Novo cadastro

Tela: modal `Novo cadastro`.

Funcao: cadastrar uma pessoa atendida quando ela ainda nao existe na base.

Etapas:

1. Identificacao.
2. Endereco e contatos.
3. Saude, cuidados e observacoes.

Campos de maior impacto:

- nome civil;
- nome social;
- CPF;
- NIS;
- data de nascimento;
- genero, cor/raca e informacoes de cuidado;
- contato de emergencia;
- observacoes institucionais.

Cuidados:

- Dados pessoais devem ter finalidade institucional.
- Se o documento nao estiver disponivel, registre o que for possivel e corrija
  depois pela qualidade de dados.
- Observacao deve registrar fato e contexto, nao julgamento pessoal.

## 10. Perfil da pessoa

Tela: `/albergue/pessoa/:id`

Funcao: concentrar memoria institucional do atendimento.

O perfil mostra:

- identificacao;
- situacao da estadia;
- cama, casa, entrada e saida prevista;
- indicadores rapidos;
- dados para afericao;
- saude e cuidados;
- observacoes;
- ocorrencias;
- historico de estadias;
- bloqueios, quando houver.

Use quando:

- houver duvida sobre a pessoa;
- for iniciar, prorrogar ou encerrar estadia;
- precisar registrar ocorrencia;
- for revisar historico antes de uma decisao.

## 11. Ocorrencias e historico

Funcao: registrar fatos relevantes e preservar continuidade do atendimento.

Uma ocorrencia boa contem:

- tipo;
- severidade;
- titulo curto;
- descricao objetiva;
- responsavel pelo registro;
- contexto e encaminhamento.

Evite:

- julgamentos pessoais;
- texto acusatorio sem fato;
- informacao sensivel sem finalidade;
- registro duplicado.

Historico de estadias deve ser usado para entender entradas, saidas,
prorrogacoes, abandono e recorrencia.

## 12. Presenca e censo

Tela: `/albergue/presencas`

Funcao: conferir quem permaneceu no plantao e gerar base de censo.

Ferramentas:

- filtro por quarto;
- busca por nome ou cama;
- marcacao individual;
- `Confirmar todos`;
- `Mostrar todos`;
- `Encerrar triagem`.

Como usar:

1. Filtre por quarto quando necessario.
2. Revise pessoas ativas.
3. Marque presentes.
4. Analise pendentes.
5. Encerrar triagem somente quando a conferencia estiver correta.

Ponto critico: pendente nao resolvido pode virar erro de censo, abandono
indevido ou retrabalho no fechamento.

## 13. Relatorios do Albergue

Tela: `/albergue/relatorios`

Funcao: transformar registros operacionais em leitura gerencial.

Ferramentas:

- `Anonimizar LGPD`: oculta dados sensiveis.
- `Filtrar dados`: recorta periodo e atributos.
- `Baixar PDF`: gera documento para leitura.
- `Baixar Excel`: exporta base analitica.
- Graficos por genero, cor/raca e recortes.
- Listagem detalhada.

Como usar:

1. Defina o periodo.
2. Escolha filtros apenas quando houver pergunta clara.
3. Ative LGPD para apresentacao ou compartilhamento.
4. Revise a qualidade de dados antes de exportar.
5. Baixe PDF para leitura e Excel para analise.

## 14. Qualidade de dados

Tela: `/albergue/qualidade-dados`

Funcao: apontar pendencias que reduzem confianca em relatorios e decisoes.

Indicadores:

- maturidade;
- total de pendencias;
- pendencias criticas;
- registros impactados.

Tipos comuns:

- cadastros ativos incompletos;
- estadias vencidas;
- presencas pendentes.

Regra: antes de apresentar dados do Albergue, abra esta tela. Relatorio sem
qualidade de base e estatistica com gravata.

## 15. Impacto social

Tela: `/albergue/impacto-social`

Funcao: registrar respostas anonimas e ler dimensoes qualitativas do servico.

O painel mostra:

- formularios respondidos;
- percepcao de protecao/pernoite;
- respeito entre usuarios;
- ajuda para proximos passos;
- evolucao das escutas;
- dimensoes de impacto;
- demandas e relatos.

Formulario de impacto:

- contexto do acesso;
- experiencia no acolhimento;
- proximos passos;
- relato e melhoria;
- leitura da equipe.

Cuidados:

- Nao transformar formulario anonimo em prontuario nominal.
- Registrar somente informacao util para leitura do servico.
- Usar demanda identificada pela equipe para orientar encaminhamentos.

## 16. Conferencia de RMA

Tela: `/albergue/conferencia-rma`

Funcao: comparar planilha do Gesuas com registros internos.

Como usar:

1. Envie a planilha `.xlsx` do Gesuas.
2. Defina data de inicio e data de fim.
3. Processe a conferencia.
4. Revise correspondencias, divergencias e pessoas sem NIS.
5. Corrija cadastros ou registros internos antes de fechar o relatorio.

Cuidados:

- Use planilha correta do periodo.
- Nunca altere cadastro apenas para "bater numero"; corrija a base com fato.
- Divergencia deve virar acao administrativa, nao improviso de ultima hora.

## 17. Rotina recomendada por momento

### Inicio do plantao

- Entrar com perfil correto.
- Abrir painel.
- Conferir ocupacao e saidas previstas.
- Verificar camas livres por casa.
- Buscar pessoas antes de cadastrar.

### Durante o plantao

- Registrar entrada em cama real.
- Atualizar cadastro quando houver informacao nova.
- Registrar ocorrencias relevantes.
- Evitar duplicidade de cadastro.

### Antes do fechamento

- Conferir presenca.
- Resolver pendentes.
- Encerrar triagem.
- Revisar qualidade de dados.

### Coordenacao

- Acompanhar relatorios.
- Revisar qualidade de dados.
- Conferir RMA.
- Usar impacto social para leitura institucional.

## 18. RACI operacional

| Atividade | Responsavel | Aprovador | Consultado | Informado |
| --- | --- | --- | --- | --- |
| Entrada e checkout | Educador/plantao | Coordenacao | Equipe tecnica quando necessario | Gestao por indicador |
| Prorrogacao | Coordenacao | Coordenacao | Educador | Gestao quando recorrente |
| Troca de cama | Educador/coord. | Coordenacao | Pessoa atendida/equipe | Registro no sistema |
| Presenca e censo | Educador/plantao | Coordenacao | Equipe tecnica | Gestao por relatorio |
| Qualidade de dados | Coordenacao | Coordenacao | Educador/equipe tecnica | Gestao |
| RMA | Coordenacao | Gestao/equipe tecnica | Administrativo | Gestao |
| Impacto social | Educador/coord. | Coordenacao | Pessoa atendida | Gestao por painel anonimo |

## 19. Checklist rapido

- [ ] Perfil correto.
- [ ] Painel conferido.
- [ ] Casa/camas verificadas.
- [ ] Pessoa buscada antes de cadastrar.
- [ ] Cadastro completo quando possivel.
- [ ] Estadia registrada em cama real.
- [ ] Ocorrencias relevantes registradas.
- [ ] Presenca conferida.
- [ ] Triagem encerrada somente apos revisao.
- [ ] Qualidade de dados revisada.
- [ ] Relatorio exportado com LGPD quando necessario.
- [ ] RMA conferido no fechamento mensal.

## 20. Materiais visuais

Screenshots reais usados na versao visual:

1. Login.
2. Painel do Albergue.
3. Casa/camas em cards.
4. Casa/camas em lista.
5. Buscar pessoas.
6. Novo cadastro.
7. Perfil da pessoa.
8. Ocorrencias.
9. Historico.
10. Presenca e censo.
11. Relatorios.
12. Filtros de relatorio.
13. Qualidade de dados.
14. Impacto social.
15. Formulario de impacto.
16. Conferencia RMA.

## 21. Pendencias para revisao institucional

- Validar com a coordenacao o vocabulario oficial de `triagem`, `censo`,
  `checkout`, `abandono`, `RMA` e `liberacao antecipada`.
- Definir se o manual circulara em PDF, Google Slides, impresso ou todos.
- Substituir dados ficticios por prints anonimizados de ambiente real somente
  se houver autorizacao e finalidade.
- Criar versao curta de bolso para plantao: uma pagina com fluxo e checklist.
