# CAP-11 Regulatory Translation & Dossier Support — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-11 Regulatory Translation & Dossier Support. It is not SCS-CAP-11 (Regulatory Framework Update Management), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-11: HOW A JURISDICTION'S REGULATORY REQUIREMENTS ARE RECORDED FROM THEIR AUTHORITATIVE SOURCES, VERIFIED BY TWO QUALIFIED PEOPLE AND KEPT CURRENT; HOW ADMITTED EVIDENCE IS MAPPED TO THEM BY PEOPLE AND ASSEMBLED INTO A GOVERNED REGULATORY DOSSIER; HOW A REGULATOR'S OWN DECISION IS RECORDED; HOW WHETHER A FIELD TRIAL NEEDS A PERMIT IS DETERMINED; HOW A DOSSIER LEAVES THE COUNTRY, AND WHEN; AND ITS BOUNDARIES WITH CAP-04, CAP-06, CAP-07, CAP-08, CAP-10, CAP-12, THE SCS DOMAIN AND THE PLANNED REGULATORY DOMAIN. Establishes no commissioning, production, Gate D, WP05, scientific-validity, legal, compliance, regulatory-approval or market-access authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-10-02, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-11 had no design contract before this one. Its horizon stays **post-launch** in the CAP-34 fidelity manifest.
**Amended:** 2026-10-02 (market authorisation and manufacturing-activity permits, for CAP-12), with CAP-12's canonical contract; and 2026-10-02, second (integrity, lineage and the AGR vocabulary, under CAP-03), with CAP-03's canonical contract; and 2026-10-02, third (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract.

## The governing principle

> **AAB may organise regulatory evidence, expose gaps and assemble a governed dossier. It does not practise law, declare compliance, grant market access or substitute its decision for that of a regulator. Where permit applicability or authority cannot be established, AAB returns EVIDENCE REQUIRED and the trial does not activate.**

## Amendment of 2026-10-02: market authorisation and manufacturing-activity permits, for CAP-12

**Why.** This contract recorded that CAP-12 "would rely on" CAP-11 before commercial manufacture, "recorded, not defined". CAP-12 now has a contract (`governance/workstream-b/CAP-12-CONTROLLED-MANUFACTURING-TRANSFER-CANONICAL-CONTRACT-2026-10-02.md`). **This amendment gives CAP-11 the two determinations CAP-12 relies on,** approved by the Platform Owner in review on 2026-10-02. The governing principle is unchanged, and nothing else in this contract changes.

**1. A market-authorisation determination.** A `MARKET_AUTHORISATION_DETERMINATION` is a human decision by a qualified `REGULATORY_ASSESSOR`, bound to a verified, current requirement set for the purpose `PRODUCT_REGISTRATION` in the named jurisdiction, and to the subject: **a CAP-07 formulation version, as a product,** with its declared product classification, intended use and distribution pathway.

| Outcome | Class | Means |
|---|---|---|
| `REGULATOR_AUTHORISATION_RECORDED` | `AFFIRMATIVE` | A verified regulator decision (a registration or approval) covers the exact product, version, intended use and jurisdiction, current, with its conditions |
| `MARKET_AUTHORISATION_NOT_REQUIRED_WITHIN_BOUNDARY` | `AFFIRMATIVE` | The verified set's requirements, read against the product, require no prior authorisation for this use and pathway. **It must name:** the jurisdiction; the exact product and version; the intended use; the product classification; the distribution pathway; the verified requirement set relied on; the qualified assessors; and the evidence cut-off and currency |
| `REGULATOR_CONFIRMATION_REQUIRED` | `DEFERRED` | Only the regulator can say. **Blocks** |
| `EVIDENCE_REQUIRED` | `NEGATIVE` | Applicability or authority cannot be established. **Blocks** |

- **`MARKET_AUTHORISATION_NOT_REQUIRED_WITHIN_BOUNDARY` is never a general statement that a product "requires no regulation".** It is shown only with every element above, and with the display block's statement. **Uncertainty produces `EVIDENCE_REQUIRED`, never an inferred exemption.**
- **It needs two qualified assessors,** independent of each other and of the requester; `REGULATOR_AUTHORISATION_RECORDED` needs one, since the regulator decided.
- **Currency:** the set's and the regulator decision's triggers; a new product version; a change of intended use, classification or pathway. **A regulator's suspension, revocation or expiry holds a CAP-12 commercial transfer at once.**
- **Neither affirmative outcome is approval for sale by AAB.** The regulator decides; AAB records.

**2. Permit determinations for manufacturing activities.** The `PERMIT_DETERMINATION` (this contract, "Permit determinations for field trials") also takes, as its subject, **a CAP-12 transfer request for `MANUFACTURING_EVALUATION` or `PILOT_MANUFACTURE`,** bound to its site, its activity, its material and its period, against a verified set for the purpose `MANUFACTURE`. Its outcomes and blocking states are as for trials; a permit's expiry, suspension or revocation holds the transfer at once.

**3. What this amendment replaces.**
- **Decision 23**'s sentence on CAP-12 now reads: CAP-12 relies on CAP-11's market-authorisation determination before a commercial transfer, and on its permit determinations before manufacturing evaluation and pilot manufacture.
- **The contract gap "CAP-12"** is closed.
- **The dependencies row for CAP-12** now reads: **CAP-12 Controlled Manufacturing Transfer: relies on the market-authorisation and activity permit determinations; `designed`, post-launch.**
- **The decision kinds** gain `MARKET_AUTHORISATION_DETERMINATION`, with its receipt.

## Amendment of 2026-10-02 (second): integrity, lineage and the AGR vocabulary, under CAP-03

**Why.** CAP-03 now has a contract (`governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`). It provides the integrity re-check and lineage AGR's evaluations lacked, and the AGR provenance vocabulary, which every AGR capability adopts before implementation (CAP-03, decision 16). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Integrity re-check and lineage.** A `REGULATORY_DOSSIER_EVALUATION` may request a CAP-03 verification run over its snapshot's members; a permit or market-authorisation determination may request one over its basis. The dossier rules become `cap-11-dossier-rules-2`: version 1, with this change. **Where a cited run covers every member, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`; otherwise the disclosure stays. **A lineage evaluation** may be requested for any of its requirement-set verifications, dossiers, assessments, regulator decision verifications and determinations. **No finding is ever shown as "verified" in general,** and none says the evidence is true, sufficient or authentic in the world.

**2. The vocabulary.** CAP-11 adopts `cap-03-vocabulary-1`: its `authorityKind` maps to a source qualifier, its documents to `REGULATORY_SOURCE_TEXT` or `REGULATOR_CORRESPONDENCE`, and its translations and extractions to `TRANSLATION_OF` (CAP-03, "Mappings from existing terms"). **No record is renamed.** A term of CAP-11's own, added later, is registered here and mapped to the vocabulary, or refused (`VOCABULARY_TERM_UNMAPPED`).

**3. How its outputs reference CAP-03.** Each of its requirement-set verifications, dossiers, assessments, regulator decision verifications and determinations may carry `integrity?: { verificationRunIds: string[]; lineageEvaluationId?: string }`, set by the system when a run or evaluation is cited, and shown with the findings by kind and whether they are current.

**4. Failures stay visible.** CAP-03's findings are currency triggers for CAP-11's decisions (CAP-03, "Integrity findings and their consequences"). **A requirement set, regulator decision or determination resting on a document `INTEGRITY_COMPROMISED`** may not be relied on; **a permit or market-authorisation determination relied on by CAP-08 or CAP-12 then holds them,** as a regulator's revocation would. **CAP-03 verifies a document's bytes; whether it is authentic in the world remains CAP-11's verification, by a person.** CAP-11's own egress is unchanged; CAP-03 does not depend on it. **Historical decisions are never rewritten;** their current reliance changes, derived when read. **Missing or failed mandatory verification is always shown,** never hidden or treated as a pass.

**5. Before implementation.** CAP-11's step 4 (code) uses the vocabulary and CAP-03's verification as adopted here.

**6. What this amendment replaces.** The dependencies gain a row: **CAP-03 Evidence Integrity & Provenance: integrity re-check, lineage, the AGR vocabulary and integrity incidents; `designed`, launch release.**

## Amendment of 2026-10-02 (third): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-11, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-11 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-11 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap11RegulatorySource` | Admitted record | `REGULATORY_SOURCE_TEXT` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`); a translation `TRANSLATION_HUMAN` or `TRANSLATION_MACHINE` | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:REGULATORY_SOURCE` |
| `Cap11RegulatoryRequirement`, `Cap11RequirementSet`, `Cap11EvidenceMapping` | Admitted records | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:REGULATORY_REQUIREMENT`, `CAP-11:REQUIREMENT_SET`, `CAP-11:EVIDENCE_MAPPING` |
| `Cap11RegulatorDecisionRecord` | Admitted record | `REGULATOR_CORRESPONDENCE` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL`; a regulator's own change is `changesRegulatorDecision`, never a supersession | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:REGULATOR_DECISION` |
| `Cap11EgressRecord` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:DOSSIER_EGRESS` |
| Change events, `MONITORING_RECORD`, `COUNTRY_GOVERNANCE_EXEMPTION`, `ASSESSOR_QUALIFICATION`, `COUNTRY_REGULATORY_POLICY` | Admitted records, written once (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:RECORD` |
| Machine-proposed candidates (change events, extractions) | Admitted records, held for a person (no interface yet) | `CAPABILITY_OUTPUT` | `AUTOMATED_EXTRACTION` or `TRANSLATION_MACHINE` (`REQUIRED_TRUE`) | `SERVICE` | Never superseded | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-11:CANDIDATE` |
| `Cap11RegulatoryDossier`, determination bases | Evaluations (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-11:REGULATORY_DOSSIER` |
| `REQUIREMENT_SET_VERIFICATION`, `DOSSIER_ASSESSMENT`, `REGULATOR_DECISION_VERIFICATION`, `PERMIT_DETERMINATION`, `MARKET_AUTHORISATION_DETERMINATION`, `COUNTRY_GOVERNANCE_EXEMPTION_APPROVAL`, `EGRESS_AUTHORISATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_REGULATORY_POLICY_APPROVAL`, `CAP11_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** The `integrity?` reference of the amendment of 2026-10-02 (second) is **derived when read.**

**3. Supersession.** **The platform's `supersedes` is added** to sources, requirements, sets and mappings, which check 7 already validates. **The regulator decision's `supersedes` is renamed `changesRegulatorDecision`:** a regulator's amendment, suspension or revocation is the regulator's act, recorded as a new regulator decision naming the decision it changes, never a platform supersession. A regulator decision recorded wrongly is corrected by the platform's `supersedes`, reason `CORRECTION`.

**4. Citations.** Every reference CAP-11 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-11 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Source `document` | Subject | `EXTRACTED_FROM` | `CAP-04:MEMORY_RECORD` (`DOCUMENT`) | Yes | Refusal `EVIDENCE_NOT_ADMITTED` (check 3) |
| Source `translation.of` | Subject | `TRANSLATION_OF`; **now resolved** | `CAP-11:REGULATORY_SOURCE` | Yes, for a translation | Refusal `RECORD_NOT_FOUND` |
| Requirement `sources[]` | Mandatory evidence | `EXTRACTED_FROM`, the provision a qualifier | `CAP-11:REGULATORY_SOURCE` | Yes | Refusal `AUTHORITATIVE_SOURCE_REQUIRED` (check 4) |
| Set `requirements[]` | Authority or membership | `PART_OF`; **the digest is resolved by the system,** no longer declared | `CAP-11:REGULATORY_REQUIREMENT` | Yes | Refusal `REQUIREMENT_SET_INCONSISTENT` (check 6) |
| Mapping `requirementSet`, `requirement`, `subject` | Subject | `REFERS_TO` | `CAP-11:REQUIREMENT_SET`, `CAP-11:REGULATORY_REQUIREMENT`, the subject's kind | Yes | Refusal `REQUIREMENT_SET_NOT_VERIFIED` / Refusal `RECORD_NOT_FOUND` |
| Mapping `evidence[]` | Mandatory evidence | `SUPPORTS`; **CAP-10 outcomes now cite each decision's identifier and digest** | `CAP-04:MEMORY_RECORD`, `AAB-PLATFORM-08:HUMAN_DECISION`, `CAP-11:REGULATOR_DECISION` | Yes: the mapping is its evidence | Refusal `EVIDENCE_NOT_ADMITTED`; evidence that later stops being current shows as `NOT_MAPPED` in the dossier, as before |
| Regulator decision `subject` | Subject | `REFERS_TO` | The subject's kind, where it has one | Yes, when it names a record | Refusal `RECORD_NOT_FOUND`; a declared subject stays declared |
| Regulator decision `authenticityEvidence[].document` | Mandatory evidence | `SUPPORTS` | `CAP-04:MEMORY_RECORD` (`DOCUMENT`) | Yes | Refusal `EVIDENCE_NOT_ADMITTED` |
| Regulator decision `changesRegulatorDecision` | Subject | `REFERS_TO`, qualifier `CHANGES`: resolves the earlier decision's identifier, version, digest, issuing authority and jurisdiction | `CAP-11:REGULATOR_DECISION` | Yes, when declared | Refusal `RECORD_NOT_FOUND`; a different issuing authority or jurisdiction also refuses (`REQUEST_VALIDATION_FAILED`) |
| Egress `authorisationDecisionId`, `package` | Authority or membership | `RELIED_ON`; the package by its `packageDigest` and `renditionDigest` | `AAB-PLATFORM-08:HUMAN_DECISION`; the package | Yes | Refusal `EGRESS_NOT_AUTHORISED` |
| Egress `legalBasisEvidence[]` (added) | Mandatory evidence | `SUPPORTS` | `CAP-04:MEMORY_RECORD` | Yes | Refusal `EVIDENCE_NOT_ADMITTED` |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Regulatory source | N/A: its source is the cited CAP-04 `DOCUMENT`, required by check 3 | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Requirement, requirement set, evidence mapping, egress record | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Regulator decision | N/A: its source is the regulator, evidenced by the cited `DOCUMENT`s | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Change event, monitoring record, exemption, qualification, policy | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Machine-proposed candidate | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Dossier, determination bases | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-11 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Every CAP-11 record is submitted by a `HUMAN`,** except **machine-proposed candidates,** service-submitted under AAB-PLATFORM-05, section C, and held for a person.

**8. People in content.** **`interpretation.author` is exactly one of** `actorReference` (when the author acted in AAB in that role, as the submitting curator) **or `declaredPerson`** (`{ name, role, qualification? }`, as declared: an author outside AAB, such as an external legal professional) (AAB-PLATFORM-05, decision 13). `preparedBy` and `irreversibilityAcknowledgedBy` act in AAB, and stay `ActorReference`s.

**9.** **Digests inside records are typed** (AAB-PLATFORM-10): `sourceDigest`, `sourceDigests[]` and `documentDigest` are `objectDigest`s of the cited documents' originals, set by the system from CAP-04; the egress `packageDigest` and `renditionDigest` are those types.

**10.** **`Cap11EgressRecord` gains `recordVersion`** (always 1: written once, corrected only by supersession).

**11.** **The egress `legalBasis`** stays a declared statement, and **cites the evidence it rests on** in the added `legalBasisEvidence[]`, as admitted CAP-04 documents by version (AAB-PLATFORM-05, section F).

**12. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Why this contract, and what it adopts

**Why.** Four committed contracts defer regulatory status to CAP-11:
- **CAP-06** (decision 8) records an ingredient's regulatory status as declared, not verified, "CAP-11's to govern when it has a contract", and every dossier discloses `REGULATORY_STATUS_DECLARED_NOT_VERIFIED`.
- **CAP-07** and **CAP-10** carry `REGULATORY_STATUS_NOT_ASSESSED` on every dossier and outcome "until CAP-11 has a contract and an assessment it defines can be cited".
- **CAP-08** (decision 5) records permits as declared and addressed, not verified, and leaves which permits a country requires as an open gap.

**The domain register and cognitive architecture** (`governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`) lists **Regulatory** as a planned domain that "converts admitted evidence and approved outcomes into regulatory assessments, dossiers and jurisdiction-specific requirements", and leaves its relationship to CAP-11 open (section 22, question 4). **This contract answers it for CAP-11** (decision 21).

**Its description** (the overview, section 7.3): CAP-11 "assembles governed evidence toward regulatory dossiers, when authorised". **The name is kept** (decision 1): CAP-11 helps qualified people identify requirements, map evidence and assemble dossiers. It is not a regulator or a legal adviser.

The evidence is the step 0 snapshots, **with all of `regulatory_core` read in full,** and every regulatory path in `country_core`, `manufacturing_core`, `agriculture`, `cognitive_core`, `continuity_core` and the gateway ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-11 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a regulatory dossier and a permit determination's basis are evaluations over persisted snapshots.
- **AAB-PLATFORM-08 (attributable human review):** verifications, assessments, regulator-decision verifications, permit determinations, qualification reviews, exemptions, egress authorisations and challenges are human decisions.
- **AAB-PLATFORM-02 (governed document rendition)** and **the platform's package compilation (primitive 8):** a submission package is compiled and rendered by them (decision 16).
- **CAP-04 as amended:** source texts, translations, regulator correspondence, permits and registrations are admitted CAP-04 `DOCUMENT` records, with their originals stored under CAP-04's AGR use of AAB-PLATFORM-01, read for the purpose `REGULATORY_DOSSIER`.
- **CAP-06, CAP-07, CAP-08 and CAP-10,** as amended on 2026-10-02 with this contract.
- **The platform's observation and brain governance,** the brain boundary in the purpose and values, **the domain register and cognitive architecture**, **the country scientific data non-return boundary**, and **the egress specification** (`governance/AAB-COUNTRY-DATA-EGRESS-TECHNICAL-CONTROL-SPEC-2026-09-13.md`): CAP-11 is bound by them, and cites them.

AAB-PLATFORM-01 is **not adopted directly:** CAP-11 stores no originals of its own; every document it relies on is a CAP-04 record. AAB-PLATFORM-04 is **not adopted:** nothing in CAP-11 is submitted on behalf of another party.

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review, with corrections recorded in the same review):
1. **Capability identifier `CAP-11`, named "Regulatory Translation & Dossier Support",** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-11:`. Receipts are accepted already (migration 025). **"Regulatory Intelligence" is not used:** it overstates AAB's authority. CAP-10's dependency row, which used it, is corrected in the same change as a recorded clerical correction.
2. **The governing principle above is binding** on every part of this contract.
3. **Record kinds:** a regulatory source; a regulatory requirement; a requirement set, versioned; its verification; a monitoring record; a change event; a regulatory dossier and its assessment; a regulator decision record and its verification; a permit determination; a country governance exemption; an egress record; an assessor's qualification; and the country's regulatory policy. **No readiness percentage, score or rank** is carried across.
4. **A country owns its copy, its evidence and its working analysis. It does not rewrite another jurisdiction's law.** Every requirement records its issuing jurisdiction and authority, its territorial level, its authoritative source, the official language, the provenance of any translation, its effective and repeal dates, the date accessed, the source's digest, whether it is binding, who interpreted it and their qualification, and every unresolved ambiguity. **Each source declares what kind of authority it carries** (decision 5). **Nothing applies across jurisdictions automatically.**
5. **Kinds of authority, never confused:** authoritative legislative or regulatory text; regulator-issued guidance; court or tribunal decisions; standards and official forms; professional legal interpretation; the country workspace's interpretation; machine-assisted extraction; unofficial translation; and regulator confirmation. **Only the first two, a court decision and a regulator's confirmation, state the law or the regulator's position;** every other kind is shown as interpretation.
6. **A requirement set is verified by two qualified people, fail closed.** A qualified `REGULATORY_CURATOR` prepares it; an independent qualified `REGULATORY_ASSESSOR` verifies it. **Neither verifies their own work.** Qualifications are jurisdiction- and subject-scoped, conflicts are declared, and **a verification binds to the exact source versions and digests.** An unverified set is never assessed against.
7. **Subjects:** a CAP-06 ingredient or candidate version and a CAP-07 formulation version, for a dossier; a CAP-08 trial, for a permit determination.
8. **A dossier maps admitted evidence to requirements, and a person declares every mapping.** Nothing is inferred. It cites admitted CAP-04 records and CAP-10 outcomes, keeps per-requirement statuses, and has **no percentage or rank.**
9. **Dossier outcomes:** `DOSSIER_EVIDENCE_MAPPING_COMPLETE`, `DOSSIER_EVIDENCE_MAPPING_INCOMPLETE`, `LOCAL_STUDY_REQUIRED`, `REGULATOR_CONFIRMATION_REQUIRED`, `CONFLICTING_REQUIREMENTS_REQUIRE_REVIEW`, `DEFERRED_EVIDENCE_REQUIRED` and `DOSSIER_NOT_READY_FOR_AUTHORISED_SUBMISSION`. **AAB reports dossier state; it never declares that a requirement is satisfied in law, or that submission is impossible.** Every outcome displays the jurisdiction, the requirement set and version, the effective date, the cut-off, the gaps, and the statement that it is not legal advice, approval or market access.
10. **A regulator decision record records the regulator's act.** CAP-11 never converts AAB's assessment into a regulatory approval. **Authenticity rests on recorded evidence:** an official regulator portal or registry, regulator-issued correspondence, a verifiable digital signature, an official reference number, the document's digest and its capture time. A person verifies it, and **the evidentiary basis of their verification is recorded.**
11. **Labels are replaced only by evidence.** `REGULATORY_STATUS_NOT_ASSESSED` and `REGULATORY_STATUS_DECLARED_NOT_VERIFIED` are replaced only by a valid, current CAP-11 outcome or a verified regulator decision, **for that exact version and jurisdiction.** Never by this contract existing.
12. **Trial permits: a hard, fail-closed gate.** CAP-08 activation requires a valid, current permit determination of `PERMIT_NOT_REQUIRED`, with its verified requirement-set basis; `VALID_PERMIT_RECORDED`, for the exact activity, site, country and period; or `COUNTRY_GOVERNANCE_EXEMPTION_RECORDED`, with its authority. **Activation is blocked** while permit applicability is unknown, the requirement set is unverified, a required permit is missing or expired, a permit's scope does not cover the trial, its authenticity is unresolved, or its conditions conflict with the protocol.
13. **The release-order consequence, recorded:** CAP-11 is post-launch, and the gate depends on it. **Until CAP-11 is built, no CAP-08 trial can be activated:** CAP-08 is research and design only, or a launch that includes CAP-08 explicitly excludes trial activation requiring regulatory permission. Bringing permit determination forward is a release decision for the Platform Owner (open item).
14. **Roles:** `REGULATORY_CURATOR` and `REGULATORY_ASSESSOR`, each effective only within a qualification reviewed by a `REGULATORY_GOVERNOR`; `REGULATORY_REQUESTER`; `REGULATORY_GOVERNOR`; `REGULATORY_READER`. **A generic regulatory administrator role is not carried across.** Independence as in CAP-10.
15. **Currency is event-driven, under a 12-month pilot ceiling.** A legislative amendment, regulator guidance, a court decision, a product reclassification, a permit-condition change, a new destination-market rule, or a change in the exact formulation or intended use makes what relied on the interpretation potentially stale at once. Country policy may set shorter periods. **The absence of a detected change never proves currency where monitoring evidence is missing:** a requirement set past its monitoring period is `UNDETERMINED`.
16. **Packaging:** a submission package is compiled by the platform's package compilation primitive and rendered under AAB-PLATFORM-02.
17. **A dossier stays in the country until a person authorises its release.** An egress record names who authorised it, the declared purpose and legal basis, the exact recipient and destination, the exact package digest, the minimisation and redaction performed, the protected-information classification, the transmission method, the encryption evidence, the time and a correlation reference, the receipt or acknowledgement, the regulator's reference number, and any onward-disclosure limitation. **The authoriser acknowledges, before transmission, that information leaving the sovereign environment may not be recoverable.** Classification follows a dossier's contents; protected scientific, personal or commercial information stays governed wherever it is.
18. **EUDR stays with SCS.** EUDR due diligence has a coherent domain home in SCS-CAP-01 to SCS-CAP-09. **CAP-11 does not duplicate it, and imports no SCS module.** A future pathway by which AGR provides a bounded evidence packet to an SCS capability is a governed cross-domain decision of its own, preserving country sovereignty, source-domain provenance and purpose limitation, with no automatic cross-country transfer, no platform dependency on either domain, and **no assumption that AGR evidence proves EUDR compliance.**
19. **Machines may** detect potential regulatory changes, extract candidate provisions, compare versions, identify missing mappings, flag expiry, and assemble a verified evidence package. **Machines may never** verify a requirement, decide legal applicability, interpret ambiguity authoritatively, declare compliance, invent market access, or record a regulator's decision. The dossier is **deterministic assembly and rule evaluation over human-verified requirement mappings.**
20. **Country regulatory policy may add requirements, never remove platform floors:** shorter currency and monitoring periods, mandatory local review, the exemptions the country's law recognises and who may record them.
21. **CAP-11 owns AGR's regulatory workflow and its decisions. It does not become the planned Regulatory domain,** which would supply requirement knowledge as governed evidence.
22. **Regulatory records stay in the country.** Requirement sets, dossiers, determinations and their decisions belong to the country workspace; their sharing classification follows their contents.
23. **CAP-06, CAP-07, CAP-08 and CAP-10 are amended in the same change as this contract** (each, "Amendment of 2026-10-02, second"). CAP-12 has no contract: its reliance on CAP-11 before commercial manufacture is recorded, not defined.
24. **The horizon is unchanged.** CAP-11 stays post-launch; this contract changes no release classification.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People record what a jurisdiction's law and regulators require, from the authoritative sources, and two qualified people check it. People say which admitted evidence answers which requirement. AAB assembles that into a dossier and shows, requirement by requirement, what is mapped, what is missing and what only the regulator can confirm. When a regulator decides, AAB records the regulator's decision, with the evidence that it is genuine. AAB never decides that anything is lawful, compliant, approved or allowed onto a market.**

CAP-11 keeps the governed record of regulatory requirements, dossiers, regulator decisions, permit determinations and dossier releases, and the decisions of the people who make them. It does not admit evidence (CAP-04), assess safety (CAP-10), run trials (CAP-08), decide what may be manufactured (CAP-12), perform EUDR due diligence (SCS), or give legal advice.

## What CAP-11 answers, and what it does not

| Question | Answered by |
|---|---|
| What does this jurisdiction's law or regulator require, from which source, in force when? | **CAP-11**, a verified requirement set, recorded by people from authoritative sources |
| Which admitted evidence answers which requirement, and what is missing? | **People's mappings,** assembled in a CAP-11 dossier |
| Is this dossier's evidence mapping complete for that requirement set? | **A qualified person,** by an assessment in CAP-11 |
| Does this field trial need a permit, and is a valid one recorded? | **A qualified person,** by a permit determination in CAP-11 |
| Has the regulator registered, permitted or approved it? | **The regulator.** CAP-11 records the regulator's decision, verified as authentic |
| Is it lawful, compliant, approved or allowed onto a market? | **Not AAB.** The regulator, the courts, and the people's own legal advisers |
| Is it safe? | CAP-10, within its boundary; never CAP-11 |
| Does this commodity meet EUDR? | The SCS domain, never CAP-11 |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** all of `regulatory_core` (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/regulatory_core/`: 9 tables, 4 functions, 1 view, no triggers, every grant and row-level security setting); in `country_core`, the regulatory security gate, regulatory access events, workspace membership and invitations, the security policy, country ingredient availability, the global ingredient knowledge, and the bootstrap brief and scan; `manufacturing_core`'s transfer package; the jurisdiction fields of `agriculture` (`evidence_source`, `country_resource_investigation`); `cognitive_core`'s `regulatory_unknowns`; `continuity_core`'s count of dossier passports; and the gateway (`api.php`).

**What it does, as read:**
- **A sound data model:** jurisdiction, then regulatory authority, then regulatory source (law, regulation, guideline, form, standard, ministry notice, official web source), with a verification status, then regulatory requirement (per jurisdiction and product category, with flags for a local study and the local language, and effective dates); change events; a **"dossier passport"** (subject, product category, status) with evidence links carrying a role and a sharing classification; and a **translation run** against a destination jurisdiction, giving each requirement one of `COMPLETE`, `PARTIAL`, `MISSING`, `NOT_APPLICABLE`, `CONFLICTED`, `REQUIRES_LOCAL_STUDY` or `REQUIRES_REGULATOR_CONFIRMATION`, and a **`readiness_percent`**, (complete + 0.5 × partial) ÷ total.
- **An honest translation** (`api_run_dossier_translation`, `functions.sql`, lines 61 to 86). It reads only verified, current, in-force requirements. With none, the run is `BLOCKED`: "AAB will not invent dossier readiness." With some, every requirement starts `MISSING` or `REQUIRES_LOCAL_STUDY`: "Requirement matching is deliberately not guessed."
- **Nothing can get past it.** No function writes jurisdictions, authorities, sources, requirements, change events, evidence links or a passport's status, and none verifies a source. A translation is always `BLOCKED`, or 0% ready if rows were loaded by hand. The country brief says so: sources "must be loaded/versioned before Dossier Passport translation can calculate readiness" (`country_core/functions.sql`, line 629).
- **The gateway does not reach it.** No `regulatory_core` function is exposed; `regulatory_context` and `regulatory_reauth` are retired legacy actions returning 410 (`api.php`, line 259).
- **Authority is weak.** The functions are `SECURITY DEFINER`, executable by `PUBLIC`, and take the actor's identifier from the caller. Access is `HEAD_ADMIN`, or `REGULATORY_ADMIN` with a flag (`api_actor_can_access_regulatory`). **The regulatory security gate's settings (status, MFA, re-authentication, a second reviewer for regulatory changes) are never checked;** the gate is `SUSPENDED` for rehearsal workspaces, unenforced. Row-level security is disabled on all nine tables.
- **Jurisdictions and requirements are global,** not owned by any country. Deleting a passport cascades to its evidence links and its assessments.
- **Elsewhere:** `country_ingredient_availability.regulatory_status` is free text, default `UNASSESSED`, with no writer; starter ingredients carry `universal_regulatory_approval_claimed = false`; the manufacturing transfer allows `COMMERCIAL_MANUFACTURE` with no regulatory gate (CAP-07 recorded it); `regulatory_unknowns` is fixed text.

**In one line:** the rehearsal has a sound regulatory model and an honest fail-closed translation, but nothing populates, verifies, secures or uses it. **No regulatory assessment ever happens.**

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Jurisdiction, authority, source, requirement | **Kept, in governed form,** with the source's kind of authority, language, translation, digest and binding status, and owned by the country workspace (decisions 4 and 5) |
| `verification_status` with no verifier | **Two qualified people,** neither verifying their own work, bound to source digests (decision 6) |
| The seven per-requirement statuses | **Kept, in governed form,** as mapping statuses declared and assessed by people (decision 8) |
| `readiness_percent` | **Not carried across** (decision 3) |
| `BLOCKED` with no verified requirements; matching not guessed | **Kept:** an unverified set is never assessed against, and every mapping is a person's (decisions 6 and 8) |
| The dossier passport's translation to a destination jurisdiction | **Not carried across as an automatic cross-border translation.** A dossier is assembled against a named jurisdiction's verified set, and leaves the country only by an authorised egress (decision 17) |
| `SECURITY DEFINER`, `PUBLIC`, caller-supplied actor | **Not carried across.** Every actor is server-resolved (AAB-PLATFORM-03) |
| `REGULATORY_ADMIN` and a flag | **Not carried across.** Qualified, scoped roles (decision 14) |
| A gate with MFA, re-authentication and a second reviewer, never checked | **The second reviewer, enforced** (decision 6). **MFA and re-authentication** are platform authentication, recorded as a platform gap |
| Global jurisdictions | **Country-owned working records of each jurisdiction's law** (decision 4) |
| Cascading deletes | **Not carried across.** Nothing is deleted; supersession only |
| Free-text `regulatory_status` | **Declared in CAP-06, replaced only by evidence** (decision 11) |

**Kept, in governed form:** fail closed when requirements are not verified; never guess a mapping; local study and regulator confirmation as first-class states; never claim universal regulatory approval.

**Not carried across, in any form:** readiness percentages; requirement data no one can write; a security gate that is configured and not enforced; global requirement tables; caller-chosen actors; deletion.

**The rehearsal's data is not CAP-11's.** CAP-11's records start empty in a new deployment.

**The CAP-34 simulation's "Governed Export-Compliance Evidence" preview** pairs CAP-03 and CAP-11 "including EUDR". It was written on 2026-09-20, before the platform–domain separation. **It is superseded for CAP-11 by the platform–domain split:** EUDR has its domain home in SCS, and stays there (decision 18). Its limitations ("dossier completeness does not equal regulatory approval, certification, customs acceptance or market access") are adopted.

## Sources, requirements and requirement sets

Every CAP-11 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap11RegulatorySource {
  recordId: string;
  recordVersion: number;
  recordKind: "REGULATORY_SOURCE";
  schemaVersion: "urn:aab:schema:agr:cap-11:regulatory-source:1";
  countryWorkspaceId: string;            // the country keeping this working record
  provenance: Provenance;

  issuingJurisdiction: { code: string; name: string; territorialLevel: "SUPRANATIONAL" | "NATIONAL" | "STATE_OR_PROVINCE" | "LOCAL" | "OTHER" };
  issuingAuthority: string;
  authorityKind:
    | "AUTHORITATIVE_LEGISLATION_OR_REGULATION"
    | "REGULATOR_GUIDANCE"
    | "COURT_OR_TRIBUNAL_DECISION"
    | "STANDARD_OR_OFFICIAL_FORM"
    | "PROFESSIONAL_LEGAL_INTERPRETATION"
    | "COUNTRY_WORKSPACE_INTERPRETATION"
    | "MACHINE_ASSISTED_EXTRACTION"
    | "UNOFFICIAL_TRANSLATION"
    | "REGULATOR_CONFIRMATION";
  binding: "BINDING" | "NON_BINDING" | "UNDETERMINED";
  title: string;
  officialReference: string;             // the instrument's citation or number
  officialLanguage: string;
  document: { memoryRecordId: string; recordVersion: number };   // an admitted CAP-04 DOCUMENT: the original, its digest and capture time
  sourceDigest: string;                  // set by the system from CAP-04
  accessedAt: string;
  effectiveFrom?: string;
  repealedOrSupersededAt?: string;

  translation?: {                        // where the text relied on is not in the official language
    of: { recordId: string; recordVersion: number };              // the source translated
    translator: string;
    kind: "OFFICIAL" | "CERTIFIED" | "UNOFFICIAL" | "MACHINE";
  };

  recordDigest: string;
}

interface Cap11RegulatoryRequirement {
  recordId: string;
  recordVersion: number;
  recordKind: "REGULATORY_REQUIREMENT";
  schemaVersion: "urn:aab:schema:agr:cap-11:regulatory-requirement:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  requirementCode: string;               // unique within its set
  issuingJurisdiction: Cap11RegulatorySource["issuingJurisdiction"];
  issuingAuthority: string;
  sources: Array<{ recordId: string; recordVersion: number; provision: string }>;   // at least one AUTHORITATIVE_LEGISLATION_OR_REGULATION or REGULATOR_GUIDANCE
  binding: "BINDING" | "NON_BINDING" | "UNDETERMINED";

  appliesTo: {
    subjectKinds: Array<"INGREDIENT" | "FORMULATION" | "FIELD_TRIAL">;
    productCategories: string[];         // as the source defines them
    purposes: Array<"PRODUCT_REGISTRATION" | "IMPORT" | "EXPORT" | "FIELD_TRIAL" | "MANUFACTURE" | "OTHER">;
  };
  statement: string;                     // what is required, in the curator's words
  evidenceExpected: string[];            // the kinds of evidence that could answer it
  localStudyRequired: boolean;
  localLanguageRequired: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;

  interpretation: {
    author: ActorReference;
    qualificationDecisionId: string;     // the author's approved qualification (decision 14)
    reasoning: string;
    unresolvedAmbiguities: string[];     // never empty by default: "none known" must be stated
  };

  recordDigest: string;
}

interface Cap11RequirementSet {
  recordId: string;
  recordVersion: number;                 // a new version for any change, written in full
  recordKind: "REQUIREMENT_SET";
  schemaVersion: "urn:aab:schema:agr:cap-11:requirement-set:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  jurisdiction: Cap11RegulatorySource["issuingJurisdiction"];
  purpose: "PRODUCT_REGISTRATION" | "IMPORT" | "EXPORT" | "FIELD_TRIAL" | "MANUFACTURE" | "OTHER";
  subjectKind: "INGREDIENT" | "FORMULATION" | "FIELD_TRIAL";
  productCategories: string[];
  requirements: Array<{ recordId: string; recordVersion: number; recordDigest: string }>;
  sourceDigests: string[];               // set by the system: every source each requirement cites
  monitoring: { reviewPeriodDays: number; method: string };       // how change is watched for (decision 15)
  scopeStatement: string;                // what the set covers, and what it knowingly does not

  preparedBy: ActorReference;            // a qualified REGULATORY_CURATOR
  recordDigest: string;
}
```

**Field rules:**
- **The system sets** the identity fields, the country, the provenance fields, `sourceDigest`, `sourceDigests` and every digest. A request that supplies any of them is refused.
- **A requirement cites at least one source of the kind `AUTHORITATIVE_LEGISLATION_OR_REGULATION` or `REGULATOR_GUIDANCE`.** One resting only on interpretation, translation or extraction is refused (`AUTHORITATIVE_SOURCE_REQUIRED`).
- **A source of the kind `MACHINE_ASSISTED_EXTRACTION` or `UNOFFICIAL_TRANSLATION`** is shown as such everywhere it is cited, and is never the only text a verifier reads.
- **No record states its own verification, currency or effect.** Those are people's decisions and derived state.
- **A country's working record of another jurisdiction's law is never shown as that law.** Every display of a requirement names its issuing jurisdiction and authority, its sources and their kinds, and that the interpretation is the country workspace's.

**Admission** (rules version `cap-11-admission-1`), for sources, requirements and sets, in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `CURATOR_AUTHORITY`: `REGULATORY_CURATOR` within a valid, current qualification covering the jurisdiction and subject kind | **Refuses:** `ROLE_NOT_AUTHORISED`, or `CURATOR_NOT_QUALIFIED` |
| 2 | `RECORD_COMPLETE`: the required fields, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `DOCUMENT_ADMITTED`: every cited document is an admitted, current CAP-04 `DOCUMENT`, readable for `REGULATORY_DOSSIER` | **Refuses:** `EVIDENCE_NOT_ADMITTED` |
| 4 | `AUTHORITATIVE_SOURCE`: a requirement cites at least one authoritative source | **Refuses:** `AUTHORITATIVE_SOURCE_REQUIRED` |
| 5 | `AMBIGUITY_STATED`: a requirement states its unresolved ambiguities, or "none known" | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 6 | `SET_CONSISTENT`: every requirement in a set is current, of the set's jurisdiction, and applies to its subject kind and purpose | **Refuses:** `REQUIREMENT_SET_INCONSISTENT` |
| 7 | `SUPERSESSION_VALID` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 8 | `TRANSLATION_DISCLOSED`: a non-official translation | **Limitation:** `TRANSLATION_NOT_OFFICIAL` |
| 9 | `SENSITIVE_CONTENT`: personal information or traditional knowledge declared | **Held:** `PERSONAL_INFORMATION` or `TRADITIONAL_KNOWLEDGE` |

Held records are decided by a `REGULATORY_GOVERNOR`, never the submitter (`CAP11_HELD_RESOLUTION`).

## Verifying a requirement set

**A requirement set is relied on only while it is verified, `VALID` and `CURRENT`.** A `REQUIREMENT_SET_VERIFICATION` is a human decision (AAB-PLATFORM-08) bound to the set's digest and every source digest it names:

| Outcome | Class | Means |
|---|---|---|
| `VERIFIED_AS_RECORDED` | `AFFIRMATIVE` | The set is a faithful working record of the cited sources, within its scope statement, with its ambiguities stated |
| `CORRECTIONS_REQUIRED` | `DEFERRED` | The reasoning names each correction; a new version is needed |
| `NOT_VERIFIED` | `NEGATIVE` | It cannot be relied on, with reasons |

- **By a qualified `REGULATORY_ASSESSOR`** whose qualification covers the jurisdiction, the subject kind and the purpose, **who prepared no requirement in the set and did not prepare the set.** The preparer and the verifier are the two qualified people (decision 6); neither verifies their own work. Each declares their conflicts.
- **The verifier reads the authoritative text,** not only a translation or an extraction, and says so; where they cannot read the official language, the decision records the translation they relied on and its kind, and the outcome is shown with `TRANSLATION_RELIED_ON`.
- **An ambiguity the verifier cannot resolve** stays on the set, and every dossier shows it.
- **A verification binds to digests.** Any change to a requirement or a source is a new version of the set, verified again.
- **Challenge, as in CAP-10:** another qualified assessor, or the preparer; resolved by a qualified assessor who is neither party; final in CAP-11, as the pilot position.

## Currency and monitoring

**Every verification, assessment, regulator decision and permit determination is relied on only while `VALID` and `CURRENT`.**

**Triggers** (every platform change kind is a trigger), and CAP-11's own:
- **a change event** recorded on any source the set cites: `LEGISLATIVE_AMENDMENT`, `NEW_REGULATOR_GUIDANCE`, `COURT_DECISION`, `PRODUCT_RECLASSIFICATION`, `NEW_DESTINATION_MARKET_RULE`, `SOURCE_REPEALED_OR_SUPERSEDED`, `INTERPRETATION_REVIEW`;
- **a requirement's or source's effective or repeal date** passing;
- **a regulator decision** relied on reaching its expiry, or recorded as amended, suspended or revoked, or its conditions changed;
- **a new version of the subject,** or a change in its intended use;
- **the country's regulatory policy** superseded.

**Change events are recorded by people,** citing the admitted CAP-04 document that evidences the change, or proposed by a machine as a candidate for a curator's triage (decision 19). **A candidate never changes currency until a person records the event.**

**Monitoring.** Each requirement set declares its review period. A `MONITORING_RECORD`, written by a curator, states when the sources were last checked, how, and what was found. **If no monitoring record falls within the review period, every decision relying on the set is `UNDETERMINED`:** the absence of a detected change never proves currency.

**Lapse:** the earliest of the decision's own expiry, the country policy's maximum, and **the platform ceiling of 12 months** (pilot position). **The ceiling is a maximum, not a guarantee.**

## The regulatory dossier

**A dossier is an evaluation** (AAB-PLATFORM-07) of one subject (a CAP-06 or CAP-07 version) against one verified requirement set, for one purpose, over a frozen snapshot of the subject's version, the set and every requirement and source in it, the requester's mappings, every CAP-04 record and CAP-10 outcome mapped, every regulator decision recorded for the subject, and the country's regulatory policy.

```typescript
interface Cap11EvidenceMapping {
  recordId: string;
  recordVersion: number;
  recordKind: "EVIDENCE_MAPPING";
  schemaVersion: "urn:aab:schema:agr:cap-11:evidence-mapping:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  subject: { kind: "INGREDIENT_VERSION" | "FORMULATION_VERSION"; recordId: string; recordVersion: number };
  requirementSet: { recordId: string; recordVersion: number };
  requirement: { recordId: string; recordVersion: number };
  declaredStatus:
    | "EVIDENCE_MAPPED"
    | "PARTIALLY_MAPPED"
    | "NOT_MAPPED"
    | "NOT_APPLICABLE_CLAIMED"
    | "LOCAL_STUDY_REQUIRED"
    | "REGULATOR_CONFIRMATION_REQUIRED";
  evidence: Array<{
    kind: "CAP04_RECORD" | "CAP10_OUTCOME" | "REGULATOR_DECISION";
    memoryRecordId?: string;             // CAP04_RECORD
    recordVersion?: number;              // CAP04_RECORD, REGULATOR_DECISION
    admissionDecisionId?: string;        // CAP04_RECORD: set by the system from CAP-04
    decisionIds?: string[];              // CAP10_OUTCOME: the combined outcome's decisions
    recordId?: string;                   // REGULATOR_DECISION: a verified regulator decision record
  }>;
  reasoning: string;                     // why this evidence answers this requirement, or why not applicable
  recordDigest: string;
}
```

- **Every mapping is a person's,** by a `REGULATORY_REQUESTER`. **Nothing is mapped by inference.** A requirement with no mapping is `NOT_MAPPED`.
- **`NOT_APPLICABLE_CLAIMED`** is a claim, with reasoning, which the assessor addresses by name.

```typescript
interface Cap11RegulatoryDossier {
  evaluationId: string;
  capabilityId: "CAP-11";
  resultType: "REGULATORY_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-11:dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-11-dossier-rules-1"
  subject: Cap11EvidenceMapping["subject"];
  requirementSet: { recordId: string; recordVersion: number; verificationDecisionIds: string[] };
  jurisdiction: Cap11RegulatorySource["issuingJurisdiction"];
  purpose: string;
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  requirements: Array<{
    requirementId: string;
    requirementCode: string;
    binding: string;
    effective: "IN_FORCE" | "NOT_YET_IN_FORCE" | "NO_LONGER_IN_FORCE";
    status:
      | "EVIDENCE_MAPPED"
      | "PARTIALLY_MAPPED"
      | "NOT_MAPPED"
      | "NOT_APPLICABLE_CLAIMED"
      | "CONFLICTED"
      | "LOCAL_STUDY_REQUIRED"
      | "REGULATOR_CONFIRMATION_REQUIRED";
    mappings: string[];
    unresolvedAmbiguities: string[];
  }>;

  findings: Array<{
    findingId: string;
    findingType:
      | "REQUIREMENT_NOT_MAPPED"
      | "PARTIAL_MAPPING"
      | "CONFLICTING_MAPPINGS"
      | "CONFLICTING_REQUIREMENTS"
      | "NOT_APPLICABLE_CLAIMED"
      | "LOCAL_STUDY_REQUIRED"
      | "REGULATOR_CONFIRMATION_REQUIRED"
      | "UNRESOLVED_AMBIGUITY"
      | "TRANSLATION_RELIED_ON"
      | "MAPPED_EVIDENCE_NOT_CURRENT"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "REQUIREMENT_SET_MONITORING_OVERDUE";
    requirementIds?: string[];
  }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundaryStatement: {
    notLegalAdvice: true;
    notRegulatoryApproval: true;
    notMarketAccess: true;
    noPercentageOrRank: true;
    countryWorkingRecordOfTheLaw: true;
  };
}
```

**The rules** (`cap-11-dossier-rules-1`): **deterministic assembly and rule evaluation over human-verified requirement mappings,** exactly reproducible except `evaluatedAt`:
- **Each requirement's status** is the person's declared status, except: `CONFLICTED` where two mappings for it disagree, or where two requirements in the set make incompatible demands of the same evidence; and `NOT_MAPPED` where a mapping cites evidence that is no longer admitted, current or valid (with `MAPPED_EVIDENCE_NOT_CURRENT`).
- **A requirement not in force** at the cut-off is shown, and counted in no finding as satisfied.
- **Every unresolved ambiguity** in the set appears as a finding.
- **`SAFETY_ECOLOGY_NOT_ASSESSED`** appears where the set includes a safety requirement and no CAP-10 outcome is mapped to it.
- **Disclosures, always:** `MACHINE_GENERATED`; `NOT_LEGAL_ADVICE`; `NOT_REGULATORY_APPROVAL`; `NOT_MARKET_ACCESS`; `COUNTRY_WORKING_RECORD_OF_THE_LAW`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`. **Where it applies:** `TRANSLATION_RELIED_ON`; `REQUIREMENT_SET_MONITORING_OVERDUE`.
- **No percentage, score, readiness figure, rank or recommendation.**

## The dossier assessment, and what it permits

**A qualified `REGULATORY_ASSESSOR` assesses a dossier** with a human decision of the kind `DOSSIER_ASSESSMENT`, bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `DOSSIER_EVIDENCE_MAPPING_COMPLETE` | `AFFIRMATIVE` | Every requirement in force is `EVIDENCE_MAPPED`, or `NOT_APPLICABLE_CLAIMED` with reasoning the assessor accepts. **It says the mapping is complete; it does not say a requirement is satisfied in law** |
| `DOSSIER_EVIDENCE_MAPPING_INCOMPLETE` | `DEFERRED` | The reasoning names each requirement not mapped or partially mapped |
| `LOCAL_STUDY_REQUIRED` | `DEFERRED` | A requirement needs a study in the jurisdiction that has not been done |
| `REGULATOR_CONFIRMATION_REQUIRED` | `DEFERRED` | Only the regulator can say whether a requirement applies or is met |
| `CONFLICTING_REQUIREMENTS_REQUIRE_REVIEW` | `DEFERRED` | Requirements or mappings conflict, and need a qualified person's or the regulator's review |
| `DEFERRED_EVIDENCE_REQUIRED` | `DEFERRED` | The evidence needed does not yet exist or is not admitted |
| `DOSSIER_NOT_READY_FOR_AUTHORISED_SUBMISSION` | `NEGATIVE` | The dossier should not be released to a regulator in its present state, with reasons. **It never says submission is legally impossible** |

- **Independence:** never the dossier's requester, never the author of any mapping, never the preparer or verifier of the set, never the subject's curator or author, and no declared conflict.
- **The reasoning addresses** every finding by its identifier, every `NOT_APPLICABLE_CLAIMED` mapping, every unresolved ambiguity, and every disclosure.
- **Refused outright** (`DECISION_NOT_PERMITTED`): `DOSSIER_EVIDENCE_MAPPING_COMPLETE` while any requirement in force is `NOT_MAPPED`, `PARTIALLY_MAPPED`, `CONFLICTED`, `LOCAL_STUDY_REQUIRED` or `REGULATOR_CONFIRMATION_REQUIRED`; any outcome on a set not verified, valid and current; any conclusion stating that the subject is compliant, approved, registered, lawful or allowed onto a market.
- **The display block.** Every response that shows a CAP-11 outcome, in CAP-11 or in a capability relying on it, shows:

```typescript
interface Cap11OutcomeDisplay {
  outcome: string;
  subject: Cap11EvidenceMapping["subject"];       // exact subject and version
  jurisdiction: Cap11RegulatorySource["issuingJurisdiction"];
  purpose: string;
  requirementSet: { recordId: string; recordVersion: number };
  effectiveDate: string;                 // the date the set's requirements were in force for
  cutoff: string;
  gaps: string[];
  unresolvedAmbiguities: string[];
  currency: { validity: string; currency: string; derivedAt: string };
  statement: "This is not legal advice, regulatory approval or market access. It reports the state of a dossier's evidence mapping against the country workspace's verified working record of the named jurisdiction's requirements, as at the cut-off shown.";
}
```

- **What an outcome permits.** `DOSSIER_EVIDENCE_MAPPING_COMPLETE` permits an authorised egress of the dossier (decision 17), and replaces `REGULATORY_STATUS_NOT_ASSESSED` on the subject's version with `REGULATORY_DOSSIER_MAPPING_ASSESSED`, for that jurisdiction and purpose only, with the display block. **Every other outcome replaces the label with its own name and the display block,** so that what is known is shown and nothing more.

## Regulator decision records

**A regulator decision is the regulator's act. CAP-11 records it, and never makes one.**

```typescript
interface Cap11RegulatorDecisionRecord {
  recordId: string;
  recordVersion: number;
  recordKind: "REGULATOR_DECISION";
  schemaVersion: "urn:aab:schema:agr:cap-11:regulator-decision:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  regulator: { jurisdiction: Cap11RegulatorySource["issuingJurisdiction"]; authority: string };
  decisionKind: "REGISTRATION" | "PERMIT" | "APPROVAL" | "EXEMPTION_BY_REGULATOR" | "REFUSAL" | "AMENDMENT" | "SUSPENSION" | "REVOCATION" | "CONFIRMATION_OR_OPINION";
  officialReference: string;             // the regulator's own number
  subject: { kind: "INGREDIENT_VERSION" | "FORMULATION_VERSION" | "FIELD_TRIAL" | "PRODUCT_DECLARED"; recordId?: string; recordVersion?: number; declared?: string };
  scope: { activities: string[]; sites: string[]; crops: string[]; productCategories: string[]; period: { from: string; to?: string } };
  conditions: string[];
  issuedAt: string;
  expiresAt?: string;
  supersedes?: { recordId: string; recordVersion: number };      // an amendment, suspension or revocation names the decision it changes

  authenticityEvidence: Array<{
    kind: "OFFICIAL_PORTAL_OR_REGISTRY" | "REGULATOR_CORRESPONDENCE" | "VERIFIABLE_DIGITAL_SIGNATURE" | "OFFICIAL_REFERENCE_NUMBER" | "DIRECT_PROVIDER_EVIDENCE";
    document: { memoryRecordId: string; recordVersion: number };   // an admitted CAP-04 DOCUMENT
    documentDigest: string;              // set by the system
    capturedAt: string;
    detail: string;                      // e.g. the registry URL and query, or the signature's verification result
  }>;

  recordDigest: string;
}
```

- **A `REGULATOR_DECISION_VERIFICATION`** (`VERIFIED_AUTHENTIC`, `NOT_VERIFIED`, `MORE_EVIDENCE_REQUIRED`) by a qualified `REGULATORY_ASSESSOR` who did not record it. **The reasoning names which authenticity evidence it rests on.** At least one item of evidence must come from the regulator directly: its portal or registry, its correspondence, or its signature. **A document that only looks genuine is never enough.**
- **Until verified, a regulator decision is shown as `REGULATOR_DECISION_RECORDED_NOT_VERIFIED`,** and relied on by nothing.
- **A verified decision** is shown as **`REGULATOR_DECISION_RECORDED`,** with its kind, scope, conditions, expiry and authenticity basis, and the statement that it is the regulator's decision, recorded by AAB. **It supersedes a declared regulatory status in CAP-06 for its subject, version and jurisdiction;** the declaration stays readable.
- **A refusal, suspension or revocation is recorded as readily as an approval.**

## Permit determinations for field trials

**Before a CAP-08 trial is activated, a qualified `REGULATORY_ASSESSOR` determines whether it needs a permit in its jurisdiction,** with a human decision of the kind `PERMIT_DETERMINATION`, bound to the trial's registration and its locked protocol version, and to a verified, current requirement set for the purpose `FIELD_TRIAL` in the trial's jurisdiction.

| Outcome | Class | Means |
|---|---|---|
| `PERMIT_NOT_REQUIRED` | `AFFIRMATIVE` | The verified set's requirements, read against the protocol's activity, site, crops, materials and period, require no permit. **The reasoning names the requirements read** |
| `VALID_PERMIT_RECORDED` | `AFFIRMATIVE` | Every permit required is a verified regulator decision of the kind `PERMIT` (or `EXEMPTION_BY_REGULATOR`) whose scope covers the exact activity, site, country and period, current, with conditions compatible with the protocol |
| `COUNTRY_GOVERNANCE_EXEMPTION_RECORDED` | `AFFIRMATIVE` | A `COUNTRY_GOVERNANCE_EXEMPTION`, approved by a `REGULATORY_GOVERNOR` under the country's policy, names the legal authority for exempting the trial, and covers it |
| `EVIDENCE_REQUIRED` | `NEGATIVE` | **The trial does not activate.** The reasoning names each blocking state |

**The blocking states** (each a finding, any one giving `EVIDENCE_REQUIRED`): `PERMIT_APPLICABILITY_UNKNOWN`; `REQUIREMENT_SET_UNVERIFIED`; `PERMIT_REQUIRED_MISSING`; `PERMIT_EXPIRED`; `PERMIT_SCOPE_DOES_NOT_COVER_TRIAL`; `PERMIT_AUTHENTICITY_UNRESOLVED`; `PERMIT_CONDITIONS_CONFLICT_WITH_PROTOCOL`.

- **Independence:** never the trial's designer, the protocol's author, or the scientist who will activate it.
- **Each permit condition** is listed, and the activation addresses each by name (CAP-08's amendment).
- **Refused outright:** an affirmative outcome while any blocking state holds.
- **Currency:** the set's and each relied-on regulator decision's triggers; a new protocol version; the permit's expiry. **A permit's expiry, suspension or revocation recorded during an active trial places a regulatory hold on further application** in CAP-08 (`PERMIT_NOT_CURRENT`), because a field activity without a required permit cannot continue on AAB's record. A change in the set's interpretation alone discloses and requires a new determination before any new activation.
- **A `COUNTRY_GOVERNANCE_EXEMPTION`** is a record naming the legal authority (instrument and provision, admitted as a CAP-04 document), the class of trial exempted, conditions and expiry, approved by a `REGULATORY_GOVERNOR` and verified by a qualified assessor who is not the governor. **Only exemptions the country's policy recognises may be recorded.**

**The release-order consequence** (decision 13): **until CAP-11 is built, no permit determination exists, and no CAP-08 trial can be activated.** CAP-08 is research and design only until then, or a launch including CAP-08 explicitly excludes trial activation requiring regulatory permission. Bringing permit determination forward is a release decision for the Platform Owner.

## Dossier egress

**A dossier, or a package compiled from it, leaves the country workspace only by an `EGRESS_AUTHORISATION`,** a human decision by a `REGULATORY_GOVERNOR`, after a `DOSSIER_EVIDENCE_MAPPING_COMPLETE` assessment that is valid and current, or, for a submission the regulator has requested regardless, with the outcome named and disclosed.

```typescript
interface Cap11EgressRecord {
  recordId: string;
  recordKind: "DOSSIER_EGRESS";
  schemaVersion: "urn:aab:schema:agr:cap-11:dossier-egress:1";
  countryWorkspaceId: string;
  provenance: Provenance;

  authorisationDecisionId: string;       // who authorised release
  purpose: string;
  legalBasis: string;
  recipient: { authority: string; jurisdiction: Cap11RegulatorySource["issuingJurisdiction"]; addressOrChannel: string };
  package: { packageId: string; packageDigest: string; renditionDigest?: string };   // primitive 8 and AAB-PLATFORM-02
  minimisation: string;                  // what was removed or redacted, and why
  protectedInformation: string[];        // the classifications of what leaves
  transmission: { method: string; encryptionEvidence: string; sentAt: string; correlationReference: string };
  receipt?: { acknowledgedAt: string; acknowledgement: string };
  regulatorReference?: string;
  onwardDisclosureLimits: string[];
  irreversibilityAcknowledgedBy: ActorReference;   // before transmission
  recordDigest: string;
}
```

- **Before transmission,** the authoriser is shown, and acknowledges in the signed decision, that **information leaving the sovereign environment may not be recoverable or revocable,** and exactly what leaves.
- **The egress is checked against the egress specification and the non-return boundary.** Category 2 content (scientific memory, dossiers built on it) leaves only to the named regulator, for the named purpose, minimised. **Classification follows the dossier's contents;** protected scientific, personal or commercial information remains governed.
- **A receipt or acknowledgement,** and the regulator's reference, are recorded when they arrive; their absence is shown as outstanding.
- **AAB never transmits automatically.** Transmission is a person's act, recorded.

## Machines, brains and the Regulatory domain

**CAP-11 cites the platform's observation and brain governance, the domain register and cognitive architecture, and the non-return boundary as binding.**
- **Machines may** (decision 19): detect potential regulatory changes and propose them as candidate change events; extract candidate provisions from an admitted source, recorded as `MACHINE_ASSISTED_EXTRACTION`; compare source versions; identify requirements with no mapping; flag approaching expiries and overdue monitoring; and compile the package for an authorised egress.
- **Machines may never:** verify a requirement or a set; decide whether a requirement applies; interpret an ambiguity authoritatively; map evidence; declare compliance; suggest market access; determine a permit; or record or verify a regulator's decision.
- **The dossier is automated output,** labelled `MACHINE_GENERATED`, reproducible, and separate from any person's decision: **deterministic assembly and rule evaluation over human-verified requirement mappings.**
- **CAP-11 owns AGR's regulatory workflow and decisions, not regulatory knowledge** (decision 21). The planned Regulatory domain, when contracted, supplies requirement knowledge as governed evidence; CAP-11 applies it to a subject. **CAP-11 is not that domain.**

## EUDR, SCS and the cross-domain boundary

- **EUDR due diligence is SCS's:** regulation registration (SCS-CAP-01), evidence requirements, deforestation and custody evidence admission (SCS-CAP-04 and 05), sufficiency evaluation (SCS-CAP-06), package compilation (SCS-CAP-08) and human review (SCS-CAP-09). **CAP-11 does not duplicate any of it.**
- **CAP-11 imports no SCS module, and SCS none of CAP-11's** (the separation decision). Shared mechanisms, such as package compilation, are platform primitives, used by both.
- **A future cross-domain pathway,** by which AGR provides a bounded, governed evidence packet (for example origin or production evidence) to an SCS capability, which decides how it relates to its own requirements, **is a separate governed decision.** It must preserve country sovereignty, source-domain provenance and purpose limitation; involve no automatic cross-country transfer and no platform dependency on either domain; and never assume that AGR evidence proves EUDR compliance.

## The country's regulatory policy

**A `COUNTRY_REGULATORY_POLICY`,** approved by a `REGULATORY_GOVERNOR`, states: the maximum currency of decisions, at most the platform ceiling; monitoring review periods; whether local review is mandatory for foreign requirement sets; **the exemptions the country's law recognises,** each with its legal authority, and who may record them; who may authorise egress; and whether two assessors from one institution may verify the same set. **It never relaxes a platform floor** (`POLICY_BELOW_PLATFORM_FLOOR`). Until a country has one, the floors apply, every outcome discloses `COUNTRY_REGULATORY_POLICY_NOT_DEFINED`, and **no country governance exemption can be recorded.**

## The deciders

**Qualification.** An `ASSESSOR_QUALIFICATION` record, as in CAP-10, with CAP-11's own scope: **the jurisdictions, subject kinds and purposes** the person may curate or assess, their legal or regulatory qualification or recognised competence, their institutions, and their declared conflicts (organisations, products, clients). Reviewed by a `REGULATORY_GOVERNOR`, never the person themselves. **Lapse: 24 months.** A `REGULATORY_CURATOR` or `REGULATORY_ASSESSOR` grant has effect only within a valid, current approval, and only for its scope.

**Independence**, beyond AAB-PLATFORM-08's: a verifier never prepared the set or any requirement in it; an assessor never requested the dossier, authored a mapping, prepared or verified the set, or curated or authored the subject; a regulator decision's verifier never recorded it; a permit determiner never designed the trial or authored its protocol, and never activates it; an exemption's verifier is never its approving governor; and no decider has a declared conflict touching the subject.

**Challenge:** a qualified assessor other than the decider, or the requester or preparer; resolved by a qualified assessor who is neither party. One open challenge per decision. **Final in CAP-11, as the pilot position.** While a challenge to an affirmative decision is open, nothing relies on it.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-11 |
|---|---|
| Scope rules; selection policies | `cap-11-dossier-scope` v1; `REQUESTER_LISTED` (the mappings and what they cite); policy `ALL_ADMITTED` v1, quarantined `EXCLUDE`, disclosed |
| Pinned inputs; integrity re-check; empty snapshot | The subject, the set and its requirements and sources, the regulator decisions, the policy; not required, disclosed; **an empty mapping is allowed,** and gives every requirement `NOT_MAPPED` |
| Evaluator and rules versioning; non-reproducible fields | `cap-11-dossier-rules-1`; `evaluatedAt` |
| Existing evaluations and decisions | **None.** The rehearsal's translation runs and assessments are not mapped |
| Decision kinds | `REQUIREMENT_SET_VERIFICATION`, `DOSSIER_ASSESSMENT`, `REGULATOR_DECISION_VERIFICATION`, `PERMIT_DETERMINATION`, `COUNTRY_GOVERNANCE_EXEMPTION_APPROVAL`, `EGRESS_AUTHORISATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_REGULATORY_POLICY_APPROVAL`, `CAP11_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` |
| Separation of duties beyond the platform's | "The deciders" |
| More than one decider | **A requirement set's preparer and verifier are two qualified people** (decision 6). A country's policy may require two assessors for a dossier assessment or a permit determination |
| Challenging role | A qualified `REGULATORY_ASSESSOR` other than the decider, or the requester or preparer |
| Triggers and lapse | All ten platform change kinds, and CAP-11's own ("Currency and monitoring"); `UNDETERMINED` when monitoring is overdue; the earliest of the decision's expiry, the policy maximum and 12 months |
| What relies on reviews | CAP-06 and CAP-07 displays; CAP-08 activation; egress; each in the same read as its own write |

## Authority

| Role | May |
|---|---|
| `REGULATORY_CURATOR` | **Within a valid, current qualification only:** record sources, requirements, requirement sets, change events and monitoring records; prepare sets; record regulator decisions |
| `REGULATORY_REQUESTER` | Map evidence to requirements; request dossiers and permit determinations |
| `REGULATORY_ASSESSOR` | **Within a valid, current qualification only:** verify sets; assess dossiers; verify regulator decisions and exemptions; determine permits; challenge and resolve challenges |
| `REGULATORY_GOVERNOR` | Review qualifications; approve the country's regulatory policy; approve country governance exemptions; authorise egress; resolve held records |
| `REGULATORY_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name, except machine-proposed candidates, which are labelled and held for a person. **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP11_RECORD_ADMISSION`, `CAP11_HELD_RESOLUTION` | A record is held or admitted; a held record resolved |
| `REQUIREMENT_SET_VERIFICATION` | A set is verified |
| `REGULATORY_DOSSIER_EVALUATION`, `DOSSIER_ASSESSMENT` | A dossier is recorded; assessed |
| `REGULATOR_DECISION_VERIFICATION` | A regulator decision is verified |
| `PERMIT_DETERMINATION` | A trial's permit position is determined |
| `COUNTRY_GOVERNANCE_EXEMPTION_APPROVAL` | An exemption is approved |
| `EGRESS_AUTHORISATION`, `DOSSIER_EGRESS_RECORDED` | Release is authorised; a transmission recorded |
| `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_REGULATORY_POLICY_APPROVAL` | Each is decided |
| `CAP11_DECISION_CHALLENGE`, `CAP11_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-11"`.

| Operation | Route |
|---|---|
| `submitSource`, `submitRequirement`, `submitRequirementSet`, `getRequirementSet` | `POST /agr/v1/regulatory-sources`; `…/regulatory-requirements`; `…/requirement-sets`; `GET /agr/v1/requirement-sets/:recordId`, with its verification and currency derived |
| `verifyRequirementSet` | `POST /agr/v1/requirement-sets/:recordId/verifications` |
| `recordChangeEvent`, `recordMonitoring` | `POST /agr/v1/requirement-sets/:recordId/change-events`; `…/monitoring-records` |
| `submitMapping` | `POST /agr/v1/evidence-mappings` |
| `requestDossier`, `getDossier`, `assessDossier` | `POST /agr/v1/regulatory-dossiers`; `GET …/:evaluationId`; `POST …/:evaluationId/assessments` |
| `recordRegulatorDecision`, `verifyRegulatorDecision` | `POST /agr/v1/regulator-decisions`; `…/:recordId/verifications` |
| `determinePermit`, `getPermitDetermination` | `POST /agr/v1/permit-determinations`; `GET /agr/v1/permit-determinations?trial=` |
| `recordExemption`, `approveExemption` | `POST /agr/v1/country-governance-exemptions`; `…/:recordId/approvals` |
| `authoriseEgress`, `recordEgress` | `POST /agr/v1/regulatory-dossiers/:evaluationId/egress-authorisations`; `POST /agr/v1/dossier-egress` |
| `getRegulatoryStatus` | `GET /agr/v1/regulatory-status?subject=&version=&jurisdiction=`: the outcomes and verified regulator decisions, each with its display block |
| `submitQualification`, `reviewQualification`, `submitPolicy`, `approvePolicy` | `POST /agr/v1/regulatory-qualifications`, `…/:recordId/reviews`; `POST /agr/v1/country-regulatory-policies`, `…/:recordId/approvals` |
| `resolveHeldRecord`, `challengeDecision`, `resolveChallenge` | `POST /agr/v1/regulatory/held-resolutions`; `…/regulatory/challenges`; `…/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`. **States are derived when read.**

## Failure contract

```typescript
interface Cap11Failure {
  ok: false;
  capabilityId: "CAP-11";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "CURATOR_NOT_QUALIFIED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "EVIDENCE_NOT_ADMITTED"
    | "AUTHORITATIVE_SOURCE_REQUIRED"
    | "REQUIREMENT_SET_INCONSISTENT"
    | "REQUIREMENT_SET_NOT_VERIFIED"
    | "SUPERSESSION_NOT_PERMITTED"
    | "POLICY_BELOW_PLATFORM_FLOOR"
    | "EXEMPTION_NOT_RECOGNISED"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "EGRESS_NOT_AUTHORISED"
    | "RECORD_NOT_FOUND"
    | "DOSSIER_NOT_FOUND"
    | "DECIDER_NOT_QUALIFIED"
    | "DECIDER_NOT_INDEPENDENT"
    | "REASONING_INCOMPLETE"
    | "BINDING_MISMATCH"
    | "DECISION_SIGNATURE_INVALID"
    | "DECISION_NOT_PERMITTED"
    | "CHALLENGED_DECISION_NOT_FOUND"
    | "CHALLENGE_ALREADY_OPEN"
    | "CHALLENGE_NOT_OPEN"
    | "CHALLENGE_NOT_PERMITTED"
    | "DEPENDENCY_UNAVAILABLE";

  reasons: string[];
  noWrites: true;
}
```

| Code | HTTP | Meaning |
|---|---:|---|
| `UNAUTHENTICATED` | 401 | No actor, for any read or write |
| `ROLE_NOT_AUTHORISED` | 403 | The actor lacks the role, in a scope covering the country workspace |
| `CURATOR_NOT_QUALIFIED` | 403 | No valid, current qualification covering the jurisdiction, subject kind or purpose |
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, supplies a system-set field, or omits stated ambiguities |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key was used with different content |
| `EVIDENCE_NOT_ADMITTED` | 422 | A cited document or record is not admitted, current, or readable for the purpose |
| `AUTHORITATIVE_SOURCE_REQUIRED` | 422 | A requirement cites no authoritative source |
| `REQUIREMENT_SET_INCONSISTENT` | 422 | A requirement in the set is not current, or of another jurisdiction, subject kind or purpose |
| `REQUIREMENT_SET_NOT_VERIFIED` | 409 | A dossier, mapping or determination names a set not verified, valid and current |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or of another kind |
| `POLICY_BELOW_PLATFORM_FLOOR` | 422 | A country policy relaxes a platform floor |
| `EXEMPTION_NOT_RECOGNISED` | 422 | An exemption the country's policy does not recognise, or no policy exists |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `EGRESS_NOT_AUTHORISED` | 403 | A transmission recorded with no valid authorisation, or not matching its package digest |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_QUALIFIED` | 403 | No valid, current qualification for the jurisdiction, subject kind or purpose |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A finding, claim, ambiguity, condition or disclosure is not addressed, or the authenticity basis is not named |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | An outcome the rules refuse |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, CAP-06, CAP-07, CAP-08, CAP-10, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-11 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every source text, translation, regulator document and mapped record is an admitted CAP-04 record, read for `REGULATORY_DOSSIER` | `designed`; built first |
| CAP-06 Ingredient Intelligence | **Subjects;** reads CAP-11's outcomes and regulator decisions | `designed`; amended 2026-10-02 |
| CAP-07 Formulation Intelligence | **Subjects;** reads CAP-11's outcomes | `designed`; amended 2026-10-02 |
| CAP-08 Controlled Trials & Outcomes | **Relies on** a permit determination at activation; reads regulatory holds | `designed`; amended 2026-10-02 |
| CAP-10 Safety & Ecological Intelligence | **Mapped evidence:** CAP-10 outcomes answer safety requirements; CAP-10 shows CAP-11's status beside its own | `designed`; amended 2026-10-02 |
| AAB-PLATFORM-02, and package compilation (primitive 8) | **Compiles and renders** submission packages | `implemented` |
| CAP-12 Controlled Manufacturing Transfer | **Would rely on** CAP-11 before any commercial manufacture | `named only`, post-launch |
| The SCS domain | **None.** EUDR stays with SCS (decision 18) | `behaviourally proven` (eight capabilities) |
| The planned Regulatory domain | **Would supply** requirement knowledge as governed evidence | planned |
| The country's tenancy and participation (CAP-16, CAP-24) | **The workspace, the institutions, and the people who hold the roles** | `named only` |

## Open gaps

**Release-order decision: permit determination.** Until CAP-11 is built, no CAP-08 trial can be activated (decision 13). Whether to bring permit determination forward, ahead of the rest of CAP-11, is the Platform Owner's release decision.

**Platform gap: strong authentication.** The rehearsal's intent, MFA and re-authentication before regulatory actions, is an authentication requirement of the platform, not a capability's. It has no contract.

**Contract gap: sharing requirement knowledge between countries.** Each country keeps its own working record of a jurisdiction's law. Sharing a verified set between countries, or a platform-wide reference of public regulatory sources, is a future decision under the non-return boundary.

**Contract gap: the Regulatory domain's evidence.** Its governed packets are not contracted. Until they are, requirement knowledge reaches CAP-11 only as CAP-04 documents and people's records.

**Contract gap: the cross-domain pathway to SCS** (decision 18). Not defined.

**Contract gap: CAP-12.** Commercial manufacture's reliance on CAP-11 is recorded, not defined.

**Contract gap: vocabularies.** Jurisdiction codes, product categories, activities and sites are declared strings, matched exactly until a governed vocabulary exists.

**Contract gap: ethics approval and landholder consent.** Not regulatory permits; they remain declared in CAP-08.

**Platform gap: an invalidated admission,** as in CAP-01 and CAP-04 to CAP-10.

**Current system limit: no implementation.** Nothing of CAP-11 is built. **Until it is, every capability keeps its regulatory labels, and no trial activates.**

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- **It is not legal advice.** It does not establish that anything is lawful, compliant, registered, approved, permitted or allowed onto any market, in any jurisdiction.
- It does not remove any regulatory label: only a valid, current outcome or a verified regulator decision it defines can do that, for its subject, version and jurisdiction.
- It does not define any jurisdiction's law, or any statutory obligation.
- It does not define EUDR due diligence, which is SCS's, or CAP-12.
- It does not make CAP-11 canonical in the registry, the CAP-34 fidelity manifest or the validators, and does not change its post-launch horizon.
- It does not admit CAP-11: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
