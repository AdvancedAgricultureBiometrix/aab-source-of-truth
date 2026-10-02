# CAP-10 Safety & Ecological Intelligence — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-10 Safety & Ecological Intelligence. It is not SCS-CAP-10 (Challenge Response and Evidence Retrieval), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-10: HOW THE SAFETY AND ECOLOGICAL EFFECT OF AN INGREDIENT, A FORMULATION, A REGISTERED PRODUCT USED OUTSIDE ITS REGISTRATION, OR A RAW MATERIAL HANDLED DURING DISCOVERY IS ASSESSED BY QUALIFIED PEOPLE WITHIN A DECLARED USE BOUNDARY; HOW A SAFETY SIGNAL IS REPORTED, HELD, TRIAGED, DETERMINED AND CLOSED; WHEN FURTHER APPLICATION OR HANDLING IS HELD AUTOMATICALLY; AND ITS BOUNDARIES WITH CAP-01, CAP-04, CAP-05, CAP-06, CAP-07, CAP-08, CAP-09, CAP-11 AND THE PLANNED ECOSYSTEM DOMAIN. Establishes no commissioning, production, Gate D, WP05, scientific-validity, general safety certification or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-10-02, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-10 had no design contract, and no description beyond its name, before this one.
**Amended:** 2026-10-02 (regulatory status, and a clerical correction), with CAP-11's canonical contract.

## Amendment of 2026-10-02: regulatory status, and a clerical correction

**Why.** This contract carries `REGULATORY_STATUS_NOT_ASSESSED` on every outcome until CAP-11 exists, and treats a registration as declared, never verified. CAP-11 now has a contract (`governance/workstream-b/CAP-11-REGULATORY-TRANSLATION-AND-DOSSIER-SUPPORT-CANONICAL-CONTRACT-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-02. **CAP-10 still never assesses regulatory status.** Nothing else in this contract changes.

**1. A clerical correction.** The dependencies row named the capability "CAP-11 Regulatory Intelligence". **Its canonical name is "CAP-11 Regulatory Translation & Dossier Support",** as in the CAP-34 fidelity manifest, the roadmap, the overview, CAP-06 and CAP-07. The row is read with the canonical name. **No meaning changes.**

**2. Regulatory status beside a safety outcome.** The dossier rules become `cap-10-dossier-rules-2`: the rules of version 1, with this change. **Where the subject's version has a verified CAP-11 regulator decision, or a valid, current CAP-11 dossier assessment, for the country workspace's own jurisdiction,** it is shown beside CAP-10's outcome, with CAP-11's display block, in place of `REGULATORY_STATUS_NOT_ASSESSED`. **Otherwise the disclosure stays.** A CAP-10 outcome never states, implies or depends on a regulatory status, and a regulatory status never states anything about safety.

**3. A registered product use, verified.** Where a `REGISTERED_PRODUCT_USE` cites a CAP-11 regulator decision of the kind `REGISTRATION`, verified, valid and current, `REGISTRATION_DECLARED_NOT_VERIFIED` is replaced by `REGULATOR_DECISION_RECORDED`. **The departures from the registration are still what CAP-10 assesses.**

**4. What this amendment replaces.**
- **The contract gap "CAP-11"** now reads: regulatory status is CAP-11's; until a CAP-11 outcome or verified regulator decision exists for the subject, version and jurisdiction, `REGULATORY_STATUS_NOT_ASSESSED` stays.
- **The dependencies row for CAP-11** now reads: **CAP-11 Regulatory Translation & Dossier Support: owns regulatory status; CAP-10 never assesses it; its status is shown beside CAP-10's outcome where one exists; `designed`, post-launch.**

## Why this contract, and what it adopts

**Why.** Five committed contracts defer safety and ecology to CAP-10, and carry `SAFETY_ECOLOGY_NOT_ASSESSED` until it exists:
- **CAP-01** (decision 8) has no safety gate, and replaced the rehearsal's gate, which could never pass.
- **CAP-06** (decision 7) and **CAP-07** (decision 11) accept ingredients for formulation research, and formulations for trial, on a **declared safety and handling basis** that AAB does not assess. CAP-07 records that component interactions are assessed by no one.
- **CAP-08** (decision 4) activates field trials on a declared safety basis, and calls this its most serious gap. Its interim position 8 quarantines a safety signal at once, and leaves open who is told, how fast, who may stop a trial and how a stop is recorded. Its amendment of 2026-09-30 leaves open whether a trial is suspended automatically when an acceptance lapses, "pending the safety escalation governance decision". **That decision is made here.**
- **CAP-09** (decision 10) never promotes a claim that anything is safe, and records adverse effects only as observations of harm.

**The domain register and cognitive architecture** (`governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`, sections 10.4 and 11) names "detect possible safety signals" among what a brain may do, and `SAFETY SIGNAL` among its output labels, and says that each capability contract defines its own vocabulary. This contract defines CAP-10's.

The evidence is the step 0 snapshots, **with every safety, ecology, toxicity, hazard, contraindication and handling path in `agriculture`, `cognitive_core` and `country_core` read in full,** with the gateway and repositories that reach them ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-10 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a safety and ecology dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** assessments, qualification reviews, signal triage, determinations, directions, hold releases, closures and challenges are human decisions, and an assessment may need more than one decider (section 7).
- **CAP-04 as amended:** a durable assessment cites only admitted CAP-04 records.
- **CAP-01, CAP-06, CAP-07 and CAP-08,** as amended on 2026-10-02 with this contract: they name CAP-10's subjects, and rely on its outcomes.
- **The platform's observation and brain governance,** the brain boundary in the purpose and values, **the domain register and cognitive architecture**, and **the country scientific data non-return boundary:** CAP-10 is bound by them, and cites them.

AAB-PLATFORM-01 is **not adopted in this version:** CAP-10 stores no originals ("Open gaps"). AAB-PLATFORM-04 is **not adopted:** nothing in CAP-10 is submitted on behalf of another party.

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review, with corrections recorded in the same review):
1. **Capability identifier `CAP-10`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-10:`. Receipts are accepted already (migration 025).
2. **CAP-10 records, and qualified people assess.** Its records are an assessment request, a safety and ecology dossier, and qualified people's assessment decisions; a safety signal and its decisions; an assessor's qualification; and the country's safety policy. **No computed score, band or rank.** None of the rehearsal's concern scores, attention bands, or its gate that could not pass is carried across.
3. **Subjects.** A full assessment's subject is a CAP-06 ingredient or candidate version, a CAP-07 formulation version, or a registered product used outside its registration (decision 14). **A separately limited assessment type, `INVESTIGATION_MATERIAL_HAZARD_SCREEN`,** takes a CAP-01 country resource or waste stream version as its subject, for raw material handled during discovery (contaminated waste, biosolids, unknown biological material and the like). **A hazard screen never assesses a resource as an ingredient.** It determines only whether authorised sampling, collection, transport or laboratory handling may proceed, and under what precautions.
4. **Every assessment has a declared use boundary:** the use stage, the activities, the route, the maximum rate, frequency and quantity, the crops and site types, the receiving environment, the exposed populations, the country, and the exclusions. **Nothing carries outside its boundary.** An assessment belongs to its country workspace: another country may cite it as evidence, and must assess for itself.
5. **Dimensions are mandatory minimums, not a closed list.** A mandatory core is declared in every assessment, applicable or not applicable with a reason. **An applicable dimension may never be silently omitted,** and a missing one is never read as low concern. Additional dimensions, named in a catalogue, or required by the country's policy, or specific to the subject or use, are permitted.
6. **Evidence.** A durable assessment cites only admitted CAP-04 records. **Traditional knowledge and supplier material may be admitted with their provenance and limitations disclosed.** Neither is independently sufficient to establish an affirmative outcome: **a material safety claim requires corroborating evidence appropriate to the declared use boundary.** Authentic supplier documentation, such as a safety data sheet, may contain relevant evidence; the question the assessor addresses is whether it is verified, applicable and sufficient.
7. **The outcome vocabulary never says "cleared" or "safe":** `ASSESSED_ACCEPTABLE_FOR_HANDLING_WITHIN_BOUNDARY`, `ASSESSED_ACCEPTABLE_FOR_CONTROLLED_TRIAL_WITHIN_BOUNDARY`, `ASSESSED_ACCEPTABLE_WITH_CONDITIONS`, `NOT_ACCEPTABLE_WITHIN_BOUNDARY` and `DEFERRED_EVIDENCE_REQUIRED`. **Every response showing an outcome displays** the exact subject and version, the country, the permitted use, the maximum exposure or application, the conditions, the evidence cut-off, the expiry and currency, the unresolved limitations, and the statement that it is not general safety certification or regulatory approval.
8. **Formulations:** an assessment addresses component interactions by name. **Assessments of the ingredients never add up to an assessment of a formulation.** This closes CAP-07's interactions gap.
9. **The number of assessors is risk-based.** One qualified, independent assessor for a routine assessment of already-characterised material for handling. **Two independent qualified assessors, or one assessor and a specialist's concurrence,** for an elevated assessment: novel ingredients or formulations, field release, high uncertainty, human or animal health concerns, biosecurity, significant ecological exposure, contradicting evidence, or prior serious safety signals. The tier is derived, never chosen downward.
10. **`SAFETY_ASSESSOR` is never a freely assigned role.** It has effect only within a valid, current qualification: persisted evidence of identity, country membership, institution membership, professional qualification or recognised competence, declared disciplines and assessment scope, current authority, and declared conflicts, reviewed by a `SAFETY_GOVERNOR`. **Each applicable dimension must fall within a decider's disciplines.** An assessor never assesses a subject they designed, curated, authored or reviewed, or a trial use they designed or activated.
11. **Challenges:** a `SAFETY_ASSESSOR` other than the decider, or the subject's requester, may challenge. Resolved by a `CHALLENGE_RESOLUTION`, by a qualified `SAFETY_ASSESSOR` who is neither party. One open challenge per decision. **Final in CAP-10, as the pilot position,** as in CAP-08 and CAP-09.
12. **Composition and confidential technical information** reach an assessor only by a CAP-07 composition access grant (CAP-07's amendment of 2026-10-02): **purpose-bound, subject- and version-bound, time-limited, logged, revocable, unavailable to unrelated searches, and protected from onward disclosure.** An assessment has a conclusion that may be shown more widely, and a restricted technical basis.
13. **Currency is event-driven, under a policy ceiling.** Events lapse or reopen an assessment at once. **The platform ceiling is 24 months, as the pilot position;** the country's policy sets its maximum within it, and an assessor may set a shorter expiry for uncertainty, novelty or evidence limitations.
14. **Where an assessment is required** (CAP-08's amendment of 2026-10-02). **Every material applied in a field trial,** including carrier-only controls and reference materials, needs a valid, current, bounded CAP-10 outcome covering the protocol's use, **except a registered product used exactly within its registration:** valid in that country, current, for the exact product and formulation, for the intended crop, at the proposed rate and frequency, by the proposed method, under the registered conditions, and not mixed or combined experimentally. An off-label use, an experimental combination, a different carrier, a novel rate or a materially different environment requires an assessment. **CAP-06 and CAP-07 acceptance** may rest on a CAP-10 outcome, and otherwise on the declared basis with `SAFETY_ECOLOGY_NOT_ASSESSED`; **a negative CAP-10 outcome is never overridden by a declared basis:** one covering research handling refuses acceptance, and one covering field use refuses that use in CAP-08.
15. **Precaution and decision are separate.** Quarantined, unadmitted information may place a temporary precautionary hold. **It never establishes an affirmative outcome or a final finding.** CAP-04 admission and a CAP-10 decision are required for every durable decision. The original report is preserved with its provenance, even if it is later rejected or disproven.
16. **A safety signal has an exact lifecycle:** `REPORTED`, `QUARANTINED`, `TRIAGE_REQUIRED`, `PRECAUTIONARY_HOLD`, `UNDER_ASSESSMENT`, `SUBSTANTIATED`, `NOT_SUBSTANTIATED`, `INCONCLUSIVE_EVIDENCE_REQUIRED`, `CLOSED_WITH_ACTION`, `CLOSED_NO_ACTION`. **A signal never disappears because it was not substantiated.** Its report, investigation and decisions stay auditable.
17. **Automatic precautionary hold, fail closed.** A credible human-declared signal automatically holds further application or handling. **A narrowly defined, deterministic critical rule may also place a temporary precautionary hold,** with the rule, its input evidence and its reason visible, reviewed by a qualified person within the triage period. Only a qualified person releases a hold. **A hold restricts; it never authorises.**
18. **Notification and triage are severity-based.** Immediate notification for critical and serious signals; triage immediately for critical danger, within a short country-defined period for serious, promptly for material, and within a recorded period for lower concern. **AAB invents no statutory deadline:** the country's policy names them, and CAP-10 records whether each required external notification was made, by whom, under what authority, and with what reference.
19. **Machine-generated signals** create a prioritised triage item. Only the deterministic critical rules of decision 17 may place a hold. **A machine never assesses, never produces a final finding, never resolves a contradiction, never closes a signal, and never terminates a trial.**
20. **Protected information.** Every signal and assessment field carries a visibility class. Personal health information, people's identities, exact locations, photographs of people, commercially confidential composition and regulator communications are **seen only for a stated purpose, by those whose duty requires it.** Not every trial participant sees the whole record because they were told of a hold.
21. **Country policy may add safety requirements, never remove them:** dimensions, shorter validity, shorter triage periods, more notified parties, statutory obligations. It never lowers a platform floor.
22. **CAP-10 owns the governed safety assessment workflow and decision, not ecological knowledge.** The planned Ecosystem domain, and any other domain, supplies governed evidence to CAP-10; CAP-10 applies this contract to the proposed use.
23. **Roles:** `SAFETY_REQUESTER`, `SAFETY_REPORTER`, `SAFETY_ASSESSOR` (only within a qualification), `SAFETY_GOVERNOR` and `SAFETY_READER`, each a scoped grant.
24. **Safety records stay in the country.** Assessments, dossiers, signals and their decisions are the egress specification's category 2. A country's notification to its own regulator is its own act, recorded in CAP-10, never a transfer by AAB.
25. **CAP-01, CAP-06, CAP-07, CAP-08 and CAP-09 are amended in the same change as this contract** (each, "Amendment of 2026-10-02").
26. **`SAFETY_GOVERNOR` is a separate role.** Reviewing assessor qualifications, approving the country's safety policy, resolving held records and receiving escalations never sit with `SAFETY_ASSESSOR`. A governor never reviews their own qualification; one who also holds a qualification may assess, under the same rules as any assessor, and never reviews the qualification of another decider on the same dossier.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People who want to handle or apply a material say exactly how, where, how much and around whom. Qualified people who had no hand in designing it assess the evidence, dimension by dimension, and decide whether that use is acceptable within those limits, and on what conditions. Missing evidence restricts use; it never permits it. When someone reports harm, further application stops at once while a qualified person looks. AAB never declares anything safe.**

Safety is never inferred from the absence of a reported problem. It is a bounded, evidence-backed, attributable human assessment.

CAP-10 keeps the governed record of safety and ecological assessments and safety signals, and the decisions of the people who make them. It does not admit evidence (CAP-04), register ingredients (CAP-06), build formulations (CAP-07), run trials (CAP-08), promote learning (CAP-09), decide what may be sold or applied (CAP-11 and the country's regulators), or own ecological knowledge (the planned Ecosystem domain).

## What CAP-10 answers, and what it does not

| Question | Answered by |
|---|---|
| What is this evidence, and may it be used? | CAP-04 |
| Is this proposed use of this material acceptable, within these limits, and on what conditions? | **Qualified people,** by an assessment in CAP-10 |
| What does the evidence on each safety and ecological dimension show, and what is missing? | **CAP-10**, a safety and ecology dossier, which shows it and does not score it |
| May this raw material be sampled, collected, transported or handled in a laboratory, and how? | **Qualified people,** by a hazard screen in CAP-10 |
| Someone reports harm. What happens now, who is told, and who decides? | **CAP-10**, a safety signal |
| Is it safe, in general? | **Nobody in AAB.** No assessment is general safety certification |
| May it be sold, registered or applied commercially? | CAP-11 and the country's regulators, not CAP-10 |
| What do we know about this ecosystem? | The planned Ecosystem domain, which supplies evidence to CAP-10 |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** every table, view, function, trigger and row-level security policy in `agriculture` naming safety, ecology, toxicity, hazard, contraindication or handling, and every function reaching them: the resource safety and ecology gate (`tables.sql`, line 2895; `api_assess_resource_safety_gate`, `functions.sql`, lines 446 to 470), the discovery assessment and priority (lines 2018 to 2030 and 2590 to 2620), the full discovery run (2575 to 2585), the scientist review and bridge (548 to 580, 750 to 770, 2740 to 2752), the discovery candidate, evidence, review and promotion tables and functions, the governance review functions, the ingredient version and its writers, the trial tables, and the rollback-only validation (3060 to 3095); in `cognitive_core`, the ingredient build candidate and transformation opportunity; in `country_core`, the discovery synthesis result; and in the gateway, every safety and handling field (`api.php`, lines 22, 430 to 449 and 1906 to 1933) and the ingredient repositories. Citations are to `agr-rehearsal/snapshot-2026-09-28/` and its supplement.

**What it does, as read:**
- **One real gate, for discovery runs only.** `resource_safety_ecology_gate` records contamination, toxicity and ecology statuses (`UNASSESSED`, `LOW_CONCERN`, `REVIEW_REQUIRED`, `HIGH_CONCERN`, `PROHIBITIVE`). `PROHIBITIVE` blocks; anything unassessed, uncharacterised, resting only on traditional knowledge or a supplier's claim requires review; a pass needs the `review` capability, and says "for investigation only". The scientist review and the bridge to a discovery candidate require a pass (lines 564, 762, 2749).
- **The gate can never pass.** Discovery always calls it with toxicity and ecology `UNASSESSED` (line 2582), and no gateway action re-assesses it. Only the rollback-only validation calls it with `LOW_CONCERN` (line 3075). CAP-01 recorded this.
- **Concern scores are constants.** `safety_concern_score` is a lookup of the waste stream's contamination status, 55 when unknown; `ecological_concern_score` is 50, or 35 if a burden profile exists (lines 2608 to 2609). They set a `safety_attention_band` and subtract from investigation priority (lines 2026, 2614). Nothing is assessed.
- **Ingredient risk and handling are free text,** never required for approval, and wiped by an amendment that omits them (CAP-06 recorded this).
- **Vocabulary with no behaviour:** `governance_review` types `SAFETY` and `ECOLOGICAL` are never created (every caller uses `SCIENTIFIC`, `EVIDENCE` or `FINAL_APPROVAL`: lines 1247, 1895, 1938, 1967, 2868); `discovery_review` stages `SAFETY` and `ECOLOGICAL` have no writer; the discovery status `SAFETY_AND_ECOLOGICAL_REVIEW` is never reached, and a candidate reaches an ingredient without any safety step (lines 2054, 2513); `country_resource_investigation.safety_status` has no writer; the trial status `PAUSED` has no writer.
- **Fixed text and constant flags:** `cognitive_core`'s ingredient candidates carry fixed `safety_unknowns` ("Unknown toxicology / phytotoxicity until characterised") and `safety_uncertainty` 1; `country_core`'s synthesis results hold `safety_review_required = true` by constraint; the country settings `required_safety_review` and `required_ecology_review` are read by nothing.
- **No formulation safety, no interactions, no trial safety basis, no adverse-event path, no escalation.** "Safety / stability variant" is a change-type label only.

**In one line:** the rehearsal has a safety vocabulary and one gate that cannot pass. **No safety or ecological assessment ever happens,** and AAB must not represent any ingredient, formulation or trial as safety-assessed on the rehearsal's account.

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| A gate on discovery runs that can never pass | **No gate on discovery.** A hazard screen for handling raw material (decision 3), and full assessments of ingredients, formulations and product uses |
| Concern scores and attention bands | **Not carried across.** A dossier shows the evidence per dimension, and people decide (decision 2) |
| Unknown contamination scored 55 | **Missing evidence is `EVIDENCE REQUIRED`,** and restricts (decisions 5 and 15) |
| `UNASSESSED`, `LOW_CONCERN`, `PROHIBITIVE`; `PASS_FOR_INVESTIGATION` | **Five bounded outcomes,** never "cleared" or "safe" (decision 7) |
| Traditional knowledge or a supplier claim forces review | **Kept, in governed form:** admitted with limitations, never independently sufficient (decision 6) |
| A pass by anyone with `review` | **Qualified, independent assessors,** two for elevated risk (decisions 9 and 10) |
| Free-text risks, wiped on amendment | **Dimensions declared in full,** in a request written once |
| Unused safety review types, stages and statuses | **Not carried across.** One vocabulary, defined here |
| No adverse-event path, `PAUSED` unwritten | **A safety signal lifecycle, an automatic hold, directions and closure** (decisions 15 to 19) |
| Country flags read by nothing | **A country safety policy that may only add** (decision 21) |

**Kept, in governed form:** "local, natural or waste does not mean safe"; traditional knowledge and supplier claims are not proof; a pass is never ingredient approval or efficacy proof; scientist authority preserved.

**Not carried across, in any form:** scores, bands and constants; a gate that cannot pass; self-review; statuses with no writer; safety text that an amendment can wipe.

**The rehearsal's data is not CAP-10's.** CAP-10's records start empty in a new deployment.

## Subjects, assessment types and the use boundary

| Assessment type | Subject | Use stages it may take |
|---|---|---|
| `SAFETY_AND_ECOLOGY_ASSESSMENT` | A CAP-06 `INGREDIENT` or candidate version; a CAP-07 `FORMULATION` version; a `REGISTERED_PRODUCT_USE` | `RESEARCH_HANDLING`, `CONTROLLED_FIELD_TRIAL` |
| `INVESTIGATION_MATERIAL_HAZARD_SCREEN` | A CAP-01 `COUNTRY_RESOURCE` or `WASTE_STREAM` version | `INVESTIGATION_HANDLING` only |

- **`INVESTIGATION_HANDLING`:** sampling, collection, transport and laboratory handling of raw material during discovery.
- **`RESEARCH_HANDLING`:** laboratory and formulation research handling: preparation, storage, bench characterisation, mixing.
- **`CONTROLLED_FIELD_TRIAL`:** application in a CAP-08 trial, which includes everything handled to prepare and apply it.
- **A candidate** may be assessed only for `RESEARCH_HANDLING`: it is not a trial material until it is an ingredient.
- **A `REGISTERED_PRODUCT_USE`** declares the product, its registration (country, number, holder, product and formulation identity, crops, rates, frequency, method, conditions, expiry) and how the proposed use departs from it. It is assessed only for `CONTROLLED_FIELD_TRIAL`. AAB never verifies a registration: it is shown `REGISTRATION_DECLARED_NOT_VERIFIED`.

**The use boundary** is part of the request, and of every outcome:

```typescript
interface Cap10UseBoundary {
  useStage: "INVESTIGATION_HANDLING" | "RESEARCH_HANDLING" | "CONTROLLED_FIELD_TRIAL";
  activities: string[];                  // as declared, e.g. "sampling", "transport", "foliar spray"
  routes: string[];                      // application or handling methods, as declared
  maximumRate?: { value: string; unit: string; basis: string };   // required for CONTROLLED_FIELD_TRIAL
  maximumFrequency?: { count: number; per: string };              // required for CONTROLLED_FIELD_TRIAL
  maximumQuantityHandled?: { value: string; unit: string };       // required for the handling stages
  crops: string[];                       // required for CONTROLLED_FIELD_TRIAL
  siteTypes: string[];
  receivingEnvironment: string[];        // as declared, e.g. "sandy soil", "within 50 m of surface water"
  exposedPopulations: string[];          // as declared, e.g. "field workers", "livestock grazing", "pollinators"
  period: { from: string; to: string };
  exclusions: string[];                  // where it is known not to apply, or was not considered
}
```

The country is the request's country workspace, set by the server, and always the outer limit.

## The assessment request

Every CAP-10 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap10AssessmentRequest {
  recordId: string;                      // set by the system
  recordVersion: number;                 // a new version supersedes the previous one, written in full
  recordKind: "SAFETY_ASSESSMENT_REQUEST";
  schemaVersion: "urn:aab:schema:agr:cap-10:assessment-request:1";
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  assessmentType: "SAFETY_AND_ECOLOGY_ASSESSMENT" | "INVESTIGATION_MATERIAL_HAZARD_SCREEN";
  subject: {
    kind: "INGREDIENT_VERSION" | "FORMULATION_VERSION" | "REGISTERED_PRODUCT_USE" | "INVESTIGATION_MATERIAL";
    recordId?: string;                   // CAP-06 (ingredient or candidate), CAP-07, or CAP-01 (COUNTRY_RESOURCE or WASTE_STREAM)
    recordVersion?: number;              // required with recordId
    product?: string;                    // REGISTERED_PRODUCT_USE only
    registration?: Cap10DeclaredRegistration;   // REGISTERED_PRODUCT_USE only: country, number, holder, identity, crops, rates, frequency, method, conditions, expiry
    departures?: string[];               // REGISTERED_PRODUCT_USE only: how the use departs from the registration
  };

  boundary: Cap10UseBoundary;

  // Every core dimension declared; additional dimensions as needed
  dimensions: Array<{
    code: string;                        // a core or catalogue code, or "COUNTRY:<code>" from the country's policy
    applicability: "APPLICABLE" | "NOT_APPLICABLE";
    reason?: string;                     // required for NOT_APPLICABLE
  }>;

  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    admissionDecisionId: string;         // set by the system from CAP-04
    dimensions: string[];                // which dimensions it bears on
    origin: "INDEPENDENT" | "REGULATORY" | "SUPPLIER" | "TRADITIONAL_KNOWLEDGE" | "REQUESTER_OWN";
    note?: string;
  }>;

  // Confidential technical inputs, each with a visibility class (see "Protected information")
  technicalInputs?: Array<{
    kind: "CONCENTRATIONS" | "CARRIERS_AND_ADJUVANTS" | "MANUFACTURING_PROCESS" | "IMPURITIES" | "BATCH_INFORMATION"
        | "PHYSICAL_CHEMICAL_PROPERTIES" | "DEGRADATION_PRODUCTS" | "STORAGE_CONDITIONS" | "APPLICATION_EQUIPMENT" | "OTHER";
    content: string;
    visibility: "RESTRICTED_TECHNICAL" | "PROTECTED_COMMERCIAL";
  }>;

  knownHazards: string[];                // what the requester already knows of, as declared
  uncertainty: string;                   // what the requester is least sure of

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
- **A new version is written in full,** and does not inherit the decisions on the one it supersedes.
- **No record states its own safety, risk level, tier or outcome.** What evidences a request is its citations; what is missing is derived in a dossier; the tier is derived; the outcome is people's decision.
- **The `origin` of a citation is declared by the requester,** and shown beside CAP-04's provenance. An assessor who finds it wrong says so in the reasoning; a dossier never relies on it to raise a tier's floor, only to show corroboration.
- **A known contradicting record must be cited.** CAP-10 cannot enforce what a requester knows; the dossier shows every conflict among the cited records, and an assessor may ask for more.

**Admission** (rules version `cap-10-admission-1`), in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `REQUESTER_AUTHORITY`: `SAFETY_REQUESTER` in the country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the required fields, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `SUBJECT_RESOLVED`: the subject exists in the same country workspace, is current, and is of a kind the assessment type takes; a hazard screen names a CAP-01 resource or waste stream | **Refuses:** `SUBJECT_NOT_FOUND`, never revealing a record the requester may not see |
| 5 | `STAGE_PERMITTED`: the use stage is one the type and subject may take | **Refuses:** `USE_STAGE_NOT_PERMITTED` |
| 6 | `BOUNDARY_DECLARED`: every field the use stage requires | **Refuses:** `BOUNDARY_INCOMPLETE` |
| 7 | `CORE_DIMENSIONS_DECLARED`: every core dimension, and every dimension the country's policy requires, declared; a reason for each `NOT_APPLICABLE` | **Refuses:** `DIMENSIONS_INCOMPLETE` |
| 8 | `EVIDENCE_ADMITTED`: every citation is admitted, current and readable for the purpose `SAFETY_ASSESSMENT` | **Refuses:** `EVIDENCE_NOT_ADMITTED` |
| 9 | `SUPERSESSION_VALID` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 10 | `SOURCE_IDENTIFIED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 11 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information declared | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |

- **Held records** are decided by a `SAFETY_GOVERNOR`, never the submitter (`CAP10_HELD_RESOLUTION`: `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`).
- **Composition access follows admission.** A CAP-07 composition access grant names an admitted request, so it is made after it (CAP-07's amendment of 2026-10-02), one for each assessor.
- **A request with no evidence is admitted.** An assessment of nothing is `DEFERRED_EVIDENCE_REQUIRED`, and saying so is the dossier's work.

## Dimensions

**The mandatory core**, declared in every request:

| Code | What it covers |
|---|---|
| `HUMAN_HEALTH_HANDLERS_AND_OPERATORS` | People who prepare, handle, transport, apply or work near the material |
| `PHYTOTOXICITY` | Harm to the crop and other plants |
| `SOIL` | Soil organisms, structure and chemistry |
| `WATER` | Surface water, groundwater and drinking water |
| `NON_TARGET_ORGANISMS_AND_BIODIVERSITY` | Organisms other than the target, and biodiversity |
| `CONTAMINANTS` | Heavy metals, pathogens, persistent pollutants and other contaminants carried by the material |
| `BIOSECURITY` | Live organisms, invasiveness, pest and disease spread |
| `RESIDUES_AND_FOOD_CHAIN` | Residues in produce, feed and the food chain |

**Also mandatory:** `COMPONENT_INTERACTIONS` for a formulation (decision 8); `TRANSPORT_STORAGE_AND_DISPOSAL` for a hazard screen.

**The catalogue of additional dimensions** (version `cap-10-dimensions-1`), declared where they apply: `EXPOSURE_ACUTE_AND_CHRONIC`, `DOSE_RESPONSE`, `REPEATED_AND_CUMULATIVE_APPLICATION`, `PERSISTENCE_AND_DEGRADATION`, `MOBILITY_AND_ENVIRONMENTAL_FATE`, `EXPOSURE_ROUTES` (inhalation, dermal, ingestion), `WORKERS_AND_VULNERABLE_PEOPLE`, `LIVESTOCK`, `WILDLIFE`, `POLLINATORS`, `APPLICATION_DRIFT`, `TRANSPORT_STORAGE_AND_DISPOSAL`, `STABILITY_AND_BREAKDOWN_PRODUCTS`, `IMPURITIES_AND_BATCH_VARIATION`, `ANTIMICROBIAL_OR_PEST_RESISTANCE`, `REVERSIBILITY_AND_RECOVERY`. **A country's policy may add its own,** named `COUNTRY:<code>`, and may make any dimension mandatory in that country.

- **An applicable dimension is never silently omitted.** A dossier lists every applicable dimension with nothing cited as `EVIDENCE_REQUIRED`.
- **`NOT_APPLICABLE` is a claim,** with its reason, which the assessor addresses by name. An assessor who finds a dimension applicable says so, and the outcome cannot be affirmative until it is assessed.
- **An assessor may add a dimension** in their reasoning. The outcome then covers it, or is deferred for it.

## Evidence

- **A durable assessment cites only admitted CAP-04 records,** read for the purpose `SAFETY_ASSESSMENT`. A held, rejected, superseded or quarantined record is never cited.
- **Traditional knowledge** may be admitted evidence of historical use, preparation, observed adverse effects, exposure conditions, ecological change, and practices communities have learned to avoid. It is disclosed with its provenance and limitations, and its own sensitivity rules apply.
- **Supplier material** may be admitted, a safety data sheet among it. The assessor addresses whether it is **verified** (authentic, current, for this product), **applicable** (to this material, preparation and use) and **sufficient**.
- **Corroboration.** For each applicable dimension, the dossier shows the origins of the evidence cited. **An affirmative outcome is refused** (`DECISION_NOT_PERMITTED`) where any applicable dimension rests only on traditional knowledge, or only on supplier material, with nothing of another origin. What corroboration is appropriate to the boundary is the assessor's judgement, addressed by name.
- **Registrations and regulatory listings** are shown as declared, `DECLARED_NOT_VERIFIED`, unless admitted in CAP-04 with their provenance.
- **Evidence from another country** may be cited when it is admitted in this country workspace under CAP-04's rules. Another country's assessment is evidence, never an outcome here.
- **Unadmitted information never supports a durable decision.** It may place a precautionary hold (decision 15; "Safety signals").

## The safety and ecology dossier

**A dossier is an evaluation of one assessment request** (AAB-PLATFORM-07), over a frozen snapshot of the request's current version, every CAP-04 record it cites, the subject's current version and its acceptance, the country's policy in force, and every safety signal on the subject. It is written once, with its snapshot and receipt. A `SAFETY_REQUESTER` or `SAFETY_ASSESSOR` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-10 |
|---|---|
| `manifest.scope.scopeRule` | `cap-10-dossier-scope`, version `1` |
| `manifest.selection.mode` | `REQUESTER_LISTED`: the request's citations; quarantined `EXCLUDE`, disclosed; policy `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | The subject's version and its current acceptance; the country safety policy in force; the safety signals on the subject; for a formulation, its components' versions, any CAP-10 outcomes on them, and the CAP-07 composition access grants naming the request |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed |
| `cutoffAt` | The platform's clock; shown on every outcome as the evidence cut-off |

```typescript
interface Cap10SafetyEcologyDossier {
  evaluationId: string;
  capabilityId: "CAP-10";
  resultType: "SAFETY_ECOLOGY_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-10:dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-10-dossier-rules-1"
  request: { recordId: string; recordVersion: number };
  subject: Cap10AssessmentRequest["subject"];
  boundary: Cap10UseBoundary;
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  dimensions: Array<{
    code: string;
    applicability: "APPLICABLE" | "NOT_APPLICABLE";
    notApplicableReason?: string;
    supporting: string[];                // memoryRecordIds cited for it
    origins: string[];                   // the distinct origins among them
    corroborated: boolean;               // more than traditional knowledge or supplier material alone
    status: "EVIDENCE_CITED" | "EVIDENCE_REQUIRED" | "NOT_APPLICABLE_CLAIMED";
  }>;

  riskTier: {
    tier: "ROUTINE" | "ELEVATED";
    reasons: string[];                   // each criterion met, by code
  };

  gaps: Array<{
    findingId: string;
    gapType:
      | "EVIDENCE_REQUIRED"
      | "UNCORROBORATED"
      | "CONTRADICTING_EVIDENCE"
      | "EVIDENCE_ADMITTED_WITH_LIMITATIONS"
      | "NOT_APPLICABLE_CLAIMED"
      | "COMPOSITION_ACCESS_NOT_GRANTED"
      | "INTERACTIONS_NOT_EVIDENCED"
      | "COMPONENT_OUTCOMES_NOT_TRANSFERABLE"
      | "REGISTRATION_DECLARED_NOT_VERIFIED"
      | "SAFETY_SIGNAL_ON_SUBJECT"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED";
    dimension?: string;
    recordIds?: string[];
  }>;
  conflicts: Array<{ findingId: string; dimension: string; supporting: string[]; contradicting: string[] }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundaryStatement: {
    dossierIsNotAnAssessment: true;
    noScore: true;
    missingEvidenceRestricts: true;
    notGeneralSafetyCertification: true;
    notRegulatoryApproval: true;
  };
}
```

**The rules** (`cap-10-dossier-rules-1`), a pure function of the snapshot, exactly reproducible except `evaluatedAt`:
- **Each dimension** lists the citations for it and their origins. An applicable dimension with nothing cited is `EVIDENCE_REQUIRED`; one whose evidence is only traditional knowledge or only supplier material is `UNCORROBORATED`. Nothing is weighed.
- **The risk tier is `ELEVATED`** when any of these holds, each named in `reasons`:
  - `FIELD_RELEASE`: the use stage is `CONTROLLED_FIELD_TRIAL`;
  - `NOVEL_INGREDIENT`: a CAP-06 candidate, or an ingredient CAP-06 records as registered from one (`fromCandidate`);
  - `NOVEL_FORMULATION`: no formulation with the same set of component ingredients has an affirmative CAP-10 outcome in the country workspace;
  - `HIGH_UNCERTAINTY`: any applicable dimension is `EVIDENCE_REQUIRED` or `UNCORROBORATED`;
  - `HEALTH_CONCERN`: the requester declares a known hazard to people or animals, or any evidence cited for a human or animal health dimension is cited as contradicting;
  - `BIOSECURITY`: `BIOSECURITY` is applicable, or the material is `MICROBIAL`, or any component's role is `BIOLOGICAL_AGENT`;
  - `ECOLOGICAL_EXPOSURE`: the boundary's receiving environment or exposed populations name surface water, groundwater, protected areas, pollinators, livestock or wildlife;
  - `CONTRADICTIONS`: any conflict;
  - `PRIOR_SERIOUS_SIGNAL`: any safety signal on the subject, or on any version of it, was `SERIOUS` or `CRITICAL`, or was `SUBSTANTIATED`.
  Otherwise `ROUTINE`. **An assessor may raise the tier to `ELEVATED`, with reasons, and never lower it.** A hazard screen of material whose identity or composition is not characterised is always `ELEVATED`.
- **Formulations:** `COMPOSITION_ACCESS_NOT_GRANTED` when no current CAP-07 grant names the request. `COMPONENT_INTERACTIONS` with nothing cited is `INTERACTIONS_NOT_EVIDENCED`. Where components have CAP-10 outcomes, they are shown, with `COMPONENT_OUTCOMES_NOT_TRANSFERABLE`: they inform, and never constitute, the formulation's assessment.
- **Every safety signal on the subject,** in any state, is a finding, with its status.
- **Conflicts** set the supporting and contradicting records side by side, never resolved.
- **Disclosures, always:** `MACHINE_GENERATED`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`; `NOT_GENERAL_SAFETY_CERTIFICATION`; `REGULATORY_STATUS_NOT_ASSESSED`. **Where it applies:** `REGISTRATION_DECLARED_NOT_VERIFIED`; `COMPOSITION_ACCESS_NOT_GRANTED`.
- **No score, probability, risk rating beyond the tier, rank or recommendation,** and no outcome.

## The assessment, and what it permits

**A `SAFETY_ASSESSOR` assesses a dossier** with a human decision of the kind `SAFETY_ASSESSMENT` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Permitted for the use stage | Means |
|---|---|---|---|
| `ASSESSED_ACCEPTABLE_FOR_HANDLING_WITHIN_BOUNDARY` | `AFFIRMATIVE` | `INVESTIGATION_HANDLING`, `RESEARCH_HANDLING` | The declared handling is acceptable within the boundary |
| `ASSESSED_ACCEPTABLE_FOR_CONTROLLED_TRIAL_WITHIN_BOUNDARY` | `AFFIRMATIVE` | `CONTROLLED_FIELD_TRIAL` | The declared field use is acceptable within the boundary |
| `ASSESSED_ACCEPTABLE_WITH_CONDITIONS` | `AFFIRMATIVE` | Any | The declared use is acceptable within the boundary **only under the conditions stated,** each binding on whatever relies on it |
| `NOT_ACCEPTABLE_WITHIN_BOUNDARY` | `NEGATIVE` | Any | The declared use is not acceptable, with reasons. **It restricts** (decision 14) |
| `DEFERRED_EVIDENCE_REQUIRED` | `DEFERRED` | Any | The reasoning names what evidence is needed. **It permits nothing** |

**The decision records:**
- **its finding on every applicable dimension,** and on every `NOT_APPLICABLE` claim;
- **its conditions:** each a stated precaution (protective equipment, buffer zones, storage, maximum quantities, supervision, disposal), and optionally **stop conditions**: thresholds on a CAP-08 template metric which, when an admitted observation crosses them, place a precautionary hold (critical rule `CR-05`);
- **its expiry:** a date no later than the country policy's maximum, and the platform ceiling;
- **its unresolved limitations;**
- **its conclusion**, a statement that may be shown to everyone who may see the outcome, and **its technical basis**, restricted ("Protected information");
- **a declaration of conflicts** for this subject, which is part of the signed decision.

**Reasoning and refusals:**
- **The reasoning addresses every gap, conflict and `NOT_APPLICABLE` claim by its identifier, every condition, the boundary, the uncertainty, the risk tier,** and, for verified, applicable and sufficient, every supplier and traditional knowledge citation it relies on.
- **Refused outright** (`DECISION_NOT_PERMITTED`):
  - an affirmative outcome with any applicable dimension `EVIDENCE_REQUIRED` or `UNCORROBORATED`;
  - an affirmative outcome on a formulation by a decider who holds no current CAP-07 composition access grant naming the request (or a CAP-07 role), or with `COMPONENT_INTERACTIONS` not assessed;
  - an outcome not permitted for the request's use stage;
  - an affirmative outcome while a safety signal on the subject is `PRECAUTIONARY_HOLD`, `UNDER_ASSESSMENT`, `SUBSTANTIATED` or `INCONCLUSIVE_EVIDENCE_REQUIRED` and not addressed by name;
  - an expiry later than the policy allows;
  - any conclusion or condition stating that the subject is safe, harmless, certified or approved.
- **What an affirmative outcome permits, and what it does not.** It permits what relies on it (CAP-06, CAP-07, CAP-08 or a CAP-01 handling activity) to proceed **for the declared use, within the boundary, under the conditions, until its expiry, while it is `VALID` and `CURRENT`.** It is never general safety certification, never a regulatory approval, never a recommendation, and never an instruction to a farmer. Its conditions are conditions of research use.

**The display block.** Every response that shows a CAP-10 outcome, in CAP-10 or in any capability relying on it, shows:

```typescript
interface Cap10OutcomeDisplay {
  outcome: string;                       // one of the five
  combinedFrom: string[];                // the decision identifiers, where more than one decider
  subject: Cap10AssessmentRequest["subject"];   // exact subject and version
  country: string;
  permittedUse: Cap10UseBoundary;        // the use stage, activities, routes, crops, site types, environment, populations
  maximumExposure: { rate?: string; frequency?: string; quantity?: string };
  conditions: string[];
  stopConditions: string[];
  evidenceCutoff: string;                // the dossier's cutoffAt
  expiry: string;
  currency: { validity: string; currency: string; derivedAt: string };
  unresolvedLimitations: string[];
  conclusion: string;
  statement: "This is not general safety certification or regulatory approval. It applies only to the subject, version, country, use and conditions shown, until the expiry shown, while it remains valid and current.";
}
```

## The deciders

**Qualification.** An `ASSESSOR_QUALIFICATION` record, submitted by the person, written once, and reviewed:

```typescript
interface Cap10AssessorQualification {
  recordId: string;
  recordVersion: number;
  recordKind: "ASSESSOR_QUALIFICATION";
  schemaVersion: "urn:aab:schema:agr:cap-10:assessor-qualification:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  person: ActorReference;                // the person, resolved by the platform
  countryMembership: string;             // as resolved from the person's grant
  institutions: Array<{ organizationId: string; role: string }>;
  qualifications: Array<{ kind: "DEGREE" | "PROFESSIONAL_REGISTRATION" | "RECOGNISED_COMPETENCE" | "OTHER"; issuer: string; reference: string; awardedAt?: string; validUntil?: string }>;
  disciplines: Array<
    | "HUMAN_TOXICOLOGY" | "OCCUPATIONAL_HEALTH" | "ECOTOXICOLOGY" | "ECOLOGY" | "PLANT_PATHOLOGY_AND_PHYTOTOXICITY"
    | "SOIL_SCIENCE" | "WATER_QUALITY" | "BIOSECURITY" | "MICROBIOLOGY" | "VETERINARY_SCIENCE"
    | "FOOD_SAFETY_AND_RESIDUES" | "ANALYTICAL_CHEMISTRY" | "AGRONOMY" | "OTHER">;
  scope: { assessmentTypes: string[]; useStages: string[]; dimensions: string[] };   // what they may assess
  conflicts: Array<{ kind: "ORGANISATION" | "PRODUCT" | "COMMERCIAL_INTEREST" | "OTHER"; description: string }>;
  recordDigest: string;
}
```

- **A `SAFETY_GOVERNOR` reviews it** (`ASSESSOR_QUALIFICATION_REVIEW`: `APPROVE`, `REJECT`, `MORE_INFORMATION_NEEDED`), never the person themselves. The reasoning addresses each qualification and each declared conflict. **Lapse: 24 months,** or the earliest `validUntil` of a qualification it relies on.
- **A `SAFETY_ASSESSOR` grant has effect only within a valid, current approval,** and only for its scope. A grant with no approval permits nothing.
- **Coverage.** Every applicable dimension of a dossier must fall within the `scope.dimensions` of at least one decider whose outcome is affirmative. **A toxicologist is not thereby an ecological assessor; an agronomist is not thereby a human toxicology assessor.** Otherwise: `DECIDER_NOT_QUALIFIED`.
- **Qualification evidence is declared, by issuer and reference,** and not stored in this version ("Open gaps").

**Independence.** Beyond AAB-PLATFORM-08's rules (never the dossier's requester, never the submitter of any member), **a decider is never:**
- the curator, author or reviewer of any version of the subject in CAP-06 or CAP-07, or the proposer of the CAP-01 record screened;
- for a `CONTROLLED_FIELD_TRIAL` use, the designer of any trial relying on the outcome, or the scientist who activated it;
- a person with a declared conflict touching the subject, in their qualification or their decision.

**More than one decider** (AAB-PLATFORM-08, section 7). **A `ROUTINE` dossier needs one decision. An `ELEVATED` dossier needs two:**
- **two `SAFETY_ASSESSMENT` decisions** by independent, qualified assessors (independent of each other: not the same institution, unless the country's policy allows it, disclosed); **or**
- **one `SAFETY_ASSESSMENT` and one `SPECIALIST_CONCURRENCE`,** a decision by a qualified assessor limited to named dimensions within their discipline, with the outcomes `CONCUR` or `DO_NOT_CONCUR` and their own conditions.

**The combined outcome is derived when read, most restrictive first:** any `NOT_ACCEPTABLE_WITHIN_BOUNDARY` or `DO_NOT_CONCUR` gives `NOT_ACCEPTABLE_WITHIN_BOUNDARY`; otherwise any `DEFERRED_EVIDENCE_REQUIRED` gives that; otherwise any `ASSESSED_ACCEPTABLE_WITH_CONDITIONS` gives that, **with the union of all conditions and stop conditions,** and the earliest expiry; otherwise the affirmative outcome. **Until the required number is reached, the combined outcome is `DEFERRED_EVIDENCE_REQUIRED`,** shown as awaiting a second decider. **A dissent is never removed.**

**Challenge:** a `SAFETY_ASSESSOR` other than the decider, or the request's requester. Resolved by a `CHALLENGE_RESOLUTION`, by a qualified `SAFETY_ASSESSOR` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-10. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** While a challenge to an affirmative decision is open, nothing may rely on it.

## Protected information

**Every field of a CAP-10 record carries a visibility class,** set by the schema or declared at submission, and checked at admission.

| Class | What it holds | Who sees it |
|---|---|---|
| `SUMMARY` | That an outcome or a hold exists; the display block's conclusion, use, conditions and expiry; a signal's material, trial, severity and required actions | Everyone the record is shown to: `SAFETY_READER`, and the readers of the capability relying on it |
| `RESTRICTED_TECHNICAL` | A dossier; an assessment's technical basis and dimension findings; a signal's description and linked observations | `SAFETY_ASSESSOR`s and `SAFETY_GOVERNOR`s, and the subject's requester |
| `PROTECTED_COMMERCIAL` | Composition, concentrations, manufacturing process, impurities, batch information | Only holders of a current CAP-07 composition access grant for the subject, or a CAP-07 role |
| `PROTECTED_PERSONAL` | Health information, the identity of affected or exposed people, exact locations, photographs showing people, property details | Only the assessors handling the signal or assessment, and the `SAFETY_GOVERNOR`, for that purpose |
| `REGULATOR_COMMUNICATION` | Correspondence with a regulator, and external notification references | `SAFETY_GOVERNOR`s, and the assessor who made the notification |

- **Access to a protected class is purpose-bound.** Every read of a `PROTECTED_*` or `REGULATOR_COMMUNICATION` field records who, when and for what purpose. It is never returned by a search or a list; only by reading the one record, for a stated purpose.
- **Notifications and holds carry `SUMMARY` only.** Being told of a hold never shows the report behind it.
- **Redaction is derived when read:** the same record shown to two people shows each only the classes they may see, and says what was withheld.
- **A conclusion must be written to stand in `SUMMARY`:** a decision whose conclusion contains protected content is refused (`REASONING_INCOMPLETE`).

## Currency

**A `SAFETY_ASSESSMENT` is relied on only while its combined outcome is `VALID` and `CURRENT`** (AAB-PLATFORM-08), within its expiry.

**Triggers** (every platform change kind is a trigger):
- the eight change kinds of AAB-PLATFORM-07 over the dossier's snapshot, `EVALUATION_SUPERSEDED` and `RULES_VERSION_CHANGED`;
- **CAP-10 adds:** a new version of the subject, or of any component of a formulation subject; **a safety signal on the subject entering `PRECAUTIONARY_HOLD`, `SUBSTANTIATED` or `INCONCLUSIVE_EVIDENCE_REQUIRED`;** a new admitted CAP-04 record linked to the subject in CAP-06 or CAP-07 for `SAFETY` or `HANDLING`; a CAP-09 promotion of an `ADVERSE_EFFECT` claim naming the subject among its materials; the country's safety policy superseded; for a registered product use, a new version of the declared registration.

**Lapse:** `reliableUntil` is the decision's expiry, set once: **the earliest of** the assessor's expiry, the country policy's maximum, and **the platform ceiling of 24 months** (pilot position). Where two deciders set different expiries, the earliest applies.

**Reopening.** A trigger makes the assessment `POTENTIALLY_STALE` at once. **Nothing can rely on it again until a new dossier is assessed;** a request may be versioned or reused for that. A lapse caused by a safety signal or a negative outcome is **safety-driven**, and places a precautionary hold on what relied on it ("Safety signals", `CR-06`); a lapse by time, or by a new version of the subject, is **administrative**, and places none, and is disclosed (CAP-08's amendment of 2026-10-02, point 7).

## Safety signals

**A safety signal is a report that harm, contamination, a biosecurity risk or a health risk may have occurred or may occur** from a material in a CAP-08 trial, a CAP-01 handling activity, or a subject of CAP-10. It is a record, `SAFETY_SIGNAL`, written once:

```typescript
interface Cap10SafetySignal {
  recordId: string;
  recordVersion: number;
  recordKind: "SAFETY_SIGNAL";
  schemaVersion: "urn:aab:schema:agr:cap-10:safety-signal:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  channel: "CAP08_OBSERVATION" | "CAP08_ADVERSE_EVENT" | "DIRECT_REPORT" | "MACHINE_GENERATED" | "EXTERNAL_REPORT_RECORDED";
  source?: { capability: "CAP-08" | "CAP-01"; recordId: string; recordVersion: number };
  concerns: {
    kind: "TRIAL" | "HANDLING" | "SUBJECT";
    trialId?: string;                    // TRIAL
    armCodes?: string[];                 // TRIAL
    assessmentDecisionId?: string;       // HANDLING: the hazard screen relied on
    subject?: Cap10AssessmentRequest["subject"];   // SUBJECT
  };
  material?: Cap10AssessmentRequest["subject"];

  signalKind: "HUMAN_HEALTH" | "ANIMAL_HEALTH" | "CROP_HARM" | "SOIL" | "WATER" | "NON_TARGET_ORGANISMS" | "CONTAMINATION" | "BIOSECURITY" | "OTHER";
  severity: "CRITICAL" | "SERIOUS" | "MATERIAL" | "LOWER";   // as reported; changed only by a triage decision

  // Structured facts read by the critical rules: declared, never inferred
  criticalFacts: {
    personNeededMedicalTreatment: boolean;
    animalDeathOrSevereIllness: boolean;
    suspectedReleaseOfLiveOrganism: boolean;
    drinkingWaterSourceAffected: boolean;
  };

  description: string;                   // RESTRICTED_TECHNICAL
  affectedPeople?: string;               // PROTECTED_PERSONAL
  location?: LocationReference;          // PROTECTED_PERSONAL
  attachments: string[];                 // references held by the source capability (CAP-08 trial photographs)

  // Machine-generated only
  machine?: { producer: string; ruleOrModelVersion: string; inputs: string[]; explanation: string };

  recordDigest: string;
}
```

**Who may report.** A `SAFETY_REPORTER`; any holder of a CAP-08 role on the trial concerned; any holder of a CAP-01 role for a hazard-screened handling activity; and CAP-08 itself, which writes a signal **in the same transaction** as any observation or field event it holds with `SAFETY_SIGNAL` (CAP-08's amendment of 2026-10-02). A report from outside AAB is recorded by a `SAFETY_ASSESSOR` or `SAFETY_GOVERNOR` as `EXTERNAL_REPORT_RECORDED`, naming who reported it.

**A credible human-declared signal** is one reported by an authenticated, authorised person under the paragraph above, in their own name, through `CAP08_OBSERVATION`, `CAP08_ADVERSE_EVENT` or `DIRECT_REPORT`. Credibility here is about who reports and how, **never a judgement of whether the harm happened:** that is the determination.

**Admission:** every signal is admitted and **quarantined at once,** in one transaction. It is never evidence until it, or what it rests on, is admitted in CAP-04. **It is never refused for being incomplete:** a signal with missing fields is quarantined with the gaps listed. It is refused only for no authenticated reporter (`UNAUTHENTICATED`) or a reporter with no role (`ROLE_NOT_AUTHORISED`), and even then the attempt is logged.

### The lifecycle

**A signal's status is derived when read** from its records and decisions, the latest in this order:

| Status | Entered by |
|---|---|
| `REPORTED` | The report is written (shown in its history; admission follows in the same transaction) |
| `QUARANTINED` | Admission, at once: the report is preserved, protected and not evidence |
| `TRIAGE_REQUIRED` | Admission, when no hold applies: awaiting a qualified triage within the severity's period |
| `PRECAUTIONARY_HOLD` | Admission, or a later rule or decision, when a hold applies: awaiting triage, with application or handling held |
| `UNDER_ASSESSMENT` | A `SIGNAL_TRIAGE` decision: a qualified assessor has taken it on |
| `SUBSTANTIATED` | A `SIGNAL_DETERMINATION`: the harm or risk is found to have occurred, or to be real, on the evidence |
| `NOT_SUBSTANTIATED` | A `SIGNAL_DETERMINATION`: on the evidence, it is found not to have occurred |
| `INCONCLUSIVE_EVIDENCE_REQUIRED` | A `SIGNAL_DETERMINATION`: the evidence does not decide it; the reasoning names what is needed |
| `CLOSED_WITH_ACTION` | A `SIGNAL_CLOSURE`, naming every direction issued |
| `CLOSED_NO_ACTION` | A `SIGNAL_CLOSURE`, with reasons |

- **Whether a hold is in force is shown beside the status, always,** whatever the status.
- **`INCONCLUSIVE_EVIDENCE_REQUIRED` may return to `UNDER_ASSESSMENT`** with new evidence, and be determined again. Each determination supersedes the last; none is removed.
- **A closed signal stays on the record,** with its report, its triage, its determinations, its directions and its closure. **`NOT_SUBSTANTIATED` and `CLOSED_NO_ACTION` never remove or hide a signal,** and it remains a finding in every later dossier on the subject.
- **A signal is never deleted, edited or merged.** A correction is a new version; a duplicate is linked, and both stay.

### The precautionary hold

**A hold is a recorded, notified, attributable restriction:** no further application of the material in the trials it names, or no further handling under the hazard screen it names. **Recording observations continues,** because harm must still be observed. **AAB cannot physically prevent an application;** an application made in breach of a hold is recorded in CAP-08 as a `PROTOCOL_DEVIATION`, and disclosed.

**A hold is placed automatically, at admission or when a rule fires** (`PRECAUTIONARY_HOLD`, a system record naming its basis):
- **`HUMAN_DECLARED`:** every credible human-declared signal concerning a trial or a handling activity. **Scope:** the trial or handling activity concerned.
- **The critical rules** (rules version `cap-10-critical-rules-1`), deterministic over declared structured facts and admitted values, each naming its rule, inputs and reason:

| Rule | Fires when | Scope of the hold |
|---|---|---|
| `CR-01` | `personNeededMedicalTreatment` is true | Every active trial and handling activity in the country workspace using the same material version |
| `CR-02` | `animalDeathOrSevereIllness` is true | As `CR-01` |
| `CR-03` | `suspectedReleaseOfLiveOrganism` is true | As `CR-01` |
| `CR-04` | `drinkingWaterSourceAffected` is true | As `CR-01` |
| `CR-05` | An admitted CAP-08 observation crosses a stop condition of the outcome relied on | The trial concerned |
| `CR-06` | An outcome relied on becomes `INVALIDATED`, or `POTENTIALLY_STALE` by a safety-driven trigger, or is superseded by `NOT_ACCEPTABLE_WITHIN_BOUNDARY` | Every active trial and handling activity relying on it |
| `CR-07` | A signal is reported `CRITICAL` | As `CR-01` |

- **The critical rules apply to every channel,** including `EXTERNAL_REPORT_RECORDED` and `MACHINE_GENERATED`. **They read only declared facts and admitted values;** no rule interprets free text, an image, or a model's judgement.
- **A rule-placed hold is temporary in this sense only:** it must be reviewed by a qualified person within the triage period. **It is never released by time.** An overdue review is escalated to the `SAFETY_GOVERNOR`, and shown as overdue on every read.
- **A hold is released only by a `HOLD_RELEASE` decision** of a qualified `SAFETY_ASSESSOR`, with reasons, by someone who did not report the signal. **A hold placed by `CR-01` to `CR-04` or `CR-07`, or on a signal `SUBSTANTIATED` or `INCONCLUSIVE_EVIDENCE_REQUIRED`, needs two releases,** by independent qualified assessors, under the same rule as an elevated assessment.
- **A hold never authorises anything,** and its release authorises only a return to what was permitted before it.

### Severity, notification and triage

| Severity | Notification | Initial qualified triage | Pilot default where the country's policy sets none |
|---|---|---|---|
| `CRITICAL`: immediate danger to people, animals or the environment | **Immediate** | As soon as operationally possible, with escalation | Escalated to the `SAFETY_GOVERNOR` at once |
| `SERIOUS`: urgent | **Immediate** | Within a short period the country defines | 4 hours |
| `MATERIAL`: not immediate | Prompt | Within 24 hours | 24 hours |
| `LOWER` | Recorded notification | Within 72 hours | 72 hours |

- **The country's policy may shorten these periods, never lengthen them** (decision 21). They are AAB's internal triage periods, **never statutory deadlines.**
- **Who is notified** is the country policy's list for the severity, and always includes: for a trial, its designers, the activating scientist, its recorders and reviewers, and the landholder's declared contact; for a handling activity, its requester and the people handling under it; and the country's safety contact. **A notification carries `SUMMARY` only.** Each notified person's acknowledgement is recorded, with its time.
- **Severity is the reporter's at first.** A critical rule may raise it. A triage decision may change it, with reasons; **lowering it never releases a hold by itself.**
- **External notification.** The country's policy names the statutory or institutional notifications required, by signal kind and severity, with their deadlines. **AAB invents none.** For each, CAP-10 records an `EXTERNAL_NOTIFICATION`: whether it was made, by whom, under what authority, to whom, when, and with what reference (`REGULATOR_COMMUNICATION`). One required and not recorded is shown as outstanding on every read.
- **Delivering a notification** is the job of the country's internal messaging (`governance/AAB-COUNTRY-LOCAL-INTERNAL-MESSAGING-ARCHITECTURE-2026-09-13.md`). CAP-10 defines the obligation, the content and the acknowledgement; delivery has no contract yet ("Open gaps").

### Triage, determination, directions and closure

| Decision kind | By | Outcomes |
|---|---|---|
| `SIGNAL_TRIAGE` | A qualified `SAFETY_ASSESSOR`, not the reporter | `TAKE_ON`, with the severity confirmed or changed, and the hold kept, placed or released (a release follows the hold rules); `LINK_AS_DUPLICATE` |
| `SIGNAL_DETERMINATION` | A qualified `SAFETY_ASSESSOR`, not the reporter; two for `CRITICAL` or `SERIOUS` | `SUBSTANTIATED`, `NOT_SUBSTANTIATED`, `INCONCLUSIVE_EVIDENCE_REQUIRED` |
| `SAFETY_DIRECTION` | A qualified `SAFETY_ASSESSOR` | `APPLICATION_SUSPENDED`, `TRIAL_STOP_REQUIRED`, `HANDLING_SUSPENDED`, `CONDITIONS_ADDED`, `ASSESSMENT_REOPENED`, `DIRECTION_LIFTED` |
| `HOLD_RELEASE` | One or two qualified `SAFETY_ASSESSOR`s, as above | Released |
| `SIGNAL_CLOSURE` | A qualified `SAFETY_ASSESSOR`, not the reporter | `CLOSED_WITH_ACTION`, `CLOSED_NO_ACTION` |

- **A determination may rest only on admitted evidence;** the report itself, and anything not yet admitted, is shown and preserved, and is never the sole basis of `SUBSTANTIATED` or `NOT_SUBSTANTIATED`. Where the evidence has not been admitted, the determination is `INCONCLUSIVE_EVIDENCE_REQUIRED`, and the hold stays.
- **Directions are what CAP-08 and CAP-01 read.** `APPLICATION_SUSPENDED` holds application until lifted; `TRIAL_STOP_REQUIRED` means the trial may not apply the material again, and CAP-08 may close it only as `TERMINATED_EARLY` or `ABANDONED`; `HANDLING_SUSPENDED` holds handling under a screen; `CONDITIONS_ADDED` adds conditions to an outcome relied on; `ASSESSMENT_REOPENED` makes an outcome `POTENTIALLY_STALE`. **Who closes a trial is still CAP-08's `TRIAL_REVIEWER`;** CAP-10 says only what the closure may be.
- **A signal is closed only when no hold is in force, every direction has been issued or declined with reasons, and every required external notification is recorded.**
- **What the hold, the directions and the closure mean is always shown in `SUMMARY`;** why is shown in `RESTRICTED_TECHNICAL` and the protected classes.

## Machine-generated signals and brain governance

**CAP-10 cites the platform's observation and brain governance, the domain register and cognitive architecture, and the non-return boundary as binding.**
- **No brain assesses, determines or closes anything in CAP-10.** Assessments, triage, determinations, directions, releases and closures are human decisions.
- **A machine-generated signal** (`channel: MACHINE_GENERATED`) is accepted only from a capability whose contract names CAP-10 as a recipient; **no such capability is contracted in this version** (the Evidence Watch candidate, proposed CAP-35, is the intended one). It is labelled `MACHINE_GENERATED`, linked to its inputs, versioned and supersedable, and **creates a prioritised `TRIAGE_REQUIRED` item.** It places a hold only through the critical rules, on declared facts.
- **A machine signal alone never produces `SUBSTANTIATED`, `NOT_SUBSTANTIATED`, an assessment outcome, a release, or a closure;** it never resolves a contradiction, and never terminates a trial.
- **Uncertainty and missing evidence restrict; they never authorise.** No automated output ever relaxes a hold, a condition or an outcome.
- **The dossier is automated output,** labelled `MACHINE_GENERATED`, linked through its snapshot, reproducible, and separate from any person's decision. **It is arithmetic, not reasoning.** The critical rules are deterministic and published with their version.
- **Brains may read CAP-10's outcomes** with their display block, for the purposes the brain governance allows, and never as a statement that anything is safe.

## Ecological knowledge and the Ecosystem domain

**CAP-10 owns the governed safety assessment workflow and its decisions. It does not own ecological knowledge** (decision 22). The planned Ecosystem domain (the domain register, section 3, whose boundary with Environment is open, section 22) and any other domain supply governed evidence, admitted in CAP-04 or, once contracted, as their own governed evidence packets, which CAP-10 cites. **The direction is one way:** specialist domain evidence, then a CAP-10 assessment, then a bounded human decision. CAP-10's assessments are not an ecological knowledge base, and are never promoted as such.

## The country's safety policy

**A `COUNTRY_SAFETY_POLICY` record,** written once and superseded, approved by a `SAFETY_GOVERNOR` (`COUNTRY_SAFETY_POLICY_APPROVAL`), states:
- the maximum validity of an assessment, at most the platform ceiling;
- additional mandatory dimensions, and country dimensions;
- triage periods, at most the pilot defaults;
- the notification lists by severity, and the country's safety contact;
- the external notifications required, by signal kind and severity, with their statutory or institutional deadlines and authorities;
- whether two assessors from one institution may decide an elevated assessment.

**Admission refuses a policy that relaxes any platform floor** (`POLICY_BELOW_PLATFORM_FLOOR`). Until a country has a policy, the platform floors and pilot defaults apply, and every outcome discloses `COUNTRY_SAFETY_POLICY_NOT_DEFINED`.

## How other capabilities rely on CAP-10

Each is defined in that capability's amendment of 2026-10-02; in summary:

| Capability | Relies on CAP-10 for |
|---|---|
| CAP-01 | **Nothing is required.** A hazard screen of a resource or waste stream, for sampling, collection, transport or laboratory handling, is shown on its records and dossiers, or `HAZARD_SCREEN_NOT_PERFORMED`; it never gates. **Discovery and referral are unchanged:** a screen never assesses a resource as an ingredient, and every referral still carries `SAFETY_ECOLOGY_NOT_ASSESSED` |
| CAP-06, CAP-07 | **Optional** at acceptance: a valid, current affirmative outcome on the version replaces `SAFETY_ECOLOGY_NOT_ASSESSED` with `SAFETY_ECOLOGY_ASSESSED_WITHIN_BOUNDARY` and the display block. **A negative outcome covering research handling refuses acceptance,** whatever the declared basis. CAP-07 grants composition access |
| CAP-08 | **Required** at activation for every applied material, except a registered product used exactly within its registration; holds, directions and signal states read into the trial's state; `SAFETY_SIGNAL` writes a CAP-10 signal |
| CAP-09 | **Nothing new is relied on.** `SAFETY_ECOLOGY_NOT_ASSESSED` stays on every learning claim, because a claim is never a CAP-10 subject. A promoted `ADVERSE_EFFECT` claim is a currency trigger in CAP-10 |

**A capability relying on CAP-10 derives the outcome's validity and currency in the same consistent read as its own write,** and records the decision identifiers it relied on.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-10 |
|---|---|
| Scope rules; selection policies | `cap-10-dossier-scope` v1; `ALL_ADMITTED` v1, `REQUESTER_LISTED`, quarantined `EXCLUDE`, disclosed |
| Pinned inputs; integrity re-check; empty snapshot | The subject, its acceptance, the policy, the signals, and a formulation's components; not required, disclosed; **an empty snapshot is allowed,** and gives every applicable dimension `EVIDENCE_REQUIRED` |
| Evaluator and rules versioning; non-reproducible fields | `cap-10-dossier-rules-1`, `cap-10-dimensions-1`, `cap-10-critical-rules-1`; `evaluatedAt` |
| Existing evaluations and decisions | **None.** The rehearsal's gate rows, scores and bands are not mapped |
| Decision kinds, roles | `SAFETY_ASSESSMENT`, `SPECIALIST_CONCURRENCE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_SAFETY_POLICY_APPROVAL`, `CAP10_HELD_RESOLUTION`, `SIGNAL_TRIAGE`, `SIGNAL_DETERMINATION`, `SAFETY_DIRECTION`, `HOLD_RELEASE`, `SIGNAL_CLOSURE`, `CHALLENGE_RESOLUTION` |
| Separation of duties beyond the platform's | "The deciders": the subject's curators, authors and reviewers; the trial's designer and activator; declared conflicts; the reporter of a signal |
| Findings a decision must address | Every gap, conflict and not-applicable claim; every condition; the boundary, uncertainty and tier |
| More than one decider | `ELEVATED` assessments; determinations of `CRITICAL` and `SERIOUS` signals; releases of the holds named above. **Combining rule:** most restrictive first; dissent kept |
| Challenging role | `SAFETY_ASSESSOR` other than the decider, or the requester |
| Triggers and lapse | All ten platform change kinds, and CAP-10's own ("Currency"); the earliest of the assessor's expiry, the policy maximum and 24 months |
| What relies on reviews | CAP-01 handling, CAP-06 and CAP-07 acceptance, CAP-08 activation, each in the same read as its own write |

## Authority

| Role | May |
|---|---|
| `SAFETY_REQUESTER` | Submit assessment requests and new versions; request dossiers |
| `SAFETY_REPORTER` | Report safety signals |
| `SAFETY_ASSESSOR` | **Within a valid, current qualification only:** assess dossiers; give specialist concurrence; triage, determine and close signals; issue directions; release holds; record external reports and notifications; challenge and resolve challenges |
| `SAFETY_GOVERNOR` | Review qualifications; approve the country's safety policy; resolve held records; receive escalations; record external notifications |
| `SAFETY_READER` | Read, in `SUMMARY` and `RESTRICTED_TECHNICAL` where their duty requires |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **A `SAFETY_GOVERNOR` never reviews their own qualification.** A governor who also holds a qualification may assess, under the same rules as any assessor, and never reviews the qualification of another decider on the same dossier.
- **Every actor is `HUMAN`,** in their own name, except the system records named in this contract (a hold placed by a rule, a machine-generated signal). **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP10_RECORD_ADMISSION` | A request, qualification, policy or signal is held or admitted |
| `CAP10_HELD_RESOLUTION` | A held record is resolved |
| `SAFETY_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `SAFETY_ASSESSMENT`, `SPECIALIST_CONCURRENCE` | A dossier is assessed |
| `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_SAFETY_POLICY_APPROVAL` | A qualification or policy is reviewed |
| `PRECAUTIONARY_HOLD_PLACED` | A hold is placed, by a person's report or a rule |
| `SIGNAL_TRIAGE`, `SIGNAL_DETERMINATION`, `SAFETY_DIRECTION`, `HOLD_RELEASE`, `SIGNAL_CLOSURE` | Each is decided |
| `NOTIFICATION_ACKNOWLEDGED`, `EXTERNAL_NOTIFICATION_RECORDED` | Each is recorded |
| `CAP10_DECISION_CHALLENGE`, `CAP10_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |
| `PROTECTED_FIELD_READ` | A protected field is read, with its purpose |

Receipts carry `capabilityId: "CAP-10"`.

| Operation | Route |
|---|---|
| `submitRequest`, `getRequest`, `listRequests` | `POST /agr/v1/safety-assessment-requests`; `GET …/:recordId`, with its state derived; `GET /agr/v1/safety-assessment-requests?subject=&stage=&…` |
| `requestDossier`, `getDossier` | `POST /agr/v1/safety-dossiers`; `GET …/:evaluationId` |
| `assessDossier`, `concurOnDossier` | `POST /agr/v1/safety-dossiers/:evaluationId/assessments`; `…/concurrences` |
| `getOutcome` | `GET /agr/v1/safety-outcomes?subject=&version=&stage=`: the combined outcome, with its display block and currency |
| `submitQualification`, `reviewQualification` | `POST /agr/v1/assessor-qualifications`; `…/:recordId/reviews` |
| `submitPolicy`, `approvePolicy`, `getPolicy` | `POST /agr/v1/country-safety-policies`; `…/:recordId/approvals`; `GET /agr/v1/country-safety-policies/current` |
| `reportSignal`, `getSignal`, `listSignals` | `POST /agr/v1/safety-signals`; `GET …/:recordId`, with its status and hold derived; `GET /agr/v1/safety-signals?status=&severity=&…` (`SUMMARY` only) |
| `triageSignal`, `determineSignal`, `issueDirection`, `releaseHold`, `closeSignal` | `POST /agr/v1/safety-signals/:recordId/triage`, `…/determinations`, `…/directions`, `…/hold-releases`, `…/closures` |
| `acknowledgeNotification`, `recordExternalNotification` | `POST /agr/v1/safety-signals/:recordId/acknowledgements`; `…/external-notifications` |
| `resolveHeldRecord` | `POST /agr/v1/safety/held-resolutions` |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/safety/challenges`; `…/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`, except `reportSignal`, which accepts one and **never refuses a report for lacking one.** **States are derived when read.**

## Failure contract

```typescript
interface Cap10Failure {
  ok: false;
  capabilityId: "CAP-10";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "SUBJECT_NOT_FOUND"
    | "USE_STAGE_NOT_PERMITTED"
    | "BOUNDARY_INCOMPLETE"
    | "DIMENSIONS_INCOMPLETE"
    | "EVIDENCE_NOT_ADMITTED"
    | "SUPERSESSION_NOT_PERMITTED"
    | "POLICY_BELOW_PLATFORM_FLOOR"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "RECORD_NOT_FOUND"
    | "DOSSIER_NOT_FOUND"
    | "SIGNAL_NOT_FOUND"
    | "DECIDER_NOT_QUALIFIED"
    | "DECIDER_NOT_INDEPENDENT"
    | "REASONING_INCOMPLETE"
    | "BINDING_MISMATCH"
    | "DECISION_SIGNATURE_INVALID"
    | "DECISION_NOT_PERMITTED"
    | "HOLD_RELEASE_NOT_PERMITTED"
    | "SIGNAL_NOT_CLOSABLE"
    | "PURPOSE_REQUIRED"
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
| `SUBJECT_NOT_FOUND` | 422 | The subject is not current, not in the country workspace, or of a kind the type does not take |
| `USE_STAGE_NOT_PERMITTED` | 422 | The use stage is not one the type and subject may take |
| `BOUNDARY_INCOMPLETE` | 422 | A boundary field the use stage requires is missing |
| `DIMENSIONS_INCOMPLETE` | 422 | A core or required dimension is not declared, or a not-applicable claim has no reason |
| `EVIDENCE_NOT_ADMITTED` | 422 | A citation is not admitted, not current, or not readable for the purpose |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or of another kind |
| `POLICY_BELOW_PLATFORM_FLOOR` | 422 | A country policy relaxes a platform floor |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND`, `SIGNAL_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_QUALIFIED` | 403 | No valid, current qualification, or an applicable dimension outside every decider's scope |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, claim, condition or disclosure is not addressed, or a conclusion holds protected content |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | An outcome the rules refuse ("The assessment, and what it permits") |
| `HOLD_RELEASE_NOT_PERMITTED` | 409 | A release by the reporter, or a single release where two are required |
| `SIGNAL_NOT_CLOSABLE` | 409 | A hold in force, a direction undecided, or a required external notification not recorded |
| `PURPOSE_REQUIRED` | 403 | A protected field read without a stated purpose, or by a list or search |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, CAP-01, CAP-06, CAP-07, CAP-08, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service. **A safety signal is never lost to a failure:** if it cannot be written, the reporter is told so, and the attempt is logged.

## Dependencies

| Capability | How CAP-10 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every citation is an admitted CAP-04 record, read for the purpose `SAFETY_ASSESSMENT` | `designed`; built first |
| CAP-06 Ingredient Intelligence | **Subjects:** ingredient and candidate versions. **Relies on** CAP-10 at acceptance, optionally | `designed`; amended 2026-10-02 |
| CAP-07 Formulation Intelligence | **Subjects:** formulation versions; **grants composition access.** Relies on CAP-10 at acceptance, optionally | `designed`; amended 2026-10-02 |
| CAP-08 Controlled Trials & Outcomes | **Relies on** CAP-10 at activation; **writes signals**; reads holds and directions | `designed`; amended 2026-10-02 |
| CAP-01 Country Intelligence & Discovery | **Subjects of hazard screens:** resources and waste streams | `designed`; amended 2026-10-02 |
| CAP-09 Governed Scientific Learning | **A currency trigger:** a promoted adverse effect | `designed`; amended 2026-10-02 |
| CAP-11 Regulatory Intelligence | **Owns regulatory status.** CAP-10 never assesses it | `named only` |
| The planned Ecosystem domain | **Supplies ecological evidence** | planned |
| The Evidence Watch candidate (proposed CAP-35) | **Would send machine-generated signals.** Until it is contracted, none is accepted | candidate |
| The country's tenancy and participation (CAP-16, CAP-24) | **The workspace, the institutions, the people who hold the roles, and the landholders notified** | `named only` |

## Open gaps

**Contract gap: storing originals.** Qualification evidence, signal attachments from outside a trial, and regulator correspondence are declared by reference, not stored. Storing them needs AAB-PLATFORM-01's AGR profile to name CAP-10 uploaders, and protected-class storage rules: a separate amendment.

**Contract gap: delivering notifications.** CAP-10 defines who must be told, what, and the acknowledgement. Delivery, by the country's internal messaging, and what happens when a notified person cannot be reached, are not defined.

**Contract gap: boundary matching.** Crops, routes, site types, environments and units are declared strings. A governed vocabulary, unit conversion, and matching a trial's use against a boundary automatically are not defined; until they are, CAP-08 matches exactly and a person addresses each element by name.

**Contract gap: qualifying the qualifiers.** A `SAFETY_GOVERNOR` is a scoped grant; who may hold it, and how a country's institutions appoint one, is CAP-24's and the country's to define.

**Contract gap: reports from people without a role.** Farmers, landholders and neighbours who are not actors cannot report directly; a person with a role records their report. How they report, and are told, is proposed CAP-36's and CAP-24's.

**Contract gap: CAP-11.** Regulatory status is not assessed by anyone until CAP-11 exists. `REGULATORY_STATUS_NOT_ASSESSED` stays on every outcome.

**Contract gap: material outside AAB's governed records.** A material of the kind `OTHER` in CAP-08 cannot be activated (CAP-08's amendment); it must first be registered in CAP-06, or be a registered product.

**Contract gap: sharing safety findings beyond the country.** A substantiated signal may matter to other countries using the same material. Sharing it is a future explicit process under the non-return boundary, not defined here.

**Contract gap: the Ecosystem domain.** Its evidence packets, and their admission, are not yet contracted. Until they are, ecological evidence reaches CAP-10 only through CAP-04.

**Platform gap: an invalidated admission,** as in CAP-01 and CAP-04 to CAP-09. A cited record whose admission is invalidated by an upheld challenge does not yet trigger staleness.

**Current system limit: no implementation.** Nothing of CAP-10 is built. **Until it is, every capability keeps `SAFETY_ECOLOGY_NOT_ASSESSED`,** because no assessment this contract defines can yet be cited.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any material, use, formulation or trial is safe, and it does not remove `SAFETY_ECOLOGY_NOT_ASSESSED` from anything: only a valid, current assessment it defines can do that, for its subject, version, country and use.
- It is not general safety certification, and authorises no one to present a CAP-10 outcome as one, or as a regulatory approval, a recommendation or advice.
- It does not define statutory obligations: each country's law and regulators do.
- It does not define CAP-11, or what CAP-04 admits.
- It does not make CAP-10 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-10: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
