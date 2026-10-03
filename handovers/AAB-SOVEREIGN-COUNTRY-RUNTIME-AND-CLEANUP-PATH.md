# AAB Sovereign Country Runtime and Controlled Cleanup Path

**Status:** Canonical continuity decision  
**Recorded:** 2026-09-01  
**Scope:** Platform control plane, reusable country runtime, sovereign deployment, data isolation, onboarding reuse and controlled cleanup  
**Supersedes:** Any interpretation that every country should operate through one shared mutable AAB application or shared operational database

## Mandatory direction

AAB must be deployed as a governed central control plane plus physically and logically isolated country runtimes.

The central AAB system must not become the shared operational workspace through which every country creates evidence, cognitive state, hypotheses, decisions, formulations, trials or learning. A country may inherit approved AAB software, cognitive contracts, governance contracts and domain-brain definitions, but its mutable operational state remains inside that country's deployment.

A copy of governed code is not contamination. A country runtime able to write into central mutable state, another country database or a shared scientific ledger is a contamination risk and must fail closed.

## Authoritative topology

```text
aab.ag central control plane
├── public explanation and participation entry
├── identity and Platform Owner decisions
├── canonical architecture and release governance
├── signed/versioned country-runtime releases
└── governed import/export decisions only

one isolated runtime per country
├── country Discovery workspace
├── country and institution onboarding
├── role-resolved dashboards
├── evidence, observations and provenance
├── cognitive nodes, relationships and hypotheses
├── ingredients, formulations, trials and outcomes
├── local scientific learning and negative results
├── regulatory and manufacturing-transfer preparation
└── country-only database, Auth, Storage, secrets and backups
```

The central control plane must not sit in the normal operational request path after country provisioning. Cross-boundary operations require an explicit, authenticated and auditable provisioning or transfer contract.

## Shared versus country-local

| Component | Distribution rule | Mutation rule |
| --- | --- | --- |
| AAB application and interface code | Versioned country release | Updated through controlled release |
| Universal cognitive-kernel definitions | Versioned and fingerprinted | Read-only during normal country operations |
| Domain-brain definitions and algorithms | Versioned and fingerprinted | Read-only during normal country operations |
| Governance and scientific contracts | Versioned and fingerprinted | Cannot be weakened locally |
| Country configuration and terminology | Country package | Country-governed |
| Evidence, sources and observations | Country only | Country-authorised roles |
| Cognitive nodes, relationships and hypotheses | Country only | Evidence-bound country workflows |
| Ingredients, formulations, trials and outcomes | Country only | Human scientific and governance gates |
| Contradictions and negative results | Country only | Preserved as governed learning |
| Cross-country contribution | Explicit governed export packet | No automatic synchronisation or promotion |

"One AAB brain" means one canonical architectural and release lineage. It must not mean one mutable database used by every country.

## Reusable onboarding contract

Every country receives the same governed onboarding structure, configured for its jurisdiction:

```text
country participation request
→ Platform Owner decision
→ protected country provisioning
→ nominated Country Head Admin
→ email verification and OTP
→ required legal or classified document
→ persisted country membership
→ Country Head Admin dashboard
→ country Discovery workspace
→ approved institution invitation
→ Institution Admin verification, claim and activation
→ institution dashboard
→ bounded team permissions
→ research-team invitations
→ persisted role membership
→ role-specific dashboard
→ governed scientific work
```

The Western Australia journey currently proves an internal rehearsal path. Rehearsal acknowledgements, memberships and invitations have no government, production or legal effect and cannot satisfy future production gates. Production deployments substitute approved jurisdiction-specific documents and authority classifications without weakening the proven identity and membership sequence.

## Country Discovery rule

Every country has its own Discovery workspace, maps, evidence connectors, language, terminology, regulatory context and locally persisted findings. The common interface and cognitive contracts may be inherited from the canonical release, but:

- scans execute inside the country boundary;
- weak or incomplete evidence remains quarantined;
- findings cannot automatically become ingredients, formulations, trials or scientific truth;
- evidence and learning do not flow automatically to the central system or another country;
- cross-country reuse requires a governed, provenance-preserving transfer packet and human approval.

## Sovereign deployment profile

Each country release requires a machine-readable deployment profile containing at least:

- country and jurisdiction identifiers;
- environment classification: rehearsal, staging or production;
- expected database project identifier and hosting region;
- permitted hosting jurisdictions and providers;
- permitted Auth, Storage, backup and logging locations;
- data classifications and retention requirements;
- cross-border-transfer rules;
- verified institutional and role authorities;
- trial-authority requirements;
- biological-resource, provenance and benefit-sharing controls;
- offline-capture constraints;
- export authorities and approval gates;
- incident-response and local reporting contacts.

The runtime must refuse to start when its configured country, environment, database project, storage boundary or release fingerprint does not match its signed deployment manifest.

A different server alone is not isolation if it contains central credentials. Separate accounts, compute, filesystem identity, credentials, databases, storage, backups and deployment pipelines establish the boundary.

## Data localization and regional deployment

Country hosting must be selected after jurisdiction-specific legal and institutional review. Requirements differ by data category, operator, sector and transfer mechanism; AAB must not assume all jurisdictions impose identical localization rules.

Where managed infrastructure provides an approved exact region, use the specific jurisdictional region rather than a broad capacity-based region. A future Singapore project may use a separate Supabase project in the specific Singapore region `ap-southeast-1`, subject to verification of contractual terms, backups, subprocessors, support access and applicable Singapore requirements.

Region selection is a data-location control, not proof of legal compliance.

## Offline-first boundary

Future field capture may support poor-connectivity environments, but offline operation remains bounded:

- encrypted device storage;
- registered device and user identity;
- signed, expiring submission envelopes;
- explicit conflict and duplicate handling;
- synchronisation only to the home-country runtime;
- no offline scientific approval, governance promotion or cross-border export.

## Controlled cleanup objective

The historical operational application must be treated as protected source material, not as an approved country deployment package. Cleanup produces three explicit deliverables:

1. **Central AAB control plane**
   - public explanation and participation entry;
   - identity and Platform Owner decisions;
   - release, provisioning and governed transfer controls.

2. **Reusable AAB country runtime**
   - only operational components required by a country;
   - no central credentials, personal data, logs or mutable global state;
   - environment-driven country configuration;
   - release manifest, hashes and startup isolation checks;
   - role-resolved country, institution, researcher and auditor interfaces.

3. **WA rehearsal deployment**
   - configured only for Western Australia;
   - connected only to the WA clean-room project and approved WA services;
   - accessible through `wa-test.aab.ag` during rehearsal;
   - future production address and hosting selected only after authorization.

## Cleanup safety rules

Cleanup may continue within one workstream, but deletion is not the first action.

Before deletion:

1. The user creates and verifies an independent, recoverable backup.
2. Record the archive date, size and SHA-256 checksum.
3. Expand a working copy; never clean the sole archive.
4. Produce a complete inventory with size, type, duplicate hash, references and provisional classification.
5. Scan for credentials, project identifiers, personal data, logs, databases and server-only configuration without publishing their values.
6. Build a dependency graph across interfaces, code, APIs, workers and configuration.
7. Classify every item:
   - `KEEP_CENTRAL_CONTROL_PLANE`
   - `KEEP_COUNTRY_RUNTIME`
   - `KEEP_SHARED_RELEASE_SOURCE`
   - `QUARANTINE_REVIEW`
   - `EXCLUDE_RUNTIME_DATA`
   - `REMOVE_DUPLICATE_OR_RETIRED`
8. Move removal candidates into quarantine before permanent deletion.
9. Build the country runtime from an allowlist, not by only deleting obvious files.
10. Verify navigation, APIs, authentication, role routing, database isolation and fail-closed startup.
11. Do not deploy or merge until controlled validation passes.

No credential, personal record, raw log, backup database, environment file or test-created scientific state may enter GitHub.

## Immediate next path

```text
record this decision in GitHub
→ user verifies independent backup
→ inventory historical application
→ dependency and secret-reference audit
→ classify every file
→ define country-runtime allowlist
→ separate central control plane
→ build clean WA runtime
→ enforce WA-only service configuration
→ connect role dashboards
→ run complete WA rehearsal validation
→ publish signed reusable country-runtime release
→ prepare Singapore from the same governed package
```

## Non-drift rule

Future chats, agents and contributors must not:

- reconnect country operations to central mutable AAB state for convenience;
- interpret a common UI or canonical brain as permission to share live state;
- consolidate central and country databases;
- delete historical files before backup, inventory and classification;
- describe the historical application folder as deployable before validation;
- make production legal or data-localization claims without jurisdiction-specific review;
- allow automatic country-to-global learning or promotion;
- bypass the proven onboarding, membership or human-authority gates.

If implementation appears to require any of these actions, stop and report the conflict against this record before changing code or data.
