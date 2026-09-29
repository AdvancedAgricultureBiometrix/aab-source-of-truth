# CAP-08 Controlled Trials & Outcomes — Canonical Contract — 2026-09-29

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-08 Controlled Trials & Outcomes. It is not SCS-CAP-08 (Due Diligence Package Compilation), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-08: HOW A CONTROLLED TRIAL IS DESIGNED, AUTHORISED, OBSERVED UNDER ITS PROTOCOL, SUMMARISED, REVIEWED AND CLOSED, HOW ITS RESULTS ARE OFFERED TO CAP-04, AND ITS BOUNDARIES WITH CAP-04, CAP-07, CAP-09, CAP-10 AND PROPOSED CAP-36. Establishes no commissioning, production, Gate D, WP05, scientific-validity, efficacy or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-29, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-08 had no design contract before this one.

## Why this contract, and what it adopts

**Why.** CAP-08 is fourth in the workstream's order, and has the most rehearsal code of any capability: 21 gateway actions for trial workspaces, activation, observation capture, and observation and outcome review (roadmap, section 8.2). The evidence is the step 0 snapshots, **with the trial path in `agriculture` and all of `observation_core` read in full for this contract** ("What the rehearsal does").

**Its description** (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, line 202): CAP-08 "moves authorised candidates into controlled trials, and captures observations and outcomes". Its observations are **trial observations**: made inside a trial, under its protocol (the identity decisions of 2026-09-29, section 1).

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance):** every CAP-08 record carries the platform's `Provenance`.
- **AAB-PLATFORM-06 (admission decisions):** trial registrations, protocols, observations and field events are refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** an outcome summary is an evaluation over a persisted snapshot of the trial's observations, with the protocol pinned.
- **AAB-PLATFORM-08 (attributable human review):** template approval, trial activation, outcome review, trial closure, held resolutions, quarantine and challenges are human decisions.
- **AAB-PLATFORM-01 (evidence object store):** trial photographs and files are stored under the AGR storage profile.
- **CAP-04 as amended:** CAP-08's results reach scientific memory only as submissions to CAP-04, made by a person.
- **The platform's observation and brain governance** (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, approved on 2026-09-29), and the brain boundary it added to the purpose and values (`governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md`, amendment of 2026-09-29). CAP-08 is bound by it, and cites it: it owns controlled trial observations, and never absorbs the general field observation pathway ("Observation and brain governance").

AAB-PLATFORM-04 (actor–subject links) is **not adopted**: nothing in CAP-08 is submitted on behalf of another party ("Open gaps").

**Decisions recorded on 2026-09-29** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-08`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-08:`. Receipts are accepted already (migration 025).
2. **The protocol is declared before anything is observed, and locked when activation is requested.** Treatment arms, control arms, plots and replicates, the allocation method, blinding, the observation templates and the pre-declared outcome measures are all in it. A change after the lock is a new protocol version, which needs a new activation.
3. **A trial runs only on a scientist's activation decision** (`TRIAL_ACTIVATION`), bound to the locked protocol's digest, by someone who did not design it.
4. **Safety and ecology are CAP-10's.** Until CAP-10 has a contract, **activation requires a declared safety basis** (such as an existing registration of the material, or cited admitted evidence), which the activating scientist must address, and every trial discloses that AAB has not assessed safety or ecology (`SAFETY_ECOLOGY_NOT_ASSESSED`).
5. **Permits, ethics approval and landholder consent are declared and addressed, not verified.** The activation must address each, and none is presented as verified by AAB.
6. **Trial observations are admitted automatically under AAB-PLATFORM-06,** against the locked protocol and its approved templates. There is no per-observation approval; a scientist may quarantine an observation, with reasons. Nothing is overwritten: a correction is a new version.
7. **An outcome summary is a deterministic evaluation** of the trial's observations, per pre-declared outcome measure and per arm: counts, missing values, and descriptive statistics, with differences from the control arm shown as differences. **No significance test, no efficacy verdict, no "success" label** in this version.
8. **A scientist reviews the outcome summary** (`TRIAL_OUTCOME_REVIEW`). The reviewer never designed the trial and never recorded any of its observations. A negative or null result is accepted as readily as a positive one.
9. **A trial is closed by a human decision** (`TRIAL_CLOSURE`): completed, terminated early or abandoned. Closure never requires a positive result, and a failed trial is kept.
10. **Nothing leaves CAP-08 automatically.** A person submits an accepted outcome, and optionally its observations, to CAP-04, which decides admission. No approval triggers anything: the rehearsal's automatic cognitive runs are not carried across (the cognitive loop's retirement, 2026-09-29). **No brain analyses trial observations in this version** (interim position 2).
11. **Trial observations and field observations never mix.** A field or community observation (proposed CAP-36) never becomes, amends or counts as a trial observation, and cannot satisfy a protocol metric or an outcome measure. CAP-08 references the general field observation pathway and never duplicates it (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, section 4).
12. **Roles:** `TRIAL_DESIGNER`, `TRIAL_RECORDER`, `TRIAL_REVIEWER` and `TRIAL_READER`, each a scoped grant. **Trial photographs are uploaded by `TRIAL_RECORDER`**, which needs AAB-PLATFORM-01's AGR profile to name it as an uploader: a two-line amendment to AAB-PLATFORM-01, in the same change as this contract.
13. **Trial data stays in the country.** Trials, plots, observations, measurements and outcomes are the egress specification's category 2.

**Interim positions recorded on 2026-09-29** (approved by the Platform Owner in review, from the questions raised on the observation and brain governance; "Observation and brain governance" gives each in full):
1. **CAP-08 references, and does not duplicate, general field observations.** Trial photographs are trial evidence, owned by CAP-08; farmer and community field observations are proposed CAP-36's.
2. **No brain is yet defined to receive agricultural observations.** The cognitive loop is retired, and the Evidence Watch candidate (proposed CAP-35) has no contract. CAP-08 discloses that the automated reasoning pathway for observations is not yet defined; any brain analysis is a future capability.
3. **A quarantined observation is analysed only after intake and human triage** (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, section 3). File validation and malware scanning may run at intake; scientific analysis does not.
4. **Exact farmer coordinates are proposed CAP-36's question.** Trial plot coordinates are governed by the trial's protocol, and visible to the trial's authorised participants.
5. **Trial photographs are trial evidence,** owned by CAP-08 and stored under AAB-PLATFORM-01's AGR profile. They are not general field observations.
6. **CAP-08 does not admit evidence.** It produces trial outcomes that a person submits to CAP-04, where admission follows CAP-04's rules and a `MEMORY_REVIEWER` decides every held record.
7. **Admission is not learning.** CAP-08 produces outcomes; CAP-04 admits them as evidence; promotion to learning is a later human decision in a separate capability (CAP-09), not yet contracted. CAP-08 cites this chain and implements none of it.
8. **No safety escalation path exists yet.** An observation or field event indicating contamination, a biosecurity risk or a health risk is quarantined at once. The escalation authority and process are open, for a future governance decision.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **A scientist designs a trial and says, before anything is measured, what will be compared and how. Another scientist authorises it. People in the field record what the protocol asks, and nothing else counts. AAB summarises what was recorded, honestly and without a verdict. A scientist who took no part in the trial reviews the summary. What the trial found, including that something did not work, is then offered to scientific memory by a person.**

CAP-08 runs the trial and keeps its record. It does not decide that anything works, is safe, or should be adopted. It does not promote results into learning (CAP-09), and it does not assess safety or ecology (CAP-10).

## What CAP-08 answers, and what it does not

| Question | Answered by |
|---|---|
| Was a trial designed, authorised and run as its protocol required? | **CAP-08** |
| What was observed, where and when, under the protocol? | **CAP-08** |
| What do the trial's observations show, per arm and per outcome measure? | **CAP-08,** an outcome summary, reviewed by a scientist |
| Is the trial's result admitted as evidence? | CAP-04, on a person's submission |
| What does the admitted evidence, this trial's among it, say about a question? | CAP-05 |
| Has a learning claim earned promotion to validated knowledge? | CAP-09 |
| Is the material safe, and what is its ecological effect? | CAP-10, which has no contract yet |
| What is the formulation being tested? | CAP-07, which has no contract yet |
| What did someone see in a field outside any trial? | Proposed CAP-36 |
| Does it work? Should it be used? | Nothing in CAP-08. A trial's result is evidence, not a verdict |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** the four gateway groups `AAB_TRIAL_WORKSPACE_ACTIONS`, `AAB_TRIAL_ACTIVATION_ACTIONS`, `AAB_OBSERVATION_CAPTURE_ACTIONS` and `AAB_OBSERVATION_OUTCOME_ACTIONS` (`api.php`, lines 670–1044), every function behind them in `agriculture`, the workbench's send-to-trial action, the learning action that reads trials, and all of `observation_core`. `api.php` is `snapshot-2026-09-28/source-a/aab-local/app/_rebuild/api.php`; `functions.sql` and `tables.sql` are `agriculture`'s.

**What it does, as read:**
- **A trial can never be completed.** `complete_trial` is in the gateway's list of retired legacy actions (`api.php`, line 249), which returns HTTP 410 before its handler (line 1024) is reached. So no trial reaches `COMPLETED`, and the learning action, which requires a completed trial (`functions.sql`, line 1987), always fails.
- **One person can do everything.** The same actor can create a trial, add its plots, submit it, approve its activation, capture its observations, approve their review, record its outcome and approve that. No function checks that a reviewer is not the submitter. The rehearsal's own self-tests do exactly this.
- **A decision's required role is written and never checked** (`AGRICULTURE_SCIENTIST` is stored on decisions, and never compared with the decider).
- **Country scoping fails open.** Every check passes a null country, so any country-scoped grant counts everywhere (lines 86–90), and most writes check no membership.
- **The protocol stays open during review.** Plots and protocol bindings can be added while activation is under review (lines 537, 2789).
- **An observation's quality is the reviewer's own labels,** with passing defaults supplied by the gateway, and **an approved outcome's quality is typed into code as the strongest grades** (line 1431). Evidence eligibility follows from them, and is overwritten in place.
- **The trial's outcome status is stored, and goes backwards:** rejecting a later outcome sets a trial with an approved outcome back to `RECORDED` (line 1435).
- **Dead ends:** an observation approved "with warnings" can never change and blocks completion; photographs cannot be attached to trial observations through the gateway, so any metric that requires one blocks submission; metrics of type JSON always fail a constraint (lines 649–651).
- **No design safeguards:** no control arm is required, no randomisation or blinding is recorded, and replicate numbers are unchecked. **No statistics are computed:** an outcome is a free-text summary with client JSON.
- **No ethics, permit, consent or safety gating** before a trial goes into the field.
- **Every approved observation and outcome was fed to the cognitive loop as `SUPPORTS`,** whatever it showed (`cognitive_core/functions.sql`, lines 477–480, 593–596). The loop is retired.
- **Send-to-trial returns another country's trial by its code,** with no membership check (lines 3397–3402).
- **Audit misattributes decisions:** a reviewer's action on an observation is attributed to its observer, and an outcome's approval to its recorder (line 3434).

**The boundary with `observation_core`, confirmed by reading it:** the two paths are already separate. A trial observation requires a trial and a plot (`tables.sql`, lines 1960–1961), and an outcome requires a reviewed trial observation (`functions.sql`, line 2221). `observation_core` never attaches anything to a trial; its one column pointing at trial observations is written by nothing. They share only agriculture's photo, packet and governance tables, told apart by a text value.

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Trial created from a formulation by send-to-trial, with no crop, site or problem | **A trial registration** with its test material, context and objective, and **a protocol** declared before any observation |
| Plots and bindings mutable during review | **The protocol is locked when activation is requested** (decision 2) |
| Activation approved by anyone with `approve`, including the submitter | **`TRIAL_ACTIVATION`,** by a `TRIAL_REVIEWER` who did not design the trial |
| No safety, permit or consent gating | **A declared safety basis, permits and consent, each addressed** in the activation (decisions 4 and 5) |
| Per-observation review, labels chosen by the reviewer | **Observations admitted by rule,** with limitations; **quarantine** by a scientist when needed |
| Eligibility and data quality overwritten in place | **Not carried across.** Written once; state derived when read |
| Outcome as free text and client JSON, graded STRONG by code | **An outcome summary computed from the observations,** per measure and arm, and **reviewed by an independent scientist** |
| Trial outcome status stored, and regressing | **Derived when read** from the trial's decisions |
| `complete_trial` unreachable | **`TRIAL_CLOSURE`,** a human decision that never requires a positive result |
| Approvals feeding the loop as `SUPPORTS` | **Nothing automatic** (decision 10) |
| Evidence packets and the six-gate eligibility verdict | **Not carried across.** A person submits accepted results to CAP-04, which admits them |
| Photos impossible for trial observations; community photos on the host file system | **Trial photos as AAB-PLATFORM-01 objects** under the AGR profile |

**Not carried across, in any form:** one actor doing everything; unchecked required roles; fail-open country checks; mutable protocols; reviewer-chosen quality labels; hard-coded grades; stored and regressing statuses; overwritten eligibility; dead ends; cross-tenant reads by code; misattributed audit; automatic loop runs.

**The rehearsal's data is not CAP-08's.** CAP-08's records start empty in a new deployment. Bringing any rehearsal trial across is a separate governed decision ("Open gaps").

**No simulation to account for.** The CAP-34 fidelity manifest records CAP-08 as `NOT_YET_REPRESENTED`.

## The trial, and its protocol

Every CAP-08 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap08TrialRegistration {
  recordId: string;                      // set by the system
  recordVersion: number;
  schemaVersion: "urn:aab:schema:agr:cap-08:trial:1";
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  trialName: string;
  objective: string;                     // the question the trial asks

  testMaterial: {
    kind: "FORMULATION_VERSION" | "INGREDIENT" | "REGISTERED_PRODUCT" | "PRACTICE" | "OTHER";
    reference?: string;                  // a CAP-07 or CAP-06 record, once those exist; otherwise declared
    description: string;
  };

  context: {
    crops: string[];
    siteDescription: string;
    location: LocationReference;
    hostOrganizationId?: string;
    plannedStart: string;
    plannedEnd: string;
    problemReportIds: string[];          // CAP-01 problem reports the trial addresses
  };

  // Declared before activation, and addressed by the activating scientist
  preconditions: {
    safetyBasis: string;                 // why the material may be applied, until CAP-10 exists
    safetyEvidence: string[];            // admitted CAP-04 memoryRecordIds
    permits: Array<{ kind: string; reference: string; heldBy: string }>;
    ethicsApproval?: { body: string; reference: string };
    landholderConsent: { obtained: boolean; basis: string };
  };

  classification: {
    sharingClassification: string;
    permittedUses: string[];
    traditionalKnowledgeLinked: boolean;
    personalInformationPresent: boolean;
  };

  supersedes?: { recordId: string; recordVersion: number; recordDigest: string; reason: "CORRECTION" | "UPDATE" | "WITHDRAWAL"; explanation: string };
  recordDigest: string;
}

interface Cap08Protocol {
  recordId: string;
  recordVersion: number;                 // a change after the lock is a new version, needing a new activation
  schemaVersion: "urn:aab:schema:agr:cap-08:protocol:1";
  trialRecordId: string;

  arms: Array<{
    armCode: string;
    role: "TREATMENT" | "CONTROL" | "REFERENCE";
    description: string;                 // what is applied, how much, when
  }>;

  plots: Array<{
    plotCode: string;                    // unique within the trial
    armCode: string;
    replicate: number;
    location: LocationReference;
    area?: { value: number; unit: string };
  }>;

  design: {
    allocation: "RANDOMISED" | "SYSTEMATIC" | "NOT_RANDOMISED";
    allocationMethod: string;            // as declared
    blinding: "NONE" | "OBSERVER_BLINDED" | "OTHER";
    blindingNote?: string;
  };

  templates: Array<{ templateVersionId: string; role: "PRIMARY" | "SUPPLEMENTARY" | "OUTCOME" }>;

  outcomeMeasures: Array<{
    measureCode: string;
    priority: "PRIMARY" | "SECONDARY";
    metricCode: string;                  // a metric of a bound template
    aggregation: "LAST_OBSERVATION" | "MEAN_OVER_PERIOD" | "TOTAL" | "MAXIMUM";
    window?: { from: string; to: string };
  }>;

  analysisPlan: string;                  // declared: what the scientists intend to compare, and how
  lockedAt?: string;                     // set by the system when activation is requested
  recordDigest: string;
}
```

**Protocol rules:**
- **A trial has at least one treatment arm, one control arm and one outcome measure.** A trial without a control arm is refused (`PROTOCOL_INCOMPLETE`): an uncontrolled demonstration is not a controlled trial, and is proposed CAP-36's field observation.
- **Every arm has at least one plot.** Replicates are declared; fewer than two per arm is disclosed as `UNREPLICATED`, not refused.
- **Allocation and blinding are recorded as declared.** `NOT_RANDOMISED` and `NONE` are disclosed in every outcome summary.
- **Every template must be an approved template version** (`TEMPLATE_APPROVAL`), and every outcome measure must name a metric of a bound template.
- **The protocol is locked** when activation is requested: `lockedAt` is set, and the activation decision binds to its digest. Nothing about the design changes after that without a new version and a new activation.

## Observation templates and metric definitions

- **A metric definition** declares a code, a value type (`INTEGER`, `DECIMAL`, `BOOLEAN`, `TEXT`, `ENUM`, `DATE`, `DATETIME`), a canonical unit, precision, a plausible range, enum options, and whether a photograph is required.
- **A template version** lists metrics, each `REQUIRED`, `RECOMMENDED`, `OPTIONAL` or `CONDITIONAL` (with its declared rule).
- **Both are CAP-08 records,** written once and versioned. **A template version is usable only after a `TEMPLATE_APPROVAL` decision** by a `TRIAL_REVIEWER`. A retired metric never silently drops out of a template already bound: the bound version is what a protocol uses, unchanged.
- **Observers submit values in canonical units.** AAB owns the units, as the rehearsal's catalogue already said.

## Trial observations

A trial observation is made under an active trial, on one of its plots, against a bound template, by a `TRIAL_RECORDER`.

```typescript
interface Cap08TrialObservation {
  recordId: string;
  recordVersion: number;
  schemaVersion: "urn:aab:schema:agr:cap-08:observation:1";
  trialRecordId: string;
  protocolRecordId: string;
  protocolVersion: number;               // the activated version
  plotCode: string;
  templateVersionId: string;

  observedAt: string;                    // declared: when it was observed in the field
  deviceCapturedAt?: string;             // declared: the device's own clock, for offline capture
  clientCaptureId?: string;              // declared: for offline replay
  location?: LocationReference;          // declared, with accuracy

  values: Array<{ metricCode: string; value: number | string | boolean; unit: string }>;
  collection: {                         // declared: how the values were obtained
    method: string;                      // the measurement method, as the template names it
    instrument?: string;
    instrumentCalibrationRef?: string;
  };
  environmentalConditions?: string;     // declared: weather and field conditions at the time
  photos: string[];                      // agr-object references (AAB-PLATFORM-01, AGR profile): trial evidence, owned by CAP-08
  mediaShowsPeopleOrNeighbouringProperty: boolean;  // declared: people, vehicles or neighbouring properties in any photo
  safetySignal?: {                      // declared: an urgent concern seen in the field
    kind: "CONTAMINATION" | "BIOSECURITY" | "HEALTH" | "OTHER";
    description: string;
  };
  notes?: string;

  provenance: Provenance;
  supersedes?: { recordId: string; recordVersion: number; recordDigest: string; reason: "CORRECTION" | "WITHDRAWAL"; explanation: string };
  recordDigest: string;
}
```

**Admission** (rules version `cap-08-admission-1`), in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `RECORDER_AUTHORITY`: `TRIAL_RECORDER` in the trial's country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `TRIAL_ACTIVE`: the trial's current activation is `AUTHORISE`, valid, and the trial is not closed | **Refuses:** `TRIAL_NOT_ACTIVE` |
| 3 | `UNDER_PROTOCOL`: the plot and template are in the activated protocol version | **Refuses:** `NOT_UNDER_PROTOCOL` |
| 4 | `VALUES_VALID`: every value matches its metric's type, unit, precision, range and options; every required metric present | **Refuses:** `OBSERVATION_VALUES_INVALID`, naming each |
| 5 | `TIME_PLAUSIBLE`: `observedAt` is not in the future, and within the trial's period | **Limitation:** `OUTSIDE_TRIAL_PERIOD`; a future time **refuses** |
| 6 | `PHOTOS_PRESENT`: every metric requiring a photo has one, and every photo reference is a stored AGR object | **Refuses:** `PHOTO_REQUIRED`, or `PHOTO_NOT_FOUND` |
| 7 | `RECOMMENDED_PRESENT` | **Limitation:** `RECOMMENDED_MISSING` |
| 8 | `DEVICE_TIME_CONSISTENT`: where both are given, device time and observed time agree within a day | **Limitation:** `DEVICE_TIME_INCONSISTENT` |
| 9 | `COLLECTION_DECLARED`: the measurement method is declared; environmental conditions are recorded | **Limitation:** `ENVIRONMENT_NOT_RECORDED` when conditions are absent. A missing method **refuses** (`REQUEST_VALIDATION_FAILED`) |
| 10 | `SENSITIVE_CONTENT`: no personal information declared (for example a named farmer in the notes), and no photo declared to show people, vehicles or neighbouring properties | **Held:** `PERSONAL_INFORMATION`, or `MEDIA_REVIEW_REQUIRED` |
| 11 | `NO_SAFETY_SIGNAL`: no contamination, biosecurity or health concern declared | **Held at once:** `SAFETY_SIGNAL` (interim position 8) |

- **Offline replay:** the same `clientCaptureId` and the same content return the first result; the same identifier with different content is refused (`IDEMPOTENCY_KEY_CONFLICT`). The identifier is scoped to the recorder.
- **Correction** is a new version, superseding the old, with its reason. The superseded version stays readable and is never counted in a later summary.
- **Quarantine:** a `TRIAL_REVIEWER` may quarantine an admitted observation (`TRIAL_OBSERVATION_QUARANTINE`), with reasons, and release it. A quarantined observation is excluded from summaries by policy, and the exclusion is shown. The recorder never releases their own.
- **Field events** are recorded the same way, by a `TRIAL_RECORDER`: a `PROTOCOL_DEVIATION` (what was not done as the protocol required), or an `ADVERSE_EVENT` (harm to crops, soil, water, animals or people). **Every field event appears in every later outcome summary,** and an adverse event is always disclosed.
- **A safety signal is quarantined at once** (interim position 8). An observation, or an adverse event, declaring contamination, a biosecurity risk or a health risk is held on admission, fail closed, for a `TRIAL_REVIEWER`. The trial shows `SAFETY_SIGNAL_OPEN` on every read until every such record is resolved. **Who must be told, how fast, and who may stop a trial are not defined:** the escalation authority and process are an open gap, for a future governance decision.
- **Accepted into the trial record is not admitted as evidence.** CAP-08's admission, under AAB-PLATFORM-06, accepts an observation into the trial's own record. **Evidence admission is CAP-04's alone** (interim position 6). A controlled trial observation remains subject to scientific review and evidence-admission requirements (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, section 2.2).

## The outcome summary

**An outcome summary is an evaluation** (AAB-PLATFORM-07) of one trial, over a frozen snapshot of its admitted observations and field events, with the activated protocol pinned. It is written once, with its snapshot and receipt. A `TRIAL_DESIGNER` or `TRIAL_REVIEWER` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-08 |
|---|---|
| `manifest.scope.scopeRule` | `cap-08-trial-scope`, version `1`: every admitted, current observation and field event of the trial, under its activated protocol version |
| `manifest.scope.subjectKey` | Derived from the trial's `recordId` and the protocol version |
| `manifest.selection.mode` | `SCOPE_DERIVED` |
| `manifest.selection.quarantined` | `EXCLUDE`, each shown as an exclusion |
| `manifest.selection.policy` | `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | `PROTOCOL` (the activated version, by digest); `TEMPLATE_VERSIONS`; `METRIC_DEFINITIONS` |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed |
| `cutoffAt` | The platform's clock |

```typescript
interface Cap08OutcomeSummary {
  evaluationId: string;                  // content-derived
  capabilityId: "CAP-08";
  resultType: "TRIAL_OUTCOME_SUMMARY";
  schemaVersion: "urn:aab:schema:agr:cap-08:outcome-summary:1";
  binding: SnapshotBinding;              // rulesVersion "cap-08-summary-rules-1"
  trialRecordId: string;
  protocolVersion: number;
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  measures: Array<{
    measureCode: string;
    priority: "PRIMARY" | "SECONDARY";
    unit: string;
    arms: Array<{
      armCode: string;
      role: "TREATMENT" | "CONTROL" | "REFERENCE";
      plotsPlanned: number;
      plotsWithData: number;
      n: number;
      missing: number;
      mean?: number;
      standardDeviation?: number;
      minimum?: number;
      maximum?: number;
    }>;
    differencesFromControl: Array<{
      armCode: string;
      controlArmCode: string;
      meanDifference?: number;           // treatment mean minus control mean, in the measure's unit
    }>;
  }>;

  // Findings, each with an identifier derived from its content
  findings: Array<{
    findingId: string;
    kind:
      | "MEASURE_NO_DATA"
      | "ARM_NO_DATA"
      | "PLOT_NO_DATA"
      | "UNREPLICATED"
      | "NOT_RANDOMISED"
      | "NOT_BLINDED"
      | "PROTOCOL_DEVIATION"
      | "ADVERSE_EVENT"
      | "OUTSIDE_TRIAL_PERIOD"
      | "QUARANTINED_EXCLUDED";
    detail: string;
    recordIds: string[];
  }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    summaryIsNotAVerdict: true;
    noSignificanceTest: true;
    noEfficacyClaim: true;
    noSafetyAssessment: true;
    negativeResultsKept: true;
  };
}
```

**The rules** (`cap-08-summary-rules-1`). The summary is a pure function of its snapshot and these rules, exactly reproducible except `evaluatedAt`.
- **Per plot, a measure's value is the protocol's declared aggregation** of that plot's observations of the metric, within the measure's window.
- **Per arm:** the plots with data, `n`, missing, mean, standard deviation, minimum and maximum of the plot values. **A difference from control** is the treatment mean minus the control mean, in the measure's unit, **shown as a difference and nothing more.**
- **No significance test, confidence interval, effect-size label, ranking, or word such as "effective", "improved" or "successful".** Analyses beyond these descriptive statistics are the scientists' to do, following the declared analysis plan; how their analyses are recorded is an open gap.
- **Findings:** every measure, arm or plot with no data; `UNREPLICATED`, `NOT_RANDOMISED` and `NOT_BLINDED` from the protocol; every protocol deviation and adverse event; every observation outside the trial's period; every quarantined observation excluded.
- **Disclosures, always:** `MACHINE_GENERATED`; `SAFETY_ECOLOGY_NOT_ASSESSED` (until CAP-10); `PRECONDITIONS_DECLARED_NOT_VERIFIED`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`; `DESCRIPTIVE_STATISTICS_ONLY`; `AUTOMATED_REASONING_PATHWAY_NOT_DEFINED` (interim position 2). **Where it applies:** `SAFETY_SIGNAL_OPEN`.
- **An empty snapshot is refused** (`NO_OBSERVATIONS`), and nothing is written.
- **Missing data is `EVIDENCE REQUIRED`.** A measure, arm or plot with no data is a finding that says so. It is never treated as a null result, a likely result, or an accepted one (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, section 8).

**The summary and the brain boundary.** An outcome summary is automated output, and meets every requirement the platform sets on it (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`, section 5): it is **labelled machine-generated** (the disclosure `MACHINE_GENERATED`, always present); linked to its source observations through its snapshot; versioned by its rules and evaluator versions, and timestamped; explainable, since every figure follows from rules stated here; exactly reproducible; accompanied by its findings, its counts and its standard deviations; superseded by a later summary, never changed; and kept separate from accepted conclusions, which only a person's review and CAP-04's admission produce. **It is arithmetic, not reasoning:** no brain forms a hypothesis or a conclusion from a trial in this version.

## Human decisions

| Decision kind | On | By | Outcomes (class) |
|---|---|---|---|
| `TEMPLATE_APPROVAL` | A template version | `TRIAL_REVIEWER`, not its author | `APPROVE` (affirmative), `REJECT` (negative), `CHANGES_REQUIRED` (deferred) |
| `TRIAL_ACTIVATION` | The locked protocol version, with the registration | `TRIAL_REVIEWER`, never the trial's designer or the protocol's author | `AUTHORISE`, `NOT_AUTHORISED`, `CHANGES_REQUIRED` |
| `TRIAL_OUTCOME_REVIEW` | An outcome summary | `TRIAL_REVIEWER`, never the designer, the protocol's author, or the recorder of any member (AAB-PLATFORM-08, section 3) | `ACCEPT_AS_TRIAL_RECORD`, `NOT_ACCEPTED`, `FURTHER_ANALYSIS_NEEDED` |
| `TRIAL_CLOSURE` | The trial | `TRIAL_REVIEWER` | `COMPLETED`, `TERMINATED_EARLY`, `ABANDONED` (each recorded as affirmative: a closure is a fact of the trial, not a judgement of its result) |
| `CAP08_HELD_RESOLUTION` | A held record | `TRIAL_REVIEWER`, never its submitter | `ADMIT`, `REJECT`, `REQUIRE_INFORMATION` |
| `TRIAL_OBSERVATION_QUARANTINE`, and its release | An observation | `TRIAL_REVIEWER`; the recorder never releases their own | Quarantined; released |

- **Activation addresses every precondition** by name: the safety basis and its evidence, each permit, the ethics approval or its absence, landholder consent, and `SAFETY_ECOLOGY_NOT_ASSESSED`. **An activation is not a verification of any of them,** and says so.
- **An outcome review addresses every finding** by its identifier, and acknowledges every disclosure. **It accepts a trial record, never a claim:** `ACCEPT_AS_TRIAL_RECORD` means the summary is a faithful record of the trial as run, whatever it shows.
- **Closure** requires no accepted outcome. A trial terminated early, or abandoned, is recorded as such, with its reasons, and kept.
- **Currency of an outcome review.** Every platform change kind is a trigger: an observation corrected or quarantined after the summary, a new field event, a protocol or template change, a later summary of the same trial, the rules version changed. **Lapse:** none: a trial record does not lapse with time.
- **Challenge:** a `TRIAL_REVIEWER` other than the decider, or the trial's designer, may challenge any of these decisions. Resolved by a `CHALLENGE_RESOLUTION` decision, by a `TRIAL_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-08. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** An upheld challenge to an activation stops new observations being admitted until a new activation; past observations stay, disclosed as made under an invalidated activation.
- **One decider per decision.**

## Offering results to CAP-04

- **After a valid, current `ACCEPT_AS_TRIAL_RECORD` review,** a person holding `MEMORY_SUBMITTER` may submit to CAP-04:
  - the outcome summary, as an `OUTCOME_RECORD`, with `source.sourceType` `CAPABILITY_OUTPUT` and lineage `PRODUCED_BY` the summary's evaluation;
  - the trial's design and observations, as a `TRIAL_RECORD` or `DATASET`.
- **CAP-04 decides admission,** by its own rules. CAP-08 never writes to CAP-04.
- **A summary not accepted,** or accepted with findings, may still be submitted. **Negative and null results are submitted the same way.** What CAP-04 admits, CAP-05 and CAP-09 may use; CAP-08 does not decide what they conclude.
- **Nothing is submitted automatically,** and no decision in CAP-08 triggers any other capability (decision 10).
- **The chain, which CAP-08 cites and does not implement** (interim positions 6 and 7): CAP-08 produces a trial outcome; a person submits it to CAP-04; CAP-04 admits it as evidence, by its rules, with a `MEMORY_REVIEWER` deciding any held record; promotion to learning is a later human decision in CAP-09, not yet contracted.

## Observation and brain governance

**CAP-08 cites `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md` as binding.** That record establishes two observation classes, the canonical observation chain, each capability's responsibilities, the brain boundary, machine state, consent, authority and privacy, and fail-closed requirements. CAP-08's place in it:

| The record says | CAP-08 |
|---|---|
| A controlled trial observation is bound to its trial, protocol, plot, treatment and control, observer identity and authority, time and location, method and units, instrument or collection method, environmental conditions, deviations, provenance, corrections and review state (section 2.2) | Each is a field of the observation, its protocol or its admission ("Trial observations"): method is required, instrument and conditions declared, their absence disclosed |
| CAP-08 owns trial creation, protocol and treatment structure, authorised observers, trial measurements and observations, outcomes, deviations, and trial review and approval states (section 4) | As defined here |
| CAP-08 must not absorb the general farmer or community upload pathway (section 4) | Decision 11; interim positions 1, 4 and 5 |
| For trials, scientific admission, brain analysis and learning promotion remain separately controlled (section 3) | CAP-04 admits; no brain analyses trial observations in this version; CAP-09 promotes (interim positions 2, 6 and 7) |
| Automated outputs are labelled, linked, versioned, explainable, reproducible, with uncertainty, supersedable and separate from conclusions (section 5) | The outcome summary meets each ("The outcome summary") |
| Consent does not establish admissibility; location, people and neighbouring property in media, and confidentiality are handled separately (section 7) | Landholder consent is a declared precondition; media showing people, vehicles or neighbouring property is held for review; plot coordinates are visible only to the trial's authorised participants |
| Missing evidence produces EVIDENCE REQUIRED (section 8) | Every measure, arm or plot with no data is an `EVIDENCE REQUIRED` finding |

**The interim positions** (recorded on 2026-09-29, with the decisions):
- **The brain pathway for observations is not yet defined** (interim position 2). No brain receives trial observations in this version, and every outcome summary says so. Any brain analysis is a future capability, bound by the platform's brain boundary when it is contracted.
- **Quarantined observations** (interim position 3) are excluded from every summary, and are analysed by nothing until they have passed intake and a person's triage.
- **Coordinates** (interim position 4). A plot's location is part of the protocol, visible to the trial's `TRIAL_DESIGNER`s, `TRIAL_RECORDER`s, `TRIAL_REVIEWER`s and `TRIAL_READER`s in its country workspace. Exact coordinates of farmers' own field observations are proposed CAP-36's to govern, not CAP-08's.
- **Trial photographs** (interim position 5) are trial evidence, owned by CAP-08, stored as AGR objects, and never general field observations.

### Trial observations and field observations

- **A trial observation is made only through CAP-08,** under an active trial's protocol, by a `TRIAL_RECORDER`, against an approved, bound template.
- **A field or community observation** (proposed CAP-36) **never becomes, amends or counts as a trial observation.** A farmer's report about a trial plot is CAP-36's, and cannot satisfy a protocol metric or an outcome measure. A scientist's observation outside a protocol is CAP-36's too.
- **The two keep their own photographs, decisions and authorities.** The rehearsal's shared photo, packet and governance tables, and the unused column in `observation_core` pointing at trial observations, are not carried across.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-08 |
|---|---|
| Scope rules | `cap-08-trial-scope`, version `1` |
| Selection policies | `ALL_ADMITTED`, version `1`; `SCOPE_DERIVED`; quarantined `EXCLUDE`, shown |
| Pinned inputs | `PROTOCOL`, `TEMPLATE_VERSIONS`, `METRIC_DEFINITIONS` |
| Integrity re-check; empty snapshot | Not required, disclosed; an empty snapshot refuses |
| Evaluator and rules versioning | `rulesVersion` `cap-08-summary-rules-1`; rules are code, so no `rulesDigest` |
| Non-reproducible fields | `evaluatedAt`. Identifiers derived from content |
| Existing evaluations and decisions | **None.** The rehearsal's reviews, packets and eligibility verdicts are not mapped |
| Decision kinds, roles, outcomes | "Human decisions" |
| Separation of duties beyond the platform's | The activator is never the designer or the protocol's author; the outcome reviewer is never the designer or the protocol's author |
| Findings a review must address | Every finding; every disclosure; for activation, every precondition |
| More than one decider | Not required |
| Challenging role | `TRIAL_REVIEWER` other than the decider, or the trial's designer |
| Triggers and lapse | All ten change kinds; no lapse |
| What relies on reviews | A submission of results to CAP-04 is made on a valid, current `ACCEPT_AS_TRIAL_RECORD` review, and records the currency relied on. A submission later resting on an invalidated review is CAP-04's to handle, as a supersession or withdrawal by its submitter |

## Authority

| Role | May |
|---|---|
| `TRIAL_DESIGNER` | Register trials; write protocols, templates and metric definitions; request activation; request outcome summaries |
| `TRIAL_RECORDER` | Record trial observations and field events; upload trial photographs under the AGR storage profile |
| `TRIAL_REVIEWER` | Approve templates; activate, review and close trials; resolve held records; quarantine and release observations; challenge and resolve challenges |
| `TRIAL_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name.
- **Reads are within one country workspace.** A trial code or identifier never reveals whether a trial exists in another.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP08_RECORD_ADMISSION` | A trial, protocol, template, metric, observation or field event is held or admitted |
| `CAP08_HELD_RESOLUTION` | A held record is resolved |
| `TEMPLATE_APPROVAL`, `TRIAL_ACTIVATION`, `TRIAL_OUTCOME_REVIEW`, `TRIAL_CLOSURE` | The decision is made |
| `TRIAL_OUTCOME_SUMMARY` | A summary is recorded, with its snapshot |
| `TRIAL_OBSERVATION_QUARANTINE`, `TRIAL_OBSERVATION_QUARANTINE_RELEASE` | An observation is quarantined or released |
| `CAP08_DECISION_CHALLENGE`, `CAP08_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-08"`.

| Operation | Route |
|---|---|
| `registerTrial`, `writeProtocol`, `writeTemplate`, `writeMetric` | `POST /agr/v1/trials`, `/agr/v1/trials/:trialId/protocols`, `/agr/v1/trial-templates`, `/agr/v1/trial-metrics` |
| `requestActivation` | `POST /agr/v1/trials/:trialId/activation-requests` (locks the protocol) |
| `decide` | `POST /agr/v1/trials/:trialId/decisions`, naming its kind: activation, outcome review or closure |
| `approveTemplate` | `POST /agr/v1/trial-templates/:templateVersionId/approvals` |
| `recordObservation`, `recordFieldEvent` | `POST /agr/v1/trials/:trialId/observations`, `/agr/v1/trials/:trialId/field-events` |
| `quarantineObservation`, `releaseQuarantine` | `POST /agr/v1/trials/:trialId/observations/:observationId/quarantines`, `/quarantine-releases` |
| `requestOutcomeSummary`, `getOutcomeSummary` | `POST /agr/v1/trials/:trialId/outcome-summaries`; `GET …/:evaluationId` |
| `uploadTrialPhoto` | `POST /agr/v1/evidence-objects` (AAB-PLATFORM-01, AGR profile), as a `TRIAL_RECORDER` |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/trials/challenges`; `/agr/v1/trials/challenges/:challengeId/resolutions` |
| `getTrial`, `listTrials` | `GET /agr/v1/trials/:trialId`, with its state derived; `GET /agr/v1/trials?…` |

Every write requires an `Idempotency-Key`. **A trial's state is derived when read** from its decisions: registered, awaiting activation, active, closed; whether it has an accepted outcome review; and whether a safety signal is open.

## Failure contract

```typescript
interface Cap08Failure {
  ok: false;
  capabilityId: "CAP-08";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "PROTOCOL_INCOMPLETE"
    | "PROTOCOL_LOCKED"
    | "TEMPLATE_NOT_APPROVED"
    | "TRIAL_NOT_ACTIVE"
    | "NOT_UNDER_PROTOCOL"
    | "OBSERVATION_VALUES_INVALID"
    | "OBSERVED_IN_FUTURE"
    | "PHOTO_REQUIRED"
    | "PHOTO_NOT_FOUND"
    | "SUPERSESSION_NOT_PERMITTED"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "RECORD_NOT_FOUND"
    | "NO_OBSERVATIONS"
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
| `UNAUTHENTICATED` | 401 | No actor |
| `ROLE_NOT_AUTHORISED` | 403 | The actor lacks the role, in a scope covering the country workspace |
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, or supplies a system-set field |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key, or an offline capture identifier, was used with different content |
| `CLASSIFICATION_INCOMPLETE` | 422 | A classification field is missing |
| `PROTOCOL_INCOMPLETE` | 422 | No treatment arm, no control arm, no outcome measure, an arm with no plot, or a measure naming no bound metric |
| `PROTOCOL_LOCKED` | 409 | A change to a locked protocol version |
| `TEMPLATE_NOT_APPROVED` | 422 | A protocol binds a template version with no approval |
| `TRIAL_NOT_ACTIVE` | 409 | No valid `AUTHORISE` activation, or the trial is closed |
| `NOT_UNDER_PROTOCOL` | 422 | The plot or template is not in the activated protocol |
| `OBSERVATION_VALUES_INVALID` | 422 | A value's type, unit, precision, range or option is invalid, or a required metric is missing |
| `OBSERVED_IN_FUTURE` | 422 | `observedAt` is after the platform's clock |
| `PHOTO_REQUIRED`, `PHOTO_NOT_FOUND` | 422 | A required photograph is missing, or a reference is not a stored AGR object |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or not the recorder's to correct |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND` | 404 | None the actor may read |
| `NO_OBSERVATIONS` | 422 | An outcome summary over an empty snapshot |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A finding, disclosure or precondition is not addressed |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | The decision does not fit the trial's state, such as an outcome review of a trial never activated |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | The database, the store or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-08 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Receives results,** on a person's submission; holds the safety evidence a trial cites | `designed`; built first |
| AAB-PLATFORM-01 (AGR profile) | **Stores trial photographs and files** | `designed` for the AGR profile |
| CAP-07 Formulation Intelligence | **The formulation under test,** when the material is a formulation. Until CAP-07 has a contract, the material is declared | `named only` |
| CAP-06 Ingredient Intelligence | **The ingredient under test,** likewise | `named only` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety and ecology.** Until it exists, activation relies on a declared safety basis, disclosed | `named only` |
| CAP-01 Country Intelligence & Discovery | **Optional:** a trial may name the problem reports it addresses | `designed` |
| The country's tenancy and participation (CAP-16, CAP-24) | **The workspace, the host organisation, and the people who hold the roles** | `named only` |

## Open gaps

**Contract gap: CAP-10.** Safety and ecology have no contract. A trial applies material in the field on a declared safety basis that AAB does not assess. This is the most serious gap in CAP-08, and it is disclosed on every trial.

**Contract gap: safety escalation** (interim position 8). A safety signal is quarantined at once, but who must be told, how fast, who may stop a trial, and how a stop is recorded are not defined. They need a future governance decision.

**Contract gap: automated reasoning over trial observations** (interim position 2). No brain is defined to receive them. When one is, it is bound by the platform's brain boundary, and CAP-08 is amended to say what it may read.

**Contract gap: permits, ethics and consent.** What permits and approvals a field trial needs is each country's to say, with its institutions. CAP-08 records them as declared; it does not verify them or know which are required.

**Contract gap: statistical analysis.** The outcome summary is descriptive. How a scientist's formal analysis, following the declared analysis plan, is recorded, reviewed and bound to the summary is not defined.

**Contract gap: multi-site and multi-season trials.** A trial here has one protocol and one period. Trials across sites or seasons, and their pooling, are not defined.

**Contract gap: the test material.** Until CAP-06 and CAP-07 have contracts, the material under test is declared, not a governed reference.

**Contract gap: people in the field.** Farmers and landholders who host trials are not actors here, and a recorder's notes may name them. How they take part, consent, and see results is CAP-24's to define with the country.

**Platform gap: an invalidated admission.** As in CAP-01, CAP-04 and CAP-05, AAB-PLATFORM-07 has no change kind for a member whose admission is invalidated.

**Contract gap: bringing rehearsal data across.** No rehearsal trial is a CAP-08 record. Importing one would be a registration like any other, declaring the rehearsal as its source, and its observations would carry every limitation the rehearsal's design implies.

**Current system limit: no implementation.** Nothing of CAP-08 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any material is safe, effective, or fit for any use, or that any trial result is true beyond what was recorded.
- It does not authorise anyone to present an outcome summary as proof of efficacy.
- It does not verify permits, ethics approval or consent, or define which a country requires.
- It does not define CAP-06, CAP-07, CAP-09 or CAP-10, or what CAP-04 admits.
- It does not make CAP-08 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-08: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
