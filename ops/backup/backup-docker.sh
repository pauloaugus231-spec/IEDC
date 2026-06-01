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
BACKUP_STATUS_PATH="${BACKUP_STATUS_PATH:-$BACKUP_ROOT/backup-status.json}"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
run_dir=""
remote_status="skipped"
db_bytes=0
uploads_bytes=0

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'
}

file_size() {
  if stat -c%s "$1" >/dev/null 2>&1; then
    stat -c%s "$1"
  else
    stat -f%z "$1"
  fi
}

write_backup_status() {
  local status="$1"
  local message="$2"
  local finished_at duration tmp
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  duration=$(( $(date -u +%s) - $(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$started_at" +%s 2>/dev/null || date -d "$started_at" +%s) ))
  tmp="$BACKUP_STATUS_PATH.tmp"

  mkdir -p "$(dirname "$BACKUP_STATUS_PATH")"
  cat > "$tmp" <<JSON
{
  "status": "$(json_escape "$status")",
  "message": "$(json_escape "$message")",
  "startedAt": "$(json_escape "$started_at")",
  "finishedAt": "$(json_escape "$finished_at")",
  "durationSeconds": $duration,
  "backupPath": "$(json_escape "$run_dir")",
  "remoteStatus": "$(json_escape "$remote_status")",
  "databaseBytes": $db_bytes,
  "uploadsBytes": $uploads_bytes
}
JSON
  mv "$tmp" "$BACKUP_STATUS_PATH"
}

on_error() {
  local exit_code=$?
  write_backup_status "failed" "Backup falhou na linha $1."
  exit "$exit_code"
}

trap 'on_error $LINENO' ERR

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
db_dump_path="$run_dir/iedc-db-$timestamp.dump"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$db_dump_path"
db_bytes="$(file_size "$db_dump_path")"

echo "Compactando uploads..."
uploads_archive_path="$run_dir/iedc-uploads-$timestamp.tar.gz"
docker run --rm \
  -v iedc_uploads:/uploads:ro \
  alpine:3.20 \
  tar -czf - -C /uploads . > "$uploads_archive_path"
uploads_bytes="$(file_size "$uploads_archive_path")"

echo "Gerando manifesto de integridade..."
(
  cd "$run_dir"
  sha256sum ./* > manifest.sha256
)

if command -v rclone >/dev/null 2>&1 && [ -n "$RCLONE_DESTINATION" ]; then
  echo "Enviando backup para destino remoto criptografado..."
  rclone copy "$run_dir" "$RCLONE_DESTINATION/diario/$timestamp" --transfers 2 --checkers 4
  remote_status="sent"
else
  echo "Rclone nao configurado; backup remoto ignorado."
fi

echo "Removendo backups locais antigos..."
find "$BACKUP_ROOT/diario" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} +

write_backup_status "success" "Backup concluido com manifestos de integridade."
echo "Backup concluido: $run_dir"
