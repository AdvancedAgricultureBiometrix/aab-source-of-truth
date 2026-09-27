# SCS-CAP-02 — Operator and Supplier Identity Registration

**Status: `registerParty` (`POST /scs/v1/parties`), `submitIdentityEvidence` (`POST /scs/v1/parties/:partyId/evidence`), `registerRelationship` (`POST /scs/v1/relationships`), `registerMandate` (`POST /scs/v1/mandates`), `addRoleClaim` (`POST /scs/v1/parties/:partyId/roles`) and `addVerificationAssessment` (`POST /scs/v1/parties/:partyId/verifications`) are implemented: every CAP-02 registration path. The actor–party link operations `createActorPartyLink` (`POST /scs/v1/actor-party-links`), `recordActorPartyLinkStatus` (`POST /scs/v1/actor-party-links/:linkId/status-records`) and `getActorPartyLink` (`GET /scs/v1/actor-party-links/:linkId`) are implemented (AAB-PLATFORM-04; amendments of 2026-09-27), and so is `addMandateVerificationAssessment` (`POST /scs/v1/mandates/:mandateId/verifications`). `submitIdentityEvidence` accepts a representative submission under a verified mandate, relying on both. The contract's reads (`getParty`, `getRelationship`, `list…`) and `revokeMandate` are not built yet.**

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
  1. Authority: a `COMPLIANCE_OFFICER` submits directly; otherwise `REGISTRANT_NOT_AUTHORISED` (403). Representative submission (SCS-CAP-02, "Representative submission"; amendments of 2026-09-27): an actor holding `PARTY_REPRESENTATIVE` granted for the representative party itself (never deployment-wide) and sending `actingUnder` passes the eight link and mandate checks (`capabilities/shared/representation.ts`), each failing closed with its own code, and the act records `representation` in its admission checks and on the submitter's `ActorReference`. A `PARTY_REPRESENTATIVE` without `actingUnder`, or anyone without that role sending it, is `REPRESENTATIVE_NOT_AUTHORISED`. For identity evidence the act is for the path's party, and only the geographic scope applies: the party's country of operation, or of registration.
  2. The party must exist; otherwise `PARTY_NOT_FOUND` (404).
  3. The party must not be RETIRED; otherwise `PARTY_RETIRED` (422). Parties that are REGISTERED, REQUIRES_HUMAN_REVIEW or DISPUTED accept evidence.
  4. No submitted evidence id may already be linked to the party's current version, whether at registration or by an earlier submission. Otherwise `EVIDENCE_ALREADY_LINKED` (409), naming every duplicate. An advisory lock serialises submissions for the same party.
- **Request validation:** the schema accepts 1–200 evidence ids, as lowercase UUIDs, so any duplicate within one request is refused with 400. `partyId` in the path must be a UUID, also 400.
- **What is written:** one `party_identity_evidence_submission` row, one evidence link per id naming that submission, and the receipt (decision type `IDENTITY_EVIDENCE_SUBMISSION`, subject = `submissionId`), all in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Decision:** always `RECORDED`. All four checks are performed, so all four are `true`.
- **Evidence ids:** CAP-02's evidence ids are uuids and predate the SCS evidence object store (AAB-PLATFORM-01), which identifies files by SHA-256 digest. So every decision's reasons say the cited ids are not linked to the object store and cannot be confirmed against it. Aligning the two needs a contract change and a migration (contract gap). The code marks this `TODO(evidence-id-model)`.


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
- **What is written:** the mandate (`CLAIMED_UNVERIFIED`, `NOT_REVOKED`, all six boundary flags `true`) and the receipt (`MANDATE_REGISTRATION`), in one transaction. The decision reasons say the consent evidence can't be confirmed against the object store (`TODO(evidence-id-model)`).


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
- **Decision reasons** state that the verifying authority is recorded as declared (no registry exists), that independence from evidence submitters isn't checked (contract gap), and that the cited evidence can't be confirmed against the object store (`TODO(evidence-id-model)`).

## addMandateVerificationAssessment

- **Rules:** the contract's ("Mandate verification", amendment of 2026-09-27), in its order: `VERIFICATION_OFFICER`; a recordable status; dates (`verifiedAt` not in the future, `expiresAt` after it and not after the mandate's `validUntil`); the authority's jurisdiction; the mandate exists (`MANDATE_NOT_FOUND`) and is `NOT_REVOKED` and not ended (`MANDATE_NOT_CURRENT`); independence; evidence among the mandate's `mandateEvidenceIds`; supersession.
- **Independence** (`VERIFIER_NOT_AUTHORISED`): the verifier did not register the mandate; holds no link, in any state, to either of its parties; and created no link, in any state, to its representative party. A revoked or expired link still counts: it is a relationship the verifier had. The reverse rule, that a mandate's verifier cannot create a link to its representative, is enforced by `createActorPartyLink`.
- **The mandate's verification status is derived, never stored** (`mandate-verification-status.ts`). Superseded assessments do not count; with none left it is `CLAIMED_UNVERIFIED`; otherwise the latest recorded assessment decides, or `VERIFICATION_EXPIRED` once its `expiresAt` has passed. The mandate record's `verificationStatus` keeps its starting value. The decision returns the status as it stands after the assessment.
- **One mandate at a time.** An advisory lock per mandate serialises its assessments, and `recordedAt` is the database clock read after the lock is held, so "latest" is never ambiguous and a supersession cannot race.
- **Decision reasons** disclose that the verifying authority is recorded as declared, and that the evidence ids cannot be confirmed against stored objects (`TODO(evidence-id-model)`), as for party assessments.
- **Append-only** (migration 022). The database also refuses evidence outside the mandate's, and an expiry after its `validUntil`.

## Actor–party links: createActorPartyLink, recordActorPartyLinkStatus, getActorPartyLink

- **Rules:** AAB-PLATFORM-04's, with this contract's additions ("Actor–party links", and "Link endpoints: rules this contract adds", the third amendment of 2026-09-27). The order of checks is set out at the top of `create-link.ts`, `record-link-status.ts` and `get-link.ts`.
- **Signed outside the server.** The creator signs the link statement, and each writer their status statement, with their own Ed25519 key (canonical JSON). The server verifies against the public key in the actors file (`signingPublicKey`), and never signs. A creator or writer must be `HUMAN` with an `accountableName`, which is recorded in `createdBy` or `writtenBy`, and in the decision's `decidedBy`. The receipt's `issuedFor` does not carry it.
- **Digests.** `linkDigest` and `recordDigest` are `sha256:` over the canonical JSON of every other field of the record, computed by the server once the signature verifies. A record rebuilt from its row recomputes to the same digest: its fields are the stored statement's, and times are stored to the millisecond.
- **State is derived, never stored** (`platform/actor-subject-links/links.ts`): `REVOKED` (a revocation, or a successor), then `EXPIRED` (from `validUntil`), then `SUSPENDED`, else `ACTIVE`. Status records are ordered by `recordedAt`, which is strictly increasing for each link.
- **One link per actor, party and relation.** Every write for an actor and party takes one advisory lock, so a creation and a status record cannot race. A `SUSPENDED` link blocks a new link as an `ACTIVE` one does: reinstating it would otherwise make two links `ACTIVE`.
- **The party's representative** may suspend only. For a natural person, that is the person through their own `ACTIVE` `IS_SUBJECT` link. For an organisation, it is `PARTY_AUTHORITY_REPRESENTATIVE` granted for that party together with an `ACTIVE` `ACTS_FOR_SUBJECT` link, whose signature and digest must verify. Pilot limitation, disclosed in each such decision: the grant is operator configuration (the actors file).
- **Separation of duties.** A creator never links themselves, and never links to a party whose mandate they verified (`scs.mandate_verification_assessment`). The linked actor never writes a status record on their own link.
- **Append-only** (migration 021). The database also refuses a record that differs from its signed statement, a relation that doesn't fit the party's type, missing evidence, and a second revocation.
- **Used by representative submission,** through AAB-PLATFORM-04's use checks (`platform/actor-subject-links/use.ts`): exactly one current link of the act's relation, `ACTIVE`, intact, to a current party.
- **Not yet built:** link checks in the integrity tool.


Canonical contract: [`governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md`](../../../../../../governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-02 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
