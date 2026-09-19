# CAP-34 Capability Pathway Reconciliation — 2026-09-20

**Status:** CONTROLLED ADDENDUM TO THE FROZEN WORKSTREAM-B LANDSCAPE  
**Authority:** BUILD-PLANNING AND SIMULATOR-DISCLOSURE ONLY  
**Canonical baseline:** `AAB-WORKSTREAM-B-CAPABILITY-LANDSCAPE-LAUNCH-GAP-FREEZE-2026-09-19.md`  
**Commissioning authority:** NONE

> This addendum does not rewrite the frozen capability identities or horizons. It records two newly articulated pathways inside existing canonical capabilities. It does not establish implementation, scientific validity, regulatory compliance, production readiness, Gate D satisfaction, commissioning, or WP05 commencement.

## Reconciliation decision

Neither discovery creates a new capability identity. Each is a cross-capability pathway whose constituent responsibilities already belong to the authoritative roster.

| Pathway | Canonical capabilities | Current evidence | Build state |
| --- | --- | --- | --- |
| Historical Scientific Memory Recovery | CAP-02 — Governed Scientific Data Acquisition & Interoperability; CAP-04 — Governed Scientific Memory | Database foundations exist for governed sources, source objects, provenance, evidence packets, scientific-memory entries, memory evidence links and retained negative learning. No complete, behaviourally proven multi-institution historical recovery workflow was found. | DESIGNED — BUILD REQUIRED; EVIDENCE REQUIRED |
| Governed Export-Compliance Evidence | CAP-03 — Evidence Integrity & Provenance; CAP-11 — Regulatory Translation & Dossier Support | Database foundations exist for provenance assertions, evidence packets, regulatory sources/requirements, dossier passports, evidence links and dossier translation. No EUDR-specific, destination-market export-evidence or smallholder chain-of-custody implementation was found. | DESIGNED — BUILD REQUIRED; EVIDENCE REQUIRED |

## Pathway 1 — Historical Scientific Memory Recovery

### Purpose

Recover decades of fragmented institutional agricultural research into connected, governed scientific memory without requiring participating institutions to abandon their existing systems.

### Required build outcomes

- register each participating source system and preserve original institutional ownership;
- ingest records through governed, reversible and provenance-preserving adapters;
- retain document, dataset, method, author, institution, date, version and original-reference context;
- preserve failed, null, contradictory and negative results rather than filtering them out;
- distinguish scanned/extracted content, human-confirmed facts, interpretations and unresolved uncertainty;
- detect likely duplicates without silently merging distinct records;
- connect related findings across institutions while maintaining country and institution authority boundaries;
- support human review, correction, quarantine, supersession and audit;
- allow each institution to continue using its existing system;
- prohibit imported historical material from automatically becoming approved learning or scientific fact.

### Proof required before fidelity promotion

A controlled multi-source fixture must demonstrate ingestion, provenance preservation, duplicate handling, negative-result retention, contradiction preservation, human review, source trace-back and clean rollback. Schema presence alone is insufficient.

## Pathway 2 — Governed Export-Compliance Evidence

### Purpose

Assemble provenance-backed evidence packages for a named shipment, commodity and destination market, mapped to the applicable regulatory requirements—including EUDR where applicable—without implying approval or guaranteed market access.

### Required build outcomes

- preserve farm, plot, producer, aggregator, lot, transformation, custody and shipment provenance at smallholder scale;
- bind each evidence item to its source, time, geography, method, version and responsible authority;
- map evidence to a versioned destination-market requirement set and effective date;
- surface missing, contradictory, expired, unverifiable and jurisdiction-inapplicable evidence;
- preserve aggregation and transformation lineage rather than presenting only the final exporter record;
- generate a governed dossier/evidence package and explicit completeness assessment;
- require authorised human review before release or external reliance;
- record regulatory-source changes and reassessment requirements;
- keep dossier completeness separate from regulatory approval, certification, customs acceptance or market access;
- prevent simulator evidence or acknowledgements from becoming production compliance records.

### Proof required before fidelity promotion

A controlled synthetic smallholder-to-shipment fixture must demonstrate chain-of-custody continuity, source provenance, destination-rule versioning, missing-evidence refusal, contradiction handling, dossier assembly and the non-implication that dossier completeness equals approval. An EUDR label alone is not implementation evidence.

## Simulator classification

Both pathways may appear only in Roadmap Preview until qualifying implementation and behavioural evidence exist.

- **Mode:** `ROADMAP_PREVIEW`
- **Fidelity:** `CONCEPT_PREVIEW_NOT_IMPLEMENTED`
- **Required acknowledgement:** planned capability is not evidence of implementation or readiness
- **Permitted data:** synthetic/public/reference descriptions only
- **Production authority:** false

## Permanent boundaries

- No automatic state promotion across governed boundaries.
- Evidence belongs to the state that produced it.
- Dossier completeness does not establish regulatory approval.
- Imported material does not become approved scientific memory merely because it was ingested.
- Simulation state never becomes production state.
- No Workstream-A, production, country-environment, commissioning, Gate D or WP05 credit is created.
