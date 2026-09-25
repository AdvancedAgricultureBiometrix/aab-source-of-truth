# SCS-CAP-02 — Operator and Supplier Identity Registration

**Status: `registerParty` (`POST /scs/v1/parties`), `submitIdentityEvidence` (`POST /scs/v1/parties/:partyId/evidence`), `registerRelationship` (`POST /scs/v1/relationships`), `registerMandate` (`POST /scs/v1/mandates`), `addRoleClaim` (`POST /scs/v1/parties/:partyId/roles`) and `addVerificationAssessment` (`POST /scs/v1/parties/:partyId/verifications`) are implemented: every CAP-02 registration path. The contract's reads (`getParty`, `getRelationship`, `list…`) and `revokeMandate` are not built yet.**

**Vertical proof: `MINIMUM_VERTICAL_SLICE_PROVEN`** as of commit `748aaba` (2026-09-25): all six registration paths (parties, identity evidence, relationships, mandates, role claims and verification assessments) have been proven end to end over real HTTP against PostgreSQL, connected as the restricted `scs_api` role, each with its decision and immutable receipt written in one transaction. This is a record of implementation proof only. SCS-CAP-02 remains `PROPOSED_NOT_ADMITTED`, and its reads and `revokeMandate` are not built.

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


## registerMandate

- **Rules:** the contract's (9a3e978), checked in this order:
  1. Authority: only `COMPLIANCE_OFFICER`.
  2. `OTHER_EXPLICITLY_NAMED` needs `otherActionDescription`. A description without it is a request error (400).
  3. The validity period must be valid.
  4. `SELF_GRANTED_MANDATE`.
  5. Both parties must exist.
  6. Neither party may be RETIRED.
  7. Every framework must exist and be ACTIVE.
  8. Scope must be within those frameworks.
  9. The relationship prerequisite.
  10. No conflicting record.
- **Enforced by the request schema** (400): `validUntil` is required, at least one consent evidence id, and every permitted action is from the enumerated list. Migration 008 backs the first two in the database.
- **Relationship prerequisite:** an ACTIVE relationship between the two parties must already exist, in either direction and of any type. It must not be past its `validUntil`, and it must reference every framework of the mandate. Otherwise `RELATIONSHIP_NOT_FOUND`.
- **Conflict:** a NOT_REVOKED mandate for the same granting and representative pair that shares a framework and a permitted action and has an overlapping validity period. An advisory lock serialises registrations for the pair.
- **What is written:** the mandate (`CLAIMED_UNVERIFIED`, `NOT_REVOKED`, all six boundary flags `true`) and the receipt (`MANDATE_REGISTRATION`), in one transaction. The decision reasons say the consent evidence can't be confirmed, because the evidence store isn't built yet (`TODO(evidence-store)`).


## addRoleClaim

- **Rules:** the contract's (9a3e978), checked in this order:
  1. Authority: only `COMPLIANCE_OFFICER`.
  2. `OTHER` needs `otherRoleDescription`. A description without `OTHER` is a request error (400).
  3. The validity period must be valid.
  4. The party in the path must exist (`PARTY_NOT_FOUND`, 404).
  5. It must not be RETIRED.
  6. Its single framework must exist and be ACTIVE.
  7. Scope must be within that framework.
  8. No conflicting record.
- **System-set fields:** `frameworkVersion` is the framework's `regulationVersion`. `partyVersion` is the party's current version. The request schema refuses either if the client sends it.
- **Conflict:** a claim for the same party, role and framework, not `SUPERSEDED` or `EXPIRED`, with an overlapping validity period. The status exclusion follows the relationship (ACTIVE only) and mandate (NOT_REVOKED only) rules; the contract is silent on it and records it as a gap. An advisory lock serialises claims for the same party, role and framework.
- **Database backstops** (migration 009): `framework_association_id` has a foreign key to `scs.regulatory_framework`, and there are checks for the `OTHER` description and non-empty scope.
- **What is written:** the claim (`CLAIMED_UNVERIFIED`) and the receipt (`ROLE_CLAIM_REGISTRATION`), in one transaction.


## addVerificationAssessment

- **Rules:** the contract's (e85c58a), checked in this order:
  1. `VERIFICATION_OFFICER` only (`VERIFIER_NOT_AUTHORISED`).
  2. The status must be recordable: `PARTIALLY_VERIFIED`, `VERIFIED_FOR_DECLARED_SCOPE`, `DISPUTED` or `FAIL_CLOSED`. The two derived statuses get `VERIFICATION_STATUS_NOT_RECORDABLE`.
  3. Dates (`VALIDITY_PERIOD_INVALID`): `verifiedAt` must not be in the future, and `expiresAt` must be strictly after `verifiedAt`.
  4. Both `jurisdictionCode`s must be ISO 3166-1 alpha-2.
  5. The party must exist and not be RETIRED.
  6. The actor must not be the party's registrant (`VERIFIER_NOT_AUTHORISED`).
  7. Every cited evidence id must be linked to the party's current version (`VERIFICATION_EVIDENCE_NOT_LINKED`).
  8. Supersession: the named assessment must belong to the same party (`SUPERSEDED_ASSESSMENT_NOT_FOUND`) and not already be superseded (`CONFLICTING_RECORD`).
- **"Not in the future"** is checked against the database's transaction time, the instant `recorded_at` holds. The database also checks `verified_at <= recorded_at`, so clock drift between the API and the database can't turn a valid request into a 500.
- **Append-only** (migration 010): an assessment never changes the party's `registrationStatus` or any earlier assessment. Supersession is recorded on the newer assessment (`supersedes_assessment_id`). A composite foreign key keeps it within the same party, and a unique constraint means an assessment is superseded at most once.
- **Current verification status** is not stored. It's derived when read (not built yet).
- **Decision reasons** state that the verifying authority is recorded as declared (no registry exists), that independence from evidence submitters isn't checked (contract gap), and that evidence content can't be confirmed while the evidence store isn't built (`TODO(evidence-store)`).


Canonical contract: [`governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md`](../../../../../../governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-02 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
