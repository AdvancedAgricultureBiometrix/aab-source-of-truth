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
