# AAB Country Scientific Data Egress — Technical Control Specification

**Status:** Canonical implementation specification — controls required before external institutional launch  
**Recorded:** 2026-09-13  
**Applies to:** every AAB country tenancy, canonical AAB, country-to-canonical communication, optional feedback, support, diagnostics, analytics, backups, and any future cross-country sharing mechanism.

## Purpose

This specification turns the policy principle **"approved AAB capability moves outward; sovereign country scientific information does not move back to canonical AAB"** into an enforceable technical boundary.

The existing policy record is not, by itself, proof of isolation. External partners, security reviewers and data-protection officers must be able to inspect architecture and evidence showing that the boundary is technically enforced and continuously tested.

## Launch posture

At external institutional launch, the safest default is:

> **No technical pathway for category-2 country scientific information to leave the country environment.**

A future authorised scientific-sharing mechanism must not be assumed to exist merely because policy allows one in principle.

Until a separately reviewed and approved export mechanism is implemented, the launch architecture should behave as if no such mechanism exists.

## Data categories

### Category 1 — AAB software and capability

May flow **from canonical AAB into a country environment** through governed releases.

Examples:

- application code;
- schema migrations;
- reasoning methods;
- evidence-structuring logic;
- security controls;
- governance rules;
- ingestion methods;
- user-interface improvements;
- validation logic;
- controlled public/open-science reference material where authorised.

### Category 2 — country scientific information

Must not flow **from a country environment back to canonical AAB or another country environment** by default.

Includes raw and derived scientific information such as:

- source files and historical research;
- trial, plot, observation, measurement and outcome records;
- Discovery findings;
- formulations and ingredient intelligence;
- scientific memory;
- hypotheses, mechanisms, contradictions and knowledge gaps;
- regulatory/scientific dossiers;
- embeddings and vector representations;
- fine-tuned model weights, adapters or checkpoints derived from country science;
- learned representations and feature vectors;
- distilled patterns;
- scientific aggregates and statistics derived from protected country data;
- generated scientific summaries;
- prompts, retrieval context or model traces containing protected scientific content;
- model-evaluation artefacts containing country scientific content;
- support artefacts, screenshots or logs containing protected scientific content.

Transforming country scientific information does not change its category.

### Category 3 — optional product/methodology feedback

May leave a country environment **only under a separate explicit opt-in governance path** and only after controls establish that category-2 information is absent.

This category is not part of the core country participation grant.

Examples may include narrowly scoped software-quality feedback such as:

- navigation or usability problems;
- generic error codes;
- abstract methodology feedback that contains no country scientific content;
- software-performance or compatibility information designed not to reveal scientific records.

## Feedback purity rule

When useful feedback conflicts with sovereignty purity, **sovereignty purity wins by default**.

A researcher describing a scientific example in order to explain a product defect can disclose category-2 information. Therefore free-form feedback must not automatically cross the country boundary.

Preferred launch design:

1. structured feedback choices that do not require scientific examples;
2. country-side review/redaction before any free-form text can leave the tenancy;
3. explicit acknowledgement that the reviewed message will leave the country environment;
4. logging of reviewer, authority, timestamp, destination and purpose;
5. no automatic attachment of prompts, screenshots, records, traces or scientific context.

If these controls are not implemented, free-form outbound feedback should remain disabled.

## Future cross-country scientific sharing

A future scientific-sharing capability must be treated as a separate product/security feature, not as an implied property of AAB.

It requires, at minimum:

- an explicit sending-country authority model;
- an explicit receiving scope and purpose;
- object-level selection rather than bulk/background collection;
- no automatic or scheduled export;
- a server-side allowlist of permitted export classes;
- a deny-by-default data-classification gate;
- independent approval appropriate to the country governance model;
- a recorded legal/governance basis;
- immutable export receipt;
- exact object/version hashes;
- destination identity;
- timestamps and correlation IDs;
- revocation/withdrawal handling where legally and technically applicable;
- security review and test evidence before activation.

No Platform Owner or AAB staff role should be able to unilaterally bypass country authorisation and export category-2 information.

## Technical enforcement requirements

### 1. Network and service separation

Each country environment must have isolated:

- application runtime;
- database;
- authentication;
- secrets;
- storage;
- backups;
- logs containing protected content;
- embeddings/vector stores if used;
- model adapters or country-derived model artefacts if used.

Canonical AAB must not have a standing database connection that can read country scientific tables.

### 2. No shared scientific telemetry pipeline

Application analytics, crash reporting and observability must be designed so that country scientific content is not exported through telemetry.

Prohibited outbound telemetry payloads include:

- scientific row values;
- prompts or model context;
- SQL/query results containing protected content;
- uploaded filenames where sensitive;
- screenshots;
- scientific identifiers that permit reconstruction;
- embeddings or vectors;
- generated scientific text.

Where central operational telemetry is used, it must be limited to approved non-scientific operational metadata and documented as such.

### 3. No canonical learning from country scientific content

Canonical AAB must not ingest country category-2 information into:

- training corpora;
- fine-tuning jobs;
- embedding indexes;
- evaluation sets;
- retrieval stores;
- aggregate model-improvement datasets;
- synthetic-data generation jobs seeded from protected country scientific content;
- distilled or compressed model artefacts.

### 4. Outbound deny-by-default controls

Country application components that can communicate externally must use explicit allowlists for destinations and message types.

Any outbound route capable of carrying arbitrary country scientific content must be considered a security-sensitive export surface.

### 5. Support and administration

Support access must not create a silent data-export path.

Remote support, diagnostics or screenshots containing protected scientific content require country-side action and authority appropriate to the support process.

### 6. Backups and disaster recovery

Country backups remain part of the country information boundary. Backup location, encryption, operator access and restore processes must follow the same sovereignty classification as the primary data.

## Canonical improvement sources

Canonical AAB may improve through sources that do not depend on sovereign country scientific information, including:

- AAB internal R&D;
- controlled and synthetic test data created for AAB development;
- public/open scientific literature and datasets lawfully available for central use;
- independent security, usability and technical validation;
- separately authorised category-3 product feedback;
- software defects and operational lessons that can be abstracted without exporting category-2 content.

Country adoption may increase validation, resources, funding, compatibility coverage and operational maturity, but AAB must not describe itself as becoming scientifically smarter merely because more sovereign country data exists inside isolated deployments.

## Required verification evidence

Before an external institutional partner is asked to rely on the non-return claim, AAB should be able to produce evidence including:

1. architecture/data-flow diagram showing country and canonical network boundaries;
2. inventory of all outbound endpoints from a country environment;
3. inventory of analytics, telemetry and logging destinations;
4. source/code review of outbound communication paths;
5. tests proving category-2 data cannot be exported through normal application paths;
6. tests proving canonical services cannot query country scientific data directly;
7. tests proving one country cannot access another country's records;
8. verification that embeddings/vector stores and country-derived model artefacts remain country-local;
9. backup-location and recovery evidence;
10. audit evidence for any category-3 feedback transfer;
11. independent penetration/security review before or during an external pilot;
12. regression tests repeated for every approved release that modifies networking, telemetry, AI/model, feedback or support behaviour.

## Automated test expectations

A future release pipeline should fail closed if tests detect:

- a new unapproved outbound hostname;
- category-2 fields in telemetry payloads;
- country scientific records in canonical stores;
- country embeddings or trained artefacts outside their tenancy;
- cross-country data visibility;
- an export-capable endpoint lacking explicit governance controls;
- free-form feedback leaving without country-side review where that review is required.

## Public-claim rule

Until these controls and evidence are implemented and independently validated, public wording must not imply a stronger technical guarantee than has actually been proven.

Use precise language such as:

> **AAB is designed so approved software capability moves into country environments while sovereign scientific information remains within the country environment. The non-return boundary is being implemented and validated as a technical control, not only a policy.**

Once independent validation supports the stronger claim, public wording may be strengthened accordingly.

## Permanent design principle

> **The country-data non-return boundary is a technical security boundary, not a promise of good behaviour.**

Policy defines what must be true. Architecture, code, tests, logs and independent review must prove it remains true.
