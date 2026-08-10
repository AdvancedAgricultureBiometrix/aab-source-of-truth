# AAB Source of Truth

Private governed source repository for the Advanced Agriculture Biometrix (AAB) platform.

## Current baseline

Identity builds ID-01 through ID-03 are validated locally as read-only, fail-closed contracts. Supabase production has not been changed and the SQL files under `supabase/specifications/` are not approved migrations.

## Repository rules

- Preserve every validated version; do not overwrite history.
- Build and harden in the rebuild/staging workflow before deployment.
- No change without a recorded WHY and no trial without an OUTCOME.
- An account is not authority. Authority remains in protected server-side records.
- Never commit credentials, production environment files, personal data, database files, or raw logs.
- Move SQL from `specifications/` to `migrations/` only after explicit human approval and controlled branch testing.
- Scientist/admin authority is preserved. No autonomous execution or self-authorised mutation is enabled.

## Structure

- `identity/contracts/` — versioned identity and authority contracts.
- `identity/tests/` — controlled browser/runtime validation scripts.
- `supabase/specifications/` — future SQL designs; unapplied and non-operational.
- `governance/validations/` — validation status and evidence registers.
- `deployment/` — future release manifests and approved deployment packages.
- `domains/` — governed domain source as each domain is consolidated.
- `architecture/` and `handovers/` — approved designs and continuity records.

## Current next build

`ID-04`, subject to the approved identity/onboarding architecture and the existing AAB safety boundaries.
