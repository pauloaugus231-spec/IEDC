# Manual curto por perfil - V1

## Primeiro acesso

1. Acesse o endereco local do sistema.
2. Entre com o usuario informado pelo suporte.
3. Se o sistema solicitar troca de senha, defina uma senha definitiva antes de usar qualquer modulo.
4. Use o menu lateral para navegar apenas pelos modulos do seu perfil.

## Primeiro boot no servidor

Em banco novo, o sistema cria apenas o usuario `suporte`, usando a senha temporaria definida em `IEDC_DEFAULT_PASSWORD` no `.env`.

Depois de trocar a propria senha, o suporte cria os demais usuarios reais conforme a necessidade institucional.

## Suporte

Entrada: `/suporte/usuarios`.

Uso principal:

- Criar usuarios institucionais.
- Ativar ou desativar contas.
- Redefinir senha temporaria.
- Conferir perfil, servico e ultimo acesso.

Limite: suporte administra acesso, nao opera dados dos servicos.

## Gestora

Entrada: `/gestao`.

Uso principal:

- Acompanhar painel institucional.
- Ler indicadores de albergue, E.E.I. e lojas.
- Acessar relatorios e visao transversal.
- Apoiar decisao de gestao e prestacao de contas.

Limite: gestora nao administra usuarios; isso fica no suporte.

## Equipe tecnica

Entrada: `/gestao`.

Uso principal:

- Acompanhar indicadores institucionais.
- Consultar informacoes operacionais do albergue e da E.E.I.
- Apoiar leitura tecnica, relatorios e impacto social.
- Acessar secretaria/financeiro quando houver necessidade operacional.

Limite: nao acessa administracao de usuarios.

## Coordenador do albergue

Entrada: `/albergue`.

Uso principal:

- Acompanhar ocupacao, camas e fluxo do albergue.
- Consultar pessoas, estadias, presencas e relatorios.
- Acompanhar impacto social do albergue.
- Operar escala, plantoes e rotinas de coordenacao.

Limite: nao acessa E.E.I., lojas/financeiro ou administracao de usuarios.

## Educador do albergue

Entrada: `/albergue`.

Uso principal:

- Acompanhar painel operacional do albergue.
- Consultar pessoas e ocupacao.
- Registrar e acompanhar presencas.
- Apoiar rotinas de plantao e impacto social quando autorizado pelo fluxo.

Limite: nao acessa relatorios gerenciais, escala administrativa, E.E.I. ou lojas.

## Coordenador da E.E.I.

Entrada: `/creche`.

Uso principal:

- Acompanhar painel da E.E.I.
- Gerir criancas, turmas, professoras e frequencia.
- Consultar relatorios da E.E.I.
- Apoiar leitura pedagogica e operacional.

Limite: nao acessa albergue, lojas/financeiro ou administracao de usuarios.

## Educador da E.E.I.

Entrada: `/creche`.

Uso principal:

- Acompanhar painel da E.E.I.
- Consultar criancas e turmas.
- Registrar ou acompanhar frequencia conforme rotina definida.

Limite: nao acessa relatorios gerenciais, albergue, lojas/financeiro ou administracao de usuarios.

## Financeiro

Entrada: `/lojas/secretaria`.

Uso principal:

- Acompanhar painel de lojas.
- Consultar comandas, clientes, retiradas e historico.
- Registrar pagamentos e apoiar fechamento.
- Emitir visoes de secretaria e financeiro.

Limite: nao acessa albergue, E.E.I. ou administracao de usuarios.

## Loja Bazar

Entrada: `/lojas/bazar`.

Uso principal:

- Operar produtos, comandas e retiradas do Bazar.
- Consultar historico do proprio Bazar.

Limite: nao acessa Brecho, Feirao, secretaria/financeiro, albergue ou E.E.I.

## Loja Brecho

Entrada: `/lojas/brecho`.

Uso principal:

- Operar produtos, comandas e retiradas do Brecho.
- Consultar historico do proprio Brecho.

Limite: nao acessa Bazar, Feirao, secretaria/financeiro, albergue ou E.E.I.

## Loja Feirao

Entrada: `/lojas/feirao`.

Uso principal:

- Operar produtos, comandas e retiradas do Feirao.
- Consultar historico do proprio Feirao.

Limite: nao acessa Bazar, Brecho, secretaria/financeiro, albergue ou E.E.I.
