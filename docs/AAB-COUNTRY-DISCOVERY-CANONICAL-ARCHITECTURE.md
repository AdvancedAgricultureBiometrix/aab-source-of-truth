# AAB Country Discovery — Canonical Architecture

**Decision date:** 19 August 2026  
**Decision status:** LOCKED — required reading before Country Discovery work  
**Sites checkpoint when recorded:** Version 90, commit `ed0400220b51116359888a0944167fc87c453d10`

## Governing purpose

The Country Discovery Workspace is the controlled pre-AAB experience for an authorised country or state representative. It exists to reveal what governed public evidence may indicate about that jurisdiction's resources, residuals, hazards, constraints and cross-domain possibilities.

The page is not a conventional sales pitch. Its value is the truth and significance of what it can defensibly reveal.

> AAB searches broadly, classifies cautiously and displays only what the country evidence supports. Known candidate types guide discovery but never limit it.

## Non-negotiable tenancy rule

> **One onboarded country = one complete private Supabase.**

Each country Supabase contains its own:

- users, roles, invitations and authorised institutions;
- jurisdiction profile, languages, timezone and boundaries;
- registered government, scientific, regulatory, economic and spatial sources;
- source adapters and governed scan recipes;
- evidence, provenance, retrieval history and coverage state;
- scan runs, findings, weak internal signals and review state;
- dashboards and governed investigation downloads;
- later country-specific AAB scientific memory and approved outputs.

Evidence, memory, users and outputs must not cross between country tenancies. The present WA rehearsal database is not an operational country database. A clean reproducible baseline must remain free of WA, Thailand or other country evidence.

## Authorised country journey

1. A head of state, government representative or authorised institution registers through AAB.AG.
2. The Platform Owner verifies the person and their authority.
3. The Platform Owner accepts or rejects the registration.
4. An accepted representative receives a controlled, preferably single-use, access code.
5. Code redemption binds the verified user to the authorised country or state and its private tenancy.
6. The user lands in that jurisdiction's Country Discovery Workspace.
7. The user deliberately runs the governed country scan.
8. The scan reads only that country's approved source registry and adapters, records coverage and retrieval state, stores its governed run and findings, and then renders the supported result cards.
9. The authorised user may invite universities, laboratories, agencies, researchers or other trusted institutions.
10. Accepted invitees land on governed institution dashboards.
11. Their dashboards provide downloadable investigation packages explaining what must be investigated and measured.
12. Development pauses at that boundary to agree the best governed field, laboratory and institutional data-capture method.

The current Sites authentication header alone is not proof of code redemption, country entitlement or tenancy routing. Those controls must be explicitly implemented and validated.

## Country configuration, not country-specific page rebuilds

The Western Australia workspace is the presentation and investigation template. It is not a factual template whose WA content is copied into another country.

Each country profile determines:

- jurisdiction identity and authorised administrative boundaries;
- language, timezone and data-residency rules;
- enabled discovery domains;
- approved sources and source-adapter versions;
- map services and geographic resolution;
- scan recipes and source-coverage requirements;
- evidence thresholds and candidate thresholds;
- regulatory, safety, sovereignty and review rules.

Possible new sources enter a Source Approval Queue:

`possible source → identity verification → authority assessment → licence/access review → coverage test → human approval → active registry`

## The scan contract

The scan action must execute a genuine governed operation. It may run approved connectors or read a clearly identified stored governed snapshot. It must never simulate freshness.

Each run records:

- country workspace and profile;
- source-adapter versions;
- sources attempted, retrieved, failed or unavailable;
- retrieval timestamps;
- geographic scope and resolution;
- deduplication and provenance;
- evidence state and coverage state;
- threshold result and quarantine state.

The four visible result groups are:

1. Candidates detected.
2. New candidates requiring classification.
3. Known types not detected.
4. Evidence coverage gaps.

Weak signals remain in an internal fifth group and are not displayed as genuine candidates. “Not detected” is permitted only after adequate source coverage; otherwise the result is “Evidence coverage incomplete.”

## What makes the discovery intelligent

AAB examines evidence that is normally separated between departments and disciplines, including agriculture, waste, geology, soils, volcanic terrain, mine-derived streams, water, wastewater, aquaculture, air quality, public health, infrastructure, imports, economics, supply chains, carbon and pollution.

The reasoning ladder must remain visible:

`documented fact → calculated signal → cross-domain hypothesis → knowledge gap → required investigation`

AAB should reveal defensible relationships that may not have been considered before. It must never convert inference into benefit, suitability or safety claims.

## The question the page should create

### What might your country already have?

A material currently treated as waste, wastewater, mine residue, volcanic soil, agricultural by-product or environmental burden may contain properties worth investigating. Could locally recovered minerals, nutrients or biological compounds—after identity, contamination, safety, compatibility and performance testing—complement a governed delivery system and reduce dependence on imported agricultural inputs? AAB does not assume that a discovered resource is useful or safe. It reveals evidence-backed possibilities, explains what remains unknown and gives authorised scientists a structured path to determine whether something overlooked could contribute to local resilience, environmental improvement, human wellbeing or economic value.

This is an **investigation rationale**, not an established opportunity or benefit.

## Protected formulation boundary

The discovery page may ask whether an approved local material could eventually complement a governed carrier, stabilisation, nutrient-delivery or stress-response system. It must not display protected AAB ingredient names, formulation recipes, inclusion rates, mixing instructions or reasoning architecture.

An unknown material is never mixed into AAB merely because it was detected.

`country evidence → quarantined finding → identity and composition → contamination and safety → compatibility → controlled trials → scientist decision → governed approval`

Until approval:

- no AAB brain access;
- no ingredient or formulation creation;
- no trial assignment;
- no operational use;
- no global-taxonomy modification;
- no automatic promotion into scientific memory.

## Invitation and investigation boundary

After viewing scan results, the country controls whom it invites. An accepted institution receives only the governed dashboard and permitted investigation packages relevant to its role and jurisdiction.

A download explains what is documented, what remains unknown, required samples and measurements, safety and regulatory checks, decision tests, provenance and jurisdiction restrictions.

Downloading does not submit evidence to AAB or grant scientific access. Data-capture design is a separate governed decision made after this stage.

## Current maturity at Version 90

One controlled WA path has been proven:

`registered EMRC source → completed stored WA snapshot → quarantined Red Hill finding → Supabase Edge Function → Sites server API → WA presentation data`

The WA UI still gates its full results behind an older interface scan sequence. That sequence is not a live country-source scan and must not be represented as one. The Red Hill API path is functioning, but the complete registration-code-country-entitlement-scan-invitation-dashboard journey is not yet implemented end to end.

Do not call the Country Discovery Engine autonomous or complete until one full country journey is proven using controlled real evidence.

## Required next build

Preserve the deliberate scan-first experience, but replace the simulated scan with a genuine governed country scan/read operation:

1. Resolve verified user and country entitlement.
2. Select the correct private country tenancy and active country profile.
3. Create a governed scan run.
4. Execute approved adapters or explicitly read a stored snapshot.
5. Record retrieval and coverage outcomes.
6. Store quarantined findings.
7. Render the four result groups using the WA workspace template.
8. Prove the complete path with real controlled evidence.

Do not start broad autonomous crawling. Build once, wire fully, prove end to end, then move forward.

