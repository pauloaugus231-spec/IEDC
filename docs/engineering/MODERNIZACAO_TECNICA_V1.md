# Modernização Técnica V1

Este documento registra o contrato mínimo para manter a base técnica organizada depois da modernização inicial.

## Frontend API

- `frontend/src/api.ts` deve continuar sendo apenas um barrel de compatibilidade.
- Novas chamadas HTTP entram em `frontend/src/api/<dominio>.ts`.
- `frontend/src/api/http.ts` concentra `apiFetch`, autenticação, headers e tratamento básico de erro.
- Não adicionar lógica de domínio em `api.ts`.
- Evitar `any`. Quando o formato externo ainda não estiver garantido, usar `unknown`, tipo explícito ou normalizador.

## Backend

- Serviços grandes devem virar fachada + serviços de domínio.
- O módulo de lojas já está separado em:
  - `lojas.service.ts`: fachada operacional, dashboard e delegação de casos de uso.
  - `lojas-schema.service.ts`: criação de estrutura, índices, seed e backfills seguros.
  - `lojas-catalogo.service.ts`: produtos, estoque, lojas e movimentações de catálogo.
  - `lojas-clientes.service.ts`: cadastro, busca e consulta de clientes comerciais.
  - `lojas-comandas.service.ts`: criação, itens, pagamento, status e listagem de comandas.
  - `lojas-retiradas.service.ts`: confirmação e histórico de retiradas.
  - `lojas-events.service.ts`: emissão centralizada de eventos websocket do domínio.
  - `lojas-export.service.ts`: exportação financeira Excel/PDF.
  - `lojas-shared.ts`: tipos e helpers compartilhados.
- O backend deve permanecer sem `any` explícito em `backend/src`. Fronteiras dinâmicas usam `unknown`, DTO, row type ou normalizador.
- Novas regras de infraestrutura não entram no serviço de fachada.
- Se um service passar de 900 linhas ou misturar consulta, exportação, schema e evento, abrir um serviço de domínio antes de continuar crescendo.

## CSS

- `institutional.css` e `design-system.css` são agregadores.
- Não adicionar blocos grandes diretamente nesses agregadores.
- Usar os arquivos por domínio:
  - `institutional-core.css`, `institutional-creche.css`, `institutional-executive.css`, `institutional-impact.css`, `institutional-support.css`.
  - `design-system-core.css`, `design-system-profile-albergue.css`, `design-system-admin-rma.css`, `design-system-albergue-reports.css`, `design-system-scale-presence.css`, `design-system-responsive.css`.
- Manter a ordem dos imports, porque ela preserva a cascata atual.

## Checklist Antes De Encerrar Uma Mudança

- Frontend: `npm run build` em `frontend`.
- Backend: `npm run build` em `backend`.
- Lint direcionado nos arquivos tocados quando houver TypeScript/TSX.
- Se mexer em CSS global, validar pelo menos uma tela de suporte/layout e uma tela operacional.
- Se mexer em backend de domínio, validar controller/import/injeção com build e, quando possível, teste ou smoke da rota.

## Regra De Ouro

O sistema pode evoluir rápido, mas não pode voltar a crescer como arquivo único. Fachada pequena, domínio separado, contrato tipado e CSS por camada. É assim que a V1 deixa de ser improviso bonito e vira patrimônio operacional.
