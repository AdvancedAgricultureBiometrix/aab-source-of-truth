# AAB ID-06 — Protected Dashboard Context Projection Contract

## Status

Read-only, fail-closed and synthetic-validation-only. Supabase and Airtable remain untouched.

## Purpose

ID-06 consumes one trusted ID-05 access result and projects its exact actor, dashboard, route, role and scope into an immutable render-only dashboard context. It accepts no browser-supplied context override.

## Boundaries

ID-06 does not navigate, query data, fetch records, create sessions, issue tokens, set cookies, grant authority, change memberships, enable Auth, or write data.

## Loader integration

ID-06 is loaded only by `governed-runtime-bootstrap.js`. No direct ID-06 script tag is added to `indexDASH.html`. Bootstrap version 1.1.0 loads ID-01 through ID-06 sequentially and fails closed on a missing or invalid dependency.

## Dependency and handoff

- Required dependency: ID-05 `PASS_READY_READ_ONLY`
- Successful result: ID-06 `PASS_READY_READ_ONLY`
- Next allowed build: ID-07
