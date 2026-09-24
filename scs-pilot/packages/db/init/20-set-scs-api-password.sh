#!/usr/bin/env bash
# Sets the scs_api login password from SCS_API_DB_PASSWORD.
#
# Passwords never live in migrations: migration 004 creates scs_api without
# one. Runs after 10-apply-migrations.sh (filename order), once, on an empty
# data volume. The password is passed to psql as a variable and quoted by psql
# (:'pw'), so it never appears in the SQL text or the process list.
#
# May be executed or sourced by the image's entrypoint, so it does not change
# shell options; every failure exits non-zero explicitly.

pw="${SCS_API_DB_PASSWORD:-}"

if [ -z "$pw" ]; then
  echo "20-set-scs-api-password: SCS_API_DB_PASSWORD is not set" >&2
  exit 1
fi
case "$pw" in
  change-me*)
    echo "20-set-scs-api-password: SCS_API_DB_PASSWORD is still the .env.example placeholder" >&2
    exit 1
    ;;
esac
if [ "${#pw}" -lt 16 ]; then
  echo "20-set-scs-api-password: SCS_API_DB_PASSWORD must be at least 16 characters" >&2
  exit 1
fi
if [ "$pw" = "${POSTGRES_PASSWORD:-}" ]; then
  echo "20-set-scs-api-password: SCS_API_DB_PASSWORD must differ from POSTGRES_PASSWORD" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v pw="$pw" <<'SQL' || {
ALTER ROLE scs_api PASSWORD :'pw';
SQL
  echo "20-set-scs-api-password: FAILED" >&2
  exit 1
}
echo "20-set-scs-api-password: scs_api password set"
