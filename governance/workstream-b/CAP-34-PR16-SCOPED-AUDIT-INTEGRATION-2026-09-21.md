# CAP-34 PR #16-Scoped Audit Integration — 2026-09-21

**Status:** INTEGRATION RECORD — NOT NEW AUDIT FINDINGS
**Authority:** RECORDS WHAT WAS PORTED FROM THE FULL AUDIT ONTO PR #16 AND WHY. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority, and expands no capability or authority scope of PR #16.
**Source audit commit:** `2859f28` (`governance/workstream-b/CAP-34-CAPABILITY-AUDIT-2026-09-21.md`, on `claude/pensive-knuth-pdlko1`)
**Source fix commit:** `a6926f8` (five gap fixes + implementation-version infrastructure, on `claude/pensive-knuth-pdlko1`) — **derived from, not cherry-picked**: `a6926f8` also touches CAP-02 and CAP-04, which this branch does not have implemented, so it could not be applied as-is (see below).
**Source closing commit:** `a151563` (audit closing section, on `claude/pensive-knuth-pdlko1`)
**This integration's commit:** `0150428`, on `integration/pr16-scoped-audit`, fast-forwarded onto PR #16's branch (`workstream-b/capability-launch-gap-freeze-cap34-2026-09-19`).

## Why this is a scoped port, not a cherry-pick

`claude/pensive-knuth-pdlko1` — where the original audit and its fixes were built — contains **seven** implemented live capabilities: CAP-01, CAP-02, CAP-04, CAP-05, CAP-06, CAP-07, CAP-09.

**PR #16's branch contains only five**: CAP-01, CAP-05, CAP-06, CAP-07, CAP-09. CAP-02 and CAP-04 (Historical Scientific Memory Recovery) are **Roadmap Preview** on PR #16 — `fidelity: CONCEPT_PREVIEW_NOT_IMPLEMENTED`, `simulatorMode: ROADMAP_PREVIEW` — not implemented, exactly as PR #16's own description states them to be. A direct `git cherry-pick a6926f8` was attempted first and produced `modify/delete` conflicts on every CAP-02/CAP-04 file, because those files simply do not exist on this branch's history — confirmed directly (`git show 94dfea6:simulation/cap34/live-capabilities/cap02-source-acquisition.js` → does not exist). That attempt was aborted rather than resolved mechanically; this document records the scoped re-do.

Every file touched by `a6926f8` that concerns only CAP-01, CAP-05, CAP-06, CAP-07 or CAP-09 was diffed between PR #16's head (`94dfea6`) and `claude/pensive-knuth-pdlko1` before porting, to confirm the *only* difference was the intended audit-fix content (not some other, unrelated drift) before applying it here.

## Files ported from `a6926f8`, and why

| File | Ported? | What changed / why |
|---|---|---|
| `simulation/cap34/live-capabilities/cap01-discovery.js` | Yes | `CAP01_IMPLEMENTATION_VERSION` constant added (verified: the only diff vs. source) |
| `simulation/cap34/live-capabilities/cap01-discovery.behavioural-test.js` | Yes | `CAP01-B1B`/`CAP01-B1C` — exact `MINIMUM_ELIGIBLE_EVIDENCE` boundary (2 passes, 1 fails) |
| `simulation/cap34/live-capabilities/cap05-reasoning.js` | Yes | `CAP05_IMPLEMENTATION_VERSION` constant added |
| `simulation/cap34/live-capabilities/cap05-reasoning.behavioural-test.js` | Yes | `CAP05-B2B` — cross-subject opposing stances produce zero contradictions |
| `simulation/cap34/live-capabilities/cap06-ingredient-intelligence.js` | Yes | `CAP06_IMPLEMENTATION_VERSION` constant added |
| `simulation/cap34/live-capabilities/cap06-ingredient-intelligence.behavioural-test.js` | Yes | `CAP06-B5` — same-subject and different-subject wording produce identical flat-tally behaviour |
| `simulation/cap34/live-capabilities/cap07-formulation-intelligence.js` | Yes | `CAP07_IMPLEMENTATION_VERSION` constant added — **version constant only; CAP-07 had no audit gap** |
| `simulation/cap34/live-capabilities/cap07-formulation-intelligence.behavioural-test.js` | **No** | No gap fixture requested or needed for CAP-07; test file unchanged |
| `simulation/cap34/live-capabilities/cap09-governed-learning.js` | Yes | `CAP09_IMPLEMENTATION_VERSION` constant added |
| `simulation/cap34/live-capabilities/cap09-governed-learning.behavioural-test.js` | Yes | `CAP09-B1B` — constant record count, contradictory content injected, refusal names `CONTRADICTING_EVIDENCE_PRESENT` |
| `simulation/cap34/capability-fidelity-manifest.js` | Yes | `validateImplementationVersions()` added, unchanged from source — the function itself contains no CAP-02/CAP-04 reference; it is scoped entirely by whatever comparison map its caller supplies |
| `simulation/cap34/capability-fidelity-manifest.behavioural-test.js` | **Hand-written, not ported verbatim** | Source version loads all seven implementation files' version constants; this branch's version loads **only the five that exist here** (`IMPLEMENTATION_FILES`/`EXPORT_NAMES` contain CAP-01/05/06/07/09 only). Two new fixtures (`IMPLEMENTATION_VERSION_HONEST_MATCH`, `IMPLEMENTATION_VERSION_MISMATCH_DETECTED`) added on top, mismatch fixture targets CAP-01 (as in the source) |
| `simulation/cap34/cap34-canonical-end-to-end.behavioural-test.js` | Count only | Hardcoded manifest-validator fixture count adjusted `14`→`16` and total `42`→`44`, matching the two new manifest fixtures. No other content added. |

**Excluded, with reason:**

| File | Why excluded |
|---|---|
| `simulation/cap34/live-capabilities/cap02-source-acquisition.js` | Does not exist on PR #16's branch; CAP-02 is Roadmap Preview here, not implemented |
| `simulation/cap34/live-capabilities/cap02-source-acquisition.behavioural-test.js` | Same — does not exist; CAP-02's audit gap (bidirectionality fixture) was explicitly out of scope for this integration |
| `simulation/cap34/live-capabilities/cap04-scientific-memory.js` | Does not exist on PR #16's branch; CAP-04 is Roadmap Preview here, not implemented |
| `simulation/cap34/live-capabilities/cap04-scientific-memory-admission.behavioural-test.js` | Does not exist; not touched, as directed |
| Any manifest entry marking CAP-02/CAP-04 as `LIVE_SIMULATION`/`REAL_LOGIC_*` | Not made — `capability-fidelity-manifest.json` itself was not touched by this integration; CAP-02/CAP-04 remain Roadmap Preview |
| CAP-02's audit gap (Q1, bidirectionality) and CAP-04's version constant | Both belong to capabilities this branch does not implement; neither is applicable here |

## Fixture totals

| Scope | PR #16 baseline (`94dfea6`) | After integration (`0150428`) | Delta |
|---|---|---|---|
| CAP-01 | 11 | 13 | +2 |
| CAP-05 | 10 | 11 | +1 |
| CAP-06 | 9 | 10 | +1 |
| CAP-07 | 9 | 9 | +0 (version constant only) |
| CAP-09 | 8 | 9 | +1 |
| **Five-capability subtotal** | **47** | **52** | **+5** |
| Manifest validator | 14 | 16 | +2 |
| Distinct total (5 capabilities + manifest + 28 receipt-only + 8 pathway-preview + 57 historical-validity, not double-counting the manifest's 16 fixtures re-run inside the end-to-end gate) | 154 | 161 | **+7 exactly** |
| Historical-validity | 7 generations, 57/57 | 7 generations, 57/57 | **unchanged, confirmed by re-run, not assumed** |

All numbers above were measured, not carried over from `claude/pensive-knuth-pdlko1` — PR #16's baseline was established by running all nine of its own behavioural-test files from a genuinely fresh clone of `94dfea6` before any change was made, and the integrated total by running all nine again from a genuinely fresh clone of `0150428` after.

## Version-gate verification

With `CAP01_IMPLEMENTATION_VERSION` deliberately mutated to `"9.9.9-WRONG"` (working-tree only, never committed):

- `validateManifest()` called alone: **still `PASS_CAP34_FIDELITY_MANIFEST_VALID`** — proving it is genuinely unaffected by implementation-file drift, as designed.
- `cap34-canonical-end-to-end.behavioural-test.js` (the release-validation entry point): **`FAIL_CLOSED_CAP34_CANONICAL_END_TO_END_BEHAVIOURAL_PROOF`**, exit code 1 — caught specifically by `validateImplementationVersions()`'s `IMPLEMENTATION_VERSION_HONEST_MATCH` fixture failing, even though `validateManifest()` alone would have let it through.

Restoring `CAP01_IMPLEMENTATION_VERSION` to `"1.0.0"` returned the end-to-end gate to `PASS`, 44/44. Both the failing and passing states were run from the actual working tree; neither mutation was committed.

## Boundary

- Integration commit / resulting PR #16 head: `05d6c78`.
- Resulting PR #16 head after the Step 7 fast-forward push: see the report accompanying this document.
- No CAP-02 or CAP-04 implementation, test, or manifest-entry file was created, modified or referenced anywhere in this integration.
- No `.php`, Supabase, migration, `aab-local/`, Workstream A, WP05 or production path was touched — `git diff 94dfea6 HEAD --name-only` shows only `governance/workstream-b/` and `simulation/cap34/` paths.
- PR #17's branch (`governance/capability-gateway-reconciliation-2026-09-20`) confirmed unchanged at `43de5ec` throughout.
- No history was rewritten: this integration is a linear fast-forward from PR #16's own head, not a rebase, merge commit, or force-push.
- No capability or authority scope of PR #16 is expanded: PR #16 still implements exactly five capabilities; CAP-02 and CAP-04 remain exactly as Roadmap Preview as they were before this integration.
