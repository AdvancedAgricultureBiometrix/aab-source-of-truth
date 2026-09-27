# AAB-PLATFORM-08 — Attributable Human Review with Currency — Canonical Contract — 2026-09-28

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES ATTRIBUTABLE HUMAN DECISIONS: WHO MAY MAKE ONE, HOW IT IS ATTRIBUTED, AUTHORISED, SIGNED AND BOUND TO EXACTLY WHAT WAS DECIDED ON, WHAT REASONS IT MUST GIVE, HOW IT IS CHALLENGED AND SUPERSEDED WITHOUT BEING CHANGED, AND HOW THE CURRENCY OF A DECISION ON AN EVALUATION IS DERIVED OVER TIME. It makes no decision, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

## What "decision", "review" and "currency" mean here

**A human decision is a permanent record of one named person's judgement on exactly one governed object.** The words are used on the platform for other things, and this contract means none of them:

| Also called a "decision" or "review" | What it is | Governed by |
|---|---|---|
| An admission decision made at submission | The application of a domain's rules, never a person's judgement | AAB-PLATFORM-06 |
| A capability admission decision | A governance decision on whether a capability is admitted | The capability admission authority definition |
| A governance decision (AAB-PLATFORM-03, section 4) | A signed decision about the platform's governance itself | AAB-PLATFORM-03 |
| A "Decisions recorded" section of a contract | The design choices confirmed when the contract was reviewed | Each contract |
| The decision field of a receipt | The kind of governed write the receipt records | Each capability |
| An independent review of code or a contract | An assessment of the platform's own work | The review workflow |

**Currency** here means whether a decision may still be relied on. It has nothing to do with money.

## Sources

- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: primitive 7; the human decision mechanism ("an attributable, permanent decision record, bound to exactly what was decided on") and the currency mechanism ("deriving status at read time, never storing it; append-only assessments") are the platform's; outcome vocabularies, required reasoning, permitted outcomes, separated duties and "what makes a decision stale" are the domain's
- `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md`: V12, the currency mechanism is mixed with one domain's staleness rules
- `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`: primitive 7; reviewer authority is declared, not verified; a decision cannot be challenged or corrected; staleness triggers exist that no operation can fire
- `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`: actor references, scoped authority grants, accountable names as personal data, signatures made outside the server, and what crosses a country boundary (section 4)
- `governance/AAB-PLATFORM-06-ADMISSION-DECISIONS-CANONICAL-CONTRACT-2026-09-27.md`: the resolution of held records (section 6) and quarantine (section 7), both deferred to this contract
- `governance/AAB-PLATFORM-07-FROZEN-EVALUATION-SNAPSHOTS-CANONICAL-CONTRACT-2026-09-28.md`: the evaluation bound to its snapshot (section 7), the object of a review; the comparison with the store (section 8), the basis of currency
- `governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md`: the independence expected of a named, accountable decider; a decision never edited, only superseded
- `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md`: "the accountable person sees both sides, decides, and the platform records their reasoning permanently"
- The human review contracts of both domains, surveyed for this contract: their outcomes, reviewer rules, independence checks, reasoning, supersession, challenge and currency, and the conflicts between them (section 12)

## Why this contract is needed

- **The platform's purpose ends in a named person's judgement.** Admission and evaluation disclose what is known and what is not. A person decides what to do about it. That decision is only worth as much as the certainty of who made it, on what authority, on exactly what, and why.
- **Both domains leave the essentials unsettled.** One records a reviewer's authority as declared, not verified, has no signature, and cannot challenge or correct a decision. The other defines no independence rule and no currency, and stores staleness as notices.
- **A decision's reliability changes after it is made,** as the store changes. Deciding that from stored status leaves it wrong as soon as anything changes. It must be derived.

## 1. What a human decision is

**A human decision records that one named person, holding verified authority, having addressed every finding disclosed to them, decided one outcome on exactly one governed object, at one time.**

**It applies to every attributable human decision on the platform:**
- **a review** of an evaluation bound to its snapshot (AAB-PLATFORM-07, section 7);
- **the resolution of a held record** (AAB-PLATFORM-06, section 6);
- **a quarantine, or its release** (AAB-PLATFORM-06, section 7);
- **the resolution of a challenge** to a human decision (section 8);
- any other human decision a domain defines, such as the resolution of a conflict between records.

**Currency (sections 9 to 11) applies only to reviews of evaluations.** A held record's resolution and a quarantine act on records that never change; what happens to those records afterwards is AAB-PLATFORM-05 and 06's.

**A human decision asserts:**
- the person named decided the outcome recorded, with the authority recorded, at the time recorded;
- they decided on exactly the object bound, by its digests;
- they addressed each finding the object disclosed, as the reasoning records.

**It does not assert:**
- that the object's content is true, complete or sufficient: a decision is a judgement, not a verification;
- that anything beyond the step the domain names for the outcome is authorised;
- that it may still be relied on. That is its currency, derived when read (section 9).

## 2. The decider

- **One decider per decision.** A decision is made by one person. A domain that requires more than one person composes several decisions (section 7).
- **The decider is a human.** The actor's type is `HUMAN` (AAB-PLATFORM-03). A system never makes a human decision, and an automated outcome is never recorded as one.
- **The decider is named, within the country.** The country's actor directory holds an accountable name for the decider at the time of the decision, or the decision is refused. The decision itself identifies the decider by `actorId` and `issuer` only: an accountable name is personal data, and never leaves the country's boundary with the decision (AAB-PLATFORM-03, section 4).
- **The decider decides in their own name.** A human decision is never made under representation, or on anyone else's behalf. A request that names someone the decider acts for is refused.
- **Authority is verified, never declared.** The decider holds the domain's role for the decision kind, through a scoped authority grant (AAB-PLATFORM-03) that covers the object's subject, at the time of the decision. The grant is named in the decision. A statement of authority that the platform cannot verify is not authority, and never makes a decision valid.

## 3. Independence

**The decider is never any of these, compared as actors (AAB-PLATFORM-03), not by name.** These rules are the platform's. No domain adoption can relax them:
- **the submitter of the object,** when the object is a record: the submitter never resolves their own held record, and never releases a quarantine on their own record (AAB-PLATFORM-06);
- **the requester of the evaluation,** when the object is an evaluation;
- **the submitter of any member of the evaluation's snapshot;**
- **the author of any human decision pinned in the snapshot,** such as the resolution of a conflict the evaluation applied;
- **the challenger, or the decider of the challenged decision,** when the object is a challenge (section 8).

**The domain adds its own separation of duties,** such as the decider's organisation, a commercial interest, or a declared conflict of interest. It never removes one of the platform's.

**The decision records every independence check that was made,** and each check's result. A check that was not made is never recorded as passed.

## 4. The decision record

```typescript
interface HumanDecision {
  decisionId: string;
  humanDecisionVersion: "1";
  decisionKind: string;                   // the domain's name for the kind of decision

  // What was decided on: exactly one object, by its digests
  decidedOn: {
    kind: "EVALUATION" | "RECORD" | "CHALLENGE";
    objectId: string;                     // the evaluationId, recordId or challengeId
    objectDigest: string;                 // the evaluation's resultDigest, the recordDigest, or the challenge's digest
    snapshotId?: string;                  // EVALUATION: required (AAB-PLATFORM-07)
    snapshotDigest?: string;              // EVALUATION: required
    recordVersion?: number;               // RECORD: required
    admissionDecisionId?: string;         // RECORD: required (AAB-PLATFORM-06)
  };
  subjectKey: string;                     // what the decision is about, for supersession (section 6)

  outcome: string;                        // the domain's outcome
  outcomeClass: "AFFIRMATIVE" | "NEGATIVE" | "DEFERRED";
  rulesVersion: string;                   // the domain's decision rules
  reliableUntil?: string;                 // reviews only: set from the domain's rules (section 10)

  // Who, and on what authority
  decidedBy: ActorReference;              // HUMAN; actorId and issuer (AAB-PLATFORM-03)
  authority: { role: string; grantId: string };
  independenceChecks: Array<{ check: string; result: "PASSED" | "NOT_EVALUATED"; reason?: string }>;
  decidedAt: string;                      // the platform's clock

  // Why
  reasoning: {
    findingsAddressed: Array<{ findingId: string; response: string }>;
    disclosuresAcknowledged: string[];    // the object's disclosed limits, each by its identifier
    basisForOutcome: string;
    remainingConcerns?: string;
    conditions?: string[];
  };

  supersedes?: { decisionId: string; decisionDigest: string;
                 reason: "CORRECTION" | "RECONSIDERATION" | "NEW_OBJECT"; explanation: string };

  // What a human decision does not mean; always true
  boundary: {
    judgementIsNotVerification: true;
    boundToDecidedObjectOnly: true;
    authorisesOnlyTheNamedStep: true;
  };

  decisionDigest: string;                 // "sha256:" over every field above, in canonical JSON (AAB-PLATFORM-07, section 3)
  signature: { algorithm: "Ed25519"; keyId: string; signedContentDigest: string; value: string };
}
```

**Field rules:**
- **The binding is verified when the decision is made.** The object's digests are recomputed from the store, and the decision is refused on any mismatch. The object must be persisted (AAB-PLATFORM-07, section 7), and must not be superseded when the decision is made.
- **Outcomes are the domain's, each in exactly one class:**
  - `AFFIRMATIVE`: permits the step the domain names for it (for example, to proceed, or to admit);
  - `NEGATIVE`: refuses that step (for example, not to proceed, or to reject);
  - `DEFERRED`: decides neither, and says what is needed (for example, more evidence, a specialist, or replication).
  
  The domain says which outcomes are permitted for each state of the object. An outcome is never a quarantine: to quarantine is its own decision kind, which writes a status record (AAB-PLATFORM-06, section 7). An aborted review is never recorded: it is a refusal, and writes nothing.
- **The reasoning is complete, or the decision is refused:**
  - every finding the object discloses (every gap, conflict or other finding the domain's rules name) is addressed exactly once, by its content-derived identifier (AAB-PLATFORM-07, section 7);
  - every limit the object discloses is acknowledged by its identifier: for an evaluation, among others, its excluded candidates, a snapshot limited to what the requester may read, and stored originals not re-checked;
  - nothing is named that the object does not disclose;
  - `basisForOutcome` is never blank;
  - the domain says which finding kinds must be addressed, and may require more.
- **The domain may add its own boundary statements,** always `true`. It never removes the platform's three.
- **The signature.** The decider signs the content they submit, outside the server, with a key the platform holds for them (AAB-PLATFORM-03). `signedContentDigest` is the digest of that content. The system then sets `decisionId`, `decidedAt` and the independence checks, and `decisionDigest` covers the whole record, the signature's content digest included. A decision whose signature does not verify against the decider's key, at the time of signing, is refused.
- **The system sets** `decisionId`, `outcomeClass`, `reliableUntil`, `independenceChecks`, `decidedAt` and `decisionDigest`. Nothing else is taken from the request unsigned.

## 5. Invariants

- **Written once.** A decision is never changed or deleted. Its outcome is permanent.
- **One transaction.** A decision, its receipt, and any status record it writes are written together, or not at all.
- **A refusal writes nothing.** No decision, receipt or status record.
- **Three properties, never conflated:**
  - the **outcome**, which never changes;
  - the **validity**: whether the decision was properly made, derived from challenges (section 8);
  - the **currency**: whether a review may still be relied on, derived from what has happened since (section 9).
  
  Validity and currency are derived when read. Neither is ever stored on the decision.

## 6. Supersession

- **One current decision per subject and decision kind.** A new decision on the same subject and kind names the current decision it supersedes, with its digest and the reason, or is refused. Decisions on one subject are made one at a time.
- **Supersession never changes the earlier decision.** The earlier decision's outcome stands, as a record of what was decided then. That it is superseded is derived when read.
- **There is no revocation.** A decider who no longer stands by a decision supersedes it with a new one, giving the reason: `CORRECTION` (the earlier decision was wrong on its own terms), `RECONSIDERATION` (the same object, judged again), or `NEW_OBJECT` (a later evaluation or version of the same subject).
- **Past uses are unchanged.** What relied on a decision while it was current still names it, as it was.

## 7. More than one decider

- **A domain may require more than one person** for a decision kind: for example, two independent reviewers, or a panel. Each person makes their own decision, signed, under sections 2 to 4.
- **The combined outcome is derived when read,** under the domain's rule for combining them, which names the number of decisions required, the independence required between the deciders, and how disagreement is resolved.
- **A dissent is never removed.** A decider who disagrees records their own outcome, and it stays on the record, whatever the combined outcome.

## 8. Challenge

- **A human decision can be challenged,** by a person holding the domain's challenging role, with grounds. A challenge is an attributable record, made under sections 2 and 4 (named, verified authority, signed), written once, naming the challenged decision and its digest.
- **A challenge is resolved by a human decision** of the kind `CHALLENGE_RESOLUTION`, with the outcome `UPHELD` (`NEGATIVE` for the challenged decision) or `DISMISSED`, by a person who is neither the challenger nor the decider of the challenged decision.
- **Validity is derived when read:**
  - `VALID`: no challenge is open, and none has been upheld;
  - `UNDER_CHALLENGE`: a challenge is open;
  - `INVALIDATED`: a challenge has been upheld.
- **An invalidated decision stays on the record,** with its outcome. It is never relied on again. The domain says what must happen to anything that relied on it while it was valid.
- **A challenge is not a new judgement of the object.** Whether the object should now be decided differently is a new decision, superseding the invalidated one (section 6).

## 9. Currency

**Currency answers: may this review still be relied on?** It is derived each time it is asked for, at the time it is asked, and is never stored.

| Currency | Meaning |
|---|---|
| `SUPERSEDED` | A later decision on the same subject and kind has superseded it (section 6) |
| `POTENTIALLY_STALE` | A trigger the domain names has fired since the decision (section 10) |
| `LAPSED` | Its `reliableUntil` time has passed (section 10) |
| `UNDETERMINED` | A trigger could not be checked |
| `CURRENT` | None of the above |

- **One status, by precedence,** in the order of the table: `SUPERSEDED`, then `POTENTIALLY_STALE`, then `LAPSED`, then `UNDETERMINED`, then `CURRENT`. The currency always reports every trigger and its result as well, not only the status.
- **A review may be relied on only when it is `VALID` and `CURRENT`.** Every other status, of either property, prevents reliance. The domain may require more. It never relaxes this.
- **A currency assessment is recorded only as an assessment:** an append-only record, by a named actor, of the currency derived at a time, with every trigger's result. It never changes the currency derived later, and is never read as the current status.
- **A copy of currency** (in a package, a receipt, or a response) states the time it was derived, and is never presented as current.

## 10. Triggers, lapse and currency at birth

**Triggers are the domain's policy, over the platform's mechanism.**
- **The platform's changes:** the eight change kinds of AAB-PLATFORM-07 (section 8), from comparing the review's snapshot with the store; and, for a review, two more:
  - `EVALUATION_SUPERSEDED`: a later evaluation of the same subject has been recorded;
  - `RULES_VERSION_CHANGED`: the domain's evaluation rules in force have a later version than the evaluation used.
- **The domain names which changes make its reviews potentially stale,** and may add triggers of its own. In its adoption, every platform change kind is either a trigger, or declared not a trigger, with the reason.
- **Each trigger has one of three results:**
  - `CHANGED`: the change has happened since the decision;
  - `UNCHANGED`: the check was made and found no change, or no operation exists on the platform that could cause the change. The result says which: `CHECKED` or `NO_OPERATION_EXISTS`;
  - `NOT_EVALUATED`: the check could not be made, with the reason. The currency is then `UNDETERMINED`, unless a status earlier in the precedence applies.
- **Lapse is time, not change.** A domain may set a period for which a review is relied on. `reliableUntil` is set from it when the decision is made, under the rules version named, and never changed. After it, the review is `LAPSED`, whether or not anything has changed.
- **Currency at birth.** If a trigger has already fired when a review is made (for example, a record entered scope while the reviewer deliberated), the review is still recorded, and its currency at the time of the decision is recorded with it as an assessment and disclosed. A review is never refused because it is stale at birth: refusing it would let any change during deliberation block the decision indefinitely. It cannot be relied on until superseded by a review that is current.

## 11. Relying on a review

- **Whatever relies on a review derives its validity and currency in the same consistent read as its own write,** and refuses unless the review is `VALID` and `CURRENT`.
- **It records the currency it relied on,** as an assessment bound to its own time.
- **It verifies the review's binding:** the decision's digest, and the evaluation's snapshot and result digests (AAB-PLATFORM-07, section 7).
- **Reading currency is governed by the domain's roles.** A reader who may not read the review may not read its currency.

## 12. Settled here: what the two domains' contracts disagreed on

| Disagreement | Settled |
|---|---|
| Outcome vocabularies differ, with no common meaning | The domain's outcomes, each mapped to one of three platform classes (section 4). |
| Quarantine as a review outcome (one domain); as a status record (AAB-PLATFORM-06) | Never an outcome: to quarantine is its own decision kind, writing a status record (section 4). |
| Reviewer authority declared, not verified | Verified through a scoped grant at decision time, and named in the decision (section 2). |
| No signature on review decisions | Every human decision is signed by the decider, outside the server (section 4). |
| An independence rule in one domain, none in the other | Platform rules no domain relaxes, and domain rules added to them (section 3). |
| A decision bound to a result digest (one domain); to a list of record identifiers (the other) | Bound to the evaluation, its snapshot and its result, by their digests (section 4). |
| Challenge and correction named but impossible; validity fixed as valid | Challenge, resolved by an independent person; validity derived; correction by supersession (sections 6 and 8). |
| Currency derived when read (one domain); stored staleness notices (the other); a contract saying currency is "updated" on the earlier decision | Never stored; assessments append-only; copies dated (section 9). |
| "Fail closed" used as a currency status | `UNDETERMINED`: "fail closed" names a refusal, not a status (section 9). |
| Triggers reported as unchanged when nothing can fire them | Allowed only as `UNCHANGED` with the basis `NO_OPERATION_EXISTS`, disclosed (section 10). |
| Expiry in one domain's notices, none in the other's decisions | `LAPSED`, from `reliableUntil`, set once when the decision is made (section 10). |
| A decision asserting only a workflow step (one domain); read as establishing knowledge (the other) | A judgement, never a verification; it authorises only the step the domain names (sections 1 and 4). |
| More than one reviewer, dissent: defined in neither | Several single decisions, combined when read under the domain's rule; dissent never removed (section 7). |

## 13. Adopting this contract

A domain adopts this contract by amendment to its human decision contracts. The amendment must document:
- **its decision kinds,** and for each: the objects it decides on, the role that decides, and the authority grant that role requires;
- **its outcomes,** each with its class, and which are permitted for each state of the object;
- **its separation of duties,** in addition to section 3;
- **the findings each kind must address,** and any reasoning it requires beyond section 4;
- **any decision kind that needs more than one decider,** with its combining rule;
- **its challenging role;**
- **its triggers,** with every platform change kind declared a trigger or not, and its lapse period, if any;
- **what relies on its reviews,** and what must happen to what relied on a decision later invalidated;
- **what its existing decisions already store, field by field, mapped to this contract,** with every difference disclosed, and never rewritten. In particular:
  - an existing decision without a signature is disclosed as unsigned;
  - an authority recorded only as declared is disclosed as unverified;
  - an existing validity or currency value that was stored is read as the value derived when read; a stored value is never authoritative;
  - an existing "fail closed" currency status is read as `UNDETERMINED`;
  - an existing trigger reported as unchanged because no operation could fire it is read as `UNCHANGED` with the basis `NO_OPERATION_EXISTS`;
  - an existing digest of an evaluation's result is the `resultDigest` of the binding; an existing decision that is not bound to a snapshot digest is disclosed as such.

**No domain adoption of this contract can go live with real data until the platform's signing-key history is implemented,** so that a signature can be verified against the key the decider held when they signed. Until then, no human decision's signature can be verified over time.

## What this contract does not establish

- It makes no decision, and defines no domain's decision kinds, outcomes, roles, triggers or lapse periods.
- It grants no authority, and does not define how authority grants are issued.
- It does not define governance decisions about the platform itself, or capability admission.
- It does not change any stored decision, and does not rename any stored field.
- It implements nothing.

## Decisions recorded on 2026-09-28

Confirmed in review:

1. **Every attributable human decision is covered** (reviews of evaluations, resolutions of held records, quarantine and release, challenge resolutions, and any the domain defines); currency applies only to reviews of evaluations (section 1).
2. **One decider, a human, deciding in their own name,** named in the country's actor directory but identified in the decision only by `actorId` and `issuer`; never under representation (section 2).
3. **Authority is verified at decision time through a scoped grant,** named in the decision; declared authority is not authority (section 2). This is a platform requirement that no domain can relax. It closes the most significant gap found in the existing designs, where review decisions record authority only as declared.
4. **Every human decision is signed by the decider, outside the server** (section 4). No domain adoption of this contract can go live with real data until signing-key history is implemented (section 13; "Open items").
5. **Platform independence rules no domain relaxes:** never the object's submitter, the evaluation's requester, the submitter of any snapshot member, the author of any human decision pinned in the snapshot, or a party to a challenge; the domain adds more (section 3). The rule on pinned human decisions is the most subtle: without it, a reviewer could validate their own earlier decisions by having them included in the snapshot they review.
6. **Outcomes are the domain's, each in one of three classes:** `AFFIRMATIVE`, `NEGATIVE`, `DEFERRED`; quarantine is never an outcome; an aborted review is never recorded (section 4). Quarantine is a status record (AAB-PLATFORM-06, section 7), not a review outcome.
7. **Reasoning is complete or refused:** every disclosed finding addressed exactly once, every disclosed limit acknowledged, nothing named that was not disclosed (section 4).
8. **Three properties:** the outcome is permanent; validity and currency are derived when read, never stored (section 5). This distinction is the core of the contract, and must never be collapsed.
9. **Supersession, never revocation,** one current decision per subject and kind, with a stated reason (section 6).
10. **More than one decider is several single decisions,** combined when read; dissent is never removed (section 7).
11. **Challenge,** by a person with the domain's role, resolved by someone who is neither the challenger nor the decider; an upheld challenge invalidates the decision without removing it (section 8). Invalidated means invalidated, not deleted: a challenge that removed a decision would let the platform's history be rewritten.
12. **Currency:** five statuses in a fixed precedence; reliance only on `VALID` and `CURRENT`; assessments append-only; copies dated (section 9). `UNDETERMINED` replaces "fail closed" as a status: "fail closed" names a behaviour; `UNDETERMINED` names what is true, that the currency cannot be established.
13. **Triggers are domain policy over platform change kinds,** three results, with `NO_OPERATION_EXISTS` disclosed; every platform change kind is declared a trigger or not (section 10).
14. **`LAPSED` is time, not change,** from `reliableUntil`, set once (section 10).
15. **A review stale at birth is recorded and disclosed, never refused,** and cannot be relied on (section 10). Refusing it would create a deadlock in which no update is possible. Disclosure is the honest answer.

## Open items

- **Signing-key history** (BLOCKING before real data): **no domain adoption of this contract can go live with real data until signing-key history is implemented.** Without it, no human decision's signature can be verified against the key the decider held when they signed.
- **The history of the actor directory,** so that the accountable name held for a decider at the time of a decision can be established later, within the country.
- **How authority grants are issued, scoped and revoked** for deciding roles: AAB-PLATFORM-03 defines the grant; its governance is not defined here.
- **The named-only human decision and approval capability** on the roadmap may become this primitive's implementation. That is not decided here.
- **Two domains use the same capability number** for their human decision capabilities. Each domain's adoption names its capability in full.
- **Implementation:** a shared human decision and currency module, separated from any domain's staleness rules (dependency audit, V12), with a platform schema in the `urn:aab:schema:` namespace.
