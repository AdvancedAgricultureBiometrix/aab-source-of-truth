# Supply Chain Sovereignty — Domain Definition — 2026-09-22

**Status:** DOMAIN DEFINITION — NOT IMPLEMENTATION
**Authority:** DEFINES THE SUPPLY CHAIN SOVEREIGNTY DOMAIN AND ITS CAPABILITY ROADMAP. Establishes no commissioning, production, Gate D, WP05, scientific-validity or regulatory authority. No capability in this domain is implemented or admitted unless explicitly stated.
**Domain prefix:** SCS
**First instance:** EU Deforestation Regulation (EUDR) due diligence support

## What this domain is

Supply Chain Sovereignty is a governed intelligence domain for situations where an operator must prove, with traceable evidence to a regulatory authority, that a commodity met a specific legal standard at every point in its supply chain.

It is not agricultural science. It is not water science. It is not food safety. It shares the same governed intelligence platform as those domains — the same manifest, roster, receipt chain, admission gate, and non-promotion discipline — but its evidence taxonomy, its scientific questions, its authority chain, and its failure modes are entirely distinct.

## What this domain is not

- It is not a compliance certification tool. AAB does not certify compliance. It governs the evidence that supports a human compliance officer's legal declaration.
- It is not an agricultural intelligence domain. The commodities involved — rubber, palm oil, coffee, timber — are agricultural products, but the domain questions are trade and regulatory, not scientific.
- It does not share evidence with the Agricultural Science domain. Evidence admitted in SCS is not available to AGR capabilities, and vice versa.
- It does not make legal determinations. Every due diligence statement remains the legal responsibility of the named human operator.

## Why it is separate from Agricultural Science

Agricultural science asks: "What does the evidence say about how this crop performs under these conditions?"

Supply Chain Sovereignty asks: "Can this operator prove, with traceable evidence, that this commodity did not originate from land that was deforested after a specific date, and that it was produced in compliance with applicable laws?"

These are different questions, different evidence types, different authority chains, different failure modes, and different stakeholders. A compliance officer signing an EUDR due diligence statement is not the same person as a scientist reviewing agronomic trial data. Their evidence must never be conflated.

## The governing principle

One domain, one governed evidence record, one authority chain.

Evidence admitted for Supply Chain Sovereignty purposes is governed by SCS admission standards. It is permanently attributed to its source, its provenance is traceable, its integrity is verifiable, and its admission decision is recorded. A gap in the evidence is never papered over — it is disclosed honestly in every package and every evaluation.

## First instance: EU Deforestation Regulation (EUDR)

The EUDR requires operators placing specific commodities on the EU market to submit due diligence statements proving:

1. The commodity did not originate from land subject to deforestation or forest degradation after December 31 2020
2. The commodity was produced in compliance with applicable legislation in the country of production

Relevant commodities for AAB's target markets:
- **Thailand:** rubber, palm oil and derivatives
- **Vietnam:** coffee, rubber, timber

The EUDR is the first regulatory framework registered in this domain. Future frameworks — carbon border adjustment mechanisms, conflict minerals regulation, modern slavery supply chain laws, food safety traceability requirements — will be registered as additional instances of the same domain pattern.

## Primary user

The primary user of the Supply Chain Sovereignty domain is a compliance officer, trade documentation specialist, or legal/regulatory affairs manager — not a scientist or agronomist. The capability design serves this user's needs: a defensible, traceable evidence package they can present to a regulatory authority, with honest disclosure of what is admitted, what its provenance is, and what gaps remain.

## Regulatory update principle

The canonical evidence and governance standards travel with AAB. The regulatory configuration — which regulation, which version, which commodity list, which evidence standards — is country and regulation specific and must be updatable without changing the platform. When EUDR is amended, the regulatory framework is updated. Previously admitted evidence is not automatically invalidated — it is flagged for human review against the new requirements.

## The challenge response principle

Due diligence statements can be challenged by customs authorities, NGOs, or competitor operators. AAB must be able to retrieve the exact evidence package that was admitted at the time of the statement, prove its provenance chain is intact, and demonstrate that the admission process was followed correctly. This capability must be designed from the start, not added later.

## Capability roadmap

### Launch — first three capabilities

These three capabilities are sufficient to begin a genuine institutional conversation about EUDR compliance support. They are being formally designed as the first phase.

| Capability | Name | Status |
|---|---|---|
| SCS-CAP-01 | Regulatory Framework Registration | DESIGNED; PILOT IMPLEMENTATION BEHAVIOURALLY PROVEN (as of 2026-09-27) |
| SCS-CAP-03 | Plot and Land Unit Registration | DESIGNED; PILOT IMPLEMENTATION BEHAVIOURALLY PROVEN (as of 2026-09-27) |
| SCS-CAP-04 | Deforestation Evidence Admission | DESIGNED; PILOT IMPLEMENTATION BEHAVIOURALLY PROVEN (as of 2026-09-27) |

### Admitted but not yet implemented

None. No SCS capability is admitted. As of 2026-09-27, eight have pilot implementations on `main`: see the SCS capability roster (`SCS-CAPABILITY-IDENTITY-ROSTER-2026-09-22.md`) and `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`.

### Full roadmap — proposed, not admitted

All twelve capabilities are recorded here so they are not lost. None are admitted. None have CAP numbers that are canonical. They require formal admission through the ten-point checklist before any number becomes canonical.

| Proposed ID | Proposed Name | Proposed Purpose | Status |
|---|---|---|---|
| SCS-CAP-01 | Regulatory Framework Registration | Register which regulation, version, commodity, destination market and applicable laws govern a specific due diligence context | PROPOSED_NOT_ADMITTED |
| SCS-CAP-02 | Operator and Supplier Identity Registration | Register legal entities, their roles in the supply chain, their country of operation, and their authority to provide specific types of evidence | PROPOSED_NOT_ADMITTED |
| SCS-CAP-03 | Plot and Land Unit Registration | Register geographic plots with GPS polygon, land registry reference, ownership record, and commodity type — every commodity must be traceable to a registered plot | PROPOSED_NOT_ADMITTED |
| SCS-CAP-04 | Deforestation Evidence Admission | Governed ingestion of deforestation evidence — satellite imagery, remote sensing analysis, forestry authority certificates, Copernicus data products — with domain-specific admission criteria | PROPOSED_NOT_ADMITTED |
| SCS-CAP-05 | Supply Chain Custody Evidence Admission | Governed ingestion of custody chain evidence — purchase records, transport documents, processing facility certifications, chain of custody certificates | PROPOSED_NOT_ADMITTED |
| SCS-CAP-06 | Due Diligence Sufficiency Evaluation | Given admitted evidence for a specific operator, commodity and regulatory framework — produce an honest evidence landscape identifying what is sufficient and what gaps remain. A landscape, not a verdict. | PROPOSED_NOT_ADMITTED |
| SCS-CAP-07 | Evidence Source Discovery | For a specific country, commodity and gap type — surface authoritative sources that could provide missing evidence (satellite providers, land registries, certification bodies, forestry agencies) | PROPOSED_NOT_ADMITTED |
| SCS-CAP-08 | Due Diligence Package Compilation | Governed assembly of a complete due diligence package — all admitted evidence, all provenance chains, all gap disclosures, all authority records — in a format presentable to a regulatory authority | PROPOSED_NOT_ADMITTED |
| SCS-CAP-09 | Regulatory Review and Promotion | A qualified compliance officer reviews the sufficiency evaluation and decides whether to proceed to a due diligence statement. Human gate — no statement can be compiled without this decision. | PROPOSED_NOT_ADMITTED |
| SCS-CAP-10 | Challenge Response and Evidence Retrieval | When a due diligence statement is challenged, retrieve the exact evidence package admitted at the time of the statement and prove the provenance chain is intact | PROPOSED_NOT_ADMITTED |
| SCS-CAP-11 | Regulatory Framework Update Management | When a regulation is amended or a new regulation is added, identify which existing evidence packages are affected and surface what needs human review | PROPOSED_NOT_ADMITTED |
| SCS-CAP-12 | Cross-Boundary Evidence Reference | For supply chains spanning multiple country environments, manage governed references to evidence admitted in another country's environment — not copying evidence, creating a governed reference with its own provenance record | PROPOSED_NOT_ADMITTED |

### Capabilities that could exist but should not yet

The following are intentionally excluded from the roadmap at this stage:

- **Automated satellite imagery analysis** — too much autonomy, insufficient human review in the current architecture
- **Predictive compliance risk scoring** — risks being treated as authoritative when it must not be
- **Direct regulatory submission integration** (TRACES NT API) — a provider adapter decision, not a canonical capability; appropriate once the domain is more mature

## Global deployment — this is not a regional tool

The Supply Chain Sovereignty domain is designed for global deployment from the start. The land tenure, documentation, and regulatory readiness problems that make EUDR compliance difficult in Thailand and Vietnam are structural problems shared by commodity-producing countries worldwide. The platform architecture must reflect this from the beginning — country-specific configuration layered on top of country-neutral canonical contracts, not a regional solution retrofitted for other markets.

### The global EUDR exposure landscape

Every region below faces the same underlying structure: smallholder producers who are the actual source of the commodity but have informal or incomplete land documentation; aggregators or processors who buy from multiple smallholders and hold the EU market relationships; operators who bear the legal due diligence responsibility; and a gap between what the regulation requires (plot-level traceability) and what currently exists.

**Southeast Asia — immediate target markets:**
- **Thailand** — rubber, palm oil. Significant smallholder sector, GPS coordinates often unregistered formally. Entry market.
- **Vietnam** — coffee, rubber, timber. Similar land tenure complexity. Entry market.
- **Indonesia** — world's largest palm oil and rubber producer. Estimated 40% of palm oil from smallholders without formal land titles. Largest single-country opportunity after entry markets.
- **Malaysia** — second largest palm oil producer. Similar smallholder profile to Indonesia.
- **Myanmar, Cambodia, Laos** — emerging coffee and rubber producers. Lower institutional capacity, higher complexity.
- **Philippines** — coconut and coffee. Smallholder-dominated.

**West and Central Africa — highest urgency after Southeast Asia:**
- **Côte d'Ivoire and Ghana** — together produce approximately 60% of world cocoa. Estimated 600,000 cocoa farming households in Côte d'Ivoire alone, majority without formal land titles. EUDR readiness is poor. EU chocolate companies are under acute pressure to resolve this.
- **Cameroon, DRC, Gabon** — significant timber and palm oil sectors. More complex traditional land rights systems.

**South America:**
- **Brazil** — largest single-country EUDR exposure by volume. World's largest soy, beef and coffee producer. Complex mix of large industrial operations and smallholder farms particularly in the Amazon region.
- **Colombia, Peru, Bolivia** — significant coffee production. Smallholder-dominated supply chains.
- **Ecuador** — major cocoa producer.

**South and Central Asia:**
- **India** — significant rubber (Kerala) and coffee (Karnataka, Tamil Nadu) production. Smallholder-dominated. Complex land records.
- **Sri Lanka** — rubber and timber.

### Priority sequencing

1. Thailand and Vietnam — entry markets. Existing relationships and institutional context.
2. Indonesia — largest single opportunity after entry markets. Shares enough regional context that platform extensions are manageable.
3. Ghana and Côte d'Ivoire — highest developmental impact. Requires different institutional partnerships but enormous commercial pressure from EU buyers creates urgency.
4. Brazil — largest volume exposure globally. More institutional capacity than Africa or Southeast Asia.
5. Colombia — coffee, strong EU market relationship, manageable institutional complexity.
6. Malaysia — palm oil, similar profile to Indonesia.

### What this means for the platform architecture

**Country configuration must include, for each deployed country:**
- Which land registry systems are authoritative
- Which GPS polygon formats are standard
- Which traditional land tenure systems are legally recognised
- Which national forestry authority datasets are accepted as deforestation evidence
- Which certification bodies operate in this country (RSPO for palm oil, Rainforest Alliance for coffee, FSC for timber)
- Which government agencies issue the relevant documentation
- What the national implementation of EUDR looks like — each country is developing its own compliance frameworks

**The aggregator role must be explicitly modelled:**

A pattern common across all target markets: an aggregator — a cooperative, trading company, or processing facility — collects commodity from hundreds or thousands of smallholders and presents a consolidated due diligence package to the EU market operator. Each smallholder's plot requires individual registration and deforestation evidence. The aggregator manages the data collection workflow across their entire supplier base.

This pattern affects SCS-CAP-02 (Operator and Supplier Identity Registration) and SCS-CAP-03 (Plot and Land Unit Registration), both of which must support bulk registration workflows for aggregators managing large supplier bases. This is noted here so the capability designs reflect it correctly, even though bulk aggregator workflows are not in the initial three-capability launch scope.

### What participating countries gain

An institution that participates as an early adopter of the Supply Chain Sovereignty domain is not adopting a regional compliance tool. They are establishing themselves as an early node in a global governed evidence network. Their plot registrations, their deforestation evidence, and their due diligence packages are governed to the same standard as every other country on the platform. When a Thai rubber exporter and a Ghanaian cocoa cooperative both use AAB-backed due diligence packages, an EU customs authority is dealing with the same governed evidence standard in both cases — which is precisely what the regulation is trying to achieve.

Early adopters shape the platform. The countries that participate first have the most influence over how the canonical contracts, the evidence requirement specifications, and the regulatory framework configurations are designed. That influence diminishes as the platform matures and more countries join.

## What this document does not establish

- It does not admit any SCS capability
- It does not assign any SCS capability number as canonical
- It does not implement, deploy or migrate anything
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority
- It does not establish that any capability described here will be built on any particular timeline
- It does not constitute a commitment to a Thai or Vietnamese institution — it is design evidence, not a product specification

## Relationship to the Agricultural Science domain

The Agricultural Science domain (AGR, currently using the CAP-XX prefix established in PR #16) and the Supply Chain Sovereignty domain share the same governed platform but are entirely separate in evidence, authority, and purpose. Neither domain's evidence is accessible to the other's capabilities. The platform governance layer — manifest, roster, receipt chain — applies to both equally.
