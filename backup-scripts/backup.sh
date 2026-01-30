#!/usr/bin/env bash

set -e # Stop if any command fails

# Configuration : Environment variables
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pokedex}"
DB_USER="${DB_USER:-trainer}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Generate back up file 
TIMESTAMP=$(date +%Y-%m%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${$TIMESTAMP}.sql"


echo "PostgreSQL backup script"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}"
echo "Timestamp: ${TIMESTAMP}"
echo "Backup file: ${BACKUP_FILE}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"


echo "Starting backup..."


PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F p \
  -f "${BACKUP_FILE}"


# -h : Host (postgres container)
# -p : Port (5432)
# -U : Username (trainer)
# -d : Database name (pokedex)
# -F p : Format = plain SQL
# -f : Output file



echo "Compress backup"
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"


# Check if backup was created
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "Backup successful: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "Backup failed!!"
  exit 1
fi 



# Cleanup old backups 
echo "Cleaning up old backups (keeping last ${KEEP_DAYS} days)..."

find "${BACKUP_DIR}" \
  -name "${DB_NAME}_*.sql.gz" \
  -type -f \
  -mtime +{KEEP_DAYS} \ 
  -delete

# -mtime +7 - Modified more than 7 days ago
# -delete - Delete them

echo "Current backups:"
ls -lh "${BACKUP_DIR}"

echo "==================="
echo "Backup completed successfully!"
echo "==================="



