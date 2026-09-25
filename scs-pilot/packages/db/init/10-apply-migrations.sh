#!/usr/bin/env bash
# Applies packages/db/migrations/*.sql in filename order, as the owner /
# migration role (POSTGRES_USER), into POSTGRES_DB.
#
# Run by the postgres image from /docker-entrypoint-initdb.d once, on an empty
# data volume only. docker-compose.yml mounts the migrations at /scs/migrations.
# TODO(migration-runner): replace with a runner that records applied migrations.
#
# May be executed or sourced by the image's entrypoint, so it does not change
# shell options; every failure exits non-zero explicitly.

migrations_dir=/scs/migrations
shopt -s nullglob
files=("$migrations_dir"/*.sql)
if [ "${#files[@]}" -eq 0 ]; then
  echo "10-apply-migrations: no migrations found in $migrations_dir" >&2
  exit 1
fi

for file in "${files[@]}"; do
  echo "10-apply-migrations: applying $(basename "$file")"
  psql -v ON_ERROR_STOP=1 --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$file" || {
    echo "10-apply-migrations: FAILED on $(basename "$file")" >&2
    exit 1
  }
done
