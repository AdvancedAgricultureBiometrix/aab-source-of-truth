# AAB Platform Dependency Audit — 2026-09-27

**Status:** DEPENDENCY AUDIT — WORKING DOCUMENT — NOT THE INDEPENDENT AUDIT (see "Open items")
**Required by:** `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`, "Rules for extraction", rule 3: "Before any reorganisation, an independent audit must establish the actual dependency graph: every place a primitive depends on the domain, and every place a domain depends on a primitive in an undeclared way."
**Scope:** every TypeScript module in `scs-pilot/packages/api/src/` on `main` at `eb9f338` (154 files: 101 production modules, 53 test files), and the migrations, current-state schema files, backup scripts and platform contracts wherever a module's dependency reaches them.
**Addendum of 2026-09-30:** `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md` brings this audit to `main` at `405fbe8`, records what has changed for V1 to V12 and the new key-registry modules, corrects one omission, and commits the tools and their outputs. This audit stands as the record of `eb9f338`.
**Amendment 1 (2026-09-30):** `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md` adds violation V13, in code added after this audit, and corrects the vocabulary scanner.
**Authority:** RECORDS THE DEPENDENCY GRAPH AND PROPOSES AN EXTRACTION PLAN. Authorises no refactor, code move, migration or contract change. Admits no capability, and changes no control's status, Gate D or WP05.

**Independence: this audit is not independent, and says so.** It was carried out by the same agent (Claude, Claude Code) that built most of the code it audits, including the representation path (PRs #37 to #43) and one of the violations it records (V1). The separation decision asks for an independent audit. This document is offered as the complete working graph an independent auditor can verify, not as that audit. See "What this audit does not establish".

## How the audit was done

- **The import graph.** A script parsed every `import` and `export … from` in `src/` and resolved each relative path to its module. Every edge from a platform-side area (`foundation/`, `platform/`, `ops/`, `migrations/`, `reference/`) to an SCS-side area (`capabilities/`, `types/cap-*`, `schemas/cap-*`) is listed below, as are the edges through the shared schema registry and generated types.
- **Vocabulary.** Every platform-side module was searched for SCS identifiers (`SCS-CAP-nn`, `Scs…` names, `scs.` tables, SCS roles and domain words) and for SQL that names SCS tables.
- **The database.** Every `CREATE TABLE` in the 22 migrations, and the constraints of the platform tables, were read.
- **Contracts.** AAB-PLATFORM-01 to 04 were read wherever a module's coupling might be fixed by its contract.
- **Static only.** Nothing was run for this audit. What that leaves open is in section 6.

## Summary

- **The separation decision's central claim still holds for `foundation/`:** no foundation module imports a capability module.
- **It does not hold for the platform side as a whole.** One platform module imports SCS code directly (V1, `ops/verify-integrity.ts`), and two import the schema registry, which imports every SCS schema (V2).
- **The couplings are not only of naming and placement.** The decision expected naming and placement only, and asked the audit to confirm there were no others. There are others:
  - **Type level:** the platform's `CapabilityId` is a closed union of SCS identifiers, with SCS contracts' boundary flags. A second domain cannot be added without editing platform code (V3).
  - **Database level:** the platform tables `decision_receipt` and `rendition` have CHECK constraints that list SCS capability identifiers. A second domain cannot write a receipt without a migration of a platform table (V5).
  - **Contract level:** AAB-PLATFORM-01 and 02 fix their routes under `/scs/v1` (V6).
  - **Semantic:** a platform function depends on an SCS contract rule (V10).
- **Four of the eleven primitives exist only as SCS code:** provenance, admission decisions, frozen evaluation snapshots and attributable human review (V12). They have no platform contract. Extracting them is design work, not code movement.
- **The representation path is mostly clean.** ActorReference version 2, the signatures, the actor–subject link state, integrity and use checks, and the `SubjectResolver` interface import nothing from SCS. Two exceptions:
  - the link logic that AAB-PLATFORM-04 defines for every domain is implemented inside SCS handlers (V11);
  - the integrity tool reaches into the SCS link store (V1).

## 1. Module map

Categories, as asked:
- **Platform primitive:** a shared mechanism any domain should be able to use without inheriting SCS rules.
- **SCS domain:** supply-chain logic, EUDR rules, SCS capability contracts.
- **Boundary violation:** platform code that depends on SCS, or SCS code that implements a platform primitive. A module in this category is also given the category it belongs to.

Two further labels are used where neither category fits: **composition root** (wiring both together, by design) and **test infrastructure**.

### 1.1 `foundation/` (12 modules)

| Module | Category | Notes |
|---|---|---|
| `foundation/actor.ts` | Platform primitive | Reads either ActorReference version. Imports only generated shared types. Clean. |
| `foundation/auth.ts` | Platform primitive; **boundary violation** | Imports `schemas/registry.ts` (V2). Names: `deploymentScopeId` returns `SCS-PILOT-<country>` (line 132); validates as `SCS-PLATFORM` (lines 198, 270) (V9). |
| `foundation/canonical.ts` | Platform primitive | Clean. |
| `foundation/correlation.ts` | Platform primitive | Clean. |
| `foundation/db-errors.ts` | Platform primitive | Throws `ScsFailure`, typed by `CapabilityId` (V3, V9). |
| `foundation/db.ts` | Platform primitive; **boundary violation** | The startup guard hard-codes the schema name `scs` (lines 110–135); `application_name: "scs-pilot-api"` (line 204) (V7). |
| `foundation/errors.ts` | Platform primitive; **boundary violation** | `CAPABILITY_IDS` lists SCS-CAP-01 to 09 (line 18); `CapabilityId` (line 36); `CAPABILITY_BOUNDARY_FLAGS` holds each SCS contract's failure flags (line 44); `ScsFailure` (line 101) (V3, V9). |
| `foundation/idempotency.ts` | Platform primitive | SQL on `scs.idempotency_record` (lines 77, 114) (V8). |
| `foundation/receipts.ts` | Platform primitive; **boundary violation** | Knows SCS-CAP-06's `overallState` as an outcome field (lines 31–63); SQL on `scs.decision_receipt` (line 99) (V4, V8). |
| `foundation/server.ts` | Platform primitive | `Route.capabilityId: CapabilityId` (line 85), so every route is typed by the SCS list (V3); defaults to `SCS-PLATFORM` (lines 172, 302) (V9). |
| `foundation/signatures.ts` | Platform primitive | Ed25519 over canonical JSON. Imports only `canonical.ts`. Clean. |
| `foundation/validation.ts` | Platform primitive | Typed by `CapabilityId` and `ScsFailure` (V3, V9). |

### 1.2 `platform/` (8 modules)

| Module | Category | Notes |
|---|---|---|
| `platform/actor-subject-links/links.ts` | Platform primitive; **boundary violation** | Imports only platform and shared types. `deriveLinkState` refuses a time before `validFrom`, relying on an SCS-CAP-02 amendment rule (line 125) (V10). |
| `platform/actor-subject-links/use.ts` | Platform primitive | AAB-PLATFORM-04 section 3 use checks. Clean. |
| `platform/evidence-objects/object-store.ts` | Platform primitive | S3 client. Clean. |
| `platform/evidence-objects/routes.ts` | Platform primitive | Route `/scs/v1/evidence-objects` (line 69), as AAB-PLATFORM-01 fixes it (V6); type `ScsEvidenceObject` (V9). |
| `platform/evidence-objects/store.ts` | Platform primitive | SQL on `scs.evidence_object` (lines 27, 43) (V8). |
| `platform/renditions/renderer.ts` | Platform primitive | PDF rendering with the pinned fonts. Clean. |
| `platform/renditions/rendition.ts` | Platform primitive | SQL on `scs.rendition` (line 50) (V8); typed by `CapabilityId` (line 34) (V3). |
| `platform/renditions/routes.ts` | Platform primitive; **boundary violation** | Imports `schemas/registry.ts` (line 27) (V2). Route `/scs/v1/renditions/:renditionId` (line 92), as AAB-PLATFORM-02 fixes it (V6). Reader roles are injected by the caller, which is the right shape. |

### 1.3 `ops/`, `migrations/`, `reference/` (5 modules)

| Module | Category | Notes |
|---|---|---|
| `ops/verify-integrity.ts` | Platform primitive (backup and reconstruction); **boundary violation** | Imports `capabilities/cap-02/link-store.ts` (line 37); queries `scs.due_diligence_package` and SCS-CAP-08 receipts (lines 124–125), and `scs.actor_party_link` and SCS-CAP-02 receipts (lines 156–163) (V1). |
| `ops/object-store-archive.ts` | Platform primitive | Exports and imports every stored object. Clean. |
| `migrations/runner.ts` | Platform primitive | Generic runner. History in `scs_migration`; refuses `scs_api` (V9). |
| `migrations/cli.ts` | Platform primitive | Clean. |
| `reference/countries.ts` | Platform primitive | ISO 3166-1 reference data, used by SCS. Clean. |

### 1.4 Schemas and generated types (11 modules, 97 schema files)

| Module | Category | Notes |
|---|---|---|
| `schemas/registry.ts` | **Boundary violation** (mixed) | One registry for every schema: 11 platform and shared, 86 SCS. Imported by platform modules (V2). |
| `schemas/shared/*` (3), `schemas/platform/*` (8) | Platform primitive | ActorReference versions 1 and 2; the evidence object; the rendition parameters; the six AAB-PLATFORM-04 shapes. Every `$id` is in the `urn:aab:scs:schema:` namespace (V9). |
| `schemas/cap-01` to `cap-09/*` (86) | SCS domain | |
| `types/shared.ts`, `types/platform.ts` | Platform primitive | Generated. `ScsEvidenceObject`, `ScsRenditionPathParams` (V9). |
| `types/cap-01.ts` to `types/cap-09.ts` (8) | SCS domain | Generated. `cap-04` and `cap-05` use `cap-02`'s `ScsActingUnder` and `ScsRepresentationChecks`. |
| `vendor.d.ts` | Platform primitive | Ambient declarations. |

### 1.5 `capabilities/` (59 modules)

| Modules | Category | Notes |
|---|---|---|
| `cap-01/*` (4) | SCS domain | Framework registration. |
| `cap-02/` `register-party`, `register-relationship`, `register-mandate`, `register-role-claim`, `submit-evidence`, `record-verification`, `record-mandate-verification`, `mandate-verification-status`, `mandate-verification-store`, `rules`, `store`, `errors`, `routes` (13) | SCS domain | Parties, relationships, mandates, role claims, verification. |
| `cap-02/subject-resolver.ts` | SCS domain | SCS's implementation of the platform `SubjectResolver`. Correct direction. |
| `cap-02/link-store.ts` | SCS domain; **boundary violation** in part | Links are stored by the domain, as AAB-PLATFORM-04 requires. But `toLink` and `toStatusRecord` rebuild platform records generically, and the integrity tool imports them (V1, V11). |
| `cap-02/create-link.ts`, `record-link-status.ts`, `get-link.ts`, `link-routes.ts` | SCS domain; **boundary violation** | The creation rules, status rules, state, locking and read behaviour are AAB-PLATFORM-04's, for every domain, implemented here for SCS only (V11). The SCS policy in them is small: the role names, the 12-month maximum, the relation by party type, the mandate-verifier independence rule, and the third amendment's additions. |
| `cap-03/*` (5) | SCS domain | Plots. `geometry.ts` is also used by SCS-CAP-04: a declared dependency within the domain. It is a candidate shared geospatial module, not one of the eleven primitives. |
| `cap-04/*` (4), `cap-05/*` (4) | SCS domain | |
| `cap-06/*` (7) | SCS domain; **boundary violation** in part | `evaluate-sufficiency.ts`, `evaluate.ts` and `store.ts` implement primitive 6 (one snapshot, a manifest, a pure evaluation, content-derived ids) inside the requirement rules. `submit-conflict-resolution.ts` implements primitive 7 for SCS (V12). |
| `cap-08/*` (7) | SCS domain | Package compilation. It uses platform renditions correctly: `template.ts` is SCS, `renderer.ts` is platform. Imports `cap-09` for `validateForPackageCompilation`, a declared dependency within the domain. |
| `cap-09/*` (7) | SCS domain; **boundary violation** in part | `currency.ts` implements the platform's currency mechanism (derived at read time, never stored; append-only assessments) together with SCS's staleness rules (V12). |
| `capabilities/shared/representation.ts` | SCS domain | The eight representative checks read CAP-02 mandates and relationships: SCS policy over platform mechanisms. Correct direction. |
| `capabilities/index.ts` | Composition root (SCS) | Builds every SCS route, passing each only what it needs from the directory. |

### 1.6 Root and test infrastructure

| Module | Category | Notes |
|---|---|---|
| `index.ts` | Composition root | Wires platform and SCS; passes SCS-CAP-08's reader roles to the platform rendition routes (line 69). This is the right place for that knowledge. |
| `integration/harness.ts`, `object-store-harness.ts`, `pdf-text.ts` | Test infrastructure (platform) | Generic. |
| `integration/fixtures.ts` | Test infrastructure (SCS) | SCS request builders, and the expected ActorReference. |
| 53 `*.test.ts` | Test infrastructure | Not classified further. The platform unit tests (`foundation/`, `platform/`, `migrations/`) import no capability module directly; `foundation/actor.test.ts:7` and `foundation/auth.test.ts:9` import the schema registry, and so every SCS schema (V2). |

## 2. Boundary violations

"Fix" is what fixing the violation requires: a **contract** change, a **migration**, or **code** movement only. Rule 2 of the separation decision applies to every fix: all behavioural tests and proofs must pass unchanged. A fix that changes observable behaviour (a response field, a route, an error value) needs its own decision.

| # | Violation | Where | Correct home | Fix |
|---|---|---|---|---|
| **V1** | The platform integrity tool imports SCS code, and knows SCS tables and decision types | `ops/verify-integrity.ts:37` imports `capabilities/cap-02/link-store.ts`; lines 124–125 (SCS-CAP-08 packages and receipts); lines 156–163 (SCS-CAP-02 links and receipts) | Platform: the tool's generic checks (migrations, receipts, evidence objects, renditions). Domain: a check each domain registers with it (SCS: packages; links, using a platform `toLink` over a row shape the domain supplies). | **Code only.** The report's section names are unchanged, so the backup proof passes unchanged. Introduced in PR #43. |
| **V2** | Platform modules import the registry of every schema, SCS included | `foundation/auth.ts:62`, `platform/renditions/routes.ts:27` → `schemas/registry.ts`; also the platform tests `foundation/actor.test.ts:7` and `foundation/auth.test.ts:9` | A platform registry (shared and platform schemas) and a registry per domain, registered at start-up. The validator itself (`foundation/validation.ts`) is already neutral. | **Code only** (split the module; the generator config follows). |
| **V3** | The platform's capability identifier type is a closed list of SCS identifiers, with SCS contracts' boundary flags | `foundation/errors.ts:18` (`CAPABILITY_IDS`), `:36` (`CapabilityId`), `:44` (`CAPABILITY_BOUNDARY_FLAGS`); used by `server.ts:85`, `receipts.ts:28`, `renditions/rendition.ts:34`, `db-errors.ts`, `validation.ts` | Platform: an open, registered identifier and a registration of each capability's boundary flags. Domain: SCS registers its identifiers and flags. | **Code only**, if the envelope stays byte-identical. The flags are contract data, and move with the domain unchanged. |
| **V4** | The receipt mechanism knows SCS-CAP-06's `overallState` | `foundation/receipts.ts:31–63` | Platform: the caller passes the outcome explicitly (the `outcome` input already exists). Domain: SCS-CAP-06 passes its `overallState`. | **Code only.** Receipts stay byte-identical. |
| **V5** | Platform tables are constrained to SCS capability identifiers | `decision_receipt_capability_id_ck` (migration 005, lines 43–45; `schema/platform.sql:65–67`); `rendition_source_ck` (migration 018, line 64; `schema/platform.sql:200`) | Platform: a constraint that does not name a domain, for example a registered-capability table with a foreign key, or a format check. | **Migration**, a new one: committed migrations are immutable. A registered-capability table may also need a platform contract. |
| **V6** | Platform endpoints live under the SCS route prefix, fixed by the platform contracts | `platform/evidence-objects/routes.ts:69` (`/scs/v1/evidence-objects`); `platform/renditions/routes.ts:92` (`/scs/v1/renditions/:renditionId`); AAB-PLATFORM-01 line 34; AAB-PLATFORM-02 line 115 | A platform prefix, for example `/aab/v1/…` | **Contract** (AAB-PLATFORM-01 and 02), then code. A route change is an API change for every client, and so a behaviour change under rule 2. **Decided** ("Decisions recorded"): the `/scs/v1` platform routes are kept permanently, as aliases; new platform routes use `/aab/v1/`. |
| **V7** | The platform's database guard hard-codes the SCS schema | `foundation/db.ts:110–135` (schema `scs`); `:204` (`application_name`) | Platform: the schema or schemas to guard, passed as configuration. | **Code only.** |
| **V8** | Platform tables live in the SCS database schema | SQL in `receipts.ts:99`, `idempotency.ts:77,114`, `evidence-objects/store.ts:27,43`, `renditions/rendition.ts:50`, `renditions/routes.ts:45`; created by migrations 005, 012 and 018 | A platform schema (for example `aab`), or kept in `scs` by an explicit decision | **Migration** (`ALTER TABLE … SET SCHEMA`, grants, RLS, the append-only triggers) plus code. The backup proof compares row counts keyed by `schema.table`, so moving tables changes its report. **Decided** ("Decisions recorded"): the `scs` schema is kept; a second domain gets its own schema. The platform tables are not moved. |
| **V9** | SCS naming in platform code | `ScsFailure`; the capability id `SCS-PLATFORM` in every platform failure; `ScsEvidenceObject`; `urn:aab:scs:schema:` for every platform `$id`; `SCS-PILOT-<country>` deployment scope (`auth.ts:132`); `scs_migration` and `scs_api`; the `SCS_*` environment variables | Platform names | **Code only** for internal names (`ScsFailure`, type names). **Contract** for anything observable: `SCS-PLATFORM` appears in every platform failure envelope, schema `$id`s are published, `SCS-PILOT-` is in stored `authorityBasis` grants, and the environment variables are operator interface. Stored grants never change: version 1 and existing version 2 references keep their values. **Decided** ("Decisions recorded"): what is stored or externally visible keeps its SCS name; what is new takes an AAB name. |
| **V10** | A platform function depends on an SCS contract rule | `platform/actor-subject-links/links.ts:125`: `deriveLinkState` refuses a time before `validFrom`, because SCS-CAP-02's third amendment forbids recording a link before its validity starts | AAB-PLATFORM-04: either adopt "a link is valid when recorded" as a platform rule, or define a state for a link not yet valid | **Contract** (AAB-PLATFORM-04). Code is unchanged if the rule is adopted. |
| **V11** | SCS code implements the link behaviour AAB-PLATFORM-04 defines for every domain | `capabilities/cap-02/create-link.ts`, `record-link-status.ts`, `get-link.ts`, and `toLink` and `toStatusRecord` in `link-store.ts` | Platform: a link service parameterised by a link store interface, the domain's resolver, its creating and authority roles, its maximum period and its added rules. Domain: the tables, the store, the resolver, the role names and the SCS additions. | **Code only.** The contract already assigns the rules to the platform and storage to the domain. |
| **V12** | Four primitives exist only as SCS code | Primitive 6: `cap-06/evaluate-sufficiency.ts`, `evaluate.ts`, `store.ts`. Primitive 7: `cap-06/submit-conflict-resolution.ts`, `cap-09/submit-decision.ts`, `cap-09/currency.ts`. Primitives 4 and 5: the admission and provenance pattern in every admitting capability (CAP-02 to 05). | Platform, once each has a platform contract | **Contract first.** No platform contract defines provenance, admission decisions, snapshots or attributable decisions. Extracting them is design, which rule 2 treats as a redesign needing its own decision and evidence. |

**Not violations** (recorded, because they were checked):
- `index.ts` and `capabilities/index.ts` wire SCS knowledge into platform routes. That is their job as composition roots.
- `capabilities/shared/representation.ts` and `cap-02/subject-resolver.ts` depend on platform primitives. That is the permitted direction.
- `cap-04` → `cap-03/geometry.ts` and `cap-08` → `cap-09` are dependencies within the SCS domain, each declared in the capability's contract or README.
- The platform unit tests import no capability module directly. Two reach the SCS schemas through the registry, and are fixed with it (V2).

## 3. The eleven primitives

| # | Primitive | What was built | Separated? |
|---|---|---|---|
| 1 | Canonical runtime schemas | The validator (`validation.ts`) and generator | **Entangled, in one module.** The validator is neutral. The single registry mixes platform and SCS schemas (V2), and every `$id` is in the `scs` namespace (V9). |
| 2 | Governed identity and authority | `auth.ts`, `actor.ts`, `signatures.ts`; capabilities pass their own role names | **Mostly separated.** Imports are clean except the registry (V2). SCS names in scope ids and failure attribution (V9). Role policy correctly stays in the capabilities. |
| 3 | Immutable evidence objects | `platform/evidence-objects/` | **Separated in code; coupled by placement and contract.** Table in `scs` (V8); route under `/scs/v1`, fixed by AAB-PLATFORM-01 (V6). |
| 4 | Provenance | Recorded by each admitting capability, in its own columns | **Not a module.** Nothing to extract without a platform contract (V12). |
| 5 | Admission decisions | The admit, admit-with-limitations, fail-closed pattern, repeated in CAP-02 to 05 | **Not a module.** As 4 (V12). |
| 6 | Frozen evaluation snapshots | REPEATABLE READ is a platform route option (`server.ts`); the snapshot, manifest and content-derived ids are in SCS-CAP-06 | **Entangled.** The mechanism is inside the SCS requirement rules (V12). |
| 7 | Attributable human review | CAP-06 conflict resolution; CAP-09 decisions and currency | **Entangled.** No platform decision record; the currency mechanism is in `cap-09/currency.ts` (V12). |
| 8 | Governed package compilation | CAP-08 (SCS) over AAB-PLATFORM-02 renditions (platform) | **Rendition separated** except its table constraint (V5), table placement (V8) and route (V6). Compilation is SCS, as the decision classes it. |
| 9 | Receipts and auditability | `receipts.ts`, `idempotency.ts`, correlation, append-only triggers | **Coupled beyond naming.** `overallState` (V4), the closed capability list in code (V3) and in the database (V5), and table placement (V8). |
| 10 | Country isolation | The compose network, the edge, `scs_api` grants and RLS, the startup guard | **Mechanism separated; names coupled.** The guard hard-codes `scs` (V7); the role is `scs_api` (V9). RLS is `USING (true)` for every table, domain-neutral. |
| 11 | Backup and reconstruction | `backup/`, `ops/object-store-archive.ts`, `ops/verify-integrity.ts` | **Entangled in one module.** The integrity tool imports SCS code and checks SCS tables (V1). The archive tool and the backup scripts are neutral. |

## 4. The representation path

| Addition | Where | Clean? |
|---|---|---|
| ActorReference version 2 | `schemas/shared/actor-reference*.json`, `types/shared.ts`, `foundation/actor.ts`, `foundation/auth.ts` | **Yes, except V2 and V9.** `actor.ts` is clean. `auth.ts` imports the whole registry to reach two shared schemas (V2), and names the pilot's deployment scope `SCS-PILOT-` (V9). No SCS type is used. |
| Ed25519 signatures | `foundation/signatures.ts` | **Yes.** Imports only `canonical.ts`. |
| The `ActorDirectory` and `SigningKeyDirectory` interfaces | `foundation/auth.ts` | **Yes.** Domain-neutral; the SCS routes receive only what they need. |
| Actor–subject link records, digests, integrity, state | `platform/actor-subject-links/links.ts`, `schemas/platform/*`, `types/platform.ts` | **Yes in imports; one semantic dependency** (V10). |
| The use checks | `platform/actor-subject-links/use.ts` | **Yes.** |
| The `SubjectResolver` interface | `platform/actor-subject-links/links.ts` | **Yes.** SCS implements it (`cap-02/subject-resolver.ts`); the platform never reads CAP-02. |
| Link creation, status and read | `capabilities/cap-02/create-link.ts`, `record-link-status.ts`, `get-link.ts`, `link-store.ts` | **No: platform behaviour in SCS code** (V11). |
| Link integrity in the integrity tool | `ops/verify-integrity.ts` | **No: platform code importing SCS code** (V1). |
| Representative submission | `capabilities/shared/representation.ts` | **Correctly SCS.** Mandates and relationships are CAP-02 concepts. |

## 5. Extraction plan

The target is one platform package (for example `packages/platform`) that the SCS API depends on, and that AGR could depend on without inheriting SCS. The steps are ordered so that each is independently reviewable, and each keeps every behavioural test and proof passing unchanged (rule 2) unless it says otherwise.

| Step | What | Requires | Behaviour |
|---|---|---|---|
| 0 | **Decide what stays observable.** **Decided on 2026-09-27** ("Decisions recorded"): the SCS names are transitional, not permanent. What is already stored or externally visible keeps its SCS name; everything new takes an AAB name. | A decision (made) | — |
| 1 | **Remove the direct violations.** V1: domain-registered integrity checks, with `toLink` and `toStatusRecord` moved to the platform. V2: split the schema registry. V4: receipts take the outcome from the caller. V7: the guarded schema as configuration. | Code only | Unchanged |
| 2 | **Open the closed types** (V3): capability identifiers and boundary flags registered by the domain at start-up; `ScsFailure` renamed internally. | Code only | Unchanged, if envelopes stay byte-identical |
| 3 | **Make the platform link service** (V11): a store interface, and the AAB-PLATFORM-04 rules in the platform; SCS keeps its tables, resolver and policy. Settle V10 in AAB-PLATFORM-04 first. | Contract (V10), then code | Unchanged |
| 4 | **Move the modules into a package:** `foundation/`, `platform/`, `reference/`, `migrations/runner.ts`, the platform parts of `ops/`, the shared and platform schemas and types, and the platform test infrastructure. The SCS API depends on the package. | Code (build and workspace configuration) | Unchanged |
| 5 | **Free the platform tables from SCS identifiers** (V5). | A new migration; possibly a platform contract for registered capabilities | Unchanged for SCS |
| 6 | **Add the AAB names beside the SCS ones** (V6, V9), as step 0 decided: `/aab/v1/` for platform routes, with the `/scs/v1` routes kept permanently as aliases; `urn:aab:schema:` for new platform schemas only. `SCS-PLATFORM` stays in error envelopes until the platform envelopes have their own contract. | Contracts (AAB-PLATFORM-01 and 02 for the routes; a platform envelope contract for `SCS-PLATFORM`), then code | Additive: existing routes, identifiers and stored values are unchanged |
| 7 | **Not done** (V8), as step 0 decided: the `scs` database schema is kept, with the platform tables in it. A second domain gets its own schema. | — | — |
| 8 | **Primitives 4 to 7** (V12): write platform contracts for provenance, admission decisions, frozen snapshots and attributable decisions (with currency); then build them in the platform and move SCS onto them. | Contracts first; then code, and possibly migrations | A redesign under rule 2: its own decision and evidence for each |

**What must not be extracted:** mandates, relationships, the representative checks, the requirement catalogue, EUDR rules, package content, and each capability's role names, failure codes and boundary flags. They are SCS policy.

**Sizing, honestly:**
- Steps 1 to 4 are code movement over about 30 modules, with the test suite and backup proof as the guard.
- Step 5 needs a migration. Step 6 is additive and needs contracts. Step 7 is not done.
- Step 8 is the largest. It is design work, not extraction.

## 6. What cannot be determined here

- **Anything a static read cannot see:**
  - SQL assembled at runtime (none was found in platform code, but only literal SQL was searched);
  - behaviour under load;
  - whether an extracted package builds and runs identically: only step 4's CI run can show that.
- **A deployed database.** Objects created outside the migrations, grants changed by hand, or data already stored under the current names can only be found by inspecting a live environment.
- **Who relies on the observable names.** Whether any client, integration, report or institution depends on `SCS-PLATFORM`, the `/scs/v1` platform routes or the `urn:aab:scs` namespace cannot be known from the repository.
- **AGR.** The rehearsal application's code is not in this repository. Whether AGR's designed capabilities (CAP-04 and CAP-05) align with these primitives, which the roadmap also leaves open, cannot be assessed here.
- **The identity doctrine.** AAB-PLATFORM-03 cites ID-02 and ID-03. The contract catalogue references them; their full text was not audited. Whether the platform's identity primitive meets them in full is not established.
- **The platform-control-plane issuer.** `PLATFORM_CONTROL_PLANE` is modelled but nothing issues it. Its coupling cannot be audited until it exists.
- **The CI workflow and container images** were read only where the backup proof touches them. The isolation proof's scripts were not audited.

## Decisions recorded on 2026-09-27

Made in review of this audit, before it was committed.

1. **The observable SCS names are transitional, not permanent** (extraction plan, step 0). AAB's platform is not an SCS platform: SCS is one domain. But changing an observable name breaks every deployed environment and every institutional partner with stored records or integrated systems. So: **what is already stored or externally visible keeps its SCS name; everything new uses an AAB name.**

   | Name | Decision |
   |---|---|
   | `SCS-PLATFORM` in error envelopes | Kept for now. It changes when the platform's envelopes have their own contract. |
   | The `/scs/v1` platform routes | Kept permanently, as aliases. New platform routes use `/aab/v1/`. |
   | The `scs` database schema | Kept. A second domain gets its own schema. |
   | `urn:aab:scs:schema:` | Kept for existing schemas. New platform schemas use `urn:aab:schema:`. |

2. **Platform contracts for the four uncontracted primitives are the next governance priority** after this audit merges (V12): provenance, admission decisions, frozen evaluation snapshots, and attributable human review (with currency). They are AGR's foundation: without them, AGR cannot be built on the platform. No extraction of those primitives begins before its contract exists.

3. **The independence caveat stands exactly as written** ("Independence", above; "What this audit does not establish", below).

## Open items

- **An independent technical reviewer must verify this audit before any extraction begins:** the import graph (the script is reproducible), the vocabulary scan, and each violation. This does not prevent this document being used as a working document. It prevents it being treated as the final authority for extraction decisions.
- **The V12 platform contracts** (decision 2): the next governance work.
- **A platform error envelope contract**, before `SCS-PLATFORM` can change (decision 1).
- Everything listed under "What cannot be determined here".

## What this audit does not establish

- **It is not the independent audit** the separation decision requires. It was performed by the author of much of the code it audits. An independent auditor should verify the import graph (the script is reproducible), the vocabulary scan and each violation before the extraction plan is relied on.
- It authorises no refactor, code move, migration or contract change. The separation decision's rule 1 still applies.
- It does not size the extraction beyond the qualitative sizing in section 5.
- It admits no capability, and changes no control's status, Gate D or WP05.
