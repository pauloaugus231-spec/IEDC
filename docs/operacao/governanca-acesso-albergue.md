# Governança de acesso do Albergue

Esta matriz é a referência operacional para perfis do Albergue. A autorização é aplicada no backend; menus e rotas do frontend apenas refletem a mesma regra.

| Perfil | Leitura | Operação | Coordenação |
|---|---|---|---|
| `equipe_tecnica_albergue` | painel, pessoas, estadias, ocorrências, alertas e qualidade de dados | nenhuma alteração | sem relatórios gerenciais, RMA, exclusões ou exceções |
| `educador_albergue` | painel e rotina operacional | cadastros, check-in, checkout, presença, fotos, ocorrências e formulários operacionais | sem exclusões, bloqueios, relatórios, RMA ou regras |
| `coordenador_albergue` | todo o Albergue | todas as operações | exceções, bloqueios, exclusões, relatórios, RMA, equipe e escala |
| `auxiliar_coordenacao_albergue` | igual ao coordenador | igual ao coordenador | igual ao coordenador, mantendo papel separado para auditoria |
| `diretor_albergue` | painel, indicadores, impacto social e relatórios consolidados | nenhuma alteração | sem cadastros, rotina, qualidade de dados ou RMA |

## Regras permanentes

- Nenhum perfil do Albergue acessa Escola, Comercial, lojas ou suporte.
- `equipe_tecnica` global não é um papel válido.
- O frontend não é a barreira de segurança; requisições manuais também são bloqueadas pelo backend.
- Coordenador e auxiliar têm as mesmas permissões, mas papéis diferentes para rastreabilidade.
- Liberações antecipadas, bloqueios e exclusões são decisões de coordenação.

## Validação

- Teste de metadados do backend: `backend/src/auth/albergue-governance.spec.ts`.
- Teste de rotas do frontend: `frontend/src/utils/canAccessPath.test.ts`.
- Matriz integrada de perfis: `node ops/qa/profile-qa-matrix.mjs`.
