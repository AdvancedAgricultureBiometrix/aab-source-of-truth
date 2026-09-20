# CAP-04 Domain-Portable Reviewer Authority — 2026-09-20

**Status:** CONTROLLED WORKSTREAM-B RECORD
**Authority:** Disclosure and manifest-accuracy record only — no production, scientific, regulatory, sovereignty or commissioning authority

## Scope of this record

Manifest snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-012` makes CAP-04's
stage-7 reviewer authority list a genuine optional parameter of
`admitToScientificMemory(extractedRecord, reviewDecision,
authorisedReviewerRoles)`, defaulting to the existing synthetic
`AUTHORISED_REVIEWER_ROLES` (`SCIENTIST`, `INSTITUTION_ADMIN`,
`COUNTRY_HEAD`) when omitted, matching the same override pattern already
proven for CAP-02's interoperability-mapping reference vocabulary.

## Why this exists

A direct question was asked: could a future Water Science or Aquaculture
domain reuse CAP-02/CAP-04's stages 1-3 logic — register a source,
preserve a file, extract and classify it — by supplying a different
vocabulary/taxonomy file, with zero changes to the actual JS logic? Or
does the code contain agriculture-specific strings, field names or
assumptions?

Inspection found the field schema (`subjectKey`, `treatmentLabel`,
`location`, `unit`, `dateObserved`, `measuredValue`, `outcomePolarity`),
the source-registration fields, and the reference-vocabulary parameter
were already domain-neutral. The one genuine exception was
`AUTHORISED_REVIEWER_ROLES`: a hardcoded constant inside
`cap04-scientific-memory.js`, not a parameter, unlike the vocabulary. This
record closes that gap the same way the vocabulary gap was closed.

## The load-bearing proof

Consistent with this project's standing rule — a parameter is not proven
until a test shows it is genuinely consulted, not merely accepted and
ignored — `cap04-scientific-memory-admission.behavioural-test.js` Part H
proves three things about `authorisedReviewerRoles`:

- **`CAP04ADM-H0`**: a `SCIENTIST` reviewer, authorised under the
  *default* list, is refused when a custom list excluding `SCIENTIST` is
  supplied. If the parameter were accepted and ignored (always falling
  back to the hardcoded default), this would still admit — it does not.
- **`CAP04ADM-H1`** (sanity check): `WATER_SCIENCE_LEAD` is confirmed
  genuinely unauthorised under the *default* list with no custom list
  supplied, so the grant proven next is a real change of authority, not a
  role that would have been admitted anyway.
- **`CAP04ADM-H2`**: the same `WATER_SCIENCE_LEAD` reviewer, refused in
  H1, is genuinely admitted once a custom list naming that role is
  supplied.

Together these prove the parameter can both **revoke** a default
authority and **grant** an authority the default list refuses — the same
bidirectional standard `CAP02M-C0` (ambiguous vocabulary matches) was held
to for CAP-02's reference-vocabulary injection.

## What this does and does not establish

It establishes that stage 7's admission logic does not hardcode any
particular set of organisational role names, and that stages 1-3 as a
whole contain no discovered agriculture-specific assumption.

It does **not** establish that a Water Science or Aquaculture deployment
of AAB exists, is planned, or has been evaluated for domain-specific
correctness beyond this generic field schema. It does not add real
identity or authentication for any role, in either the default or a
custom list — reviewer identity and role remain asserted by the caller,
not independently verified, regardless of which list is used.

## Mechanical record

- Snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-011` was frozen
  byte-for-byte as `capability-fidelity-manifest.snapshot-011.json`
  before this change.
- New snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-012` (manifest version
  `1.11.0`) was appended to the registry; no earlier entry was altered.
- CAP-04's governed-admission fixture count increased from 11 to 14
  (3 new fixtures); extraction/classification (14) and corpus-scale
  (9) proofs are unaffected.

## Non-implications

- This does not establish full pathway implementation, scientific proof,
  regulatory compliance, production readiness, sovereignty or
  commissioning.
- It does not alter Workstream A's commissioning status or WP05.
- It does not constitute a decision to build a Water Science, Aquaculture
  or any other non-agricultural AAB deployment.
