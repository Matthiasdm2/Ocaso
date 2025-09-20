#!/usr/bin/env sh
# apply-migrations.sh
# Tries to apply SQL files in supabase/migrations in order.
# Prefers supabase CLI if present, otherwise falls back to psql using DATABASE_URL.

set -e
MIGRATIONS_DIR="$(pwd)/supabase/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No migrations directory found at $MIGRATIONS_DIR"
  exit 1
fi

# If DATABASE_URL is set and psql is available, prefer psql (reliable and explicit)
if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  echo "Using psql to apply migrations"
  for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "Applying $f"
    psql "$DATABASE_URL" -f "$f"
  done
  exit 0
fi

# If psql isn't available, try the supabase CLI, but ensure it supports 'db query'
if command -v supabase >/dev/null 2>&1; then
  # check if the installed supabase CLI has the `db query` command
  if supabase db --help 2>&1 | grep -q "query"; then
    echo "Using supabase CLI to apply migrations (piping SQL into 'supabase db query')"
    for f in "$MIGRATIONS_DIR"/*.sql; do
      echo "Applying $f"
      supabase db query < "$f"
    done
    exit 0
  else
    echo "Supabase CLI present but does not support 'db query' on this version."
    echo "Either install psql and set DATABASE_URL, or upgrade the supabase CLI."
    exit 1
  fi
fi

echo "Neither psql (with DATABASE_URL) nor a compatible supabase CLI found. Install one or run migrations manually."
exit 1
