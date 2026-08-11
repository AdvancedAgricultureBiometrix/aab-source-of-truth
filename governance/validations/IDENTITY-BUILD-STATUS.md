# Identity Build Status

**Last validated:** 11 August 2026 (Australia/Perth)  
**Deployed runtime gate:** `PASS_READY_READ_ONLY`  
**Formal closure:** ID-09 closed  
**Next approved build:** ID-10

| Build | Result | Authority granted | Mutation/write | Supabase applied | Next |
|---|---|---:|---:|---:|---|
| ID-01 | PASS_READY_READ_ONLY | No | No | No | ID-02 |
| ID-02 | PASS_READY_READ_ONLY | No | No | No | ID-03 |
| ID-03 | PASS_READY_READ_ONLY | No | No | No | ID-04 |
| ID-04 | PASS_READY_READ_ONLY | No | No | No | ID-05 |
| ID-05 | PASS_READY_READ_ONLY | No | No | No | ID-06 |
| ID-06 | PASS_READY_READ_ONLY | No | No | No | ID-07 |
| ID-07 | PASS_READY_READ_ONLY | No | No | No | ID-08 |
| ID-08 | PASS_READY_READ_ONLY (deployed, browser-validated and formally closed) | No | No | No | ID-09 |
| ID-09 | PASS_READY_READ_ONLY (deployed, browser-validated and formally closed) | No | No | No | ID-10 |
| ID-LOADER-01 | Canonical v1.4.0; controls ID-01 through ID-09 | No | No | No | ID-10 |

## Locked interpretation

- ID-01 preserves the boundary between authenticated accounts and canonical authority.
- ID-02 resolves one immutable Auth UUID to one existing actor using controlled synthetic data.
- ID-03 resolves only existing protected memberships into read-only authority context.
- ID-04 resolves an exact server-defined dashboard route from protected authority context.
- ID-05 returns a trusted allow/deny decision without navigation or authority creation.
- ID-06 projects exact trusted scope into an immutable render-only dashboard context.
- ID-07 creates an immutable, exact-scope-bound and non-executable read-request envelope.
- ID-08 evaluates the trusted ID-07 envelope against an exact server-defined read policy and returns only an immutable, non-executable allow/deny compatibility decision.
- ID-09 converts an allowed ID-08 compatibility decision into an immutable, scope-preserving and non-executable handoff for a future protected server read adapter.
- ID-LOADER-01 v1.4.0 is the deployed and GitHub-canonical sole identity entry point. It loads ID-01 through ID-09 sequentially with duplicate-execution protection.
- Client adapter/scope/query/execution overrides, unknown policy mappings, denied or operationally contaminated decisions, and direct operational requests fail closed.
- The ID-09 handoff contains no SQL, table, endpoint, filters, credentials or query plan.
- All live queries, API calls, record fetching, navigation, session/token creation, role or membership grants, database writes, live Airtable, live Supabase and Auth activation remain blocked.
- Future SQL specifications are unapplied design artifacts.

## Deployed validation evidence

The Hostinger browser validation returned `passed: true`. It proved the controlled ID-05 → ID-06 → ID-07 → ID-08 → ID-09 path, bootstrap v1.4.0 manifest order, immutable non-executable adapter handoff, fail-closed override/unknown/denied/contaminated checks, blocked operational request, no query material, direct identity tags `[]`, and no operations or mutations.

## Canonical publication evidence

- ID-09 evidence artifacts merged to `main` through PR #1 at commit `79b6c1a96e81b7611eeac0be593ea65ff306fd6b`.
- Canonical bootstrap v1.4.0 promoted at commit `524994470792296d6a3d6f05476817442e441080`.
- Verified canonical loader blob: `30fe6099425bb8fb0f03d0b9d74e50c7e135b044`.

## Continuation

Read `handovers/AAB-IDENTITY-HANDOVER-POST-ID-09.md`, confirm canonical loader v1.4.0, and proceed with ID-10 only after inspecting the handover and canonical chain to confirm that ID-10 is genuinely required. Do not reopen completed builds unless ID-10 supplies concrete evidence of a genuine upstream defect.
