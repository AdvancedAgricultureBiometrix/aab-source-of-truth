# SCS Capability Identity Roster — 2026-09-22

**Status:** GOVERNANCE RECORD — NOT A SIMULATION FILE — NOT AN ADMISSION AUTHORITY
**Domain:** Supply Chain Sovereignty (SCS)
**Authority:** RECORDS PROPOSED CAPABILITY IDENTITIES ONLY. This document does not admit any capability. It does not grant implementation authority. It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production authority. It is not connected to the CAP-34 simulation manifest or digest infrastructure.

## Purpose

This roster records the canonical identity, responsibility, explicit exclusions, admission status, representation maturity, and dependencies of each proposed SCS capability. It exists so that no capability enters the platform landscape silently, and so that the distinction between what has been designed, what has been partially defined, and what exists only as a proposed concept is permanently and honestly recorded.

## Relationship to the AGR capability roster

The AGR domain uses a machine-readable frozen JSON roster (`simulation/cap34/capability-identity-roster.json`) as the completeness authority for the CAP-34 simulation's manifest validator. SCS capabilities are not part of that infrastructure and must not be added to that file. This document is the SCS domain's equivalent — a governance record, not a simulation file.

## Representation maturity tiers

| Tier | Meaning |
|---|---|
| `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` | A full canonical contract exists with interfaces, failure contract, and boundary statements. No implementation exists. No behaviour has been proven. |
| `PARTIAL_INTERFACE_DESIGN_ONLY` | Partial interfaces have been defined within other capability contracts. No standalone canonical contract exists. No implementation exists. |
| `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | The capability is documented in the domain definition as a proposed identity. No interfaces have been designed. No implementation exists. |

## Institutional position as of 2026-09-22

Three provider-neutral SCS capability contracts have been designed and recorded. They define the regulatory standard, plot and tenure representation, and deforestation-evidence admission boundaries. They have not yet been implemented or behaviourally proven. Nine additional capabilities remain proposed. None of the twelve currently makes compliance decisions, produces due diligence statements, or possesses regulatory authority.

## Domain-level exclusions applying to all twelve capabilities

- No SCS capability makes legal compliance determinations
- No SCS capability produces or submits due diligence statements
- No SCS capability assumes the operator's legal responsibility under EUDR or any other regulation
- No SCS capability shares evidence with the AGR domain — the two domains are entirely separate
- No SCS capability is implemented or behaviourally proven

---

## SCS-CAP-01 — Regulatory Framework Registration

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | YES — first of three launch capabilities |
| Contract | `governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md` |
| Dependencies | None — foundation all others depend on |

**Responsibility:** Register a specific regulatory framework — identifying which regulation, which version, which commodity, which country of origin, and which destination market apply — and generate the precise evidence requirement specification that governs what must be admitted before a due diligence evaluation can proceed.

**Explicit exclusions:**
- Does not evaluate evidence
- Does not make compliance determinations
- Does not admit any commodity as compliant
- Does not hardcode regulatory reference dates — these live in the versioned framework specification and are updatable without changing the capability

**Lifecycle note:** Frameworks are registered once and versioned immutably. Previously admitted evidence is never silently re-evaluated against a newer version without a deliberate human decision.

---

## SCS-CAP-02 — Operator and Supplier Identity Registration

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second phase |
| Contract | None |
| Dependencies | SCS-CAP-01 |

**Responsibility:** Register legal entities, their roles in the supply chain, their country of operation, and their authority to provide specific types of evidence. Must explicitly model the aggregator role — a cooperative, trading company, or processing facility that manages evidence collection across hundreds or thousands of smallholder suppliers.

**Explicit exclusions:**
- Does not verify legal identity
- Does not grant compliance authority
- Does not decide between competing claims of operator status

---

## SCS-CAP-03 — Plot and Land Unit Registration

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | YES — second of three launch capabilities |
| Contract | `governance/workstream-b/SCS-CAP-03-PLOT-AND-LAND-UNIT-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md` |
| Dependencies | SCS-CAP-01 |

**Responsibility:** Register a geographic plot as a real-world entity, with boundary evidence, tenure claims, and framework associations recorded as separate records with separate lifecycles. A plot registered with GPS coordinates but no formal land registry reference is admitted with `registryVerificationStatus: UNVERIFIED` — not rejected. Sufficiency evaluation determines the consequence of that gap, not registration.

**Governing principle:** A plot is a place. A tenure record describes someone's evidenced relationship to that place. A framework association describes why that place is being assessed. A sufficiency decision describes whether the evidence meets that particular framework's needs. None of these should be silently treated as the other.

**Explicit exclusions:**
- Does not verify legal title or tenure
- Does not confirm regulatory sufficiency
- Does not decide between competing tenure claims — records them honestly
- `registrationStatus: REGISTERED` means only that SCS has created a governed record — it does not mean legal title verified, tenure accepted, boundary undisputed, framework compliant, or commodity eligible

---

## SCS-CAP-04 — Deforestation Evidence Admission

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | YES — third of three launch capabilities |
| Contract | `governance/workstream-b/SCS-CAP-04-DEFORESTATION-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-22.md` |
| Dependencies | SCS-CAP-01, SCS-CAP-03 |

**Responsibility:** Admit genuine, attributable, and usable deforestation evidence and record precisely what each item observed, analysed, and attested — including every temporal gap, spatial limitation, and claim boundary — across four temporal layers that are never silently treated as equivalent: (1) acquisition — when the sensor actually observed the plot; (2) analysis — what period the analysis evaluated; (3) attestation — what period an authority accepts responsibility for; (4) framework-required period — what the framework requires.

**Governing sentence:** CAP-04 records exactly what the evidence observed, analysed and attested. CAP-06 decides whether the complete evidence set is sufficient for the applicable framework and period.

**Claim vocabulary:** Evidence claims use `NO_DEFORESTATION_DETECTED` not `NO_DEFORESTATION_OCCURRED`. The first describes an analytical result subject to sensor, method, cloud and detection limitations. The second is a stronger real-world conclusion that the evidence alone cannot support.

**Explicit exclusions:**
- Does not determine whether admitted evidence is sufficient for any framework
- Does not make compliance determinations
- Does not strengthen a source's claim beyond what the source declared
- Does not hardcode the EUDR 31 December 2020 reference date — this lives in the versioned `ScsEvidenceRequirementSpec` registered through SCS-CAP-01
- Incomplete temporal coverage does not by itself cause rejection — admitted as `ADMITTED_WITH_LIMITATIONS` with explicit gap disclosure

---

## SCS-CAP-05 — Supply Chain Custody Evidence Admission

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second phase |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-03 |

**Responsibility:** Govern the ingestion of custody chain evidence — purchase records, transport documents, processing facility certifications, chain of custody certificates. Distinct from deforestation evidence: proves the commodity's journey from plot to market, not what happened to the land it came from. Requires its own admission criteria and its own evidence taxonomy.

**Explicit exclusions:**
- Does not make compliance determinations
- Does not produce due diligence statements

---

## SCS-CAP-06 — Due Diligence Sufficiency Evaluation

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second design phase complete |
| Contract | `governance/workstream-b/SCS-CAP-06-DUE-DILIGENCE-SUFFICIENCY-EVALUATION-CANONICAL-CONTRACT-2026-09-22.md` |
| Dependencies | SCS-CAP-01, SCS-CAP-03, SCS-CAP-04 |

**Responsibility:** Given admitted evidence for a specific operator, commodity, and regulatory framework — produce an honest evidence landscape identifying what is sufficient and what gaps remain. Evaluate collective temporal and spatial coverage. Identify conflicting evidence. Require human decision for material gaps. This is a sufficiency evaluation, not a compliance finding.

**Critical prohibition:** CAP-06 must not ask merely "is this plot sufficient?" It must ask "is the evidence for this plot sufficient for this commodity, under this framework version, for this declared purpose and relevant period?"

**Sufficiency is not simple date-union logic:** Two evidence items whose declared periods join together do not necessarily establish adequate coverage. CAP-06 must consider sensor resolution, cloud interference, acquisition frequency, method sensitivity, baseline quality, detection capability, and framework-specific evidentiary standards.

**Explicit exclusions:**
- Does not produce due diligence statements
- Does not make legal compliance determinations
- Does not automatically approve evidence — `noAutomaticComplianceDecision: true` on every result

---

## SCS-CAP-07 — Evidence Source Discovery

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second phase |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-06 |

**Responsibility:** For a specific country, commodity, and gap type — surface authoritative sources that could provide missing evidence. Thailand's GISTDA for satellite data. Department of Lands for registry records. RSPO for palm oil certification. Rainforest Alliance for coffee. FSC for timber. National forestry agencies per country. This capability maps the source landscape so an operator knows exactly where to go to close a specific identified gap.

**Explicit exclusions:**
- Does not fill gaps itself
- Does not admit evidence — evidence obtained from discovered sources must pass through SCS-CAP-04 or SCS-CAP-05

---

## SCS-CAP-08 — Due Diligence Package Compilation

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `PARTIAL_INTERFACE_DESIGN_ONLY` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — to be designed after SCS-CAP-09 |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-03, SCS-CAP-04, SCS-CAP-05, SCS-CAP-06, SCS-CAP-09 |

**Responsibility:** Govern the assembly of a complete due diligence package — all admitted evidence, all provenance chains, all gap disclosures, all authority records — in a format presentable to a regulatory authority. The package explicitly states what was admitted, what its provenance is, what gaps remain, and what the compliance officer is declaring.

**Sequencing note:** SCS-CAP-08 must be designed after SCS-CAP-09. Package compilation must consume governed review states produced by the regulatory review and promotion gate. If designed before CAP-09, compilation risks becoming an accidental approval mechanism.

**Explicit exclusions:**
- Does not submit due diligence statements to any regulatory authority
- Does not sign on behalf of the operator
- Does not assume the operator's legal responsibility — under EUDR, responsibility remains with the operator making the due diligence statement
- Does not produce a package that asserts compliance — produces a package that honestly records what is known, what its provenance is, and what gaps remain

---

## SCS-CAP-09 — Regulatory Review and Promotion

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `PARTIAL_INTERFACE_DESIGN_ONLY` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — to be designed after SCS-CAP-06 |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-03, SCS-CAP-04, SCS-CAP-06 |

**Responsibility:** The human gate before any due diligence package can be compiled. A qualified compliance officer with appropriate authority reviews the sufficiency evaluation and decides whether to proceed to a due diligence statement. They can approve, refuse, require more evidence, or flag a material gap. Their decision is recorded, linked to the specific evidence records it was based on, and retained permanently. No due diligence package can be compiled without this decision having been made and recorded.

**Explicit exclusions:**
- Does not make the legal compliance determination — that remains with the named human operator
- Does not produce due diligence statements
- Does not grant regulatory authority to the platform

---

## SCS-CAP-10 — Challenge Response and Evidence Retrieval

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second phase |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-03, SCS-CAP-04, SCS-CAP-05, SCS-CAP-08, SCS-CAP-09 |

**Responsibility:** When a due diligence statement is challenged by a customs authority, NGO, or competitor operator — retrieve the exact evidence package that was admitted at the time of the statement, prove the provenance chain is intact, and demonstrate that the admission process was followed correctly. This is the capability that makes AAB genuinely defensible. An institution can respond to any challenge with a complete, traceable, governed record of exactly what was done and when.

**Explicit exclusions:**
- Does not respond to challenges on the operator's behalf
- Does not make legal arguments
- Does not alter historical evidence records

---

## SCS-CAP-11 — Regulatory Framework Update Management

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — second phase |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-06 |

**Responsibility:** When EUDR is amended, or when a new regulation is added to the domain — manage the transition. Identify which existing evidence packages are affected by the change. Surface what needs human review. Identify which remain valid under the new framework. Does not automatically invalidate previously admitted evidence — surfaces it for deliberate human review against the new requirements.

**Explicit exclusions:**
- Does not automatically invalidate previously admitted evidence
- Does not make the determination that existing evidence is insufficient under a new framework — surfaces it for human review

---

## SCS-CAP-12 — Cross-Boundary Evidence Reference

| Field | Value |
|---|---|
| Admission status | `PROPOSED_NOT_ADMITTED` |
| Representation maturity | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` |
| Implementation | NOT AUTHORISED — NOT STARTED |
| Launch candidate | NO — last to be designed, highest complexity |
| Contract | None |
| Dependencies | SCS-CAP-01, SCS-CAP-03, SCS-CAP-04, SCS-CAP-05, SCS-CAP-08, SCS-CAP-09 — plus stable country-isolation architecture confirmed in production |

**Responsibility:** For supply chains that span multiple country environments — a Thai supplier providing evidence to a Vietnamese processor — manage controlled, governed references to evidence admitted in another country's environment. Does not copy evidence across boundaries. Creates a governed reference with its own provenance record, subject to the receiving country's admission standards.

**Explicit exclusions:**
- Does not copy evidence across country boundaries
- Does not bypass the receiving country's admission standards
- Does not create a shared evidence pool accessible to multiple countries
- This is the most complex capability in the domain and is explicitly the last to be designed — it depends on the country-isolation architecture being stable and proven first

---

## Summary table

| Capability | Name | Admission | Maturity | Launch |
|---|---|---|---|---|
| SCS-CAP-01 | Regulatory Framework Registration | `PROPOSED_NOT_ADMITTED` | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` | YES |
| SCS-CAP-02 | Operator and Supplier Identity Registration | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
| SCS-CAP-03 | Plot and Land Unit Registration | `PROPOSED_NOT_ADMITTED` | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` | YES |
| SCS-CAP-04 | Deforestation Evidence Admission | `PROPOSED_NOT_ADMITTED` | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` | YES |
| SCS-CAP-05 | Supply Chain Custody Evidence Admission | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
| SCS-CAP-06 | Due Diligence Sufficiency Evaluation | `PROPOSED_NOT_ADMITTED` | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` | NO |
| SCS-CAP-07 | Evidence Source Discovery | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
| SCS-CAP-08 | Due Diligence Package Compilation | `PROPOSED_NOT_ADMITTED` | `PARTIAL_INTERFACE_DESIGN_ONLY` | NO |
| SCS-CAP-09 | Regulatory Review and Promotion | `PROPOSED_NOT_ADMITTED` | `PARTIAL_INTERFACE_DESIGN_ONLY` | NO |
| SCS-CAP-10 | Challenge Response and Evidence Retrieval | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
| SCS-CAP-11 | Regulatory Framework Update Management | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
| SCS-CAP-12 | Cross-Boundary Evidence Reference | `PROPOSED_NOT_ADMITTED` | `CONCEPT_PREVIEW_NOT_IMPLEMENTED` | NO |
