# AGR-CROSS-INSTITUTIONAL-LANDSCAPE-CANDIDATE-01 — Capability Identity Conclusion — 2026-09-23

**Status:** CONCLUSION RECORD — NOT AN ADMISSION DECISION
**Branch:** workstream-b/agr-cross-institutional-landscape-candidate-01
**Authority:** RECORDS THE RESULT OF THE CONTROLLED FIXTURE TEST DEFINED IN THE
CANDIDATE DESIGN RECORD. Does not admit this candidate as a capability. Does not
assign a CAP number. Does not grant implementation or production authority.

## Conclusion

**`CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW`**

The controlled fixture suite demonstrates that the AGR Cross-Institutional
Evidence Landscape candidate contains material governed logic beyond what
authorised CAP-04 evidence selection followed by CAP-05 evaluation provides
through composition alone.

## The methodology

A function was counted as beyond composition only if all three conditions held:

1. Neither the CAP-04 nor the CAP-05 contract provides it
2. The composition baseline demonstrably fails it
3. Every candidate fixture for that function passes

This rule was fixed in the code before any assessment ran.

## The five functions beyond composition

### 1. Dataset-level and participation authority

In the composition baseline, an unauthorised dataset enters CAP-05 and creates
a false contradiction (fixture F07-H). The candidate enforces dataset-level
sharing authority before any evidence reaches the evaluation layer. Neither
CAP-04 nor CAP-05 governs cross-institution dataset access at the landscape
evaluation level.

### 2. Methodological comparability

The composition baseline silently pools evidence from different methodologies
into a contradiction (fixture F05-D). The candidate surfaces methodological
incompatibility as a distinct finding rather than treating it as a contradiction.
This requires evaluation logic that neither CAP-04 admission nor CAP-05
reasoning provides.

### 3. Authorised unit transformation

The composition baseline has no unit handling at all (fixture F04-E). The
candidate converts units only through an explicitly authorised transformation
registry — or declares the evidence incomparable if no authorised transformation
exists. This is governed logic not present in either CAP-04 or CAP-05.

### 4. Duplicate-weight prevention

In the composition baseline, one duplicate changes CAP-05's outcome by
satisfying its minimum-volume check (fixture F08-E). The candidate detects
and prevents duplicate evidence from creating artificial evidential weight.
CAP-04 admits individual records; CAP-05 evaluates the set as presented.
Neither prevents the same evidence from being counted twice across institutions.

### 5. Restricted evidence disclosed only as a limitation

In the composition baseline, a restricted opposing stance leaks as a visible
contradiction (fixture F11-F). The candidate surfaces restricted evidence as
a disclosed limitation without exposing the protected content. This requires
access-control logic at the landscape layer that neither CAP-04 nor CAP-05
provides.

## What was not counted

The following functions were deliberately excluded from the count to avoid
overstating the case:

- Contradiction detection, agreement, knowledge gaps, and institution-level
  filtering — CAP-05 already provides these
- Evidence-set freezing — CAP-05's snapshot identity already covers the
  core of this
- Staleness — assigned to the separate Governed Evidence Watch design,
  not to this candidate
- No independent lifecycle or gateway action was demonstrated, because the
  evaluator is stateless

## Fixture evidence

63 fixtures passing across 12 requirement categories. Every requirement has
perturbation cases in both directions and adversarial cases.

| Requirement | Fixtures |
|---|---|
| R01 Cross-institution agreement | 3 |
| R02 Genuine same-subject contradiction | 4 |
| R03 Cross-subject disagreement not contradiction | 3 |
| R04 Authorised unit conversion or incomparability | 5 |
| R05 Methodological incompatibility surfaced | 4 |
| R06 Missing evidence becomes knowledge gap | 4 |
| R07 Unauthorised evidence excluded or fails closed | 9 |
| R08 Duplicate evidence creates no artificial weight | 6 |
| R09 Institutional reputation has no evidential weighting | 3 |
| R10 Later evidence creates staleness without rewriting | 9 |
| R11 Restricted evidence disclosed only as limitation | 7 |
| R12 No recommendation, promotion, verdict or memory write | 6 |

Mutation check: 18 faults planted in a scratch copy of the evaluator — every
one caught. A weak reputation test was strengthened before committing.

## Open questions before any admission review

These three questions must be answered before this candidate can be considered
for formal admission as a numbered capability:

**1. Staleness ownership**

Does this candidate or the Governed Evidence Watch own staleness?
The candidate produces a `LandscapeStalenessNotice` only when a deliberate
staleness check is requested against a previously frozen evidence set — it does
not monitor continuously or raise notices automatically. The Governed Evidence
Watch is designed for ongoing monitoring and notification. These may be
different functions that can coexist — or one may subsume the other. This must be decided before admission.

**2. Lifecycle for frozen evidence sets**

A frozen evidence set needs its own governed lifecycle — created, superseded,
archived, permanently retrievable. That lifecycle is what makes the result
defensible when challenged. It has not been fully designed. The current
implementation is stateless and does not maintain frozen set lifecycle records
beyond the immediate evaluation.

**3. Whether to extend CAP-04/CAP-05 instead**

Dataset-level sharing authority might be better placed in CAP-23 (Governed
Identity and Authority Resolution) or CAP-24 (Governed Country, Institution
and Professional Participation), where cross-institution identity and access
decisions live. Duplicate detection might be better placed in CAP-04 where
admission decisions live. If either function can be cleanly placed in an
existing capability without overloading it, the candidate's case for
independent admission weakens for that function. If cross-institution
coordination makes placement in existing capabilities impossible, the candidate's
case strengthens. This must be examined before admission.

## What this conclusion does not establish

- It does not admit this candidate as a canonical capability
- It does not assign a CAP number
- It does not authorise implementation or deployment
- It does not alter commissioning status, satisfy Gate D, or close WP05
- The conclusion `CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` means the evidence
  supports further admission review — it does not mean admission is approved
  or that a CAP number will be assigned
