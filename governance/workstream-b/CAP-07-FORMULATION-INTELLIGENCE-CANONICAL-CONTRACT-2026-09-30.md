# CAP-07 Formulation Intelligence — Canonical Contract — 2026-09-30

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-07 Formulation Intelligence.
**Authority:** DEFINES THE CONTRACT FOR CAP-07: HOW A FORMULATION OBJECTIVE IS DECLARED, HOW RESEARCH FORMULATIONS ARE COMPOSED FROM ACCEPTED INGREDIENTS, VERSIONED, DERIVED AND COMPARED, ASSEMBLED INTO A FORMULATION DOSSIER, REVIEWED BY A SCIENTIST AND ACCEPTED FOR TRIAL, AND ITS BOUNDARIES WITH CAP-01, CAP-04, CAP-06, CAP-08, CAP-10, CAP-11 AND CAP-12. Establishes no commissioning, production, Gate D, WP05, scientific-validity, safety, regulatory or manufacturing authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-30, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-07 had no design contract before this one.
**Amended:** 2026-10-02 (safety and ecology, governed by CAP-10), with CAP-10's canonical contract; and 2026-10-02, second (regulatory status, governed by CAP-11), with CAP-11's canonical contract; and 2026-10-02, third (composition for manufacturing transfer, governed by CAP-12), with CAP-12's canonical contract; and 2026-10-02, fourth (integrity, lineage and the AGR vocabulary, under CAP-03), with CAP-03's canonical contract; and 2026-10-02, fifth (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract.

## Amendment of 2026-10-02: safety and ecology, governed by CAP-10

**Why.** This contract accepted formulations for trial on a declared safety and handling basis "until CAP-10 has a contract" (decision 11), recorded that component interactions are assessed by no one, and left undefined how one formulation's composition is disclosed to a named person (decision 16; "Open gaps"). CAP-10 now has a contract (`governance/workstream-b/CAP-10-SAFETY-AND-ECOLOGICAL-INTELLIGENCE-CANONICAL-CONTRACT-2026-10-02.md`). **This amendment makes CAP-07 rely on it, and defines the disclosure CAP-10 needs,** approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Composition access, for a safety assessment.** A new record, `COMPOSITION_ACCESS_GRANT`, written once:
- **Made by** the formulation's `FORMULATION_AUTHOR` or a `FORMULATION_REVIEWER`, in its country workspace, **for one named person,** **one formulation version,** **the purpose `SAFETY_ASSESSMENT`,** and **one CAP-10 assessment request.**
- **What it discloses:** the version's composition, and the confidential technical inputs the CAP-10 request carries for it (concentrations, carriers and adjuvants, manufacturing process, impurities, batch information, degradation products), all `PROTECTED_COMMERCIAL` in CAP-10.
- **Time-limited:** it expires when the assessment is decided, or at a stated date, **at most 180 days after it is made** (pilot position). A new grant is needed after.
- **Revocable,** at any time, by its maker, any `FORMULATION_REVIEWER`, or CAP-10's `SAFETY_GOVERNOR`, with reasons. Revocation never removes what was read; it stops further reading.
- **Logged:** every read under a grant records who, when, and for which request.
- **Never searchable:** a grant lets its holder read the one version, by its identifier, within the one request. It never widens a list, a search or a comparison.
- **No onward disclosure:** what the holder writes in CAP-10 from it is `PROTECTED_COMMERCIAL` there, and a CAP-10 conclusion must stand without it.
- **One grant per person:** an elevated CAP-10 assessment with two deciders needs two grants.
- **A grant is a CAP-07 decision of the kind `COMPOSITION_ACCESS_GRANT`** (AAB-PLATFORM-08), signed, with the receipt `CAP07_COMPOSITION_ACCESS_GRANT`; a revocation is `CAP07_COMPOSITION_ACCESS_REVOCATION`.
- **Declining to grant is permitted.** CAP-10 then cannot reach an affirmative outcome on the formulation, and the formulation cannot be applied in a trial (CAP-08's amendment of 2026-10-02).

**2. What a dossier says about safety.** The dossier rules become `cap-07-dossier-rules-2`: the rules of version 1, with these changes:
- **Where a CAP-10 combined outcome on this formulation version is affirmative, `VALID` and `CURRENT`,** for the use stage `RESEARCH_HANDLING` or `CONTROLLED_FIELD_TRIAL`, `SAFETY_ECOLOGY_NOT_ASSESSED` is replaced by **`SAFETY_ECOLOGY_ASSESSED_WITHIN_BOUNDARY`,** shown with CAP-10's display block. **Otherwise `SAFETY_ECOLOGY_NOT_ASSESSED` stays,** as before. Outcomes on the components never replace it (CAP-10, decision 8).
- **New findings:** `SAFETY_ASSESSMENT_NEGATIVE`, naming any valid `NOT_ACCEPTABLE_WITHIN_BOUNDARY` outcome on the version, and its use stage; `SAFETY_SIGNAL_OPEN`, for any CAP-10 signal concerning the version that is not closed.

**3. Acceptance.**
- **The reasoning addresses** the CAP-10 outcome relied on, by name, with its conditions, or, where there is none, the declared safety and handling basis and `SAFETY_ECOLOGY_NOT_ASSESSED`, as before; and every new finding.
- **Refused outright** (`DECISION_NOT_PERMITTED`), in addition: any acceptance while a valid, current `NOT_ACCEPTABLE_WITHIN_BOUNDARY` outcome on this version covers `RESEARCH_HANDLING`. **A declared basis never overrides a negative assessment.** A negative outcome for field use alone is a finding the reviewer addresses; CAP-08 refuses the field use it covers.
- **`ACCEPT_FOR_TRIAL` no longer suffices alone for a trial to apply the formulation.** CAP-08 also requires a CAP-10 outcome for the use (CAP-08's amendment of 2026-10-02). A `CARRIER_ONLY_CONTROL` is applied in the field, and needs one too.
- **Currency** gains two triggers: a CAP-10 outcome relied on ceasing to be `VALID` or `CURRENT`; and a CAP-10 signal concerning the version entering `PRECAUTIONARY_HOLD`, `SUBSTANTIATED` or `INCONCLUSIVE_EVIDENCE_REQUIRED`.

**4. What this amendment replaces.**
- **Decision 11** now reads: safety and ecology are CAP-10's; acceptance for trial rests on a CAP-10 outcome where one exists, and otherwise on a declared safety and handling basis with `SAFETY_ECOLOGY_NOT_ASSESSED`; a negative CAP-10 outcome for handling refuses acceptance.
- **The contract gap "CAP-10"** is narrowed: component interactions are assessed by CAP-10 for every formulation it assesses (CAP-10, decision 8). **A formulation with no CAP-10 outcome still has its interactions assessed by no one,** and says so.
- **The contract gap "disclosing a composition"** is closed for the purpose `SAFETY_ASSESSMENT` by point 1. It stays open for every other purpose, such as a trial protocol.
- **The dependencies row for CAP-10** now reads: **optional at acceptance; required by CAP-08 for field use; CAP-07 grants composition access for it; `designed`.**
- **Decision 16 is unchanged:** a composition is still disclosed only to people holding a CAP-07 role, or now by a grant under point 1.

## Amendment of 2026-10-02 (second): regulatory status, governed by CAP-11

**Why.** This contract carries `REGULATORY_STATUS_NOT_ASSESSED` on every dossier "until CAP-10 and CAP-11 have contracts and assessments they define can be cited". CAP-11 now has a contract (`governance/workstream-b/CAP-11-REGULATORY-TRANSLATION-AND-DOSSIER-SUPPORT-CANONICAL-CONTRACT-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. What replaces the label.** The dossier rules become `cap-07-dossier-rules-3`: the rules of version 2, with this change. For each jurisdiction:
- **where CAP-11 holds a verified, valid and current regulator decision** on this formulation version, it is shown as **`REGULATOR_DECISION_RECORDED`,** with its kind, scope, conditions, expiry and authenticity basis;
- **otherwise, where CAP-11 holds a valid, current dossier assessment** on this version, `REGULATORY_STATUS_NOT_ASSESSED` is replaced by the assessment's outcome, with CAP-11's display block;
- **otherwise, `REGULATORY_STATUS_NOT_ASSESSED` stays,** as before. The components' declared statuses are still shown as declared.

**A regulator decision on a component is never a decision on the formulation,** and one jurisdiction's says nothing about another's.

**2. Nothing else follows.** `ACCEPT_FOR_TRIAL` is unchanged, and never depends on or implies a regulatory status. **A CAP-11 outcome or regulator decision never makes a formulation eligible for manufacture:** that remains CAP-12's to define, and CAP-12 has no contract.

**3. What this amendment replaces.**
- **The contract gap "regulatory status"** is narrowed: it remains not assessed wherever CAP-11 has recorded nothing.
- **The dependencies row for CAP-11** now reads: **CAP-11 Regulatory Translation & Dossier Support: owns regulatory status; `designed`, post-launch.**

## Amendment of 2026-10-02 (third): composition for manufacturing transfer, governed by CAP-12

**Why.** Decision 9 left manufacturing transfer to "CAP-12's, on gates CAP-12 defines", and decision 16 discloses composition only to CAP-07 roles or, since the amendment of 2026-10-02, by a grant for a safety assessment. CAP-12 now has a contract (`governance/workstream-b/CAP-12-CONTROLLED-MANUFACTURING-TRANSFER-CANONICAL-CONTRACT-2026-10-02.md`), and its manufacturer needs the composition. Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. A composition access grant for the purpose `MANUFACTURING_TRANSFER`.** The `COMPOSITION_ACCESS_GRANT` of the amendment of 2026-10-02 gains a second purpose, with these differences:
- **Made only when a CAP-12 `TRANSFER_AUTHORISATION` is valid and current** and names the person as a recipient, for this formulation version, at a stage that discloses the formula. The grant names the authorisation. **It is refused** otherwise, and while a CAP-12 hold is in force.
- **One grant per named person;** the person must have signed their CAP-12 recipient undertaking.
- **Discloses only the sections the CAP-12 stage discloses** (staged, minimum necessary disclosure), never the withheld internal research.
- **Time-limited:** it expires with the transfer authorisation, or at a stated date, **at most 180 days after it is made** (pilot position); renewal is a new grant.
- **Revocable,** by its maker, any `FORMULATION_REVIEWER`, the CAP-12 rights controller or a `TRANSFER_GOVERNOR`, and **revoked at once** by a CAP-12 hold or a withdrawal of rights authority.
- **Controlled viewing:** every view logged; never searchable; **no download unless the CAP-12 authorisation permits it by name;** every disclosed page marked with the recipient.
- **No right of onward disclosure.**
- **The honesty qualification,** shown with every grant and in every package: **"Revocation prevents further access through AAB but cannot technically retrieve information already disclosed."**

**2. What this amendment replaces.**
- **Decision 9** now reads: no CAP-07 decision makes a formulation eligible for manufacturing transfer; CAP-12's gates govern it, and its composition reaches a manufacturer only by the grant in point 1.
- **Decision 16** is unchanged in substance: composition is disclosed only to CAP-07 roles, or by a grant for a safety assessment or a manufacturing transfer.
- **The contract gap "disclosing a composition"** is closed for the purposes `SAFETY_ASSESSMENT` and `MANUFACTURING_TRANSFER`; it stays open for every other purpose.
- **The dependencies row for CAP-12** now reads: **CAP-12 Controlled Manufacturing Transfer: owns manufacturing transfer; CAP-07 grants composition access for it; `designed`, post-launch.**

## Amendment of 2026-10-02 (fourth): integrity, lineage and the AGR vocabulary, under CAP-03

**Why.** CAP-03 now has a contract (`governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`). It provides the integrity re-check and lineage AGR's evaluations lacked, and the AGR provenance vocabulary, which every AGR capability adopts before implementation (CAP-03, decision 16). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Integrity re-check and lineage.** A `FORMULATION_DOSSIER_EVALUATION` may request a CAP-03 verification run over its snapshot's members. The dossier rules become `cap-07-dossier-rules-4`: version 3, with this change. **Where a cited run covers every member, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`; otherwise the disclosure stays. **A lineage evaluation** may be requested for any of its formulation dossiers and acceptances for trial. **No finding is ever shown as "verified" in general,** and none says the evidence is true, sufficient or authentic in the world.

**2. The vocabulary.** CAP-07 adopts `cap-03-vocabulary-1`: its evidence `supports: <aspect>` maps to `SUPPORTS`, with the aspect kept (CAP-03, "Mappings from existing terms"). **No record is renamed.** A term of CAP-07's own, added later, is registered here and mapped to the vocabulary, or refused (`VOCABULARY_TERM_UNMAPPED`).

**3. How its outputs reference CAP-03.** Each of its formulation dossiers and acceptances for trial may carry `integrity?: { verificationRunIds: string[]; lineageEvaluationId?: string }`, set by the system when a run or evaluation is cited, and shown with the findings by kind and whether they are current.

**4. Failures stay visible.** CAP-03's findings are currency triggers for CAP-07's decisions (CAP-03, "Integrity findings and their consequences"). **An `ACCEPT_FOR_TRIAL` relying on a record `INTEGRITY_COMPROMISED`** may not be relied on by CAP-08 or CAP-12; one relying on a record `UNDETERMINED` waits. **Historical decisions are never rewritten;** their current reliance changes, derived when read. **Missing or failed mandatory verification is always shown,** never hidden or treated as a pass.

**5. Before implementation.** CAP-07's step 4 (code) uses the vocabulary and CAP-03's verification as adopted here.

**6. What this amendment replaces.** The dependencies gain a row: **CAP-03 Evidence Integrity & Provenance: integrity re-check, lineage, the AGR vocabulary and integrity incidents; `designed`, launch release.**

## Amendment of 2026-10-02 (fifth): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-07, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-07 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-07 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap07Objective` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-07:RECORD` |
| `Cap07Formulation` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-07:RECORD` |
| `Cap07FormulationDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-07:FORMULATION_DOSSIER` |
| `FORMULATION_REVIEW`, `CAP07_HELD_RESOLUTION`, `COMPOSITION_ACCESS_GRANT`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** The `integrity?` reference of the amendment of 2026-10-02 (fourth), on dossiers and acceptances for trial, is **derived when read.** `acceptanceReliedOn` is unaffected: it is set at admission.

**3. Supersession.** `supersedes` takes the platform's declared and resolved shape on objectives and formulations; `UPDATE` maps to `NEW_VERSION`.

**4. Citations.** Every reference CAP-07 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-07 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Objective `problemReportIds[]` | Related | `REFERS_TO`; **now each with a declared version** | `CAP-01:RECORD` | No | Limitation `CITATION_UNRESOLVED` |
| Formulation `objective` | Subject | `REFERS_TO` | `CAP-07:RECORD` | Yes | Refusal `OBJECTIVE_NOT_FOUND` (check 4) |
| `components[].ingredient` | Authority or membership | `DERIVED_FROM` | `CAP-06:RECORD` | Yes | Refusal `COMPONENT_NOT_ACCEPTED` (check 5) |
| `components[].acceptanceReliedOn` | Authority or membership | `RELIED_ON`, set by the system at admission | `AAB-PLATFORM-08:HUMAN_DECISION` | Yes | Cannot be unresolved: set by the system |
| `derivedFrom` | Subject | `DERIVED_FROM`, `variantKind` a qualifier; **now resolved to the declared version** | `CAP-07:RECORD` | Yes, when declared | Refusal `LINEAGE_NOT_VALID` (check 7) |
| `evidence[]` | Optional evidence | `SUPPORTS`, the aspect a qualifier | `CAP-04:MEMORY_RECORD` | No | Limitation `EVIDENCE_UNRESOLVED` (check 9) |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Objective | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Formulation | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Formulation dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-07 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Every CAP-07 record is submitted by a `HUMAN`.**

**8. People in content.** `requestedBy` stays an `ActorReference`. **The person named in a `COMPOSITION_ACCESS_GRANT`** acts in AAB by reading under it, and is an `ActorReference`.

**9.** **Check 8's `SOURCE_UNIDENTIFIED`** applies where an objective or formulation declares an external source; for `SUBMITTER_AUTHORED` it is not applicable.

**10. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Note of 2026-10-02: clerical reconciliation

Later amendments and contracts made some current-facing text in this contract stale. The stale text includes open gaps, dependency rows, interim positions, current rules-version statements, answer tables and interface comments. It was found by the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`, finding RD-15) and by the review of the reconciliation plan.

Each such passage keeps its original wording, followed by a current reading labelled "Current reading (Note of 2026-10-02; <STATUS>)". The status is CLOSED, PARTIALLY CLOSED or SUPERSEDED, and the reading names the amendment or contract that gives it.

**This note changes no rule or meaning.** It is not an amendment, and no **Amended:** line changes. **Where a mark and the amendment or contract it names differ, the amendment or contract governs.** Nothing of this capability is built.

**Dependency rows added by amendment (Note of 2026-10-02):** the Dependencies table does not show two rows that amendments add: CAP-03 Evidence Integrity & Provenance ("Amendment of 2026-10-02 (fourth): integrity, lineage and the AGR vocabulary, under CAP-03", point 6); AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests ("Amendment of 2026-10-02 (fifth): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10", point 10). Each row reads exactly as its amendment states it, and **the amendment controls.** This note creates and changes no table row.

**Dependency rows whose current reading has changed (Note of 2026-10-02):** the Dependencies table keeps its original wording, and three existing rows now read as follows. The CAP-10 row (CAP-10 Safety & Ecological Intelligence): "optional at acceptance; required by CAP-08 for field use; CAP-07 grants composition access for it; `designed`." ("Amendment of 2026-10-02: safety and ecology, governed by CAP-10", point 4). The CAP-11 row: "CAP-11 Regulatory Translation & Dossier Support: owns regulatory status; `designed`, post-launch." ("Amendment of 2026-10-02 (second): regulatory status, governed by CAP-11", point 3). The CAP-12 row: "CAP-12 Controlled Manufacturing Transfer: owns manufacturing transfer; CAP-07 grants composition access for it; `designed`, post-launch." ("Amendment of 2026-10-02 (third): composition for manufacturing transfer, governed by CAP-12", point 2). Nothing of CAP-10, CAP-11 and CAP-12 is built. For each row, the governing amendment or contract named controls. This note creates and changes no table row.

## Why this contract, and what it adopts

**Why.** CAP-07 is sixth in the workstream's order. Its description (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, section 7.3): CAP-07 "supports scientists to request, build, compare and version formulations for defined objectives". CAP-06's contract makes its acceptance for formulation research "the only thing that lets CAP-07 use an ingredient in a formulation", and leaves to CAP-07 what happens to a formulation built on an acceptance later invalidated. CAP-08 tests formulations as material under trial, and names CAP-07 as the source of "the formulation under test". The evidence is the step 0 snapshots, **with the rehearsal's whole formulation path read in full:** the workbench group in the gateway, every formulation table, view, function and trigger in `agriculture`, the transfer package in `manufacturing_core`, and every formulation reference in `country_core` and `cognitive_core`.

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-07 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** a formulation dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** formulation reviews, held resolutions and challenges are human decisions.
- **AAB-PLATFORM-01 (evidence object store):** CAP-07 stores no originals of its own. Evidence is CAP-04's.
- **CAP-04 as amended:** CAP-07 cites admitted CAP-04 records as its evidence, read for a declared purpose.
- **CAP-06:** every component of a formulation is a CAP-06 ingredient holding a valid, current acceptance for formulation research.
- **The platform's observation and brain governance** (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`), the brain boundary in the purpose and values, and **the domain register and cognitive architecture** (`governance/AAB-PLATFORM-DOMAIN-REGISTER-AND-COGNITIVE-ARCHITECTURE-2026-09-29.md`): CAP-07 is bound by them, and cites them ("Brain governance").

AAB-PLATFORM-04 (actor–subject links) is **not adopted**: nothing in CAP-07 is submitted on behalf of another party.

**Decisions recorded on 2026-09-30** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-07`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-07:`. Receipts are accepted already (migration 025).
2. **Two kinds of record:** a **formulation objective**, what a formulation is for, and a **formulation**, what it is made of and how it is prepared. Every formulation names an objective. The rehearsal's dormant request and candidate records are not carried across.
3. **Every record is admitted under AAB-PLATFORM-06, and written once.** A change is a new version, written in full; a variant is a new formulation that names its parent. Nothing is overwritten, and there are no editable drafts in the governed record. **Traditional knowledge and personal information are always held.**
4. **A component is a CAP-06 ingredient with a valid, current `ACCEPT_FOR_FORMULATION_RESEARCH`,** not under open challenge, when the formulation is admitted. The formulation records the acceptance and the currency it relied on. **A reference material is never a component.** A formulation whose component is not accepted is refused.
5. **Quantities are stated on a declared basis** (mass, volume or mass-to-volume), with units, and are checked by rule: percentages sum to 100, or one component is declared the balance. The rehearsal's bare percentages are not carried across.
6. **CAP-07 records; CAP-04 evidences.** A formulation may cite admitted CAP-04 records for what it rests on: compatibility, stability, preparation, prior use. **No record states its own readiness, safety or likely effect.**
7. **A formulation dossier shows what is known and missing, and how a variant differs from its parent.** No readiness score, ranking, selection or recommendation. The simulation's formulation score and "ready" outcome are not adopted. **A scientist decides.**
8. **Acceptance for trial** (`FORMULATION_REVIEW`, outcome `ACCEPT_FOR_TRIAL`) is a scientist's decision, by someone who did not author the formulation, bound to its dossier. **It is the only thing that lets CAP-08 register a trial of a formulation,** and CAP-08 relies on it only while it is valid and current **and every component's CAP-06 acceptance is too.**
9. **Acceptance for trial is never approval.** It never states that a formulation is safe, effective, permitted, or fit for use, sale or manufacture. **No CAP-07 decision makes a formulation eligible for manufacturing transfer;** that is CAP-12's, on gates CAP-12 defines.
10. **A component whose acceptance is later invalidated, lapsed, superseded or challenged** leaves the formulation on record, shown as resting on an acceptance no longer current. It cannot be relied on for a new trial until a new version is accepted.
11. **Safety and ecology are CAP-10's.** Until CAP-10 has a contract, acceptance for trial requires a **declared safety and handling basis for the formulation as prepared**, addressed by the reviewer, and every dossier and acceptance carries `SAFETY_ECOLOGY_NOT_ASSESSED`.
12. **CAP-07 creates no trial.** The rehearsal's send-to-trial is not carried across: a trial is registered in CAP-08, naming a formulation accepted for trial.
13. **People only.** No automated formulation, objective, review or proposal in this version. The rehearsal's suggested "formulation generator" is not carried across.
14. **Roles:** `FORMULATION_AUTHOR`, `FORMULATION_REVIEWER` and `FORMULATION_READER`, each a scoped grant.
15. **Formulations stay in the country.** They are the egress specification's category 2 ("formulations and ingredient intelligence").
16. **A formulation's composition is disclosed only to people holding a CAP-07 role in its country workspace.** CAP-08 roles see a formulation's name, version and acceptance for trial, never its composition. **The reason:** a composition may carry proprietary ingredient combinations, traditional knowledge or commercially sensitive ratios, and a trial observer needs to know what a trial is testing, not the exact recipe. **Disclosure to anyone else is a governed act requiring explicit authorisation, never a default.** Until a disclosure for one formulation is defined, the only authorisation is a `FORMULATION_READER` grant to the named person.
17. **A carrier-only control** (`CARRIER_ONLY_CONTROL`) is a variant with the active components removed, admitted and accepted for trial like any formulation, so that a CAP-08 control arm can name it. Comparing an active formulation with its carrier alone is standard practice; without it, a control arm would be an unstructured description.

**Prerequisites before any code:** CAP-04 and CAP-06 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People declare what a formulation is for, compose it from ingredients a scientist has accepted for research, and cite the evidence for it. AAB shows what is known about a formulation and what is missing, and how it differs from the one it came from. A scientist who did not write it decides whether it may be trialled. AAB never decides that a formulation is safe, effective, allowed or ready to manufacture.**

CAP-07 keeps the governed record of formulation objectives and research formulations, and the scientific decision that lets one be trialled. It does not register ingredients (CAP-06), run trials (CAP-08), assess safety (CAP-10), decide what may be sold or applied (CAP-11 and the country's regulators), or transfer anything to manufacture (CAP-12).

## What CAP-07 answers, and what it does not

| Question | Answered by |
|---|---|
| What is this formulation for? | **CAP-07**, a formulation objective |
| What is in this formulation, how much, and how is it prepared? | **CAP-07**, a formulation |
| What is known and missing about it, now, and how does it differ from its parent? | **CAP-07**, a formulation dossier |
| May this formulation be trialled? | **A scientist,** by a formulation review in CAP-07 |
| May this ingredient be used in a formulation? | CAP-06, by an ingredient review |
| Does the formulation work? | CAP-08 trials, reviewed; then CAP-04, CAP-05 and CAP-09 |
| Is it safe? What is its ecological effect? | CAP-10, which has no contract yet **Current reading (Note of 2026-10-02; CLOSED):** CAP-10 has a canonical contract of 2026-10-02, relied on by this contract's amendment of that date; nothing of CAP-10 is built. |
| Is it permitted for use or sale here? | CAP-11 and the country's regulators; CAP-11 has no contract yet **Current reading (Note of 2026-10-02; CLOSED):** CAP-11 has a canonical contract of 2026-10-02, relied on by this contract's amendment of 2026-10-02 (second); nothing of CAP-11 is built. |
| May it be manufactured? | CAP-12, which has no contract yet **Current reading (Note of 2026-10-02; CLOSED):** CAP-12 has a canonical contract of 2026-10-02, relied on by this contract's amendment of 2026-10-02 (third); nothing of CAP-12 is built. |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** the gateway's workbench group (`api.php`, lines 495 to 663, nine actions: seven formulation actions and two ingredient reads, the latter CAP-06's); the formulation request, candidate, version and ingredient-line tables (`tables.sql`, lines 1120 to 1250) and the trial handoff table; every function, view and trigger in `agriculture` that reads or writes them; the transfer package in `manufacturing_core`; and every formulation reference in `country_core` and `cognitive_core`.

**What it does, as read:**
- **Formulations belong to no country.** The create and derive functions never set one (`functions.sql`, lines 930 to 950). Names and version numbers are unique across the whole database (`tables.sql`, line 1223). The list returns every formulation to anyone holding the `read` capability (`api.php`, lines 561 to 563). The workbench checks every capability with no country, which passes whatever country the actor's grant covers (`functions.sql`, lines 76 to 90). The cross-country guard at send-to-trial is skipped whenever the formulation has no country, which is always.
- **One person can create and accept a formulation.** The decision function creates a decision, records the caller as its decider, and approves the formulation, in one call (`functions.sql`, lines 3237 to 3267). No rule separates author and decider. `HOLD` and `REVISE` are recorded with the decision status `APPROVED`.
- **Acceptance needs no evidence and no safety text.** It needs lines summing to 100%, ingredients whose status is `ACTIVE`, a rationale, expected outcomes, and no open high-severity contradiction on the formulation (`api_workbench_check_readiness`, lines 3158 to 3214). The evidence summary is optional free text.
- **Any `ACTIVE` ingredient can be a component,** even one whose current version is not approved: the write is looser than the selection list the browser is shown. Once a formulation is approved, nothing re-checks its ingredients.
- **Quantities are bare percentages,** with no basis or unit, and the role of a component is free text.
- **The caller chooses the data class,** `REAL` and `AI_GENERATED` included (`api.php`, lines 606 and 625).
- **Approval makes a formulation "ready for trial" at once,** and **anyone holding `create_draft` can then create a trial from it** (`api_workbench_send_to_trial`, lines 3363 to 3420).
- **An approved formulation is eligible for a manufacturing transfer package**, a production formula sent to a manufacturer, with no trial, outcome, safety or regulatory gate (`manufacturing_core/functions.sql`, lines 8 to 40). It is reachable only when a formulation has a country, which the workbench never sets.
- **History is protected after draft.** Triggers refuse any change to a formulation or its lines once it leaves draft (`triggers.sql`, lines 36 to 38). While in draft, a formulation is mutable.
- **Two paths cannot succeed.** Marking a formulation ready for trial updates an approved row, which the history trigger refuses (`functions.sql`, lines 1847 to 1856). Materialising a formulation from a candidate creates it already approved and with no lines, which can then never be added (lines 1859 to 1874). The request, candidate and materialise functions have no callers.
- **Automatic formulation generation is disabled by a table constraint** (`tables.sql`, lines 363 and 367), yet the country brief suggests "a safe first use of the formulation generator" (`country_core/functions.sql`, line 633).
- **The retired cognitive loop** turns every approved formulation into a node of its graph (`cognitive_core/functions.sql`, lines 461 and 462).

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| No country; global names; unscoped list | **Every record in one country workspace,** set from the actor's grant; every read scoped |
| Create and accept by one actor | **`FORMULATION_REVIEW`** by someone who did not author any version of the formulation |
| Acceptance with no evidence or safety text | **Acceptance requires a dossier, and a declared safety and handling basis** |
| Any `ACTIVE` ingredient; never re-checked | **A valid, current CAP-06 acceptance for every component,** recorded, and required again whenever the formulation is relied on |
| Bare percentages; free-text roles | **A declared basis and units,** checked by rule; a fixed vocabulary of roles |
| Caller-chosen data class | **Not a field.** Test data belongs to a test deployment |
| Mutable drafts | **No drafts in the governed record;** every version written once |
| "Approved" and "ready for trial" as stored statuses | **Derived when read** from the formulation's reviews and its components' acceptances |
| Send-to-trial | **Not carried across:** CAP-08 registers trials (decision 12) |
| Approval opens manufacturing transfer | **Not carried across:** manufacture is CAP-12's (decision 9) |
| Dormant request, candidate and materialise path | **Not carried across;** a formulation objective replaces the request |
| Suggested formulation generator | **Not carried across** (decision 13) |

**Kept, in governed form:** a mandatory rationale and expected outcomes; lineage from a parent; the rule that components sum to the whole; immutable history.

**Not carried across, in any form:** unscoped reads; self-acceptance; caller-chosen status, data class or country; editable drafts; readiness as a stored status; trial creation; manufacturing transfer; `AI_GENERATED` records from a caller.

**The rehearsal's data is not CAP-07's.** CAP-07's records start empty in a new deployment.

**The CAP-34 simulation is not a model for this contract.** Its CAP-07 logic selects the ingredients with the highest readiness scores, averages them into a formulation score, and ends in `FORMULATION_CANDIDATE_READY`. Its fidelity manifest already says this "is not a validated formulation-science, safety or regulatory scoring method". Its behavioural proof proves the simulation, and nothing about this contract.

**An earlier record defined CAP-07 differently.** The gateway reconciliation of 2026-09-20 (line 55) described CAP-07 as composing and scoring "a formulation candidate against an objective's constraints", following the simulation, before the rehearsal's source was read. **This contract does not adopt it,** as CAP-06's did not adopt the same record's definition of CAP-06.

## The records

Every CAP-07 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap07Objective {
  recordId: string;                      // set by the system
  recordVersion: number;                 // a new version supersedes the previous one, written in full
  recordKind: "FORMULATION_OBJECTIVE";
  schemaVersion: "urn:aab:schema:agr:cap-07:objective:1";
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  title: string;
  purpose: string;                       // what a formulation for this objective should do, as declared
  crops: string[];
  problemReportIds: string[];            // CAP-01 problem reports it addresses, if any
  constraints: string[];                 // as declared, e.g. "no animal-derived components", "shelf-stable for 6 months"
  intendedApplication?: string;          // as declared, e.g. "soil incorporation before sowing"

  classification: {
    sharingClassification: string;
    permittedUses: string[];
    traditionalKnowledgeLinked: boolean;
    personalInformationPresent: boolean;
  };

  supersedes?: { recordId: string; recordVersion: number; recordDigest: string; reason: "CORRECTION" | "UPDATE" | "WITHDRAWAL"; explanation: string };
  recordDigest: string;
}

interface Cap07Formulation {
  recordId: string;                      // set by the system
  recordVersion: number;
  recordKind: "FORMULATION";
  schemaVersion: "urn:aab:schema:agr:cap-07:formulation:1";
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  name: string;
  objective: { recordId: string; recordVersion: number };
  rationale: string;                     // why this composition
  expectedOutcomes: string;              // as declared; never a claim

  physicalForm: "POWDER" | "GRANULE" | "PELLET" | "LIQUID" | "SUSPENSION" | "EMULSION" | "GEL" | "PASTE" | "OTHER";
  quantityBasis: "MASS_PER_MASS" | "VOLUME_PER_VOLUME" | "MASS_PER_VOLUME";

  components: Array<{
    ingredient: { recordId: string; recordVersion: number };      // a CAP-06 INGREDIENT
    acceptanceReliedOn: { decisionId: string; currencyAtAdmission: "CURRENT" };
    role: "ACTIVE_COMPONENT" | "CARRIER" | "BINDER" | "STABILISER" | "ADJUVANT" | "NUTRIENT_SOURCE" | "BIOLOGICAL_AGENT" | "OTHER";
    amount: {
      value?: string;                    // a decimal string, on the formulation's basis
      unit?: string;                     // required with a value
      balance?: boolean;                 // true for the one component, at most, that makes up the rest; then no value
    };
    note?: string;
  }>;

  preparation?: {
    method: string;                      // as declared: order of addition, conditions, equipment
    storage?: string;
    shelfLifeDeclared?: string;
  };
  application?: { modes: string[]; rates?: string };               // as declared
  safetyBasis?: string;                  // why it may be handled and applied as prepared, until CAP-10 exists. Current reading (Note of 2026-10-02; SUPERSEDED): relied on where no CAP-10 outcome exists, and never overriding a negative one (amendment of 2026-10-02, safety and ecology, point 4)
  knownRisks?: string;

  // Variants only
  derivedFrom?: {
    recordId: string;
    recordVersion: number;
    variantKind: "COMPOSITION_CHANGE" | "PROPORTION_CHANGE" | "PREPARATION_CHANGE" | "FORM_CHANGE" | "CARRIER_ONLY_CONTROL" | "OTHER";
    explanation: string;
  };

  // What evidences it: declared citations of admitted CAP-04 records
  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    supports: "COMPATIBILITY" | "STABILITY" | "PREPARATION" | "APPLICATION" | "PRIOR_USE" | "SAFETY" | "HANDLING" | "OTHER";
    note?: string;
  }>;

  ownership: { ownerOrganizationId?: string; rightsStatement?: string };
  classification: {
    sharingClassification: string;
    permittedUses: string[];
    traditionalKnowledgeLinked: boolean;
    personalInformationPresent: boolean;
  };

  supersedes?: { recordId: string; recordVersion: number; recordDigest: string; reason: "CORRECTION" | "UPDATE" | "WITHDRAWAL"; explanation: string };
  recordDigest: string;
}
```

**Field rules:**
- **The system sets** the identity fields, the country, the platform's provenance fields, each component's `acceptanceReliedOn` and the digest. A request that supplies any of them is refused.
- **A new version is written in full,** and supersedes the last. **A variant is a new formulation** naming its parent in `derivedFrom`; its parent is unchanged, and keeps its own reviews.
- **A version and a variant are different things.** A version corrects or updates the same formulation, and does not inherit its reviews. A variant is a different formulation, reviewed on its own.
- **No record states its own readiness, safety, effect or approval.** What evidences a formulation is its citations; what is missing is derived in a dossier; whether it may be trialled is a person's review.
- **A carrier-only control** (`CARRIER_ONLY_CONTROL`) is a variant with the active components removed, for use as a control arm (decision 17). It is admitted, reviewed and accepted for trial like any formulation. Whether a trial uses it is CAP-08's.

**Admission** (rules version `cap-07-admission-1`), in order. An objective is checked by 1 to 3, 7, 8 and 10; a formulation by all of them:

| # | Check | On failure |
|---:|---|---|
| 1 | `AUTHOR_AUTHORITY`: `FORMULATION_AUTHOR` in the country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the kind's required fields, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `OBJECTIVE_RESOLVED`: the named objective is admitted, current, and in the same country workspace | **Refuses:** `OBJECTIVE_NOT_FOUND` |
| 5 | `COMPONENTS_ACCEPTED`: every component is a CAP-06 `INGREDIENT` whose `ACCEPT_FOR_FORMULATION_RESEARCH` is `VALID` and `CURRENT`, with no open challenge | **Refuses:** `COMPONENT_NOT_ACCEPTED`, naming the component, never revealing an ingredient the author may not see |
| 6 | `QUANTITIES_CONSISTENT`: every amount on the declared basis with a unit; percentages summing to 100 within 0.0001, or exactly one component the balance; no ingredient listed twice | **Refuses:** `QUANTITIES_INCONSISTENT` |
| 7 | `LINEAGE_AND_SUPERSESSION_VALID`: a parent that exists in the same country; a superseded version that is current and of the same kind | **Refuses:** `LINEAGE_NOT_VALID` or `SUPERSESSION_NOT_PERMITTED` |
| 8 | `SOURCE_IDENTIFIED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 9 | `EVIDENCE_RESOLVED`: every citation is admitted, current and readable for the purpose `FORMULATION_INTELLIGENCE` | **Limitation:** `EVIDENCE_UNRESOLVED`, never revealing a record the author may not see |
| 10 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information declared | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |

- **Held records** are decided by a `FORMULATION_REVIEWER`, never the submitter (`CAP07_HELD_RESOLUTION`: `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`). For traditional knowledge, the reviewer states the basis on which it may be held and used, which is the country's to set with its institutions.
- **A component's acceptance is checked at admission, and again whenever the formulation is relied on** (decisions 8 and 10). Admission records what it relied on; it never makes the acceptance permanent.

## The formulation dossier

**A dossier is an evaluation of one formulation** (AAB-PLATFORM-07), over a frozen snapshot of its current version, its objective, its parent if any, each component's CAP-06 ingredient record, and every CAP-04 record cited. It is written once, with its snapshot and receipt. A `FORMULATION_AUTHOR` or `FORMULATION_REVIEWER` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-07 |
|---|---|
| `manifest.scope.scopeRule` | `cap-07-dossier-scope`, version `1` |
| `manifest.selection.mode` | `SCOPE_DERIVED`; quarantined `EXCLUDE`; policy `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | None |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed **Current reading (Note of 2026-10-02; SUPERSEDED):** `PERFORMED` where a cited CAP-03 verification run covers every member; otherwise `NOT_PERFORMED`, disclosed (amendment of 2026-10-02 (fourth), point 1). |
| `cutoffAt` | The platform's clock |

```typescript
interface Cap07FormulationDossier {
  evaluationId: string;
  capabilityId: "CAP-07";
  resultType: "FORMULATION_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-07:formulation-dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-07-dossier-rules-1". Current reading (Note of 2026-10-02; SUPERSEDED): rulesVersion "cap-07-dossier-rules-4" (amendments of 2026-10-02, -2, -3 and -4; see the amendment of 2026-10-02 (fourth), point 1)
  subject: { recordId: string; recordVersion: number };
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  components: Array<{
    ingredient: { recordId: string; recordVersion: number };
    acceptance: { decisionId: string; validity: string; currency: string; openChallenge: boolean };  // as derived at cutoffAt
  }>;

  coverage: Array<{
    aspect: "COMPATIBILITY" | "STABILITY" | "PREPARATION" | "APPLICATION" | "PRIOR_USE" | "SAFETY" | "HANDLING";
    citedBy: string[];
  }>;

  gaps: Array<{
    findingId: string;
    gapType:
      | "COMPONENT_ACCEPTANCE_NOT_CURRENT"
      | "COMPATIBILITY_NOT_EVIDENCED"
      | "STABILITY_NOT_EVIDENCED"
      | "PREPARATION_NOT_DECLARED"
      | "APPLICATION_NOT_DECLARED"
      | "HANDLING_NOT_DECLARED"
      | "SAFETY_BASIS_NOT_DECLARED"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "REGULATORY_STATUS_NOT_ASSESSED"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED";
    componentRecordId?: string;
  }>;
  conflicts: Array<{ findingId: string; aspect: string; records: string[] }>;

  // Variants only: what changed from the parent, as a list, never a judgement
  differenceFromParent?: {
    parent: { recordId: string; recordVersion: number };
    componentsAdded: string[];
    componentsRemoved: string[];
    amountsChanged: Array<{ ingredientRecordId: string; from: string; to: string }>;
    rolesChanged: string[];
    formChanged: boolean;
    basisChanged: boolean;
    preparationChanged: boolean;
  };

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    dossierIsNotAVerdict: true;
    noScoreOrRank: true;
    noSafetyAssessment: true;
    noRegulatoryAssessment: true;
    noEfficacyClaim: true;
    noTrialCreated: true;
  };
}
```

**The rules** (`cap-07-dossier-rules-1`), a pure function of the snapshot, exactly reproducible except `evaluatedAt`:
- **Components** list each ingredient and the validity, currency and open challenge of its CAP-06 acceptance, as derived at `cutoffAt`. **Any acceptance not `VALID` and `CURRENT`, or under open challenge, is a gap** (`COMPONENT_ACCEPTANCE_NOT_CURRENT`), naming the component.
- **Coverage** lists, per aspect, the CAP-04 records cited for it. Nothing is weighed.
- **Gaps:** compatibility or stability with nothing cited; preparation, application or handling not declared; no safety basis declared; traditional knowledge linked. **Missing evidence is `EVIDENCE REQUIRED`,** never a likely or accepted result.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` and `REGULATORY_STATUS_NOT_ASSESSED` are always present** until CAP-10 and CAP-11 have contracts and assessments they define can be cited. The components' declared regulatory statuses are shown as declared.
- **Conflicts:** citations that support the same aspect with different declared findings, shown side by side, never resolved.
- **The difference from the parent** is a list of what changed. It says nothing about whether the change is better.
- **Disclosures, always:** `MACHINE_GENERATED`; `SAFETY_ECOLOGY_NOT_ASSESSED`; `REGULATORY_STATUS_NOT_ASSESSED`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`.
- **No score, readiness, rank, band, selection or recommendation.**

**Comparing formulations.** A person may read the difference between any two formulations in the same country workspace (`compareFormulations`): the same lists as `differenceFromParent`, derived when read, not persisted, and never ranked.

## Formulation review, and what it permits

**A `FORMULATION_REVIEWER` reviews a dossier** with a human decision of the kind `FORMULATION_REVIEW` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `ACCEPT_FOR_TRIAL` | `AFFIRMATIVE` | The formulation may be registered as test material in a CAP-08 trial |
| `REVISION_NEEDED` | `DEFERRED` | The reasoning names what a new version or variant must address |
| `NOT_ACCEPTED` | `NEGATIVE` | Not now, with reasons |

- **Independence:** never the dossier's requester, never the submitter of any member (AAB-PLATFORM-08, section 3). **CAP-07 adds:** never the author of any version of the formulation under review.
- **The reasoning addresses every gap and conflict, the objective's declared constraints,** and, for acceptance, **the declared safety and handling basis** and `SAFETY_ECOLOGY_NOT_ASSESSED` by name.
- **Refused outright** (`DECISION_NOT_PERMITTED`): `ACCEPT_FOR_TRIAL` while any component's acceptance is not `VALID` and `CURRENT` or is under open challenge; `ACCEPT_FOR_TRIAL` with no declared safety basis.
- **What an acceptance permits, and what it does not.** `ACCEPT_FOR_TRIAL` is the only thing that lets CAP-08 register a trial of the formulation. **CAP-08 relies on it only while it is `VALID` and `CURRENT`, and every component's CAP-06 acceptance is `VALID` and `CURRENT` with no open challenge,** recording what it relied on. It is never an approval, and never a statement that the formulation is safe, effective, permitted for use, or ready for sale or manufacture.
- **Currency.** Every platform change kind is a trigger: a new citation, a cited record superseded or quarantined, a new version of the formulation or its objective, a later dossier, the rules version changed. **Lapse:** 12 months.
- **Challenge:** a `FORMULATION_REVIEWER` other than the decider, or the formulation's author. Resolved by a `CHALLENGE_RESOLUTION`, by a `FORMULATION_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-07. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** While a challenge to an acceptance is open, CAP-08 may not rely on it, as AAB-PLATFORM-08 requires of reviews.
- **A formulation not accepted is never a dead end.** A new version or a variant may be reviewed again.

## When a component's acceptance changes

CAP-06 leaves to CAP-07 what happens to a formulation built on an acceptance later invalidated (CAP-06, "Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08"). **CAP-07's rule:**
- **The formulation stays on record, unchanged.** Its derived state shows each component whose acceptance is no longer `VALID` and `CURRENT`, or is under open challenge, and why.
- **It cannot be relied on for a new trial** while any component is in that state, whatever its own review says (decision 10). CAP-08 checks this when it registers and when it activates a trial.
- **To use it again,** either the component's acceptance is renewed in CAP-06, or a new version or variant without the component is admitted and accepted for trial.
- **A trial already running** is CAP-08's to handle; CAP-07 makes the change visible, and stops nothing itself.

## Brain governance

**CAP-07 cites `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md` as binding,** and the domain register and cognitive architecture's rules for brains.
- **No brain runs in CAP-07 in this version.** Objectives, formulations, dossier requests and reviews are all made by people.
- **A future brain may propose formulations** (the observation and brain governance, section 5: "form candidate hypotheses", "suggest possible investigations"). When one is contracted, its outputs are labelled machine-generated, linked, versioned and supersedable, and **held for a person, as CAP-04 holds automated content.** It may never admit a formulation, accept one for trial, rank formulations, or send one to trial. CAP-07 is amended to say so when it happens.
- **The dossier is automated output,** and meets the record's section 5: labelled `MACHINE_GENERATED`, linked through its snapshot, versioned, reproducible, with its gaps and conflicts, superseded and never changed, and separate from any scientist's decision. **It is arithmetic, not reasoning.**

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-07 |
|---|---|
| Scope rules; selection policies | `cap-07-dossier-scope` v1; `ALL_ADMITTED` v1, `SCOPE_DERIVED`, quarantined `EXCLUDE` |
| Pinned inputs; integrity re-check; empty snapshot | None; not required, disclosed; never empty, since the subject is always a member |
| Evaluator and rules versioning; non-reproducible fields | `cap-07-dossier-rules-1`; `evaluatedAt` **Current reading (Note of 2026-10-02; SUPERSEDED):** `cap-07-dossier-rules-4` (amendment of 2026-10-02 (fourth), point 1). |
| Existing evaluations and decisions | **None.** The rehearsal's workbench decisions are not mapped |
| Decision kinds, roles | `FORMULATION_REVIEW`, `CAP07_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`, each by `FORMULATION_REVIEWER` |
| Separation of duties beyond the platform's | Never the author of any version of the formulation |
| Findings a review must address | Every gap and conflict; the objective's constraints; for acceptance, the safety and handling basis |
| More than one decider | Not required |
| Challenging role | `FORMULATION_REVIEWER` other than the decider, or the author |
| Triggers and lapse | All ten change kinds; 12 months |
| What relies on reviews | CAP-08's registration and activation of a trial, while an acceptance is `VALID` and `CURRENT` and every component's CAP-06 acceptance is too |

## Authority

| Role | May |
|---|---|
| `FORMULATION_AUTHOR` | Declare objectives; admit formulations, versions and variants; request dossiers; compare formulations |
| `FORMULATION_REVIEWER` | Resolve held records; review dossiers; challenge and resolve challenges |
| `FORMULATION_READER` | Read, including composition |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.
- **A formulation's composition is shown only to people holding a CAP-07 role** in its country workspace (decision 16). A CAP-08 role alone shows the formulation's name, version and acceptance for trial, not its composition. Anyone else sees it only by an explicit authorisation, which today is a `FORMULATION_READER` grant. **Current reading (Note of 2026-10-02; SUPERSEDED):** or a `COMPOSITION_ACCESS_GRANT` to one named person, for the purpose `SAFETY_ASSESSMENT` or `MANUFACTURING_TRANSFER` (amendments of 2026-10-02, point 1, and (third), point 1). For every other purpose it is still only a `FORMULATION_READER` grant.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP07_RECORD_ADMISSION` | A record is held or admitted |
| `CAP07_HELD_RESOLUTION` | A held record is resolved |
| `FORMULATION_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `FORMULATION_REVIEW` | A dossier is reviewed |
| `CAP07_DECISION_CHALLENGE`, `CAP07_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-07"`.

| Operation | Route |
|---|---|
| `submitObjective`, `getObjective`, `listObjectives` | `POST /agr/v1/formulation-objectives`; `GET …/:recordId`; `GET /agr/v1/formulation-objectives?…` |
| `submitFormulation`, `getFormulation`, `listFormulations` | `POST /agr/v1/formulations`; `GET /agr/v1/formulations/:recordId`, with its state derived; `GET /agr/v1/formulations?objective=&…` |
| `compareFormulations` | `GET /agr/v1/formulations/comparisons?left=&right=` |
| `resolveHeldRecord` | `POST /agr/v1/formulations/:recordId/held-resolutions`, for either kind |
| `requestDossier`, `getDossier` | `POST /agr/v1/formulation-dossiers`; `GET …/:evaluationId` |
| `reviewDossier` | `POST /agr/v1/formulation-dossiers/:evaluationId/reviews` |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/formulations/challenges`; `…/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`. **A formulation's state is derived when read:** admitted, held or rejected; superseded; each component's acceptance; and whether it holds an `ACCEPT_FOR_TRIAL` that CAP-08 may rely on now.

## Failure contract

```typescript
interface Cap07Failure {
  ok: false;
  capabilityId: "CAP-07";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "OBJECTIVE_NOT_FOUND"
    | "COMPONENT_NOT_ACCEPTED"
    | "QUANTITIES_INCONSISTENT"
    | "LINEAGE_NOT_VALID"
    | "SUPERSESSION_NOT_PERMITTED"
    | "CROSS_BOUNDARY_REQUEST_BLOCKED"
    | "RECORD_NOT_FOUND"
    | "DOSSIER_NOT_FOUND"
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
| `REQUEST_VALIDATION_FAILED` | 400 | The request does not match its schema, or supplies a system-set field |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | The key was used with different content |
| `CLASSIFICATION_INCOMPLETE` | 422 | A classification field is missing |
| `OBJECTIVE_NOT_FOUND` | 422 | The named objective is not admitted, not current, or in another country |
| `COMPONENT_NOT_ACCEPTED` | 422 | A component has no valid, current, unchallenged acceptance for formulation research |
| `QUANTITIES_INCONSISTENT` | 422 | An amount has no unit or basis, the amounts do not sum to the whole, more than one balance, or a duplicate ingredient |
| `LINEAGE_NOT_VALID` | 422 | The parent does not exist, or is in another country |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or of another kind |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, constraint, disclosure or the safety basis is not addressed |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | An acceptance while a component's acceptance is not current, or with no declared safety basis |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, CAP-06, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-07 depends on it | Its state |
|---|---|---|
| CAP-06 Ingredient Intelligence | **Required.** Every component is a CAP-06 ingredient with a valid, current acceptance for formulation research | `designed`; built first |
| CAP-04 Governed Scientific Memory | **Required.** Every citation is an admitted CAP-04 record, read for the purpose `FORMULATION_INTELLIGENCE` | `designed`; built first |
| CAP-08 Controlled Trials & Outcomes | **Relies on acceptances for trial** to register and activate a trial of a formulation | `designed` |
| CAP-01 Country Intelligence & Discovery | **Optional:** an objective may name CAP-01 problem reports | `designed` |
| CAP-05 Governed Scientific Reasoning | **Optional:** a scientist may ask CAP-05 what the evidence on a formulation says | `designed` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety and ecology.** Until it exists, acceptance for trial rests on a declared basis, disclosed | `named only` |
| CAP-11 Regulatory Translation | **Owns regulatory status** | `named only`, post-launch |
| CAP-12 Controlled Manufacturing Transfer | **Owns manufacture.** No CAP-07 decision is sufficient for it | `named only`, post-launch |

## Open gaps

**Contract gap: CAP-10.** Acceptance for trial rests on a declared safety and handling basis for the formulation as prepared, which AAB does not assess, disclosed on every dossier and acceptance. Interactions between components are not assessed by anyone until CAP-10 exists. **Current reading (Note of 2026-10-02; PARTIALLY CLOSED):** narrowed. Component interactions are assessed by CAP-10 for every formulation it assesses; a formulation with no CAP-10 outcome still has its interactions assessed by no one, and says so (amendment of 2026-10-02, safety and ecology, point 4). Nothing of CAP-10 is built, so in practice no formulation has one yet.

**Contract gap: regulatory status.** Whether a formulation may be used or sold is each country's, and CAP-11's to govern when it has a contract. CAP-07 records none, and every dossier discloses it. **Current reading (Note of 2026-10-02; PARTIALLY CLOSED):** narrowed. CAP-11 has a canonical contract; where it records a verified regulator decision or a valid, current dossier assessment on the formulation version, that is shown for the jurisdiction (amendment of 2026-10-02 (second), point 1). It remains not assessed wherever CAP-11 has recorded nothing, which, until CAP-11 is built, is everywhere.

**CAP-08's reliance: amended with this contract.** CAP-08's amendment of 2026-09-30 requires a valid, current `ACCEPT_FOR_TRIAL`, with every component current, at registration and at activation, and a current CAP-06 acceptance in the same way for a single-ingredient trial.

**Contract gap: disclosing a composition.** A governed act disclosing one formulation's composition to a named person, for a stated need such as a trial protocol, is not defined. **Current reading (Note of 2026-10-02; PARTIALLY CLOSED):** closed for the purposes `SAFETY_ASSESSMENT` and `MANUFACTURING_TRANSFER`, by a `COMPOSITION_ACCESS_GRANT` (amendments of 2026-10-02, point 1, and (third), points 1 and 2); still open for every other purpose, such as a trial protocol, where the only authorisation remains a `FORMULATION_READER` grant. Nothing of CAP-07 is built. Until it is, the only authorisation is a `FORMULATION_READER` grant covering the country workspace (decision 16).

**Contract gap: units.** Units are declared strings. A governed vocabulary of units and bases, and conversion between them, is not defined.

**Contract gap: cost, supply and scale.** Whether a formulation can be made affordably, from available supply, at scale, is not recorded. A future version may add them as declared fields.

**Contract gap: automated proposals.** No brain proposes formulations in this version. When one does, its outputs are held for a person ("Brain governance").

**Contract gap: ownership and IP.** Who holds rights in a formulation developed in a country is declared, not governed here.

**Platform gap: an invalidated admission,** as in CAP-01, CAP-04, CAP-05, CAP-06 and CAP-08.

**Current system limit: no implementation.** Nothing of CAP-07 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any formulation is safe, effective, permitted, or fit for any use, sale or manufacture.
- It does not authorise anyone to present an acceptance for trial as an approval.
- It does not define CAP-10, CAP-11 or CAP-12, or what CAP-04 admits. CAP-08's reliance is defined by CAP-08's amendment of 2026-09-30.
- It does not make CAP-07 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-07: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
