# SCS-CAP-02 — Operator and Supplier Identity Registration

**Status: `registerParty` implemented (`POST /scs/v1/parties`), party identity only. Role claims, identity evidence, verification assessments, relationships and mandates are not built yet.**

- **Authority:** only `COMPLIANCE_OFFICER`. Any other actor gets `REGISTRANT_NOT_AUTHORISED` (403).
- **Validation:** the request schema checks `partyType` against the contract's six values and requires a non-blank `partyName`. Both failures return `REQUEST_VALIDATION_FAILED` (400) from the server layer.
- **Country codes:** `countryOfRegistration`, and `countryOfOperation` when present, must be officially assigned ISO 3166-1 alpha-2 codes (`src/reference`, 249 codes, XK excluded). Otherwise `COUNTRY_CODE_UNRECOGNISED` (422).
- **Conflict:** checked only for `LEGAL_ENTITY`, `COOPERATIVE`, `COMMUNITY_GROUP` and `GOVERNMENT_BODY`. If a party of one of those types, not RETIRED, already has exactly the same `partyName` and `countryOfRegistration`, the result is `CONFLICTING_REGISTRATION_DETECTED` (409), naming the existing `partyId`. The match is exact: case, spacing and transliteration are not normalised. An advisory lock serialises registrations with the same key. `NATURAL_PERSON` and `OTHER` are never checked, in either direction: name and country cannot identify a person, so deduplication is left to human review. This is a contract gap, recorded in the contract.
- **What is written:** the party row (`partyVersion` 1, `registrationStatus` REGISTERED), one evidence link per evidence id, and the immutable receipt, all in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Eligibility checks:** each check that is performed is `true`, with an "evaluated" reason. For `NATURAL_PERSON` and `OTHER`, `noConflictingRegistrationDetected` is not performed, so it is `false`, with a NOT EVALUATED reason. The decision is always `REGISTERED` with no gaps. The contract gives no criteria for REGISTERED_WITH_GAPS, REJECTED or REQUIRES_HUMAN_REVIEW.

Canonical contract: [`governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md`](../../../../../../governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-02 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
