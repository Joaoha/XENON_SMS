#!/bin/bash
# Usage: ./scripts/run-backup.sh <daily|weekly|monthly>
# Requires BACKUP_SECRET and optionally APP_URL environment variables.

set -euo pipefail

PERIOD="${1:-daily}"
APP_URL="${APP_URL:-http://localhost:3000}"
SECRET="${BACKUP_SECRET:?BACKUP_SECRET environment variable is required}"

if [[ "$PERIOD" != "daily" && "$PERIOD" != "weekly" && "$PERIOD" != "monthly" ]]; then
  echo "Error: period must be daily, weekly, or monthly"
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting $PERIOD backup..."

RESPONSE=$(curl -sf -X POST "$APP_URL/api/backup" \
  -H "Content-Type: application/json" \
  -d "{\"period\":\"$PERIOD\",\"secret\":\"$SECRET\"}")

if [ $? -eq 0 ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete: $RESPONSE"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup FAILED"
  exit 1
fi
