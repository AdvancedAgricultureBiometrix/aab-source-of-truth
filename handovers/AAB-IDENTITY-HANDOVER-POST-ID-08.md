# AAB Identity Chain Handover — Post ID-08

**Handover date:** 11 August 2026 (Australia/Perth)  
**Repository:** `AdvancedAgricultureBiometrix/aab-source-of-truth`  
**Current gate:** ID-08 deployed, browser-validated and formally closed  
**Next approved build:** ID-09 only

## Start here — note for the next chat

The permanent source of truth is the private GitHub repository `AdvancedAgricultureBiometrix/aab-source-of-truth`. Begin with `handovers/AAB-IDENTITY-HANDOVER-POST-ID-08.md`, then inspect `governance/validations/IDENTITY-BUILD-STATUS.md`, `runtime/loaders/governed-runtime-bootstrap.js`, and the contract, README, browser validation and future SQL specification for ID-08.

Do not ask what comes next when the validated gate already names it: continue with ID-09 only. Do not reopen ID-01 through ID-08 or ID-LOADER-01 unless ID-09 provides concrete evidence of a genuine upstream defect. Preserve the fixed process: **Build. Wire. Validate. Fix only the current build. Move on.** A passing namespace/self-test is insufficient; every build must be wired through its real upstream providers and downstream boundary, populated with controlled data, and proven end-to-end before closure.

## Completed work

| Build | Purpose | Deployed result | Next |
|---|---|---|---|
| ID-01 | Identity/authority compatibility boundary | `PASS_READY_READ_ONLY` | ID-02 |
| ID-02 | Immutable Auth UUID to existing canonical actor link | `PASS_READY_READ_ONLY` | ID-03 |
| ID-03 | Protected membership authority resolver | `PASS_READY_READ_ONLY` | ID-04 |
| ID-04 | Scoped dashboard route resolver | `PASS_READY_READ_ONLY` | ID-05 |
| ID-05 | Trusted dashboard access decision | `PASS_READY_READ_ONLY` | ID-06 |
| ID-06 | Immutable render-only dashboard context projection | `PASS_READY_READ_ONLY` | ID-07 |
| ID-07 | Scope-bound, immutable, non-executable dashboard read-request envelope | `PASS_READY_READ_ONLY` | ID-08 |
| ID-08 | Server-defined protected read-policy compatibility decision | `PASS_READY_READ_ONLY` | ID-09 |
| ID-LOADER-01 | Canonical deterministic identity-chain bootstrap v1.3.0 | `PASS_READY_READ_ONLY` | Manages ID-01→ID-08 |

## Proven ID-08 path

- Bootstrap v1.3.0 loads ID-01 through ID-08 sequentially and prevents duplicate execution.
- ID-05 permits the controlled scientist workspace route; ID-06 projects immutable render-only context; ID-07 creates the protected read envelope; ID-08 evaluates it against the server-defined policy registry.
- The successful ID-08 output is an immutable, non-executable compatibility decision only. It is not a query and grants no authority.
- Client policy/scope/query/decision overrides, unknown read models and denied envelopes fail closed.
- Query execution, record fetching, API calls, navigation, sessions/tokens, authority grants, database writes, live Supabase, live Airtable and Auth activation are blocked.
- Direct identity tags are `[]`; `No Operations Performed` is `true`; the deployed final gate is `passed: true`.
- No Airtable or Supabase data/schema was changed. Future SQL is an unapplied design specification only.

## Runtime loader

`indexDASH.html` retains one canonical identity entry point:

```html
<script src="/aab-local/app/_rebuild/js/governed-runtime-bootstrap.js?v=1.2.0"></script>
```

The deployed replacement bootstrap is internally versioned `1.3.0` and owns ID-01 through ID-08. Future identity builds belong in its ordered manifest, never as direct page tags. It must fail closed on a missing file, namespace or failed contract.

## Next work

1. Start ID-09 from the validated ID-08 handoff and repository state.
2. Inspect the canonical roadmap and ID-08 before naming ID-09. Derive the narrowest missing boundary; do not invent operational authority.
3. Build one objective only, preserving read-only, fail-closed and synthetic-only constraints unless the user explicitly authorises a later phase.
4. Wire ID-09 to real ID-08 output and add it to the central bootstrap—no direct page tag.
5. Test positive and fail-closed paths, including overrides, unknown/ambiguous input and operational flags.
6. Package only changed Hostinger runtime files; deliver backup, extraction, full browser validation and rollback directly in chat.
7. Wait for deployed validation. Close ID-09 only when its final gate is `true`, then update GitHub records and the next handover.

ID-09's exact name and scope are intentionally not invented here. ID-08 only determines compatibility with a protected read policy; it does not execute a backend read.

## Plugins and tools

| Plugin/tool | Use | Boundary |
|---|---|---|
| GitHub plugin | Permanent contracts, READMEs, tests, status, bootstrap, SQL specifications and handovers | Inspect before replacement; refetch after writing; never claim success before verification |
| Airtable plugin | Read-only inspection of the AAB base/schema for future mapping | No record, table, field, comment, interface or schema writes |
| Supabase plugin | Destination architecture/documentation and future migration planning | No live Auth, SQL application, schema/database mutation, sessions, tokens, RLS changes or operational calls |
| Personal Context | Recover continuity for “proceed”, “continue” and handover requests | Deployed validation and GitHub are authoritative for current build state |

Do not install extra plugins merely because they are available. GitHub is the permanent record; Hostinger is the deployed runtime; Airtable is the read-only reference source; Supabase is the planned destination and remains inactive in this identity phase.

## Build and ZIP delivery process

- Work in `package-idNN/`; deliver full-file replacements, not patches.
- Contract runtime path: `aab-local/app/_rebuild/js/AAB-ID-NN-...-CONTRACT.js`.
- Update `governed-runtime-bootstrap.js` in strict order. Include `indexDASH.html` only when its bootstrap tag changes.
- Keep README, browser test and SQL specification outside the deployment ZIP and publish them to GitHub.
- Run syntax/static checks and the actual upstream-to-current controlled path, including safe, override, denied/unknown and blocked operational cases.
- Name the deployable archive `AAB-ID-NN-LOCAL-DEPLOYMENT-PACKAGE.zip`; preserve paths relative to `public_html`; inspect exact contents before delivery.
- Every AAB delivery starts: **file name, script tag, code, validation, rollback**. Supply exact Hostinger backup/deployment commands, full browser-console validation in chat, expected results and exact rollback.
- Local tests do not close a build. Formal closure follows a deployed browser final gate of `passed: true` and verified GitHub source-of-truth updates.

## GitHub locations

```text
identity/contracts/AAB-ID-NN-...-CONTRACT.js
identity/readmes/ID-NN-README.md
identity/tests/ID-NN-BROWSER-CONSOLE-VALIDATION.js
supabase/specifications/ID-NN-FUTURE-MIGRATION-SPECIFICATION.sql
governance/validations/IDENTITY-BUILD-STATUS.md
runtime/loaders/governed-runtime-bootstrap.js
handovers/AAB-IDENTITY-HANDOVER-POST-ID-NN.md
```

Fetch and verify every written GitHub path before reporting completion.

## Non-negotiable constraints

- Scientist/admin authority remains preserved; contracts do not create authority.
- No autonomous operation or self-authorised builds.
- Browser/client claims cannot establish actor, role, membership, route, context, scope, policy, query or authority.
- Do not reopen completed builds without evidence of a genuine upstream defect.
- No change without a WHY; no trial without an OUTCOME.
- No live Supabase/Auth or Airtable mutation during this read-only identity phase.
- Future SQL specifications are unapplied design artifacts.
- Full-file replacements only; build once, wire fully, prove end-to-end, then move forward.

## Opening prompt for the next chat

> Continue AAB from `handovers/AAB-IDENTITY-HANDOVER-POST-ID-08.md` in `AdvancedAgricultureBiometrix/aab-source-of-truth`. Confirm ID-08 and canonical bootstrap v1.3.0 are `PASS_READY_READ_ONLY`, then proceed with ID-09 only. Inspect the canonical roadmap and ID-08 before naming ID-09. One objective only; fully wire it to ID-08, preserve fail-closed/read-only/synthetic-only boundaries, make no Airtable or Supabase writes, deliver the Hostinger ZIP with exact contents, full browser-console validation and rollback, and do not reopen ID-01 through ID-08 unless ID-09 proves a genuine upstream defect.
