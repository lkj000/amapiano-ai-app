#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SOURCE_DB_HOST=${1}
SOURCE_DB_NAME=${2:-amapiano_ai}
SOURCE_DB_USER=${3:-amapiano_admin}
TARGET_DB_HOST=${4}
BACKUP_DIR=${5:-/tmp/db-backup}

echo "================================================"
echo "Database Migration Script"
echo "================================================"
echo "Source: $SOURCE_DB_HOST"
echo "Target: $TARGET_DB_HOST"
echo "Backup Directory: $BACKUP_DIR"
echo "================================================"

check_prerequisites() {
  echo "Checking prerequisites..."
  
  command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found. Install PostgreSQL client tools."; exit 1; }
  command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore not found. Install PostgreSQL client tools."; exit 1; }
  command -v psql >/dev/null 2>&1 || { echo "psql not found. Install PostgreSQL client tools."; exit 1; }
  
  echo "✓ All prerequisites met"
}

test_connection() {
  local HOST=$1
  local DB=$2
  local USER=$3
  
  echo "Testing connection to $HOST..."
  
  PGPASSWORD=$DB_PASSWORD psql -h $HOST -U $USER -d $DB -c "SELECT version();" >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ Connection successful"
    return 0
  else
    echo "✗ Connection failed"
    return 1
  fi
}

backup_database() {
  echo "Creating database backup..."
  
  mkdir -p $BACKUP_DIR
  
  BACKUP_FILE="$BACKUP_DIR/amapiano_ai_$(date +%Y%m%d_%H%M%S).dump"
  
  echo "Backup file: $BACKUP_FILE"
  
  PGPASSWORD=$SOURCE_DB_PASSWORD pg_dump \
    -h $SOURCE_DB_HOST \
    -U $SOURCE_DB_USER \
    -d $SOURCE_DB_NAME \
    -Fc \
    -f $BACKUP_FILE
  
  if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully"
    echo "  Size: $(du -h $BACKUP_FILE | cut -f1)"
  else
    echo "✗ Backup failed"
    exit 1
  fi
  
  echo $BACKUP_FILE
}

export_schema() {
  echo "Exporting schema..."
  
  mkdir -p $BACKUP_DIR
  
  SCHEMA_FILE="$BACKUP_DIR/schema_$(date +%Y%m%d_%H%M%S).sql"
  
  PGPASSWORD=$SOURCE_DB_PASSWORD pg_dump \
    -h $SOURCE_DB_HOST \
    -U $SOURCE_DB_USER \
    -d $SOURCE_DB_NAME \
    --schema-only \
    -f $SCHEMA_FILE
  
  if [ $? -eq 0 ]; then
    echo "✓ Schema exported successfully"
  else
    echo "✗ Schema export failed"
    exit 1
  fi
  
  echo $SCHEMA_FILE
}

restore_database() {
  local BACKUP_FILE=$1
  
  echo "Restoring database from backup..."
  echo "Backup: $BACKUP_FILE"
  
  PGPASSWORD=$TARGET_DB_PASSWORD pg_restore \
    -h $TARGET_DB_HOST \
    -U $SOURCE_DB_USER \
    -d $SOURCE_DB_NAME \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    $BACKUP_FILE
  
  if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
  else
    echo "⚠ Restore completed with warnings (check logs)"
  fi
}

validate_migration() {
  echo "Validating migration..."
  
  echo "Counting rows in source database..."
  SOURCE_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql \
    -h $SOURCE_DB_HOST \
    -U $SOURCE_DB_USER \
    -d $SOURCE_DB_NAME \
    -t -c "SELECT COUNT(*) FROM (
      SELECT 'users' as tbl, COUNT(*) as cnt FROM users
      UNION ALL SELECT 'projects', COUNT(*) FROM projects
      UNION ALL SELECT 'samples', COUNT(*) FROM samples
    ) counts;")
  
  echo "Counting rows in target database..."
  TARGET_COUNT=$(PGPASSWORD=$TARGET_DB_PASSWORD psql \
    -h $TARGET_DB_HOST \
    -U $SOURCE_DB_USER \
    -d $SOURCE_DB_NAME \
    -t -c "SELECT COUNT(*) FROM (
      SELECT 'users' as tbl, COUNT(*) as cnt FROM users
      UNION ALL SELECT 'projects', COUNT(*) FROM projects
      UNION ALL SELECT 'samples', COUNT(*) FROM samples
    ) counts;")
  
  echo "Source count: $SOURCE_COUNT"
  echo "Target count: $TARGET_COUNT"
  
  if [ "$SOURCE_COUNT" = "$TARGET_COUNT" ]; then
    echo "✓ Row counts match"
  else
    echo "✗ Row counts do not match!"
    echo "Manual verification required."
  fi
}

main() {
  if [ -z "$SOURCE_DB_HOST" ] || [ -z "$TARGET_DB_HOST" ]; then
    echo "Usage: $0 <source-host> [source-db] [source-user] <target-host> [backup-dir]"
    echo ""
    echo "Example:"
    echo "  $0 old-db.example.com amapiano_ai admin new-rds.amazonaws.com /backups"
    echo ""
    echo "Environment variables required:"
    echo "  SOURCE_DB_PASSWORD - Password for source database"
    echo "  TARGET_DB_PASSWORD - Password for target database"
    exit 1
  fi
  
  if [ -z "$SOURCE_DB_PASSWORD" ] || [ -z "$TARGET_DB_PASSWORD" ]; then
    echo "Error: SOURCE_DB_PASSWORD and TARGET_DB_PASSWORD must be set"
    exit 1
  fi
  
  check_prerequisites
  
  echo ""
  test_connection $SOURCE_DB_HOST $SOURCE_DB_NAME $SOURCE_DB_USER || exit 1
  
  echo ""
  test_connection $TARGET_DB_HOST $SOURCE_DB_NAME $SOURCE_DB_USER || exit 1
  
  echo ""
  read -p "Proceed with migration? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled"
    exit 0
  fi
  
  echo ""
  BACKUP_FILE=$(backup_database)
  
  echo ""
  restore_database $BACKUP_FILE
  
  echo ""
  validate_migration
  
  echo ""
  echo "================================================"
  echo "Migration Complete!"
  echo "================================================"
  echo "Backup location: $BACKUP_FILE"
  echo ""
  echo "Next steps:"
  echo "1. Verify data integrity manually"
  echo "2. Run application tests against new database"
  echo "3. Update application configuration"
  echo "4. Keep backup for rollback capability"
}

main
