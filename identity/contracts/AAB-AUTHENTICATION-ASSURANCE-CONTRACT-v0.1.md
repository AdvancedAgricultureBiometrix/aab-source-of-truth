# AAB Authentication Assurance Contract v0.1

**Status:** DESIGN SPECIFICATION — UNAPPLIED AND NON-OPERATIONAL  
**Recorded:** 2 September 2026 (AWST)  
**Initial target:** main AAB control-plane rehearsal and isolated WA rehearsal tenancy

## Purpose

This contract begins the controlled transition from email-only session assurance to role-sensitive multi-factor assurance without weakening the proven identity/authority separation.

## Current inspected state

- Main AAB Supabase Auth: no enrolled MFA factors observed on 2 September 2026.
- WA rehearsal Supabase Auth: no enrolled MFA factors observed on 2 September 2026.
- Email OTP and Turnstile have been proven for the relevant controlled entry flows.
- OTP proves identity control only; persisted membership still determines authority.

No authentication configuration or database policy was changed by this specification.

## Assurance model

| Stage or role | Minimum assurance direction |
|---|---|
| Public participation applicant | Email verification only; no membership or dashboard |
| Invited rehearsal participant before claim | Email OTP plus valid invitation/activation contract |
| Research team member | `aal2` before governed workspace access |
| Scientific Lead | `aal2` plus step-up for governed promotion or submission |
| Institution Admin | `aal2` before administration; step-up for invitations, role changes and exports |
| Country Head Admin | `aal2` before administration; step-up for institution governance, exports and security changes |
| Platform Owner | `aal2`, separate platform identity and step-up for review, provisioning and security changes |

## First implementation milestone

1. Keep email OTP as the initial verified session.
2. After persisted eligibility is proven, require TOTP enrollment for a governed role.
3. Verify the enrollment challenge before activation completes.
4. Route privileged users through a second-factor challenge when current assurance is `aal1` and the enrolled next level is `aal2`.
5. Enforce `aal2` at protected server/API and database boundaries, not only in browser UI.
6. Require recent step-up authentication for defined sensitive actions.
7. Provide factor management, backup-factor enrollment and governed recovery.
8. Record factor lifecycle and assurance events without recording secrets or codes.

## Non-negotiable controls

- Browser state cannot grant assurance or authority.
- `user_metadata` cannot determine authorisation.
- A factor may be enrolled only after server-verified eligibility.
- Removal or replacement of a privileged factor requires `aal2`, a fresh challenge and an audit receipt.
- Email alone cannot recover a privileged account.
- Sessions must be revocable; sensitive operations must validate current session and authority state.
- RLS must combine identity, tenant scope, persisted membership and required assurance.
- No service-role or secret key may appear in a public client.
- No OTP, TOTP seed, QR secret, password, access token or recovery secret may enter audit logs.
- TOTP success does not create membership, scientific authority or permission to cross country boundaries.

## Password and passkey position

Passwords are not added to the public entry gateway as the default merely to create an appearance of security. A future controlled design may use passwords where there is a justified first-factor or recovery need.

Supabase Passkeys entered beta in May 2026 and use WebAuthn. They are the preferred future phishing-resistant direction, including hardware security keys, but beta APIs must not become production-critical without a separate evaluation, pinned client version, fallback/recovery design and controlled validation.

AAB does not create its own cryptographic authenticator. The AAB-specific experience is the Trust Gate policy and evidence layer built on established standards.

## Required tests before any live claim

- eligible role can enroll and verify TOTP;
- ineligible identity cannot enroll through the governed flow;
- `aal1` session is denied privileged routes and data;
- `aal2` session with correct persisted membership receives only its assigned scope;
- manual route entry cannot bypass assurance;
- stale or revoked membership fails even at `aal2`;
- factor removal and recovery fail closed without required approvals;
- no cross-country factor or session grants country authority;
- logs contain no authentication secrets;
- fallback and recovery do not reduce privileged access to email-only control.

## Stop condition

Do not apply MFA RLS restrictions or replace the current login path until the enrollment, challenge, recovery and administrator-support flows exist and can be tested together. Adding enforcement without recovery can lock out legitimate governed users; adding UI without server/database enforcement creates false security.

