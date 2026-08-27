# AAB Source of Truth

Private governed source repository for the Advanced Agriculture Biometrix (AAB) platform.

## Mandatory continuity reading

Before changing Country Discovery, Supabase identity, participation approval, provisioning, country activation, legal or rehearsal documents, institution invitations or dashboard routing, read:

- [AAB Country Onboarding Path — Canonical Continuity Record](handovers/AAB-COUNTRY-ONBOARDING-CANONICAL-PATH.md)

That record is current and authoritative. It defines the testing-versus-live boundary and supersedes older statements that treated the main AAB Supabase and a country Supabase as an architecture mismatch.

## Current purpose

The current programme is **building and testing the missing onboarding machinery so the system works correctly when AAB goes live**.

It is not an operational WA Government onboarding and must never be represented as one.

The controlling architecture is:

- **Main AAB Supabase:** platform control plane, identity, participation requests and Platform Owner provisioning decisions.
- **Country Supabase:** private isolated country tenancy for activation, membership, documents, receipts, Discovery and later institution/professional records.
- **Governed provisioning bridge:** protected server-to-server handoff between the two; no database consolidation and no Platform Owner country membership merely to provision.

The controlling testing rule is:

> **Build and validate the complete onboarding machinery now, while permanently separating rehearsal evidence from future production authority.**

A test may proceed only when its records are isolated or permanently classified so they cannot satisfy future government, production, legal, invitation or scientific gates. Stop before placing ordinary or misleading testing material into operational main-system state.

## Current controlled checkpoint

- Private workspace: https://wa-test.aab.ag
- Sites checkpoint: version 163
- Classification: personal WA rehearsal; non-government; non-production; no legal effect
- External institution invitations: hard-locked
- Institution and professional onboarding: not begun
- Operational WA government tenancy: does not exist

The v163 bridge provides a controlled Platform Owner decision, protected WA handoff, hash-verified test PDF, nominated test Head Admin OTP journey, separate `REHEARSAL_ACKNOWLEDGEMENT`, single-use activation and membership-resolved dashboard foundation.

At the checkpoint, the activation remained unclaimed and there were zero rehearsal acknowledgements, production legal acceptances, memberships and external invitations.

## Non-negotiable boundaries

- Preserve ID-09: email → Turnstile → six-digit OTP. No passwords or general Accept Invitation flow.
- Authentication is not authority. Protected server records determine tenancy, membership, role, scope and routing.
- Sites owner access is recovery/testing access, not persisted Head Admin authority.
- A rehearsal acknowledgement can never satisfy a production legal gate.
- No onboarding stage grants Brain admission, ingredient status, formulation eligibility, trial eligibility or scientific approval.
- Discovery evidence remains experimental, quarantined and provenance-linked.
- Do not consolidate the main and country databases.
- Do not enable external institution invitations during the personal WA rehearsal.
- Do not represent any demonstration-stage request as government authority.
- Do not manufacture, bypass or silently mark prerequisites complete.

## Repository rules

- Preserve every validated version; do not overwrite history.
- Build and harden in the controlled workflow before deployment.
- No change without a recorded WHY and no trial without an OUTCOME.
- Never commit credentials, production environment files, personal data, database files or raw logs.
- Move SQL from `specifications/` to `migrations/` only after explicit human approval and controlled testing.
- Scientist and governance authority remain human-controlled.
- Report divergence from the canonical continuity record before changing the sequence.

## Structure

- `identity/contracts/` — versioned identity and authority contracts.
- `identity/tests/` — controlled browser/runtime validation scripts.
- `supabase/specifications/` — future SQL designs; unapplied and non-operational.
- `governance/validations/` — validation status and evidence registers.
- `deployment/` — future release manifests and approved deployment packages.
- `domains/` — governed domain source as each domain is consolidated.
- `architecture/` and `handovers/` — approved designs and continuity records.

## Current next objective

After direction is confirmed, exercise only the personal WA rehearsal activation path:

```text
verified email and OTP
→ controlled invitation claim
→ profile completion
→ exact test PDF display
→ REHEARSAL_ACKNOWLEDGEMENT
→ single-use activation
→ persisted HEAD_ADMIN membership
→ permanent dashboard
```

Then verify Dashboard → Country Discovery → Dashboard continuity. Keep institution/professional onboarding and all external invitations locked until separately authorised.
