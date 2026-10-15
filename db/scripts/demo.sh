#!/bin/sh
# Reload fixture + bulk into an already-running database (after db-reset).
set -eu
psql -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f /db/seed/001_fixture.sql
psql -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f /db/seed/002_bulk.sql
