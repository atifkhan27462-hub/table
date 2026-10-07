#!/bin/sh
# -----------------------------------------------------------------------------
# Automated PostgreSQL Production Backup Script
# Creates timestamped, gzip-compressed database dumps and prunes old archives
# -----------------------------------------------------------------------------

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="smart_table_backup_${TIMESTAMP}.sql.gz"
TARGET_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated database backup: ${FILENAME}..."

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_SERVER:-db}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-smart_table}" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "${TARGET_PATH}"

FILESIZE=$(ls -lh "${TARGET_PATH}" | awk '{print $5}')
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully. Size: ${FILESIZE}"

# Prune archives older than retention threshold
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "smart_table_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup and rotation finished cleanly."
