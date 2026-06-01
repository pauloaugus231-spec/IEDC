# Release V1 oficial IEDC

Data: 2026-06-01

## Identidade da versao

- Tag Git tecnica: `v1.0.0-iedc`
- Titulo humano da release: `v1.0.0 iedc`
- Repositorio alvo: `pauloaugus231-spec/IEDC`
- Escopo: V1 oficial local do Sistema Dias da Cruz para implantacao controlada no servidor institucional.

## Regra de bootstrap

Em banco novo, o primeiro boot do backend cria somente o usuario `suporte`.

Esse usuario inicial usa a senha temporaria definida por `IEDC_DEFAULT_PASSWORD` no `.env` do servidor e nasce com troca obrigatoria de senha.

Depois do primeiro acesso, o suporte troca a propria senha e cria os demais usuarios reais conforme a necessidade institucional.

Nenhum usuario operacional, demonstrativo ou de treinamento deve nascer automaticamente na V1 oficial.

## Ambiente do servidor

O `.env` real deve ser criado manualmente no servidor a partir de `.env.docker.example`.

Variaveis obrigatorias antes de subir:

```env
POSTGRES_PASSWORD=senha_forte_do_banco
JWT_SECRET=segredo_longo_e_unico
IEDC_DEFAULT_PASSWORD=senha_temporaria_do_suporte
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true
ENABLE_DEMO_SEED=false
ENABLE_MAINTENANCE_ROUTES=false
```

O `.env` real nao sobe para o repositorio.

## Gates antes da tag

Executar e registrar:

```bash
cd backend && npm run qa:profiles
cd backend && npm run build
cd backend && npm test -- --runInBand
cd backend && npm audit --omit=dev --audit-level=high
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm audit --audit-level=high
docker compose config --quiet
docker compose up -d --build
curl http://localhost:8081/api/health
curl http://localhost:8081/api/health/ready
```

Tambem validar que:

- `.env` segue ignorado;
- bancos locais e artefatos runtime seguem ignorados;
- `backend/src/auth/auth.service.spec.ts` confirma que apenas `suporte` nasce no primeiro boot;
- Swagger e rotas de manutencao seguem fechados por padrao;
- backup/restauracao possuem scripts versionados e documentacao operacional.

## Validacoes executadas em 2026-06-01

- `backend`: `npm run qa:profiles` aprovado, 204 checks em 11 perfis.
- `backend`: `npm run build` aprovado.
- `backend`: `npm test -- --runInBand` aprovado, 6 suites e 17 testes.
- `backend`: `npm audit --omit=dev --audit-level=high` aprovado, 0 vulnerabilidades.
- `frontend`: `npm run lint` aprovado.
- `frontend`: `npm run build` aprovado, com alerta nao bloqueante de chunk grande no relatorio financeiro.
- `frontend`: `npm audit --audit-level=high` aprovado, 0 vulnerabilidades.
- Docker: `docker compose config --quiet` aprovado.
- Docker: `docker compose up -d --build` aprovado.
- Healthcheck: `/api/health` retornou 200.
- Readiness: `/api/health/ready` retornou 200 com banco e uploads OK.
- Swagger: `/api/docs` retornou 404 por padrao.
- Manutencao: `/api/maintenance/status` retornou 404 por padrao.

## Fluxo de publicacao

1. Confirmar `git status`.
2. Revisar diff final.
3. Commitar o baseline da V1.
4. Adicionar o remote oficial, se necessario.
5. Publicar a branch aprovada.
6. Criar a tag `v1.0.0-iedc`.
7. Criar release no GitHub com titulo `v1.0.0 iedc`.

## Fluxo no servidor

```bash
cd /opt
git clone https://github.com/pauloaugus231-spec/IEDC.git iedc
cd /opt/iedc
cp .env.docker.example .env
nano .env
docker compose up -d --build
```

Depois:

1. Acessar o sistema pelo navegador.
2. Entrar como `suporte`.
3. Trocar a senha obrigatoria.
4. Criar os usuarios reais.
5. Conferir backup e saude do sistema em `Suporte > Saude do sistema`.
