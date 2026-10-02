# CAP-01 Country Intelligence & Discovery — Canonical Contract — 2026-09-29

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-01 Country Intelligence & Discovery. It is not SCS-CAP-01 (Regulatory Framework Registration), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-01: HOW A COUNTRY'S AGRICULTURAL PROBLEMS, RESOURCES, WASTE STREAMS AND OVERLOOKED OPPORTUNITIES ARE RECORDED, EVIDENCED, ASSEMBLED INTO A DISCOVERY DOSSIER, REVIEWED BY A SCIENTIST AND REFERRED FOR INVESTIGATION, AND ITS BOUNDARIES WITH CAP-02, CAP-04, CAP-06, CAP-10 AND THE REHEARSAL'S COGNITIVE LOOP. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-29, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-01 had no design contract before this one.
**Amended:** 2026-10-02 (hazard screens, and the safety label, under CAP-10), with CAP-10's canonical contract; and 2026-10-02, second (integrity, lineage and the AGR vocabulary, under CAP-03), with CAP-03's canonical contract.

## Amendment of 2026-10-02: hazard screens, and the safety label, under CAP-10

**Why.** This contract disclosed safety and ecology as not assessed "until CAP-10 has a contract and an assessment it defines can be cited" (decision 8; "The discovery dossier"). CAP-10 now has a contract (`governance/workstream-b/CAP-10-SAFETY-AND-ECOLOGICAL-INTELLIGENCE-CANONICAL-CONTRACT-2026-10-02.md`), with a limited assessment type, the **hazard screen,** for raw material handled during discovery. Approved by the Platform Owner in review on 2026-10-02. **Decision 8 stands: CAP-01 has no safety gate.** Nothing else in this contract changes.

**1. Hazard screens of CAP-01 records.** A `COUNTRY_RESOURCE` or `WASTE_STREAM` version may be the subject of a CAP-10 `INVESTIGATION_MATERIAL_HAZARD_SCREEN`, requested in CAP-10 by a person holding `SAFETY_REQUESTER` there. **A screen determines only whether authorised sampling, collection, transport or laboratory handling of the material may proceed, and under what precautions.** It never assesses the resource as an ingredient, never affects a discovery review, and never blocks a referral.

**2. What CAP-01 shows.** The dossier rules become `cap-01-dossier-rules-2`: the rules of version 1, with these changes:
- **For every resource and waste stream in a dossier,** the current hazard screen is shown with CAP-10's display block, or, where there is none, **`HAZARD_SCREEN_NOT_PERFORMED`,** a disclosure. A discovery review acknowledges it, as every disclosure.
- **Where a CAP-10 hold or `HANDLING_SUSPENDED` direction concerns handling under a screen,** it is shown on the record, in `SUMMARY`.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present,** on every dossier and every referral. **A hazard screen never replaces it.** The words "until CAP-10 has a contract and an assessment it defines can be cited" no longer apply: a CAP-01 subject is never assessed as an ingredient, so the label is permanent in CAP-01.

**3. Reporting.** A person holding a CAP-01 role may report a safety signal in CAP-10 concerning handling under a screen (CAP-10, "Safety signals").

**4. What this amendment replaces.**
- **Decision 8** now reads: safety and ecology are CAP-10's, never CAP-01's; CAP-01 has no safety gate; every dossier and referral discloses `SAFETY_ECOLOGY_NOT_ASSESSED`, always; CAP-10 may screen a resource or waste stream for handling, and the screen is shown, never gating.
- **The contract gap "CAP-10"** is closed. Safety and ecology are assessed in CAP-10 only once the material is a CAP-06 subject; until then, only its handling may be screened.
- **The dependencies row for CAP-10** now reads: **optional: hazard screens of resources and waste streams, shown; `designed`.**

## Amendment of 2026-10-02 (second): integrity, lineage and the AGR vocabulary, under CAP-03

**Why.** CAP-03 now has a contract (`governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`). It provides the integrity re-check and lineage AGR's evaluations lacked, and the AGR provenance vocabulary, which every AGR capability adopts before implementation (CAP-03, decision 16). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Integrity re-check and lineage.** A `DISCOVERY_DOSSIER_EVALUATION` may request a CAP-03 verification run over its snapshot's members. The dossier rules become `cap-01-dossier-rules-3`: version 2, with this change. **Where a cited run covers every member, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`; otherwise the disclosure stays. **A lineage evaluation** may be requested for any of its discovery dossiers, discovery reviews and referrals. **No finding is ever shown as "verified" in general,** and none says the evidence is true, sufficient or authentic in the world.

**2. The vocabulary.** CAP-01 adopts `cap-03-vocabulary-1`: its citations of admitted evidence map to `SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, as their roles say (CAP-03, "Mappings from existing terms"). **No record is renamed.** A term of CAP-01's own, added later, is registered here and mapped to the vocabulary, or refused (`VOCABULARY_TERM_UNMAPPED`).

**3. How its outputs reference CAP-03.** Each of its discovery dossiers, discovery reviews and referrals may carry `integrity?: { verificationRunIds: string[]; lineageEvaluationId?: string }`, set by the system when a run or evaluation is cited, and shown with the findings by kind and whether they are current.

**4. Failures stay visible.** CAP-03's findings are currency triggers for CAP-01's decisions (CAP-03, "Integrity findings and their consequences"). **A referral whose dossier relied on a record `INTEGRITY_COMPROMISED`** is shown as such to CAP-06, which may not open a candidate from it until a new dossier is reviewed; one relying on a record `UNDETERMINED` waits. **Historical decisions are never rewritten;** their current reliance changes, derived when read. **Missing or failed mandatory verification is always shown,** never hidden or treated as a pass.

**5. Before implementation.** CAP-01's step 4 (code) uses the vocabulary and CAP-03's verification as adopted here.

**6. What this amendment replaces.** The dependencies gain a row: **CAP-03 Evidence Integrity & Provenance: integrity re-check, lineage, the AGR vocabulary and integrity incidents; `designed`, launch release.**

## Why this contract, and what it adopts

**Why.** CAP-01 is third in the workstream's order (roadmap, decision 22). The identity decisions of 2026-09-29 gave it the rehearsal's resource intelligence (13 gateway actions) and two cognitive actions, `submit_problem_signal` and `create_transformation_opportunity` (`governance/workstream-b/AGR-CAPABILITY-IDENTITY-DECISIONS-2026-09-29.md`, sections 2 and 3, and its note of 2026-09-29). The evidence is the step 0 snapshots, `agr-rehearsal/snapshot-2026-09-28/` and `agr-rehearsal/snapshot-2026-09-28-supplementary/`, **with `agriculture`, `country_core` and `cognitive_core` read in full for this contract** ("What the rehearsal does").

**Its description** (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, line 195): CAP-01 "investigates a country's agricultural problems, resources, waste streams and overlooked opportunities".

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference):** every actor is an ActorReference version 2, with server-resolved, scoped authority.
- **AAB-PLATFORM-05 (governed provenance):** every CAP-01 record carries the platform's `Provenance`.
- **AAB-PLATFORM-06 (admission decisions):** every CAP-01 record is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a discovery dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** discovery reviews, held resolutions and challenges are human decisions.
- **AAB-PLATFORM-09 (public-key registry):** those decisions are signed, and verified as at their acceptance.
- **AAB-PLATFORM-01 (evidence object store):** CAP-01 stores no originals of its own. Evidence is CAP-04's, under the AGR storage profile.
- **CAP-04 as amended:** CAP-01 cites admitted CAP-04 records as its evidence, and reads them for a declared purpose.

AAB-PLATFORM-04 (actor–subject links) is **not adopted**: nothing in CAP-01 is submitted on behalf of another party ("Open gaps").

**Decisions recorded on 2026-09-29** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-01`,** domain `AGR`; routes under `/agr/v1/`; database schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-01:`. Receipts are accepted already (migration 025).
2. **CAP-01 records; CAP-04 evidences.** CAP-01 registers problems, resources, waste streams, burdens, recovery pathways and opportunities as declarations. **What they rest on is admitted CAP-04 evidence, cited by reference.** A CAP-01 record never asserts its own evidence strength, mechanism status or knowledge-gap level, as the rehearsal did.
3. **Every CAP-01 record is admitted under AAB-PLATFORM-06:** refused, held or admitted, with limitations disclosed. **Traditional knowledge and personal information are always held** for a reviewer, as in CAP-04.
4. **Records are written once.** A change is a new version superseding the old. Nothing is overwritten, and nothing is deleted.
5. **No computed discovery score, priority or band in this version.** The rehearsal's scores were fixed lookups over self-asserted values, some with inverted meaning ("What the rehearsal does"). **A discovery dossier shows what is recorded, what evidences it and what is missing. A scientist decides.**
6. **A discovery dossier is an evaluation** (AAB-PLATFORM-07): a frozen snapshot of one resource or opportunity with everything linked to it, and deterministic gap findings.
7. **A scientist reviews a dossier** (`DISCOVERY_REVIEW`, AAB-PLATFORM-08). Only a valid, current review that refers the subject for investigation permits a **referral**, to CAP-06.
8. **Safety and ecology are CAP-10's, never CAP-01's.** CAP-01 has no safety gate. Until CAP-10 has a contract, every dossier discloses that safety and ecology are not assessed, and every referral carries it. This replaces the rehearsal's gate, which could never pass ("What the rehearsal does").
9. **People only.** Every CAP-01 record is made by a `HUMAN`, in their own name. **No automated problem signals, opportunities or referrals in this version.** A caller can never declare an origin of `AAB_DETECTION`.
10. **Roles:** `PROBLEM_REPORTER`, `COUNTRY_INTELLIGENCE_CONTRIBUTOR`, `DISCOVERY_REVIEWER` and `COUNTRY_INTELLIGENCE_READER`, each a scoped grant (AAB-PLATFORM-03).
11. **Of the rehearsal's 34 country actions, eight are not platform-wide, and none is brought across.** Six are CAP-01's: the bootstrap scan, its events, the country brief, the fixed recommendations, the economic context and the scan knowledge, replaced by CAP-01's records and dossiers. One, the source status, is CAP-02's. One, the starter ingredient library, is CAP-06's ("What the rehearsal does"; the identity record's note of 2026-09-29).
12. **Country data stays in the country.** CAP-01 records are country scientific information in the egress specification's category 2. They are never read across a country boundary, and never returned to canonical AAB.

**Prerequisites before any code:** CAP-04 built first, since every piece of CAP-01 evidence is a CAP-04 record; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People in a country record the problems they see, the resources and waste streams they have, and the opportunities they think may exist. AAB keeps each record honest about what evidences it, assembles what is known about a resource into a dossier that shows the gaps, and a scientist decides whether it is worth investigating. AAB never decides that for them.**

CAP-01 is a governed register and a discovery workbench, not an oracle. It does not score, rank or recommend. It does not assess safety or ecology. It does not create ingredients, formulations or trials. It hands a scientist's referral to the capability that investigates.

## What CAP-01 answers, and what it does not

| Question | Answered by |
|---|---|
| What agricultural problems have people in this country reported? | **CAP-01** |
| What resources and waste streams does the country have, where, and what evidences them? | **CAP-01**, citing CAP-04 |
| What is known and missing about this resource, as of now? | **CAP-01**, a discovery dossier |
| Should this resource be investigated as a possible ingredient? | **A scientist,** by a discovery review in CAP-01 |
| Is the evidence admitted, and is it what it says it is? | CAP-04 |
| What does the admitted evidence say about a scientific question? | CAP-05 |
| Is this material safe, and what is its ecological effect? | CAP-10, which has no contract yet |
| Can this material become an ingredient? | CAP-06, after a referral |
| How is data brought in from external sources? | CAP-02 |
| Who is in the country, and what are its national objectives? | The country's tenancy and participation capabilities (CAP-16, CAP-24), which have no contracts yet |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** the gateway group `AAB_RESOURCE_INTELLIGENCE_ACTIONS` and every function behind it in `agriculture`; `country_core` (72 tables, 41 functions, the 34 country actions); and `cognitive_core` (18 tables, 25 functions). Citations are to the snapshots: `api.php` is `snapshot-2026-09-28/source-a/aab-local/app/_rebuild/api.php`.

### Resource intelligence (13 actions, `agriculture` schema)

**What it is.** Registration of country resource candidates, waste streams, recovery pathways and environmental burden; a "discovery run" that scores a resource; a safety and ecology gate; a scientist review; and a bridge that creates a discovery candidate.

**What it does, as read:**
- **Resources carry self-asserted evidence.** A resource is created with its own `evidence_status`, `mechanism_status`, `knowledge_gap_status`, `observation_status` and `discovery_potential`, each chosen by the caller (`agriculture/functions.sql`, lines 865–878).
- **"Discovery" is fixed arithmetic over those assertions.** `api_run_full_resource_discovery` maps each asserted value to a constant, and sums them with fixed weights (lines 2588–2620). There is no AI and no external call. **Some scores are inverted:** the "environmental benefit" score rises with pollution burden, and ecological concern falls when a burden profile exists at all, whatever it says (lines 2609–2612).
- **The safety gate can never pass.** Discovery always calls the gate with toxicity and ecology `UNASSESSED` (line 2582), which forces review (line 460). No gateway action re-assesses it. So a review can never approve, and the bridge can never run.
- **Nothing consumes the bridge.** Its discovery-candidate reads are retired (HTTP 410), and the downstream promotion function cannot succeed: it requires a packet status that does not exist.
- **Values are overwritten in place:** domain relevance, environmental burden (which also wipes its evidence link), discovery priority, and review completion. Brain contributions are deleted and rewritten on each run.
- **No independence:** a reviewer may review their own submission, and approve their own gate.
- **The caller chooses the country,** and country membership is not enforced (`api.php`, lines 1560–1562). A null country passes every country-scoped check (`agriculture/functions.sql`, lines 86–90). Every list returns every country.
- **No audit and no receipts** on any resource table.

### Problems and opportunities (2 actions, `cognitive_core` schema)

- **`submit_problem_signal`** records a problem statement with a declared origin. **The caller may declare the origin `AAB_DETECTION`**, which the cognitive loop also uses for its own signals (`api.php`, line 1330; `cognitive_core/tables.sql`, line 400). Loop-made and human-made signals cannot be told apart.
- **`create_transformation_opportunity`** turns a problem into an opportunity, with no capability or country check, and **stamps it `AAB_DETECTION` even when a person creates it** (`cognitive_core/functions.sql`, line 122). It computes an "expected information gain" from a fixed formula (line 120).
- **Most lifecycle states are unreachable:** a problem is only ever `OPEN` or `TRANSFORMED`, an opportunity only `CANDIDATE`, and nothing verifies a problem.
- **No link to national objectives** is ever written, although the tables for it exist.

### Country intelligence in `country_core` (8 of the 34 country actions: six CAP-01's, one CAP-02's, one CAP-06's)

- **The country bootstrap is narration.** `api_start_country_bootstrap` inserts eleven fixed "brain" events with fixed sentences, three fixed knowledge gaps and one finding per starter ingredient (`country_core/functions.sql`, lines 1052–1089). No brain runs.
- **Economic facts are typed into code.** For Thailand only, five facts are inserted with the status `VERIFIED_SOURCE` as a literal (lines 958–971). Every other country gets none.
- **The country brief is a template** created directly as `READY`, and every call adds the same fixed recommendation, a prefilled formulation request (lines 609–636).
- **The only function that ingests external findings has no authority check,** and can create resource records as a system actor (lines 639–667). Nothing calls it.
- **A full discovery data model exists with no code behind it:** source registry and adapters, evidence snapshots, evidence atoms, synthesis results, spatial acquisition. No function in the snapshots reads or writes it; its writers were outside the snapshots.
- **Cross-tenant reads:** scan events, recommendations and impact are read for any caller-supplied country workspace, with no membership check (`api.php`, lines 297–301).

### How this contract accounts for it

| Rehearsal | This contract |
|---|---|
| Resource with self-asserted evidence, mechanism and gap statuses | **A resource registration** that declares what the resource is, and **cites CAP-04 records** for what evidences it. Gaps are derived in the dossier, never asserted |
| Waste stream, recovery pathway | **Registrations,** citing evidence. A pathway is always advisory, and states no feasibility verdict |
| Environmental burden, overwritten in place | **A burden assessment,** written once; a later one supersedes it |
| Domain relevance, overwritten in place | **Declared on the resource registration,** changed by a new version |
| Discovery run, scores, bands, brain contributions | **Not carried across.** Replaced by the discovery dossier, which has gap findings and no scores |
| Safety and ecology gate | **Not carried across.** Safety and ecology are CAP-10's (decision 8) |
| Scientist review with no independence | **`DISCOVERY_REVIEW`,** under AAB-PLATFORM-08's independence rules |
| Bridge to a discovery candidate | **A referral to CAP-06,** permitted only by a valid, current review |
| Problem signal, with a spoofable origin | **A problem report,** made by a person; the origin is declared, and `AAB_DETECTION` is not a value |
| Transformation opportunity stamped `AAB_DETECTION` | **An opportunity,** proposed by a person, citing the problem and any resources |
| Country bootstrap, brief, recommendation, economic facts | **Not carried across** (decision 11). A published statistic is CAP-04 evidence, cited by CAP-01 |
| Source registry, adapters, snapshots, atoms, synthesis | **CAP-02's,** when it is contracted. Not CAP-01's |
| Starter ingredient library, ingredient availability | **CAP-06's** |
| Spatial investigation | **Not carried across.** An open gap |

**Not carried across, in any form:** caller-chosen country; country checks that pass on a null country; cross-tenant reads; self-asserted evidence strength; scores and bands; the gate that cannot pass; overwrites; deletes; the missing audit; reviewers reviewing themselves; `AAB_DETECTION` from a caller; fixed narration presented as scanning; literal `VERIFIED` statuses; ingestion without authority.

**The rehearsal's data is not CAP-01's.** Nothing of CAP-01 is stored anywhere, and CAP-01's records start empty in a new deployment. Whether any rehearsal record is brought across is a separate governed decision ("Open gaps").

**The CAP-34 simulation is not a model for this contract.** Its CAP-01 logic (`simulation/cap34/live-capabilities/cap01-discovery.js`) classifies evidence by keywords in its text and ends in a verdict-like outcome: `PROGRESSION_BLOCKED_EVIDENCE_REQUIRED`, `CONTRADICTION_REQUIRES_REVIEW` or `INVESTIGATION_CANDIDATE`. Its fidelity manifest already says keyword matching "does not constitute genuine scientific … judgment". Its behavioural proof (`governance/workstream-b/CAP-01-DISCOVERY-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`) proves the simulation, and nothing about this contract.

**An earlier record defined CAP-01 differently.** The gateway reconciliation of 2026-09-20 (`governance/AAB-CAPABILITY-GATEWAY-RECONCILIATION-2026-09-20.md`, line 50) described CAP-01 as classifying evidence sufficiency and reaching an investigation-candidate outcome, following the simulation. It was written before the rehearsal's source was read. **This contract does not adopt it:** evidence sufficiency is not CAP-01's to classify.

## The records

Every CAP-01 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant, never from the request.

```typescript
interface Cap01RecordEnvelope {
  // Identity: set by the system
  recordId: string;                      // uuid
  recordVersion: number;                 // 1 for a new record; a new version supersedes the previous one
  recordKind:
    | "PROBLEM_REPORT"
    | "COUNTRY_RESOURCE"
    | "WASTE_STREAM"
    | "BURDEN_ASSESSMENT"
    | "RECOVERY_PATHWAY"
    | "OPPORTUNITY";
  schemaVersion: string;                 // "urn:aab:schema:agr:cap-01:<kind>:1"
  countryWorkspaceId: string;            // from the actor's grant, never the request

  // Where it came from: AAB-PLATFORM-05
  provenance: Provenance;

  // What evidences it: declared citations of admitted CAP-04 records
  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    supports:
      | "EXISTENCE"
      | "LOCATION"
      | "QUANTITY"
      | "COMPOSITION"
      | "BURDEN"
      | "MECHANISM"
      | "PRIOR_USE"
      | "OTHER";
    note?: string;                       // as declared
  }>;

  // Links to other CAP-01 records: declared, resolved at admission
  links: Array<{
    relation: "CONCERNS_RESOURCE" | "CONCERNS_WASTE_STREAM" | "ADDRESSES_PROBLEM" | "ASSESSES_WASTE_STREAM" | "RECOVERS_FROM";
    recordId: string;
  }>;

  // National objectives it bears on: declared references, read from the country's register
  objectiveCodes: string[];

  // Classification: declared, always complete
  classification: {
    sharingClassification: string;
    permittedUses: string[];             // never empty
    traditionalKnowledgeLinked: boolean;
    personalInformationPresent: boolean;
  };

  // Correction: set by the system from the request
  supersedes?: {
    recordId: string;
    recordVersion: number;
    recordDigest: string;
    reason: "CORRECTION" | "UPDATE" | "WITHDRAWAL";
    explanation: string;
  };

  recordDigest: string;                  // "sha256:" over every field, in canonical JSON
}
```

**Each kind's content, declared:**

| Kind | Content | Required links |
|---|---|---|
| `PROBLEM_REPORT` | `problemStatement`; `problemType` (`CROP_LOSS`, `SOIL_DEGRADATION`, `WATER`, `PEST_OR_DISEASE`, `INPUT_COST_OR_ACCESS`, `WASTE_OR_POLLUTION`, `CLIMATE_STRESS`, `MARKET`, `OTHER`); `location`; `firstObservedAt`; `reportedBy` (a person or community named as the source; declared data, not an actor); `localContext` | None |
| `COUNTRY_RESOURCE` | `resourceName`; `resourceClass`; `resourceOrigin`; `location`; `domainRelevance` (declared domain codes, each with a note); `traditionalKnowledgeSummary` when linked | None |
| `WASTE_STREAM` | `streamName`; `sourceActivity`; `location`; `estimatedQuantity` with `unit` and `period`; current disposal (`burning`, `dumping`, `landfill`, `other`), each true or false; `contaminationConcern` as declared | `CONCERNS_RESOURCE`, when the stream is a form of a registered resource |
| `BURDEN_ASSESSMENT` | For air, water, soil, burning, landfill and dumping: `NOT_ASSESSED`, `LOW`, `MODERATE`, `HIGH` or `SEVERE`, each as declared, with a method note | `ASSESSES_WASTE_STREAM` |
| `RECOVERY_PATHWAY` | `pathwayType`; `description`; `inputs`; `knownPriorUse` | `RECOVERS_FROM` a waste stream or resource |
| `OPPORTUNITY` | `opportunitySummary`; `opportunityType`; `scientificHypothesis`; `whatWouldNeedToBeTrue` | `ADDRESSES_PROBLEM`; and `CONCERNS_RESOURCE` or `CONCERNS_WASTE_STREAM` where there is one |

**Field rules:**
- **The system sets** the identity fields, `countryWorkspaceId`, the provenance fields the platform sets, and `recordDigest`. A request that supplies any of them is refused.
- **Every declared string is recorded as given:** no normalisation, correction or inference.
- **No record states its own evidence strength, mechanism status, knowledge-gap level, discovery potential, feasibility, recoverability or scientific status.** These are what the rehearsal let callers assert. What evidences a record is its citations; what is missing is derived in a dossier.
- **Quantities are declarations.** An estimated quantity without a cited `QUANTITY` evidence record is disclosed as uncited in every dossier.
- **Persons and communities named in a report are declared data,** not actors. Naming them asserts nothing about them.
- **A withdrawal** is a supersession whose reason is `WITHDRAWAL`.

## Admission

CAP-01 adopts AAB-PLATFORM-06. The rules below are **rules version `cap-01-admission-1`.** A change to them is a new version.

**Outcomes:** refused (nothing written), `HELD_FOR_REVIEW`, `ADMITTED` or `ADMITTED_WITH_LIMITATIONS`, as in CAP-04. There is no `REJECTED` at submission; a reviewer rejects a held record.

**The checks,** in order:

| # | Check | Results | On failure |
|---:|---|---|---|
| 1 | `SUBMITTER_AUTHORITY`: `PROBLEM_REPORTER` for a problem report; `COUNTRY_INTELLIGENCE_CONTRIBUTOR` for every kind | `PASSED` | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the kind's required fields and links are present, and no system-set field was supplied | `PASSED` | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | `PASSED` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `LINKS_RESOLVED`: every link resolves to an admitted, current CAP-01 record of the right kind in the same workspace | `PASSED`, or `NOT_EVALUATED` when there are none | **Refuses:** `LINK_NOT_RESOLVED` |
| 5 | `SUPERSESSION_VALID`: the superseded record exists in the workspace, is current, and is of the same kind | `PASSED`, or `NOT_EVALUATED` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 6 | `SOURCE_IDENTIFIED` | `PASSED` or `NOT_PASSED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 7 | `EVIDENCE_CITED`: at least one evidence citation, except for a problem report | `PASSED`, `NOT_PASSED`, or `NOT_EVALUATED` for a problem report | **Limitation:** `NO_EVIDENCE_CITED` |
| 8 | `EVIDENCE_RESOLVED`: every cited CAP-04 record is admitted, current and readable for the purpose `COUNTRY_INTELLIGENCE` | `PASSED`, `NOT_PASSED`, or `NOT_EVALUATED` | **Limitation:** `EVIDENCE_UNRESOLVED`, naming each, without revealing a record the submitter may not see |
| 9 | `OBJECTIVES_RESOLVED`: every objective code is in the country's register | `PASSED`, `NOT_PASSED`, or `NOT_EVALUATED` | **Limitation:** `OBJECTIVE_UNRESOLVED` |
| 10 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information is declared | `PASSED` or `NOT_PASSED` | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |

- **Held records are decided by a `DISCOVERY_REVIEWER`** (`CAP01_HELD_RESOLUTION`: `ADMIT`, `REJECT` or `REQUIRE_INFORMATION`), never the submitter, addressing every reason held.
- **A problem report is admitted without evidence.** A person's report of a problem is worth recording as it is: it is disclosed as `PROBLEM_UNCORROBORATED` in every dossier that includes it, not refused.
- **How a holding check is recorded** is AAB-PLATFORM-06's, as amended on 2026-09-29.

## The discovery dossier

**A dossier is an evaluation of one subject,** a country resource or an opportunity, over a frozen snapshot of everything linked to it (AAB-PLATFORM-07). It is written once, with its snapshot and receipt, in one transaction.

| AAB-PLATFORM-07 field | CAP-01 |
|---|---|
| `manifest.scope.scopeRule` | `cap-01-dossier-scope`, version `1`: the subject's current version; every admitted, current CAP-01 record linked to it, directly or through one other record; and every CAP-04 record any of them cites |
| `manifest.scope.subjectKey` | Derived from the subject's `recordId` |
| `manifest.selection.mode` | `SCOPE_DERIVED` |
| `manifest.selection.quarantined` | `EXCLUDE` |
| `manifest.selection.policy` | `ALL_ADMITTED`, version `1`: every admitted record, limitations included and disclosed |
| `pinnedInputs[]` | `NATIONAL_OBJECTIVES`: the country register's version, when the subject names objectives |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed |
| `cutoffAt` | The platform's clock. No historical dossiers |

```typescript
interface Cap01DiscoveryDossier {
  evaluationId: string;                  // content-derived
  capabilityId: "CAP-01";
  resultType: "DISCOVERY_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-01:discovery-dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-01-dossier-rules-1"
  subject: { recordId: string; recordKind: "COUNTRY_RESOURCE" | "OPPORTUNITY" };
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  members: Array<{
    source: "CAP-01" | "CAP-04";
    recordId: string;
    recordVersion: number;
    recordKind: string;
    admissionOutcome: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";
    limitationCodes: string[];
  }>;

  // What is recorded, and what evidences each aspect
  coverage: Array<{
    aspect: "EXISTENCE" | "LOCATION" | "QUANTITY" | "COMPOSITION" | "BURDEN" | "MECHANISM" | "PRIOR_USE";
    citedBy: string[];                   // CAP-04 memoryRecordIds cited for this aspect
  }>;

  // Findings, each with an identifier derived from its content
  gaps: Array<{
    findingId: string;
    gapType:
      | "COMPOSITION_NOT_EVIDENCED"
      | "QUANTITY_NOT_EVIDENCED"
      | "LOCATION_NOT_EVIDENCED"
      | "BURDEN_NOT_ASSESSED"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "PROBLEM_UNCORROBORATED"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED";
    recordId?: string;                   // the member the gap concerns
  }>;
  conflicts: Array<{
    findingId: string;
    aspect: string;
    records: string[];                   // members that declare different values for the same aspect
  }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    dossierIsNotAVerdict: true;
    noScoreOrRank: true;
    noSafetyAssessment: true;
    noIngredientCreated: true;
    noRecommendation: true;
  };
}
```

**The rules** (`cap-01-dossier-rules-1`). The dossier is a pure function of its snapshot and these rules, exactly reproducible except `evaluatedAt`.
- **Coverage** lists, for each aspect, the CAP-04 records members cite for it. Nothing is weighed.
- **Gaps:** an aspect the subject needs with nothing cited; for a resource, `COMPOSITION`, `QUANTITY` and `LOCATION`. `BURDEN_NOT_ASSESSED` for a linked waste stream with no current burden assessment, or one declaring `NOT_ASSESSED`. `PROBLEM_UNCORROBORATED` for each linked problem report with no evidence. `TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED` for each member linked to traditional knowledge.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present** until CAP-10 has a contract and an assessment it defines can be cited (decision 8).
- **Conflicts:** members that declare different values for the same aspect, such as two quantities for one stream, are shown side by side. **Never resolved, averaged or chosen between.**
- **No score, rank, band, priority or recommendation.** Nothing is weighted by source, institution or date.
- **Disclosures,** where they apply: every member's limitations; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`; `QUANTITIES_DECLARED`; `SAFETY_ECOLOGY_NOT_ASSESSED`.

**Requesting a dossier:** a `COUNTRY_INTELLIGENCE_CONTRIBUTOR` or `DISCOVERY_REVIEWER`, `HUMAN`. **No dossier is produced automatically.**

## Discovery review, and referral

**A `DISCOVERY_REVIEWER` reviews a dossier** with a human decision of the kind `DISCOVERY_REVIEW` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `REFER_FOR_INVESTIGATION` | `AFFIRMATIVE` | The reviewer judges the subject worth investigating, naming the investigation (in this version, as a possible ingredient, by CAP-06) |
| `NOT_REFERRED` | `NEGATIVE` | The reviewer judges it not worth investigating now, with reasons |
| `MORE_EVIDENCE_NEEDED` | `DEFERRED` | The reasoning says what evidence is needed |

- **A review is a judgement of whether to investigate,** never of safety, efficacy or truth.
- **Independence:** never the dossier's requester, never the submitter of any member, never a party to a challenge (AAB-PLATFORM-08, section 3). **CAP-01 adds:** never the submitter of the subject's earliest version.
- **The reasoning addresses every gap and conflict** by its identifier, and acknowledges every disclosure, `SAFETY_ECOLOGY_NOT_ASSESSED` included.
- **One decider per review.** Several reviews are several decisions; none removes another's dissent.
- **Currency. Every platform change kind is a trigger:** a new record linked to the subject (`NEW_CANDIDATE`); a member superseded or withdrawn; a cited CAP-04 record quarantined, or released; an exclusion resolved; a pinned input, the scope rule or the policy changed; a later dossier of the same subject; the rules version changed. A dossier is small and its subject changes as the country's knowledge does, so any change makes a review potentially stale. **Lapse:** 12 months.
- **Challenge:** a `DISCOVERY_REVIEWER` other than the decider, or the subject's submitter. Resolved by a `CHALLENGE_RESOLUTION` decision, by a `DISCOVERY_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-01. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.**

**A referral** is a record written once, by a `DISCOVERY_REVIEWER`, naming a `REFER_FOR_INVESTIGATION` review:
- **It is permitted only while that review is `VALID` and `CURRENT`,** derived in the same consistent read as the write, which records the currency relied on (AAB-PLATFORM-08, section 11).
- **It names its target:** in this version, `CAP-06`, for investigation as a possible ingredient. It carries the dossier's gaps and disclosures, `SAFETY_ECOLOGY_NOT_ASSESSED` among them.
- **A referral creates nothing in CAP-06.** What CAP-06 does with one is CAP-06's contract to define. CAP-01 never creates an ingredient, a candidate ingredient, a formulation or a trial.
- **One open referral per subject and target.** A second waits until the first is closed by CAP-06.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-01 |
|---|---|
| Scope rules | `cap-01-dossier-scope`, version `1` |
| Selection policies | `ALL_ADMITTED`, version `1`; mode `SCOPE_DERIVED`; quarantined records always `EXCLUDE` |
| Pinned inputs | `NATIONAL_OBJECTIVES` |
| Integrity re-check; empty snapshot | Not required, disclosed. A dossier always has its subject as a member, so it is never empty |
| Evaluator and rules versioning | `evaluatorVersion` names the code; `rulesVersion` is `cap-01-dossier-rules-1`. The rules are code, so no `rulesDigest` |
| Non-reproducible fields | `evaluatedAt`. `evaluationId` is derived from the snapshot's digest and the evaluator and rules versions; finding identifiers from their content |
| Refusal codes | "Failure contract" |
| Existing evaluations and decisions | **None.** The rehearsal's discovery runs and reviews are not CAP-01 evaluations or decisions, and are not mapped ("What the rehearsal does") |
| Decision kinds and roles | `CAP01_HELD_RESOLUTION`, `DISCOVERY_REVIEW` and `CHALLENGE_RESOLUTION`, each by `DISCOVERY_REVIEWER` through a scoped grant |
| Outcomes | `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`; `REFER_FOR_INVESTIGATION`, `NOT_REFERRED`, `MORE_EVIDENCE_NEEDED` |
| Separation of duties beyond the platform's | A reviewer is never the submitter of the subject's earliest version |
| Findings a review must address | Every gap and conflict; every disclosure acknowledged |
| More than one decider | Not required |
| Challenging role | `DISCOVERY_REVIEWER`, other than the decider; or the subject's submitter |
| Triggers and lapse | All ten platform change kinds; 12 months |
| What relies on reviews | A referral, while the review is `VALID` and `CURRENT`. A referral made on a review later invalidated stays on the record, and is shown as resting on an invalidated review; what CAP-06 does then is CAP-06's |

## Reading CAP-01

- **`COUNTRY_INTELLIGENCE_READER`** reads admitted records, dossiers, reviews and referrals in their own country workspace, for the purposes a record permits. Any other role reads what its duty requires.
- **Held records** are readable by reviewers and the submitter only.
- **Every read derives state when read:** admitted, held or rejected; superseded; referred.
- **Reads are always within one country workspace.** There is no cross-country read, and no list of every country.

## Authority

| Role | May |
|---|---|
| `PROBLEM_REPORTER` | Submit problem reports |
| `COUNTRY_INTELLIGENCE_CONTRIBUTOR` | Submit every kind of record; request dossiers |
| `DISCOVERY_REVIEWER` | Resolve held records; request dossiers; review dossiers; make referrals; challenge and resolve challenges |
| `COUNTRY_INTELLIGENCE_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. The country is never taken from the request, and a grant with no country scope is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name (decision 9).

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP01_RECORD_ADMISSION` | A record is held or admitted |
| `CAP01_HELD_RESOLUTION` | A held record is resolved |
| `DISCOVERY_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `DISCOVERY_REVIEW` | A dossier is reviewed |
| `DISCOVERY_REFERRAL` | A referral is made |
| `CAP01_DECISION_CHALLENGE` | A human decision is challenged |
| `CAP01_CHALLENGE_RESOLUTION` | A challenge is resolved |

Receipts carry `capabilityId: "CAP-01"`.

| Operation | Route |
|---|---|
| `submitRecord` | `POST /agr/v1/country-intelligence/records`: `201` admitted, `202` held |
| `resolveHeldRecord` | `POST /agr/v1/country-intelligence/records/:recordId/held-resolutions` |
| `getRecord` | `GET /agr/v1/country-intelligence/records/:recordId` |
| `listRecords` | `GET /agr/v1/country-intelligence/records?kind=&…` |
| `requestDossier` | `POST /agr/v1/discovery-dossiers` |
| `getDossier` | `GET /agr/v1/discovery-dossiers/:evaluationId`, with its comparison with the store, derived |
| `reviewDossier` | `POST /agr/v1/discovery-dossiers/:evaluationId/reviews` |
| `challengeDecision` | `POST /agr/v1/country-intelligence/challenges`, naming the decision |
| `resolveChallenge` | `POST /agr/v1/country-intelligence/challenges/:challengeId/resolutions` |
| `makeReferral` | `POST /agr/v1/discovery-referrals` |
| `getReferral` | `GET /agr/v1/discovery-referrals/:referralId` |

Every write requires an `Idempotency-Key`. The interface stays provider-neutral; the rehearsal's field names are not canonical.

## Failure contract

```typescript
interface Cap01Failure {
  ok: false;
  capabilityId: "CAP-01";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "LINK_NOT_RESOLVED"
    | "SUPERSESSION_NOT_PERMITTED"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "RECORD_NOT_FOUND"
    | "RECORD_NOT_HELD"
    | "HELD_RECORD_ALREADY_RESOLVED"
    | "DOSSIER_SUBJECT_INVALID"
    | "DOSSIER_NOT_FOUND"
    | "DECIDER_NOT_INDEPENDENT"
    | "REASONING_INCOMPLETE"
    | "BINDING_MISMATCH"
    | "DECISION_SIGNATURE_INVALID"
    | "REVIEW_NOT_RELIABLE"
    | "REFERRAL_ALREADY_OPEN"
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
| `UNAUTHENTICATED` | 401 | No actor |
| `ROLE_NOT_AUTHORISED` | 403 | The actor lacks the role, in a scope covering the country workspace |
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, lacks a required field or link, or supplies a system-set field |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key was used with different content |
| `CLASSIFICATION_INCOMPLETE` | 422 | A classification field is missing, or `permittedUses` is empty |
| `LINK_NOT_RESOLVED` | 422 | A link names no admitted, current CAP-01 record of the right kind in the workspace |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, not in the workspace, or of another kind |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `RECORD_NOT_HELD`, `HELD_RECORD_ALREADY_RESOLVED` | 409 | A held resolution that does not match the record's state |
| `DOSSIER_SUBJECT_INVALID` | 422 | The subject is not an admitted, current resource or opportunity |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, disclosure or held reason is not addressed |
| `BINDING_MISMATCH` | 409 | The dossier's or snapshot's digests no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify against the decider's key as at acceptance |
| `REVIEW_NOT_RELIABLE` | 409 | A referral naming a review that is not `VALID` and `CURRENT`, or not `REFER_FOR_INVESTIGATION` |
| `REFERRAL_ALREADY_OPEN` | 409 | An open referral exists for the subject and target |
| `CHALLENGED_DECISION_NOT_FOUND` | 404 | No human decision with that identifier the actor may see |
| `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN` | 409 | A challenge that does not match the decision's state |
| `CHALLENGE_NOT_PERMITTED` | 409 | The decision is a challenge resolution |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** Every refusal is a fail-closed envelope; a constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-01 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every evidence citation is an admitted CAP-04 record, read for the purpose `COUNTRY_INTELLIGENCE` | `designed`; built first |
| CAP-06 Ingredient Intelligence | **Receives referrals.** CAP-01 works without it; a referral waits for CAP-06 to accept it | `named only` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety and ecology.** CAP-01 discloses them as not assessed until CAP-10 exists | `named only`, no description |
| CAP-02 Governed Scientific Data Acquisition | **Owns external sources.** Material it brings in reaches CAP-01 only as CAP-04 evidence | `named only` |
| CAP-05 Governed Scientific Reasoning | **Optional.** A scientist may ask CAP-05 what the evidence on a resource says; a dossier does not depend on it | `designed` |
| The country's tenancy, membership and national objectives (CAP-16, CAP-24) | **The workspace and the objectives register** CAP-01 reads | `named only` |

Under the admission authority's checklist (item 5), each dependency must be admitted before CAP-01, or in the same decision. CAP-10, CAP-16 and CAP-24 have no contracts.

## Open gaps

**Contract gap: CAP-10.** Safety and ecology have no contract and no description. Until they do, every dossier and referral says they are not assessed, and CAP-06 must not read a referral as safe.

**Contract gap: national objectives.** The register of a country's objectives, who sets them and how they are versioned, belongs to the country's tenancy capabilities, which have no contract. Until it is defined, objective codes are matched as given, and unresolved ones are disclosed.

**Contract gap: external sources.** CAP-02 has no contract. The rehearsal's source registry, adapters and evidence snapshots are its concern, and any outbound retrieval is an explicit outbound surface under the egress specification and Gate D.

**Contract gap: spatial investigation.** Satellite and spatial observation of resources and burden, modelled in the rehearsal with no code behind it, is not defined here. It may be CAP-01's, CAP-02's or observation's (proposed CAP-36).

**Contract gap: traditional knowledge.** As in CAP-04: records linked to traditional knowledge are held, and the basis on which they may be held and used is the country's to set with its institutions.

**Contract gap: community reporting.** Many problems will be reported by people without a platform account. How a `PROBLEM_REPORTER` records a report for a community, with its consent, is not defined beyond naming the reporter as declared data.

**Contract gap: automated discovery.** No automated signal, opportunity or prioritisation is defined. Any future automated method would be a new rules version, disclosed in every output, never a decision, and its outputs held for a person.

**Contract gap: closing a referral.** A referral stays open until CAP-06 closes it, and CAP-06 has no contract. Until it does, a second referral of the same subject to CAP-06 is refused.

**Platform gap: an invalidated admission.** As in CAP-04 and CAP-05: AAB-PLATFORM-07 has no change kind for a member whose admission is invalidated by an upheld challenge, so a review's triggers do not fire on it. It is AAB-PLATFORM-07's to settle.

**Contract gap: bringing rehearsal data across.** No rehearsal record is a CAP-01 record. Importing any would be a submission like any other, declaring the rehearsal as its source.

**Current system limit: no implementation.** Nothing of CAP-01 is built. It is built only after CAP-04, the dependency audit's independent verification and the extraction.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any resource, waste stream or opportunity exists, is valuable, safe, recoverable or suitable for any use.
- It does not rank, score or recommend anything, or authorise anyone to present a dossier as a recommendation.
- It does not define safety and ecological assessment (CAP-10), external acquisition (CAP-02), or what CAP-06 does with a referral.
- It does not bring the rehearsal's cognitive loop, country bootstrap, briefs or scores across, or decide the loop's identity.
- It does not make CAP-01 canonical in the registry, the CAP-34 fidelity manifest or the validators; those change only with its admission.
- It does not admit CAP-01: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
