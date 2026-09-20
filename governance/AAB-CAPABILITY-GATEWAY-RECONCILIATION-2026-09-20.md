# AAB Capability–Gateway Reconciliation — 2026-09-20

**Status:** DECISION-SUPPORT DOCUMENT — NOT IMPLEMENTATION
**Authority:** BUILD-PLANNING ONLY. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority.
**Subject:** the seven canonical capabilities carried through the CAP-34 governed simulation's "live logic" wiring — CAP-01, CAP-02, CAP-04, CAP-05, CAP-06, CAP-07, CAP-09.
**Not part of PR #16.** PR #16's boundary (`governance/workstream-b/`, `simulation/cap34/`, draft, simulation-only) is unaffected by this document.

## Purpose

For each of the seven capabilities, this document states whether its path to AAB's real operational gateway — the authenticated PHP/PostgreSQL system catalogued in `governance/AAB-current-technical-contract-catalogue-2026-09-20.md` — is:

- **Direct wire** — a real, actor-gated, PostgreSQL-backed gateway action already exists with a clear name/purpose match.
- **Translation layer needed** — a real gateway action or table exists but its field vocabulary does not line up with the capability's own vocabulary, so a mapping layer is needed between them.
- **New gateway action needed** — no operational gateway action exists for this capability, whatever else (schema, browser contracts) may exist.
- **Design decision required before wiring** — more than one plausible real-gateway landing zone exists, or a naming/scope collision with another capability must be resolved, before any wiring decision can be made.

This document makes no wiring decision itself. It records what the evidence supports and what remains open.

## Sources consulted

- `governance/AAB-current-technical-contract-catalogue-2026-09-20.md` (this repository, `main`, committed 2026-09-20) — the real-gateway evidence base. All action names, groups and field lists below are quoted from it.
- The seven capabilities' behavioural-proof and design records on branch `claude/pensive-knuth-pdlko1`:
  `CAP-01-DISCOVERY-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-02-SOURCE-ACQUISITION-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-02-INTEROPERABILITY-MAPPING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-04-SCIENTIFIC-MEMORY-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-04-CORPUS-SCALE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-04-SCIENTIFIC-MEMORY-ADMISSION-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-05-REASONING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-06-INGREDIENT-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-07-FORMULATION-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json`, `CAP-09-GOVERNED-LEARNING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json` (all under `governance/workstream-b/`).
- `governance/workstream-b/CAP-34-CAPABILITY-PATHWAY-RECONCILIATION-2026-09-20.md` (same branch) for the pre-existing pathway framing of CAP-02/CAP-04.

## Evidence tiers used below

The catalogue distinguishes several classes of evidence, and the strength of a capability's real-gateway match depends on which tier it lands in:

1. **Operational gateway action** — an `action` name in the catalogue's HTTP action table with a PostgreSQL callable behind it, reached only through the real actor-resolution path (`agriculture.api_resolve_authenticated_actor`). This is "the real gateway" proper.
2. **Browser contract** — a JavaScript namespace/function exposing validation, scoring or advisory logic. Several such files carry `failClosed`, `blockOperationalRequest` or `HARD_BLOCKED_ACTIONS` guards and are explicitly read-only/advisory with no persistence route.
3. **Plan-only schema** — a table shape declared in source but, per the catalogue's own classification, not evidenced as created or executed.
4. **Retired** — an action that returns HTTP 410 and does not fall back to legacy persistence.

A tier-2 or tier-3 match is real evidence of design intent but is not itself a gateway path.

## Per-capability reconciliation

| Capability | Real-gateway evidence (tier) | Classification |
|---|---|---|
| CAP-01 — Country Intelligence & Discovery | Closest legacy actions (`get_discovery_candidate`, `list_discovery_candidates`, `list_hypothesis_queue`, `get_hypothesis`) are **retired** (HTTP 410, no legacy fallback). No active operational action exists. A rich tier-2 advisory contract family exists (`AAB-DISC-03` Discovery Review Workspace, `AAB-DISC-04` Hypothesis Evidence Support, `AAB-DISC-05` Hypothesis Contradiction Check, `AAB-DISC-06` Hypothesis-to-Test Advisory Route, plus `AAB-DISCOVERY-CAPABILITY-MAP-01`/`GOV-01`/`REGISTRY-01`/`STATUS-PANEL-CONTRACT-01`), whose `EVIDENCE_FIELDS`, `GAP_TYPES` and `REVIEW_STATES` vocabulary lines up closely with CAP-01's evidence-classification/investigation-candidate model — but it is explicitly `READ_ONLY_ADVISORY_SIMULATION_ONLY`, `NO_DISCOVERY_EXECUTION_NO_PROMOTION_NO_TRIAL_CREATION_NO_AUTONOMY`. | **New gateway action needed.** The one operational precedent was deliberately retired; nothing currently reachable through the actor-gated gateway persists a discovery/hypothesis record. |
| CAP-02 — Governed Scientific Data Acquisition & Interoperability | No operational action group. Plan-only schema exists (`aab_domains`, `aab_domain_sources`, `aab_scientific_entities`, `aab_entity_relationships`, `aab_core_evidence_references`, `aab_core_review_status`, `aab_core_authority_boundaries`). Five tier-2 source-adapter contracts exist (`AAB-ADAPTER-AGRI-01`, `-AQUA-01`, `-ENV-01`, `-MFG-01`, `-WATER-01`) plus a canonical cross-domain adapter (`AAB-ADAPTER-CORE-01`), all carrying source→canonical field-mapping shapes — but every one is in a `*_DEFINED_NOT_CONNECTED` / `MAPPING_REQUIRED` readiness state, never `READY_FOR_READ_ONLY_MAPPING` or beyond, in this evidence. | **New gateway action needed.** The adapter scaffolding is unusually mature for a capability with no operational route — it is a plausible starting shape for the eventual action, not a substitute for one. |
| CAP-04 — Governed Scientific Memory | No operational action group is named for historical/multi-institution scientific memory. The only real-gateway group whose name contains "memory" is `AAB_LEARNING_MEMORY_ACTIONS` (`list_learning_memory_workspace`, `prepare_trial_learning`, `submit_learning_review`, `decide_learning_review`), but its actions implement trial-outcome learning promotion, i.e. CAP-09's scope, not CAP-04's. Tier-2 contracts (`AAB-MEM-06` Learning Memory Linkage, `AAB-MEM-07` Memory Trust Review Status, `AAB-MEM-08` Memory Evolution Timeline) also blend "learning memory" and general "memory" vocabulary without separating the two capabilities. | **Design decision required before wiring.** Before any gateway work starts, someone must decide whether CAP-04 gets its own, distinctly-named action group or is folded into an expanded `AAB_LEARNING_MEMORY_ACTIONS` — the two capabilities carry materially different evidence and authority requirements (see Cross-cutting findings). |
| CAP-05 — Governed Scientific Reasoning | No dedicated operational reasoning action. `AAB_COGNITIVE_ACTIONS` (`compute_cognitive_node_state`, `run_agriculture_cognitive_loop`, `live_intelligence_surface`, `intelligence_activity_timeline`) is a plausible landing zone, but its evidenced scope (problem-signal → transformation-opportunity → ingredient-build-candidate) reads as opportunity-scouting, and its response payloads are opaque in this evidence. Separately, a large tier-2 reasoning contract family exists (`AAB-BRAIN-INTEL-01` through `-11`, `AAB-MAIN-BRAIN-REASONING-CORE-01`, `AAB-REASONING-CAPABILITY-MAP-01`, `AAB-REASONING-STATUS-PANEL-CONTRACT-01`, `AAB-UNDERSTAND-02/03`) whose `CONTRADICTION_STATES` and `GAP_TYPES` vocabulary maps closely onto CAP-05's pairwise-contradiction and named-gap behaviour, but is fail-closed/advisory throughout. | **Design decision required before wiring.** Two plausible real-gateway landing zones exist (extend `AAB_COGNITIVE_ACTIONS`, or operationalise the `BRAIN-INTEL` contract family into a new action group) and nothing in the evidence indicates which is intended. |
| CAP-06 — Ingredient Intelligence | `get_workbench_ingredient_intelligence` (`AAB_WORKBENCH_ACTIONS`) is a literal name-for-name, actor-gated, PostgreSQL-backed match (`agriculture.api_workbench_get_ingredient_intelligence`), reinforced by the tier-2 `AAB-INGREDIENT-SELECTION-BRAIN-01` contract (`scorePartner`, `rankIngredientPartners`, `buildSelectionPacket`). The internal shape of the returned `intelligence` payload is opaque in this evidence — not a confirmed field-level match, but there is no evidence of mismatch either. | **Direct wire.** |
| CAP-07 — Formulation Intelligence | `AAB_WORKBENCH_ACTIONS`' `list_workbench_formulations`, `get_workbench_formulation`, `create_workbench_formulation`, `derive_workbench_formulation` and `workbench_decide_formulation` form a complete, actor-gated, PostgreSQL-backed formulation lifecycle. Reinforced by the extensive tier-2 `AAB-FORM-*`/`AAB-FORM-INTEL-01`–`08` contracts (objective function, contradiction/safety screen, candidate builder), which explicitly forbid direct mutation (`HARD_BLOCKED_ACTIONS`: `createFormulation`, `mutateFormulation`, …) and route only through the gated workbench actions. | **Direct wire.** |
| CAP-09 — Governed Scientific Learning | `AAB_LEARNING_MEMORY_ACTIONS`' `prepare_trial_learning` and `decide_learning_review` carry field-level vocabulary — `applicability_scope`, `mechanism_statement`, `mechanism_pathway`, `mechanism_expected_effects`, `claim_a`, `claim_b`, `limitation_summary`, `negative_downstream_action` — that closely mirrors CAP-09's named-condition refusal/promotion behaviour. This is the strongest field-level match of the seven. | **Direct wire**, but see Cross-cutting findings: this action group's name, and part of its vocabulary, is shared with CAP-04. Any wiring work on CAP-09 should settle that naming boundary at the same time rather than deepen it. |

## Cross-cutting findings

- **CAP-04/CAP-09 naming collision.** `AAB_LEARNING_MEMORY_ACTIONS` is the real gateway's only "memory"-named action group, but its actions and the reinforcing `AAB-MEM-06`/`07`/`08` browser contracts are about trial-outcome learning (CAP-09), not historical multi-institution scientific memory (CAP-04). Wiring CAP-09 as a direct wire without first resolving this collision risks CAP-04 later being wired into the same group by name-matching alone, which would be wrong on scope.
- **CAP-02/CAP-04 share zero field-name matches with any operational gateway action.** Confirmed against the full HTTP action field catalogue: neither capability's own vocabulary (source registration, provenance, content-hash preservation, extraction/classification) appears in any of the 116 declared active gateway actions. Both also have real but disconnected scaffolding one tier down (plan-only schema for CAP-04's provenance model; five source adapters, all `*_NOT_CONNECTED`, for CAP-02).
- **Evidence-tier split across the seven.** Three capabilities (CAP-06, CAP-07, CAP-09) land on real, actor-gated, PostgreSQL-backed actions today. The other four (CAP-01, CAP-02, CAP-04, CAP-05) have, at best, browser-only advisory contracts or plan-only schema — never an operational route — and CAP-01's one operational precedent was deliberately retired rather than left available.
- **Browser-contract maturity does not indicate gateway maturity.** CAP-01, CAP-02 and CAP-05 all have unusually well-developed tier-2 contract families with vocabulary that maps closely onto their respective capability's behaviour. None of that reduces the classification below "new gateway action needed" or "design decision required" — a fail-closed, non-persistent advisory contract is not a path to the real gateway, only a plausible shape for one.

## What this document does not establish

- It does not authorise, schedule or begin any gateway wiring work.
- It does not establish that any capability is production-ready, scientifically valid or regulatorily compliant.
- It does not alter commissioning status, satisfy Gate D, close WP05 or affect PR #16's boundary.
- The "design decision required" entries (CAP-04, CAP-05) are not resolved by this document; they identify what must be decided, not the decision itself.
