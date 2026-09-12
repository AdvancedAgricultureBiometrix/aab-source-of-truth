# AAB Canonical Clean Baseline — Restore Proven

**Status:** RESTORE PROVEN for AAB-owned schema and approved baseline/reference data  
**Date:** 2026-09-12  
**Canonical project ref:** `epjhsrflzeuqzastevtz`  
**Disposable restore-test project ref:** `wcyfafvhbcvxrxcbewfj`  
**WA rehearsal/sandpit ref:** `kdpcfbaeklkffozryjah` — untouched during restore proof

## Purpose

Prove that the protected canonical AAB template can be independently exported, restored into a fresh Supabase project, and recovered as a **structurally complete, scientifically clean** AAB environment without inheriting country-specific scientific/test data or personal actor data.

## Backup artifacts used

### AAB-only schema

- File: `AAB-CANONICAL-AAB-ONLY-SCHEMA.sql`
- Size: `1,485,342 bytes`
- SHA-256: `0B80E3C69025BB1530916B1BA69260F37F8E39FED6CFDE66759297CD2F751865`

### Dependency-complete baseline/reference data

- File: `AAB-CANONICAL-BASELINE-DATA-V2.dump`
- Size: `33,100 bytes`
- SHA-256: `682EDC6F97F820741F6FE2841CCD3D692C8C742934EF412629AB3E4698F8CC16`

### Required system actor seed

The baseline requires the non-personal system actor:

- actor type: `SYSTEM`
- display name: `AAB Country Bootstrap Scan`
- external subject: `aab-system:country-bootstrap-scan`

The personal user actor present in canonical was deliberately excluded from the recovery package.

## Infrastructure prerequisite discovered during restore

`country_core.v_country_foundation_seal` depends on the PostgreSQL extension `pg_cron`.

Canonical environment:

- extension: `pg_cron`
- version: `1.6.4`
- schema: `pg_catalog`

The fresh restore-test project did not initially have `pg_cron` enabled. After enabling version 1.6.4, the missing `country_core.v_country_foundation_seal` view was recreated and verified.

This prerequisite must be part of the canonical provisioning/restore checklist.

## AAB-owned schema parity

After restore and repair of the `pg_cron` prerequisite, object counts matched canonical exactly:

| Schema | Canonical tables | Restore tables | Canonical views | Restore views | Canonical routines | Restore routines |
|---|---:|---:|---:|---:|---:|---:|
| `agriculture` | 120 | 120 | 65 | 65 | 171 | 171 |
| `cognitive_core` | 18 | 18 | 1 | 1 | 25 | 25 |
| `continuity_core` | 2 | 2 | 1 | 1 | 1 | 1 |
| `country_core` | 48 | 48 | 9 | 9 | 37 | 37 |
| `manufacturing_core` | 4 | 4 | 1 | 1 | 1 | 1 |
| `observation_core` | 10 | 10 | 9 | 9 | 22 | 22 |
| `platform` | 11 | 11 | 3 | 3 | 6 | 6 |
| `presentation_core` | 8 | 8 | 0 | 0 | 0 | 0 |
| `regulatory_core` | 9 | 9 | 1 | 1 | 4 | 4 |
| `security_core` | 2 | 2 | 0 | 0 | 1 | 1 |

## Baseline/reference data parity

All 18 approved baseline/reference tables restored with row counts matching canonical exactly:

| Table | Canonical | Restore |
|---|---:|---:|
| `agriculture.access_profile` | 8 | 8 |
| `agriculture.application_gateway_contract` | 115 | 115 |
| `agriculture.authority_role` | 6 | 6 |
| `agriculture.data_integrity_rule` | 4 | 4 |
| `agriculture.measurement_method` | 5 | 5 |
| `agriculture.metric_definition` | 15 | 15 |
| `agriculture.metric_enum_option` | 0 | 0 |
| `agriculture.observation_template` | 2 | 2 |
| `agriculture.observation_template_metric` | 15 | 15 |
| `agriculture.observation_template_version` | 2 | 2 |
| `agriculture.source_system` | 5 | 5 |
| `agriculture.validation_rule` | 4 | 4 |
| `cognitive_core.algorithm_registry` | 15 | 15 |
| `cognitive_core.brain_registry` | 11 | 11 |
| `cognitive_core.target_registry` | 19 | 19 |
| `platform.domain_registry` | 10 | 10 |
| `platform.navigation_item` | 29 | 29 |
| `platform.navigation_section` | 11 | 11 |

Additional dependency rows restored:

- `agriculture.actor`: 1 system actor only
- `agriculture.governance_decision`: 1 required system configuration decision
- `cognitive_core.intelligent_node`: 19 required target nodes

## Personal-data exclusion check

The restore-test `agriculture.actor` table contains only:

- `SYSTEM` — `AAB Country Bootstrap Scan`

No personal/user actor was restored.

## Scientific cleanliness check

The following scientific/runtime tables were verified at zero rows after restore:

- `agriculture.trial`
- `agriculture.plot`
- `agriculture.observation`
- `agriculture.measurement`
- `agriculture.outcome`
- `agriculture.input_submission`
- `agriculture.quarantined_record`
- `agriculture.reconciliation_run`
- `agriculture.reconciliation_item`
- `agriculture.learning_candidate`
- `agriculture.approved_learning`
- `agriculture.scientific_memory_entry`
- `agriculture.provenance_assertion`
- `agriculture.contradiction_record`
- `agriculture.knowledge_gap`
- `agriculture.negative_learning_register`

This verifies the recovered environment remains **scientifically clean**.

## Restore issues encountered and interpretation

### Supabase default privileges

The raw schema replay produced `permission denied to change default privileges` messages for some Supabase-managed/default-privilege statements. These did not prevent recreation of the AAB-owned schema objects. Exact Supabase-managed ownership/default-privilege state should be established through supported platform provisioning rather than treated as portable AAB application data.

### `pg_cron`

The single initially missing AAB view was caused by an unmet platform prerequisite (`pg_cron`), not by corruption of the AAB schema backup.

### Baseline V1 failure

The first baseline-data package was intentionally restored under `--single-transaction --exit-on-error`. It failed because baseline tables referenced a required system actor that had not been included. The transaction rolled back cleanly. No partial baseline state remained.

The V2 package corrected this by including only the minimal non-personal system dependencies required for a clean AAB baseline.

## Final determination

The canonical AAB template has now been independently demonstrated to be recoverable into a fresh Supabase environment as:

> **STRUCTURALLY COMPLETE, SCIENTIFICALLY CLEAN**

The recovery proof covers:

- AAB-owned schemas;
- AAB tables, views and routines;
- approved baseline/reference content;
- required non-personal system dependencies;
- scientific-cleanliness assertions; and
- the `pg_cron` infrastructure prerequisite.

Accordingly, the baseline represented by the recorded artifacts may be classified:

> **AAB CANONICAL CLEAN BASELINE — RESTORE PROVEN**

## Ongoing protection rule

WA remains the designated rehearsal/testing sandpit. Future experimental data, historical scientific-memory imports, test institutions, test scientists, trials, observations, outcomes, generated learning and country-specific state must remain outside the canonical template.

Any future approved change to the canonical template should trigger:

1. validation in WA or another controlled environment where practical;
2. application of only the approved canonical structural/configuration change;
3. clean-template assertion;
4. refreshed AAB-only schema backup;
5. refreshed dependency-complete baseline/reference backup;
6. SHA-256 manifest update; and
7. periodic restore proof into a disposable environment.

## Security note

No passwords, API keys, service-role keys or database credentials are recorded in this validation record or intended to be stored in the private baseline package.
