# CAP-05 Governed Scientific Reasoning — Canonical Contract — 2026-09-20

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-05 Governed Scientific Reasoning. It is not SCS-CAP-05 (Supply Chain Custody Evidence Admission), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-05: HOW A SCIENTIST'S QUESTION IS EVALUATED OVER A FROZEN SET OF CAP-04 ADMITTED EVIDENCE, WHAT THE RESULTING EVIDENCE LANDSCAPE CONTAINS AND DOES NOT, HOW IT IS RECORDED, REVIEWED AND COMPARED WITH LATER EVIDENCE, AND ITS BOUNDARY WITH THE REHEARSAL'S COGNITIVE LOOP, EVIDENCE WATCH AND CAP-09. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Amended:** 2026-09-29, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3): aligned with the platform contracts and with CAP-04 as amended, and the rehearsal accounted for (see "Amendment of 2026-09-29: canonical alignment, and the rehearsal accounted for"). Amended again on 2026-09-29, for challenges to landscape reviews (see "Amendment of 2026-09-29: challenges to landscape reviews").
**History:** first written on 2026-09-20 as a governance design contract, resolving the "design decision required before wiring" finding for CAP-05 in `governance/AAB-CAPABILITY-GATEWAY-RECONCILIATION-2026-09-20.md`. It was not part of PR #16. The 2026-09-20 text is in the repository's history.

## Amendment of 2026-09-29: canonical alignment, and the rehearsal accounted for

**Why.** This contract was written on 2026-09-20, before the platform primitives were named and before the rehearsal's source was in the repository. The roadmap makes this amendment CAP-05's step 1. The evidence for the rehearsal is the step 0 snapshots (`agr-rehearsal/snapshot-2026-09-28/` and `agr-rehearsal/snapshot-2026-09-28-supplementary/`), **including `cognitive_core`, read in full for this amendment.**

**What it adopts:**
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** every landscape binds to a persisted snapshot of the evidence it evaluated.
- **AAB-PLATFORM-08 (attributable human review):** a scientist's review of a landscape is a human decision, with currency.
- **AAB-PLATFORM-06 (admission decisions), section 8, and AAB-PLATFORM-05 (provenance):** the records are read with their decisions, carried by reference, and every limitation is disclosed.
- **AAB-PLATFORM-03 (ActorReference) and AAB-PLATFORM-09 (public-key registry):** the requester and the reviewer, and the reviewer's signature.
- **CAP-04 as amended on 2026-09-29:** evidence is read from CAP-04, for a declared purpose, with its derived state.

**What it changes from the text of 2026-09-20:**

| Designed on 2026-09-20 | Now |
|---|---|
| "Stateless", "writes nothing" (`noWrites`), yet each result "an immutable snapshot" that Evidence Watch keys off | **Each evaluation is written once: its snapshot, the landscape and a receipt, in one transaction.** It writes nothing else, and changes nothing that exists. An unpersisted snapshot can be relied on by nothing (AAB-PLATFORM-07, section 7) |
| `EvidenceLandscapeSnapshotIdentity`, with an undefined `evidenceSetDigest` | The platform's `EvaluationSnapshot` and `SnapshotBinding`: `manifestDigest`, `snapshotDigest`, `resultDigest` |
| `asOf` chosen by the requester | **The cut-off is the platform's clock** at the snapshot's consistent read. No historical landscapes (AAB-PLATFORM-07, section 4) |
| Only records with `integrityStatus: "VERIFIED"` and `status: "ADMITTED"` | **Every admitted record, `ADMITTED` or `ADMITTED_WITH_LIMITATIONS`,** with its limitations and integrity carried and disclosed. Narrower selections are disclosed policy, never a silent filter |
| `reviewStatus`: `UNREVIEWED` or `REVIEWED_EVIDENCE` | CAP-04's derived `epistemicStatus`, carried per member |
| Refusals for a record not found, not admitted or not accessible | **Typed exclusions** (AAB-PLATFORM-07): a listed record that cannot be used is excluded with its reason, never silently dropped, and never revealing whether it exists |
| `excludedRecords[].reason: string`, `limitations: string[]` | The nine exclusion reasons, and every member's limitations, gaps and the evaluation's own disclosures |
| Stance "explicitly established for the current reasoning question, or derived through a disclosed, deterministic classification step" | **Assigned by the requester, per record, for the question, and recorded with the snapshot.** No automated stance classification of any kind in this version |
| No human review | **A review of a landscape** is an AAB-PLATFORM-08 human decision, with currency |
| `requestedBy { actorId, role }` | A server-resolved ActorReference (AAB-PLATFORM-03), `HUMAN` only |

**Decisions proposed for review on 2026-09-29** (each becomes a decision recorded on the date it is approved):
1. **Persisted, write-once evaluations.** Each landscape and its snapshot are written once, with a receipt, and never changed. CAP-05 writes nothing else: no evidence, no belief state, no problem, no investigation.
2. **Scientists may review a landscape** (decision kind `LANDSCAPE_REVIEW`). What relies on a review is for CAP-09's contract to decide.
3. **No historical landscapes.** The cut-off is the platform's clock. CAP-04's statement that CAP-05 needs as-of reads is corrected in CAP-04, by a note in the same change.
4. **The requester lists the records.** Selection mode `REQUESTER_LISTED` only, the design's `memoryRecordIds`. A scope-derived selection needs stances for records the requester has not seen, and is not offered in this version.
5. **The default policy uses every admitted record,** limitations and unverified integrity included, and discloses them. Two narrower policies are offered, each disclosed.
6. **Stance is the requester's assignment, per record, for the question.** No keyword, polarity, record-type or AI classification assigns a stance.
7. **The evaluation's subject is the question,** content-derived from its canonical form.
8. **No integrity recheck is required** (`NOT_PERFORMED`, disclosed). Every read from the store is verified anyway (AAB-PLATFORM-01).
9. **Roles:** `LANDSCAPE_REQUESTER` and `LANDSCAPE_REVIEWER`. CAP-05 reads CAP-04 for the declared purpose `SCIENTIFIC_EVIDENCE_EVALUATION`.
10. **The requester is always a person.** No automated re-evaluation in this version: Evidence Watch may only suggest one.
11. **The cognitive loop is not CAP-05, and CAP-05 never depends on it.** Confirmed by reading `cognitive_core` ("What the rehearsal does").

**Nothing is implemented by this amendment.** Every rule of 2026-09-20 not changed above is kept.

## Amendment of 2026-09-29: challenges to landscape reviews

**Why.** CAP-05's canonical amendment named who may challenge a landscape review, and a receipt for resolving a challenge, but no receipt for filing one, no operations or routes, and no failure codes. CAP-04's amendment of the same date, for challenges to its human decisions, found the gap. **This amendment completes CAP-05's challenge infrastructure to match CAP-04's.** Who may challenge and who resolves are unchanged.

**What it adds** (approved in review on 2026-09-29, with CAP-04's):
- **The rules,** under "Review of a landscape": one open challenge per review; a challenge resolution is final, as in CAP-04, as the pilot position; what an upheld challenge does.
- **A receipt** for filing a challenge, **two operations and their routes,** and **four failure codes,** the same as CAP-04's.
- **The platform gap on invalidated admissions,** recorded in "Open gaps", as it bears on review currency.

**Nothing is implemented by this amendment.**

## The boundary, in plain English

> **The scientist deliberately asks, "Show me what the admitted evidence says about this question right now." AAB returns a time-bounded, evidence-linked landscape and stops.**

CAP-05 is a single deliberate, bounded act. It does not inherit the rehearsal's cognitive loop. "Keep watching this topic" is a different capability, the Governed Evidence Watch candidate (proposed CAP-35), with different authority, persistence and notification.

**CAP-05 returns a landscape, not a verdict.** It shows what the listed evidence says, subject by subject: where it agrees, where it conflicts, and what is missing. It never recommends, approves, promotes, chooses between conflicting evidence, or weights evidence by who produced it.

## What CAP-05 answers, and what it does not

| Question | Answered by |
|---|---|
| What does this listed, admitted evidence say about my question, as of now? | **CAP-05** |
| May this material enter governed scientific memory? | CAP-04 |
| Has a learning claim earned promotion to validated knowledge? | CAP-09 |
| Has new evidence arrived that may affect a landscape? | The Governed Evidence Watch candidate (proposed CAP-35), which never runs CAP-05 by itself |
| Is the evidence true? Is the conclusion right? | Nothing in CAP-05. A landscape is not a verification, and not a finding |

## What the rehearsal does, and how this contract accounts for it

**CAP-05 has no code in the rehearsal.** Its proposed action, `cap05_evaluate_evidence_landscape`, is not among the gateway's 116 active actions (roadmap, section 8.2). What sits closest is the cognitive loop in `cognitive_core`, which this amendment read in full: 18 tables and 25 functions (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/cognitive_core/`).

**What the loop is.**
- **A standing graph, recomputed automatically.** `run_agriculture_cognitive_loop` runs by hand and **after every approved observation, outcome and learning review, and every completed trial** (`api.php`, lines 980, 1017, 1032, 1131, 1298). A failure is swallowed, and the approval stands.
- **It materialises nodes, relationships and evidence signals from live rows,** then recomputes every active agriculture node's state in one function, `api_compute_node_state`. The state holds sixteen scores and a label such as `STRONGLY_SUPPORTED` or `NOT_SUPPORTED_OR_NEGATIVE`.
- **It is deterministic arithmetic over fixed constants.** No AI, no model and no external call. Belief is `0.5 + 0.5·(S − C − 0.8·N) / T` over signal weights that are constants set by each record's type. The ten algorithm names the gateway reports exist only as a list of labels in the PHP (`api.php`, line 1226); the SQL has one function, versioned by a single literal, `UCK-v1`.
- **It writes:** node states (overwritten, no history), signals, relationships, investigation candidates, problem signals (`AAB_DETECTION`, from high-priority gaps) and a reassessment queue.

**Why it is not CAP-05, confirmed by the code:**

| CAP-05 requires | The loop |
|---|---|
| A scientist's question | No question. Its subjects are graph nodes, and it recomputes all of them |
| A frozen, listed evidence set, with a digest and a cut-off | Every live row the triggering actor can see. No input set, digest, cut-off or version is recorded on a run |
| Stance established for the question | **Stance inferred from record type and status,** exactly the inference this contract forbids |
| A landscape, not a verdict | A verdict-like label per node, overwritten on the next run |
| Writes only its own record | Writes belief states, investigations and problem signals across the store |
| Started by a scientist | Started automatically by approvals and trial completions |

**Its signals go stale and stay.** A contradiction later resolved keeps its `CONTRADICTS` signal; an observation whose eligibility is revoked keeps its `SUPPORTS` signal; nothing retires a signal.

**What is kept, and what is not.**
- **Kept:** the evidence-state vocabulary, extended by `OPPOSED` ("The landscape"), and the design's final decision, unchanged: **CAP-05 should not be wired to either `submit_problem_signal` or `run_agriculture_cognitive_loop`.**
- **Not carried across:**
  - automatic execution on approvals;
  - inferred stance and constant weights;
  - overwritten state;
  - graph materialisation;
  - investigation and problem creation;
  - row-level security disabled on all 18 `cognitive_core` tables;
  - 23 `SECURITY DEFINER` functions with `EXECUTE` granted to `PUBLIC`;
  - functions with no capability check;
  - a caller able to label their own problem signal `AAB_DETECTION`.
- **Dormant:** `agriculture.reasoning_run`, with an `input_snapshot` column, is the nearest thing to a recorded evaluation. Its functions record only, and nothing calls them.

**The loop's identity** stays held (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`). Read in full, it is a domain-agnostic scaffold (the graph, the state vector, activity telemetry and domain inheritance) with an agriculture-specific materialiser. **No code ties it to CAP-33.** It also does exactly what the Evidence Watch candidate forbids: it changes belief states and begins investigations on new evidence, with no watch definition and no scientist's authorisation. **CAP-05 never depends on it, in any form.**

**The CAP-34 simulation is not a model for this contract.** Its CAP-05 logic (`simulation/cap34/live-capabilities/cap05-reasoning.js`) derives stance from keywords in the text, and ends in a verdict-style outcome, `REASONING_SUPPORTS_PROGRESSION`. Its fidelity manifest already says keyword grouping "must not be presented as" genuine reasoning. Its behavioural proof (`governance/workstream-b/CAP-05-REASONING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`) proves the simulation's pairing and gap logic, and nothing about this contract. The simulation stays what it is, and never counts as implementation.

## The request

The requester lists the records, assigns each a stance for the question, and names the evidence categories the question needs.

```typescript
interface Cap05EvaluationRequest {
  question: {
    questionText: string;
    domainCodes: string[];              // never empty
    subjectScope?: string[];            // CAP-04 subject keys the question concerns; all listed records' subjects when absent
  };

  countryWorkspaceId: string;           // the requester's; a request for another workspace is refused

  // The records, and the requester's assessment of each for this question
  records: Array<{
    memoryRecordId: string;
    stance: "SUPPORTS" | "OPPOSES" | "NEUTRAL" | "INCONCLUSIVE" | "NOT_APPLICABLE";
    stanceReason?: string;              // as declared
  }>;

  // What evidence the question needs, by CAP-04 record type, for the gap assessment
  requiredEvidenceCategories: string[]; // CAP-04 recordType values; may be empty

  selectionPolicy: "ALL_ADMITTED" | "REVIEWED_EVIDENCE_ONLY" | "VERIFIED_ORIGINALS_ONLY";
  quarantined: "EXCLUDE";               // the only value in this version
}
```

- **The server sets** the requester, the cut-off, every identifier and every digest. A request that supplies any of them is refused.
- **Each listed record appears once,** with exactly one stance. A record with no stance, or a stance for a record not listed, is refused (`STANCE_ASSIGNMENT_INVALID`).
- **The request is closed:** it has no field for an action, a recommendation, a promotion or a write. A request with any other field is refused (`REQUEST_VALIDATION_FAILED`). The design's `OPERATIONAL_INTENT_BLOCKED` is therefore unreachable, and is retired.

**Stance (decision 6).** Whether a record supports or opposes something depends on the question, so CAP-04 records carry no stance. **The requester assigns it,** for this question, and it is recorded with the snapshot as the requester's assessment. The landscape discloses that every stance is the requester's (`STANCES_REQUESTER_ASSIGNED`). No keyword, polarity (CAP-04's `outcomePolarity`), record type or automated model assigns a stance. An automated or rule-based classifier could be added only by amending this contract, with its method versioned and pinned, and the landscape disclosing it.

## The snapshot (AAB-PLATFORM-07)

CAP-05 adopts AAB-PLATFORM-07 by this amendment. Each evaluation takes one snapshot, in one consistent read, at the platform's clock.

| AAB-PLATFORM-07 field | CAP-05 |
|---|---|
| `manifest.scope.scopeRule` | `cap-05-listed-records`, version `1`: the scope is exactly the listed records |
| `manifest.scope.subjectKey` | Content-derived from the canonical question: its text, domain codes and subject scope (decision 7) |
| `manifest.selection.mode` | `REQUESTER_LISTED` (decision 4) |
| `manifest.selection.quarantined` | `EXCLUDE` |
| `manifest.selection.policy` | `ALL_ADMITTED` (default), `REVIEWED_EVIDENCE_ONLY` or `VERIFIED_ORIGINALS_ONLY`, version `1` |
| `members[]` | From CAP-04's read of each listed record: identifier, version, the admission decision's `recordDigest`, `admissionDecisionId`, outcome, limitation codes and provenance gaps |
| `exclusions[]` | The nine reasons, in AAB-PLATFORM-07's order, one per listed record not used |
| `pinnedInputs[]` | `STANCE_ASSIGNMENTS` and `REQUIRED_EVIDENCE_CATEGORIES`: each with its identifier, version `1` and digest, and written once with the evaluation |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed (decision 8) |
| `cutoffAt` | The platform's clock. Never chosen by the requester (decision 3) |

**How listed records become members or exclusions:**
- **CAP-04 is read for the declared purpose `SCIENTIFIC_EVIDENCE_EVALUATION`** (decision 9). A record the requester may not read, or whose permitted uses do not include that purpose, is excluded as `NOT_AVAILABLE`. That reason is the same whether the record does not exist or may not be read, so a landscape never reveals a record the requester cannot see.
- **Held, rejected, withdrawn, superseded and quarantined records** are excluded with those reasons.
- **The policies:**
  - **`ALL_ADMITTED`** uses every admitted record, limitations and unverified integrity included.
  - **`REVIEWED_EVIDENCE_ONLY`** excludes records whose `epistemicStatus` is not `REVIEWED_EVIDENCE`.
  - **`VERIFIED_ORIGINALS_ONLY`** excludes records whose original is not `VERIFIED`.

  Each narrower policy excludes as `EXCLUDED_BY_POLICY`, naming the rule. **A limitation never removes a record by itself.** While no AGR original can be stored (CAP-04's prerequisite on the object store), `VERIFIED_ORIGINALS_ONLY` excludes every record, and says so.
- **An empty snapshot is refused** (`EVIDENCE_SET_EMPTY`), and nothing is written.

## The landscape

```typescript
interface Cap05EvidenceLandscape {
  evaluationId: string;                 // content-derived
  capabilityId: "CAP-05";
  resultType: "EVIDENCE_LANDSCAPE";
  schemaVersion: "urn:aab:schema:agr:cap-05:evidence-landscape:1";

  binding: SnapshotBinding;             // AAB-PLATFORM-07: snapshot, manifest and result digests,
                                        // evaluatorVersion, rulesVersion "cap-05-landscape-rules-1"
  question: { questionText: string; domainCodes: string[]; subjectScope?: string[] };
  cutoffAt: string;
  requestedBy: ActorReference;
  evaluatedAt: string;

  subjects: Array<{
    subjectKey: string;                 // CAP-04's declared subject key
    members: Array<{
      memoryRecordId: string;
      recordVersion: number;
      admissionDecisionId: string;
      stance: "SUPPORTS" | "OPPOSES" | "NEUTRAL" | "INCONCLUSIVE" | "NOT_APPLICABLE";
      evidenceCategory: string;         // the record's CAP-04 recordType
      epistemicStatus: "SOURCE_MATERIAL" | "EXTRACTED_EVIDENCE" | "REVIEWED_EVIDENCE";
      originalIntegrity: "VERIFIED" | "UNVERIFIED";
      limitationCodes: string[];
    }>;
    counts: { supports: number; opposes: number; neutral: number; inconclusive: number; notApplicable: number };
    evidenceState:
      | "SUPPORTED"
      | "PARTIALLY_SUPPORTED"
      | "CONFLICTING"
      | "OPPOSED"
      | "INSUFFICIENT"
      | "UNKNOWN";
  }>;

  // Findings: each with an identifier derived from its content (AAB-PLATFORM-07, section 7)
  contradictions: Array<{
    findingId: string;
    subjectKey: string;
    supporting: string;                 // memoryRecordId
    opposing: string;                   // memoryRecordId
    comparability: "SAME_METHOD" | "DIFFERENT_METHOD" | "METHOD_UNDECLARED";
  }>;
  knowledgeGaps: Array<{
    findingId: string;
    subjectKey: string;
    missingEvidenceCategory: string;    // a required category with no member on this subject
  }>;
  possibleDuplicates: Array<{
    findingId: string;
    records: string[];                  // members whose provenance declares the same source
  }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];                // "Disclosures", below

  boundary: {
    landscapeIsNotAVerdict: true;
    noRecommendation: true;
    noPromotion: true;
    noEvidenceChanged: true;
    noBeliefStateWritten: true;
    noInvestigationCreated: true;
    notWeightedBySource: true;
  };
}
```

**The rules** (`cap-05-landscape-rules-1`). The evaluation is a pure function of its snapshot and these rules. Its result is exactly reproducible, except `evaluatedAt`.
- **Subjects** are the members' CAP-04 subject keys, within `subjectScope` when it is given.
- **Evidence state, from the stances alone, counted, never weighted:**

  | State | When |
  |---|---|
  | `CONFLICTING` | At least one `SUPPORTS` and one `OPPOSES` |
  | `SUPPORTED` | At least one `SUPPORTS`, no `OPPOSES`, and no `INCONCLUSIVE` |
  | `PARTIALLY_SUPPORTED` | At least one `SUPPORTS`, no `OPPOSES`, and at least one `INCONCLUSIVE` |
  | `OPPOSED` | At least one `OPPOSES`, and no `SUPPORTS` |
  | `INSUFFICIENT` | No `SUPPORTS` or `OPPOSES`, and at least one `NEUTRAL` or `INCONCLUSIVE` |
  | `UNKNOWN` | Every member `NOT_APPLICABLE` |

- **Contradictions:** every `SUPPORTS`–`OPPOSES` pair on a subject. Each is classed by method comparability, from CAP-04's declared `methodReference`. **A contradiction is never resolved, weighted or explained away.** A difference in method is shown as a difference, never pooled into agreement.
- **Knowledge gaps:** each required category with no member on a subject.
- **Possible duplicates:** members whose provenance declares the same source: the same `sourceOrganizationId` with the same `sourceId` or `sourceReference` (AAB-PLATFORM-05). They are shown, never merged, and never silently counted once.
- **No weighting by source, institution, reputation, date or volume.** Institutional provenance is data, never a weight.

**Disclosures, always present where they apply:**
- `STANCES_REQUESTER_ASSIGNED`;
- `INPUT_LIMITED_TO_REQUESTER_VIEW` (AAB-PLATFORM-07, section 2);
- `INTEGRITY_RECHECK_NOT_PERFORMED`;
- the selection policy, and every exclusion;
- each member's limitation codes and provenance gaps, carried by reference (AAB-PLATFORM-05, section 9);
- `ORIGINALS_UNVERIFIED`, naming the members;
- `SUBJECT_KEYS_DECLARED` (subjects are CAP-04's declared keys, never inferred).

**A landscape is never partial.** A listed record that cannot be used is an exclusion, disclosed. The evaluation either completes over its snapshot, or is refused and writes nothing.

## Comparing a landscape with the store, and Evidence Watch

- **What has changed since a landscape was made** is derived when read, by AAB-PLATFORM-07's comparison: a member superseded, quarantined or released, an exclusion resolved, the policy or scope rule changed. **It is never stored.**
- **CAP-05 does not compare a landscape with new evidence outside its list.** New evidence is the Evidence Watch candidate's to notice.
- **Evidence Watch anchors to a persisted landscape** by its `evaluationId` and `snapshotId`. It may suggest a new evaluation, with a list of records. **It never runs CAP-05,** and a notice it gives is derived, not a stored staleness state (AAB-PLATFORM-08, "Settled here"). The candidate's design, which stores notices and an as-of time, is to be aligned with this when it is written as a contract.

## Review of a landscape (AAB-PLATFORM-08)

**A scientist may review a landscape** (decision 2) with a human decision of the kind `LANDSCAPE_REVIEW`, bound to the evaluation by its `resultDigest` and its snapshot's digests.

| Outcome | Class | Means |
|---|---|---|
| `FIT_AS_EVIDENCE_BASIS` | `AFFIRMATIVE` | The reviewer judges the landscape a sound basis for the next step they name, such as proposing a learning claim in CAP-09 |
| `NOT_FIT_AS_EVIDENCE_BASIS` | `NEGATIVE` | The reviewer judges it unsound as a basis, with reasons |
| `MORE_EVIDENCE_NEEDED` | `DEFERRED` | Neither; the reasoning says what is needed |

- **A review is a judgement of the landscape as a basis, never of the science.** It establishes nothing as true, and promotes nothing (AAB-PLATFORM-08: "a judgement, not a verification").
- **The reviewer is `HUMAN`,** holds `LANDSCAPE_REVIEWER` through a scoped grant, decides in their own name, and signs with their registered key, verified as at acceptance (AAB-PLATFORM-09).
- **Independence:** never the requester, and never the submitter of any member. These are the platform's rules, and are not relaxed.
- **The reasoning addresses every finding exactly once,** by its identifier: each contradiction, gap and possible duplicate. It acknowledges every disclosure and exclusion.
- **Currency:**
  - **Triggers:**
    - a member superseded;
    - a member quarantined;
    - an exclusion resolved;
    - the scope rule or policy changed;
    - the evaluation superseded;
    - the rules version changed.
  - **Not triggers:**
    - a quarantine released, because the member was excluded or used as it was;
    - a new candidate, because the scope is exactly the listed records;
    - a pinned input changed, because the stances and categories are written once with the evaluation and cannot change.
  - **Lapse:** 12 months, set as `reliableUntil`.
- **One decider per review.** Several reviews of one landscape are several decisions, combined when read; none removes another's dissent (AAB-PLATFORM-08, section 7).
- **Challenge:** any `LANDSCAPE_REVIEWER` in the workspace other than the review's decider may challenge it, with grounds. The challenge is resolved by a `CHALLENGE_RESOLUTION` decision, by a `LANDSCAPE_REVIEWER` who is neither party.
  - **A challenge is an attributable record:** `HUMAN`, in the challenger's own name, with a verified scoped grant, signed, written once, naming the review and its digest, and stating its grounds (amended on 2026-09-29, challenges).
  - **One open challenge per review.** A second is refused while one is open.
  - **A challenge resolution is final in CAP-05.** It is not itself challenged. A later challenge of the same review, with new grounds, is allowed. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.
  - **An open challenge prevents reliance.** Unlike a CAP-04 decision, a review is relied on only while it is `VALID` and `CURRENT` (AAB-PLATFORM-08, section 9). That is the platform's rule, and CAP-05 does not relax it.
  - **An upheld challenge invalidates the review.** It stays on the record with its outcome, and is never relied on again. A new review of the landscape supersedes it. What happens to anything that relied on it is CAP-09's to decide (below).
- **What relies on a review** is for CAP-09's contract to decide, including what happens to what relied on a review later invalidated. CAP-05 does not decide what a review permits.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-05 |
|---|---|
| Scope rules (07, section 10) | `cap-05-listed-records`, version `1` |
| Selection policies | `ALL_ADMITTED`, `REVIEWED_EVIDENCE_ONLY`, `VERIFIED_ORIGINALS_ONLY`, version `1`; mode `REQUESTER_LISTED`; quarantined records always `EXCLUDE`, and never included anywhere |
| Pinned inputs | `STANCE_ASSIGNMENTS`, `REQUIRED_EVIDENCE_CATEGORIES` |
| Integrity re-check; empty snapshot | Not required, disclosed; an empty snapshot refuses the evaluation |
| Evaluator and rules versioning | `evaluatorVersion` names the evaluating code; `rulesVersion` is `cap-05-landscape-rules-1`, a new version for any change to "The rules". The rules are code, so no `rulesDigest` |
| Non-reproducible fields | `evaluatedAt`. `evaluationId` is derived from the snapshot's digest, the evaluator version and the rules version; finding identifiers from their content |
| Refusal codes | "Failure contract" |
| Existing evaluations and decisions (07, section 10; 08, section 13) | **None.** The rehearsal has no CAP-05 evaluation or review. The cognitive loop's node states are not CAP-05 evaluations and are not mapped ("What the rehearsal does") |
| Decision kinds, roles and grants (08, section 13) | `LANDSCAPE_REVIEW`, by `LANDSCAPE_REVIEWER` through a scoped grant; `CHALLENGE_RESOLUTION`, likewise |
| Outcomes, and when each is permitted | `FIT_AS_EVIDENCE_BASIS`, `NOT_FIT_AS_EVIDENCE_BASIS`, `MORE_EVIDENCE_NEEDED`, each permitted for any persisted landscape |
| Separation of duties beyond the platform's | None added |
| Findings a review must address | Every contradiction, knowledge gap and possible duplicate; every disclosure and exclusion acknowledged |
| More than one decider | Not required |
| Challenging role | `LANDSCAPE_REVIEWER`, other than the decider |
| Triggers and lapse | "Review of a landscape": all ten platform change kinds declared; 12 months |
| What relies on reviews | CAP-09's to decide (open gap) |

## Authority

- **Requesting:** `LANDSCAPE_REQUESTER`, `HUMAN` only (decision 10), through a scoped grant covering the country workspace. The requester must also be able to read the listed records in CAP-04, for the purpose `SCIENTIFIC_EVIDENCE_EVALUATION`.
- **Reviewing:** `LANDSCAPE_REVIEWER`, as above.
- **Reading a landscape:** its requester, `LANDSCAPE_REVIEWER`s in the workspace, and the Evidence Watch candidate's authorised scientist. A reader sees only what the landscape recorded, which never includes a record they could not have read: exclusions name only what the requester listed.
- **Authority is resolved by the platform, never taken from the request.**

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `EVIDENCE_LANDSCAPE_EVALUATION` | An evaluation is recorded, with its snapshot |
| `LANDSCAPE_REVIEW` | A landscape is reviewed |
| `LANDSCAPE_REVIEW_CHALLENGE` | A review is challenged (amended on 2026-09-29, challenges) |
| `LANDSCAPE_REVIEW_CHALLENGE_RESOLUTION` | A challenge to a review is resolved (AAB-PLATFORM-08, section 8) |

Receipts carry `capabilityId: "CAP-05"`, which migration 025 admits.

| Operation | Route |
|---|---|
| `evaluateEvidenceLandscape` | `POST /agr/v1/evidence-landscapes`: `201` with `{ landscape, snapshot, receipt }` |
| `getEvidenceLandscape` | `GET /agr/v1/evidence-landscapes/:evaluationId`, with its comparison with the store, derived |
| `reviewEvidenceLandscape` | `POST /agr/v1/evidence-landscapes/:evaluationId/reviews` |
| `challengeLandscapeReview` | `POST /agr/v1/evidence-landscapes/:evaluationId/reviews/:decisionId/challenges` (amended on 2026-09-29, challenges) |
| `resolveLandscapeReviewChallenge` | `POST /agr/v1/evidence-landscapes/:evaluationId/reviews/:decisionId/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`. The interface stays provider-neutral, and the design's gateway group name, `AAB_GOVERNED_REASONING_ACTIONS`, is kept for a gateway adapter.

## Failure contract

```typescript
interface Cap05Failure {
  ok: false;
  capabilityId: "CAP-05";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "STANCE_ASSIGNMENT_INVALID"
    | "EVIDENCE_SET_EMPTY"
    // Reviews
    | "LANDSCAPE_NOT_FOUND"
    | "REVIEWER_NOT_INDEPENDENT"
    | "REASONING_INCOMPLETE"
    | "BINDING_MISMATCH"
    | "DECISION_SIGNATURE_INVALID"
    // Challenges (amended on 2026-09-29, challenges)
    | "CHALLENGED_DECISION_NOT_FOUND"
    | "CHALLENGE_ALREADY_OPEN"
    | "CHALLENGE_NOT_OPEN"
    | "CHALLENGE_NOT_PERMITTED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
  noLandscapeRecorded: true;
}
```

| Code | HTTP | Meaning |
|---|---:|---|
| `UNAUTHENTICATED` | 401 | No actor |
| `ROLE_NOT_AUTHORISED` | 403 | The actor lacks the role, in a scope that covers the act |
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, has any other field, or supplies a system-set field |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key was used with different content |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `STANCE_ASSIGNMENT_INVALID` | 422 | A listed record has no stance, or more than one, or a stance names a record not listed |
| `EVIDENCE_SET_EMPTY` | 422 | Every listed record was excluded. The exclusions are named, within what the requester may see |
| `LANDSCAPE_NOT_FOUND` | 404 | No landscape with that identifier the actor may read |
| `REVIEWER_NOT_INDEPENDENT` | 403 | The reviewer is the requester, or the submitter of a member; for a challenge resolution, also the challenger or the challenged review's decider |
| `REASONING_INCOMPLETE` | 422 | A finding not addressed, or a disclosure not acknowledged |
| `BINDING_MISMATCH` | 409 | The landscape's or snapshot's digests no longer match what is stored |
| `DECISION_SIGNATURE_INVALID` | 422 | The review's signature does not verify against the reviewer's key as at acceptance |
| `CHALLENGED_DECISION_NOT_FOUND` | 404 | No review with that identifier on the landscape, or none the actor may see |
| `CHALLENGE_ALREADY_OPEN` | 409 | The review already has an open challenge |
| `CHALLENGE_NOT_OPEN` | 409 | A resolution of a challenge already resolved |
| `CHALLENGE_NOT_PERMITTED` | 409 | The decision is a challenge resolution, which is not challenged |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, the database or the store could not be reached |

**Retired from 2026-09-20:** `EVIDENCE_RECORD_NOT_FOUND`, `EVIDENCE_ACCESS_DENIED` and `EVIDENCE_NOT_ADMITTED` are exclusions now, never refusals, so that a landscape never reveals a record the requester cannot see. `AUTHORITY_SCOPE_INVALID` is `ROLE_NOT_AUTHORISED`. `CLASSIFICATION_INCOMPLETE` is `STANCE_ASSIGNMENT_INVALID`, since CAP-04 uses the old name for something else. `OPERATIONAL_INTENT_BLOCKED` is unreachable ("The request").

## Open gaps

**Contract gap: what relies on a review.** Whether a CAP-09 learning proposal requires a current `FIT_AS_EVIDENCE_BASIS` review of the landscape it cites is CAP-09's to decide.

**Contract gap: scope-derived selection.** Selecting evidence by subject or domain, rather than by list, needs stances for records the requester has not seen. It waits on a governed way to assign them.

**Contract gap: purposes.** `SCIENTIFIC_EVIDENCE_EVALUATION` is matched exactly against CAP-04's permitted uses, as there is no governed vocabulary of purposes yet (CAP-04's open gap).

**Contract gap: cross-institution and cross-country evidence.** A landscape uses only what its requester may read in their country workspace. Evaluating across institutions under an explicit sharing arrangement, as the AGR cross-institutional landscape candidate proposes, is not defined, and waits on CAP-23 and CAP-24.

**Contract gap: erasure.** A landscape names its members permanently. What a lawful erasure of a member's original leaves in a landscape is CAP-04's open erasure gap, and is not defined here.

**Platform gap: an invalidated admission** (amended on 2026-09-29, challenges). When a challenge to a CAP-04 `ADMIT` resolution is upheld, the record is held again (CAP-04, "Challenges"). AAB-PLATFORM-07 has no change kind for a member that is no longer admitted for this reason, so a review of a landscape with that member does not become `POTENTIALLY_STALE` through it. A comparison shows the member's current state, disclosed. It is AAB-PLATFORM-07's to settle, by its own amendment.

**Contract gap: Evidence Watch.** The candidate's design stores notices and an as-of time; this contract anchors it to persisted landscapes and derived staleness. Its own contract must align with this.

**Prerequisites before any code:** CAP-04 built first, since every member is read from it; and the extraction of the platform primitives, after the dependency audit's independent verification (roadmap, section 8.5).

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any evidence is true, any conclusion right, or any landscape complete beyond its listed records.
- It does not define what a review permits, which is CAP-09's to decide.
- It does not bring the rehearsal's cognitive loop across, or decide its identity.
- It does not settle the proposed decisions until they are approved in review.
- It does not establish that CAP-05 is production-ready, scientifically valid or regulatorily compliant.
- It does not admit CAP-05: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
