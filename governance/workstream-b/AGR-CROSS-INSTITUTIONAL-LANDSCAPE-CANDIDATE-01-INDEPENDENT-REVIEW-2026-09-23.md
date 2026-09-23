# AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01 — Independent Review — 2026-09-23

**Status:** IMMUTABLE REVIEW RECORD — DO NOT AMEND
**Reviewed branch:** `workstream-b/agr-cross-institutional-landscape-candidate-01`
**Reviewed commit:** `4ec4552e6c9147c35f4de903e8c0922e3cf9a629`
**Merge base:** `76b10c0` (7 commits behind `main` at time of review; `main` tip was `3e9211d`)
**Review session:** Independent review — same session as candidate build, separate Claude Code instance, fresh clone
**Authority:** RECORDS REVIEW FINDINGS ONLY. Does not establish admission. Does not
assign a CAP number. Does not authorise implementation or production deployment.

## Bottom line

**`CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` — SUPPORTED WITH CORRECTIONS REQUIRED**

The conclusion is supported, but only through three of the five claimed functions
confirmed in full: methodological comparability, duplicate-weight prevention, and
restricted evidence disclosed as limitation. The dataset and participation
authority claim does not fully pass the code's own three-condition rule. The unit
transformation function is proven only by absence. All 63 candidate fixtures and
every existing suite pass from a fresh clone. Nothing was changed.

## Environment

Fresh clone of the candidate branch only:

```
git clone --branch workstream-b/agr-cross-institutional-landscape-candidate-01 \
  --single-branch \
  https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth.git \
  agr-review-clone
```

Note: On Windows with `core.autocrlf=true`, the end-to-end suite exits 1 (44/44
fixtures pass, but `contractBindingPassed: false`) because line-ending conversion
changes file bytes. A byte-exact clone passes. This is an environmental
sensitivity that should be addressed in remediation.

## Deviations from review brief

- The branch merge-base is `76b10c0`, not `3e9211d`. There are still exactly two
  commits beyond main. `git merge-tree` shows a clean merge into main with no
  conflicts.
- The candidate lives at `simulation/agr-candidates/cross-institutional-landscape-01/`,
  not `simulation/cap34/`. The live-capability suites are at
  `simulation/cap34/live-capabilities/`. All suites were run at their real paths.

## Step 1 — SHAs confirmed

- `origin/main` = `3e9211d` ✓
- Branch tip = `4ec4552` ✓
- Commits beyond main = `d15c1f7`, `4ec4552` ✓

## Step 2 — Document file sizes

| File | Bytes | Lines |
|---|---|---|
| Design record (…-2026-09-22.md) | 14,687 | 271 |
| Provider-neutral contract | 27,949 | 706 |
| Identity conclusion | 6,822 | 148 |
| Behavioural proof JSON | 61,167 | 1,672 |

## Step 3 — Fresh-clone fixture results

All 11 suites exit 0. Every count matches.

| Suite | Expected | Actual | Exit |
|---|---|---|---|
| AGR candidate | 63/63 | 63/63 | 0 |
| CAP-01 | 13/13 | 13/13 | 0 |
| CAP-05 | 11/11 | 11/11 | 0 |
| CAP-06 | 10/10 | 10/10 | 0 |
| CAP-07 | 9/9 | 9/9 | 0 |
| CAP-09 | 9/9 | 9/9 | 0 |
| Manifest validator | 16/16 | 16/16 | 0 |
| Pathway preview | 8/8 | 8/8 | 0 |
| End-to-end | 44/44 | 44/44 | 0 |
| Historical validity | 73/73 | 73/73 | 0 |
| SCS roadmap preview | 14/14 | 14/14 | 0 |

Notes:
- The AGR proof reproduces from a fresh clone, differing only in `generatedAtUtc`
- Every suite rewrites its tracked proof JSON when run — expected behaviour,
  but reviewers running suites in a working checkout should be aware

## Step 4 — The five beyond-composition functions

The three conditions were: (1) neither CAP-04 nor CAP-05 provides the function,
(2) the baseline fails it, (3) every candidate fixture for it passes. Condition 1
is not tested by any fixture — it is a hard-coded label in the test file and was
checked independently against the CAP-04 and CAP-05 contracts.

| # | Function | Code location | Baseline fixture | Baseline behaviour | Candidate behaviour | Conditions |
|---|---|---|---|---|---|---|
| 1 | Dataset / participation authority | `:155-169` (validate), `:246` (exclude) | F07-H | Unauthorised dataset enters CAP-05 and creates a contradiction | F07-B/C/D pass | 2 ✓, 3 ✓, 1 contested |
| 2 | Methodological comparability | `:355-377`, `:444-461` | F05-D | Pools methods into a contradiction | Surfaced separately, not pooled; F05-A/B/C pass | ✓ ✓ ✓ |
| 3 | Unit transformation | `:379-393`, `:395-440` | F04-E | No unit handling at all | F04-A–D pass | ✓ ✓ ✓ (weak on condition 2) |
| 4 | Duplicate-weight prevention | `:294-312` | F08-E | Duplicate makes `eligibleCount` 2 and satisfies `SUFFICIENT_VOLUME` | Counted once; F08-A–D and F08-F pass | ✓ ✓ ✓ |
| 5 | Restricted evidence as limitation | `:265-277`, `:320-327`, `:620-634` | F11-F | Restricted opposing stance appears as a contradiction | Count plus opaque reference only; F11-A–E pass | ✓ ✓ ✓ (conclusion wording overstated) |

### Function 1 — Finding requiring correction

The code's own rule (`behavioural-test.js:751-754`) also excludes functions
"assigned to another designated capability." The conclusion document omits this
clause. CAP-24 is named Governed Country, Institution and Professional
Participation. It has no contract and is marked `NOT_YET_REPRESENTED`. Because
CAP-24 is undefined, participation authority cannot be confirmed as beyond
composition under the code's own rule.

Additionally, the composition baseline ignores CAP-04's own `sharingClassification`
and `permittedUses` fields, even though it claims to be a CAP-04-faithful
composition.

**Finding:** Dataset-level authority and participation authority must be treated
as separate claims. Dataset-level authority is plausibly beyond composition.
Participation authority is **not confirmed** under the code's own three-condition
test while CAP-24 is undefined.

### Function 3 — Finding requiring clarification

F04-E is a regex checking that the words "unit" and "transformation" are absent
from the baseline output. Independent probing shows that unit conversion never
changes a contradiction or evidence state — it affects only `valueSummary`
min/max. The function is real, but the baseline fails by omission rather than
by producing an incorrect evidence state. **Condition 2 is weak.**

### Function 5 — Finding requiring correction

The "leak" described in the conclusion document occurs only with the live CAP-05
evaluator. The canonical CAP-05 contract fails closed with `EVIDENCE_ACCESS_DENIED`,
so a contract-faithful composition would refuse the request rather than leak.
The actual difference is: the candidate proceeds with a disclosed limitation
instead of refusing. That difference is still beyond composition, but the
conclusion document's wording ("leaks as a visible contradiction") overstates it.

**Finding:** Replace with the accurate refusal-versus-disclosed-limitation
distinction.

## Step 5 — Open questions assessment

### Question 1 — Staleness ownership

Staleness is deliberate, not automatic (`assessStaleness` at `:760`). The
amended description in the conclusion document is accurate on this point.

However, a contradiction exists within the candidate package: "What was not
counted" says staleness is "assigned to the separate Governed Evidence Watch",
while open question 1 says ownership is undecided. These cannot both be true.
The open question framing is correct. The "what was not counted" section requires
correction.

**Additional gap found:** An included record whose integrity later becomes
`FAILED`, or which is reclassified as restricted, triggers no staleness notice.
This matters if staleness ownership is decided in the candidate's favour. This
gap should be added as a fourth open question in the conclusion document.

### Question 2 — Lifecycle for frozen evidence sets

Accurate. The evaluator is stateless — it deep-freezes outputs in memory and
persists nothing. The gap is correctly described.

### Question 3 — CAP-23/CAP-24 vs extending CAP-04/CAP-05

The code cannot answer this because neither CAP-23 nor CAP-24 has a contract —
both are manifest entries marked `NOT_YET_REPRESENTED`. Nothing in the code
requires cross-institution coordination beyond checking IDs declared in the
request (`:155-169`, `:240-246`). That authority is asserted by the requester,
not resolved.

**Finding:** The provider-neutral contract frames this question as extending
CAP-04/CAP-05. The conclusion document frames it as CAP-23/CAP-24. These must
be reconciled. The conclusion document framing is more accurate.

## Step 6 — Scope check

| Check | Result |
|---|---|
| Files added | 6 total: 5 new, 1 modified (design record — sequencing steps 4–5 only) |
| CAP numbers | Every mention is a negation — "CAP-35 or later" was already on main |
| PRs | None opened from this branch |
| Production / Supabase | No access |
| CAP-04 memory writes | F12-C traps confirm none |
| Policy recommendations / winning institution | None in any fixture output |

**Scope: ✓ CLEAN**

## Minor findings

### M1 — Guessable opaque references

`withheldReference` is an unsalted SHA-256 over a predictable input
(`"withheld\0" + id + "@" + version`). Anyone who can guess a record ID can
confirm it was withheld. An unsalted hash is not genuinely opaque.

**Required resolution:** The candidate should not generate its own opaque
references. Options: (a) an unguessable random disclosure reference issued by
an authorised receipt service; (b) a keyed HMAC with a `keyId` but without
exposing the secret. Because the candidate is stateless, the cleaner interface
is for an authorised disclosure component to supply the reference. For ordinary
requesters, the safest output may be:

```json
{
  "excludedEvidenceCount": 1,
  "limitationCode": "RESTRICTED_EVIDENCE_PRESENT",
  "detailsDisclosed": false
}
```

Institution identity, record identity, and detailed exclusion reasons should
appear only when separately authorised.

### M2 — Wrong limitation text

The detail for `NON_NUMERIC_VALUE` says "no authorised transformation to kg/ha"
even when the unit is already kg/ha (`:614`). The text is incorrect.

### M3 — Exclusion metadata disclosure

Restricted records excluded for scope still disclose their institution and reason
codes. Whether this exceeds the requester's authorisation depends on design
decisions not yet made. Requires assessment.

### M4 — Fixture-type coverage claim overstated

"Every requirement has perturbation and adversarial cases" is not accurate by
the fixtures' own labels:

- R01, R03, R09 — no adversarial fixture
- R07, R08, R09, R12 — no perturbation fixture

The claim should be corrected to reflect actual coverage.

### M5 — Unverifiable "18 planted faults" and chronology claims

The mutation check claim ("18 faults planted in a scratch copy") and the
chronology claim (rule "fixed before any assessment ran") cannot be verified from
the repository. The scratch copy is not committed. Both the rule and the fixtures
landed in one commit. These claims should be removed or explicitly qualified as
unverifiable from the repo.

## Step 7 — Review conclusion

| Check | Result |
|---|---|
| 63/63 candidate fixtures from fresh clone | ✓ (requires byte-exact clone on Windows) |
| Existing suites, zero regressions | ✓ |
| Methodological comparability | ✓ CONFIRMED |
| Duplicate-weight prevention | ✓ CONFIRMED |
| Restricted evidence as disclosed limitation | ✓ CONFIRMED (conclusion wording requires correction) |
| Unit transformation | ✓ CONFIRMED (weak — baseline fails by omission only) |
| Dataset and participation authority | ✗ NOT FULLY CONFIRMED — dataset authority holds; participation authority unresolved pending CAP-24 contract |
| Open questions accurately stated | ✗ CORRECTIONS REQUIRED (staleness contradiction; integrity/reclassification gap; CAP-23/CAP-24 framing reconciliation) |
| Branch scope | ✓ CLEAN |
| `CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` | **SUPPORTED** |

**The conclusion `CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` is supported.**
The rule requires only one function beyond composition. Three hold cleanly
(methodological comparability, duplicate-weight prevention, restricted evidence
as disclosed limitation). Admission is not established — lifecycle and gateway
action are not demonstrated, as the documents themselves state.

## Required before PR

1. Create remediation branch from `4ec4552` — do not rebase or amend the
   reviewed commit
2. Correct the six identified errors in the conclusion document
3. Resolve the guessable opaque reference design (M1)
4. Reconcile CAP-23/CAP-24 framing across both documents
5. Correct fixture-type coverage claim (M4)
6. Remove or qualify unverifiable claims (M5)
7. Address integrity/reclassification staleness gap
8. Run a second independent verification against the remediation head

## What this review does not establish

- It does not admit this candidate as a canonical capability
- It does not assign a CAP number
- It does not authorise implementation or production deployment
- `SUPPORTED WITH CORRECTIONS REQUIRED` means the evidence supports the
  conclusion but the documents require correction before a PR can be opened
- This review document is immutable — corrections go on the remediation branch,
  not in this file
