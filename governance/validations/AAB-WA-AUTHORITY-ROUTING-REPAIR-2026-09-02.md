# AAB WA Authority Routing Repair

**Status:** Source repair complete; Hostinger upload and live validation pending  
**Recorded:** 2026-09-02  
**Environment:** Western Australia internal rehearsal only

## Fault

The Hostinger entry page called the generic `aab_resolve_entry()` function. In the WA project that historical resolver can return central/platform and generic `_rebuild` routes, including a personal dashboard when no active workspace membership exists. That contract is not sufficiently narrow for the isolated WA rehearsal runtime.

The entry script also treated the existence of `window.turnstile` as proof that the explicit-render API was ready. A partial or duplicate loader could therefore produce `window.turnstile.render is not a function`.

## Repair

The WA entry source now resolves authority only through these WA-specific protected functions:

| Protected resolver | Required authority | Supabase semantic route | Existing runtime destination |
| --- | --- | --- | --- |
| `aab_rehearsal_head_admin_authority()` | `PERSISTED_WA_HEAD_ADMIN` | `/head-admin` | `/aab-local/app/_rebuild/country-admin.html` |
| `aab_rehearsal_institution_authority()` | `PERSISTED_REHEARSAL_INSTITUTION_ADMIN` | `/institution-admin` | `/aab-local/app/_rebuild/institution-setup.html` |
| `aab_rehearsal_team_authority()` | `PERSISTED_REHEARSAL_TEAM_MEMBER` | `/institution-workspace` | `/aab-local/app/_rebuild/my-dashboard.html` |

The browser accepts a route only when both the returned persisted authority and semantic route exactly match the local allowlist. It does not call the generic resolver and has no Platform Owner fallback. A verified identity with no active WA membership is denied.

Turnstile readiness now requires `typeof window.turnstile.render === 'function'`. The entry asset version was increased to `v=2` to avoid stale browser caches.

David's working widget-element change is retained: the page and renderer both use the unique `turnstile-widget` identifier. The final patch therefore combines the proven widget/SMTP configuration with the fail-closed authority resolver; neither repair replaces the other.

An expired or invalid Supabase session is removed. A valid session that lacks persisted WA authority is retained and denied; it is not misclassified as a broken login.

## Preserved boundaries

- No Supabase schema, data, Auth user, membership, invitation or authority record was changed.
- No main-control-plane credential or routing function is used by the repaired WA entry path.
- OTP continues to use `create_user:false`.
- Authentication remains identity only; protected persisted membership determines the dashboard.
- Existing clean semantic routes are preserved as the canonical target contract. The current PHP/HTML package temporarily maps them to the corresponding existing `_rebuild` interfaces until native clean-route controllers are shipped.

## Current reset state observed before repair

- 3 WA Auth users;
- 0 active workspace memberships;
- 0 active organization memberships;
- country workspaces: 1 `ARCHIVED`, 1 `BOOTSTRAP_RUNNING`;
- participant invitations: 3 historical `ACCEPTED`, 2 `REVOKED`.

Therefore no existing account should pass the repaired entry resolver until the controlled provisioning bridge creates a fresh activation and persisted WA `HEAD_ADMIN` membership. This denial is expected and must not be bypassed.

## Required deployment validation

1. upload the repaired `entry.js` and `index.php` to the WA Hostinger document root;
2. open an incognito browser and verify Turnstile renders once;
3. verify an unknown account is not created;
4. verify a valid identity without active WA membership is denied;
5. complete the protected provisioning handoff and fresh Head Admin activation separately;
6. verify Head Admin, Institution Admin and team-member routing independently;
7. verify manual access to another role's destination is denied;
8. inspect logs for any main-project reference or legacy persistence access.

Do not create David as a WA tenant member merely because he is the AAB Platform Owner. The nominated WA Country Head Admin must arise from the governed provisioning handoff.
