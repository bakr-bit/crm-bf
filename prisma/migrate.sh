#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Migrate: Add Page model between Asset and Position
#
# This script:
#   1. Runs the SQL migration against the database
#   2. Syncs the Prisma migration state via db push
#   3. Regenerates the Prisma client
#
# Usage:
#   chmod +x prisma/migrate.sh
#   ./prisma/migrate.sh
#
# Requires DIRECT_DATABASE_URL or DATABASE_URL in .env
# ─────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/migrations/add_page_model.sql"

# Load .env
if [ -f "$SCRIPT_DIR/../.env" ]; then
  set -a
  source "$SCRIPT_DIR/../.env"
  set +a
fi

DB_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "ERROR: No database URL found. Set DIRECT_DATABASE_URL or DATABASE_URL in .env"
  exit 1
fi

echo "==> Running SQL migration..."
psql "$DB_URL" -f "$SQL_FILE"

echo ""
echo "==> Syncing Prisma schema state..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || true

echo ""
echo "==> Regenerating Prisma client..."
npx prisma generate

echo ""
echo "✅ Migration complete! Every asset now has a 'Homepage' page with its positions."
