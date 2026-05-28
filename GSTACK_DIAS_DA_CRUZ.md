# GStack Dias da Cruz

Este projeto adota o GStack como protocolo de governanca de desenvolvimento, revisao e entrega.

O GStack nao faz parte do runtime do sistema. Ele nao substitui React, NestJS, banco local, modulos existentes ou a arquitetura da plataforma. Ele serve para organizar o modo como novas funcionalidades sao pensadas, planejadas, revisadas, testadas e entregues.

## Regra principal

Antes de implementar qualquer modulo relevante, a entrega deve passar por:

- entendimento do problema;
- revisao de produto;
- revisao de UX;
- revisao de arquitetura;
- revisao de seguranca;
- plano tecnico;
- implementacao;
- QA;
- registro de decisao quando necessario.

## Uso recomendado

Use este protocolo para entregas envolvendo:

- Albergue;
- E.E.I.;
- Lojas e financeiro;
- Impacto Social;
- EGP - Projetos e Captacao;
- permissoes;
- relatorios;
- dados sensiveis;
- implantacao local;
- backup;
- IA e automacoes.

## Oficializacao local

Para a V1, o caminho oficial e implantacao local no servidor do Dias da Cruz com atualizacao por repositorio estavel. Nao usar "migracao para nuvem" como marco desta fase.

Checklist especifico:

- branch/tag estavel definida;
- migrations revisadas;
- Docker local validado;
- healthcheck ativo;
- backup e restauracao documentados;
- login, usuarios, perfis e troca de senha testados;
- perfil `suporte` validado como operador pleno de usuarios, incluindo perfis de gestao;
- permissao por papel validada no backend e no frontend.

## Documento canonico

O protocolo completo fica na memoria canonica do sistema:

`/Users/user/Documents/Sistema_Dias_da_Cruz/Governanca e Qualidade/Protocolo GStack Dias da Cruz.md`

Importante: GStack, impeccable e ui ux pro max sao skills/protocolos de trabalho do Codex. Eles ajudam a pensar, revisar e melhorar o sistema, mas nao fazem parte do runtime, do produto entregue ao usuario ou da arquitetura funcional da plataforma.

## Criterios de pronto

Uma entrega so deve ser considerada pronta quando:

- o escopo foi respeitado;
- o fluxo principal foi testado;
- o visual esta coerente com o sistema;
- os dados e permissoes foram considerados;
- usuarios e senhas temporarias foram tratados quando a entrega tocar acesso;
- o build passa quando aplicavel;
- pendencias e riscos foram informados.

## Filosofia de trabalho

O sistema Dias da Cruz deve crescer por decisoes, nao por acumulacao de telas.
