# AAB ID-05 — Trusted Dashboard Access Decision Contract

## Status

Read-only, fail-closed and synthetic-validation-only. Supabase and Airtable are untouched.

## Purpose

ID-05 consumes one validated ID-04 protected route plan and returns a scoped dashboard access allow/deny decision. The decision preserves actor, role, country, institution and domain scope and accepts no browser-supplied access claims.

## Boundaries

ID-05 does not navigate or redirect, create sessions, issue tokens, set cookies, query or mutate memberships, grant authority, enable Auth, or write data.

## Deployment

The runtime ZIP contains only the ID-05 contract and the loader-wired `indexDASH.html`. The validation script is supplied directly in chat. This README and the unapplied SQL specification are permanent GitHub records.

## Dependency and handoff

- Required dependency: ID-04 `PASS_READY_READ_ONLY`
- Successful result: ID-05 `PASS_READY_READ_ONLY`
- Next allowed build: ID-06
