# PH2-WP04 Security Qualification Loop

This package implements the first closed-loop AAB security qualification capability: catalogue collection, invariant comparison, preserved evidence, narrowly scoped instance remediation, and regression verification.

It has no commissioning authority. Its only conclusions are `TECHNICAL VERIFICATION SATISFIED`, `TECHNICAL VERIFICATION NOT SATISFIED`, or `EVIDENCE REQUIRED`.

Specifications and executable machinery live under `contracts/`, `schemas/`, `collector/`, `comparator/`, and `tests/`. Generated evidence is isolated under `evidence/`. The `remediation/` SQL is restricted to the authorised restore-test instance and is not a canonical reconstruction fix.

Protected country scientific data, secret values, and credentials are prohibited from fixtures and evidence. `PH2-COM-AUTO-02` permits only test definitions, software improvements, and non-protected qualification evidence to return to canonical AAB.

Comparison evidence is integrity-hashed and signed with Ed25519. WP04 uses the published test-evidence public key solely to prove the signing pipeline; a country-qualified deployment must replace it with a country-controlled verification key. The private test key was ephemeral and is not retained in the repository.

## Preserved states

- `PH2-SEC-CC-RLS-ADVISORY-01`: OPEN / design baseline preserved; no RLS change in WP04.
- `PH2-SEC-RESTORE-FUNCTION-GRANT-01`: instance state determined by before/after evidence; reconstruction root cause remains open.
- `PH2-SEC-RPC-AUTHORITY-REGRESSION-01`: verification framework initiated; complete isolated authority-path suite remains future work.
- `PH2-COM-AUTO-01`: executable evidence pipeline initiated; no approval authority.
- `PH2-COM-AUTO-02`: protected country scientific information and derivatives remain prohibited from return paths.
