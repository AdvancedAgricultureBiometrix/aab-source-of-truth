# SCS-CAP-02 — Operator and Supplier Identity Registration

**Status: `registerParty` (`POST /scs/v1/parties`), `submitIdentityEvidence` (`POST /scs/v1/parties/:partyId/evidence`) and `registerRelationship` (`POST /scs/v1/relationships`) are implemented. Mandates, role claims and verification assessments are not built yet.**

## registerParty

- **Authority:** only `COMPLIANCE_OFFICER`. Any other actor gets `REGISTRANT_NOT_AUTHORISED` (403).
- **Validation:** the request schema checks `partyType` against the contract's six values and requires a non-blank `partyName`. Both failures return `REQUEST_VALIDATION_FAILED` (400) from the server layer.
- **Country codes:** `countryOfRegistration`, and `countryOfOperation` when present, must be officially assigned ISO 3166-1 alpha-2 codes (`src/reference`, 249 codes, XK excluded). Otherwise `COUNTRY_CODE_UNRECOGNISED` (422).
- **Conflict:** checked only for `LEGAL_ENTITY`, `COOPERATIVE`, `COMMUNITY_GROUP` and `GOVERNMENT_BODY`. If a party of one of those types, not RETIRED, already has exactly the same `partyName` and `countryOfRegistration`, the result is `CONFLICTING_REGISTRATION_DETECTED` (409), naming the existing `partyId`. The match is exact: case, spacing and transliteration are not normalised. An advisory lock serialises registrations with the same key. `NATURAL_PERSON` and `OTHER` are never checked, in either direction: name and country cannot identify a person, so deduplication is left to human review. This is a contract gap, recorded in the contract.
- **What is written:** the party row (`partyVersion` 1, `registrationStatus` REGISTERED), one evidence link per evidence id, and the immutable receipt, all in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Eligibility checks:** each check that is performed is `true`, with an "evaluated" reason. For `NATURAL_PERSON` and `OTHER`, `noConflictingRegistrationDetected` is not performed, so it is `false`, with a NOT EVALUATED reason. The decision is always `REGISTERED` with no gaps. The contract gives no criteria for REGISTERED_WITH_GAPS, REJECTED or REQUIRES_HUMAN_REVIEW.

## submitIdentityEvidence

- **Governing principle:** evidence is admitted, not verified. The party record is never touched: `registrationStatus` doesn't change, no new party version is created, and no verification assessment is created or changed.
- **Order of checks:**
  1. Authority: only `COMPLIANCE_OFFICER` may submit; otherwise `REGISTRANT_NOT_AUTHORISED` (403). Submission under a mandate is a contract gap and is not accepted.
  2. The party must exist; otherwise `PARTY_NOT_FOUND` (404).
  3. The party must not be RETIRED; otherwise `PARTY_RETIRED` (422). Parties that are REGISTERED, REQUIRES_HUMAN_REVIEW or DISPUTED accept evidence.
  4. No submitted evidence id may already be linked to the party's current version, whether at registration or by an earlier submission. Otherwise `EVIDENCE_ALREADY_LINKED` (409), naming every duplicate. An advisory lock serialises submissions for the same party.
- **Request validation:** the schema accepts 1–200 evidence ids, as lowercase UUIDs, so any duplicate within one request is refused with 400. `partyId` in the path must be a UUID, also 400.
- **What is written:** one `party_identity_evidence_submission` row, one evidence link per id naming that submission, and the receipt (decision type `IDENTITY_EVIDENCE_SUBMISSION`, subject = `submissionId`), all in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Decision:** always `RECORDED`. All four checks are performed, so all four are `true`.
- **Evidence store:** not built yet. Every decision's reasons say the ids couldn't be confirmed and that the evidence store isn't built yet. The code marks this `TODO(evidence-store)`.


## registerRelationship

- **Rules:** the contract's (9a3e978), checked in this order:
  1. Authority: only `COMPLIANCE_OFFICER`.
  2. `OTHER` needs a description. A description without `OTHER` is a request error (400).
  3. The validity period must be valid.
  4. The relationship can't be self-referential.
  5. The claiming party must be one of the two parties.
  6. Both parties must exist.
  7. Neither party may be RETIRED.
  8. Every framework must exist and be ACTIVE.
  9. Scope must be within those frameworks.
  10. No conflicting record.
- **Framework checks** (`rules.ts`) are shared with mandates and role claims. A framework association is a CAP-01 `frameworkId`.
- **Scope** is compared value by value. With several frameworks, commodity and country aren't paired per framework. That's a contract gap, and the decision's reasons disclose it.
- **Conflict:** an ACTIVE relationship with the same from party, to party and type that shares a framework and has an overlapping validity period (`tstzrange … '[)'`: a period that ends exactly when another begins doesn't overlap). An advisory lock serialises registrations with the same from, to and type.
- **What is written:** the relationship (`CLAIMED_UNVERIFIED`, `ACTIVE`, `representationVersion` `"1"` until the contract defines it) and the receipt (`RELATIONSHIP_REGISTRATION`), in one transaction. A registration never supersedes another relationship.


Canonical contract: [`governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md`](../../../../../../governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-02 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
