# AAB Stock-Take — 2026-09-28

**Status:** STOCK-TAKE RECORD
**Authority:** RECORDS THE STATE OF THE REPOSITORY ON 2026-09-28, READ FROM `main` AT `c1586c6` AND UPDATED TO `fa84240`, TO `16d21cc`, TO `dbb2408` AND TO `f1bb47d`, FROM GITHUB (OPEN PRS AND BRANCHES) AND FROM THE CI RUNS. It admits, commissions and decides nothing. Where a fact comes from anywhere other than the repository, it says so.
**Supersedes, as the current stock-take:** `governance/AAB-STOCK-TAKE-2026-09-27.md` (at `634295a`), which stays unchanged as the record of that date. This stock-take covers everything merged since that record merged (`5d4edfe`, PR #36).
**Updated (2026-09-28):** to `main` at `fa84240`, after PR #50 (this stock-take, the roadmap update and the SCS-CAP-09 amendment) and PR #51 (AAB-PLATFORM-09 Governed Public-Key Registry). The rest of this record is as it was at `c1586c6`, except where marked.
**Updated again (2026-09-28):** to `main` at `16d21cc`, after PRs #52 to #59: the signing-key history build, complete and proven. Marked "update of `16d21cc`" where it changes this record.
**Updated again (2026-09-28):** to `main` at `dbb2408`, after PRs #60 to #65: the AGR workstream's step 0, and object-store credentials, complete and proven. Marked "update of `dbb2408`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `f1bb47d`, after PRs #66 and #67: the AAB-PLATFORM-01 proof record, and CAP-04's contract committed under the AGR workstream. Marked "update of `f1bb47d`" where it changes this record.
**Read from:** every canonical contract and governance record on `main`; the SCS pilot READMEs; the proof records; every `TODO(` marker; `gh pr list`, `git branch -r` and `gh run list` on 2026-09-28; and, where marked, the session notes kept outside the repository.

## Summary

- **`main` is at `c1586c6`,** and its CI run on that commit passed (run 36347836148: 666 of 666 tests, isolation, and backup-restore `PROVEN`).
- **Thirteen PRs (#37 to #49) merged on 2026-09-27 and 2026-09-28.** They fall into three groups:
  - **the representation path, built** (#37 to #43): ActorReference version 2, actor–party links, mandate verification and representative submission, with migrations 021 and 022 and an end-to-end proof;
  - **governance records** (#44, #45): the roadmap updated after the representation path, and the platform dependency audit as a working document, with its step 0 naming decision;
  - **four platform contracts** (#46 to #49): AAB-PLATFORM-05 to 08, for the four primitives the audit found with no contract (V12). All four are `designed`; none is implemented.
- **Nothing is admitted, qualified or commissioned.**
- **Nothing that was open at the last stock-take has closed:** the same twelve PRs are open, the same five branches hold work with no PR, and the three open decisions are unchanged (section 4).
- **Two items block real data** (section 5): signing-key history and object-store credentials. **A third, actor-directory history, blocks production** and is new, raised by AAB-PLATFORM-08. For the pilot, with its fixed actors file, it is a limitation disclosed here, not an immediate blocker.
- **Also in this change:** an amendment to SCS-CAP-09, removing its contradiction on currency, and the stale `TODO(actor-reference)` comments cleared from the schema mirror files (section 11).
- **Outreach is tracked separately,** outside the repository (section 10).
- **Updated to `fa84240`:** AAB-PLATFORM-09 Governed Public-Key Registry (PR #51) contracts signing-key history. It is `designed`, not built, so signing-key history still blocks real data. Its bootstrap, how each registry's first key is registered, has a disclosed pilot position for both the Platform Owner and a country registry (section 9).
- **Updated to `16d21cc`:**
  - **Signing-key history is complete.** PRs #52 to #59 merged: the stock-take and roadmap at `fa84240` (#52), then the seven-PR build plan (#53 to #59).
  - **AAB-PLATFORM-09 is `behaviourally proven`:** rotation, restoration, compromise and cross-issuer evidence pass in CI (`governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`).
  - **Signing-key history no longer blocks real data.** `TODO(object-store-credentials)` is the remaining blocker before real data is stored (section 5). Actor-directory history still blocks production.
  - **CI on `16d21cc`'s final commit** (run 36370537666): 723 of 723 tests, isolation, and backup-restore `PROVEN` with 18 steps.
- **Updated to `dbb2408`:**
  - **Step 0 of the AGR workstream is done.** The rehearsal's source is committed as dated, read-only evidence: the deployed gateway PHP and three schemas (#61), and the eight other application schemas, which the first snapshot missed (#62).
  - **Object-store credentials are complete.** AAB-PLATFORM-01 was amended before any code (#63), the build was planned (#64) and built (#65).
  - **AAB-PLATFORM-01 is `behaviourally proven`** (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`).
  - **`TODO(object-store-credentials)` no longer blocks real data.** The override credential's governance, which the amendment requires before any real data is admitted, is now the remaining blocker (section 5). Actor-directory history still blocks production.
  - **CI on the merge commit `dbb2408`** (run 36417985710): 748 of 748 tests, isolation, and backup-restore `PROVEN` with 20 steps.
- **Updated to `f1bb47d`:**
  - **The AAB-PLATFORM-01 proof record is on `main`** (#66), with the roadmap and this record at `dbb2408`.
  - **CAP-04 Governed Scientific Memory has its contract committed under the AGR workstream** (#67). Steps 1 to 3 are complete. It stays `designed`, and nothing is built.
  - **The demonstration environment's condition is met** (roadmap, section 8.6). Meeting it publishes nothing: publishing is a separate decision.
  - **The AGR route prefix `/agr/v1/` is decided** as a platform decision, separating AGR from SCS at the API level.
  - **AAB-PLATFORM-06 is amended** for checks that hold a record for review.
  - **CAP-04 waits on two platform prerequisites before any code:** receipts for AGR capability identifiers, and the object store's parameters for AGR content (section 5).
  - **CI on `f1bb47d`** (run 36495632304): 748 of 748 tests, isolation, and backup-restore `PROVEN` with 20 steps.

## 1. What merged since `5d4edfe`

| PR | Merge | What | Kind |
|---|---|---|---|
| #37 | `26590e8` | Representation contracts: structural fixes before build (AAB-PLATFORM-03 and 04; SCS-CAP-02 second amendment) | Contracts |
| #38 | `bd4f5d4` | Representation path PR 2: migrations 021 (actor–party links) and 022 (mandate verification); CI actions pinned to Node.js 24 versions | Migrations, CI |
| #39 | `aaf45bb` | Representation path PR 3: ActorReference version 2, `holdsRole` and `sameActor` at every site, Ed25519 signatures made outside the server | Code |
| #40 | `ec71331` | Representation path PR 4: actor–party link endpoints (SCS-CAP-02 third amendment) | Code, contract |
| #41 | `09456d1` | Representation path PR 5: mandate verification (SCS-CAP-02 fourth amendment) | Code, contract |
| #42 | `ca9dcb0` | Representation path PR 6: representative submission (AAB-PLATFORM-04 second amendment; SCS-CAP-02 fifth; SCS-CAP-04 and 05 second). **Breaking change in SCS-CAP-05:** `actingUnder` replaces the request's `submissionMandateId` | Code, contracts |
| #43 | `67b6ba8` | Representation path PR 7: end-to-end proof, link integrity checks, links in the backup proof, README proof records, operator documentation, the build plan | Proof, docs |
| #44 | `eb9f338` | Roadmap updated to `67b6ba8` | Governance |
| #45 | `4db2ae0` | Platform dependency audit: a working document, **not the independent audit**; violations V1 to V12; the nine-step extraction plan; the step 0 naming decision | Governance |
| #46 | `718371e` | AAB-PLATFORM-05 Governed Provenance | Contract |
| #47 | `dab6749` | AAB-PLATFORM-06 Admission Decisions | Contract |
| #48 | `172ac36` | AAB-PLATFORM-07 Frozen Evaluation Snapshots | Contract |
| #49 | `c1586c6` | AAB-PLATFORM-08 Attributable Human Review with Currency | Contract |
| #50 | `738ede4` | This stock-take; the roadmap at `c1586c6`; the SCS-CAP-09 currency amendment; stale schema-mirror comments cleared (update of `fa84240`) | Governance, contract, comments |
| #51 | `fa84240` | AAB-PLATFORM-09 Governed Public-Key Registry (update of `fa84240`) | Contract |
| #52 | `62b905f` | Stock-take and roadmap at `fa84240`; AAB-PLATFORM-09 amendment: a country registry's first key (update of `16d21cc`) | Governance, contract |
| #53 | `fdd2f34` | Signing-key history step 0: the build plan; amendments to AAB-PLATFORM-09 (second), 03, 04 (third) and 08; SCS-CAP-02 (sixth), 04 and 05 (third) | Contracts, plan |
| #54 | `0681ec6` | Signing-key history PR 2: migrations 023 (the registry) and 024 (receipt capability) | Migrations |
| #55 | `411a693` | Signing-key history PR 3: the registry library and reader; AAB-PLATFORM-09 third amendment | Code, contract |
| #56 | `962f3b6` | Signing-key history PR 4: registry endpoints under `/aab/v1/`; the control plane as a separate instance; AAB-PLATFORM-09 fourth amendment | Code, contract |
| #57 | `b3ea055` | Signing-key history PR 5: compromise, notices and assessments; the cross-issuer proof; AAB-PLATFORM-09 fifth amendment | Code, contract |
| #58 | `80b3c14` | Signing-key history PR 6: the switch-over. Version 2 statements naming their key; **breaking change for signing clients:** version 1 refused; keys out of the actors file | Code |
| #59 | `16d21cc` | Signing-key history PR 7: the proof. Rotation and compromise-window tests; backup proof rotation (18 steps); the AAB-PLATFORM-09 proof record; the ceremony runbook; `TODO(signing-key-history)` removed; AAB-PLATFORM-09 note of 2026-09-28 | Proof, docs, contract |
| #60 | `ebe5be4` | Governance at `16d21cc`: this stock-take and the roadmap updated; the AGR rehearsal migration workstream (roadmap, section 8) (update of `dbb2408`) | Governance |
| #61 | `b4707ec` | AGR rehearsal step 0: the dated evidence snapshot `agr-rehearsal/snapshot-2026-09-28/`: the 29 PHP files of the deployed rehearsal, and the schemas of `agriculture`, `platform` and `public`, schema only | Evidence |
| #62 | `d7c4561` | AGR rehearsal step 0 supplement: the eight other application schemas, which #61 missed (`agr-rehearsal/snapshot-2026-09-28-supplementary/`) | Evidence |
| #63 | `74e50bd` | AAB-PLATFORM-01 amendment: three identities, Object Lock in GOVERNANCE mode for six years, the ARN bucket policy, the override credential, overwrites versioned and detected | Contract |
| #64 | `9156408` | Object store identities: the build plan, approved with three decisions (`scs-pilot/OBJECT-STORE-IDENTITIES-BUILD-PLAN.md`) | Plan |
| #65 | `dbb2408` | Object store identities: scoped credentials, Object Lock, the setup step, the API's startup checks, verified reads; backup and restore on the scoped identities; `TODO(object-store-credentials)` removed from the code | Code, CI, docs |

| #66 | `1db49ee` | The AAB-PLATFORM-01 proof record; the roadmap and this record at `dbb2408`; notes in AAB-PLATFORM-01 and SCS-CAP-02 (update of `f1bb47d`) | Proof, governance |
| #67 | `f1bb47d` | CAP-04 canonical amendment, step 1 of the AGR workstream: aligned with AAB-PLATFORM-01, 03 and 05 to 09, and the rehearsal accounted for; the `/agr/v1/` route prefix; AAB-PLATFORM-06 amended for holding checks (update of `f1bb47d`) | Contracts |

Every one of them passed all three CI jobs before it merged, and so did #50 to #67.

## 2. What is on `main`

State labels are the platform's maturity states: `named only`, `designed`, `implemented`, `behaviourally proven`, `admitted`, `commissioned`.

### 2.1 Canonical contracts: 21

| Contract | State | Change since the last stock-take |
|---|---|---|
| SCS-CAP-01 Regulatory Framework Registration | `behaviourally proven` | None. 1 of 7 operations built |
| SCS-CAP-02 Operator and Supplier Identity Registration | `behaviourally proven` | **Amended four more times** (second to fifth amendments, #37 to #42). Links, mandate verification and representative submission **built and proven** (PR #43). 10 of 16 operations built. **Update of `16d21cc`:** sixth amendment (#53), signing-key history; its proof noted, and the interim rule on key rotation lifted |
| SCS-CAP-03 Plot and Land Unit Registration | `behaviourally proven` | None. 1 of 8 |
| SCS-CAP-04 Deforestation Evidence Admission | `behaviourally proven` | **Second amendment** (#42). Representative submission **built and proven**. Third amendment (#53), signing-key history |
| SCS-CAP-05 Supply Chain Custody Evidence Admission | `behaviourally proven` | **Second amendment** (#42). Representative submission **built and proven**, with the breaking change to the request. Third amendment (#53), signing-key history |
| SCS-CAP-06 Due Diligence Sufficiency Evaluation | `behaviourally proven` | None. 4 of 5 |
| SCS-CAP-08 Due Diligence Package Compilation | `behaviourally proven` | None. 3 of 5; no export bundle |
| SCS-CAP-09 Regulatory Review and Promotion | `behaviourally proven` | 4 of 6. **Amended** (#50): currency is derived when read, never updated (drift item 4) |
| AAB-PLATFORM-01 Evidence Object Store | **`behaviourally proven`** (update of `dbb2408`; was `implemented`, upload) | **Amended** (#63): three identities, Object Lock (GOVERNANCE, 2,192 days), the ARN bucket policy, the override credential, overwrites versioned and detected. Built (#65) and proven (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`); a note of 2026-09-28 records it |
| AAB-PLATFORM-02 Governed Document Rendition | `implemented` | None |
| AAB-PLATFORM-03 ActorReference | **`implemented`** (was `designed`) | Version 2 issued for every new record (PR #39); version 1 records stay readable. No proof record names it yet. Amended (#53) to cite AAB-PLATFORM-09 for signing keys |
| AAB-PLATFORM-04 Actor–Subject Link | **`behaviourally proven`** (was `designed`) | Second amendment (#42). Proven as adopted by SCS-CAP-02 (README, PR #43). **Update of `16d21cc`:** third amendment (#53), version 2 statements naming their key; its proof noted, and the interim rule on key rotation lifted |
| **AAB-PLATFORM-05 Governed Provenance** | `designed` | **New** (#46) |
| **AAB-PLATFORM-06 Admission Decisions** | `designed` | **New** (#47). **Amended** (#67; update of `f1bb47d`): a check whose failure holds a record is `NOT_PASSED` only in a `HELD_FOR_REVIEW` decision, named in `heldBecause`, and never discloses a limitation by itself |
| **AAB-PLATFORM-07 Frozen Evaluation Snapshots** | `designed` | **New** (#48) |
| **AAB-PLATFORM-08 Attributable Human Review with Currency** | `designed` | **New** (#49). Amended (#53) to cite AAB-PLATFORM-09 |
| **AAB-PLATFORM-09 Governed Public-Key Registry** | **`behaviourally proven`** (update of `16d21cc`; was `designed`) | **New** (#51; update of `fa84240`). Amended five times on 2026-09-28 (#52 to #57). Built by #53 to #59; proven in `governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`; a note of 2026-09-28 records it (#59) |
| CAP-04 Governed Scientific Memory | `designed` | **Amended** (#67; update of `f1bb47d`): its contract committed under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, and records ten decisions, the `/agr/v1/` route prefix among them (`governance/workstream-b/CAP-04-SCIENTIFIC-MEMORY-CANONICAL-CONTRACT-2026-09-20.md`). Nothing is built |
| CAP-05 Governed Scientific Reasoning | `designed` | None |
| CAP-20 Country Capability Catalogue & Selection | `designed` | None |
| CAP-21 Commercial Agreement & Entitlement Management | `designed` | None |

"Behaviourally proven" means for each capability's minimum vertical slice, as its README records. **AAB-PLATFORM-05 to 08 are contracts only:** the primitives they govern exist as SCS code (`implemented` in the roadmap's primitive table), but no code implements the platform contracts, and no domain has adopted them.

### 2.2 Code and proofs

- **The SCS pilot:** eight capabilities, AAB-PLATFORM-01 to 04, and 22 migrations (001 to 022).
- **CI** runs three jobs on every pull request and on `main`: 666 tests (549 at the last stock-take), network isolation in two modes, and the backup-restore proof, which now also re-verifies the signatures of an actor–party link after restore.
- **The representation path's end-to-end test** (`integration/representation-e2e.test.ts`): a signed link, a verified mandate, three representative submissions, a suspension that refuses the next one, and a reinstatement.
- **The integrity verifier** now checks links (`ops/verify-integrity.ts`).
- **The access isolation and backup-restore proofs** are unchanged in scope.

**Update of `16d21cc`:**
- **Migrations:** 24 (001 to 024). 023 holds the public-key registry's tables, append-only and guarded by triggers; 024 adds the registry's capability to receipts.
- **The public-key registry** (`platform/key-registry/`) serves `/aab/v1/`. The control plane's registry is the same code, run as a separate instance (`AAB_REGISTRY_INSTANCE=CONTROL_PLANE`).
- **Every link and status record** is signed as a version 2 statement naming its key, and verified against that key as at its acceptance. Records are verified again at use and by the integrity verifier.
- **CI:** 723 tests. The backup-restore proof has 18 steps: it rotates a key before the backup, and after the restore re-verifies both links, the retired key's included, and the registry itself. It also refuses a new statement signed with the retired key.
- **Proof records:** three. Access isolation, backup-restore, and now the AAB-PLATFORM-09 proof record.

**Update of `dbb2408`:**
- **Migrations:** unchanged, 24.
- **The object store** has three identities, each with its own credential: admin, API and backup (`scs-pilot/seaweedfs/start.sh`). A setup service, `objectstore-init`, creates and verifies the locked evidence bucket and its policy on every start. The API refuses to start without its scoped credential, the lock, or an enforced policy. Every read is verified against its key.
- **CI:** 748 tests. The isolation job also checks the store's 8 start refusals. The backup-restore proof has 20 steps: an export attempted with the API identity is refused, and the setup step's runs are checked.
- **Proof records:** four. The AAB-PLATFORM-01 proof record is new.
- **`agr-rehearsal/`:** two dated, read-only evidence snapshots of the AGR rehearsal (#61, #62). They are evidence, not governed code: nothing in them is built, run or tested here.

**Update of `f1bb47d`:** no code changes since `dbb2408`: #66 and #67 are governance and contracts only. CI on `main`: run 36422462889 on `1db49ee` (#66) passed; run 36495632304 on `f1bb47d` (#67) passed: 748 of 748 tests, isolation (the store's 8 start refusals included), and backup-restore `PROVEN` with 20 steps.

### 2.3 Governance records added since the last stock-take

| Record | What it establishes | State |
|---|---|---|
| Representation path build plan (#43) | The seven-PR plan the representation path was built to | Complete |
| Roadmap update (#44) | The roadmap at `67b6ba8` | Updated again with this stock-take |
| Platform dependency audit (#45) | V1 to V12; the nine-step extraction plan; the step 0 decision (the naming rule below) | **A completed working document.** Not the independent audit: its independent verification is open (section 6) |
| AAB-PLATFORM-05 to 08 (#46 to #49) | The platform contracts for provenance, admission decisions, frozen evaluation snapshots, and attributable human review with currency | `designed`; proposed, not admitted |
| Signing-key history build plan (#53; update of `16d21cc`) | The seven-PR plan signing-key history was built to (`scs-pilot/SIGNING-KEY-HISTORY-BUILD-PLAN.md`) | Complete: all seven PRs built |
| AAB-PLATFORM-09 proof record (#59; update of `16d21cc`) | The section 11 conditions and both bootstrap ceremonies, test by test; its limits | Cites CI run 36369519581 |
| Key bootstrap ceremony runbook (#59; update of `16d21cc`) | The operator procedure for both ceremonies, rotation, compromise and notices (`scs-pilot/KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`) | No real ceremony performed |
| AGR rehearsal step 0 snapshots (#61, #62; update of `dbb2408`) | The rehearsal's source, as dated evidence: 29 PHP files; the schemas of all eleven application schemas; manifests and SHA-256 digests | Read-only; never edited after commit |
| Object store identities build plan (#64; update of `dbb2408`) | The plan the amendment was built to, with its three decisions: the override credential never configured in the store; refuse, never repair; a proof record citing the merge commit's CI run | Complete: built by #65 |
| AAB-PLATFORM-01 proof record (update of `dbb2408`) | The amendment of 2026-09-28, section by section; SeaweedFS 4.47's behaviours asserted in CI; its limits (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`) | Cites CI run 36417985710, on the merge commit |

**The naming rule** (the audit's step 0, decided on 2026-09-27): what is already stored or externally visible keeps its SCS name; everything new takes an AAB name. `SCS-PLATFORM` stays in error envelopes until a platform envelope contract exists; the `/scs/v1` platform routes are kept permanently as aliases and new platform routes use `/aab/v1/`; the `scs` database schema is kept; new platform schemas use `urn:aab:schema:`. **Update of `f1bb47d`:** AGR's routes are under `/agr/v1/`, with its own database schema (`agr`) and JSON schema namespace (`urn:aab:schema:agr:`). A platform decision, made in CAP-04's amendment (roadmap, decision 18).

## 3. What is in progress

**No work is in flight.**
- There is no uncommitted change other than this stock-take and the roadmap update, and no stash.
- No local branch holds work that is not on `main`, except the two AGR candidate branches.

**Update of `16d21cc`:** no work in flight on the repository beyond this update. A draft of the public demonstration page exists outside the repository, as a private artifact for review, and is not deployed. The roadmap now holds it back until the first capability in the AGR workstream has its contract committed under it (roadmap, section 8.6).

**Update of `dbb2408`:** no work in flight on the repository beyond this update. Next, as decided in review on 2026-09-28 and not yet recorded in a governance record:
- **A capability identity record** for the AGR workstream. Its content, as decided:
  - observation to be the proposed CAP-36, Governed Observation and Field Evidence;
  - resource intelligence to belong to CAP-01, with no new number;
  - cognitive intelligence to be split between CAP-01 and CAP-06, with its loop held for a reading of `cognitive_core`, which is now in the supplementary snapshot.
- **The CAP-04 contract,** the workstream's first step 1.

**Update of `f1bb47d`:** no work in flight on the repository beyond this update. **CAP-04's contract is done** (#67). The capability identity record is still to be written, with the content above. After it, as recorded in the roadmap:
- **CAP-04's two prerequisites before any code:** the receipt migration for AGR capability identifiers, and the platform decision on the object store's parameters for AGR content;
- **CAP-05's step 1,** the next capability in the workstream's order.

CAP-04's code also waits on the dependency audit's independent verification and the extraction. The draft demonstration page outside the repository is unchanged: its condition is met, and publishing it is a separate decision.

The aab.ag legacy application tree is a separate cleanup, outside this repository, for another session. The owner is aware of it.

**Open PRs: twelve, unchanged since the last stock-take** (still twelve at `16d21cc`). #19 (AGR candidate remediation, based on the candidate branch) and eleven from August (#2 to #13). None has been updated since then. Their details are in the last stock-take, section 3.

**Branches with work not on `main` and no PR: five, unchanged.** The AGR candidate branch, the CAP-34 audit branch (`claude/pensive-knuth-pdlko1`, 14 commits, with the `SNAPSHOT-008` identity collision), and three branches already found redundant or superseded (`agent/id-09-evidence`, `audit/phase-1-sovereignty-baseline-2026-09-15`, `docs/canonical-testing-live-boundary-v163`). The redundant branches have not been deleted.

## 4. Open decisions

Unchanged since the last stock-take:
1. **The CAP-34 audit branch:** whether its work is ever adopted, how the `SNAPSHOT-008` collision would be resolved, and what becomes of the purpose and vision record. Recorded on `main` as not adopted, for now.
2. **PR #19 and the AGR candidate:** whether to merge the remediation into the candidate branch on the strength of the third independent verification, and whether the candidate comes to `main` as a candidate record. Session notes tie it to the WP05 hardware key and the separate capability review.
3. **The eleven open PRs from August:** what becomes of each.

New:

4. **The three redundant or superseded branches:** whether to delete them. Nothing on them is missing from `main`.
5. **Correcting `evaluationSnapshotDigest`** (drift item 6): whether, and how, to align SCS's stored digest with AAB-PLATFORM-07. It needs a migration and a behaviour change, and so its own decision.

## 5. What blocks real data, and production

**Before any real data is admitted or stored:**

| Item | Source | Why |
|---|---|---|
| **Signing-key history: resolved** (update of `16d21cc`): built by PRs #53 to #59 and proven (`governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`). It no longer blocks real data, and the interim rule on key rotation is lifted. As first recorded: (`TODO(signing-key-history)`, 8 uses) | **AAB-PLATFORM-09 Governed Public-Key Registry** (PR #51), which contracts it; AAB-PLATFORM-04, second amendment; `foundation/signatures.ts`; AAB-PLATFORM-08, section 13 | A signature is verified against the signer's current key, so a replaced key invalidates every link and status record it signed. **AAB-PLATFORM-08 adds:** no domain adoption of it can go live with real data until signing-key history is implemented. **Updated to `fa84240`:** the design is now contracted, not built. The condition for real data is AAB-PLATFORM-09's section 11: rotation, restoration, compromise and cross-issuer tests passing, with a proof record. Until then, keys stay in the actors file, one per actor, never rotated while records they signed are in use |
| **Object-store credentials: resolved** (update of `dbb2408`): built by PR #65 and proven (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`). It no longer blocks real data, and the tag is gone from the code. As first recorded: (`TODO(object-store-credentials)`, 10 uses) | AAB-PLATFORM-01; SCS-CAP-04 and 05 | The API's object store identity has admin rights. It needs a put/read-only identity with object locking "before any real data is stored". **Update of `16d21cc`: the remaining blocker before real data** |
| **The override credential's governance** (update of `dbb2408`; no tag) | AAB-PLATFORM-01, amendment of 2026-09-28, section 4, and its "retention governance" gap | Who holds the override credential, what a use requires, and how each use is recorded. **It "must be defined before any real data is admitted",** and until then the credential is never used. With it comes what an erasure leaves behind: citing records, packages (each records its objects' SHA-256, so an erased object makes every package citing it unverifiable), and backups. **The remaining blocker before real data** |

**Before production: actor-directory history** (no tag yet; AAB-PLATFORM-08, "Open items"). **New.**
- **Why it blocks production.** A human decision identifies its decider by `actorId` and `issuer` only; the accountable name lives in the country's actor directory. AAB-PLATFORM-08 requires that the name held for a decider at the time of a decision can be established later. Without the directory's history, it cannot, and a human decision cannot be fully verified after the fact.
- **Why it does not block the pilot.** The pilot's actors come from a fixed actors file that the operator sets for the deployment, and that is never committed. For the pilot this is a **disclosed limitation**, recorded here, not an immediate blocker: a decider's accountable name at the time of a decision can be established only from the operator's own copy of that file. It becomes a blocker for production, where actors are issued and changed in operation.

**Before live operation** (unchanged): `TODO(backup-encryption)`, `TODO(tenant-scope)`, `TODO(tenant-network-policy)`.

**Before any CAP-04 code** (update of `f1bb47d`; CAP-04 amendment of 2026-09-29):
- **Receipts for AGR capabilities.** A platform migration extending the receipt table, and the error types, to AGR capability identifiers. The pilot accepts only SCS identifiers and AAB-PLATFORM-09 (dependency audit, V3 and V5). It comes before any CAP-04 endpoint.
- **The object store's parameters for AGR content.** Retention, media types and size limits, decided by the platform before the object store is used for AGR content. AAB-PLATFORM-01's were set for EUDR supply-chain evidence, and scientific memory does not inherit them. Until then, no AGR original is stored.

## 6. What is deferred, and its trigger

| Item | Trigger | Change since the last stock-take |
|---|---|---|
| **Independent verification of the dependency audit** | **Due now.** It precedes any extraction | The audit exists as a working document (#45); the independent reviewer is not appointed |
| Extraction of the platform primitives | The independent verification, and, for primitives 4 to 7, their platform contracts (now on `main`) | The contracts precondition is met for primitives 4 to 7 |
| **The signing-key history build** (update of `fa84240`) | AAB-PLATFORM-09 is on `main`, and both bootstrap pilot positions are recorded. Next: a build plan, for review before any code | **Complete** (update of `16d21cc`): PRs #53 to #59 |
| **Domain adoption of AAB-PLATFORM-05 to 08** | An amendment to each domain's contracts, mapping existing records when read, never rewriting them | **New.** No domain has adopted them. For AAB-PLATFORM-08, also signing-key history (section 5): **met** (update of `16d21cc`) |
| **A platform error envelope contract** | Before `SCS-PLATFORM` can change in error envelopes (the naming rule) | **New** |
| **The AAB-PLATFORM-03 proof record** | Before AAB-PLATFORM-03 can be raised from `implemented` | **New.** The behaviour is tested; no record names it |
| **Signed party grants** | `PARTY_REPRESENTATIVE` and `PARTY_AUTHORITY_REPRESENTATIVE` grants are operator configuration in the actors file; in production each must be a signed, evidenced act | Now relied on by representative submission, which is built |
| AGR capabilities built on the platform | Extraction, and AGR's adoption of AAB-PLATFORM-05 to 08 | The contracts exist. **Update of `16d21cc`:** now the AGR rehearsal migration workstream (roadmap, section 8), in the order CAP-04, 05, 08, 06, 07, 09. Step 0, obtaining the rehearsal's source, may start now, and contract work follows it. **Update of `dbb2408`:** step 0 is done (#61, #62), and contract work may begin. **Update of `f1bb47d`:** CAP-04's contract is committed under the workstream (#67), and CAP-04 has two platform prerequisites before any code (section 5). Its code waits on the audit's independent verification and the extraction. Observation, cognitive and resource intelligence need capability numbers and identities first |
| PDF metadata (`Producer` and `Creator` still read `SCS-PLATFORM-02`) | A deliberate change of its own: new expected digest, renderer version bump, cross-platform re-verification | None |
| `simulation/cap34/scs-roadmap-preview.js` and the CAP-34 manifest extended to SCS | Your decision (deferred after PR #26) | None |
| Multi-issuer idempotency keys | A second identity issuer acting in a deployment (`TODO(multi-issuer-idempotency)`) | None |
| SCS-CAP-03's representative submission | SCS-CAP-03 redefining `addTenureClaim` and `associateFramework` | None |
| A mandate action for representation in a transaction | A review of SCS-CAP-02's mandate action vocabulary | None |
| How an organisation's own staff submit on its behalf | A contract decision (a gap in SCS-CAP-04 and 05) | None |
| SCS-CAP-07, 10, 11, 12 contracts | Session notes record them as queued after PR #19. SCS-CAP-12 also needs country isolation confirmed in production | None |
| WP05 (reconstruction replay) | Session notes: "WP05 preflight when the YubiKey arrives". WP04 records that WP05 "has not begun" | None |
| Encrypted, signed backups | Country-controlled keys (`TODO(backup-encryption)`) | None |
| `SUFFICIENT` evaluations | A spatial database with country boundary data (`TODO(postgis)`) | None |

## 7. What blocks the first SCS admission

Unchanged from the last stock-take, except item 2:
1. The country admission registry, built.
2. **ActorReference version 2 is now implemented** (PR #39). What remains is the contract itself: AAB-PLATFORM-03 is proposed, not admitted (`TODO(actor-reference)`, "before any capability is admitted").
3. The founding country institution's authorised representative, identified. A country decision.
4. The first independent admission reviewer, appointed jointly. A country decision.
5. Signing keys for the Platform Owner, the representative and the reviewer. **Signing-key history** (section 5) now also bears on these, and **AAB-PLATFORM-09** defines how they are registered: in the platform control plane's registry for the Platform Owner, and in the country's registry for the representative and any country-issued reviewer. **Update of `16d21cc`:** the registries are built and proven. The keys wait on the bootstrap ceremonies (`scs-pilot/KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`), and a country's ceremony waits on item 3.
6. The CAP-34 fidelity manifest extended to the SCS capabilities.
7. The capability itself, ready for assessment, with its documents agreeing with its code.
8. Its dependencies admitted first, or in the same decision.

## 8. Open TODOs

**24 distinct tags,** counted across every file except generated HTML (23 at the last stock-take; `TODO(signing-key-history)` is new). Counts are occurrences.

| Group | Tags (uses) |
|---|---|
| Blocks real data | `object-store-credentials` (10). **Update of `16d21cc`:** `signing-key-history` (8 at `fa84240`) is resolved; it is gone from the code, and remains only in dated records. **Update of `dbb2408`:** `object-store-credentials` is resolved too, gone from the code and remaining only in dated records and plans. No tag now blocks real data: the override credential's governance, which does, has no tag (section 5) |
| Blocks live operation | `backup-encryption` (10), `tenant-scope` (12), `tenant-network-policy` (8) |
| Blocks admission | `actor-reference` (14; 22 before this change, which clears the eight stale uses in the schema mirrors): the contract is proposed, not admitted; version 2 is implemented |
| Limits what the pilot can conclude | `postgis` (36), `evidence-id-model` (19), `evidence` (19), `country-boundary-check` (6), `eligibility-rules` (5), `spec-derivation` (6) |
| Hardening | `role-registry` (12; now also `LINK_OFFICER` and `PARTY_REPRESENTATIVE`), `multi-issuer-idempotency` (11), `oidc` (4), `idempotency-retention` (6), `immutability` (7), `append-only` (7), `party-versions` (4), `framework-association-arrays` (6) |
| Resolved; the tag remains in immutable migrations or dated notes | `migration-runner` (4), `docker-e2e` (3), `framework-association` (6), `other-action` (4) |

## 9. Open items raised by the platform contracts

**From AAB-PLATFORM-08 (new):**
- **Signing-key history** is now a precondition of any adoption going live with real data (section 5).
- **Actor-directory history,** so that the accountable name held for a decider at the time of a decision can be established later, within the country: blocking for production, a disclosed limitation for the pilot (section 5).
- **How authority grants for deciding roles are issued, scoped and revoked.** AAB-PLATFORM-03 defines the grant; its governance is not defined anywhere.
- **The named-only CAP-25 Governed Human Decision & Approval Control** may become this primitive's implementation. Not decided.
- **The capability-number collision:** SCS-CAP-09 (regulatory review) and the AGR landscape's CAP-09 (scientific learning) are both human decision capabilities. Each domain's adoption names its capability in full.
- **Implementation:** a shared human decision and currency module, separated from SCS's staleness rules (V12).

**From AAB-PLATFORM-09 (update of `fa84240`):**
- **The bootstrap problem: the most important open item.** No registry can start until its first key is registered, and the first registration authority has no one to register it.
  - **Pilot position, Platform Owner:** the Platform Owner's first key is self-attested in a documented ceremony, disclosed.
  - **Pilot position, country registry** (amendment of 2026-09-28): the country institution's authorised representative performs the ceremony for the country registry's first key; the Platform Owner witnesses; the ceremony record is co-signed. The Platform Owner never registers or holds a country key. It waits on the representative being identified (section 7, item 3).
  - **Open:** the bootstrap for production.
- **Attestation keys:** how each registry's attestation key is created, pinned, rotated and replaced.
- **Compromise notices across the boundary:** the channel, and what a domain does if a notice cannot reach it.
- **Algorithms beyond Ed25519,** and how one is withdrawn.
- **A trusted timestamp mechanism,** if independent proof of signing time is ever needed.
- **Private-key custody,** including the WP05 hardware key.
- **Implementation:** a registry per issuer; the changes to `signatures.ts`, `use.ts`, `auth.ts`, the receipts and the proofs; and the proof its section 11 requires. **Closed** (update of `16d21cc`): built by PRs #53 to #59, and proven. The other items above stay open.

**From AAB-PLATFORM-05 to 07:**
- **05:** contribution attribution; offline capture (how a device's own time is recorded); cross-boundary sharing arrangements, which the contract relies on and does not define.
- **06:** a governed refusal history, as a future capability, not a current requirement; existing `decidedBy` fields that hold the submitter, mapped to `requestedBy`; the receipt and envelope couplings (V3 to V5) resolved before a shared admission module.
- **07:** reconstruction of the store's past state, as a possible future capability; relational storage of snapshot members carrying version and digest.
- **All four:** implementation, as shared modules with platform schemas in `urn:aab:schema:`, and each domain's adoption amendment.

## 10. Outreach

**Outreach is tracked separately, outside this repository.** Organisations, contacts, dates, what was sent, and follow-ups are names and commercial information, which do not belong in a governance repository. This stock-take does not record them, and does not record their state.

**The proof-timestamp rule** (confirmed as a platform rule on 2026-09-27, last stock-take, section 7) still applies to any external presentation that shows or cites a frozen proof file. Nothing merged since changes it: PRs #37 to #49 touched no CAP-34 or AGR proof file.

## 11. What this change updates

**Also in this change, at your instruction in review:**
- **SCS-CAP-09 is amended** ("Amendment of 2026-09-28: currency is derived, never updated"). Its section on superseding decisions said the earlier decision's `currencyStatus` "is updated to `SUPERSEDED`"; its rules elsewhere, and the code, derive it when read. The amendment settles it as AAB-PLATFORM-08 does, corrects the sentence, and changes no implementation. It does not adopt AAB-PLATFORM-08 as a whole. HTML re-rendered.
- **The stale `TODO(actor-reference)` comments are cleared** from the eight schema mirror files (`scs-pilot/packages/db/schema/cap-01.sql` to `cap-09.sql`). Each now says that ActorReference is stored as a jsonb object in the shape AAB-PLATFORM-03 defines. Comments only: the migrations are generated from each file's first statement onward, so no migration and no behaviour changes. The migrations themselves, which are immutable, are not touched.

**Updated to `fa84240`,** in a later change: the contract table (AAB-PLATFORM-09 added, SCS-CAP-09's amendment noted), the signing-key history blocker, the deferred signing-key history build, the AAB-PLATFORM-09 open items with both bootstrap pilot positions, and the roadmap (below). The same change amends AAB-PLATFORM-09 with the pilot position for a country registry's first key.

**Updated to `16d21cc`,** in a later change, at your instruction:
- **This record:** PRs #52 to #59 in section 1; AAB-PLATFORM-09 `behaviourally proven`, and the amendments of #53, in the contract table; the code and proofs at `16d21cc`; signing-key history resolved, and object-store credentials the remaining blocker before real data; the build complete; AAB-PLATFORM-09's implementation item closed.
- **AAB-PLATFORM-04 and SCS-CAP-02:** a note of 2026-09-28 in each, recording the proof and lifting the interim rule that a key is never rotated while records it signed are in use. Their open items are marked closed, keeping their first wording. HTML re-rendered.
- **AAB-PLATFORM-08 and AAB-PLATFORM-03:** a note of 2026-09-28 in each. In 08, section 13's condition is met and the signing-key open item is closed. In 03, the bootstrap is proven in tests, and issuing real keys waits only on the real ceremonies. HTML re-rendered.
- **The roadmap:** updated to `16d21cc` throughout, and **a new section 8, the AGR rehearsal migration workstream:**
  - the rehearsal's working code, catalogued against the landscape capabilities;
  - the governed migration path for each capability;
  - the priority order;
  - the prerequisite of the audit's independent verification and the extraction before any AGR code is brought across;
  - the rule that the demonstration environment is not published before the first capability in the workstream has its contract committed under it;
  - step 0, obtaining the source, mandatory and first;
  - the identity decision for observation, cognitive and resource intelligence;
  - the catalogue mapping, marked as proposed and requiring review.

**Updated to `f1bb47d`,** in a later change, at your instruction:
- **This record:** PRs #66 and #67 in section 1; CAP-04 and AAB-PLATFORM-06 amended, in the contract table; the `/agr/v1/` route prefix with the naming rule; work in progress; CAP-04's prerequisites before any code, in section 5; CAP-04's step 1 done, in section 6.
- **The roadmap:** updated to `f1bb47d`. CAP-04 committed under the workstream, with steps 1 to 3 done. The demonstration environment's condition met, publishing nothing. The rehearsal's `AAB_LEARNING_MEMORY_ACTIONS` recorded as CAP-09's. CAP-04's prerequisites in section 8.5. The naming rule extended to `/agr/v1/`. New decisions 18 (`/agr/v1/`), 19 (CAP-04 committed) and 20 (AAB-PLATFORM-06 amended).
- **Not changed:** the CAP-34 fidelity manifest. CAP-04's fidelity there, `CONCEPT_PREVIEW_NOT_IMPLEMENTED`, is still true: nothing is built.

**Updated to `dbb2408`,** in a later change, at your instruction:
- **This record:** PRs #60 to #65 in section 1; AAB-PLATFORM-01 `behaviourally proven` in the contract table; the code and proofs at `dbb2408`; the step 0 snapshots, the build plan and the proof record in section 2.3; work in progress; object-store credentials resolved, and the override credential's governance the remaining blocker before real data; step 0 done.
- **The AAB-PLATFORM-01 proof record,** new (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`). It cites CI run 36417985710, on the merge commit, as the build plan's decision 3 requires.
- **AAB-PLATFORM-01:** a note of 2026-09-28, recording the build and the proof. Not an amendment. HTML re-rendered.
- **SCS-CAP-02:** a short note of 2026-09-28, at your instruction in review. Its earlier note said real data was blocked by `TODO(object-store-credentials)`; the new one points to the proof record, and names the override credential's governance as what now blocks real data. Not an amendment. HTML re-rendered.
- **The roadmap:** updated to `dbb2408`. AAB-PLATFORM-01 and primitive 3 are `behaviourally proven`. `TODO(object-store-credentials)` is resolved, and the override credential's governance is added in section 6.1 as the remaining blocker before real data. New decisions 16 (object-store credentials complete) and 17 (step 0 done).

**The roadmap,** updated in the same change (at `c1586c6`):
- **Header:** `main` at `c1586c6`, after PRs #44 to #49.
- **A platform contracts table** (new section 1.1): AAB-PLATFORM-01 to 08, with AAB-PLATFORM-03 `implemented`, AAB-PLATFORM-04 `behaviourally proven`, and AAB-PLATFORM-05 to 08 `designed`.
- **Primitives 4 to 7** (section 1): each now names its platform contract, and its gaps against it.
- **Section 2:** the sentence saying the eight SCS contract headers read "No implementation exists" was out of date: they, and the roster, point to their READMEs. The representation path's contract amendments are named for SCS-CAP-02, 04 and 05.
- **Four sentences saying README proof records or document corrections "follow in a separate commit"** (the rule on proof records, SCS-CAP-08 and 09 in section 2.2, and decisions 3 and 7): all were done in PR #26, and now say so.
- **Section 4:** the platform contracts added as the basis for AGR alignment.
- **Section 5.3:** the dependency audit is a completed working document; its independent verification is what is due.
- **Section 6:** `TODO(signing-key-history)` states AAB-PLATFORM-08's precondition; actor-directory history added, as blocking for production and a disclosed limitation for the pilot.
- **Decisions and "What this document does not establish":** brought into line with the above.
- **Updated to `fa84240`:** AAB-PLATFORM-09 in the platform contracts table; primitive 2 points to it; the signing-key history rows in sections 5.1 and 6.1 reference it.

## Items that appear forgotten or drifted

1. **Eleven open PRs from August,** and the CAP-34 audit branch, unchanged (section 4).
2. **The redundant branches** (`agent/id-09-evidence`, `audit/phase-1-sovereignty-baseline-2026-09-15`, `docs/canonical-testing-live-boundary-v163`) are still on the remote.
3. **The roadmap said the dependency audit was "DUE, not started"** after the audit merged (#45). It is corrected in this change.
4. **The SCS-CAP-09 contract contradicted itself** on currency: one passage said an earlier decision's `currencyStatus` "is updated to `SUPERSEDED`", another that it is never changed and is derived when read. The code derives it. Found by the survey for AAB-PLATFORM-08. **Corrected in this change** by an amendment to SCS-CAP-09 (section 11).
5. **Stale comments in the schema mirrors.** `scs-pilot/packages/db/schema/cap-02.sql` said ActorReference "is referenced but never defined", and the other schema files carried `TODO(actor-reference)` notes written before AAB-PLATFORM-03 existed. **Cleared in this change** (section 11).
6. **Open item: SCS's `evaluationSnapshotDigest` is a digest of the evaluation's result, not of its input.** The name says snapshot; what it hashes is the result, with the input list inside it. It is stored in review decisions, checked by SCS-CAP-09 (`EVALUATION_DIGEST_MISMATCH`), re-verified by SCS-CAP-08, and cited by the backup-restore proof. AAB-PLATFORM-07 maps it, when read, to `resultDigest`, and keeps the stored name under the naming rule. **It is not corrected here.** Correcting it would need a migration and a behaviour change, and so its own decision (open decision 5).
7. **Contract file placement is still inconsistent.** AAB-PLATFORM-01 and 02 sit in `governance/workstream-b/`; AAB-PLATFORM-03 to 08 sit in `governance/`.
8. **The queued SCS-CAP-07, 10, 11 and 12 contracts, and WP05's hardware key,** are still recorded only in session notes.
