# AAB Source of Truth

Private governed source repository for the Advanced Agriculture Biometrix (AAB) platform.

## Current authoritative continuity

The current Country Discovery and country-onboarding path is governed by:

- [AAB Country Onboarding Path â€” Canonical Continuity Record](handovers/AAB-COUNTRY-ONBOARDING-CANONICAL-PATH.md)

Future chats working on Country Discovery, Supabase identity, participation approval, country activation, institution invitations or dashboard routing must read that record before making changes.

The controlling data rule is:

> **One controlled onboarding test Supabase now â†’ validate the complete connected journey â†’ one private isolated Supabase for each real onboarded country later.**

The existing approved participation request is controlled build-and-test evidence. It is not an operational country approval.

## Current Country Discovery checkpoint

- Private workspace: https://wa-test.aab.ag
- Sites checkpoint: version 134
- Western Australia is the canonical visual and Candidate Investigation template.
- Every newly added country must use the same shared renderer, stylesheet, scan structure, intelligence panel, environmental framework, result groups and full investigation workspace.
- Country maps, sources, evidence and findings remain isolated and country-specific.
- Do not hard-code a new country page or copy evidence from another jurisdiction.

## Repository rules

- Preserve every validated version; do not overwrite history.
- Build and harden in the rebuild/staging workflow before deployment.
- No change without a recorded WHY and no trial without an OUTCOME.
- An account is not authority. Authority remains in protected server-side records.
- Never commit credentials, production environment files, personal data, database files or raw logs.
- Move SQL from `specifications/` to `migrations/` only after explicit human approval and controlled branch testing.
- Scientist/admin authority is preserved. No autonomous execution or self-authorised mutation is enabled.
- A test jurisdiction must never be represented as an operational country tenancy.

## Structure

- `identity/contracts/` â€” versioned identity and authority contracts.
- `identity/tests/` â€” controlled browser/runtime validation scripts.
- `supabase/specifications/` â€” future SQL designs; unapplied and non-operational.
- `governance/validations/` â€” validation status and evidence registers.
- `deployment/` â€” future release manifests and approved deployment packages.
- `domains/` â€” governed domain source as each domain is consolidated.
- `architecture/` and `handovers/` â€” approved designs and continuity records.

## Current next objective

Complete the connected controlled onboarding bridge after Country Discovery:

> **Discovery reviewed â†’ verified participation request â†’ Platform Owner approval â†’ versioned terms acceptance â†’ country activation â†’ Head Admin setup/dashboard â†’ institution invitation â†’ verified institution-user dashboard.**

Do not provision a real country tenancy while validating this path.

<!-- AAB-SOVEREIGN-CANONICAL-DIRECTION -->

## Canonical AAB direction

Future development and handovers must begin with:

- [Sovereign Scientific Intelligence Principles](docs/canonical/AAB-SOVEREIGN-SCIENTIFIC-INTELLIGENCE-PRINCIPLES.md)
- [Current Build Boundaries](docs/canonical/AAB-CURRENT-BUILD-BOUNDARIES.md)
- [Federated Scientific Exchange Roadmap](docs/roadmap/AAB-FEDERATED-SCIENTIFIC-EXCHANGE-ROADMAP.md)
- [Sovereign Value and Pricing Hypotheses](docs/hypotheses/AAB-SOVEREIGN-VALUE-AND-PRICING-HYPOTHESES.md)

All AAB development must preserve country isolation, scientific uncertainty, negative findings, provenance and human authority. No implementation may introduce cross-country operational queries, silent evidence overwrites, automatic scientific approval, automatic Brain admission or formulation eligibility. Future capabilities must remain labelled as planned until technically built and validated.
