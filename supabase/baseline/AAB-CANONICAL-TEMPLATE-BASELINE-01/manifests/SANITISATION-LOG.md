# Canonical present-state sanitisation log

Immutable source export SHA-256: `c4dd4fe64aec1f7ca1c4285a7866dd6da69c7b0d282818b3fad28d4486bfaf6d`

The source export remains historical evidence and is not modified or represented as a migration. The reusable migration was derived with these narrow changes:

1. Removed `agriculture.api_validate_observation_capture_e2e()` because it embedded the live actor UUID `54c5d2eb-3264-435d-89f3-ae1d8eaf662d`. WHY: no reusable baseline may carry founder or live identity coupling. A controlled validator must create or receive its actor only inside the rehearsal environment.
2. Changed `observation_core.domain_adapter.enabled` default from `true` to `false`. WHY: an omitted value must not activate a planned adapter.
3. Changed the three cross-domain defaults in `agriculture.country_intelligence_settings` to `false`. WHY: Agriculture-only provisioning must not silently activate country-resource, resource-recovery or environmental intelligence.
4. Removed public-schema default privileges granting future objects to `anon` and `authenticated`. WHY: browser authority must be explicit and fail closed.
5. Recreated only the catalog-confirmed `ensure_rls` event trigger in the separate post-baseline migration because Supabase schema dump intentionally excludes event triggers.
6. Generic seed identities and approvals were nulled. Observation templates and validation rules remain `DRAFT`. WHY: reusable definitions are not a substitute for a governed human approval in a new environment.

No original historical SQL is claimed or reconstructed by these changes.
