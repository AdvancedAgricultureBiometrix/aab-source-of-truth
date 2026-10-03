# AAB MFA Trust Gate Rehearsal Validation v0.1

**Status:** REQUIRED TEST PLAN — IMPLEMENTATION NOT YET PRESENT  
**Recorded:** 2 September 2026 (AWST)  
**Initial environment:** isolated WA internal rehearsal

## Stop rule

Run tests in order. Stop at the first failed identity, tenancy, assurance, authority or secret-handling boundary. Do not bypass a failed gate and do not manufacture a membership to make routing pass.

## Preconditions

- current WA runtime identity is proven;
- only the WA Supabase project is reachable from the WA runtime;
- Turnstile and numeric email OTP are working;
- an explicitly classified internal rehearsal eligibility record exists;
- no external, government, production or legal authority is enabled;
- enrollment and recovery interfaces exist before enforcement is activated; and
- no secrets, OTPs, TOTP seeds, QR payloads or access tokens are captured as evidence.

## Enrollment tests

| ID | Test | Required result |
|---|---|---|
| MFA-ENR-01 | Unknown email requests OTP | No account or factor is created |
| MFA-ENR-02 | Verified identity without persisted eligibility requests enrollment | Denied |
| MFA-ENR-03 | Eligible rehearsal identity requests enrollment | One pending TOTP factor and QR/secret shown only to that authenticated user |
| MFA-ENR-04 | Wrong TOTP code verifies enrollment | Denied; no verified factor |
| MFA-ENR-05 | Correct TOTP code verifies enrollment | Factor becomes verified; session refreshes to `aal2` |
| MFA-ENR-06 | Page reloads during pending enrollment | No duplicate verified factor or leaked secret |
| MFA-ENR-07 | Cross-country identity attempts WA enrollment | Denied and security signal recorded |

## Login and routing tests

| ID | Test | Required result |
|---|---|---|
| MFA-RTE-01 | Email OTP succeeds for an enrolled privileged user | Session remains `aal1` until second factor succeeds |
| MFA-RTE-02 | `aal1` user manually opens privileged route | Denied or redirected to Trust Gate without protected content |
| MFA-RTE-03 | Wrong second-factor code | Denied without weakening the session boundary |
| MFA-RTE-04 | Correct factor produces `aal2` | Route still resolves only from current persisted membership |
| MFA-RTE-05 | `aal2` user has no active membership | Denied; authentication does not become authority |
| MFA-RTE-06 | `aal2` member requests another role's route | Denied |
| MFA-RTE-07 | Revoked/expired membership with active `aal2` session | Denied on the next protected operation |
| MFA-RTE-08 | Main Platform Owner attempts WA route without WA membership | Denied |

## Step-up tests

| ID | Test | Required result |
|---|---|---|
| MFA-STP-01 | User views ordinary permitted dashboard content | No unnecessary repeated challenge |
| MFA-STP-02 | User invites, changes role, exports or changes security settings | Fresh factor challenge required |
| MFA-STP-03 | Recent step-up expires | Sensitive action denied until reverified |
| MFA-STP-04 | Browser fabricates recent-step-up state | Server/database rejects action |
| MFA-STP-05 | Two-person action has only one valid approval | No transition |

## Factor management and recovery tests

| ID | Test | Required result |
|---|---|---|
| MFA-REC-01 | User lists factors | Only their permitted factor metadata is visible; no secrets |
| MFA-REC-02 | User removes factor at `aal1` | Denied |
| MFA-REC-03 | User removes factor after fresh `aal2` | Governed removal receipt created; session re-evaluated |
| MFA-REC-04 | Privileged user loses primary factor | Email alone cannot restore privileged access |
| MFA-REC-05 | Verified backup factor is used | Recovery succeeds with auditable factor event |
| MFA-REC-06 | Administrative recovery is requested | Separate identity verification, second-person approval, notifications and cooling-off policy apply |
| MFA-REC-07 | Recovery completes | Existing sessions and superseded factors are revoked as required |

## Privacy and audit tests

| ID | Test | Required result |
|---|---|---|
| MFA-AUD-01 | Enrollment, challenge, removal and recovery occur | Actor, scope, purpose, assurance, outcome and correlation ID recorded |
| MFA-AUD-02 | Logs and audit relations are inspected | No OTP, TOTP seed, QR secret, password, access token or recovery secret present |
| MFA-AUD-03 | Country Head views assurance activity | Only country-scoped compliance metadata is visible |
| MFA-AUD-04 | Platform Owner views system health | No ordinary country scientific content or private conversation is exposed |
| MFA-AUD-05 | Repeated failed challenges occur | Reviewable security signal created without automatic accusation or scientific mutation |

## Isolation tests

| ID | Test | Required result |
|---|---|---|
| MFA-ISO-01 | WA runtime network/config is inspected | No main or other-country secret/project access |
| MFA-ISO-02 | Same email exists in main and WA Auth | Sessions, factors, memberships and authority remain project-specific |
| MFA-ISO-03 | WA token is presented to main control plane or reverse | Rejected unless an explicit protected bridge contract applies |
| MFA-ISO-04 | Browser changes country/role parameters | No change in protected scope or capability |

## Release evidence

The rehearsal evidence pack may contain:

- test identifiers and pass/fail outcomes;
- redacted screenshots showing states without codes or secrets;
- aggregate factor counts;
- function/policy versions and hashes;
- correlation identifiers created for controlled fixtures; and
- explicit unresolved issues and rollback result.

It must not contain personal authentication data, real TOTP secrets, QR codes, access tokens, raw Auth logs or production credentials.

## Promotion rule

Passing this plan proves only the isolated rehearsal contract. Production promotion requires a separate country-approved security, privacy, recovery, support, data-residency and incident-response review.

