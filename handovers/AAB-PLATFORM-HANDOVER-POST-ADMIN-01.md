# AAB Platform Handover — Security Entry and Administration 01

**Handover date:** 14 August 2026 (Australia/Perth)  
**Repository:** `AdvancedAgricultureBiometrix/aab-source-of-truth`  
**Live site:** `https://aab.ag`  
**Live Supabase project:** `epjhsrflzeuqzastevtz`  
**Current gate:** Security Entry 05E and AAB Admin Dashboard 01C are live, end-to-end tested and accepted by the platform owner.

## Start here — note for the next chat

AAB now has a working governed path from public entry to protected administration:

1. A returning approved user enters their email at `/enter-aab/`.
2. Cloudflare Turnstile is completed before Supabase Auth can issue an OTP.
3. Supabase sends a six-digit one-time code through AAB custom SMTP.
4. The verified session is resolved by protected server records; the browser does not assign roles or choose a dashboard.
5. The initial Platform Owner is routed to the AAB Administration control room.
6. Participation requests can be reviewed as `APPROVED`, `DECLINED` or `MORE_INFORMATION_REQUIRED` with a mandatory rationale.
7. Approval is review-only and does not provision a country, jurisdiction, role or workspace.

Do not reopen this chain without a reproducible defect. The next controlled product decision is whether to provision the approved Australian demonstration jurisdiction or complete the remaining domain/cognitive architecture first.

## Live configuration

- AAB Auth email sender: `AAB Secure Access <no-reply@aab.ag>`.
- Auth Site URL: `https://aab.ag`.
- Allowed redirect: `https://aab.ag/enter-aab/`.
- Email templates use `{{ .Token }}` and deliver a six-digit code, not a magic-link journey.
- Supabase Attack Protection uses **Cloudflare Turnstile**, not hCaptcha.
- The public Turnstile site key is served by `/api/aab-config`; the matching secret remains only in protected Supabase configuration and must never be committed.
- Returning-user OTP uses `shouldCreateUser: false`, so unknown email addresses cannot create accounts.
- Country/jurisdiction application remains a separate governed request path.

## Platform Owner and routing

- Initial AAB Platform Owner: `david.gorey4@icloud.com`.
- Entry routing is server-resolved through the protected AAB routing function.
- The Platform Owner route is `/aab-local/app/_rebuild/aab-admin.html`.
- The admin page and security module share one Supabase client to prevent duplicate GoTrue clients under the same storage key.

## Administration control room

The dashboard contains:

- governed Platform Owner context;
- participation-request action centre;
- pending, information-required, approved-not-provisioned and country-workspace counts;
- mandatory review rationale;
- review controls for approve-review-only, request information and decline;
- explicit separation between participation approval and country provisioning;
- security snapshot integration and protected logout/refresh controls.

Admin Dashboard contract version `1.0.2` passed with:

- `actions_wired: true`
- `shared_admin_client: true`
- `shared_security_client: true`
- approve, decline and information-required controls present
- overall validation `PASS`

## Resolved defects

### Turnstile rejected after visual success

The browser widget was Cloudflare Turnstile while Supabase Attack Protection was configured for hCaptcha. Supabase therefore rejected the token with `captcha_failed`. Selecting Cloudflare Turnstile in Supabase and saving the matching secret restored OTP issuance.

### Admin review controls appeared but did not act

The controls were rendered dynamically without durable action handling. A delegated document-level click handler now captures `[data-review]` actions and calls the governed review RPC.

### Review RPC violated action status constraint

The review function attempted to write `COMPLETED` to `country_core.action_item.action_status`, but the live constraint permits `DONE`. The governed function now writes `DONE`. The platform owner retried the approval and confirmed the complete action worked.

## Proven live validation

- AAB Entry Gateway 04A: **PASS — 22/22**.
- AAB Security Entry 05B static contract: **PASS**.
- Turnstile widget completed successfully after the provider correction.
- Six-digit OTP arrived and verified successfully.
- Authenticated Platform Owner routed to the AAB Administration control room.
- Admin Dashboard `1.0.2` contract: **PASS**.
- Approve-review-only action completed successfully after the `DONE` status correction.
- No country was provisioned by the approval action.

## Security and governance boundaries

- Browser inputs never establish identity authority, country membership, role or dashboard route.
- OTP verification establishes an authenticated session only; protected server data decides authorised entry.
- CAPTCHA limits automated Auth abuse but does not grant authority.
- A participation request creates a pending review record only.
- An approved review does not create infrastructure or imply government endorsement, partnership or scientific validation.
- The Turnstile secret, SMTP password, Supabase service-role key and other privileged credentials remain outside GitHub.
- Preserve RLS, restricted RPC grants, server-resolved routing and fail-closed behavior.

## Published release paths

```text
deployment/public-site/AAB-SECURITY-ENTRY-05E/
deployment/protected-admin/AAB-ADMIN-DASHBOARD-01C/
handovers/AAB-PLATFORM-HANDOVER-POST-ADMIN-01.md
```

The deployment snapshots contain full-file replacements. Intermediate ZIPs and superseded builds are deliberately excluded.

## Next controlled decision

Choose one boundary before building further:

1. **Australian demonstration jurisdiction:** provision the approved review through a separate, auditable country-creation decision, using a clean country data environment and retaining the untouched template baseline.
2. **Remaining governed domains:** complete and wire the remaining domain/cognitive architecture, then run one complete Australian demonstration pass across the established system.

Recommended order: finish the remaining domain/cognitive boundaries first, freeze and validate the clean template, then provision the Australian demonstration from that template. This produces a stronger national demonstration without contaminating the first-country baseline.

## Opening prompt for the next chat

> Continue AAB from `handovers/AAB-PLATFORM-HANDOVER-POST-ADMIN-01.md` in `AdvancedAgricultureBiometrix/aab-source-of-truth`. Confirm Security Entry 05E, Admin Dashboard 01C and the governed review RPC are live and passing. Preserve server-resolved authority, Cloudflare Turnstile, six-digit OTP, the clean country-template boundary and the separation between review approval and provisioning. Assess the remaining domain/cognitive architecture, recommend the narrow next build, and do not provision Australia or mutate the clean country template without explicit approval.
