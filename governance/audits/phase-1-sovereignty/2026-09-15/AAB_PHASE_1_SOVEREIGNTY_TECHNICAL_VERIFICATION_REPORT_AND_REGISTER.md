# AAB Phase 1 Sovereignty Technical Verification Report and Register

**Frozen baseline date:** 15 September 2026  
**Publication classification:** Read-only audit baseline  
**WA status:** Not production commissioned

## Executive Summary

**COMMISSIONING OUTCOME: NOT AUTHORISED**

WA rehearsal is not production commissioned. AAB uses non-compensating sovereignty controls. A failed mandatory requirement, unresolved evidence for a mandatory requirement, or an unsatisfied mandatory commissioning gate prevents commissioning. No aggregated compliance percentage is used.

**AUDIT OUTCOME: PHASE 1 COMPLETE**

Phase 1 established the actual state sufficiently to begin controlled remediation. This is a successful audit outcome, not a statement that WA passed.

**REMEDIATION AUTHORITY: NOT EXERCISED**

Phase 1 remained read-only. Nothing was repaired while establishing or reconciling the evidence baseline.

Supabase is the current rehearsal and audit mechanism. It is not AAB's mandatory production database or provider. The production standard must remain vendor-neutral and permit country-selected infrastructure only when every mandatory requirement is verified.

**Database residency and administrative sovereignty are independent controls.**

## Scope and Architecture Assessed

The audit covered the WA rehearsal application and protected scientific-photo path, Hostinger origin and backup posture, WA Supabase project, associated canonical and restore-test projects, database authority checks, object storage and recovery, logs, CDN/cache behaviour, server-side execution locality, privileged administration, tokens, public diagnostics, cross-boundary data flows, deployment cleanliness and independent reconstruction.

Production infrastructure is country-owned from creation. AAB may receive temporary, scoped and audited deployment authority without ownership transfer or inherited access across countries.

## Method and Evidence Boundary

The audit separated declaration, implementation presence, behavioural proof, provider evidence, country evidence and governance approval. Unresolved mandatory evidence is `EVIDENCE REQUIRED`, not likely compliant. Automated commissioning may generate evidence but cannot confer production authority.

The final reconciliation did not establish any historic permanent sovereignty-control ID for CR-01 through CR-30 from accessible AAB GitHub branches, internal records, prior-context retrieval or the Phase-1 handover. No unsupported mapping was manufactured. Each claim therefore received a descriptive permanent ID with provenance `NEW — CLOSURE-DERIVED`; CR-01 through CR-30 remain traceability aliases.

## Commissioning Decision

**COMMISSIONING OUTCOME: NOT AUTHORISED.** Demonstrated rehearsal observations would fail production standards if reused, mandatory controls remain `EVIDENCE REQUIRED`, and the country/governance commissioning gate is intentionally unsatisfied. These controls are non-compensating.

## Sovereignty Technical Verification Register

| Permanent control ID | CR alias | Provenance | Control | Requirement | Finding | Status | Evidence owner | Future verification |
|---|---|---|---|---|---|---|---|---|
| SOV-OWN-COUNTRY-01 | CR-01 | NEW — CLOSURE-DERIVED | Country production infrastructure ownership | Country infrastructure is owned by the country from creation; no David/AAB master provider organisation spans production countries. Temporary, scoped and audited deployment authority may be granted without transferring ownership. | Design principle confirmed; current rehearsal does not demonstrate production ownership. | EVIDENCE REQUIRED | Country / Governance | COUNTRY EVIDENCE; GOVERNANCE |
| SOV-ISO-COUNTRY-01 | CR-02 | NEW — CLOSURE-DERIVED | Country isolation | Each production country operates an isolated AAB application, identity, database, storage, logging, backup and recovery boundary. | Current WA, canonical and restore-test Supabase projects share one provider organisation, demonstrating an administrative-sovereignty blocker for production. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | AAB / Country / Provider | AUTO; PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-RES-DB-01 | CR-03 | NEW — CLOSURE-DERIVED | Database residency | Primary database and every protected replica, WAL, PITR, backup and recovery copy remain inside the approved sovereign boundary. | WA primary Supabase project was observed in Sydney. Exact locality of underlying backup, WAL, PITR and DR copies was not established. | EVIDENCE REQUIRED | Provider | PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-ADM-INDEPENDENCE-01 | CR-04 | NEW — CLOSURE-DERIVED | Administrative sovereignty | Country privileged administration is independent of canonical AAB and other countries. | Current organisation sharing permits a common provider administration plane across WA, canonical and restore-test projects. This is unacceptable as a production model. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | Country / Provider / Governance | PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-RES-ORIGIN-01 | CR-05 | NEW — CLOSURE-DERIVED | Protected origin residency | Every origin serving protected scientific information operates inside the approved sovereign boundary. | Current Hostinger WA rehearsal origin and private scientific-photo path are outside Australia. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | AAB / Country / Hosting provider | AUTO; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-RES-HOST-BACKUP-01 | CR-06 | NEW — CLOSURE-DERIVED | Hosting backup residency | Hosting backups containing protected information remain inside the approved sovereign boundary. | Current Hostinger backup location is Singapore. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | Hosting provider / Country | PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-BACKUP-OBJECT-COVERAGE-01 | CR-07 | NEW — CLOSURE-DERIVED | Scientific object backup coverage | Protected files and object storage are included in a tested sovereign backup and recovery system. | Supabase daily physical database backups exist, but Storage objects are not included. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | Provider / Country | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-RECOVERY-OBJECT-01 | CR-08 | NEW — CLOSURE-DERIVED | Scientific object recovery | Protected scientific objects can be restored completely, consistently and within approved recovery objectives. | Production recovery of protected scientific objects has not been proven. | EVIDENCE REQUIRED | Country / Provider | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-RECOVERY-DB-01 | CR-09 | NEW — CLOSURE-DERIVED | Database recovery | Database restore, consistency and recovery objectives are commissioned with sovereign copies only. | Daily physical database backup capability is evidenced; exact copy locality and production recovery proof remain unresolved. | EVIDENCE REQUIRED | Provider / Country | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-RES-LOG-01 | CR-10 | NEW — CLOSURE-DERIVED | Protected log residency | Logs containing protected information remain sovereign across ingestion, storage, backup, analysis and deletion. | Native log residency, backup locality and provider access were not established. No configured external Supabase log drain was evidenced. | EVIDENCE REQUIRED | Provider / Country | AUTO; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-RES-CACHE-01 | CR-11 | NEW — CLOSURE-DERIVED | CDN and cache copies | Protected scientific objects are not cached or replicated outside the approved sovereign boundary. | Standard CDN behaviour may create geographically distributed cached copies; explicit protected-science controls were not proven. | EVIDENCE REQUIRED | Provider / Country | AUTO; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SOV-RES-EXECUTION-01 | CR-12 | NEW — CLOSURE-DERIVED | Serverless execution residency | Functions processing protected information execute only within the sovereign boundary and fail closed rather than failing over overseas. | Sovereign execution and fail-closed regional behaviour were not established. | EVIDENCE REQUIRED | Provider / Country | AUTO + HUMAN; PROVIDER EVIDENCE |
| SOV-DERIVATIVE-BOUNDARY-01 | CR-13 | NEW — CLOSURE-DERIVED | Transformation and derivative sovereignty | Files, scientific memory, vectors, embeddings, trained or distilled derivatives, aggregates and similar representations remain sovereign. Transformation does not remove sovereignty. | The principle is established; end-to-end deployment enforcement and inventory evidence are not yet available. | EVIDENCE REQUIRED | AAB / Country / Governance | AUTO; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-FLOW-NO-CANONICAL-RETURN-01 | CR-14 | NEW — CLOSURE-DERIVED | No automatic return to canonical | Protected country scientific information has no automatic country-to-canonical return path. | No default scientific-data outbound path to canonical AAB was identified in the reviewed implementation. Commissioning proof remains required for the vendor-neutral package. | PASS — REVIEWED IMPLEMENTATION ONLY | AAB / Country | AUTO + HUMAN; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-FLOW-NO-CROSS-COUNTRY-01 | CR-15 | NEW — CLOSURE-DERIVED | No country-to-country propagation | Protected scientific information has no automatic country-to-country path. | No default cross-country scientific-data path was identified; package-level commissioning proof remains required. | PASS — REVIEWED IMPLEMENTATION ONLY | AAB / Country | AUTO + HUMAN; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-FLOW-NO-EXTERNAL-AI-01 | CR-16 | NEW — CLOSURE-DERIVED | No external AI training export | Protected scientific information is not sent to external AI training or a global vector service by default. | No default outbound path to external AI training or a global vector service was identified in the reviewed implementation. | PASS — REVIEWED IMPLEMENTATION ONLY | AAB / Country / Provider | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SEC-AUTH-PERSISTED-AUTHORITY-01 | CR-17 | NEW — CLOSURE-DERIVED | Persisted authority over browser claims | Authentication does not confer role; critical authority is derived from persisted server-side or database-side state. | Browser users could not become scientist or administrator merely by changing a supplied role value in the reviewed flows. | PASS — REVIEWED IMPLEMENTATION | AAB | AUTO + HUMAN |
| SEC-AUTH-SCIENTIFIC-ACTION-01 | CR-18 | NEW — CLOSURE-DERIVED | Critical scientific action authorisation | Critical scientific actions re-check current persisted authority at the protected server or database boundary. | Reviewed critical actions re-check persisted authority server-side/database-side. | PASS — REVIEWED IMPLEMENTATION | AAB | AUTO + HUMAN |
| SEC-DB-NO-DEFINER-ESCALATION-01 | CR-19 | NEW — CLOSURE-DERIVED | Security definer escalation | SECURITY DEFINER functions do not create a general privilege-escalation route. | No general SECURITY DEFINER privilege-escalation path was identified in the reviewed functions. | PASS — REVIEWED FUNCTIONS | AAB / Independent assessor | AUTO + HUMAN |
| SEC-PRIV-MFA-01 | CR-20 | NEW — CLOSURE-DERIVED | Privileged administrator MFA | All production provider owners and equivalent privileged administrators use enforced phishing-resistant MFA or approved equivalent. | Supabase Owner MFA was observed disabled. This is unacceptable if the account or provider plane is reused for production privileged access. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | AAB / Country / Provider | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE |
| SEC-PRIV-TOKEN-LIFECYCLE-01 | CR-21 | NEW — CLOSURE-DERIVED | Privileged token lifecycle | Privileged tokens are scoped, short-lived, rotated, revocable and auditable; standing non-expiring tokens are prohibited. | A standing/non-expiring privileged token was identified. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | AAB / Country | AUTO + HUMAN; COUNTRY EVIDENCE |
| SEC-PUBLIC-DIAGNOSTICS-01 | CR-22 | NEW — CLOSURE-DERIVED | Public diagnostic paths | Diagnostic, preflight and database-health functions exposing sensitive implementation or connectivity information are not publicly web-addressable. | Publicly web-addressable diagnostic, preflight and database-health source paths were identified. | PRODUCTION STANDARD FAILURE — REHEARSAL OBSERVATION | AAB / Hosting provider | AUTO + HUMAN |
| SOV-ADM-PROVIDER-ACCESS-01 | CR-23 | NEW — CLOSURE-DERIVED | Provider personnel access | Provider personnel access to protected information is technically constrained, authorised, logged and reviewable under country control. | Provider access conditions and evidence were not established for database, storage, logs, backups or recovery systems. | EVIDENCE REQUIRED | Provider / Country | PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-KEY-COUNTRY-CONTROL-01 | CR-24 | NEW — CLOSURE-DERIVED | Encryption and country key control | Protected information is encrypted in transit and at rest with key ownership and privileged key operations meeting country requirements. | Complete country-controlled key architecture and evidence were not established. | EVIDENCE REQUIRED | Provider / Country | AUTO; PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| SOV-LIFECYCLE-DELETION-01 | CR-25 | NEW — CLOSURE-DERIVED | Deletion and media sanitisation | Deletion covers primary data, objects, logs, caches, replicas, backups and recovery copies under an approved retention and sanitisation schedule. | End-to-end deletion and media-sanitisation evidence was not established. | EVIDENCE REQUIRED | Provider / Country / Governance | AUTO + HUMAN; PROVIDER EVIDENCE; COUNTRY EVIDENCE; GOVERNANCE |
| DEP-PACKAGE-COUNTRY-CLEAN-01 | CR-26 | NEW — CLOSURE-DERIVED | Country template cleanliness | A production country deployment begins from a clean, country-specific package without another country’s or generic demonstration material. | WA rehearsal contains historical Thailand and generic demonstration material and is not a pristine production single-country template. | NOT APPLICABLE TO REHEARSAL — WOULD FAIL PRODUCTION TEMPLATE STANDARD | AAB / Country | AUTO + HUMAN; COUNTRY EVIDENCE |
| DEP-PACKAGE-VENDOR-NEUTRAL-01 | CR-27 | NEW — CLOSURE-DERIVED | Vendor-neutral deployment package | The canonical AAB package defines capability and sovereignty requirements without requiring Supabase or another specific provider. | Supabase is the current rehearsal mechanism. A complete vendor-neutral production deployment package and standard have not yet been verified. | EVIDENCE REQUIRED | AAB / Governance | AUTO + HUMAN; GOVERNANCE |
| DEP-PACKAGE-INDEPENDENT-REBUILD-01 | CR-28 | NEW — CLOSURE-DERIVED | Reconstructability independent of rehearsal provider | The finished AAB package can be reconstructed and operated without retrieving anything required from the Supabase rehearsal. | Not yet demonstrated. Supabase rehearsal must not be retired until independent reconstruction and operation are proven. | EVIDENCE REQUIRED | AAB / Independent assessor / Governance | AUTO + HUMAN; COUNTRY EVIDENCE; GOVERNANCE |
| COM-EVIDENCE-NO-AUTHORITY-01 | CR-29 | NEW — CLOSURE-DERIVED | Commissioning evidence integrity | Automated and manual commissioning produce immutable, attributable evidence but never confer production authority. | Future taxonomy and authority boundary are defined; commissioning harness is Phase 2 provisional work and has not been implemented. | EVIDENCE REQUIRED | AAB / Country / Governance | AUTO; AUTO + HUMAN; GOVERNANCE |
| COM-COUNTRY-GOV-APPROVAL-01 | CR-30 | NEW — CLOSURE-DERIVED | Country and governance production approval | Production begins only after technical verification and explicit country/governance approval. | WA is intentionally uncommissioned and no production approval has been sought or granted. This is not a technical failure of the rehearsal. It is an unsatisfied mandatory gate that independently preserves the NOT AUTHORISED commissioning outcome. | NOT APPLICABLE — REHEARSAL; COMMISSIONING GATE NOT SATISFIED | Country / Governance | COUNTRY EVIDENCE; GOVERNANCE |

## Persistent and Superseded Control History

- No historic sovereignty-control ID map was established for these claims.
- No historic ID is marked retained or superseded without evidence.
- CR-01 through CR-30 remain traceability aliases.
- If contrary primary evidence is later produced, it must be handled through a controlled baseline correction with explicit history. IDs must not be silently deleted, renumbered or repurposed.
- `PH2-COM-AUTO-01` remains the provisional Automated Country Commissioning Harness control.
- `PH2-COM-AUTO-02` remains the provisional control allowing commissioning/test lessons to improve canonical verification logic without returning protected country scientific information.

## Unresolved Evidence Schedule

The following commissioning evidence remains required: database backup/WAL/PITR/DR locality; protected object backup and recovery; native log residency, backups and provider access; CDN/cache behaviour; sovereign server-side execution and failover; provider personnel access; country-controlled keys; deletion and media sanitisation across all copies; vendor-neutral deployment capability; and independent reconstruction without retrieving anything required from Supabase.

## Risk Ordered Phase 2 Sequence

1. Sovereign infrastructure.
2. Direct security failures.
3. Unresolved mandatory evidence.
4. Normal hardening.
5. Commissioning verification design.
6. Separately authorised rehearsal retirement only after independent reconstruction and operation are proven.

This baseline does not authorise Phase-2 remediation, production commissioning, infrastructure migration, access changes, credential changes, endpoint removal, data deletion or Supabase retirement.

## Phase 1 Closure

**Did Phase 1 establish the actual state sufficiently to begin controlled remediation? YES.**

**Is WA authorised for production? NO.**
