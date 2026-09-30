# Platform dependency audit evidence — 2026-09-30

**Read-only evidence. Nothing in this folder is edited after commit.** A later run is a new, separately dated folder.

The outputs of `governance/tools/dependency-audit/` at two commits, for `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`:
- **`eb9f338`,** the commit the audit of 2026-09-27 examined. These outputs validate the tools against the audit.
- **`405fbe8`,** the code the addendum examines.

| File | What it is |
|---|---|
| `graph-<commit>.json` | `import-graph.mjs` |
| `boundary-edges-<commit>.tsv` | `boundary-edges.mjs` over that graph |
| `vocab-scan-<commit>.tsv` | `vocab-scan.mjs` |

Produced with Node 24.19.0, from the repository root for `405fbe8`, and from a `git archive` of `scs-pilot/packages/api/src` at `eb9f338`. Check the files with `sha256sum -c SHA256SUMS` from this folder.
