# CAP-04 Stages 5-6 — Corpus-Scale Detection & Discovery — 2026-09-20

**Status:** CONTROLLED WORKSTREAM-B RECORD
**Authority:** Disclosure and manifest-accuracy record only — no production, scientific, regulatory, sovereignty or commissioning authority

## Scope of this record

Manifest snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-011` extends CAP-04
with stages 5 and 6 of the seven-stage Historical Scientific Memory
Recovery pathway, built together since both operate over a corpus of
stage-3 extraction output rather than a single record:

- `scanCorpusForProblems(extractedRecords)` — stage 5, detect problems
  without silently fixing them, at scale.
- `queryCorpusBySubject(extractedRecords, subjectKey)` — stage 6, the
  discoverability half of deliberately preserving negative and failed
  research (retention alone, already proven in the stage 1-3 increment,
  is necessary but not sufficient — a retained record that can never be
  found again is not meaningfully preserved).

With this increment, all seven originally designed pathway stages have
some real, tested logic, split across CAP-02 (stages 1, 2, 4) and CAP-04
(stages 3, 5, 6, 7). This does **not** mean the pathway is complete — see
Limitations in both capabilities' manifest entries, and the Non-Implications
below.

## The standout property

Stage 3's own per-record conflict check (`extractAndClassify`) only ever
compares a new record against whatever `priorExtractedRecords` its caller
happened to pass at extraction time. In a real multi-institution pathway,
records can arrive close together without either extraction call knowing
about the other — so a genuine contradiction can slip through stage 3
uncaught, not because the logic is wrong, but because it was never shown
the full picture.

`cap04-corpus-scale.behavioural-test.js` constructs exactly this gap: two
records describing the same subject, treatment and location, both
extracted with `priorExtractedRecords: []`, so neither call knows about
the other. A sanity-check fixture (`CAP04CS-B0`) first confirms the gap is
real — `recordY` reaches `PENDING_REVIEW`, not `FLAGGED_CONFLICT`. Then
`scanCorpusForProblems()`, given both records together, correctly surfaces
a `contradictionGroup` naming both (`CAP04CS-B1`) — proving corpus-scale
detection catches something the per-record path missed, not merely that
it repeats what stage 3 already found.

A second, equally important property (`CAP04CS-B2`): the scan is
read-only. Surfacing the contradiction never changes either record's
`recordStatus` or `governanceState`. Detection is not resolution — that
remains a stage-7 human decision, per the design document's rule.

## What "duplicate" means here, precisely

`scanCorpusForProblems` distinguishes two cases, both already implicit in
the design document's list of things to detect:

- **`exactDuplicateGroups`** — records sharing subject, treatment,
  location, outcome polarity *and* measured value: likely the same
  observation reported more than once (e.g. by two institutions).
- **`possibleDuplicateVariantGroups`** — records agreeing on outcome
  polarity but disagreeing on the measured value: the same conclusion,
  reported with different numbers, which needs review rather than a
  silent average or a silent pick of one value.

Neither is auto-merged, auto-removed, or auto-resolved. Both are reports
for a human reviewer.

## Discoverability as its own guarantee

`queryCorpusBySubject` deliberately returns every matching record —
`PENDING_REVIEW`, `FLAGGED_CONFLICT` and `QUARANTINED` alike — sorted only
by `dateObserved`, never reordered to put positive results first. A
negative or null-result record is tagged with its own `outcomePolarity`
and appears with identical structure and prominence to a positive one.
This is deliberately distinct from `assembleEligibleEvidenceForReasoning`
(the CAP-04 eligibility boundary): discovery over the raw corpus is
explicitly **not** a claim about scientific memory or admission — it
answers "what is on file for this subject," not "what has AAB
established." Keeping these two functions clearly separate was the
reason stage 6 was sequenced after stage 7 rather than before it (see
`CAP-04-STAGE-7-GOVERNED-ADMISSION-2026-09-20.md`): stage 7 gave this
increment a genuine admitted/unreviewed line to keep discovery on the
correct side of.

## What remains unbuilt

- Fuzzy, semantic or near-duplicate matching — grouping here is an exact
  key match on (subjectKey, treatmentLabel, location) only.
- Any scale beyond a small, synthetic, in-memory array of records; no
  performance, indexing or real corpus-size behaviour is proven.
- Real cross-institution or cross-country search, persistence, an audit
  trail, or any UI.
- Genuine semantic interoperability, legacy-system adapters, and a real
  human-review workflow, UI or persistence for stage 7's decisions —
  these limitations carry over unchanged from the earlier increments.

## Mechanical record

- Snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-010` was frozen byte-for-byte
  as `capability-fidelity-manifest.snapshot-010.json` before this change.
- New snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-011` (manifest version
  `1.10.0`) was appended to the registry; no earlier entry was altered.

## Non-implications

- This does not establish full pathway implementation, scientific proof,
  regulatory compliance, production readiness, sovereignty or
  commissioning.
- It does not alter Workstream A's commissioning status or WP05.
- Corpus-scale detection over a small in-memory array does not establish
  real institutional-scale duplicate detection, cross-institution search,
  or a connected scientific memory across countries or institutions.
