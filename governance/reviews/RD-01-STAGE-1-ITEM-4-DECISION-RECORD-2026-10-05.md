# RD-01, Stage 1 item 4: decision record — 2026-10-05

**Status:** GOVERNANCE DECISION RECORD

**Decides:** that RD-01 Stage 1 item 4, "An independent review of the platform amendment", is **outstanding**. It records how RD-01's status is read while it is outstanding.

**Decided by:** the Platform Owner, on 2026-10-05.

**Base:** `main` at `9e45e4746cb15a706bdcb6be4b1e9ed8d14ac9bc`. References are `path:line` at that commit.

**Reconciliation item:** GOV-03 of the remaining-work reconciliation of 2026-10-05 (outside this repository).

**Does not change:**
- the approved draft;
- the approval record;
- any contract or adoption;
- the RD-01 contract check;
- any status wording in approved text.

## 1. The decision

**RD-01 Stage 1 item 4, the independent review of the platform amendment, is OUTSTANDING.**
- **No repository evidence records that it occurred.** Whether a potentially qualifying review occurred outside the repository is not established.
- **Not waived, removed or treated as satisfied.**
- **The requirement stands** as the approved draft states it.

## 2. The requirement, exactly

**The approved draft** is `governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, SHA-256 `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2`. Its section 4 ("Closure evidence and tests") defines the status and Stage 1.

**The status, and when it applies** (draft, section 4, status table):
- **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`:** "When: Stage 1 is complete."
  - It authorises extraction planning, not extraction execution.
  - "No AGR capability code that relies on admitted evidence may be merged as operational until RD-01 is `CLOSED`."
- **`CLOSED`:** when Stage 2 is complete.

**Stage 1** (draft, section 4, "Stage 1. Sets `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`"). It has four items:
1. AAB-PLATFORM-07, 06, 08, 10 and 05 amended, in one PR, with HTML regenerated.
2. An adoption amendment in each of CAP-01 to CAP-12.
3. RD-01's roadmap and stock-take items, and every capability's "invalidated admission" gap, marked with that status, not closed.
4. **"An independent review of the platform amendment."**

**What the draft does not define:**
- who may perform the review;
- what independence requires;
- what evidence records it.

## 3. What the repository records

| Stage 1 item | Evidence at `9e45e47` | State |
|---|---|---|
| 1 | Merged in #123 (head `0e97356`, merge `f6fc458`). The RD-01 contract check verifies the text: 678 checks pass | **Done** |
| 2 | Merged in #123; verified by the same check | **Done** |
| 3 | The roadmap and stock-take items, and the twelve adoptions' status lines, merged in #123 | **Done** |
| 4 | No artefact identifies an independent review of the platform amendment (section 4) | **Outstanding** |

**The approval record** (`governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`):
- Section 3 authorises "Stage 1 only, the governance contracts". It lists the amendments, the adoptions, the renderings, the status line, the record and the text verification. **It does not list item 4.**
- Line 5 nonetheless records RD-01's status after #123 as `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`. The draft defines that status as applying when Stage 1 is complete.
- **That is the inconsistency this decision resolves.**

## 4. Could any existing artefact be the independent review?

**No.** None is classed as independent below, because the approved text defines no independence criterion that any of them could be shown to meet, and none describes itself as independent of the amendment.

| Artefact | What it is | Why it is not the independent review |
|---|---|---|
| The three reviews of draft revisions 1 to 3 (draft lines 5-7, sections 7-9; approval record, section 2) | The **Platform Owner's** reviews, whose findings shaped the text that the Platform Owner then approved | The approver's own reviews. No reviewer other than the Platform Owner is recorded |
| The Platform Owner's review of the uncommitted Stage 1 (approval record, section 6) | A review required before commit, changing the twelve "Who is told" points | The same reviewer, after approval. It reviewed the adoptions' notification points, not the platform amendment as a whole |
| The retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`) | ChatGPT's read-only advisory review at `a3777de`, which raised RD-01 | It predates the amendment, so it reviewed the defect, not the amendment. The records class it as not independent (stock-take, line 439: "Advisory and not independent"; roadmap, line 89 and decision 67) |
| The RD-01 contract check (`governance/tools/rd01-contract-check/`, 678 checks) | Mechanical verification that the committed text equals the approved draft | A text-equality check, not a review. It "does NOT prove" anything beyond the text (its docstring) |
| CI on #123's head and merge | The SCS pilot's test, isolation and backup-restore jobs | They test code that RD-01 does not change. They do not examine the contract text |
| GitHub reviews on #123 | None: 0 reviews, 0 comments | — |
| Review provenance generally | Open decision 16 (RD-16): reviews that approve contracts are recorded in prose, with no reviewer identity or artefact digest | It confirms that no machine-readable record of a reviewer exists |

**Not established, either way:** whether a potentially qualifying review occurred outside the repository, in session history or elsewhere. This decision records only that no repository evidence records that it occurred. **A later qualifying review outside the repository satisfies item 4 only when it is recorded under section 7.**

## 5. How RD-01's status is read while item 4 is outstanding

**The approved status wording is kept unchanged.**
- The wording `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN` is approved text in the approval record and in the twelve AGR adoptions.
- The RD-01 contract check requires it exactly.
- Changing it would change approved RD-01 clauses.

**It carries this qualification wherever the records state it:**

> **Stage 1 incomplete: item 4, the independent review of the platform amendment, is outstanding** (`governance/reviews/RD-01-STAGE-1-ITEM-4-DECISION-RECORD-2026-10-05.md`).

**The qualification governs every place the status appears,** including the approval record (line 5) and the twelve adoptions' status points, which are not edited. Read together:

| Element | Position |
|---|---|
| **Contract text** | **Approved and merged.** The amendments to AAB-PLATFORM-05, 06, 07, 08 and 10, and the adoptions in CAP-01 to CAP-12, are on `main` (#123) and are the approved text. Nothing in them changes |
| **Independent review** (Stage 1 item 4) | **Outstanding.** Stage 1 is not complete |
| **Implementation and verification** (Stage 2) | **Open,** unchanged. RD-01 closes only after its implementation, with T1 to T21 passing in CI on the merge commit |
| **Extraction planning** | **Permitted**, as the approval record (section 3) authorises it. See section 6 for the condition |
| **Extraction execution** | **Prohibited.** It needs the dependency audit's independent verification, and RD-02, RD-03 and RD-04 at least contract-resolved; those requirements remain. **The Platform Owner confirms under decision 71 that extraction execution may not begin until RD-01 Stage 1, including item 4, is complete.** This confirmation does not authorise extraction or implementation |
| **Operational AGR code relying on admitted evidence** | **Prohibited until RD-01 is `CLOSED`,** unchanged |

## 6. Status wording: alternatives considered

| | Wording in the records | Effect | Assessment |
|---|---|---|---|
| **W1 (approved)** | The approved label, unchanged, followed by the qualification in section 5 | Keeps every approved clause. The RD-01 check passes unchanged. The twelve adoptions and the approval record need no edit; this record governs their reading | **Approved by the Platform Owner, 2026-10-05.** It is the narrowest accurate change, and leaves no approved text altered |
| W2 | A new label in the records: `CONTRACT TEXT APPROVED AND MERGED — STAGE 1 INCOMPLETE (INDEPENDENT REVIEW OUTSTANDING) — IMPLEMENTATION AND VERIFICATION OPEN` | More explicit on its own | It would differ from the label in the approval record and the twelve adoptions, unless those approved texts were amended. It also requires changing the RD-01 check's rule 5. Rejected as wider than necessary |
| W3 | The label with an inserted qualifier: `CONTRACT-RESOLVED (PROVISIONAL) — IMPLEMENTATION AND VERIFICATION OPEN` | Short | It alters the approved token. The check fails, and "provisional" does not say what is missing. Rejected |

**The condition on extraction planning under W1, and the alternative:**
- **P1 (approved by the Platform Owner, 2026-10-05).** Planning stays permitted. The approval record authorises it expressly, and planning produces no code. Every plan must state that the platform amendment is subject to the outstanding independent review, and that its text may change as a result.
- **P2.** Planning that relies on RD-01 is suspended until item 4 is complete. Stricter, but it would withdraw an authorisation the Platform Owner granted expressly. **Not selected.**

## 7. What completes item 4 (open; not decided here)

This decision does not define the review. **Before item 4 can be recorded complete,** the Platform Owner must decide:
- who may perform it, and what independence means for it (for example: not the drafter, not the approver, no interest in the outcome);
- its scope: the AAB-PLATFORM-07 amendment and its consequential amendments to AAB-PLATFORM-05, 06, 08 and 10, at their committed SHA-256;
- how it is recorded: a dated, signed record naming the reviewer and their independence, the artefacts and digests reviewed, and the findings.

**If the review requires changes to the amendment,** they are made by a new, approved amendment. Item 4 is not complete until the review's outcome is recorded.

This is open decision 19 in the stock-take.

## 8. What may continue while item 4 is outstanding

Unchanged by this decision, and subject to their own authorities:
- contract and governance work, including RD-03 and RD-04 contract resolution, and open decisions 17 and 18;
- extraction **planning** (P1), and test specifications for T1 to T21, as documents;
- records reconciliation;
- preparing the scope and record format of the item 4 review, and identifying a reviewer (a Platform Owner decision).

**Not permitted by this decision:**
- extraction execution;
- implementation;
- marking item 4 complete, or RD-01 `CLOSED`;
- relying on any earlier review as item 4.

## 9. What this record does not establish

- It does not declare the review completed, and identifies no earlier review as independent.
- It does not waive, remove or change Stage 1 item 4, or any approved RD-01 clause.
- It authorises no implementation, extraction execution, deployment, or change to any contract, check or system.
- It does not decide who performs the review, or what independence requires (section 7).
