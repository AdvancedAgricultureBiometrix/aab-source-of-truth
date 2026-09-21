# CAP-34 Capability Audit — 2026-09-21

**Status:** VERIFICATION PASS AGAINST EXISTING IMPLEMENTATION — NOT A REBUILD
**Authority:** AUDIT EVIDENCE ONLY. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority, and makes no code, manifest, Supabase or production change.
**Scope:** the seven implemented capabilities — CAP-01, CAP-02, CAP-04, CAP-05, CAP-06, CAP-07, CAP-09 — audited against five fixed questions, plus a standing regression check on the historical-snapshot-validity test.
**Method:** every implementation file and every behavioural-test file listed below was read in full and, separately, every behavioural test was actually executed (`node <file>.behavioural-test.js`) against the current branch head to confirm the fixture counts and pass state reported here, rather than trusting the counts reported during the original build session or the committed proof JSONs' own numbers.
**Branch:** `claude/pensive-knuth-pdlko1`. No PR #16 or PR #17 branch touched. No Workstream A, commissioning-status, Supabase or production file touched. No implementation file, fixture, or the manifest was changed by this audit — running the tests regenerated timestamps in the nine committed proof JSONs under `governance/workstream-b/`; those regenerated files were reverted (`git checkout --`) before this report was written, so the branch carries only this one new file.

## How to read the verdicts

- **PASS** — the property the question asks about is demonstrated by an actual fixture (or, for Q5, verified directly against the code), cited by fixture ID or code location.
- **GAP** — the property is not demonstrated. The implementation is not asserted to be wrong; the test coverage is asserted to be incomplete. Each GAP names the exact fixture/code location and the minimal fixture(s) that would close it.
- **NEEDS-DECISION** — closing the gap requires a human decision (a new convention, an ambiguous scope call) before any fixture can be written, not just writing the fixture.

No new fixtures were written. No implementation files were changed. No manifest entries were changed.

---

## CAP-01 — Country Intelligence & Discovery

**Files read:** `simulation/cap34/live-capabilities/cap01-discovery.js` (95 lines), `cap01-discovery.behavioural-test.js` (209 lines).
**Actual fixture count (run just now):** **11/11 passing** (`CAP01-D0`, `D1`, `A1`–`A3`, `B0`–`B5`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP01-B1` breaks (removes evidence → `PROGRESSION_BLOCKED_EVIDENCE_REQUIRED`) and `CAP01-B3` fixes (resolves the canonical `CONTRADICTION` scenario → back to `INVESTIGATION_CANDIDATE`). `B2` additionally breaks a clean baseline into contradiction. |
| Q2 Content-driven proof | **PASS** | `CAP01-B4` is the reference fixture itself: 3 records, count unchanged, an insufficiency marker injected into one, outcome still flips to `PROGRESSION_BLOCKED_EVIDENCE_REQUIRED`. |
| Q3 Adversarial near-miss | **GAP** | No fixture tests the exact boundary of `MINIMUM_ELIGIBLE_EVIDENCE` (`cap01-discovery.js:17,51`, `eligibleCount < MINIMUM_ELIGIBLE_EVIDENCE`). Existing fixtures use 3 records (baseline) or 1 record (`B1`); none use exactly 2 — the minimum itself — to prove the check is `<` and not accidentally `<=` or a hard-coded 3. **Minimal fix:** one fixture with exactly 2 clean, supporting, eligible records → assert `INVESTIGATION_CANDIDATE` (not blocked). |
| Q4 Mechanism distinctness | **PASS** | CAP-01 uses flat per-record regex classification (`classifyFinding`), the same family as CAP-06/CAP-09. Its output shape (`conflictingCount`, `insufficientCount`) is structurally different from CAP-05's `contradictingSubjects`/subject-grouping, so a full mechanism swap would break essentially every existing fixture — there is no plausible partial-substitution risk analogous to the CAP-05/CAP-06 case (see CAP-05 and CAP-06 below). |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a) fidelity `REAL_LOGIC_SYNTHETIC_REFERENCE_DATA` matches the real content-driven implementation — verified against code. (b) `simulatorMode: LIVE_SIMULATION` matches the confirmed `registerLiveCapability("CAP-01", evaluateDiscovery)` call at `cap01-discovery.js:92-94`. (c) `implementationReferences` → `cap01-discovery.js` exists and contains `evaluateDiscovery` — verified. (e) `limitations` ("keyword-pattern matching... not semantic") accurately describes the regex-based implementation read above. **(d) cannot be verified**: `cap01-discovery.js` declares no internal version identifier to compare against manifest `representationVersion: "1.0.0"`. This is a cross-cutting issue affecting all seven capabilities — see "Cross-cutting NEEDS-DECISION" below. |

## CAP-02 — Governed Scientific Data Acquisition & Interoperability

**Files read:** `cap02-source-acquisition.js` (285 lines, contains both the stage-1/2 acquisition logic and the stage-4 interoperability-mapping logic — confirmed the manifest's single `implementationReferences` entry is correct, not an omission), `cap02-source-acquisition.behavioural-test.js` (149 lines), `cap02-interoperability-mapping.behavioural-test.js` (172 lines).
**Actual fixture count (run just now):** **7/7 + 7/7 = 14/14 passing** (source-acquisition: `D0`, `A0`, `A1`, `B0`, `B1`, `C0`, `C1`; interoperability-mapping: `A0`–`A2`, `B0`, `C0`, `D0`, `D1`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **GAP** | Every refusal fixture (`A1` missing-fields, `B0` unregistered, `B1` no-content in source-acquisition; `B0` unmapped, `C0` ambiguous in interoperability-mapping) pairs against a *different* object that happens to succeed, not against the *same* broken object subsequently fixed. No fixture takes a refused/unmapped result and shows it flip to success once the specific defect is corrected. **Minimal fix (2 fixtures):** (1) take `missingTwoFields`' metadata (`cap02-source-acquisition.behavioural-test.js:79`), add back `institution` and `authorityToProvide`, assert `registerSource` now returns `SOURCE_REGISTERED`; (2) take the unknown-subject extraction from `CAP02M-B0` (`cap02-interoperability-mapping.behavioural-test.js:100`), supply a vocabulary that includes `"Trial Site 999"` / `"unrecognised gauge"`, assert mapping now flips to `PROPOSED_MAPPING`. |
| Q2 Content-driven proof | **PASS** | `CAP02-A1` names the exact missing fields (not a bare refusal or count); `CAP02-C0`/`C1` prove the content hash is genuinely content-derived; `CAP02M-A0`/`C0` run the identical extracted record through two different vocabularies (structure held constant) and get different mapping outcomes. |
| Q3 Adversarial near-miss | **PASS** | `CAP02-A1` is a near-miss on field-presence checking: `authorityToProvide: ""` looks present (not `undefined`) but is correctly caught as missing. `CAP02M-D0` is a near-miss on partial failure: feeding CAP-04's real quarantined (missing-subject) output does not crash and correctly fails only the subject side while the unit side still succeeds independently. |
| Q4 Mechanism distinctness | **PASS** | The vocabulary cardinality mechanism (0 matches = unmapped, 1 = proposed, 2+ = ambiguous) is documented in the file header (`cap02-source-acquisition.js:173-183`) and guarded by `CAP02M-C0`, which would fail if the implementation silently picked the first match instead of detecting ambiguity. |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a) `PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN` is accurate — only stages 1, 2, 4 are implemented, confirmed by reading the file. (b) `LIVE_SIMULATION` matches the confirmed registration call at `cap02-source-acquisition.js:282-284`. (c) `implementationReferences` → `cap02-source-acquisition.js` exists and, importantly, genuinely contains the interoperability-mapping logic the manifest's `evidenceReferences` cites two separate test files for — verified, not an inconsistency. (e) limitations (small hand-authored vocabulary, exact case-insensitive match, no OCR/legacy adapters) match the code read above. **(d) cannot be verified** — same cross-cutting issue. |

## CAP-04 — Governed Scientific Memory

**Files read:** `cap04-scientific-memory.js` (349 lines, contains all of stages 3/5/6/7), `cap04-scientific-memory.behavioural-test.js` (248 lines), `cap04-corpus-scale.behavioural-test.js` (195 lines), `cap04-scientific-memory-admission.behavioural-test.js` (250 lines).
**Actual fixture count (run just now):** **14/14 + 9/9 + 14/14 = 37/37 passing.**

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP04ADM-D0` breaks (unresolved conflict refuses admission) and `CAP04ADM-D1` fixes the **same** conflicted record by adding `conflictResolutionNotes`, admission succeeds. |
| Q2 Content-driven proof | **PASS** | `CAP04-B4` shows three different synthetic file sets against the same preserved source producing three different, content-driven outcomes; the conflict check (`CAP04-B2`) matches on `(subjectKey, treatmentLabel, location)` plus opposing polarity, not a bare count. |
| Q3 Adversarial near-miss | **PASS** | `CAP04-G2` is the reference example named in the audit brief itself: five near-miss variants, each with the right *label* (`governanceState: ADMITTED_SCIENTIFIC_MEMORY`) but a specific structural defect (failed/missing `reviewGate`, missing `decision`, empty `reviewerId`, or a relabelled stage-3 record) — all five correctly rejected by `isEligibleForScientificMemory`. |
| Q4 Mechanism distinctness | **PASS** | `CAP04CS-B0`/`B1` are exactly the fixture class the audit brief describes: `B0` proves stage 3's own per-record check genuinely misses a contradiction (two records extracted with no knowledge of each other, `recordY` alone reaches `PENDING_REVIEW`), and `B1` proves `scanCorpusForProblems`'s whole-corpus grouping mechanism catches what stage 3 missed. The distinction is documented in both the file header (`cap04-corpus-scale.behavioural-test.js:9-19`) and inline in `cap04-scientific-memory.js:232-243`. |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a) `PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN` is accurate. (b) `LIVE_SIMULATION` matches the registration call at `cap04-scientific-memory.js:346-348` (extraction only is dispatcher-registered; admission/scanning/discovery are called directly — the manifest's `classificationReason` says this explicitly, and it is true). (c) `implementationReferences` → `cap04-scientific-memory.js` contains all of stages 3, 5, 6, 7 — verified. (e) limitations (rule-based field-presence, exact-key-only corpus grouping, asserted-not-authenticated reviewer identity, no persistence) all match the code read above. **(d) cannot be verified** — same cross-cutting issue; manifest `representationVersion: "0.6.0"` has nothing in `cap04-scientific-memory.js` to check against (the admission test file's own `proofVersion: "1.1.0"` is a different, unrelated version field — the proof schema's own version, not the capability's). |

## CAP-05 — Governed Scientific Reasoning

**Files read:** `cap05-reasoning.js` (109 lines), `cap05-reasoning.behavioural-test.js` (189 lines).
**Actual fixture count (run just now):** **10/10 passing** (`D0`, `A1`–`A3`, `B0`–`B5`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP05-B2` breaks (forces two records onto the same subject key with opposing stances → `CONTRADICTION_REQUIRES_REVIEW`) and `CAP05-B5` fixes (resolves the canonical `CONTRADICTION` scenario → back to `REASONING_SUPPORTS_PROGRESSION`). |
| Q2 Content-driven proof | **PASS** | `CAP05-B4` matches the reference standard exactly: 2 records, count unchanged, a self-declared gap injected into one, outcome flips and names the specific category (`NO_SELF_DECLARED_GAP`, not `SUFFICIENT_VOLUME`). |
| Q3 Adversarial near-miss | **GAP** | Same underlying gap as Q4 below. |
| Q4 Mechanism distinctness | **GAP** | This is exactly the case the audit brief names: CAP-05's subject-grouped mechanism (`cap05-reasoning.js:37-51`, `findContradictingSubjects`) is documented as distinct from CAP-01's flat tally (file header, `cap05-reasoning.js:4-13`), but `CAP05-B1` — the fixture meant to prove it (`cap05-reasoning.behavioural-test.js:104-114`, comment: "subjects only compared within the same group") — uses two *different*-subject records that are **both positive**, so it contains no disagreement for either mechanism to catch or miss. It does not discriminate CAP-05's real subject-grouped logic from a flat-tally substitution, because a flat tally would also report zero contradictions here (nothing disagrees at all). No fixture in this file proves that two records on **different** subjects, where at least one carries a genuinely opposing stance, are correctly **not** flagged as a contradiction. This is precisely the class of regression the audit brief describes as having actually occurred during the build. **Minimal fix (1 fixture, closes both Q3 and Q4):** two records with different derived subjects (e.g. `"Synthetic trial X"` positive, `"Synthetic result Q"` with negative-pattern wording), assert `contradictingSubjects.length === 0` even though a negative stance is present somewhere in the set. |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a)–(c), (e) verified as accurate against the code exactly as for CAP-01/CAP-04 above (subject-grouped, keyword-derived, registered at `cap05-reasoning.js:106-108`, limitations honestly describe keyword-derived grouping as non-scientific). **(d) cannot be verified** — same cross-cutting issue. |

## CAP-06 — Ingredient Intelligence

**Files read:** `cap06-ingredient-intelligence.js` (89 lines), `cap06-ingredient-intelligence.behavioural-test.js` (181 lines).
**Actual fixture count (run just now):** **9/9 passing** (`D0`, `A1`–`A3`, `B0`–`B4`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP06-B1` breaks (removes a corroborating record → `INGREDIENT_BLOCKED_EVIDENCE_REQUIRED`, score 0) and `CAP06-B4` fixes (resolves the canonical `CONTRADICTION` scenario → back to `INGREDIENT_PROGRESSION_CANDIDATE`, score 1). |
| Q2 Content-driven proof | **PASS** | `CAP06-B3` matches the reference standard: flips one record to conflicting at constant count, status and score both change in the predicted way, distinct from the zero-evidence case. |
| Q3 Adversarial near-miss | **PASS** | `CAP06-B2` is a genuine numeric-boundary near-miss: a third corroborating record looks like it should push `readinessScore` above 1, but the cap (`Math.min(1, ...)`, `cap06-ingredient-intelligence.js:56`) correctly holds it at 1. |
| Q4 Mechanism distinctness | **GAP** | CAP-06 uses a flat tally over the candidate's own evidence (`cap06-ingredient-intelligence.js:29-58`), by design distinct from CAP-05's subject-grouped comparison — but unlike CAP-05's file, `cap06-ingredient-intelligence.js`'s header (lines 4-12) does not name CAP-05 or explain *why* flat-tallying is the correct choice here (all evidence already concerns one material, unlike CAP-05's potentially multi-subject evidence array). No fixture would catch an accidental regression toward subject-grouping: e.g., if evidence records with differently-worded `source` fields were wrongly grouped and one group's disagreement silently excluded from the tally, no existing fixture would notice (all of `B0`–`B4`'s records share near-identical `source` wording). **Minimal fix (1 fixture + 1 comment line):** one fixture with evidence whose `source` strings would derive to clearly different CAP-05-style subject keys (e.g. `"Synthetic assay Alpha"` vs. `"Synthetic trial Beta"`), one of them conflicting, asserting the conflict still reduces the flat-tallied `readinessScore` regardless of the differing subject wording; plus a header-comment sentence naming the contrast with CAP-05, mirroring `cap05-reasoning.js`'s own comment. |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a)–(c), (e) verified accurate (continuous `readinessScore`, registered at `cap06-ingredient-intelligence.js:86-88`, limitations honestly flag the scoring formula as illustrative). **(d) cannot be verified** — same cross-cutting issue. |

## CAP-07 — Formulation Intelligence

**Files read:** `cap07-formulation-intelligence.js` (103 lines), `cap07-formulation-intelligence.behavioural-test.js` (189 lines).
**Actual fixture count (run just now):** **9/9 passing** (`D0`, `A0`, `B0`, `B1`, `C0`–`C4`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP07-C2` breaks (re-runs CAP-06's real evaluator on weakened upstream evidence → formulation blocked) and `CAP07-C3` fixes (restores the evidence, re-runs both CAP-06 and CAP-07 → formulation recovers) — a genuine cross-capability round trip, not a same-file perturbation. |
| Q2 Content-driven proof | **PASS** | `CAP07-C4`: candidate count held constant at 2, only one candidate's CAP-06 `status` changes to a contradiction, and the outcome flips to `FORMULATION_REQUIRES_REVIEW` even though its numeric score is still above threshold. |
| Q3 Adversarial near-miss | **PASS** | `CAP07-C4` doubles as the near-miss: a candidate that "looks like it should pass" (numerically above `minReadinessScore`) is correctly still blocked from a clean `READY` outcome because of its upstream contradiction status. |
| Q4 Mechanism distinctness | **PASS** | CAP-07 operates on ingredient-evaluation *results* plus an objective, a structurally different input shape from both CAP-05 and CAP-06, so there is no realistic risk of an accidental mechanism swap with either sibling. `CAP07-C4` specifically guards against a different real risk (silently averaging away a contradiction instead of flagging review). |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a)–(c) verified. (e): worth noting as a **positive** finding — the manifest honestly records `SIM-AGR-003` scenario coverage as `PARTIAL`, not `FULL_FOR_REPRESENTED_SCOPE`, because the `MISSING_EVIDENCE` scenario was only exercised through CAP-06's blocked-ingredient output rather than a dedicated formulation-level insufficiency scenario — this is exactly the kind of honest under-claiming the manifest's own `rule` should be enforcing, and it is. **(d) cannot be verified** — same cross-cutting issue. |

## CAP-09 — Governed Scientific Learning

**Files read:** `cap09-governed-learning.js` (83 lines), `cap09-governed-learning.behavioural-test.js` (167 lines).
**Actual fixture count (run just now):** **8/8 passing** (`D0`, `A1`–`A3`, `B0`, `B1`, `C0`, `D1`).

| Q | Verdict | Evidence |
|---|---|---|
| Q1 Bidirectional perturbation | **PASS** | `CAP09-B0` breaks (single unreplicated trial refused) and `CAP09-B1` fixes the **same** finding by adding a genuine replicating trial → promoted. `CAP09-D1` is a second, independent bidirectional example (resolves the canonical `CONTRADICTION` scenario). |
| Q2 Content-driven proof | **GAP** | No fixture holds trial *count* constant while changing only content to flip the outcome. `CAP09-B0`→`B1` changes count 1→2; `CAP09-C0` changes count 2→3. Nothing mirrors CAP-01/CAP-05's B4 pattern for this capability. **Minimal fix (1 fixture):** take a 3-trial, all-supporting baseline (replication already satisfied at 3 ≥ 2), replace one trial's finding with an insufficiency-marker phrase (count held at 3; `supportingCount` drops to 2, which still individually satisfies `REQUIRED_REPLICATIONS`), assert the outcome still flips to `PROMOTION_REFUSED` naming exactly `SELF_DECLARED_EVIDENCE_GAP` (not `REPLICATION_REQUIRED`). |
| Q3 Adversarial near-miss | **PASS** | `CAP09-C0` is the reference example named in the audit brief itself: replication is already satisfied (2 supporting trials) when a third, contradicting trial arrives — promotion is still refused, and refused for `CONTRADICTING_EVIDENCE_PRESENT` specifically, not `REPLICATION_REQUIRED`, proving replication being satisfied does not override contradiction. |
| Q4 Mechanism distinctness | **PASS** | CAP-09 deliberately shares the flat-tally family with CAP-01/CAP-06 (`classifyFinding` in `cap09-governed-learning.js:26-31` is structurally identical to CAP-01's and CAP-06's) — appropriately, since all trials in a `candidateLearning` concern one finding, the same single-subject scope as CAP-06, not CAP-05's potentially multi-subject evidence array. No meaningful cross-capability confusion risk was found. |
| Q5 Manifest accuracy | **NEEDS-DECISION** | (a)–(c), (e) verified accurate (two independently-sufficient refusal conditions, registered at `cap09-governed-learning.js:80-82`, limitations honestly flag "replication is counted, not adjudicated"). **(d) cannot be verified** — same cross-cutting issue. |

---

## Cross-cutting NEEDS-DECISION: Q5(d), all seven capabilities

None of the seven implementation files (`cap01-discovery.js` through `cap09-governed-learning.js`) declares an internal version identifier. The manifest's `representationVersion` field (e.g. `"1.0.0"` for CAP-01, `"0.6.0"` for CAP-04) therefore has nothing in the implementation file to be checked against — Q5(d) is not a "pass," it is unverifiable by construction for every one of the seven entries. This is not a claim that any `representationVersion` is currently wrong; it is that there is no mechanism, today, by which a drift between an edited implementation and its declared `representationVersion` would ever be caught. Closing this requires a decision, not a fixture: whether to (a) add a self-declared version constant to each of the seven files and a check that it matches the manifest, (b) treat `representationVersion` as manifest-owned and derive it from something else verifiable (e.g. a content hash of the implementation file, similar to CAP-02's `sha256Hex` pattern), or (c) accept that this sub-check is not meaningfully enforceable at this layer and remove or reword it. This affects the manifest's own validator and possibly `capability-fidelity-manifest.js`, which is out of this audit's read-only scope to resolve.

## Historical validity regression

Run from a **genuinely fresh clone** (`git clone --branch claude/pensive-knuth-pdlko1 --single-branch`, a directory with no prior working state, no `node_modules`, nothing carried over from this session's main checkout), at branch head `077ce85` ("Parameterize CAP-04 reviewer authority, prove it's genuinely consulted, snapshot-012"):

```
node simulation/cap34/cap34-historical-snapshot-validity.behavioural-test.js
```

- **Result:** `PASS_CAP34_HISTORICAL_SNAPSHOT_VALIDITY_BEHAVIOURAL_PROOF`
- **Generations checked:** 12 (`CAP34-MANIFEST-2026-09-19-SNAPSHOT-001` through `CAP34-MANIFEST-2026-09-20-SNAPSHOT-012`)
- **Fixture total:** 157/157 passing

Every archived manifest snapshot in the registry still validates structurally, a receipt built against each snapshot still validates against that snapshot under the current multi-generation registry, and each such receipt is correctly rejected against every other snapshot. This regression is running cleanly and was not touched by this audit.

## Total fixture count, all seven capabilities (verified by execution, not by the build session's reporting)

| Capability | Files | Fixtures |
|---|---|---|
| CAP-01 | 1 | 11 |
| CAP-02 | 2 | 14 |
| CAP-04 | 3 | 37 |
| CAP-05 | 1 | 10 |
| CAP-06 | 1 | 9 |
| CAP-07 | 1 | 9 |
| CAP-09 | 1 | 8 |
| **Total** | **10** | **98** |

All 98 currently pass. None were modified, added, or removed by this audit.

## Summary: what needs a decision before any fixture is written

1. **CAP-05 Q3/Q4 (one gap, two questions):** whether the "different subjects, one disagreeing, correctly not flagged" fixture I've proposed is the right shape for closing this, or whether there's a different mechanism-distinctness proof preferred. The fixture content itself is not ambiguous — the expected output is already fully determined by the existing implementation — so this could reasonably be treated as a GAP to close directly rather than a NEEDS-DECISION; flagged here only because it's the highest-value single fixture in this whole audit (it's the one the audit brief specifically asked about) and is worth a deliberate go-ahead rather than being folded in silently with the others.
2. **Cross-cutting Q5(d):** requires an actual decision among the three options above (self-declared version constant, content-hash-derived version, or drop the sub-check) before any fixture or manifest-validator change is made.

Everything else marked **GAP** above (CAP-01 Q3, CAP-02 Q1, CAP-06 Q4, CAP-09 Q2) has a fully-specified, one-fixture minimal fix with no open ambiguity about expected behaviour — ready to implement once you say go, per the boundary set for this pass.
