# AAB three-dashboard account and country foundation v1

**Date:** 3 September 2026  
**Environment:** WA clean-room rehearsal  
**Deployment bundle SHA-256:** `2fb667403c21f8656a067c74823c71f23313586927429fc15af0c97331e6c89e`

## Scope

This checkpoint standardises the first reusable AAB user journey:

1. My Dashboard
2. Settings & Security
3. Country Administration

It does not grant production, government, legal, regulatory or scientific authority.

## Identity and navigation repair

The country-foundation and platform-navigation read gateways no longer call the write-capable email/role resolver when loading these pages.

Both read paths now:

- take the authenticated Supabase user UUID from the server-validated session;
- require one active `platform.auth_actor_identity` link;
- require the linked active actor's immutable external subject to equal `supabase-auth:<auth-user-uuid>`;
- fail closed if the link is absent or inconsistent; and
- create no actor, role, membership, access assignment or authority.

`platform_navigation_context` may render membership-derived navigation without requiring an unrelated Agriculture `read` capability. The database function `platform.api_navigation_for_actor` remains responsible for constructing role-sensitive sections from persisted authority.

The repair adds non-secret error categories for configuration, connection, identity and capability failures. Debug exception detail remains disabled unless the server is deliberately placed in debug mode.

## Settings and security contract

The modern Settings page now provides:

- verified identity summary;
- current AAL and registered-factor summary;
- AAL2-required password setting/change through Supabase Auth;
- AAL2-required sign-out of other sessions;
- global sign-out;
- personal language, timezone, landing-page, density and notification preferences;
- a direct Country Administration return link derived from an active `HEAD_ADMIN` or `COUNTRY_ADMIN` membership;
- explicit privacy, terms and audit boundaries.

AAB does not receive or store passwords. Password updates are sent directly to the assigned country's Supabase Auth tenant. Authenticator removal/replacement remains locked until the governed recovery journey is implemented.

The UI does not imply that authentication creates membership or authority. Legal receipt presentation, passkeys, governed email change, factor recovery, detailed session inventory and privacy-analysis consent are declared future governed capabilities, not live claims.

## Validation

Confirmed before packaging:

- the exact WA actor has one active immutable identity link;
- the exact actor has active `HEAD_ADMIN` workspace membership;
- `country_core.api_personal_dashboard(exact_actor_uuid)` returns the WA workspace;
- `platform.api_navigation_for_actor(exact_actor_uuid)` returns My Dashboard, Country Administration, Institutions, Regulatory and Settings routes;
- new JavaScript passes `node --check`;
- all three HTML files parse;
- the package paths and hashes were inspected.

PHP CLI was unavailable in the authoring workspace. Therefore Hostinger runtime validation is mandatory after upload.

## Deployment contents

- `aab-local/app/_rebuild/api.php`
- `aab-local/app/_rebuild/settings.html`
- `aab-local/app/_rebuild/account-settings.css`
- `aab-local/app/_rebuild/account-settings.js`
- `aab-local/app/_rebuild/my-dashboard.html`
- `aab-local/app/_rebuild/country-admin.html`
- `aab-local/app/aab-navigation.v24.js`
- `INSTALL.txt`

No Supabase schema or data mutation is included.
