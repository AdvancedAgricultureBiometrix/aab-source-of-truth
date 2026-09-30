# AAB Platform Dependency Audit — Independent Review Pack — Version 2 — 2026-09-30

**Status:** REVIEW PACK — ISSUED FOR INDEPENDENT VERIFICATION. Immutable once issued: a corrected pack is a new, separately dated pack, never a change to this one.
**For:** a qualified software and security architect, independent of AAB, with no prior knowledge of it.
**Produces:** exactly one of **VERIFIED FOR DEFINED SCOPE**, **NOT VERIFIED** or **EVIDENCE REQUIRED** (section 10). **Never PRODUCTION AUTHORISED.**
**Required by:** `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`, "Rules for extraction", rule 3.
**Supersedes, for the review:** version 1 (`governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK/`), which stays on record as issued. **Work from this version alone;** you do not need version 1.
**Why version 2:** an internal dry run of version 1 produced NOT VERIFIED on items C3 and K2: the platform key registry names and reads two SCS domain tables, and neither the audit nor its addendum recorded it. The audit's amendment 1 (`governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md`) records it as violation V13, corrects three statements in the addendum, and corrects the vocabulary scanner, which could not see domain table names written without the `scs.` prefix. This version is pinned to the commit that adds that amendment, and includes all of it.

**The pack's files** (this folder, `governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK-V2/`):

| File | What it is |
|---|---|
| `REVIEW-PACK.md` | This document: sections 0 to 10, and Annex A |
| `CONFLICT-OF-INTEREST-DECLARATION.md` | The declaration you complete before you begin (section 9) |
| `FINDINGS-TEMPLATE.md` | The record you complete as you review (section 8) |
| `tools/` | The four audit tools, byte-identical to `governance/tools/dependency-audit/` at the pinned commit |
| `MANIFEST.md` | The SHA-256 of every file above |

---

## 0. Orientation: how to use this pack

### What AAB is, in one paragraph

AAB is a software platform for turning a country's evidence into governed decisions. It is built as a **platform** of shared mechanisms (identity and authority, immutable evidence storage, receipts, frozen evaluations, human decisions, country isolation, backup) and **domains** that apply the platform to one field and supply its rules. The first domain built on it is **Supply Chain Sovereignty (SCS)**, which handles due-diligence evidence under the EU Deforestation Regulation. The code you will review is the SCS pilot's API: `scs-pilot/packages/api/src/`, in TypeScript. It was built first, so the platform's mechanisms were written inside it.

### Why this review exists

A governance decision of 2026-09-25 (the "separation decision") fixed three rules before any platform code may be moved out of the SCS pilot into a platform package that other domains can use:
1. **No refactor now.** Extraction waits until the SCS pilot is proven (it is) and the independent audit exists.
2. **Behaviour is preserved.** Every test and proof must pass unchanged after an extraction.
3. **An independent audit comes first:** "every place a primitive depends on the domain, and every place a domain depends on a primitive in an undeclared way".

A **dependency audit** was written on 2026-09-27; an **addendum** on 2026-09-30 brought it to the current code and committed its tools; and **amendment 1**, the same day, added violation V13, corrected three of the addendum's statements, and corrected the vocabulary scanner. **All three were written by the same AI agent (Claude, Claude Code) that wrote most of the code they audit.** They say so. They are the internal review. **You are the independent one.**

### The eleven platform primitives

The shared mechanisms the separation decision names: (1) canonical runtime schemas, (2) governed identity and authority, (3) immutable evidence objects, (4) provenance, (5) admission decisions, (6) frozen evaluation snapshots, (7) attributable human review, (8) governed package compilation, (9) receipts and auditability, (10) country isolation, (11) backup and reconstruction.

### The direction rule

**A domain may depend on the platform. The platform must never depend on a domain,** its identifiers or its vocabulary (the separation decision, "Dependency direction").

### What you are asked to do

Establish, independently and from the repository alone, whether the audit, its addendum and amendment 1 **accurately and completely** record where the platform side of this code depends on the SCS domain, at the pinned commit. Work through the checklist (section 7), record each item in the findings template (section 8), and choose the final statement (section 10).

### What you are not asked to do

Everything outside section 1's scope. In particular: whether the extraction plan is the right plan, whether the code is secure, whether any third-party package is safe, and anything about agricultural science, other domains or country commissioning.

### How to proceed without asking questions

**This pack is written so that you never need to ask the Platform Owner anything.** If something is unclear, missing, or cannot be determined from the repository and this pack, **record `EVIDENCE REQUIRED` for that checklist item, and name exactly what evidence would settle it.** Do not seek clarification: a question answered by the Platform Owner during the review would make the answer part of the evidence, and that evidence would not be independent.

**The only permitted contact** is administrative: obtaining read access to the repository, and returning your completed declaration and findings.

### Order of work

1. Complete and sign `CONFLICT-OF-INTEREST-DECLARATION.md`, and return it **before you begin.**
2. Read sections 1 to 5.
3. Run section 6's commands.
4. Work through section 7's checklist, recording each item in `FINDINGS-TEMPLATE.md`.
5. Choose the final statement by the rule in section 10, and sign.

---

## 1. Cover

| | |
|---|---|
| **Repository** | `https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth` |
| **Pinned commit** | `a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa` |
| **Tree of the pinned commit** | `d7cad697b7bc417aca065a5acae709d10db1c1b0` |
| **Code under review** | `scs-pilot/` at the pinned commit, which is identical to `scs-pilot/` at `405fbe8` (the commit the addendum examined) |
| **The audit** | `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md`, examining `eb9f338`, dated 2026-09-27 |
| **The addendum** | `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`, examining `405fbe8`, dated 2026-09-30. Status: INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED |
| **Amendment 1** | `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md`, dated 2026-09-30: V13, three corrections to the addendum, and the corrected scanner. Status: INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED |
| **The internal evidence** | `governance/audits/platform-dependency/2026-09-30/`: the tools' outputs at `eb9f338` and `405fbe8`, with `SHA256SUMS`; and `governance/audits/platform-dependency/2026-09-30-amendment-1/`: the corrected scanner's output at both, with `SHA256SUMS` |
| **Where this pack is committed** | On `main`, in a later commit that adds only this folder. The pinned commit does not contain the pack: you copy the pack out of its own commit, then examine the pinned commit (section 6.1; item A3) |
| **CI on the pinned commit** | GitHub Actions run `36674894727`: 752 of 752 tests, isolation, and backup-restore `PROVEN` (context only; not a checklist item, since the audit is static) |
| **Pack version and date** | Version 2, 2026-09-30. Supersedes version 1 for the review |

### The defined scope

**In scope:**
1. **The import graph** of `scs-pilot/packages/api/src/`: every import between its modules, and in particular every import from the platform side into the SCS domain or the mixed schema registry.
2. **Vocabulary couplings:** SCS identifiers, names, tables, routes and domain words in platform-side code, and SCS domain table names, with or without the `scs.` prefix, in platform-side code and the platform's database files.
3. **Database couplings reachable from platform code:** where platform tables are placed, and constraints on platform tables that name SCS identifiers or SCS domain tables, in `scs-pilot/packages/db/migrations/` `001` to `025` and the current-state files in `scs-pilot/packages/db/schema/`.
4. **Contract couplings:** the platform routes fixed under `/scs/v1` by AAB-PLATFORM-01 and 02 (V6), and the rule in AAB-PLATFORM-04 behind V10.
5. **The classification** of every module into the audit's categories, the thirteen recorded violations (V1 to V13), the "not violations", and the eleven-primitive separation table, **as amended by the addendum and amendment 1.**

**Out of scope, explicitly:**
- AGR and every other domain's capability contracts; agricultural science; country commissioning; Gate D; WP04 and WP05.
- Runtime behaviour, performance, and any deployed database or environment.
- The security of the code, and of any third-party package (Annex A records the packages for context only).
- Whether the extraction plan is the right plan. You check only that the plan does not contradict the violations as you find them (item H2).
- The isolation proof's scripts, the backup scripts, the CI workflow and the container images.

### What your result can and cannot do

- **VERIFIED FOR DEFINED SCOPE** satisfies rule 3 of the separation decision **for this pinned commit.** Starting any extraction remains the Platform Owner's decision, under rule 1.
- **NOT VERIFIED** or **EVIDENCE REQUIRED** means the audit, addendum and amendment must not be relied on for extraction until corrected and verified again.
- **No result is PRODUCTION AUTHORISED,** a security certification, an approval of the extraction plan, or an admission of any capability.

---

## 2. The dependency inventory

The complete inventory is in the audit, the addendum and amendment 1. This section states what you verify, with the expected values.

### 2.1 Module categories

Assigned by path (`tools/lib.mjs`, function `areaOf`):

| Category | Paths, relative to `scs-pilot/packages/api/src/` |
|---|---|
| **Platform** | `foundation/`, `platform/`, `ops/`, `migrations/`, `reference/`, `types/shared.ts`, `types/platform.ts`, `types/key-registry.ts`, `schemas/shared/`, `schemas/platform/`, `vendor.d.ts`; and the tests of the registry in `schemas/` |
| **SCS domain** | `capabilities/` (except `capabilities/index.ts`), `types/cap-*.ts`, `schemas/cap-*/` |
| **Mixed registry** | `schemas/registry.ts`: one registry of every platform and SCS schema |
| **Composition roots** | `index.ts` (wires platform and SCS); `capabilities/index.ts` (builds every SCS route) |
| **Test infrastructure** | `integration/` |

### 2.2 Expected counts at the pinned commit

| | Expected |
|---|---:|
| Files under `src/` | 340 |
| TypeScript and module sources | 188 |
| Production sources | 124 |
| Test files (`*.test.ts`) | 64 |
| Platform: production; tests | 49; 18 |
| SCS domain: production; tests | 66; 3 |
| Mixed registry | 1 |
| Composition roots | 2 |
| Test infrastructure: non-test files; test files | 6; 43 |
| Unresolved imports | 0 |

### 2.3 Expected boundary edges at the pinned commit

**Platform to SCS domain (production), one edge:**

| Edge | Violation |
|---|---|
| `ops/verify-integrity.ts:45` → `capabilities/cap-02/link-store.ts` | V1 |

**Platform to the mixed registry (production), ten edges, all V2:** `foundation/auth.ts:65`, `platform/renditions/routes.ts:26`, and `platform/key-registry/` `assessment.ts:24`, `bootstrap.ts:34`, `challenge.ts:20`, `compromise.ts:32`, `events.ts:25`, `notice.ts:22`, `register.ts:25`, `routes.ts:9`.

**Platform tests to the mixed registry, six edges, all V2:** `foundation/actor.test.ts:7`, `foundation/auth.test.ts:9`, `foundation/server.test.ts:9` (side-effect import), `schemas/generated-types.test.ts:22` (dynamic import), `schemas/request-uuids.test.ts:10`, `schemas/schemas-compile.test.ts:11`.

**No platform test imports SCS domain code.**

### 2.4 The violations

V1 to V12 are defined in the audit, section 2, and restated with their status and locations at the pinned commit in the addendum, "The violations at `405fbe8`", as corrected by amendment 1. **V13 is defined in amendment 1.** In summary:

| # | What | Status at the pinned commit (addendum; amendment 1) |
|---|---|---|
| V1 | The platform integrity tool imports SCS code and queries SCS tables | Unchanged; its link queries are at lines 153 to 162 (amendment 1's correction) |
| V2 | Platform modules import the registry of every schema | Grown: 10 production modules |
| V3 | The platform's capability-identifier type is a closed list | Unchanged in kind |
| V4 | The receipt mechanism knows SCS-CAP-06's `overallState` | Unchanged |
| V5 | Platform tables constrained to SCS identifiers | Partly relieved (migration `025`) |
| V6 | Platform routes under `/scs/v1`, fixed by contract | Unchanged |
| V7 | The database guard hard-codes the schema `scs` | Unchanged |
| V8 | Platform tables in the `scs` database schema | Unchanged, as decided |
| V9 | SCS naming in platform code | Unchanged; one decided exception |
| V10 | A platform function depends on an SCS contract rule | Unchanged |
| V11 | SCS code implements platform link behaviour | Unchanged in kind |
| V12 | Four primitives exist only as SCS code | Contract prerequisite met; code not moved |
| **V13** | **The platform key registry knows SCS-CAP-02's link tables (`actor_party_link`, `actor_party_link_status`) by name, in a platform type, published platform schemas and two platform-table constraints, and reads them** | **New** (amendment 1): came in with the key registry, after the audit |

### 2.4a Expected domain-table references

From the corrected scanner's `DOMAIN_TABLE` term (section 3.2; amendment 1, "The vocabulary scanner, corrected"):

| Where | Expected hits | Accounted for by |
|---|---:|---|
| `ops/verify-integrity.ts` (lines 123, 155, 161) | 3 | V1 |
| The key registry: `platform/key-registry/compromise-store.ts`, `signed-records.ts`, `store.ts`; `types/key-registry.ts`; the two `schemas/platform/key-assessment-*.schema.json` | 16 | V13 |
| `db/migrations/023_platform_key_registry.sql` (lines 605, 700) and `db/schema/key-registry.sql` (lines 589, 684), each naming both tables | 8 | V13 |
| `db/schema/roles-rls.sql` | 28 | Not a violation (section 4) |
| **Total:** production 19; database 36 | | |

### 2.5 The primitives

The separation of each of the eleven primitives: the audit, section 3, as amended by the addendum's summary and violation table, and by amendment 1 (the key registry, part of primitive 2, carries V13).

### 2.6 External packages

**Out of scope.** Recorded in Annex A for context only.

---

## 3. The audit method

### 3.1 What the internal review did

From the audit ("How the audit was done"), the addendum ("How this addendum was done") and amendment 1:
- **The import graph:** every `import … from`, `export … from`, side-effect `import "…"` and dynamic `import("…")` with a literal specifier, in every source under `src/`, resolved to its file. TypeScript sources import siblings with a `.js` extension; the file on disk is `.ts`.
- **The boundary edges:** every edge from a platform-side module to an SCS module or the mixed registry.
- **The vocabulary:** platform-side code, with comments removed, searched for SCS capability identifiers (`SCS-CAP-nn`), `SCS-PLATFORM`, `SCS-PILOT`, `Scs…` type names, `scs.` tables, `scs_` database names, `urn:aab:scs:` schema identifiers, `/scs/v1` routes, `SCS_` environment variables, the schema name `"scs"`, and domain words.
- **Domain table names** (amendment 1): every SCS domain table, derived from the current-state capability schema files `db/schema/cap-*.sql` (32 tables), searched for by its whole name, with or without `scs.`, in platform-side code and in the platform's database files (`db/schema/platform.sql`, `key-registry.sql`, `roles-rls.sql`, and every `db/migrations/*_platform_*.sql`), with SQL comments ignored.
- **The database:** every `CREATE TABLE` in the migrations, and the constraints of the platform tables.
- **The contracts:** AAB-PLATFORM-01, 02 and 04, where coupling is fixed by contract.
- **Static only:** nothing was run except the tools.

### 3.2 The tools

In `tools/` (and, byte-identical, in `governance/tools/dependency-audit/`). **Node built-ins only; nothing is installed.** Node 24 or later.

| Tool | Does |
|---|---|
| `lib.mjs` | Lists files; removes comments while keeping line numbers; assigns categories; resolves relative imports; orders by code point |
| `import-graph.mjs` | Writes the graph as JSON |
| `boundary-edges.mjs` | Lists the boundary edges from a graph, and counts every other direction |
| `vocab-scan.mjs` | Lists every vocabulary hit in platform-side code, and, as `DOMAIN_TABLE`, every SCS domain table named in platform-side code or the platform's database files. **Corrected by amendment 1:** the version the addendum used could not see a domain table written without the `scs.` prefix, and read no database file |

**Validated by the internal review:** run on `eb9f338`, the tools reproduce the audit's counts and its V1 and V2 locations exactly. **Deterministic** on the machine that produced the evidence (Windows, Node 24.19.0); not yet shown across operating systems.

**Their limits:** only literal import specifiers are seen; template literals are scanned one level deep; the vocabulary scan finds the listed terms only; imports of files outside `src/` are recorded as `outside-root` and not followed.

**Tool digests:** `lib.mjs`, `import-graph.mjs` and `boundary-edges.mjs` as the addendum's tool table states; `vocab-scan.mjs` as amendment 1 states (`8d763a8cebc8edb62c4fdcde4be77055fa417671944780d8446bb4334ade24b2`).

**These tools were written by the audit's author.** That is why section 6 also asks you to use an independent tool of your own choosing (item B4), and to search for couplings the tools cannot see (items B6, C3, K2).

---

## 4. The expected dependency boundaries

| From | To | Permitted? |
|---|---|---|
| SCS domain | Platform | **Yes.** The permitted direction |
| Composition roots | Platform and SCS | **Yes.** Wiring both together is their purpose |
| Platform | Platform | Yes |
| Platform | SCS domain code, identifiers or vocabulary | **No.** A violation unless recorded as a decided exception |
| Platform | The mixed registry | **No**, because it imports every SCS schema (V2) |
| Platform tables | Constraints naming SCS identifiers | **No** (V5) |
| Platform contracts | Routes under the SCS prefix | **No** (V6), except as decided below |
| Platform logic | An SCS contract rule | **No** (V10) |
| Platform code, platform schemas, platform tables | SCS domain tables, by name, or their contents | **No** (V13) |

**Decided exceptions,** recorded in governance before this review; you verify that the code matches them, not whether they are wise:
1. **What is already stored or externally visible keeps its SCS name; what is new takes an AAB name** (the audit, "Decisions recorded on 2026-09-27", decision 1): `SCS-PLATFORM` in error envelopes (for now); the `/scs/v1` platform routes (permanently, as aliases; new platform routes use `/aab/v1/`); the `scs` database schema (kept; platform tables stay in it); `urn:aab:scs:schema:` for existing schemas (new platform schemas use `urn:aab:schema:`).
2. **A new version of an existing schema is the existing schema** (the addendum, "Decision recorded with this addendum", 2026-09-30): it keeps its namespace. Only schemas new after 2026-09-27 must use `urn:aab:schema:`.

**Not violations**, as the audit records them: the composition roots; `capabilities/shared/representation.ts` and `capabilities/cap-02/subject-resolver.ts` depending on the platform; SCS modules depending on each other where the capability's contract or README declares it. **And, as amendment 1 records:** the grants and row-level security in `db/schema/roles-rls.sql` for the seven tables that existed when migration `004` created the `scs_api` role. They are each capability's access to its own tables, placed in the role's file by migration order; later capabilities grant on their own tables in their own files; no platform code reads them.

---

## 5. Known findings and limitations

### 5.1 In scope

- **V1 to V13,** as section 2.4 summarises, the addendum records, and amendment 1 adds and corrects.
- **A correction the addendum makes to the audit:** `foundation/server.test.ts:9` imported the registry at `eb9f338` and was not listed.
- **Corrections to the addendum,** all on `main` at the pinned commit:
  - its V8 row: migration `023` adds ten tables and **nine** functions to `scs`, not one (corrected in place on 2026-09-30, with a dated note);
  - its vocabulary accounting: of the 42 new `scs.` table references, 40 are the key registry's own platform tables (V8) and **2 are V13** (amendment 1);
  - its summary of the key registry: a platform module with **V2, V3, V9 and V13;** it imports no domain code, but depends on SCS domain storage by name (amendment 1);
  - V1's link queries: lines **153 to 162** (amendment 1).
- **The 21 platform production modules added since the audit:** the 18 modules of `platform/key-registry/`, `platform/evidence-objects/object-store-setup.ts`, `ops/object-store-setup.ts`, and the generated `types/key-registry.ts`.

### 5.2 Limits the internal review states

From the audit, section 6, and the addendum:
- SQL assembled at runtime (only literal SQL was searched);
- behaviour under load, and whether an extracted package builds and runs identically;
- any deployed database;
- who relies on the observable SCS names;
- the identity doctrine (ID-02, ID-03) behind AAB-PLATFORM-03;
- the platform-control-plane issuer, modelled but not issued;
- the isolation and backup scripts, the CI workflow and container images;
- the tools' own limits (section 3.2), and determinism across operating systems.

### 5.3 Related open items outside this pack's scope

**You neither verify nor clear these. No finding of yours changes their status.** They are listed so that you know they exist and are not part of this review.

| Item | Source | Status |
|---|---|---|
| `PH2-SEC-RESTORE-FUNCTION-GRANT-01` | `governance/phase-2/wp04/WP04_COMPLETION_RECORD.md` (WP04, security qualification) | **INSTANCE REMEDIATION VERIFIED; RECONSTRUCTION ROOT CAUSE REMAINS OPEN.** It concerns execute grants on 23 database functions in a restore-test environment of the rehearsal's database, a separate governance track (proposed WP05) |
| The platform contracts for the V12 primitives | AAB-PLATFORM-05 to 08 | Designed; their implementation is future work |
| A platform error-envelope contract | The audit, "Open items" | Not written; `SCS-PLATFORM` stays until it is |

---

## 6. Reproduction commands

**Environment:** a POSIX shell (Linux, macOS, or WSL on Windows), `git`, `sha256sum` (on macOS, `shasum -a 256`), and Node 24 or later. **No package installation is needed** for the tools. Record your operating system, `git --version` and `node --version` in the findings.

Each command's expected result is stated. **Where a result differs, the checklist item says what to record.**

### 6.1 Obtain the pack, then the pinned commit

The pack is committed after the pinned commit, so you take a copy of it first.

```bash
git -c core.autocrlf=false clone https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth.git aab-review
cd aab-review
PACKDIR=governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK-V2
PACKCOMMIT=$(git log -1 --format=%H origin/HEAD -- "$PACKDIR")
echo "$PACKCOMMIT"                                              # record this: the pack's issuing commit
git diff --name-only a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa "$PACKCOMMIT" -- . ":(exclude)$PACKDIR"
                                                                # expect no output: nothing but the pack was added
rm -rf /tmp/review-pack && mkdir -p /tmp/review-pack
git archive "$PACKCOMMIT" "$PACKDIR" | tar -x -C /tmp/review-pack --strip-components=3
P=/tmp/review-pack

git checkout --detach a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa
git rev-parse HEAD                 # expect a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa
git rev-parse 'HEAD^{tree}'        # expect d7cad697b7bc417aca065a5acae709d10db1c1b0
git status --porcelain             # expect no output
git diff --quiet 405fbe8 HEAD -- scs-pilot && echo SAME   # expect SAME
```

If you received the pack as files rather than from the repository, set `P` to where you put them, and check them against `MANIFEST.md` in 6.2; record how you received them.

### 6.2 Check the pack and the tools

```bash
sed -n '/^```sha256sums$/,/^```$/p' "$P/MANIFEST.md" | sed '1d;$d' > /tmp/pack.sha256
(cd "$P" && sha256sum -c /tmp/pack.sha256)                     # expect every file OK
for f in lib.mjs import-graph.mjs boundary-edges.mjs vocab-scan.mjs; do
  cmp "$P/tools/$f" "governance/tools/dependency-audit/$f" && echo "$f identical"
done                                                             # expect four "identical"
sha256sum "$P"/tools/*.mjs                                       # compare with section 3.2's tool digests
(cd governance/audits/platform-dependency/2026-09-30 && sha256sum -c SHA256SUMS)             # expect six OK
(cd governance/audits/platform-dependency/2026-09-30-amendment-1 && sha256sum -c SHA256SUMS) # expect two OK
```

### 6.3 Reproduce the graph, the boundary edges and the vocabulary

```bash
mkdir -p /tmp/review
node "$P/tools/import-graph.mjs" > /tmp/review/graph.json
node "$P/tools/boundary-edges.mjs" /tmp/review/graph.json > /tmp/review/boundary-edges.tsv
node "$P/tools/vocab-scan.mjs" > /tmp/review/vocab-scan.tsv
E=governance/audits/platform-dependency/2026-09-30
E1=governance/audits/platform-dependency/2026-09-30-amendment-1
sha256sum /tmp/review/graph.json /tmp/review/boundary-edges.tsv /tmp/review/vocab-scan.tsv
diff /tmp/review/graph.json          "$E/graph-405fbe8.json"            && echo "graph matches"
diff /tmp/review/boundary-edges.tsv  "$E/boundary-edges-405fbe8.tsv"    && echo "edges match"
diff /tmp/review/vocab-scan.tsv      "$E1/vocab-scan-v2-405fbe8.tsv"  && echo "vocabulary matches"
node -e 'const g=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify({files:g.files,countsByArea:g.countsByArea,unresolved:g.unresolved.length},null,1))' /tmp/review/graph.json
sed -n '/^# counts/,$p' /tmp/review/vocab-scan.tsv
grep DOMAIN_TABLE /tmp/review/vocab-scan.tsv                     # compare with section 2.4a
```

### 6.4 Cross-check with an independent tool

**Use a widely used, open-source dependency analyser of your own choosing,** not written by AAB. Record its name, version and exact command. Its purpose is to establish the boundary edges without relying on the audit's own tools. For example (verify the flags against the tool's current documentation; **this example has not been run by the pack's author,** since it installs packages from the npm registry, and every other command in section 6 has been run end to end on a fresh clone):

```bash
npx --yes -p typescript -p dependency-cruiser depcruise \
  --no-config --ts-pre-compilation-deps --output-type json \
  scs-pilot/packages/api/src > /tmp/review/independent.json
```

Then list, from its output, every import whose source is in a platform path and whose target is in an SCS domain path or is `schemas/registry.ts` (section 2.1). **Different tools resolve some imports differently,** such as type-only imports or JSON imports. **Agreement is required on the boundary edges only:** every edge in section 2.3 must be found, and no additional platform-to-domain or platform-to-registry edge may exist.

### 6.5 The database

```bash
M=scs-pilot/packages/db/migrations
grep -n "CREATE TABLE" $M/*.sql
grep -n "SCS-CAP" $M/*.sql
sed -n '/ADD CONSTRAINT decision_receipt_capability_id_ck/,/;/p' $M/025_platform_receipt_capability_namespaces.sql
sed -n 64p $M/018_cap_08_packages_and_renditions.sql
grep -n "CREATE TABLE scs\.\|CREATE FUNCTION scs\." $M/023_platform_key_registry.sql
```

### 6.6 The contracts and specific locations

```bash
grep -n "/scs/v1" governance/workstream-b/AAB-PLATFORM-01-*CANONICAL-CONTRACT*.md governance/workstream-b/AAB-PLATFORM-02-*CANONICAL-CONTRACT*.md
S=scs-pilot/packages/api/src
grep -n '"/scs/v1\|"/aab/v1' $S/platform/*/routes.ts
sed -n 120,140p $S/platform/actor-subject-links/links.ts
grep -n "CAPABILITY_IDS\|export type CapabilityId\|CAPABILITY_BOUNDARY_FLAGS\|class ScsFailure" $S/foundation/errors.ts
sed -n 28,70p $S/foundation/receipts.ts
sed -n 105,120p $S/foundation/db.ts; sed -n 200,206p $S/foundation/db.ts
sed -n 40,55p $S/ops/verify-integrity.ts; sed -n 105,165p $S/ops/verify-integrity.ts
grep -n "SCS-PILOT" $S/foundation/auth.ts
```

### 6.7 Couplings the tools cannot see

```bash
S=scs-pilot/packages/api/src
M=scs-pilot/packages/db/migrations
grep -rnE 'require\(|import\s+\w+\s*=\s*require|/// <reference' $S --include='*.ts'
grep -rnE 'import\(\s*[^"'"'"' ]' $S --include='*.ts'          # dynamic imports without a literal specifier
grep -rnE 'process\.env\.' $S/foundation $S/platform $S/ops $S/migrations
grep -rniE 'search_path' $S $M
```

### 6.8 Schema namespaces added since the audit

```bash
for f in $(git diff --name-only --diff-filter=A eb9f338 HEAD -- scs-pilot/packages/api/src/schemas); do
  printf '%s\t%s\n' "$(grep -o '"\$id": *"[^"]*"' "$f")" "$f"
done | sort
```

Expected: 44 schemas; 42 with `$id` in `urn:aab:schema:`, and 2 (`actor-subject-link-statement-v2`, `actor-subject-link-status-statement-v2`) in `urn:aab:scs:schema:`, as the decided exception.

---

## 7. The reviewer checklist

**Each item has exactly one outcome:**
- **PASS:** you established it, from the repository and this pack.
- **FAIL:** you established that it is not so. Record what you found as a new finding (`R-nn`).
- **EVIDENCE REQUIRED:** you could not establish it either way from the repository and this pack. Name the evidence that would settle it.

**Record every item** in `FINDINGS-TEMPLATE.md`, with the command or file you relied on. Where an expected value differs, record the value you obtained.

### A. The pinned commit and the pack

| # | Item | Pass when |
|---|---|---|
| A1 | The commit and its tree | `HEAD` and `HEAD^{tree}` equal section 1's values, and the working tree is clean (6.1) |
| A2 | The code is the addendum's and the amendment's | `scs-pilot/` is identical to `405fbe8` (6.1) |
| A3 | The pack is intact, and adds nothing else | Every file in `MANIFEST.md` verifies (6.2), and the pack's issuing commit differs from the pinned commit only inside the pack's folder (6.1) |
| A4 | The tools are the ones recorded | The four tools are identical to `governance/tools/dependency-audit/`, and their digests equal section 3.2's (6.2) |
| A5 | The internal evidence is intact | The six evidence files of 2026-09-30, and the two of amendment 1, verify against their `SHA256SUMS` (6.2) |

### B. The import graph

| # | Item | Pass when |
|---|---|---|
| B1 | Counts | The graph's counts equal section 2.2, with no unresolved import (6.3) |
| B2 | Reproduction | Your graph, boundary edges and vocabulary are byte-identical to the internal evidence; **or,** if they differ, you have compared contents and the only differences are ones that change no edge, count or hit (for example, ordering or line endings), and you record them |
| B3 | Boundary edges | Your boundary edges are exactly section 2.3: one production platform-to-domain edge, ten production and six test platform-to-registry edges, no platform test importing domain code (6.3) |
| B4 | Independent tool | Your independent tool finds every edge in section 2.3, and **no additional** platform-to-domain or platform-to-registry edge (6.4) |
| B5 | Classification | Having read `tools/lib.mjs` (`areaOf`) against sections 2.1 and 4, every file is in the right category, and none is unclassified |
| B6 | Import forms | Having read `tools/import-graph.mjs`, and run 6.7's first two searches, no import form in this code escapes the tool (such as `require`, `import x = require`, triple-slash references, or dynamic imports with a computed specifier), or every one that does is accounted for |
| B7 | `foundation/` is clean | No module in `foundation/` imports a module in `capabilities/` |

### C. Vocabulary

| # | Item | Pass when |
|---|---|---|
| C1 | Counts | The production counts per term equal the addendum's vocabulary table, and the `DOMAIN_TABLE` counts equal section 2.4a (6.3) |
| C2 | Accounted for | Every production hit is accounted for as the addendum's table states, as corrected by amendment 1: by a violation, by a decided exception (section 4), or, for one hit, as descriptive text. Check every term's files, not a sample |
| C3 | Beyond the list | Your own search, beyond the tool's terms, finds no SCS coupling in platform code that the audit, addendum and amendment 1 do not record. At least: SCS role names used in `capabilities/`, SCS column names, `search_path` (6.7), and SCS-specific environment variables |
| C4 | Naming decisions | The new platform routes are under `/aab/v1/`, and the schema namespaces added since the audit are as 6.8 expects (section 4, exceptions 1 and 2) |
| C5 | Domain tables | Every `DOMAIN_TABLE` hit is as section 2.4a states: V1, V13, or `roles-rls.sql`'s grants, not a violation. Having read `tools/vocab-scan.mjs`, the domain table list it derives is complete (compare with every `CREATE TABLE` in `db/schema/cap-*.sql`) |

### D. The database

| # | Item | Pass when |
|---|---|---|
| D1 | Placement (V8) | The platform tables, including the ten key-registry tables and nine functions of migration `023`, are in `scs`, as decided |
| D2 | Receipts (V5) | The receipt constraint, as migration `025` sets it, lists the SCS identifiers and accepts `CAP-NN` (not `CAP-29`) and `AAB-PLATFORM-NN` by pattern |
| D3 | Renditions (V5) | `rendition_source_ck` (migration `018`, line 64) accepts only `SCS-CAP-08` |
| D4 | No other constraint | No platform table has a constraint naming an SCS capability identifier other than D2 and D3 (V5), or an SCS domain table other than V13's two (6.5; section 2.4a) |

### E. Contracts

| # | Item | Pass when |
|---|---|---|
| E1 | V6 | AAB-PLATFORM-01 and 02 fix `POST /scs/v1/evidence-objects` and `GET /scs/v1/renditions/:renditionId`, and the code serves them at `platform/evidence-objects/routes.ts:69` and `platform/renditions/routes.ts:92` |
| E2 | V10 | `platform/actor-subject-links/links.ts:135` refuses a time before `validFrom`, and that rule is an SCS contract rule not stated by AAB-PLATFORM-04, as the audit says |

### F. Each violation

For each of V1 to V13: **it exists at the locations the addendum and amendment 1 state, at the pinned commit; its description is accurate; and the kind of fix the audit gives (code, migration or contract) is consistent with what you find.** One item each:

| # | Violation |
|---|---|
| F1 | V1: the integrity tool imports SCS code and queries SCS tables |
| F2 | V2: platform modules import the mixed registry |
| F3 | V3: the closed capability-identifier type and boundary flags |
| F4 | V4: the receipt mechanism's knowledge of `overallState` |
| F5 | V5: platform tables constrained to SCS identifiers (with D2 and D3) |
| F6 | V6: platform routes under `/scs/v1` (with E1) |
| F7 | V7: the database guard's hard-coded schema |
| F8 | V8: platform tables in `scs` (with D1) |
| F9 | V9: SCS naming in platform code, and the decided exceptions |
| F10 | V10: the platform link state and the SCS rule (with E2) |
| F11 | V11: SCS code implementing the platform link behaviour |
| F12 | V12: the four primitives implemented only in SCS code, and their platform contracts' existence (AAB-PLATFORM-05 to 08 in `governance/`) |
| F13 | V13: the key registry's dependency on SCS-CAP-02's link tables, at every location amendment 1 lists; and its classification as a new finding, rather than V1, V3, V5, V9, V11 or an AAB-PLATFORM-04 storage dependency |

### G to K. Consistency and completeness

| # | Item | Pass when |
|---|---|---|
| G1 | Not violations | The composition roots, and the SCS modules depending on the platform, are as the audit's "Not violations" states; none of `boundary-edges.tsv`'s "other" directions is a platform-to-domain edge |
| H1 | Primitives | The eleven-primitive table (the audit, section 3, as amended by the addendum and amendment 1) is consistent with your F results |
| H2 | Extraction plan | The extraction plan (the audit, section 5, as amended by the addendum and amendment 1) does not contradict the violations as you found them. You do not judge whether it is the right plan |
| I1 | New modules | Each of the 21 platform production modules added since the audit (section 5.1) is correctly classified, imports only platform modules, the mixed registry (V2) and external packages, and depends on SCS domain storage only as V13 records |
| J1 | The correction | `foundation/server.test.ts:9` imports the registry at the pinned commit and at `eb9f338`, and the audit did not list it |
| K1 | Stated limits | The limits in section 5.2 are stated honestly. Record any further limit you identify |
| K2 | Completeness | Taking everything above together, you have found **no** place where the platform side depends on the SCS domain, in code, vocabulary, database or contract, that the audit, addendum and amendment 1 do not record. **Any such place is a FAIL here, and a new finding** |

---

## 8. The findings record

**Use `FINDINGS-TEMPLATE.md`, exactly.** It asks for:
1. **Identification:** you, your organisation, the pack's version and the SHA-256 of `REVIEW-PACK.md`, the repository and pinned commit, your review dates, your environment (operating system, `git`, Node) and the independent tool with its version and command.
2. **The declaration:** a reference to your completed conflict-of-interest declaration.
3. **Every checklist item:** its outcome, the evidence (the command or file, and where its output is kept), and notes. Where you obtained a value different from the expected one, record the value.
4. **New findings:** `R-01`, `R-02` and so on, each with location, description, the checklist items it affects, and whether it would change the audit's recorded violations.
5. **Evidence required:** for each `EVIDENCE REQUIRED` item, exactly what would settle it.
6. **Further limits** you identified (K1).
7. **The final statement,** in section 10's exact words, with the result chosen by section 10's rule.
8. **Your signature:** name, date, and either a signed commit, a signed PDF, or another signature method you name.

**Keep your outputs:** `/tmp/review/` and your independent tool's output. Return them with the findings.

---

## 9. The conflict-of-interest declaration

**Complete `CONFLICT-OF-INTEREST-DECLARATION.md` and return it before you begin.** It asks you to declare:
- **Authorship:** that you have not written, reviewed or advised on any AAB code, contract, audit or governance record.
- **Financial interest:** any employment, contract, equity, loan or other financial interest in AAB, the Platform Owner, or any founding or partner institution, in the past 24 months; and the fee for this review, and who pays it.
- **Relationships:** any personal or professional relationship with the Platform Owner or any AAB contributor.
- **AI tools:** every AI tool you will use during the review, by name. **You, not a tool, are responsible for every outcome you record.** The audit's author was an AI agent (Claude, Claude Code); if you use the same tool, declare it.
- **Confidentiality:** that you will keep the repository and your findings confidential, except as the Platform Owner permits.
- **Anything else** a reasonable person might see as affecting your independence.

**What happens to it:** it is kept with your findings. Any declared interest is disclosed with the result. **Whether a declared interest disqualifies you is decided by the Platform Owner before you begin,** never during the review.

---

## 10. The required final statement

### 10.1 The rule

Choose exactly one, by this precedence:
1. **Any checklist item is FAIL** → **NOT VERIFIED.**
2. **Otherwise, any item is EVIDENCE REQUIRED** → **EVIDENCE REQUIRED.**
3. **Otherwise, every item is PASS** → **VERIFIED FOR DEFINED SCOPE.**

### 10.2 The exact wording

Copy the one you choose into the findings, completing the bracketed parts.

**VERIFIED FOR DEFINED SCOPE**

> I have independently reproduced the dependency graph of `https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth` at commit `a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa`, and worked through every item of the checklist in version 2 of the review pack. Within the defined scope in its section 1, the platform dependency audit of 2026-09-27, as amended by its addendum and its amendment 1 of 2026-09-30, accurately and completely records where the platform side of this code depends on the SCS domain, subject only to the limitations recorded in my findings. This is not a production authorisation, a security certification, or an approval of the extraction plan.

**NOT VERIFIED**

> I have independently examined the dependency graph of `https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth` at commit `a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa`, using version 2 of the review pack. Checklist items [list] failed. The platform dependency audit of 2026-09-27, as amended by its addendum and its amendment 1 of 2026-09-30, is inaccurate or incomplete within the defined scope, as recorded in findings [R-nn list]. It must not be relied on for extraction until corrected and verified again. This is not a production authorisation, a security certification, or an approval of the extraction plan.

**EVIDENCE REQUIRED**

> I have independently examined the dependency graph of `https://github.com/AdvancedAgricultureBiometrix/aab-source-of-truth` at commit `a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa`, using version 2 of the review pack. No checklist item failed. Checklist items [list] could not be determined from the repository and the pack; the evidence needed for each is recorded in my findings. The platform dependency audit, as amended by its addendum and amendment 1, must not be relied on for extraction until that evidence is provided and the items are verified. This is not a production authorisation, a security certification, or an approval of the extraction plan.

### 10.3 What each means

| Result | Means | Does not mean |
|---|---|---|
| **VERIFIED FOR DEFINED SCOPE** | Rule 3 of the separation decision is satisfied **for the pinned commit.** The Platform Owner may then decide, under rule 1, whether to begin extraction | That the code is secure; that the extraction plan is right; that any extraction preserves behaviour (rule 2 still applies to every step); anything about a later commit |
| **NOT VERIFIED** | The audit, addendum and amendment are wrong or incomplete in the ways recorded. They are corrected, and verified again | That the code is unsafe, or that the platform–domain separation is impossible |
| **EVIDENCE REQUIRED** | The listed evidence is needed before the result can be reached | A failure of the audit, or a verification of it |

**No result is PRODUCTION AUTHORISED.** None admits a capability, qualifies a deployment under Gate D, closes WP04 or WP05, or authorises any change to code, database or contract.

---

## Annex A. External packages — out of scope, for context only

**Not part of this review.** The dependency audit concerns dependencies between AAB's own modules. The third-party packages the API uses are recorded here so that you know they exist and why they are not in scope: **a supply-chain review of them is a separate piece of work.** Nothing in this annex is a checklist item.

From `scs-pilot/packages/api/package.json`, with the versions `package-lock.json` resolves (lockfile version 3; 144 packages in the lock, transitive dependencies included):

| Package | Declared | Resolved | Licence | Kind | Role in the code |
|---|---|---|---|---|---|
| `@aws-sdk/client-s3` | `^3.1140.0` | 3.1140.0 | Apache-2.0 | Runtime | The S3 client for the evidence object store (`platform/evidence-objects/object-store.ts`) |
| `ajv` | `^8.20.0` | 8.20.0 | MIT | Runtime | JSON Schema 2020-12 validation (`foundation/validation.ts`) |
| `ajv-formats` | `^3.0.1` | 3.0.1 | MIT | Runtime | Formats for `ajv` |
| `fontkit` | `2.0.4` | 2.0.4 | MIT | Runtime | Font handling for PDF renditions |
| `pdfkit` | `0.20.2` | 0.20.2 | MIT | Runtime | PDF rendering (`platform/renditions/renderer.ts`) |
| `pg` | `^8.23.0` | 8.23.0 | MIT | Runtime | The PostgreSQL client (`foundation/db.ts`) |
| `@types/node` | `^24.13.6` | 24.13.6 | MIT | Development | Type definitions |
| `@types/pg` | `^8.23.1` | 8.23.1 | MIT | Development | Type definitions |
| `json-schema-to-typescript` | `^16.0.0` | 16.0.0 | MIT | Development | Generates `types/` from the schemas |
| `pdfjs-dist` | `6.3.289` | 6.3.289 | Apache-2.0 | Development | Reads rendered PDFs in tests |
| `tsx` | `^4.23.15` | 4.23.15 | MIT | Development | Runs TypeScript in development and tests |
| `typescript` | `^7.0.2` | 7.0.2 | Apache-2.0 | Development | The compiler |

The import graph (section 3) records every import of these packages as `external: "package"`, and of Node's built-in modules as `external: "node-builtin"`. **None of them is a platform–domain boundary edge.**
