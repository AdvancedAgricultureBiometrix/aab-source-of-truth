# Manifest — AAB Platform Dependency Audit Independent Review Pack — Version 1 — 2026-09-30

The SHA-256 of every file in this pack except this manifest. The pack is immutable once issued: a corrected pack is a new, separately dated pack.

**Check it** from the pack's folder (`REVIEW-PACK.md`, section 6.2):

    sed -n '/^```sha256sums$/,/^```$/p' MANIFEST.md | sed '1d;$d' > /tmp/pack.sha256
    sha256sum -c /tmp/pack.sha256

The four files in `tools/` are byte-identical to `governance/tools/dependency-audit/` at the pinned commit `c91ce3349856865ce28fb37ead94b8997abcfa8c`, and their digests equal those in `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-ADDENDUM-2026-09-30.md`.

```sha256sums
8e5c624297804a52e53b2b794409f6b272cb475cff38317be335256502b25add  .gitattributes
ab3c146a83dbfb612e969c31903237e7dc2b862cd6f5bb76acb68aa4e5f91efc  CONFLICT-OF-INTEREST-DECLARATION.md
b288dd0854e18364e13ecfbc138930191fbf0dcd8b983c8e7454ab17110c4a81  FINDINGS-TEMPLATE.md
b811966d03a4813b47b83102b38b6a1a723f71971f432157701537026d9ef3da  REVIEW-PACK.md
a42b77ace08cc4aedf8533d7d0992e44c2a45b7fec2b87ce255247412d75794b  tools/boundary-edges.mjs
16b850852ccec91c8b98a51467b0a1e7b0096c47c9384cc8600e7b238adcc2d9  tools/import-graph.mjs
1904586fa825b23521550cff6911987b94304b42e090b21f6ccb1f509ae0d282  tools/lib.mjs
9f66124d447de0f528b0e0aa5c79114f525acd2c1f56abf526b2d075543c2500  tools/vocab-scan.mjs
```
