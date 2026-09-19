# CAP-34 — Governed AAB Simulation & Demonstration Environment

**Status:** CANONICAL WORKSTREAM-B DESIGN — BUILD AUTHORISED FOR CONTROLLED PRE-LAUNCH IMPLEMENTATION  
**Horizon:** PRE-LAUNCH / EVALUATION-ENABLING  
**Capability class:** Platform Operating / Evaluation Enablement  
**Production authority:** NONE  
**Scientific authority:** NONE  
**Regulatory authority:** NONE  
**Commissioning authority:** NONE

> **This capability work does not alter commissioning status, satisfy Gate D, close WP05, or authorise production.**

## Coherent outcome

An authorised prospective or participating country can experience and exercise AAB end-to-end using controlled synthetic/public/reference information without first supplying sovereign scientific information or creating production authority.

## Design principle

> **Real simulation of AAB, not a fake version of AAB.**

Where a released AAB capability exists, the simulation should execute the same governed capability logic against approved synthetic/reference scenario data.

Where a capability is not implemented, the simulator must not fabricate a working result. Any visual representation must be marked:

> **CONCEPT PREVIEW — NOT AN IMPLEMENTED CAPABILITY**

## Permanent visible banner

Every simulation surface must display:

> **CONTROLLED AAB SIMULATION — SYNTHETIC/REFERENCE DATA ONLY. This environment does not represent AAB's current commissioning status, does not prove readiness for production use of real scientific data, and carries no production, government, scientific, regulatory or commissioning authority.**

The banner must not be dismissible for the duration of the simulation session.

## Children

1. Guided Demonstration
2. Interactive Sandbox
3. Synthetic Scientific Scenario Packs
4. Role & Authority Simulation
5. Capability-State Simulation
6. Training & Practice
7. Clean Baseline Reset

## Required scenario classes

### Scenario A — governed happy path

Demonstrate a synthetic agricultural problem/opportunity progressing through relevant released AAB capabilities while preserving evidence and authority boundaries.

### Scenario B — contradictory evidence

The scenario must contain credible conflicting evidence. AAB must expose the contradiction and uncertainty rather than manufacture consensus.

### Scenario C — insufficient/missing evidence

The scenario must require AAB to refuse progression where evidence is insufficient and explain what remains missing.

The simulator must therefore demonstrate disciplined refusal as a feature, not treat refusal as demo failure.

## Role and authority simulation

The simulator should allow controlled switching between representative synthetic roles, such as:

- Country Head / Head Admin
- Institution Admin
- Scientist / Researcher
- user without the required scientific authority
- bounded auditor/reviewer role where the relevant simulated capability exists

A role switch changes simulated authority only. It must never create a production membership or authority record.

## Capability-state simulation

The simulator should demonstrate independent states including:

- released / not released;
- selected / not selected;
- entitled / not entitled;
- configuration required;
- dependency not ready;
- qualification required;
- active / inactive;
- user authorised / not authorised;
- scientific/governance prerequisite blocked;
- evidence required.

A conversational explanation may narrate these states but must not alter them.

## Hard technical separation

The implementation must fail closed against state leakage.

Prohibited:

- importing protected real-country scientific data for ordinary demonstration;
- reusing production country credentials or secrets;
- promoting simulation users into production memberships;
- promoting simulated payment into commercial entitlement;
- promoting simulated approvals into real approvals;
- promoting simulated trial results into scientific learning;
- promoting simulated audit outcomes into qualification or commissioning;
- migrating simulation records into production merely to save time;
- connecting the simulation to a production country database as a convenience.

If a country later proceeds, CAP-16 provisions the real country environment separately through the governed production/commissioning path.

## Data classification

Permitted scenario sources:

- synthetic information created specifically for demonstration/testing;
- controlled AAB reference fixtures;
- public/open information separately approved for demonstration use.

Protected sovereign country scientific information is not required for CAP-34's intended outcome.

## Reset

The simulator must support deterministic reset to a known clean simulation baseline.

Reset must remove scenario-generated users, memberships, evidence, findings, formulations, trial outcomes, learning, audit states and commercial simulation state created during the session, while preserving the approved simulator software and scenario definitions.

## Proof requirements

CAP-34 is not proven because a polished screen exists.

Minimum behavioural proof must show:

1. visible non-production classification on every simulation surface;
2. no production credentials/secrets required;
3. synthetic/reference-only scenario provenance;
4. representative role/authority denial works;
5. contradictory evidence is preserved and surfaced;
6. missing evidence can block progression;
7. simulation state cannot be promoted to production;
8. reset restores the defined clean baseline;
9. concept-only capability cannot masquerade as implemented;
10. simulator telemetry/support paths do not silently export protected information if such information is accidentally presented.

## Non-implications

- Simulation success does not establish scientific truth.
- Simulation success does not establish production-country readiness.
- Simulation success does not satisfy sovereignty commissioning.
- Simulation identity does not create production membership.
- Simulated payment does not create commercial entitlement.
- Simulated approval does not create real approval.
- Demonstrating a released capability does not entitle a future country to it.
- A concept preview does not establish implementation.
- A simulation result against synthetic/reference data does not predict a result against a country's real science.

## Pressure-risk rule

CAP-34 is especially susceptible to commercial/deadline pressure because preserving simulation work into production may appear convenient.

The boundary is therefore technical, not advisory:

> **Simulation state can never be promoted into production state.**

If useful work performed in simulation later needs to exist in production, it must be recreated or independently admitted through the normal production governance path from an authorised source.

## Relationship to commissioning

CAP-34 contributes **zero commissioning credit**.

A successful external demonstration must never be represented as evidence that WA or another country environment is commissioned, sovereign-compliant or ready to accept protected scientific information.

Workstream A remains authoritative.

## Initial implementation objective

The first controlled build should establish:

- immutable simulation/non-production classification;
- isolated synthetic scenario registry;
- three scenario classes (happy path, contradiction, missing evidence);
- representative simulated roles;
- capability-state explanation;
- deterministic reset;
- validation proving no production authority/state is created.

The initial build should prefer honest coverage of a smaller number of real released capability paths over broad scripted imitation of capabilities that are not yet implemented.
