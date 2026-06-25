# Deploy automatico via GitHub Actions

Este fluxo transforma o repositorio Git em fonte de verdade da aplicacao.

## Como funciona

1. Voce faz `git push` para `main`.
2. O GitHub Actions dispara o workflow de deploy.
3. O workflow roda em um runner self-hosted Windows desta maquina.
4. O runner executa `ops/deploy/update-from-repository.ps1`.
5. O script faz `fetch`, alinha o worktree ao `origin/main`, rebuild e recriacao dos containers Docker.
6. O healthcheck valida a API antes de finalizar.

## Requisitos do runner local

Configure um runner self-hosted com as labels:

```text
self-hosted
windows
x64
iedc-local
```

O runner deve estar instalado fora do repositorio, mas atuar sobre o clone oficial em:

```text
C:\dev\IEDC
```

O processo deve ter acesso ao Docker Desktop e permissao para executar Git e PowerShell.

## Quando o servidor Ubuntu 24 entrar

O mesmo padrao pode ser reaproveitado mudando o runner e o script de atualizacao para o host Linux.
Para a fase atual, este workflow fica focado em validar o ciclo completo na maquina Windows.

## Observacao importante

O `git push` nao sobe a aplicacao sozinho. Ele apenas inicia o fluxo. Quem atualiza o sistema de fato e o runner self-hosted, porque e la que o Docker recompila as imagens e recria os containers.
