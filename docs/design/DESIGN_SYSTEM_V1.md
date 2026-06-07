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
- Movimento: `--iedc-motion-fast` (160ms), `--iedc-motion` (220ms), `--iedc-motion-slow` (300ms).
- Easing: `--iedc-ease` (entrada padrao), `--iedc-ease-out` (saida).
- Slide offsets: `--iedc-slide-y` (12px, paginas), `--iedc-slide-x` (260px, drawers).
- Todos respeitam `prefers-reduced-motion` via `useMotion` hook.

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
- `ModalFrame`: estrutura de modal institucional com motion (scale + fade).
- `ModalOverlay`: backdrop animado com AnimatePresence para modais.
- `SlidePanel`: painel lateral slide-from-right para drawers.

**Motion hooks** (`frontend/src/hooks/`):

- `useMotion`: pageVariants, containerVariants, itemVariants, modalVariants, slideVariants. Respeita `prefers-reduced-motion`.
- `usePageTransition`: chave estavel por pathname para AnimatePresence nas rotas.

**Page wrapper** (`frontend/src/components/PageMotion.tsx`): envolve cada rota protegida com animacao de entrada/saida.

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

## Politica de Bibliotecas de Componentes Externos

### Ant Design (antd)

**Decisao: nao usar. Dependencia removida em junho/2026.**

O `antd@5` foi incluido no `package.json` durante a prototipagem, mas nunca foi importado em nenhum arquivo do frontend. A decisao de nao adota-lo e deliberada:

1. O sistema IEDC tem identidade visual institucional propria (azul `#0041aa`, tipografia Inter, tokens `--iedc-*`). Ant Design impoe uma linguagem visual propria que conflita com essa identidade.
2. O design system interno (`DesignSystem.tsx` + `design-system-core.css`) ja cobre os componentes necessarios: PageHeader, MetricGrid, MetricCard, Panel, TableShell, ModalFrame, ModalOverlay, SlidePanel.
3. Ant Design traria ~300 kB+ de bundle adicional sem beneficio proporcional.
4. Motion e controlado via Framer Motion + `useMotion` hook, nao via Ant Motion.

**Regra para o futuro:** se um componente complexo for necessario (ex: DatePicker avancado, Tree, Transfer), avalie primeiro se a versao nativa do browser ou um pacote especializado e menor resolve. Nao reintroduza antd como dependencia sem justificativa tecnica documentada aqui.

### Bibliotecas Permitidas

- `framer-motion`: animacoes e transicoes (motion tokens, page transitions, modal animations).
- `echarts` + `echarts-for-react`: graficos (via `EChartCanvas` wrapper tree-shakeable).
- `react-router-dom`: roteamento.
- Pacotes utilitarios pequenos (papaparse, file-saver, html2canvas, jspdf) para funcionalidades pontuais.
