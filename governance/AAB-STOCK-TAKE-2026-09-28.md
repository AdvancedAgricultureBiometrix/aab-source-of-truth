# AAB Stock-Take — 2026-09-28

**Status:** STOCK-TAKE RECORD
**Authority:** RECORDS THE STATE OF THE REPOSITORY ON 2026-09-28, READ FROM `main` AT `c1586c6` AND UPDATED TO `fa84240`, TO `16d21cc`, TO `dbb2408`, TO `f1bb47d`, TO `d1bc453`, TO `695bc18`, TO `46e3e09`, TO `7e7bbc0`, TO `0461bfb`, TO `a0f0082`, TO `0370bbc`, TO `cb0540d`, TO `4e26c78` AND TO `adda4e8`, FROM GITHUB (OPEN PRS AND BRANCHES) AND FROM THE CI RUNS. It admits, commissions and decides nothing. Where a fact comes from anywhere other than the repository, it says so.
**Supersedes, as the current stock-take:** `governance/AAB-STOCK-TAKE-2026-09-27.md` (at `634295a`), which stays unchanged as the record of that date. This stock-take covers everything merged since that record merged (`5d4edfe`, PR #36).
**Updated (2026-09-28):** to `main` at `fa84240`, after PR #50 (this stock-take, the roadmap update and the SCS-CAP-09 amendment) and PR #51 (AAB-PLATFORM-09 Governed Public-Key Registry). The rest of this record is as it was at `c1586c6`, except where marked.
**Updated again (2026-09-28):** to `main` at `16d21cc`, after PRs #52 to #59: the signing-key history build, complete and proven. Marked "update of `16d21cc`" where it changes this record.
**Updated again (2026-09-28):** to `main` at `dbb2408`, after PRs #60 to #65: the AGR workstream's step 0, and object-store credentials, complete and proven. Marked "update of `dbb2408`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `f1bb47d`, after PRs #66 and #67: the AAB-PLATFORM-01 proof record, and CAP-04's contract committed under the AGR workstream. Marked "update of `f1bb47d`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `d1bc453`, after PR #68, with the AGR capability identity decisions. Marked "update of `d1bc453`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `695bc18`, after PRs #69 to #71: the identity record, migration 025, and CAP-05's contract committed under the AGR workstream. Marked "update of `695bc18`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `46e3e09`, after PRs #72 to #74: challenges to CAP-04's and CAP-05's human decisions, and AAB-PLATFORM-01's storage profiles with the AGR profile. Marked "update of `46e3e09`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `7e7bbc0`, after PRs #75 to #77: CAP-01's contract committed under the AGR workstream, and the cognitive loop retired from the migration. Marked "update of `7e7bbc0`" where it changes this record.
**Updated again (2026-09-29):** to `main` at `0461bfb`, after PRs #78 to #81: the platform's observation and brain governance, the purpose and values amended, and CAP-08's contract committed under the AGR workstream. Marked "update of `0461bfb`" where it changes this record.
**Updated again (2026-09-30):** to `main` at `a0f0082`, after PRs #82 to #84: CAP-06's contract committed under the AGR workstream, and the domain register and cognitive architecture approved. Marked "update of `a0f0082`" where it changes this record.
**Updated again (2026-09-30):** to `main` at `0370bbc`, after PRs #85 to #87: the roadmap and this record at `a0f0082`, the public overview revised, and CAP-07's contract committed under the AGR workstream with CAP-08 amended. Marked "update of `0370bbc`" where it changes this record.
**Updated again (2026-09-30):** to `main` at `cb0540d`, after PRs #88 and #89: the roadmap and this record at `0370bbc`, and CAP-09's contract committed under the AGR workstream, completing its contract phase. Marked "update of `cb0540d`" where it changes this record.
**Updated again (2026-09-30):** to `main` at `4e26c78`, after PRs #90 to #94: the roadmap and this record at `cb0540d`, the public overview's one revision, the dependency audit's addendum, the independent review pack, and the addendum's correction. Marked "update of `4e26c78`" where it changes this record.
**Updated again (2026-09-30):** to `main` at `adda4e8`, after PRs #95 to #98: the roadmap and this record at `4e26c78`, the review access notice, the audit's amendment 1 with V13, and review pack version 2. Marked "update of `adda4e8`" where it changes this record.
**Noted (2026-10-01):** a second internal dry run, of review pack version 2, was carried out by an external AI system (ChatGPT) and, as reported to the Platform Owner, returned **VERIFIED FOR DEFINED SCOPE** on all 43 checklist items, with no FAIL, no EVIDENCE REQUIRED and no new finding: V1 to V13 confirmed, and its search beyond the listed vocabulary found no V14. Its corrected vocabulary scan detected V13 and derived the 32 SCS domain tables. **The same limitation applies as to the first:** it stated that it is not organisationally independent of the prior AAB work, so **it does not discharge the requirement for a signed review by an independent human reviewer.** Its findings record is not in this repository. Code's own dry runs checked only that the pack's reproduction commands run end to end on a fresh clone; they did not work through the checklist.
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
- **Updated to `d1bc453`:**
  - **The AGR capability identities are decided** (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`):
    - observation is **CAP-36 Governed Observation and Field Evidence, proposed**, and not canonical until the ten-point checklist is completed, with the registry, the CAP-34 fidelity manifest and the validators updated together;
    - resource intelligence belongs to CAP-01, with no new number;
    - cognitive intelligence is split between CAP-01 and CAP-06, with its loop held until `cognitive_core` is read.
  - **CAP-01 enters the workstream's priority order,** third: CAP-04 → CAP-05 → CAP-01 → CAP-08 → CAP-06 → CAP-07 → CAP-09.
  - **CI on `d1bc453`** (run 36497005758) passed.
- **Updated to `695bc18`:**
  - **The capability identity record is on `main`** (#69), with CAP-01 in the order.
  - **Receipts accept AAB identifiers by pattern** (#70, migration 025): `CAP-01` to `CAP-99` except `CAP-29`, and `AAB-PLATFORM-01` to `AAB-PLATFORM-99`. Format only: it makes no capability canonical. **CAP-04's receipt prerequisite is met in the database;** the application's capability types open in the extraction's step 2.
  - **CAP-05 Governed Scientific Reasoning has its contract committed under the AGR workstream** (#71). Steps 1 to 3 are complete. It stays `designed`, and nothing is built.
  - **`cognitive_core` is read in full.** The cognitive loop is not CAP-05. `cognitive_foundation_workspace` moves from CAP-01 to the held group, so CAP-01 holds 15 rehearsal actions.
  - **CAP-04 is amended again,** with two corrections following CAP-05's amendment.
  - **CI on `695bc18`** (run 36510903624): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `46e3e09`:**
  - **The roadmap and this record at `695bc18`** (#72), with the next four items in the order decided in review.
  - **CAP-04 and CAP-05 name who may challenge their human decisions** (#73). Challenge resolutions are final, as the pilot position.
  - **AAB-PLATFORM-01 defines storage profiles, and the AGR profile** (#74): `agr-evidence`, GOVERNANCE for `Years: 100`, its own media types, 100 MB and 50 GiB limits, and uploads by `MEMORY_SUBMITTER`. **The lock is protection, not expiry:** the platform never deletes on a schedule. The SCS profile is unchanged.
  - **Both of CAP-04's prerequisites before any code are met.** CAP-04 adds check 12, `FORMAT_NOT_DECLARED`, under rules `cap-04-admission-2`.
  - **The first two of the four next items are done.** CAP-01's step 1 is next.
  - **CI on `46e3e09`** (run 36518359017): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `7e7bbc0`:**
  - **The roadmap and this record at `46e3e09`** (#75), with AAB-PLATFORM-01's header corrected.
  - **CAP-01 Country Intelligence & Discovery has its contract committed under the AGR workstream** (#76): a new canonical contract, steps 1 to 3 complete. It stays `designed`, and nothing is built. **Canonical contracts: 22.**
  - **Eight of the 34 country actions are not platform-wide:** six CAP-01's, one CAP-02's, one CAP-06's; none is brought across.
  - **The cognitive loop is retired from the migration** (#77), with no number. Its ideas are recorded against their owners. The held group is closed.
  - **The next capability in the workstream's order is CAP-08.**
  - **CI on `7e7bbc0`** (run 36522505728): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `0461bfb`:**
  - **The roadmap and this record at `7e7bbc0`** (#78).
  - **The platform's observation and brain governance is approved** (#79; `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`): **automate reasoning, govern its outputs.** A platform rule, binding every capability contract and brain implementation.
  - **The purpose and values carry the corrected brain boundary** (#80).
  - **CAP-08 Controlled Trials & Outcomes has its contract committed under the AGR workstream** (#81): a new canonical contract, steps 1 to 3 complete, with thirteen decisions and eight interim positions. It stays `designed`, and nothing is built. **Canonical contracts: 23.**
  - **AAB-PLATFORM-01's AGR profile names `TRIAL_RECORDER` as an uploader** (#81).
  - **Two new open items:** a safety escalation path, and the automated reasoning pathway for observations (section 9).
  - **The next capability in the workstream's order is CAP-06.**
  - **CI on `0461bfb`** (run 36553109296): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `a0f0082`:**
  - **The roadmap and this record at `0461bfb`** (#82).
  - **CAP-06 Ingredient Intelligence has its contract committed under the AGR workstream** (#83): a new canonical contract, steps 1 to 3 complete, with fourteen decisions. It stays `designed`, and nothing is built. **Canonical contracts: 24.**
  - **The domain register and cognitive architecture is approved** (#84; `governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`): domains distinguished from the capabilities that operate across them; domain brains, the Main Brain (a working name) and human governance. A platform rule. **No official domain or brain register is created.**
  - **The rehearsal's two unauthenticated ingredient reads are blocked at its server** (2026-09-29; from the session, not the repository): a change to the rehearsal's hosting, at the Platform Owner's instruction (roadmap, decision 35).
  - **The roadmap's CAP-06 mapping is corrected:** five gateway actions the catalogue did not list.
  - **The public overview is out of date,** and is not corrected here (open decision 6).
  - **The next capability in the workstream's order is CAP-07.**
  - **CI on `a0f0082`** (run 36639227335): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `0370bbc`:**
  - **The roadmap and this record at `a0f0082`** (#85).
  - **The public overview is revised** (#86) to the governance records at `a0f0082`, cleared again for external use on 2026-09-30. It states the governing principle, "automate reasoning, govern its outputs". **Open decision 6 is closed.**
  - **CAP-07 Formulation Intelligence has its contract committed under the AGR workstream** (#87): a new canonical contract, steps 1 to 3 complete, with seventeen decisions. It stays `designed`, and nothing is built. **Canonical contracts: 25.**
  - **CAP-08 is amended** (#87): its test material is governed by CAP-07 and CAP-06. A lapsed acceptance during a trial is disclosed, not a stop: the pilot position.
  - **The public overview is out of date again for CAP-07** (drift item 15). It is revised once, at the end of the workstream.
  - **The next capability in the workstream's order is CAP-09, the last.**
  - **CI on `0370bbc`** (run 36646694448): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `cb0540d`:**
  - **The roadmap and this record at `0370bbc`** (#88).
  - **CAP-09 Governed Scientific Learning has its contract committed under the AGR workstream** (#89): a new canonical contract, steps 1 to 3 complete, with seventeen decisions. It stays `designed`, and nothing is built. **Canonical contracts: 26.**
  - **The contract phase of the AGR workstream is complete:** all seven capabilities in its order are `designed`. None is built.
  - **Next:** the one revision of the public overview, and then the dependency audit's independent verification, which gates every AGR capability's code.
  - **CI on `cb0540d`** (run 36650653765): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `4e26c78`:**
  - **The roadmap and this record at `cb0540d`** (#90).
  - **The public overview's one revision** (#91): seven AGR capabilities `designed`, none built. Open decision 6 and drift item 15 are closed.
  - **The dependency audit's addendum at `405fbe8`** (#92; `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`): INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED. Its tools and evidence are committed for the first time. A new version of an existing schema keeps its namespace. Its V8 count corrected (#94).
  - **The independent review pack is issued** (#93; `governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK/`), pinned to `c91ce33`. **The reviewer is not appointed** (open decision 8).
  - **Canonical contracts: 26,** unchanged.
  - **CI on `4e26c78`** (run 36670152574): 752 of 752 tests, isolation, and backup-restore `PROVEN`.
- **Updated to `adda4e8`:**
  - **The roadmap and this record at `4e26c78`** (#95).
  - **The repository is public, deliberately, with no licence** (#96): `REVIEW-ACCESS-NOTICE.md` at the root, and a licence status notice in the README.
  - **An internal dry run of review pack version 1 produced NOT VERIFIED** (C3, K2). **The audit's amendment 1** (#97; `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md`) records **V13,** corrects three statements in the addendum, and corrects the vocabulary scanner.
  - **Review pack version 2 is issued** (#98; `governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK-V2/`), pinned to `a797f54`, superseding version 1 for the review. **The reviewer is not appointed** (open decision 8).
  - **Canonical contracts: 26,** unchanged.
  - **CI on `adda4e8`** (run 36675880058): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

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

| #68 | `d1bc453` | The roadmap and this record at `f1bb47d`: CAP-04 committed under the AGR workstream; the `/agr/v1/` decision; AAB-PLATFORM-06's amendment (update of `d1bc453`) | Governance |
| #69 | `48ed174` | The AGR capability identity decisions; CAP-01 in the priority order; the roadmap and this record at `d1bc453` (update of `695bc18`) | Governance |
| #70 | `9be45b2` | Migration 025: receipts accept AAB landscape and platform contract identifiers, by pattern, format only (update of `695bc18`) | Migration, tests |
| #71 | `695bc18` | CAP-05 canonical amendment, step 1 of the AGR workstream: aligned with AAB-PLATFORM-03 and 05 to 09 and CAP-04, and the rehearsal, `cognitive_core` included, accounted for; CAP-04's corrections amendment; the identity record's note on `cognitive_foundation_workspace` (update of `695bc18`) | Contracts, governance |

| #72 | `a46635a` | The roadmap and this record at `695bc18`: CAP-05 committed under the AGR workstream; the next four items in order (update of `46e3e09`) | Governance |
| #73 | `3450fe2` | CAP-04 and CAP-05: challenges to their human decisions; resolutions final, as the pilot position (update of `46e3e09`) | Contracts |
| #74 | `46e3e09` | AAB-PLATFORM-01 storage profiles and the AGR profile; CAP-04 aligned, with check 12 and rules `cap-04-admission-2` (update of `46e3e09`) | Contracts |

| #75 | `fa24b76` | The roadmap and this record at `46e3e09`; AAB-PLATFORM-01's header corrected (update of `7e7bbc0`) | Governance |
| #76 | `6756265` | CAP-01 Country Intelligence & Discovery: a new canonical contract, step 1 of the AGR workstream; the identity record's note on eight country actions (update of `7e7bbc0`) | Contract |
| #77 | `7e7bbc0` | The cognitive loop retired from the AGR migration: the identity record's note, and this record's loop item (update of `7e7bbc0`) | Governance |

| #78 | `490f076` | The roadmap and this record at `7e7bbc0`: CAP-01 committed, the loop retired (update of `0461bfb`) | Governance |
| #79 | `587c817` | The platform's observation and brain governance, approved in the governance session of 2026-09-29 (update of `0461bfb`) | Governance |
| #80 | `48a928c` | The purpose and values: corrected and extended brain boundary (update of `0461bfb`) | Governance |
| #81 | `0461bfb` | CAP-08 Controlled Trials & Outcomes: a new canonical contract; AAB-PLATFORM-01's AGR profile names `TRIAL_RECORDER` (update of `0461bfb`) | Contracts |

| #82 | `5e81c86` | The roadmap and this record at `0461bfb`: brain governance and CAP-08 committed (update of `a0f0082`) | Governance |
| #83 | `a0f0082` | CAP-06 Ingredient Intelligence: a new canonical contract (update of `a0f0082`) | Contract |
| #84 | `5f74838` | The domain register and cognitive architecture, approved on 2026-09-30 (update of `a0f0082`) | Governance |

| #85 | `ae1611a` | The roadmap and this record at `a0f0082`: CAP-06 and the domain register committed (update of `0370bbc`) | Governance |
| #86 | `d2130df` | AAB-OVERVIEW-01 revised to the governance records at `a0f0082` (update of `0370bbc`) | Governance |
| #87 | `0370bbc` | CAP-07 Formulation Intelligence: a new canonical contract; CAP-08 amended (update of `0370bbc`) | Contracts |

| #88 | `985bd6c` | The roadmap and this record at `0370bbc`: CAP-07 committed, CAP-08 amended (update of `cb0540d`) | Governance |
| #89 | `cb0540d` | CAP-09 Governed Scientific Learning: a new canonical contract (update of `cb0540d`) | Contract |

| #90 | `4d35509` | The roadmap and this record at `cb0540d`: CAP-09 committed, the contract phase complete (update of `4e26c78`) | Governance |
| #91 | `405fbe8` | AAB-OVERVIEW-01 revised once, with every AGR migration contract on `main` (update of `4e26c78`) | Governance |
| #92 | `c91ce33` | The dependency audit's addendum at `405fbe8`, with its tools and evidence (update of `4e26c78`) | Governance |
| #93 | `a329973` | The dependency audit's independent review pack, version 1 (update of `4e26c78`) | Governance |
| #94 | `4e26c78` | The addendum's V8 count corrected (update of `4e26c78`) | Governance |

| #95 | `24d5fdf` | The roadmap and this record at `4e26c78`: the audit addendum and review pack issued (update of `adda4e8`) | Governance |
| #96 | `f2c527d` | The review access notice, and the README's licence status (update of `adda4e8`) | Governance |
| #97 | `a797f54` | The dependency audit's amendment 1: V13, three corrections, the vocabulary scanner corrected (update of `adda4e8`) | Governance |
| #98 | `adda4e8` | The dependency audit's independent review pack, version 2 (update of `adda4e8`) | Governance |

Every one of them passed all three CI jobs before it merged, and so did #50 to #98. #84 merged before #83; #96 merged before #95. #90's first `backup-restore` run failed at `npm ci` inside its Docker build, before the proof took a step, and passed on a re-run: a transient package-registry failure, not caused by the change.

## 2. What is on `main`

State labels are the platform's maturity states: `named only`, `designed`, `implemented`, `behaviourally proven`, `admitted`, `commissioned`.

### 2.1 Canonical contracts: 21 (22 since `7e7bbc0`, with CAP-01; 23 since `0461bfb`, with CAP-08; 24 since `a0f0082`, with CAP-06; 25 since `0370bbc`, with CAP-07; 26 since `cb0540d`, with CAP-09)

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
| AAB-PLATFORM-01 Evidence Object Store | **`behaviourally proven`** (update of `dbb2408`; was `implemented`, upload) | **Amended** (#63): three identities, Object Lock (GOVERNANCE, 2,192 days), the ARN bucket policy, the override credential, overwrites versioned and detected. Built (#65) and proven (`governance/workstream-b/AAB-PLATFORM-01-OBJECT-STORE-PROOF-2026-09-28.md`); a note of 2026-09-28 records it. **Amended again** (#74; update of `46e3e09`): storage profiles, and the AGR profile. The SCS profile is unchanged; the AGR profile is designed, not built, and the proof covers the SCS profile only. **Amended again** (#81; update of `0461bfb`): `TRIAL_RECORDER` may upload under the AGR profile |
| AAB-PLATFORM-02 Governed Document Rendition | `implemented` | None |
| AAB-PLATFORM-03 ActorReference | **`implemented`** (was `designed`) | Version 2 issued for every new record (PR #39); version 1 records stay readable. No proof record names it yet. Amended (#53) to cite AAB-PLATFORM-09 for signing keys |
| AAB-PLATFORM-04 Actor–Subject Link | **`behaviourally proven`** (was `designed`) | Second amendment (#42). Proven as adopted by SCS-CAP-02 (README, PR #43). **Update of `16d21cc`:** third amendment (#53), version 2 statements naming their key; its proof noted, and the interim rule on key rotation lifted |
| **AAB-PLATFORM-05 Governed Provenance** | `designed` | **New** (#46) |
| **AAB-PLATFORM-06 Admission Decisions** | `designed` | **New** (#47). **Amended** (#67; update of `f1bb47d`): a check whose failure holds a record is `NOT_PASSED` only in a `HELD_FOR_REVIEW` decision, named in `heldBecause`, and never discloses a limitation by itself |
| **AAB-PLATFORM-07 Frozen Evaluation Snapshots** | `designed` | **New** (#48) |
| **AAB-PLATFORM-08 Attributable Human Review with Currency** | `designed` | **New** (#49). Amended (#53) to cite AAB-PLATFORM-09 |
| **AAB-PLATFORM-09 Governed Public-Key Registry** | **`behaviourally proven`** (update of `16d21cc`; was `designed`) | **New** (#51; update of `fa84240`). Amended five times on 2026-09-28 (#52 to #57). Built by #53 to #59; proven in `governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`; a note of 2026-09-28 records it (#59) |
| **CAP-01 Country Intelligence & Discovery** | `designed` | **New** (#76; update of `7e7bbc0`): written under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, and CAP-04, and records twelve decisions: CAP-01 records and CAP-04 evidences; no computed score; the discovery dossier; `DISCOVERY_REVIEW` and referral to CAP-06; safety and ecology as CAP-10's (`governance/workstream-b/CAP-01-COUNTRY-INTELLIGENCE-AND-DISCOVERY-CANONICAL-CONTRACT-2026-09-29.md`). Nothing is built |
| CAP-04 Governed Scientific Memory | `designed` | **Amended** (#67; update of `f1bb47d`): its contract committed under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, and records ten decisions, the `/agr/v1/` route prefix among them (`governance/workstream-b/CAP-04-SCIENTIFIC-MEMORY-CANONICAL-CONTRACT-2026-09-20.md`). Nothing is built. **Amended again** (#71; update of `695bc18`): two corrections following CAP-05's amendment, on as-of reads and what CAP-05 receives. **Amended twice more** (update of `46e3e09`): challenges to its human decisions (#73); originals under AAB-PLATFORM-01's AGR profile, check 12 and rules `cap-04-admission-2` (#74) |
| CAP-05 Governed Scientific Reasoning | `designed` | **Amended** (#71; update of `695bc18`): its contract committed under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-03 and 05 to 09, and records eleven decisions: persisted landscapes over frozen snapshots, requester-assigned stance, `LANDSCAPE_REVIEW`, no historical landscapes, and no dependence on the cognitive loop (`governance/workstream-b/CAP-05-GOVERNED-SCIENTIFIC-REASONING-CANONICAL-CONTRACT-2026-09-20.md`). Nothing is built. **Amended again** (#73; update of `46e3e09`): challenges to landscape reviews |
| **CAP-06 Ingredient Intelligence** | `designed` | **New** (#83; update of `a0f0082`): written under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, and CAP-04, cites the observation and brain governance as binding, and records fourteen decisions: CAP-06 records and CAP-04 evidences; ingredients and candidates, written once; no score or ranking; acceptance for formulation research by an independent scientist, the only thing that lets CAP-07 use an ingredient; prohibited and unsafe material never accepted, synthetic agrochemicals only as reference material; CAP-01's referrals received by a person (`governance/workstream-b/CAP-06-INGREDIENT-INTELLIGENCE-CANONICAL-CONTRACT-2026-09-29.md`). Nothing is built |
| **CAP-07 Formulation Intelligence** | `designed` | **New** (#87; update of `0370bbc`): written under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, CAP-04 and CAP-06, and records seventeen decisions: every component a CAP-06 ingredient with a valid, current acceptance; quantities on a declared basis; no score or ranking; `ACCEPT_FOR_TRIAL` by an independent scientist; never approval, never manufacturing eligibility; no trial creation or formulation generator; composition disclosed only to CAP-07 roles; carrier-only controls (`governance/workstream-b/CAP-07-FORMULATION-INTELLIGENCE-CANONICAL-CONTRACT-2026-09-30.md`). Nothing is built |
| **CAP-08 Controlled Trials & Outcomes** | `designed` | **New** (#81; update of `0461bfb`): written under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-01, 03 and 05 to 09, and CAP-04, cites the observation and brain governance as binding, and records thirteen decisions and eight interim positions: a locked protocol with a control arm; independent activation on a declared safety basis; observations admitted by rule, with a safety signal held at once; a descriptive, machine-generated outcome summary; an independent outcome review; nothing automatic (`governance/workstream-b/CAP-08-CONTROLLED-TRIALS-AND-OUTCOMES-CANONICAL-CONTRACT-2026-09-29.md`). Nothing is built. **Amended** (#87; update of `0370bbc`): the test material governed by CAP-07 and CAP-06, checked at registration and activation; a lapsed acceptance during a trial disclosed, as the pilot position |
| **CAP-09 Governed Scientific Learning** | `designed` | **New** (#89; update of `cb0540d`): written under the AGR workstream (steps 1 to 3). It adopts AAB-PLATFORM-03 and 05 to 09, CAP-04 and CAP-05, and records seventeen decisions: claims citing only admitted CAP-04 records, with a declared boundary; a dossier with no score and no automatic promotion; an unreplicated promotion carrying `UNREPLICATED` permanently; independent promotion; negative results as learning; never safety, never approval; a 36-month lapse as the pilot position (`governance/workstream-b/CAP-09-GOVERNED-SCIENTIFIC-LEARNING-CANONICAL-CONTRACT-2026-09-30.md`). Nothing is built |
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

**Update of `695bc18`:**
- **Migrations:** 25 (001 to 025). 025 replaces the receipt table's capability check: the SCS list and AAB-PLATFORM-09 as before, and AAB landscape and platform contract identifiers by pattern. Format only.
- **CI:** 752 tests. The new ones are `integration/receipt-capability-ids.test.ts`; the key registry's refusal case now uses `AAB-KEY-REGISTRY`, since `AAB-PLATFORM-10` is now a valid format.
- **No other code changes:** #69 and #71 are governance and contracts only. CI on `main`: run 36506127480 on `48ed174` (#69) passed, 748 tests; run 36508458527 on `9be45b2` (#70) passed, 752 tests, backup-restore `PROVEN`.

**Update of `46e3e09`:** no code changes since `695bc18`: #72 to #74 are governance and contracts only. CI on `main`: run 36512567628 on `a46635a` (#72) and run 36514101249 on `3450fe2` (#73) passed; run 36518359017 on `46e3e09` (#74): 752 of 752 tests, isolation, and backup-restore `PROVEN`. The AGR profile's store behaviour was tested on 2026-09-29 in a throwaway SeaweedFS 4.47 instance, recorded in AAB-PLATFORM-01's amendment (section 10). It is not yet asserted by CI, since nothing of the AGR profile is built.

**Update of `7e7bbc0`:** no code changes since `46e3e09`: #75 to #77 are governance and contracts only. CI on `main`: run 36519681991 on `fa24b76` (#75) and run 36521536864 on `6756265` (#76) passed; run 36522505728 on `7e7bbc0` (#77): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `0461bfb`:** no code changes since `7e7bbc0`: #78 to #81 are governance and contracts only. CI on `main`: run 36523739190 on `490f076` (#78), run 36544326582 on `587c817` (#79) and run 36550974054 on `48a928c` (#80) passed; run 36553109296 on `0461bfb` (#81): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `a0f0082`:** no code changes since `0461bfb`: #82 to #84 are governance and contracts only. CI on `main`: run 36554752074 on `5e81c86` (#82) and run 36637765887 on `5f74838` (#84) passed; run 36639227335 on `a0f0082` (#83): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `0370bbc`:** no code changes since `a0f0082`: #85 to #87 are governance and contracts only. CI on `main`: run 36643436479 on `ae1611a` (#85) and run 36643456158 on `d2130df` (#86) passed; run 36646694448 on `0370bbc` (#87): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `cb0540d`:** no code changes since `0370bbc`: #88 and #89 are governance and contracts only. CI on `main`: run 36648494859 on `985bd6c` (#88) passed; run 36650653765 on `cb0540d` (#89): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `4e26c78`:** no code changes since `cb0540d`: #90 to #94 are governance, tools outside the application, and evidence only; `scs-pilot/` is unchanged. CI on `main`: run 36653548258 on `4d35509` (#90), run 36656170292 on `405fbe8` (#91), run 36659891544 on `c91ce33` (#92) and run 36668344706 on `a329973` (#93) passed, each 752 of 752 tests, isolation, and backup-restore `PROVEN`; run 36670152574 on `4e26c78` (#94): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

**Update of `adda4e8`:** no code changes since `4e26c78`: #95 to #98 are governance, a tool outside the application and its evidence; `scs-pilot/` is unchanged. CI on `main`: run 36673332110 on `f2c527d` (#96), run 36673355893 on `24d5fdf` (#95) and run 36674894727 on `a797f54` (#97) passed, each 752 of 752 tests, isolation, and backup-restore `PROVEN`; run 36675880058 on `adda4e8` (#98): 752 of 752 tests, isolation, and backup-restore `PROVEN`.

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
| AGR capability identity decisions (#69; update of `695bc18`) | CAP-36 proposed; resource intelligence to CAP-01; the cognitive split, with the loop held; CAP-01 in the order (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`). A note of 2026-09-29 (#71) moves `cognitive_foundation_workspace` to the held group | Proposes; makes no number canonical |
| The platform's observation and brain governance (#79; update of `0461bfb`) | Two observation classes; the observation chain; capability responsibilities; the brain boundary, "automate reasoning, govern its outputs"; machine state; consent, authority and privacy; fail-closed requirements (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, internal reference AAB-GOV-DEC-OBSERVATION-BRAIN-01) | **Approved** in the governance session of 2026-09-29. A platform rule; every capability contract and brain implementation cites it |
| The purpose and values' amendment (#80; update of `0461bfb`) | The corrected and extended brain boundary, in `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md` | Amends the revision; nothing else in it changes |
| The domain register and cognitive architecture (#84; update of `a0f0082`) | AAB's independent knowledge domains, planned and provisional, distinguished from the capabilities that operate across them; how domains exchange knowledge; the cognitive architecture of domain brains, the Main Brain (a working name) and human governance; minimum-necessary governed packets; sovereignty applied to brain activity (`governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`, internal reference AAB-GOV-DEC-DOMAIN-COGNITIVE-01) | **Approved** on 2026-09-30. A platform rule. Creates no official register, and assigns no identifier |
| The dependency audit's addendum (#92, corrected by #94; update of `4e26c78`) | The audit brought to `405fbe8`: V1 to V12 at the current code, the 21 new platform modules, one omission corrected, the schema-version decision; the tools (`governance/tools/dependency-audit/`) and their outputs (`governance/audits/platform-dependency/2026-09-30/`) (`governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`) | **INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED** |
| The dependency audit's amendment 1 (#97; update of `adda4e8`) | V13: the platform key registry knows SCS-CAP-02's link tables by name, and reads them; three corrections to the addendum; the vocabulary scanner corrected (`DOMAIN_TABLE`), with its evidence in `governance/audits/platform-dependency/2026-09-30-amendment-1/`; `roles-rls.sql`'s grants not a violation (`governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md`) | **INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED** |
| The independent review pack, version 2 (#98; update of `adda4e8`) | Self-contained; pinned to `a797f54`; the audit, addendum and amendment 1 together; a 43-item checklist (`governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK-V2/`) | **Issued.** Supersedes version 1 for the review. Immutable; the reviewer is not appointed |
| The review access notice (#96; update of `adda4e8`) | `REVIEW-ACCESS-NOTICE.md`: the terms on which the public repository may be inspected and audited; no licence granted | In force |
| The independent review pack, version 1 (#93; update of `4e26c78`) | For the independent verification of the dependency audit: pinned to `c91ce33`; a 41-item checklist; a conflict-of-interest declaration; a findings template; three results, never PRODUCTION AUTHORISED (`governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK/`) | **Issued.** Immutable; the reviewer is not appointed. **Superseded for the review by version 2** (update of `adda4e8`); kept on record as issued |
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

**Update of `d1bc453`:** the capability identity record is written (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`), in the same change as this update. Next, in the order decided in review on 2026-09-29:
- **the receipt migration for AGR capability identifiers,** CAP-04's first prerequisite before any code: a small platform PR;
- **CAP-05's step 1.**

**Update of `f1bb47d`:** no work in flight on the repository beyond this update. **CAP-04's contract is done** (#67). The capability identity record is still to be written, with the content above. After it, as recorded in the roadmap:
- **CAP-04's two prerequisites before any code:** the receipt migration for AGR capability identifiers, and the platform decision on the object store's parameters for AGR content;
- **CAP-05's step 1,** the next capability in the workstream's order.

CAP-04's code also waits on the dependency audit's independent verification and the extraction. The draft demonstration page outside the repository is unchanged: its condition is met, and publishing it is a separate decision.

**Update of `695bc18`:** no work in flight on the repository beyond this update. **The identity record, the receipt migration and CAP-05's contract are done** (#69 to #71). Next, in the order decided in review on 2026-09-29:
1. **CAP-04's challenging role.** A follow-up agreed in review of #71: AAB-PLATFORM-08 (section 13) requires a domain to name one, and CAP-04's amendment does not. Small, and it closes a known contract gap.
2. **The object store's parameters for AGR content:** retention, media types and size limits. CAP-04's second prerequisite before any code, resolved before CAP-04's implementation begins. A governance decision, not a build task.
3. **CAP-01's step 1,** the next capability in the workstream's order. It follows the object-store decision.
4. **The cognitive loop's identity decision.** It needs more reading and deliberation, and runs in parallel with the others as understanding develops. It does not block the workstream. **Decided on 2026-09-29: loop retired from migration, ideas redistributed** (the identity record's note of 2026-09-29).

**Update of `46e3e09`:** no work in flight on the repository beyond this update. **Items 1 and 2 above are done:** CAP-04's challenging role (#73, with CAP-05's challenge operations), and the object store's parameters for AGR content (#74). Next:
- **CAP-01's step 1,** its canonical contract, the next capability in the workstream's order;
- **the cognitive loop's identity decision,** in parallel, not blocking. **Decided: loop retired from migration, ideas redistributed,** with no number (the identity record's note of 2026-09-29);
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated (section 9).

**Update of `7e7bbc0`:** no work in flight on the repository beyond this update. **CAP-01's contract is done** (#76), and **the loop is retired** (#77). Next:
- **CAP-08's step 1,** its canonical contract, the next capability in the workstream's order (CAP-04 → CAP-05 → CAP-01 → **CAP-08** → CAP-06 → CAP-07 → CAP-09);
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated (section 9).

**Update of `0461bfb`:** no work in flight on the repository beyond this update. **The observation and brain governance, the purpose and values' amendment, and CAP-08's contract are done** (#79 to #81). Next:
- **CAP-06's step 1,** its canonical contract, the next capability in the workstream's order (CAP-04 → CAP-05 → CAP-01 → CAP-08 → **CAP-06** → CAP-07 → CAP-09);
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated; a safety escalation path; the automated reasoning pathway for observations (section 9).

**Update of `a0f0082`:** no work in flight on the repository beyond this update. **CAP-06's contract and the domain register and cognitive architecture are done** (#83, #84). Next:
- **CAP-07's step 1,** its canonical contract, the next capability in the workstream's order (CAP-04 → CAP-05 → CAP-01 → CAP-08 → CAP-06 → **CAP-07** → CAP-09);
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated; a safety escalation path; the automated reasoning pathway for observations; reconciling the domain and brain registers (section 9).

**Update of `0370bbc`:** no work in flight on the repository beyond this update. **CAP-07's contract and CAP-08's amendment are done** (#87). Next:
- **CAP-09's step 1,** its canonical contract, the last capability in the workstream's order (CAP-04 → CAP-05 → CAP-01 → CAP-08 → CAP-06 → CAP-07 → **CAP-09**);
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated; a safety escalation path, now also deciding automatic suspension; the automated reasoning pathway for observations; reconciling the domain and brain registers; disclosing one formulation's composition (section 9).

**Update of `cb0540d`:** no work in flight on the repository beyond this update. **CAP-09's contract is done** (#89), **and with it the contract phase of the AGR workstream:** CAP-04 → CAP-05 → CAP-01 → CAP-08 → CAP-06 → CAP-07 → CAP-09, all `designed`. Next:
- **the one revision of the public overview,** decided on 2026-09-30 for this point (drift item 15);
- **the dependency audit's independent verification** (roadmap, section 5.3), which gates step 4 for every AGR capability, and has no reviewer appointed;
- **recorded, not ordered:** an AAB-PLATFORM-07 amendment for a snapshot member whose admission is invalidated; a safety escalation path, deciding automatic suspension too; the automated reasoning pathway for observations; reconciling the domain and brain registers; disclosing one formulation's composition; two reviewers for wide-boundary learning claims (section 9).

**Update of `4e26c78`:** no work in flight on the repository beyond this update. **The overview's revision, the audit's addendum and the review pack are done** (#91 to #94). Next:
- **appointing the dependency audit's independent reviewer** (open decision 8), which gates every AGR capability's code; the pack is ready to hand over;
- **recorded, not ordered:** the six open items in section 9.

**Update of `adda4e8`:** no work in flight on the repository beyond this update. **The access notice, amendment 1 and review pack version 2 are done** (#96 to #98). Next:
- **appointing the dependency audit's independent reviewer** (open decision 8), who works from version 2;
- **recorded, not ordered:** the six open items in section 9, and V13's fix, which is extraction work.

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

New (update of `a0f0082`):

6. **The public overview** (AAB-OVERVIEW-01): whether, and when, to correct its public wording, now out of date (drift item 12). **Closed** (update of `0370bbc`): revised by #86. **Out of date again** for CAP-07 (drift item 15). **Decided on 2026-09-30:** it is revised once, at the end of the workstream, when every AGR capability contract is on `main`. **Update of `cb0540d`:** every AGR capability contract is on `main`; the one revision is next. **Closed** (update of `4e26c78`): revised once, as decided (#91).
7. **A live read of the domain and brain registers:** whether to authorise it, to reconcile the registered domains and brains with the domain register and cognitive architecture. The Platform Owner decided on 2026-09-30 that it is a separate governed decision, not part of that record's review.
8. **Appointing the dependency audit's independent reviewer** (update of `4e26c78`): who, and on what terms. The review pack is issued (#93); the reviewer's conflict-of-interest declaration is returned before the review begins, and whether a declared interest disqualifies them is decided then. **Update of `adda4e8`:** the reviewer works from review pack version 2 (#98), and receives the repository link and that folder's name. **Noted (2026-10-01):** a second internal dry run, of version 2, by an external AI system (ChatGPT), returned VERIFIED FOR DEFINED SCOPE on all 43 items with no new finding. It is not independent, and does not discharge the requirement for a signed independent human review.

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
- **Receipts for AGR capabilities.** A platform migration extending the receipt table, and the error types, to AGR capability identifiers. The pilot accepts only SCS identifiers and AAB-PLATFORM-09 (dependency audit, V3 and V5). It comes before any CAP-04 endpoint. **Met in the database** (update of `695bc18`): migration 025 (#70). The error types open in the extraction's step 2 (V3).
- **The object store's parameters for AGR content.** Retention, media types and size limits, decided by the platform before the object store is used for AGR content. AAB-PLATFORM-01's were set for EUDR supply-chain evidence, and scientific memory does not inherit them. Until then, no AGR original is stored.

**Update of `46e3e09`:** **both are met.** The receipts by migration 025 (#70), in the database; the store's parameters by AAB-PLATFORM-01's AGR profile (#74). CAP-04's code still waits on the dependency audit's independent verification and the extraction.

**Before any CAP-05 code** (update of `695bc18`; CAP-05 amendment of 2026-09-29): CAP-04 built first, since every landscape member is read from it; and the extraction, as for every AGR capability. Its receipts are accepted already (migration 025).

## 6. What is deferred, and its trigger

| Item | Trigger | Change since the last stock-take |
|---|---|---|
| **Independent verification of the dependency audit** | **Due now.** It precedes any extraction. **Update of `4e26c78`:** the review pack is issued (#93); the reviewer is not appointed (open decision 8) | The audit exists as a working document (#45); the independent reviewer is not appointed |
| Extraction of the platform primitives | The independent verification, and, for primitives 4 to 7, their platform contracts (now on `main`) | The contracts precondition is met for primitives 4 to 7 |
| **The signing-key history build** (update of `fa84240`) | AAB-PLATFORM-09 is on `main`, and both bootstrap pilot positions are recorded. Next: a build plan, for review before any code | **Complete** (update of `16d21cc`): PRs #53 to #59 |
| **Domain adoption of AAB-PLATFORM-05 to 08** | An amendment to each domain's contracts, mapping existing records when read, never rewriting them | **New.** No domain has adopted them. For AAB-PLATFORM-08, also signing-key history (section 5): **met** (update of `16d21cc`). **Update of `695bc18`:** AGR's CAP-04 (#67) and CAP-05 (#71) adopt them by amendment, as contracts; nothing implements an adoption, and SCS has not adopted them |
| **A platform error envelope contract** | Before `SCS-PLATFORM` can change in error envelopes (the naming rule) | **New** |
| **The AAB-PLATFORM-03 proof record** | Before AAB-PLATFORM-03 can be raised from `implemented` | **New.** The behaviour is tested; no record names it |
| **Signed party grants** | `PARTY_REPRESENTATIVE` and `PARTY_AUTHORITY_REPRESENTATIVE` grants are operator configuration in the actors file; in production each must be a signed, evidenced act | Now relied on by representative submission, which is built |
| AGR capabilities built on the platform | Extraction, and AGR's adoption of AAB-PLATFORM-05 to 08 | The contracts exist. **Update of `16d21cc`:** now the AGR rehearsal migration workstream (roadmap, section 8), in the order CAP-04, 05, 08, 06, 07, 09. Step 0, obtaining the rehearsal's source, may start now, and contract work follows it. **Update of `dbb2408`:** step 0 is done (#61, #62), and contract work may begin. **Update of `f1bb47d`:** CAP-04's contract is committed under the workstream (#67), and CAP-04 has two platform prerequisites before any code (section 5). Its code waits on the audit's independent verification and the extraction. Observation, cognitive and resource intelligence need capability numbers and identities first. **Update of `d1bc453`:** decided (the identity record): CAP-36 proposed, CAP-01, and the cognitive split with its loop held. The order is now CAP-04, 05, **01**, 08, 06, 07, 09. **Update of `695bc18`:** CAP-05's contract is committed under the workstream (#71), and CAP-04's receipt prerequisite is met in the database (#70). CAP-01, next in the order, holds 15 rehearsal actions; `cognitive_foundation_workspace` is held with the loop. **Update of `46e3e09`:** CAP-04's second prerequisite is met (#74), and its and CAP-05's challenge rules are complete (#73). CAP-01's step 1 is next. **Update of `7e7bbc0`:** CAP-01's contract is committed (#76), and the loop is retired from the migration (#77). CAP-08's step 1 is next. **Update of `0461bfb`:** CAP-08's contract is committed (#81), bound by the platform's observation and brain governance (#79). CAP-06's step 1 is next. **Update of `a0f0082`:** CAP-06's contract is committed (#83). CAP-07's step 1 is next **Update of `0370bbc`:** CAP-07's contract is committed and CAP-08 amended (#87). CAP-09's step 1 is next **Update of `cb0540d`:** CAP-09's contract is committed (#89): **the contract phase is complete.** Every AGR capability's code now waits on the dependency audit's independent verification and the extraction **Update of `4e26c78`:** the audit is current (#92) and its review pack issued (#93); the reviewer is not appointed |
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

**Raised by the observation and brain governance, and CAP-08** (update of `0461bfb`):
- **A safety escalation path.** A safety signal in a trial (contamination, a biosecurity risk, a health risk) is quarantined at once, but who must be told, how fast, who may stop a trial, and how a stop is recorded need a future governance decision. **Update of `0370bbc`:** it also decides whether a trial is suspended automatically when its test material's acceptance lapses (CAP-08, amendment of 2026-09-30).
- **The automated reasoning pathway for observations.** No brain is defined to receive field or trial observations: the cognitive loop is retired, and the Evidence Watch candidate has no contract. Every CAP-08 outcome summary discloses it.

**Raised by CAP-09** (update of `cb0540d`):
- **Two reviewers for wide-boundary learning claims.** The right long-term discipline, recorded so it is not forgotten. Not required now: before the Evidence Watch candidate exists, it would leave wide-boundary promotions blocked with no way to unblock them. What counts as a wide boundary is undefined.
- **New evidence against a promotion.** A promotion becomes stale when its cited evidence changes, not when new contrary evidence is admitted. The Evidence Watch candidate is the intended mechanism; until then, the 36-month lapse forces a second look.

**Raised by CAP-07** (update of `0370bbc`):
- **Disclosing one formulation's composition.** A governed act disclosing it to a named person, for a stated need such as a trial protocol, is not defined. Until it is, the only authorisation is a `FORMULATION_READER` grant covering the country workspace (CAP-07, decision 16).

**Raised by the domain register and cognitive architecture** (update of `a0f0082`):
- **Reconciling the registers.** The step 0 snapshot holds no rows, so the 10 registered domains and 11 registered brains stay unconfirmed. Reconciliation needs a separately authorised live read (open decision 7).
- **Its open questions:** the Environment–Ecosystem boundary; environmental restoration; how the Regulatory, Manufacturing, Commercial and Governance domains relate to CAP-20, CAP-21 and CAP-25; the Main Brain's name and identity, and whether it may rank or recommend; the governed knowledge packet and the Intelligent Node Model.

**Raised by AGR's adoption** (update of `46e3e09`):
- **07: an invalidated admission.** AAB-PLATFORM-07's comparison has no change kind for a snapshot member whose admission is invalidated by an upheld challenge, so a review's triggers do not fire on it. It needs its own amendment (CAP-04 and CAP-05, "Open gaps").
- **08: whether a challenge resolution can be challenged.** CAP-04 and CAP-05 make resolutions final, as the pilot position. Whether they should be challengeable remains an open platform question.
- **01: legal hold's governance,** defined with the override credential's, before real data; **renewing locks** before a profile's period ends; **staging** for originals never admitted, not decided; and the large upload route's operations, when it is built.

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

**Updated to `adda4e8`,** in a later change, at your instruction:
- **This record:** PRs #95 to #98 in section 1; CI in section 2.2; amendment 1, review pack version 2 and the access notice in section 2.3, and version 1 marked superseded for the review; work in progress; open decision 8; drift items 18 and 19.
- **The roadmap:** updated to `adda4e8`. Amendment 1 and version 2 among its sources. Section 5.3 (the dry run, amendment 1 with V13, the scanner, version 2, and V13's fix beside step 3); section 8.5. New decisions 45 (the repository public, with the access notice), 46 (V13 and amendment 1) and 47 (version 2 supersedes version 1); "Still open" updated.
- **Not changed:** the CAP-34 fidelity manifest, the public overview, and both review packs, which are immutable.

**Updated to `4e26c78`,** in a later change, at your instruction:
- **This record:** PRs #90 to #94 in section 1; CI in section 2.2; the addendum and the review pack in section 2.3; work in progress, with the reviewer's appointment next; open decision 6 closed and open decision 8 added; section 6; drift item 15 closed, and items 16 and 17.
- **The roadmap:** updated to `4e26c78`. The addendum and the review pack among its sources. Section 5.3 (the addendum, the tools, the pack; the verification's scope, which excludes the CAP-04 and CAP-05 amendments); section 8.5; section 6.5. New decisions 42 (the addendum), 43 (a schema's new version keeps its namespace) and 44 (the review pack issued); "Still open" gains the reviewer's appointment.
- **Not changed:** the CAP-34 fidelity manifest, the public overview, and the review pack, which is immutable.

**Updated to `cb0540d`,** in a later change, at your instruction:
- **This record:** PRs #88 and #89 in section 1; CAP-09 in the contract table, which now counts 26; CI in section 2.2; work in progress, with the contract phase complete and the overview revision next; open decision 6; section 6; two new open items in section 9; drift item 15.
- **The roadmap:** updated to `cb0540d`. CAP-09 `designed`, in sections 3.1, 3.2, 5.2 (with its place in the dependency diagram), 8.2, 8.4 and 8.6. The public overview in section 6.5. New decisions 40 (CAP-09 committed) and 41 (the contract phase complete); "Still open" gains two reviewers for wide-boundary learning claims.
- **Not changed:** the CAP-34 fidelity manifest, and the public overview, whose one revision is next.

**Updated to `0370bbc`,** in a later change, at your instruction:
- **This record:** PRs #85 to #87 in section 1; CAP-07 in the contract table, which now counts 25, and CAP-08 amended; CI in section 2.2; work in progress, with CAP-09 next; open decision 6 closed; section 6; a new open item in section 9; drift item 15.
- **The roadmap:** updated to `0370bbc`. CAP-07 `designed`, in sections 3.1, 3.2, 5.2 (with its place in the dependency diagram), 8.4 and 8.6; CAP-08 amended in sections 3.2 and 5.2. The public overview in section 6.5. New decisions 38 (CAP-07 committed) and 39 (CAP-08 amended, with the pilot position); "Still open" updated.
- **Not changed:** the CAP-34 fidelity manifest, and the public overview (drift item 15).

**Updated to `a0f0082`,** in a later change, at your instruction:
- **This record:** PRs #82 to #84 in section 1; CAP-06 in the contract table, which now counts 24; CI in section 2.2; the domain register and cognitive architecture in section 2.3; work in progress, with CAP-07 next; two new open decisions in section 4; section 6; new open items in section 9; drift items 12 to 14.
- **The roadmap:** updated to `a0f0082`. The domain register and cognitive architecture among its sources. CAP-06 `designed`, in sections 3.1, 3.2, 5.2 (with its place in the dependency diagram), 8.4 and 8.6; section 3.1 also names CAP-08, omitted at `0461bfb`. The five uncatalogued CAP-06 actions in sections 8.2 and 8.4. The public overview in section 6.5. New decisions 35 (the rehearsal's reads blocked), 36 (CAP-06 committed) and 37 (the domain register and cognitive architecture); two items added to "Still open".
- **Not changed:** the CAP-34 fidelity manifest, and the public overview (open decision 6).

**Updated to `0461bfb`,** in a later change, at your instruction:
- **This record:** PRs #78 to #81 in section 1; CAP-08 in the contract table, which now counts 23, and AAB-PLATFORM-01 amended again; CI in section 2.2; the observation and brain governance and the purpose and values' amendment in section 2.3; work in progress, with CAP-06 next; section 6; two new open items in section 9.
- **The roadmap:** updated to `0461bfb`. The observation and brain governance among its sources. CAP-08 `designed`, in sections 3.2, 5.2 (with its place in the dependency diagram), 8.4 and 8.6. AAB-PLATFORM-01 amended again. New decisions 32 (the observation and brain governance), 33 (the purpose and values amended) and 34 (CAP-08 committed); two items added to "Still open".
- **Not changed:** the CAP-34 fidelity manifest. CAP-08 is still `NOT_YET_REPRESENTED` there, which is true: nothing is built.

**Updated to `7e7bbc0`,** in a later change, at your instruction:
- **This record:** PRs #75 to #77 in section 1; CAP-01 in the contract table, which now counts 22; CI in section 2.2; work in progress, with CAP-08 next; section 6.
- **The roadmap:** updated to `7e7bbc0`. CAP-01 `designed`, in sections 3.1, 3.2, 5.2 (with its place in the dependency diagram), 8.4 and 8.6. The country actions row in section 8.2 corrected. The loop retired, in sections 3.2, 8.2 and 8.4, and closed in "Still open". New decisions 29 (CAP-01 committed), 30 (eight country actions) and 31 (the loop retired).
- **Not changed:** the CAP-34 fidelity manifest. CAP-01's simulation is unchanged, and nothing is built.

**Updated to `46e3e09`,** in a later change, at your instruction:
- **This record:** PRs #72 to #74 in section 1; AAB-PLATFORM-01, CAP-04 and CAP-05 amended, in the contract table; CI in section 2.2; work in progress, with items 1 and 2 done and CAP-01 next; CAP-04's prerequisites met, in section 5; section 6; the open items AGR's adoption raised, in section 9; one item in "Items that appear forgotten or drifted".
- **The roadmap:** updated to `46e3e09`. AAB-PLATFORM-01's storage profiles in the platform contracts table and primitive 3; CAP-04's prerequisites met; the challenge rules in primitive 7 and sections 3.2 and 8.4; legal hold's governance with the override credential's, in section 6.1. New decisions 26 (challenges, and resolutions final as the pilot position), 27 (storage profiles, and the AGR profile) and 28 (the lock is protection, not expiry); three items still open.
- **AAB-PLATFORM-01's header,** corrected in place (item 11 below). HTML re-rendered.
- **Not changed:** the CAP-34 fidelity manifest. Nothing is built.

**Updated to `695bc18`,** in a later change, at your instruction:
- **This record:** PRs #69 to #71 in section 1; CAP-04 amended again and CAP-05 amended, in the contract table; migration 025 and the CI counts in section 2.2; the identity record in section 2.3; work in progress, with the next four items in the order decided in review; CAP-04's receipt prerequisite met in the database, and CAP-05's prerequisites, in section 5; AGR's adoption of the platform contracts, and CAP-05's step 1 done, in section 6; two items in "Items that appear forgotten or drifted".
- **The roadmap:** updated to `695bc18`. CAP-05 committed under the workstream, with steps 1 to 3 done. Migration 025, and CAP-04's receipt prerequisite met in the database. `cognitive_foundation_workspace` held, and CAP-01 at 15 actions. AGR's adoption of AAB-PLATFORM-05 to 08 recorded in sections 1 and 4. The rehearsal's source recorded as in the repository, as evidence, where the roadmap still said it was not. New decisions 23 (migration 025), 24 (CAP-05 committed) and 25 (`cognitive_foundation_workspace` held); decisions 21 and 22 noted.
- **Not changed:** the CAP-34 fidelity manifest. CAP-05's fidelity there describes the simulation, which is unchanged, and nothing is built.

**Updated to `d1bc453`,** in a later change, at your instruction, with the capability identity record (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`, new):
- **This record:** PR #68 in section 1; the identity decisions and CAP-01 in the order, in the summary, work in progress and section 6.
- **The roadmap:**
  - the three rehearsal groups given their identities in sections 3 and 8.2;
  - section 8.4's identity decision marked decided;
  - CAP-01 third in the priority order, with its reason;
  - decision 14 marked decided, and decision 8 noted as amended;
  - new decisions 21 (the identities, and the rule that CAP-36 is not canonical until the checklist is completed with the registry, manifest and validators) and 22 (CAP-01 in the order).
- **Not changed:** the CAP-34 fidelity manifest and the capability registry. CAP-36 is proposed, and changing them is part of making it canonical.

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
9. **The roadmap said the rehearsal's code was not in this repository** (sections 3.1 and 8.1, and "What this document does not establish") after the step 0 snapshots merged (#61, #62). **Corrected in this change** (update of `695bc18`), marked in place.
10. **CAP-04 names no challenging role,** which AAB-PLATFORM-08 (section 13) requires of every adopting domain. Found in the review of CAP-05's amendment. A follow-up PR, agreed in review (section 3). **Done** (update of `46e3e09`; #73).
11. **AAB-PLATFORM-01's header still described an SCS-only store** after its amendment of 2026-09-29 added the AGR profile (#74): its **Domain** line read Supply Chain Sovereignty, and its **Authority** line "a platform service shared by all SCS capabilities". **Corrected in this change** (update of `46e3e09`), marked in place.
12. **The public overview is out of date** (update of `a0f0082`): it shows CAP-01, CAP-06 and CAP-08 as `named only`, counts two AGR capabilities `designed` where there are five, and says no future domain is named. **Not corrected** (open decision 6).
13. **The roadmap's catalogue mapping missed five CAP-06 actions** (update of `a0f0082`): an ungrouped write block and a read bridge, found while writing CAP-06's contract. **Corrected in this change** (roadmap, sections 8.2 and 8.4).
14. **The roadmap's section 3.1 did not name CAP-08's contract** after #81. **Corrected in this change** (update of `a0f0082`).
15. **The public overview is out of date again** (update of `0370bbc`): revised by #86 at `a0f0082`, it shows CAP-07 as `named only` and counts five AGR capabilities `designed`, where there are now six. **Not corrected.** **Decided on 2026-09-30:** it is revised once, at the end of the workstream, when every AGR capability contract is on `main`. **Update of `cb0540d`:** and for CAP-09. Every AGR capability contract is on `main`; the one revision is next. **Closed** (update of `4e26c78`): revised once (#91).
16. **The dependency audit's import-graph script was never committed** (update of `4e26c78`): the audit said it was reproducible, but PR #45 added only the audit. **Corrected** by the addendum (#92), which commits the tools and their outputs.
17. **The addendum's V8 count was wrong** (update of `4e26c78`): it said migration `023` adds one function to `scs`; it adds nine. Found while preparing the review pack, disclosed in the pack's section 5.1, and **corrected** by #94.
18. **The addendum's vocabulary accounting and its summary of the key registry were wrong** (update of `adda4e8`): two of the new `scs.` references it counted under V8 are SCS domain tables, and the key registry, which it called clean except for V2, V3 and V9, also depends on SCS domain storage by name. Found by the internal dry run of review pack version 1 (NOT VERIFIED, C3 and K2). **Corrected** by amendment 1 (#97), which records V13.
19. **The vocabulary scanner could not see a domain table named without the `scs.` prefix, and read no database file** (update of `adda4e8`). **Corrected** by amendment 1 (#97): the `DOMAIN_TABLE` term, derived from the capability schema files.
