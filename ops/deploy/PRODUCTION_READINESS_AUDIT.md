# Auditoria de Production Readiness

Data: 2026-05-28

## Status atual

O sistema ja possui schema inicial oficial via migration e o Docker roda com `DB_SYNCHRONIZE=false` por padrao. A base esta adequada para uma primeira versao oficial local controlada, desde que as variaveis de ambiente e rotina de backup sejam configuradas no servidor.

## Dependencias

### Backend

Resultado de `npm audit --omit=dev`:

- High: 0
- Critical: 0
- Moderate: 9

As vulnerabilidades altas de producao foram removidas com:

- remocao da dependencia direta de `multer`;
- overrides seguros para `multer`, `lodash`, `qs`, `uuid` e `js-yaml`;
- atualizacao direta de `uuid`.

As 9 moderadas restantes ficam presas ao ecossistema Nest 10:

- `@nestjs/core`
- `@nestjs/common`
- `@nestjs/platform-express`
- `@nestjs/platform-socket.io`
- `@nestjs/websockets`
- `@nestjs/swagger`
- `@nestjs/typeorm`
- `@nestjs/cache-manager`
- `file-type` transitivo

Correcao limpa: migrar de Nest 10 para Nest 11 em uma fase planejada, com teste de regressao de API, WebSocket, uploads e autenticação.

### Frontend

Resultado de `npm audit` e `npm audit --omit=dev`:

- High: 0
- Critical: 0
- Moderate: 0

O Vite foi atualizado para remover vulnerabilidades do dev server.

## Leftovers removidos ou bloqueados

- Migrations antigas e parciais foram substituidas por uma migration inicial oficial.
- Docker passou a usar `DB_SYNCHRONIZE=false` e `DB_MIGRATIONS_RUN=true`.
- Rotas diagnosticas especificas foram removidas do modulo de estadias.
- Rotas operacionais de manutencao agora retornam 404 por padrao, salvo `ENABLE_MAINTENANCE_ROUTES=true`.
- Semeadura ficticia de lojas, clientes, comandas e pagamentos foi removida.
- Semeadura de impacto social fica desabilitada por padrao via `ENABLE_DEMO_SEED=false`.
- Senha inicial deixou de ter fallback de demo e agora exige `IEDC_DEFAULT_PASSWORD`.
- `JWT_SECRET` passou a ser obrigatorio em producao.
- Configuracao de banco passou a falhar cedo em producao quando variaveis obrigatorias nao existem.
- Notificacoes de triagem deixaram de usar destino hardcoded; agora dependem de variaveis de ambiente.

## Testes adicionados

- CORS bloqueia origem ampla em producao sem `CORS_ORIGIN`.
- JWT exige `JWT_SECRET` em producao.

## Validacoes executadas

- `backend`: migration inicial aplicada em PostgreSQL descartavel limpo.
- `backend`: `typeorm schema:log` confirmou schema atualizado apos a migration.
- `backend`: `npm run build`
- `backend`: `npm test -- --runInBand`
- `backend`: `npm audit --omit=dev --audit-level=high`
- `frontend`: `npm run build`
- `frontend`: `npm audit --audit-level=high`
- Docker local: `docker compose up -d --build`
- Healthcheck: `/api/health` retorna 200
- Backup/restauracao Docker local: OK
- Swagger: `/api/docs` retorna 404
- Login gestao: OK
- Dashboard autenticado: OK
- Dashboard E.E.I.: OK
- Dashboard impacto social: OK
- Dashboard lojas: OK
- QA por perfil: 11 perfis aprovados em API e navegador
- Rotas de manutencao: 404 por padrao
- Controller diagnostico removido: 404
- Loja acessa a propria loja: 200
- Loja tentando acessar outra loja: 403

## Bloqueadores antes do deploy final

1. Migrar backend para Nest 11 para zerar as moderadas restantes.
2. Transformar o QA por perfil executado via script local em suite versionada de regressao.
3. Definir `.env` oficial do servidor com senhas fortes e guardar copia segura fora do repositorio.
4. Repetir restauracao de backup no servidor institucional ou ambiente controlado equivalente.
5. Otimizar bundle frontend com code splitting depois da primeira versao oficial estabilizada.
