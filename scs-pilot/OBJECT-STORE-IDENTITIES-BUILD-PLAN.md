# Object store identities — build plan (`TODO(object-store-credentials)`)

**Status:** BUILD PLAN — APPROVED 2026-09-28, WITH THE THREE DECISIONS RECORDED BELOW — BUILT 2026-09-28, IN ONE PR; THE PROOF RECORD FOLLOWS (DECISION 3)
**Builds:** the AAB-PLATFORM-01 amendment of 2026-09-28 (`governance/workstream-b/AAB-PLATFORM-01-EVIDENCE-OBJECT-STORE-CANONICAL-CONTRACT-2026-09-25.md`, sections 1 to 7), in the SCS pilot.
**Removes, when it merges:** `TODO(object-store-credentials)` from the code, `.env.example` and the CAP-04 and CAP-05 READMEs. The roadmap and stock-take are updated in a governance PR afterwards.
**Shape:** **one PR.** The credentials, the setup step, the startup checks, the read check, backup and restore, and CI all change together. A partial change would break the backup proof or the isolation job.

## What exists today

- **One S3 identity,** `scs-api`, with `Admin, Read, Write, List, Tagging`. It is written by `docker-compose.yml`'s `seaweedfs` command from `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, and the same pair is given to the `api` service.
- **The API creates the bucket** at startup (`index.ts` calls `ensureBucket`). The bucket has no Object Lock, no versioning and no policy.
- **Five places read from the store, and every one of them already re-hashes the bytes,** each in its own code:

  | Where | What it reads | How it checks today |
  |---|---|---|
  | `capabilities/cap-08/read-package.ts` | package integrity | Re-hashes the bytes: `EVIDENCE_CHANGED` or `EVIDENCE_OBJECT_MISSING` |
  | `capabilities/cap-08/request-compilation.ts` | evidence files cited when a package is compiled | Re-hashes: `EVIDENCE_INTEGRITY_FAILED`, and the package is not compiled |
  | `platform/renditions/routes.ts` | renditions | Re-hashes: `RENDITION_INTEGRITY_FAILED` |
  | `ops/verify-integrity.ts` | the integrity check | Re-hashes and reports |
  | `ops/object-store-archive.ts` | backup and restore | Export re-hashes against the key; import reads back |

- **Backup and restore run in one-off `api` containers** (`backup/lib.mjs`, `runApiTool`), so they use the API's credentials.
- **The tests use one disposable admin identity** (`SCS_TEST_S3_*`) and a fresh bucket per test file. Three CAP-08 tests simulate tampering and loss by overwriting or deleting objects directly (`cap-08-packages.test.ts`, lines 501, 504, 723, 729, 779 and 788).
- **CI** writes the SeaweedFS identity file in `.github/workflows/test.yml` (`scs-ci`, admin). The isolation job and the backup proof (`prove-backup-restore.mjs`, line 354) each write a throwaway `.env` with the single S3 pair.

## The changes

### 1. Identities and configuration

- **`.env` (and `.env.example`):** `S3_ADMIN_ACCESS_KEY_ID` / `S3_ADMIN_SECRET_ACCESS_KEY`, `S3_API_…` and `S3_BACKUP_…` replace `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. `S3_BUCKET` stays.
- **The identity file** (the `seaweedfs` command in `docker-compose.yml`) defines three identities:
  - `scs-admin`: `Admin`;
  - `scs-api`: `Read:<bucket>`, `Write:<bucket>`;
  - `scs-backup`: `Read:<bucket>`, `List:<bucket>`.

  It is still generated from `.env` at container start, so no credential is committed.
- **Refusals.** SeaweedFS will not start if any of the six values is missing, is still `change-me`, has a secret shorter than 16 characters, or if any two access keys or any two secrets are equal. The check is done by the container's start command, the same way `migrate` checks the database password.
- **The `api` service gets only `S3_API_…`.** Its environment names no admin or backup variable.

### 2. The setup step: `objectstore-init`

- **A new one-off service,** `objectstore-init`, like `migrate`. It runs `node dist/ops/object-store-setup.js` from the api image with the admin credential. `api` depends on it completing successfully.
- **When the bucket does not exist, it:**
  1. creates the bucket with Object Lock enabled;
  2. sets the default retention to **GOVERNANCE, 2,192 days**;
  3. attaches the bucket policy of the amendment's section 3. The principal is `arn:aws:iam::000000000000:user/scs-api`, never a bare name.
- **Every time it runs, it** reads back and verifies the versioning, the Object Lock configuration and the policy, comparing the policy as normalised JSON.
- **When the bucket already exists but differs, it refuses.** That covers no Object Lock, a different retention mode or period, and a missing or changed policy. It exits non-zero and repairs nothing. A changed configuration is a signal to investigate, not something to overwrite silently (decision 2).

### 3. The API's startup checks

`ensureBucket` is removed from the API. At startup the API refuses to start unless:
- `S3_API_ACCESS_KEY_ID` and `S3_API_SECRET_ACCESS_KEY` are set;
- the bucket exists, with versioning `Enabled` and Object Lock `Enabled` in `GOVERNANCE` mode for at least 2,192 days. `COMPLIANCE` mode, or a shorter period, is refused;
- **its credential is the scoped one:** `ListObjectsV2` on the bucket must be refused with 403. A credential that can list is the admin's or the backup's.
- **the policy is enforced.** The API attempts `PutObjectRetention` on a random, nonexistent key and requires a 403. It needs checking in the build that SeaweedFS checks authorisation before the key's existence. **If it does not, this check is dropped, and the policy is verified by `objectstore-init` alone.**

### 4. Every read is verified

- **`ObjectStore.get()` is replaced by `read(key)`,** which returns one of:
  - `{ state: "INTACT", bytes }`;
  - `{ state: "MISSING" }`;
  - `{ state: "CHANGED", actualSha256 }`.

  **What this changes:** today every read is checked, but only because each of the five callers remembered to check. The re-hash moves into the store client, and the type has no "unchecked bytes" case. So a new caller cannot skip the check, and the amendment's guarantee is held by the store client rather than by each caller.
- **The five callers keep their current outcomes.** `EVIDENCE_CHANGED`, `EVIDENCE_OBJECT_MISSING` and `RENDITION_INTEGRITY_FAILED` are reported exactly as today, and the integrity check reports as today. **The three CAP-08 tamper tests must pass unchanged,** as the regression check.
- `putIfAbsent` is unchanged: the conditional write, then a size check on an existing object.

### 5. Backup and restore

- **Export runs with the backup identity.** `runApiTool` gains a `credentials` option that swaps the S3 variables for that one run.
- **Export must include every object the database records.** The integrity check already confirms each one is in the store and re-hashes. In addition, `backup.mjs` compares the exported keys with the database's `scs.evidence_object` and `scs.rendition` digests, and fails when any is missing from the export.
- **Restore runs `objectstore-init` first,** then imports with the API identity. The existing checks against the manifest and the read-back after import stay.

### 6. Tests (the probes of 2026-09-28, as CI assertions)

**Environment.** Test buckets take random names, but a scoped identity names its bucket. So the credential tests use one fixed, locked bucket, `scs-cred-test`, with random object keys per run. Its cleanup deletes the run's versions with the admin identity and an explicit governance override. That is the path the contract discloses, so the cleanup exercises it too. CI's SeaweedFS config adds `scs-cred-test-api` and `scs-cred-test-backup`, scoped to that bucket. Locally, `docker-compose.dev.yml` adds the same test identities. The production compose file never contains them.

**New test files:**

| File | Asserts |
|---|---|
| `integration/object-store-identities.test.ts` | The API identity may put, head and get. It is refused: creating a bucket, listing, another bucket, deleting an object or a version, lock, versioning or policy changes, retention, legal hold, and the governance override. The backup identity may list and get, and is refused every write and delete, including batch deletes. A plain delete of a locked version is refused for every identity. **The admin with an explicit governance override can delete** (the disclosed limit). An overwrite adds a version and keeps the original. **A policy naming `scs-api` by bare name is not enforced:** a store upgrade that changes this is noticed |
| `integration/object-store-setup.test.ts` | Setup creates the bucket correctly and a second run passes. It refuses: an existing bucket without Object Lock, a weakened retention, a COMPLIANCE-mode bucket, and a missing or altered policy |
| `integration/object-store-startup.test.ts` | The API refuses to start: without its credential; with no bucket; with no lock or a wrong retention; given the admin or backup credential (the listing canary); and when the policy is not enforced. **The store's start command refuses any `S3_OVERRIDE_*` value** (decision 1) |
| Changes to existing tests | `read()` returns `CHANGED` and `MISSING` correctly. The three CAP-08 tamper tests pass unchanged |

**Jobs:**
- **The isolation job** writes the six new values into its throwaway `.env`.
- **The backup proof** (`prove-backup-restore.mjs`) writes them too, and gains a step: **an export attempted with the API identity fails** (it cannot list), so the proof shows backup truly needs the backup identity.

### 7. Documentation

- `.env.example`, the comments in `docker-compose.yml`, `README.md`, `backup/README.md`, and the CAP-04 and CAP-05 READMEs.
- `TODO(object-store-credentials)` is removed from the code.
- **Existing local stacks:** their bucket has no Object Lock, so setup refuses it. The fix is `docker compose down -v` for the SeaweedFS volume. The pilot holds no real data, and this is documented.

## Decisions (approved by the Platform Owner, 2026-09-28)

1. **The override credential is not configured in the store in normal operation.** It exists only with its custodian. Using it means adding it to the store's configuration for that one use, which is visible, auditable and deliberate.
   - **This PR creates no override identity.**
   - **The store refuses to start if any `S3_OVERRIDE_*` value is present.** That refusal is itself a CI-tested assertion.
2. **Refuse, do not repair.** If an existing bucket's lock or policy has drifted, setup refuses and repairs nothing, and an operator investigates. **A drifted lock or policy on a production store is a security incident, not a configuration drift to correct automatically.** The operator must understand what changed, and why, before anything is restored. Silent repair would be worse than a clear failure.
3. **A proof record follows the build.** After the build merges, a short proof record in `governance/workstream-b/` marks the amendment `behaviourally proven`, following the AAB-PLATFORM-09 pattern. **The roadmap and stock-take are updated in the same PR as the proof record.** The proof record cites the CI run on the merge commit, not local runs.

**File names.** The repository's `.gitignore` ignores every path containing `credentials`, as a guard against committing secrets. So new files are named `…-identities…`, never `…-credentials…`, and the guard stays as it is.

## What this does not do

- It defines no retrieval endpoint and no read access (AAB-PLATFORM-01, open gap).
- It defines no governance for the override credential, and provides no path for erasure (open gap).
- It does not extend retention from a statement's date (open gap).
- It does not restore an overwritten object's original version (open gap).
- It does not change the `SCS-PLATFORM` naming in errors (the naming rule).
