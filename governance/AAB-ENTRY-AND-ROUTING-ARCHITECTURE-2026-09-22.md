# AAB Entry and Routing Architecture — 2026-09-22

**Status:** ARCHITECTURAL RECORD
**Authority:** RECORDS CONFIRMED PRODUCTION BEHAVIOUR. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority.

## The entry point

The production authentication surface for `aab.ag` is `/enter-aab/index.php`.

It is not `gate.php` or `auth.html`. Those files are a legacy developer test harness — a debug page with a `<pre id="out">` output box and static links pointing at stale files. They are not part of the production authentication flow and should not be used as a reference.

## Authentication mechanism

`/enter-aab` uses Supabase Auth with Cloudflare Turnstile bot protection. The flow is:

1. User enters their approved email address
2. Turnstile human verification is completed
3. A 6-digit OTP code is sent to the email address
4. User enters the code
5. Supabase Auth verifies the code and creates a session
6. The server resolves the user's authorised entry path

This is the same email + 6-digit code pattern used by `wa-rehearsal.nexiuma.ai`'s entry flow. Both sites use Supabase Auth, not the local SQLite `gate.php` system.

## The routing decision — `aab_resolve_entry`

After authentication, `entry.js` calls a single server-side Supabase RPC:

```javascript
await client.rpc("aab_resolve_entry", {})
```

This RPC reads the authenticated user's persisted records server-side and returns exactly one route:

```json
{
  "ok": true,
  "route": "/aab-local/app/_rebuild/my-dashboard.html",
  "route_code": "AUTHORISED_ENTRY"
}
```

The browser then executes:

```javascript
window.location.assign(route)
```

**The routing decision is entirely server-side.** The browser never decides where a user belongs — it only follows where the server points. The route is validated server-side before being returned, and the client performs an additional path safety check before following it.

## Why this answers the country routing question

A user who authenticates on `aab.ag` is routed to exactly the surface their persisted records authorise — no more, no less. Different users with different roles receive different routes from the same RPC call:

- A Platform Owner receives a platform administration route
- A country participant receives their country environment route  
- A scientist receives their dashboard route
- An unrecognised account receives no route and entry is refused

This means `aab.ag` does not accidentally expose country surfaces to platform-level users, or platform surfaces to country scientists. The boundary is enforced by the RPC, not by browser logic.

## Country deployment pattern

A country deployment — such as `wa-rehearsal.nexiuma.ai` — has its own entry point, its own Supabase Auth tenant, its own `aab_resolve_entry` equivalent (in `wa-rehearsal`, this is the `entry.js` role routing table querying `aab_rehearsal_head_admin_authority`, `aab_rehearsal_institution_authority`, and `aab_rehearsal_team_authority` in order), and its own destination routes.

A scientist in Thailand would authenticate against Thailand's country entry URL, not `aab.ag`. After authentication, Thailand's equivalent of `aab_resolve_entry` would return routes within Thailand's country environment. The scientist never sees `aab.ag`.

`aab.ag` is the Platform Owner surface. It provisions countries and issues activation codes. Once a country is provisioned, it operates independently through its own entry point.

## Navigation cleanup needed

Two items identified during the investigation that do not affect the routing architecture but should be addressed:

1. **Nav version skew** — `aab.ag`'s `_rebuild/*.html` pages load `aab-navigation.v23.css/js`; `wa-rehearsal.nexiuma.ai` loads `v24`. The style kit on `main` has v24. `aab.ag` should be updated to match.

2. **`indexDASH.html` reference** — the shared header's default nav pill still points at the legacy `indexDASH.html` (78,686 bytes, old EG12/EG13 governance contracts). Internal app links correctly point at `my-dashboard.html`. This fork in the navigation should be resolved by updating the nav pill to point at `my-dashboard.html`.

Neither item affects commissioning status or the routing architecture described above.

## What this document does not establish

- It does not authorise any capability dashboard work
- It does not alter commissioning status or satisfy Gate D
- It does not close WP05 or grant any production authority
- It does not confirm that `aab_resolve_entry` is correctly implemented for all current or future roles — it records that the pattern exists and is the production routing mechanism
