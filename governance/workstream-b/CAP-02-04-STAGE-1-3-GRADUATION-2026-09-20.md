# CAP-02 / CAP-04 Stage 1-3 Graduation — 2026-09-20

**Status:** CONTROLLED WORKSTREAM-B RECORD
**Authority:** Disclosure and manifest-accuracy record only — no production, scientific, regulatory, sovereignty or commissioning authority

## Scope of this record

This document explains a single, bounded change: manifest snapshot
`CAP34-MANIFEST-2026-09-20-SNAPSHOT-008` reclassifies CAP-02 (Governed
Scientific Data Acquisition & Interoperability) and CAP-04 (Governed
Scientific Memory) from `ROADMAP_PREVIEW` / `CONCEPT_PREVIEW_NOT_IMPLEMENTED`
to `LIVE_SIMULATION` / `PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN`.

This is the first time a capability previously represented only through
CAP-34's Roadmap Preview mechanism has gained real, tested logic. It is
treated with the same deliberateness as any other manifest snapshot update
(see `CAP-34-MANIFEST-SNAPSHOT-UPDATE-RUNBOOK.md`), plus one additional
consideration specific to this transition, covered below.

## What is real as of this snapshot

Of the seven-stage Historical Scientific Memory Recovery pathway described
in the Capability Landscape, **stages 1 through 3 only** are implemented
as real, behaviourally tested logic, deliberately scoped this way rather
than attempting all seven stages as one build:

1. **Register source** (CAP-02) — a source cannot be registered without
   complete attribution (country, institution, department, original
   system, dataset, responsible owner, date range, authority to provide,
   access restrictions). Missing fields are named explicitly, never
   silently defaulted.
2. **Preserve original** (CAP-02) — original material cannot be preserved
   against a source that was not registered. Preservation computes a real,
   content-derived SHA-256 hash, verified against an independent trusted
   SHA-256 implementation.
3. **Extract and classify cautiously** (CAP-04) — consumes CAP-02's real
   preserved-source output (extraction is refused if preservation was
   refused) and classifies each extraction into `PENDING_REVIEW`,
   `FLAGGED_CONFLICT` or `QUARANTINED` from the content supplied, never
   from a scenario label. Negative/null-result records are retained and
   classified with identical rigor to positive ones.

Stage 4 (format/unit interoperability mapping), stage 5 detection at
corpus scale, full cross-institution connected memory, and stage 7's real
human-review admission workflow remain unbuilt, matching the Capability
Landscape's original sequencing decision to land stages 1-3 first, the
same way CAP-01 landed before CAP-05 was built on top of it.

## The load-bearing property

No output of stage 3 — clean, conflicting or quarantined alike — is ever
structurally eligible to be treated as CAP-04 scientific memory, or to
feed CAP-05/CAP-06-style downstream reasoning. Eligibility requires a
structurally distinct admission shape (`governanceState:
"ADMITTED_SCIENTIFIC_MEMORY"`, a passed `reviewGate` naming an `ADMIT`
decision and a named reviewer) that stage 3 logic cannot itself produce.
This is proven in `cap04-scientific-memory.behavioural-test.js` with a
satisfiable positive control, five adversarial near-miss variants (a bare
label with a failed, incomplete or missing review gate), and a direct
downstream-exclusion proof over a mixed batch. Stage 7 itself is out of
scope for this build; the admission shape used to prove this boundary is
a synthetic stand-in, not a real reviewer decision.

This is why CAP-04's `disclosureBurden` is `HEIGHTENED`, matching CAP-09's
precedent: it is the same class of self-referential refusal claim
("extracted data cannot be treated as memory") that CAP-09 makes about
promotion to approved learning.

## The roadmap-preview receipt channel is now correctly closed for CAP-02/CAP-04

CAP-34's disclosure-receipt validator requires that any capability entered
via the `roadmapPreview.capabilitiesEntered` channel actually be
classified `ROADMAP_PREVIEW` / `CONCEPT_PREVIEW_NOT_IMPLEMENTED` in the
manifest at validation time. Once CAP-02/CAP-04 graduated to
`LIVE_SIMULATION` / `PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN`, a disclosure
receipt attempting to present them through that channel now correctly
**fails closed** with `ROADMAP_CAPABILITY_NOT_CLASSIFIED_PREVIEW`, rather
than silently continuing to validate a now-inaccurate claim. This is
proven directly in `cap34-pathway-preview.behavioural-test.js`
(`PATH-06-MEMORY-ROADMAP-ENTRY-FAILS-CLOSED-POST-GRADUATION`), alongside a
companion proof that CAP-02/CAP-04 validate correctly when presented
directly, outside the roadmap channel
(`PATH-06B-MEMORY-GRADUATED-CAPABILITIES-PRESENTED-DIRECTLY`).

`cap34-simulation.js`'s `roadmapPreviews.HISTORICAL_SCIENTIFIC_MEMORY_RECOVERY`
definition itself is intentionally left unchanged: it still accurately
describes the full, still largely unbuilt pathway (stages 4, 5 at scale,
cross-institution linking, and stage 7), which remains a genuine concept
preview taken as a whole. Both facts are true simultaneously: the full
pathway is still a roadmap concept, and a specific, narrow, real slice of
it now has tested implementation under its own capability identities.

## Mechanical record

- Snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-007` was frozen byte-for-byte
  as `capability-fidelity-manifest.snapshot-007.json` before this change,
  and the registry's `007` entry was repointed to that archived file.
- New snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-008` (manifest version
  `1.7.0`) was appended to the registry; no earlier entry was altered or
  removed.
- `cap34-disclosure-receipt.js`'s `TRUSTED_SNAPSHOTS` gained the
  `SNAPSHOT-008` entry and its validator version was bumped to `2.7.0`.
- The historical-snapshot-validity regression scaled automatically from
  7 to 8 generations (57 → 73 fixtures) with zero code changes, as
  designed.

## Non-implications

- This graduation does not establish full pathway implementation,
  scientific proof, regulatory compliance, production readiness,
  sovereignty or commissioning.
- It does not alter Workstream A's commissioning status or WP05.
- Rule-based field-presence and categorical-polarity comparison does not
  constitute genuine scientific extraction, translation or interoperability
  mapping.
- Extracted records can never independently become approved scientific
  memory; stage 7 human review is not implemented by this change.
