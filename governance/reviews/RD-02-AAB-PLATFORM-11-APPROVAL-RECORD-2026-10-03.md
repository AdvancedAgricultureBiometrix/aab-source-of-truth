# RD-02: AAB-PLATFORM-11 Governed Authority Grants — approval record — 2026-10-03

**Status:** APPROVAL RECORD. It records what the Platform Owner approved, how the approved text became contract text, and what is and is not authorised.
**Finding:** RD-02 of the retrospective decision cross-review: authority grants are consumed by contracts whose issuance governance is not defined (stock-take, open decision 12).
**Status of RD-02 after this change:** **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`,** on `main` only once this change is merged. RD-02 is not closed.
**Pinned at:** `main` `8eb12c0ff06df2abc95a2d7e7cd40efff5582088`, for every source the draft cites.

## 1. What was approved

| Artifact | Path | SHA-256 |
|---|---|---|
| The decided record, as approved | the approved revision 3 (not committed; its hash is recorded here) | `4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314` |
| The decided record, as marked `DECIDED` | `governance/reviews/RD-02-DECISION-RECORD-2026-10-03.md` | `dcf08444f997e7698838d24a0ec54ecc837b7e9b310da27601fe691783e63dce` |
| The approved draft, revision 8 | `governance/reviews/RD-02-AAB-PLATFORM-11-DRAFT-2026-10-03-r8.md` | `36b7eab6208155c46f0febd4022d1b4b584901eea867ccd045d157933c58e10e` |
| The decision sheet, revision 8: all 61 items, no exceptions | `governance/reviews/RD-02-AAB-PLATFORM-11-DECISION-SHEET-r8.md` | `cc365e3eb3d59c67fe59f2cdaa5f3b004d2b110bcd30d7332440f48adb622735` |
| The evidence report, revision 4 (not committed) | — | `42e2a21a0993023d5ee2ffcfc313c16df188400fe6a689d680c4c9c3713ef008` |

Each committed file is byte-identical to the file that was approved.

**The decided record against approved revision 3.** They differ in exactly four lines, all recording the approval:
- the status line now reads "Revision 3, DECIDED";
- the decision-authority line now records "`DECIDED`, 2026-10-03";
- the notes after I6 and after the reinstatement rule each now read "approved by the Platform Owner, 2026-10-03".

Nothing else differs.

## 2. The approval statements, quoted exactly

**The decision record** (Platform Owner, 2026-10-03):

> I explicitly approve RD-02 Decision Record revision 3, SHA-256 4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314, including (1) the refined I6 wording, and (2) the reinstatement rule. The record may be marked DECIDED with the approval date. This authorises drafting AAB-PLATFORM-11 revision 1 and its consequential amendments for review only, not committing contract text, implementation, extraction, system changes or closing RD-02.

**Stage 1** (Platform Owner, 2026-10-03). Source: `governance/reviews/RD-02-STAGE1-APPROVAL-STATEMENT-2026-10-03.md`, SHA-256 `771e201a66c429b94cfed5594a96f9338d97521384d69cc3254d07bef4667181`:

> I explicitly approve:
>
> 1. `RD-02-AAB-PLATFORM-11-DRAFT-2026-10-03-r8.md`, SHA-256 `36b7eab6208155c46f0febd4022d1b4b584901eea867ccd045d157933c58e10e`; and
> 2. `RD-02-AAB-PLATFORM-11-DECISION-SHEET-r8.md`, SHA-256 `cc365e3eb3d59c67fe59f2cdaa5f3b004d2b110bcd30d7332440f48adb622735`, including all 61 items with no exceptions.
>
> I also explicitly approve the following interpretation: if a refounding attempt fails after its `FOUNDING_CEREMONY_RECORD` has been written, `RECONSTITUTION_IN_PROGRESS` remains in force. Every existing and replacement `GRANT_AUTHORITY` grant in that country remains fail-closed and unusable until a later valid refounding reaches `RECONSTITUTION_COMPLETED`. Failure does not restore prior authority, permit a fallback to legacy authority or give AAB power to resolve the condition.
> This interpretation changes neither approved artifact. It must be recorded separately in the approval/traceability record and included in the contract's disclosed consequences when the approved draft is converted into repository contract text.
> This approval authorises preparation of the uncommitted RD-02 Stage-1 contract change-set and its approval/traceability record for review only.
> It does not authorise committing, pushing, opening or merging a pull request; implementation; extraction; database, infrastructure or environment changes; production authority; or marking RD-02 `CLOSED`.
> RD-02 remains open until its required contract publication, implementation and verification stages are separately authorised and completed.

The decision-record statement and the Stage 1 statement are quoted verbatim from the Platform Owner's messages; the Stage 1 statement's source file and hash are recorded beside it.

## 3. The approved interpretation

**It is an interpretation of revision 8, not text revision 8 contains.** Revision 8's §10.5 does not say what happens when a refounding attempt fails after its ceremony record is written. The interpretation settles it:
- `RECONSTITUTION_IN_PROGRESS` stays in force;
- every grant-authority grant in the country stays unusable until a later valid refounding completes;
- there is no restoration, no fallback to legacy authority, and no power for AAB.

It is added to AAB-PLATFORM-11's "Disclosed consequences" section by adjustment E7, quoted exactly and labelled as an approved interpretation.

## 4. How the approved text became contract text

**The contract text is the approved text.** `governance/tools/rd02-contract-check/rd02_text.py` derives each contract's text mechanically from the approved draft:
- AAB-PLATFORM-11 from section 1;
- its Annex A from section 2 (P1 to P12), and its Annex B from section 3 (A7);
- the amendments to AAB-PLATFORM-03, 05 and 08 from sections 1a, 1b and 1c.

The derivation removes the block-quote markers, and applies only these declared adjustments, each an exact, checked number of times:

| # | Adjustment | Why |
|---|---|---|
| E1 | `[date]` reads 2026-10-03 | The approval date |
| E2 | Every `PROPOSED — PLATFORM OWNER DECISION REQUIRED` label, sentence and "(PROPOSED)" marker is removed | All 61 items were approved, with no exceptions |
| E3 | References to the review process are removed, or reworded to say the same without them: "review item N", "revision 2", "(A13)" | The review process means nothing inside a contract |
| E4 | The draft's own section references read as the contracts they became: "section 1a" reads "AAB-PLATFORM-03, amendment of 2026-10-03"; "section 1c" reads "AAB-PLATFORM-08, amendment of 2026-10-03"; "AAB-PLATFORM-11, P*n*" reads "AAB-PLATFORM-11, Annex A, P*n*" | The draft's section labels mean nothing inside a contract |
| E5 | A traceability line: in AAB-PLATFORM-11's header, and after each amendment's "approved with it", naming the approved draft, the sheet, their hashes and this record | Traceability |
| E6 | AAB-PLATFORM-11's "Depends on" list, and the draft's citation short forms (P03, PLAT10, and so on), are placed in a first section, "Dependencies and citation forms" | The renderer shows nothing between the header fields and the first section, and the short forms must be defined in the contract |
| E7 | A "Disclosed consequences" section: the approved interpretation (section 3), and the disclosed small-country freeze (Annex A, P12) | The interpretation was approved for the contract's disclosed consequences |
| E8 | Annex A holds the approved provisions P1 to P12, and Annex B the approved classification of CAP-07's composition access grant (A7), from the draft's sections 2 and 3, with E1 to E4 applied | They were approved with the contract (decision sheet revision 8) |

**Placement, not derived.**
- Each amendment is inserted after its contract's latest top-of-file amendment or note, as the existing amendments are.
- AAB-PLATFORM-05's **Amended:** line is extended with "and 2026-10-03 (service registration and its record kinds, with AAB-PLATFORM-11)". AAB-PLATFORM-03 and 08 have no **Amended:** line.
- Nothing else in those three contracts changes.

**The check.** `governance/tools/rd02-contract-check/check_rd02_contracts.py` proves:
- each contract's text equals its derivation, byte for byte;
- each amended contract, with its amendment and **Amended:** extension removed, is byte-identical to its text at `8eb12c0`;
- every hash in this record matches its file;
- no `PROPOSED` label remains;
- the status line appears in the roadmap and the stock-take exactly once each.

## 5. Review history, by revision and hash

| Artifact | Revision | SHA-256 | What the review changed |
|---|---|---|---|
| Evidence report | 1 | `8413c02c82e81cc24d7a81ab34fcca9a6e69ed1f0d5bf3bb21c0000a186e2b8a` (LF; CRLF form `fa2eb0c9…2245`) | — |
| Evidence report | 2 | `e91ee97598202f1b67ce834106d09f398e80d00eecca4f4fbc4597794bf77594` | Provenance; classification of findings; section 4 split |
| Evidence report | 3 | `b62202c26fede63f0d736151355401b75bfc9dd68fd99d9938315a01f4f9ae81` | Wording; I4 and I6 confirmed |
| Evidence report | 4 | `42e2a21a0993023d5ee2ffcfc313c16df188400fe6a689d680c4c9c3713ef008` | Wording; final |
| Decision record | 3, approved | `4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314` | — |
| Decision record | 3, `DECIDED` | `dcf08444f997e7698838d24a0ec54ecc837b7e9b310da27601fe691783e63dce` | Approval recorded (section 1) |
| Draft | 1 | `2e4bfe501d68e75a3e60823f0b01aa598c6b686380c68daea21f8d647223c237` | — |
| Draft | 2 | `ab12b1902404507de0f1bcaeb8e1146de58c6128e1fe7889e42c862f87054034` | 15 review items: refusal kinds and combining, challenge, suspension identifiers, founding, record conformance, secrets, role references, CAP-07, revocation, backdating, emergency, challengers, evidence, AAB access, external attestation |
| Draft | 3 | `f4c6eb2a017c3c684212b0bf6c584f73f39beb137c248d1bad4c225d58b75383` | 12 items: country-nominated founders, `EVIDENCE_REQUIRED` under challenge, resolvers, the upheld-challenge matrix, two-stage founding, typed events, the combining rule and `REVOCATION_REQUEST`, AAB-operated services, inaccessible evidence, the key prerequisite, withdrawal, decision sheet |
| Draft | 4 | `46da4f3e0d3419d16f976d35788937fb5e557644938e6df4fb4d40de3394c4b4` | 7 items: no approval by silence, invalidated revocation, external reconstitution, lodgement, withdrawal as a decision, proposer exclusion, blockers |
| Draft | 5 | `9e63fd302526583e35bb6f112b74e47b390cedcd461a162bd37a98ef1d97c82a` | 4 items: the requesting actor, existing authority, refounding independence, withdrawal under challenge |
| Draft | 6 | `2b70dddce329f2f1c2c8c27c3e42578e72b9b91b9a4f0fbe48a62446027d3f7c` | 7 items: reconstitution completion and atomicity, verification, the lapse extension |
| Draft | 7 | `1811877791c9d64a78402148f8a1d326f4ebf2bfd9240f9748e3ecd82721ded7` | 2 items: one under-challenge rule, reconstitution stages |
| Draft | 8, approved | `36b7eab6208155c46f0febd4022d1b4b584901eea867ccd045d157933c58e10e` | 1 item: derived blockers, completion by governed records |
| Decision sheet | 3 | `301bf19f124e95315423f1a2b4e6251c060bc55d17761acb23f952b3ff5c035a` | — |
| Decision sheet | 4 | `4e963b9feaf6da94c58c20bf4fc1b14bb2dc0d570399a764844e0051866a1949` | No approval by silence; items updated |
| Decision sheet | 5 | `b5b131a26ee3bb88ef115fff786018778c38b9498043b7788df70d2ae63b7579` | Items 14 and 59; items 60 and 61 added |
| Decision sheet | 6 | `77cc9ae8eaa5849c325703d22d7e14a608cc1654c32dc802cfadac7e8f1a88b2` | Items 14, 46 and 60 |
| Decision sheet | 7 | `340af733e74e0cda7f1060014fc0a05dbe5adcf90fb153b221862a01ca36ab31` | Items 20 and 60 |
| Decision sheet | 8, approved | `cc365e3eb3d59c67fe59f2cdaa5f3b004d2b110bcd30d7332440f48adb622735` | Item 60 |

Every review's change log is in the approved draft, sections 8 to 14. Revisions before the approved ones are not committed; their hashes are recorded here.

## 6. What is and is not authorised

**Authorised (Stage 1), on review of this change-set:**
- AAB-PLATFORM-11 Governed Authority Grants, as a canonical contract;
- the consequential amendments to AAB-PLATFORM-03, 05 and 08;
- the regenerated renderings of those four contracts;
- the RD-02 status line in the roadmap and the stock-take, true on `main` only once this change is merged;
- this record, the approved draft, the decision sheet and the decided record;
- the derivation and its check.

**Not authorised:**
- committing, pushing or opening a pull request before this change-set is reviewed;
- implementation of any part of AAB-PLATFORM-11, and its tests;
- extraction, which also needs the dependency audit's independent verification, and RD-03 and RD-04 at least contract-resolved (`governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`, section 3);
- any change to a database, environment or deployment;
- closing RD-02. It closes only after implementation, and the tests the approved draft lists in its section 5, pass in CI on the merge commit;
- any domain's adoption of AAB-PLATFORM-11. Each contract that names roles adopts it by its own amendment (AAB-PLATFORM-11, §15), which is not part of this change;
- any appointment, grant or founding in any country.
