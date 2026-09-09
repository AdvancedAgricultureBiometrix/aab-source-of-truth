# AAB Researcher Adoption and Scientific Memory Principles

**Status:** Product and architecture principle record  
**Recorded:** 2026-09-10  
**Scope:** AAB researcher experience, historical data ingestion, continuing interoperability, field capture and scientific memory

## Purpose

AAB must become useful to scientists without requiring institutions or researchers to abandon established systems merely to participate. The objective is not to create another data-entry system. The objective is to turn accumulated and continuing scientific records into governed scientific memory and useful scientific intelligence while preserving human authority, provenance, uncertainty and institutional/country boundaries.

## Core adoption principle

> The easiest way for a scientist to do the work should also be the most scientifically rigorous way to record the work.

AAB must not become extra administrative homework. Scientists should experience AAB as assistance with their work, not as a system they must feed for somebody else's future benefit.

Two supporting rules follow:

> Never ask a scientist to enter information AAB can safely derive from information it already possesses or from an authorised source.

> Every interaction requiring effort from a scientist should return scientific, operational, evidentiary or safety value wherever possible.

Human attention should be reserved primarily for observation, questioning, interpretation, challenge, correction and approval.

## Existing systems are not the enemy

AAB should not require an institution to replace Excel, laboratory information systems, field software, databases, sensor platforms or other established systems as a condition of participation.

An institution may continue using its existing system of record and, where authorised, send data to AAB. The desired progression is:

**Existing system -> governed ingestion -> AAB scientific memory -> reasoning -> scientist**

AAB can therefore become a system of scientific memory and reasoning across authorised systems of record rather than attempting to become the system of record for everything.

Where practical, transfer should become as simple as an explicit **Send to AAB** action or an authorised governed connector. AAB should reduce migration friction rather than manufacture it.

## Historical Scientific Memory Recovery

Historical research is potentially an immediate source of value and a solution to the cold-start problem.

Institutions may hold decades of scientific work in Excel workbooks, CSV files, databases, PDFs, trial reports, laboratory outputs, field records and other formats. AAB should be capable of receiving authorised copies of such material without requiring researchers to manually reconstruct decades of work.

Historical ingestion is not equivalent to acceptance into governed scientific knowledge.

The ingestion process should preserve the original source and provenance, identify structure, propose mappings, detect duplicates and inconsistencies, identify missing metadata, preserve uncertainty, and quarantine unresolved material. AAB must not guess when meaning, units, methods, provenance or relationships cannot be established confidently.

A typical ingestion result may distinguish:

- records confidently mapped;
- records requiring human clarification;
- possible duplicates;
- unresolved units, methods or field meanings;
- material whose provenance is insufficient;
- material not yet eligible for governed scientific memory.

Human scientific or authorised institutional review remains required wherever interpretation cannot safely be derived.

The objective is not merely data migration. It is recovery of scientific memory: making earlier experiments, failures, contradictions, observations, hypotheses and unresolved questions discoverable and useful again.

AAB may identify patterns or relationships in historical records, but such findings must remain appropriately classified. A historical association is not automatically a scientific conclusion or causal finding. AAB should be able to state that a potentially important relationship has been detected while explicitly identifying insufficient evidence and the need for scientific investigation.

## Continuing interoperability

Historical recovery should be complemented by continuing ingestion.

After an institution's historical material is recovered, the institution should be able to continue using its preferred operational systems. New authorised records may then be transferred to AAB manually or through governed connectors.

AAB should automate safe, repeatable work such as timestamps, provenance capture, version relationships, identifiers, known trial context and authorised external context. Scientists should be asked to resolve exceptions rather than repeatedly enter information already known.

## Field operation and voice capture

Agricultural research frequently occurs in difficult real-world environments. AAB researcher interfaces should therefore be lightweight, robust and designed with intermittent connectivity in mind.

A future field researcher should be able to record an observation naturally, including by voice. Where authorised and technically reliable, AAB may associate contextual information such as authenticated observer, trial, plot, treatment, timestamp, location, weather, device context and photographs without requiring repetitive manual entry.

AI transcription or structuring must not silently convert interpretation into scientific fact. The scientist's original observation should be retained appropriately and any machine interpretation requiring scientific confirmation should be presented for confirmation or correction.

AAB should ultimately be capable of returning immediate value in the field, for example by identifying potentially relevant earlier observations or trials while clearly distinguishing similarity from causation or established scientific conclusion.

Offline operation should be treated as a governed architecture problem, not merely a user-interface feature. It requires appropriate treatment of identity assurance, encryption, timestamps, provenance, conflicting edits, device loss, synchronisation, revocation and evidence integrity.

## Scientific attribution rather than gamification

AAB should preserve intellectual contribution rather than rely on conventional points, badges or leaderboards that could distort scientific incentives.

Where governance and privacy permit, provenance should retain who made an observation, proposed a hypothesis, identified a contradiction, recorded a negative result, challenged an assumption, identified an evidence gap, designed an investigation, reviewed evidence or rejected an unsupported proposition.

A negative result is part of scientific knowledge. A contribution that becomes important years later should remain attributable through the governed provenance chain.

## Governance gates versus administrative coercion

AAB's scientific and safety gates are not intended to punish researchers or force unnecessary data entry.

AAB may legitimately refuse to represent work as having reached a later scientific, formulation, trial, safety or governance stage when the evidence or authorised decisions required for that stage do not exist.

This is different from arbitrary administrative gating. The principle is:

> AAB must not misrepresent the state of the evidence.

Where possible, adoption should progress through:

**Useful -> trusted -> relied upon -> institutionalised -> compliance-integrated**

rather than:

**Mandatory -> tolerated -> resented**

## Sovereignty and ownership

AAB does not need to own a country's or institution's scientific knowledge in order to provide value.

Country and institutional information must remain subject to the applicable authority, tenancy, governance and access boundaries. Scientists' contributions should retain appropriate attribution. AAB provides governed infrastructure and intelligence over information it is authorised to access.

A suitable country-level proposition is:

> Your scientific intelligence remains yours. AAB helps you stop losing it.

## Implication for first scientific validation

The first scientific validation does not necessarily require immediate country-wide adoption.

A strong candidate may be an agricultural university, government research institute or other credible institution with:

- capable scientists;
- substantial historical agricultural research;
- important current research problems;
- fragmented scientific memory;
- continuing active research; and
- willingness to test whether AAB can recover useful knowledge without replacing existing workflows.

A controlled validation could begin with one historical research programme and ask whether AAB can recover earlier experiments, connect results across years, identify contradictions and repeated failures, expose missing evidence, and generate scientifically useful questions without inventing conclusions.

The progression may then be:

**Historical memory -> current interoperability -> field assistance -> scientific reasoning**

The institution should be able to evaluate whether AAB makes existing scientific work more useful before being asked to change established workflows.

## Validation question

The central adoption test is:

> Can AAB reduce the scientist's administrative workload while simultaneously increasing the quality, completeness, traceability and usefulness of the scientific record?

A particularly strong behavioural test is:

> Would the scientist choose to use AAB tomorrow if nobody required them to?

## Design consequence

These principles should be considered before substantial researcher-facing development of Trials, observations, messaging, field interfaces, historical ingestion, connectors and scientific reasoning workflows.

AAB should not compete with Excel by becoming a better spreadsheet. Its opportunity is to make scientific knowledge distributed across many authorised systems understandable, connected, governed and reusable.

AAB does not create the historical science. Scientists did. AAB's role is to help ensure that science can be found, understood, challenged and used again.
