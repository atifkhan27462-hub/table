#!/bin/sh
# -----------------------------------------------------------------------------
# Database Disaster Recovery & Restore Script
# Restores a compressed SQL dump into PostgreSQL
# Usage: ./restore.sh <backup_file_path>
# -----------------------------------------------------------------------------

set -e

BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Error: Missing backup archive file path."
  echo "Usage: $0 /backups/smart_table_backup_YYYYMMDD_HHMMSS.sql.gz"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found."
  exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoring database from: ${BACKUP_FILE}..."

# Decompress and stream to psql
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_SERVER:-db}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-smart_table}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database restoration completed successfully!"
