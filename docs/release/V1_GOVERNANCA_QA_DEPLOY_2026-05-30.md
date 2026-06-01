# V1 - Governanca, QA e atualizacao controlada

Data: 2026-05-30

## Entregas

- Frontend passou a carregar paginas autenticadas sob demanda, reduzindo o peso inicial do bundle.
- Perfil `suporte` ganhou console de auditoria operacional em `/suporte/auditoria`.
- Endpoint `/api/auditoria` passou a aceitar filtros por `entidade`, `usuarioLogin`, `status` e `acao`.
- QA por perfil virou suite versionada com `npm run qa:profiles`.
- Servidor ganhou script de atualizacao controlada por repositorio em `ops/deploy/update-from-repository.sh`.
- Documentacao operacional de atualizacao foi registrada em `ops/deploy/ATUALIZACAO_AUTOMATICA.md`.

## Impacto institucional

A V1 passa a ter tres protecoes novas:

1. Acesso administrativo sensivel separado por perfil.
2. Regressao objetiva para permissoes de rota.
3. Caminho de atualizacao no servidor com backup, healthcheck e trava contra alteracoes locais.

## Validacoes esperadas

```bash
cd backend && npm run qa:profiles
cd backend && npm run build
cd backend && npm test -- --runInBand
cd frontend && npm run build
docker compose config
```

## Validacoes executadas

- `backend`: `npm run qa:profiles` aprovado, 204 checks em 11 perfis.
- `backend`: `npm run build` aprovado.
- `backend`: `npm test -- --runInBand` aprovado, 6 suites e 17 testes.
- `backend`: `npm audit --omit=dev --audit-level=high` com 0 vulnerabilidades.
- `backend`: `npx eslint "{src,apps,libs,test}/**/*.ts"` aprovado.
- `frontend`: `npm run build` aprovado com code splitting por pagina.
- `frontend`: `npm run lint` aprovado apos baseline confiavel registrado em `docs/release/V1_FRONTEND_LINT_BASELINE_2026-05-30.md`.
- `frontend`: `npm audit --audit-level=high` com 0 vulnerabilidades.
- Docker: `docker compose config` aprovado.

## Proximo endurecimento recomendado

- Rodada funcional por perfil em navegador com banco descartavel.
- Restauracao real em ambiente de servidor.
- Tag tecnica oficial `v1.0.0-iedc`, com release title `v1.0.0 iedc`.
- Registro de changelog institucional a cada versao aprovada.
