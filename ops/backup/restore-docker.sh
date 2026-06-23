#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/iedc}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

POSTGRES_DB="${POSTGRES_DB:-iedc}"
POSTGRES_USER="${POSTGRES_USER:-iedc_app}"
POSTGRES_ALBERGUE_DB="${POSTGRES_ALBERGUE_DB:-iedc_albergue}"
POSTGRES_ALBERGUE_USER="${POSTGRES_ALBERGUE_USER:-iedc_albergue_app}"
POSTGRES_MASTER_DB="${POSTGRES_MASTER_DB:-iedc_master}"
POSTGRES_MASTER_USER="${POSTGRES_MASTER_USER:-iedc_master_app}"
POSTGRES_ESCOLA_DB="${POSTGRES_ESCOLA_DB:-iedc_escola}"
POSTGRES_ESCOLA_USER="${POSTGRES_ESCOLA_USER:-iedc_escola_app}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/iedc}"
RESTORE_STATUS_PATH="${RESTORE_STATUS_PATH:-$BACKUP_ROOT/restore-status.json}"
BACKUP_DIR="${1:-}"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'
}

write_restore_status() {
  local status="$1"
  local message="$2"
  local finished_at duration tmp
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  duration=$(( $(date -u +%s) - $(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$started_at" +%s 2>/dev/null || date -d "$started_at" +%s) ))
  tmp="$RESTORE_STATUS_PATH.tmp"

  mkdir -p "$(dirname "$RESTORE_STATUS_PATH")"
  cat > "$tmp" <<JSON
{
  "status": "$(json_escape "$status")",
  "message": "$(json_escape "$message")",
  "startedAt": "$(json_escape "$started_at")",
  "finishedAt": "$(json_escape "$finished_at")",
  "durationSeconds": $duration,
  "backupPath": "$(json_escape "$BACKUP_DIR")"
}
JSON
  mv "$tmp" "$RESTORE_STATUS_PATH"
}

on_error() {
  local exit_code=$?
  write_restore_status "failed" "Restauracao falhou na linha $1."
  exit "$exit_code"
}

if [ -z "$BACKUP_DIR" ] || [ "${2:-}" != "--yes" ]; then
  echo "Uso: PROJECT_DIR=/opt/iedc $0 /var/backups/iedc/diario/AAAA-MM-DD_HH-MM-SS --yes" >&2
  echo "Esta operacao substitui o banco e os uploads atuais." >&2
  exit 2
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Diretorio de backup nao encontrado: $BACKUP_DIR" >&2
  exit 1
fi

BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd -P)"
trap 'on_error $LINENO' ERR
write_restore_status "running" "Restauracao iniciada."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado." >&2
  exit 1
fi

cd "$PROJECT_DIR"

core_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-core-*.dump' | sort | tail -n 1)"
albergue_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-albergue-*.dump' | sort | tail -n 1)"
master_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-master-*.dump' | sort | tail -n 1)"
escola_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-escola-*.dump' | sort | tail -n 1)"
uploads_archive="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-uploads-*.tar.gz' | sort | tail -n 1)"

if [ -z "$core_dump" ] || [ -z "$albergue_dump" ] || [ -z "$master_dump" ] || [ -z "$uploads_archive" ]; then
  echo "Backup incompleto. Esperados os dumps core, albergue, master e o arquivo de uploads." >&2
  exit 1
fi

if [ -f "$BACKUP_DIR/manifest.sha256" ]; then
  echo "Verificando manifesto de integridade..."
  (
    cd "$BACKUP_DIR"
    sha256sum -c manifest.sha256
  )
fi

echo "Parando frontend e backend para restauracao consistente..."
docker compose stop frontend backend

echo "Restaurando bancos PostgreSQL..."
docker compose exec -T postgres pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < "$core_dump"
docker compose exec -T postgres-albergue pg_restore \
  -U "$POSTGRES_ALBERGUE_USER" \
  -d "$POSTGRES_ALBERGUE_DB" \
  --clean --if-exists --no-owner --no-privileges \
  < "$albergue_dump"
docker compose exec -T postgres-master pg_restore \
  -U "$POSTGRES_MASTER_USER" \
  -d "$POSTGRES_MASTER_DB" \
  --clean --if-exists --no-owner --no-privileges \
  < "$master_dump"
if [ -n "$escola_dump" ]; then
  docker compose exec -T postgres-escola pg_restore \
    -U "$POSTGRES_ESCOLA_USER" \
    -d "$POSTGRES_ESCOLA_DB" \
    --clean --if-exists --no-owner --no-privileges \
    < "$escola_dump"
else
  echo "Backup anterior ao banco da Escola; preparando migracao automatica a partir do core restaurado..."
  docker compose exec -T postgres-escola psql \
    -U "$POSTGRES_ESCOLA_USER" \
    -d "$POSTGRES_ESCOLA_DB" \
    -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo "Restaurando uploads..."
docker run --rm -i \
  -v iedc_uploads:/uploads \
  alpine:3.20 \
  sh -c "find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xzf - -C /uploads" \
  < "$uploads_archive"

echo "Subindo servicos..."
docker compose up -d backend frontend

write_restore_status "success" "Restauracao concluida e servicos reiniciados."
echo "Restauracao concluida a partir de: $BACKUP_DIR"
