#!/bin/sh
# First empty volume only (Compose init). Does not run again on an existing data dir.
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
touch "$PGDATA/.speedsalon_seed_started"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /db/migrations/001_schema.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -f /db/seed/001_fixture.sql

mode="${SEED_MODE:-bulk}"
if [ "$mode" = "fixture" ]; then
  echo "init: SEED_MODE=fixture (skipping bulk)"
else
  echo "init: loading bulk seed (first start can take several minutes)"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -f /db/seed/002_bulk.sql
fi

touch "$PGDATA/.speedsalon_seed_complete"
echo "init: seed complete ($mode)"
