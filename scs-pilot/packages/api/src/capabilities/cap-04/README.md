# SCS-CAP-04 — Deforestation Evidence Admission

**Status: `submitEvidence` (`POST /scs/v1/deforestation-evidence`) is implemented for the pilot (contract 5c6a263, "Admission rules for the pilot"). `quarantineEvidence` is not yet specified as a request and decision. The reads are deferred. `MINIMUM_VERTICAL_SLICE_PROVEN` is not yet claimed for CAP-04: admitted evidence proves nothing until SCS-CAP-06 evaluates it.**

- **Failure checks,** in the contract's order. Each is FAIL_CLOSED and writes nothing:
  1. Authority: only `COMPLIANCE_OFFICER` (`SUBMITTER_NOT_AUTHORISED`).
  2. Request rule: attestation details require `attestationProvided: true` (400).
  3. Dates, checked against the database clock (`TEMPORAL_DATES_INCONSISTENT`):
     - a start is never after its end;
     - a `POINT_IN_TIME` item has an instant, and an instant is never given together with an acquisition start or end;
     - no date is in the future;
     - every known gap lies within an acquisition or analysis window that has both bounds.
  4. The coverage and excluded-area geometries are validated like a plot geometry, without the plot area rule, and must be in `EPSG:4326` (`COVERAGE_GEOMETRY_INVALID`).
  5. The plot must exist and not be `RETIRED`. The association must belong to the plot, and both the association and its framework must be `ACTIVE`.
  6. The evidence object and its integrity:
     - a cited `objectId` must be stored (`EVIDENCE_OBJECT_NOT_FOUND`), and the declared digest must equal it (`OBJECT_INTEGRITY_FAILED`);
     - a specification requiring `VERIFIED` integrity with no cited object is `OBJECT_INTEGRITY_FAILED`.
  7. Relation to the plot: the coverage's bounding box must intersect the plot's; touching counts (`EVIDENCE_NOT_RELATED_TO_PLOT`).
  8. The `evidenceType` must be among the specification's accepted source types (`EVIDENCE_TYPE_INCOMPATIBLE`).
  9. The attesting and analyst parties must be registered CAP-02 parties that are not `RETIRED`.
- **Limitations.** Everything else is admitted, with each shortfall recorded as a limitation code (in the contract's order) and in prose:
  - resolution, recency, authority confirmation and unknown source-type vocabulary;
  - unverified integrity (no object cited, under a `VERIFIABLE` specification);
  - an attestation that exceeds the analysis period;
  - unresolved lineage (`PROVENANCE_INCOMPLETE`: the citation is recorded with `linked_evidence_id` null);
  - an incomplete chain of custody.
- **What is written,** in one transaction:
  - the evidence record, with `intersectionWithPlot` `NOT_VERIFIED`;
  - its known gaps, excluded areas and lineage;
  - the receipt (`DEFORESTATION_EVIDENCE_ADMISSION`).

## Honest outcome and open items

- **`TODO(postgis)`.** There is no spatial database, so only the bounding boxes are compared. The intersection with the plot is not verified, and `spatialCoverageCompleteAtAdmission` is always `false`. Together with temporal coverage, which cannot be evaluated at admission, this means **every pilot admission is `ADMITTED_WITH_LIMITATIONS`** (always with `SPATIAL_COVERAGE_NOT_VERIFIED` and `TEMPORAL_COVERAGE_NOT_EVALUATED`). Pilot partners must be told why.
- **`evaluateTemporalSufficiency` is deferred to SCS-CAP-06.** It is not part of the CAP-04 provider. CAP-06 evaluates whether the collective admitted evidence covers the framework-required period, once it knows the due diligence date.
- **`TODO(object-store-credentials)`** (see `platform/evidence-objects/object-store.ts`). The pilot stack gives the API an S3 identity with admin rights on the SeaweedFS store. Before any real data is stored, the API needs a dedicated identity that can only put and read objects, with object locking or an equivalent retention guarantee.
- **Test infrastructure gap.** No lifecycle endpoints exist yet: there is no `retirePlot`, no association withdrawal or supersession, and no framework supersession. So `cap-04-submit-evidence.test.ts` sets retired plots, inactive associations and superseded frameworks directly with SQL as the database owner. When those endpoints exist, the tests should use them instead.
- **Contract gaps** (contract "Open gaps"):
  - submission under a CAP-02 mandate: an actor is not linked to a party;
  - which of the two attested periods is authoritative (both are checked against the analysis period);
  - whether the claimed period must lie within the analysis period (not checked);
  - the criteria for `REJECTED` and `QUARANTINED`.
- **Interpretations made in the pilot:**
  - Apart from the `AUTHORITY_ATTESTATION` exemption, an attested period with no analysis period is recorded as `ATTESTATION_EXCEEDS_ANALYSIS`.
  - An association that belongs to another plot is reported as `FRAMEWORK_ASSOCIATION_NOT_FOUND`.
  - `SOURCE_NOT_IDENTIFIABLE` is never returned: the request schema enforces the required, non-blank source fields.

Canonical contract: [`governance/workstream-b/SCS-CAP-04-DEFORESTATION-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-04-DEFORESTATION-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-04 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
