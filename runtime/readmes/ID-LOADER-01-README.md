# ID-LOADER-01 — Governed Runtime Bootstrap Reconciliation

## Status

`READY_FOR_DEPLOYED_BROWSER_VALIDATION`

## Objective

Replace the five separate ID-01 through ID-05 script tags in `indexDASH.html`
with one canonical governed bootstrap entry point while preserving strict
dependency order and the behaviour of every validated identity contract.

## Canonical entry point

```html
<script src="/aab-local/app/_rebuild/js/governed-runtime-bootstrap.js?v=1.0.0"></script>
```

## Managed chain

1. ID-01 — Identity Authority Compatibility
2. ID-02 — Identity Actor Link
3. ID-03 — Protected Membership Authority Resolver
4. ID-04 — Scoped Dashboard Route Resolver
5. ID-05 — Trusted Dashboard Access Decision

## Safety boundaries

- deterministic sequential loading
- fail closed on a missing file, namespace, validator, or failed validation
- prevent duplicate contract execution
- no browser navigation
- no authority grant
- no session, token, or cookie creation
- no database write or mutation
- no Supabase or Airtable activation

## Scope boundary

This release consolidates the validated identity chain only. It intentionally
does not migrate or reorder the remaining historical dashboard scripts. The
full dashboard contains mixed synchronous, deferred, inline, UI, and contract
dependencies that require staged evidence before consolidation.

## Audit findings retained for later reconciliation

The active dashboard inventory contains eight unrelated duplicate script paths:

- `AAB-DB-AQUA-05-AQUACULTURE-EVIDENCE-MAPPING.js`
- `AAB-DB-WATER-BRAIN-07-WATER-DOMAIN-BRAIN-CONSOLIDATION.js`
- `AAB-JGR-01.js`
- `AAB-MEM-07-MEMORY-TRUST-REVIEW-STATUS.js`
- `AAB-SCIENTIFIC-INTELLIGENCE-EXPLORER-01.js?v=1`
- `AAB_CHAPTER_COMPLETION_RULE_01.js`
- `AAB_STARTUP_UI_BRIDGE_01.js`
- `AAB_STARTUP_VALIDATION_02.js`

They are recorded but not removed by ID-LOADER-01. Each must be reconciled only
after its runtime namespace, consumers, order, and side effects are verified.

## Deployment contents

- `aab-local/app/indexDASH.html`
- `aab-local/app/_rebuild/js/governed-runtime-bootstrap.js`

## Next build gate

ID-06 remains blocked until the deployed browser validation reports
`PASS_READY_READ_ONLY` for ID-LOADER-01 and confirms ID-01 through ID-05 all
remain ready in order.
