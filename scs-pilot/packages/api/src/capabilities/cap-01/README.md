# SCS-CAP-01 — Regulatory Framework Registration

**Status: `registerFramework` implemented (`POST /scs/v1/frameworks`); no other CAP-01 operation yet.** This folder is the reference implementation of the capability pattern (see `../README.md`).

- **Authority:** only `COMPLIANCE_OFFICER`, the role the contract names. Otherwise `REGISTRANT_NOT_AUTHORISED` (403).
- **Conflict:** an ACTIVE framework with the same `regulationId`, `regulationVersion`, `commodityCode`, `countryOfOrigin` and `destinationMarket` and an overlapping effective period gives `CONFLICTING_FRAMEWORK_EXISTS` (409), naming the existing `frameworkId`. Registrations of one scope are serialised by an advisory lock.
- **What is written:** the framework row (status ACTIVE, empty `versionHistory`) and the immutable receipt, in one transaction. The response is 201 `{ decision, receipt, receiptDigest }`.
- **Eligibility checks:** only `registrantAuthorised` and `noConflictingFrameworkExists` are evaluated. The other five are recorded as `false`, each with an explicit NOT EVALUATED reason. TODO(eligibility-rules), a contract gap: the contract defines no evaluation rules for them.
- **TODO(applicable-laws-attestation):** contract commit `5eb01d4` adds `applicableLawsAttested` to `RegisterFrameworkRequest`. The request schema doesn't accept it yet (its `additionalProperties: false` would reject it), and `applicableLawsConfirmed` is still recorded as not evaluated. Next change: add the field to the request schema, regenerate the types, and evaluate `applicableLawsConfirmed` from it, with the attestation named in `decisionReasons`.
- **Evidence specification:** the values are declared by the registrant; CAP-01 generates `specId`, `generatedAt` and `generatedFromFrameworkVersion` (`"1"`). TODO(spec-derivation), a contract gap.

Canonical contract: [`governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-01 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
