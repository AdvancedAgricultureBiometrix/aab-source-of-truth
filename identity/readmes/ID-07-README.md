# AAB ID-07 — Protected Dashboard Read Request Envelope Contract

## Status

Read-only, fail-closed and synthetic-validation-only. Supabase and Airtable remain untouched.

## Purpose

ID-07 consumes one trusted ID-06 immutable dashboard context and one server-defined resource descriptor. It produces a scope-bound, immutable, non-executable read request envelope for future backend evaluation.

## Boundaries

ID-07 does not execute a query, call an API, fetch records, navigate, create sessions, issue tokens, set cookies, grant authority, change memberships, enable Auth, or write data. Client-supplied scope, query, filter, table, endpoint and projection overrides fail closed.

## Loader integration

ID-07 is loaded only by `governed-runtime-bootstrap.js`. No direct ID-07 script tag is added to `indexDASH.html`. Bootstrap version 1.2.0 loads ID-01 through ID-07 sequentially and fails closed on a missing or invalid dependency.

## Dependency and handoff

- Required dependency: ID-06 `PASS_READY_READ_ONLY`
- Successful result: ID-07 `PASS_READY_READ_ONLY`
- Next allowed build: ID-08
