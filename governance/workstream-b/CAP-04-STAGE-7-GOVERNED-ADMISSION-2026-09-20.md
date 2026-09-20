# CAP-04 Stage 7 — Governed Admission — 2026-09-20

**Status:** CONTROLLED WORKSTREAM-B RECORD
**Authority:** Disclosure and manifest-accuracy record only — no production, scientific, regulatory, sovereignty or commissioning authority

## Scope of this record

Manifest snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-010` extends CAP-04
(Governed Scientific Memory) with stage 7 of the seven-stage Historical
Scientific Memory Recovery pathway: human review and governed admission —
`admitToScientificMemory(extractedRecord, reviewDecision)`.

This was deliberately sequenced ahead of stages 5 and 6 (out of the
original 5/6/7 order) because it is the one piece that lets the
eligibility boundary proven in the stage-1-3 increment be re-proven
against a *genuine* admission decision, rather than only the hand-authored
positive control that was necessary before stage 7 existed.

## The permanent rule, enforced structurally

*"Uploading information does not make it approved scientific knowledge."*
A reviewer's decision is **necessary but never sufficient** on its own —
the record's own state must also permit admission. This is the direct
stage-7 analogue of CAP-09's proof that replication alone does not
override contradiction:

- A fully authorised, well-formed `ADMIT` decision is still **refused**
  for a `QUARANTINED` record (`QUARANTINED_RECORD_CANNOT_BE_ADMITTED`) —
  reviewer authority does not override missing or malformed data.
- A fully authorised `ADMIT` decision on a `FLAGGED_CONFLICT` record is
  refused unless the decision documents how the conflict was resolved
  (`UNRESOLVED_CONFLICT_REQUIRES_DOCUMENTED_RESOLUTION`) — proven
  satisfiable, not a permanent block: supplying `conflictResolutionNotes`
  admits the same record.
- Reviewer authority is checked, not assumed: an unauthorised role (e.g.
  `RESTRICTED_USER`) cannot admit even the cleanest possible record, and a
  missing reviewer identity is refused outright.
- Rejection is a first-class, documented outcome, never a bare "no": a
  `REJECT` decision without a `rejectionReason` is itself refused. A
  documented rejection produces `governanceState: "REJECTED_NOT_ADMITTED"`
  — deliberately distinct from `EXTRACTED_UNREVIEWED`, so "reviewed and
  refused" is never confused with "nobody has looked at this yet."
- A record cannot be reviewed twice: attempting to admit an
  already-reviewed record is refused
  (`RECORD_ALREADY_REVIEWED`), so a decision cannot be silently
  overridden by a later, different one.

## Closing the loop on the eligibility boundary

`cap04-scientific-memory.behavioural-test.js` (the stage 1-3 increment)
proved the structural eligibility boundary — that no stage-3 extraction
output is ever eligible for scientific memory — using a hand-authored
admission shape as a positive control, since real admission logic did not
exist yet. That proof remains valid and untouched.

`cap04-scientific-memory-admission.behavioural-test.js` now re-proves the
same boundary one level stronger: a record produced by a **genuine**
`admitToScientificMemory()` call is shown to satisfy
`isEligibleForScientificMemory`, and a mixed batch containing that real
admission alongside real unreviewed extraction outcomes is correctly
filtered by `assembleEligibleEvidenceForReasoning` to include only it.

## What remains unbuilt

- Real reviewer identity and authentication — role and identity are
  asserted by the caller, not independently verified against any real
  system.
- Persistence, an audit trail, a review queue, or any UI for admission
  decisions; each call here is a single, isolated, in-memory decision.
- Stage 5 (corpus-scale duplicate/near-duplicate detection) and the fuller
  corpus-level negative-result discoverability described in stage 6,
  both still out of scope for this build.

## Mechanical record

- Snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-009` was frozen byte-for-byte
  as `capability-fidelity-manifest.snapshot-009.json` before this change.
- New snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-010` (manifest version
  `1.9.0`) was appended to the registry; no earlier entry was altered.
- CAP-04's `disclosureBurden` remains `HEIGHTENED`: admission is the same
  class of self-referential refusal claim as extraction's eligibility
  boundary and CAP-09's promotion refusal.

## Non-implications

- This does not establish full pathway implementation, scientific proof,
  regulatory compliance, production readiness, sovereignty or
  commissioning.
- It does not alter Workstream A's commissioning status or WP05.
- A passing admission call does not establish that any real reviewer,
  institution or authority actually approved anything.
