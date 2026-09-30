# Platform dependency audit evidence — amendment 1 — 2026-09-30

**Read-only evidence. Nothing in this folder is edited after commit.**

The corrected vocabulary scanner's output (`governance/tools/dependency-audit/vocab-scan.mjs`, SHA-256 `8d763a8cebc8edb62c4fdcde4be77055fa417671944780d8446bb4334ade24b2`), for `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md`:

| File | At |
|---|---|
| `vocab-scan-v2-eb9f338.tsv` | `eb9f338`, the audit's commit: from a `git archive` of `scs-pilot/packages/api/src` and `scs-pilot/packages/db` |
| `vocab-scan-v2-405fbe8.tsv` | `405fbe8`, the addendum's code, which is also the code at the commit that adds this folder |

Every row of the earlier scans in `../2026-09-30/` is in these files unchanged; only the `DOMAIN_TABLE` rows and a count line are added. Produced with Node 24.19.0. Check with `sha256sum -c SHA256SUMS` from this folder.
