#!/usr/bin/env bash
# deploy.sh - atualizacao automatica do sistema IEDC
# Uso: executado via cron as 01h no servidor, depois do backup das 00:15
# Pre-requisito: git e docker compose disponiveis no PATH do cron

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [iedc-deploy]"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$REPO_DIR"

echo "$LOG_PREFIX Verificando atualizacoes em origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$LOG_PREFIX Nenhuma atualizacao. Sistema ja esta na versao mais recente ($LOCAL)."
  exit 0
fi

echo "$LOG_PREFIX Nova versao detectada: $LOCAL -> $REMOTE"
echo "$LOG_PREFIX Aplicando atualizacao..."

git pull origin "$BRANCH" --ff-only

echo "$LOG_PREFIX Reconstruindo e reiniciando containers..."
docker compose up -d --build

echo "$LOG_PREFIX Deploy concluido com sucesso. Versao: $(git rev-parse --short HEAD)"
