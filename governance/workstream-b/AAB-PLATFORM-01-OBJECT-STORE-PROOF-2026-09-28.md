# AAB-PLATFORM-01 — Evidence Object Store — Proof — 2026-09-28

**Status:** PROOF RECORD — PILOT STACK
**Authority:** RECORDS WHAT HAS BEEN VERIFIED ABOUT THE EVIDENCE OBJECT STORE (AAB-PLATFORM-01) IN THE SCS PILOT, AGAINST THE AMENDMENT OF 2026-09-28 (OBJECT STORE CREDENTIALS, OBJECT LOCK AND RETENTION), AND WHAT HAS NOT. Raises AAB-PLATFORM-01 to `behaviourally proven`, for what the tests below cover. Admits no capability and no data, appoints no custodian, authorises no use of the override credential, grants no production, commissioning or regulatory authority, and does not satisfy Gate D or close WP05.
**Evidence base:** `main` at `dbb2408`, the merge of pull request #65 (commit `4cdd990`), which built the amendment as planned in `scs-pilot/OBJECT-STORE-IDENTITIES-BUILD-PLAN.md` (PR #64). **CI run 36417985710, a `push` run on `main`: it tested `dbb2408` itself, the merge commit.** All three jobs passed (`test`, `isolation`, `backup-restore`). GitHub Actions, `ubuntu-24.04`, with the store pinned to SeaweedFS 4.47 and PostgreSQL 17.11.

## Scope and verdict

**The amendment of 2026-09-28** settled `TODO(object-store-credentials)` in the contract before any code: three identities, Object Lock in GOVERNANCE mode for six years, a bucket policy naming the API by ARN, a separately held override credential, overwrites versioned and detected, and the API's startup checks. **The build plan's decision 3** requires this record, citing the CI run on the merge commit, not local runs.

| The amendment's section | Verdict |
|---|---|
| 1. **Three identities:** admin, API (read and write on the evidence bucket only), backup (read and list only); no shared, missing or placeholder credential | **Proven** |
| 2. **Object Lock and retention:** GOVERNANCE mode, 2,192 days; a locked version cannot be deleted, or its retention shortened, without an explicit override | **Proven** |
| 3. **The bucket policy:** the API is denied every delete, and every lock, versioning, policy, retention and legal-hold change, and the governance override; named by ARN, because a bare name is not enforced | **Proven** |
| 4. **The override credential:** never configured in the store in normal operation | **Proven that it is not configured and cannot be:** the store refuses to start with any `S3_OVERRIDE_*` value. **Its custody and use are not provable here:** they are not yet defined (section 4 and "Limits") |
| 5. **Setup and the API's startup checks:** the setup step creates and verifies the locked bucket and its policy, and refuses, never repairs, a bucket that differs; the API refuses to start without its scoped credential, the lock or an enforced policy | **Proven** |
| 6. **Overwrites accepted, versioned and detected;** every read verified; backup and restore on the scoped identities | **Proven** |
| 7. **The tested store behaviour:** every probe of 2026-09-28 is now a CI assertion | **Proven, for SeaweedFS 4.47** |

**This replaces `TODO(object-store-credentials)` as a condition for real data.** It is gone from the code (PR #65). **Real data is still blocked,** by a condition the amendment itself sets: the override credential's governance "must be defined before any real data is admitted" (section 4). Nothing is admitted by this record. Admitting data remains a separate decision (AAB-PLATFORM-06).

## How it is verified

- **Against the pinned store,** SeaweedFS 4.47, started in CI with an admin identity and two test identities scoped to `scs-idt-*` buckets (`.github/workflows/test.yml`). Every test bucket is fresh, and is removed afterwards by the admin identity with an explicit governance override: the path the contract discloses, so the cleanup exercises it too.
- **By the platform's own code:** the store client and its startup checks (`platform/evidence-objects/object-store.ts`), the setup step (`platform/evidence-objects/object-store-setup.ts`, run by `ops/object-store-setup.ts`), the store's start script (`scs-pilot/seaweedfs/start.sh`), and the backup tools (`ops/object-store-archive.ts`, `scs-pilot/backup/`).
- **All paths below are under `scs-pilot/packages/api/src/`,** except the start script, its refusal checks, and the backup proof, which are under `scs-pilot/`. Test names are quoted as they appear in the files.
- **One placement differs from the build plan's table.** The plan put the `S3_OVERRIDE_*` refusal in `object-store-startup.test.ts`. The refusal is made by the store's start script, so it is checked on the real image, by the CI job `isolation` (section 4). This record cites it where it is.

## 1. Three identities

| Test | What it shows |
|---|---|
| `integration/object-store-identities.test.ts`: "API identity: may put, head and get on the evidence bucket" | The API stores an object and reads it back through the verified read: `INTACT`. |
| `integration/object-store-identities.test.ts`: "API identity: may not create a bucket, list the evidence bucket or reach another bucket" | 403 for each. The API cannot create the bucket it uses, list its contents, or write anywhere else. |
| `integration/object-store-identities.test.ts`: "backup identity: may list and get; every write and delete is refused, batch deletes key by key" | The backup identity lists and reads. A new object, an overwrite, a delete and a lock change are each 403. A batch delete returns 200 with the key refused (`AccessDenied`) and nothing deleted. |
| `integration/object-store-startup.test.ts`: "refuses without its own credential: only S3_API_* is read" | The API's configuration reads its own variables only. The admin's variables alone do not start it. |
| `seaweedfs/verify-start-refusals.mjs` (job `isolation`): the placeholder, short-secret, shared-key, shared-secret and unsafe-character cases | The store refuses to start on each (section 4's table). |
| The backup proof, step 4 (section 6) | An export attempted with the API's credential is refused: `AccessDenied`. Backup needs the backup identity. |

## 2. Object Lock and retention

| Test | What it shows |
|---|---|
| `integration/object-store-identities.test.ts`: "every stored version is locked in GOVERNANCE mode for six years" | A version stored by the API carries `GOVERNANCE`, retained until 2,192 days after it was stored, give or take a day. |
| `integration/object-store-identities.test.ts`: "a plain delete of a locked version is refused for every identity, the admin included" | 403 for the admin, the API and the backup identity alike. The version remains. |
| `integration/object-store-identities.test.ts`: "disclosed: the admin, with an explicit governance override, can delete a locked version (section 4)" | The admin, sending the override, deletes a locked version. **This is the disclosed limit:** the admin credential can override, so it is held as the override credential is. |
| `integration/object-store-setup.test.ts`: "creates the bucket locked, GOVERNANCE for 2,192 days, with the ARN policy; a second run verifies it and changes nothing" | The configuration read back from the store is exactly `GOVERNANCE`, 2,192 days. |
| `integration/object-store-startup.test.ts`: "refuses a retention shorter than 2,192 days, and COMPLIANCE mode" | 2,191 days, or COMPLIANCE mode, stops the API starting. |

## 3. The bucket policy

| Test | What it shows |
|---|---|
| `integration/object-store-identities.test.ts`: "API identity: the bucket policy refuses every delete, lock, versioning, policy, retention and legal-hold change, and the governance override" | Nine requests, each refused: a delete (a delete marker), a version delete, a version delete with the override, weakening the default retention, suspending versioning, replacing the policy, removing it, shortening an object's retention, and a legal hold. The version is still there afterwards. |
| `integration/object-store-identities.test.ts`: "a policy naming the API by bare name is accepted by the store and not enforced" | **The reason for the ARN.** The same policy, naming the identity by its bare name, is accepted (`ALLOW`), and the API can then delete. A store upgrade that changes this is noticed. |
| `integration/object-store-identities.test.ts`: "SeaweedFS 4.47: setting retention on a missing object is 403 when the policy binds the API, 404 when it does not" | **What the API's startup check relies on:** the store checks the policy before it looks for the object. If an upgrade reverses that order, this test fails, instead of the check going silently wrong. |
| `integration/object-store-setup.test.ts`: "refuses a bucket whose policy was removed", "refuses a bucket whose policy was altered", "refuses a bucket whose policy names the API by bare name" | A missing, weakened or bare-name policy is refused by the setup step. |
| `integration/object-store-setup.test.ts`: "normalisePolicy compares by meaning: order and one-element lists do not matter" | **Why the comparison is not string equality:** SeaweedFS 4.47 rewrites a one-element list as a string when it stores a policy. The setup step compares by meaning, so a correct bucket is never refused for its form. |

## 4. The override credential

**It is not configured in the store, and the store will not start with it** (build plan, decision 1). `seaweedfs/verify-start-refusals.mjs`, CI job `isolation`, step "The object store refuses override, placeholder, short and shared credentials", on the real image. "the object store refused all 8 cases":

| # | Case | Refused with |
|---|---|---|
| 1 | An override credential set in the container's environment | `S3_OVERRIDE_ACCESS_KEY_ID is set` |
| 2 | An override secret set where compose reads `.env` and the shell | `S3_OVERRIDE_SECRET_ACCESS_KEY is set` |
| 3 | A change-me placeholder | `S3_API still holds a change-me placeholder` |
| 4 | A secret shorter than 16 characters | `S3_BACKUP_SECRET_ACCESS_KEY is shorter than 16 characters` |
| 5 | Two identities sharing an access key | `…is the same as another identity's` |
| 6 | Two identities sharing a secret | `…is the same as another identity's` |
| 7 | A credential with a character that could break the identity file | `S3_ADMIN holds a character outside [A-Za-z0-9._~+/=-]` |
| 8 | The test identities' bucket prefix as the evidence bucket | `reserved for the test identities` |

**Not proven, and not provable here:** who holds the override credential, what a use requires, and how a use is recorded. The contract has not yet defined them ("Contract gap: retention governance"). **In the pilot the credential is never used,** and a live use before its governance is defined would itself be a governance failure.

## 5. Setup and the API's startup checks

| Test | What it shows |
|---|---|
| `integration/object-store-setup.test.ts`: "creates the bucket locked, GOVERNANCE for 2,192 days, with the ARN policy; a second run verifies it and changes nothing" | First run: created, and no problems. Second run: not created, and no problems. |
| `integration/object-store-setup.test.ts`: "refuses an existing bucket without Object Lock", "refuses a COMPLIANCE-mode bucket" | Refused. |
| `integration/object-store-setup.test.ts`: "refuses a weakened retention, and does not repair it" | **Refuse, do not repair** (build plan, decision 2): the weakened retention is reported and left as found, for an operator to investigate. |
| `integration/object-store-startup.test.ts`: "starts: the API's scoped credential, against a bucket the setup step prepared" | No problems: the API may start. |
| `integration/object-store-startup.test.ts`: "refuses when the bucket does not exist: the API never creates it", "refuses a bucket without Object Lock" | Refused. |
| `integration/object-store-startup.test.ts`: "refuses the admin's or the backup's credential: a credential that can list is not the API's" | Given either credential, the API refuses to start: its listing is not refused. |
| `integration/object-store-startup.test.ts`: "refuses when the bucket policy is not enforced against the API" | A locked bucket with no policy: the retention canary gets 404, and the API refuses to start. |
| The backup proof, step 5 (section 6) | In the real stack, `objectstore-init`'s first run created the bucket, and every run verified the lock and the policy. |

## 6. Overwrites, verified reads, backup and restore

**Overwrites and reads:**

| Test | What it shows |
|---|---|
| `integration/object-store-identities.test.ts`: "an overwrite adds a new current version, keeps the original, and the verified read reports it CHANGED" | The API's credential, used outside the service, overwrites an object. The verified read reports `CHANGED`, with the actual digest. Two versions exist, and the earlier one still holds the original bytes. |
| `integration/evidence-objects.test.ts`: "the object store never overwrites: an object already under a key is left as it is" | The service's own conditional write never overwrites. |
| `integration/cap-08-packages.test.ts`: "verifyPackageIntegrity: a missing file → EVIDENCE_OBJECT_MISSING; changed bytes → EVIDENCE_CHANGED" | Package verification through the verified read: unchanged outcomes. |
| `integration/cap-08-packages.test.ts`: "EVIDENCE_INTEGRITY_FAILED: a cited file altered or missing in the object store" | Compilation refuses a changed or missing file: unchanged. |
| `integration/cap-08-packages.test.ts`: "rendition download: bytes changed or missing → RENDITION_INTEGRITY_FAILED, nothing returned; store unreachable → 503" | Rendition download through the verified read: unchanged. |
| `integration/integrity-links.test.ts`: "intact, with no actors file: every link, status record and registry record verifies against the registry, re-digests, and matches its receipt" | The integrity verifier, reading with the API's credential through the verified read. |

**The backup proof** (`backup/prove-backup-restore.mjs`), CI job `backup-restore`, on throwaway environments built from `dbb2408`. It uses three generated identities, and the stack's own setup step. Proof run `a42452`, outcome **PROVEN**, 20 steps:

| # | Step | Result in CI |
|---|---|---|
| 1 | Source: a governed chain created through the API, its package INTACT | PASS (package `6a648780-0eb2-40fa-8979-1cb5d9c4fa87`) |
| 2 | Backup | PASS. **The export runs as the backup identity,** and is checked to include every object the database records |
| 3 | Backup: roles, database, objects, configuration and source report all present | PASS (10 files, 2 objects) |
| 4 | **Refused: an export attempted with the API identity (it may not list the bucket)** | PASS: `object-store-archive export failed: AccessDenied` |
| 5 | **Source store: the setup step created the evidence bucket locked (GOVERNANCE 2,192 days), and every run verified the lock and the policy** | PASS: first run `created: true`, later run `created: false`, both `GOVERNANCE 2192 days`, policy `verified` |
| 6 | Restore: all migrations already applied, with matching checksums | PASS (24 already applied, latest 024) |
| 7 | Restore: every receipt verifies against its stored digest | PASS (20) |
| 8 | Restore: every package verifies against its stored digest | PASS (1) |
| 9 | Restore: every evidence file re-hashes to its recorded SHA-256 | PASS (1). **The restore runs the setup step first, and imports as the API identity** |
| 10 | Restore: every rendition re-hashes to its recorded SHA-256 | PASS (1) |
| 11 | Restore: every actor–party link and status record verifies against the key it names, as at its acceptance, and re-digests — before and after the rotation | PASS (2 links, 2 status records) |
| 12 | Restore: the public-key registry verifies — every registration, ceremony, signature and piece of evidence | PASS (3 registrations, 1 ceremony, no problems) |
| 13 | Restore: every table's row count and the database grants equal the source's | PASS (47 tables); the stored object keys equal the source's |
| 14 | Restored API: the package reads back byte-for-byte as compiled | PASS (`packageDigest` `sha256:31907dbb0ec17e99acfdc9ca4fe6d2be8da91adb49f7871976422b3def63a19a`, currency `CURRENT`). **The restored API passed its startup checks** |
| 15 | Restored API: verifyPackageIntegrity is INTACT, every check PASS | PASS (5 checks) |
| 16 | Restored API: the PDF rendition downloads and re-hashes to its recorded SHA-256 | PASS (110,381 bytes) |
| 17 | Restored API: the link reads back ACTIVE, with its digest and both status records | PASS |
| 18 | Restored API: a new statement signed with the retired key is refused | PASS: 422 `LINK_SIGNATURE_INVALID` |
| 19 | Refused: a backup with one altered byte, before anything is started | PASS: `restore refused: backup file objects/a7aade02… does not match SHA256SUMS` |
| 20 | Refused: a restore over an existing environment | PASS: `restore refused: compose project scs-proof-dst-a42452 is not fresh (6 containers, 2 volumes)` |

Steps 4 and 5 are new with this build. Steps 2, 9, 13 and 14 hold new checks within existing steps.

## 7. The full run

- **CI run 36417985710, job `test`:** 748 of 748 tests pass, including every test named above.
- **Job `isolation`:** all 20 required checks match the isolation model, for the country stack and with `docker-compose.dev.yml`, with the three identities in place. The store refused all 8 start cases (section 4).
- **Job `backup-restore`:** PROVEN, 20 steps (section 6).
- **Development runs are not the evidence here.** The same checks passed locally, on Docker Desktop, before the commit, and on pull request #65's own CI run (36412380179).

## Limits

- **The behaviour proven is SeaweedFS 4.47's.** Three things this record relies on are properties of that version: the store checks a policy before it looks for an object (403, not 404); it enforces a principal named by ARN and ignores one named by bare name; and it rewrites a stored policy's form. Each is asserted in CI, so an upgrade that changes one fails CI. But nothing here is proven for another store or another version.
- **The admin credential can override governance retention.** The separation between the admin and override credentials is one of custody, not of technical capability (section 4). Both must be held accordingly.
- **The override credential's governance is not defined:** who holds it, what a use requires, and how each use is recorded. **Until it is, it is never used, and real data cannot be admitted** (the amendment, section 4).
- **Erasure is not defined.** It is not defined what becomes of a record, or of a compiled package, that cites an erased object, or how an erasure reaches the backups ("Contract gap: retention governance").
- **An overwrite is detected, not blocked.** The original version is kept, but restoring it as the current one is not defined.
- **Retention runs from storage,** not from the date of the due diligence statement that cites an object. The sixth year is a buffer, and extending retention is not defined.
- **The scoped identities can list the store's bucket names.** They cannot reach another bucket's contents.
- **A setup step interrupted on its first run is refused on the next.** If the step stops after creating the bucket and before its lock configuration or policy is in place, its next run finds a bucket that differs and refuses it, as for any drift. In the pilot, which holds no real data, the fix is a new object store volume (`scs-pilot/README.md`). Not tested.
- **Backups sit outside Object Lock,** and hold every credential in `.env`, the admin's included (`scs-pilot/backup/README.md`). `TODO(backup-encryption)` still blocks live operation.
- **No retrieval endpoint, read access or upload role is defined** for evidence objects (open gaps of the contract).
- **Nothing is admitted.** AAB-PLATFORM-01 and every SCS capability stay `PROPOSED_NOT_ADMITTED`.
- **It is not an independent review.** The same author built and proved it.

## What this record does not establish

- It does not appoint a custodian for the override credential, or authorise any use of it
- It does not define erasure, or what an erasure leaves behind in records, packages or backups
- It does not establish the behaviour of any object store other than SeaweedFS 4.47
- It does not define retrieval, read access or who may upload
- It is not an independent review
- It admits no capability and no data, and does not alter commissioning status, satisfy Gate D, close WP05, or grant any production, commissioning or regulatory authority
