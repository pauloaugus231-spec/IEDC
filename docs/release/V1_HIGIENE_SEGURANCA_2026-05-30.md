# Sprint de Higiene e Seguranca V1

Data: 2026-05-30

## Objetivo

Preparar a V1 local para uma linha de base mais confiavel antes de novas funcionalidades: raiz limpa, dependencias atualizadas, superficie de API mais protegida e documentacao do novo baseline.

## Higiene de producao

- Artefatos historicos da raiz foram movidos para `docs/archive/2026-05-v1-hygiene/root/`.
- Arquivos vazios sem uso foram removidos do backend, frontend, database local e raiz.
- `backend/database/database.sqlite` foi removido porque o banco oficial da V1 e PostgreSQL via Docker/migrations.
- `.env.docker.example` foi revisado com variaveis de throttling.
- `docker-compose.yml` passou a expor os limites de throttling como variaveis de ambiente.
- `backend/.eslintrc.cjs` foi criado para tornar o lint do backend executavel.

## Seguranca aplicada

- Backend migrado para Nest 11.
- `helmet` ativado no bootstrap da API.
- `@nestjs/throttler` ativado com limite geral e limite especifico para login.
- Login passou a ter rate limit dedicado.
- Auditoria institucional criada:
  - tabela `auditoria`;
  - migration `1770000003000-CreateAuditLog`;
  - entidade, modulo, service e controller;
  - interceptor global para registrar mutacoes `POST`, `PUT`, `PATCH` e `DELETE`;
  - eventos explicitos de login, falha de login, criacao/edicao/reset de usuario e troca de senha.
- Uploads endurecidos:
  - limite por `FileInterceptor`;
  - validacao por assinatura de imagem para fotos;
  - validacao de `.xlsx` por extensao, MIME e assinatura ZIP para RMA;
  - nomes de foto passam a usar extensao derivada do conteudo real.
- DTOs adicionados ou substituidos em fluxos sensiveis:
  - pessoas: presenca e liberacao antecipada;
  - bloqueios;
  - estadias: abandono e troca de cama;
  - lojas: produtos, clientes, comandas, itens, pagamentos, status e retiradas;
  - creche: professoras, criancas, turma, acompanhamento e frequencia;
  - impacto social;
  - solicitacoes;
  - escala;
  - relatorios: dashboard salvo e filtros JSON seguros.

## Validacoes executadas

- Backend: `npm run build` aprovado.
- Backend: `npm test -- --runInBand` aprovado, 6 suites e 17 testes.
- Backend: `npm run lint` aprovado, sem erros.
- Backend: `npm audit --omit=dev --audit-level=high` aprovado, 0 vulnerabilidades.
- Backend: `npm audit --omit=dev` aprovado, 0 vulnerabilidades.
- Frontend: `npm run build` aprovado.
- Frontend: `npm audit --audit-level=high` aprovado, 0 vulnerabilidades.
- Docker: `docker compose config` aprovado.

## Alertas restantes

- O frontend ainda emite alerta de bundle acima de 500 kB. Nao bloqueia a V1, mas pede code splitting.
- A auditoria tecnica possui console restrito ao suporte.
- O cache foi mantido como cache de aplicacao; Redis segue disponivel no compose para evolucao operacional futura.
- QA por perfil foi transformado em suite versionada de regressao.
- Antes de deploy final, repetir backup/restauracao no servidor institucional ou ambiente equivalente.
