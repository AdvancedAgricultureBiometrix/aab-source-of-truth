# CAP-06 Ingredient Intelligence — Canonical Contract — 2026-09-29

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-06 Ingredient Intelligence. It is not SCS-CAP-06 (Due Diligence Sufficiency Evaluation), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-06: HOW A COUNTRY'S KNOWN INGREDIENTS AND CANDIDATE NEW ONES ARE REGISTERED, EVIDENCED, ASSEMBLED INTO AN INGREDIENT DOSSIER, REVIEWED BY A SCIENTIST AND ACCEPTED FOR FORMULATION RESEARCH, HOW CAP-01'S REFERRALS ARE RECEIVED AND CLOSED, AND ITS BOUNDARIES WITH CAP-01, CAP-04, CAP-07, CAP-08, CAP-10 AND CAP-11. Establishes no commissioning, production, Gate D, WP05, scientific-validity, safety or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-29, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-06 had no design contract before this one.

## Why this contract, and what it adopts

**Why.** CAP-06 is fifth in the workstream's order. Its description (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, line 200): CAP-06 "investigates existing ingredients, and candidate new ones from evidence and country resources". CAP-01's contract hands it referrals, and leaves to CAP-06 how a referral is received and closed. CAP-08 tests ingredients as material under trial, and CAP-07 builds formulations from them. The evidence is the step 0 snapshots, **with every ingredient path in `agriculture`, the ingredient candidates in `cognitive_core`, the starter library in `country_core`, and the dormant discovery-to-ingredient path read in full for this contract** ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-06 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** an ingredient dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** ingredient reviews, referral receipts, held resolutions and challenges are human decisions.
- **AAB-PLATFORM-01 (evidence object store):** CAP-06 stores no originals of its own. Evidence is CAP-04's.
- **CAP-04 as amended:** CAP-06 cites admitted CAP-04 records as its evidence, read for a declared purpose.
- **The platform's observation and brain governance** (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`) and the brain boundary in the purpose and values: CAP-06 is bound by it, and cites it ("Brain governance").

AAB-PLATFORM-04 (actor–subject links) is **not adopted**: nothing in CAP-06 is submitted on behalf of another party.

**Decisions recorded on 2026-09-29** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-06`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-06:`. Receipts are accepted already (migration 025).
2. **CAP-06 records; CAP-04 evidences.** An ingredient registration declares what the ingredient is. What it rests on is admitted CAP-04 evidence, cited by the aspect it supports. **No record states its own evidence strength, safety or readiness.**
3. **Two kinds of subject:** an **ingredient** already known and used, and an **ingredient candidate**, a proposed new ingredient, from a CAP-01 referral or a scientist's proposal. A candidate never becomes an ingredient by itself: a person registers the ingredient, citing the candidate.
4. **Every record is admitted under AAB-PLATFORM-06, and written once.** A change is a new version; nothing is overwritten, and no field a version omits is wiped. **Traditional knowledge and personal information are always held.**
5. **No readiness score, ranking or partner selection.** The rehearsal's browser "selection brain" and the simulation's readiness score are not carried across. **An ingredient dossier shows what is known and missing. A scientist decides.**
6. **Acceptance for formulation research** (`INGREDIENT_REVIEW`, outcome `ACCEPT_FOR_FORMULATION_RESEARCH`) is a scientist's decision, by someone who did not register or propose the ingredient, bound to its dossier. **It is the only thing that lets CAP-07 use an ingredient in a formulation,** and only while it is valid and current. **It is never "approval", and never a statement that the ingredient is safe, effective or permitted.**
7. **Safety and ecology are CAP-10's.** Until CAP-10 has a contract, acceptance requires a **declared safety and handling basis**, addressed by the reviewer, and every dossier and acceptance carries `SAFETY_ECOLOGY_NOT_ASSESSED`.
8. **Regulatory status is declared, not verified,** and is CAP-11's to govern when it has a contract. Acceptance for research is never acceptance for use or sale.
9. **Material that is prohibited, restricted, unsafe or unidentified is recorded, and never accepted for formulation research.** A synthetic agrochemical is accepted only as a **reference material**, for use as a comparator in trials, never as a formulation component. **This is a governed mission choice, not a technical limitation.** AAB is a platform for countries to investigate and govern their own agricultural resources: natural materials, waste streams and overlooked biodiversity. Synthetic agrochemicals are the domain of well-resourced commercial players who do not need AAB. Allowing them only as trial comparators preserves AAB's integrity, and its relevance to the institutions it serves.
10. **CAP-01's referrals are received by a person** (`REFERRAL_RECEIPT`): opened as a candidate, or declined with reasons. Either closes the referral. A referral resting on a review later invalidated is shown as such, and is never opened without a reviewer acknowledging it.
11. **People only.** No automated candidate, registration, review or referral in this version. A caller can never declare an origin of `AAB_DETECTION`.
12. **No global starter library in this version.** The rehearsal's starter library is not carried across. A shared reference set of ingredients would need an explicit authorisation under the canonical template rule; until then, each country registers its own.
13. **Roles:** `INGREDIENT_CURATOR`, `INGREDIENT_REVIEWER` and `INGREDIENT_READER`, each a scoped grant.
14. **Ingredient intelligence stays in the country.** It is the egress specification's category 2 ("formulations and ingredient intelligence").

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People record the ingredients a country knows and the new ones it might make, and cite the evidence for each. AAB shows what is known about an ingredient, and what is missing. A scientist who did not propose it decides whether it may be used in formulation research. AAB never decides that an ingredient is safe, effective or allowed.**

CAP-06 keeps the governed record of ingredients and candidates, and the scientific decision that lets one be researched. It does not build formulations (CAP-07), run trials (CAP-08), assess safety (CAP-10), or decide what may be sold or applied (CAP-11 and the country's regulators).

## What CAP-06 answers, and what it does not

| Question | Answered by |
|---|---|
| What ingredients and candidates does this country have on record, and what evidences them? | **CAP-06**, citing CAP-04 |
| What is known and missing about this ingredient, now? | **CAP-06**, an ingredient dossier |
| May this ingredient be used in formulation research? | **A scientist,** by an ingredient review in CAP-06 |
| What becomes of a referral from CAP-01? | **CAP-06**, by a referral receipt |
| Is it safe? What is its ecological effect? | CAP-10, which has no contract yet |
| Is it permitted for use or sale here? | CAP-11 and the country's regulators; CAP-11 has no contract yet |
| Does a formulation with it work? | CAP-08 trials, reviewed; then CAP-04, CAP-05 and CAP-09 |
| What is in a formulation? | CAP-07 |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** every ingredient path in the gateway (`api.php`), including an ungrouped block of create, update and archive actions that the roadmap's catalogue mapping did not list, the platform group's review actions, the workbench's ingredient reads, and a read bridge; every function behind them in `agriculture`; the ingredient candidates in `cognitive_core`; the starter library and country availability in `country_core`; and the dormant path from a discovery candidate to an ingredient.

**What it does, as read:**
- **Two ingredient reads need no authentication at all.** `get_ingredient` and `list_ingredient_versions` are served by a read bridge that never checks who is asking (`api.php`, lines 1861–1998). The version history names who created and approved each version, and the gateway sets those names to users' email addresses.
- **One person can create, submit and approve an ingredient.** The review function creates a decision and a review, completes the review as its own caller, and finalises the decision, in one call (`functions.sql`, lines 1246–1251). The submitter is not even recorded.
- **The caller chooses an ingredient's data class, "scientist approved" included,** at creation (line 996), and chooses its country; a null country passes every country check (lines 86–90).
- **Prohibited, restricted, unsafe and unidentified material classes are accepted and can be approved** (`tables.sql`, line 1390). A whitelist of natural materials exists only in PHP that is never called.
- **Amending wipes what it omits:** a new version is written from the fields supplied, so any field left out, the risk and handling text among them, becomes empty (`functions.sql`, lines 204–205). The name and material class are overwritten in place, with no history.
- **Approval needs no evidence and no safety text.** The first version is created empty, and can be approved as it is. Approval makes an ingredient usable in any formulation.
- **A rejected ingredient is a dead end:** it can never be amended or reviewed again, only archived.
- **Ingredient "intelligence" is a read.** It aggregates versions, aliases, unreviewed evidence claims, hypotheses, contradictions, gaps, formulations and trials. It computes no score and makes no safety claim.
- **Candidate ingredients go nowhere.** The cognitive candidates, stamped `AAB_DETECTION` whoever proposes them, never leave their first status, and none becomes an ingredient. The discovery path's promotion function cannot succeed: it requires an evidence packet status that does not exist, and defaults to a data class that is not allowed (lines 2035, 2051). **No candidate from any source has a working path to an ingredient.**
- **The starter library is disconnected.** Its reference ingredients and country availability are never reviewed, and have no link to the ingredient register.
- **The ingredient's country is set by a direct PHP update** after the governed create, outside any function (`api.php`, line 412).

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Unauthenticated ingredient reads exposing emails | **Every read authenticated and scoped;** people's names are never email addresses |
| Create, submit and approve by one actor | **`INGREDIENT_REVIEW`** by someone who did not register the ingredient or propose the candidate |
| Caller-chosen data class and country | **Set by the system;** the country from the actor's grant |
| Prohibited and unsafe classes approvable | **Recorded, never accepted** (decision 9) |
| Amend that wipes omitted fields; names overwritten | **Versions written in full; nothing wiped or overwritten** |
| Approval with no evidence or safety text | **Acceptance requires a dossier, and a declared safety and handling basis** |
| "Approved" and "active" as the ingredient's status | **Derived when read** from its reviews; acceptance is for research, never approval |
| Rejected ingredient as a dead end | **A new version may be reviewed again** |
| Cognitive build candidates stamped `AAB_DETECTION` | **Ingredient candidates proposed by a person** |
| Dormant discovery promotion | **A CAP-01 referral received by a person,** opened as a candidate |
| Starter library and country availability | **Not carried across** (decision 12); availability is an aspect of an ingredient's evidence |
| Browser "ingredient selection brain" | **Not carried across** (decision 5) |

**Not carried across, in any form:** unauthenticated reads; self-approval; caller-chosen status, data class or country; approvable prohibited material; wiping and overwriting; direct table updates; `AAB_DETECTION` from a caller; dead-end statuses; the starter library's "universal" claims.

**The rehearsal's data is not CAP-06's.** CAP-06's records start empty in a new deployment.

**The CAP-34 simulation is not a model for this contract.** Its CAP-06 logic classifies evidence by keywords in its text and ends in a readiness score and a progression label, such as `INGREDIENT_PROGRESSION_CANDIDATE`. Its fidelity manifest already says the score "does not constitute genuine scientific, safety or regulatory scoring". Its behavioural proof proves the simulation, and nothing about this contract.

**An earlier record defined CAP-06 differently.** The gateway reconciliation of 2026-09-20 (line 54) described CAP-06 as computing "a continuous ingredient-readiness assessment", following the simulation, before the rehearsal's source was read. **This contract does not adopt it,** as CAP-01's did not adopt the same record's definition of CAP-01.

## The records

Every CAP-06 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap06Record {
  recordId: string;                      // set by the system
  recordVersion: number;                 // a new version supersedes the previous one, written in full
  recordKind: "INGREDIENT" | "INGREDIENT_CANDIDATE";
  schemaVersion: string;                 // "urn:aab:schema:agr:cap-06:<kind>:1"
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  identity: {
    name: string;
    aliases: string[];
    materialClass:
      | "PLANT_DERIVED"
      | "ANIMAL_DERIVED"
      | "MICROBIAL"
      | "FERMENTATION_DERIVED"
      | "MARINE_DERIVED"
      | "NATURALLY_OCCURRING_MINERAL"
      | "GEOLOGICAL_MATERIAL"
      | "NATURAL_WASTE_OR_BYPRODUCT"
      | "RECOVERED_MINERAL_MATERIAL"
      | "OTHER_NATURAL_OR_BIOLOGICAL"
      | "SYNTHETIC_AGROCHEMICAL"
      | "PROHIBITED_OR_RESTRICTED_MATERIAL"
      | "UNSAFE_OR_UNIDENTIFIED_MATERIAL";
    preparation?: string;
    description: string;
  };

  // Declared: what the ingredient is, is for, and needs
  properties: {
    composition?: string;
    intendedFunctions: string[];         // as declared, e.g. "soil structure", "nitrogen source"
    applicationModes: string[];          // as declared, e.g. "soil incorporation", "foliar"
    handlingAndStorage?: string;
    knownRisks?: string;
    safetyBasis?: string;                // why it may be handled and applied, until CAP-10 exists
    regulatoryStatus?: string;           // as declared; never verified by CAP-06
  };

  // Candidates only: where the candidate came from, and what making it involves
  candidate?: {
    origin: "CAP01_REFERRAL" | "SCIENTIST_PROPOSAL";
    referralId?: string;                 // a CAP-01 referral, received by a REFERRAL_RECEIPT
    compositionPlan?: string;
    processPlan?: string;
    whatWouldNeedToBeTrue: string;
  };

  // For an ingredient registered from a candidate
  fromCandidate?: { recordId: string; recordVersion: number };

  // What evidences it: declared citations of admitted CAP-04 records
  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    supports:
      | "IDENTITY"
      | "COMPOSITION"
      | "MECHANISM"
      | "EFFECT"
      | "SAFETY"
      | "HANDLING"
      | "AVAILABILITY"
      | "PRIOR_USE"
      | "REGULATORY_STATUS"
      | "OTHER";
    note?: string;
  }>;

  // Rights and sensitivity: declared, always complete
  ownership: { ownerOrganizationId?: string; rightsStatement?: string };
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
- **The system sets** the identity fields, the country, the platform's provenance fields and the digest. A request that supplies any of them is refused.
- **A new version is written in full.** A field it leaves out is absent from that version and disclosed as such; it is never taken as a deletion of what an earlier version said, which stays readable.
- **No record states its own evidence strength, readiness, safety or approval.** What evidences it is its citations; what is missing is derived in a dossier; whether it may be researched is a person's review.
- **A candidate from CAP-01** names its referral, and carries forward the referral's gaps and disclosures, `SAFETY_ECOLOGY_NOT_ASSESSED` among them.

**Admission** (rules version `cap-06-admission-1`), in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `CURATOR_AUTHORITY`: `INGREDIENT_CURATOR` in the country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the kind's required fields, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `REFERRAL_RECEIVED`: a candidate from CAP-01 names a referral opened by a `REFERRAL_RECEIPT` | **Refuses:** `REFERRAL_NOT_RECEIVED` |
| 5 | `SUPERSESSION_VALID` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 6 | `SOURCE_IDENTIFIED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 7 | `EVIDENCE_CITED`: at least one citation | **Limitation:** `NO_EVIDENCE_CITED` |
| 8 | `EVIDENCE_RESOLVED`: every citation is admitted, current and readable for the purpose `INGREDIENT_INTELLIGENCE` | **Limitation:** `EVIDENCE_UNRESOLVED`, never revealing a record the curator may not see |
| 9 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information declared | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |
| 10 | `MATERIAL_ADMISSIBLE_FOR_RESEARCH`: the material class is not prohibited, restricted, unsafe or unidentified | **Limitation:** `NOT_ADMISSIBLE_FOR_RESEARCH`; the record is kept, and can never be accepted (decision 9) |

- **Held records** are decided by an `INGREDIENT_REVIEWER`, never the submitter (`CAP06_HELD_RESOLUTION`: `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`). For traditional knowledge, the reviewer states the basis on which it may be held and used, which is the country's to set with its institutions.

## The ingredient dossier

**A dossier is an evaluation of one ingredient or candidate** (AAB-PLATFORM-07), over a frozen snapshot of its current version, the candidate it came from if any, and every CAP-04 record cited. It is written once, with its snapshot and receipt. An `INGREDIENT_CURATOR` or `INGREDIENT_REVIEWER` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-06 |
|---|---|
| `manifest.scope.scopeRule` | `cap-06-dossier-scope`, version `1` |
| `manifest.selection.mode` | `SCOPE_DERIVED`; quarantined `EXCLUDE`; policy `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | None |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed |
| `cutoffAt` | The platform's clock |

```typescript
interface Cap06IngredientDossier {
  evaluationId: string;
  capabilityId: "CAP-06";
  resultType: "INGREDIENT_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-06:ingredient-dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-06-dossier-rules-1"
  subject: { recordId: string; recordKind: "INGREDIENT" | "INGREDIENT_CANDIDATE"; recordVersion: number };
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  coverage: Array<{
    aspect: "IDENTITY" | "COMPOSITION" | "MECHANISM" | "EFFECT" | "SAFETY" | "HANDLING" | "AVAILABILITY" | "PRIOR_USE" | "REGULATORY_STATUS";
    citedBy: string[];
  }>;

  gaps: Array<{
    findingId: string;
    gapType:
      | "IDENTITY_NOT_EVIDENCED"
      | "COMPOSITION_NOT_EVIDENCED"
      | "MECHANISM_NOT_EVIDENCED"
      | "EFFECT_NOT_EVIDENCED"
      | "HANDLING_NOT_DECLARED"
      | "SAFETY_BASIS_NOT_DECLARED"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "REGULATORY_STATUS_NOT_DECLARED"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED"
      | "NOT_ADMISSIBLE_FOR_RESEARCH";
  }>;
  conflicts: Array<{ findingId: string; aspect: string; records: string[] }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    dossierIsNotAVerdict: true;
    noScoreOrRank: true;
    noSafetyAssessment: true;
    noRegulatoryAssessment: true;
    noFormulationCreated: true;
  };
}
```

**The rules** (`cap-06-dossier-rules-1`), a pure function of the snapshot, exactly reproducible except `evaluatedAt`:
- **Coverage** lists, per aspect, the CAP-04 records cited for it. Nothing is weighed.
- **Gaps:** every aspect among identity, composition, mechanism and effect with nothing cited; handling or a safety basis not declared; the regulatory status not declared; traditional knowledge linked; a material class not admissible for research. **Missing evidence is `EVIDENCE REQUIRED`,** never a likely or accepted result.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present** until CAP-10 has a contract and an assessment it defines can be cited.
- **Conflicts:** citations that support the same aspect with different declared findings, shown side by side, never resolved.
- **Disclosures, always:** `MACHINE_GENERATED`; `SAFETY_ECOLOGY_NOT_ASSESSED`; `REGULATORY_STATUS_DECLARED_NOT_VERIFIED`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`.
- **No score, readiness, rank, band, partner selection or recommendation.**

## Ingredient review, and what it permits

**An `INGREDIENT_REVIEWER` reviews a dossier** with a human decision of the kind `INGREDIENT_REVIEW` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `ACCEPT_FOR_FORMULATION_RESEARCH` | `AFFIRMATIVE` | The ingredient may be used as a component in CAP-07's research formulations. **For an `INGREDIENT` only**, never a candidate |
| `ACCEPT_AS_REFERENCE_MATERIAL` | `AFFIRMATIVE` | The ingredient may be used as a comparator or reference in trials, never as a formulation component. **The only acceptance a synthetic agrochemical can receive** |
| `CANDIDATE_WORTH_DEVELOPING` | `AFFIRMATIVE` | **For a candidate only:** it is worth characterising and developing into a registered ingredient |
| `NOT_ACCEPTED` | `NEGATIVE` | Not now, with reasons |
| `MORE_EVIDENCE_NEEDED` | `DEFERRED` | The reasoning names what is needed |

- **Independence:** never the dossier's requester, never the submitter of any member (AAB-PLATFORM-08, section 3). **CAP-06 adds:** never the curator who registered the ingredient or proposed the candidate, in any version.
- **The reasoning addresses every gap and conflict,** and, for acceptance, **the declared safety and handling basis** and `SAFETY_ECOLOGY_NOT_ASSESSED` by name.
- **Refused outright** (`DECISION_NOT_PERMITTED`): any acceptance of a material class that is prohibited, restricted, unsafe or unidentified; `ACCEPT_FOR_FORMULATION_RESEARCH` of a synthetic agrochemical; an acceptance with no declared safety basis.
- **What an acceptance permits, and what it does not.** `ACCEPT_FOR_FORMULATION_RESEARCH` is the only thing that lets CAP-07 use the ingredient as a component, and **CAP-07 relies on it only while it is `VALID` and `CURRENT`**, recording the currency it relied on. It is never an approval, and never a statement that the ingredient is safe, effective, permitted for use, or ready for sale.
- **Currency.** Every platform change kind is a trigger: a new citation, a cited record superseded or quarantined, a new version of the ingredient, a later dossier, the rules version changed. **Lapse:** 12 months.
- **Challenge:** an `INGREDIENT_REVIEWER` other than the decider, or the ingredient's curator. Resolved by a `CHALLENGE_RESOLUTION`, by an `INGREDIENT_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-06. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** While a challenge to an acceptance is open, CAP-07 may not rely on it, as AAB-PLATFORM-08 requires of reviews.
- **A rejected ingredient is never a dead end.** A new version, with new evidence, may be reviewed again.

## Referrals from CAP-01

CAP-01's contract leaves to CAP-06 how a referral is received and closed. **An `INGREDIENT_REVIEWER` receives each referral** with a human decision of the kind `REFERRAL_RECEIPT`:

| Outcome | Class | Result |
|---|---|---|
| `OPENED_AS_CANDIDATE` | `AFFIRMATIVE` | A curator may register an `INGREDIENT_CANDIDATE` naming the referral. The referral is closed |
| `DECLINED` | `NEGATIVE` | The referral is closed, with reasons, visible to CAP-01 |

- **A referral is closed by a receipt, and only by a receipt.** CAP-01's rule of one open referral per subject then lets a later referral of the same subject be made.
- **A referral resting on a review later invalidated** is shown as such. It may be declined, or opened only with the reviewer's reasoning acknowledging the invalidation.
- **A receipt carries forward** the referral's gaps and disclosures, `SAFETY_ECOLOGY_NOT_ASSESSED` among them. CAP-06 never reads a referral as a statement that the material is safe.
- **Receiving a referral creates no ingredient.** An ingredient is registered by a curator, and accepted only by a review.

## Brain governance

**CAP-06 cites `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md` as binding.**
- **No brain runs in CAP-06 in this version.** Candidates, registrations, dossier requests, reviews and receipts are all made by people.
- **A future brain may form candidate ingredients or hypotheses** (the record's section 5: "form candidate hypotheses", "suggest possible investigations"). When one is contracted, its outputs are labelled machine-generated, linked, versioned and supersedable, and **held for a person, as CAP-04 holds automated content.** It may never register an ingredient, accept one, or promote a candidate. CAP-06 is amended to say so when it happens.
- **The dossier is automated output,** and meets the record's section 5: labelled `MACHINE_GENERATED`, linked through its snapshot, versioned, reproducible, with its gaps and conflicts, superseded and never changed, and separate from any scientist's decision. **It is arithmetic, not reasoning.**

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-06 |
|---|---|
| Scope rules; selection policies | `cap-06-dossier-scope` v1; `ALL_ADMITTED` v1, `SCOPE_DERIVED`, quarantined `EXCLUDE` |
| Pinned inputs; integrity re-check; empty snapshot | None; not required, disclosed; never empty, since the subject is always a member |
| Evaluator and rules versioning; non-reproducible fields | `cap-06-dossier-rules-1`; `evaluatedAt` |
| Existing evaluations and decisions | **None.** The rehearsal's reviews and approvals are not mapped |
| Decision kinds, roles | `INGREDIENT_REVIEW`, `REFERRAL_RECEIPT`, `CAP06_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`, each by `INGREDIENT_REVIEWER` |
| Separation of duties beyond the platform's | Never the curator who registered the ingredient or proposed the candidate |
| Findings a review must address | Every gap and conflict; for acceptance, the safety and handling basis |
| More than one decider | Not required |
| Challenging role | `INGREDIENT_REVIEWER` other than the decider, or the curator |
| Triggers and lapse | All ten change kinds; 12 months |
| What relies on reviews | CAP-07's use of an ingredient, while an acceptance is `VALID` and `CURRENT`. A formulation built on an acceptance later invalidated is CAP-07's to handle |

## Authority

| Role | May |
|---|---|
| `INGREDIENT_CURATOR` | Register ingredients and candidates, and new versions; request dossiers |
| `INGREDIENT_REVIEWER` | Resolve held records; review dossiers; receive referrals; challenge and resolve challenges |
| `INGREDIENT_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP06_RECORD_ADMISSION` | A record is held or admitted |
| `CAP06_HELD_RESOLUTION` | A held record is resolved |
| `INGREDIENT_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `INGREDIENT_REVIEW` | A dossier is reviewed |
| `REFERRAL_RECEIPT` | A CAP-01 referral is received |
| `CAP06_DECISION_CHALLENGE`, `CAP06_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-06"`.

| Operation | Route |
|---|---|
| `submitRecord`, `getRecord`, `listRecords` | `POST /agr/v1/ingredients`; `GET /agr/v1/ingredients/:recordId`, with its state derived; `GET /agr/v1/ingredients?kind=&…` |
| `resolveHeldRecord` | `POST /agr/v1/ingredients/:recordId/held-resolutions` |
| `requestDossier`, `getDossier` | `POST /agr/v1/ingredient-dossiers`; `GET …/:evaluationId` |
| `reviewDossier` | `POST /agr/v1/ingredient-dossiers/:evaluationId/reviews` |
| `receiveReferral` | `POST /agr/v1/ingredient-referral-receipts`, naming the CAP-01 referral |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/ingredients/challenges`; `…/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`. **An ingredient's state is derived when read:** registered, held or rejected; superseded; and whether it holds a valid, current acceptance for formulation research or as reference material.

## Failure contract

```typescript
interface Cap06Failure {
  ok: false;
  capabilityId: "CAP-06";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "REFERRAL_NOT_RECEIVED"
    | "REFERRAL_ALREADY_RECEIVED"
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
| `REFERRAL_NOT_RECEIVED` | 422 | A candidate names a referral with no `OPENED_AS_CANDIDATE` receipt |
| `REFERRAL_ALREADY_RECEIVED` | 409 | A second receipt for the same referral |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or of another kind |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, disclosure or the safety basis is not addressed |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | An acceptance the material class or subject does not allow, or with no declared safety basis |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-06 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every citation is an admitted CAP-04 record, read for the purpose `INGREDIENT_INTELLIGENCE` | `designed`; built first |
| CAP-01 Country Intelligence & Discovery | **Sends referrals,** which CAP-06 receives | `designed` |
| CAP-07 Formulation Intelligence | **Relies on acceptances** to use an ingredient in a formulation | `named only` |
| CAP-08 Controlled Trials & Outcomes | **Tests ingredients** as material under trial, citing a CAP-06 record | `designed` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety and ecology.** Until it exists, acceptance rests on a declared basis, disclosed | `named only` |
| CAP-11 Regulatory Translation | **Owns regulatory status,** which CAP-06 records as declared | `named only`, post-launch |
| CAP-05 Governed Scientific Reasoning | **Optional:** a scientist may ask CAP-05 what the evidence on an ingredient says | `designed` |

## Open gaps

**Contract gap: CAP-10.** Acceptance for formulation research rests on a declared safety and handling basis that AAB does not assess, disclosed on every dossier and acceptance.

**Contract gap: regulatory status.** Whether an ingredient may be used or sold is each country's, and CAP-11's to govern when it has a contract. CAP-06 records it as declared.

**Contract gap: a shared reference set.** Many ingredients are known everywhere. A reference set shared across countries would save each country registering them again, but needs explicit authorisation under the canonical template rule, and a governed source. Not defined.

**Contract gap: traditional knowledge and benefit-sharing.** Ingredients linked to traditional knowledge are held. The basis for holding and using them, their holders' consent, and the sharing of benefits from any ingredient developed from them are the country's to set with its institutions.

**Contract gap: automated candidate generation.** No brain proposes ingredients in this version. When one does, its outputs are held for a person ("Brain governance").

**Contract gap: ownership and IP.** Who holds rights in an ingredient developed from a country's resources is declared, not governed here.

**Platform gap: an invalidated admission,** as in CAP-01, CAP-04, CAP-05 and CAP-08.

**Current system limit: no implementation.** Nothing of CAP-06 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any ingredient is safe, effective, permitted, or fit for any use.
- It does not authorise anyone to present an acceptance for research as an approval.
- It does not define CAP-07, CAP-10 or CAP-11, or what CAP-04 admits.
- It does not make CAP-06 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-06: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
