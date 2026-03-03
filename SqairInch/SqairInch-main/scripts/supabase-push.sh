#!/usr/bin/env bash
# Push Supabase migrations using direct DB URL.
# Loads SUPABASE_DB_URL or SUPABASE_DB_PASSWORD from apps/shopify/.env.local if not set.
# Usage: ./scripts/supabase-push.sh
# Or:    SUPABASE_DB_PASSWORD='your-password' ./scripts/supabase-push.sh

set -e
cd "$(dirname "$0")/.."

PROJECT_REF="cpenurfjytetzlisjmgl"
ENV_LOCAL="apps/shopify/.env.local"

# Always load SUPABASE_DB_* from .env.local when present (so pooler URL overrides direct)
if [ -f "$ENV_LOCAL" ]; then
  set -a
  while IFS= read -r line; do
    [[ "$line" =~ ^SUPABASE_DB_[A-Z_]+= ]] && export "$line"
  done < <(grep -E '^SUPABASE_DB_' "$ENV_LOCAL" || true)
  set +a
fi

if [ -n "$SUPABASE_DB_URL" ]; then
  DB_URL="$SUPABASE_DB_URL"
elif [ -n "$SUPABASE_DB_PASSWORD" ]; then
  DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
else
  echo "Set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in $ENV_LOCAL or in the environment."
  exit 1
fi

supabase db push --db-url "$DB_URL"
