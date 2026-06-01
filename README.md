# Sistema Dias da Cruz

Plataforma local de gestao institucional do Instituto Espirita Dias da Cruz.

## Escopo atual

- Gestao institucional.
- Albergue.
- E.E.I.
- Lojas, secretaria e financeiro.
- Impacto social do albergue.
- Autenticacao por perfis.
- Docker local, migrations, healthcheck e backup.

## Memoria canonica

A memoria de produto, arquitetura, governanca, roadmap, QA e implantacao fica fora do repositorio de codigo:

`/Users/user/Documents/Sistema_Dias_da_Cruz`

## Captacao

A base de captacao permanece separada:

`/Users/user/Documents/captacao_recurso`

Use essa pasta para editais, pipeline de submissao, banco de projetos, documentos institucionais, emendas, premios e automacao diaria.

## Ferramentas de trabalho

GStack, impeccable e ui ux pro max sao skills/protocolos do Codex para revisar e melhorar o projeto.

Eles nao fazem parte do runtime do sistema.

## V1 oficial local

Antes de novos modulos, a prioridade e fechar a V1 oficial local:

1. Baseline tecnico estavel.
2. Permissoes backend/frontend revisadas.
3. QA por perfil.
4. Docker validado.
5. Backup e restauracao documentados.
6. Bootstrap institucional com apenas `suporte` no primeiro boot.
7. Commit/tag estavel.

Tag tecnica da V1 oficial:

```text
v1.0.0-iedc
```

O titulo humano da release pode ser `v1.0.0 iedc`.

Em banco novo, o backend cria somente o usuario `suporte`, usando `IEDC_DEFAULT_PASSWORD`
do `.env` do servidor. O `.env` real nunca deve ser versionado.

## Arquivo historico

Documentos de frentes removidas ou fora do escopo ficam em:

`docs/archive`

## Documentos operacionais da V1

- `docs/qa/V1_PROFILE_QA_2026-05-28.md`
- `docs/manuais/V1_MANUAL_CURTO_POR_PERFIL.md`
- `docs/operacao/backup-restauracao.md`
- `docs/release/V1_BASELINE_2026-05-28.md`
- `docs/release/V1_RELEASE_IEDC_2026-06-01.md`
