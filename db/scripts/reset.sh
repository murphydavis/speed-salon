#!/bin/sh
set -eu
psql -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${PGDATABASE} WITH (FORCE);"
psql -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE ${PGDATABASE};"
psql -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
  -f /db/migrations/001_schema.sql
