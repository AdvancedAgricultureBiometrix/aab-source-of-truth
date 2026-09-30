# Platform dependency audit tools

The tools behind `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`. They record the import graph of `scs-pilot/packages/api/src/`, the edges that cross the platform–domain boundary, and the SCS vocabulary in platform code.

**Node built-ins only:** nothing to install. Node 24 or later. Static: they read files and run nothing else.

## Use

From the repository root, at the commit being examined:

```bash
node governance/tools/dependency-audit/import-graph.mjs > graph.json
node governance/tools/dependency-audit/boundary-edges.mjs graph.json > boundary-edges.tsv
node governance/tools/dependency-audit/vocab-scan.mjs > vocab-scan.tsv
```

`vocab-scan.mjs` also takes the database root as a second argument (default: the source root's `../../db`).

Each tool takes the source root as an optional argument (default `scs-pilot/packages/api/src`), so an older commit can be examined from an extracted copy:

```bash
mkdir -p /tmp/at-eb9f338
git archive eb9f338 scs-pilot/packages/api/src scs-pilot/packages/db | tar -x -C /tmp/at-eb9f338
cd /tmp/at-eb9f338
node <repository>/governance/tools/dependency-audit/import-graph.mjs > graph.json
```

## What each tool does

| Tool | Output |
|---|---|
| `import-graph.mjs` | JSON: file counts, counts by category, every source file with its category, every import edge with its line and kind (`static`, `side-effect`, `dynamic`), and any unresolved import |
| `boundary-edges.mjs` | Tab-separated: every edge from platform code to SCS domain code (`PLATFORM->DOMAIN`) or to the mixed schema registry (`PLATFORM->REGISTRY`), production and test separately; then a count of every other direction; then any unresolved import, which must be none |
| `vocab-scan.mjs` | Tab-separated: every occurrence of the audit's SCS vocabulary in platform-side code, comments excluded, production and test separately; and, as `DOMAIN_TABLE`, every SCS domain table (derived from `db/schema/cap-*.sql`) named, with or without `scs.`, in platform-side code or the platform's database files, reported as `database` for the latter; then counts |
| `lib.mjs` | Shared: listing, comment removal that keeps line numbers, the categories, import resolution, ordering |

**The categories** are the audit's, assigned by path (`lib.mjs`, `areaOf`).

**Ordering is by code point,** never by locale, so the same input gives the same bytes on every machine. The outputs of 2026-09-30 were reproduced byte for byte on one machine; cross-platform determinism is not yet shown.

## Limits

- Only imports with a literal specifier are seen. An import built at runtime is not.
- Template literals are scanned one level deep for nested code.
- The vocabulary scan finds the terms it lists, not every possible coupling. **Corrected on 2026-09-30** (the audit's amendment 1): until then it searched tables only with the `scs.` prefix, and read no database file, so a domain table named bare, as in a type, a schema enum or a constraint, could not be found. `DOMAIN_TABLE` closes that gap. **Its own limit** (noted 2026-10-01): it derives the domain tables from conventional `CREATE TABLE scs.…` declarations in `db/schema/cap-*.sql`; a domain view or function, unconventionally generated SQL, or an identifier built at runtime needs a separate detection rule.
- Paths outside the source root (such as `scripts/`) are recorded as `outside-root`, not followed.

## Validation

Run on `eb9f338`, the commit the audit of 2026-09-27 examined, the tools reproduce its counts (154 sources: 101 production, 53 tests) and its boundary edges (V1 at `ops/verify-integrity.ts:37`; V2 at `foundation/auth.ts:62` and `platform/renditions/routes.ts:27`). The outputs are in `governance/audits/platform-dependency/2026-09-30/`.
