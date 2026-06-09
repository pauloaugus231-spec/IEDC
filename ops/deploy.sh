#!/usr/bin/env bash
# deploy.sh — atualização automática do sistema IEDC
# Uso: executado via cron às 00h no servidor
# Pré-requisito: git e docker compose disponíveis no PATH do cron

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [iedc-deploy]"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$REPO_DIR"

echo "$LOG_PREFIX Verificando atualizações em origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$LOG_PREFIX Nenhuma atualização. Sistema já está na versão mais recente ($LOCAL)."
  exit 0
fi

echo "$LOG_PREFIX Nova versão detectada: $LOCAL → $REMOTE"
echo "$LOG_PREFIX Aplicando atualização..."

git pull origin "$BRANCH" --ff-only

echo "$LOG_PREFIX Reconstruindo e reiniciando containers..."
docker compose up -d --build

echo "$LOG_PREFIX Deploy concluído com sucesso. Versão: $(git rev-parse --short HEAD)"
