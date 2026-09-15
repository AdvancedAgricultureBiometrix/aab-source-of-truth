# PH2-WP04 Gate-D Traceability Amendment

**PR:** `AdvancedAgricultureBiometrix/aab-source-of-truth#15`  
**Reviewed antecedent head:** `3dac8ca2a1b5199e51c9dd2d37759c6dc3fa9e7b`  
**Amendment date:** 2026-09-15  
**Classification:** Traceability-only amendment; no implementation or qualification-result change

## Mandatory non-closure rule

`PH2-SEC-RESTORE-FUNCTION-GRANT-01` remains an open mandatory Gate-D qualification item. Instance remediation does not close the finding.

Closure requires:

1. an identified and evidenced root cause for the original grant drift;
2. a clean reconstruction that reproduces the correct grants without manual intervention; and
3. automatic regression verification confirming the defined invariant holds.

A reconstruction that happens to succeed without an established cause remains `EVIDENCE REQUIRED`, not closed.

## Traceability chain

The preserved chain is:

`23 grant mismatches detected` → `restore-test instance-only remediation` → `23 → 0 invariant verification` → `INSTANCE REMEDIATION VERIFIED` → `RECONSTRUCTION ROOT CAUSE REMAINS OPEN` → `mandatory Gate-D qualification item`.

This amendment must not be interpreted as production authorisation, reconstruction-root-cause closure, or authority to begin WP05. The amendment commit and resulting PR head are recorded in the immutable PR timeline because a Git commit cannot contain its own commit SHA.

**Automate verification, not approval.**
