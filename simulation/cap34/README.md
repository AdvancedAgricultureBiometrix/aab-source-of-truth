# CAP-34 Controlled Simulation — Initial Build

This directory contains the first isolated CAP-34 implementation artifact.

It is intentionally self-contained and has no production database, authentication, country-tenancy, payment, scientific-memory or commissioning integration.

## Files

- `index.html` — non-indexed controlled simulation surface.
- `cap34-simulation.js` — immutable synthetic scenario/role/state contract and validation.

## Validation

Open `index.html` in a browser and confirm the Validation panel returns:

`PASS_READY_SIMULATION_ONLY`

or run in the browser console:

```js
window.AAB_CAP34_SIMULATION.runValidation()
```

Expected status:

`PASS_READY_SIMULATION_ONLY`

This status means only that the initial isolated simulator contract passes its own simulation-safety checks. It carries zero production, scientific, regulatory, sovereignty or commissioning authority.

## Deliberate limitations

This first build does **not** claim full-fidelity execution of all AAB capabilities. It establishes the simulation boundary, three scenario classes, role/authority denial, capability-state explanation, clean reset and explicit non-production classification.

Future increments should connect only genuinely released capability logic. Unimplemented capability previews must remain explicitly labelled as concept previews.

## Permanent rule

**Simulation state can never be promoted into production state.**
