# CAP-34 Disclosure Receipt Validator — Adversarial Test Matrix

**Status:** CONTROLLED VALIDATOR SELF-TEST BASELINE  
**Recorded:** 2026-09-19  
**Scope:** CAP-34 disclosure receipt validation only  
**Authority:** NONE — validator self-test evidence does not confer product, scientific, legal, regulatory, production, sovereignty or commissioning authority.

> **Standing test principle:** Any component whose job is to detect, classify or attest to a state must itself be tested against deliberately induced bad states before its clean result is trusted.

This matrix is the disclosure-receipt analogue of WP04 drift injection. A clean receipt validation result is not trusted until the validator has demonstrated that it rejects known-invalid states.

## Required result vocabulary

- `PASS_CAP34_DISCLOSURE_RECEIPT_VALID`
- `FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID`

No test may interpret a clean receipt as scientific, legal, commercial, sovereignty or commissioning approval.

## Test cases

| ID | Deliberately induced state | Expected result | Required evidence / error |
|---|---|---|---|
| DRV-01 | Untampered receipt against the exact manifest snapshot it references | PASS | No errors |
| DRV-02 | Receipt references wrong `manifestSnapshotId` | FAIL CLOSED | `MANIFEST_SNAPSHOT_MISMATCH` |
| DRV-03 | Receipt references wrong `manifestVersion` | FAIL CLOSED | `MANIFEST_VERSION_MISMATCH` |
| DRV-04 | Presented capability `representationVersion` differs from referenced manifest | FAIL CLOSED | `REPRESENTATION_VERSION_MISMATCH:<id>` |
| DRV-05 | Receipt claims a different fidelity than the referenced manifest | FAIL CLOSED | `FIDELITY_MISMATCH:<id>` |
| DRV-06 | Receipt claims a different simulator mode than the referenced manifest | FAIL CLOSED | `SIMULATOR_MODE_MISMATCH:<id>` |
| DRV-07 | Receipt claims a different disclosure burden than the referenced manifest | FAIL CLOSED | `DISCLOSURE_BURDEN_MISMATCH:<id>` |
| DRV-08 | Receipt claims an unrepresented capability was shown | FAIL CLOSED | `UNREPRESENTED_CAPABILITY_CANNOT_BE_SHOWN:<id>` |
| DRV-09 | Presented capability is not present in referenced manifest | FAIL CLOSED | `CAPABILITY_NOT_IN_MANIFEST:<id>` |
| DRV-10 | Duplicate capability presentation entry | FAIL CLOSED | `DUPLICATE_PRESENTED_CAPABILITY:<id>` |
| DRV-11 | Limitations omitted for a presented capability | FAIL CLOSED | `LIMITATIONS_REQUIRED:<id>` |
| DRV-12 | Non-implications omitted for a presented capability | FAIL CLOSED | `NON_IMPLICATIONS_REQUIRED:<id>` |
| DRV-13 | Roadmap Preview entered without acknowledgement acceptance | FAIL CLOSED | `ROADMAP_ACKNOWLEDGEMENT_REQUIRED` and/or `ACKNOWLEDGEMENT_NOT_ACCEPTED` |
| DRV-14 | Roadmap Preview entered without preview version / entry time / capability list | FAIL CLOSED | Corresponding `ROADMAP_PREVIEW_*` errors |
| DRV-15 | Roadmap Preview includes capability not classified by the referenced manifest as `ROADMAP_PREVIEW + CONCEPT_PREVIEW_NOT_IMPLEMENTED` | FAIL CLOSED | `ROADMAP_CAPABILITY_NOT_CLASSIFIED_PREVIEW:<id>` |
| DRV-16 | Roadmap Preview capability is not also recorded in `capabilitiesPresented` | FAIL CLOSED | `ROADMAP_CAPABILITY_NOT_RECORDED_AS_PRESENTED:<id>` |
| DRV-17 | Receipt contains Roadmap Preview capabilities while `entered=false` | FAIL CLOSED | `ROADMAP_CAPABILITIES_WITHOUT_ENTRY` |
| DRV-18 | Evaluator name/reference absent | FAIL CLOSED | `EVALUATOR_REFERENCE_REQUIRED` |
| DRV-19 | Evaluator role absent | FAIL CLOSED | `EVALUATOR_ROLE_REQUIRED` |
| DRV-20 | Correlation ID absent | FAIL CLOSED | `CORRELATION_ID_REQUIRED` |
| DRV-21 | Receipt authority disclaimer omitted or altered | FAIL CLOSED | `INVALID_RECEIPT_AUTHORITY` |
| DRV-22 | Unsupported receipt contract version | FAIL CLOSED | `UNSUPPORTED_RECEIPT_CONTRACT_VERSION` |
| DRV-23 | CAP-33 preview is presented with a disclosure burden lower than the manifest's `EXCEPTIONAL` burden | FAIL CLOSED | `DISCLOSURE_BURDEN_MISMATCH:CAP-33:ROOT` |
| DRV-24 | CAP-33 receipt claims a fidelity higher/different from the manifest's allowed fidelity | FAIL CLOSED | `FIDELITY_MISMATCH:CAP-33:ROOT` |
| DRV-25 | **Superseded snapshot preservation:** a valid receipt issued against snapshot N is revalidated against the preserved snapshot N after snapshot N+1 exists and CAP-14A changed | PASS | Original receipt remains valid against N |
| DRV-26 | Same historical receipt is incorrectly evaluated against snapshot N+1 | FAIL CLOSED | Snapshot/version and/or capability representation mismatch |
| DRV-27 | Receipt and manifest are both absent/null | FAIL CLOSED | `RECEIPT_AND_MANIFEST_REQUIRED` |
| DRV-28 | Receipt acknowledgement is not accepted | FAIL CLOSED | `ACKNOWLEDGEMENT_NOT_ACCEPTED` |

## Superseded-snapshot invariant

DRV-25 and DRV-26 enforce:

> **Evidence belongs to the state that produced it.**

A disclosure receipt is evidence of what was shown against the manifest snapshot that existed at that time. Publishing a later manifest must never reinterpret the historical receipt.

Therefore the operational verifier must resolve and preserve the **exact referenced historical manifest snapshot**, not silently substitute the current manifest.

Correct behaviour:

`receipt(N) + manifest(N) -> PASS`

After N+1 exists:

`receipt(N) + preserved manifest(N) -> PASS`

and:

`receipt(N) + manifest(N+1) -> FAIL CLOSED`

## Authority-disclaimer invariant

The exact receipt authority value is mandatory:

`DISCLOSURE_ACKNOWLEDGEMENT_ONLY_NO_LEGAL_COMMERCIAL_SCIENTIFIC_REGULATORY_PRODUCTION_OR_COMMISSIONING_AUTHORITY`

Tampering with or omitting it invalidates the receipt.

## CAP-33 adversarial requirement

CAP-33 is deliberately included as the sharpest disclosure test because it is both demo-attractive and scientifically unproven.

The receipt validator must never allow a presenter to lower the disclosure burden or raise the fidelity beyond what the referenced manifest snapshot permits.

This test does not make CAP-33 represented. The test fixture is deliberately synthetic and exists only to prove rejection logic.

## Completion condition

This matrix is complete only when every negative case is intentionally injected and the validator returns the expected fail-closed result, while the valid and superseded-snapshot preservation cases pass exactly as specified.

A future clean production-like receipt result is not trusted until this matrix has passed.

## Non-implication

Passing this validator matrix proves only that the receipt validator can distinguish the defined valid and invalid receipt states.

It does **not** prove:

- capability implementation;
- scientific correctness;
- simulator containment beyond the tested receipt layer;
- production readiness;
- legal sufficiency;
- sovereignty;
- commissioning.
