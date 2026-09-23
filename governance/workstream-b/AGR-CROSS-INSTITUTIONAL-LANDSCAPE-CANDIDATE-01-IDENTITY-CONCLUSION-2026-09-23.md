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

This rule was stated as fixed in the code before any assessment ran — this
chronology cannot be verified from the repository, as the rule and the fixtures
landed in a single commit.

## The five functions beyond composition

### 1. Dataset-level and participation authority

1a. Dataset-level sharing authority — an unauthorised dataset entering CAP-05
creates a false contradiction in the composition baseline (fixture F07-H). The
candidate enforces dataset-level sharing authority before any evidence reaches
the evaluation layer. Neither the CAP-04 nor the CAP-05 contract governs
cross-institution dataset access at the landscape evaluation level. This function
is confirmed.

1b. Participation authority — the candidate also enforces participation authority
(which institutions may participate and with which datasets). However, under the
code's own three-condition rule, a function is only counted as beyond composition
if it is not "assigned to another designated capability." CAP-24 (Governed
Country, Institution and Professional Participation) is named as the candidate
home for participation authority, but CAP-24 has no contract and is marked
NOT_YET_REPRESENTED. Participation authority cannot be confirmed as beyond
composition until CAP-24's contract establishes or excludes this function.
This function is unresolved pending CAP-24's contract.

Note: the composition baseline also omits CAP-04's own `sharingClassification`
and `permittedUses` fields. A fully faithful composition baseline would include
these. This does not change the conclusion but should be corrected in a future
fixture revision.

### 2. Methodological comparability

The composition baseline silently pools evidence from different methodologies
into a contradiction (fixture F05-D). The candidate surfaces methodological
incompatibility as a distinct finding rather than treating it as a contradiction.
This requires evaluation logic that neither CAP-04 admission nor CAP-05
reasoning provides.

### 3. Authorised unit transformation

The composition baseline has no unit handling (fixture F04-E proves this by
confirming that the words "unit" and "transformation" are absent from baseline
output). The candidate converts units only through an explicitly authorised
transformation registry — or declares the evidence incomparable if no authorised
transformation exists. This is governed logic not present in either CAP-04 or
CAP-05.

Note: the baseline fails condition 2 by omission rather than by producing an
incorrect evidence state — unit conversion in the candidate affects only
`valueSummary` min/max and does not change contradiction or evidence states.
This function is confirmed but the baseline distinction is weak.

### 4. Duplicate-weight prevention

In the composition baseline, one duplicate changes CAP-05's outcome by
satisfying its minimum-volume check (fixture F08-E). The candidate detects
and prevents duplicate evidence from creating artificial evidential weight.
CAP-04 admits individual records; CAP-05 evaluates the set as presented.
Neither prevents the same evidence from being counted twice across institutions.

### 5. Restricted evidence disclosed only as a limitation

The canonical CAP-05 contract fails closed with EVIDENCE_ACCESS_DENIED when
restricted evidence is encountered. A contract-faithful composition would
therefore refuse the request rather than proceed. The candidate instead proceeds
with a disclosed limitation — surfacing that restricted evidence exists without
exposing its content (fixture F11-F). This refusal-versus-disclosed-limitation
distinction is the actual difference, not a "leak": the composition baseline
does not leak protected content, it refuses. The candidate's ability to proceed
honestly with a disclosed limitation requires access-control logic at the
landscape layer that the CAP-05 contract does not provide. This function is
confirmed.

## What was not counted

The following functions were deliberately excluded from the count to avoid
overstating the case:

- Contradiction detection, agreement, knowledge gaps, and institution-level
  filtering — CAP-05 already provides these
- Evidence-set freezing — CAP-05's snapshot identity already covers the
  core of this
- Staleness — excluded from the count because ownership is unresolved
  (see open question 1). It was not counted as a beyond-composition function
  because the decision of whether this candidate or the Governed Evidence Watch
  owns staleness has not been made. If ownership is assigned to this candidate,
  staleness detection will need to be revisited.
- No independent lifecycle or gateway action was demonstrated, because the
  evaluator is stateless

## Fixture evidence

63 fixtures passing across 12 requirement categories. Most requirements have
perturbation and adversarial cases, but coverage is not uniform: R01, R03, and
R09 have no adversarial fixture; R07, R08, R09, and R12 have no perturbation
fixture. The fixture-type coverage claim in the behavioural proof should not be
read as complete bidirectional perturbation for every requirement.

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

Mutation check: the build session reported that 18 faults were planted in a
scratch copy of the evaluator and every one was caught, and that a weak
reputation test was strengthened before committing. These claims cannot be
verified from the repository — the scratch copy was not committed, and both
the rule and the fixtures landed in a single commit. They are recorded here
as reported but are not independently verifiable.

## Open questions before any admission review

These four questions must be answered before this candidate can be considered
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

**3. Whether CAP-23, CAP-24, or extensions to CAP-04/CAP-05 are the right home**

Two functions require a decision about where they belong before this candidate
can be considered for admission:

Dataset-level sharing authority (confirmed as beyond composition) might belong
in CAP-24 (Governed Country, Institution and Professional Participation) — the
designated capability for institutional participation governance — or it might
require its own logic in this candidate. This cannot be determined until CAP-24
has a contract. Until then, dataset-level sharing authority remains a
beyond-composition function of this candidate.

Participation authority (unresolved) is likely the natural scope of CAP-24.
Once CAP-24's contract is written, this question should be revisited.

Duplicate detection might be better placed in CAP-04 where admission decisions
live. If it can be placed there cleanly without overloading CAP-04, the
candidate's case weakens for that function.

Neither the provider-neutral contract nor the conclusion document should frame
this question as "extend CAP-04/CAP-05 instead." The more accurate framing is
whether cross-institution coordination belongs in CAP-23/CAP-24 or in this
candidate — and that question cannot be answered until those capabilities have
contracts.

**4. Integrity failure and access reclassification as staleness triggers**

If staleness ownership is assigned to this candidate, two material changes to
previously included records are not currently detected:

- Document integrity becoming FAILED after the evidence set is frozen
- Sharing classification becoming more restrictive after the evidence set is frozen

Note: admission revocation/supersession and evidence version changes do trigger
staleness notices — fixtures F10-E and F10-F prove this. Permitted use withdrawal
and methodology/unit-transformation authority changes have not been tested and
their behaviour is not determined.

This gap must be resolved before the candidate can take on staleness
responsibility. If staleness belongs to the Governed Evidence Watch, this
question transfers with it.

## What this conclusion does not establish

- It does not admit this candidate as a canonical capability
- It does not assign a CAP number
- It does not authorise implementation or deployment
- It does not alter commissioning status, satisfy Gate D, or close WP05
- The conclusion `CANDIDATE_FOR_SEPARATE_CAPABILITY_REVIEW` means the evidence
  supports further admission review — it does not mean admission is approved
  or that a CAP number will be assigned
