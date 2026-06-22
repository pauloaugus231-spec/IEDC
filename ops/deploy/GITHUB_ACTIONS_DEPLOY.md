# Deploy automatico via GitHub Actions

Este fluxo transforma o repositorio Git em fonte de verdade da aplicacao.

## Como funciona

1. Voce faz `git push` para `main`.
2. O GitHub Actions dispara o workflow de deploy.
3. O workflow abre SSH no servidor.
4. O servidor executa `ops/deploy/update-from-repository.sh`.
5. O script faz `git pull`, rebuild e recriacao dos containers Docker.
6. O healthcheck valida a API antes de finalizar.

## Segredos necessarios no GitHub

Configure estes secrets no repositorio:

```text
DEPLOY_SSH_HOST
DEPLOY_SSH_PORT
DEPLOY_SSH_USER
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_SSH_KNOWN_HOSTS
DEPLOY_PROJECT_DIR
DEPLOY_REMOTE
DEPLOY_HEALTH_URL
```

Sugestoes de valor:

```text
DEPLOY_SSH_PORT=22
DEPLOY_PROJECT_DIR=/opt/iedc
DEPLOY_REMOTE=origin
DEPLOY_HEALTH_URL=http://127.0.0.1/api/health
```

`DEPLOY_SSH_KNOWN_HOSTS` e opcional, mas recomendado para evitar `ssh-keyscan` dinamico no runner.

## Requisitos no servidor

- O repositorio precisa existir em `/opt/iedc` ou no caminho definido em `DEPLOY_PROJECT_DIR`.
- O usuario SSH precisa conseguir executar o script com `sudo -n`.
- O usuario do deploy precisa ter acesso ao Docker.
- O remote `origin` precisa apontar para o repositorio GitHub correto.

## Observacao importante

O `git push` nao sobe a aplicacao sozinho. Ele apenas inicia o fluxo. Quem atualiza o sistema de fato e o servidor, porque e la que o Docker recompila as imagens e recria os containers.

