# Espelhamento da fonte `na_casa`

Este procedimento usa a pagina legada `http://192.168.0.73/init/default/na_casa` como referencia operacional do Albergue.

## O que a fonte antiga define

- Ocupacao atual das camas.
- Nome exibido do hospede.
- Chave da cama.
- Dias restantes da estadia.

## O que ela nao define

- Não e um mapa completo das 90 camas.
- A pagina pode listar apenas os ocupantes ativos do momento.
- Camas livres podem simplesmente nao aparecer.

## Regra de espelhamento

- A numeracao oficial das camas do IEDC 360 nao muda.
- O sistema novo deve refletir a lista da fonte antiga.
- Se a pessoa aparece na fonte antiga, ela permanece ativa no novo com a mesma cama e os mesmos dias restantes.
- Se a pessoa existe no novo, mas nao aparece na fonte antiga, ela deve ser tratada como fora da fonte de verdade e finalizada no espelhamento.
- Quando houver nomes duplicados no cadastro, a sincronizacao prioriza o registro cuja estadia ativa bate com a cama exibida na fonte antiga.

## Script oficial

Os comandos oficiais ficam em `backend/package.json`:

- `npm run sync:na-casa:dry-run`
- `npm run sync:na-casa`

No modo seco, o sistema apenas mostra a diferenca.
No modo `apply`, ele:

- ajusta estadias ativas;
- atualiza cama ocupada;
- recalcula `data_checkin` e `data_limite` a partir dos dias restantes;
- finaliza o que nao estiver mais na fonte antiga;
- libera camas que ficarem fora do espelhamento.

## Regra de data

- A fonte antiga fornece `dias restantes`.
- O sistema novo recalcula:
  - `data_limite`
  - `data_checkin`
- A regra atual assume 30 noites totais para estadias completas.

## Recomendacao operacional

Antes de aplicar de verdade:

1. Rode o modo seco.
2. Confirme quem entra, quem sai e quem mudou de cama.
3. Aplique apenas depois de validar a lista.

## Observacao importante

Quando houver divergencia entre os sistemas, a fonte antiga prevalece para o espelhamento operacional do Albergue.
