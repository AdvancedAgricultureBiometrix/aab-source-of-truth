# AAB Source of Truth

Private governed source repository for the Advanced Agriculture Biometrix (AAB) platform.

## Mandatory continuity reading

Every new chat, agent or contributor must read these records completely before interpreting or changing AAB:

1. [AAB Canonical System Definition](handovers/AAB-CANONICAL-SYSTEM-DEFINITION.md) — what AAB is as a complete governed scientific-intelligence and agricultural-development operating system.
2. [AAB Country Onboarding Path — Canonical Continuity Record](handovers/AAB-COUNTRY-ONBOARDING-CANONICAL-PATH.md) — the authoritative identity, participation, provisioning, activation, institution and role-routing sequence.
3. [AAB Sovereign Country Runtime and Controlled Cleanup Path](handovers/AAB-SOVEREIGN-COUNTRY-RUNTIME-AND-CLEANUP-PATH.md) — the mandatory central-control-plane/country-runtime separation, sovereign deployment profile, contamination boundary and safe cleanup sequence.\n4. [WA Hostinger Rehearsal Continuation](handovers/AAB-WA-HOSTINGER-REHEARSAL-CONTINUATION-2026-09-02.md) — the current cleanup, upload, isolation and new-chat continuation state.\n5. [Cleanup v20 and WA Hostinger Checkpoint](governance/validations/AAB-CLEANUP-V20-AND-WA-HOSTINGER-CHECKPOINT.md) — source hashes, cleanup evidence, package identity and unproven gates.\n6. [AAB Persistence Migration Boundary](architecture/AAB-PERSISTENCE-MIGRATION-BOUNDARY.md) — the governed replacement path from SQLite/Airtable and browser shortcuts to Supabase Auth and persisted memberships.\n7. [WA Hostinger Rehearsal Manifest v1](deployment/wa-rehearsal/WA-HOSTINGER-REHEARSAL-MANIFEST-v1.md) — the WA-only runtime identity, permitted services and live-validation gate.

Then read any task-specific canonical record linked from this README or the relevant domain directory.

The system definition prevents AAB from being reduced to one interface such as Discovery, onboarding or a dashboard. The onboarding record defines the testing-versus-live boundary. The sovereign-runtime record establishes that every country receives the same governed application and onboarding foundation while operating through isolated country infrastructure and mutable state.

## What AAB is

> **AAB is a sovereign, governed scientific-intelligence and agricultural-development operating system that turns country problems and opportunities into evidence-linked, human-authorised research, candidate ingredients, formulations, trials, regulatory dossiers and controlled manufacturing transfer—while preserving provenance, uncertainty, contradictions, negative results and the separation of administrative, scientific, regulatory and production authority.**

The complete operating chain is:

```text
country problem or opportunity
→ governed evidence acquisition
→ cognitive relationships and hypotheses
→ authorised investigation
→ candidate ingredient and formulation
→ controlled trials, observations and outcomes
→ contradictions, negative results and learning
→ regulatory translation and dossier
→ controlled manufacturing transfer
```

Country Discovery is the governed intelligence-acquisition layer near the beginning of this chain. Onboarding establishes authorised participation. Neither is the whole of AAB.

## Governing architecture

- **Main AAB Supabase:** platform control plane, identity, participation requests and Platform Owner provisioning decisions.
- **Country runtime:** one isolated operational AAB deployment per country, containing that country's Discovery workspace, onboarding, dashboards and governed scientific workflows.
- **Country Supabase:** a private isolated country tenancy for membership, documents, evidence, Discovery, scientific work and institution/professional records.
- **Governed provisioning bridge:** protected server-to-server handoff between the two; no database consolidation and no Platform Owner country membership merely to provision.
- **Cognitive and domain-brain layers:** advisory, evidence-bound scientific intelligence that cannot replace human scientific or governance authority.
- **Downstream development layers:** ingredients, formulations, trials, observations, safety, regulatory dossiers and manufacturing transfer, each governed by its own persisted gates.

Authentication is not authority. Protected server records determine tenancy, membership, role, scope, routing and capability.

## Present validation state

The personal Western Australia rehearsal has proven:

```text
verified email and OTP
→ controlled invitation claim
→ profile completion
→ exact test-document display and REHEARSAL_ACKNOWLEDGEMENT
→ single-use activation
→ persisted HEAD_ADMIN membership
→ membership-resolved permanent dashboard
```

The permanent dashboard now resolves from persisted WA `HEAD_ADMIN` membership rather than Sites-owner recovery access.

Institution onboarding and internal team-permission paths have been built for controlled rehearsal, but they must not be described as fully proven until their complete user journey and persisted records have been validated. External, government, production and legally operative onboarding remain unauthorised.

## Capability-state rule

Future work must distinguish these states:

1. architecturally present;
2. implemented and connected;
3. populated with controlled evidence;
4. successfully rehearsal-tested; and
5. authorised for live operation.

A schema, interface or code path is not proof of successful operation or live authority.

## Non-negotiable boundaries

- Preserve email → Turnstile/risk control → OTP; do not introduce passwords as the default identity path.
- Provide a secure email-verification route when automatic browser verification cannot complete, without turning a successful email sign-in into membership authority.
- Authentication is not authority. Persisted protected records determine authority.
- Sites-owner access is recovery/testing access, not persisted country authority.
- A rehearsal acknowledgement can never satisfy a production legal gate.
- No onboarding stage grants Brain admission, ingredient status, formulation eligibility, trial eligibility or scientific approval.
- Discovery and scientific evidence remain experimental, quarantined and provenance-linked until the applicable human-controlled gate succeeds.
- Preserve contradictions and negative results as governed learning.
- Do not consolidate the main and country databases.
- Do not represent any demonstration-stage request or record as government authority.
- Do not manufacture, bypass or silently mark prerequisites complete.

## Repository rules

- Preserve every validated version; do not overwrite history.
- Build and harden in the controlled workflow before deployment.
- No change without a recorded WHY and no trial without an OUTCOME.
- Never commit credentials, production environment files, personal data, access tokens, database files or raw logs.
- Move SQL from `specifications/` to `migrations/` only after explicit human approval and controlled testing.
- Scientist and governance authority remain human-controlled.
- Report divergence from canonical records before changing the sequence.

## Structure

- `identity/contracts/` — versioned identity and authority contracts.
- `identity/tests/` — controlled browser/runtime validation scripts.
- `supabase/specifications/` — future SQL designs; unapplied and non-operational unless a separate migration record proves application.
- `governance/validations/` — validation status and evidence registers.
- `deployment/` — future release manifests and approved deployment packages.
- `domains/` — governed domain source as each domain is consolidated.
- `architecture/` and `handovers/` — approved designs, canonical definitions and continuity records.

## Current next objective

Validate the newly uploaded isolated WA runtime at `wa-rehearsal.nexiuma.ai` before any further feature wiring. Upload completion is recorded, but live PHP execution, WA-only configuration, Turnstile, OTP, protected role routing and denial of unauthorised routes remain unproven on the new host. Stop on any main-project reference, secret exposure, PHP source exposure, legacy persistence access or authority bypass.\n\nThe protected source backup and cleanup v20 checkpoint are recorded. SQLite and Airtable executable dependencies are legacy/transitional and must be replaced through bounded, evidence-backed migration to the applicable country Supabase, Supabase Auth and persisted memberships.

The proven rehearsal sequence is:

```text
persisted WA HEAD_ADMIN
→ classified single-use institution invitation
→ Institution Admin email verification and OTP
→ invitation claim and institution profile
→ rehearsal acknowledgement and activation
→ persisted institution and INSTITUTION_ADMIN membership
→ institution dashboard
→ configure bounded team roles and permissions
→ invite internal rehearsal research personnel
→ role-specific dashboard
```

The Country Head Admin may govern institutions and invitations within the authorised rehearsal envelope. Institution Admins may configure their team only within that country-approved envelope. Neither administrative role can create scientific approval, regulatory approval, ingredient status, trial eligibility or production authority.

Each future country receives this same governed onboarding structure plus its own Discovery workspace, database, Auth, Storage, secrets, backups and role-resolved operational dashboards. Canonical code and brain definitions may be released across countries; live evidence, cognitive state, decisions and learning never synchronise automatically to the central system or another country.
