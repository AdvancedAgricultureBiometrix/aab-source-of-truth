# Identity Build Status

**Last validated:** 11 August 2026 (Australia/Perth)  
**Runtime gate:** `PASS_READY_READ_ONLY`  
**Next approved build:** ID-09

| Build | Result | Authority granted | Mutation/write | Supabase applied | Next |
|---|---|---:|---:|---:|---|
| ID-01 | PASS_READY_READ_ONLY | No | No | No | ID-02 |
| ID-02 | PASS_READY_READ_ONLY | No | No | No | ID-03 |
| ID-03 | PASS_READY_READ_ONLY | No | No | No | ID-04 |
| ID-04 | PASS_READY_READ_ONLY | No | No | No | ID-05 |
| ID-05 | PASS_READY_READ_ONLY | No | No | No | ID-06 |
| ID-06 | PASS_READY_READ_ONLY | No | No | No | ID-07 |
| ID-07 | PASS_READY_READ_ONLY | No | No | No | ID-08 |
| ID-08 | PASS_READY_READ_ONLY | No | No | No | ID-09 |
| ID-LOADER-01 | PASS_READY_READ_ONLY | No | No | No | Loads ID-01→ID-08 |

## Locked interpretation

- ID-01 preserves the boundary between authenticated accounts and canonical authority.
- ID-02 resolves one immutable Auth UUID to one existing actor using controlled synthetic data.
- ID-03 resolves only existing protected memberships into read-only authority context.
- ID-04 resolves an exact server-defined dashboard route from protected authority context.
- ID-05 returns a trusted allow/deny decision without navigation or authority creation.
- ID-06 projects exact trusted scope into an immutable render-only dashboard context.
- ID-07 creates an immutable, exact-scope-bound and non-executable read-request envelope.
- ID-08 evaluates the trusted ID-07 envelope against an exact server-defined read policy and returns only an immutable, non-executable allow/deny compatibility decision.
- ID-LOADER-01 v1.3.0 is the sole identity entry point and loads ID-01 through ID-08 sequentially with duplicate-execution protection.
- Client policy/scope/query/decision overrides, unknown read models, denied envelopes and operational requests fail closed.
- All live queries, API calls, record fetching, navigation, session/token creation, role or membership grants, database writes, live Airtable, live Supabase and Auth activation remain blocked.
- Future SQL specifications are unapplied design artifacts.

## Deployed validation evidence

The Hostinger browser validation returned `passed: true`. It proved the controlled ID-05 → ID-06 → ID-07 → ID-08 path, bootstrap v1.3.0 manifest order, immutable safe decision, fail-closed override/unknown/denied checks, blocked operational request, direct identity tags `[]`, and no operations or mutations.

## Continuation

Read `handovers/AAB-IDENTITY-HANDOVER-POST-ID-08.md`. Proceed with ID-09 only. Do not reopen completed builds unless ID-09 supplies concrete evidence of a genuine upstream defect.
