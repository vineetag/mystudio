#!/usr/bin/env bash
# Run database migrations for a given app against its Supabase project.
#
# Usage:
#   ./scripts/setup-db.sh [app-name]
#
# Example:
#   ./scripts/setup-db.sh kids-stories
#
# Requires DATABASE_URL in apps/<app>/env.local — get it from:
#   Supabase Dashboard → Project Settings → Database → Connection string (URI)
#
# The script is idempotent: it tracks applied migrations in a _schema_migrations
# table and skips files that have already run.

set -euo pipefail

APP="${1:-kids-stories}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/$APP/.env.local"
MIGRATIONS_DIR="$REPO_ROOT/apps/$APP/supabase/migrations"

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo ""
echo "AppCrafter Studio — database setup"
echo "App: $APP"
echo "──────────────────────────────────"

# ── Preflight checks ──────────────────────────────────────────────────────────
[ -d "$REPO_ROOT/apps/$APP" ] || err "Unknown app '$APP'. Available apps: $(ls $REPO_ROOT/apps | tr '\n' ' ')"
[ -f "$ENV_FILE" ]            || err "$ENV_FILE not found.\n  Copy the example first: cp apps/$APP/.env.example apps/$APP/.env.local"
[ -d "$MIGRATIONS_DIR" ]      || err "No migrations directory found at $MIGRATIONS_DIR"

# ── Load env vars ─────────────────────────────────────────────────────────────
set -o allexport
# shellcheck disable=SC1090
source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
set +o allexport

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  err "DATABASE_URL is not set in $ENV_FILE

  Get it from your Supabase project:
    Dashboard → Settings → Database → Connection string → URI

  It looks like:
    postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

  Then add this line to $ENV_FILE:
    DATABASE_URL=postgresql://postgres.[ref]:[password]@..."
fi

# ── Check for psql ────────────────────────────────────────────────────────────
if ! command -v psql &> /dev/null; then
  echo ""
  err "psql is not installed.

  Install it with:
    macOS:  brew install postgresql
    Ubuntu: sudo apt-get install postgresql-client
    Windows: https://www.postgresql.org/download/windows/

  Then re-run this script."
fi

ok "psql found: $(psql --version | head -1)"
ok "Migrations dir: $MIGRATIONS_DIR"

# ── Create migration tracking table (idempotent) ──────────────────────────────
psql "$DATABASE_URL" -q <<'SQL'
create table if not exists public._schema_migrations (
  filename   text primary key,
  applied_at timestamptz default now()
);
SQL
ok "Migration tracking table ready"

# ── Run migrations ────────────────────────────────────────────────────────────
MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
  warn "No .sql files found in $MIGRATIONS_DIR"
  exit 0
fi

APPLIED=0
SKIPPED=0

for FILE in $MIGRATION_FILES; do
  FILENAME=$(basename "$FILE")

  ALREADY_APPLIED=$(psql "$DATABASE_URL" -t -c \
    "select count(*) from public._schema_migrations where filename = '$FILENAME';" \
    | tr -d ' ')

  if [ "$ALREADY_APPLIED" -eq "1" ]; then
    echo "  skip  $FILENAME (already applied)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -n "  apply $FILENAME ... "
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$FILE" -q; then
    psql "$DATABASE_URL" -q -c \
      "insert into public._schema_migrations (filename) values ('$FILENAME');"
    echo -e "${GREEN}done${NC}"
    APPLIED=$((APPLIED + 1))
  else
    echo -e "${RED}FAILED${NC}"
    err "Migration $FILENAME failed. Fix the error above and re-run — previously applied migrations will be skipped."
  fi
done

echo ""
ok "Done — $APPLIED applied, $SKIPPED skipped"
echo ""
