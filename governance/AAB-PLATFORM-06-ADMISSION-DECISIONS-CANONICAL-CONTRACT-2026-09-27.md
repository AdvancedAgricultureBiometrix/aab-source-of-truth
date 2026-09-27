# AAB-PLATFORM-06 — Admission Decisions — Canonical Contract — 2026-09-27

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES RECORD ADMISSION: HOW A SUBMITTED RECORD ENTERS A DOMAIN'S GOVERNED STORE, WHAT AN ADMISSION DECISION RECORDS AND ASSERTS, HOW A SUBMISSION IS REFUSED, HELD FOR REVIEW, OR ADMITTED WITH ITS LIMITATIONS DISCLOSED, AND HOW AN ADMITTED RECORD IS QUARANTINED WITHOUT BEING CHANGED. It admits no record, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

## Record admission is not capability admission

**This contract is about records, not capabilities.** The word "admission" has two meanings on the platform, and they must never be confused:

| | Record admission (this contract) | Capability admission |
|---|---|---|
| What is admitted | One record, into a domain's governed store | A capability, into the platform's admitted set |
| Decided by | The capability's rules, at the moment of submission, or a reviewer for a held submission | The admission authority, on an independent reviewer's assessment |
| Defined in | This contract | `governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md` and the admission registry definition |
| Kind of act | An operational act (AAB-PLATFORM-03, section 4) | A governance decision |

A capability that is `PROPOSED_NOT_ADMITTED` still admits records, under this contract, in a pilot. Nothing here changes a capability's admission status, and nothing in capability admission decides whether a record is admitted.

## Sources

- `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`: primitive 5, Admission decisions ("admit, or admit with limitations, fail closed, every limitation disclosed"); the mechanism and policy table (errors, receipts, idempotency, audit, human decision)
- `governance/AAB-PLATFORM-DEPENDENCY-AUDIT-2026-09-27.md`: V12, admission is a pattern repeated in each admitting capability, not a module; V3 to V5, the receipt and envelope couplings
- `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md`: the provenance every admission is bound to; its gaps; "a failed integrity check refuses the admission"
- `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`: who acts; record admission is an operational act
- `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md`: evidence is "admitted honestly: attributable, with its provenance, its limitations and its gaps recorded"
- `governance/AAB-RESEARCHER-ADOPTION-AND-SCIENTIFIC-MEMORY-PRINCIPLES.md`: unresolved material is held, not admitted; material whose provenance is insufficient is not yet eligible
- The admission contracts of both domains, surveyed for this contract: their outcomes, checks, limitations and failure rules, and the conflicts between them (section 10)

## Why this contract is needed

- **Every admitting capability decides admission its own way.** The outcome vocabularies, the check objects, the way limitations are named, and whether a rejection is recorded, all differ between the two domains, and between capabilities in one domain.
- **The mechanism is the same everywhere,** and is repeated in code: fail closed and write nothing on refusal; admit with every limitation disclosed; write the decision and its receipt in one transaction; replay an idempotent request exactly.
- **Everything after admission depends on it.** An evaluation reads admitted records, and a human decision is made on them. Both must be able to rely on what "admitted" means, in any domain.

## 1. What admission is

**Admission is the governed act by which a submitted record enters a domain's governed store, with a permanent decision bound to the record and its provenance** (AAB-PLATFORM-05).

**An admission decision asserts:**
- the record was submitted by the actor its provenance names, at the time it names;
- the domain's admission rules, in the version named, were applied to it;
- every check the rules require passed, and every limitation found is disclosed with the decision.

**It does not assert:**
- that anything declared in the record is true: admission is not verification;
- that the record, alone or with others, is sufficient for any purpose: admission is not sufficiency;
- that the record's source is authoritative, or its content correct;
- anything about the record after admission, except through quarantine (section 7) and supersession (AAB-PLATFORM-05, section 5).

## 2. What a submission can come to

A submission comes to exactly one of three results:

| Result | Written | Visible to evaluations |
|---|---|---|
| **Refused** | Nothing: no record, no decision, no receipt, no idempotency record | No |
| **Held for review** | The record, a decision `HELD_FOR_REVIEW`, and its receipt | No, until a reviewer admits it |
| **Admitted** | The record, a decision `ADMITTED` or `ADMITTED_WITH_LIMITATIONS`, and its receipt | Yes |

**Refused.** A submission that fails a check the rules require is refused, and nothing is written to the governed store. The response is the platform's fail-closed envelope, naming the domain's failure code and every reason. A refusal is not a decision and leaves no record: there is nothing to supersede, quarantine or read.

**This rule is absolute.** No domain adoption can override it, for any failure, at any stage of the checks. The governed store is where records, decisions, status records, receipts and idempotency records are kept. Operational logs are outside it: they are not governed records, are not read by evaluations or decisions, and carry no standing. A refusal is traceable through its correlation id in the operational logs only.

**Held for review.** A submission the rules cannot decide automatically is held. The domain's rules say exactly when: for example, material whose provenance is insufficient to decide, or a condition the domain requires a person to weigh. A held record is written, so that it is preserved and can be reviewed, but it is **not admitted**. Nothing that reads admitted records reads it, until a reviewer decides it (section 6).

**Admitted.**
- **`ADMITTED`:** every check passed, and no limitation was found.
- **`ADMITTED_WITH_LIMITATIONS`:** every check the rules require passed, and at least one limitation is disclosed.
- **The outcome follows the limitations exactly.** A decision is `ADMITTED_WITH_LIMITATIONS` if and only if it discloses at least one limitation. A domain enforces this where the decision is stored.
- **`ADMITTED` must be reachable.** A domain whose rules could never produce it says so, and why, in its adoption.

**There is no written `REJECTED` outcome at submission.** A submission that fails is refused, and writes nothing. `REJECTED` exists only as a reviewer's decision on a held record (section 6), because a held record already exists and must be resolved on the record.

## 3. The admission decision

```typescript
interface AdmissionDecision {
  decisionId: string;
  admissionVersion: "1";

  // What was decided on
  recordId: string;
  recordVersion: number;
  recordDigest: string;                 // "sha256:" over the record, its provenance included

  outcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS" | "HELD_FOR_REVIEW";

  // How it was decided
  decisionMode: "AUTOMATED";            // at submission; a reviewer's decision is section 6's
  rulesVersion: string;                 // the domain's admission rules that were applied
  requestedBy: ActorReference;          // the submitter (AAB-PLATFORM-03)
  decidedAt: string;                    // the platform's clock: equal to provenance.submission.submittedAt

  // What was checked, and found
  checks: Array<{
    check: string;                      // the domain's name for the check
    result: "PASSED" | "NOT_PASSED" | "NOT_EVALUATED";
    reason?: string;                    // required unless PASSED
  }>;
  limitations: Array<{
    code: string;                       // the domain's limitation code
    description: string;
    provenanceGap?: ProvenanceGap;      // when the limitation discloses an AAB-PLATFORM-05 gap
  }>;
  heldBecause?: string[];               // exactly when outcome is HELD_FOR_REVIEW
  decisionReasons: string[];            // how each check was decided; never a limitation

  // What admission does not mean; always true
  boundary: {
    admissionIsNotVerification: true;
    admissionIsNotSufficiency: true;
    declaredContentIsNotConfirmed: true;
  };
}
```

**Field rules:**
- **`recordDigest` binds the decision to exactly what was decided on,** the record's provenance included. A decision is never moved to another record or version.
- **`rulesVersion`** names the domain's admission rules in force. When a domain changes its rules, the decisions made under earlier rules keep the earlier version.
- **`requestedBy` is the submitter, not a decider.** An automated admission is the application of the domain's rules, not a person's judgement, and is never presented as one.
- **Checks have three results, never two:**
  - `PASSED`: the check was made, and passed;
  - `NOT_PASSED`: the check was made, and did not pass. Only a check whose failure is a limitation can have this result: a check whose failure refuses the submission never appears in a decision;
  - `NOT_EVALUATED`: the check was not made, with the reason. A check that was not made is never recorded as passed, and never as failed.
- **Limitations, reasons and gaps are different things:**
  - a **limitation** is something the record lacks or cannot show, disclosed with its admission;
  - a **decision reason** says how a check was decided. It is never a limitation, and never hides one;
  - a **provenance gap** (AAB-PLATFORM-05, section 6) is always disclosed as a limitation, or refuses the submission, as the domain's gap mapping says. A limitation that discloses a gap names it.
- **Every admission decision, in every domain that admits records, carries the platform's three boundary statements.** There is no exception. The domain may add its own boundary statements, always `true`, to say what else its admission does not mean. It never removes the platform's three. They replace boundary flags that any one capability declares for itself.

## 4. Invariants

- **Written once.** A decision, like the record, is never changed or deleted.
- **One transaction.** The record, its provenance, the decision and its receipt are written together, or not at all.
- **Idempotent.** A repeated request with the same key and the same content replays the first response exactly, and writes nothing more. A refusal is not recorded for replay: it wrote nothing.
- **A refusal writes nothing to the governed store.** No record, decision, receipt or idempotency record, whatever stage of the checks it failed at. No domain overrides this (section 2).
- **Every provenance gap is accounted for:** each is a disclosed limitation, or the submission is refused.
- **The integrity of an original is never recorded as failed.** A declared digest that contradicts the stored object refuses the submission (AAB-PLATFORM-05, section 3).
- **The system-set fields are never taken from the request:** the outcome, checks, limitations, reasons, `decidedAt` and every system-set provenance field.
- **Checks run in an order the domain states,** and a refusal names the first check that failed, with every reason it found at that check.

## 5. Refusals

- **The envelope is the platform's:** the capability's identifier, `FAIL_CLOSED`, the failure code, every reason, the correlation id, and the domain's boundary flags, which always include that nothing was written.
- **The failure codes, their order, their status codes and their boundary flags are the domain's.** The platform defines the shape.
- **A refusal never reveals more than the requester may see.** A reason that would disclose a protected record's existence or content outside its boundary is not given.

## 6. Held submissions, and their review

- **A held record is not admitted.** It is preserved, readable by the domain's reviewers, and excluded from everything that reads admitted records.
- **A reviewer resolves it with a review decision,** written once, with its receipt:
  - **`ADMITTED`** or **`ADMITTED_WITH_LIMITATIONS`**, with its limitations, as at submission;
  - **`REJECTED`**, with its reasons. The record stays preserved, and is never admitted.
- **The review decision names the held decision it resolves.** A held decision is resolved at most once. What a held record now is, is derived when read, from its decisions.
- **The reviewer is a person,** holding the domain's reviewing role, and **is never the submitter.** This is a platform rule, not a domain's choice: no domain adoption can allow a submitter to review their own held record. The reviewer and the submitter are compared as actors (AAB-PLATFORM-03), not by name.
- **A review decision is an attributable human decision.** Its record, its reasons and its reviewer's independence follow AAB-PLATFORM-08 (attributable human review), when that contract exists. Until then, this section is the rule.
- **The domain defines** when a submission is held, which role reviews it, and what a reviewer must consider.

## 7. Quarantine of an admitted record

**Quarantine withdraws an admitted record from new use, without changing it.**
- **It is a status record,** written once against the admitted record, naming its reason and who quarantined it. Release is another status record. The record's quarantine state is derived when read, from its status records.
- **A quarantined record stays admitted, and stays readable.** It is excluded from new evaluations and new uses by default. A domain that includes quarantined records anywhere says where, and discloses it in what includes them.
- **Past uses are unchanged.** An evaluation, package or decision that read the record before it was quarantined still names it, as it was.
- **Only a named person, holding the domain's quarantine role, quarantines or releases a record,** with a reason.
- **The submitter never releases a quarantine on their own record.** This rule is absolute: no domain adoption can override it. Without it, quarantine could be undone by the person whose record it restrains.
- **Quarantine is not correction.** A record whose content is wrong is superseded (AAB-PLATFORM-05, section 5). Quarantine is for a record that may be wrong, or must not be used, while that is established.

## 8. Reading admitted records

- **An admitted record is read with its decision.** Whatever reads it can always reach its outcome, limitations and quarantine state.
- **What is built from admitted records names each one** by its record identifier, version and admission decision (AAB-PLATFORM-05, section 9).
- **Selection is the consumer's policy, and it is disclosed.** A consumer may use every admitted record, limitations included, or only some. Either way it states its policy, and records what it excluded and why. A limitation never silently removes a record from anything: a consumer that excludes records with limitations without stating its policy presents a result as more certain than its evidence, and does not conform to this contract.
- **Held and superseded records are not current admitted records,** and quarantined records are excluded by default (section 7).

## 9. Adopting this contract

A domain adopts this contract by amendment to its admission contracts. The amendment must document:
- **its outcome names,** where its stored or published names differ from this contract's, mapped to them. A registration outcome such as "registered" or "registered with gaps" is an admission outcome under another name. Existing stored names are kept, and mapped;
- **its checks,** each with the results it can have, and which checks refuse;
- **its limitation codes,** each with its meaning, and which provenance gap it discloses, if any;
- **its gap mapping** (AAB-PLATFORM-05, section 7);
- **when a submission is held,** and which role reviews held submissions;
- **its quarantine role,** and where, if anywhere, quarantined records are used;
- **its failure codes, their order, their status codes and boundary flags;**
- **its admission rules' versioning;**
- **what its existing decisions already store,** field by field. Where an existing check object records a check that was not made as `false`, the adoption says so: those values are read as `NOT_EVALUATED`, not `NOT_PASSED`. The adoption states explicitly that this is **a mapping applied when stored values are read, not a rewrite:** the stored values are never changed.

**Out of scope:** decisions that record a governed act rather than admit a record (assessments, status records, links) are defined by their own contracts, and by AAB-PLATFORM-08 when they are human decisions.

## 10. Settled here: what the two domains' contracts disagreed on

| Disagreement | Settled |
|---|---|
| A rejection: a refusal that writes nothing in one domain; a recorded outcome in the other | At submission, a refusal writes nothing. `REJECTED` is recorded only when a reviewer resolves a held record (sections 2 and 6). |
| "Quarantine": withdrawing an admitted record in one domain; holding material before admission in the other | Two different things, with two names: **held for review** is before admission (section 6); **quarantine** is after admission (section 7). |
| Review before admission: named in both domains, defined in neither | `HELD_FOR_REVIEW`, resolved by a person, never the submitter (section 6). |
| A check recorded as `false`: sometimes "not made", sometimes "did not pass" | Three results: `PASSED`, `NOT_PASSED`, `NOT_EVALUATED` (section 3). Existing `false` values are mapped in each domain's adoption (section 9). |
| Admission as a lifecycle status on the record, with an update time | No status on the record, and no update. What a record is, is derived from its decisions and status records (sections 6 and 7). |
| A failed integrity status, declared in both domains' types | Never recorded: the submission is refused (section 4; AAB-PLATFORM-05, section 3). |
| Limitations, gaps and decision reasons named inconsistently | A limitation is disclosed with admission; a provenance gap is always a limitation or a refusal; a decision reason is never a limitation (section 3). |
| A consumer that uses only unlimited, verified records, and one that uses every admitted record | Both allowed, as disclosed consumer policy; nothing is excluded silently (section 8). |
| An unused field for rejection reasons on admission decisions | Not part of the admission decision: rejection reasons belong to a review decision (section 6). |

## What this contract does not establish

- It admits no record, and defines no domain's rules, checks, limitations or failure codes.
- It does not define capability admission, and does not change any capability's admission status.
- It does not define evaluation, sufficiency or human review beyond what section 6 needs. Those are AAB-PLATFORM-07 and 08.
- It does not change any stored record or decision, and does not rename any existing field or outcome.
- It implements nothing.

## Decisions recorded on 2026-09-27

Confirmed in review:

1. **Refusal writes nothing to the governed store,** and there is no written `REJECTED` at submission (section 2). The rule is absolute: no domain adoption overrides it. Operational logs are outside the governed store.
2. **`HELD_FOR_REVIEW`,** a written but unadmitted record, resolved by a person who is never the submitter, as `ADMITTED`, `ADMITTED_WITH_LIMITATIONS` or `REJECTED` (section 6). That the reviewer is never the submitter is a platform rule, not a domain's choice. Rejection reasons belong to the review decision.
3. **Held for review and quarantine are different things, with different names:** before admission, and after (sections 6 and 7).
4. **Three check results,** so that a check not made is never recorded as passed or failed (section 3). Existing stored `false` values meaning "not made" are mapped to `NOT_EVALUATED` in each domain's adoption, which records that this is a mapping, not a rewrite (section 9).
5. **`decisionMode` and `rulesVersion`,** with `requestedBy` in place of a decider for automated admission: an automated admission is never presented as a person's judgement (section 3).
6. **Three platform boundary statements** on every admission decision, in every domain, with no exception; a domain may add more, never remove (section 3).
7. **Quarantine by status records,** derived when read; a named person with the domain's quarantine role; never released by the submitter, absolutely (section 7). Content that is wrong is superseded under AAB-PLATFORM-05, not quarantined.
8. **Consumer selection is disclosed policy;** a limitation never silently excludes a record (section 8). A consumer that excludes records without stating its policy presents false precision.

## Open items

- **AAB-PLATFORM-08** defines the attributable human decision that a review decision (section 6) and a quarantine (section 7) are. Until it exists, those sections are the rule.
- **A governed refusal history: a future capability, not a current requirement.** A refusal leaves only operational logs, and for a pilot that is sufficient. For a production deployment, where an actor may systematically submit records that are refused, a governed record of refusals would matter. It would be its own capability, with its own contract, and would not change section 2: a refusal still writes nothing in the domain's governed store.
- **Existing decision fields named `decidedBy` hold the submitter,** not a decider. Each domain's adoption maps them to `requestedBy`, and they are not renamed where stored.
- **Implementation:** a shared admission module, with the receipt and envelope couplings the dependency audit records (V3 to V5) resolved first, and a platform schema in the `urn:aab:schema:` namespace.
