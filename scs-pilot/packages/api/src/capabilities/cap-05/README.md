# SCS-CAP-05 — Supply Chain Custody Evidence Admission

**Status: `submitCustodyEvent` (`POST /scs/v1/custody-events`) is implemented for the pilot (contract 7b4fc02 and 9845179, "Admission rules for the pilot"). `submitTransformationRecord` must be redefined before it is built. The reads and `quarantineCustodyEvent` are deferred. `MINIMUM_VERTICAL_SLICE_PROVEN` for CAP-05, on the adopted standard: admitted custody events feed an SCS-CAP-06 custody-chain evaluation that runs end to end, honestly, and reproducibly (`integration/cap-06-evaluate-sufficiency.test.ts`, "end to end over real admitted CAP-04 and CAP-05 records").**

- **Failure checks,** in the contract's order. Each is FAIL_CLOSED and writes nothing:
  1. Authority: a `COMPLIANCE_OFFICER` submits directly (`SUBMITTER_NOT_AUTHORISED`). Representative submission (SCS-CAP-02, "Representative submission"; amendments of 2026-09-27): an actor holding `PARTY_REPRESENTATIVE` granted for the representative party itself (never deployment-wide) and sending `actingUnder` passes the eight link and mandate checks (`capabilities/shared/representation.ts`), each failing closed with its own code, and the act records `representation` in its admission checks and on the submitter's `ActorReference`. A `PARTY_REPRESENTATIVE` without `actingUnder`, or anyone without that role sending it, is `REPRESENTATIVE_NOT_AUTHORISED`. The checks run after the framework, commodity and parties are resolved: the act is for the source party, and its scope is the event's framework, commodity and location country. `provenance.submissionMandateId` is set from `actingUnder.mandateId`. **Breaking change:** the request's `submissionMandateId` is no longer accepted (400).
  2. Internal consistency (`INTERNAL_INCONSISTENCY`), naming every problem:
     - event-type rules: a transformation for TRANSFORMATION and PROCESSING only; a split source for a SPLIT only; at least two inputs for a CONSOLIDATION only; different parties for PURCHASE, TRANSFER, EXPORT and IMPORT;
     - time: EXACT needs `eventTimeUTC`, and `eventTimeUTC` must fall on the local `eventDate` in some time zone from UTC−12:00 to UTC+14:00;
     - no future dates, checked against the database clock (a date may be up to one day ahead of the UTC date);
     - an ISO 3166-1 country code and coordinates in range;
     - quantities greater than 0, and a description exactly when a unit is `OTHER`.
  3. The framework (`frameworkAssociationId` is a CAP-01 frameworkId) must exist (`FRAMEWORK_ASSOCIATION_NOT_FOUND`) and be `ACTIVE` (`FRAMEWORK_NOT_ACTIVE`).
  4. The commodity code must equal the framework's exactly (`COMMODITY_CODE_UNRECOGNISED`).
  5. Both parties must be registered (`SOURCE_`/`DESTINATION_PARTY_NOT_IDENTIFIABLE`) and not `RETIRED` (`PARTY_RETIRED`).
  6. A cited stored document must exist (`EVIDENCE_OBJECT_NOT_FOUND`) and match the declared digest (`DOCUMENT_INTEGRITY_FAILED`).

  `QUANTITY_NOT_RECORDED` and `SUPPORTING_DOCUMENT_ABSENT` are enforced by the request schema (400 `REQUEST_VALIDATION_FAILED`), so the handler never returns them.
- **Limitations.** Everything else is admitted, with each shortfall recorded as one of 13 limitation codes, in the contract's order, and in prose. **A plain `ADMITTED` is reachable:** a fully documented event between verified parties, with a stored and matching document, carries no forced limitation.
  - Verification: a party counts as verified with any current `VERIFIED_FOR_DECLARED_SCOPE` assessment, in any scope. `PARTIALLY_VERIFIED`, expired and superseded assessments do not count.
  - The event's mandate (`sourceParty.actingUnderMandateId`), a fact about the event that never authorises the submission: it must exist, not be revoked, cover the event date (the exact instant when `eventTimeUTC` is given, otherwise any part of the date's span across time zones), permit `SUBMIT_CUSTODY_EVIDENCE`, be granted by the source party, and cover the event's framework, commodity and location country. Otherwise `MANDATE_NOT_VALID`, naming each failed condition.
  - Source plots and linked events are kept as cited, and linked only when they resolve. Successors are never resolved at admission.
- **Quantity.** A `CERTIFICATION` or `INSPECTION` event may omit its quantity. `quantityRecorded` is then `false` and `decisionReasons` says why; this is neither a failure nor a limitation.
- **What is written,** in one transaction:
  - the custody event;
  - its source plots and links;
  - the receipt (`CUSTODY_EVENT_ADMISSION`).

  The database repeats the key rules (migration 014): the commodity and specification are keyed to the framework, seven row-determined limitation codes are tied to the row, and a deferred constraint trigger requires a SPLIT's single source and a CONSOLIDATION's two inputs at commit.

## Open items

- **Chain sufficiency belongs to SCS-CAP-06.** CAP-05 records events, never chains. CAP-06's contract must first define a custody-chain dimension, with the batch and operator in its request subject.
- **`TODO(object-store-credentials)`** (see `platform/evidence-objects/object-store.ts`). The pilot stack gives the API an S3 identity with admin rights on the SeaweedFS store. Before any real data is stored, the API needs a dedicated identity that can only put and read objects, with object locking or an equivalent retention guarantee.
- **Test infrastructure gap.** No lifecycle endpoints exist yet: no party or plot retirement, no framework supersession, no mandate revocation. So `cap-05-submit-custody-event.test.ts` sets those states directly with SQL as the database owner. When those endpoints exist, the tests should use them instead.
- **Contract gaps** (contract "Open gaps"):
  - the missing producer role (a smallholder is recorded as `SUPPLIER`);
  - processed products under a raw-commodity framework;
  - altered documents without a stored object;
  - batch and facility registries;
  - the party-level verification summary.

Canonical contract: [`governance/workstream-b/SCS-CAP-05-SUPPLY-CHAIN-CUSTODY-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-23.md`](../../../../../../governance/workstream-b/SCS-CAP-05-SUPPLY-CHAIN-CUSTODY-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-23.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-05 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
