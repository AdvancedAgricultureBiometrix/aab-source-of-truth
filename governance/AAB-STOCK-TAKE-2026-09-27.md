# AAB Stock-Take — 2026-09-27

**Status:** STOCK-TAKE RECORD
**Authority:** RECORDS THE STATE OF THE REPOSITORY ON 2026-09-27, READ FROM `main` AT `634295a`, FROM GITHUB (OPEN PRS AND BRANCHES) AND FROM THE CI RUNS. It admits, commissions and decides nothing. Where a fact comes from anywhere other than the repository, it says so.
**Read from:** every canonical contract and governance record on `main`; the SCS pilot READMEs; the two proof records; every `TODO(` marker; `gh pr list`, `git branch -r` and `gh run list` on 2026-09-27; and, where marked, the session notes kept outside the repository.

## Summary

- **`main` is at `634295a`,** and its latest CI run on `main` passed (run 36288835342: 549 of 549 tests, isolation and backup-restore).
- **Ten PRs (#26 to #35) merged on 2026-09-26/27,** after the vertical proof (#25). All are governance, except migration 020 and comment changes in #31.
- **Nothing is admitted, qualified or commissioned.** The definitions for admission, the admission registry, Gate D, ActorReference and actor–subject links now exist. None of them is built.
- **Twelve PRs are open,** and eleven of them date from August, before this work began. Five branches with work not on `main` have no PR. Two of those were investigated for this stock-take (section 3); the rest have not been reviewed as part of this work.
- **On the CAP-34 audit branch, two different manifests carry the same identifier** (section 3), and a 759-line governance record exists only on that branch.
- **Outreach is tracked separately,** outside the repository (section 7).
- **The roadmap is out of date in at least twelve places** (section 8).

## 1. What is on `main` and complete

State labels are the platform's maturity states: `named only`, `designed`, `implemented`, `behaviourally proven`, `admitted`, `commissioned`.

### 1.1 Canonical contracts: 16

| Contract | State | Notes |
|---|---|---|
| SCS-CAP-01 Regulatory Framework Registration | `behaviourally proven` | 1 of 7 operations built |
| SCS-CAP-02 Operator and Supplier Identity Registration | `behaviourally proven` | 6 of 12 operations built. **Amended in PR #34:** actor–party links, mandate verification and representative submission are specified, and none is built. |
| SCS-CAP-03 Plot and Land Unit Registration | `behaviourally proven` | 1 of 8 operations built |
| SCS-CAP-04 Deforestation Evidence Admission | `behaviourally proven` | 1 of 4 built. **Amended in PR #35:** representative submission specified, not built. |
| SCS-CAP-05 Supply Chain Custody Evidence Admission | `behaviourally proven` | 1 of 6 built. **Amended in PR #35:** representative submission specified, not built, including a breaking change to the request. |
| SCS-CAP-06 Due Diligence Sufficiency Evaluation | `behaviourally proven` | 4 of 5 operations built |
| SCS-CAP-08 Due Diligence Package Compilation | `behaviourally proven` | 3 of 5 operations built; no export bundle |
| SCS-CAP-09 Regulatory Review and Promotion | `behaviourally proven` | 4 of 6 operations built |
| AAB-PLATFORM-01 Evidence Object Store | `implemented` (upload) | Renamed from SCS-PLATFORM-01 in PR #31 |
| AAB-PLATFORM-02 Governed Document Rendition | `implemented` | Renamed from SCS-PLATFORM-02 in PR #31 |
| AAB-PLATFORM-03 ActorReference | `designed` | The pilot records the version 1 shape. Version 2 is not implemented. |
| AAB-PLATFORM-04 Actor–Subject Link | `designed` | Nothing built |
| CAP-04 Governed Scientific Memory | `designed` | Nothing built |
| CAP-05 Governed Scientific Reasoning | `designed` | Nothing built |
| CAP-20 Country Capability Catalogue & Selection | `designed` | Amended in PRs #28 and #29 with stale, withdrawn and suspended admission states |
| CAP-21 Commercial Agreement & Entitlement Management | `designed` | Nothing built |

"Behaviourally proven" means for each capability's minimum vertical slice, as its README records. No capability is `admitted` or `commissioned`.

### 1.2 Code and proofs

- **The SCS pilot:** eight capabilities, AAB-PLATFORM-01 and -02, and 20 migrations (001–020).
- **CI** runs three jobs on every pull request and on `main`: 549 tests, 20 network isolation checks in two modes, and the backup-restore proof.
- **The access isolation proof** (`SCS-PILOT-ACCESS-ISOLATION-PROOF-2026-09-26.md`): `behaviourally proven` for one environment. It does not cover isolation between environments on a shared host, or organisation-level rows.
- **The backup-restore proof** (`SCS-PILOT-BACKUP-RESTORE-PROOF-2026-09-26.md`): `behaviourally proven` for the pilot stack. Backups are unencrypted and unsigned, taking one causes a short outage, and there are no recovery objectives.

### 1.3 Governance definitions and records added on 2026-09-27

| Record | What it establishes | State |
|---|---|---|
| Platform roadmap (PR #26) | The state of every primitive and capability at `9f17cc2` | Out of date in places (section 8) |
| Gate D definition (PR #27) | Deployment qualification, decided by the Platform Owner on an independent reviewer's assessment | Defined. No deployment assessed. |
| Capability admission authority (PR #28, amended in #29) | The pilot joint authority: the Platform Owner and the founding institution's representative | Defined. Not constituted. |
| Capability admission registry (PR #29) | Country and platform registries, change classifications, suspension | Defined. Not built. |
| AAB-OVERVIEW-01, the public overview (PR #32) | A cover document for outreach, cleared for external use | On `main`; see the flag in section 7 |

The earlier records are unchanged, and still stand: the purpose revision (whose "Admitted" row was amended in PR #28), the domain separation decision, the domain definition, the roster, the landscape freeze, the Phase-1 sovereignty register and the WP04 records.

## 2. What has changed since the roadmap was written

The roadmap was committed in PR #26 and describes `main` at `9f17cc2`.

| PR | Change | Roadmap needs updating? |
|---|---|---|
| #26 (its later commits) | `MINIMUM_VERTICAL_SLICE_PROVEN` recorded for SCS-CAP-08 and -09; the out-of-date documents corrected | **Yes:** section 2.1 still says "README record to follow", and section 6.5 still lists the corrected documents |
| #27 | Gate D defined; the roadmap corrected to say Gate D blocks commissioning, not admission | Done in that PR, except that section 7.3 still says the admission authority is undefined |
| #28 | Admission authority defined; purpose revision and CAP-20 aligned | **Yes:** section 5.5 says "no document defines it" |
| #29 | Admission registry defined; admission authority amended for the pilot joint authority; `ADMISSION_SUSPENDED`; draft status lines corrected | **Yes:** section 5.5 does not mention the registry or the joint authority |
| #30 | AAB-PLATFORM-03 ActorReference defined; `TODO(multi-issuer-idempotency)` added | **Yes:** sections 1 and 6.1 say `ActorReference` has no contract |
| #31 | SCS-PLATFORM-01/02 renamed AAB-PLATFORM-01/02; migration 020 | Done in that PR |
| #32 | Public overview; `PUBLIC_OVERVIEW` badge; SCS-CAP-01 badge fixed | **Yes:** the overview is not mentioned |
| #33 | AAB-PLATFORM-04 Actor–Subject Link defined; AAB-PLATFORM-03 aligned | **Yes:** not mentioned |
| #34 | SCS-CAP-02: links, mandate verification, representative submission | **Yes:** section 2.2 says submission under a mandate is refused |
| #35 | SCS-CAP-04 and -05: representative submission; CAP-05's mandate fields settled | **Yes:** section 2.2 says mandate-based submission is deferred, and mandate scope unchecked |

## 3. What is in progress

**No work is in flight on this workstream.**
- There is no uncommitted change, and no stash.
- No local branch holds work that is not on `main`, except the AGR candidate branches below.

**Proposed, not started:** a build plan for implementing the representation path in the pilot, for review before any code.

**Open PRs: twelve.** Only #19 belongs to recent work.

| PR | Opened | Last updated | Draft | What | Blocking |
|---|---|---|---|---|---|
| #19 | 2026-09-23 | 2026-09-23 | No | AGR candidate remediation. It targets the candidate branch, not `main`. See "PR #19 and the AGR candidate" below. | A decision: its description reports a third independent verification passing at `c3abe43`. Whether that is the confirmation required before merging is not recorded. |
| #13 | 2026-09-01 | 2026-09-03 | Yes | Canonical sovereign runtime and trust-boundary repair | Not reviewed in this work |
| #11 | 2026-08-27 | 2026-08-27 | Yes | Private Preview owner sign-in recovery | Not reviewed |
| #10 | 2026-08-26 | 2026-08-26 | Yes | Sovereign scientific intelligence principles (docs) | Not reviewed |
| #9 | 2026-08-19 | 2026-08-19 | No | Canonical country discovery architecture | Not reviewed |
| #8 | 2026-08-18 | 2026-08-18 | No | Country discovery engine, Thailand evidence registry | Not reviewed |
| #7 | 2026-08-17 | 2026-08-17 | Yes | WA staging discovery handover (72 files) | Not reviewed |
| #6 | 2026-08-14 | 2026-08-14 | Yes | Canonical template baseline (26,566 lines) | Not reviewed |
| #5 | 2026-08-13 | 2026-08-13 | Yes | Security entry and administration handover | Not reviewed |
| #4 | 2026-08-12 | 2026-08-12 | Yes | Entry Gateway 04 | Not reviewed |
| #3 | 2026-08-12 | 2026-08-12 | Yes | Public Launch-03 final | Not reviewed |
| #2 | 2026-08-12 | 2026-08-12 | Yes | About public experience release 02 | Not reviewed |

**Branches with work not on `main` and no PR:**

| Branch | Last commit | Commits not on `main` |
|---|---|---|
| `workstream-b/agr-cross-institutional-landscape-candidate-01` | 2026-09-23 | 2. This is the original candidate, preserved by design, and PR #19's base. |
| `claude/pensive-knuth-pdlko1` | 2026-09-22 | 14. See "The CAP-34 audit branch" below. |
| `agent/id-09-evidence` | 2026-08-11 | 4. **Already on `main` in content:** all four files are byte-identical on `main`, under different commits. Nothing to bring over; the branch is redundant. |
| `audit/phase-1-sovereignty-baseline-2026-09-15` | 2026-09-15 | 3. **Already on `main` in content:** all four files (the register and the reconciliation table, as Markdown and Word) are byte-identical on `main`. The branch is redundant. |
| `docs/canonical-testing-live-boundary-v163` | 2026-08-28 | 2. **Superseded:** `main` holds later versions of both files (`README.md` and the onboarding handover). The same correction landed on `main` as `2136103` on 2026-08-28, and later edits on 2026-08-30 built on it. Nothing to bring over. |

### The CAP-34 audit branch (`claude/pensive-knuth-pdlko1`)

**What `main` records.**
- **The CAP-34 audit record** (`CAP-34-CAPABILITY-AUDIT-2026-09-21.md`, ported to `main` in `1a2dccf`) states in its header that it audits the branch `claude/pensive-knuth-pdlko1`. Its closing section records the five gaps closed there, in `a6926f8`.
- **The PR #16 integration record** (`CAP-34-PR16-SCOPED-AUDIT-INTEGRATION-2026-09-21.md`) records that the fixes for CAP-01, 05, 06, 07 and 09 were ported to `main`, derived rather than cherry-picked, in `0150428`. CAP-02 and CAP-04 were excluded, because their simulation code is not on `main`.

**What is actually on `main`:**
- `0150428` is on `main`.
- The version constants for CAP-01, 05, 06, 07 and 09 are there, and so is `validateImplementationVersions()`.
- No CAP-02 or CAP-04 simulation files are on `main`.

So the audit's fixes for the five capabilities on `main` are on `main`, as recorded. The audit record is accurate about its own branch. **It does not say plainly that its CAP-02 and CAP-04 findings and fixes concern code that is not on `main`.** A reader of `main` has to reach the PR #16 integration record to learn that.

**What exists only on the branch** (14 commits, about 15,000 added lines, 57 files):
- **The CAP-02 and CAP-04 simulation** (Historical Scientific Memory Recovery, stages 1–7): four implementation and test files, and manifest snapshots 008 to 012.
- **The CAP-02 and CAP-04 audit fixes** from `a6926f8`.
- **Simulation theme and shell assets** (`simulation/cap34/theme/`), the wiring of the live capabilities into `index.html`, and a visual polish pass.
- **Two proof-timestamp refreshes.**
- **A 759-line governance record,** "AAB purpose, vision and long-term direction" (`926128d`, 2026-09-20). No document on `main` refers to it.

**A snapshot identity collision.** `main` and the branch each have a manifest `CAP34-MANIFEST-2026-09-20-SNAPSHOT-008`, version 1.7.0, with different digests: `sha256:4ed00951…` on `main`, `sha256:ee929e7d…` on the branch. The same snapshot identifier names two different manifests. If the branch were merged as it stands, historical validation would face two snapshots claiming one identity.

**Decided on 2026-09-27: the branch's work is not adopted, for now.**
- **Recorded on `main`:** a note appended to the CAP-34 audit record, made in the same change as this stock-take, says that the branch's CAP-02 and CAP-04 work is not adopted. It also says why the branch cannot be merged as it stands: its `SNAPSHOT-008` is a different manifest from `main`'s, and a merge would corrupt the manifest history.
- **Still open, as a separate decision:**
  - whether the branch's work is ever adopted;
  - how the snapshot collision would be resolved if it is, for example by renumbering the branch's snapshots;
  - what becomes of the purpose and vision record.

### PR #19 and the AGR candidate

**Two branches, neither on `main`:**
- **The candidate** (`workstream-b/agr-cross-institutional-landscape-candidate-01`, head `4ec4552`): 2 commits, about 4,230 lines.
  - a provider-neutral contract (706 lines);
  - the identity conclusion, `CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` (148 lines);
  - an implementation (825 lines) and its behavioural test (877 lines);
  - a proof record (1,672 lines).
- **The remediation, which is PR #19** (head `4adad04`): 8 commits, 231 lines added and 73 removed.
  - It corrects the eight findings of the independent review (which is on `main`).
  - It replaces the guessable withheld reference (finding M1) with a request-scoped generator.
  - It splits dataset authority from participation authority.

**Its state.**
- The description reports a third independent verification at `c3abe43`: 63 of 63 candidate fixtures, and every other suite passing.
- The head, `4adad04`, changes a description only.
- There are no CI checks: the CI workflow covers the SCS pilot, not these files.
- Four open items are listed as not blocking: M2, M3, a missing fixture, and the integrity and reclassification staleness gap.
- The PR says it "does not merge to main".

**What it means for `main`.**
- Only the independent review is on `main`, together with the design record (`AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01-2026-09-22.md`), whose sequencing still shows steps 4 and 5 as open.
- The contract, implementation, proof and conclusion are all off `main`.
- The roadmap describes the candidate from the records on `main` only.

**Left open.** The decision has two parts:
- whether to merge PR #19 into the candidate branch, on the strength of the third verification;
- whether the candidate, remediated, should come to `main` as a candidate record, or stay on its branch until the separate capability review.

It depends on the WP05 hardware key and the separate capability review process, both outside this stock-take's scope.

## 4. What is deferred, and its trigger

| Item | Trigger |
|---|---|
| Independent dependency audit | **Due now.** Its condition, the SCS vertical proof, has been met since `9f17cc2`. It precedes any extraction of the platform primitives. |
| Extraction of the platform primitives from the SCS pilot | The dependency audit |
| AGR capabilities built on the platform | Extraction |
| PDF metadata (`Producer` and `Creator` still read `SCS-PLATFORM-02`) | A deliberate change of its own: new expected digest, renderer version bump, cross-platform re-verification |
| The bare `SCS-PLATFORM` error attribution | Extraction |
| `simulation/cap34/scs-roadmap-preview.js` still shows SCS-CAP-02 and -05 as concept previews | Your decision (deferred after PR #26), together with extending the CAP-34 manifest to SCS |
| Multi-issuer idempotency keys | A second identity issuer first acting in a deployment (`TODO(multi-issuer-idempotency)`) |
| SCS-CAP-03's representative submission (`SUBMIT_PLOT_ASSOCIATION_EVIDENCE`) | SCS-CAP-03 defining `addTenureClaim` and `associateFramework`, which must be redefined first |
| A mandate action for representation in a transaction | A deliberate review of SCS-CAP-02's mandate action vocabulary |
| How an organisation's own staff submit on its behalf | A contract decision (recorded as a gap in SCS-CAP-04 and -05) |
| SCS-CAP-07, 10, 11, 12 contracts | Session notes record them as queued after PR #19. SCS-CAP-12 also needs country isolation confirmed in production. |
| WP05 (reconstruction replay) | Session notes record "WP05 preflight when the YubiKey arrives". WP04 records that WP05 "has not begun" and needs separate authority. |
| Encrypted, signed backups | Country-controlled keys (`TODO(backup-encryption)`) |
| `SUFFICIENT` evaluations | A spatial database with country boundary data (`TODO(postgis)`) |

## 5. What blocks the first SCS admission

Every item must exist before the first SCS capability can be admitted, under the admission authority and registry definitions:

1. **The country admission registry, built** in the pilot country's tenancy: records, append-only store, signatures and derived status.
2. **ActorReference version 2, implemented** (`TODO(actor-reference)`). The contract exists; the pilot still records version 1.
3. **The founding country institution's authorised representative, identified,** with the basis of their authorisation recorded. This is a country decision.
4. **The first independent admission reviewer, appointed jointly** by the Platform Owner and that representative. This is a country decision.
5. **Signing keys** for the Platform Owner, the representative and the reviewer. For the country, they are country-controlled. Nothing records how keys are issued or held.
6. **The CAP-34 fidelity manifest extended to the SCS capabilities** (checklist points 9 and 10), with a new manifest snapshot and re-run frozen proofs.
7. **The capability itself, ready for assessment:** designed, implemented, behaviourally proven for the operations to be admitted, and with its documents agreeing with its code.
8. **Its dependencies admitted first, or in the same decision.** For example, SCS-CAP-04 depends on SCS-CAP-01, 02 and 03 and AAB-PLATFORM-01.

**Not required for admission, but required before live operation:**
- Gate D, with its own reviewer, and every mandatory control;
- the commissioning governance document, which does not exist;
- the Workstream A commissioning programme, which is not located in this repository.

## 6. Open TODOs

23 distinct tags, counted across every file except generated HTML.

### 6.1 Blocks real data or live operation

| Tag | Uses | Gap |
|---|---|---|
| `TODO(object-store-credentials)` | 9 | The API's object store identity has admin rights. This must be done "before any real data is stored". |
| `TODO(backup-encryption)` | 8 | Backups are unencrypted and unsigned |
| `TODO(tenant-scope)` | 11 | No organisation-level row filtering |
| `TODO(tenant-network-policy)` | 7 | Environments on one host are not isolated from each other |
| `TODO(actor-reference)` | 23 | The contract now exists; **version 2 is not implemented**, and admission requires it |

### 6.2 Build debt: limits what the pilot can conclude, or has drifted from its contract

| Tag | Uses | Gap |
|---|---|---|
| `TODO(postgis)` | 34 | No spatial database: no evaluation can be `SUFFICIENT` |
| `TODO(evidence-id-model)` | 16 | CAP-02 and CAP-03 evidence ids, and now mandate evidence, are not linked to stored objects |
| `TODO(evidence)` | 18 | Evidence id columns have no foreign key |
| `TODO(country-boundary-check)` | 5 | No country boundary data |
| `TODO(eligibility-rules)` | 4 | SCS-CAP-01 eligibility rules undefined |
| `TODO(spec-derivation)` | 5 | SCS-CAP-01 derivation rules undefined |
| `TODO(role-registry)` | 8 | No central role list. It will need `LINK_OFFICER` and `PARTY_REPRESENTATIVE`. |

### 6.3 Future work and hardening

| Tag | Uses | Gap |
|---|---|---|
| `TODO(oidc)` | 3 | Static bearer tokens |
| `TODO(idempotency-retention)` | 5 | Idempotency records never expire |
| `TODO(multi-issuer-idempotency)` | 5 | New since the roadmap. Keys by `actorId` until a second issuer acts. |
| `TODO(immutability)` | 6 | The owner can still change the SCS-CAP-01 evidence spec |
| `TODO(append-only)` | 6 | SCS-CAP-01 `versionHistory` is a JSON array |
| `TODO(party-versions)` | 3 | Only the current party version is stored |
| `TODO(framework-association-arrays)` | 5 | uuid[] columns without foreign keys |

### 6.4 Resolved, but the tag remains in immutable migrations or dated notes

`TODO(migration-runner)` (3 uses), `TODO(docker-e2e)` (2), `TODO(framework-association)` (5), `TODO(other-action)` (3).

## 7. Outreach

**Outreach is tracked separately, outside this repository.** Organisations, contacts, dates, what was sent, and follow-ups are names and commercial information, which do not belong in a governance repository. This stock-take does not record them.

### Proof timestamps before external presentation

**The instruction.** Session notes record your instruction to "regenerate proof timestamps against the exact commit before any external presentation".

**What it applies to.** The **frozen behavioural proof files** of the CAP-34 simulation, and of the AGR candidate on its branch. Each records when it was generated (`generatedAtUtc`), and some record the manifest snapshot and commits they were bound to. On `main` they record:
- generation on 2026-09-21 and 2026-09-22;
- manifest snapshot 007, in the manifest-validator and pathway-preview proofs, while the current manifest is snapshot 008;
- PR #16 commits (`b9be2de`, `b35c398`) as their binding.

They are not run in CI, and running them rewrites them. So a proof file can describe an earlier commit than the one being presented.

**What it does not apply to:**
- **The SCS proof records** (access isolation, backup-restore). Each cites CI runs on exact merge commits, and CI re-runs every one of those checks on every change.
- **The public overview.** It cites no proof file and no run number. It relies on the two SCS proof records' own public-claim wording, and on the 549 tests passing in CI, which run 36288835342 on `main` (`634295a`) confirms.

**The rule, confirmed as a platform rule on 2026-09-27:**
- **Trigger:** any external presentation that shows or cites a frozen proof file, such as a CAP-34 simulation demonstration or the AGR candidate.
- **Before it:** re-run the behavioural tests on a clean checkout (`core.autocrlf=false`) at the exact commit to be presented, commit the regenerated proof files, and cite that commit.
- **Cleared when:** every proof file shown carries a `generatedAtUtc`, and a snapshot and commit binding, matching the commit presented.
- **The overview is not affected.** It may be sent as it stands, with the canonical contracts it accompanies.

## 8. What the roadmap needs updating for

Line numbers are in `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md` at `634295a`. **Each of these is updated in the roadmap in the same change as this stock-take.**

| Line | Now says | Should say |
|---|---|---|
| 57 | Primitive 2: `ActorReference` has no shared contract and no `partyId`, "so mandate-based submission is refused everywhere" | AAB-PLATFORM-03 and -04 define ActorReference and actor–subject links; representation is specified in SCS-CAP-02, 04 and 05, and not built |
| 102–103 | SCS-CAP-08 and -09: "PR #25; README record to follow" | The README records exist (PR #26) |
| 138 | SCS-CAP-02: "Submission under a mandate is refused" | Specified (PR #34), not built |
| 166 | SCS-CAP-04: "Mandate-based submission is deferred" | Specified (PR #35), not built |
| 180 | SCS-CAP-05: "Mandate scope is not checked" | Scope is specified for both mandate fields (PR #35), not built |
| 437 | "Before mandate-based submission, the actor-to-party link is needed" | Defined in AAB-PLATFORM-04; building it is what remains |
| 494 | Admission authority: "no document defines it" | Defined (PR #28), with the pilot joint authority (PR #29); not constituted |
| 496 | "A shared `ActorReference` contract" | The contract exists (PR #30); version 2 must be implemented |
| 516 | Section 6.1: `TODO(actor-reference)`, "no shared contract" | The contract exists; version 2 is not implemented |
| 561–569 | Section 6.5 lists out-of-date documents | All were corrected in PR #26, except `scs-roadmap-preview.js`, whose decision is deferred |
| 657 | Section 7.3: "the admission authority, which no document defines" | Defined; the blockers are now the registry build, the representative and the reviewer |
| 681 | "the admission authority [is] not defined anywhere" | Defined in PR #28 |

**Missing from the roadmap entirely:**
- AAB-PLATFORM-03 and AAB-PLATFORM-04, as platform contracts;
- the admission registry;
- the public overview;
- the roles `LINK_OFFICER` and `PARTY_REPRESENTATIVE`;
- `TODO(multi-issuer-idempotency)`;
- the two new SCS gaps: representation in a transaction, and an organisation's own staff;
- the open PRs and unmerged branches in section 3.

## Open decisions

1. **The CAP-34 audit branch:** whether its work is ever adopted, how the `SNAPSHOT-008` collision would be resolved, and what becomes of the purpose and vision record (section 3).
2. **PR #19 and the AGR candidate** (section 3).
3. **The eleven open PRs from August:** what becomes of each.

Settled in review of this stock-take: the proof-timestamp rule (section 7), and not adopting the CAP-34 branch's work for now.

## Items that appear forgotten or drifted

1. **Eleven open PRs from August** (#2 to #13) have not been reviewed as part of this work, and nothing records their intended outcome. Several are drafts touching the public site and the canonical template.
2. **The CAP-34 audit branch** holds unadopted CAP-02 and CAP-04 simulation work and a purpose and vision record, and **reuses the snapshot identifier `SNAPSHOT-008`** for a different manifest (section 3). It is now recorded on `main` as not adopted; whether it is ever adopted is open.
3. **PR #19 and the AGR candidate** wait on a decision that is recorded only in session notes (section 3).
4. **The queued SCS-CAP-07, 10, 11 and 12 contracts, and WP05's hardware key,** are recorded only in session notes, not in the repository.
5. **The proof-timestamp instruction** was recorded only in session notes. It is now a confirmed platform rule, recorded in section 7.
6. **Contract file placement is inconsistent.** AAB-PLATFORM-01 and -02 sit in `governance/workstream-b/`, while AAB-PLATFORM-03 and -04 sit in `governance/`.
7. **My own session notes were wrong on one point.** They recorded the canonical-contract HTML work as unpushed, but it is on `main`. The notes are corrected.
8. **The roadmap** (section 8).
