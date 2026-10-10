# CAP-34 Proof Record Supersession Amendment

**Finding:** F-A of the AAB substance verification of 2026-10-11: four committed CAP-34 proof records were stale against the code they claim to prove.

**Authority:** remediation option A1 (controlled supersession), approved by the Platform Owner on 2026-10-11.

**Precedent and rule:** `governance/workstream-b/CAP-34-TEST-HARNESS-REPRODUCIBILITY-AMENDMENT-2026-09-20.md`, "Superseded evidence": *the standing rule against silent replacement of qualification evidence.*

**Classification:** evidence-currency correction.
- No manifest, roster, registry, snapshot, validator, simulation, disclosure-receipt or harness file is changed.
- No capability, pathway or fidelity classification changes.

## What was wrong

Commit `f3ef851` (2026-09-23, "CAP-34 manifest snapshot-008: refresh live-logic fixture counts") made these changes:
- moved the manifest from 1.6.0 / `CAP34-MANIFEST-2026-09-20-SNAPSHOT-007` to 1.7.0 / `…-SNAPSHOT-008`;
- moved the disclosure-receipt validator from 2.6.0 to 2.7.0;
- re-pinned the receipt-validator blob in the canonical end-to-end harness.

**Its message states that the harnesses were re-run** ("manifest 16/16, canonical end-to-end 44/44 (contract binding passed), pathway preview 8/8, historical snapshot validity 73/73, SCS roadmap preview 14/14, all exit 0"). **But the proof records those runs regenerate were not committed.**

From `f3ef851` until this amendment, the four records below described the code as it was at `0150428` (2026-09-21), not the committed code:

| Record | What the stale copy states | What the code at `df17e07` produces |
|---|---|---|
| Manifest validator | manifest 1.6.0, SNAPSHOT-007, `snapshotDigest` `sha256:94eb64ca7ba19e8c5e61e03f29fc3d7f20cc467ed8aed5ae22fe68a250bd252e` | 1.7.0, SNAPSHOT-008, `sha256:4ed009519ae2aaf524564d51044ae82e560cbcb2ab4d4b8ad55535a1551f8190` |
| Canonical end-to-end | receipt validator 2.6.0; the bound blob of `simulation/cap34/cap34-disclosure-receipt.js` is `f944b23c65c1347666b27da93cf5a86ebd567af4` | 2.7.0; `2974c3df3e3bdd4ade827f57cd8465dd48bb0775` |
| Pathway preview | SNAPSHOT-007, manifest 1.6.0, validator 2.6.0 | SNAPSHOT-008, 1.7.0, 2.7.0 |
| Historical snapshot validity | 57 fixtures, validator 2.6.0 | 73 fixtures, 2.7.0 |

**Correction of a historical statement.** The message of `f3ef851` says both:
- "snapshotDigest recomputed";
- and "snapshotDigest is computed over entries only, so it, the TRUSTED_SNAPSHOTS/registry digest and the receipt-validator blob pin are unchanged".

The second statement is wrong as to the snapshot digest:
- SNAPSHOT-007's `snapshotDigest` is `sha256:94eb64ca…252e`;
- SNAPSHOT-008's is `sha256:4ed00951…8190`;
- the entries changed (fixture counts), so the digest changed.

A commit message cannot be amended; this record is the correction. **Nothing else in `f3ef851` is reinterpreted.**

## Superseded evidence

Superseded, not silently overwritten. The antecedent blobs remain permanently retrievable from Git history: they are the blobs at `0150428`, unchanged through `df17e07`.

| Record (`governance/workstream-b/`) | Antecedent blob (`0150428` = `df17e07`) | Antecedent SHA-256 | Superseding blob | Superseding SHA-256 |
|---|---|---|---|---|
| `CAP-34-MANIFEST-VALIDATOR-BEHAVIOURAL-PROOF.json` | `18b26fe222f7e21e1cec70fe41201bcd2a4fc3c7` | `80f26d45576bd0a8fc68e0f247a6f74a37fac5a28a2c111d28f5e9e5b96cb7de` | `592edc17f2118d3b265d77b6ef1c176f15cc8332` | `534f3622f1612aecc9b5457e1204b6d0c54f0d070805680b54fd0a5df5aed7f9` |
| `CAP-34-CANONICAL-END-TO-END-BEHAVIOURAL-PROOF.json` | `427248b945600b034c7b2c6877390492f5dd25c6` | `630c61b8659a67791c96b624cb177a53209a7c88a04593517524a37359e3a273` | `f9d560dad129de4580c263920e8700c33ce1f252` | `70b474e8404c1152a08879db3bb5023da793661c0d545a1e74e32ca1f72092f8` |
| `CAP-34-PATHWAY-PREVIEW-BEHAVIOURAL-PROOF.json` | `59e30e29436f526c83afa0833c679e3abc023033` | `ce5475c7f21451bc921277fbeaf3311c0bf6cbaeb3bbc9ffef5715b94f5761b3` | `b25ee028c697eea8469ed8181a5a103af4f09e6a` | `6d717c8a3e1359e764186383dbc82cecdfc6ac42558f04684069f28ccabbe2d9` |
| `CAP-34-HISTORICAL-SNAPSHOT-VALIDITY-BEHAVIOURAL-PROOF.json` | `a509167bc94f8e2881d778dcf6c4c80b041a535f` | `602418f308be2d48c81e7cac81faf0d596b0c0214a0c5b0bebf5dc90de37eac2` | `c758c0b14de90ef8ff98c58c473205a83589ed23` | `52fde0f1996bca284170f8727fa499d3d3d666d5b88528334eceff693ab24345` |

## How the superseding records were produced

**The checkout:** a fresh clone of `github.com/AdvancedAgricultureBiometrix/aab-source-of-truth`, checked out detached at the pinned commit `df17e072d6d9c3af3df4bb0a2487358e0926727c`, with `core.autocrlf=false` and `core.longpaths=true`. No file in it was CRLF.
- `simulation/` and the harnesses are identical at `df17e07` and at the commit that adds this record.
- The four files the end-to-end harness binds by blob SHA are unchanged.

**The runs:** Node.js 24.19.0, Windows 11, run from `simulation/cap34`, in this order:

| Command | Exit | Result |
|---|---|---|
| `node capability-fidelity-manifest.behavioural-test.js` | 0 | `PASS_CAP34_MANIFEST_VALIDATOR_BEHAVIOURAL_PROOF`: 16/16 |
| `node cap34-canonical-end-to-end.behavioural-test.js` | 0 | `PASS_CAP34_CANONICAL_END_TO_END_BEHAVIOURAL_PROOF`: 44/44, contract binding passed (4/4 blobs) |
| `node cap34-pathway-preview.behavioural-test.js` | 0 | `PASS_CAP34_PATHWAY_PREVIEW_BEHAVIOURAL_PROOF`: 8/8 |
| `node cap34-historical-snapshot-validity.behavioural-test.js` | 0 | `PASS_CAP34_HISTORICAL_SNAPSHOT_VALIDITY_BEHAVIOURAL_PROOF`: 73/73 |

Exactly these four records changed in the clone. They were copied byte for byte (LF, no CR bytes) into this commit.

The other CAP-34 proof records (the five live-capability proofs and the SCS roadmap preview) **are not superseded and are unchanged**: regenerating them changes only `generatedAtUtc`.

**To verify:** at the commit that adds this record, run the same four commands. Each record must be reproduced byte for byte, except its `generatedAtUtc` (and, in the end-to-end proof, nothing else).

## Non-closure

This amendment brings four evidence records up to date with committed code. It must not be interpreted as:
- evidence that CAP-34 is complete, or that any Roadmap Preview pathway is implemented;
- evidence of scientific reasoning: the live-capability evaluators remain a synthetic, keyword-based simulation (finding F-H of 2026-10-11, unchanged);
- production readiness, sovereignty, admission or commissioning authority;
- Gate D satisfaction or WP05 commencement authority;
- closure of any qualification-evidence question beyond the currency of these four records.

**Not independent.** These records were regenerated by the same AI tool family that wrote the harnesses. Independent human verification is not claimed.
