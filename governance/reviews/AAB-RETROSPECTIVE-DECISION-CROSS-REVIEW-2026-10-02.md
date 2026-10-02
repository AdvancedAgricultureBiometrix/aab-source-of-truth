# AAB Retrospective Governance and Architecture Decision Cross-Review — Record

Reviewer: ChatGPT
Date: 2026-10-02
Reviewed commit: a3777de (a3777ded3a6a91cee4cacffc97590e7157803f25), main after PR #118
Review type: read-only advisory cross-review by a collaborating AI system, not the independent reviewer required by AAB's admission or Gate-D contracts
Authority: none

Status: REVIEW RECORD. It records the review and its disposition. It changes no contract, finding, capability state, admission state, Gate D state, commissioning state, code, database or environment. Committed with the roadmap and stock-take at 91613f8, in the same change (roadmap, decision 67; stock-take, open decisions 12 to 16).

How to read this record. Sections 1 to 7 reproduce the review's text verbatim, as delivered to the Platform Owner. Lines marked "Record:" are this record's, not the review's: they name any existing item in the roadmap (governance/AAB-PLATFORM-ROADMAP-2026-09-27.md) or the stock-take (governance/AAB-STOCK-TAKE-2026-09-28.md) that a finding restates, and the finding's disposition. Section 8 summarises the disposition. Nothing in this record repairs a finding.

## 1. The review

Review date: 2026-10-02
Repository: AdvancedAgricultureBiometrix/aab-source-of-truth
Pinned main commit: a3777ded3a6a91cee4cacffc97590e7157803f25
Review type: read-only advisory cross-review
Authority: none. This report changes no contract, finding, capability state, admission state, Gate-D state, commissioning state, code, database or environment.

## 2. Executive conclusion

The architecture is unusually disciplined about non-compensating controls, country sovereignty, persisted authority, immutable evidence, machine-output labelling and the separation between technical verification and human approval. The central direction is sound.

It is not yet safe to treat the contract family as implementation-ready as a whole. I identified nine implementation-gating issues, five material design/governance decisions requiring closure, and two traceability defects. The most consequential defect is a known gap in the currency chain: when a CAP-04 admission is invalidated after a successful challenge, AAB-PLATFORM-07 has no matching change type, so downstream reviews do not automatically become stale. The contracts disclose this repeatedly, but it has not been elevated into one owned platform blocker.

This review does not alter these standing conclusions:

- COMMISSIONING OUTCOME: NOT AUTHORISED
- No AGR capability is implemented, admitted or commissioned.
- An absent decision or absent evidence is not presumed safe.
- The independent dependency-audit verification remains a separate gate.

## 3. Scope and method

The review covered the current canonical decision surface on main, with emphasis on AAB-PLATFORM-01 through AAB-PLATFORM-10, AGR CAP-01 through CAP-12 and the AGR capability-identity decisions, platform purpose, domain separation, cognitive architecture, observation/brain governance, capability admission, Gate D, country egress/non-return controls, and the parallel-development protocol.

The review tested cross-document joins rather than merely reviewing each document in isolation. The uncommitted 25-file branch described as governance/agr-provenance-conformance was not present on GitHub or main at the pinned commit.

Record: that branch is the conformance work later merged as PR #119, at 91613f8. The review therefore read the AGR contracts as they stood before #119. Its findings stand as made at a3777de; where #119 changed the text a finding cites, the finding is not re-assessed here.

## 4. Risk-ordered findings register

### RD-01 — Invalidated admission does not trigger downstream currency changes

Classification: IMPLEMENTATION GATE — HIGH
Evidence: CAP-04 explicitly states that an upheld challenge can return an admitted record to held state, but AAB-PLATFORM-07 has no change kind for it. CAP-05 through CAP-12 repeat the consequence: dependent review triggers do not fire.
Risk: reasoning landscapes, learning promotions, safety assessments, regulatory records and manufacturing decisions may remain apparently current after a supporting record is no longer admitted.
Required decision: amend AAB-PLATFORM-07 with an explicit change kind such as MEMBER_ADMISSION_INVALIDATED; define propagation through AAB-PLATFORM-08 currency; add automatic negative tests for every dependent capability.

Record: restates an existing item. Roadmap, "Still open": an invalidated admission in AAB-PLATFORM-07 (update of 46e3e09). Stock-take, section 9, "Raised by AGR's adoption", 07. The review adds the propagation through AAB-PLATFORM-08 and the negative tests. Disposition: the existing item continues, marked as the review's most consequential finding (roadmap, "Still open", update of 91613f8).

### RD-02 — Authority grants issuance governance is not defined

Classification: IMPLEMENTATION GATE — HIGH
Evidence: AAB-PLATFORM-03 requires server-resolved protected membership and grant records, but its open items retain protected membership implementation and a missing role registry. AAB-PLATFORM-08 separately says how authority grants are issued, scoped and revoked is not defined.
Risk: the contracts correctly reject client-supplied roles, yet the upstream act that creates a trusted role may remain an operator configuration act rather than a governed evidenced decision.
Required decision: define one platform authority-grant lifecycle covering authorised grantor, evidence, separation of duties, scope, expiry, suspension and revocation, audit receipt, challenge and reconstruction invariants. Define the canonical role registry before capability code relies on role names.

Record: restates and widens existing items. Stock-take, section 9, "From AAB-PLATFORM-08": how authority grants for deciding roles are issued, scoped and revoked. Roadmap, section 6.3: TODO(role-registry); section 6.4: undefined reviewer and verifier authority, and party-scoped grants as operator configuration. The review widens it from deciding roles to every grant, and makes the role registry a precondition of capability code. Disposition: stock-take, open decision 12, more pressing after #119.

### RD-03 — Same-country cross-institution access lacks an enforceable authority model

Classification: IMPLEMENTATION GATE — HIGH
Evidence: CAP-04 says a MEMORY_READER within a country workspace may read another institution's records according only to record-declared permittedUses and sharingClassification.
Risk: country sovereignty does not itself confer institutional authority. A user with a country-scoped reader grant could obtain commercially sensitive institutional science unless institution membership, ownership and sharing authority are separately enforced.
Required decision: define institution-scoped access, explicit sharing grants and arrangements, grantor authority, permitted recipients and revocation. Until then, cross-institution reads must fail closed.

Record: new to the roadmap and stock-take. Related: TODO(tenant-scope) (roadmap, section 6.1), which concerns rows between organisations in the SCS pilot, not CAP-04's reads. Disposition: stock-take, open decision 13, more pressing after #119.

### RD-04 — Declared-purpose access control has no governed vocabulary or role-to-purpose rule

Classification: IMPLEMENTATION GATE — HIGH
Evidence: CAP-04 requires a declared purpose and exact string match, but openly states there is no governed purpose vocabulary and no rule for which roles may declare which purpose.
Risk: purpose limitation becomes a caller-selected label.
Required decision: create a versioned purpose registry and an authority matrix mapping role and scope and operation to permitted purpose; record the resolved purpose authority in read audit evidence.

Record: new to the roadmap and stock-take; disclosed until now only in CAP-04's own contract. Disposition: stock-take, open decision 14, more pressing after #119.

### RD-05 — Retention, lawful erasure, legal hold and override custody remain unresolved

Classification: REAL-DATA GATE — HIGH
Evidence: AAB-PLATFORM-01 explicitly requires closure before real data for override credential governance and legal hold. It also leaves backup erasure propagation, citation behaviour after erasure, package verification after erasure, lock renewal and overwrite recovery unresolved.
Required decision: settle erasure tombstones, derived-record treatment, backup and replica propagation, audit evidence, legal grounds, dual control, notification and recovery behaviour before admitting real AGR data.

Record: restates existing items. Roadmap, section 6.1: the override credential's governance, with erasure and legal hold, before real data. Roadmap, "Still open": legal hold's governance, lock renewal and staging. Stock-take, section 5, and section 9, "Raised by AGR's adoption", 01. The review adds overwrite recovery and the elements of an erasure decision. Disposition: the existing items continue.

### RD-06 — Strong authentication for high-consequence regulatory acts has no platform contract

Classification: IMPLEMENTATION GATE — HIGH
Evidence: CAP-11 identifies MFA and re-authentication before regulatory actions as a platform requirement with no contract.
Required decision: define risk-based step-up authentication, freshness, authenticator class, failure behaviour, recovery and audit evidence as a vendor-neutral platform primitive.

Record: restates an existing item. Roadmap, "Still open", CAP-11's open gaps; stock-take, section 9, "Raised by CAP-11". Related: control CR-20, privileged administrator MFA (roadmap, section 7.1), which concerns administrators, not regulatory acts. Disposition: the existing item continues.

### RD-07 — Trial ethics and landholder consent are declared but not authoritatively verified

Classification: IMPLEMENTATION GATE — MEDIUM
Evidence: CAP-08 records ethics approval and landholder consent as declared, not verified, and explicitly leaves verification open.
Required decision: define who verifies ethics approval and landholder consent, what evidence is required, what constitutes a valid verification, and what happens when verification cannot be established.

Record: restates an existing item. Roadmap, "Still open", CAP-11's open gaps: ethics approval and consent, still declared in CAP-08; stock-take, section 9, "Raised by CAP-11". Disposition: the existing item continues.

### RD-08 — Safety-governor appointments and qualifications are not governed

Classification: IMPLEMENTATION GATE — MEDIUM
Evidence: CAP-10 defines the SAFETY_GOVERNOR role and its responsibilities but does not define how a person becomes a qualified SAFETY_GOVERNOR or how that qualification is governed, renewed or revoked.
Required decision: define SAFETY_GOVERNOR qualification criteria, appointment authority, scope, tenure, renewal, revocation and audit.

Record: restates and widens an existing item. Roadmap, "Still open", CAP-10's open gaps: who may hold SAFETY_GOVERNOR, with CAP-24 and the country; stock-take, section 9, "Raised by CAP-10". The review adds qualification, tenure, renewal and revocation. Disposition: the existing item continues.

### RD-09 — Production cryptographic trust bootstrap and private-key custody remain open Gate-D matters

Classification: REAL-DATA GATE — HIGH
Evidence: AAB-PLATFORM-09 records key ceremonies, bootstrap and custody as open Gate-D items.
Required decision: define the production key ceremony, custody requirements, compromise response and recovery before any production admission.

Record: restates existing items. Stock-take, section 9, "From AAB-PLATFORM-09": the bootstrap for production, attestation keys, compromise notices across the boundary, and private-key custody, including the WP05 hardware key. Roadmap, section 1, primitive 2: no real key ceremony has been performed. The roadmap and stock-take record these as AAB-PLATFORM-09's open items; neither lists them among the items that block Gate D's first assessment (roadmap, section 7.3). Whether AAB-PLATFORM-09 itself classifies them as Gate D items is not checked here. Disposition: the existing items continue.

### RD-10 — CAP-02 treats all source-basis lapse alike

Classification: MATERIAL DECISION REQUIRED — HIGH
Evidence: CAP-02 says source-approval lapse stops new runs only; already staged and submitted items keep the basis they had.
Risk: reasonable for ordinary licence expiry, but unsafe as a universal rule for withdrawal, successful challenge or retroactive legal invalidity.
Required decision: distinguish expiry from retroactive invalidity and revocation. Define which events block future submission, require quarantine, trigger deletion or retention review, or merely add a limitation.

Record: new to the roadmap and stock-take. Disposition: recorded here; not an open decision in this change.

### RD-11 — Disposable staging sacrifices reconstructability without a stated evidence consequence

Classification: MATERIAL DECISION REQUIRED — MEDIUM
Evidence: acquisition bytes are retained for 90 days, are not backed up and are permanently represented only by digest and size and media-type metadata unless submitted to CAP-04.
Required decision: state what claims remain supportable after purge and what audit disputes become EVIDENCE REQUIRED.

Record: new to the roadmap and stock-take. Related: stock-take, section 9, "Raised by CAP-02": staged items lost in a restoration are acquired again; that concerns restoration, not what remains supportable after the 90 days. Disposition: recorded here; not an open decision in this change.

### RD-12 — Refusals have no governed history

Classification: MATERIAL DECISION REQUIRED — MEDIUM
Evidence: AAB-PLATFORM-06 says refusal writes nothing to the governed domain store and leaves only operational logs; a governed refusal history is deferred.
Required decision: before production, decide whether a minimal non-content refusal receipt is mandatory, with reason code, actor, time, request digest and protected-data minimisation.

Record: restates an existing item. Stock-take, section 9, "From AAB-PLATFORM-05 to 07", 06: a governed refusal history, as a future capability, not a current requirement. Related: roadmap, section 1, primitive 9: failed attempts leave no audit record (SCS-CAP-08). The review turns a deferral into a decision required before production. Disposition: stock-take, open decision 15, more pressing after #119.

### RD-13 — Main Brain packet and Intelligent Node contracts are still proposals

Classification: DESIGN BOUNDARY — MEDIUM
Required decision: no Main Brain implementation until packet schemas, admissible inputs, authority checks, model and rule identity, failure semantics and output lifecycle are canonical.

Record: restates an existing item. Roadmap, "Still open", the domain register's other open questions: the Main Brain's canonical name and identity, and the governed knowledge packet and the Intelligent Node Model as contracts; stock-take, section 9, "Raised by the domain register and cognitive architecture". The review adds an explicit rule: no Main Brain build before them. Disposition: the existing item continues.

### RD-14 — Capability admission authority is intentionally temporary and must not become the production norm by inertia

Classification: GOVERNANCE DECISION REQUIRED — MEDIUM
Required decision: retain the temporary label; define the future platform-wide contract authority separately from country deployment and commissioning authority.

Record: related to existing items, not a restatement. Roadmap, section 5.5: the admission authority, defined with the pilot joint authority of the Platform Owner and the founding institution's representative (PRs #28, #29), not yet constituted. The question of what replaces the pilot authority is not recorded elsewhere. Disposition: recorded here; not an open decision in this change.

### RD-15 — Later amendments have not reconciled stale open-gap and dependency text

Classification: TRACEABILITY DEFECT — MEDIUM
Evidence: CAP-06 and CAP-07 still say CAP-10 and CAP-11 have no contract; CAP-08 still lists CAP-10 and permit gaps in pre-amendment form; CAP-09 still says CAP-10 does not exist; CAP-10 still lists CAP-11 as absent; CAP-11 still lists CAP-12 as undefined.
Required action: a clerical-only reconciliation PR should mark each stale row or gap CLOSED, PARTIALLY CLOSED or SUPERSEDED BY with the amendment reference.

Record: new. Stock-take, drift item 27. Disposition: a clerical PR, separate from this change, changing nothing substantive. Stale rules-version comments in CAP-01, CAP-05, CAP-06, CAP-07, CAP-08, CAP-10 and CAP-11, found while drafting #119, are corrected in the same PR, recorded there as outside this finding's scope (stock-take, drift item 28).

### RD-16 — Review provenance is not machine-readable

Classification: TRACEABILITY DEFECT — LOW/MEDIUM
Required decision: introduce a small review-attestation record covering artifact SHA, reviewer identity and type, scope, conflicts, outcome, findings, disposition commit and timestamp. Do not retroactively manufacture reviews.

Record: new. Disposition: stock-take, open decision 16, more pressing after #119. This record is itself prose, and is not such an attestation.

## 5. Decisions assessed as sound

1. Automated brains may reason, but automated output is not governed truth or authority.
2. Persistent machine state is versioned, evidence-linked, labelled, reversible and separate from scientific memory.
3. Protected country information and derivatives remain within the sovereign boundary. Transformation does not remove sovereignty.
4. No global Main Brain absorbs country knowledge; domains return bounded packets.
5. Authentication is not authority; authority is resolved from persisted server-side records.
6. Digests prove equality to canonical bytes, not truth, authenticity, sufficiency or authority.
7. Record admission is separate from scientific promotion.
8. Human review is attributable, signed, immutable, challengeable and bound to exact evidence and evaluation digests.
9. Capability admission, Gate D and country commissioning are separate non-automatic decisions.
10. The overview accurately scopes pilot proven claims.
11. CAP-02's prohibition on caller URLs, unapproved destinations, guessed mappings and automatic knowledge creation is strong.
12. The parallel-development protocol's pinned baselines, one-owner-per-file rule, no shared live environment and mandatory handover are appropriate.

Record: the numbering is this record's; the review lists them unnumbered. An assessment as sound is the reviewer's view, and confers nothing: none of these decisions is admitted, verified or approved by it.

## 6. Recommended correction order

1. Before extraction and new capability implementation: RD-01 to RD-04 and RD-15.
2. Before any real AGR data: RD-05, RD-09, RD-10 to RD-12.
3. Before CAP-10, CAP-11 and CAP-08 high-consequence operations: RD-06 to RD-08.
4. Before any Main Brain build: RD-13.
5. Before first admission and production governance: RD-14 and RD-16.

These are non-compensating gates. No aggregate compliance percentage is appropriate.

Record: the numbering is this record's. The order is the review's recommendation. It is recorded, not adopted: no step of AAB's sequence is changed by it, and the roadmap's order of work stands (roadmap, sections 5.3 and 8.5). Two differences are noted, neither decided here:
- Step 2 names five findings as gates before real AGR data. The stock-take's section 5 names one item as the remaining blocker before real data, the override credential's governance, which is RD-05's core. Whether section 5 widens is not decided by this record.
- RD-16 sits at step 5 in the review's order. The Platform Owner assesses it as more pressing after #119 (stock-take, open decision 16). Its place in the order is unchanged by that assessment.

## 7. Review limitation and disposition, as stated by the review

This is a technical and governance cross-review by a collaborating AI system, not the independent reviewer required by AAB's admission or Gate-D contracts. It should be treated as an input to controlled correction and human review. No finding should be silently repaired inside an unrelated PR; each substantive change needs a traceable decision and tests where applicable.

Result: the existing architectural direction remains viable, but the listed implementation gates should be resolved before the contracts are treated as executable specifications.

## 8. Disposition (this record's)

| Finding | Classification | Restates | Disposition |
|---|---|---|---|
| RD-01 | Implementation gate, high | Yes: AAB-PLATFORM-07 invalidated admission | Existing item continues; marked most consequential |
| RD-02 | Implementation gate, high | Partly: authority grants for deciding roles; TODO(role-registry) | Open decision 12 |
| RD-03 | Implementation gate, high | No | Open decision 13 |
| RD-04 | Implementation gate, high | No (CAP-04's contract only) | Open decision 14 |
| RD-05 | Real-data gate, high | Yes: override credential, erasure, legal hold | Existing items continue |
| RD-06 | Implementation gate, high | Yes: CAP-11 strong authentication | Existing item continues |
| RD-07 | Implementation gate, medium | Yes: ethics and consent declared in CAP-08 | Existing item continues |
| RD-08 | Implementation gate, medium | Partly: who may hold SAFETY_GOVERNOR | Existing item continues |
| RD-09 | Real-data gate, high | Yes: AAB-PLATFORM-09 bootstrap and custody | Existing items continue |
| RD-10 | Material decision, high | No | Recorded here |
| RD-11 | Material decision, medium | No | Recorded here |
| RD-12 | Material decision, medium | Yes: governed refusal history (06) | Open decision 15 |
| RD-13 | Design boundary, medium | Yes: Main Brain, packet and Intelligent Node | Existing item continues |
| RD-14 | Governance decision, medium | No (related: admission authority) | Recorded here |
| RD-15 | Traceability defect, medium | No | Clerical PR; drift item 27 |
| RD-16 | Traceability defect, low to medium | No | Open decision 16 |

Open decisions 12 to 16 are in the stock-take's section 4, each with the Platform Owner's assessment of why #119 makes it more pressing. The review was made before #119; that assessment is not the review's.

Findings recorded here and not made open decisions (RD-10, RD-11, RD-14) are not dismissed. They wait for their own decision, as the review requires, and this record is where they are found.

## 9. What this record does not establish

- It does not make the review independent, and does not discharge any requirement for an independent reviewer: the dependency audit's, an admission's, or Gate D's.
- It does not adopt the review's findings, classifications or correction order as AAB decisions. Five findings become open decisions; none is decided.
- It does not change any contract, state, control or the commissioning outcome, which remains NOT AUTHORISED.
- It does not re-assess any finding against the contracts as amended by #119.
- It does not repair anything. RD-15 is corrected in its own clerical PR.
