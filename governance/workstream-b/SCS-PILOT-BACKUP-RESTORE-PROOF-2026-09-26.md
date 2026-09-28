# SCS Pilot — Backup and Restore Proof — 2026-09-26

**Status:** PROOF RECORD — PILOT STACK
**Authority:** RECORDS WHAT HAS BEEN VERIFIED ABOUT BACKING UP AND RESTORING AN SCS PILOT ENVIRONMENT, ON WHICH PLATFORM, AND WHAT HAS NOT. Admits no capability, grants no production, commissioning or regulatory authority, changes the status of no control in the Phase-1 sovereignty register, and does not satisfy Gate D or close WP05.
**Evidence base:** branch `implementation/scs-vertical-proof` at `aa8c98f` (the procedure and its proof). CI run 36227701973, a pull request run: it tested `a36de50`, the pull request merge of `aa8c98f` with `main` (`46995e9`). GitHub Actions, `ubuntu-24.04`, Docker 28.0.4, Linux 6.17.

## Update of 2026-09-28: the steps since this record

**This record is not rewritten.** It proves what it says, at `aa8c98f`, with the 14 steps below. The proof has gained steps since, and runs every one on every pull request:
- **16 steps** from the representation path's PR 7 (`bc6c4b9`): every actor–party link and status record verifies against its signer's key and re-digests after the restore, and the restored API reads the link back.
- **17 steps** from the signing-key history PR 6 (`d5c7300`): the link officer's key is registered in the public-key registry (AAB-PLATFORM-09) instead of the actors file, and the restored registry verifies: every registration, ceremony, signature and piece of evidence.
- **18 steps** from the signing-key history PR 7: the key is rotated before the backup, and a second link is signed with the new key. After the restore, both links verify against their historical keys, the retired one included, and the restored API refuses a new statement signed with the retired key.

The steps as they now stand, and the runs that prove them, are recorded in `AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`. The number of migrations the restore reports has grown in the same way (24, at `80b3c14`).

## Scope and verdict

The proof covers one country environment, the pilot stack defined by
`scs-pilot/docker-compose.yml`: backing it up, and restoring the backup into a fresh Docker
environment with no existing volumes.

| Requirement | Verdict |
|---|---|
| 1. A backup is complete: the PostgreSQL database (every schema, all data, every role), the object store (every evidence file and rendition) and the configuration (`.env`, the static actors file, the committed edge configurations) | **Proven** on native Linux (CI) |
| 2. The restore is intact: every receipt and package verifies against its stored digest, every evidence file re-hashes to its recorded SHA-256, and the migration runner reports all 19 migrations already applied with matching checksums | **Proven** on native Linux (CI) |
| 3. The restore target is a fresh Docker environment with no existing volumes | **Proven**, and a restore over an existing environment is **refused** |
| 4. The procedure is committed, not only this record | **Yes**: `scs-pilot/backup/` at `aa8c98f` |

## The procedure

Committed in `scs-pilot/backup/`, with the operator procedure in `scs-pilot/backup/README.md`.

| Script | Does |
|---|---|
| `backup.mjs` | stops the writers; verifies the source; dumps roles and the database; exports every object; copies the configuration; writes `manifest.json` and `SHA256SUMS`; starts the writers again, also on failure |
| `restore.mjs` | checks the backup and the target; restores the configuration, roles, database and objects onto new volumes; starts the stack; verifies the result against the source's report |
| `prove-backup-restore.mjs` | runs both end to end on throwaway environments, and checks the refusals |

The database and object store tools run in the environment's own containers, on its internal
network (the access isolation proof, `SCS-PILOT-ACCESS-ISOLATION-PROOF-2026-09-26.md`). Two tools
are added to the API image for this:
- `dist/ops/object-store-archive.js`: exports and imports objects through the S3 API. Every
  object's bytes must hash to its SHA-256 key, and every imported object is read back.
- `dist/ops/verify-integrity.js`: reads the whole environment in one snapshot as the database
  owner, checks migrations, receipts, packages, evidence files and renditions, and reports the
  row count of every table and the database's grants.

## How it is verified

- **The governed test** is `scs-pilot/backup/prove-backup-restore.mjs`, run by the CI job
  `backup-restore` on every pull request. It never touches an existing environment.
- **The source environment** is built from a checkout of the commit under test, with
  throwaway secrets generated for the run. A governed chain is created in it through the API:
  a framework, parties, a plot, an evidence file, an evaluation, a review decision, and a
  package with its PDF rendition.
- **The target environment** is a second checkout of the same commit, under a new compose
  project with no containers and no volumes, and with no `.env` and no static actors file.
- **Afterwards** both environments, their volumes, the image, the checkouts and the backup are
  removed.

## The 14 steps — CI run 36227701973

The pull request merge of `aa8c98f` with `main`, `a36de50`. Proof run `bb4f8b`. Outcome
**PROVEN**.

| # | Step | Result in CI |
|---|---|---|
| 1 | Source: a governed chain created through the API, its package INTACT | PASS (package `05e473c8-d385-463c-b59d-a7634db69797`) |
| 2 | Backup taken | PASS |
| 3 | Backup contents: roles, database, objects, configuration and source report all present | PASS (10 files, 2 objects) |
| 4 | Restore: all migrations already applied, with matching checksums | PASS (`migrate: done: 0 applied, 0 baselined, 19 already applied (latest 019)`) |
| 5 | Restore: every receipt verifies against its stored digest | PASS (10 receipts) |
| 6 | Restore: every package verifies against its stored digest | PASS (1 package) |
| 7 | Restore: every evidence file re-hashes to its recorded SHA-256 | PASS (1 evidence object) |
| 8 | Restore: every rendition re-hashes to its recorded SHA-256 | PASS (1 rendition) |
| 9 | Restore: every table's row count and the database grants equal the source's | PASS (33 tables) |
| 10 | Restored API: the package reads back byte-for-byte as compiled | PASS (`packageDigest` `sha256:fa721809aa29abae11df7311dc857ad88c1216dcc04c6756b5165fc2c301411d`, currency `CURRENT`) |
| 11 | Restored API: `verifyPackageIntegrity` is INTACT, every check PASS | PASS (5 checks) |
| 12 | Restored API: the PDF rendition downloads and re-hashes to its recorded SHA-256 | PASS (110,544 bytes) |
| 13 | Refused: a backup with one altered byte, before anything is started | PASS: `restore refused: backup file objects/b0144de3… does not match SHA256SUMS`; the target was left with no containers and no volumes |
| 14 | Refused: a restore over an existing environment | PASS: `restore refused: compose project scs-proof-dst-bb4f8b is not fresh (5 containers, 2 volumes)` |

In the same run the `test` job passed 549 of 549 tests, and the `isolation` job passed all 20
required checks in both modes.

**What the steps prove.**
- Steps 4 to 9 are the restore's own verification. They run against the restored environment
  before it is declared intact, and any failure makes the restore fail.
- Steps 10 to 12 check the restored environment through its API, as a user would: the package
  as compiled, its integrity verification, and its PDF.
- Steps 13 and 14 show the restore fails closed. A damaged backup is refused before anything is
  started, and an existing environment is never overwritten.

## The outage window

**The backup stops the API and the edge for its duration.** They are the environment's only
writers. Stopping them makes the database, the object store and the counts one consistent
state.

- **In CI:**
  - The writers were stopped at 07:45:30.455Z.
  - The backup was complete at 07:45:37.848Z.
  - The writers were running again by 07:45:44.687Z.
  - The API was unavailable for about 14 seconds.
- **While they are stopped,** connections to the API port are refused. Requests are not queued.
- **The window grows with the size of the database and the object store.** The CI environment
  held one package and two objects. The window has not been measured for a realistic volume of
  data.
- **The writers are started again if the backup fails.** If the source is not intact, no
  backup is taken.

## Disclosed: `TODO(backup-encryption)`

**The backup is not encrypted.** It holds:
- `.env`: the database, object store and API passwords;
- `database/roles.sql`: every role, with passwords as their stored hashes;
- the static actors file: API token digests;
- every record and evidence file of the environment.

The country data egress specification (§6) requires backup location, encryption, operator
access and restore processes to follow the same sovereignty classification as the primary data.
The procedure meets part of that, and leaves the rest to the operator:
- **What the procedure does:** it writes the backup to a local directory chosen by the operator,
  and `scs-pilot/.gitignore` excludes `backups/`.
- **What the operator must ensure, unverified:** the backup is kept inside the country, with
  access restricted to the environment's operators.
- **What remains missing:** encryption at rest, with country-controlled keys.

## Other disclosures

- **`SHA256SUMS` is not signed.** It detects corruption and accidental alteration of a backup.
  It does not detect deliberate alteration by someone able to rewrite both the files and
  `SHA256SUMS`. Receipts and packages verify against digests stored in the same database, so
  consistent rewriting of the database would also pass. Signed backups need country-controlled
  keys, as encryption does.
- **The evidence specification's id is read directly from the database.** The API does not
  return it, so the proof reads it from its own throwaway database. That is the proof's setup
  only; the procedure does not depend on it.
- **The target must be at the source's commit.** The restore refuses any other commit. Restoring
  a backup into a newer version of the code is not covered.
- **The source's `uncommittedChanges` flag is recorded but not enforced.** A backup taken from
  a checkout with local changes records that in its manifest; the restore does not refuse it.
- **Native Linux only.** This record cites CI. The procedure's proof also passed on Docker
  Desktop during development, but those runs are not the evidence here.

## What is not proven

- **Encrypted backups.** `TODO(backup-encryption)`.
- **Online backup without an outage.** The procedure stops the writers. A backup taken while
  the API serves requests would need a database snapshot and object store listing taken
  consistently with each other, for example by recording the snapshot's high-water mark and
  exporting only the objects it references.
- **Multi-environment restore coordination.** The procedure restores one environment. Restoring
  several environments to a consistent point, or ordering restores across countries, is not
  addressed. Environments share no data, so no cross-environment consistency is needed today.
- **Recovery objectives.** No recovery time or recovery point objective has been approved, and
  none has been measured at a realistic scale.
- **Point-in-time recovery.** There is no WAL archiving; an environment can be restored only to
  the moment of a backup.
- **Backup location.** Where backups are stored, and who can reach them, is the operator's
  responsibility and is not verified.
- **Deletion.** Retention, and deletion of backup copies, are not addressed.

## Mapping to the commissioning evidence

The Phase-1 sovereignty register
(`governance/audits/phase-1-sovereignty/2026-09-15/AAB_PHASE_1_SOVEREIGNTY_TECHNICAL_VERIFICATION_REPORT_AND_REGISTER.md`)
lists the mandatory controls, and its unresolved evidence schedule lists the commissioning
evidence still required. The register's findings concern the WA rehearsal. This record is
evidence for the SCS pilot stack only. It changes the status of no control: every control
below stays as the register records it until a governed commissioning review assesses it.

| Control | Requirement, in brief | This proof provides | Still required |
|---|---|---|---|
| SOV-BACKUP-OBJECT-COVERAGE-01 (CR-07) | protected files and object storage are in a tested backup and recovery system | **provided for the pilot stack:** every object is in the backup and verified on restore, tested on every pull request | that the system is sovereign: backup location and encryption |
| SOV-RECOVERY-OBJECT-01 (CR-08) | objects restored completely, consistently, within approved recovery objectives | **completely and consistently:** every evidence file and rendition re-hashes; the PDF downloads intact | approved recovery objectives, measured at scale |
| SOV-RECOVERY-DB-01 (CR-09) | database restore, consistency and recovery objectives commissioned with sovereign copies only | **restore and consistency:** every receipt and package verifies; row counts and grants match; migrations match by checksum | recovery objectives; evidence that copies are sovereign; commissioning |
| SOV-RES-DB-01 (CR-03) | every backup and recovery copy inside the sovereign boundary | the procedure writes to an operator-chosen local directory; the database tools run on the internal network | where copies are kept; WAL and PITR (none exist) |
| SOV-RES-HOST-BACKUP-01 (CR-06) | hosting backups inside the sovereign boundary | nothing; host-level backups are outside this procedure | provider and country evidence |
| DEP-PACKAGE-INDEPENDENT-REBUILD-01 (CR-28) | the package reconstructed and operated without the rehearsal provider | **one part, for the pilot stack:** an environment is rebuilt from the repository at a commit and a backup alone, with nothing from Supabase, and its API operates | the finished AAB package; an independent assessor |
| SOV-LIFECYCLE-DELETION-01 (CR-25) | deletion covers backups and recovery copies | nothing | retention and deletion of backups |

**Country data egress specification**
(`governance/AAB-COUNTRY-DATA-EGRESS-TECHNICAL-CONTROL-SPEC-2026-09-13.md`):
- **Required evidence, item 9 (backup-location and recovery evidence):** this record provides
  the recovery evidence. Backup-location evidence is not provided.
- **Item 12 (regression tests on every release):** the `backup-restore` CI job provides it for
  backup and restore.
- **§6 (backups and disaster recovery):** met for the restore process; not met for encryption;
  location and operator access are left to the operator (see the `TODO(backup-encryption)`
  section).

**Public-claim rule.** Nothing in this record supports public wording stronger than: an SCS
pilot environment can be backed up and restored into a fresh environment with every record,
file and digest verified, tested automatically on every change; backups are not yet encrypted,
and taking one briefly stops the service.

## What this record does not establish

- It does not establish encrypted, signed or off-site backups (`TODO(backup-encryption)`)
- It does not establish backup without an outage, or recovery objectives
- It does not establish point-in-time recovery
- It does not establish coordinated restore of several environments
- It does not establish where backups are kept, or their deletion
- It is not an independent review
- It admits no capability, and does not alter commissioning status, change any control's status
  in the Phase-1 sovereignty register, satisfy Gate D, close WP05, or grant any production,
  commissioning or regulatory authority
