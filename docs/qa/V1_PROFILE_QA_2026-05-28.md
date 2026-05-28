# QA por perfil - V1 oficial local

Data: 2026-05-28

## Objetivo

Validar que cada perfil entra no sistema, cai na tela inicial correta, fica bloqueado fora do seu escopo e tem a permissao de API coerente com a matriz da V1.

## Resultado

Status: aprovado.

Usuarios temporarios `qa-*` foram criados diretamente no banco para o teste e removidos ao final.

## Perfis validados

| Perfil | Home esperada | Resultado |
| --- | --- | --- |
| suporte | `/suporte/usuarios` | OK |
| gestora | `/gestao` | OK |
| equipe_tecnica | `/gestao` | OK |
| coordenador_albergue | `/albergue` | OK |
| educador_albergue | `/albergue` | OK |
| coordenador_creche | `/creche` | OK |
| educador_creche | `/creche` | OK |
| financeiro | `/lojas/secretaria` | OK |
| loja_bazar | `/lojas/bazar` | OK |
| loja_brecho | `/lojas/brecho` | OK |
| loja_feirao | `/lojas/feirao` | OK |

## Evidencia de API

- suporte: 3 checks.
- gestora: 5 checks.
- equipe_tecnica: 5 checks.
- coordenador_albergue: 5 checks.
- educador_albergue: 4 checks.
- coordenador_creche: 4 checks.
- educador_creche: 3 checks.
- financeiro: 4 checks.
- loja_bazar: 4 checks.
- loja_brecho: 3 checks.
- loja_feirao: 3 checks.

As verificacoes cobriram login, rotas permitidas e rotas proibidas representativas para cada perfil.

## Evidencia de navegador

- suporte: `/gestao` redirecionou para `/suporte/usuarios`.
- gestora: `/suporte/usuarios` redirecionou para `/gestao`.
- equipe_tecnica: `/suporte/usuarios` redirecionou para `/gestao`.
- coordenador_albergue: `/creche` redirecionou para `/albergue`.
- educador_albergue: `/creche` redirecionou para `/albergue`.
- coordenador_creche: `/albergue` redirecionou para `/creche`.
- educador_creche: `/albergue` redirecionou para `/creche`.
- financeiro: `/creche` redirecionou para `/lojas/secretaria`.
- loja_bazar: `/lojas/brecho` redirecionou para `/lojas/bazar`.
- loja_brecho: `/lojas/bazar` redirecionou para `/lojas/brecho`.
- loja_feirao: `/lojas/bazar` redirecionou para `/lojas/feirao`.

## Observacao

Este QA valida a fronteira de permissao. Fluxos profundos de operacao, como cadastro completo, checkout, frequencia, conferencia RMA e fechamento financeiro, devem ficar em uma rodada funcional separada.
