# AAB Country Isolation Architecture — 2026-09-22

**Status:** ARCHITECTURAL RECORD
**Authority:** RECORDS DELIBERATE DESIGN DECISIONS ABOUT ENVIRONMENT SEPARATION. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority.

## The governing principle

One country, one isolated country environment.

The Platform Owner environment and each country rehearsal or production environment are deliberately kept separate. No country's data is consolidated into the platform control plane, and the Platform Owner does not become a country tenancy member merely to operate the platform.

## Current environment mapping

### `aab.ag`
- **Supabase project:** `epjhsrflzeuqzastevtz`
- **Function:** Main AAB platform control plane and integration environment
- **Responsibilities:** Platform identity, country participation requests, Platform Owner decisions, governed country provisioning instructions

### `wa-rehearsal.nexiuma.ai`
- **Supabase project:** `kdpcfbaeklkffozryjah`
- **Function:** Isolated Western Australian clean-room rehearsal tenancy
- **Responsibilities:** WA activation, country membership, rehearsal receipts, institution and professional records, WA Discovery state

## Why these databases are kept separate

The Platform Owner is not supposed to become a WA tenancy member merely to operate the control plane. WA data must not be consolidated into the main AAB database. Each country environment maintains its own:

- Database password
- API keys and service credentials
- Connection strings
- Environment configuration
- Administrative ownership and recovery controls

## Credential and operational boundaries

A password rotation or credential change in one project does not affect the other. Each project's credentials must be managed, rotated and verified independently within its own boundary.

A diagnostic failure against `wa-rehearsal.nexiuma.ai` must not be interpreted as evidence that an `aab.ag` operation failed, or vice versa. Before interpreting any diagnostic result, confirm:

1. Which Supabase project the diagnostic actually targets (from the runtime environment, not only the `.htaccess` reference)
2. Whether the runtime environment actually loaded matches the intended project
3. Whether the credentials currently accepted by that Supabase project match what the config file contains

No credentials should be copied between the two projects. Do not consolidate the projects, change one project's credentials to match the other, migrate data between them, or modify either environment's infrastructure without separate authorisation scoped to that environment.

## Vendor neutrality

Supabase is the provider being used for the current rehearsal and verification work. Production AAB remains intended as a vendor-neutral country deployment package. A future country may use its own approved provider, provided the canonical AAB contracts, governance controls and sovereignty requirements are preserved. The use of Supabase for the current rehearsal does not make Supabase a permanent architectural requirement.

## Current status

Both environments are non-production and non-commissioned. The WA rehearsal environment is not commissioned. No country deployment has received Gate D authority.
