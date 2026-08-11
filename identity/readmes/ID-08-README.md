# AAB ID-08 — Protected Dashboard Read Policy Decision Contract

## Status

Deployed Hostinger runtime result: `PASS_READY_READ_ONLY` with final gate `passed: true`. Formal closure is pending promotion of the deployed bootstrap v1.3.0 to GitHub's canonical loader path.

## Purpose

ID-08 consumes one trusted ID-07 read-request envelope and evaluates it against a server-defined read-policy registry. It returns an immutable, non-executable compatibility decision only.

## Boundaries

ID-08 does not execute a query, fetch records, call an API, navigate, create sessions, issue tokens, set cookies, grant authority, change memberships, activate Auth, or write data. Client-supplied policy, scope, query, projection and decision overrides fail closed. Unknown read models, denied envelopes, malformed input and operational flags fail closed.

## Controlled path

`ID-05 access decision → ID-06 context → ID-07 envelope → ID-08 policy decision` was exercised with controlled synthetic data. Safe compatibility was allowed; client override, unknown read model, denied envelope and operational requests were blocked. Every operational and mutation flag remained false.

## Loader integration

ID-08 is loaded only by `governed-runtime-bootstrap.js`. No direct ID-08 page tag is permitted. Bootstrap candidate v1.3.0 loads ID-01 through ID-08 sequentially and fails closed on a missing namespace or failed contract.

## Dependency and handoff

- Required dependency: ID-07 `PASS_READY_READ_ONLY`
- Deployed result: ID-08 `PASS_READY_READ_ONLY`, final gate `passed: true`
- Formal next build: ID-09 after canonical GitHub loader v1.3.0 promotion and ID-08 closure
