# Importacao do legado do albergue

Este procedimento popula o banco atual a partir do backup legado `backup_triagem_20260618_1513.sql`.

## Escopo

- Importar apenas cadastros que tiveram entrada no albergue.
- Preservar o historico operacional relevante.
- Nao importar fotos.

## Mapeamento principal

- `iedc_usuario` -> `pessoas`
- `iedc_triagem` -> `estadias`
- `iedc_bloqueio` -> `bloqueios`
- `iedc_observacao` -> `ocorrencias`
- Observacoes de prorrogacao -> `solicitacoes`

## Resultado observado no dump

- `9.876` pessoas com entrada identificada.
- `21` cadastros de entrada sem linha correspondente em `iedc_usuario`.
- `96` pessoas com indicio de situacao ativa no estado final mais recente.

## Campos com maior cobertura entre os cadastros com entrada

- `nome_usuario`: 100%
- `data_nasci_usuario`: 100%
- `num_documento`: 99.9%
- `escolaridade`: 99.4%
- `local_nasci_usuario`: 99.4%
- `profissao`: 99.7%
- `etnia`: 95.2%
- `procedencia`: 95.1%
- `telefone`: 36.4%
- `nome_da_mae`: 67.7%
- `numero_nis`: 16.5%

## Como validar

```powershell
node backend/scripts/import-legacy-albergue.mjs --report-only
```

## Como importar

Requer `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` apontando para o Postgres alvo.

```powershell
node backend/scripts/import-legacy-albergue.mjs --reset
```

Use `--reset` para limpar as tabelas principais antes de reaplicar o legado em um banco novo.

## Observacoes

- `iedc_espera`, `iedc_triagem_relatorio` e `iedc_triagem_controle` sao dados auxiliares/aggregados e ficaram fora do import automatico inicial.
- Os 21 cadastros sem linha em `iedc_usuario` sao preservados como pessoas legadas sem cadastro completo, para nao perder o historico.
