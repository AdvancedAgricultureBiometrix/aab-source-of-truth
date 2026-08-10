# AAB Identity Chain Handover — Post ID-07

**Handover date:** 11 August 2026 (Australia/Perth)  
**Repository:** `AdvancedAgricultureBiometrix/aab-source-of-truth`  
**Current gate:** ID-07 deployed, browser-validated and formally closed  
**Next approved build:** ID-08 only

## Start here — note for the next chat

The permanent source of truth is the private GitHub repository `AdvancedAgricultureBiometrix/aab-source-of-truth`. Begin with `handovers/AAB-IDENTITY-HANDOVER-POST-ID-07.md`, then inspect `governance/validations/IDENTITY-BUILD-STATUS.md`, `runtime/loaders/governed-runtime-bootstrap.js`, and the contract, README, test and future SQL specification for the latest completed identity build. Runtime files deploy to Hostinger under `public_html/aab-local/app/`, with identity JavaScript under `public_html/aab-local/app/_rebuild/js/`. Local build folders use `package-idNN/`; user deployment ZIPs use `AAB-ID-NN-LOCAL-DEPLOYMENT-PACKAGE.zip` and preserve paths relative to `public_html`.

Do not ask what comes next when the validated gate already names it: continue with ID-08 only. Do not reopen ID-01 through ID-07 or ID-LOADER-01 unless ID-08 provides concrete evidence of a genuine upstream defect. Preserve the fixed process: **Build. Wire. Validate. Fix only the current build. Move on.** A passing namespace/self-test is insufficient; every build must be wired through its real upstream providers and downstream boundary, populated with controlled data, and proven end-to-end before closure.

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
| ID-LOADER-01 | Canonical deterministic identity-chain bootstrap | `PASS_READY_READ_ONLY` | Manages ID-01→ID-07 |

### Proven ID-07 path

- The bootstrap loads ID-01 through ID-07 sequentially and prevents duplicate execution.
- ID-04 resolves a protected route; ID-05 returns a trusted access decision; ID-06 projects immutable render-only context; ID-07 creates a protected read-request envelope.
- The envelope is exact-scope-bound, read-only, immutable and non-executable.
- Client scope/query overrides, unknown resources and denied context fail closed.
- Query execution, record fetching, API calls, navigation, sessions/tokens, authority grants, database writes, live Supabase and live Airtable are blocked.
- Direct identity tags are `[]`; no Airtable or Supabase data/schema was changed.
- Future SQL files are design specifications only and must not be applied.

## Runtime loader

`indexDASH.html` has one canonical identity entry point:

```html
<script src="/aab-local/app/_rebuild/js/governed-runtime-bootstrap.js?v=1.2.0"></script>
```

The bootstrap owns the ordered identity manifest. Add future identity builds there, never as direct page tags. It must fail closed on a missing file, namespace or failed contract. Eight unrelated duplicate historical script references were identified and deliberately not removed; reconcile them only after their consumers and execution timing are proven.

## Next work

1. Start ID-08 from the validated ID-07 handoff and repository state.
2. Inspect the canonical roadmap and ID-07 before naming ID-08. If no broader mandate exists, derive the narrowest missing boundary; do not invent operational authority.
3. Build one objective only, preserving read-only, fail-closed and synthetic-only constraints unless the user explicitly authorises a later phase.
4. Wire ID-08 to real ID-07 output and add it to the central bootstrap—no direct page tag.
5. Test positive and fail-closed paths, including overrides, unknown/ambiguous input and operational flags.
6. Package only changed Hostinger runtime files; deliver backup, extraction, validation and rollback directly in chat.
7. Wait for deployed validation. Close ID-08 only when its final gate is `true`, then update GitHub records and the next handover state.

ID-08's exact name/scope is intentionally not invented here. A read-request envelope is not permission and does not execute a backend query.

## Plugins and tools

| Plugin/tool | Use | Boundary |
|---|---|---|
| GitHub plugin | Permanent contracts, READMEs, tests, status, bootstrap, SQL specifications and handovers | Inspect before replacement; fetch after writing; never claim success before verification |
| Airtable plugin | Read-only inspection of the AAB base/schema for future mapping | No record, table, field, comment, interface or schema writes |
| Supabase plugin | Destination architecture/documentation and future migration planning | No live Auth, SQL application, schema/database mutation, sessions, tokens, RLS changes or operational calls |
| Personal Context | Recover continuity for “proceed”, “continue” and handover requests | Deployed validation and GitHub are authoritative for current build state |

Do not install extra plugins merely because they are available. GitHub is the permanent record; Hostinger is the deployed runtime; Airtable is the read-only reference source; Supabase is the planned destination and remains inactive in this identity phase.

## Build and ZIP delivery process

### Build and prove

- Work in `package-idNN/` and deliver full-file replacements, not patch snippets.
- Contract path: `aab-local/app/_rebuild/js/AAB-ID-NN-...-CONTRACT.js`.
- Update `aab-local/app/_rebuild/js/governed-runtime-bootstrap.js` in strict order.
- Include `aab-local/app/indexDASH.html` only if its bootstrap tag/version changes.
- Keep README, test harness and SQL specification outside the deployable runtime tree and publish them to GitHub.
- Run syntax/static checks and the actual upstream-to-current controlled path.
- Test safe, override, denied/unknown and blocked operational requests.
- Confirm no query, API, navigation, session/token, authority, mutation or write occurred.

### Package

Name the ZIP `AAB-ID-NN-LOCAL-DEPLOYMENT-PACKAGE.zip`. Preserve paths relative to `public_html` and include only changed deployable files, normally:

```text
aab-local/app/_rebuild/js/AAB-ID-NN-...-CONTRACT.js
aab-local/app/_rebuild/js/governed-runtime-bootstrap.js
aab-local/app/indexDASH.html   (only when changed)
```

List and inspect the ZIP before delivery. It must not contain tests, READMEs, SQL specifications, temporary files or nested ZIPs.

### Deliver

Every AAB delivery starts in this order: **file name, script tag, code, validation, rollback**. Also supply a clickable ZIP link, exact contents, exact backup commands using real Hostinger paths, extraction into `public_html`, cache-clear/hard-refresh instructions, the full browser-console validation as a clearly named contiguous copy/paste block, expected results and exact rollback commands.

The browser validation opens a new report window; confirms the namespace; calls `validateContract()` and `getContract()`; exercises safe and blocked requests; escapes output; and shows Contract Exists, Bootstrap Validation, Manifest, Validation Result, Contract Snapshot, upstream results, override/unknown/denied checks, Blocked Operational Request, Direct Identity Tags `[]`, and a Final Gate with `passed: true` plus the next build. Local tests do not close a build: the user runs validation on Hostinger and returns the report.

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
- Browser/client claims cannot establish actor, role, membership, route, context, scope or query authority.
- Do not reopen completed builds without evidence of a genuine upstream defect.
- No change without a WHY; no trial without an OUTCOME.
- No live Supabase/Auth or Airtable mutation during this read-only identity phase.
- Future SQL specifications are unapplied design artifacts.
- Full-file replacements only; build once, wire fully, prove end-to-end, then move forward.

## Opening prompt for the next chat

> Continue AAB from `handovers/AAB-IDENTITY-HANDOVER-POST-ID-07.md` in `AdvancedAgricultureBiometrix/aab-source-of-truth`. Confirm ID-07 and the canonical bootstrap are `PASS_READY_READ_ONLY`, then proceed with ID-08 only. Inspect the canonical roadmap and ID-07 before naming ID-08. One objective only; fully wire it to ID-07, preserve fail-closed/read-only/synthetic-only boundaries, make no Airtable or Supabase writes, deliver the Hostinger ZIP with exact contents, full browser-console validation and rollback, and do not reopen ID-01 through ID-07 unless ID-08 proves a genuine upstream defect.
