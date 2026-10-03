# AAB-PLATFORM-07 — Frozen Evaluation Snapshots — Canonical Contract — 2026-09-28

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES FROZEN EVALUATION SNAPSHOTS: HOW A SET OF ADMITTED RECORDS IS FIXED AS THE INPUT TO AN EVALUATION, WHAT A SNAPSHOT RECORDS ABOUT EACH RECORD IT INCLUDES AND EACH IT EXCLUDES, HOW IT IS CONTENT-ADDRESSED, HOW AN EVALUATION IS BOUND TO IT, AND HOW A SNAPSHOT IS COMPARED WITH THE STORE AS THE STORE CHANGES. It admits no record, evaluates nothing, decides nothing, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

## Amendment of 2026-10-02: canonical JSON is AAB-PLATFORM-10's

**A clerical amendment, with AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests** (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-02.
- **"Canonical JSON" in this contract means `aab-canonical-json-1`** (AAB-PLATFORM-10, section 3). Section 3's definition, "UTF-8 JSON with object keys sorted by code point, no insignificant whitespace, and numbers and strings in their shortest standard form", is replaced by that reference.
- **A correction, recorded:** the pilot's algorithm sorts object keys **by UTF-16 code unit, not by code point.** The two orders differ only between a character at or above U+10000 and one from U+E000 to U+FFFF (AAB-PLATFORM-10, vector V03). This contract's wording was wrong about the code; the code is what is relied on, and is frozen.
- **Its digests are typed** (AAB-PLATFORM-10, section 6): `snapshotDigest` and `manifestDigest` are `snapshotDigest`s; `resultDigest` is a digest of the evaluation's result under `aab-canonical-json-1`; a member's digest is the admitted record's `recordDigest`, whose envelope AAB-PLATFORM-05 defines (amendment of 2026-10-02).
- **Marked in place "(amended on 2026-10-02)".** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Amendment of 2026-10-03: an admission invalidated after a snapshot

**Why.** A member of a snapshot is an admitted record. Where a reviewer admitted it, resolving a held record (AAB-PLATFORM-06, section 6), its admission rests on that human decision. AAB-PLATFORM-08 lets a human decision be challenged and invalidated (section 8). When a challenge to the admitting resolution is upheld, the record is no longer admitted, and is derived as held again. This contract had no change kind for that. A comparison showed the member's current state, no review relying on the snapshot became stale, and anything built on the record, or citing it, could go on relying on it as if it were still admitted. The gap was open in every AGR contract, and is finding RD-01 of the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-03. **Nothing is implemented by this amendment.**

**Approved draft:** `governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, SHA-256 `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2`; its approval and review history: `governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`.

**1. What invalidates an admission.** An admission is invalidated when, and only when, **the human decision that admitted the record becomes `INVALIDATED`** under AAB-PLATFORM-08, section 8. That happens when a challenge to the decision, made by a person holding the domain's challenging role with grounds, is resolved `UPHELD` by a person who is neither the challenger nor the decider. That `CHALLENGE_RESOLUTION` is the **invalidating resolution**. Nothing else invalidates an admission:
- **an automated admission** is not a human decision, and is never invalidated. A record wrongly admitted at submission is quarantined or superseded, which this contract already compares;
- **an open challenge** suspends nothing: the admission stands until the challenge is upheld (point 3 records it);
- **an integrity finding** is not an invalidation of admission. It is the domain's integrity process (for AGR, CAP-03), with its own triggers;
- **no service, rule or automated process** invalidates an admission. It is always a person's resolution of a person's challenge.

**2. What is written.**
- **No record represents the invalidation itself, and no status is written.** The invalidation *is* the challenge and its `UPHELD` resolution. Each is written once, attributable, signed and receipted under AAB-PLATFORM-08 (sections 2, 4 and 8), and the resolution names the challenged decision and its digest. That the admission is invalidated, and that the record is held again, are **derived when read** from those decisions (AAB-PLATFORM-06, section 6). It is never stored on the record, the decision, a snapshot or an evaluation, and never enters any `recordDigest` (AAB-PLATFORM-05, amendment of 2026-10-02, section A).
- **The invalidation's provenance** is that of those decisions: decider, verified authority, independence checks, reasoning, time, signature and digest.
- **One separate record is required: the reliance-closure assessment (point 11).** It records what was found to have relied on the admission, at a time, for audit and notification. It is not the invalidation, and never authoritative.

**3. The admission basis.** **Every new act that relies on an admitted record pins the basis of that admission** in its own written-once content. The system sets it, in the same consistent read as the act. The basis is normative, and has one shape wherever it is carried:
```typescript
interface AdmissionBasis {
  recordId: string;
  recordVersion: number;
  recordDigest: DigestReference;            // the admitted record's recordDigest (AAB-PLATFORM-10)
  admissionDecisionId: string;              // the decision made at submission (AAB-PLATFORM-06)
  admissionOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS" | "HELD_FOR_REVIEW";   // that decision's outcome
  mode: "AUTOMATED" | "REVIEW";
  effectiveOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";   // the outcome under which it is relied on
  resolution?: {                            // required where mode is "REVIEW"; absent where "AUTOMATED"
    decisionId: string;                     // the reviewer's resolution that admitted this version
    decisionDigest: DigestReference;        // digestType "recordDigest": AAB-PLATFORM-08's decisionDigest (AAB-PLATFORM-10, as clarified on 2026-10-03)
    validityAtBasis: "VALID" | "UNDER_CHALLENGE";
  };
  basisAt: string;                          // the platform's time of the consistent read that pinned it
}
```

**Where it is carried:**

| Path | Carrier | Field |
|---|---|---|
| **A.** A snapshot member | `EvaluationSnapshot.manifest.members[]` (this contract) | `admittedBy: { mode, effectiveOutcome, resolution? }`. The member's existing `recordId`, `recordVersion`, `recordDigest`, `admissionDecisionId` and `admissionOutcome`, with the snapshot's `cutoffAt` as `basisAt`, complete the basis. `validityAtBasis` is the validity at the cut-off |
| **B1.** Direct reliance by a record | The relying record's own content, inside its `recordDigest` envelope (AAB-PLATFORM-05, section A) | `reliedAdmissions: AdmissionBasis[]`, with `reliedAdmissionRoles` (below) |
| **B1.** Direct reliance by a human decision | `HumanDecision` (AAB-PLATFORM-08, as amended on 2026-10-03) | `decidedOn.admissionBasis` where `decidedOn.kind` is `RECORD`; `reliedAdmissions: AdmissionBasis[]`, with `reliedAdmissionRoles`, for admitted records the decision relies on but does not decide |
| **B2.** A resolved citation | Every `lineage` entry, and every domain citation field resolved through a registered resolver (AAB-PLATFORM-05, sections 4 and E), whose cited record kind is admitted evidence | `resolved.admissionBasis: AdmissionBasis`, set when the citation is resolved, at the citing record's admission |

- **System-set, never from a request.** A request that supplies an admission basis, or any part of one, is refused, as for every system-set field.
- **Pinned and covered.** It is part of its carrier's digest: `snapshotDigest`, the record's `recordDigest`, or the decision's `decisionDigest`. It is never changed and never refreshed.
- **One entry per record version, in one carrier.** `reliedAdmissions` never holds two entries with the same `recordId` and `recordVersion`. Within one act, a record version has exactly one admission basis, pinned in that act's one consistent read. A carrier with a duplicate entry is refused (`ADMISSION_BASIS_DUPLICATE`). Two versions of the same record are two entries.
- **Ordered by content:** `reliedAdmissions` by `recordId`, then `recordVersion`. Because duplicates are prohibited, that order is total, and the same set always serialises the same way (AAB-PLATFORM-10, section 3).
- **Roles are recorded separately from the basis.** Where one record version serves the act in several semantic roles (for example as safety evidence and as rights evidence), the roles are not recorded by duplicating its basis. They are listed in:
  ```typescript
  reliedAdmissionRoles: Array<{ recordId: string; recordVersion: number; role: string }>;   // the domain's role vocabulary
  ```
  - **Order:** by `recordId`, then `recordVersion`, then `role`;
  - **No duplicates:** a duplicate triple is refused (`ADMISSION_BASIS_DUPLICATE`);
  - **Matching:** every entry names a record version present in `reliedAdmissions`, and, where the domain defines roles, every `reliedAdmissions` entry has at least one role;
  - **Set by:** the system, from the act's declared use, and covered by the carrier's digest.

  Roles are what make each reliance edge distinct (point 14). A role never changes the basis.
- **Citations.** In AAB-PLATFORM-05's `lineage`, the same record version may be cited in several entries with different relations: the relation is the citation's role. Each entry's `resolved.admissionBasis` is then identical, because all are pinned at the citing record's one admission. Entries whose bases differ for the same record version are refused (`ADMISSION_BASIS_DUPLICATE`).
- **Only an admitted record can be pinned.** A record that is not admitted when the act's consistent read is taken, including one whose admitting resolution is `INVALIDATED`, cannot be relied on, and no basis is pinned for it.
- **For an automated admission,** `mode` is `"AUTOMATED"`, `effectiveOutcome` equals `admissionOutcome`, and there is no `resolution`. The admission decision is never invalidated, and has no digest of its own (AAB-PLATFORM-06).
- **For a reviewer's admission,** `admissionDecisionId` and `admissionOutcome` keep their existing relationship: the submission-time decision and its outcome, `HELD_FOR_REVIEW`. `effectiveOutcome` and `resolution` identify the act that admitted it.
- **Legacy.** Records, decisions and version `"1"` snapshots written before this amendment carry no basis. They are governed by the fail-closed mapping of point 13, never by an assumed basis.

**3a. Snapshot members.** `snapshotVersion` becomes `"2"`, and each member carries `admittedBy` (point 3). A member is never admitted by an invalidated decision: a record whose admitting resolution is `INVALIDATED` at the cut-off is not a member. `validityAtBasis` is recorded as it stood at the cut-off, like `quarantined`; a later challenge, upheld or dismissed, does not change the snapshot. Version `"1"` snapshots are not rewritten (point 13).

**4. Exclusions.** The exclusion reason `HELD_FOR_REVIEW` now applies when "the record is held, and **no valid resolution** has admitted or rejected it". A record held again because its admitting resolution was invalidated is excluded as `HELD_FOR_REVIEW`, with `detail` naming the invalidating resolution. If a new resolution has since rejected it, it is `REJECTED`. If a new resolution has admitted it again, it is a candidate under that resolution. The order of reasons is unchanged.

**5. A ninth change kind.** Section 8's comparison gains:

| Change | Meaning |
|---|---|
| `MEMBER_ADMISSION_INVALIDATED` | The resolution that admitted a member, valid at the cut-off, has been invalidated since the cut-off |

- **It is permanent for the snapshot.** It is reported whenever an invalidating resolution for the member's admitting resolution has been decided after the cut-off. **That stays true whatever happens later:** the record held again, rejected, or admitted again by a new resolution; the challenge reconsidered; the invalidating resolution itself challenged. Nothing rehabilitates a historical snapshot. **Reliance requires a new snapshot and a new human decision** (point 10).
- **It is derived from written-once records only:** the existence of an `UPHELD` resolution of a challenge to the member's admitting resolution, decided after the cut-off. It is never stored.
- **It is never masked.** A member that is also superseded, withdrawn or quarantined has each change reported. The comparison names every change for every member.
- **It is reported with:** the member; the invalidated resolution and its digest; the invalidating resolution, its digest and time; and the record's present derived state.
- **The counts:**
  - this contract's comparison now has **nine change kinds**;
  - with AAB-PLATFORM-08's two review triggers (`EVALUATION_SUPERSEDED`, `RULES_VERSION_CHANGED`), there are **eleven platform review triggers**;
  - decision 10 now reads "in nine platform change kinds".

**6. It is always a trigger.** Every other change kind is declared a trigger or not by each domain (AAB-PLATFORM-08, section 10). **`MEMBER_ADMISSION_INVALIDATED` is a trigger in every adoption, and no adoption may declare it otherwise.**
- A review whose snapshot reports it is `POTENTIALLY_STALE` (AAB-PLATFORM-08, section 9), and may not be relied on.
- Because the change is permanent for the snapshot (point 5), **the review never becomes current again.**

**7. Fail closed: the trigger.** Where the comparison cannot establish whether a member's admitting resolution has been invalidated since the cut-off, **the trigger's result is `NOT_EVALUATED`, and the review is `UNDETERMINED`** (AAB-PLATFORM-08, section 10). This applies where:
- a decision cannot be read or resolved;
- a version `"1"` member cannot be mapped;
- validity cannot be derived in the same consistent read;
- the record is outside the reader's domain or country.

The result is never `UNCHANGED`. The basis `NO_OPERATION_EXISTS` applies to this change kind only for a member admitted `AUTOMATED`, and is disclosed as such.

**8. No new reliance on an invalidated basis.** **Preserving history and prohibiting new reliance are different.** Everything already written stays as it was, and readable (point 12). What is prohibited is **new reliance**: a new decision, evaluation, package, gate, or operational act that uses an invalidated admission as part of its basis. Before it writes, whatever relies on admitted evidence checks its basis, in the same consistent read as its own write, along each path by which it relies:

| Path | What is relied on | The check | Refusal |
|---|---|---|---|
| **A. Snapshot and evaluation** | An evaluation, directly, or through a human decision, package, gate or later evaluation that pins it | For every member, the pinned `admittedBy.resolution` has not been invalidated since the snapshot's cut-off | `SNAPSHOT_MEMBER_ADMISSION_INVALIDATED` |
| **B1. Direct reliance on an admitted record** | An admitted record used directly as an input or gate, not through a snapshot. This includes records named as safety, regulatory, rights or quality-control evidence | **A new act** pins the record's current, valid basis (point 3). **An act relying on an earlier basis**, pinned by a record or decision it relies on, checks that the pinned `resolution` has not been invalidated since `basisAt` | `RELIED_ADMISSION_INVALIDATED` |
| **B2. Resolved evidence citations** | A record or decision relied on now, whose citations to admitted records were resolved earlier (AAB-PLATFORM-05, section 4) | For every citation it relies on, the pinned `resolved.admissionBasis.resolution` has not been invalidated since `basisAt` | `CITED_ADMISSION_INVALIDATED` |
| **C. Human decisions** | A human decision relied on | **Every human decision relied on must be `VALID`** (AAB-PLATFORM-08, section 8). **A review of an evaluation must also be `CURRENT`** (section 9), whose currency now includes point 6; no other human decision has currency. The decision's own pinned bases (B1, B2) and any further checks its domain defines also apply | AAB-PLATFORM-08's refusal, or the domain's |

- **Where any check cannot be completed, the operation's basis is unresolved: it returns `UNDETERMINED`, and is refused** (`ADMISSION_BASIS_UNDETERMINED`). This rule is point 9.
- **Paths B1 and B2 never refresh a basis or re-resolve a citation.** Resolution stays pinned at admission (AAB-PLATFORM-05, decision 6). The checks are reliance checks at the time of use, and change nothing written.
- **A refusal writes nothing,** and reveals no more than the requester may see (section 9).
- **Never refused by this check:**
  - **authorised reading, display and governed rendition for inspection** (AAB-PLATFORM-02), by a reader who may already read the item, under the existing access, disclosure, country-boundary, institutional-confidentiality and egress controls. **This exemption:**
    - **creates no access right.** A reader who may not read an item may not read it, its basis, its marker or its closure;
    - **permits no cross-country transfer, and no egress of protected data.** A rendition or export leaving the environment remains subject to the domain's egress authorisation and the sovereign data boundary, exactly as before;
    - **does not bypass confidentiality.** Protected information classes, compositions, personal information and traditional knowledge stay as restricted as before;
    - **never presents an invalidated basis as current evidence.** Every reading, display and rendition shows the derived markers of point 12;
  - audit and reconstruction;
  - a challenge;
  - **reassessment** on a new snapshot;
  - **protective acts that reduce reliance:** a quarantine, a hold, a supersession or withdrawal, a notification, a closure assessment.

**9. Every relying operation proves its own basis.** The platform does not classify what it cannot reach. **An operation that relies on admitted evidence must establish, in its own consistent read, the complete basis it relies on**: every evaluation (path A), every admitted record (B1), every resolved citation (B2) and every human decision (C), **together with the admission bases those elements themselves pin.** It must also show that no element rests on an invalidated admission. An element that cannot be resolved makes the basis **unresolved**, and the operation returns `UNDETERMINED` and is refused. No operation may assume an element is sound because a closure assessment did not mention it.

**10. Restoration, by path.** **Human reassessment is mandatory.** Nothing resting on an invalidated admission is ever relied on again. New reliance needs a **new basis**, established by a new act. No rule, service, re-admission, or later decision about the challenge restores the old basis. **What restores reliance depends on the path:**

| Path | What restores reliance | What never does |
|---|---|---|
| **A.** Snapshot and evaluation | **A new snapshot**, taken after the invalidation; **a new evaluation** bound to it; and **the human decision the domain requires** on that evaluation, which supersedes the stale decision with the reason `RECONSIDERATION` or `NEW_OBJECT` (AAB-PLATFORM-08, section 6) | A new comparison of the old snapshot; a re-admission of the record |
| **B1.** Direct reliance | **A newly established direct basis,** after a valid re-admission: a new act pinning the new admission basis (a new resolution, with its digest) under point 3, **with the human approval the domain requires** for that reliance | Re-reading the old record under its new admission; any update to the old act's pinned basis |
| **B2.** Resolved citation | **A new record, a new version, or a governed decision** that establishes a new citation basis: its citation is resolved afresh at its own admission, and pins the new basis | Refreshing or re-resolving the old citation; inferring that the old citation now points at a re-admitted record |
| **C.** Human decision | **A new, valid human decision.** Where it reviews an evaluation, it is made on **a new snapshot** (path A), and must be `CURRENT` when relied on | The old decision becoming valid or current again by any route |

**11. The reliance-closure assessment: required, separate, non-authoritative.** What relied on an invalidated admission is **derived when read** as its reliance closure:
1. **Through every admission-basis carrier of point 3:** whatever pins a basis naming the invalidated resolution:
   - every persisted snapshot whose member's `admittedBy` names it (path A);
   - every record whose `reliedAdmissions[]` names it (B1);
   - every human decision whose `decidedOn.admissionBasis` names it (B1);
   - every human decision whose `reliedAdmissions[]` names it (B1);
   - every record or decision whose `resolved.admissionBasis`, on a `lineage` entry or on a domain citation resolved through a registered resolver, names it (B2);
2. **Through legacy references** (point 13): every version `"1"` snapshot member, existing direct reference and existing resolved citation naming the invalidated record version, where the legacy mapping assigns it to the invalidated resolution. Where the mapping cannot decide, the edge is unresolved (below);
3. **Through the dependants of everything reached:**
   - every evaluation bound to a reached snapshot (section 7);
   - every human decision on a reached evaluation, and every act whose recorded currency assessment names a reached decision (AAB-PLATFORM-08, section 11);
   - every record or decision whose resolved citations name anything reached (AAB-PLATFORM-05, sections 4 and E), through the registered resolvers;
   - and, for every reached item that is itself an admitted record, every carrier of point 3 whose basis names it;
4. repeated until nothing new is reached.

**Every standard carrier of point 3 is traversed.** A closure that did not search one is incomplete, and says which.

- **Scope is demonstrated, never assumed:** the closure is computed from resolved references only.
- **An edge that cannot be resolved makes the closure incomplete,** and the closure says where. The closure **does not classify, and may not claim anything about, what lies beyond an unresolved edge**, and **may not claim completeness.** That something is absent from an incomplete closure says nothing about it; its own reliance is governed by point 9.
- **A closure grants no authority,** complete or incomplete. Presence in it marks nothing, and absence from it permits nothing.
- **A closure assessment is required at every invalidation,** for audit and notification. It is written promptly after the invalidating resolution, by a registered service or by a named person. It is **a separate record, written once**, of the record kind `RELIANCE_CLOSURE_ASSESSMENT`.
- **Its provenance, when a service writes it** (AAB-PLATFORM-05, section C):
  - `submittedBy` is the `SERVICE`;
  - `service` gives the service's `serviceRegistrationId`, `executionIdentity`, `softwareRelease`, `correlationId`, `method` and `methodVersion`;
  - `triggerKind` is `RECORD`, and `triggerRecord` is the invalidating resolution;
  - **`initiatedBy` is recorded only when a person actually initiated that execution,** for example by requesting a new assessment. It is never filled in automatically, and the run is **never attributed to the resolution's decider**, who decided the challenge and did not run the assessment;
  - where a named person writes it, `submittedBy` is that person.
- **Its content:**
  - the invalidating resolution and its digest;
  - `assessedAt`;
  - `completeness`, `COMPLETE` or `INCOMPLETE`, with every unresolved edge;
  - the closure found;
  - its `recordDigest`.
- **It is non-authoritative and time-bound.** It states what was found as at `assessedAt`, and is never read as current. It marks nothing, prevents nothing and permits nothing: propagation is derived (points 5 to 9), whether or not an assessment exists. **More assessments may follow, each as at its own time.**
- **A missing or late assessment is a defect,** disclosed in the domain's operations. It never delays propagation.

**12. Historical outputs are preserved and shown, never rewritten.**
- Every snapshot, evaluation, decision, package and record that relied on the invalidated admission **keeps its content and digest, and is still readable** as it was.
- When it is read, the reader is shown, derived at that time:
  - for a snapshot or evaluation, each `MEMBER_ADMISSION_INVALIDATED`, with the invalidating resolution;
  - for a review, its currency, `POTENTIALLY_STALE` or `UNDETERMINED`, with the trigger;
  - for anything else, that its basis included an admission since invalidated, and when.
- **An invalidated basis is never presented as current evidence.**

**13. Legacy, fail closed.** What was written before this amendment carries no admission basis. It is mapped when read, never assumed:
- **Version `"1"` snapshot members:**
  - where `admissionOutcome` is `ADMITTED` or `ADMITTED_WITH_LIMITATIONS` and the decision is the submission-time decision, the member was admitted `AUTOMATED`;
  - where the named decision is a reviewer's resolution, or the submission-time decision was `HELD_FOR_REVIEW`, the admitting resolution is the resolution that was valid at the cut-off, derived from the domain's decisions.
- **Existing direct reliance (B1) and existing resolved citations (B2):**
  - the admitting resolution is the one that was valid at the relying act's time, or at the citation's resolution, derived from the domain's decisions;
  - where that resolution has been invalidated at any time since, the basis is invalidated.
- **Where the admitting resolution cannot be established with certainty, the basis is undetermined** (points 7 and 9), and reliance on it is refused.

**14. What a domain's adoption must state.**
- **For every record kind that may be a member or be cited:** whether a reviewer can admit it, and so invalidate the admission.
- **For every reliance edge:**
  - an edge is one relying act's use of one admitted record, along one path (point 8), in one role;
  - its consequence is either **stop at once** or **mark for reassessment**:
    - **stop at once:** new reliance is refused, and an activity in progress is held under the domain's hold rules until a person reassesses it;
    - **mark for reassessment:** new reliance is refused, nothing in progress is held, and the output is shown as resting on an invalidated basis;
  - **an activity in progress with several affected edges takes the highest consequence among them.** One affected edge that is mandatory safety, regulatory, rights or quality-control evidence is enough to stop it at once;
  - an adoption that does not classify an edge is incomplete.
- **Who must be told,** how quickly, and by what record. Notification is never a precondition of propagation.
- **Its refusal codes,** mapped to point 8's.
- **The mapping of its existing members** (point 13).

**15. Audit and reconstruction.** Everything needed is written once and kept:
- the admitting resolution;
- the challenge and the invalidating resolution, with their receipts;
- the snapshots and evaluations;
- the currency assessment every relying act records (AAB-PLATFORM-08, section 11);
- the closure assessments.

**Whether a past act relied on an admission before it was invalidated** is answered by comparing that act's recorded time with the invalidating resolution's `decidedAt`. What a reader saw at a time is reproducible from the same records.

**16. What this amendment replaces.**
- **Section 3:**
  - `snapshotVersion`;
  - the member gains `admittedBy`;
  - `admissionOutcome`'s enumeration gains `"HELD_FOR_REVIEW"`, so that it can always hold the outcome of `admissionDecisionId`;
  - "`quarantined` is recorded as it stood at the cut-off" gains `admittedBy.resolution.validityAtBasis`, recorded as at the cut-off;
  - the `HELD_FOR_REVIEW` exclusion row (point 4).
- **Section 7:** the reliance checks of points 8 and 9, and the restoration rules of point 10.
- **Throughout:** the admission basis of point 3, which this contract defines, and which AAB-PLATFORM-05 and 08 carry (their amendments of 2026-10-03).
- **Section 8:** the ninth change kind, points 5 to 7.
- **Section 10:** the adoption's additions (point 14).
- **Decision 10:** nine change kinds.

Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## What "snapshot" means here

**A frozen evaluation snapshot is a governed record: the fixed, content-addressed input to an evaluation.** The word "snapshot" is used on the platform for other things, and this contract means none of them:

| Also called a "snapshot" | What it is | Governed by |
|---|---|---|
| A database transaction's consistent read | The storage mechanism by which a snapshot's records are read together (section 4). Not a record | The implementation |
| A backup, or a database snapshot in the backup proof | A copy of the store, for recovery | The backup and restore proof |
| A capability-fidelity manifest snapshot | A record of which capabilities and contracts are in force | The capability manifest runbook |
| A catalogue snapshot | Evidence of the database catalogue | Its own schema |
| A digest named "evaluation snapshot digest" in existing records | A digest of an evaluation's **result**, not of its input | Mapped in each domain's adoption (section 10) |

The word "manifest" is used here only for the snapshot's list of what it contains (section 3), never for the capability-fidelity manifest.

## Sources

- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: primitive 6, frozen evaluation snapshots ("one consistent read, a manifest, a pure evaluation, content-derived identifiers"); the mechanism is the platform's, "what is in scope for an evaluation" is the domain's
- `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md`: V12, the snapshot mechanism is entangled with one domain's requirement rules, and its currency with that domain's staleness rules
- `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`: primitive 6, implemented in one domain; stored originals are not re-checked at evaluation time
- `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md`: provenance carried by reference, gaps included (section 9); integrity established at admission (section 3); resolution pinned at admission (section 4); supersession derived when read (section 5)
- `governance/AAB-PLATFORM-06-ADMISSION-DECISIONS-CANONICAL-CONTRACT-2026-09-27.md`: what "admitted" means; reading admitted records with their decisions; disclosed selection policy (section 8); held records (section 6); quarantine (section 7)
- `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`: who requests a snapshot
- The snapshot and evaluation contracts of both domains, surveyed for this contract: how each selects, fixes, identifies, persists and compares its evaluation inputs, and the conflicts between them (section 11)

## Why this contract is needed

- **An evaluation is only as trustworthy as the certainty of what it read.** A result that cannot be tied to an exact, fixed set of records cannot be reproduced, reviewed or challenged.
- **The domains fix their inputs differently.** One embeds the input list in the evaluation result, with no digest over the input and no record of what was left out. The other names an identity and a set digest, but defines neither, and persists nothing.
- **A human decision needs something fixed to decide on** (AAB-PLATFORM-08), and currency needs something fixed to compare the store with. Both need the snapshot to be a record in its own right.

## 1. What a snapshot is

**A snapshot is an immutable, content-addressed record of exactly what an evaluation reads:** which admitted records it includes, at which versions, with which admission decisions, limitations and provenance gaps; which candidate records it excludes, and why; and which other inputs it depends on.

**A snapshot asserts:**
- at its cut-off, in one consistent read of the store, these were the records the domain's scope rule and the consumer's selection policy produced;
- each member is the version named, with the digest named, admitted by the decision named;
- each candidate that is not a member is listed, with the reason it was excluded.

**It does not assert:**
- that the members are true, complete or sufficient for anything: a snapshot inherits admission's boundaries (AAB-PLATFORM-06, section 1);
- that no relevant record exists outside it: it holds what the store held, within scope, at the cut-off;
- anything about the store after its cut-off. How the store has changed since is derived when read (section 8).

## 2. Scope and selection

- **The scope rule is the domain's.** It says which records are candidates for an evaluation of a given subject: for example, every admitted record about the subject. It is named and versioned.
- **The selection policy is the consumer's,** and it is disclosed (AAB-PLATFORM-06, section 8). It is recorded in the snapshot, with its version, and says:
  - **how the candidates are found:** `SCOPE_DERIVED`, where the system finds every candidate under the scope rule and the requester cannot narrow it; or `REQUESTER_LISTED`, where the requester names the records, and the domain's scope rule decides which of them may be members;
  - **what it does with quarantined candidates:** `EXCLUDE` (the platform default), `INCLUDE` (only where the domain's adoption says so, under AAB-PLATFORM-06, section 7), or `REFUSE`, where a quarantined candidate refuses the whole snapshot;
  - **any further exclusion it makes,** by rule, never silently.
- **Every candidate that is not a member is an exclusion,** recorded with its reason (section 3). Nothing a candidate could have been is left unsaid.
- **Candidates are found only among the records the requester may read.** In `SCOPE_DERIVED` mode, a record the requester may not read is not a candidate, and is never listed, so that a snapshot never reveals that it exists. The snapshot does not claim to cover records outside the requester's view, and an evaluation of it discloses that its input is limited to what the requester may read. Because the view is part of what was read, two requesters with different views take snapshots with different manifests.
- **What is never a member:**
  - a record that is not admitted: a held record, or one a reviewer rejected (AAB-PLATFORM-06, section 6);
  - a version that has been superseded, or a record that has been withdrawn, at the cut-off (AAB-PLATFORM-05, section 5). The superseding version is a candidate in its place, if it is in scope;
  - a record the requester may not read;
  - a record in another country's store, except by reference under an explicit, authorised sharing arrangement, as AAB-PLATFORM-05 (section 9) requires. A record that cannot be carried with its provenance is not a member.
- **A limitation never excludes a record by itself** (AAB-PLATFORM-06, section 8). A member carries its limitations; a policy that excludes records with limitations says so, and records each exclusion.

## 3. The snapshot record

```typescript
interface EvaluationSnapshot {
  snapshotId: string;                   // content-derived: "snapshot:" + snapshotDigest
  snapshotVersion: "1";
  snapshotDigest: string;               // "sha256:" over every field below, in canonical JSON
  manifestDigest: string;               // "sha256:" over `manifest` alone, in canonical JSON

  cutoffAt: string;                     // the platform's clock, at the consistent read (section 4)
  requestedBy: ActorReference;          // AAB-PLATFORM-03
  integrityRecheck: "PERFORMED" | "NOT_PERFORMED";   // section 6

  manifest: {
    scope: {
      scopeRule: string;                // the domain's scope rule
      scopeRuleVersion: string;
      subjectKey: string;               // content-derived from the subject's canonical description
    };
    selection: {
      mode: "SCOPE_DERIVED" | "REQUESTER_LISTED";
      quarantined: "EXCLUDE" | "INCLUDE" | "REFUSE";
      policy: string;                   // the consumer's selection policy
      policyVersion: string;
    };
    members: Array<{
      recordId: string;
      recordVersion: number;
      recordDigest: string;             // the admission decision's recordDigest (AAB-PLATFORM-06, section 3)
      admissionDecisionId: string;
      admissionOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";
      limitationCodes: string[];
      provenanceGaps: ProvenanceGap[];  // AAB-PLATFORM-05, section 6
      quarantined: boolean;             // true only where the selection includes quarantined records
    }>;
    exclusions: Array<{
      recordId: string;
      recordVersion?: number;
      reason:                           // exactly one per candidate: the first that applies, in this order
        | "NOT_AVAILABLE"
        | "NOT_SHAREABLE"
        | "OUT_OF_SCOPE"
        | "HELD_FOR_REVIEW"
        | "REJECTED"
        | "WITHDRAWN"
        | "SUPERSEDED"
        | "QUARANTINED"
        | "EXCLUDED_BY_POLICY";
      detail?: string;                  // required for EXCLUDED_BY_POLICY: the policy rule that excluded it
    }>;
    pinnedInputs: Array<{
      kind: string;                     // the domain's name for the input
      id: string;
      version: string;
      digest: string;
    }>;
  };
}
```

**Field rules:**
- **Canonical JSON** is `aab-canonical-json-1`, as AAB-PLATFORM-10 defines it: object keys sorted by UTF-16 code unit (amended on 2026-10-02; this line said "by code point", which was wrong about the code). Every digest in this contract is SHA-256 over it.
- **Arrays are ordered by content, never by time:** members by `recordId`, then `recordVersion`; exclusions by `recordId`, then `reason`; pinned inputs by `kind`, then `id`, then `version`; codes and gaps lexically. The same set always serialises the same way.
- **Two digests, for two questions:**
  - **`manifestDigest`** answers: is this the same input? Two snapshots with the same manifest have the same `manifestDigest`, whenever and by whomever they were taken;
  - **`snapshotDigest`** answers: is this the same snapshot? It covers the manifest, the cut-off, the requester and the integrity recheck. It is the snapshot's content address, and `snapshotId` is derived from it.
- **A member's digest is the admitted record's digest,** over the record and its provenance, as its admission decision records it. It is never the digest of an original file alone: that digest is part of the record's provenance, and is covered by the record's digest.
- **A member carries its limitations and provenance gaps,** as AAB-PLATFORM-05 (section 9) requires of anything built from admitted records. A snapshot never drops one.
- **`quarantined` is recorded as it stood at the cut-off.** A later quarantine or release does not change the snapshot (section 8).

**Exclusion reasons.** Every candidate that is not a member has exactly one reason: the first in this order that applies. Together they cover every way a candidate can fail to be a member, and none overlaps another:

| Reason | Applies when |
|---|---|
| `NOT_AVAILABLE` | A record the requester named does not exist, or exists but may not be read by the requester. The two are deliberately not distinguished, so that an exclusion never reveals that a record exists (section 9) |
| `NOT_SHAREABLE` | The candidate is in another country's store, and no authorised sharing arrangement permits it to be carried with its provenance (AAB-PLATFORM-05, section 9) |
| `OUT_OF_SCOPE` | A record the requester named is not in scope for this subject under the domain's scope rule |
| `HELD_FOR_REVIEW` | The record is held, and no reviewer has resolved it (AAB-PLATFORM-06, section 6) |
| `REJECTED` | The record was held, and a reviewer resolved it as rejected |
| `WITHDRAWN` | The record was admitted, and has been withdrawn with no version replacing it |
| `SUPERSEDED` | The version was admitted, and a later version replaces it. The later version is a candidate in its own right |
| `QUARANTINED` | The record is admitted and current, is quarantined, and the selection policy is `EXCLUDE` |
| `EXCLUDED_BY_POLICY` | The record is admitted, current and eligible, and a rule of the selection policy, named in `detail`, excludes it |

A candidate to which none applies is a member. A quarantined candidate under an `INCLUDE` policy is a member marked `quarantined`; under a `REFUSE` policy, there is no snapshot (section 9). A record admitted after the cut-off is not a candidate. A refused submission left no record (AAB-PLATFORM-06, section 2), so it can never be a candidate.

## 4. Taking a snapshot

- **One consistent read.** The candidates, their admission decisions, their supersession and quarantine state, the exclusions and the pinned inputs are all read in one consistent read of the store. Nothing is read from outside it.
- **The cut-off is the time of that read,** on the platform's clock. The cut-off is never chosen by the requester. Every member's admission time is at or before the cut-off, and every state derived when read (supersession, quarantine) is derived as at the cut-off. An implementation guarantees this, whatever its storage engine's distinction between a transaction's start time and the moment its read is fixed.
- **No historical snapshots.** A snapshot is never taken "as of" a past time. A consumer that needs the input as it stood at a past time uses a snapshot taken at that time. Reconstructing the store's past state is a different capability, not defined here.
- **The system sets every field.** The requester supplies the subject, the selection policy and, in `REQUESTER_LISTED` mode, the record list. Nothing else is taken from the request.
- **An empty snapshot is recorded as empty,** never as complete. The domain says whether an evaluation of an empty snapshot is refused.

## 5. Pinned inputs

**Everything the evaluation reads, other than the members, that could change its result is pinned in the snapshot,** by identifier, version and digest. For example: the version of the subject the evaluation is about, a human resolution the evaluation applies, a status record it relies on, reference data it consults, or a specification it evaluates against when the specification is data.
- **An input that is read but not pinned makes the evaluation unreproducible.** It is never allowed in a new snapshot.
- **The evaluator's rules are not pinned inputs.** They are bound to the evaluation, not the snapshot (section 7).

## 6. Integrity at the time of a snapshot

- **Integrity is established once, at admission** (AAB-PLATFORM-05, section 3). A snapshot does not re-establish it.
- **A snapshot may re-check the stored originals of its members,** as a check on the store, and records whether it did: `integrityRecheck` is `PERFORMED` or `NOT_PERFORMED`. A snapshot that did not re-check never implies that it did.
- **A re-check that finds a stored original changed refuses the snapshot,** and writes nothing (section 9). It is never recorded as a failed integrity status on the record, a member, or the snapshot. It is a store integrity incident, handled under the platform's store integrity rules.
- **The domain says whether a re-check is required.** Where it is not, the evaluation discloses that stored originals were not re-checked.

## 7. Binding an evaluation to a snapshot

**An evaluation is a pure function of its snapshot and its rules.** It reads nothing else.

**Every evaluation record carries:**

```typescript
interface SnapshotBinding {
  snapshotId: string;
  snapshotDigest: string;
  manifestDigest: string;
  evaluatorVersion: string;             // the evaluating code
  rulesVersion: string;                 // the domain's evaluation rules
  rulesDigest?: string;                 // required when the rules are data
  resultDigest: string;                 // "sha256:" over the evaluation's result, in canonical JSON
  nonReproducibleFields: string[];      // fields of the result not derived from content
}
```

- **The snapshot is persisted before, or with, anything that relies on it.** An evaluation that is recorded, and its snapshot, are written in one transaction. The snapshot is written once and never changed or deleted.
- **A snapshot may be computed without being persisted,** for an evaluation that writes nothing. Nothing may then rely on it: no evaluation record, human decision, package or later comparison may name a snapshot that is not persisted.
- **Many evaluations may bind to one snapshot,** for example under different rules versions. A persisted snapshot with the same `snapshotDigest` is stored once.
- **Reproducibility is the platform's claim, and it is exact:** the same manifest, evaluated by the same evaluator and rules versions, gives the same result, except in the fields the evaluation names in `nonReproducibleFields`, such as generated identifiers and times. Identifiers of what the evaluation finds (gaps, conflicts, findings) are derived from content.
- **The binding is verified whenever it is used.** Whatever relies on an evaluation (a human decision, a package, a later comparison) checks the snapshot's digest and the result's digest, and refuses on a mismatch.
- **What is decided on is the evaluation, bound to its snapshot.** AAB-PLATFORM-08 defines how a named person decides on it.

## 8. Comparing a snapshot with the store

**A snapshot never changes. How the store has changed since the cut-off is derived when read,** by comparing the snapshot with a new consistent read under the same scope rule and selection policy. The comparison names each change, in platform terms:

| Change | Meaning |
|---|---|
| `NEW_CANDIDATE` | A record now in scope that was not a candidate at the cut-off |
| `MEMBER_SUPERSEDED` | A member has been superseded or withdrawn |
| `MEMBER_QUARANTINED` | A member has been quarantined |
| `QUARANTINE_RELEASED` | A record excluded or marked as quarantined has been released |
| `EXCLUSION_RESOLVED` | A record excluded for another reason would now be a member |
| `PINNED_INPUT_CHANGED` | A pinned input has a later version |
| `SCOPE_RULE_CHANGED` / `POLICY_CHANGED` | The scope rule or selection policy has a later version |

- **The comparison is never stored as a status of the snapshot.** It is derived each time it is asked for, at the time it is asked.
- **Past uses are unchanged.** An evaluation, package or decision bound to a snapshot still names it, as it was.
- **What a change means for a decision is not defined here.** Whether a change makes a human decision stale is decided by the domain's rules, under AAB-PLATFORM-08.

## 9. Refusals

- **A snapshot that cannot be taken is refused, and nothing is written:** no snapshot, no evaluation, no receipt. The response is the platform's fail-closed envelope, with the domain's failure code and every reason.
- **The platform's refusal conditions:** a requester-listed record that is not available, where the domain refuses rather than excludes it as `NOT_AVAILABLE`, with the same response whether the record does not exist or may not be read; a quarantined candidate under a `REFUSE` policy; a failed integrity re-check; a read that could not be completed as one consistent read; an input the evaluation needs that cannot be pinned.
- **The domain adds its own,** with their codes, order and status codes.
- **A refusal never reveals more than the requester may see** (AAB-PLATFORM-06, section 5).

## 10. Adopting this contract

A domain adopts this contract by amendment to its evaluation contracts. The amendment must document:
- **its scope rules,** each named and versioned;
- **its selection policies,** their modes and quarantine handling, and where, if anywhere, quarantined records are included;
- **its pinned inputs,** by kind;
- **whether an integrity re-check is required,** and whether an empty snapshot refuses an evaluation;
- **its evaluator and rules versioning,** and its non-reproducible fields;
- **its refusal codes;**
- **what its existing evaluations already store, field by field, mapped to this contract,** with every difference disclosed. In particular:
  - an input list embedded in an evaluation's result is that evaluation's snapshot, **mapped when read, not rewritten**;
  - an existing digest of an evaluation's result, whatever it is named, is a `resultDigest`. Its stored name is kept;
  - a member digest that is the digest of an original file, not of the admitted record, is disclosed as such;
  - an input that existing evaluations read but did not record, such as a status the evaluation relied on, is disclosed as unpinned in those evaluations;
  - existing evaluations record no exclusions. That is disclosed, and never read as "nothing was excluded".

Stored evaluations are never rewritten. New snapshots follow this contract from the adoption's effective date.

## 11. Settled here: what the two domains' contracts disagreed on

| Disagreement | Settled |
|---|---|
| The snapshot embedded in the evaluation (one domain) or a named identity with nothing persisted (the other) | A snapshot is a record in its own right, content-addressed, persisted whenever anything relies on it (sections 3 and 7). |
| No digest over the input (one domain); a set digest named but not defined (the other) | Two defined digests: `manifestDigest` over the input, `snapshotDigest` over the snapshot (section 3). |
| A member's digest: an original file's declared digest (one domain); none (the other) | The admitted record's digest, from its admission decision (section 3). |
| Who selects: the system (one domain); the requester (the other) | Both, as a disclosed selection mode; the domain's scope rule decides membership either way (section 2). |
| Exclusions: not recorded (one domain); recorded with reasons (the other) | Every candidate not included is recorded, with its reason (sections 2 and 3). |
| Quarantined records in scope: refuse the evaluation (one domain); exclude by default (the other) | Exclude by default; refuse or include as disclosed policy (section 2). |
| "As of": the store's clock (one domain); a time chosen by the requester (the other) | The platform's clock at the consistent read. No historical snapshots (section 4). |
| Inputs read but not recorded | Every input that could change the result is pinned (section 5). |
| Stored originals re-checked at evaluation, or not | Optional, always disclosed; a failed re-check refuses (section 6). |
| Staleness owned by a review capability (one domain), undecided (the other) | The snapshot's comparison with the store is here (section 8); what it means for a decision is AAB-PLATFORM-08. |
| A digest named for a snapshot that hashes an evaluation's result | Mapped to `resultDigest`; the name is kept where stored (section 10). |

## What this contract does not establish

- It evaluates nothing, and defines no domain's scope rules, selection policies, evaluation rules or refusal codes.
- It does not define human decisions, or the currency of a decision. That is AAB-PLATFORM-08.
- It does not define reconstruction of the store's past state.
- It does not define backups, capability manifests or any other thing called a snapshot.
- It does not change any stored record or evaluation, and does not rename any stored field.
- It implements nothing.

## Decisions recorded on 2026-09-28

Confirmed in review:

1. **A snapshot is a record in its own right,** immutable and content-addressed, with `snapshotId` derived from `snapshotDigest` (sections 1 and 3). A snapshot is what was evaluated; a result is what the evaluation found. They are separate records.
2. **Two digests:** `manifestDigest` for "same input", `snapshotDigest` for "same snapshot" (section 3). They answer different questions, and reproducibility claims depend on the distinction.
3. **A member is identified by the admitted record's digest and its admission decision,** and carries its limitations and provenance gaps (section 3). An original file's digest alone is not enough: what matters is what was admitted, under what decision, with what limitations.
4. **Scope is the domain's, selection is the consumer's disclosed policy,** in one of two modes, and every excluded candidate is recorded with its reason, never inferred (sections 2 and 3). A limitation never excludes a record by itself. An absent record with no recorded reason cannot be told apart from a record that was missed. The nine reasons were checked in review to cover every case without overlap: each candidate has exactly one, the first that applies in a fixed order; a record the requester may not read is never revealed (section 3, "Exclusion reasons").
5. **Quarantined candidates are excluded by default;** refusing or including is disclosed policy, and a domain states explicitly where quarantined records are included (section 2).
6. **The cut-off is the platform's clock at one consistent read;** no historical snapshots (section 4). The requester never chooses the time: a requester who could would be able to take a snapshot that leaves out inconvenient recent admissions. Rebuilding past state is a possible future capability.
7. **Every input that could change the result is pinned;** an input that is read but not pinned is not allowed in a new snapshot. The evaluator's rules are bound to the evaluation, not the snapshot (sections 5 and 7).
8. **Integrity re-check is optional and always disclosed;** a failed re-check refuses the snapshot, is handled as a store integrity incident, and is never recorded as a failed status, as AAB-PLATFORM-05 treats a failed integrity check (section 6).
9. **Nothing relies on a snapshot that is not persisted;** reproducibility is exact: the same manifest, evaluated by the same evaluator and rules versions, gives the same result, except in the fields named as non-reproducible. The binding is checked every time it is used (section 7).
10. **Comparison with the store is derived when read, never stored,** in eight platform change kinds; what a change means for a decision is AAB-PLATFORM-08's (section 8). Storing derived state would create the same problem as storing an admission status on a record (AAB-PLATFORM-06).

## Open items

- **AAB-PLATFORM-08** defines the human decision on an evaluation bound to a snapshot, and the currency of that decision, using the comparison in section 8.
- **Reconstruction of the store's past state,** for a snapshot "as of" a past time: a possible future capability, with its own contract. Not a current requirement.
- **Relational storage of members.** Where an implementation stores members in rows as well as in the snapshot record, the rows carry the version and digest, not identifiers alone. This is an implementation matter, recorded for the adoption.
- **Implementation:** a shared snapshot module, separated from any domain's requirement rules (dependency audit, V12), with a platform schema in the `urn:aab:schema:` namespace.
