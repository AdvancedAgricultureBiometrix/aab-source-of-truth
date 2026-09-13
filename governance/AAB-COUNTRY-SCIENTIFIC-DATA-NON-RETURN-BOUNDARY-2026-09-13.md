# AAB Country Scientific Data Non-Return Boundary

**Status:** Canonical governance and architecture rule  
**Recorded:** 2026-09-13  
**Applies to:** every country AAB environment, canonical AAB, future release tooling, analytics, support, telemetry, machine-learning components and any cross-country capability distribution.

## Core rule

> **Approved AAB software and capability may move from canonical AAB into a country environment. Country scientific information does not flow back into canonical AAB or into another country's environment merely because that country uses AAB.**

This rule strengthens the existing country-isolation architecture. AAB is not intended to use federated learning, pooled cross-country model training or hidden scientific-data aggregation as the mechanism by which canonical capability improves.

## Protected country scientific information

For this boundary, **country scientific information** includes both the original country data and scientific representations derived from it.

Protected material includes, but is not limited to:

- raw scientific records, files, spreadsheets, databases, images and measurements;
- Discovery findings and country-specific evidence;
- trials, observations, outcomes and negative results;
- institution research and country scientific memory;
- country-specific ingredient and formulation intelligence;
- scientific prompts, contexts, summaries and generated scientific outputs containing or reconstructing country science;
- embeddings and vector representations derived from country scientific records;
- fine-tuned model weights, adapters or other trained parameters derived from country scientific records;
- feature vectors and learned representations;
- distilled patterns or compressed scientific representations;
- aggregated scientific statistics where the aggregation is derived from protected country scientific information;
- scientific performance metrics or traces that reveal, encode or permit inference about protected country scientific activity;
- any equivalent present or future technical representation from which protected country scientific information could reasonably be inferred or reconstructed.

A representation does not become unprotected merely because it is not human-readable.

## Canonical AAB must remain scientifically clean

Canonical AAB may contain:

- approved software;
- schema and migrations;
- reusable reasoning methods;
- governance and evidence-handling rules;
- security improvements;
- approved baseline/reference configuration;
- centrally authorised public/open knowledge;
- synthetic or controlled AAB test data explicitly created for development and validation.

Canonical AAB must not be improved by silently importing protected country scientific information or its protected derivatives.

## How canonical capability may improve

Canonical capability may improve through sources that do not require appropriation of sovereign country science, including:

1. **AAB-owned R&D** — new reasoning methods, stronger evidence structuring, improved ingestion, workflow improvements, security hardening, better interfaces and governance controls.
2. **Public/open science** — lawfully available scientific literature and datasets that AAB is authorised to use centrally.
3. **Synthetic and controlled validation material** — test datasets and scenarios specifically created or licensed for platform development and validation.
4. **Independent review** — security testing, code review, scientific-method review and operational validation.
5. **Optional product/method feedback** — qualitative feedback about AAB's behaviour may be accepted only through a separately governed, opt-in channel designed not to contain protected country scientific information.

Adoption may improve funding, validation coverage, operational maturity and the quality of product feedback. It must not be represented as a hidden pooled-data flywheel.

## Optional feedback is a separate governance category

Product or methodology feedback is not automatically authorised simply because a country uses AAB.

If a country chooses to provide feedback such as:

- a workflow is confusing;
- a reasoning step missed a class of contradiction;
- a governance checkpoint is too permissive;
- a report format is difficult to use;

that feedback must use a separately governed and opt-in process.

The feedback process should be designed to exclude protected country scientific information. If meaningful feedback cannot be provided without revealing country scientific information, the transfer requires a separate, explicit country-authorised scientific-sharing process.

## Country-local improvement is allowed

A country may use its own scientific records and scientific memory inside its own authorised environment to improve local reasoning context, retrieval, prioritisation or other country-local capability, provided the activity remains within that country's authorised boundary and governance.

Such local improvement does **not** automatically become canonical AAB capability and does not flow to another country.

Conceptually:

```text
COUNTRY SCIENTIFIC INFORMATION
        |
        v
Country-local scientific memory / reasoning context
        |
        v
Benefits that country

        X
        |
        +--> Canonical AAB training
        +--> Another country's scientific system
```

Meanwhile:

```text
AAB CENTRAL R&D / PUBLIC KNOWLEDGE / CONTROLLED TESTING
        |
        v
Approved software or methodology improvement
        |
        v
Governed AAB release
        |
        +--> Country A
        +--> Country B
        +--> Country C
```

## No implied cross-country learning

AAB must not claim that the platform "gets smarter as more countries join" if that wording implies that one country's protected scientific information improves another country's AAB instance or trains canonical AAB.

Permitted and more accurate descriptions include:

- AAB software can improve globally without pooling countries' scientific data.
- AAB becomes more validated and operationally mature as deployments increase.
- AAB capability improves through R&D, controlled testing, public knowledge and governed product feedback.
- A country's own AAB can become more useful to that country as its local scientific memory grows.

## Public sovereignty wording

Public communications should prefer a precise formulation such as:

> **Your country's science stays in your country. AAB software updates move in. Your scientific records and derived scientific representations do not flow back into canonical AAB or into another country's system. Any future sharing requires a separate, explicit country-authorised process.**

Do not use an unqualified absolute such as "your data never leaves, ever, in any form" unless the full deployed system, support process, telemetry, backups, logging, analytics and legal operating model have all been independently verified to satisfy that exact statement.

## Technical implications

Implementations must be designed so that protected country scientific information is not returned to canonical AAB through secondary channels such as:

- telemetry;
- analytics;
- crash reports;
- debug logs;
- support exports;
- screenshots;
- monitoring payloads;
- AI prompts or inference traces;
- central vector stores;
- model-training pipelines;
- model-evaluation datasets;
- backups or disaster-recovery replication outside the authorised boundary.

Operational metadata required for service health or security must be minimised, classified and designed so it does not contain protected country scientific information.

## Future scientific sharing

This rule does not permanently forbid a country from choosing to share scientific information.

Any future cross-country or country-to-AAB scientific transfer must be:

- explicit;
- separately authorised by the country;
- purpose-limited;
- provenance-preserving;
- legally and scientifically governed;
- technically isolated from the default non-return path; and
- incapable of being inferred merely from ordinary participation in AAB.

## Permanent architecture rule

> **Share approved AAB capability outward. Keep sovereign scientific information and its scientific derivatives local unless a separate, explicit country-authorised sharing process says otherwise.**
