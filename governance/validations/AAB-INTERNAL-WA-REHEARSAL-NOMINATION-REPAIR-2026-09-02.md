# AAB internal WA rehearsal nomination repair — 2026-09-02

## Outcome

The public country/jurisdiction participation pathway and the private Platform Owner rehearsal pathway are now separate persisted authority sources.

A public application is no longer required, borrowed or fabricated to nominate a private WA rehearsal Head Admin.

## Live migrations

| Boundary | Project | Migration |
|---|---|---|
| Main AAB control plane | `epjhsrflzeuqzastevtz` | `separate_internal_wa_rehearsal_nomination` |
| WA clean-room tenancy | `kdpcfbaeklkffozryjah` | `accept_internal_rehearsal_nomination_source` |
| WA server receiver | `kdpcfbaeklkffozryjah` | `wa-rehearsal-handoff` version 2 |

## Main control-plane repair

Created `platform.internal_rehearsal_nomination` as a non-public, RLS-enabled source record with permanent constraints:

- classification: `PERSONAL_WA_REHEARSAL`;
- target: WA staging project/workspace only;
- authority basis: `PLATFORM_OWNER_INTERNAL_TEST_NOMINATION`;
- environment: `WA_CLEAN_ROOM_TEST`;
- government authority: false;
- production authority: false;
- legal effect: `NONE_TEST_ONLY`;
- external invitations: locked.

`platform.rehearsal_provisioning_decision` now requires exactly one authority source:

1. an approved public participation request; or
2. an internal rehearsal nomination.

It cannot contain both and cannot contain neither.

Created `public.aab_create_internal_wa_rehearsal_nomination(text,text,text)`. Anonymous execution is revoked. Authenticated callers can reach the RPC, but it fails closed unless the server-resolved actor passes `platform.is_platform_admin()`. The function validates the nominated email, document SHA-256 and meaningful rationale, rejects a duplicate active nomination, and creates the nomination and decision atomically.

`public.aab_get_rehearsal_handoff_payload(uuid)` now emits `source_type` and `internal_nomination_id` without exposing or inventing a public request ID.

## WA receiving repair

The WA activation and handoff records can now preserve `source_internal_rehearsal_nomination_id`.

`country_core.rehearsal_provisioning_handoff` requires exactly one source:

1. `source_participation_request_id`; or
2. `source_internal_rehearsal_nomination_id`.

The protected apply function and public service-role wrapper were extended to accept and enforce this source contract.

The `wa-rehearsal-handoff` Edge Function was deployed as version 2. It validates the matching source combination before upload and retains the existing:

- shared-secret verification;
- rehearsal classification gate;
- document ID/version gate;
- SHA-256 upload and read-back verification;
- single-application protection;
- non-government, non-production and no-legal-effect response;
- fail-closed error handling.

Its JWT setting remains unchanged because this is the existing custom-authenticated server-to-server endpoint. It is not a browser authority endpoint.

## Non-mutation evidence

Immediately after migration:

- internal nominations: **0**;
- no membership created;
- no invitation issued;
- existing historical WA handoffs: **1**, preserved;
- anonymous nomination RPC execution: **denied**;
- authenticated RPC reachability: **enabled**, with mandatory server-side Platform Owner check;
- nomination table direct access: revoked from `public`, `anon` and `authenticated`.

The malformed public request `AAB-REQ-50EFA5E9E4` remains `PENDING_REVIEW`. Its purpose `Test` is incompatible with the government-capacity claims forced by the current public form. It must not be approved or provisioned.

## Security-advisor interpretation

Supabase reports an informational “RLS enabled, no policy” notice for the new nomination table. This is intentional: no direct browser role receives table access; writes occur only through the guarded RPC.

Supabase also generically warns that authenticated users can invoke a `SECURITY DEFINER` RPC. For this function that reachability is intentional and is not authority: the function checks `auth.uid()`, resolves the server-side actor, requires `platform.is_platform_admin()`, validates all inputs and executes atomically. Anonymous access remains revoked.

Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Still not done

This repair does not nominate anyone, complete a handoff, publish a new document, issue an activation, grant WA membership or implement MFA.

The next controlled implementation is the protected nomination control in the Platform Owner dashboard, gated by the documented AAB Trust Gate assurance.

## AAB Trust Gate checkpoint

The main control-plane migration `require_aal2_for_internal_rehearsal_nomination` is live.

The protected nomination RPC now additionally requires:

- JWT `aal = aal2`;
- a non-empty Supabase `session_id`;
- the existing server-resolved Platform Owner actor check.

The gate is enforced in PostgreSQL. Browser rendering or browser-assigned state cannot satisfy it.

Post-migration verification confirmed that the gate markers are present and the internal nomination count remains zero.

The drop-in browser candidate is recorded under:

- `deployment/main-control-plane/trust-gate/aab-admin-trust-gate.js`;
- `deployment/main-control-plane/trust-gate/INSTALL.md`.

The candidate supports TOTP enrolment, challenge and verification using the existing protected Supabase client. It does not expose the nomination action. Live browser enrolment and return-login challenge remain unproven until the module is uploaded and rehearsed.


## Live Trust Gate and logout proof — 3 September 2026

The original Trust Gate candidate was uploaded and rehearsed successfully:

- a TOTP factor named `AAB Trust Gate` is verified;
- the protected dashboard displayed server-confirmed `AAL2`;
- logout cleared the browser session and redirected to `https://aab.ag/enter-aab/`;
- return login challenged the registered factor and restored the protected dashboard;
- no OTP, TOTP code or authenticator secret is recorded here.

The shared-session logout repair is checkpointed as `deployment/main-control-plane/shared-session/aab-session.v31.js`.

## Controlled nomination input hardening — 3 September 2026

Applied main-control-plane migrations:

- `add_aal2_internal_rehearsal_nomination_context`;
- `server_control_internal_rehearsal_nomination_inputs`.

The AAL2-only context RPC supplies the fixed WA clean-room classification, terms identity and three controlled validation purposes. The new creation RPC accepts only a nominated email and one controlled purpose code. It maps the rationale and resolves the canonical document SHA-256 on the server.

Authenticated execution of the old browser-input RPC is revoked. Anonymous execution of both new RPCs is denied. Both new RPCs independently require a server-resolved Platform Owner, JWT `aal2` and a non-empty Supabase `session_id`.

The Trust Gate v02 deployment candidate:

- displays the nomination control only after server-confirmed AAL2;
- removes free-form rationale;
- does not accept a browser-supplied terms hash;
- repeats the test-only, non-government, non-production, no-legal-effect boundary;
- requires an explicit checkbox and browser confirmation;
- creates a nomination decision only;
- never automatically executes handoff, invitation, activation, membership or authority.

Post-migration verification confirmed:

- internal nominations remain **0**;
- the old free-form function is not executable by `anon` or `authenticated`;
- the v2 creation and context functions are not executable by `anon`;
- direct nomination-table access remains unavailable to browser roles.

The Supabase advisor's generic authenticated `SECURITY DEFINER` warning is expected for these intentionally exposed, server-authorized RPC boundaries. Their authority, AAL2 and session checks are implemented inside PostgreSQL; ordinary authenticated reachability is not sufficient to act.

Live validation of the v02 nomination form remains pending deployment. No nomination has been created and no handoff has been executed.
