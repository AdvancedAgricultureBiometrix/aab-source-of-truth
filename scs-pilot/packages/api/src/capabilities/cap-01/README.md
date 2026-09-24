# SCS-CAP-01 — Regulatory Framework Registration

**Status: `registerFramework` implemented (`POST /scs/v1/frameworks`); no other CAP-01 operation yet.** This folder is the reference implementation of the capability pattern (see `../README.md`).

- **Authority:** only `COMPLIANCE_OFFICER`, the role the contract names. Otherwise `REGISTRANT_NOT_AUTHORISED` (403).
- **Conflict:** an ACTIVE framework with the same `regulationId`, `regulationVersion`, `commodityCode`, `countryOfOrigin` and `destinationMarket` and an overlapping effective period gives `CONFLICTING_FRAMEWORK_EXISTS` (409), naming the existing `frameworkId`. Registrations of one scope are serialised by an advisory lock.
- **What is written:** the framework row (status ACTIVE, empty `versionHistory`) and the immutable receipt, in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Applicable laws attestation:** `applicableLawsAttested` is required. If it is absent, schema validation returns 400. If it is `false`, the result is `APPLICABLE_LAWS_UNCONFIRMED` (422, FAIL_CLOSED). If it is `true`, `applicableLawsConfirmed` is evaluated from it and recorded as the registrant's declaration, not an independent confirmation.
- **Eligibility checks:** `registrantAuthorised`, `noConflictingFrameworkExists` and `applicableLawsConfirmed` are evaluated. The other four are recorded as `false`, each with an explicit NOT EVALUATED reason. TODO(eligibility-rules), a contract gap: the contract defines no evaluation rules for them.
- **Evidence specification:** the values are declared by the registrant; CAP-01 generates `specId`, `generatedAt` and `generatedFromFrameworkVersion` (`"1"`). TODO(spec-derivation), a contract gap.

Canonical contract: [`governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-01 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
