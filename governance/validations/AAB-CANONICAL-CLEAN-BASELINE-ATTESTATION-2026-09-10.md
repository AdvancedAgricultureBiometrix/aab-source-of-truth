# AAB Canonical Clean Baseline Attestation — 2026-09-10

**Status:** Read-only observed baseline; private restore package not yet restore-proven  
**Canonical Supabase project ref:** `epjhsrflzeuqzastevtz`  
**WA rehearsal project ref:** `kdpcfbaeklkffozryjah`  
**Canonical Git commit:** `d57f21cf7fe0d02435098129957806ca78a43e34`

## Purpose

Record the observed clean state of the canonical AAB template before further WA rehearsal and Historical Scientific Memory Recovery development.

## Observed project state

Canonical AAB project:

- status: `ACTIVE_HEALTHY`
- region: `ap-south-1`
- PostgreSQL: `17.6.1.155` / engine 17

WA rehearsal project:

- status: `ACTIVE_HEALTHY`
- region: `ap-southeast-2`
- PostgreSQL: `17.6.1.155` / engine 17

## Scientific/template cleanliness checks

The following canonical Agriculture objects were observed with zero rows at the time of inspection:

- `agriculture.trial`
- `agriculture.observation`
- `agriculture.measurement`
- `agriculture.input_submission`
- `agriculture.input_validation_run`
- `agriculture.input_validation_result`
- `agriculture.quarantined_record`
- `agriculture.reconciliation_run`
- `agriculture.reconciliation_item`
- `agriculture.learning_candidate`
- `agriculture.approved_learning`
- `agriculture.scientific_memory_entry`
- `agriculture.provenance_assertion`

This supports the current classification of the canonical scientific template as **scientifically clean** for the inspected pathways.

## Baseline/reference content observed

`agriculture.source_system` contained five baseline source-system definitions:

- `AAB_FIELD_CAPTURE` — canonical
- `AAB_SYSTEM_GENERATED` — non-canonical
- `AAB_USER_ENTRY` — canonical
- `EXTERNAL_RESEARCH` — reference only
- `LEGACY_REFERENCE` — reference only

`agriculture.validation_rule` contained four draft baseline validation rules, including the rule that raw input cannot directly influence approved learning.

## Protection interpretation

The canonical environment is to remain **structurally complete, scientifically clean**.

WA is the designated rehearsal/testing sandpit. Country-specific scientific, discovery, institutional, historical-import, test-learning and generated cognitive records must remain outside the canonical template.

## Backup status

A private backup kit has been prepared for local execution. It is designed to create:

- schema-only PostgreSQL export;
- approved baseline/reference data export;
- Git repository snapshot pinned to the canonical commit;
- clean-table count report;
- SHA-256 manifest;
- private ZIP archive.

The baseline must not be labelled **RESTORE PROVEN** until that package has been restored into a disposable environment and the integrity checks pass.

## No-write statement

This attestation was based on read-only inspection. No Supabase schema or data changes were made as part of the baseline inspection.
