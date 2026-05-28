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
BACKUP_DIR="${1:-}"

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

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado." >&2
  exit 1
fi

cd "$PROJECT_DIR"

db_dump="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-db-*.dump' | sort | tail -n 1)"
uploads_archive="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'iedc-uploads-*.tar.gz' | sort | tail -n 1)"

if [ -z "$db_dump" ] || [ -z "$uploads_archive" ]; then
  echo "Backup incompleto. Esperado: iedc-db-*.dump e iedc-uploads-*.tar.gz." >&2
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

echo "Restaurando banco PostgreSQL..."
docker compose exec -T postgres pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < "$db_dump"

echo "Restaurando uploads..."
docker run --rm -i \
  -v iedc_uploads:/uploads \
  alpine:3.20 \
  sh -c "find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xzf - -C /uploads" \
  < "$uploads_archive"

echo "Subindo servicos..."
docker compose up -d backend frontend

echo "Restauracao concluida a partir de: $BACKUP_DIR"
