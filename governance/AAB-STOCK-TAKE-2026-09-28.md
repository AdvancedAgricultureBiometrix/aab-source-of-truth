# AAB Stock-Take — 2026-09-28

**Status:** STOCK-TAKE RECORD
**Authority:** RECORDS THE STATE OF THE REPOSITORY ON 2026-09-28, READ FROM `main` AT `c1586c6` AND UPDATED TO `fa84240`, FROM GITHUB (OPEN PRS AND BRANCHES) AND FROM THE CI RUNS. It admits, commissions and decides nothing. Where a fact comes from anywhere other than the repository, it says so.
**Supersedes, as the current stock-take:** `governance/AAB-STOCK-TAKE-2026-09-27.md` (at `634295a`), which stays unchanged as the record of that date. This stock-take covers everything merged since that record merged (`5d4edfe`, PR #36).
**Updated (2026-09-28):** to `main` at `fa84240`, after PR #50 (this stock-take, the roadmap update and the SCS-CAP-09 amendment) and PR #51 (AAB-PLATFORM-09 Governed Public-Key Registry). The rest of this record is as it was at `c1586c6`, except where marked.
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

Every one of them passed all three CI jobs before it merged, and so did #50 and #51.

## 2. What is on `main`

State labels are the platform's maturity states: `named only`, `designed`, `implemented`, `behaviourally proven`, `admitted`, `commissioned`.

### 2.1 Canonical contracts: 21

| Contract | State | Change since the last stock-take |
|---|---|---|
| SCS-CAP-01 Regulatory Framework Registration | `behaviourally proven` | None. 1 of 7 operations built |
| SCS-CAP-02 Operator and Supplier Identity Registration | `behaviourally proven` | **Amended four more times** (second to fifth amendments, #37 to #42). Links, mandate verification and representative submission **built and proven** (PR #43). 10 of 16 operations built |
| SCS-CAP-03 Plot and Land Unit Registration | `behaviourally proven` | None. 1 of 8 |
| SCS-CAP-04 Deforestation Evidence Admission | `behaviourally proven` | **Second amendment** (#42). Representative submission **built and proven** |
| SCS-CAP-05 Supply Chain Custody Evidence Admission | `behaviourally proven` | **Second amendment** (#42). Representative submission **built and proven**, with the breaking change to the request |
| SCS-CAP-06 Due Diligence Sufficiency Evaluation | `behaviourally proven` | None. 4 of 5 |
| SCS-CAP-08 Due Diligence Package Compilation | `behaviourally proven` | None. 3 of 5; no export bundle |
| SCS-CAP-09 Regulatory Review and Promotion | `behaviourally proven` | 4 of 6. **Amended** (#50): currency is derived when read, never updated (drift item 4) |
| AAB-PLATFORM-01 Evidence Object Store | `implemented` (upload) | None |
| AAB-PLATFORM-02 Governed Document Rendition | `implemented` | None |
| AAB-PLATFORM-03 ActorReference | **`implemented`** (was `designed`) | Version 2 issued for every new record (PR #39); version 1 records stay readable. No proof record names it yet |
| AAB-PLATFORM-04 Actor–Subject Link | **`behaviourally proven`** (was `designed`) | Second amendment (#42). Proven as adopted by SCS-CAP-02 (README, PR #43) |
| **AAB-PLATFORM-05 Governed Provenance** | `designed` | **New** (#46) |
| **AAB-PLATFORM-06 Admission Decisions** | `designed` | **New** (#47) |
| **AAB-PLATFORM-07 Frozen Evaluation Snapshots** | `designed` | **New** (#48) |
| **AAB-PLATFORM-08 Attributable Human Review with Currency** | `designed` | **New** (#49) |
| **AAB-PLATFORM-09 Governed Public-Key Registry** | `designed` | **New** (#51; update of `fa84240`). Amended on 2026-09-28 with the pilot position for a country registry's first key |
| CAP-04 Governed Scientific Memory | `designed` | None |
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

### 2.3 Governance records added since the last stock-take

| Record | What it establishes | State |
|---|---|---|
| Representation path build plan (#43) | The seven-PR plan the representation path was built to | Complete |
| Roadmap update (#44) | The roadmap at `67b6ba8` | Updated again with this stock-take |
| Platform dependency audit (#45) | V1 to V12; the nine-step extraction plan; the step 0 decision (the naming rule below) | **A completed working document.** Not the independent audit: its independent verification is open (section 6) |
| AAB-PLATFORM-05 to 08 (#46 to #49) | The platform contracts for provenance, admission decisions, frozen evaluation snapshots, and attributable human review with currency | `designed`; proposed, not admitted |

**The naming rule** (the audit's step 0, decided on 2026-09-27): what is already stored or externally visible keeps its SCS name; everything new takes an AAB name. `SCS-PLATFORM` stays in error envelopes until a platform envelope contract exists; the `/scs/v1` platform routes are kept permanently as aliases and new platform routes use `/aab/v1/`; the `scs` database schema is kept; new platform schemas use `urn:aab:schema:`.

## 3. What is in progress

**No work is in flight.**
- There is no uncommitted change other than this stock-take and the roadmap update, and no stash.
- No local branch holds work that is not on `main`, except the two AGR candidate branches.

**Open PRs: twelve, unchanged since the last stock-take.** #19 (AGR candidate remediation, based on the candidate branch) and eleven from August (#2 to #13). None has been updated since then. Their details are in the last stock-take, section 3.

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
| **Signing-key history** (`TODO(signing-key-history)`, 8 uses) | **AAB-PLATFORM-09 Governed Public-Key Registry** (PR #51), which contracts it; AAB-PLATFORM-04, second amendment; `foundation/signatures.ts`; AAB-PLATFORM-08, section 13 | A signature is verified against the signer's current key, so a replaced key invalidates every link and status record it signed. **AAB-PLATFORM-08 adds:** no domain adoption of it can go live with real data until signing-key history is implemented. **Updated to `fa84240`:** the design is now contracted, not built. The condition for real data is AAB-PLATFORM-09's section 11: rotation, restoration, compromise and cross-issuer tests passing, with a proof record. Until then, keys stay in the actors file, one per actor, never rotated while records they signed are in use |
| **Object-store credentials** (`TODO(object-store-credentials)`, 10 uses) | AAB-PLATFORM-01; SCS-CAP-04 and 05 | The API's object store identity has admin rights. It needs a put/read-only identity with object locking "before any real data is stored" |

**Before production: actor-directory history** (no tag yet; AAB-PLATFORM-08, "Open items"). **New.**
- **Why it blocks production.** A human decision identifies its decider by `actorId` and `issuer` only; the accountable name lives in the country's actor directory. AAB-PLATFORM-08 requires that the name held for a decider at the time of a decision can be established later. Without the directory's history, it cannot, and a human decision cannot be fully verified after the fact.
- **Why it does not block the pilot.** The pilot's actors come from a fixed actors file that the operator sets for the deployment, and that is never committed. For the pilot this is a **disclosed limitation**, recorded here, not an immediate blocker: a decider's accountable name at the time of a decision can be established only from the operator's own copy of that file. It becomes a blocker for production, where actors are issued and changed in operation.

**Before live operation** (unchanged): `TODO(backup-encryption)`, `TODO(tenant-scope)`, `TODO(tenant-network-policy)`.

## 6. What is deferred, and its trigger

| Item | Trigger | Change since the last stock-take |
|---|---|---|
| **Independent verification of the dependency audit** | **Due now.** It precedes any extraction | The audit exists as a working document (#45); the independent reviewer is not appointed |
| Extraction of the platform primitives | The independent verification, and, for primitives 4 to 7, their platform contracts (now on `main`) | The contracts precondition is met for primitives 4 to 7 |
| **The signing-key history build** (update of `fa84240`) | AAB-PLATFORM-09 is on `main`, and both bootstrap pilot positions are recorded. Next: a build plan, for review before any code | **New** |
| **Domain adoption of AAB-PLATFORM-05 to 08** | An amendment to each domain's contracts, mapping existing records when read, never rewriting them | **New.** No domain has adopted them. For AAB-PLATFORM-08, also signing-key history (section 5) |
| **A platform error envelope contract** | Before `SCS-PLATFORM` can change in error envelopes (the naming rule) | **New** |
| **The AAB-PLATFORM-03 proof record** | Before AAB-PLATFORM-03 can be raised from `implemented` | **New.** The behaviour is tested; no record names it |
| **Signed party grants** | `PARTY_REPRESENTATIVE` and `PARTY_AUTHORITY_REPRESENTATIVE` grants are operator configuration in the actors file; in production each must be a signed, evidenced act | Now relied on by representative submission, which is built |
| AGR capabilities built on the platform | Extraction, and AGR's adoption of AAB-PLATFORM-05 to 08 | The contracts exist |
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
5. Signing keys for the Platform Owner, the representative and the reviewer. **Signing-key history** (section 5) now also bears on these, and **AAB-PLATFORM-09** defines how they are registered: in the platform control plane's registry for the Platform Owner, and in the country's registry for the representative and any country-issued reviewer.
6. The CAP-34 fidelity manifest extended to the SCS capabilities.
7. The capability itself, ready for assessment, with its documents agreeing with its code.
8. Its dependencies admitted first, or in the same decision.

## 8. Open TODOs

**24 distinct tags,** counted across every file except generated HTML (23 at the last stock-take; `TODO(signing-key-history)` is new). Counts are occurrences.

| Group | Tags (uses) |
|---|---|
| Blocks real data | `signing-key-history` (8), `object-store-credentials` (10) |
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
- **Implementation:** a registry per issuer; the changes to `signatures.ts`, `use.ts`, `auth.ts`, the receipts and the proofs; and the proof its section 11 requires.

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

**The roadmap,** updated in the same change:
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
