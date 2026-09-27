# AAB-PLATFORM-07 — Frozen Evaluation Snapshots — Canonical Contract — 2026-09-28

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** AAB platform (shared by every domain)
**Authority:** DEFINES FROZEN EVALUATION SNAPSHOTS: HOW A SET OF ADMITTED RECORDS IS FIXED AS THE INPUT TO AN EVALUATION, WHAT A SNAPSHOT RECORDS ABOUT EACH RECORD IT INCLUDES AND EACH IT EXCLUDES, HOW IT IS CONTENT-ADDRESSED, HOW AN EVALUATION IS BOUND TO IT, AND HOW A SNAPSHOT IS COMPARED WITH THE STORE AS THE STORE CHANGES. It admits no record, evaluates nothing, decides nothing, grants no authority to anyone, amends no domain contract and changes no stored record. This contract is PROPOSED_NOT_ADMITTED. No implementation exists.

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
- **Canonical JSON** is UTF-8 JSON with object keys sorted by code point, no insignificant whitespace, and numbers and strings in their shortest standard form. Every digest in this contract is SHA-256 over it.
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
