#!/bin/sh
set -eu
psql -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
  -f /db/seed/001_fixture.sql
