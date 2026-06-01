# Suite versionada de QA por perfil

Data: 2026-05-30

Atualizacao: 2026-06-01, a suite cobre qualidade de dados, relatorio financeiro, auditoria restrita ao suporte e politica de avisos por perfil.

## Objetivo

Transformar o QA por perfil da V1 em regressao versionada. O teste nao substitui a rodada manual de navegador, mas impede que uma mudanca de rota libere perfil indevido ou bloqueie area essencial sem percebermos.

## Comando

```bash
cd backend
npm run qa:profiles
```

O comando executa `ops/qa/profile-qa-matrix.mjs`, sem depender de banco, Docker ou usuario real.

## Perfis cobertos

| Grupo | Perfis |
| --- | --- |
| suporte | `suporte` |
| gestao | `gestora` |
| albergue | `coordenador_albergue`, `educador_albergue` |
| creche | `coordenador_creche`, `educador_creche` |
| lojas | `financeiro`, `loja_bazar`, `loja_brecho`, `loja_feirao` |
| leitura | `equipe_tecnica` |

## Escopo validado

- `suporte` acessa usuarios, auditoria e conta propria; nao acessa operacao.
- `gestora` acessa visao institucional, qualidade de dados institucional, albergue, E.E.I., secretaria financeira e relatorio financeiro; nao acessa suporte nem lojas individuais.
- auditoria fica restrita ao suporte.
- `albergue` acessa apenas rotas do Albergue e conta propria; coordenacao acessa relatorios da area, educador nao; ambos acessam qualidade de dados do Albergue.
- `creche` acessa apenas rotas da E.E.I. e conta propria; coordenacao acessa relatorios da E.E.I., educador nao; ambos acessam qualidade de dados da E.E.I.
- `lojas` separa financeiro das lojas individuais; financeiro acessa relatorio financeiro e qualidade de dados comercial; lojas individuais nao acessam historico financeiro, relatorios, qualidade de dados nem totais por periodo.
- `leitura` usa `equipe_tecnica` como perfil transversal da V1, incluindo relatorios sociais e qualidade de dados; nao acessa o relatorio financeiro.

Resultado atual:

```text
QA por perfil aprovado: 204 checks, 11 perfis.
```

## Avisos e recibos por perfil

A central `Avisos` usa `/api/notificacoes` e deve respeitar estas invariantes:

- `suporte` recebe aviso tecnico, saude do sistema, backup e auditoria completa.
- `gestora` recebe eventos executivos e pendencias, mas nao metadados tecnicos completos de suporte.
- coordenacoes recebem pendencias somente da propria area.
- educadores recebem pendencias e recibos, sem link para auditoria.
- `financeiro` recebe previsto, realizado, pendente, desistencias e retiradas.
- `loja_*` recebe somente retirada, catalogo e operacao propria, sem `R$`, relatorio, total do dia ou total do periodo.

## Regra de manutencao

Toda nova rota autenticada precisa responder a tres perguntas antes de entrar:

1. Qual perfil precisa dela?
2. Qual perfil deve ser bloqueado?
3. A suite `qa:profiles` foi atualizada?

Sem isso, o sistema cresce com permissao por esquecimento. Maquiavel chamaria de ingenuidade; eu chamaria de bug anunciado.
