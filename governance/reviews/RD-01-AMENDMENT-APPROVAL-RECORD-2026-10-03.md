# RD-01: approval record for the AAB-PLATFORM-07 amendment and its adoptions — 2026-10-03

**Status:** GOVERNANCE RECORD
**Finding:** RD-01 of the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`; report, lines 40 to 46): an invalidated admission does not trigger downstream currency changes.
**Status of RD-01 after this change:** **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`.** RD-01 is not closed.

## 1. The approved draft

| | |
|---|---|
| File | `governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, committed byte for byte |
| SHA-256 | `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2` |
| Approved | By the Platform Owner, on 2026-10-03, as the contract-resolution baseline |
| Verified by | `governance/tools/rd01-contract-check/check_rd01_contracts.py`, which checks the file's SHA-256 |

**Reconstruction, disclosed.** The working copy approved in review was held in the drafting session's temporary workspace, which was cleared before this change was made. The file committed here was rebuilt by replaying the recorded build steps of that session:
- revision 2's text, written in full;
- one recorded correction;
- the scripts that produced revisions 3 and 4, with their two recorded fixes.

Every intermediate result reproduced its recorded SHA-256 exactly: revision 2 `7ecb2bab…f27c`, revision 3 `19ab3641…c5f2`, and revision 4 `da9a41aa…46b2`. **The committed file is byte-identical to the approved revision 4.**

## 2. Review history

| Revision | SHA-256 | Reviewed | Outcome |
|---|---|---|---|
| 1 | `ad73abce3a62a0f420d8f6cdbb417f4d6373ecfb73439d9abe8b1b0f454e28dd` | 2026-10-03 | Central design accepted; eight corrections required |
| 2 | `7ecb2babfa07318051b3103a055c23f2d7df67db29d574204e66705880d9f27c` | 2026-10-03 | The eight addressed; five corrections required |
| 3 | `19ab36419aa2e36028e9dc88e401624c94d6ea76b7666715bd802ce06a00c5f2` | 2026-10-03 | SHA-256 confirmed in review; substantively accepted; three narrow corrections required |
| 4 | `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2` | 2026-10-03 | **Approved** as the contract-resolution baseline |

Each revision's changes are mapped to its review's findings in the approved draft itself:
- section 7: revision 1 to revision 2;
- section 8: revision 2 to revision 3;
- section 9: revision 3 to revision 4.

Revisions 1 to 3 are superseded, and only their SHA-256 values are recorded. The read-only research reports that informed revision 1 are not committed. The approved draft cites the contracts directly.

## 3. What the approval authorises, and what it does not

**Authorised: Stage 1 only, the governance contracts:**
- the AAB-PLATFORM-07 amendment, with its consequential amendments to AAB-PLATFORM-05, 06, 08 and 10;
- the adoption amendments of CAP-01 to CAP-12;
- the HTML renderings, regenerated;
- the status line in the roadmap and stock-take;
- this record, the approved draft, and the verification of the contract text.

**Not authorised:**
- extraction execution;
- operational code implementing RD-01;
- database or infrastructure changes;
- closing RD-01;
- beginning AGR capability implementation;
- the attachment and manifest handling conflict;
- the CAP-12 `HUMAN`/`SERVICE` correction;
- any change to a production or rehearsal system.

**What contract resolution authorises next** (approved draft, section 4):
- It authorises **extraction planning**.
- It does **not** by itself authorise **extraction execution**. Execution also needs the dependency audit's independent verification, and RD-02, RD-03 and RD-04 at least contract-resolved.
- **No AGR capability code that relies on admitted evidence may be merged as operational until RD-01 is `CLOSED`.**
- RD-01 closes only after Stage 2: the implementation, and every required test (the draft's T1 to T21), passing in CI on the merge commit.

## 4. How the approved text was implemented

**The platform amendments are the approved text.** Each contract's new section is mechanically derived from the approved draft's block for it (sections 1 and 1a to 1d), with `[date]` set to 2026-10-03, and with only these declared editorial adjustments:

| # | Contract | Adjustment | Why |
|---|---|---|---|
| E1 | AAB-PLATFORM-07 | "(sections 1b and 1d)" reads "(their amendments of 2026-10-03)" | The draft's own section labels mean nothing inside a contract |
| E2 | AAB-PLATFORM-05 | A heading is added, "Amendment of 2026-10-03: the admission basis on resolved citations, and the reliance-closure assessment", with a line citing the approved draft | The approved text for AAB-PLATFORM-05 has no heading |
| E3 | AAB-PLATFORM-06, 08, 10 | A line after the heading: consequential to AAB-PLATFORM-07's amendment, approved with it, citing the approved draft | Traceability |
| E4 | AAB-PLATFORM-07 | A line after the "Why" paragraph citing the approved draft | Traceability |

`governance/tools/rd01-contract-check/rd01_text.py` holds the derivation and the four adjustments. The check confirms that each contract's section equals the result exactly.

**The AGR adoptions** are written from the approved draft's section 2 (the impact matrix, row by row), its count table, and point 14 of the amendment text. Each states:
- its own records and held-again rule;
- the mandatory trigger, and its count corrected;
- the admission-basis carriers;
- every reliance edge, with its consequence;
- refusals;
- restoration by path;
- who is told, when, and by what record (section 6);
- its status, `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`.

Header `**Amended:**` lines are extended where the contract has one: CAP-01 to CAP-12, and AAB-PLATFORM-05. AAB-PLATFORM-06, 07, 08 and 10 have none, and none is added. No base text is rewritten, no Dependencies table changes, and no provenance-matrix table changes.

## 5. Findings made while implementing

1. **CAP-05's trigger lists were already complete.** The approved draft's decision G14 called them incomplete. In fact they declare all ten: seven triggers, counting a scope-rule change and a policy change separately, and three non-triggers. The adoption therefore adds only the mandatory eleventh trigger, and changes no existing declaration.
2. **Notification: who is told, how quickly, and by what record.** Point 14 requires each adoption to state all three. Decision G11 of the approved draft delegates the statement to each adoption. It fixes no clock, but it does not leave "how quickly" open. **The first implementation was wrong to record "how quickly" as an open item.** The Platform Owner's review of the uncommitted Stage 1 found this, and it was corrected before commit by a reviewed Stage 1 adjustment (section 6).
3. **CAP-03 records no "invalidated admission" gap,** as the approved draft noted. Its adoption states RD-01's status for CAP-03 without claiming to resolve a gap it never had.
4. **CAP-02 and CAP-05 have no reviewer's admission of their own records**, so none of their records can have an admission invalidated. Their adoptions say so, and adopt the reliance rules for the CAP-04 records they rely on.

## 6. A reviewed Stage 1 adjustment: notification

The Platform Owner reviewed the uncommitted Stage 1 on 2026-10-03, and required one change before commit. **Only the twelve "Who is told" points changed,** with this record and the contract check. The platform text (E1 to E4), every reliance classification, the status wording, the attachment and manifest matter and the CAP-12 actor correction are unchanged. Every adoption now states:
- **When: anchored to the closure assessment's transaction.** The notification record is written in the same transaction as the reliance-closure assessment that names the affected item, and a later assessment writes its own items' notifications. How quickly a person is told therefore follows the closure assessment, written promptly after the invalidating resolution by a registered service (AAB-PLATFORM-07, amendment of 2026-10-03, point 11). A missing or late assessment, or a missing notification record, is a governance defect: it grants no authority, restores no reliance and suppresses no propagation. Notification never conditions propagation. The text is identical in all twelve adoptions.
- **Delivery: open.** Delivery joins CAP-10's open item on notification delivery. When delivery is defined, its receipt or failure is recorded, and failure never prevents a hold, stale state or refusal. No delivery channel, and no country notification policy, is asserted.
- **Who: a role defined in a contract, for every class of recipient,** or "no role defined", recorded as an open item. No role is invented. The classes are:
  - the role accountable for the invalidated record;
  - the role accountable for each affected output or activity;
  - for a stop-at-once edge, the governing role of the capability whose evidence is affected: `ACQUISITION_GOVERNOR` (CAP-02), `SAFETY_GOVERNOR` (CAP-10), `REGULATORY_GOVERNOR` (CAP-11) or `TRANSFER_GOVERNOR` (CAP-12); for CAP-08, the governor behind each gate, with CAP-08's safety evidence under `SAFETY_GOVERNOR`, because "activation's safety gate is CAP-10's outcome" (CAP-08);
  - where the closure is `INCOMPLETE`, an audit or governance role: **no role defined**, because CAP-30 Governed Country Assurance & Audit is `named only`. This is an open item in every adoption;
  - the original decider, only while still authorised and permitted to receive the information.

  The notification cites the invalidating resolution and the closure assessment, and reveals nothing the recipient may not see.

**The audit role: none invented, and none to be assumed.** No audit or governance role is defined in any contract, so none is named.
- **While none exists,** the notification an `INCOMPLETE` closure requires to an audit or governance role is **unsatisfied**, and the closure's completeness is **EVIDENCE REQUIRED**.
- **The closure may not be represented as complete.** No assurance or commissioning decision that requires a complete closure may rely on it.
- **This is a mandatory condition, not a deferred convenience.** It blocks every such decision until an authorised audit or governance role is defined.
- **It does not delay propagation.** The invalidation, holds, refusals and other propagation proceed, and the other recipients are still told. Every operation still proves its own complete reliance basis (AAB-PLATFORM-07, amendment of 2026-10-03, point 9).
- **The text is identical in all twelve adoptions.**

**CAP-12: notifying a recipient abroad is an egress.** A notification to a recipient outside the country environment, such as a manufacturer abroad, is subject to CAP-12's egress authorisation and the sovereign data boundary, as AAB-PLATFORM-07's inspection exemption requires (point 8).

**Held-resolution roles, checked against each contract.** For CAP-01, CAP-04 and CAP-06 to CAP-12, the role named "for a CAP-nn record" in the first recipient row is the role each contract says resolves its held records. **No correction was needed:**

| Contract | Its text, at `a60c639` | The role named |
|---|---|---|
| CAP-01 | Line 506: "\| `DISCOVERY_REVIEWER` \| Resolve held records; …" | `DISCOVERY_REVIEWER` |
| CAP-04 | Line 567: "**A `MEMORY_REVIEWER` resolves it** with a human decision (AAB-PLATFORM-08) of the kind `MEMORY_HELD_RESOLUTION`" | `MEMORY_REVIEWER` |
| CAP-06 | Line 477: "\| `INGREDIENT_REVIEWER` \| Resolve held records; …" | `INGREDIENT_REVIEWER` |
| CAP-07 | Line 544: "\| `FORMULATION_REVIEWER` \| Resolve held records; …" | `FORMULATION_REVIEWER` |
| CAP-08 | Line 639: "\| `CAP08_HELD_RESOLUTION` \| A held record \| `TRIAL_REVIEWER`, never its submitter \| …" | `TRIAL_REVIEWER` |
| CAP-09 | Line 433: "\| `LEARNING_REVIEWER` \| Resolve held records; …" | `LEARNING_REVIEWER` |
| CAP-10 | Line 389: "**Held records** are decided by a `SAFETY_GOVERNOR`, never the submitter (`CAP10_HELD_RESOLUTION`…)" | `SAFETY_GOVERNOR` |
| CAP-11 | Line 388: "Held records are decided by a `REGULATORY_GOVERNOR`, never the submitter (`CAP11_HELD_RESOLUTION`)." | `REGULATORY_GOVERNOR` |
| CAP-12 | Line 461: "\| `TRANSFER_GOVERNOR` \| … release holds; resolve held records \|" | `TRANSFER_GOVERNOR` |

**Which holder is notified: settled before commit, not left to Stage 2.** The Platform Owner's review settled the rule, and every adoption now states it, identically, after its recipient table:
- **The first two rows** (the roles accountable for the invalidated record, and for each affected output or activity): "the holder of the role" means **the current actor specifically assigned or recorded as accountable** for the affected record, output or activity, while still authorised and permitted to receive the information.
- **The governing role of a stop-at-once edge:** the holders of that role **whose scoped authority grant (AAB-PLATFORM-03) covers the affected item.** In the seven adoptions with no stop-at-once edge, this clause applies to none of their edges, and their tables already say so.
- **Never every holder.** "The holder of the role" never means every actor who holds the role, and **the platform never broadcasts a notification to a role population.**
- **Fail closed.** If a recipient cannot be resolved with certainty, that recipient's notification is **EVIDENCE REQUIRED**: no recipient is guessed, and no protected information is disclosed. This does not delay the invalidation, holds, refusals or other propagation.
- **The original decider** is notified only while still authorised and permitted to receive the information.

**Recipient selection is now governed and fail-closed.** What remains is implementation work: the delivery of notifications, and their channels, which join CAP-10's open item on notification delivery.

## 7. What this record does not establish

- It implements nothing, and closes nothing.
- It does not verify any implementation. The contract check confirms the text of the contracts, not the behaviour of any code.
- It does not resolve the attachment and manifest handling conflict, or apply the CAP-12 `HUMAN`/`SERVICE` correction.
