#!/usr/bin/env bash
set -euo pipefail

umask 077

PROJECT_DIR="${PROJECT_DIR:-/opt/iedc}"
BRANCH="${IEDC_UPDATE_BRANCH:-main}"
REMOTE="${IEDC_UPDATE_REMOTE:-origin}"
HEALTH_URL="${IEDC_HEALTH_URL:-http://127.0.0.1:8080/api/health/ready}"
SKIP_BACKUP="${IEDC_UPDATE_SKIP_BACKUP:-false}"
LOCK_DIR="$PROJECT_DIR/.iedc-update.lock"

fail() {
  echo "ERRO: $*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git nao encontrado."
command -v docker >/dev/null 2>&1 || fail "docker nao encontrado."
command -v curl >/dev/null 2>&1 || fail "curl nao encontrado."

mkdir -p "$PROJECT_DIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  fail "atualizacao ja esta em execucao: $LOCK_DIR"
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

cd "$PROJECT_DIR"

[ -d .git ] || fail "$PROJECT_DIR nao e um repositorio git."

if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "worktree do servidor tem alteracoes locais. Resolva antes de atualizar."
fi

echo "Validando compose atual..."
docker compose config >/dev/null

if [ "$SKIP_BACKUP" != "true" ]; then
  echo "Executando backup antes da atualizacao..."
  PROJECT_DIR="$PROJECT_DIR" "$PROJECT_DIR/ops/backup/backup-docker.sh"
else
  echo "Backup ignorado por IEDC_UPDATE_SKIP_BACKUP=true."
fi

echo "Buscando versao aprovada em $REMOTE/$BRANCH..."
git fetch --prune "$REMOTE" "$BRANCH"
git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
git reset --hard "$REMOTE/$BRANCH"
git clean -fd

echo "Validando compose atualizado..."
docker compose config >/dev/null

echo "Recriando containers..."
docker compose build
docker compose up -d --build --force-recreate --remove-orphans

echo "Aguardando saude da API em $HEALTH_URL..."
healthy="false"
for _ in $(seq 1 40); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy="true"
    break
  fi
  sleep 3
done

if [ "$healthy" != "true" ]; then
  docker compose ps >&2 || true
  docker compose logs --tail=120 backend >&2 || true
  fail "API nao respondeu saudavel depois da atualizacao."
fi

docker image prune -f >/dev/null 2>&1 || true
git rev-parse HEAD > "$PROJECT_DIR/.iedc-last-update"

echo "Atualizacao concluida em $(date -u +%Y-%m-%dT%H:%M:%SZ): $(cat "$PROJECT_DIR/.iedc-last-update")"
