# AAB Canonical Template Baseline 01

Status: STATIC BASELINE PACKAGE PREPARED — TEMPORARY CLEAN-ROOM REHEARSAL NOT YET APPROVED OR PROVEN

This package defines a present-state canonical Supabase baseline for AAB. It is not represented as the original historical migration sequence.

The original SQL for six early historical migrations is unavailable. Their application is confirmed by live migration evidence and recorded in `manifests/HISTORICAL-MIGRATION-EVIDENCE.md`.

## Apply order

1. Start with a new empty Supabase project only after explicit Platform Owner approval.
2. Confirm managed Auth and Storage schemas exist.
3. Apply `migrations/00000000000000_aab_managed_dependencies.sql`. It asserts managed Auth/Storage and enables `pgcrypto` and `pg_cron`; it schedules no jobs.
4. Apply `migrations/20260814_aab_canonical_present_state_schema.sql`.
5. Apply `migrations/20260814_aab_post_baseline_security.sql`.
6. Apply `seeds/0001_aab_generic_reference_seed.sql` only after its checksum is verified.
7. Apply `validation/AAB-CLEAN-TEMPLATE-VALIDATION.sql`.
8. Apply `validation/AAB-AUTHORITY-AND-RLS-VALIDATION.sql`.
9. Recreate the non-database configuration in `config/CONFIGURATION-RECONSTRUCTION.md`; never commit values.
10. Do not create Western Australia until a separate Platform Owner provisioning decision.

The schema migration intentionally contains no extension declarations. The ordered dependency migration supplies the required Supabase preflight. Verified live cron schedules are not included because they create runtime state and remain separately approved operational configuration; the country foundation seal is therefore expected to report those schedules as absent during baseline rehearsal.

## Boundaries

- No Auth users, sessions or identities.
- No Platform Owner identity or role assignment.
- No participation, security, audit or continuity history.
- No countries, jurisdictions, organisations, memberships or invitations.
- No trials, plots, observations, outcomes or generated cognitive state.
- No secrets or private keys.
- Agriculture is the only permitted operational domain.
- Every other adapter is explicitly disabled, including neutral or cross-domain adapters.
- Generic templates and validation rules carry no live approver and remain DRAFT until governed approval in the target environment.
- Western Australia is a later, separately approved demonstration jurisdiction.

## Evidence and checksums

- The immutable source export checksum and derivation are recorded in `manifests/AAB-CANONICAL-TEMPLATE-MANIFEST.json`.
- Every reusable file checksum is recorded in `manifests/SHA256SUMS`.
- Every sanitisation decision and WHY is recorded in `manifests/SANITISATION-LOG.md`.
- Six unavailable original migrations are recorded without invented SQL in `manifests/HISTORICAL-MIGRATION-EVIDENCE.md`.
- Static inspection confirms 222 tables, 106 views, 277 functions after removal of one coupled validation helper, 81 triggers, no top-level data statements in the schema migration, and no UUID/email/project/secret literals in that migration.

## Rollback

Never run destructive rollback against `epjhsrflzeuqzastevtz`. If rehearsal fails, preserve its evidence, remove the temporary rehearsal project through a separately approved action, correct this source package and rebuild a new empty rehearsal environment.
