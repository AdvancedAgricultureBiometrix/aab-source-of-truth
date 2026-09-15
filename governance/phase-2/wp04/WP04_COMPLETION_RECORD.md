# PH2-WP04 — First Closed-Loop Security Qualification Capability

## Qualification result

`INSTANCE REMEDIATION VERIFIED`

`RECONSTRUCTION ROOT CAUSE REMAINS OPEN`

The v1.0.0 collector and comparator detected 23 canonical-invariant execution-grant mismatches in restore-test before remediation. The same machinery returned zero mismatches after the authorised restore-test-only grant transaction. This result is `TECHNICAL VERIFICATION SATISFIED` for the defined 23-function invariant set only. It does not confer, imply, or automate production authority.

## Closed loop demonstrated

1. Known defect: 23 restore-test `public.aab_*` functions inherited unintended execution roles.
2. Machine detection: pre-remediation evidence reported 23 `execute_roles` mismatches and no other mismatch kind.
3. Preserved evidence: before/after catalogue snapshots, comparison packages, environment fingerprints, and SHA-256 manifest are isolated under `evidence/`.
4. Controlled remediation: the reviewed transaction revoked `PUBLIC`, `anon`, `authenticated`, and `service_role`, then re-granted only the canonical role set for each exact signature.
5. Regression verification: post-remediation comparison reported zero mismatches.
6. Qualification result: instance remediation verified; reconstruction remains unqualified until replay creates the correct grants without manual correction.

## Negative-test result

- Twenty user-facing functions: `anon` execution absent; `authenticated` and `service_role` execution present.
- Three service-only functions (`aab_complete_rehearsal_handoff`, `aab_create_internal_wa_rehearsal_nomination`, `aab_get_rehearsal_handoff_payload`): both `anon` and `authenticated` execution absent; `service_role` execution present.
- Comparator unit tests prove exact match, unexpected `anon`, definition drift, and missing-function fail-closed paths.
- Live function invocation was intentionally not used because these RPCs may have domain side effects. Full synthetic identity/session/country/institution/capability tests remain open for an isolated test environment.

## Unchanged-boundary proof

Canonical and WA function-catalogue, relation ACL/RLS, column-shape, policy, and relation-count hashes were unchanged across the operation. Restore-test relation ACL/RLS, column-shape, policy, and relation-count hashes were unchanged. All 23 target function-definition hashes remained identical before and after and match canonical. The remediation transaction contained only function `REVOKE EXECUTE` and `GRANT EXECUTE` statements; it contained no table, data, function-body, RLS, membership, canonical, or WA operation.

No protected data or secret value was collected, used as a fixture, or placed in evidence.

## Finding status

| Finding | WP04 status | Basis |
|---|---|---|
| `PH2-SEC-CC-RLS-ADVISORY-01` | OPEN — DESIGN BASELINE PRESERVED | WP04 made no RLS change. The five-class WP03 standard remains controlling. |
| `PH2-SEC-RESTORE-FUNCTION-GRANT-01` | INSTANCE REMEDIATION VERIFIED; RECONSTRUCTION ROOT CAUSE REMAINS OPEN | 23 mismatches before; zero after. Restore history lacks canonical grant-hardening replay while permissive default function privileges remain. |
| `PH2-SEC-RPC-AUTHORITY-REGRESSION-01` | OPEN — FRAMEWORK INITIATED | Grant and function-property regressions are machine-detectable. Full persisted-authority negative suite requires isolated synthetic identities and data. |

## Root-cause work remaining

The current evidence bounds the cause to reconstruction/migration replay omission interacting with permissive default function privileges. Restore-test contains only restore-specific migration-history entries and lacks the canonical grant-hardening migration record. WP04 does not change replay or defaults. A newly reconstructed environment must be tested from a clean release and must satisfy grants without manual intervention before the root defect can close.

## Proposed PH2-WP05 — Reconstruction Replay and Isolated Authority Regression Proof

For separate review and authority only:

1. encode explicit least-privilege grants and safe default privileges in canonical reconstruction migrations;
2. reconstruct into a new disposable, country-parameterised test environment;
3. run the WP04 collector/comparator before any manual intervention;
4. expand negative tests using synthetic identities, memberships, countries, institutions, and capabilities;
5. prove reconstruction equivalence and evidence-package signing with a country-controlled verification key;
6. preserve failed evidence and retire the disposable environment only under separate deletion authority.

WP05 has not begun.

**AAB defines the requirements; infrastructure must qualify against AAB.**

**Automate verification, not approval.**
