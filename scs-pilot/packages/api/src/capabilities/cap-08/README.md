# SCS-CAP-08 — Due Diligence Package Compilation

**Status: `requestCompilation` (`POST /scs/v1/due-diligence-packages`), `getPackage` (`GET /scs/v1/due-diligence-packages/:packageId`) and `verifyPackageIntegrity` (`GET /scs/v1/due-diligence-packages/:packageId/integrity`) are implemented for the pilot (contract 4b1f05b, 901a600 and 700c40a). A package's PDF rendition is produced at compilation and downloaded through SCS-PLATFORM-02 (`GET /scs/v1/renditions/:renditionId`). `listPackagesForOperator` and the evidence export bundle are deferred.**

Canonical contract: [`governance/workstream-b/SCS-CAP-08-DUE-DILIGENCE-PACKAGE-COMPILATION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-08-DUE-DILIGENCE-PACKAGE-COMPILATION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code here implements it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-08 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority. A compiled package is not a compliance certificate, a declaration or a submission.

## What is built

| File | What it does |
|---|---|
| `request-compilation.ts` | The gate (SCS-CAP-09 `validateForPackageCompilation`), the integrity checks, assembly, the rendition and the writes, in one REPEATABLE READ transaction |
| `assemble.ts` | The package content, a pure function of what was read; `packageDigest` is `sha256:` + the SHA-256 of its canonical JSON |
| `template.ts` | The package laid out for the SCS-PLATFORM-02 renderer |
| `read-package.ts` | `getPackage` (the envelope as stored, with currency beside it) and `verifyPackageIntegrity` (a verification result: always 200, every check reported) |
| `store.ts`, `errors.ts`, `routes.ts` | SQL, failure codes and routes; the routes are built with the object store (`index.ts`) |

Tests: `src/integration/cap-08-packages.test.ts` (every endpoint, through real endpoints and a real object store) and `rendition.test.ts` (the cross-platform rendition digest, on a fixed package).

## Vertical proof

**`MINIMUM_VERTICAL_SLICE_PROVEN` for SCS-CAP-08**, on the same standard as SCS-CAP-06: the capability runs end to end, honestly, over real admitted evidence, not that it reaches a best-case outcome. The proof was merged to `main` in PR #25 (`9f17cc2`; CI run 36228700962). It covers `requestCompilation`, `getPackage`, `verifyPackageIntegrity` and the rendition download; the operations not built are listed under "Open items". Each criterion is met by a named test:

- **A package compiles end to end from real records:** "full chain: framework → plot → evidence file → evaluation → decision → package and rendition, bound by digest, every gap disclosed" (`cap-08-packages.test.ts`), through the real endpoints, a real object store and real PostgreSQL, as `scs_api`.
- **Only a current, valid decision to proceed can be packaged:** "staleness blocks compilation: new evidence → REVIEW_DECISION_NOT_CURRENT; after re-evaluation and a superseding decision, the new decision compiles", and the two "gate:" tests.
- **The package is deterministic and bound by its digest:** "the same decision compiled again: a new package, the same digest; the earlier package is unchanged"; and in `rendition.test.ts`, "the same package renders to the same bytes every time" and "CROSS-PLATFORM: the rendition's SHA-256 is the stored expected value on this platform".
- **Every gap is disclosed:** the full-chain test checks the package's limitations and the evaluation's gaps; "completeness: every mandatory entry, Thai and Vietnamese text, and the digest on every page" checks the rendition.
- **Integrity is checked at compilation and verifiable afterwards:** the three `*_INTEGRITY_FAILED` compilation tests, and the seven "verifyPackageIntegrity:" tests (INTACT, and each kind of change detected).
- **The receipt is written atomically:** "receipt write fails → 500; no package, compilation record or rendition record; the decision can still be compiled".
- **The package survives backup and restore:** the backup-restore proof reads a restored package back byte-for-byte, verifies it INTACT and re-hashes its PDF (`governance/workstream-b/SCS-PILOT-BACKUP-RESTORE-PROOF-2026-09-26.md`).

This is a record of implementation proof only. SCS-CAP-08 remains PROPOSED_NOT_ADMITTED.

## Known inconsistency

`requestCompilation`'s response names the package envelope `package` (`{ decision, package, receipt, receiptDigest }`), while `getPackage` names it `envelope` (`{ envelope, currency }`, contract 700c40a). Both are as the contract states. Aligning them would change the already-built compilation response and its tests; it was judged not worth it for naming alone.

## Open items

- `listPackagesForOperator` and the evidence export bundle (specified in the contract, not implemented).
- A verification is not recorded; recording it as challenge evidence belongs to SCS-CAP-10.
- The contract's open gaps: bundle size, the operator's declaration, the authorised representative, failed attempts, languages and plot coverage.
