# RD-01: AAB-PLATFORM-07 amendment, `MEMBER_ADMISSION_INVALIDATED`: draft, revision 4

**Mode:** planning and amendment drafting only. No contract is amended, nothing is implemented, and no branch or commit exists.
**Base:** `main` at `a60c639`. References are `path:line` at that commit; P05 to P10 are `governance/AAB-PLATFORM-0N-…`; CAP-NN are `governance/workstream-b/CAP-NN-…-CANONICAL-CONTRACT-….md`.
**Revision 2 (2026-10-03):** the eight findings of the Platform Owner's first review are applied (section 7).
**Revision 3 (2026-10-03):** the five corrections of the second review, and a revised T10, are applied (section 8). Its SHA-256, `19ab36419aa2e36028e9dc88e401624c94d6ea76b7666715bd802ce06a00c5f2`, was confirmed in the third review, which accepted the draft substantively.
**Revision 4 (2026-10-03):** the three final narrow corrections of the third review are applied (section 9). The architecture, status language and separations are unchanged. **The amendment is not approved.**
**Kept separate, not in this draft:** the attachment and manifest handling conflict; the CAP-12 HUMAN/SERVICE correction.

---

## 0. The facts the amendment is built on

1. **There is exactly one way an admitted record stops being admitted.** AAB-PLATFORM-06 allows nothing after admission "except through quarantine (section 7) and supersession" (P06:67). But a record admitted by a reviewer, a held record resolved to admit (P06:170-173), is admitted *because of a human decision*. AAB-PLATFORM-08 lets that decision be challenged and, when a challenge is upheld, become `INVALIDATED` (P08:192-198). What the record then is "is derived when read, from its decisions" (P06:173): it is held again (CAP-04:77, 711).
2. **Automated admissions cannot be invalidated.** An automated admission is not a human decision (P08:21), and "is not challenged. A record wrongly admitted at submission is quarantined, or superseded" (CAP-04:717). The records exposed are exactly the ones that were **held first**. In CAP-04 these are automated content (including everything CAP-02 maps), unconfirmed source authority, and traditional knowledge or personal information (CAP-04 checks 9 to 11). The same applies to every AGR capability's own reviewer-admitted records (CAP-01:361, CAP-06:347, CAP-07:398, CAP-08:640, CAP-09:287, CAP-10:389, CAP-11:388, CAP-12:449). **The change kind is platform-generic.**
3. **The snapshot cannot see it today.** A member pins `admissionDecisionId` and `admissionOutcome` (P07:104-105). For a held-then-admitted record that decision is the submission-time decision, whose outcome is `HELD_FOR_REVIEW`. The reviewer's resolution, which actually admitted it, is **not pinned** (CAP-04:663). The contract's own enumeration of `admissionOutcome` (`ADMITTED | ADMITTED_WITH_LIMITATIONS`) cannot even hold that pair's outcome (section 6, N1).
4. **The comparison has eight change kinds, and none fits** (P07:213-220; CAP-04:873). A held-again record would be excluded as `HELD_FOR_REVIEW`, whose definition, "no reviewer has resolved it" (P07:152), does not cover it.
5. **Currency has no `STALE` or `INVALIDATED` status.** It is `SUPERSEDED` > `POTENTIALLY_STALE` > `LAPSED` > `UNDETERMINED` > `CURRENT`. A review may be relied on only when `VALID` and `CURRENT`, checked in the same consistent read as the write (P08:207-214, 228, 234).
6. **Nothing derived may be stored, and nothing may be inserted into an admitted record.** The record-digest envelope excludes "derived current status" (P05:42-48), and later acts are "separate immutable records" (P05:67). Past uses are never rewritten (P06:183, P05:338, P07:223, P08:182).
7. **The platform has no transitive propagation.** The only chain is comparison → trigger → currency → reliance check at write time (P07:208-224; P08:221-236). CAP-03's dependency closure (CAP-03:318) can compute scope. Its incident is not the vehicle, because it opens only on an integrity finding (CAP-03:314).
8. **Digests.**
   - AAB-PLATFORM-10 has seven digest types, and "A digest of one type is never accepted where another is expected" (P10:156).
   - AAB-PLATFORM-08's `decisionDigest` is "'sha256:' over every field above, in canonical JSON" (P08:142), which excludes only itself and the signature. **AAB-PLATFORM-10 does not map it.**
   - The AGR conformance amendments (#119) already name a human decision's digest "AAB-PLATFORM-08's `recordDigest`" (for example `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md:130`), a field AAB-PLATFORM-08 does not define.
   - AAB-PLATFORM-10 already maps non-admitted written-once records to `recordDigest`: AAB-PLATFORM-04's status records and the key registry's records (P10:145-146).
   - **AAB-PLATFORM-06's `AdmissionDecision` has no digest of its own.** Its `recordDigest` is the admitted record's (P06:96-133, 137).
9. **SCS is not affected now.** SCS has not adopted AAB-PLATFORM-05 to 08, and nothing in SCS can lose admission. Its trigger `EVIDENCE_WITHDRAWN_OR_QUARANTINED` exists, and is hard-coded unchanged (SCS-CAP-09:103, 344, 495; `scs-pilot/packages/api/src/capabilities/cap-09/currency.ts` lines 48-57).

**Bounding.** The change kind is AAB-PLATFORM-07's. The package needs four consequential texts, all in one PR (G1):
- AAB-PLATFORM-06: a resolution may be invalidated, and the held decision resolved again;
- AAB-PLATFORM-08: the counts, and the mandatory trigger;
- AAB-PLATFORM-10: `decisionDigest` mapped to `recordDigest`;
- AAB-PLATFORM-05: the admission basis on resolved citations, and the closure assessment as a registered record kind.

---

## 1. Proposed amendment text: AAB-PLATFORM-07

To be inserted after the existing "Amendment of 2026-10-02" section. `[date]` is the date of approval.

> ## Amendment of [date]: an admission invalidated after a snapshot
>
> **Why.** A member of a snapshot is an admitted record. Where a reviewer admitted it, resolving a held record (AAB-PLATFORM-06, section 6), its admission rests on that human decision. AAB-PLATFORM-08 lets a human decision be challenged and invalidated (section 8). When a challenge to the admitting resolution is upheld, the record is no longer admitted, and is derived as held again. This contract had no change kind for that. A comparison showed the member's current state, no review relying on the snapshot became stale, and anything built on the record, or citing it, could go on relying on it as if it were still admitted. The gap was open in every AGR contract, and is finding RD-01 of the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`). Approved by the Platform Owner in review on [date]. **Nothing is implemented by this amendment.**
>
> **1. What invalidates an admission.** An admission is invalidated when, and only when, **the human decision that admitted the record becomes `INVALIDATED`** under AAB-PLATFORM-08, section 8. That happens when a challenge to the decision, made by a person holding the domain's challenging role with grounds, is resolved `UPHELD` by a person who is neither the challenger nor the decider. That `CHALLENGE_RESOLUTION` is the **invalidating resolution**. Nothing else invalidates an admission:
> - **an automated admission** is not a human decision, and is never invalidated. A record wrongly admitted at submission is quarantined or superseded, which this contract already compares;
> - **an open challenge** suspends nothing: the admission stands until the challenge is upheld (point 3 records it);
> - **an integrity finding** is not an invalidation of admission. It is the domain's integrity process (for AGR, CAP-03), with its own triggers;
> - **no service, rule or automated process** invalidates an admission. It is always a person's resolution of a person's challenge.
>
> **2. What is written.**
> - **No record represents the invalidation itself, and no status is written.** The invalidation *is* the challenge and its `UPHELD` resolution. Each is written once, attributable, signed and receipted under AAB-PLATFORM-08 (sections 2, 4 and 8), and the resolution names the challenged decision and its digest. That the admission is invalidated, and that the record is held again, are **derived when read** from those decisions (AAB-PLATFORM-06, section 6). It is never stored on the record, the decision, a snapshot or an evaluation, and never enters any `recordDigest` (AAB-PLATFORM-05, amendment of 2026-10-02, section A).
> - **The invalidation's provenance** is that of those decisions: decider, verified authority, independence checks, reasoning, time, signature and digest.
> - **One separate record is required: the reliance-closure assessment (point 11).** It records what was found to have relied on the admission, at a time, for audit and notification. It is not the invalidation, and never authoritative.
>
> **3. The admission basis.** **Every new act that relies on an admitted record pins the basis of that admission** in its own written-once content. The system sets it, in the same consistent read as the act. The basis is normative, and has one shape wherever it is carried:
> ```typescript
> interface AdmissionBasis {
>   recordId: string;
>   recordVersion: number;
>   recordDigest: DigestReference;            // the admitted record's recordDigest (AAB-PLATFORM-10)
>   admissionDecisionId: string;              // the decision made at submission (AAB-PLATFORM-06)
>   admissionOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS" | "HELD_FOR_REVIEW";   // that decision's outcome
>   mode: "AUTOMATED" | "REVIEW";
>   effectiveOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";   // the outcome under which it is relied on
>   resolution?: {                            // required where mode is "REVIEW"; absent where "AUTOMATED"
>     decisionId: string;                     // the reviewer's resolution that admitted this version
>     decisionDigest: DigestReference;        // digestType "recordDigest": AAB-PLATFORM-08's decisionDigest (AAB-PLATFORM-10, as clarified on [date])
>     validityAtBasis: "VALID" | "UNDER_CHALLENGE";
>   };
>   basisAt: string;                          // the platform's time of the consistent read that pinned it
> }
> ```
>
> **Where it is carried:**
>
> | Path | Carrier | Field |
> |---|---|---|
> | **A.** A snapshot member | `EvaluationSnapshot.manifest.members[]` (this contract) | `admittedBy: { mode, effectiveOutcome, resolution? }`. The member's existing `recordId`, `recordVersion`, `recordDigest`, `admissionDecisionId` and `admissionOutcome`, with the snapshot's `cutoffAt` as `basisAt`, complete the basis. `validityAtBasis` is the validity at the cut-off |
> | **B1.** Direct reliance by a record | The relying record's own content, inside its `recordDigest` envelope (AAB-PLATFORM-05, section A) | `reliedAdmissions: AdmissionBasis[]`, with `reliedAdmissionRoles` (below) |
> | **B1.** Direct reliance by a human decision | `HumanDecision` (AAB-PLATFORM-08, as amended on [date]) | `decidedOn.admissionBasis` where `decidedOn.kind` is `RECORD`; `reliedAdmissions: AdmissionBasis[]`, with `reliedAdmissionRoles`, for admitted records the decision relies on but does not decide |
> | **B2.** A resolved citation | Every `lineage` entry, and every domain citation field resolved through a registered resolver (AAB-PLATFORM-05, sections 4 and E), whose cited record kind is admitted evidence | `resolved.admissionBasis: AdmissionBasis`, set when the citation is resolved, at the citing record's admission |
>
> - **System-set, never from a request.** A request that supplies an admission basis, or any part of one, is refused, as for every system-set field.
> - **Pinned and covered.** It is part of its carrier's digest: `snapshotDigest`, the record's `recordDigest`, or the decision's `decisionDigest`. It is never changed and never refreshed.
> - **One entry per record version, in one carrier.** `reliedAdmissions` never holds two entries with the same `recordId` and `recordVersion`. Within one act, a record version has exactly one admission basis, pinned in that act's one consistent read. A carrier with a duplicate entry is refused (`ADMISSION_BASIS_DUPLICATE`). Two versions of the same record are two entries.
> - **Ordered by content:** `reliedAdmissions` by `recordId`, then `recordVersion`. Because duplicates are prohibited, that order is total, and the same set always serialises the same way (AAB-PLATFORM-10, section 3).
> - **Roles are recorded separately from the basis.** Where one record version serves the act in several semantic roles (for example as safety evidence and as rights evidence), the roles are not recorded by duplicating its basis. They are listed in:
>   ```typescript
>   reliedAdmissionRoles: Array<{ recordId: string; recordVersion: number; role: string }>;   // the domain's role vocabulary
>   ```
>   - **Order:** by `recordId`, then `recordVersion`, then `role`;
>   - **No duplicates:** a duplicate triple is refused (`ADMISSION_BASIS_DUPLICATE`);
>   - **Matching:** every entry names a record version present in `reliedAdmissions`, and, where the domain defines roles, every `reliedAdmissions` entry has at least one role;
>   - **Set by:** the system, from the act's declared use, and covered by the carrier's digest.
>
>   Roles are what make each reliance edge distinct (point 14). A role never changes the basis.
> - **Citations.** In AAB-PLATFORM-05's `lineage`, the same record version may be cited in several entries with different relations: the relation is the citation's role. Each entry's `resolved.admissionBasis` is then identical, because all are pinned at the citing record's one admission. Entries whose bases differ for the same record version are refused (`ADMISSION_BASIS_DUPLICATE`).
> - **Only an admitted record can be pinned.** A record that is not admitted when the act's consistent read is taken, including one whose admitting resolution is `INVALIDATED`, cannot be relied on, and no basis is pinned for it.
> - **For an automated admission,** `mode` is `"AUTOMATED"`, `effectiveOutcome` equals `admissionOutcome`, and there is no `resolution`. The admission decision is never invalidated, and has no digest of its own (AAB-PLATFORM-06).
> - **For a reviewer's admission,** `admissionDecisionId` and `admissionOutcome` keep their existing relationship: the submission-time decision and its outcome, `HELD_FOR_REVIEW`. `effectiveOutcome` and `resolution` identify the act that admitted it.
> - **Legacy.** Records, decisions and version `"1"` snapshots written before this amendment carry no basis. They are governed by the fail-closed mapping of point 13, never by an assumed basis.
>
> **3a. Snapshot members.** `snapshotVersion` becomes `"2"`, and each member carries `admittedBy` (point 3). A member is never admitted by an invalidated decision: a record whose admitting resolution is `INVALIDATED` at the cut-off is not a member. `validityAtBasis` is recorded as it stood at the cut-off, like `quarantined`; a later challenge, upheld or dismissed, does not change the snapshot. Version `"1"` snapshots are not rewritten (point 13).
>
> **4. Exclusions.** The exclusion reason `HELD_FOR_REVIEW` now applies when "the record is held, and **no valid resolution** has admitted or rejected it". A record held again because its admitting resolution was invalidated is excluded as `HELD_FOR_REVIEW`, with `detail` naming the invalidating resolution. If a new resolution has since rejected it, it is `REJECTED`. If a new resolution has admitted it again, it is a candidate under that resolution. The order of reasons is unchanged.
>
> **5. A ninth change kind.** Section 8's comparison gains:
>
> | Change | Meaning |
> |---|---|
> | `MEMBER_ADMISSION_INVALIDATED` | The resolution that admitted a member, valid at the cut-off, has been invalidated since the cut-off |
>
> - **It is permanent for the snapshot.** It is reported whenever an invalidating resolution for the member's admitting resolution has been decided after the cut-off. **That stays true whatever happens later:** the record held again, rejected, or admitted again by a new resolution; the challenge reconsidered; the invalidating resolution itself challenged. Nothing rehabilitates a historical snapshot. **Reliance requires a new snapshot and a new human decision** (point 10).
> - **It is derived from written-once records only:** the existence of an `UPHELD` resolution of a challenge to the member's admitting resolution, decided after the cut-off. It is never stored.
> - **It is never masked.** A member that is also superseded, withdrawn or quarantined has each change reported. The comparison names every change for every member.
> - **It is reported with:** the member; the invalidated resolution and its digest; the invalidating resolution, its digest and time; and the record's present derived state.
> - **The counts:**
>   - this contract's comparison now has **nine change kinds**;
>   - with AAB-PLATFORM-08's two review triggers (`EVALUATION_SUPERSEDED`, `RULES_VERSION_CHANGED`), there are **eleven platform review triggers**;
>   - decision 10 now reads "in nine platform change kinds".
>
> **6. It is always a trigger.** Every other change kind is declared a trigger or not by each domain (AAB-PLATFORM-08, section 10). **`MEMBER_ADMISSION_INVALIDATED` is a trigger in every adoption, and no adoption may declare it otherwise.**
> - A review whose snapshot reports it is `POTENTIALLY_STALE` (AAB-PLATFORM-08, section 9), and may not be relied on.
> - Because the change is permanent for the snapshot (point 5), **the review never becomes current again.**
>
> **7. Fail closed: the trigger.** Where the comparison cannot establish whether a member's admitting resolution has been invalidated since the cut-off, **the trigger's result is `NOT_EVALUATED`, and the review is `UNDETERMINED`** (AAB-PLATFORM-08, section 10). This applies where:
> - a decision cannot be read or resolved;
> - a version `"1"` member cannot be mapped;
> - validity cannot be derived in the same consistent read;
> - the record is outside the reader's domain or country.
>
> The result is never `UNCHANGED`. The basis `NO_OPERATION_EXISTS` applies to this change kind only for a member admitted `AUTOMATED`, and is disclosed as such.
>
> **8. No new reliance on an invalidated basis.** **Preserving history and prohibiting new reliance are different.** Everything already written stays as it was, and readable (point 12). What is prohibited is **new reliance**: a new decision, evaluation, package, gate, or operational act that uses an invalidated admission as part of its basis. Before it writes, whatever relies on admitted evidence checks its basis, in the same consistent read as its own write, along each path by which it relies:
>
> | Path | What is relied on | The check | Refusal |
> |---|---|---|---|
> | **A. Snapshot and evaluation** | An evaluation, directly, or through a human decision, package, gate or later evaluation that pins it | For every member, the pinned `admittedBy.resolution` has not been invalidated since the snapshot's cut-off | `SNAPSHOT_MEMBER_ADMISSION_INVALIDATED` |
> | **B1. Direct reliance on an admitted record** | An admitted record used directly as an input or gate, not through a snapshot. This includes records named as safety, regulatory, rights or quality-control evidence | **A new act** pins the record's current, valid basis (point 3). **An act relying on an earlier basis**, pinned by a record or decision it relies on, checks that the pinned `resolution` has not been invalidated since `basisAt` | `RELIED_ADMISSION_INVALIDATED` |
> | **B2. Resolved evidence citations** | A record or decision relied on now, whose citations to admitted records were resolved earlier (AAB-PLATFORM-05, section 4) | For every citation it relies on, the pinned `resolved.admissionBasis.resolution` has not been invalidated since `basisAt` | `CITED_ADMISSION_INVALIDATED` |
> | **C. Human decisions** | A human decision relied on | **Every human decision relied on must be `VALID`** (AAB-PLATFORM-08, section 8). **A review of an evaluation must also be `CURRENT`** (section 9), whose currency now includes point 6; no other human decision has currency. The decision's own pinned bases (B1, B2) and any further checks its domain defines also apply | AAB-PLATFORM-08's refusal, or the domain's |
>
> - **Where any check cannot be completed, the operation's basis is unresolved: it returns `UNDETERMINED`, and is refused** (`ADMISSION_BASIS_UNDETERMINED`). This rule is point 9.
> - **Paths B1 and B2 never refresh a basis or re-resolve a citation.** Resolution stays pinned at admission (AAB-PLATFORM-05, decision 6). The checks are reliance checks at the time of use, and change nothing written.
> - **A refusal writes nothing,** and reveals no more than the requester may see (section 9).
> - **Never refused by this check:**
>   - **authorised reading, display and governed rendition for inspection** (AAB-PLATFORM-02), by a reader who may already read the item, under the existing access, disclosure, country-boundary, institutional-confidentiality and egress controls. **This exemption:**
>     - **creates no access right.** A reader who may not read an item may not read it, its basis, its marker or its closure;
>     - **permits no cross-country transfer, and no egress of protected data.** A rendition or export leaving the environment remains subject to the domain's egress authorisation and the sovereign data boundary, exactly as before;
>     - **does not bypass confidentiality.** Protected information classes, compositions, personal information and traditional knowledge stay as restricted as before;
>     - **never presents an invalidated basis as current evidence.** Every reading, display and rendition shows the derived markers of point 12;
>   - audit and reconstruction;
>   - a challenge;
>   - **reassessment** on a new snapshot;
>   - **protective acts that reduce reliance:** a quarantine, a hold, a supersession or withdrawal, a notification, a closure assessment.
>
> **9. Every relying operation proves its own basis.** The platform does not classify what it cannot reach. **An operation that relies on admitted evidence must establish, in its own consistent read, the complete basis it relies on**: every evaluation (path A), every admitted record (B1), every resolved citation (B2) and every human decision (C), **together with the admission bases those elements themselves pin.** It must also show that no element rests on an invalidated admission. An element that cannot be resolved makes the basis **unresolved**, and the operation returns `UNDETERMINED` and is refused. No operation may assume an element is sound because a closure assessment did not mention it.
>
> **10. Restoration, by path.** **Human reassessment is mandatory.** Nothing resting on an invalidated admission is ever relied on again. New reliance needs a **new basis**, established by a new act. No rule, service, re-admission, or later decision about the challenge restores the old basis. **What restores reliance depends on the path:**
>
> | Path | What restores reliance | What never does |
> |---|---|---|
> | **A.** Snapshot and evaluation | **A new snapshot**, taken after the invalidation; **a new evaluation** bound to it; and **the human decision the domain requires** on that evaluation, which supersedes the stale decision with the reason `RECONSIDERATION` or `NEW_OBJECT` (AAB-PLATFORM-08, section 6) | A new comparison of the old snapshot; a re-admission of the record |
> | **B1.** Direct reliance | **A newly established direct basis,** after a valid re-admission: a new act pinning the new admission basis (a new resolution, with its digest) under point 3, **with the human approval the domain requires** for that reliance | Re-reading the old record under its new admission; any update to the old act's pinned basis |
> | **B2.** Resolved citation | **A new record, a new version, or a governed decision** that establishes a new citation basis: its citation is resolved afresh at its own admission, and pins the new basis | Refreshing or re-resolving the old citation; inferring that the old citation now points at a re-admitted record |
> | **C.** Human decision | **A new, valid human decision.** Where it reviews an evaluation, it is made on **a new snapshot** (path A), and must be `CURRENT` when relied on | The old decision becoming valid or current again by any route |
>
> **11. The reliance-closure assessment: required, separate, non-authoritative.** What relied on an invalidated admission is **derived when read** as its reliance closure:
> 1. **Through every admission-basis carrier of point 3:** whatever pins a basis naming the invalidated resolution:
>    - every persisted snapshot whose member's `admittedBy` names it (path A);
>    - every record whose `reliedAdmissions[]` names it (B1);
>    - every human decision whose `decidedOn.admissionBasis` names it (B1);
>    - every human decision whose `reliedAdmissions[]` names it (B1);
>    - every record or decision whose `resolved.admissionBasis`, on a `lineage` entry or on a domain citation resolved through a registered resolver, names it (B2);
> 2. **Through legacy references** (point 13): every version `"1"` snapshot member, existing direct reference and existing resolved citation naming the invalidated record version, where the legacy mapping assigns it to the invalidated resolution. Where the mapping cannot decide, the edge is unresolved (below);
> 3. **Through the dependants of everything reached:**
>    - every evaluation bound to a reached snapshot (section 7);
>    - every human decision on a reached evaluation, and every act whose recorded currency assessment names a reached decision (AAB-PLATFORM-08, section 11);
>    - every record or decision whose resolved citations name anything reached (AAB-PLATFORM-05, sections 4 and E), through the registered resolvers;
>    - and, for every reached item that is itself an admitted record, every carrier of point 3 whose basis names it;
> 4. repeated until nothing new is reached.
>
> **Every standard carrier of point 3 is traversed.** A closure that did not search one is incomplete, and says which.
>
> - **Scope is demonstrated, never assumed:** the closure is computed from resolved references only.
> - **An edge that cannot be resolved makes the closure incomplete,** and the closure says where. The closure **does not classify, and may not claim anything about, what lies beyond an unresolved edge**, and **may not claim completeness.** That something is absent from an incomplete closure says nothing about it; its own reliance is governed by point 9.
> - **A closure grants no authority,** complete or incomplete. Presence in it marks nothing, and absence from it permits nothing.
> - **A closure assessment is required at every invalidation,** for audit and notification. It is written promptly after the invalidating resolution, by a registered service or by a named person. It is **a separate record, written once**, of the record kind `RELIANCE_CLOSURE_ASSESSMENT`.
> - **Its provenance, when a service writes it** (AAB-PLATFORM-05, section C):
>   - `submittedBy` is the `SERVICE`;
>   - `service` gives the service's `serviceRegistrationId`, `executionIdentity`, `softwareRelease`, `correlationId`, `method` and `methodVersion`;
>   - `triggerKind` is `RECORD`, and `triggerRecord` is the invalidating resolution;
>   - **`initiatedBy` is recorded only when a person actually initiated that execution,** for example by requesting a new assessment. It is never filled in automatically, and the run is **never attributed to the resolution's decider**, who decided the challenge and did not run the assessment;
>   - where a named person writes it, `submittedBy` is that person.
> - **Its content:**
>   - the invalidating resolution and its digest;
>   - `assessedAt`;
>   - `completeness`, `COMPLETE` or `INCOMPLETE`, with every unresolved edge;
>   - the closure found;
>   - its `recordDigest`.
> - **It is non-authoritative and time-bound.** It states what was found as at `assessedAt`, and is never read as current. It marks nothing, prevents nothing and permits nothing: propagation is derived (points 5 to 9), whether or not an assessment exists. **More assessments may follow, each as at its own time.**
> - **A missing or late assessment is a defect,** disclosed in the domain's operations. It never delays propagation.
>
> **12. Historical outputs are preserved and shown, never rewritten.**
> - Every snapshot, evaluation, decision, package and record that relied on the invalidated admission **keeps its content and digest, and is still readable** as it was.
> - When it is read, the reader is shown, derived at that time:
>   - for a snapshot or evaluation, each `MEMBER_ADMISSION_INVALIDATED`, with the invalidating resolution;
>   - for a review, its currency, `POTENTIALLY_STALE` or `UNDETERMINED`, with the trigger;
>   - for anything else, that its basis included an admission since invalidated, and when.
> - **An invalidated basis is never presented as current evidence.**
>
> **13. Legacy, fail closed.** What was written before this amendment carries no admission basis. It is mapped when read, never assumed:
> - **Version `"1"` snapshot members:**
>   - where `admissionOutcome` is `ADMITTED` or `ADMITTED_WITH_LIMITATIONS` and the decision is the submission-time decision, the member was admitted `AUTOMATED`;
>   - where the named decision is a reviewer's resolution, or the submission-time decision was `HELD_FOR_REVIEW`, the admitting resolution is the resolution that was valid at the cut-off, derived from the domain's decisions.
> - **Existing direct reliance (B1) and existing resolved citations (B2):**
>   - the admitting resolution is the one that was valid at the relying act's time, or at the citation's resolution, derived from the domain's decisions;
>   - where that resolution has been invalidated at any time since, the basis is invalidated.
> - **Where the admitting resolution cannot be established with certainty, the basis is undetermined** (points 7 and 9), and reliance on it is refused.
>
> **14. What a domain's adoption must state.**
> - **For every record kind that may be a member or be cited:** whether a reviewer can admit it, and so invalidate the admission.
> - **For every reliance edge:**
>   - an edge is one relying act's use of one admitted record, along one path (point 8), in one role;
>   - its consequence is either **stop at once** or **mark for reassessment**:
>     - **stop at once:** new reliance is refused, and an activity in progress is held under the domain's hold rules until a person reassesses it;
>     - **mark for reassessment:** new reliance is refused, nothing in progress is held, and the output is shown as resting on an invalidated basis;
>   - **an activity in progress with several affected edges takes the highest consequence among them.** One affected edge that is mandatory safety, regulatory, rights or quality-control evidence is enough to stop it at once;
>   - an adoption that does not classify an edge is incomplete.
> - **Who must be told,** how quickly, and by what record. Notification is never a precondition of propagation.
> - **Its refusal codes,** mapped to point 8's.
> - **The mapping of its existing members** (point 13).
>
> **15. Audit and reconstruction.** Everything needed is written once and kept:
> - the admitting resolution;
> - the challenge and the invalidating resolution, with their receipts;
> - the snapshots and evaluations;
> - the currency assessment every relying act records (AAB-PLATFORM-08, section 11);
> - the closure assessments.
>
> **Whether a past act relied on an admission before it was invalidated** is answered by comparing that act's recorded time with the invalidating resolution's `decidedAt`. What a reader saw at a time is reproducible from the same records.
>
> **16. What this amendment replaces.**
> - **Section 3:**
>   - `snapshotVersion`;
>   - the member gains `admittedBy`;
>   - `admissionOutcome`'s enumeration gains `"HELD_FOR_REVIEW"`, so that it can always hold the outcome of `admissionDecisionId`;
>   - "`quarantined` is recorded as it stood at the cut-off" gains `admittedBy.resolution.validityAtBasis`, recorded as at the cut-off;
>   - the `HELD_FOR_REVIEW` exclusion row (point 4).
> - **Section 7:** the reliance checks of points 8 and 9, and the restoration rules of point 10.
> - **Throughout:** the admission basis of point 3, which this contract defines, and which AAB-PLATFORM-05 and 08 carry (sections 1b and 1d).
> - **Section 8:** the ninth change kind, points 5 to 7.
> - **Section 10:** the adoption's additions (point 14).
> - **Decision 10:** nine change kinds.
>
> Nothing else in this contract changes. **Nothing is implemented by this amendment.**

### 1a. Consequential text: AAB-PLATFORM-06

> ## Amendment of [date]: a resolution invalidated, and the record held again
> - **Section 6:**
>   - **"A held decision is resolved at most once"** now reads: *a held decision has at most one valid resolution.* Where a resolution that admitted or rejected the record is `INVALIDATED` (AAB-PLATFORM-08, section 8), the record is held again, derived when read, and may be resolved again by a new resolution, which supersedes the invalidated one. A resolution may be superseded only after it is invalidated.
> - **Section 1:**
>   - **"except through quarantine (section 7) and supersession"** gains: *and, for a record a reviewer admitted, the invalidation of that resolution (section 6).*
> - **Reading:**
>   - an admitted record is read with its decision **and, where a reviewer admitted it, that resolution and its validity.**
> - **Unchanged:** no record, decision or status changes. Nothing is implemented.

### 1b. Consequential text: AAB-PLATFORM-08

> ## Amendment of [date]: nine change kinds, one always a trigger
> - **Section 10:**
>   - **"the eight change kinds of AAB-PLATFORM-07 (section 8)"** now reads ***"the nine change kinds"***. With `EVALUATION_SUPERSEDED` and `RULES_VERSION_CHANGED`, a review has **eleven platform triggers**.
>   - **"every platform change kind is either a trigger, or declared not a trigger"** gains: *except `MEMBER_ADMISSION_INVALIDATED`, which is a trigger in every adoption (AAB-PLATFORM-07, amendment of [date], point 6).*
>   - **`NO_OPERATION_EXISTS`** is never the basis for `MEMBER_ADMISSION_INVALIDATED` on a member admitted by a reviewer.
> - **The decision record:**
>   - **`decidedOn.admissionBasis`** (an `AdmissionBasis`, AAB-PLATFORM-07, amendment of [date], point 3) is required where `decidedOn.kind` is `RECORD`, alongside `admissionDecisionId`;
>   - **`reliedAdmissions: AdmissionBasis[]`**, with **`reliedAdmissionRoles`**, is added for admitted records a decision relies on but does not decide, under point 3's canonical rule: one entry per record version, ordered, with roles kept separately. All are system-set, and covered by `decisionDigest`;
>   - **`decisionDigest` is the decision's `recordDigest`** (AAB-PLATFORM-10, as clarified on [date]): over every field of the decision except `decisionDigest` and `signature`. Where an adopting contract names a human decision's "`recordDigest`", it means this digest.
> - **Section 11, relying on a decision:** every human decision relied on must be `VALID`. Only a review of an evaluation has currency, and it must also be `CURRENT`. Its pinned admission bases, and any check its domain adds, also apply (AAB-PLATFORM-07, amendment of [date], point 8, path C).
> - **Section 13:**
>   - every existing adoption is read, from this amendment, as declaring `MEMBER_ADMISSION_INVALIDATED` a trigger. Its own wording is corrected by its own amendment.
> - **Unchanged:** nothing else changes. Nothing is implemented.

### 1c. Consequential clarification: AAB-PLATFORM-10

> ## Amendment of [date]: a human decision's digest is a `recordDigest`
> - **Section 6, the `recordDigest` row:**
>   - the semantic object **"An admitted, written-once record"** now reads ***"A written-once governed record: an admitted record, a human decision, or a status record"***;
>   - the included fields are, for a human decision, every field of AAB-PLATFORM-08's `HumanDecision` except `decisionDigest` and `signature`;
>   - this states what the legacy mappings for AAB-PLATFORM-04 status records and the key registry's records already do (section 5).
> - **Section 5, legacy forms,** gains a row: `decisionDigest` (AAB-PLATFORM-08), `sha256:` plus hexadecimal; interpreted as `recordDigest`, `aab-canonical-json-1`, `sha-256`.
> - **No new digest type.** There are still seven types. No stored value changes. Nothing is implemented.

### 1d. Consequential text: AAB-PLATFORM-05

> - **Section 4 and amendment section E, the resolved citation:** `resolved` gains `admissionBasis` (AAB-PLATFORM-07, amendment of [date], point 3). It is required where the cited record kind is admitted evidence, and is system-set at resolution and covered by the citing record's `recordDigest`. A citation is never re-resolved, and its basis is never refreshed.
> - **`RELIANCE_CLOSURE_ASSESSMENT`** is a platform record kind:
>   - written once, with `Provenance` (`provenanceVersion` "2") and a `recordDigest`;
>   - submitted by a registered service under section C, or by a named person;
>   - resolvable through its registered resolver, so that a notification or audit can cite it.
> - **It is never admitted evidence, and never a basis for reliance.**

### 1e. Invalidation, supersession, withdrawal, deletion, and the rest

| Act | What it is | Who | What is written | The record afterwards | Snapshot comparison |
|---|---|---|---|---|---|
| **Admission invalidated** | The reviewer's resolution that admitted the record is found improperly made, by an upheld challenge | A challenger with the domain's role, and an independent resolver | A challenge and an `UPHELD` `CHALLENGE_RESOLUTION`; afterwards, a separate closure assessment | Held again, derived; still readable; may be resolved again | `MEMBER_ADMISSION_INVALIDATED`, permanent for every snapshot taken before it |
| **Supersession** (correction or new version) | The record's content is replaced by a new version | The submitter, or an authorised operation (AAB-PLATFORM-05, section D) | A new record naming what it supersedes | Superseded, derived; still readable | `MEMBER_SUPERSEDED` |
| **Withdrawal** | A supersession with no replacing content | As for supersession | A record stating the withdrawal and its reason (P05:339) | Withdrawn, derived; still readable | `MEMBER_SUPERSEDED` |
| **Quarantine** | The record may be wrong, or must not be used, while that is established | A person with the domain's quarantine role (P06:184) | A status record; release is another | Still admitted, and excluded from new use by default | `MEMBER_QUARANTINED`, `QUARANTINE_RELEASED` |
| **Rejection** | A reviewer decides a held record is not admitted | A reviewer, never the submitter | A review decision `REJECTED` | Never admitted; preserved | Not a member; excluded as `REJECTED` |
| **Deletion or erasure** | **Not a platform act.** Nothing is ever deleted (P05:335; P06:152; P08:167). Erasure is an open domain item (for example CAP-04:855) | — | — | — | — |
| **Integrity compromise** | A stored object or signature fails verification | The domain's integrity process (CAP-03), never a report alone | A verification run and an incident | Admitted, and marked `INTEGRITY_COMPROMISED`, derived | Through the domain's integrity triggers (CAP-03:310) |

**Invalidation is not correction and not deletion.** The content may be entirely true. What has been found wrong is that it was admitted, under a decision now invalid.

---

## 2. Downstream impact matrix

**The platform minimum,** once adopted, applies to every AGR consumer:
- every snapshot taken before the invalidation reports `MEMBER_ADMISSION_INVALIDATED`, permanently;
- every review over such a snapshot is `POTENTIALLY_STALE`, or `UNDETERMINED`;
- every new reliance on that basis is refused, along paths A, B1, B2 and C;
- every relying operation must prove its own complete basis;
- a closure assessment is written at the invalidation.

The paths below are those of point 8: **A** snapshot or evaluation, **B1** direct reliance on an admitted record, **B2** resolved citation, **C** human decision. **No consuming contract is amended in this draft.**

| Contract | Reliance edges (path: what) | Today | Consequence per edge, proposed (point 14) | Its adoption must add | Human reassessment act |
|---|---|---|---|---|---|
| **CAP-04** Scientific Memory | B2: other CAP-04 records' lineage citations (check 8, at admission) | Re-hold defined (CAP-04:77, 711). The member field gap (CAP-04:663). `derived.state` cannot tell "held again" (CAP-04:638). `heldResolution` is singular (CAP-04:636). No currency (CAP-04:686) | B2: mark for reassessment (display) | `admittedBy` in the members it supplies; a held-again state and a resolution history; the open gap (CAP-04:873) closes | A new `MEMORY_HELD_RESOLUTION`, superseding |
| **CAP-01** Country Intelligence | A: dossier, then `DISCOVERY_REVIEW`; B2: `evidence[]` (check 8); C: the referral relies on the review | None. Triggers list quarantine, not invalidation (CAP-01:463). Gap (CAP-01:639) | A and C: mark. The referral must not open a CAP-06 candidate while the review is stale (mirrors CAP-01:38) | The trigger; "all ten" → "all eleven" (CAP-01:490); `admittedBy` | A new dossier and `DISCOVERY_REVIEW`; CAP-06 `REFERRAL_RECEIPT` |
| **CAP-02** Acquisition | B2: `SOURCE_APPROVAL` basis `evidence[]`, mandatory (CAP-02:56, 276); then `startRun`. Not a P-07 adopter | None. Currency ends on supersession or challenge (CAP-02:287), not invalidation. Gap (CAP-02:552), with an inaccurate "as in CAP-03" | B2 to `startRun`: **stop at once** (permitted use is a hard gate, CAP-02:136). Staged or submitted items keep their basis, shown with its state | Path B2 at run start, as a domain check | A new `SOURCE_APPROVAL`; `RUN_WITHDRAWAL` |
| **CAP-03** Integrity & Provenance | A: lineage evaluations; B2: lineage traversal | None. Lineage ignores admission state (CAP-03:293). The incident cannot open on it (CAP-03:314) | Not a gate. **Supplies the closure computation** (CAP-03:318) for the closure assessment in AGR | A consequence row, modelled on "Superseded but intact evidence" (CAP-03:306); lineage shows held-again links | — |
| **CAP-05** Reasoning | A: landscape (its `REVIEWED_EVIDENCE_ONLY` policy selects exactly the invalidatable records, CAP-05:264), then `LANDSCAPE_REVIEW`; C: CAP-09's reliance | None: "does not become `POTENTIALLY_STALE` through it" (CAP-05:531) | Mark. Through CAP-09, path C already blocks `PROMOTE` (CAP-09:384) | The trigger; "all ten" → "all eleven" (CAP-05:430), and its incomplete lists (CAP-05:391-401) | A new landscape and `LANDSCAPE_REVIEW` |
| **CAP-06** Ingredients | A: dossier, then `INGREDIENT_REVIEW`; B2: `evidence[]` (check 8); C: CAP-07 relies on acceptances | None (CAP-06:592). Downstream is already wired: CAP-07 check 5 needs `VALID` and `CURRENT` (CAP-07:391) | Mark. Path C then refuses CAP-07 and CAP-08 reliance automatically | The trigger; "all ten" → "all eleven" (CAP-06:469) | A new dossier and `INGREDIENT_REVIEW` |
| **CAP-07** Formulations | A: dossier, then `FORMULATION_REVIEW`; B2: `evidence[]` (check 9); C: component acceptances; C: CAP-08 relies on `ACCEPT_FOR_TRIAL` | None for CAP-04 evidence (CAP-07:669). Second-order path defined (CAP-07:512) | Mark. Path C refuses CAP-08 activation | The trigger; "all ten" → "all eleven" (CAP-07:536) | A new dossier and `FORMULATION_REVIEW` |
| **CAP-08** Trials | B1: `preconditions.safetyEvidence` (CAP-08:198, 400); C: activation gates through CAP-06, 07, 10, 11 and 12; outcomes go **to** CAP-04 | None (CAP-08:848). The lapse split: administrative suspends nothing, safety-driven holds at once (CAP-08:81-82) | New activation: refused on any edge. **Active trial: the highest edge.** Any edge from CAP-10, CAP-11 or CAP-12 gate evidence, or from B1 safety evidence, stops it at once (a hold); otherwise mark | Per-edge classification; "all ten" → "all eleven" (CAP-08:701) | A new `TRIAL_ACTIVATION`; `TRIAL_OUTCOME_REVIEW` |
| **CAP-09** Learning | A: learning dossier, then `PROMOTE`; B2: claims' mandatory `evidence[]` (check 5); C: cited landscape reviews; a promoted `ADVERSE_EFFECT` drives CAP-10 currency | **Contradicts itself:** CAP-09:386 names "no longer admitted" as a trigger; CAP-09:550 says it does not fire | Mark. A promotion is shown stale, never removed (CAP-09:398). **An invalidated promoted `ADVERSE_EFFECT` must not retract a CAP-10 trigger** | The trigger made real; "all ten" → "all eleven" (CAP-09:425); the CAP-10 exception | A new dossier and `LEARNING_REVIEW` |
| **CAP-10** Safety & Ecology | A: dossier, then `SAFETY_ASSESSMENT`; B2: request `evidence[]`, mandatory (check 8); B1/B2: `SIGNAL_DETERMINATION` "only on admitted evidence" (CAP-10:767) | None (CAP-10:985). Triggers lack it; signal determinations have no evidence trigger | Every edge is mandatory safety evidence: **stop at once.** New reliance refused (CAP-10:642); `CR-06` holds relying trials and handling (CAP-10:734) | The trigger; a trigger for signal determinations; "the eight change kinds" (CAP-10:637) → nine; "all ten" → "all eleven" (CAP-10:824) | A new dossier and `SAFETY_ASSESSMENT`; `ASSESSMENT_REOPENED`; `HOLD_RELEASE` |
| **CAP-11** Regulatory | B2: source `document`, mapping `evidence[]`, authenticity evidence, the exemption's authority, the egress legal basis (all mandatory, CAP-11:98-108); A: dossier, then `DOSSIER_ASSESSMENT` | Partly: a **new** dossier shows `NOT_MAPPED` (CAP-11:526). Existing verifications and determinations have no trigger (CAP-11:855) | **Stop at once:** permit and market-authorisation determinations, regulator-decision verification, future egress (mandatory regulatory evidence). **Mark:** `DOSSIER_ASSESSMENT`, requirement-set verification. **Past egress cannot be recalled** (CAP-11:659) | Triggers and B2 checks on cited documents; holds in CAP-08 and CAP-12 "as a regulator's revocation would" (CAP-11:50); "all ten" → "all eleven" (CAP-11:702) | New verifications and determinations; a new `DOSSIER_ASSESSMENT`; `EGRESS_AUTHORISATION` |
| **CAP-12** Manufacturing | B2: rights basis `evidence[]`, batch `qcDocument` (mandatory, CAP-12:78, 82); A: evidence basis; C: `TRANSFER_AUTHORISATION` | None (CAP-12:532), but its holds table covers "material evidence relied on becomes stale or superseded" (CAP-12:404) | Rights and QC edges: **stop at once**, a `TRANSFER_HOLD`; no new disclosure, attestation or transfer. **Disclosure already made cannot be retrieved** | Invalidation mapped to the hold row; "all ten" → "all eleven" (CAP-12:451) | `HOLD_RELEASE`; a new `EVIDENCE_BASIS_REVIEW` or `TRANSFER_AUTHORISATION` |
| **Every AGR capability's own admissions** | Each capability's held resolutions (CAP-01:361 … CAP-12:449) make its records invalidatable, and those records are members, subjects or cited records | Only CAP-04 defines the re-hold | Per edge, as above | A held-again rule for its own records | Its own held resolution, superseding |
| **SCS** (SCS-CAP-04, 05, 06, 08, 09) | Its own admission, evaluation, packages and review currency | **Not affected:** SCS has not adopted AAB-PLATFORM-05 to 08, and nothing in SCS can lose admission | — | On adoption, `EVIDENCE_WITHDRAWN_OR_QUARANTINED` becomes a real check, mapped to this change kind | — |

**Every count occurrence to correct.** Each is corrected by its own contract's amendment, or by the companion texts:

| Occurrence | Now | Becomes |
|---|---|---|
| P07:289 (decision 10) | "eight platform change kinds" | nine |
| P08:221 (section 10) | "the eight change kinds of AAB-PLATFORM-07" | nine (eleven triggers with the two of P08) |
| CAP-10:637 | "the eight change kinds of AAB-PLATFORM-07 … `EVALUATION_SUPERSEDED` and `RULES_VERSION_CHANGED`" | nine change kinds (eleven triggers) |
| CAP-01:490 | "All ten platform change kinds" | all eleven |
| CAP-05:430 | "all ten platform change kinds declared" | all eleven |
| CAP-06:469 | "All ten change kinds" | all eleven |
| CAP-07:536 | "All ten change kinds" | all eleven |
| CAP-08:701 | "All ten change kinds" | all eleven |
| CAP-09:425 | "All ten change kinds" | all eleven |
| CAP-10:824 | "All ten platform change kinds" | all eleven |
| CAP-11:702 | "All ten platform change kinds" | all eleven |
| CAP-12:451 | "All ten platform change kinds" | all eleven |

The rows say "change kinds", but count the ten triggers: eight change kinds plus AAB-PLATFORM-08's two. The correction keeps their meaning: all eleven triggers.

Not affected by this count:
- the roadmap's "All ten are proposed, not admitted" (roadmap:199), which counts platform contracts;
- CAP-02, CAP-03 and CAP-04, whose texts state no such count;
- the HTML renderings, which are regenerated, never edited.

**Interfaces and records that would need a field or state** (none changed now):
- **Platform:**
  - `EvaluationSnapshot`: `snapshotVersion` "2", `admittedBy`, and `admissionOutcome` gaining `"HELD_FOR_REVIEW"`;
  - the `HELD_FOR_REVIEW` exclusion definition;
  - the change-kind enumeration;
  - six refusal codes: `SNAPSHOT_MEMBER_ADMISSION_INVALIDATED`, `RELIED_ADMISSION_INVALIDATED`, `CITED_ADMISSION_INVALIDATED`, `ADMISSION_BASIS_UNDETERMINED`, `ADMISSION_BASIS_DUPLICATE`, and AAB-PLATFORM-08's existing refusal;
  - the record kind `RELIANCE_CLOSURE_ASSESSMENT`.
- **CAP-04:** `Cap04MemoryRecordRead.derived.state`, and `heldResolution` as a history.
- **Snapshot members in every adopter:** `Cap01DiscoveryDossier.members[]`; `Cap05EvidenceLandscape.subjects[].members[]`; the CAP-06, 07, 09, 10, 11 and 12 dossiers.
- **Path B1 and B2 inputs:**
  - `Cap01RecordEnvelope.evidence[]` and `Cap02PermittedUseBasis.evidence`, which carry no `admissionDecisionId`;
  - `preconditions.safetyEvidence`;
  - `Cap12RightsAuthority.basis[].evidence[]`, `Cap12BatchAttestation.qcDocument`;
  - the CAP-11 source, mapping, authenticity and egress citations.
- **Derived markers:** CAP-09 `gapType` and its claim state; `Cap10OutcomeDisplay.currency`; CAP-11 `MAPPED_EVIDENCE_NOT_CURRENT`.

---

## 3. Governance decisions

### Carried from revision 1, updated

| # | Decision | Recommendation |
|---|---|---|
| G1 | **Packaging.** The amendment needs consequential texts in AAB-PLATFORM-06, 08, 10 and 05 (sections 1a to 1d). | **One PR, five platform contracts.** Otherwise the platform contradicts itself between merges. |
| G2 | **The member field** `admittedBy`, with snapshot version "2". | **The field** (point 3). Version 1 is mapped when read (point 13). |
| G3 | **An open challenge at the cut-off.** | **Record it, as `validityAtBasis`; no change kind.** "An open challenge suspends nothing" (CAP-04:76). A domain may add its own trigger, as CAP-02 and CAP-12 do (CAP-02:451; CAP-12:440). |
| G4 | **Always a trigger.** | **Yes** (point 6). |
| G5 | **Use-time refusal along all paths** (A, B1, B2, C). | **Yes** (point 8): it makes "no downstream write can rely on it" true for direct reliance and citations as well as evaluations. |
| G6 | **The closure assessment.** | **Required at every invalidation; a separate record; non-authoritative; time-bound** (point 11). In AGR, computed with CAP-03's calculation. |
| G7 | **Consequence per reliance edge.** | **Per edge, highest wins** (point 14). Stop at once where the edge is mandatory safety, regulatory, rights or quality-control evidence; mark for reassessment otherwise. One stop-at-once edge stops the whole activity in progress. |
| G8 | **No automatic restoration.** | **Yes.** Strengthened by point 5's permanence. |
| G9 | **Whether a `CHALLENGE_RESOLUTION` can be challenged.** | **Leave open** (CAP-04:703, pilot position). It no longer affects snapshots: point 5 is permanent whatever the answer. It still affects whether the *record* can be readmitted without a new resolution. |
| G10 | **Automated admissions stay non-invalidatable.** | **Confirm.** |
| G11 | **Notification.** | **Each adoption states it** (point 14). The closure assessment supplies the list. Delivery joins CAP-10's open item on notification delivery. |
| G12 | **Interim positions until built:** CAP-10 `ASSESSMENT_REOPENED`, a CAP-12 hold placed by a person, a CAP-11 change event, a CAP-02 challenge blocking runs. | **Record them** in the roadmap's "Still open". |
| G13 | **CAP-04's quarantine and release invalidation rows** (CAP-04:713-714). | **Out of RD-01's scope;** record as a related open item. |
| G14 | **Text inconsistencies:** CAP-09:386 against 550; CAP-02:552's "as in CAP-03"; CAP-05:430's lists. | **Correct each in that capability's adoption amendment.** |
| G15 | **SCS.** | **Record the latent gap** in the stock-take; map on adoption. |

### Newly exposed by revision 2

| # | Decision | Recommendation |
|---|---|---|
| **N1** | **`admissionOutcome`'s enumeration cannot hold its own decision's outcome for a reviewer-admitted member.** Its type is `ADMITTED` or `ADMITTED_WITH_LIMITATIONS` (P07:105), but the submission-time decision of a held record is `HELD_FOR_REVIEW`. Version 1 snapshots of such members are therefore ambiguous: they named either the submission-time decision with a mismatched outcome, or the resolution. | **Widen the enumeration to `"HELD_FOR_REVIEW"`** in version 2, keeping the pair's relationship (point 16). Version 1 is mapped by point 13, and is undetermined where ambiguous. The alternative, naming the resolution in `admissionDecisionId`, would repurpose it, which the review rejected. |
| **N2** | **The AGR contracts name "AAB-PLATFORM-08's `recordDigest`" for human decisions** (the provenance matrix, for every capability), but AAB-PLATFORM-08 defines only `decisionDigest`, and AAB-PLATFORM-10 maps neither. This is a pre-existing gap, exposed by finding 6. | **Close it by the clarifications in sections 1b and 1c,** which make the AGR wording true. **No AGR contract or matrix table changes,** so `check_matrix.py` is unaffected. |
| **N3** | **AAB-PLATFORM-06's `AdmissionDecision` has no digest of its own.** Its `recordDigest` is the record's. So an automated admitting decision can be identified, but not digest-bound. | **Out of RD-01's scope.** Automated admissions are never invalidated, so `admittedBy` needs no digest for them (point 3). Record as a platform open item: whether admission decisions should get their own `recordDigest`. |
| **N4** | **The closure assessment's production:** a service or a person; "promptly after" or in the same transaction as the invalidating resolution; what happens when it is missing. | **A registered service, triggered by the resolution record, in its own transaction**, so that a large closure never blocks the resolution. A missing assessment is a disclosed defect, and never delays propagation (point 11). The domain sets the time limit. *Revision 3:* the service's own identity, registration and correlation are recorded; `initiatedBy` only when a person initiated that run. |
| **N5** | **The protective acts permitted on an invalidated basis** (point 8): quarantine, hold, supersession or withdrawal, notification, closure assessment. Is the list closed? | **Closed at the platform.** A domain may add a protective act only by amendment, and only one that reduces reliance. |
| **N6** *(resolved in revision 3: now normative, points 3 and 13)* | **Path B1's "the resolution under which the basis was established".** A relying act must know which admitting resolution its basis used. Records that relied on an admitted record directly have not recorded that resolution (for example `preconditions.safetyEvidence: string[]`). | **New writes record it,** as `admittedBy` does for members. For records written before adoption: if the relied-on record's admitting resolution has been invalidated at any time since the relying act, the basis is invalidated; if that cannot be established, it is undetermined (point 9). |

---

## 4. Closure evidence and tests (updated)

**Status language.** RD-01, and every capability's "invalidated admission" gap, take one of two statuses. Nothing is marked closed at Stage 1.

| Status | When | What it authorises |
|---|---|---|
| **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`** | Stage 1 is complete | **Extraction planning:** designing the shared platform modules and the capability work against the amended contracts, and writing their work packages and tests. It does **not** by itself authorise **extraction execution.** Execution also needs the dependency audit's independent verification (open decision 8), and RD-02, RD-03 and RD-04 at least contract-resolved, as the review's correction order requires before extraction. When those hold, execution may begin, and RD-01's implementation is part of it. **No AGR capability code that relies on admitted evidence may be merged as operational until RD-01 is `CLOSED`.** |
| **`CLOSED`** | Stage 2 is complete: implemented, and every required test passing in CI on the merge commit, with the closure evidence recorded | RD-01 no longer gates anything |

**Stage 1. Sets `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`:**
1. AAB-PLATFORM-07, 06, 08, 10 and 05 amended as above, in one PR, with HTML regenerated.
2. An adoption amendment in each of CAP-01 to CAP-12, covering:
   - the trigger, and its count corrected (section 2's table);
   - the admission basis, in its members, direct reliances and citations;
   - every reliance edge classified, and its refusals mapped;
   - its restoration acts per path;
   - who is told; its held-again rule; the corrections in G14.
3. RD-01's roadmap and stock-take items, and every capability's "invalidated admission" gap, marked **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`**, **not closed.**
4. An independent review of the platform amendment.

**Stage 2. Sets `CLOSED`:** the implementation, and automatic tests in CI, all passing on the merge commit:

| # | Test | Demonstrates |
|---|---|---|
| T1 | An upheld challenge to an admitting resolution makes the record derive as held again; the record, its decisions and every snapshot are byte-for-byte unchanged | RD-01: "a challenged admission becomes held"; nothing rewritten |
| T2 | Every persisted snapshot holding the member reports `MEMBER_ADMISSION_INVALIDATED`, with the invalidating resolution; also when the member is superseded or quarantined (never masked) | RD-01: "every affected snapshot comparison changes" |
| T3 | **Permanence:** after a re-admission by a new resolution, after the invalidating resolution is itself invalidated, and after the challenge is reconsidered, the old snapshot **still** reports the change, and its reviews stay non-current | Finding 1 |
| T4 | Every adopting capability's reviews over those snapshots derive `POTENTIALLY_STALE`, with the trigger `CHANGED`; with validity unreadable, `UNDETERMINED`, never `UNCHANGED`; no adoption configuration can remove the trigger | RD-01: "every relying review becomes non-current or undetermined" |
| T5 | **Path A refusals,** one per relying act: CAP-01 referral, CAP-05 to CAP-09, CAP-06 to CAP-07, CAP-07 to CAP-08 activation, CAP-09 `PROMOTE`, CAP-10 reliance, CAP-11 determinations, CAP-12 authorisation, packages. Each refused with `SNAPSHOT_MEMBER_ADMISSION_INVALIDATED`, writing nothing | RD-01: "no downstream write can rely on it" |
| T6 | **Path B1 refusals:** CAP-08 activation on `safetyEvidence`; any gate taking an admitted record directly. Refused with `RELIED_ADMISSION_INVALIDATED` | Finding 3 |
| T7 | **Path B2 refusals,** reliance through resolved citations: a CAP-02 run start on an approval whose basis evidence was invalidated; a CAP-12 transfer on a rights authority or batch attestation whose cited document was invalidated; a CAP-11 determination on a source or authenticity document; a CAP-10 signal determination; a CAP-09 claim. Each refused with `CITED_ADMISSION_INVALIDATED`, and **no citation re-resolved** | Finding 3; AAB-PLATFORM-05, decision 6 |
| T8 | **Unresolved basis:** a relying operation with one element it cannot resolve (an unregistered resolver, a cross-country reference, an unmappable version 1 member) returns `UNDETERMINED` and is refused with `ADMISSION_BASIS_UNDETERMINED`; an operation whose basis is complete and sound succeeds | Finding 4 |
| T9 | **Closure:**<br>- **discovery through every admission-basis carrier:** a fixture with one dependant per carrier is found completely, each through its own carrier. The carriers are a snapshot member's `admittedBy`, a record's `reliedAdmissions[]`, a decision's `decidedOn.admissionBasis`, a decision's `reliedAdmissions[]`, a `lineage` entry's `resolved.admissionBasis`, a domain citation's `resolved.admissionBasis`, and a legacy reference;<br>- removing any one carrier from the traversal makes the result `INCOMPLETE`, naming that carrier;<br>- **multi-hop:** record → snapshot → evaluation → review → relying decision → citing record → a record whose `reliedAdmissions[]` names that citing record's admission; found completely, `COMPLETE`;<br>- **unresolved:** with an unresolved edge, `INCOMPLETE` names the edge, claims nothing beyond it, and never claims completeness; an object beyond it is still refused through T8, not through the closure;<br>- the closure grants nothing: an item absent from it is still checked by point 9 | Finding 4; revision 4, item 1 |
| T10 | **Closure assessment:**<br>- written once, after every invalidation, by the registered service, with `assessedAt`, completeness and `recordDigest`;<br>- its provenance names the service's registration, execution identity and correlation, `triggerRecord` the invalidating resolution, and no `initiatedBy` unless a person started the run;<br>- **with the service intentionally disabled, or its write suppressed, so that no assessment exists:** every derived state, currency and refusal is exactly the same, and the absence is detected and reported as a defect;<br>- no assessment is ever read as current | Finding 5; revision 3, item 4 |
| T11 | **Permitted acts and their bounds:**<br>- authorised reading, display, governed rendition, audit, challenge, reassessment on a new snapshot, quarantine, hold, withdrawal and notification all succeed on an invalidated basis, and each shows its markers;<br>- every new decision, package, gate and operational act on it is refused;<br>- **the exemption grants nothing:**<br>  - a reader without access to the item is refused, as before, for the item, its basis, its marker and its closure;<br>  - a reader in another country is refused or receives `NOT_SHAREABLE`, as before;<br>  - a protected class, composition or personal information stays restricted;<br>  - a rendition sent out of the environment without the domain's egress authorisation is refused | Preserving history, prohibiting reliance; revision 4, item 2 |
| T12 | **Member fields:** `admissionDecisionId` and `admissionOutcome` keep their pair (`HELD_FOR_REVIEW` for a reviewer's admission); `admittedBy.outcome` holds the effective outcome; `admittedBy.resolution.decisionDigest` is a `DigestReference` of type `recordDigest`, and a digest of any other type is refused (`DIGEST_MISMATCH` or `DIGEST_REFERENCE_INVALID`) | Findings 2 and 6 |
| T13 | **Counts:** the comparison enumerates nine change kinds; a review's trigger list has eleven; every adoption's declaration covers all eleven, with `MEMBER_ADMISSION_INVALIDATED` mandatory | Finding 7 |
| T14 | **Per-edge consequence:** an active trial with one mark-for-reassessment edge (a CAP-06 citation) and one stop-at-once edge (CAP-10 safety evidence) is held at once; with only the first, it is not held, and new reliance is still refused | Finding 8 |
| T15 | **Restoration, by path:**<br>- **A:** a new snapshot, evaluation and required decision restore reliance; a new comparison of the old snapshot, or re-admission, does not;<br>- **B1:** a new act pinning the new admission basis, with the domain's approval, restores it; the old act does not;<br>- **B2:** a new record or version, whose citation resolves afresh, restores it; the old citation is never refreshed or re-resolved;<br>- **C:** a new valid decision, on a new snapshot where it reviews an evaluation, restores it | Point 10; revision 3, item 2 |
| T16 | **Version 1 mapping:** an automated member maps cleanly; an ambiguous reviewer-admitted member is undetermined | N1 |
| T18 | **Admission basis pinned:**<br>- every new path A, B1 and B2 reliance carries the basis of point 3, system-set and covered by its carrier's digest;<br>- a request supplying any part of it is refused;<br>- a reviewer-admitted basis has `resolution` with a `recordDigest`-typed digest, and an automated one has none;<br>- relying on a record that is not admitted pins nothing, and is refused | Revision 3, item 1 |
| T19 | **Legacy fail closed:** an existing direct reliance or citation whose admitting resolution was later invalidated is refused; one whose resolution cannot be established is `UNDETERMINED` and refused | Point 13 |
| T20 | **Path C:**<br>- relying on a valid non-review decision (for example a held resolution) succeeds without currency;<br>- relying on an invalidated decision of any kind is refused;<br>- relying on a review that is valid but `POTENTIALLY_STALE`, `LAPSED` or `UNDETERMINED` is refused;<br>- a decision's own pinned bases and its domain's checks are also applied | Revision 3, item 3 |
| T21 | **Canonical admission bases:**<br>- `reliedAdmissions` built from the same set in any input order serialises identically, and gives the same carrier digest;<br>- a duplicate `recordId` and `recordVersion` in one carrier is refused with `ADMISSION_BASIS_DUPLICATE`;<br>- two versions of one record are two ordered entries;<br>- one record version in two roles is one basis entry and two `reliedAdmissionRoles` entries, ordered by `recordId`, `recordVersion`, `role`; a duplicate triple is refused;<br>- a role naming a record version absent from `reliedAdmissions` is refused;<br>- `lineage` entries citing one record version carry identical bases, and entries with differing bases are refused | Revision 4, item 3 |
| T17 | **Backup and restore:** an invalidation made before backup is still derived after restore; the closure assessment is reproducible; refusals still hold | Reconstruction |

---

## 5. Likely future implementation files and tests (none written)

These follow the extraction (dependency audit, step 3). The paths follow the pilot's layout (`scs-pilot/packages/api/src/platform/…`, `…/integration/…test.ts`). Their final location is the extraction's decision.

**Platform modules:**
- `platform/snapshots/snapshot.ts`: version 2, `admittedBy`, and the widened `admissionOutcome`;
- `platform/snapshots/compare.ts`: the ninth change kind, permanent and never masked;
- `platform/snapshots/map-v1.ts`;
- `platform/reliance/verify-basis.ts`: paths A, B1, B2 and C, the complete-basis proof, and the five refusal codes;
- `platform/admission/validity.ts`: held again, and the history of the admitting resolution;
- `platform/review/currency.ts`: the mandatory trigger, eleven triggers, `NOT_EVALUATED` leading to `UNDETERMINED`;
- `platform/reliance/closure.ts`: completeness, and no claim beyond an unresolved edge;
- `platform/reliance/closure-assessment-service.ts`: the registered service, triggered by the invalidating resolution, recording its own identity, registration and correlation;
- `platform/admission/basis.ts`: the `AdmissionBasis` shape, pinned by snapshots, direct reliances, decisions and resolved citations; and the legacy mapping;
- `platform/digests/digest-reference.ts`: `decisionDigest` read as `recordDigest`;
- **schemas:** `urn:aab:schema:platform:snapshot:2` and `urn:aab:schema:platform:reliance-closure-assessment:1`.

**AGR capabilities**, in each `agr/capabilities/cap-NN/`:
- trigger declarations;
- per-edge classification;
- path B1 and B2 checks on direct and cited evidence;
- hold wiring (CAP-08, CAP-10, CAP-12);
- refusal mapping;
- CAP-04's held-again state and resolution history.

**Tests:** `integration/admission-invalidation-*.test.ts`, one file per group of T1 to T16 and T18 to T21, plus a backup-restore proof step for T17.

**SCS:** nothing until SCS adopts. Then `capabilities/cap-09/currency.ts` turns `EVIDENCE_WITHDRAWN_OR_QUARANTINED` into a real check.

---

## 6. Confirmation

- No repository file was edited, created or deleted. No branch, commit, push or PR was made. `main` is at `a60c639`, and the working tree is clean.
- No system was changed: no database, service, configuration or CI.
- This revision is in the session's scratchpad only, beside revisions 1 to 3 and the three research reports.
- The attachment and manifest conflict, and the CAP-12 HUMAN/SERVICE correction, are not touched, and remain separate.

---

## 7. Change log: revision 1 → revision 2, mapped to the review's findings

| Finding | What changed | Where |
|---|---|---|
| **1. No rehabilitation of historical snapshots** | **Removed** revision 1's "restored admission" rule, under which a re-validated admitting decision reported no change. **Added:** the change is permanent for every snapshot taken before the invalidation. It is derived from the existence of an `UPHELD` invalidating resolution decided after the cut-off, which no later decision, re-admission or reconsideration can remove. Reliance needs a new snapshot and a new human decision. Test T3 added. | Amendment points 5, 6, 10; G8, G9; T3 |
| **2. `admissionOutcome` not repurposed** | `admissionDecisionId` and `admissionOutcome` keep their pair: the submission-time decision and its outcome. **`admittedBy` now holds** the mode, the effective `outcome`, and, for a reviewer's admission, `resolution { decisionId, decisionDigest, validityAtCutoff }`. To keep the pair true for reviewer-admitted members, the enumeration of `admissionOutcome` gains `HELD_FOR_REVIEW` (N1). | Point 3, 16; N1; T12 |
| **3. Refusal beyond evaluations** | The use-time refusal now covers four paths, set out separately: **A** snapshot and evaluation; **B1** direct reliance on an admitted record; **B2** resolved evidence citations; **C** human decisions. Each has its own refusal code. B2 checks reliance at use without re-resolving citations. Tests T6 and T7 added. | Point 8; section 2's matrix; T5 to T7 |
| **4. Unresolved edges** | **Removed** "everything beyond the unresolved edge is treated as `UNDETERMINED`." The closure is now marked **incomplete**, says where, may claim nothing beyond the edge, and may never claim completeness. **Every relying operation proves its own complete basis** (point 9). An unresolved basis returns `UNDETERMINED`, and the operation is refused with `ADMISSION_BASIS_UNDETERMINED`. Tests T8 and T9. | Points 9, 11; T8, T9 |
| **5. Point 10 against G6** | Reconciled. **No record represents the invalidation itself** (point 2). The **closure assessment is a separate, required record**, `RELIANCE_CLOSURE_ASSESSMENT`, written at every invalidation for audit and notification. It is non-authoritative and time-bound (`assessedAt`), marks and prevents nothing, and its absence never delays propagation. Registered in AAB-PLATFORM-05 (section 1d). | Points 2, 11; 1d; G6, N4; T10 |
| **6. Digest typing** | `admittedBy.resolution.decisionDigest` is a **`DigestReference` of type `recordDigest`**. Existing vocabulary nearly covers it: AAB-PLATFORM-10 already maps non-admitted written-once records (AAB-PLATFORM-04 status records, the key registry) to `recordDigest`, and the AGR contracts already name a human decision's "`recordDigest`". **A narrowly scoped consequential clarification is required**, because AAB-PLATFORM-08 defines only `decisionDigest` and AAB-PLATFORM-10 maps neither. AAB-PLATFORM-10's `recordDigest` object is widened to written-once governed records, a legacy row is added for `decisionDigest`, and AAB-PLATFORM-08 says `decisionDigest` is the decision's `recordDigest`. No new digest type is added. For automated admissions, no digest is pinned, because admission decisions have none (N3). | Point 3; 1b, 1c; N2, N3; T12 |
| **7. Exact counts** | Stated: **nine** AAB-PLATFORM-07 change kinds; **eleven** platform review triggers with AAB-PLATFORM-08's two. Every occurrence is listed: "eight" at P07:289, P08:221 and CAP-10:637; "all ten" in nine adoption rows (CAP-01:490, CAP-05:430, CAP-06:469, CAP-07:536, CAP-08:701, CAP-09:425, CAP-10:824, CAP-11:702, CAP-12:451). The roadmap's "All ten" (line 199) counts contracts, and is excluded. Test T13. | Point 5; 1b; section 2's count table; T13 |
| **8. Per-edge classification** | G7 is now **per reliance edge**: one relying act's use of one admitted record, along one path, in one role. **An activity in progress takes the highest consequence among its affected edges.** One mandatory safety, regulatory, rights or quality-control edge stops it at once. The matrix is restated by edges. Test T14. | Point 14; G7; section 2; T14 |
| **Also: preserving history versus prohibiting reliance** | Made explicit. History is preserved and shown (point 12). Reading, audit, challenge and reassessment, and the protective acts that reduce reliance, are never refused. New decisions, evaluations, packages, gates and operational acts on an invalidated basis fail closed. Test T11. | Points 8, 12; N5; T11 |

---

## 8. Change log: revision 2 → revision 3, mapped to the second review

| Item | What changed | Where |
|---|---|---|
| **1. The admission basis, normative and explicit** | **`AdmissionBasis`** is now defined once, normatively, with record identity and digest, the submission-time decision and its outcome, mode, effective outcome, the admitting resolution with its `recordDigest`-typed digest and validity, and `basisAt`. Every new path A, B1 and B2 reliance pins it, system-set and digest-covered:<br>- snapshot members carry `admittedBy`;<br>- direct reliance by a record carries `reliedAdmissions`;<br>- direct reliance by a human decision carries `decidedOn.admissionBasis` and `reliedAdmissions`;<br>- resolved citations carry `resolved.admissionBasis`.<br>Existing records stay under the legacy fail-closed mapping, now normative in point 13. N6 is resolved into the amendment. | Points 3, 3a, 8, 13, 16; 1b, 1d; T18, T19 |
| **2. Restoration, split by path** | Point 10 is now a per-path table:<br>- **A:** a new snapshot, evaluation and required human decision;<br>- **B1:** a newly established direct basis after valid re-admission, pinning the new basis, with the domain's approval;<br>- **B2:** a new record, version or governed decision with a fresh citation basis, the old citation never refreshed or re-resolved;<br>- **C:** a new valid decision, on a new snapshot and `CURRENT` where it reviews an evaluation.<br>Human reassessment stays mandatory. | Point 10; T15 |
| **3. Path C corrected** | Every human decision relied on must be `VALID`; only a review of an evaluation has currency and must also be `CURRENT`; the decision's pinned bases and its domain's checks also apply. Stated in AAB-PLATFORM-07 point 8 and in AAB-PLATFORM-08's consequential text. | Point 8; 1b; T20 |
| **4. Closure-assessment provenance** | A service-written assessment records the service's registration, execution identity, release and correlation; `triggerRecord` is the invalidating resolution; **`initiatedBy` only when a person actually initiated that run**, never the resolution's decider by default. | Point 11; N4; T10 |
| **5. Status language** | Stage 1 sets **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`**; nothing is marked closed. RD-01 is `CLOSED` only after Stage 2's implementation and every required test pass in CI. Contract resolution authorises **extraction planning**, not extraction execution. Execution also needs the audit's independent verification and RD-02 to RD-04 contract-resolved, and no AGR capability code relying on admitted evidence may be merged as operational before RD-01 is `CLOSED`. | Section 4 |
| **T10** | Tests an **intentionally absent or suppressed** closure assessment (the service disabled, or its write suppressed): every derived state, currency and refusal is unchanged, and the absence is reported as a defect. It no longer speaks of deleting an immutable record. | T10 |

---

## 9. Change log: revision 3 → revision 4, mapped to the third review

| Item | What changed | Where |
|---|---|---|
| **1. The closure traverses every carrier** | Point 11's traversal now searches **every admission-basis carrier of point 3**: a snapshot member's `admittedBy`, a record's `reliedAdmissions[]`, a decision's `decidedOn.admissionBasis`, a decision's `reliedAdmissions[]`, and `resolved.admissionBasis` on `lineage` entries and domain citations. Legacy references are found through point 13's mapping, and the dependants of everything reached are traversed in turn, including the carriers that name a reached admitted record. A closure that did not search a carrier is incomplete, and says which. The unresolved-edge rule is kept, and the closure is stated to **grant no authority**. T9 now proves discovery through each carrier. | Point 11; T9 |
| **2. A bounded inspection exemption** | "Reading, display and export for inspection" is replaced by **authorised reading, display and governed rendition for inspection**, under the existing access, disclosure, country-boundary, institutional-confidentiality and egress controls. The exemption creates no access right, permits no cross-country transfer or protected-data egress, does not bypass confidentiality, and never presents an invalidated basis as current evidence. T11 now proves that access and sovereignty restrictions still apply. | Point 8; T11 |
| **3. The canonical rule for `reliedAdmissions[]`** | Duplicates are **prohibited**: one entry per `recordId` and `recordVersion` in one carrier, refused with `ADMISSION_BASIS_DUPLICATE`. That makes the order by `recordId`, then `recordVersion`, total. **Roles are recorded separately**, in `reliedAdmissionRoles` (ordered by `recordId`, `recordVersion`, `role`; no duplicates; every role matching a basis entry), never by duplicating a basis. `lineage` entries citing one version carry identical bases. AAB-PLATFORM-08's text carries the same rule. The new test T21 proves deterministic ordering and duplicate handling. | Point 3; 1b; section 2's codes; T21 |
