# Atualizacao controlada pelo repositorio

Data: 2026-05-30

## Objetivo

Preparar o servidor local para receber uma versao validada do sistema com o minimo de intervencao manual, sem transformar atualizacao em chute operacional.

O fluxo oficial continua sendo:

1. Validar a versao no Mac ou em ambiente de homologacao.
2. Publicar a versao aprovada no repositorio privado.
3. No servidor, executar o atualizador controlado.
4. Conferir saude da API e logs.

## Script oficial

```bash
sudo PROJECT_DIR=/opt/iedc IEDC_UPDATE_BRANCH=main /opt/iedc/ops/deploy/update-from-repository.sh
```

O script faz:

- trava de execucao para evitar duas atualizacoes simultaneas;
- bloqueio se houver alteracao local no servidor;
- validacao do `docker compose`;
- backup antes da atualizacao;
- `git pull --ff-only`;
- rebuild dos containers;
- healthcheck em `/api/health`;
- registro do commit aplicado em `.iedc-last-update`.

## Variaveis uteis

```env
PROJECT_DIR=/opt/iedc
IEDC_UPDATE_BRANCH=main
IEDC_UPDATE_REMOTE=origin
IEDC_HEALTH_URL=http://127.0.0.1/api/health
IEDC_UPDATE_SKIP_BACKUP=false
```

Use `IEDC_UPDATE_SKIP_BACKUP=true` apenas em manutencao controlada. Atualizar sem backup e economia pequena com risco grande.

## Agendamento opcional com cron

Para checar diariamente uma branch estavel:

```cron
15 4 * * * PROJECT_DIR=/opt/iedc IEDC_UPDATE_BRANCH=main /opt/iedc/ops/deploy/update-from-repository.sh >> /var/log/iedc-update.log 2>&1
```

Para V1, a recomendacao prudente e rodar manualmente depois de uma versao aprovada. Agendamento automatico deve entrar apenas quando a rotina de release estiver madura.

## Regra institucional

O servidor nao deve ser lugar de desenvolvimento. Se houver mudanca local no servidor, o atualizador para. A versao correta nasce no repositorio, passa por validacao e so depois chega ao ambiente institucional.
