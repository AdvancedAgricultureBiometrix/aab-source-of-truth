# AAB-OVERVIEW-01 — The AAB Platform — Public Overview — 2026-09-27

**Status:** PUBLIC-FACING OVERVIEW — NOT A CANONICAL CONTRACT
**Audience:** prospective institutional partners, intermediary organisations and pilot candidates
**Cleared for external use:** 2026-09-27, by the Platform Owner, as the governance review of public wording the platform purpose and values revision requires. Condition: this overview accompanies the canonical contract documents, and never replaces them. It is a cover document, not a substitute for the contracts.
**Revised:** 2026-09-30, to the governance records on `main` at `a0f0082`, and cleared again for external use by the Platform Owner in review. The revision corrects state labels and counts the records had moved on from, names the planned domains (section 7.5), and states the governing principle (section 1). The earlier version should no longer be sent.
**Authority:** DESCRIBES THE AAB PLATFORM AND ITS CURRENT STATE, AS THE GOVERNANCE RECORDS ESTABLISH IT ON 2026-09-30. It is not a contract, and it admits, commissions and promises nothing. Every state it reports comes from `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md` and the records that roadmap cites. Where this overview and a governance record differ, the governance record is correct.

## How to read this overview

**Every capability carries one honest state label.** The labels are the platform's own maturity states, in order. Each requires the one before it, and none implies the next.

| State | Meaning |
|---|---|
| `named only` | The capability is named in a roster or landscape. No canonical contract defines it yet. |
| `designed` | A canonical contract defines it. |
| `implemented` | Code performs part or all of what the contract defines. |
| `behaviourally proven` | A committed proof record shows it working end to end, over real inputs, for the operations the record names. |
| `admitted` | It has passed capability admission and is a canonical capability of the platform. |
| `commissioned` | It is authorised for live operation in a country. |

**No capability in any domain is admitted or commissioned today.** Everything below is at most `behaviourally proven`, and for a stated scope only.

## 1. What AAB is

**AAB is a platform for turning a country's evidence into governed decisions and lasting capability.** It supports the chain by which a country moves from a need to lasting capability:
1. starting from a need the country has identified;
2. finding and admitting the relevant evidence honestly;
3. reasoning over it under governance;
4. investigating open questions;
5. developing and trialling candidate solutions;
6. translating what is known into what a regulatory framework requires;
7. transferring what has been proven into practice, under control;
8. keeping what was learned, including what failed, as governed institutional memory.

**Automate reasoning, govern its outputs.** This is AAB's governing principle. AAB may reason automatically: compare evidence, detect patterns and contradictions, and propose hypotheses. Automated reasoning confers no scientific authority. Its outputs are labelled as machine-generated, linked to their evidence, and acquire governed status only through the applicable evidence, scientific, institutional, country and governance decisions (the platform's observation and brain governance, approved 2026-09-29).

**The platform is separate from the domains that use it.**
- **The platform** provides the shared mechanisms: identity and authority, immutable evidence, provenance, admission decisions, frozen evaluations, attributable human decisions, receipts, country isolation, and backup and reconstruction.
- **Each domain** applies the platform to one field, and supplies its own rules. Two use it today, and others are planned (section 7.5):
  - **Supply Chain Sovereignty (SCS):** admitting supply chain evidence honestly, and evaluating whether it is sufficient under a regulatory framework, starting with the EU Deforestation Regulation (EUDR).
  - **Agricultural Science (AGR):** discovering, admitting and reasoning over scientific evidence, and preserving institutional scientific memory.
- **Dependencies run one way.** A domain may use the platform. The platform never depends on a domain.

**Each country has its own isolated environment.** A country's data, users, evidence and memory stay in its environment. Approved capability moves into country environments; country data does not move out. The principle, as the platform records it: "AAB capability can improve globally. Scientific knowledge remains sovereign locally."

### The eleven platform primitives

These are the eleven shared mechanisms every domain builds on, as the platform–domain separation decision records them. All eleven exist today inside the SCS pilot, which built them first.

| # | Primitive | What it does | State |
|---|---|---|---|
| 1 | Canonical runtime schemas | Every request and record is checked against a strict, versioned schema | `implemented` |
| 2 | Governed identity and authority | Every act is by an authenticated actor, checked against the role it requires, with separation of duties | `implemented`; acting for a party under a verified mandate, and the history of signing keys, `behaviourally proven` |
| 3 | Immutable evidence objects | Files are stored by their SHA-256 digest and never overwritten (AAB-PLATFORM-01) | `behaviourally proven` |
| 4 | Provenance | Who submitted what, when, and what it cites, recorded at admission | `implemented` |
| 5 | Admission decisions | Evidence is admitted, or admitted with every limitation disclosed, or refused; never silently accepted | `implemented` |
| 6 | Frozen evaluation snapshots | An evaluation reads one consistent snapshot and records exactly what it evaluated, so it can be reproduced | `implemented` |
| 7 | Attributable human review | A named human decides on disclosed gaps and conflicts; the decision is permanent and bound to what was decided on | `implemented` |
| 8 | Governed package compilation | Evidence, evaluation and decision are compiled into a package, with a PDF, bound by a content digest | `implemented` |
| 9 | Receipts and auditability | Every governed write produces an immutable receipt in the same transaction | `implemented` |
| 10 | Country isolation | The services of an environment have no network route outside it | `behaviourally proven` for one environment |
| 11 | Backup and reconstruction | An environment can be backed up and restored into a fresh one, with every record and file verified | `behaviourally proven` for the pilot stack |

## 2. What is proven today

**The SCS vertical proof is complete.** It is the first implementation to run end to end on AAB.

- **Eight SCS capabilities are `behaviourally proven`** for their minimum vertical slices: SCS-CAP-01 to SCS-CAP-06, SCS-CAP-08 and SCS-CAP-09.
  - Each proof covers the operations its record names, not the whole capability. Most read operations are not built yet (section 3).
  - The standard is that a capability's records feed an evaluation that runs end to end, honestly, over real admitted evidence. It is not that the evaluation reaches a best-case outcome.
- **The whole chain runs in automated tests on every change:** framework → parties → plot → evidence file → evaluation → human review decision → package and PDF.
- **752 automated tests pass in continuous integration on every change,** on native Linux.
- **Access isolation is proven for one environment.** The database, object store and API have no route outside the environment; they cannot reach the internet or resolve public names. The API's database role can read and add records, and cannot change or delete them.
  - **Not proven:** isolation between two environments on the same host, and organisation-level separation of records within one environment.
- **Backup and restore is proven for the pilot stack.** A backup restores into a fresh environment, with every receipt, package, evidence file and PDF verified by digest. A damaged backup, or a restore over an existing environment, is refused.
  - **Not proven:** encrypted backups (backups are not yet encrypted), backup without a short outage (about 14 seconds in testing), recovery-time objectives, and point-in-time recovery.

**What those proofs support saying in public,** as the proof records themselves set out:
- "The SCS pilot's services run on an internal network with no outbound route, verified by an automated test on every change; isolation between environments on a shared host is not yet provided."
- "An SCS pilot environment can be backed up and restored into a fresh environment with every record, file and digest verified, tested automatically on every change; backups are not yet encrypted, and taking one briefly stops the service."

**What is not proven, and must not be implied:** that any capability is admitted, that any environment is commissioned, that any evaluation reaches a sufficient outcome, or that AAB makes any compliance determination.

## 3. The Supply Chain Sovereignty domain

**What it covers.** SCS supports an operator's due diligence under a regulatory framework, starting with the EUDR. It admits evidence about plots, parties, deforestation and chains of custody. It evaluates whether that evidence is sufficient, and says honestly where it is not. A qualified human reviews the result, and the evidence is compiled into a package.

**What it does not do.** No SCS capability makes a legal compliance determination, produces or submits a due diligence statement, or takes on the operator's legal responsibility. Three things are deliberately excluded: automated satellite imagery analysis, predictive compliance risk scoring, and direct submission to TRACES NT.

**The honest pilot outcome.** Every pilot evaluation ends at `GAPS_REQUIRE_HUMAN_DECISION`, never `SUFFICIENT`.
- **Why:** the pilot has no spatial database yet. Plot overlap and the spatial coverage of deforestation evidence are not evaluated, so every plot is registered with that gap disclosed, and every evaluation reports it.
- **Consequence:** a pilot evaluation always leaves a named human deciding on disclosed gaps. That is the design working as intended: the platform refuses to manufacture sufficiency it cannot demonstrate.
- **What changes it:** a spatial database, with country boundary data. It is recorded as open work (`TODO(postgis)`).

**Other disclosed limits that pilot partners must know:**
- Deforestation evidence is always admitted with limitations in the pilot, because spatial coverage is not verified.
- Submission by a representative acting for a party, under a verified mandate, is built and `behaviourally proven` for parties, deforestation evidence and custody evidence. The grants that let a representative act are operator configuration in the pilot, not yet signed, evidenced acts.
- A reviewer's authority is recorded as declared, not verified.
- Packages are English only, and do not yet include the original evidence files.

## 4. The Agricultural Science domain

**What exists:**
- **Five canonical contracts are `designed`:** CAP-01 Country Intelligence & Discovery, CAP-04 Governed Scientific Memory, CAP-05 Governed Scientific Reasoning, CAP-06 Ingredient Intelligence, and CAP-08 Controlled Trials & Outcomes. Each was written with the rehearsal application's code in view, and says what it does not carry across. Nothing is built for any of them.
- **A simulation environment (CAP-34) is `implemented`.** It represents several scientific capabilities with real logic over synthetic data. A simulation never counts as implementation of the capabilities it represents, and carries no credit toward commissioning.
- **A rehearsal application** exercises trials, formulation, observation (including field photo capture) and learning functions. Its code is evidence, not governed code. The capabilities it serves are `designed` where a contract now exists, and otherwise `named only`. The rehearsal is not commissioned. Its sovereignty audit recorded that it would not meet production standards if reused, and set out what a production environment must prove.

**What is `named only`:** every other AGR capability (section 7). They are named in the capability landscape, with no contract yet.

**What comes next, as the governance records set it out:**
- Contracts for the remaining scientific capabilities: next CAP-07 Formulation Intelligence, then CAP-09 Governed Scientific Learning.
- Before any AGR capability is built on the platform, an independent verification of the audit of the platform's dependencies, and the extraction of the platform primitives out of the SCS pilot. The audit is written; the platform–domain separation decision requires its independent verification before any extraction.

## 5. The pilot pathway

**The first engagement is a controlled pilot, not a production licence.** The buyer journey record defines it as "a paid institutional discovery or controlled pilot — not a production licence". Each stage below requires the one before it, and none happens automatically.

1. **Agreement.** A founding institution and AAB agree a controlled pilot. A commercial agreement never activates anything by itself.
2. **A country environment.** The country's own isolated environment is created from the clean baseline, never from another country's environment. The country owns its production infrastructure from creation.
3. **Admission, under the pilot joint authority.**
   - A capability is admitted for that country only when two named people both decide to admit it: the Platform Owner, and an authorised representative of the founding institution. Neither can admit alone.
   - An independent reviewer, appointed by both jointly, assesses the evidence first. Neither party may admit against a negative assessment.
   - The admission covers one country, capability, contract version, implementation and scope. It creates no platform-wide authority.
4. **Gate D, deployment qualification.** The Platform Owner decides whether the country's deployment meets every mandatory AAB requirement, on an independent reviewer's assessment. The requirements include the sovereignty controls, the open security findings and the data egress evidence.
5. **Commissioning.** The country's own authority decides whether the qualified deployment may operate live. AAB does not decide this.
6. **Activation and user authorisation.** Capabilities are activated one at a time, and users are authorised individually.

**What each party commits to**, as the admission, registry and Gate D definitions require:

| AAB (Platform Owner) | The founding institution |
|---|---|
| Decides and signs each admission and change record jointly, never alone | Names an authorised representative, who decides and signs each admission and change record jointly |
| Appoints the independent reviewer jointly | Appoints the independent reviewer jointly |
| Discloses every limitation, deferred operation and open gap of each capability | Holds its admission records, evidence and signing keys inside its own environment |
| Decides Gate D only on an independent assessment, and never against it | Decides commissioning, and any suspension of live operation, through its own authority |
| Keeps country data inside the country's environment | Owns the country environment's infrastructure |

**Timeline.** No timeline is recorded in the governance records. Each stage starts when the one before it is complete. Before the first admission can happen, three things are still needed:
- the country admission registry, built in the country's environment;
- the founding institution's authorised representative, identified;
- the first independent reviewer, appointed.

For an SCS capability, the CAP-34 fidelity manifest must also be extended to include the SCS capabilities.

## 6. Governing principles

These principles run through the governance records. Each is stated where it is recorded.

1. **Evidence before assertion.** Reasoning is "traceable, reproducible, and never claiming more than the evidence supports" (platform purpose and values).
2. **Scientists retain authority.** "Scientists retain scientific authority." AAB may propose questions and possibilities; scientists decide whether a possibility deserves investigation, and evidence decides whether it survives (comprehensive pitch). An authorised scientist decides whether a conclusion may be treated as validated knowledge (CAP-04 Governed Scientific Memory).
3. **Country data remains isolated.** "One country, one isolated country environment" (country isolation architecture). A country's environment never inherits another country's scientific data (provisioning rule).
4. **Failures and contradictions remain visible.** "The platform does not round up and does not look away." A conflict between sources is surfaced as a conflict, not resolved by choosing the convenient one (platform purpose and values). What failed is kept as governed memory.
5. **No automatic promotion.** "A preceding state never automatically establishes the next governed state" (capability landscape). Simulation state never becomes production state, and payment never becomes activation.

**Two permanent platform values** bind every domain (platform purpose and values):
- **Smallholder inclusion.** The people existing tools exclude are the test of every design decision. A smallholder with GPS coordinates and no formal land title is admitted honestly, with the gap recorded, not silently excluded.
- **Honest gap disclosure.** Coverage of 87% is not recorded as 100%; the missing 13% is disclosed, with what it means.

## 7. The complete capability landscape

This is every capability the governance records name, with its state today. It shows the scope of what is being built, and where it stands. It claims no readiness. Descriptions are taken from the governance records. Where a record gives only a name, the description says so.

### 7.1 Platform services and definitions

| ID | Name | Description | State |
|---|---|---|---|
| AAB-PLATFORM-01 | Evidence Object Store | Stores evidence files by SHA-256 digest; never overwritten | `behaviourally proven` (the SCS storage profile) |
| AAB-PLATFORM-02 | Governed Document Rendition | Renders a governed record as a deterministic PDF, re-hashed on every read | `implemented` |
| AAB-PLATFORM-03 | ActorReference | Records who performed each act, how they authenticated, and on what authority | `implemented` |
| AAB-PLATFORM-04 | Actor–Subject Link | Links an actor to the party it acts for, under a verified mandate | `behaviourally proven` |
| AAB-PLATFORM-05 | Governed Provenance | Records where each record came from and what it cites | `designed` |
| AAB-PLATFORM-06 | Admission Decisions | Refuses, holds for review or admits each record, with every limitation disclosed | `designed` |
| AAB-PLATFORM-07 | Frozen Evaluation Snapshots | Binds an evaluation to the exact inputs it read, so it can be reproduced | `designed` |
| AAB-PLATFORM-08 | Attributable Human Review with Currency | Signed human decisions, bound to what was decided on, whose currency is derived when read | `designed` |
| AAB-PLATFORM-09 | Governed Public-Key Registry | Keeps the history of the keys that sign decisions, through rotation and compromise | `behaviourally proven` |
| — | Gate D (deployment qualification) | The decision that a country deployment meets every mandatory AAB requirement | defined; no deployment assessed |
| — | Capability admission authority and registry | Who admits a capability, on what evidence, and where the decision is recorded | defined; not yet built |

### 7.2 Supply Chain Sovereignty (SCS)

| ID | Name | Description | State |
|---|---|---|---|
| SCS-CAP-01 | Regulatory Framework Registration | Registers which regulation, version, commodity and market govern a due diligence context | `behaviourally proven` |
| SCS-CAP-02 | Operator and Supplier Identity Registration | Registers the parties in a supply chain, their roles, relationships, mandates and verification | `behaviourally proven` |
| SCS-CAP-03 | Plot and Land Unit Registration | Registers plots of land with their geometry and tenure, so every commodity traces to a plot | `behaviourally proven` |
| SCS-CAP-04 | Deforestation Evidence Admission | Admits deforestation evidence, with every limitation disclosed | `behaviourally proven` |
| SCS-CAP-05 | Supply Chain Custody Evidence Admission | Admits chain-of-custody evidence: purchases, transport, processing, certificates | `behaviourally proven` |
| SCS-CAP-06 | Due Diligence Sufficiency Evaluation | Evaluates admitted evidence and reports what is sufficient and what gaps remain: a landscape, not a verdict | `behaviourally proven` |
| SCS-CAP-07 | Evidence Source Discovery | Surfaces authoritative sources that could provide missing evidence | `named only` |
| SCS-CAP-08 | Due Diligence Package Compilation | Compiles admitted evidence, provenance, gaps and decisions into a package, with a PDF | `behaviourally proven` |
| SCS-CAP-09 | Regulatory Review and Promotion | A qualified reviewer decides on the evaluation; no package is compiled without that decision | `behaviourally proven` |
| SCS-CAP-10 | Challenge Response and Evidence Retrieval | When a statement is challenged, retrieves the exact package and proves its provenance intact | `named only` |
| SCS-CAP-11 | Regulatory Framework Update Management | When a regulation changes, identifies which packages are affected | `named only` |
| SCS-CAP-12 | Cross-Boundary Evidence Reference | Governed references to evidence admitted in another country's environment, never copies | `named only` |

**Candidate:** SCS-BRAIN-CANDIDATE-01 Governed Evidence Intelligence, a read-only advisory layer over the SCS capabilities. `named only` (a candidate design record).

### 7.3 Agricultural Science (AGR): the scientific capabilities

| ID | Name | Description | State |
|---|---|---|---|
| CAP-01 | Country Intelligence & Discovery | Investigates a country's agricultural problems, resources, waste streams and overlooked opportunities | `designed` |
| CAP-02 | Governed Scientific Data Acquisition & Interoperability | Brings scientific data in from authorised sources; source adapters are defined, none connected | `named only` |
| CAP-03 | Evidence Integrity & Provenance | Keeps the chain from original source through reasoning, experiment, decision and outcome | `named only` |
| CAP-04 | Governed Scientific Memory | Admits sources, extractions and evidence into governed scientific memory | `designed` |
| CAP-05 | Governed Scientific Reasoning | Evaluates admitted evidence and returns a landscape of agreement, contradiction and gaps, not a verdict | `designed` |
| CAP-06 | Ingredient Intelligence | Investigates existing ingredients, and candidate new ones from evidence and country resources | `designed` |
| CAP-07 | Formulation Intelligence | Supports scientists to request, build, compare and version formulations for defined objectives | `named only` |
| CAP-08 | Controlled Trials & Outcomes | Moves authorised candidates into controlled trials, and captures observations and outcomes | `designed` |
| CAP-09 | Governed Scientific Learning | Lets an authorised scientist decide whether a conclusion may be treated as validated knowledge | `named only` |
| CAP-10 | Safety & Ecological Intelligence | No description is recorded beyond its name | `named only` |
| CAP-11 | Regulatory Translation & Dossier Support | Assembles governed evidence toward regulatory dossiers, when authorised | `named only` (post-launch) |
| CAP-12 | Controlled Manufacturing Transfer | Supports controlled transfer of proven results into manufacture, when authorised | `named only` (post-launch) |
| CAP-32 | Domain-Specific Scientific Intelligence | No description is recorded beyond its name | `named only` |
| CAP-33 | Cross-Domain Scientific Reasoning | No description is recorded beyond its name | `named only` (future platform) |

**Candidates:**
- **Governed Evidence Watch** (proposed as CAP-35): notifies a scientist when newly admitted evidence may warrant re-evaluation. `named only` (a candidate design record).
- **AGR Cross-Institutional Landscape:** evaluates evidence across several authorised institutions, as a composition of CAP-04 and CAP-05. A candidate record; not a numbered capability.

### 7.4 Platform-wide capabilities in the AAB landscape

The AAB capability landscape also names capabilities that serve every domain. The landscape does not assign them to a domain.

| ID | Name | Description | State |
|---|---|---|---|
| CAP-13 | Conversational AAB Intelligence | No description is recorded beyond its name | `named only` |
| CAP-14A | Minimum Sovereign Scientific Messaging | Authorised messaging between scientists, inside the country's environment | `named only` |
| CAP-14B | Advanced Collaboration | No description is recorded beyond its name | `named only` (post-launch) |
| CAP-15 | Work & Attention Management | No description is recorded beyond its name | `named only` |
| CAP-16 | Sovereign Country Provisioning | Provisions a real country environment through the governed commissioning path | `named only` |
| CAP-17 | Technical Qualification | No description is recorded beyond its name | `named only` |
| CAP-18 | Governed Release & Country Update Management | No description is recorded beyond its name | `named only` |
| CAP-19 | Country-Local Support & Diagnostics | No description is recorded beyond its name | `named only` |
| CAP-20 | Country Capability Catalogue & Selection | Shows a country every capability truthfully, with its real status, and records what it selects | `designed` |
| CAP-21 | Commercial Agreement & Entitlement Management | Records country agreements and entitlements, kept separate from activation | `designed` |
| CAP-22 | Capability Availability, Readiness & Activation Control | No description is recorded beyond its name | `named only` |
| CAP-23 | Governed Identity & Authority Resolution | No description is recorded beyond its name | `named only` |
| CAP-24 | Governed Country, Institution & Professional Participation | No description is recorded beyond its name | `named only` |
| CAP-25 | Governed Human Decision & Approval Control | No description is recorded beyond its name | `named only` |
| CAP-26 | Sovereign Country Data Boundary | No description is recorded beyond its name | `named only` |
| CAP-27 | Protected Security Enforcement | No description is recorded beyond its name | `named only` |
| CAP-28 | Continuity, Backup & Recovery | No description is recorded beyond its name | `named only` |
| CAP-30 | Governed Country Assurance & Audit | No description is recorded beyond its name | `named only` |
| CAP-31 | Governed Domain Framework | No description is recorded beyond its name | `named only` |
| CAP-34 | Governed AAB Simulation & Demonstration Environment | A controlled simulation of AAB over synthetic data, for evaluation; never production | `implemented` |

CAP-29 is retired and not reused.

### 7.5 Future domains

The domain register and cognitive architecture (`governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`) names the domains AAB has planned. **A domain owns its own body of knowledge. The capabilities above operate across domains, and do not own them.**

| Domain | State |
|---|---|
| Supply Chain Sovereignty (SCS) | Current (sections 3 and 7.2) |
| Agricultural Science (AGR) | Current; the proving domain (sections 4 and 7.3) |
| Soil, Water, Climate, Environment, Ecosystem, Aquaculture | Planned. Each is an independent scientific domain, not part of Agriculture |
| Manufacturing, Regulatory, Commercial, Governance | Planned |

**Planned means part of the architecture, not designed or admitted.** No planned domain has a contract. Environmental restoration, waste and resource recovery, minerals and public health have been discussed, and are provisional. The platform keeps no official domain register yet.

## 8. Current position

| Area | State |
|---|---|
| Platform primitives | All eleven `implemented` in the SCS pilot; country isolation and backup `behaviourally proven` for their stated scope |
| SCS domain | 8 of 12 capabilities `behaviourally proven` (minimum vertical slices); 4 `named only` |
| AGR domain | 5 capabilities `designed` (CAP-01, 04, 05, 06, 08); the rest `named only`; a simulation `implemented` |
| Platform contracts | AAB-PLATFORM-01, 04 and 09 `behaviourally proven`; 02 and 03 `implemented`; 05 to 08 `designed` |
| Other domains | Planned; none designed (section 7.5) |
| Platform-wide landscape capabilities | 2 `designed` (CAP-20, CAP-21); CAP-34 `implemented`; the rest `named only` |
| Admitted capabilities | None |
| Commissioned environments | None |
| Gate D | Defined; no deployment assessed |
| Pilot joint admission authority | Defined; not yet constituted |

## What this overview does not establish

- It is not a contract, an offer or a promise of delivery.
- It does not replace the canonical contracts it summarises. It is cleared for external use only as a cover document that accompanies them.
- It admits, qualifies and commissions nothing.
- It makes no claim stronger than the governance records it summarises. The access isolation and backup-restore proof records set the strongest public wording their results support.
- It makes no compliance, regulatory, scientific-validity or performance claim.
