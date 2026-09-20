# CAP-02 Stage 4 — Interoperability Mapping — 2026-09-20

**Status:** CONTROLLED WORKSTREAM-B RECORD
**Authority:** Disclosure and manifest-accuracy record only — no production, scientific, regulatory, sovereignty or commissioning authority

## Scope of this record

Manifest snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-009` extends CAP-02
(Governed Scientific Data Acquisition & **Interoperability**) with stage 4
of the seven-stage Historical Scientific Memory Recovery pathway: mapping
different institutions' wording and units into a common, governed
reference structure. This is the capability whose own name names this
stage; it belongs here rather than under CAP-04, and consumes CAP-04's
real stage-3 extraction output as its input.

## What is real as of this snapshot

`proposeInteroperabilityMapping(extractedRecord, referenceVocabulary)`
takes a real, already-extracted CAP-04 record and a small, hand-authored
synthetic reference vocabulary (a list of canonical terms with known
synonyms, and canonical units with known synonym/conversion-factor pairs),
and:

- proposes a canonical subject term and a converted unit value when the
  raw term is an exact, unambiguous synonym match;
- leaves a term `UNMAPPED_*` with a `null` normalized value when the
  vocabulary does not recognise it at all, rather than guessing;
- flags a term `AMBIGUOUS_MULTIPLE_*_MATCHES`, naming every candidate,
  when the vocabulary itself maps the same raw term to more than one
  canonical entry, rather than silently resolving it one way;
- refuses cleanly (never crashes, never invents a value) when fed a
  record missing the field being mapped, including CAP-04's real
  quarantined output.

## The load-bearing property

Straight from the design document: *"The original wording and value would
remain preserved alongside any normalized representation."* This is
proven directly in `cap02-interoperability-mapping.behavioural-test.js`
(`CAP02M-A1`): the raw subject key, raw unit and raw measured value are
carried into the mapping record byte-identical to CAP-04's extraction
output, even on the most confident possible match. A mapping is a
proposal annotated alongside the source of truth, never a replacement
for it.

A second, equally load-bearing property closes the loop with CAP-04's own
eligibility boundary (`CAP02M-A2`): proposing a mapping never changes a
record's `governanceState` or `reviewGate`, and a mapped record is still
rejected by `isEligibleForScientificMemory`. A confident, correctly
resolved mapping is not a substitute for stage 7 human review — it is not
even progress toward it in any structural sense.

## What remains unbuilt

- Real semantic or linguistic matching (this is exact, case-insensitive
  string matching against a hand-authored list only).
- A governed vocabulary authority, its maintenance, versioning or
  cross-institution reconciliation.
- Corpus-scale application (matching many records against a large,
  evolving vocabulary efficiently and consistently).
- Stage 5 detection at scale and stage 7's real human-review admission
  workflow, both still out of scope for this build.

## Mechanical record

- Snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-008` was frozen byte-for-byte
  as `capability-fidelity-manifest.snapshot-008.json` before this change.
- New snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-009` (manifest version
  `1.8.0`) was appended to the registry; no earlier entry was altered.
- CAP-02's own scenario coverage was also corrected in this pass: the
  prior snapshot had CAP-02 borrowing CAP-04's three extraction-scenario
  IDs (`SIM-MEMORY-CLEAN-001` / `CONFLICT-001` / `DEGRADED-001`), which
  CAP-02's own tests never actually exercised. It now carries its own
  `SIM-MEMORY-SOURCE-REGISTRATION-001` and `SIM-MEMORY-MAPPING-001` IDs.

## Non-implications

- This does not establish full pathway implementation, scientific proof,
  regulatory compliance, production readiness, sovereignty or
  commissioning.
- It does not alter Workstream A's commissioning status or WP05.
- A proposed mapping is not a governed vocabulary decision and creates no
  scientific, regulatory or institutional authority.
