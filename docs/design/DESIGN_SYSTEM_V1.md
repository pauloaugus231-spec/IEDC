# Design System Interno V1

Este documento define a primeira camada visual reutilizavel do Sistema Dias da Cruz. O objetivo nao e criar uma biblioteca abstrata antes da hora. O objetivo e simples: tornar as telas administrativas reconheciveis, consistentes e profissionais antes de propagar a linguagem para os demais modulos.

## Direcao

O sistema deve parecer uma ferramenta institucional de gestao social: sobria, clara, densa na medida certa e orientada a decisao. A interface nao deve parecer SaaS generico, painel publico antigo ou tela experimental de laboratorio.

Principios:

- O azul IEDC e a ancora institucional.
- Verde, ambar e vermelho aparecem apenas como estados operacionais.
- Superficies usam contraste, densidade e hierarquia antes de sombra decorativa.
- Botoes comunicam comando; badges comunicam estado; paineis comunicam responsabilidade.
- Toda tela administrativa deve deixar claro: onde estou, o que posso fazer e o que exige atencao.

## Tokens

Os tokens vivem em `frontend/src/styles/design-system.css` e usam prefixo `--iedc-*`.

Familias principais:

- Cor: azul institucional, neutros frios, estados semanticos.
- Texto: `--iedc-text`, `--iedc-muted`, `--iedc-subtle`.
- Superficie: `--iedc-surface`, `--iedc-surface-soft`, `--iedc-bg`.
- Raio: `--iedc-radius-xs` a `--iedc-radius-xl`.
- Sombra: sombras curtas e funcionais, sem efeito decorativo pesado.
- Movimento: 160ms a 220ms, sempre respeitando `prefers-reduced-motion`.

## Componentes Piloto

A primeira aplicacao do design system cobre:

- `Layout`: topo, sessao, navegacao lateral e area principal.
- `Minha conta`: identidade do perfil e alteracao de senha.
- `Suporte / Usuarios`: criacao, edicao, seguranca e tabela de acessos.
- `Suporte / Auditoria`: filtros, paginacao, tabela tecnica e estados vazios.

## API De Componentes

Componentes formais vivem em `frontend/src/components/DesignSystem.tsx`.

- `PageHeader`: cabecalho operacional de pagina.
- `MetricGrid`: grade responsiva para indicadores.
- `MetricCard`: indicador com label, valor, detalhe e tom semantico.
- `Panel`: superficie de trabalho com titulo, subtitulo e acoes.
- `TableShell`: moldura padronizada para tabelas.
- `ModalFrame`: estrutura de modal institucional.

A regra de transicao e simples: paginas novas devem usar os componentes. Paginas legadas podem receber classes `ds-*` ou cair na camada de compatibilidade ate serem migradas.

Classes utilitarias/componentizadas usam prefixo `ds-*`:

- `ds-app-shell`
- `ds-topbar`
- `ds-admin-surface`
- `ds-page-head`
- `ds-button`
- `ds-metric-grid`
- `ds-metric-card`
- `ds-admin-grid`
- `ds-panel`
- `ds-form`
- `ds-table-shell`
- `ds-modal`
- `ds-empty-state`

## Regras De Uso

- Prefira aplicar uma classe `ds-*` em cima de uma classe legada existente durante a transicao.
- Nao crie nova cor fora dos tokens sem motivo institucional claro.
- Nao use bordas laterais grossas como assinatura visual.
- Nao use gradiente como resposta automatica para hierarquia.
- Nao use sombra larga onde uma superficie, uma borda ou um estado bastam.
- Nao reduza legibilidade para parecer moderno.

## Propagacao

Ordem recomendada:

1. Suporte, auditoria, minha conta e layout.
2. Gestao institucional e dashboard principal.
3. Albergue e E.E.I.
4. Lojas e financeiro.
5. Relatorios, modais antigos e componentes soltos.

Cada propagacao deve substituir padroes locais por classes `ds-*` quando houver equivalencia. Onde nao houver equivalencia, o componente novo deve nascer no design system antes de ser replicado.
