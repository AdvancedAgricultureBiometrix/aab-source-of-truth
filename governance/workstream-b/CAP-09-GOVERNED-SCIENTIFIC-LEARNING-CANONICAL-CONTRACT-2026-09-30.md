# CAP-09 Governed Scientific Learning — Canonical Contract — 2026-09-30

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-09 Governed Scientific Learning.
**Authority:** DEFINES THE CONTRACT FOR CAP-09: HOW A LEARNING CLAIM DRAWN FROM ADMITTED EVIDENCE IS PROPOSED, BOUNDED, ASSEMBLED INTO A LEARNING DOSSIER, REVIEWED BY A SCIENTIST AND PROMOTED, OR NOT, TO SCIENTIFIC KNOWLEDGE VALID WITHIN A RECORDED BOUNDARY, HOW A PROMOTION STAYS CURRENT, AND ITS BOUNDARIES WITH CAP-04, CAP-05, CAP-06, CAP-07, CAP-08 AND CAP-10. Establishes no commissioning, production, Gate D, WP05, scientific-validity, safety or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-30, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-09 had no design contract before this one. Its promotion decision was first sketched in CAP-04's contract of 2026-09-20, and moved here by CAP-04's amendment of 2026-09-29 (decision 8).
**Amended:** 2026-10-02 (the safety label, and adverse effects, under CAP-10), with CAP-10's canonical contract.

## Amendment of 2026-10-02: the safety label, and adverse effects, under CAP-10

**Why.** This contract carried `SAFETY_ECOLOGY_NOT_ASSESSED` "until CAP-10 has a contract" (decision 10; "The learning dossier"). CAP-10 now has a contract (`governance/workstream-b/CAP-10-SAFETY-AND-ECOLOGICAL-INTELLIGENCE-CANONICAL-CONTRACT-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-02. **Decision 10 stands: CAP-09 never promotes a claim that anything is safe.** Nothing else in this contract changes.

**1. The label is permanent in CAP-09.** A learning claim is never a CAP-10 subject, and a promotion is never a safety assessment. **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present** on every dossier and promotion. The words "until CAP-10 has a contract" no longer apply. A CAP-10 outcome on a material a claim names may be shown beside the claim, with CAP-10's display block, and never replaces the label.

**2. A promoted adverse effect is a trigger in CAP-10.** A promoted `ADVERSE_EFFECT` claim naming a material among `boundary.materials` makes CAP-10's assessments of that material **potentially stale** (CAP-10, "Currency"). **This is consistent with decision 9:** it changes no record, suppresses, blocks or rejects nothing, and acts on nothing; it makes a person look at the assessment again before anything relies on it. Whether a promoted adverse effect should also be reported as a safety signal is a person's decision, in CAP-10.

**3. What this amendment replaces.**
- **The contract gap "CAP-10"** now reads: adverse effects are recorded as observations of harm and are never safety assessments; a promoted one makes CAP-10's assessments of the material potentially stale.
- **The dependencies row for CAP-10** now reads: **owns safety; CAP-09 never promotes a claim of safety; a promoted adverse effect is a currency trigger in CAP-10; `designed`.**

## Why this contract, and what it adopts

**Why.** CAP-09 is seventh and last in the workstream's order. Its description (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, section 7.3): CAP-09 "lets an authorised scientist decide whether a conclusion may be treated as validated knowledge". Four records already set its boundary:
- **CAP-04** ("The CAP-09 boundary"): a learning claim cites admitted CAP-04 records, never raw or unadmitted material; promoted knowledge is never written into CAP-04; CAP-09 never changes a CAP-04 record; and the rehearsal's "scientific memory" is CAP-09's register of promoted learning, to be named as such.
- **CAP-05** leaves to CAP-09 what relies on a landscape review, and what happens when a review it relied on is invalidated.
- **CAP-08** (interim position 7): "Admission is not learning." Trial outcomes reach CAP-04 on a person's submission; promotion to learning is a later human decision, in CAP-09.
- **The domain register and cognitive architecture** (section 15): promotion considers evidence quality, scientific review, replication, scope, contradictions, applicability, safety and whether a result is country-specific. "One result, one country or one unusual season must not become a universal AAB rule."

The evidence is the step 0 snapshots, **with the rehearsal's whole learning path read in full:** the gateway's learning group, the learning candidate, approved learning, negative learning and memory tables, every function, view and trigger that writes or reads them, and the learning parts of the retired cognitive loop.

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-09 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a learning dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** learning reviews, held resolutions and challenges are human decisions.
- **CAP-04 as amended:** every citation is an admitted CAP-04 record, read for a declared purpose, and CAP-04's boundary with CAP-09 is met in full.
- **CAP-05:** a claim may cite evidence landscapes and their reviews.
- **The platform's observation and brain governance**, the brain boundary in the purpose and values, **the domain register and cognitive architecture**, and **the country scientific data non-return boundary** (`governance/AAB-COUNTRY-SCIENTIFIC-DATA-NON-RETURN-BOUNDARY-2026-09-13.md`): CAP-09 is bound by them, and cites them.

AAB-PLATFORM-01 is **not adopted:** CAP-09 stores no originals. AAB-PLATFORM-04 is **not adopted:** nothing in CAP-09 is submitted on behalf of another party.

**Decisions recorded on 2026-09-30** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-09`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-09:`. Receipts are accepted already (migration 025).
2. **One kind of record: a learning claim,** a proposed conclusion, stated by a person, with its kind, its applicability boundary, its limitations and its evidence. Written once; a change is a new version, written in full.
3. **A claim cites only admitted CAP-04 records,** each as supporting, contradicting or context, by identifier, version and admission decision. At least one supports it. A held, rejected, superseded or quarantined record is never cited. **CAP-09 never writes into CAP-04 and never changes a CAP-04 record** (CAP-04, "The CAP-09 boundary").
4. **Learning may be drawn from any admitted evidence,** not only from trials: trial results submitted to CAP-04, historical records, and CAP-05 landscapes. The rehearsal allowed learning only from a completed trial.
5. **Every claim declares its applicability boundary:** the country workspace, always; and the crops, locations, periods, conditions and materials within which it is claimed to hold. **A promoted claim is valid only within its boundary,** and is shown so, everywhere.
6. **A learning dossier shows the evidence for and against,** how many independent sources, locations and periods it rests on, the limitations its evidence was admitted with, and the conflicts among it. **No confidence score, no automatic promotion.** The simulation's automatic promotion, at two supporting trials with no conflicting keyword, is not adopted.
7. **Replication is shown, never assumed.** A claim resting on one independent source is `UNREPLICATED`. **It may be promoted only with `UNREPLICATED` carried permanently on the promotion,** visible on every read, never removable, and addressed by name in the reviewer's reasoning. **The reason:** replication may take years, and where research infrastructure is limited it may never happen; a single strong trial with a declared boundary should not be blocked indefinitely. The label does the work a refusal would, without destroying the value of single-trial evidence. `REPLICATION_NEEDED` remains open to a reviewer who judges replication essential before any use.
8. **Promotion is a scientist's decision** (`LEARNING_REVIEW`, outcome `PROMOTE`), by someone who did not propose the claim and did not submit any record it cites, bound to its dossier. Other outcomes: `REPLICATION_NEEDED`, `MORE_EVIDENCE_NEEDED`, `NOT_PROMOTED`.
9. **Negative, null and adverse results are learning, as readily as positive ones.** A claim may be that something had no effect, or did harm. **A promoted negative claim triggers nothing automatically:** the rehearsal's warn, suppress and reject actions are not carried across. It is shown to people, who decide.
10. **CAP-09 never promotes a claim that anything is safe.** An adverse effect may be promoted as an observation of harm, never as a safety assessment. Safety and ecology are CAP-10's, and every dossier and promotion carries `SAFETY_ECOLOGY_NOT_ASSESSED`.
11. **Promotion is never approval,** and never a recommendation. It does not authorise use, sale, manufacture, or advice to a farmer, and it never becomes canonical AAB knowledge. **Promoted knowledge stays in the country** (decision 17).
12. **A promotion stays current only while its evidence does.** Every platform change kind is a trigger, and a cited landscape review invalidated is one too. **Lapse: 36 months,** after which it must be reviewed again. **This is the pilot position:** learning describes what was understood about a crop, mechanism or outcome at a point in time, and changes more slowly than an ingredient's evidence, which lapses at 12 months. **The Evidence Watch candidate (proposed CAP-35) is the intended mechanism for detecting new contrary evidence before the lapse.** A promotion no longer current is shown as such, never removed, and nothing downstream changes automatically.
13. **What CAP-09 relies on from CAP-05:** citing a landscape is optional. **If one is cited, its `FIT_AS_EVIDENCE_BASIS` review must be valid and current at promotion,** and its later invalidation makes the promotion potentially stale. This answers CAP-05's open gap.
14. **People only.** No automated claim, dossier request or promotion in this version. The retired loop's automatic weighting of approved learning is not carried across. **Brains may read promoted knowledge,** under the platform's brain governance, and never change it.
15. **Roles:** `LEARNING_PROPOSER`, `LEARNING_REVIEWER` and `LEARNING_READER`, each a scoped grant.
16. **Naming:** CAP-09's records are learning claims and promoted knowledge, never "memory". The rehearsal's `AAB_LEARNING_MEMORY_ACTIONS` and `scientific_memory_entry` are not carried across, which meets CAP-04's naming requirement.
17. **Learning stays in the country.** Learning claims, dossiers and promotions are the egress specification's category 2 ("scientific memory", "hypotheses, mechanisms, contradictions and knowledge gaps", "generated scientific summaries"). Sharing any of it beyond the country is a future, explicit process under the non-return boundary, never a default.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **A scientist states what they think the evidence shows, where it holds, and what it rests on. AAB shows the evidence for and against it, how often it has been seen, and what is missing. A scientist who did not propose it decides whether it may be treated as knowledge, within those limits. AAB never decides that anything is true, safe or ready to use.**

CAP-09 keeps the governed record of learning claims and the scientific decision that promotes one to knowledge. It does not admit evidence (CAP-04), evaluate a question over evidence (CAP-05), run trials (CAP-08), assess safety (CAP-10), or advise anyone to act.

## What CAP-09 answers, and what it does not

| Question | Answered by |
|---|---|
| What is this evidence, and may it be used? | CAP-04 |
| What does the evidence on this question say, for and against? | CAP-05, a landscape |
| What conclusion does a scientist draw, where does it hold, and what does it rest on? | **CAP-09**, a learning claim |
| How strong is the basis for it, now? | **CAP-09**, a learning dossier, which shows it and does not score it |
| May this conclusion be treated as knowledge, within its boundary? | **A scientist,** by a learning review in CAP-09 |
| Is it safe? | CAP-10, which has no contract yet |
| Should anyone act on it? | Not AAB. People, under their own authority |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** the gateway's learning group (`api.php`, lines 1047 to 1145, four actions); the learning candidate, approved learning, negative learning register, scientific memory entry and memory evidence link tables (`tables.sql`, lines 204, 1699, 1864, 1928 and 2973); every function that writes or reads them, and the governance review and decision functions they call; the views over them; and the learning parts of the retired cognitive loop (`cognitive_core/functions.sql`, lines 485 to 560).

**What it does, as read:**
- **Learning comes only from a completed trial** whose outcome is approved and marked eligible for brain evidence (`api_prepare_trial_learning`, `functions.sql`, lines 1973 to 2010). No other evidence can ground learning.
- **One person can propose, submit and approve their own learning.** Preparing a review creates the decision and the review as the caller (lines 1877 to 1898). Deciding completes the review with the caller as reviewer, and finalises the decision with the caller as decider (lines 1262 to 1366; `api_complete_governance_review`, line 658; `api_finalize_governance_decision`, line 1459). No function compares the decider with the proposer.
- **One approval writes up to six records at once:** approved learning, a "scientific memory" entry, and, depending on the kind, a negative learning entry, a knowledge gap, a mechanism hypothesis and a contradiction record (lines 1262 to 1366).
- **The approver chooses what negative learning does downstream:** warn, suppress, reject or escalate, defaulting to warn. Nothing reads the choice except the retired loop.
- **The applicability scope is free JSON,** chosen by the approver, and nothing checks it against the evidence.
- **Approval runs the cognitive loop at once** (`api.php`, lines 1129 to 1135), which turns approved learning into graph nodes with fixed weights and, for negative learning, propagates a "high" reassessment (`cognitive_core/functions.sql`, lines 485 to 555).
- **Learning cites evidence packets,** not admitted evidence records.
- **An open high-severity contradiction on the outcome blocks approval** (lines 266 to 285).
- **Approved learning can never be revised or withdrawn.** Its supersession, suspension and retirement fields have no writer. **A rejected candidate is a dead end:** only a draft can be submitted.
- **"Scientific memory"** is written only after approval: CAP-09's end state wearing CAP-04's name, as CAP-04's amendment records.

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Learning only from completed trials | **Any admitted evidence** (decision 4) |
| Propose, submit and approve by one actor | **`LEARNING_REVIEW`** by someone who did not propose the claim or submit its evidence (decision 8) |
| One approval writes six records | **One decision, on one claim.** Gaps and conflicts are dossier findings; mechanisms are claims of their own |
| Negative learning that warns, suppresses or rejects | **Shown to people, never acted on automatically** (decision 9) |
| Free-JSON scope chosen at approval | **A declared applicability boundary,** part of the claim, shown beside its evidence (decision 5) |
| Approval runs the cognitive loop | **Not carried across** (decision 14) |
| Evidence packets | **Admitted CAP-04 records,** with their admission decisions (decision 3) |
| Contradiction blocks approval | **Kept, in governed form:** every conflict is a finding the reviewer must address |
| Approved learning permanent and unrevisable | **Current only while its evidence is,** with a lapse, supersession and challenge (decision 12) |
| Rejected candidate a dead end | **A new version may be reviewed again** |
| "Scientific memory" | **Promoted knowledge,** never called memory (decision 16) |

**Kept, in governed form:** learning from reviewed trial outcomes; a named uncertainty and limitations; contradictions blocking a quiet promotion; negative learning preserved.

**Not carried across, in any form:** self-approval; automatic side-effects of approval; automatic downstream actions; automatic reasoning runs; fixed weights; permanent, unrevisable approval.

**The rehearsal's data is not CAP-09's.** CAP-09's records start empty in a new deployment.

**The CAP-34 simulation is not a model for this contract.** Its CAP-09 logic promotes a finding automatically when at least two supporting trials are present and no supporting text matches a keyword for conflict or insufficiency, ending in `PROMOTED_TO_APPROVED_LEARNING`. **Promotion by a machine is exactly what this contract forbids** (decision 14). Its behavioural proof proves the simulation, and nothing about this contract.

**Earlier records defined CAP-09 differently.** The gateway reconciliation of 2026-09-20 (line 56) described CAP-09 as evaluating "promotion conditions for a candidate finding"; CAP-04's text of 2026-09-20 sketched a `LearningPromotionDecision` with replication and contradiction states. **This contract keeps the sketch's link to admitted evidence and its refusal outcomes,** and replaces its stored states with a dossier derived when evaluated.

## The learning claim

Every CAP-09 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap09LearningClaim {
  recordId: string;                      // set by the system
  recordVersion: number;                 // a new version supersedes the previous one, written in full
  recordKind: "LEARNING_CLAIM";
  schemaVersion: "urn:aab:schema:agr:cap-09:learning-claim:1";
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  statement: string;                     // the conclusion, as the proposer states it
  claimKind: "EFFECT" | "NO_EFFECT" | "ADVERSE_EFFECT" | "MECHANISM" | "OTHER";
  mechanism?: { statement: string; pathway: string; expectedObservableEffects?: string };  // required for MECHANISM

  // Where the claim is said to hold. The country workspace is always the outer limit.
  boundary: {
    crops: string[];
    locations: string[];                 // as declared, e.g. agro-ecological zones, districts
    periods: string[];                   // as declared, e.g. seasons or years
    conditions: string[];                // as declared, e.g. "sandy soils", "rainfed"
    materials: string[];                 // CAP-06 or CAP-07 record identifiers, where the claim concerns one
    exclusions: string[];                // where it is known not to hold, or was not tested
  };
  limitations: string[];
  uncertainty: string;                   // what the proposer is least sure of

  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    admissionDecisionId: string;         // set by the system from CAP-04
    role: "SUPPORTING" | "CONTRADICTING" | "CONTEXT";
    note?: string;
  }>;
  landscapes: Array<{ evaluationId: string; reviewDecisionId?: string }>;  // CAP-05, optional

  classification: {
    sharingClassification: string;
    permittedUses: string[];
    traditionalKnowledgeLinked: boolean;
    personalInformationPresent: boolean;
  };

  supersedes?: { recordId: string; recordVersion: number; recordDigest: string; reason: "CORRECTION" | "UPDATE" | "WITHDRAWAL"; explanation: string };
  recordDigest: string;
}
```

**Field rules:**
- **The system sets** the identity fields, the country, the platform's provenance fields, each citation's `admissionDecisionId` and the digest. A request that supplies any of them is refused.
- **A new version is written in full,** and does not inherit the reviews of the one it supersedes.
- **No record states its own confidence, strength, validity or promotion.** What supports a claim is its citations; how strong the basis is appears in a dossier; whether it is knowledge is a person's review.
- **A contradicting record the proposer knows of must be cited as contradicting.** CAP-09 cannot enforce what a proposer knows; the dossier shows every conflict among the cited records, and a reviewer may ask for more.

**Admission** (rules version `cap-09-admission-1`), in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `PROPOSER_AUTHORITY`: `LEARNING_PROPOSER` in the country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the required fields, a mechanism for a `MECHANISM` claim, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `SUPPORT_CITED`: at least one `SUPPORTING` citation | **Refuses:** `NO_SUPPORTING_EVIDENCE` |
| 5 | `EVIDENCE_ADMITTED`: every citation is admitted, current and readable for the purpose `SCIENTIFIC_LEARNING` | **Refuses:** `EVIDENCE_NOT_ADMITTED`, never revealing a record the proposer may not see |
| 6 | `BOUNDARY_DECLARED`: at least one crop or material, and at least one location and one period | **Refuses:** `BOUNDARY_INCOMPLETE` |
| 7 | `LANDSCAPES_RESOLVED`: every cited landscape exists in the same country workspace | **Refuses:** `LANDSCAPE_NOT_FOUND` |
| 8 | `SUPERSESSION_VALID` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 9 | `SOURCE_IDENTIFIED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 10 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information declared | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |

- **Held records** are decided by a `LEARNING_REVIEWER`, never the submitter (`CAP09_HELD_RESOLUTION`: `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`).
- **Check 5 refuses rather than limits,** because CAP-04 requires that no unadmitted record is ever cited in support, and a contradicting record that is not admitted cannot be shown to a reviewer either.

## The learning dossier

**A dossier is an evaluation of one learning claim** (AAB-PLATFORM-07), over a frozen snapshot of the claim's current version, every CAP-04 record it cites, and every CAP-05 landscape and review it cites. It is written once, with its snapshot and receipt. A `LEARNING_PROPOSER` or `LEARNING_REVIEWER` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-09 |
|---|---|
| `manifest.scope.scopeRule` | `cap-09-dossier-scope`, version `1` |
| `manifest.selection.mode` | `REQUESTER_LISTED`: the claim's citations; quarantined `EXCLUDE`, disclosed; policy `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | The cited landscapes and their reviews |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed |
| `cutoffAt` | The platform's clock |

```typescript
interface Cap09LearningDossier {
  evaluationId: string;
  capabilityId: "CAP-09";
  resultType: "LEARNING_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-09:learning-dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-09-dossier-rules-1"
  subject: { recordId: string; recordVersion: number };
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  basis: {
    supporting: number;
    contradicting: number;
    context: number;
    independentSupportingSources: number;    // distinct original sources, as CAP-04's provenance identifies them
    supportingInstitutions: number;
    supportingLocations: string[];           // as the supporting records declare them
    supportingPeriods: string[];
  };

  boundaryBesideEvidence: {
    declared: Cap09LearningClaim["boundary"];
    evidenceLocations: string[];
    evidencePeriods: string[];
  };

  landscapes: Array<{ evaluationId: string; reviewDecisionId?: string; reviewValidity?: string; reviewCurrency?: string }>;

  gaps: Array<{
    findingId: string;
    gapType:
      | "UNREPLICATED"
      | "SINGLE_LOCATION"
      | "SINGLE_PERIOD"
      | "CONTRADICTING_EVIDENCE"
      | "EVIDENCE_ADMITTED_WITH_LIMITATIONS"
      | "LANDSCAPE_REVIEW_NOT_CURRENT"
      | "MECHANISM_NOT_EVIDENCED"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED";
    recordIds?: string[];
  }>;
  conflicts: Array<{ findingId: string; supporting: string[]; contradicting: string[] }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    dossierIsNotAVerdict: true;
    noConfidenceScore: true;
    noAutomaticPromotion: true;
    noSafetyAssessment: true;
    validOnlyWithinDeclaredBoundary: true;
  };
}
```

**The rules** (`cap-09-dossier-rules-1`), a pure function of the snapshot, exactly reproducible except `evaluatedAt`:
- **The basis** counts the citations by role, and the distinct original sources, institutions, locations and periods among the supporting records. **Two records from the same trial or the same report are one source.** Nothing is weighed.
- **The boundary beside the evidence** lists the declared boundary and the locations and periods the supporting records actually cover, side by side. It does not judge whether the boundary is too wide; the reviewer does.
- **Gaps:** `UNREPLICATED` when the supporting records come from one independent source; `SINGLE_LOCATION` and `SINGLE_PERIOD` likewise; any contradicting record; any supporting record admitted with limitations, naming each; any cited landscape review not valid and current; a `MECHANISM` claim with no record cited as supporting its mechanism; traditional knowledge linked.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present** until CAP-10 has a contract.
- **Conflicts** set the supporting and contradicting records side by side, never resolved.
- **Disclosures, always:** `MACHINE_GENERATED`; `SAFETY_ECOLOGY_NOT_ASSESSED`; `VALID_ONLY_WITHIN_DECLARED_BOUNDARY`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`.
- **No confidence score, probability, strength rating, rank or recommendation,** and no outcome that promotes.

## Learning review, and what it permits

**A `LEARNING_REVIEWER` reviews a dossier** with a human decision of the kind `LEARNING_REVIEW` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `PROMOTE` | `AFFIRMATIVE` | The claim may be treated as scientific knowledge, **valid only within its declared boundary,** with its limitations and gaps shown |
| `REPLICATION_NEEDED` | `DEFERRED` | The claim may be true, and needs independent replication first. The reasoning names what would replicate it |
| `MORE_EVIDENCE_NEEDED` | `DEFERRED` | The reasoning names what is missing |
| `NOT_PROMOTED` | `NEGATIVE` | Not now, with reasons |

- **Independence:** never the dossier's requester, never the submitter of any cited record (AAB-PLATFORM-08, section 3). **CAP-09 adds:** never the proposer of any version of the claim.
- **The reasoning addresses every gap and conflict by its identifier, the declared boundary against the evidence, the limitations and the uncertainty,** and `SAFETY_ECOLOGY_NOT_ASSESSED` by name.
- **`UNREPLICATED` does not refuse a promotion.** A promotion of an unreplicated claim carries `UNREPLICATED` permanently, shown wherever the promotion is shown (decision 7).
- **Refused outright** (`DECISION_NOT_PERMITTED`): `PROMOTE` while any cited landscape review is not valid and current; `PROMOTE` of a claim whose statement or kind asserts that something is safe (decision 10).
- **What a promotion permits, and what it does not.** A promoted claim is shown as **"Promoted Scientific Knowledge: scientist-reviewed, evidence-linked and valid only within the recorded applicability boundary"** (CAP-04, "What the scientist sees"), with its boundary, limitations and gaps. It may be read by people and, under the brain governance, by brains. **It is never an approval, a recommendation, an instruction, or a statement that anything is safe or permitted.** Nothing in AAB acts on it automatically.
- **Currency.** Every platform change kind is a trigger: a cited record superseded, quarantined or no longer admitted; a new version of the claim; a later dossier; the rules version changed; and a cited landscape review invalidated or superseded. **Lapse:** 36 months, as the pilot position (decision 12).
- **Challenge:** a `LEARNING_REVIEWER` other than the decider, or the claim's proposer. Resolved by a `CHALLENGE_RESOLUTION`, by a `LEARNING_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-09. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** While a challenge to a promotion is open, the promotion is shown as challenged.
- **A claim not promoted is never a dead end.** A new version, with new evidence, may be reviewed again.

## Negative, null and adverse results

- **`NO_EFFECT` and `ADVERSE_EFFECT` are learning, reviewed and promoted like any other.** A null or failed result, promoted, is as much knowledge as a positive one, and is kept.
- **Nothing is suppressed, blocked or rejected because of them.** A promoted negative claim about an ingredient or formulation is shown to CAP-06 and CAP-07 readers as knowledge, beside the record it concerns. Whether to act on it is a person's decision in that capability.
- **An adverse effect is not a safety assessment.** It records that harm was observed, within its boundary. What follows for safety is CAP-10's, and until CAP-10 exists, a person's.

## When evidence changes

- **A promotion whose evidence changes** becomes potentially stale, and is shown as such with the reason. It is never removed or quietly downgraded.
- **A promotion resting on a landscape review later invalidated** is potentially stale until reviewed again. This answers what CAP-05 leaves to CAP-09.
- **A new version of the claim,** or a new review of a new dossier, supersedes. The earlier promotion stays on record, superseded.
- **Nothing downstream changes automatically.** No other capability's record is altered by a change in CAP-09.

## Brain governance and sovereignty

**CAP-09 cites the platform's observation and brain governance, the domain register and cognitive architecture, and the non-return boundary as binding.**
- **No brain runs in CAP-09 in this version.** Claims, dossier requests and reviews are made by people.
- **Brains must not promote outputs into canonical learning or memory** (the observation and brain governance, section 5). **A future brain may propose learning claims;** when one is contracted, its outputs are labelled machine-generated, linked and supersedable, and **held for a person.** It may never promote a claim, request a review, or change a promotion. CAP-09 is amended to say so when it happens.
- **Brains may read promoted knowledge** as eligible input for the purposes the governance allows, always with its boundary, limitations and currency, and never as a fact beyond its boundary.
- **The dossier is automated output,** labelled `MACHINE_GENERATED`, linked through its snapshot, reproducible, and separate from any scientist's decision. **It is arithmetic, not reasoning.**
- **Learning stays in the country.** A promotion is the country's knowledge, not AAB's. **One country's promoted knowledge never informs another country's AAB, or canonical AAB,** except through a future explicit sharing process under the non-return boundary.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-09 |
|---|---|
| Scope rules; selection policies | `cap-09-dossier-scope` v1; `ALL_ADMITTED` v1, `REQUESTER_LISTED`, quarantined `EXCLUDE`, disclosed |
| Pinned inputs; integrity re-check; empty snapshot | The cited landscapes and reviews; not required, disclosed; never empty, since a claim has at least one supporting record |
| Evaluator and rules versioning; non-reproducible fields | `cap-09-dossier-rules-1`; `evaluatedAt` |
| Existing evaluations and decisions | **None.** The rehearsal's learning approvals are not mapped |
| Decision kinds, roles | `LEARNING_REVIEW`, `CAP09_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`, each by `LEARNING_REVIEWER` |
| Separation of duties beyond the platform's | Never the proposer of any version of the claim |
| Findings a review must address | Every gap and conflict; the boundary against the evidence; limitations and uncertainty |
| More than one decider | Not required in this version |
| Challenging role | `LEARNING_REVIEWER` other than the decider, or the proposer |
| Triggers and lapse | All ten change kinds, and a cited landscape review invalidated; 36 months |
| What relies on reviews | Nothing automatically. People and brains read a promotion with its currency |

## Authority

| Role | May |
|---|---|
| `LEARNING_PROPOSER` | Propose learning claims and new versions; request dossiers |
| `LEARNING_REVIEWER` | Resolve held records; review dossiers; challenge and resolve challenges |
| `LEARNING_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP09_RECORD_ADMISSION` | A claim is held or admitted |
| `CAP09_HELD_RESOLUTION` | A held claim is resolved |
| `LEARNING_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `LEARNING_REVIEW` | A dossier is reviewed |
| `CAP09_DECISION_CHALLENGE`, `CAP09_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-09"`.

| Operation | Route |
|---|---|
| `submitClaim`, `getClaim`, `listClaims` | `POST /agr/v1/learning-claims`; `GET /agr/v1/learning-claims/:recordId`, with its state derived; `GET /agr/v1/learning-claims?kind=&status=&…` |
| `resolveHeldRecord` | `POST /agr/v1/learning-claims/:recordId/held-resolutions` |
| `requestDossier`, `getDossier` | `POST /agr/v1/learning-dossiers`; `GET …/:evaluationId` |
| `reviewDossier` | `POST /agr/v1/learning-dossiers/:evaluationId/reviews` |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/learning-claims/challenges`; `…/challenges/:challengeId/resolutions` |
| `listPromotedKnowledge` | `GET /agr/v1/promoted-knowledge?crop=&material=&…`: promoted claims, each with its boundary, limitations, gaps and currency |

Every write requires an `Idempotency-Key`. **A claim's state is derived when read:** admitted, held or rejected; superseded; and whether it holds a promotion, and whether that promotion is current, potentially stale, lapsed, challenged or invalidated.

## Failure contract

```typescript
interface Cap09Failure {
  ok: false;
  capabilityId: "CAP-09";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "NO_SUPPORTING_EVIDENCE"
    | "EVIDENCE_NOT_ADMITTED"
    | "BOUNDARY_INCOMPLETE"
    | "LANDSCAPE_NOT_FOUND"
    | "SUPERSESSION_NOT_PERMITTED"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "RECORD_NOT_FOUND"
    | "DOSSIER_NOT_FOUND"
    | "DECIDER_NOT_INDEPENDENT"
    | "REASONING_INCOMPLETE"
    | "BINDING_MISMATCH"
    | "DECISION_SIGNATURE_INVALID"
    | "DECISION_NOT_PERMITTED"
    | "CHALLENGED_DECISION_NOT_FOUND"
    | "CHALLENGE_ALREADY_OPEN"
    | "CHALLENGE_NOT_OPEN"
    | "CHALLENGE_NOT_PERMITTED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
}
```

| Code | HTTP | Meaning |
|---|---:|---|
| `UNAUTHENTICATED` | 401 | No actor, for any read or write |
| `ROLE_NOT_AUTHORISED` | 403 | The actor lacks the role, in a scope covering the country workspace |
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, or supplies a system-set field |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key was used with different content |
| `CLASSIFICATION_INCOMPLETE` | 422 | A classification field is missing |
| `NO_SUPPORTING_EVIDENCE` | 422 | No citation supports the claim |
| `EVIDENCE_NOT_ADMITTED` | 422 | A citation is not admitted, not current, or not readable for the purpose |
| `BOUNDARY_INCOMPLETE` | 422 | The boundary names no crop or material, no location, or no period |
| `LANDSCAPE_NOT_FOUND` | 422 | A cited landscape does not exist in the country workspace |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, the boundary, a limitation or a disclosure is not addressed |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | A promotion resting on a landscape review not current, or asserting that something is safe |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, CAP-05, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-09 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every citation is an admitted CAP-04 record, read for the purpose `SCIENTIFIC_LEARNING` | `designed`; built first |
| CAP-05 Governed Scientific Reasoning | **Optional:** a claim may cite landscapes and their reviews | `designed` |
| CAP-08 Controlled Trials & Outcomes | **Indirect:** trial results reach CAP-09 only as CAP-04 records, submitted by a person | `designed` |
| CAP-06 and CAP-07 | **Readers:** promoted knowledge about an ingredient or formulation is shown beside it | `designed` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety.** CAP-09 never promotes a claim of safety | `named only` |
| The Evidence Watch candidate (proposed CAP-35) | **Would notify** a scientist when new admitted evidence bears on a promotion. Until it exists, new contradicting evidence is found only by people | candidate |

## Open gaps

**Contract gap: new evidence against a promotion.** A promotion becomes stale when evidence it cites changes, but not when new evidence against it is admitted. Finding that is people's work until the Evidence Watch candidate has a contract; until then, the 36-month lapse is what forces a promotion to be looked at again.

**Contract gap: sharing learning beyond the country.** Promoted knowledge stays in the country. How a country could choose to share a promotion with another, or with canonical AAB, is a future explicit process under the non-return boundary, not defined here.

**Contract gap: two reviewers for wide-boundary claims.** One independent reviewer promotes a claim in this version. Requiring two for claims with a wide boundary is the right long-term discipline, **recorded as an open item so it is not forgotten.** It is not required now: before the Evidence Watch candidate exists, it would leave wide-boundary promotions blocked with no mechanism to unblock them. What counts as a wide boundary is also undefined.

**Contract gap: boundary vocabulary.** Crops, locations, periods and conditions are declared strings. A governed vocabulary, and matching a boundary against evidence automatically, are not defined.

**Contract gap: CAP-10.** Adverse effects are recorded as observations of harm, never assessed for safety, until CAP-10 exists.

**Contract gap: automated proposals.** No brain proposes learning claims in this version. When one does, its outputs are held for a person.

**Platform gap: an invalidated admission,** as in CAP-01, CAP-04 to CAP-08. A cited record whose admission is invalidated by an upheld challenge does not yet trigger staleness.

**Current system limit: no implementation.** Nothing of CAP-09 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any claim is true, safe, effective, or fit for any use.
- It does not authorise anyone to present a promotion as an approval, a recommendation or advice.
- It does not define what CAP-04 admits, or CAP-10.
- It does not make CAP-09 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-09: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
