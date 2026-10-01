# Internal dry run of review pack version 2 — ChatGPT — 2026-10-01

**Read-only evidence. Nothing in this file is edited after commit.**

| | |
|---|---|
| **What it is** | The report of a second internal dry run of `governance/review-packs/AAB-PLATFORM-DEPENDENCY-AUDIT-REVIEW-PACK-V2/`, carried out by an external AI system (ChatGPT) |
| **Result it reports** | INTERNAL TECHNICAL RESULT: VERIFIED FOR DEFINED SCOPE; 43 PASS, 0 FAIL, 0 EVIDENCE REQUIRED; no new finding |
| **Status** | **Internal. Not independent.** It states that it is not organisationally independent of the prior AAB work, and **does not discharge the requirement for a signed review by an independent human reviewer** |
| **Provenance** | Reported to the Platform Owner, and supplied by the Platform Owner in the session of 2026-10-01. Recorded below verbatim, as supplied, in a text block so that nothing is reformatted; tables arrived with their columns separated by tabs |
| **Recorded by** | Claude (Claude Code), at the Platform Owner's instruction |

## The report, as supplied

```text
Audit conclusion
INTERNAL TECHNICAL RESULT: VERIFIED FOR DEFINED SCOPE
- Checklist: 43 PASS
- FAIL: 0
- EVIDENCE REQUIRED: 0
- New unrecorded dependency violations: none found
- Repository changes made: none
- Existing systems modified: none
Important limitation: I am not organisationally independent of the prior AAB work. Therefore, this is a strong technical dry run, but it does not replace the signed independent review required by AAB governance.
Exact baseline examined
Item	Verified value
Repository	AdvancedAgricultureBiometrix/aab-source-of-truth
Review pack	Platform Dependency Audit Review Pack V2
Pinned commit	a797f54f26bb8a8f1a35f3cc7e1b2b92ba4e2afa
Pinned tree	d7cad697b7bc417aca065a5acae709d10db1c1b0
Pack-issuing commit	b7ae4c90d3eab30bbdf79b89d6a5dcd43b43f94b
Current main when cloned	4a652544722d2f4cd4d1bb83175e3fd651057eaf
Node	v24.19.0
Git	2.51.1
Independent analyzer	dependency-cruiser 18.4.0, TypeScript 5.9.3


The review used a fresh public clone. The pinned checkout was clean, and scs-pilot/ was identical to the code examined by the addendum.
Integrity and reproducibility
The review pack manifest passed completely. All four supplied tools were byte-identical to the canonical audit tools.
The preserved audit evidence also passed its SHA-256 verification.
I regenerated the three principal outputs:
Evidence	SHA-256	Result
Import graph	f8cb995bfbc90aaa5a7cc2581e96aba25070c11657a82e50aba18d03334446e5	Exact match
Boundary edges	77a87e56cc5e4afa4f94f4162d0b4b31fbc739638adfc6288aed99702b0afba6	Exact match
Corrected vocabulary scan	37cf633e4827dec981bcc15b09aeccfea5d1d29c07699de9fca21bed04e148de	Exact match


Dependency inventory
The reported inventory reproduced correctly:
- 340 files
- 188 TypeScript/module sources
- 124 production sources
- 64 test files
- 49 platform production modules
- 18 platform tests
- 66 SCS-domain production modules
- 3 SCS-domain tests
- 1 mixed schema registry
- 2 composition roots
- 0 unresolved imports
An independently installed analyzer found:
- 352 analyzed modules
- 1,553 dependencies
- exactly 17 relevant boundary edges
- no additional platform-to-domain import edges
- no analyzer errors
Those 17 edges were exactly:
- 1 production platform → SCS-domain edge: V1
- 10 production platform → mixed-registry edges: V2
- 6 platform-test → mixed-registry edges: V2
No platform test imported SCS-domain code.
V1–V13 verification
Every recorded violation was located and verified.
Finding	Verification result
V1 — integrity tool imports SCS code and queries SCS tables	Verified
V2 — platform imports the mixed all-domain schema registry	Verified
V3 — closed capability identifiers and boundary flags	Verified
V4 — receipt mechanism knows overallState	Verified
V5 — platform constraints naming SCS identifiers	Verified, including partial relief
V6 — platform routes under /scs/v1	Verified in code and contracts
V7 — database guard hard-codes scs	Verified
V8 — platform tables remain in the scs schema	Verified as the recorded decision
V9 — SCS names remain in platform-side code/schemas	Verified, including documented naming exceptions
V10 — link validity rule couples platform logic to an SCS contract	Verified
V11 — SCS code implements platform link behaviour	Verified
V12 — four platform primitives remain implemented through SCS code	Verified; contracts now exist, extraction has not occurred
V13 — key registry knows and reads the two SCS link tables	Verified completely


V13 was verified across all five forms:
- direct SQL reads;
- platform type definitions;
- call sites;
- published platform schemas;
- database constraints.
Its 24 relevant references reproduced correctly:
- 16 in platform code/types/schemas;
- 8 in platform database constraints.
The 28 additional domain-table references in roles-rls.sql were inspected and correctly classified as capability access/grant declarations, not platform runtime dependencies.
Beyond-the-list search
I did not rely solely on the supplied scanner.
I performed broader searches for:
- agricultural and supply-chain vocabulary;
- SCS identifiers and role names;
- table, function, view and schema references;
- dynamic or computed imports;
- direct environment-variable access;
- SQL references beyond the listed vocabulary;
- platform modules added after the original audit;
- platform-to-domain semantic coupling without an import edge.
The wider search produced 54 raw candidate references. They reduced to:
- V1 integrity checks;
- V3 identifiers and flags;
- V4 overallState;
- V8 platform-table placement;
- V13 link-table dependencies;
- comments, examples and explanatory strings.
No V14 or other missing dependency class was established.
Scanner completeness
The corrected V2 scanner successfully closed the weakness that caused Review Pack V1 to fail.
It independently derived:
- 32 unique SCS domain tables;
- from 32 current-state cap-*.sql declarations;
- with no duplicate or missing derived table.
It then detected domain-table names both with and without the scs. prefix and inspected the relevant platform database files. That is why V13 is now machine-detectable.
Eleven platform primitives
The separation assessment for all eleven primitives matches the source:
1. Canonical runtime schemas — registry coupling remains.
2. Identity and authority — mostly separated, with registry/naming and V13 coupling.
3. Immutable evidence objects — code separated; placement and route coupling remain.
4. Provenance — contract now exists; implementation remains distributed through SCS.
5. Admission decisions — contract now exists; implementation remains distributed.
6. Frozen evaluation snapshots — contract exists; implementation remains entangled.
7. Attributable human review — contract exists; implementation remains entangled.
8. Governed package compilation — rendition mechanism is mostly separated.
9. Receipts and auditability — closed identifiers and outcome coupling remain.
10. Country isolation — mechanism is separated, while names remain coupled.
11. Backup and reconstruction — integrity verification still imports SCS code.
The extraction sequence does not contradict these findings. Amendment 1 correctly joins V11 and V13 around the future link-store interface.
Important interpretation
“Verified” does not mean the dependency violations have been fixed.
It means the audit now appears to accurately and completely describe the platform/domain coupling at the pinned commit.
V1–V13 remain recorded extraction concerns. In particular:
- V13 remains open.
- No extraction is authorised by this audit.
- No AGR code is authorised merely by this result.
- No capability is admitted.
- Gate D is not satisfied.
- Country commissioning is unaffected.
Limitations
The stated limitations are honest and materially complete. This review cannot establish:
- runtime-generated SQL not visible through static inspection;
- behaviour under load;
- actual deployed-database state or manual privilege drift;
- undisclosed consumers relying on existing SCS names;
- whether a future extracted package behaves identically;
- full compliance with the separate identity doctrine;
- behaviour of the not-yet-built platform-control-plane issuer;
- security of third-party dependencies;
- country commissioning, Gate D, WP04 or WP05 status.
One additional practical qualification applies: the corrected table scanner derives tables from conventional CREATE TABLE scs.… declarations in the capability schema files. Future unconventional SQL generation, dynamically constructed identifiers, domain views or functions would require separate detection rules. This does not invalidate the current result because I also conducted broader source and SQL searches.
Governance result
This audit supports the following statement:
The audit, addendum and Amendment 1 accurately and completely record, for the defined static repository scope and pinned commit, the identified dependencies of the platform implementation on the SCS domain.

But I cannot provide the required independent person’s declaration or signature. A qualified external reviewer should repeat the issued pack and sign the finding before AAB treats the governance requirement for independent verification as formally discharged.
Preserved conclusions:
COMMISSIONING OUTCOME: NOT AUTHORISED
RECONSTRUCTION ROOT CAUSE REMAINS OPEN
WP05: NOT AUTHORISED / NOT STARTED
```

## What this record does not establish

- It is not the independent verification the separation decision's rule 3 requires, and does not discharge it.
- It authorises no extraction, AGR code, capability admission, Gate D qualification or commissioning.
- It changes neither review pack, and no finding.
