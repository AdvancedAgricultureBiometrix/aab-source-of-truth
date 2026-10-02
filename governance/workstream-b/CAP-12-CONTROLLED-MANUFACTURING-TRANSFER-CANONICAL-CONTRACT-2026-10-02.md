# CAP-12 Controlled Manufacturing Transfer — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-12 Controlled Manufacturing Transfer. It is not SCS-CAP-12 (Cross-Boundary Evidence Reference), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-12: HOW A GOVERNED MANUFACTURING SPECIFICATION IS ASSEMBLED FROM A CAP-07 FORMULATION VERSION; HOW ITS DISCLOSURE TO A NAMED MANUFACTURER, FOR A NAMED STAGE, SITE AND PURPOSE, IS AUTHORISED, ACCEPTED AND RECORDED; WHAT EACH STAGE REQUIRES FIRST; HOW PILOT AND VALIDATION BATCHES ARE TRACED; HOW A TRANSFER IS HELD WHEN ITS BASIS LAPSES; AND ITS BOUNDARIES WITH CAP-04, CAP-07, CAP-08, CAP-09, CAP-10, CAP-11 AND THE PLANNED MANUFACTURING DOMAIN. Establishes no commissioning, production, Gate D, WP05, scientific-validity, quality-certification, intellectual-property, regulatory-approval or market-access authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-10-02, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-12 had no design contract before this one. Its horizon stays **post-launch** in the CAP-34 fidelity manifest.
**Amended:** 2026-10-02 (integrity, lineage and the AGR vocabulary, under CAP-03), with CAP-03's canonical contract; and 2026-10-02, second (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract.

## The governing principle

> **AAB may assemble a governed manufacturing specification and record a controlled transfer. It does not authorise sale, release a batch, certify quality, grant intellectual-property rights or substitute for a regulator or a manufacturer's qualified authority.**
>
> **A controlled transfer may proceed only when the exact specification, evidence basis, safety conditions, regulatory pathway, rights authority, recipient, site and permitted purpose are established. Missing or stale mandatory evidence returns EVIDENCE REQUIRED, and the transfer does not proceed.**

## Amendment of 2026-10-02: integrity, lineage and the AGR vocabulary, under CAP-03

**Why.** CAP-03 now has a contract (`governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`). It provides the integrity re-check and lineage AGR's evaluations lacked, and the AGR provenance vocabulary, which every AGR capability adopts before implementation (CAP-03, decision 16). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Integrity re-check and lineage.** A transfer evidence basis may request a CAP-03 verification run over its snapshot's members. The evidence-basis rules become `cap-12-evidence-basis-rules-2`: version 1, with this change. **Where a cited run covers every member, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`; otherwise the disclosure stays. **A lineage evaluation** may be requested for any of its specifications, evidence bases, authorisations, packages and batch attestations. **No finding is ever shown as "verified" in general,** and none says the evidence is true, sufficient or authentic in the world.

**2. The vocabulary.** CAP-12 adopts `cap-03-vocabulary-1`: its batches map to `MANUFACTURED_FROM` and `APPLIED_IN`, and its rights, QC and contract documents to `RIGHTS_OR_CONTRACT_DOCUMENT` and `MANUFACTURER_RECORD` (CAP-03, "Mappings from existing terms"). **No record is renamed.** A term of CAP-12's own, added later, is registered here and mapped to the vocabulary, or refused (`VOCABULARY_TERM_UNMAPPED`).

**3. How its outputs reference CAP-03.** Each of its specifications, evidence bases, authorisations, packages and batch attestations may carry `integrity?: { verificationRunIds: string[]; lineageEvaluationId?: string }`, set by the system when a run or evaluation is cited, and shown with the findings by kind and whether they are current.

**4. Failures stay visible.** CAP-03's findings are currency triggers for CAP-12's decisions (CAP-03, "Integrity findings and their consequences"). **Material evidence becoming `INTEGRITY_COMPROMISED` or `UNDETERMINED`** is treated as material evidence superseded: `EVIDENCE_REQUIRED`, and a `TRANSFER_HOLD` pending reassessment (CAP-12, "Holds"). **Historical decisions are never rewritten;** their current reliance changes, derived when read. **Missing or failed mandatory verification is always shown,** never hidden or treated as a pass.

**5. Before implementation.** CAP-12's step 4 (code) uses the vocabulary and CAP-03's verification as adopted here.

**6. What this amendment replaces.** The dependencies gain a row: **CAP-03 Evidence Integrity & Provenance: integrity re-check, lineage, the AGR vocabulary and integrity incidents; `designed`, launch release.**

## Amendment of 2026-10-02 (second): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-12, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-12 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-12 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap12ManufacturingSpecification` | Admitted record, versioned under change control | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (`TRANSFER_REQUESTER`) | `NEW_VERSION` (under an approved change request), `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:SPECIFICATION` |
| `Cap12RightsAuthority` | Admitted record | `SUBMITTER_AUTHORED`; its evidence is `RIGHTS_OR_CONTRACT_DOCUMENT`s in CAP-04 | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (`AUTHORISED_RIGHTS_CONTROLLER`) | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:RIGHTS_AUTHORITY` |
| `Cap12BatchAttestation` | Admitted record | `MANUFACTURER_RECORD` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (`MANUFACTURER_RECIPIENT`) | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:BATCH_ATTESTATION` |
| Safety-signal request, from a manufacturing report | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE` (CAP-12's registered signal-request service), `initiatedBy` the reporting `MANUFACTURER_RECIPIENT` | Never superseded | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:SAFETY_SIGNAL_REQUEST` |
| `TRANSFER_HOLD` placed by a rule | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE` | Never superseded; released by decision | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:TRANSFER_HOLD` |
| Transfer request, `CHANGE_REQUEST`, `RECIPIENT_UNDERTAKING`, `MANUFACTURER_ACCEPTANCE`, `MANUFACTURING_REPORT`, a hold placed by a person, notifications and acknowledgements, `TRANSFER_EGRESS`, ingress, `ASSESSOR_QUALIFICATION`, country transfer policy | Admitted records, written once (no interface yet) | `SUBMITTER_AUTHORED`; reports and acceptances, `MANUFACTURER_RECORD` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL`; policy `NEW_VERSION` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-12:RECORD` |
| Transfer package | Package (primitive 8) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Compiled on a `HUMAN`'s request | Never superseded | `packageDigest` | None |
| Transfer evidence basis | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-12:EVIDENCE_BASIS` |
| `RIGHTS_AUTHORITY_APPROVAL`, `EVIDENCE_BASIS_REVIEW`, `TRANSFER_AUTHORISATION`, `CHANGE_REQUEST_APPROVAL`, `TRANSFER_EGRESS_AUTHORISATION`, `HOLD_RELEASE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_TRANSFER_POLICY_APPROVAL`, `CAP12_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** The `integrity?` reference of the CAP-03 amendment, on specifications, batch attestations, packages, evidence bases and authorisations, is **derived when read.**

**3. Supersession.** **The platform's `supersedes` is added:** a specification's new version, under an approved change request, supersedes the previous one with reason `NEW_VERSION`; rights authorities and batch attestations are corrected or withdrawn with `CORRECTION` or `WITHDRAWAL`.

**4. Citations.** Every reference CAP-12 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-12 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Specification `formulation`, `formula.components[].ingredient` | Subject | `DERIVED_FROM` | `CAP-07:RECORD`, `CAP-06:RECORD` | Yes | Refusal `SPECIFICATION_MISMATCH` |
| Specification `conditionsCarriedOver` | Mandatory evidence | `RELIED_ON`; **now resolved,** with digests | `AAB-PLATFORM-08:HUMAN_DECISION` (CAP-10, CAP-11) | Yes | Refusal `EVIDENCE_REQUIRED` |
| Specification `equivalence.trialledSpecification` | Mandatory evidence | `REFERS_TO` | `CAP-12:SPECIFICATION` | Yes, when equivalence is claimed | Refusal `EVIDENCE_REQUIRED` |
| Rights `basis[].evidence[]` | Mandatory evidence | `SUPPORTS` | `CAP-04:MEMORY_RECORD` (`DOCUMENT`) | Yes | Refusal `EVIDENCE_NOT_ADMITTED`, at admission; a stage relying on a concern without evidence is still refused `EVIDENCE_REQUIRED` at authorisation |
| Batch `specification` | Subject | `MANUFACTURED_FROM`; **the digest is resolved by the system,** no longer declared | `CAP-12:SPECIFICATION` | Yes | Refusal `SPECIFICATION_MISMATCH` |
| Batch `transferAuthorisationId`, `trials[]` | Authority or membership | `RELIED_ON`; `APPLIED_IN`; trials **now with versions** | `AAB-PLATFORM-08:HUMAN_DECISION`; `CAP-08:TRIAL_REGISTRATION` | Yes | Refusal `EVIDENCE_REQUIRED` |
| Batch `materialLots[].ingredient` | Subject | `DERIVED_FROM` | `CAP-06:RECORD` | Yes | Refusal `EVIDENCE_REQUIRED` (an ingredient not in the specification) |
| Batch `qcDocument` | Mandatory evidence | `SUPPORTS` | `CAP-04:MEMORY_RECORD` (`DOCUMENT`) | Yes | Refusal `EVIDENCE_REQUIRED` |
| Batch `release.authorityEvidence[]` (added) | Optional evidence | `SUPPORTS` | `CAP-04:MEMORY_RECORD` (`DOCUMENT`) | No | Limitation `CITATION_UNRESOLVED` |
| Hold: triggering evidence | Authority or membership | `RELIED_ON`, set by the service | The CAP-10 or CAP-11 record whose event met the rule | Yes | Cannot be unresolved: set by the system |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Manufacturing specification, rights authority | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Batch attestation | N/A: its source is the manufacturer, named in the record | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Safety-signal request, hold placed by a rule | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Records without an interface | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Transfer evidence basis | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-12 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Specifications, rights authorities, batch attestations, requests, undertakings, acceptances and reports are submitted by a `HUMAN`,** except the safety-signal request below. **A hold placed at once on a CAP-10 or CAP-11 event** is service-submitted under AAB-PLATFORM-05, section C, and **records:** the rule's identifier and version; the triggering evidence; the service and its release; the time (`submittedAt`); the affected transfer; the reason; and **the human review required** (a `HOLD_RELEASE` by a `TRANSFER_GOVERNOR`). **"Every actor is `HUMAN`" now reads "Every actor is `HUMAN`, except a hold placed by a rule",** as in CAP-10. **CAP-12 never writes a CAP-10 record:** a manufacturing report with a possible safety implication has CAP-12's registered signal-request service write a CAP-12 **safety-signal request,** `initiatedBy` the reporter, and CAP-10's intake service creates the signal from it, citing it, as for CAP-08 (CAP-10's amendment of 2026-10-02, fourth).

**8. People in content.** **`release` names its releaser by exactly one of** `releasedByActor` (an `ActorReference`, where the manufacturer's release authority is a registered AAB actor) **or `releasedByDeclaredPerson`** (`{ name, qualification, organisation, authorityBasis }`, as declared). **The release record carries the batch attestation's provenance, and evidence of the releaser's authority** where it exists (`release.authorityEvidence[]`, section 4). **AAB records that external act; it does not itself release the batch.** `controller` is the `AUTHORISED_RIGHTS_CONTROLLER`, who acts in AAB, and stays an `ActorReference`; `onBehalfOf` stays declared data.

**9.** **`Cap12BatchAttestation` gains `recordVersion`** (always 1, corrected only by supersession).

**10.** **`qcResultsDigest` is typed:** the `objectDigest` of the QC document's original, **set by the system from the cited CAP-04 record,** never declared.

**11. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Note of 2026-10-02: clerical reconciliation

Later amendments and contracts made some current-facing text in this contract stale. The stale text includes open gaps, dependency rows, interim positions, current rules-version statements, answer tables and interface comments. It was found by the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`, finding RD-15) and by the review of the reconciliation plan.

Each such passage keeps its original wording, followed by a current reading labelled "Current reading (Note of 2026-10-02; <STATUS>)". The status is CLOSED, PARTIALLY CLOSED or SUPERSEDED, and the reading names the amendment or contract that gives it.

**This note changes no rule or meaning.** It is not an amendment, and no **Amended:** line changes. **Where a mark and the amendment or contract it names differ, the amendment or contract governs.** Nothing of this capability is built.

**Dependency rows added by amendment (Note of 2026-10-02):** the Dependencies table does not show two rows that amendments add: CAP-03 Evidence Integrity & Provenance ("Amendment of 2026-10-02: integrity, lineage and the AGR vocabulary, under CAP-03", point 6); AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests ("Amendment of 2026-10-02 (second): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10", point 11). Each row reads exactly as its amendment states it, and **the amendment controls.** This note creates and changes no table row.

## Why this contract, and what it adopts

**Why.** Three committed contracts defer manufacture to CAP-12:
- **CAP-07** (decision 9): no CAP-07 decision makes a formulation eligible for manufacturing transfer; "that is CAP-12's, on gates CAP-12 defines". CAP-07 recorded the rehearsal's transfer, reachable "with no trial, outcome, safety or regulatory gate".
- **CAP-09** (decision 11): promotion "does not authorise use, sale, manufacture".
- **CAP-11** recorded that CAP-12 "would rely on" CAP-11 before commercial manufacture, "recorded, not defined". **This contract defines it** (decision 10), with CAP-11's amendment.

**The domain register and cognitive architecture** lists **Manufacturing** as a planned domain, "the governed transfer of approved scientific developments into manufacturing specifications and processes", and leaves its relationship to CAP-12 open (section 22, question 4). **This contract answers it for CAP-12** (decision 21).

**Its description** (the overview, section 7.3): CAP-12 "supports controlled transfer of proven results into manufacture, when authorised". **The name is kept** (decision 1): a controlled transfer covers evaluation, pilot and commercial stages, and AAB authorises a transfer, never manufacture or sale.

The evidence is the step 0 snapshots, **with all of `manufacturing_core` read in full,** the gateway's two manufacturing actions, and the `country_core` and `agriculture` paths they reach ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-12 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a transfer's evidence basis is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** rights authority, evidence-basis review, transfer authorisation, governance approval, hold release, qualification review and challenge are human decisions, and a commercial authorisation needs more than one decider (section 7).
- **AAB-PLATFORM-02 (governed document rendition)** and **package compilation (primitive 8):** a transfer package is compiled and rendered by them.
- **CAP-04 as amended:** rights evidence, licences, agreements, specifications' supporting documents and the manufacturer's QC documents are admitted CAP-04 `DOCUMENT` records, read for the purpose `MANUFACTURING_TRANSFER`.
- **CAP-07, CAP-08, CAP-10 and CAP-11,** as amended on 2026-10-02 with this contract; **CAP-09,** whose decision 11 already holds.
- **The platform's observation and brain governance,** the brain boundary, **the domain register and cognitive architecture**, **the non-return boundary** and **the egress specification:** CAP-12 is bound by them, and cites them.

AAB-PLATFORM-01 is **not adopted directly:** CAP-12 stores no originals of its own. AAB-PLATFORM-04 is **not adopted:** nothing in CAP-12 is submitted on behalf of another party.

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review, with corrections recorded in the same review):
1. **Capability identifier `CAP-12`, named "Controlled Manufacturing Transfer",** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-12:`. Receipts are accepted already (migration 025).
2. **The governing principle above is binding** on every part of this contract.
3. **Three things, never blurred:** **disclosure of knowledge** (providing a specification), **manufacturing activity** (making material or product) and **physical transfer** (moving samples, ingredients or batches). Each has its own sovereignty, safety, biosecurity, contractual and regulatory requirements. **A digitally authorised specification transfer does not authorise** importing biological material, exporting samples, customs clearance, manufacturing, releasing a batch, or selling or distributing a product.
4. **Records:** a manufacturing specification, versioned and immutable; a transfer request; a rights-authority record; a transfer evidence basis; a transfer package; transfer authorisations; recipient undertakings and manufacturer acceptance; batch attestations; manufacturing reports; change requests; holds, notifications and acknowledgements; and egress and ingress records. **No score or readiness figure.**
5. **Four stages, each with its own gates** (the gate matrix, "Stages and their gates"): `TECH_TRANSFER_ONLY`, `MANUFACTURING_EVALUATION`, `PILOT_MANUFACTURE` and **`COMMERCIAL_MANUFACTURING_TRANSFER`**, named so that no record appears to say AAB authorised commercial manufacture itself. **`TECH_TRANSFER_ONLY` never authorises producing any material.** A higher stage needs its own authorisation, never an upgrade of an earlier one.
6. **Rights authority:** an **`AUTHORISED_RIGHTS_CONTROLLER`** approves each disclosure, with **recorded evidence of their authority for this specific disclosure and use.** CAP-07's ownership fields are declarations, never proof of title. **AAB records the authority basis; it does not adjudicate intellectual-property ownership.** The basis addresses, where they apply: ownership or authority to license; employment and institutional IP; joint development; third-party ingredients or methods; confidential information; patents and licences; traditional or Indigenous knowledge; genetic-resource access and benefit-sharing; and contractual restrictions.
7. **The evidence basis for commercial transfer** is a governed evaluation of **all relevant trial outcomes, not only favourable ones;** adverse events and safety signals; CAP-10's conditions; intended claims and their evidence; formulation and process equivalence; unresolved contradictions; replication status; evidence limitations; and the destination jurisdiction's requirements. **A qualified person decides whether it is sufficient for the stage.** An accepted trial record means a trial was properly recorded, never that the formulation worked, was safe, or justifies manufacture.
8. **Composition reaches the manufacturer only by a CAP-07 grant for the purpose `MANUFACTURING_TRANSFER`,** limited to named people and the version, time-limited, logged, revocable, never searchable, and with no right of onward disclosure. **Revocation prevents further access through AAB, but cannot technically retrieve information already disclosed,** and every package says so. The preferred architecture: controlled viewing, no bulk search, no default download, recipient watermarking, access logs, contractual confidentiality, minimum necessary disclosure, and **staged disclosure** rather than the whole formula at once.
9. **Holds follow the basis relied upon** ("Holds"): a safety-driven lapse holds at once; a regulator's suspension, revocation or expiry holds at once; loss of rights authority stops new disclosure and transfer; material evidence becoming stale or superseded gives `EVIDENCE_REQUIRED` and a hold pending reassessment; an administrative lapse unrelated to the basis discloses without holding. **An independent current basis may allow continuation only if it is explicitly identified and verified.** AAB stops what AAB enables, never pretends to stop a factory, and notifies, records acknowledgements and escalates.
10. **Commercial transfer needs a CAP-11 market-authorisation determination** (CAP-11's amendment): `REGULATOR_AUTHORISATION_RECORDED`, or `MARKET_AUTHORISATION_NOT_REQUIRED_WITHIN_BOUNDARY` with every element named. **`REGULATOR_CONFIRMATION_REQUIRED` and `EVIDENCE_REQUIRED` block it.** Uncertainty never becomes an inferred exemption.
11. **Two independent AAB approvers** authorise a commercial transfer. **The manufacturer separately accepts** the exact specification, conditions, confidentiality, permitted use, site, named recipients, reporting obligations, change-control requirements and the prohibition on onward disclosure. **Manufacturer acceptance is the receiving party's accountable act, never one of AAB's approvals.**
12. **Five acts, five accountable parties:** source rights-authority approval; independent transfer review; country governance approval for sensitive or cross-border transfer; manufacturer technical acceptance; and manufacturer QC release. **People affiliated with the manufacturer may contribute technical input; they never authorise the source country's disclosure.**
13. **A specification is exact and versioned.** Any change to formula, process, tolerances, site or manufacturer is a new version, under change control, needing a new authorisation.
14. **Batch attestations, not batch management.** CAP-12 records, for pilot and validation batches: the specification version, manufacturer and site, batch identifier, manufacture date, material and ingredient lots, process-version reference, QC-result digest, deviation references, **the manufacturer's qualified release or rejection decision,** and the trial or transfer it serves. **Complete commercial batch records, release workflows, quality management, equipment, CAPA, recalls and scheduling stay with the manufacturer's qualified system, and the future Manufacturing domain.**
15. **Cross-border manufacture is several separately governed transfers:** specification egress, personal-data disclosure, export of samples, import into the destination country, genetic-resource or biological-material transfer, biosecurity and quarantine, technology licensing, regulator submissions, and the return of results. **None is inferred from one approval.** Protected country information has no automatic return or onward path; **anything returning needs its own governed ingress and provenance.**
16. **Manufacturing reports with a possible safety implication enter CAP-10** as safety signals, distinguishing an unverified manufacturing report, a safety signal, a precautionary hold and a substantiated safety finding (CAP-10's amendment). **A deviation never becomes a confirmed safety conclusion automatically,** but may restrict further activity pending a person's assessment.
17. **Pilot batches are trial material, traceable** to their specification version (CAP-08's amendment).
18. **Machines may** compile packages, check gates, flag expiries, compare specification versions and assemble the evidence basis. **Machines may never** authorise a transfer, judge evidence sufficient, adjudicate rights, release a batch, judge quality, or declare anything fit for sale.
19. **Roles:** `TRANSFER_REQUESTER`; `AUTHORISED_RIGHTS_CONTROLLER`; `TRANSFER_REVIEWER`, within a qualification reviewed by a `TRANSFER_GOVERNOR`; `TRANSFER_GOVERNOR`; `MANUFACTURER_RECIPIENT`, named and scoped to one transfer; `MANUFACTURING_READER`.
20. **Country policy may add requirements, never remove platform floors.**
21. **CAP-12 owns AGR's transfer workflow and its decisions. It does not become the planned Manufacturing domain,** which would supply manufacturing knowledge as governed evidence.
22. **Transfer records stay in the country.** A manufacturer outside the country is an egress, governed under decision 15.
23. **CAP-07, CAP-08, CAP-10 and CAP-11 are amended in the same change as this contract.** CAP-09 is not: its decision 11 already holds.
24. **The release order, recorded.** CAP-12 is post-launch. **Commercial transfer also needs CAP-11 built; pilot manufacture needs CAP-08 activation, which needs CAP-11's permit determination.** Until CAP-11 is built, only `TECH_TRANSFER_ONLY` and, where no permit is needed, `MANUFACTURING_EVALUATION` could proceed, once CAP-12 itself is built.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **When a formulation's owners want a manufacturer to know how to make it, AAB assembles the exact specification and checks that everything that must come first is in place for that stage: who has the right to disclose it, what the evidence shows, what safety requires, what the regulator requires, who receives it, where, and for what. People authorise the transfer; the manufacturer accepts it; the manufacturer's own qualified people release any batch. AAB records it all, and stops what it enables when the basis lapses. AAB never authorises a sale, releases a batch or decides who owns an invention.**

CAP-12 keeps the governed record of manufacturing specifications, transfers, their authorisations and acceptances, pilot and validation batch attestations, and holds. It does not compose formulations (CAP-07), run trials (CAP-08), assess safety (CAP-10), determine regulatory status (CAP-11), run a manufacturer's quality system, or adjudicate intellectual property.

## What CAP-12 answers, and what it does not

| Question | Answered by |
|---|---|
| What exactly would a manufacturer make, by what process, to what quality specification? | **CAP-12**, a versioned manufacturing specification |
| Is everything this stage requires in place? | **CAP-12's gates,** derived, and **qualified people's** decisions |
| Who may authorise disclosing it? | **An `AUTHORISED_RIGHTS_CONTROLLER`,** on a recorded authority basis. **Who owns it in law** is not AAB's to say |
| Is the evidence sufficient for this stage? | **A qualified person,** reviewing a CAP-12 evidence basis |
| May the product be placed on the market here? | **The regulator.** CAP-11 records its decision, or a bounded determination that none is required |
| Is this batch fit for release? | **The manufacturer's qualified QC person.** CAP-12 records their decision |
| Is it safe? | CAP-10, within its boundary |
| May it be sold? | **Not AAB.** The regulator and the law |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** all of `manufacturing_core` (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/manufacturing_core/`: 4 tables, 1 function, 1 view, no triggers, every grant and row-level security setting); the gateway's `manufacturing_generate_transfer` and `manufacturing_transfer_summary` and their group's authentication (`api.php`, lines 274 to 316); `country_core`'s administrative summary and the rollback-only test that call it (`country_core/functions.sql`, lines 398 to 410 and 1148 to 1166); and the formulation, ingredient and organisation tables the function reads.

**What it does, as read:**
- **A model:** a transfer package (source organisation, destination manufacturer, formulation version, a `permitted_use` of `MANUFACTURING_EVALUATION`, `PILOT_MANUFACTURE`, `COMMERCIAL_MANUFACTURE` or `TECH_TRANSFER_ONLY`, a status, an access expiry, a generated payload); sections (formula, quality, traceability, governance, withheld internal research), each with a visibility; per-person manufacturer access grants; and manufacturing batches (lot trace, process record, QC results, deviations, a status ending in `RELEASED` or `REJECTED`).
- **One function, one gate** (`api_generate_transfer_package`, `manufacturing_core/functions.sql`, lines 8 to 40): the formulation version is `APPROVED` with a governance decision, and the destination is a `MANUFACTURER` organisation in the workspace. **No trial outcome, safety, regulatory or rights-holder check.** **`permitted_use` comes from the request,** so a caller may choose `COMMERCIAL_MANUFACTURE`.
- **The full production formula goes to the manufacturer by default:** every ingredient, inclusion rate and role, marked manufacturer-visible. Quality and traceability are fixed booleans. Mechanism research and other formulations are withheld, a good default.
- **Authority is broad:** `HEAD_ADMIN`, `COUNTRY_ADMIN` or `SCIENTIST` in the workspace, or any member of the source organisation allowed to share records. No independence, no rights-holder consent.
- **Everything after generation has no writer:** a package is always `DRAFT`; approval, release and acceptance never happen; the governance section stays `REVIEW_REQUIRED`, never reviewed; no access grant or batch is ever written; `access_expires_at` is never checked.
- **Weak foundations:** the function is `SECURITY DEFINER`, executable by `PUBLIC`, and takes the actor's identifier from the caller; row-level security is disabled on all four tables; a package's deletion cascades. **`manufacturing_transfer_summary` lists the transfers of any workspace identifier the caller supplies, with no membership check: a cross-country read.**
- **Reachable only in a test:** as CAP-07 recorded, the function needs a formulation with a country, which the workbench never sets; the rollback-only test `AAB_COUNTRY_COLLAB_MANUFACTURING_E2E_112` is its only caller.

**In one line:** the rehearsal could disclose a complete production formula for commercial manufacture without trial, safety, regulatory or rights-authority gates, and every later step has no code. **That is not carried across, in any form.**

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Four permitted uses, chosen by the caller | **Four stages, each with its own gates,** derived and decided by people; `COMMERCIAL_MANUFACTURING_TRANSFER` renamed (decision 5) |
| Formulation `APPROVED`, the only gate | **The gate matrix** (decisions 5, 7 and 10) |
| Full formula to the manufacturer by default | **A CAP-07 grant to named people, staged, minimum necessary** (decision 8) |
| Withheld internal research | **Kept,** as a withheld section and staged disclosure |
| Fixed quality and traceability booleans | **An exact, versioned specification** with acceptance criteria (decision 13) |
| Broad authority, no consent | **A rights controller, an independent reviewer, governance, and the manufacturer's own acceptance** (decisions 6, 11 and 12) |
| Status, grants and batches with no writer | **Governed decisions and attestations,** each with a writer and an owner (decisions 11 and 14) |
| `RELEASED` batches with no authority | **The manufacturer's qualified QC decision, recorded; never AAB's** (decision 14) |
| `access_expires_at`, never checked | **Enforced expiry and revocation,** with the honesty qualification (decision 8) |
| `SECURITY DEFINER`, `PUBLIC`, caller-supplied actor; no row security; cascades | **Not carried across** |
| A cross-country summary | **Not carried across.** Reads are scoped to the country workspace and the transfer |

**The rehearsal's data is not CAP-12's.** CAP-12's records start empty in a new deployment.

## Stages and their gates

**The gate matrix.** Each stage includes every gate of the stages above it.

| Stage | What it permits | Its gates |
|---|---|---|
| `TECH_TRANSFER_ONLY` | Disclosure of the specification, for understanding and planning. **No material may be produced** | **Rights authority** for this disclosure and use (decision 6); **named recipients** and their undertakings (confidentiality, purpose limitation, no onward disclosure); **controlled specification access** under a CAP-07 grant (decision 8); a transfer authorisation by a `TRANSFER_REVIEWER` |
| `MANUFACTURING_EVALUATION` | Feasibility work at the named site; nothing made leaves it | **Above,** plus a **site-specific CAP-10 handling outcome** for manufacture-scale handling at that site (CAP-10's amendment), and **any required permits** for the activity (a CAP-11 permit determination for the site's activity, CAP-11's amendment) |
| `PILOT_MANUFACTURE` | Limited batches, for named CAP-08 trials only | **Above,** plus the **exact specification version** matching the trialled formulation version; **linkage to each CAP-08 trial** the batches serve; the trial's and the activity's **applicable permits;** and **complete traceability** (batch attestations, decision 14) |
| `COMMERCIAL_MANUFACTURING_TRANSFER` | Transfer of the specification for the manufacturer to establish commercial production, under its own and the regulator's authority | **Above,** plus a **governed evidence basis** judged sufficient by a qualified person (decision 7); a **CAP-11 market-authorisation determination** permitting it (decision 10); **two independent AAB approvers;** and **the manufacturer's acceptance** (decision 11) |

- **Every gate is checked at the moment of each authorisation,** and is valid and current, or the authorisation is refused with `EVIDENCE_REQUIRED`, naming each gate not met.
- **A stage permits what its row says and nothing more.** No stage authorises physical transfer of material across a border, customs clearance, a batch's release, or sale (decision 3).
- **Recipient undertakings** are required at every stage; **the full manufacturer acceptance** (decision 11) at the commercial stage, and wherever the country's policy requires it earlier.

## The manufacturing specification

```typescript
interface Cap12ManufacturingSpecification {
  recordId: string;
  recordVersion: number;                 // any change is a new version, under change control
  recordKind: "MANUFACTURING_SPECIFICATION";
  schemaVersion: "urn:aab:schema:agr:cap-12:specification:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  formulation: { recordId: string; recordVersion: number };      // a CAP-07 FORMULATION version
  sections: Array<{
    code: "FORMULA" | "PROCESS" | "QUALITY_SPECIFICATION" | "TRACEABILITY" | "HANDLING_AND_SAFETY_CONDITIONS" | "REGULATORY_CONDITIONS" | "STORAGE_AND_PACKAGING" | "WITHHELD_INTERNAL_RESEARCH";
    content: string;                     // structured text; PROTECTED_COMMERCIAL where it carries composition
    disclosureStage: "TECH_TRANSFER_ONLY" | "MANUFACTURING_EVALUATION" | "PILOT_MANUFACTURE" | "COMMERCIAL_MANUFACTURING_TRANSFER" | "NEVER";
  }>;
  formula: {
    components: Array<{ ingredient: { recordId: string; recordVersion: number }; amount: string; unit: string; tolerance: string; role: string }>;
    basis: string;
  };
  qualitySpecification: Array<{ attribute: string; testMethod: string; acceptanceCriterion: string }>;
  processVersion: string;
  conditionsCarriedOver: {
    cap10: string[];                     // the CAP-10 outcome decisions, and their conditions
    cap11: string[];                     // the CAP-11 determinations or regulator decisions, and their conditions
  };
  equivalence?: {                        // where it differs from the version trialled
    trialledSpecification: { recordId: string; recordVersion: number };
    differences: string[];
    basis: string;                       // why the product is equivalent, as declared
  };

  recordDigest: string;
}
```

- **The system sets** identity, country, provenance and digests. **The formula is taken from the CAP-07 version,** never retyped; a component not in that version is refused.
- **Staged disclosure:** each section names the earliest stage at which it may be disclosed; `WITHHELD_INTERNAL_RESEARCH` is `NEVER`. **Minimum necessary disclosure** is the default: a section is disclosed at a stage only if the stage needs it.
- **Change control:** a `CHANGE_REQUEST` names what changes and why. Its approval creates a new specification version. **Every authorisation names a specification version and digest; a new version needs a new authorisation.** A new CAP-07 formulation version is a new specification.

## Rights authority

```typescript
interface Cap12RightsAuthority {
  recordId: string;
  recordVersion: number;
  recordKind: "RIGHTS_AUTHORITY";
  schemaVersion: "urn:aab:schema:agr:cap-12:rights-authority:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  formulation: { recordId: string; recordVersion: number };
  controller: ActorReference;            // the AUTHORISED_RIGHTS_CONTROLLER
  onBehalfOf: string;                    // the organisation or people whose rights they exercise
  authorityFor: { stages: string[]; recipients: string[]; purposes: string[]; territories: string[]; until?: string };
  basis: Array<{
    concern:
      | "OWNERSHIP_OR_AUTHORITY_TO_LICENSE"
      | "EMPLOYMENT_AND_INSTITUTIONAL_IP"
      | "JOINT_DEVELOPMENT"
      | "THIRD_PARTY_INGREDIENTS_OR_METHODS"
      | "CONFIDENTIAL_INFORMATION"
      | "PATENTS_AND_LICENCES"
      | "TRADITIONAL_OR_INDIGENOUS_KNOWLEDGE"
      | "GENETIC_RESOURCE_ACCESS_AND_BENEFIT_SHARING"
      | "CONTRACTUAL_RESTRICTIONS";
    applies: boolean;
    evidence: Array<{ memoryRecordId: string; recordVersion: number }>;   // admitted CAP-04 DOCUMENTs
    statement: string;
  }>;
  recordDigest: string;
}
```

- **Every concern is declared,** applicable or not, with a statement. An applicable concern with no evidence is a gap, and **the stage is refused (`EVIDENCE_REQUIRED`) until it is evidenced.**
- **`TRADITIONAL_OR_INDIGENOUS_KNOWLEDGE` or `GENETIC_RESOURCE_ACCESS_AND_BENEFIT_SHARING` applicable** holds the record for a `TRANSFER_GOVERNOR`, as CAP-04 holds traditional knowledge, and requires evidence of the consent or agreement the knowledge's or resource's holders gave.
- **AAB records the authority basis; it never adjudicates ownership.** A display of rights authority states: "Recorded authority basis, as evidenced. AAB does not determine intellectual-property ownership."
- **A `RIGHTS_AUTHORITY_APPROVAL`** is the controller's own signed decision approving the specific disclosure. **Its withdrawal stops new disclosure and transfer** (decision 9).

## The evidence basis

**A transfer evidence basis is an evaluation** (AAB-PLATFORM-07) for one specification version and stage, over a frozen snapshot of: **every CAP-08 trial of the formulation version, and of any version the specification declares equivalent, whatever its outcome;** their accepted outcome reviews; every adverse event and CAP-10 safety signal on them and on the formulation, in any state; the CAP-10 outcomes and conditions relied on; every CAP-09 promotion naming the formulation, with its boundary and replication; the intended claims the requester declares, each with the evidence cited for it; the equivalence declaration; and the CAP-11 requirement set and determination for the destination jurisdiction.

- **Rules** (`cap-12-evidence-basis-rules-1`): **deterministic assembly** of the above, with findings: `TRIAL_NOT_ACCEPTED`, `NEGATIVE_OR_NULL_OUTCOME`, `ADVERSE_EVENT`, `SAFETY_SIGNAL_OPEN`, `SAFETY_SIGNAL_SUBSTANTIATED`, `CLAIM_WITHOUT_EVIDENCE`, `UNREPLICATED`, `CONTRADICTING_EVIDENCE`, `EQUIVALENCE_DECLARED_NOT_DEMONSTRATED`, `EVIDENCE_ADMITTED_WITH_LIMITATIONS`, `JURISDICTION_REQUIREMENT_UNMET`. **No score, threshold or rank. Selecting only favourable trials is impossible:** every trial of the version is included by rule, and the requester cannot exclude one.
- **An `EVIDENCE_BASIS_REVIEW`** by a qualified `TRANSFER_REVIEWER`: `SUFFICIENT_FOR_STAGE`, `INSUFFICIENT_EVIDENCE_REQUIRED`, `NOT_SUFFICIENT`. The reasoning addresses every finding by name. **`SUFFICIENT_FOR_STAGE` is a judgement for the transfer, never a statement that the formulation works, is safe, or may be sold.**
- **Required for `COMMERCIAL_MANUFACTURING_TRANSFER`;** a country's policy may require it earlier.

## Authorisation, acceptance and the package

**A `TRANSFER_AUTHORISATION`** (AAB-PLATFORM-08) is bound to the transfer request, the specification version and digest, the stage, the manufacturer, the site, the named recipients, the permitted purpose, and every gate it relied on, each with its currency.

| Stage | Deciders |
|---|---|
| `TECH_TRANSFER_ONLY`, `MANUFACTURING_EVALUATION`, `PILOT_MANUFACTURE` | **One `TRANSFER_REVIEWER`,** qualified for the stage; **plus a `TRANSFER_GOVERNOR`** where the transfer is cross-border, or the country's policy marks it sensitive |
| `COMMERCIAL_MANUFACTURING_TRANSFER` | **Two independent approvers:** a qualified `TRANSFER_REVIEWER` and a `TRANSFER_GOVERNOR`, two different people; the evidence basis's reviewer may be one of them, never both |

- **Outcomes:** `AUTHORISED_FOR_STAGE`, `EVIDENCE_REQUIRED` (naming each gate), `NOT_AUTHORISED`. With two deciders, **the most restrictive prevails;** dissent is kept.
- **Independence:** never the requester; never the rights controller; never the formulation's author or CAP-07 reviewer; **never affiliated with the destination manufacturer;** no declared conflict. **A manufacturer's technical staff may contribute input,** recorded as such, and never decide.
- **The package** is compiled by the platform's package compilation and rendered under AAB-PLATFORM-02, **containing only the sections the stage discloses,** with its digest, each page marked with the recipient, and carrying the statement: **"This package discloses confidential information to the named recipients for the stated purpose only. Revocation prevents further access through AAB but cannot technically retrieve information already disclosed. This is not an authorisation to manufacture, release, sell or distribute, nor a grant of intellectual-property rights."**
- **Access:** by controlled viewing, under CAP-07's `MANUFACTURING_TRANSFER` grant; **no bulk search; no download unless the authorisation permits it, by name;** every view logged.

**Recipient undertakings and manufacturer acceptance.**
- **Each named recipient** signs a `RECIPIENT_UNDERTAKING` before any access: confidentiality, the permitted purpose, no onward disclosure, and the revocation statement.
- **The manufacturer** (its authorised signatory, a `MANUFACTURER_RECIPIENT` so authorised) records a **`MANUFACTURER_ACCEPTANCE`** of the exact specification version, the conditions, confidentiality, the permitted use, the site, the named recipients, the reporting obligations, change control and the prohibition on onward disclosure. **Required at the commercial stage.** It is the receiving party's accountable act, **never one of AAB's approvals**, and is recorded beside them, not counted among them.

## Batch attestations

**For `PILOT_MANUFACTURE`, and validation batches at the commercial stage,** a `MANUFACTURER_RECIPIENT` records a `BATCH_ATTESTATION`:

```typescript
interface Cap12BatchAttestation {
  recordId: string;
  recordKind: "BATCH_ATTESTATION";
  schemaVersion: "urn:aab:schema:agr:cap-12:batch-attestation:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  transferAuthorisationId: string;
  specification: { recordId: string; recordVersion: number; recordDigest: string };
  manufacturer: string;
  site: string;
  batchIdentifier: string;
  purpose: "PILOT_FOR_TRIAL" | "VALIDATION";
  trials: string[];                      // CAP-08 trial identifiers, for a pilot batch
  manufacturedAt: string;
  materialLots: Array<{ ingredient: { recordId: string; recordVersion: number }; lot: string; supplier: string }>;
  processVersion: string;
  qcResultsDigest: string;               // of the manufacturer's QC document, admitted in CAP-04
  qcDocument: { memoryRecordId: string; recordVersion: number };
  deviationReferences: string[];
  release: {
    decision: "RELEASED" | "REJECTED";
    by: ActorReference;                  // the manufacturer's qualified QC person
    qualification: string;               // as the manufacturer declares it
    at: string;
  };
  recordDigest: string;
}
```

- **The release is the manufacturer's qualified QC decision, recorded.** AAB never releases a batch, and never verifies quality; it records who released it, on what QC record.
- **A batch is refused** (`EVIDENCE_REQUIRED`) if its specification version is not the one authorised, or a material lot names an ingredient not in it.
- **Complete commercial batch management is outside CAP-12** (decision 14).

## Manufacturing reports and safety

- **A `MANUFACTURING_REPORT`** by a `MANUFACTURER_RECIPIENT` records a deviation, quality failure, handling incident or observation, with its declared safety implication: `NONE_DECLARED`, `POSSIBLE`, or `HARM_OCCURRED`.
- **A report with `POSSIBLE` or `HARM_OCCURRED`** writes a CAP-10 safety signal in the same transaction (channel `MANUFACTURING_REPORT`, CAP-10's amendment), concerning the transfer. **Current reading (Note of 2026-10-02; SUPERSEDED):** CAP-12 never writes a CAP-10 record: CAP-12's registered signal-request service writes a CAP-12 safety-signal request, `initiatedBy` the reporter, and CAP-10's intake service creates the signal from it, citing it (amendment of 2026-10-02, second, point 7). **It is an unverified manufacturing report until CAP-10's process says otherwise;** CAP-10's lifecycle governs whether it becomes a precautionary hold, and only a CAP-10 determination makes it a substantiated finding.
- **A CAP-10 hold on the transfer** is a CAP-12 hold (below).

## Holds

**A `TRANSFER_HOLD` stops what AAB enables for the transfer:** new packages, new disclosures, new access, new authorisations, and new batch attestations.

| When | What happens |
|---|---|
| A CAP-10 safety-driven lapse, or a CAP-10 hold concerning the transfer or formulation | **Hold at once** |
| A regulator's suspension, revocation or expiry of a decision relied on (CAP-11) | **Hold at once** |
| The rights authority withdrawn, expired or invalidated | **New disclosure and transfer stop at once;** existing access is revoked |
| Material evidence relied on becomes stale or superseded: an evidence basis, a CAP-11 determination, a CAP-10 outcome, an acceptance the basis rested on | **`EVIDENCE_REQUIRED`, and hold pending reassessment** |
| An administrative lapse unrelated to the basis relied on | **Disclosed; no hold** |

- **Continuation on an independent basis:** a hold may be lifted without reassessment only where **an independent, current basis covering the same gate is explicitly identified and verified** in a `HOLD_RELEASE` decision by a `TRANSFER_GOVERNOR`.
- **AAB cannot stop an external factory.** A hold is **notified** at once to the manufacturer's named recipients, the rights controller and the reviewer; **each acknowledgement is recorded;** an unacknowledged hold is **escalated** to the `TRANSFER_GOVERNOR` and shown as unacknowledged on every read. A hold states plainly that it restricts AAB-enabled activity and records the obligations the manufacturer accepted.
- **Holds are released only by a person,** never by time.

## Cross-border transfer

**A manufacturer outside the country workspace** makes the transfer cross-border. **It is several separately governed acts, none inferred from another:**

| Act | Governed by |
|---|---|
| Specification egress | A CAP-12 `TRANSFER_EGRESS`, authorised by a `TRANSFER_GOVERNOR`, with CAP-11's egress-record fields and the irreversibility acknowledged, under the non-return boundary |
| Personal-data disclosure | The egress specification, and the country's law; named in the egress record |
| Export of samples, import into the destination | Not CAP-12's. Recorded as required, with their evidence, by reference |
| Genetic-resource or biological-material transfer; biosecurity and quarantine | Not CAP-12's. The rights authority's access-and-benefit-sharing evidence, and CAP-10 for biosecurity, are prerequisites |
| Technology licensing | The rights authority and its contracts, by reference |
| Regulator submissions | CAP-11's dossier egress |
| Return of results or manufacturing knowledge | **A governed ingress:** admitted as CAP-04 records with their provenance; never an automatic return |

**Protected country information has no automatic return or onward path.**

## Machines, brains and the Manufacturing domain

- **Machines may** (decision 18): compile packages; evaluate the gate matrix and report each gate's state; flag expiries; compare specification versions; assemble the evidence basis.
- **Machines may never:** authorise a transfer; judge evidence sufficient; adjudicate rights; release a batch; judge quality; or declare anything fit for sale.
- **The evidence basis is automated output,** labelled `MACHINE_GENERATED`, reproducible, separate from any person's decision.
- **CAP-12 owns AGR's transfer workflow, not manufacturing knowledge** (decision 21). The planned Manufacturing domain, when contracted, supplies process and quality knowledge as governed evidence, and may own ongoing commercial production records. **CAP-12 is not that domain.**

## The deciders

**Qualification.** As in CAP-10 and CAP-11: an `ASSESSOR_QUALIFICATION` with CAP-12's scope (stages, product classes, process types), reviewed by a `TRANSFER_GOVERNOR`; **lapse 24 months.** A `TRANSFER_REVIEWER` grant has effect only within it.

**Five acts, five parties** (decision 12): the rights controller approves the source's disclosure; an independent reviewer reviews; the governor approves sensitive, cross-border and commercial transfers; the manufacturer accepts; the manufacturer's QC person releases batches. **No person makes two of the first three for one transfer.**

**Challenge:** a qualified reviewer other than the decider, the rights controller, or the requester; resolved by a qualified reviewer who is neither party. **Final in CAP-12, as the pilot position.** While a challenge to an authorisation is open, it is treated as a hold.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-12 |
|---|---|
| Scope rules; selection policies | `cap-12-evidence-basis-scope` v1; **`SCOPE_DERIVED`**: every trial of the version and its declared equivalents, by rule; policy `ALL_ADMITTED` v1, quarantined `EXCLUDE`, disclosed |
| Evaluator and rules versioning | `cap-12-evidence-basis-rules-1`; `evaluatedAt` not reproducible **Current reading (Note of 2026-10-02; SUPERSEDED):** `cap-12-evidence-basis-rules-2` (amendment of 2026-10-02, integrity, point 1). |
| Existing evaluations and decisions | **None.** The rehearsal's packages are not mapped |
| Decision kinds | `RIGHTS_AUTHORITY_APPROVAL`, `EVIDENCE_BASIS_REVIEW`, `TRANSFER_AUTHORISATION`, `CHANGE_REQUEST_APPROVAL`, `TRANSFER_EGRESS_AUTHORISATION`, `HOLD_RELEASE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_TRANSFER_POLICY_APPROVAL`, `CAP12_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` |
| More than one decider | **A commercial authorisation: two,** most restrictive prevails; a country's policy may require two elsewhere |
| Triggers and lapse | All ten platform change kinds; every gate's currency; a new specification or formulation version; **lapse: the earliest gate's expiry, and at most 12 months** (pilot position) for an authorisation |
| What relies on reviews | Package compilation, access, batch attestation and CAP-08 pilot batches, each in the same read as its own write |

## Authority

| Role | May |
|---|---|
| `TRANSFER_REQUESTER` | Prepare specifications and change requests; request transfers and evidence bases; declare claims and equivalence |
| `AUTHORISED_RIGHTS_CONTROLLER` | Record rights authority, and approve or withdraw a specific disclosure, **only for the rights they evidence** |
| `TRANSFER_REVIEWER` | **Within a valid, current qualification only:** review evidence bases; authorise transfers; approve change requests; challenge and resolve challenges |
| `TRANSFER_GOVERNOR` | Review qualifications; approve the country's transfer policy; give the second commercial approval; authorise sensitive and cross-border transfers and egress; release holds; resolve held records |
| `MANUFACTURER_RECIPIENT` | **Named, and scoped to one transfer:** sign undertakings; view what the stage discloses; for an authorised signatory, accept; record batch attestations and manufacturing reports |
| `MANUFACTURING_READER` | Read records, never composition, in the country workspace |

- **Each role is a scoped grant,** resolved by the platform; a grant with no country is never read as covering every country. **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace, and a `MANUFACTURER_RECIPIENT` reads only their transfer.

## Receipts, operations and routes

Receipts carry `capabilityId: "CAP-12"`, for every admission, evaluation and decision kind above, and `MANUFACTURER_ACCEPTANCE_RECORDED`, `RECIPIENT_UNDERTAKING_RECORDED`, `BATCH_ATTESTATION_RECORDED`, `MANUFACTURING_REPORT_RECORDED`, `TRANSFER_HOLD_PLACED`, `HOLD_ACKNOWLEDGED` and `PACKAGE_VIEWED`.

| Operation | Route |
|---|---|
| `submitSpecification`, `getSpecification`, `submitChangeRequest` | `POST /agr/v1/manufacturing-specifications`; `GET …/:recordId`; `POST …/:recordId/change-requests` |
| `recordRightsAuthority`, `approveDisclosure` | `POST /agr/v1/rights-authorities`; `…/:recordId/approvals` |
| `requestTransfer`, `getTransfer` | `POST /agr/v1/manufacturing-transfers`; `GET …/:transferId`, with every gate's state derived |
| `requestEvidenceBasis`, `reviewEvidenceBasis` | `POST /agr/v1/manufacturing-transfers/:transferId/evidence-bases`; `…/evidence-bases/:evaluationId/reviews` |
| `authoriseTransfer` | `POST /agr/v1/manufacturing-transfers/:transferId/authorisations` |
| `signUndertaking`, `acceptTransfer`, `viewPackage` | `POST …/:transferId/undertakings`; `…/acceptances`; `GET …/:transferId/package` (logged, controlled view) |
| `recordBatch`, `recordReport` | `POST …/:transferId/batch-attestations`; `…/manufacturing-reports` |
| `placeHold`, `acknowledgeHold`, `releaseHold` | `POST …/:transferId/holds`; `…/holds/:holdId/acknowledgements`; `…/holds/:holdId/releases` |
| `authoriseEgress`, `recordEgress` | `POST …/:transferId/egress-authorisations`; `POST /agr/v1/transfer-egress` |
| qualifications, policy, held records, challenges | As in CAP-11, under `/agr/v1/transfer-…` |

Every write requires an `Idempotency-Key`. **States are derived when read.**

## Failure contract

`Cap12Failure` follows CAP-11's shape, with `capabilityId: "CAP-12"`, `FAIL_CLOSED`, `noWrites: true`, and these codes in addition to the common ones (`UNAUTHENTICATED`, `ROLE_NOT_AUTHORISED`, `REQUEST_VALIDATION_FAILED`, `IDEMPOTENCY_KEY_CONFLICT`, `EVIDENCE_NOT_ADMITTED`, `SUPERSESSION_NOT_PERMITTED`, `CROSS_BOUNDARY_REQUEST_BLOCKED`, `RECORD_NOT_FOUND`, `DECIDER_NOT_QUALIFIED`, `DECIDER_NOT_INDEPENDENT`, `REASONING_INCOMPLETE`, `BINDING_MISMATCH`, `DECISION_SIGNATURE_INVALID`, `DECISION_NOT_PERMITTED`, the four challenge codes, `DEPENDENCY_UNAVAILABLE`):

| Code | HTTP | Meaning |
|---|---:|---|
| `EVIDENCE_REQUIRED` | 422 | A gate for the stage is not met, valid and current; the reasons name each |
| `RIGHTS_AUTHORITY_NOT_ESTABLISHED` | 403 | No current rights-authority approval for this disclosure, recipient and purpose |
| `SPECIFICATION_MISMATCH` | 409 | The specification version or digest differs from the one authorised, or a component is not in the formulation version |
| `STAGE_NOT_PERMITTED` | 422 | An act the stage does not permit, such as material under `TECH_TRANSFER_ONLY` |
| `TRANSFER_HOLD_IN_FORCE` | 409 | A hold restricts the act |
| `UNDERTAKING_REQUIRED` | 403 | A recipient has not signed their undertaking |
| `MANUFACTURER_ACCEPTANCE_REQUIRED` | 409 | A commercial transfer without the manufacturer's acceptance |
| `EGRESS_NOT_AUTHORISED` | 403 | A cross-border act with no valid authorisation |
| `POLICY_BELOW_PLATFORM_FLOOR` | 422 | A country policy relaxes a platform floor |

**A refusal never reveals more than the requester may see.**

## Dependencies

| Capability | How CAP-12 depends on it | Its state |
|---|---|---|
| CAP-04 | **Required:** every document cited | `designed`; built first |
| CAP-07 Formulation Intelligence | **The formulation;** the `MANUFACTURING_TRANSFER` composition grant | `designed`; amended 2026-10-02 |
| CAP-08 Controlled Trials & Outcomes | **The trials** a pilot serves; **the trial outcomes** of the evidence basis | `designed`; amended 2026-10-02 |
| CAP-09 Governed Scientific Learning | **Promotions,** shown in the evidence basis; never an authority | `designed` |
| CAP-10 Safety & Ecological Intelligence | **Site-specific handling outcomes;** signals and holds; manufacturing reports | `designed`; amended 2026-10-02 |
| CAP-11 Regulatory Translation & Dossier Support | **Activity permits; the market-authorisation determination;** regulator decisions; egress fields | `designed`; amended 2026-10-02 |
| AAB-PLATFORM-02, and package compilation (primitive 8) | **Compiles and renders** packages | `implemented` |
| The planned Manufacturing domain | **Would supply** manufacturing knowledge, and may own ongoing production records | planned |
| The country's tenancy and participation (CAP-16, CAP-24) | **Organisations, manufacturers, and the people who hold the roles** | `named only` |

## Open gaps

**Release order.** Commercial transfer needs CAP-11 built; pilot manufacture needs CAP-08 activation, which needs CAP-11's permit determination (decision 24).

**Contract gap: physical transfer.** Export, import, customs, biological-material and quarantine are recorded by reference, governed elsewhere; no AAB capability governs them.

**Contract gap: ongoing commercial production.** Complete batch records, quality management and recalls belong to the manufacturer's system and the future Manufacturing domain.

**Contract gap: watermarking and controlled viewing.** Required by this contract; their technical design is the platform's, not defined.

**Contract gap: rights evidence standards.** What evidence suffices for each rights concern is the country's and the controller's legal advisers'; AAB records it, and defines no standard.

**Contract gap: vocabularies** for product classes, process types and sites.

**Platform gap: an invalidated admission,** as in CAP-01 and CAP-04 to CAP-11.

**Current system limit: no implementation.** Nothing of CAP-12 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- **It does not authorise any manufacture, sale or distribution,** release any batch, certify any quality, or grant or determine any intellectual-property right.
- It is not legal advice, and determines no regulatory status.
- It does not define the planned Manufacturing domain, physical transfers, or any jurisdiction's law.
- It does not make CAP-12 canonical in the registry, the CAP-34 fidelity manifest or the validators, and does not change its post-launch horizon.
- It does not admit CAP-12: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
