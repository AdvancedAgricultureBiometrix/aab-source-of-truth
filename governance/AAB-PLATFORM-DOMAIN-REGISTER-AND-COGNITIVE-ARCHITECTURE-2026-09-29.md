# AAB Platform Governance — Domain Register and Cognitive Architecture

**Document:** AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29  
**Internal reference:** AAB-GOV-DEC-DOMAIN-COGNITIVE-01  
**Status:** APPROVED — reviewed and approved in governance session 2026-09-30  
**Type:** Platform-wide governance architecture  
**Applies to:** every AAB domain, every AAB brain and reasoning service, CAP-01, CAP-04, CAP-05, CAP-06, CAP-07, CAP-08, CAP-09, CAP-31, CAP-32, CAP-33, CAP-35 (candidate), CAP-36 (proposed)  
**Supplements:** governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md (AAB-GOV-DEC-OBSERVATION-BRAIN-01); governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md; governance/AAB-COUNTRY-SCIENTIFIC-DATA-NON-RETURN-BOUNDARY-2026-09-13.md

---

## 1. Purpose

This document establishes:

1. the difference between AAB's independent knowledge domains and the capabilities that operate across them;
2. the domains AAB has planned, and the status each one honestly holds today;
3. how domains exchange knowledge without one absorbing another; and
4. AAB's cognitive architecture: specialist domain brains, a cross-domain coordinating brain, and the human governance above both.

It does not create an official domain register. Section 7 explains why.

---

## 2. The central distinction

A **domain** owns a body of canonical scientific (or governed operational) knowledge: its information, its rules, its evidence and its learning.

A **capability** is something AAB does. Many capabilities operate across domains. They do not own the subjects they work on.

Country Discovery, for example, may scan water, soil, climate, agriculture and environmental information. It is the entry capability. It does not own any of those scientific subjects.

Confusing the two would let a capability quietly become the owner of every domain it touches. This document exists to prevent that.

---

## 3. Planned AAB domains

These domains belong to the AAB architecture. They are not casual future ideas. With the exceptions stated, none is yet designed or admitted.

| Domain | Role | Status |
|---|---|---|
| **Agriculture** | Agricultural science. The current proving domain and the most developed implementation. Australia / Western Australia is the controlled demonstration context. | Proving domain. Recorded in the repository as AGR (Agricultural Science); its capabilities are being migrated from the WA rehearsal. |
| **Soil** | An independent scientific domain owning canonical soil knowledge and evidence. Not an Agriculture subsystem. | Planned |
| **Water** | Water resources, quality, availability, treatment and related scientific work. | Planned |
| **Climate** | Climate evidence, conditions, risks and projections. | Planned |
| **Environment** | Environmental science, impacts, restoration and monitoring. | Planned |
| **Ecosystem** | Ecosystem relationships, biodiversity and ecological outcomes. | Planned. Its boundary with Environment needs canonical confirmation. |
| **Aquaculture** | Aquatic production, health, inputs, environments and outcomes. | Planned |
| **Manufacturing** | The governed transfer of approved scientific developments into manufacturing specifications and processes. | Planned |
| **Regulatory** | Converts admitted evidence and approved outcomes into regulatory assessments, dossiers and jurisdiction-specific requirements. | Planned |
| **Commercial** | Approved catalogues, entitlements and controlled commercial availability. It never decides scientific truth. | Planned |
| **Governance** | Authority, review, admission, approval, audit, and institutional and country decision-making. | Planned |
| **Supply Chain Sovereignty (SCS)** | Provenance, supply-chain evidence and sovereignty requirements such as the EUDR. One part of AAB, not AAB's definition. | Current domain. Eight SCS capabilities are behaviourally proven for their minimum vertical slices. |

---

## 4. Potential future domains

These have been discussed as possible AAB domains. They are provisional until formally designed and admitted, and must not be presented as designed or admitted canonical domains:

- Environmental restoration
- Waste and resource recovery
- Minerals
- Public health
- Other country-priority scientific domains admitted through future governance

Environmental restoration may belong within the Environment domain rather than becoming a separate domain. That is a formal modelling decision still to be made.

---

## 5. What is not a separate domain

The following are major AAB capabilities. They operate across domains rather than being domains themselves:

- Country Discovery and country scanning
- Scientific evidence and provenance
- Scientific memory
- Agriculture Brains and other cognitive reasoning systems
- Evidence Watch
- Community and field observations
- Ingredient intelligence
- Formulation development
- Controlled trials
- Outcome evaluation
- Governed learning
- Identity and persisted authority
- Country and institution administration
- Commissioning and technical verification
- Notifications
- Audit and logging
- Deployment and sovereign infrastructure

Several of these already have AGR capability identifiers (CAP-01, CAP-04 to CAP-09) or platform-wide identifiers (for example CAP-16, CAP-17, CAP-23, CAP-24, CAP-30). This section classifies them as capabilities rather than domains. It does not reassign any identifier from AGR to the platform. Whether an AGR capability later becomes platform-wide is a separate decision.

---

## 6. How domains relate

1. **Each domain owns its canonical information and rules.** Its evidence, memory and learning are its own.
2. **A domain may consume another domain's approved outputs.** Agriculture may use approved outputs from Soil, Water, Climate or Environment. It must not quietly absorb their internal data or become their owner.
3. **Exchange happens through governed contracts and evidence references,** never by copying another domain's records.
4. **The dependency rule of the platform–domain separation record applies.** Domains depend on AAB platform primitives, never the reverse. A platform primitive must not depend on any domain's identifiers or vocabulary.

A simple example:

```
Soil establishes a governed soil assessment
        ↓
Climate provides admitted climate evidence
        ↓
Agriculture uses those approved outputs when analysing a crop problem or designing a trial
```

---

## 7. Status clarification: there is no official register yet

Earlier technical evidence indicated that AAB had 10 registered platform domains and 11 governed cognitive brains. That evidence does not match any registered database identifier to the descriptive names in sections 3 and 8.

### 7.1 The evidence

- **The count of brains.** `handovers/AAB-CANONICAL-SYSTEM-DEFINITION.md` records 11 registered cognitive brains at the Supabase checkpoint inspected on 30 August 2026. It records the count, not the names.
- **The snapshot holds no registry rows.** The WA rehearsal snapshot of 2026-09-28 is schema only. Its header states that it holds no rows, and its migration history omits the migration statements because some of them insert rows. The rows of `platform.domain_registry` and `cognitive_core.brain_registry` were therefore never captured. Everything below is read from table definitions and function code.

**The domain registry.**

- `platform.domain_registry` maps each registered domain to exactly one database schema (`database_schema_name` is unique).
- The rehearsal has ten non-public schemas: `agriculture`, `platform`, `country_core`, `cognitive_core`, `observation_core`, `regulatory_core`, `manufacturing_core`, `security_core`, `continuity_core` and `presentation_core`.
- Nine tables reference the registry: eight in `cognitive_core` and `platform.navigation_item`. No `agriculture` table references it.
- The only domain code written into that code is `AGRICULTURE`.
- Other domain-like codes in the schema belong to separate vocabularies that do not reference the registry: observation routing uses `COMMUNITY_INTAKE` and `ENVIRONMENT`, resource discovery uses `RESOURCE_RECOVERY` as a signal type, and `GLOBAL` is a scope value.

**The brain registry.**

- `cognitive_core.brain_registry` classifies brains by function, with the types `KERNEL`, `TARGET_BRAIN`, `DISCOVERY_BRAIN`, `ENGINE` and `DOMAIN_ADAPTER`.
- Brains form a parent–child hierarchy, and are linked to domains through `cognitive_core.domain_brain_inheritance`.
- Brains default to advisory only, scientist authority required, and no autonomous approval.
- Separately, the `agriculture` schema restricts the brains that may contribute to a resource discovery to nine codes: `COUNTRY_RESOURCE`, `RESOURCE_RECOVERY`, `ENVIRONMENTAL_INTELLIGENCE`, `INGREDIENT_INTELLIGENCE`, `MECHANISM_INTELLIGENCE`, `CONTRADICTION_INTELLIGENCE`, `KNOWLEDGE_GAP_INTELLIGENCE`, `FORMULATION_INTELLIGENCE` and `SCIENTIFIC_MEMORY`.
- Reasoning runs are typed `AGRICULTURE_BRAIN`, `OPPORTUNITY_BRAIN`, `MANUAL_SCIENTIFIC_REVIEW` or `OTHER`.
- Each country workspace receives its own entry in a separate `country_core.country_brain_registry`.

### 7.2 What the evidence shows

**The rehearsal's brains are functional reasoning engines, not scientific domain specialists.** They reason about resources, mechanisms, contradictions, knowledge gaps, ingredients and formulations. None is named after Soil, Water or Climate. `ENVIRONMENTAL_INTELLIGENCE` is the only brain code that names a scientific domain.

The registered domains correspond one-to-one with database schemas. This suggests that they are technical areas of the rehearsal rather than the scientific domains of section 3, but without the rows that is not proven.

The domain brains of section 8.1 are therefore an architectural intention, not a description of the rehearsal.

### 7.3 Therefore

- The domains in section 3 are the domains AAB has planned and discussed.
- Agriculture is the proving implementation.
- The 10 registered domains and 11 registered brains of the earlier system evidence remain unconfirmed. Neither registry can be assumed to match sections 3 or 8.
- No "official ten-domain register" or "eleven-brain list" is to be written until the registries are reconciled.
- Reconciliation requires a separate, explicitly authorised read of the live registries, with its findings reported to the Platform Owner before anything is committed. This document does not authorise that read.
- Minerals, public health, and waste and resource recovery remain provisional until formally designed and admitted.

---

## 8. The cognitive architecture

AAB does not have one uncontrolled central brain. It has three levels:

1. **Domain brains.** Deep specialists that own their domain's knowledge, evidence and learning.
2. **The Main Brain** (working name). The cross-domain coordinating brain, which requests minimum-necessary governed packets from domain brains and produces an integrated candidate output.
3. **Human governance.** Scientists, institutions, country authorities and governance bodies decide what may be admitted, investigated, trialled, acted on or approved.

The governing principle is that of AAB-GOV-DEC-OBSERVATION-BRAIN-01:

**Automate reasoning, govern its outputs.**

In full: specialist brains understand their domains. The Main Brain combines only the governed knowledge needed for the authorised purpose. Humans govern what the resulting output is allowed to become.

### 8.1 Domain brains

Domain brains may include brains for Agriculture, Soil, Water, Climate, Environment, Ecosystems, Aquaculture, supply-chain evidence, regulatory translation and manufacturing transfer, and other formally admitted domains.

Each brain must have:

- a defined scientific purpose;
- the approved information it may access;
- a defined country and institutional boundary;
- permitted reasoning methods;
- labelled output types;
- a versioned code and model identity;
- recorded evidence dependencies;
- uncertainty and limitation statements;
- a human authority responsible for reviewing its significant outputs.

---

## 9. The cognitive flow

```
country scan, field observation, trial or institution data
        ↓
provenance and quarantine
        ↓
human triage and permitted-use check
        ↓
admitted evidence and scientific memory
        ↓
automated brain reasoning
        ↓
labelled candidate outputs
        ↓
scientist review
        ↓
investigation, trial or governed decision
        ↓
outcome evaluation
        ↓
governed learning proposal
        ↓
approved memory or capability improvement
```

This flow describes reasoning over admitted evidence. It does not replace the field-observation chain of AAB-GOV-DEC-OBSERVATION-BRAIN-01 section 3, in which automated analysis of a triaged observation may inform the scientist's admission decision before admission. Analysis at that point informs the decision; it does not make it.

**Intake processing is not scientific reasoning.** AAB-GOV-DEC-OBSERVATION-BRAIN-01 governs: scientific brain analysis begins only after intake and human triage. Two kinds of automated work must be kept apart:

- **Intake processing** is permitted while material is quarantined. It covers file validation, malware scanning, metadata extraction, privacy checks and basic classification (for example, the file's type and the kind of content it holds). It makes no scientific interpretation, and its results stay with the quarantined material.
- **Scientific reasoning** is not permitted while material is quarantined. It covers interpreting what the material shows scientifically: patterns, hypotheses, mechanisms, contradictions, signals. It starts only after intake and human triage.

Quarantine must never be a back door into accepted memory.

---

## 10. The cognitive layers

### 10.1 Observation and discovery

This is where AAB notices something that might matter. Inputs can include:

- a country's first Discovery scan;
- public and country-approved datasets;
- a farmer's photograph and location;
- an agronomist's trial observation;
- historical institutional datasets;
- scientific publications;
- environmental monitoring;
- satellite or spatial information;
- laboratory results;
- safety or contamination reports.

At this point AAB declares nothing scientifically true. It says only: here is something potentially relevant that should be preserved and examined.

### 10.2 Provenance and quarantine

Before information influences accepted knowledge, AAB records where it came from, including where applicable:

- source and original owner;
- collection time;
- geographic coverage;
- uploader or observing authority;
- licence or permitted use;
- measurement method;
- country and institution;
- integrity hash;
- uncertainty;
- confidentiality;
- whether consent or another lawful basis applies.

Unreviewed material is quarantined. A farmer's photograph remains an **UNVERIFIED FIELD OBSERVATION**. It does not become evidence because AAB can analyse the image.

### 10.3 Evidence admission and scientific memory

Qualified people decide whether material is suitable for scientific use. Outcomes include: admitted; admitted with limitations; rejected; deferred pending more information; retained only as an observation; superseded; withdrawn where governance permits.

For Agriculture this is CAP-04. Scientific memory is not a general store into which every upload is placed automatically.

### 10.4 Automated reasoning

Once information is permitted for a reasoning purpose, the relevant brain may analyse it automatically. A brain may:

- find patterns;
- compare observations;
- detect contradictions;
- identify knowledge gaps;
- connect evidence from different domains;
- identify changes over time;
- calculate confidence or evidence coverage;
- suggest possible mechanisms;
- generate hypotheses;
- detect possible safety signals;
- propose that existing knowledge be reassessed;
- identify possible investigation or trial candidates.

For Agriculture, CAP-05 is evidence reasoning. It exposes relationships, contradictions and gaps. It does not issue a verdict or a recommendation.

---

## 11. What a brain may produce

Automated outputs are labelled for what they are. Examples:

- PATTERN CANDIDATE
- POSSIBLE CONTRADICTION
- KNOWLEDGE GAP
- HYPOTHESIS
- PROBLEM SIGNAL
- TRANSFORMATION OPPORTUNITY
- REASSESSMENT REQUEST
- INVESTIGATION CANDIDATE
- TRIAL CANDIDATE
- SAFETY SIGNAL
- EVIDENCE COVERAGE INCOMPLETE

None of these is a proven fact, an accepted scientific conclusion, an approved product, a safe formulation, an authorised trial, a regulatory approval, an instruction to a farmer or a production authority. The wording users see must preserve that distinction.

These labels describe kinds of output. Each capability contract defines its own exact vocabulary, and where a contract already defines one (for example CAP-01, CAP-05, CAP-06 and CAP-08), the contract governs.

---

## 12. The brain's working state

A brain needs internal state to reason over time. This may include evidence graphs, relationships between records, competing hypotheses, confidence calculations, contradiction registers, pattern histories, provisional belief weights, reassessment queues, and model or rule versions.

That state may update automatically. It must be:

- versioned;
- reproducible where practicable;
- linked to its input evidence;
- attributable to the code, model and rules that produced it;
- separated from accepted scientific memory;
- reversible or supersedable;
- visible to authorised reviewers;
- prevented from silently becoming an institutional conclusion.

The rehearsal's cognitive loop failed at this boundary: it could overwrite belief states and create signals that looked more authoritative than they were. It has been retired from migration, and its useful ideas redistributed with governed outputs (AGR capability identity record, note of 2026-09-29).

---

## 13. Human scientific review

A scientist must be able to do more than approve. The reviewer must be able to:

- inspect the underlying evidence;
- see what the brain did;
- understand its significant assumptions;
- see contradictions and missing evidence;
- request further investigation;
- reject the candidate;
- defer it;
- correct classifications;
- record disagreement;
- admit only part of it;
- authorise an investigation or controlled trial;
- supersede an earlier decision.

Review is substantive and auditable (AAB-PLATFORM-08).

---

## 14. Trials and outcomes

A hypothesis that survives review may lead to a controlled investigation or trial under CAP-08. The trial record preserves protocol and purpose, controls and treatments, locations and participants, authorised observers, measurement methods, schedules, calibration and units, protocol deviations, adverse events, chain of custody, statistical method, negative and inconclusive results, and final scientific review.

Trial observations differ from farmer uploads: they are collected under an approved protocol by authorised observers.

A brain may monitor trial information and identify anomalies or emerging patterns. It must not change a trial protocol or declare a trial successful.

---

## 15. Governed learning

An outcome does not automatically rewrite a brain's permanent knowledge. It may become a learning proposal.

- CAP-04 admits evidence or knowledge into scientific memory.
- CAP-09 decides whether an evaluated outcome is promoted into governed learning.

Promotion considers evidence quality, scientific review, replication, country and environmental scope, contradictions, limits of applicability, safety, whether the result is country-specific, and whether it is suitable for wider use. One result, one country or one unusual season must not become a universal AAB rule.

---

## 16. The Main Brain

"Main Brain" is a working name. No canonical name has been decided.

### 16.1 Role

The Main Brain sits above the domain brains. It coordinates them; it does not replace them. It assembles an integrated candidate output by taking only the governed information it needs from each relevant brain.

It owns the governed cross-domain reasoning process and the integrated output it produces. Each domain brain keeps ownership of its domain's knowledge, evidence, learning and memory. The Main Brain is authoritative only for the cross-domain reasoning record it creates, never for rewriting a source domain. This prevents it becoming an uncontrolled central data store.

It is not another domain brain. It is AAB's governed cross-domain synthesis and coordination layer.

### 16.2 Governed knowledge packets

The Main Brain does not copy information from every brain. It asks a relevant domain brain a bounded question, and that brain returns a **governed knowledge packet** containing only what is necessary. A packet may contain:

- the specific scientific finding;
- supporting evidence references;
- country and geographic scope;
- date and environmental context;
- confidence and uncertainty;
- contradictions;
- known limitations;
- negative findings;
- permitted purpose;
- provenance;
- responsible domain;
- version;
- expiry or reassessment conditions.

The source brain continues to own the underlying information. The Soil brain, for example, does not hand over its database. It may return: this soil has a high salinity risk, supported by these admitted measurements, with this confidence and these limitations.

### 16.3 Example: investigating poor crop performance

| Domain brain | Minimum information requested |
|---|---|
| Agriculture | Crop requirements, observed symptoms, agronomic history and relevant outcomes |
| Soil | Soil structure, nutrients, pH, salinity and identified constraints |
| Water | Irrigation quality, availability, salinity and contamination risks |
| Climate | Relevant rainfall, temperature, seasonal conditions and anomalies |
| Environment | Environmental risks, the receiving environment and permitted constraints |
| Ingredient and formulation intelligence | Potential materials and existing evidence, never product approval |
| Regulatory | Applicable legal and evidence requirements |
| Manufacturing | Whether an approved concept could eventually be produced safely and consistently |

The Main Brain combines those packets into candidate outputs such as: an integrated problem model; competing mechanism hypotheses; contradictions requiring resolution; missing evidence; possible investigation pathways; a formulation candidate; a controlled-trial candidate; safety or regulatory questions. It submits them for scientific review. It does not declare a proposed solution proven or authorised.

### 16.4 Agriculture brain and Main Brain

The Agriculture brain manages Agriculture's own cognitive lifecycle: agricultural reasoning, mechanism hypotheses, successful and failed investigations, contradictions, confidence changes, evidence lineage, negative learning and Agriculture's scientific memory. Once approved, it may provide an Agriculture packet to the Main Brain, which may combine it with approved packets from Soil, Water, Climate and others. Agriculture remains authoritative for agricultural knowledge.

### 16.5 Minimum-necessary access

The Main Brain follows least privilege: **minimum necessary scientific information for the authorised purpose.** Before it receives anything, the system establishes:

1. who requested the reasoning;
2. for which country;
3. for which institution or project;
4. what scientific purpose is authorised;
5. which domain brains are actually required;
6. what each brain may disclose;
7. whether the integrated output may be stored;
8. who may review or use it.

If authority or information cannot be established, it returns **AUTHORITY REQUIRED**, **EVIDENCE REQUIRED** or **INSUFFICIENT PERMITTED INFORMATION**. It must not broaden its access to produce a more complete-looking answer.

### 16.6 What it may and must not do automatically

It **may** automatically:

- select relevant domain brains;
- ask bounded questions;
- combine approved packets;
- find cross-domain relationships;
- identify contradictions;
- expose missing information;
- explore possible pathways;
- produce candidate explanations;
- identify investigations that may be worth considering;
- place items in a governed reassessment queue.

It **must not** automatically:

- approve a scientific conclusion;
- alter source-domain memory;
- authorise a formulation;
- commence a trial;
- direct a farmer to act;
- approve regulatory use;
- release information commercially;
- move protected information between countries;
- commission AAB.

Whether the Main Brain may **rank** hypotheses or **recommend** next investigations is not decided here. The AGR contracts adopted so far forbid scoring, ranking and recommendation (CAP-01, CAP-05, CAP-06); a Main Brain permission to do so would need its own decision.

### 16.7 The Intelligent Node Model

An Intelligent Node Model has been proposed as the structured object the Main Brain would consume: identity and subject; context; evidence; uncertainty; contradictions; mechanism; positive and negative outcomes; knowledge gaps; governance status; provenance; version history; relationships; derived current state; and a future learning agenda. It would let the Main Brain reason over governed scientific objects instead of scraping disconnected tables.

The model is proposed, not canonical. The WA rehearsal has a `cognitive_core.intelligent_node` table (governance status defaulting to `EXPERIMENTAL_UNVERIFIED`) and a read-only Main Brain status display (`READ_ONLY_ADVISORY_SIMULATION_ONLY`; `NO_EXECUTION_NO_APPROVAL_NO_RECOMMENDATION_NO_AUTONOMY`). These are rehearsal evidence of the idea, not an implementation of this document.

### 16.8 Relationship to capability identifiers

The AAB capability landscape names CAP-31 Governed Domain Framework, CAP-32 Domain-Specific Scientific Intelligence and CAP-33 Cross-Domain Scientific Reasoning, none with a recorded description. Domain brains and the Main Brain correspond in name to CAP-32 and CAP-33. This document does not assign them. That needs the ten-point identity checklist.

---

## 17. Cross-domain reasoning example

1. Country Discovery detects declining crop performance.
2. Soil identifies a possible nutrient or structural issue.
3. Water identifies salinity or irrigation-quality concerns.
4. Climate identifies unusual temperature or rainfall conditions.
5. Agriculture examines the combined evidence.
6. The Main Brain, drawing on the Agriculture brain, proposes possible explanations.
7. A scientist decides whether an investigation is justified.
8. A controlled trial tests the approved hypothesis.

Soil, Water and Climate keep ownership of their canonical information. Agriculture receives governed evidence or approved outputs, not control over their records.

---

## 18. Country sovereignty applies to brain activity

A brain operates inside the same sovereignty boundary as the protected information it processes. Protected information includes original records, photographs, GPS locations, scientific observations, trial measurements, derived summaries, brain outputs, embeddings and vectors, relationship graphs, logs containing protected content, and backups and replicas.

**Transformation does not remove sovereignty.** Turning a protected photograph into an embedding, summary, detection or hypothesis does not make the result safe to send out of the country.

Each deployed country has its own Main Brain or coordinating service, inside that country's approved sovereign environment. There is no global AAB brain that absorbs every country's knowledge. A country brain must not feed protected knowledge back to canonical AAB or to another country.

What may return to canonical AAB is limited to approved non-protected material: improved software, generic reasoning methods, test definitions, verification lessons, corrected capability contracts, and non-country-specific schema improvements. This applies the country scientific data non-return boundary to brain activity.

---

## 19. Kinds of memory

| Memory | Meaning |
|---|---|
| Raw intake | The original upload, dataset or observation, normally quarantined at first |
| Scientific evidence | Information reviewed and admitted for a stated use |
| Scientific memory | Governed, persistent knowledge with provenance and scope |
| Working cognitive state | Versioned brain calculations and candidate relationships |
| Trial memory | Protocols, observations, deviations and outcomes from controlled trials |
| Governed learning | Reviewed lessons approved for defined future use |
| Canonical software knowledge | Generic code, contracts and tests containing no protected country science |

These have different owners and authority rules. None of them is "the brain".

---

## 20. The country scan

The Country Discovery scan is the first intelligence experience for a new Country Head Admin. It should show that AAB can inspect permitted national and regional evidence; identify possible problems and overlooked resources; show evidence coverage honestly; connect issues across domains; identify questions worth investigating; and produce governed investigation candidates.

Its results remain discovery candidates, not admitted scientific knowledge. It must say when it could not determine something, using wording such as EVIDENCE COVERAGE INCOMPLETE, SOURCE UNAVAILABLE, COUNTRY EVIDENCE REQUIRED, NOT ASSESSED or NOT DETECTED WITHIN STATED COVERAGE. CAP-01's contract governs the exact vocabulary.

It must never turn missing evidence into "no problem exists".

---

## 21. Non-negotiable brain rules

Every AAB brain, including the Main Brain:

1. Never manufactures facts.
2. Never hides uncertainty.
3. Never silently resolves contradictions.
4. Never confuses a candidate with a conclusion.
5. Never lets browser-supplied roles or country values determine authority.
6. Never bypasses persisted scientist, institution or country authority.
7. Never promotes quarantined material automatically.
8. Never uses protected country information for external model training without explicit authority.
9. Never lets one country's protected information flow automatically to another.
10. Never converts automated technical verification into governance approval.
11. Preserves negative, failed and inconclusive results.
12. Records the evidence, rules, model and version behind every output.
13. Allows authorised correction, disagreement and supersession.
14. Fails closed when authority or evidence is missing.

---

## 22. Open questions

1. The canonical domain and brain registers: reconciling `platform.domain_registry` and `cognitive_core.brain_registry` against sections 3 and 8, which needs a separately authorised read of the live registry rows (section 7.3).
2. The boundary between Environment and Ecosystem.
3. Whether environmental restoration is part of Environment.
4. The relationship of the Regulatory, Manufacturing, Commercial and Governance domains to the platform-wide capabilities CAP-20, CAP-21 and CAP-25 (and to the AGR capabilities CAP-11 and CAP-12) is unresolved. It will be determined when their canonical contracts are written, and is not resolved here.
5. The Main Brain's canonical name and identity, and its relationship to CAP-33.
6. Whether the Main Brain may rank or recommend.
7. The governed knowledge packet and the Intelligent Node Model as contracts.

---

## 23. What this document does not establish

- It does not create an official domain register or brain register.
- It does not admit, design or number any domain, brain or capability.
- It does not reassign any capability identifier.
- It does not amend AAB-GOV-DEC-OBSERVATION-BRAIN-01 or any canonical contract.
- It does not alter commissioning status, Gate D, WP05, or any production, regulatory or scientific authority.

---

## 24. Authority statement

AAB's cognitive scheme is a sovereign, multi-domain scientific reasoning system that continuously observes and reasons, while keeping every automated output labelled, explainable, evidence-linked and subject to the appropriate human authority before it can become accepted knowledge or action.

AAB begins with Agriculture. It is designed to become a sovereign scientific operating system spanning agriculture, soil, water, climate, environment, ecosystems and aquaculture, with the governed pathways that turn science into regulated, manufacturable and usable outcomes.

**Automate reasoning, govern its outputs.**

---

*This document was approved in governance session 2026-09-30. It is a platform rule, not a domain workstream document, and is held in `governance/`.*
