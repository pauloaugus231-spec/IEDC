#!/usr/bin/env bash
set -euo pipefail

umask 077

PROJECT_DIR="${PROJECT_DIR:-/opt/iedc}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/iedc}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

POSTGRES_DB="${POSTGRES_DB:-iedc}"
POSTGRES_USER="${POSTGRES_USER:-iedc_app}"
RCLONE_DESTINATION="${RCLONE_DESTINATION:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado." >&2
  exit 1
fi

timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
run_dir="$BACKUP_ROOT/diario/$timestamp"

mkdir -p "$run_dir"
cd "$PROJECT_DIR"

if ! docker compose ps postgres >/dev/null 2>&1; then
  echo "Servico postgres nao encontrado neste compose." >&2
  exit 1
fi

echo "Gerando backup PostgreSQL..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$run_dir/iedc-db-$timestamp.dump"

echo "Compactando uploads..."
docker run --rm \
  -v iedc_uploads:/uploads:ro \
  alpine:3.20 \
  tar -czf - -C /uploads . > "$run_dir/iedc-uploads-$timestamp.tar.gz"

echo "Gerando manifesto de integridade..."
(
  cd "$run_dir"
  sha256sum ./* > manifest.sha256
)

if command -v rclone >/dev/null 2>&1 && [ -n "$RCLONE_DESTINATION" ]; then
  echo "Enviando backup para destino remoto criptografado..."
  rclone copy "$run_dir" "$RCLONE_DESTINATION/diario/$timestamp" --transfers 2 --checkers 4
else
  echo "Rclone nao configurado; backup remoto ignorado."
fi

echo "Removendo backups locais antigos..."
find "$BACKUP_ROOT/diario" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} +

echo "Backup concluido: $run_dir"
