# Manifest — AAB Platform Dependency Audit Independent Review Pack — Version 2 — 2026-09-30

The SHA-256 of every file in this pack except this manifest. The pack is immutable once issued: a corrected pack is a new, separately dated pack.

**Check it** from the pack's folder (`REVIEW-PACK.md`, section 6.2):

    sed -n '/^```sha256sums$/,/^```$/p' MANIFEST.md | sed '1d;$d' > /tmp/pack.sha256
    sha256sum -c /tmp/pack.sha256

The four files in `tools/` are byte-identical to `governance/tools/dependency-audit/` at the pinned commit `a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa`, and their digests equal those in the addendum (`lib.mjs`, `import-graph.mjs`, `boundary-edges.mjs`) and in `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-AMENDMENT-1-2026-09-30.md` (`vocab-scan.mjs`).

```sha256sums
8e5c624297804a52e53b2b794409f6b272cb475cff38317be335256502b25add  .gitattributes
1ca8df44f6c2cbd6235148d6821a3e579581e233756af27c6159cd91811e40a0  CONFLICT-OF-INTEREST-DECLARATION.md
32cade5ac45145829af31c7b5221889b68c2d77a9dbd0532b4876799da1aad2d  FINDINGS-TEMPLATE.md
e79bec2cee244941e19f49db836b38dc51a4a1f7d54632647f29e17e18beab30  REVIEW-PACK.md
a42b77ace08cc4aedf8533d7d0992e44c2a45b7fec2b87ce255247412d75794b  tools/boundary-edges.mjs
16b850852ccec91c8b98a51467b0a1e7b0096c47c9384cc8600e7b238adcc2d9  tools/import-graph.mjs
1904586fa825b23521550cff6911987b94304b42e090b21f6ccb1f509ae0d282  tools/lib.mjs
8d763a8cebc8edb62c4fdcde4be77055fa417671944780d8446bb4334ade24b2  tools/vocab-scan.mjs
```
