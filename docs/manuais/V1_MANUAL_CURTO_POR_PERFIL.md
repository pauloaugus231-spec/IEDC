# Manual curto por perfil - V1

## Primeiro acesso

1. Acesse o endereco local do sistema.
2. Entre com o usuario informado pelo suporte.
3. Se o sistema solicitar troca de senha, defina uma senha definitiva antes de usar qualquer modulo.
4. Use o menu lateral para navegar apenas pelos modulos do seu perfil.

## Primeiro boot no servidor

Em banco novo, o sistema cria apenas o usuario `suporte`, usando a senha temporaria definida em `IEDC_DEFAULT_PASSWORD` no `.env`.

Depois de trocar a propria senha, o suporte cria os demais usuarios reais conforme a necessidade institucional.

## Recibos operacionais

Perfis que nao possuem console de auditoria recebem confirmacao visual das acoes importantes. Isso vale para operacoes como lancar item, abrir comanda, confirmar retirada, registrar pagamento, registrar presenca ou salvar alteracao relevante.

O recibo confirma a acao para o usuario. A auditoria tecnica segue restrita ao perfil autorizado.

## Avisos institucionais

O botao `Avisos`, na barra superior, mostra somente o que pertence ao seu perfil. Suporte ve alertas tecnicos. Gestao ve pendencias executivas. Coordenacoes veem a propria area. Financeiro ve a fila comercial/financeira. Educadores e lojas recebem pendencias e recibos operacionais.

Lojas nao veem total de venda, relatorio financeiro, saldo agregado ou historico financeiro nessa central.

## Qualidade de dados

A pagina de qualidade de dados mostra pendencias que enfraquecem relatorios, acompanhamento e decisao. Cada perfil ve apenas o seu escopo.

Gestao e equipe tecnica veem a leitura institucional. Coordenacoes e educadores veem a propria area. Financeiro ve apenas comandas, retiradas e produtos. Suporte e lojas nao possuem console de qualidade de dados.

## Relatorios

Relatorios consolidam indicadores, alertas e proximas decisoes. Eles sao diferentes das telas operacionais: a funcao principal e orientar gestao, coordenacao e financeiro dentro da alcada de cada perfil.

Gestao ve a visao institucional e o relatorio financeiro. Equipe tecnica ve leituras sociais e qualidade de dados, mas nao o relatorio financeiro. Coordenacoes veem a propria area. Financeiro ve o comercial/financeiro. Educadores e lojas nao acessam relatorios gerenciais.

## Suporte

Entrada: `/suporte/usuarios`.

Uso principal:

- Criar usuarios institucionais.
- Ativar ou desativar contas.
- Redefinir senha temporaria.
- Conferir perfil, servico e ultimo acesso.
- Consultar auditoria tecnica completa quando houver incidente ou suporte.
- Acompanhar avisos tecnicos de saude do sistema, backup e falhas recorrentes.

Limite: suporte administra acesso e auditoria tecnica; nao opera dados dos servicos.

## Gestora

Entrada: `/gestao`.

Uso principal:

- Acompanhar painel institucional.
- Ler indicadores de albergue, E.E.I. e lojas.
- Acessar visao transversal e relatorio financeiro quando necessario para decisao.
- Consultar qualidade de dados institucional.
- Acompanhar avisos executivos de risco e pendencia.
- Apoiar decisao de gestao e prestacao de contas.

Limite: gestora nao administra usuarios nem acessa console de auditoria; isso fica no suporte.

## Equipe tecnica

Entrada: `/gestao`.

Uso principal:

- Acompanhar indicadores institucionais.
- Consultar informacoes operacionais do albergue e da E.E.I.
- Apoiar leitura tecnica, relatorios sociais e impacto social.
- Acessar secretaria/financeiro quando houver necessidade operacional.
- Consultar qualidade de dados institucional.
- Acompanhar avisos operacionais transversais sem auditoria sensivel.

Limite: nao acessa administracao de usuarios.

## Coordenador do albergue

Entrada: `/albergue`.

Uso principal:

- Acompanhar ocupacao, camas e fluxo do albergue.
- Consultar pessoas, estadias, presencas e relatorios da area.
- Acompanhar impacto social do albergue.
- Operar escala, plantoes e rotinas de coordenacao.
- Consultar qualidade de dados do Albergue.
- Acompanhar avisos de prazo, presenca e eventos criticos da propria area.

Limite: nao acessa E.E.I., lojas/financeiro ou administracao de usuarios.

## Educador do albergue

Entrada: `/albergue`.

Uso principal:

- Acompanhar painel operacional do albergue.
- Consultar pessoas e ocupacao.
- Registrar e acompanhar presencas.
- Apoiar rotinas de plantao e impacto social quando autorizado pelo fluxo.
- Consultar qualidade de dados do Albergue para corrigir pendencias operacionais.
- Acompanhar avisos de rotina do proprio servico.

Limite: nao acessa relatorios gerenciais, escala administrativa, E.E.I. ou lojas.

## Coordenador da E.E.I.

Entrada: `/creche`.

Uso principal:

- Acompanhar painel da E.E.I.
- Gerir criancas, turmas, professoras e frequencia.
- Consultar relatorios tecnicos da E.E.I.
- Consultar qualidade de dados da E.E.I.
- Acompanhar avisos de frequencia, NIS e eventos criticos da propria area.
- Apoiar leitura pedagogica e operacional.

Limite: nao acessa albergue, lojas/financeiro ou administracao de usuarios.

## Educador da E.E.I.

Entrada: `/creche`.

Uso principal:

- Acompanhar painel da E.E.I.
- Consultar criancas e turmas.
- Registrar ou acompanhar frequencia conforme rotina definida.
- Consultar qualidade de dados da E.E.I. para corrigir pendencias operacionais.
- Acompanhar avisos de rotina da propria turma/servico.

Limite: nao acessa relatorios gerenciais, albergue, lojas/financeiro ou administracao de usuarios.

## Financeiro

Entrada: `/lojas/secretaria`.

Uso principal:

- Acompanhar painel de lojas.
- Consultar comandas, clientes, retiradas e historico.
- Registrar pagamentos e apoiar fechamento.
- Receber confirmacao visual ao registrar pagamento ou desistencia.
- Emitir relatorio comercial/financeiro: previsto, realizado, pendente, desistencias e retiradas.
- Consultar qualidade de dados financeiro-comercial.
- Acompanhar avisos de saldo pendente, retiradas e desistencias.

Limite: nao acessa albergue, E.E.I. ou administracao de usuarios.

## Loja Bazar

Entrada: `/lojas/bazar`.

Uso principal:

- Operar produtos, comandas e retiradas do Bazar.
- Manter estoque precificado do Bazar.
- Gerar comanda com produtos e precos normais.
- Receber confirmacao visual ao cadastrar produto, abrir comanda, lancar item ou confirmar retirada.
- Acompanhar avisos operacionais de retirada e catalogo, sem total financeiro.

Limite: nao acessa historico financeiro, relatorios, total do dia, total do periodo, Brecho, Feirao, secretaria/financeiro, albergue ou E.E.I.

## Loja Brecho

Entrada: `/lojas/brecho`.

Uso principal:

- Operar produtos, comandas e retiradas do Brecho.
- Manter estoque precificado do Brecho.
- Gerar comanda com produtos e precos normais.
- Receber confirmacao visual ao cadastrar produto, abrir comanda, lancar item ou confirmar retirada.
- Acompanhar avisos operacionais de retirada e catalogo, sem total financeiro.

Limite: nao acessa historico financeiro, relatorios, total do dia, total do periodo, Bazar, Feirao, secretaria/financeiro, albergue ou E.E.I.

## Loja Feirao

Entrada: `/lojas/feirao`.

Uso principal:

- Operar produtos, comandas e retiradas do Feirao.
- Manter estoque precificado do Feirao.
- Gerar comanda com produtos e precos normais.
- Receber confirmacao visual ao cadastrar produto, abrir comanda, lancar item ou confirmar retirada.
- Acompanhar avisos operacionais de retirada e catalogo, sem total financeiro.

Limite: nao acessa historico financeiro, relatorios, total do dia, total do periodo, Bazar, Brecho, secretaria/financeiro, albergue ou E.E.I.
