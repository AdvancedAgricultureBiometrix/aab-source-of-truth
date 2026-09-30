# AAB Platform Dependency Audit — Amendment 1 — 2026-09-30

**Status:** INTERNAL REVIEW COMPLETE, INDEPENDENT VERIFICATION REQUIRED
**Amends:** `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md` (the audit) and `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md` (the addendum). Both stand as written, read with this amendment.
**Does not change:** the independent review pack, version 1 (`governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK/`), which is immutable. A new pack version or pack amendment follows this amendment, and the independent reviewer assesses the original evidence and this amendment together.
**The code:** unchanged. `scs-pilot/` at the commit that adds this amendment is identical to `405fbe8`, the code the addendum examined.
**Authority:** RECORDS A NEW FINDING (V13), CORRECTS THREE STATEMENTS IN THE ADDENDUM, AND CORRECTS THE VOCABULARY SCANNER. Authorises no refactor, code move, migration or contract change. Admits no capability, and changes no control's status, Gate D or WP05.

**Independence: this amendment is not independent, and says so.** It was written by the same agent (Claude, Claude Code) that wrote the audit, the addendum, the key registry and the scanner. It is the internal response to a finding.

## Why this amendment exists

**An internal dry run of review pack version 1 produced NOT VERIFIED.** Every reproduction step passed, and every digest matched. The dry run's own search beyond the listed vocabulary (checklist item C3) found that the platform key registry names two SCS domain tables, `actor_party_link` and `actor_party_link_status`, in platform code, published platform schemas and platform table constraints, and reads them. Neither the audit nor the addendum records this. So items **C3 (beyond the list) and K2 (completeness) failed,** and the pack's rule (any FAIL → NOT VERIFIED) gave **NOT VERIFIED.**

**That is the correct result under the pack's rule.** The review machinery passed; the completeness check found what the machinery could not. This amendment and the scanner correction are the response. The dry run was internal: it is not the independent verification, which has not begun.

The dry run's recorded evidence digests: reproduced import graph `f8cb995bfbc90aaa5a7cc2581e96aba25070c11657a82e50aba18d03334446e5`, boundary edges `77a87e56cc5e4afa4f94f4162d0b4b31fbc739638adfc6288aed99702b0afba6` and vocabulary scan `f24eb02e9d71afd396c8cabeee063d1aabba7f6f97d7ee1a0c1aa2ac6cc59a7a` (each equal to the addendum's evidence); dependency-cruiser output `def15fa27f83b52c6695f5301828fa4c8203417ce8dca1f6f433584e4eda16bf`; deep-check output `a096f8a0b77c0936f6f1b2610b837a0baf4d0030c758b56bf157e2023e375bf9`; new-finding evidence `8c5e20bcc3799fc785aad12b779d1262b4824022b4e501e157ca63b6597d45ed`.

## V13: the platform key registry knows SCS-CAP-02's link tables by name, and reads them

`actor_party_link` and `actor_party_link_status` are **SCS domain tables**: SCS-CAP-02's actor–party links and their status records, created by `scs-pilot/packages/db/migrations/021_cap_02_actor_party_links.sql`. The platform key registry (AAB-PLATFORM-09) depends on them by name in five ways. All paths are relative to `scs-pilot/packages/`.

| Kind | Location | What |
|---|---|---|
| **SQL reads of domain tables** | `api/src/platform/key-registry/compromise-store.ts:206–212` | Selects the signer, signing key and time from `scs.actor_party_link` (line 207) and `scs.actor_party_link_status` (line 211), to find which key signed a record |
| **A closed platform type** | `api/src/platform/key-registry/store.ts:30–31` | `SignedRecordTable` lists both names |
| | `api/src/types/key-registry.ts:671–672` and `765–766` | Generated from the schemas below |
| **Call sites** | `api/src/platform/key-registry/signed-records.ts:39` and `:44` | Pass `"actor_party_link"` and `"actor_party_link_status"` as the record's table |
| **Published platform schemas** | `api/src/schemas/platform/key-assessment-decision.schema.json:38–39` | `recordTable` enum |
| | `api/src/schemas/platform/key-assessment-statement.schema.json:26–27` | `recordTable` enum |
| **Constraints on platform tables** | `db/migrations/023_platform_key_registry.sql:605` | `key_verification_evidence_record_table_ck` |
| | `db/migrations/023_platform_key_registry.sql:700–702` | `key_compromise_assessment_record_table_ck` |
| | `db/schema/key-registry.sql:589` and `:684` | The same two constraints, in the current-state file |

**Why it is a new finding, and not an existing one:**
- **Not V9.** V9 is SCS naming of *platform* things (`ScsFailure`, `SCS-PLATFORM`, `urn:aab:scs:`, the schema name `scs`). Here the platform refers by name to *domain* objects and reads their contents. Renaming would not remove the dependency.
- **Not governed by AAB-PLATFORM-04.** AAB-PLATFORM-04 leaves link storage to the domain ("the link store and status records in the SCS pilot"). The audit's V11 remedy puts the platform behind "a link store interface", with "the tables" left to the domain. AAB-PLATFORM-04 does not permit the platform to know the domain's tables; this bypasses its design. AAB-PLATFORM-09's contract names neither table.
- **Not V11.** V11 runs the other way: SCS code implementing platform link behaviour. V13 is platform code depending on SCS storage. Their remedies meet in the same link-store interface.
- **Not V1, V3 or V5,** though it has the shape of each: SQL on SCS tables (as in V1, which is the integrity tool only), a closed list of SCS identifiers in a platform type (as in V3, which covers capability identifiers), and platform-table constraints naming SCS identifiers (as in V5, likewise capability identifiers). Spreading it across three rows would scatter one coupling.

| # | Violation | Correct home | Fix |
|---|---|---|---|
| **V13** | The platform key registry knows SCS-CAP-02's link tables by name, in a platform type, published platform schemas and two platform-table constraints, and reads them directly | **Platform:** a registration of signed record kinds, each with the domain's means of finding a record's signer. **Domain:** SCS registers its two link kinds at start-up, with lookups over its own tables. The same pattern as V1's domain-registered integrity checks | **Code** (the type, the call sites, and the SQL behind a registered lookup); **a migration** (the two constraints, in a new migration: committed migrations are immutable); **a contract decision** (the schema enums are published, and the `record_table` values are stored). Under the naming decision, stored values keep their names; only the hard-coding goes |

**When it came in:** with the key registry, after the audit. Run on `eb9f338`, the corrected scanner finds no reference to an SCS domain table in platform code except V1's integrity-tool queries, which the audit recorded.

**The extraction plan:** step 3 (the platform link service, V11) and V13 share the link-store interface, and are best designed together. Step 4 moves `platform/key-registry/` with V13 either fixed first or carried as a registered dependency.

## Corrections to the addendum

**1. The vocabulary accounting.** The addendum's vocabulary table says of the `scs.` table references: "All 42 new are the key registry's queries … V8". **Two of the 42 are not platform tables:** `compromise-store.ts:207` (`scs.actor_party_link`) and `:211` (`scs.actor_party_link_status`) are SCS domain tables, and belong to V13. The scanner did find them; the addendum miscounted them under V8. **Corrected:** 40 are the key registry's queries of its own platform tables (V8); 2 are V13.

**2. The key registry's summary.** The addendum's summary says the key registry "is a clean platform module except for V2, V3 and V9: it imports no domain code". **The second half is true** (it imports no domain code); the first is not. **Corrected:** the key registry is a platform module with **V2, V3, V9 and V13.** It imports no domain code, but depends on SCS domain storage by name (V13). Likewise, the addendum's statement that "no new platform-to-domain edge has been introduced" holds for the import graph only.

**3. V1's line range.** The addendum gives V1's link queries as lines 153 to 159 of `ops/verify-integrity.ts`. **Corrected:** lines **153 to 162**, which include the status records' query at line 161.

## The vocabulary scanner, corrected

**The gap:** the scanner searched for SCS vocabulary by pattern: identifiers, `Scs…` names, and tables only with the `scs.` prefix. A domain table named without the prefix, as in a type, a schema enum or a constraint, could not be found, and the scanner did not read the database files at all. **This is a tool correction, not a change to any finding.**

**The correction** (`governance/tools/dependency-audit/vocab-scan.mjs`, SHA-256 `8d763a8cebc8edb62c4fdcde4be77055fa417671944780d8446bb4334ade24b2`; the version the addendum used was `9f66124d447de0f528b0e0aa5c79114f525acd2c1f56abf526b2d075543c2500`):
- **A new term, `DOMAIN_TABLE`.** The list of SCS domain tables is **derived, not written by hand:** every `CREATE TABLE scs.…` in the current-state capability schema files `scs-pilot/packages/db/schema/cap-*.sql` (32 tables at the pinned code).
- **Each is searched by its whole name, with or without the `scs.` prefix,** in platform-side source (code, types and platform schemas), and in the platform's database files: `db/schema/platform.sql`, `db/schema/key-registry.sql`, `db/schema/roles-rls.sql`, and every `db/migrations/*_platform_*.sql`. Database hits are reported as `database`; SQL comments are ignored.
- **Nothing else changes.** Every row the previous version produced is produced unchanged, at both `eb9f338` and `405fbe8`; only `DOMAIN_TABLE` rows and a count line are added.

**Its results** (`governance/audits/platform-dependency/2026-09-30-amendment-1/`):

| Where | At `eb9f338` | At `405fbe8` | Accounted for by |
|---|---:|---:|---|
| `ops/verify-integrity.ts` | 3 | 3 | **V1** (lines 121 to 123 and 153 to 162) |
| The key registry: code, types, schemas | 0 | 16 | **V13** |
| `db/migrations/023_platform_key_registry.sql`, `db/schema/key-registry.sql` | 0 | 8 | **V13** (the two constraints, each naming both tables) |
| `db/schema/roles-rls.sql` | 28 | 28 | **Not a violation** (below) |

**`roles-rls.sql` is recorded as not a violation, and why.** It is the current-state file of migration `004`: it creates the `scs_api` role, and grants on, and enables row-level security for, the seven tables that existed then (SCS-CAP-01's one and SCS-CAP-02's first six). Every later capability grants on its own tables in its own schema file. These grants are each capability's access to its own tables, placed in the role's file by migration order; no platform code reads them, and the role mechanism itself (primitive 10) names no domain table. At extraction, the current-state file may move them beside their capabilities; the committed migration is immutable.

| File | SHA-256 |
|---|---|
| `vocab-scan-v2-eb9f338.tsv` | `e6693515ad032b7c45fe0b7a161f4b834de70a393dbe890cacffd477c68640c1` |
| `vocab-scan-v2-405fbe8.tsv` | `37cf633e4827dec981bcc15b09aeccfea5d1d29c07699de9fca21bed04e148de` |

Deterministic on the machine that produced them (two runs each, byte-identical), as before.

## What follows

1. **A new review pack version, or an amendment to version 1,** pinned to the commit that adds this amendment, so that the reviewer has the corrected scanner and this amendment. Version 1 is not changed.
2. **The independent reviewer assesses both the original evidence and this amendment.**
3. **V13's fix** is extraction work, under the separation decision's rules; this amendment authorises none of it.

## What this amendment does not establish

- It is not the independent verification.
- It does not change review pack version 1, or the issued evidence of 2026-09-30.
- It authorises no refactor, code move, migration or contract change.
- It admits no capability, and changes no control's status, Gate D or WP05.
