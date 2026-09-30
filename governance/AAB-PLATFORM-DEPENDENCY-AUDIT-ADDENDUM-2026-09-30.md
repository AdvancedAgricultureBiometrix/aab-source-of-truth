# AAB Platform Dependency Audit — Addendum — 2026-09-30

**Status:** INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED
**Supplements:** `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md` (the audit), which audited `main` at `eb9f338`. The audit stands as the record of that commit; this addendum brings it to the code as it is now.
**Scope:** the audit's scope, at `main` `405fbe8`: every TypeScript module in `scs-pilot/packages/api/src/` (188 sources: 124 production modules, 64 test files), the migrations `001` to `025`, the current-state schema files, and the platform contracts wherever a module's dependency reaches them.
**The pinned code:** the source tree audited here is `scs-pilot/` at `405fbe8`. The commit that adds this addendum changes nothing under `scs-pilot/`, so its tree there is identical; the independent review pack pins that commit, and `git diff 405fbe8 <that commit> -- scs-pilot` is empty.
**Corrected (2026-09-30):** the V8 row said migration `023` adds "ten new platform tables, and one function" to `scs`. It adds ten tables and **nine** functions: `is_registered_actor`, `is_named_human`, `signing_key_registration_check`, `key_registry_started`, `key_bootstrap_ceremony_registry_empty`, `key_registration_challenge_registry_state`, `signing_key_event_check`, `signing_key_compromise_check` and `key_compromise_assessment_check`. The count was wrong; the finding was not: all are in `scs`, as the decision to keep that schema provides. Found while preparing the independent review pack, which disclosed it first (`governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK/REVIEW-PACK.md`, section 5.1). Nothing else in this addendum changes.
**Authority:** RECORDS THE DEPENDENCY GRAPH AT `405fbe8`, WHAT HAS CHANGED SINCE `eb9f338`, AND THE TOOLS THAT PRODUCE IT. Authorises no refactor, code move, migration or contract change. Admits no capability, and changes no control's status, Gate D or WP05.

**Independence: this addendum is not independent, and says so.** Like the audit, it was carried out by the same agent (Claude, Claude Code) that built most of the code it examines, including the signing-key registry added since the audit. It is the internal review. The separation decision's rule 3 requires an independent one, which the review pack is written for.

## Why an addendum

The audit pinned `eb9f338`. Since then, nine commits have changed 128 files under the audited `src/`: 78 added and 50 modified. They add a platform key registry of 18 modules (AAB-PLATFORM-09), object-store identities, and migrations `023` to `025`, and they change modules at the centre of V1, V3 and V5. An independent review of `eb9f338` would verify a graph that no longer matches the code an extraction would move.

The audit also said its import-graph script was reproducible, but **the script was never committed** (PR #45 added only the audit). This addendum commits the tools, and the outputs they produce at both commits.

| Commit | What changed under `src/` |
|---|---|
| `624ba39` | SCS-CAP-09 currency amendment (code comments and tests) |
| `88e8fec` | Migrations `023` and `024`: the public-key registry |
| `f72b013` | The registry library and reader |
| `70f15f0` | Registry endpoints under `/aab/v1/` |
| `a324abe` | Compromise, notices and assessments; the cross-issuer proof |
| `d5c7300` | The switch-over to the registry: link and status signatures verified through it |
| `1223f00` | Section 11 tests; rotation in the backup proof |
| `4cdd990` | Object-store identities: scoped credentials, Object Lock, verified reads |
| `068e9f5` | Migration `025`: receipts accept AAB landscape and platform contract identifiers |

## How this addendum was done

**The tools** (`governance/tools/dependency-audit/`, Node built-ins only, nothing to install; see its README):

| Tool | What it does | SHA-256 |
|---|---|---|
| `lib.mjs` | Lists files; removes comments keeping line numbers; classifies each path into the audit's categories; resolves relative imports | `1904586fa825b23521550cff6911987b94304b42e090b21f6ccb1f509ae0d282` |
| `import-graph.mjs` | Records every static, re-exporting, side-effect and literal dynamic import, with its line, as JSON | `16b850852ccec91c8b98a51467b0a1e7b0096c47c9384cc8600e7b238adcc2d9` |
| `boundary-edges.mjs` | From the graph, lists every platform-to-domain and platform-to-registry edge, and counts every other direction | `a42b77ace08cc4aedf8533d7d0992e44c2a45b7fec2b87ce255247412d75794b` |
| `vocab-scan.mjs` | Searches platform-side code, comments excluded, for the audit's SCS vocabulary | `9f66124d447de0f528b0e0aa5c79114f525acd2c1f56abf526b2d075543c2500` |

**The categories** are the audit's (its section 1), assigned by path: `foundation/`, `platform/`, `ops/`, `migrations/`, `reference/`, `types/shared.ts`, `types/platform.ts`, `types/key-registry.ts`, `schemas/shared/`, `schemas/platform/` and `vendor.d.ts` are the platform side; `capabilities/`, `types/cap-*.ts` and `schemas/cap-*/` are the SCS domain; `schemas/registry.ts` is the mixed registry; `index.ts` and `capabilities/index.ts` are composition roots; `integration/` is test infrastructure.

**The tools were validated against the audit.** Run on `eb9f338`, they reproduce the audit's counts (154 sources: 101 production modules, 53 test files) and its boundary edges exactly: V1 at `ops/verify-integrity.ts:37`, and V2 at `foundation/auth.ts:62` and `platform/renditions/routes.ts:27`, with zero unresolved imports.

**The outputs are deterministic:** two runs at each commit produced byte-identical files. This has been shown on one machine (Windows, Node 24.19.0), not across operating systems.

**Static only,** as the audit was. Nothing was run but the tools.

**The evidence** (`governance/audits/platform-dependency/2026-09-30/`, with its `SHA256SUMS`):

| File | At | SHA-256 |
|---|---|---|
| `graph-eb9f338.json` | `eb9f338` | `459a4c9038f78b508c7c6a13118791285c649d6052263e9d5d523aed4408ccad` |
| `boundary-edges-eb9f338.tsv` | `eb9f338` | `a733c6a8b5841d0d077f634ad1d0b6638bfb5d92f961c84e6670d5e22c19e5f0` |
| `vocab-scan-eb9f338.tsv` | `eb9f338` | `cdd9ee8a4d6b927f6137e5e308fa0af4a2fbbc0efdb5c28f6aeefb0becec964b` |
| `graph-405fbe8.json` | `405fbe8` | `f8cb995bfbc90aaa5a7cc2581e96aba25070c11657a82e50aba18d03334446e5` |
| `boundary-edges-405fbe8.tsv` | `405fbe8` | `77a87e56cc5e4afa4f94f4162d0b4b31fbc739638adfc6288aed99702b0afba6` |
| `vocab-scan-405fbe8.tsv` | `405fbe8` | `f24eb02e9d71afd396c8cabeee063d1aabba7f6f97d7ee1a0c1aa2ac6cc59a7a` |

## Summary

- **The separation decision's central claim still holds for `foundation/`:** no foundation module imports a capability module.
- **Exactly one platform module imports SCS code, as at the audit:** `ops/verify-integrity.ts` (V1). No new platform-to-domain edge has been introduced.
- **V2 has grown:** ten production platform modules now import the mixed schema registry, not two. Eight of them are the new key registry.
- **V5 is partly relieved:** the receipt table accepts AAB identifiers by pattern (migration `025`). It still names the SCS identifiers, and the rendition table still accepts only `SCS-CAP-08`.
- **V12's prerequisite is met:** AAB-PLATFORM-05 to 08 now exist as platform contracts (`designed`). The code is still inside SCS.
- **The new key registry is a clean platform module except for V2, V3 and V9:** it imports no domain code; its routes are under `/aab/v1/` and its schemas under `urn:aab:schema:`, as the naming decision of 2026-09-27 requires; its tables are in the `scs` schema, as that decision kept.
- **One correction to the audit** (below): a platform test importing the registry was not listed.
- **Nothing else has changed in kind.** V4, V6, V7, V8, V9, V10 and V11 are as the audit records them, at the locations below.

## Module counts

| Category | `eb9f338` (the audit) | `405fbe8` |
|---|---:|---:|
| Platform, production | 28 | **49** |
| Platform, tests | 17 | 18 |
| SCS domain, production | 66 | 66 |
| SCS domain, tests | 3 | 3 |
| Mixed registry | 1 | 1 |
| Composition roots | 2 | 2 |
| Test infrastructure (non-test files; test files) | 4; 33 | 6; 43 |
| **Sources: production; tests** | **101; 53** | **124; 64** |

**The 21 new platform production modules:** the 18 modules of `platform/key-registry/`; `platform/evidence-objects/object-store-setup.ts`; `ops/object-store-setup.ts`; and the generated `types/key-registry.ts`.

## The violations at `405fbe8`

| # | Status | Where, now | What changed |
|---|---|---|---|
| **V1** | **Unchanged** | `ops/verify-integrity.ts:45` imports `capabilities/cap-02/link-store.ts`. SCS-CAP-08 packages and receipts, lines 121 to 123; SCS-CAP-02 links, receipts and status records, lines 153 to 159 | The tool also verifies the key registry now, through platform modules only |
| **V2** | **Grown** | Production: `foundation/auth.ts:65`, `platform/renditions/routes.ts:26`, and `platform/key-registry/` `assessment.ts:24`, `bootstrap.ts:34`, `challenge.ts:20`, `compromise.ts:32`, `events.ts:25`, `notice.ts:22`, `register.ts:25` and `routes.ts:9`. Tests: `foundation/actor.test.ts:7`, `foundation/auth.test.ts:9`, `foundation/server.test.ts:9`, and three tests of the registry itself in `schemas/` | Eight new production edges, from the key registry |
| **V3** | **Unchanged in kind** | `foundation/errors.ts`: `CAPABILITY_IDS` line 18, `CapabilityId` line 39, `CAPABILITY_BOUNDARY_FLAGS` line 47, `ScsFailure` line 106; used by `server.ts:85`, `:302` | The closed list gained `AAB-PLATFORM-09` (line 29). AGR's `CAP-NN` identifiers are accepted by the database (migration `025`) but not by this type, so the application's capability types are still closed |
| **V4** | **Unchanged** | `foundation/receipts.ts`, lines 30 to 35 (the decision type) and 61 to 66 (`outcomeOf`) | None |
| **V5** | **Partly relieved** | `decision_receipt_capability_id_ck`: migration `025`; `rendition_source_ck`: migration `018`, line 64 | The receipt constraint accepts `CAP-01` to `CAP-99` (not `CAP-29`) and `AAB-PLATFORM-01` to `99` by pattern, beside the SCS list it still names. The rendition constraint is unchanged: `SCS-CAP-08` only |
| **V6** | **Unchanged** | `platform/evidence-objects/routes.ts:69` and `platform/renditions/routes.ts:92`, under `/scs/v1` | The new key-registry routes are under `/aab/v1/`, as decided |
| **V7** | **Unchanged** | `foundation/db.ts`, lines 110 to 117 (the schema `scs`) and 204 (`application_name`) | None |
| **V8** | **Unchanged, as decided** | The platform tables in `scs` | Ten new platform tables, and nine functions (corrected on 2026-09-30; it said "one function"), in `scs` (migration `023`): `key_bootstrap_ceremony`, `key_compromise_assessment`, `key_compromise_notice`, `key_registration_challenge`, `key_verification_evidence`, `pinned_attestation_key`, `signing_key_compromise`, `signing_key_compromise_evidence`, `signing_key_event`, `signing_key_registration`. This follows the decision to keep the `scs` schema |
| **V9** | **Unchanged** | `ScsFailure` and `SCS-PLATFORM` throughout; `SCS-PILOT-` at `foundation/auth.ts:137`; `urn:aab:scs:schema:` for the existing platform and shared schemas | The key registry uses `ScsFailure` internally (`platform/key-registry/errors.ts`). Its new schemas are `urn:aab:schema:platform:…`, referring by `$ref` to the existing shared ActorReference schema, which keeps its name. **Two new schemas keep the old namespace:** the version 2 link statement and link status statement are `urn:aab:scs:schema:platform:…:2`, as new versions of existing schemas. **Decided on 2026-09-30** ("Decision recorded with this addendum"): a new version keeps its schema's namespace |
| **V10** | **Unchanged** | `platform/actor-subject-links/links.ts:135` | None |
| **V11** | **Unchanged in kind** | `capabilities/cap-02/create-link.ts`, `record-link-status.ts`, `get-link.ts`, and `toLink` and `toStatusRecord` in `link-store.ts` | Creation and status recording now verify signatures through the key registry. The link behaviour AAB-PLATFORM-04 defines for every domain is still implemented in SCS code |
| **V12** | **Contract prerequisite met** | Primitive 6: `cap-06/`; primitive 7: `cap-06/submit-conflict-resolution.ts`, `cap-09/submit-decision.ts`, `cap-09/currency.ts`; primitives 4 and 5: every admitting capability | AAB-PLATFORM-05 to 08 are now platform contracts (`designed`, PRs #46 to #49), and AGR's contracts adopt them. The code has not moved. Extracting it is still design work |

## A correction to the audit

**The audit listed two platform unit tests importing the schema registry** (`foundation/actor.test.ts:7` and `foundation/auth.test.ts:9`). **A third was already there at `eb9f338`, and was missed:** `foundation/server.test.ts:9`, a side-effect import. It is a test, and is fixed with V2.

Three tests in `schemas/` also import the registry (`generated-types.test.ts:22`, `request-uuids.test.ts:10`, `schemas-compile.test.ts:11`). These are tests of the registry itself, which the audit's statement about "the platform unit tests (`foundation/`, `platform/`, `migrations/`)" did not cover.

## The vocabulary at `405fbe8`

Counts of production hits, comments excluded:

| Term | `eb9f338` | `405fbe8` | Accounted for by |
|---|---:|---:|---|
| `SCS-CAP-nn` | 20 | 20 | V3 (the list and flags), V1 (the integrity tool's queries). One hit is descriptive text in `reference/iso-3166-1-alpha-2.json`, naming the SCS capability that uses the reference data: not a coupling |
| `SCS-PLATFORM` | 20 | 20 | V9 |
| `SCS-PILOT` | 1 | 1 | V9 |
| `Scs…` type names | 36 | 39 | V3, V9. The 3 new are `ScsFailure` in the key registry |
| `scs.` tables | 16 | 58 | V8. All 42 new are the key registry's queries, in `compromise-store.ts`, `integrity.ts`, `store.ts` and `write-store.ts`; the integrity tool's count is unchanged |
| `scs_` database names | 16 | 16 | V9 (`scs_migration`, `scs_api`), V7 |
| `urn:aab:scs:` | 24 | 46 | V9. Of the 22 new: 14 are `$ref`s from the key-registry schemas to the existing shared ActorReference schema; 6 are in the two new version 2 link schemas, whose own `$id`s keep the existing namespace, as decided (see V9); 2 are in link schemas modified since |
| `/scs/v1` | 3 | 3 | V6 |
| `SCS_` environment variables | 30 | 26 | V9 (operator interface). The integrity tool reads four fewer |
| The schema name `"scs"` | 7 | 7 | V7 (`db.ts`), V8 (`server.ts`, `migrations/runner.ts`, `ops/verify-integrity.ts`) |
| Domain words | 4 | 4 | V4 (`overallState` in `receipts.ts`) |

**Every production hit is accounted for** by a violation, or, in one case, is descriptive text. The tests' hits are in the evidence files, and are not classified further, as in the audit.

## The extraction plan

**Unchanged in its steps** (the audit's section 5). What is different:
- **Step 1 (V2)** now splits the registry for ten platform modules, not two.
- **Step 4** moves `platform/key-registry/` with the rest of the platform. It imports nothing from the domain.
- **Step 5 (V5)** has partly happened for receipts (migration `025`), by pattern rather than a registered-capability table. The rendition constraint remains.
- **Step 8 (V12)** has its contracts. It is still a redesign under rule 2, with its own decision and evidence for each primitive.

## Decision recorded with this addendum

**A new version of an existing schema is the existing schema, not a new one** (decided by the Platform Owner in review, 2026-09-30). The naming decision of 2026-09-27 is forward-looking: new platform schemas use `urn:aab:schema:`. A version 2 of a schema that existed before that decision is a revision of it, and keeps its original namespace; changing it would break compatibility with the version 1 records that cite it. **Only schemas genuinely new after 2026-09-27 must use `urn:aab:schema:`.**

So `urn:aab:scs:schema:platform:actor-subject-link-statement:2` and `urn:aab:scs:schema:platform:actor-subject-link-status-statement:2` are a decided exception, not a departure from the naming decision. Of the 44 schemas added under `src/schemas/` since `eb9f338`, the other 42, the key registry's among them, use `urn:aab:schema:`.

## What cannot be determined here

Everything in the audit's section 6, and:
- **The tools' own limits:** only imports with a literal specifier are seen; template literals are scanned one level deep; the vocabulary scan finds the listed terms, not every possible coupling.
- **Cross-platform determinism:** the digests were reproduced on one machine. A reviewer on another operating system who obtains different digests should compare the files' contents before drawing any conclusion.
- **The isolation scripts and the backup scripts** were not audited, as before.

## What this addendum does not establish

- **It is not the independent verification** the separation decision requires. The review pack is written for that, and pins the commit that adds this addendum.
- It authorises no refactor, code move, migration or contract change.
- It admits no capability, and changes no control's status, Gate D or WP05.
- It does not bear on `PH2-SEC-RESTORE-FUNCTION-GRANT-01` (WP04), whose reconstruction root cause remains open, on a separate governance track.
