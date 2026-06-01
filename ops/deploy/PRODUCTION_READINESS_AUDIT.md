# Auditoria de Production Readiness

Data: 2026-05-28

## Atualizacao 2026-05-30

A sprint de higiene e seguranca V1 removeu o principal bloqueador tecnico desta auditoria:

- backend migrado para Nest 11;
- `npm audit --omit=dev --audit-level=high` retornou 0 vulnerabilidades;
- `helmet` e `@nestjs/throttler` foram ativados;
- auditoria institucional foi criada para mutacoes da API;
- DTOs foram adicionados em fluxos sensiveis;
- uploads de foto e RMA passaram por endurecimento;
- artefatos historicos da raiz foram arquivados em `docs/archive/2026-05-v1-hygiene/`.

Os bloqueadores restantes passam a ser operacionais: restauracao em ambiente de servidor, definicao de tags estaveis e rotina final de release.

## Atualizacao 2026-05-30 - Governanca e deploy

- bundle frontend passou a usar carregamento sob demanda por pagina;
- suporte ganhou tela de consulta da auditoria institucional;
- auditoria passou a aceitar filtros por entidade, usuario, status e acao;
- QA por perfil virou suite versionada com `npm run qa:profiles`;
- servidor ganhou atualizador controlado por repositorio com backup, lock e healthcheck.

## Atualizacao 2026-06-01 - Release oficial IEDC

- tag tecnica definida como `v1.0.0-iedc`;
- titulo humano da release definido como `v1.0.0 iedc`;
- primeiro boot em banco novo permanece restrito ao usuario `suporte`;
- `.env` real permanece fora do repositorio e deve ser criado no servidor a partir de `.env.docker.example`;
- `APP_VERSION` do exemplo de ambiente foi alinhado para `v1.0.0-iedc`.

## Status atual

O sistema ja possui schema inicial oficial via migration e o Docker roda com `DB_SYNCHRONIZE=false` por padrao. A base esta adequada para uma primeira versao oficial local controlada, desde que as variaveis de ambiente e rotina de backup sejam configuradas no servidor.

## Dependencias

### Backend

Resultado atual de `npm audit --omit=dev --audit-level=high` apos a sprint de 2026-05-30:

- High: 0
- Critical: 0
- Moderate: 0

As vulnerabilidades altas e moderadas de producao foram removidas com:

- remocao da dependencia direta de `multer`;
- overrides seguros para `multer`, `lodash`, `qs`, `uuid` e `js-yaml`;
- atualizacao direta de `uuid`.
- migracao do backend para Nest 11;
- endurecimento dos uploads de foto e RMA.

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
- Primeiro boot em banco novo cria apenas o usuario `suporte`; demais usuarios devem ser criados pelo suporte.
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
- QA por perfil: 204 checks em 11 perfis
- Rotas de manutencao: 404 por padrao
- Controller diagnostico removido: 404
- Loja acessa a propria loja: 200
- Loja tentando acessar outra loja: 403

## Bloqueadores antes do deploy final

1. Definir `.env` oficial do servidor com senhas fortes e guardar copia segura fora do repositorio.
2. Repetir restauracao de backup no servidor institucional ou ambiente controlado equivalente.
3. Executar QA funcional em navegador por perfil no ambiente do servidor ou homologacao equivalente.
