# AGR Capability Identity Decisions — 2026-09-29

**Status:** GOVERNANCE RECORD — IDENTITY DECISIONS — NOT AN ADMISSION AUTHORITY
**Domain:** Agricultural Science (AGR)
**Authority:** RECORDS THE IDENTITY DECISIONS MADE IN REVIEW FOR THREE GROUPS OF REHEARSAL CODE THAT HAD NO CAPABILITY NUMBER: OBSERVATION, RESOURCE INTELLIGENCE AND COGNITIVE INTELLIGENCE. It proposes one capability number, CAP-36, and makes no number canonical. It admits no capability, writes no contract, grants no implementation authority, and does not alter commissioning status, satisfy Gate D, close WP05, or grant any production authority.
**Decided:** in review, on 2026-09-28 (the overlap check and the proposed numbers), and recorded here on 2026-09-29.
**Required by:** `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.4 and decision 14: "Observation, cognitive intelligence and resource intelligence need capability numbers and identities before their migration paths are defined."
**Evidence:** the step 0 snapshots, `agr-rehearsal/snapshot-2026-09-28/` and `agr-rehearsal/snapshot-2026-09-28-supplementary/`. The gateway is `source-a/aab-local/app/_rebuild/api.php` in the first.

## Note of 2026-09-29: `cognitive_foundation_workspace` moved from CAP-01 to the held group

**A correction to section 3.** `cognitive_foundation_workspace` was assigned to CAP-01 on the gateway alone. Reading its function in `cognitive_core` for CAP-05's canonical amendment of 2026-09-29 shows otherwise: **it is a dashboard for the whole kernel,** not a CAP-01 action. It returns the brain and algorithm registries, every domain's brain inheritance, targets, problems, transformation opportunities, ingredient build candidates and the reassessment queue. It takes no domain, and filters only by country membership (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/cognitive_core/`, `api_get_foundation_workspace`).

- **It moves from CAP-01 to the held group,** and its identity is held with the loop's, until `cognitive_core` is read and understood for that decision. Section 3 and the summary are marked in place.
- **CAP-01 now holds 15 rehearsal actions,** not 16: the 13 of resource intelligence, `submit_problem_signal` and `create_transformation_opportunity`. Decision 4 stands: CAP-01 keeps its place in the order, third.
- **The other assignments stand.** Reading `cognitive_core` confirms `submit_problem_signal` for CAP-01 and `propose_ingredient_build_candidate` for CAP-06. `create_transformation_opportunity` stays with CAP-01.
- **The CAP-05 citation in section 3** now points to the amended contract, where the design's final decision is kept unchanged ("What the rehearsal does, and how this contract accounts for it"). CAP-05's amendment also records what the loop does, from its code.

## Note of 2026-09-29: eight of the 34 country actions are not platform-wide

**A correction to the roadmap's mapping.** The roadmap (section 8.2) maps all 34 actions of `AAB_COUNTRY_ACTIONS` to platform-wide capabilities (CAP-16, CAP-24), with `manufacturing_generate_transfer` as CAP-12. Reading `country_core` in full for CAP-01's canonical contract shows that **eight are not platform-wide.** Decided in review of that contract on 2026-09-29 (its decision 11):

| Actions | Capability | Why |
|---|---|---|
| `country_start_bootstrap`, `country_scan_events`, `country_generate_brief`, `country_recommendations`, `country_economic_context`, `country_scan_knowledge` | **CAP-01** | Country intelligence: the bootstrap scan and its events, the country brief, recommendations, economic facts and scan principles |
| `country_source_status` | **CAP-02** | The list of source adapters: acquisition from external sources |
| `country_starter_ingredients` | **CAP-06** | The starter ingredient library |

- **None is brought across.** The bootstrap is narration (eleven fixed "brain" events), the economic facts are typed into code for Thailand only, the brief is a template and its recommendation fixed. CAP-01's records and dossiers replace them (`governance/workstream-b/CAP-01-COUNTRY-INTELLIGENCE-AND-DISCOVERY-CANONICAL-CONTRACT-2026-09-29.md`, "What the rehearsal does").
- **The other 26 stay as mapped:** tenancy, membership, onboarding, institutions, sharing and preferences to the platform-wide capabilities; `manufacturing_generate_transfer` and `manufacturing_transfer_summary` to CAP-12; `country_impact` and `country_refresh_impact` unassigned, as impact reporting.
- **CAP-01's count is unchanged at 15 rehearsal actions it absorbs.** The six country actions are assigned to it and retired, not absorbed.
- **The roadmap's row is corrected in its next update.**

## Summary

| Rehearsal group | Actions | Decision | New number |
|---|---:|---|---|
| **Observation** (`AAB_OBSERVATION_ACTIONS`) | 21 | Its own capability, not part of CAP-08 | **CAP-36, proposed.** Not canonical until the ten-point checklist is met |
| **Resource intelligence** (`AAB_RESOURCE_INTELLIGENCE_ACTIONS`) | 13 | Belongs to **CAP-01** Country Intelligence & Discovery | None |
| **Cognitive intelligence** (`AAB_COGNITIVE_ACTIONS`) | 9 | Split: three actions to **CAP-01** and **CAP-06**; the loop, its reads and `cognitive_foundation_workspace` held (note of 2026-09-29) | None assigned. The loop's identity is undecided |

**How a number becomes canonical.** A number is never canonical because it is free: "CAP-35 must not become canonical merely because it is numerically available" (`governance/AAB-CAPABILITY-ADMISSION-AUTHORITY-DEFINITION-2026-09-27.md`, section 2.2). It becomes canonical only when the ten-point identity checklist is met, and the capability registry, the CAP-34 fidelity manifest and the validators are updated together (checklist items 8 to 10). **This record proposes; it does not make canonical.**

## 1. Observation: CAP-36 Governed Observation and Field Evidence (proposed)

**The decision.** Observation is its own capability, not part of CAP-08 (decided on 2026-09-28). Its proposed number is **CAP-36**, and its proposed name **Governed Observation and Field Evidence**.

**Why CAP-36.**
- **CAP-35 is taken:** it is the proposed number of the Governed Evidence Watch candidate (`governance/workstream-b/GOVERNED-EVIDENCE-WATCH-CANDIDATE-DESIGN-2026-09-20.md`), and appears in the roadmap and the platform overview. Using it would collide with documents on `main`.
- **No capability or candidate uses CAP-36.** It appears in the repository only as this proposal (the stock-take of 2026-09-28, and the CAP-04 contract). No retired identifier is reused (CAP-29 stays retired).

**What it covers: the 21 actions of `AAB_OBSERVATION_ACTIONS`** (`api.php`, from line 1638).

| Area | Actions |
|---|---|
| Settings and adapters | `observation_settings_context`, `list_observation_adapters` |
| Campaigns | `list_observation_campaigns`, `list_active_community_campaigns`, `create_observation_campaign`, `submit_observation_campaign`, `decide_observation_campaign` |
| Community participants | `get_community_profile`, `upsert_community_profile`, `list_my_community_submissions` |
| Submissions and field photos | `start_community_submission`, `upload_community_photo`, `get_community_photo`, `finalize_community_submission`, `find_offline_community_submission` |
| Validation and review | `list_observation_review_queue`, `record_observation_validation`, `propose_observation_routes`, `assess_observation_photo`, `review_universal_observation` |
| Toward evidence | `promote_universal_observation_evidence` |

**Why it is not CAP-08.**
- **CAP-08 Controlled Trials & Outcomes** "moves authorised candidates into controlled trials, and captures observations and outcomes" (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, line 202). Its observations are made **inside a controlled trial**, against its protocol and capture targets (`AAB_OBSERVATION_CAPTURE_ACTIONS`, 5 actions, stays CAP-08).
- **Observation is field evidence outside any trial:** community and citizen campaigns, field photographs, offline submissions, validation and routing. Its questions are about the observation itself: was it made where and when it says, by whom, with consent, and is the photo what it claims?
- **The overlap is in a word, not a responsibility.** CAP-08's description says "observations". When CAP-08 is contracted, its contract should say "trial observations", so that the boundary is explicit (checklist item 1).

**Its boundary with CAP-04.** Observation decides whether a field observation is valid. **It never admits evidence.** `promote_universal_observation_evidence` becomes a submission to CAP-04, which alone decides whether it enters governed scientific memory (the CAP-04 amendment of 2026-09-29). A field photo is stored as an AAB-PLATFORM-01 object, not on a host file system.

**Against the ten-point checklist** (the admission authority definition, section 2.2):

| # | Item | Where it stands |
|---:|---|---|
| 1 | No existing capability owns the responsibility | **Argued, not yet assessed:** distinct from CAP-08 as above. CAP-08's description needs to say "trial observations" |
| 2 | No retired identifier reused | **Met:** CAP-36 was never assigned or retired |
| 3 | Not required to correct an incomplete existing capability | **Argued:** CAP-08 is complete in its own scope without it |
| 4 | Scientifically and operationally distinct | **Argued,** as above |
| 5 | Dependencies explicit | **Not yet:** at least CAP-04 (evidence), AAB-PLATFORM-01 (photos), AAB-PLATFORM-03 (actors, including community participants) and personal-data handling. Stated when its contract is written |
| 6 | Authority boundary enforceable | **Not yet:** needs its contract |
| 7 | Release classification accepted | **Not decided:** launch release or post-launch |
| 8 | Registry updated together | **Not done** |
| 9 | CAP-34 fidelity manifest records its representation status | **Not done** |
| 10 | Validators recognise the new capability set | **Not done** |

**So CAP-36 is proposed, not canonical.** Items 5 to 10 are met with its contract and the registry, manifest and validator changes, reviewed together.

**CAP-36's canonical status: the rule.**
- **CAP-36 becomes canonical only when the ten-point checklist is completed,** every item met and evidenced.
- **Completing it requires three changes, made and reviewed together:** the capability registry updated with CAP-36 (item 8), the CAP-34 fidelity manifest recording its truthful representation status (item 9), and the validators recognising the new capability set (item 10).
- **Until then, no PR, contract, record or code may treat CAP-36 as canonical.** It is cited only as "CAP-36 (proposed)". A change that uses it as canonical without that work does not conform to this record, and is refused in review.

**Recorded for its contract,** from the rehearsal. None of these may be brought across:
- in `observation_core`, row-level security is disabled on every table, and every function is executable by `PUBLIC`;
- a universal observation is promoted to evidence by a single actor, who creates, reviews and decides it: no separation of duties;
- photos are kept on the host's private file system, and their digests are not re-checked when read.

## 2. Resource intelligence: belongs to CAP-01, no new number

**The decision.** The 13 actions of `AAB_RESOURCE_INTELLIGENCE_ACTIONS` belong to **CAP-01 Country Intelligence & Discovery.** No new number is created.

**The actions** (`api.php`, from line 1504): `resource_intelligence_context`, `list_country_resources`, `list_resource_waste_streams`, `list_resource_discovery_queue`, `create_country_resource`, `add_country_resource_domain_relevance`, `create_resource_waste_stream`, `create_resource_recovery_pathway`, `record_environmental_burden`, `run_resource_discovery`, `submit_resource_discovery_review`, `complete_resource_discovery_review`, `bridge_resource_discovery`.

**The reasons:**
1. **CAP-01 already owns the responsibility** (checklist item 1). CAP-01 "investigates a country's agricultural problems, resources, waste streams and overlooked opportunities" (the platform overview, line 195). The actions register resources and waste streams, record recovery pathways and environmental burden, and run a scored discovery with human review. That is CAP-01's description, almost word for word.
2. **A new number would not be distinct** (item 4), and would only complete CAP-01 (item 3), both of which the checklist forbids.
3. **The discovery is deterministic, not AI.** It is weighted scoring across fixed factors, stored as "advisory investigation priority only", then a scientist's review. Nothing in it needs a capability of its own.

**Recorded for CAP-01's contract:**
- **Its dependencies (item 5):**
  - the safety and ecology gate inside `run_resource_discovery` is CAP-10 Safety & Ecological Intelligence territory, and becomes a stated dependency;
  - the bridge's output, a discovery candidate of type ingredient, is handed to CAP-06.
- **A defect found in the rehearsal:** `run_resource_discovery` always calls the safety gate with toxicity and ecology `UNASSESSED` (`source-b/agriculture/functions.sql`, line 2582), which forces review. No gateway action re-assesses the gate. So a review can never be approved through the gateway, and the bridge can never run.
- **Nothing active consumes the bridge's output:** the rehearsal's discovery-candidate reads (`list_discovery_candidates`, `get_discovery_candidate`) are in the gateway's legacy Airtable action list (`api.php`, from line 248), not among its active actions.

## 3. Cognitive intelligence: split across CAP-01 and CAP-06; the loop held

**The decision.** The 9 actions of `AAB_COGNITIVE_ACTIONS` do not get a number of their own. Four go to existing capabilities; the loop and its reads are held.

| Actions | Capability | Why |
|---|---|---|
| `submit_problem_signal`, `create_transformation_opportunity` (`cognitive_foundation_workspace` moved to Held: note of 2026-09-29) | **CAP-01** | Agricultural problems and overlooked opportunities are CAP-01's description |
| `propose_ingredient_build_candidate` | **CAP-06** | CAP-06 investigates "candidate new ones from evidence and country resources" (the platform overview, line 200) |
| `run_agriculture_cognitive_loop`, `compute_cognitive_node_state`, `agriculture_cognitive_loop_workspace`, `live_intelligence_surface`, `intelligence_activity_timeline`, and `cognitive_foundation_workspace` (moved from CAP-01: note of 2026-09-29) | **Held** | See below |

**The actions** (`api.php`, from line 1268). All nine call `cognitive_core` functions.

**Not CAP-05.** CAP-05's contract excludes this group in terms: "CAP-05 should not be wired to either `submit_problem_signal` or `run_agriculture_cognitive_loop`" (`governance/workstream-b/CAP-05-GOVERNED-SCIENTIFIC-REASONING-CANONICAL-CONTRACT-2026-09-20.md`, line 347 of the 2026-09-20 text; kept in its amendment of 2026-09-29: note of 2026-09-29).

**Why the loop is held.**
- **The gateway calls it a platform foundation:** "Shared cognitive foundation inherited by every registered AAB domain" (`api.php`, line 1266). It materialises nodes and relationships, recomputes their states with named algorithms (among them evidence-weighted belief, contradiction pressure, knowledge-gap density and expected information gain), and reports investigation candidates for human review.
- **Its identity is one of three things, and cannot be decided from the gateway alone:**
  - **a platform primitive,** in which case it gets no capability number, under the platform–domain separation decision;
  - **CAP-33 Cross-Domain Scientific Reasoning,** which has no description beyond its name;
  - **a capability of its own,** only if it passes the checklist. It is a stateful, autonomous process with its own lifecycle (item 4 may be met), but its dependencies are not explicit (item 5): it reads CAP-01, CAP-04, CAP-06, CAP-08 and observation evidence. It may also overlap the Governed Evidence Watch candidate (CAP-35), which CAP-05's contract treats as separate.
- **It is held until `cognitive_core` is read and understood.** The schema was not in the first snapshot; it is now in the supplementary snapshot (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/cognitive_core/`: 25 functions, 18 tables, row-level security disabled on every table), and has not yet been read for this purpose.

**The split of the other four is based on the gateway alone.** The functions behind them are in `cognitive_core` too. The split stands unless reading them shows otherwise, and is confirmed when the loop is.

## 4. What each group still needs before its migration path is defined

| Group | Still needed |
|---|---|
| **Observation (CAP-36, proposed)** | The ten-point checklist met (items 1 and 3 to 10, above), with its contract and the registry, manifest and validator changes reviewed together. **Its release classification decided.** Its place in the workstream's priority order decided (it is not in the order today) |
| **Resource intelligence (CAP-01)** | **CAP-01's canonical contract,** which absorbs the 13 actions, the three cognitive actions above, their dependencies on CAP-10 and CAP-06, and the gate defect. **CAP-01 enters the workstream's priority order** (decided on 2026-09-29, below) |
| **Cognitive intelligence** | **A reading of `cognitive_core`,** then the loop's identity decided: a platform primitive, CAP-33, or a capability of its own through the checklist. `propose_ingredient_build_candidate` follows CAP-06 in the order |

## Decisions recorded on 2026-09-29

1. **Observation is CAP-36 Governed Observation and Field Evidence, proposed:** its own capability, not part of CAP-08. It is not canonical until the ten-point checklist is completed, with the registry, the CAP-34 fidelity manifest and the validators updated together (section 1).
2. **Resource intelligence belongs to CAP-01,** with no new number (section 2).
3. **Cognitive intelligence is split:** three actions to CAP-01 and one to CAP-06. The loop and its four reads are held until `cognitive_core` is read and understood, and no number is assigned (section 3).
4. **CAP-01 enters the workstream's priority order, third:** CAP-04 → CAP-05 → **CAP-01** → CAP-08 → CAP-06 → CAP-07 → CAP-09. **The reason:** CAP-01 now holds 16 rehearsal actions (13 of resource intelligence and 3 of cognitive intelligence), so it has a real migration path. It enters the order when its contract is written, which depends on the resource and cognitive identity decisions, and those are now settled. It comes after CAP-04 and CAP-05 because both remain dependencies for everything else, and before CAP-08.

## What this record does not establish

- It does not make CAP-36, or any number, canonical: that needs the ten-point checklist, and the registry, manifest and validators updated together.
- It does not write, amend or admit any capability's contract, including CAP-01's, CAP-06's or CAP-08's.
- It does not decide the cognitive loop's identity.
- It changes the workstream's priority order only by adding CAP-01 (decision 4). It adds neither CAP-36 nor the cognitive loop.
- It does not bring any rehearsal code across, or establish that any of it is correct.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
