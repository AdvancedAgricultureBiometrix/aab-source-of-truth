# CAP-34 Controlled Simulation

This directory contains the isolated CAP-34 simulator and its fail-closed disclosure controls. It has no production database, authentication, country-tenancy, payment, scientific-memory or commissioning integration.

## Current surfaces

- Three synthetic live-simulation scenarios: opportunity, contradiction and missing evidence.
- Two explicitly unimplemented Roadmap Preview pathways:
  - Historical Scientific Memory Recovery — CAP-02 and CAP-04.
  - Governed Export-Compliance Evidence — CAP-03 and CAP-11.
- Roadmap Preview is inaccessible until the evaluator accepts the versioned acknowledgement.
- Reset removes session state and acknowledgement and creates no production state.

## Fidelity

The two new pathways are classified in manifest snapshot `CAP34-MANIFEST-2026-09-20-SNAPSHOT-002` as:

- `simulatorMode: ROADMAP_PREVIEW`
- `fidelity: CONCEPT_PREVIEW_NOT_IMPLEMENTED`
- `representationVersion: 0.2.0`

Existing Supabase schema foundations are evidence of partial data structures only. They are not cited as implementation evidence for either pathway.

## Validation

Open `index.html` and confirm:

```js
window.AAB_CAP34_SIMULATION.runValidation()
```

returns `PASS_READY_SIMULATION_ONLY`.

Run the Node behavioural proofs:

```text
node CAP-34-Capability-Fidelity-Manifest-Validator-Behavioural-Test.js
node CAP-34-Canonical-End-to-End-Behavioural-Test.js
node CAP-34-Pathway-Preview-Behavioural-Test.js
```

Expected results:

- `PASS_CAP34_MANIFEST_VALIDATOR_BEHAVIOURAL_PROOF` — 14/14 fixtures.
- `PASS_CAP34_CANONICAL_END_TO_END_BEHAVIOURAL_PROOF` — 42/42 fixtures.
- `PASS_CAP34_PATHWAY_PREVIEW_BEHAVIOURAL_PROOF` — 8/8 fixtures.

These results prove only the defined simulator-safety, manifest, receipt and preview-disclosure behaviours. They do not prove capability implementation, scientific correctness, regulatory compliance, production readiness, sovereignty, commissioning, Gate D satisfaction or WP05 commencement.

## Permanent rule

**Simulation state can never be promoted into production state.**
