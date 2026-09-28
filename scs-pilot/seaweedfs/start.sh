#!/bin/sh
# SeaweedFS start for the SCS pilot: writes the store's identity file from the
# environment, then runs the store. No credential is committed.
#
# AAB-PLATFORM-01, amendment of 2026-09-28, section 1: three identities, each
# with its own credential.
#   scs-admin   everything; held only by this container and objectstore-init
#   scs-api     Read and Write on the evidence bucket only
#   scs-backup  Read and List on the evidence bucket only
# The bucket policy that removes everything but writing new objects from
# scs-api is attached by objectstore-init (section 3).
#
# It refuses to start (build plan, decision 1, and section 1) when:
#   - any S3_OVERRIDE_* value is present: the override credential is never
#     configured in the store in normal operation (section 4);
#   - a credential is missing, still a change-me placeholder, has a secret
#     shorter than 16 characters, or contains characters outside
#     [A-Za-z0-9._~+/=-];
#   - two identities share an access key or a secret.
#
# docker-compose.dev.yml may also set SCS_TEST_S3_API_* and SCS_TEST_S3_BACKUP_*,
# which add two test identities scoped to scs-idt-* buckets, for the tests on
# the host. The country stack (docker-compose.yml alone) never sets them.
set -eu

fail() {
  echo "seaweedfs refused to start: $*" >&2
  exit 1
}

for name in $(env | sed -n 's/^\(S3_OVERRIDE_[A-Za-z0-9_]*\)=.*/\1/p'); do
  eval "value=\${$name}"
  if [ -n "$value" ]; then
    fail "$name is set. The override credential is never configured in the store in normal operation (AAB-PLATFORM-01, amendment of 2026-09-28, section 4)."
  fi
done

bucket="${S3_BUCKET:-}"
case "$bucket" in
  "" ) fail "S3_BUCKET is not set." ;;
  scs-idt-*) fail "S3_BUCKET must not start with scs-idt-: that prefix is reserved for the test identities." ;;
esac
echo "$bucket" | grep -Eq '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' || fail "S3_BUCKET is not a valid bucket name."

keys=""
secrets=""
check() { # check <variable prefix>
  eval "key=\${$1_ACCESS_KEY_ID:-}"
  eval "secret=\${$1_SECRET_ACCESS_KEY:-}"
  [ -n "$key" ] || fail "$1_ACCESS_KEY_ID is not set."
  [ -n "$secret" ] || fail "$1_SECRET_ACCESS_KEY is not set."
  case "$key$secret" in *change-me*) fail "$1 still holds a change-me placeholder." ;; esac
  [ "${#secret}" -ge 16 ] || fail "$1_SECRET_ACCESS_KEY is shorter than 16 characters."
  for v in "$key" "$secret"; do
    echo "$v" | grep -Eq '^[A-Za-z0-9._~+/=-]+$' || fail "$1 holds a character outside [A-Za-z0-9._~+/=-]."
  done
  case " $keys " in *" $key "*) fail "$1_ACCESS_KEY_ID is the same as another identity's." ;; esac
  case " $secrets " in *" $secret "*) fail "$1_SECRET_ACCESS_KEY is the same as another identity's." ;; esac
  keys="$keys $key"
  secrets="$secrets $secret"
}

identity() { # identity <name> <variable prefix> <actions JSON>
  eval "key=\${$2_ACCESS_KEY_ID}"
  eval "secret=\${$2_SECRET_ACCESS_KEY}"
  printf '{"name":"%s","credentials":[{"accessKey":"%s","secretKey":"%s"}],"actions":%s}' "$1" "$key" "$secret" "$3"
}

check S3_ADMIN
check S3_API
check S3_BACKUP
identities="$(identity scs-admin S3_ADMIN '["Admin"]'),$(identity scs-api S3_API "[\"Read:$bucket\",\"Write:$bucket\"]"),$(identity scs-backup S3_BACKUP "[\"Read:$bucket\",\"List:$bucket\"]")"

if [ -n "${SCS_TEST_S3_API_ACCESS_KEY_ID:-}${SCS_TEST_S3_BACKUP_ACCESS_KEY_ID:-}" ]; then
  check SCS_TEST_S3_API
  check SCS_TEST_S3_BACKUP
  identities="$identities,$(identity scs-test-api SCS_TEST_S3_API '["Read:scs-idt-*","Write:scs-idt-*"]'),$(identity scs-test-backup SCS_TEST_S3_BACKUP '["Read:scs-idt-*","List:scs-idt-*"]')"
fi

umask 077
printf '{"identities":[%s]}' "$identities" > /tmp/s3.json
exec weed server -dir=/data -s3 -s3.port=8333 -s3.config=/tmp/s3.json -master.volumeSizeLimitMB=64 -volume.max=64
