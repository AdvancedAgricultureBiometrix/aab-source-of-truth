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

## Known inconsistency

`requestCompilation`'s response names the package envelope `package` (`{ decision, package, receipt, receiptDigest }`), while `getPackage` names it `envelope` (`{ envelope, currency }`, contract 700c40a). Both are as the contract states. Aligning them would change the already-built compilation response and its tests; it was judged not worth it for naming alone.

## Open items

- `listPackagesForOperator` and the evidence export bundle (specified in the contract, not implemented).
- A verification is not recorded; recording it as challenge evidence belongs to SCS-CAP-10.
- The contract's open gaps: bundle size, the operator's declaration, the authorised representative, failed attempts, languages and plot coverage.
