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
| SCS-CAP-01 | Regulatory Framework Registration | DESIGN IN PROGRESS |
| SCS-CAP-03 | Plot and Land Unit Registration | DESIGN IN PROGRESS |
| SCS-CAP-04 | Deforestation Evidence Admission | DESIGN IN PROGRESS |

### Admitted but not yet implemented

None. No SCS capability is currently admitted or implemented.

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

## What this document does not establish

- It does not admit any SCS capability
- It does not assign any SCS capability number as canonical
- It does not implement, deploy or migrate anything
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority
- It does not establish that any capability described here will be built on any particular timeline
- It does not constitute a commitment to a Thai or Vietnamese institution — it is design evidence, not a product specification

## Relationship to the Agricultural Science domain

The Agricultural Science domain (AGR, currently using the CAP-XX prefix established in PR #16) and the Supply Chain Sovereignty domain share the same governed platform but are entirely separate in evidence, authority, and purpose. Neither domain's evidence is accessible to the other's capabilities. The platform governance layer — manifest, roster, receipt chain — applies to both equally.
