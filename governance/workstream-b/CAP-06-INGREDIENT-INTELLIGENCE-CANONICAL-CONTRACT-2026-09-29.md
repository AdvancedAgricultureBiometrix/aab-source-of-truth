# CAP-06 Ingredient Intelligence — Canonical Contract — 2026-09-29

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-06 Ingredient Intelligence. It is not SCS-CAP-06 (Due Diligence Sufficiency Evaluation), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-06: HOW A COUNTRY'S KNOWN INGREDIENTS AND CANDIDATE NEW ONES ARE REGISTERED, EVIDENCED, ASSEMBLED INTO AN INGREDIENT DOSSIER, REVIEWED BY A SCIENTIST AND ACCEPTED FOR FORMULATION RESEARCH, HOW CAP-01'S REFERRALS ARE RECEIVED AND CLOSED, AND ITS BOUNDARIES WITH CAP-01, CAP-04, CAP-07, CAP-08, CAP-10 AND CAP-11. Establishes no commissioning, production, Gate D, WP05, scientific-validity, safety or regulatory authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-09-29, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-06 had no design contract before this one.
**Amended:** 2026-10-02 (safety and ecology, governed by CAP-10), with CAP-10's canonical contract; and 2026-10-02, second (regulatory status, governed by CAP-11), with CAP-11's canonical contract; and 2026-10-02, third (integrity, lineage and the AGR vocabulary, under CAP-03), with CAP-03's canonical contract; and 2026-10-02, fourth (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract; and 2026-10-03 (invalidated admissions, under AAB-PLATFORM-07), with AAB-PLATFORM-07's amendment of 2026-10-03.

## Amendment of 2026-10-02: safety and ecology, governed by CAP-10

**Why.** This contract accepted ingredients on a declared safety and handling basis "until CAP-10 has a contract" (decision 7). CAP-10 now has a contract (`governance/workstream-b/CAP-10-SAFETY-AND-ECOLOGICAL-INTELLIGENCE-CANONICAL-CONTRACT-2026-10-02.md`). **This amendment makes CAP-06 rely on it,** approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. What CAP-10 may assess.** An ingredient version may be assessed for `RESEARCH_HANDLING` or `CONTROLLED_FIELD_TRIAL`; **a candidate version for `RESEARCH_HANDLING` only,** because it is not a trial material until it is an ingredient (CAP-10, "Subjects"). CAP-10 treats a candidate, and an ingredient registered from one, as novel: its assessment always needs two deciders.

**2. What a dossier says about safety.** The dossier rules become `cap-06-dossier-rules-2`: the rules of version 1, with these changes:
- **Where a CAP-10 combined outcome on this version is affirmative, `VALID` and `CURRENT`,** for the use stage `RESEARCH_HANDLING` or `CONTROLLED_FIELD_TRIAL`, `SAFETY_ECOLOGY_NOT_ASSESSED` is replaced by **`SAFETY_ECOLOGY_ASSESSED_WITHIN_BOUNDARY`,** shown with CAP-10's display block. **Otherwise `SAFETY_ECOLOGY_NOT_ASSESSED` stays,** as before.
- **New findings:** `SAFETY_ASSESSMENT_NEGATIVE`, naming any valid `NOT_ACCEPTABLE_WITHIN_BOUNDARY` outcome on the version, and its use stage; `SAFETY_SIGNAL_OPEN`, for any CAP-10 signal concerning the version that is not closed.
- **A candidate from CAP-01** still carries the referral's `SAFETY_ECOLOGY_NOT_ASSESSED`. A CAP-10 hazard screen of the CAP-01 resource is shown on the referral's receipt where one exists, and **never replaces the label:** a screen assesses handling raw material, never the material as an ingredient.

**3. Acceptance.**
- **The reasoning addresses** the CAP-10 outcome relied on, by name, with its conditions, or, where there is none, the declared safety and handling basis and `SAFETY_ECOLOGY_NOT_ASSESSED`, as before; and every new finding.
- **Refused outright** (`DECISION_NOT_PERMITTED`), in addition: any acceptance while a valid, current `NOT_ACCEPTABLE_WITHIN_BOUNDARY` outcome on this version covers `RESEARCH_HANDLING`. **A declared basis never overrides a negative assessment.** A negative outcome for field use alone is a finding the reviewer addresses; CAP-08 refuses the field use it covers.
- **An acceptance is not a safety assessment, and no longer suffices alone for field use.** An ingredient applied in a trial on its own, or as a reference material, needs a CAP-10 outcome for the use, or, for a reference material, a declared on-label registration (CAP-08's amendment of 2026-10-02).
- **Currency** gains two triggers: a CAP-10 outcome relied on ceasing to be `VALID` or `CURRENT`; and a CAP-10 signal concerning the version entering `PRECAUTIONARY_HOLD`, `SUBSTANTIATED` or `INCONCLUSIVE_EVIDENCE_REQUIRED`.

**4. What this amendment replaces.**
- **Decision 7** now reads: safety and ecology are CAP-10's; acceptance rests on a CAP-10 outcome where one exists, and otherwise on a declared safety and handling basis with `SAFETY_ECOLOGY_NOT_ASSESSED`; a negative CAP-10 outcome for handling refuses acceptance.
- **The contract gap "CAP-10"** now reads: an ingredient with no CAP-10 outcome rests on a declared basis that AAB does not assess, disclosed on every dossier and acceptance. **Until CAP-10 is built, that is every ingredient.**
- **The dependencies row for CAP-10** now reads: **optional at acceptance; required by CAP-08 for field use; `designed`.**
- **The material classes `PROHIBITED_OR_RESTRICTED_MATERIAL` and `UNSAFE_OR_UNIDENTIFIED_MATERIAL`** are still refused any acceptance, as declared classes. A CAP-10 outcome never makes them acceptable; a material reclassified is a new version.

## Amendment of 2026-10-02 (second): regulatory status, governed by CAP-11

**Why.** This contract records an ingredient's regulatory status as declared, not verified, "CAP-11's to govern when it has a contract" (decision 8). CAP-11 now has a contract (`governance/workstream-b/CAP-11-REGULATORY-TRANSLATION-AND-DOSSIER-SUPPORT-CANONICAL-CONTRACT-2026-10-02.md`). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. What replaces the declared status.** The dossier rules become `cap-06-dossier-rules-3`: the rules of version 2, with this change. For each jurisdiction:
- **where CAP-11 holds a verified, valid and current regulator decision** on this version (a registration, approval, refusal, suspension or revocation), it is shown as **`REGULATOR_DECISION_RECORDED`,** with its kind, scope, conditions, expiry and authenticity basis, and **it supersedes the declared status for that jurisdiction.** The declaration stays readable, labelled as declared;
- **otherwise, where CAP-11 holds a valid, current dossier assessment** on this version, `REGULATORY_STATUS_DECLARED_NOT_VERIFIED` is replaced by the assessment's outcome, with CAP-11's display block;
- **otherwise, `REGULATORY_STATUS_DECLARED_NOT_VERIFIED` stays,** as before.

**Nothing is replaced for a jurisdiction CAP-11 has not addressed.** A regulator decision in one jurisdiction says nothing about another.

**2. Acceptance is unchanged.** Acceptance for formulation research is a scientific decision. It never depends on, and never implies, a regulatory status. A recorded refusal, suspension or revocation is a finding the reviewer addresses by name.

**3. What this amendment replaces.**
- **Decision 8** now reads: regulatory status is declared, and superseded only by a verified regulator decision recorded in CAP-11, or reported by a CAP-11 assessment, for the exact version and jurisdiction.
- **The contract gap "regulatory status"** is narrowed: it remains declared wherever CAP-11 has recorded nothing.
- **The dependencies row for CAP-11** now reads: **CAP-11 Regulatory Translation & Dossier Support: owns regulatory status; supersedes the declared status where it records a verified regulator decision; `designed`, post-launch.**

## Amendment of 2026-10-02 (third): integrity, lineage and the AGR vocabulary, under CAP-03

**Why.** CAP-03 now has a contract (`governance/workstream-b/CAP-03-EVIDENCE-INTEGRITY-AND-PROVENANCE-CANONICAL-CONTRACT-2026-10-02.md`). It provides the integrity re-check and lineage AGR's evaluations lacked, and the AGR provenance vocabulary, which every AGR capability adopts before implementation (CAP-03, decision 16). Approved by the Platform Owner in review on 2026-10-02. Nothing else in this contract changes.

**1. Integrity re-check and lineage.** An `INGREDIENT_DOSSIER_EVALUATION` may request a CAP-03 verification run over its snapshot's members. The dossier rules become `cap-06-dossier-rules-4`: version 3, with this change. **Where a cited run covers every member, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`; otherwise the disclosure stays. **A lineage evaluation** may be requested for any of its ingredient dossiers and acceptances. **No finding is ever shown as "verified" in general,** and none says the evidence is true, sufficient or authentic in the world.

**2. The vocabulary.** CAP-06 adopts `cap-03-vocabulary-1`: its evidence `supports: <aspect>` maps to `SUPPORTS`, with the aspect kept (CAP-03, "Mappings from existing terms"). **No record is renamed.** A term of CAP-06's own, added later, is registered here and mapped to the vocabulary, or refused (`VOCABULARY_TERM_UNMAPPED`).

**3. How its outputs reference CAP-03.** Each of its ingredient dossiers and acceptances may carry `integrity?: { verificationRunIds: string[]; lineageEvaluationId?: string }`, set by the system when a run or evaluation is cited, and shown with the findings by kind and whether they are current.

**4. Failures stay visible.** CAP-03's findings are currency triggers for CAP-06's decisions (CAP-03, "Integrity findings and their consequences"). **An acceptance relying on a record `INTEGRITY_COMPROMISED`** may not be relied on by CAP-07 or CAP-08; one relying on a record `UNDETERMINED` waits. **Historical decisions are never rewritten;** their current reliance changes, derived when read. **Missing or failed mandatory verification is always shown,** never hidden or treated as a pass.

**5. Before implementation.** CAP-06's step 4 (code) uses the vocabulary and CAP-03's verification as adopted here.

**6. What this amendment replaces.** The dependencies gain a row: **CAP-03 Evidence Integrity & Provenance: integrity re-check, lineage, the AGR vocabulary and integrity incidents; `designed`, launch release.**

## Amendment of 2026-10-02 (fourth): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-06, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-06 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-06 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap06Record` (`INGREDIENT`, `INGREDIENT_CANDIDATE`) | Admitted record | `SUBMITTER_AUTHORED`, or the declared external source | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-06:RECORD` |
| `Cap06IngredientDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-06:INGREDIENT_DOSSIER` |
| `INGREDIENT_REVIEW`, `REFERRAL_RECEIPT`, `CAP06_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** The `integrity?` reference of the amendment of 2026-10-02 (third), on dossiers and acceptances, is **derived when read.**

**3. Supersession.** `supersedes` takes the platform's declared and resolved shape; `UPDATE` maps to `NEW_VERSION`.

**4. Citations.** Every reference CAP-06 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-06 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `evidence[]` | Optional evidence | `SUPPORTS`, the aspect a qualifier | `CAP-04:MEMORY_RECORD` | No | Limitation `EVIDENCE_UNRESOLVED` (check 8) |
| `candidate.referralId` | Authority or membership | `REFERS_TO` | `CAP-01:REFERRAL` | Yes, for a candidate from CAP-01 | Refusal `REFERRAL_NOT_RECEIVED` (check 4) |
| `fromCandidate` | Subject | `DERIVED_FROM`; **now resolved** | `CAP-06:RECORD` | Yes, when declared | Refusal `RECORD_NOT_FOUND` |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Ingredient, ingredient candidate | Limitation `SOURCE_UNIDENTIFIED` (check 6) where an external source is declared; otherwise N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Ingredient dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-06 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Every CAP-06 record is submitted by a `HUMAN`** (decision 11).

**8. People in content.** `requestedBy` stays an `ActorReference`; no other.

**9.** **"Carries forward the referral's gaps and disclosures"** means the referral's disclosures (such as `SAFETY_ECOLOGY_NOT_ASSESSED`). **Provenance gaps are never carried into a new record:** they are set from the record itself (AAB-PLATFORM-05, section 6); the referral's own are read by reference.

**10. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Note of 2026-10-02: clerical reconciliation

Later amendments and contracts made some current-facing text in this contract stale. The stale text includes open gaps, dependency rows, interim positions, current rules-version statements, answer tables and interface comments. It was found by the retrospective decision cross-review (`governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md`, finding RD-15) and by the review of the reconciliation plan.

Each such passage keeps its original wording, followed by a current reading labelled "Current reading (Note of 2026-10-02; <STATUS>)". The status is CLOSED, PARTIALLY CLOSED or SUPERSEDED, and the reading names the amendment or contract that gives it.

**This note changes no rule or meaning.** It is not an amendment, and no **Amended:** line changes. **Where a mark and the amendment or contract it names differ, the amendment or contract governs.** Nothing of this capability is built.

**Dependency rows added by amendment (Note of 2026-10-02):** the Dependencies table does not show two rows that amendments add: CAP-03 Evidence Integrity & Provenance ("Amendment of 2026-10-02 (third): integrity, lineage and the AGR vocabulary, under CAP-03", point 6); AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests ("Amendment of 2026-10-02 (fourth): provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10", point 10). Each row reads exactly as its amendment states it, and **the amendment controls.** This note creates and changes no table row.

**Dependency rows whose current reading has changed (Note of 2026-10-02):** the Dependencies table keeps its original wording, and three existing rows now read as follows. The CAP-07 row (CAP-07 Formulation Intelligence): relies on acceptances: every component of a formulation is a CAP-06 ingredient holding a valid, current acceptance for formulation research; `designed` (CAP-07's canonical contract, "Why this contract, and what it adopts", line 174; its contract governs this row). The CAP-10 row (CAP-10 Safety & Ecological Intelligence): "optional at acceptance; required by CAP-08 for field use; `designed`." ("Amendment of 2026-10-02: safety and ecology, governed by CAP-10", point 4). The CAP-11 row: "CAP-11 Regulatory Translation & Dossier Support: owns regulatory status; supersedes the declared status where it records a verified regulator decision; `designed`, post-launch." ("Amendment of 2026-10-02 (second): regulatory status, governed by CAP-11", point 3). Nothing of CAP-07, CAP-10 and CAP-11 is built. For each row, the governing amendment or contract named controls. This note creates and changes no table row.

## Amendment of 2026-10-03: invalidated admissions, under AAB-PLATFORM-07

**Why.** AAB-PLATFORM-07 is amended (amendment of 2026-10-03: an admission invalidated after a snapshot), with consequential amendments to AAB-PLATFORM-05, 06, 08 and 10. Where a reviewer's admission of a record is invalidated by an upheld challenge, everything relying on it must stop being relied on, and must be reassessed by a person. This amendment is CAP-06's adoption, as that amendment's point 14 requires, and closes the contract side of finding RD-01 for CAP-06. Approved by the Platform Owner in review on 2026-10-03, as the adoption the approved draft specifies for this capability (`governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md`, SHA-256 `da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2`; section 2, and point 14 of its amendment text). **Nothing is implemented by this amendment.**

**1. Its own records.** A CAP-06 record admitted by a reviewer's `CAP06_HELD_RESOLUTION` can have that admission invalidated. It is then held again, derived when read, and excluded from new reliance. It may be resolved again by a new `CAP06_HELD_RESOLUTION`, which supersedes the invalidated one (AAB-PLATFORM-06, amendment of 2026-10-03). A record admitted at submission, automatically, is never invalidated.

**2. The trigger.** `MEMBER_ADMISSION_INVALIDATED` is a trigger for every `INGREDIENT_REVIEW`, and is never declared otherwise. A review whose snapshot reports it is `POTENTIALLY_STALE`, or `UNDETERMINED` where it cannot be checked, and never becomes current again. **"Triggers and lapse"**: "All ten change kinds" now reads "all eleven: AAB-PLATFORM-07's nine change kinds and AAB-PLATFORM-08's two review triggers".

**3. The admission basis** (AAB-PLATFORM-07, amendment of 2026-10-03, point 3). From this amendment, every new reliance pins its basis, set by the system:
- **Path A:** `Cap06IngredientDossier`'s members carry `admittedBy`;
- **Path B2:** `Cap06Record.evidence[]` (check 8) carry `resolved.admissionBasis`;
- what was written before this amendment is governed by the legacy, fail-closed mapping (point 13 there), never by an assumed basis.

**4. Reliance edges, and the consequence of each** (point 14 there). An activity in progress takes the highest consequence among its affected edges. Every new reliance on an invalidated basis is refused, whatever the consequence below:

| Path | Edge | Consequence |
|---|---|---|
| A | An ingredient dossier's members, relied on by an `INGREDIENT_REVIEW` | Mark for reassessment |
| B2 | `evidence[]` cited by a CAP-06 record | Mark for reassessment |
| C | CAP-07's reliance on an acceptance | Mark for reassessment; path C then refuses CAP-07 and CAP-08 reliance |

**5. Refusals.** CAP-06 uses the platform's codes: `SNAPSHOT_MEMBER_ADMISSION_INVALIDATED`, `RELIED_ADMISSION_INVALIDATED`, `CITED_ADMISSION_INVALIDATED`, `ADMISSION_BASIS_UNDETERMINED` and `ADMISSION_BASIS_DUPLICATE`, with AAB-PLATFORM-08's refusal for path C. A refusal writes nothing.

**6. Restoration.** Human reassessment is mandatory, and nothing restores an old basis (point 10 there):

| Path | What restores reliance |
|---|---|
| A | A new dossier on a new snapshot, and a new `INGREDIENT_REVIEW` |
| B2 | A new CAP-06 record version, whose citations resolve afresh |
| C | A new, valid and `CURRENT` `INGREDIENT_REVIEW` |

**7. Who is told.** For each item the reliance-closure assessment names:

| Recipient | CAP-06 role |
|---|---|
| The holder of the role accountable for the invalidated record | `MEMORY_REVIEWER` (CAP-04), for a CAP-04 record; `INGREDIENT_REVIEWER`, for a CAP-06 record |
| The holder of the role accountable for each affected output or activity | `INGREDIENT_REVIEWER`, for an `INGREDIENT_REVIEW` and its acceptance; `INGREDIENT_CURATOR`, for the CAP-06 record that cites the evidence |
| For a stop-at-once edge, the governing role of the capability whose evidence is affected | None of CAP-06's edges stops at once |
| Where the closure is `INCOMPLETE`, an audit or governance role | **No role defined:** CAP-30 Governed Country Assurance & Audit is `named only`. An open item of this adoption. Until an authorised audit or governance role is defined, the notification this row requires is unsatisfied, and the closure's completeness is EVIDENCE REQUIRED. The closure may not be represented as complete, and no assurance or commissioning decision that requires a complete closure may rely on it. This does not delay the invalidation, holds, refusals or other propagation, and the other recipients are still told. Every operation remains bound by AAB-PLATFORM-07's requirement to prove its own complete reliance basis (amendment of 2026-10-03, point 9). |
| The original decider of each affected decision, only while still authorised, and permitted to receive the information | The decider named on the decision |

**Which holder is notified.** For the first two rows, "the holder of the role" means the current actor specifically assigned or recorded as accountable for the affected record, output or activity, while still authorised and permitted to receive the information. For the governing role of a stop-at-once edge, it means the holders of that role whose scoped authority grant (AAB-PLATFORM-03) covers the affected item. It never means every actor who holds the role, and the platform never broadcasts a notification to a role population. If a recipient cannot be resolved with certainty, that recipient's notification is EVIDENCE REQUIRED: no recipient is guessed, and no protected information is disclosed. This does not delay the invalidation, holds, refusals or other propagation. The original decider is notified only while still authorised and permitted to receive the information.

The notification cites the invalidating resolution and the closure assessment, and reveals nothing the recipient may not see.

**When.** The notification record is written in the same transaction as the reliance-closure assessment that names the affected item. A later assessment that names further items writes their notifications in its own transaction. How quickly a person is told therefore follows the closure assessment, written promptly after the invalidating resolution by a registered service in its own transaction (AAB-PLATFORM-07, amendment of 2026-10-03, point 11). A missing or late assessment, or a missing notification record, is a governance defect: it grants no authority, restores no reliance and suppresses no propagation. Notification never conditions propagation.

**Delivery.** Delivery joins CAP-10's open item on notification delivery. When delivery is defined, its receipt or failure is recorded, and failure never prevents a hold, stale state or refusal.

**8. Status.** The open gap "invalidated admission" is **`CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN`**. It is not closed. It closes only when the implementation is built and every required test passes.

**9. What this amendment replaces.** Read as above wherever CAP-06's text differs. Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Why this contract, and what it adopts

**Why.** CAP-06 is fifth in the workstream's order. Its description (`governance/AAB-PLATFORM-OVERVIEW-2026-09-27.md`, line 200): CAP-06 "investigates existing ingredients, and candidate new ones from evidence and country resources". CAP-01's contract hands it referrals, and leaves to CAP-06 how a referral is received and closed. CAP-08 tests ingredients as material under trial, and CAP-07 builds formulations from them. The evidence is the step 0 snapshots, **with every ingredient path in `agriculture`, the ingredient candidates in `cognitive_core`, the starter library in `country_core`, and the dormant discovery-to-ingredient path read in full for this contract** ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-06 record carries the platform's provenance, and is refused, held or admitted in one transaction.
- **AAB-PLATFORM-07 (frozen evaluation snapshots):** an ingredient dossier is an evaluation over a persisted snapshot.
- **AAB-PLATFORM-08 (attributable human review):** ingredient reviews, referral receipts, held resolutions and challenges are human decisions.
- **AAB-PLATFORM-01 (evidence object store):** CAP-06 stores no originals of its own. Evidence is CAP-04's.
- **CAP-04 as amended:** CAP-06 cites admitted CAP-04 records as its evidence, read for a declared purpose.
- **The platform's observation and brain governance** (`governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md`) and the brain boundary in the purpose and values: CAP-06 is bound by it, and cites it ("Brain governance").

AAB-PLATFORM-04 (actor–subject links) is **not adopted**: nothing in CAP-06 is submitted on behalf of another party.

**Decisions recorded on 2026-09-29** (approved by the Platform Owner in review):
1. **Capability identifier `CAP-06`,** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-06:`. Receipts are accepted already (migration 025).
2. **CAP-06 records; CAP-04 evidences.** An ingredient registration declares what the ingredient is. What it rests on is admitted CAP-04 evidence, cited by the aspect it supports. **No record states its own evidence strength, safety or readiness.**
3. **Two kinds of subject:** an **ingredient** already known and used, and an **ingredient candidate**, a proposed new ingredient, from a CAP-01 referral or a scientist's proposal. A candidate never becomes an ingredient by itself: a person registers the ingredient, citing the candidate.
4. **Every record is admitted under AAB-PLATFORM-06, and written once.** A change is a new version; nothing is overwritten, and no field a version omits is wiped. **Traditional knowledge and personal information are always held.**
5. **No readiness score, ranking or partner selection.** The rehearsal's browser "selection brain" and the simulation's readiness score are not carried across. **An ingredient dossier shows what is known and missing. A scientist decides.**
6. **Acceptance for formulation research** (`INGREDIENT_REVIEW`, outcome `ACCEPT_FOR_FORMULATION_RESEARCH`) is a scientist's decision, by someone who did not register or propose the ingredient, bound to its dossier. **It is the only thing that lets CAP-07 use an ingredient in a formulation,** and only while it is valid and current. **It is never "approval", and never a statement that the ingredient is safe, effective or permitted.**
7. **Safety and ecology are CAP-10's.** Until CAP-10 has a contract, acceptance requires a **declared safety and handling basis**, addressed by the reviewer, and every dossier and acceptance carries `SAFETY_ECOLOGY_NOT_ASSESSED`.
8. **Regulatory status is declared, not verified,** and is CAP-11's to govern when it has a contract. Acceptance for research is never acceptance for use or sale.
9. **Material that is prohibited, restricted, unsafe or unidentified is recorded, and never accepted for formulation research.** A synthetic agrochemical is accepted only as a **reference material**, for use as a comparator in trials, never as a formulation component. **This is a governed mission choice, not a technical limitation.** AAB is a platform for countries to investigate and govern their own agricultural resources: natural materials, waste streams and overlooked biodiversity. Synthetic agrochemicals are the domain of well-resourced commercial players who do not need AAB. Allowing them only as trial comparators preserves AAB's integrity, and its relevance to the institutions it serves.
10. **CAP-01's referrals are received by a person** (`REFERRAL_RECEIPT`): opened as a candidate, or declined with reasons. Either closes the referral. A referral resting on a review later invalidated is shown as such, and is never opened without a reviewer acknowledging it.
11. **People only.** No automated candidate, registration, review or referral in this version. A caller can never declare an origin of `AAB_DETECTION`.
12. **No global starter library in this version.** The rehearsal's starter library is not carried across. A shared reference set of ingredients would need an explicit authorisation under the canonical template rule; until then, each country registers its own.
13. **Roles:** `INGREDIENT_CURATOR`, `INGREDIENT_REVIEWER` and `INGREDIENT_READER`, each a scoped grant.
14. **Ingredient intelligence stays in the country.** It is the egress specification's category 2 ("formulations and ingredient intelligence").

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5).

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **People record the ingredients a country knows and the new ones it might make, and cite the evidence for each. AAB shows what is known about an ingredient, and what is missing. A scientist who did not propose it decides whether it may be used in formulation research. AAB never decides that an ingredient is safe, effective or allowed.**

CAP-06 keeps the governed record of ingredients and candidates, and the scientific decision that lets one be researched. It does not build formulations (CAP-07), run trials (CAP-08), assess safety (CAP-10), or decide what may be sold or applied (CAP-11 and the country's regulators).

## What CAP-06 answers, and what it does not

| Question | Answered by |
|---|---|
| What ingredients and candidates does this country have on record, and what evidences them? | **CAP-06**, citing CAP-04 |
| What is known and missing about this ingredient, now? | **CAP-06**, an ingredient dossier |
| May this ingredient be used in formulation research? | **A scientist,** by an ingredient review in CAP-06 |
| What becomes of a referral from CAP-01? | **CAP-06**, by a referral receipt |
| Is it safe? What is its ecological effect? | CAP-10, which has no contract yet **Current reading (Note of 2026-10-02; CLOSED):** CAP-10 has a canonical contract of 2026-10-02, relied on by this contract's amendment of that date; nothing of CAP-10 is built. |
| Is it permitted for use or sale here? | CAP-11 and the country's regulators; CAP-11 has no contract yet **Current reading (Note of 2026-10-02; CLOSED):** CAP-11 has a canonical contract of 2026-10-02, relied on by this contract's amendment of 2026-10-02 (second); nothing of CAP-11 is built. |
| Does a formulation with it work? | CAP-08 trials, reviewed; then CAP-04, CAP-05 and CAP-09 |
| What is in a formulation? | CAP-07 |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** every ingredient path in the gateway (`api.php`), including an ungrouped block of create, update and archive actions that the roadmap's catalogue mapping did not list, the platform group's review actions, the workbench's ingredient reads, and a read bridge; every function behind them in `agriculture`; the ingredient candidates in `cognitive_core`; the starter library and country availability in `country_core`; and the dormant path from a discovery candidate to an ingredient.

**What it does, as read:**
- **Two ingredient reads need no authentication at all.** `get_ingredient` and `list_ingredient_versions` are served by a read bridge that never checks who is asking (`api.php`, lines 1861–1998). The version history names who created and approved each version, and the gateway sets those names to users' email addresses.
- **One person can create, submit and approve an ingredient.** The review function creates a decision and a review, completes the review as its own caller, and finalises the decision, in one call (`functions.sql`, lines 1246–1251). The submitter is not even recorded.
- **The caller chooses an ingredient's data class, "scientist approved" included,** at creation (line 996), and chooses its country; a null country passes every country check (lines 86–90).
- **Prohibited, restricted, unsafe and unidentified material classes are accepted and can be approved** (`tables.sql`, line 1390). A whitelist of natural materials exists only in PHP that is never called.
- **Amending wipes what it omits:** a new version is written from the fields supplied, so any field left out, the risk and handling text among them, becomes empty (`functions.sql`, lines 204–205). The name and material class are overwritten in place, with no history.
- **Approval needs no evidence and no safety text.** The first version is created empty, and can be approved as it is. Approval makes an ingredient usable in any formulation.
- **A rejected ingredient is a dead end:** it can never be amended or reviewed again, only archived.
- **Ingredient "intelligence" is a read.** It aggregates versions, aliases, unreviewed evidence claims, hypotheses, contradictions, gaps, formulations and trials. It computes no score and makes no safety claim.
- **Candidate ingredients go nowhere.** The cognitive candidates, stamped `AAB_DETECTION` whoever proposes them, never leave their first status, and none becomes an ingredient. The discovery path's promotion function cannot succeed: it requires an evidence packet status that does not exist, and defaults to a data class that is not allowed (lines 2035, 2051). **No candidate from any source has a working path to an ingredient.**
- **The starter library is disconnected.** Its reference ingredients and country availability are never reviewed, and have no link to the ingredient register.
- **The ingredient's country is set by a direct PHP update** after the governed create, outside any function (`api.php`, line 412).

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Unauthenticated ingredient reads exposing emails | **Every read authenticated and scoped;** people's names are never email addresses |
| Create, submit and approve by one actor | **`INGREDIENT_REVIEW`** by someone who did not register the ingredient or propose the candidate |
| Caller-chosen data class and country | **Set by the system;** the country from the actor's grant |
| Prohibited and unsafe classes approvable | **Recorded, never accepted** (decision 9) |
| Amend that wipes omitted fields; names overwritten | **Versions written in full; nothing wiped or overwritten** |
| Approval with no evidence or safety text | **Acceptance requires a dossier, and a declared safety and handling basis** |
| "Approved" and "active" as the ingredient's status | **Derived when read** from its reviews; acceptance is for research, never approval |
| Rejected ingredient as a dead end | **A new version may be reviewed again** |
| Cognitive build candidates stamped `AAB_DETECTION` | **Ingredient candidates proposed by a person** |
| Dormant discovery promotion | **A CAP-01 referral received by a person,** opened as a candidate |
| Starter library and country availability | **Not carried across** (decision 12); availability is an aspect of an ingredient's evidence |
| Browser "ingredient selection brain" | **Not carried across** (decision 5) |

**Not carried across, in any form:** unauthenticated reads; self-approval; caller-chosen status, data class or country; approvable prohibited material; wiping and overwriting; direct table updates; `AAB_DETECTION` from a caller; dead-end statuses; the starter library's "universal" claims.

**The rehearsal's data is not CAP-06's.** CAP-06's records start empty in a new deployment.

**The CAP-34 simulation is not a model for this contract.** Its CAP-06 logic classifies evidence by keywords in its text and ends in a readiness score and a progression label, such as `INGREDIENT_PROGRESSION_CANDIDATE`. Its fidelity manifest already says the score "does not constitute genuine scientific, safety or regulatory scoring". Its behavioural proof proves the simulation, and nothing about this contract.

**An earlier record defined CAP-06 differently.** The gateway reconciliation of 2026-09-20 (line 54) described CAP-06 as computing "a continuous ingredient-readiness assessment", following the simulation, before the rehearsal's source was read. **This contract does not adopt it,** as CAP-01's did not adopt the same record's definition of CAP-01.

## The records

Every CAP-06 record is written once, with the platform's provenance, and decided under AAB-PLATFORM-06. Every record belongs to one country workspace, set by the server from the actor's grant.

```typescript
interface Cap06Record {
  recordId: string;                      // set by the system
  recordVersion: number;                 // a new version supersedes the previous one, written in full
  recordKind: "INGREDIENT" | "INGREDIENT_CANDIDATE";
  schemaVersion: string;                 // "urn:aab:schema:agr:cap-06:<kind>:1"
  countryWorkspaceId: string;            // from the actor's grant
  provenance: Provenance;

  identity: {
    name: string;
    aliases: string[];
    materialClass:
      | "PLANT_DERIVED"
      | "ANIMAL_DERIVED"
      | "MICROBIAL"
      | "FERMENTATION_DERIVED"
      | "MARINE_DERIVED"
      | "NATURALLY_OCCURRING_MINERAL"
      | "GEOLOGICAL_MATERIAL"
      | "NATURAL_WASTE_OR_BYPRODUCT"
      | "RECOVERED_MINERAL_MATERIAL"
      | "OTHER_NATURAL_OR_BIOLOGICAL"
      | "SYNTHETIC_AGROCHEMICAL"
      | "PROHIBITED_OR_RESTRICTED_MATERIAL"
      | "UNSAFE_OR_UNIDENTIFIED_MATERIAL";
    preparation?: string;
    description: string;
  };

  // Declared: what the ingredient is, is for, and needs
  properties: {
    composition?: string;
    intendedFunctions: string[];         // as declared, e.g. "soil structure", "nitrogen source"
    applicationModes: string[];          // as declared, e.g. "soil incorporation", "foliar"
    handlingAndStorage?: string;
    knownRisks?: string;
    safetyBasis?: string;                // why it may be handled and applied, until CAP-10 exists. Current reading (Note of 2026-10-02; SUPERSEDED): relied on where no CAP-10 outcome exists, and never overriding a negative one (amendment of 2026-10-02, safety and ecology, point 4)
    regulatoryStatus?: string;           // as declared; never verified by CAP-06
  };

  // Candidates only: where the candidate came from, and what making it involves
  candidate?: {
    origin: "CAP01_REFERRAL" | "SCIENTIST_PROPOSAL";
    referralId?: string;                 // a CAP-01 referral, received by a REFERRAL_RECEIPT
    compositionPlan?: string;
    processPlan?: string;
    whatWouldNeedToBeTrue: string;
  };

  // For an ingredient registered from a candidate
  fromCandidate?: { recordId: string; recordVersion: number };

  // What evidences it: declared citations of admitted CAP-04 records
  evidence: Array<{
    memoryRecordId: string;
    recordVersion: number;
    supports:
      | "IDENTITY"
      | "COMPOSITION"
      | "MECHANISM"
      | "EFFECT"
      | "SAFETY"
      | "HANDLING"
      | "AVAILABILITY"
      | "PRIOR_USE"
      | "REGULATORY_STATUS"
      | "OTHER";
    note?: string;
  }>;

  // Rights and sensitivity: declared, always complete
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
- **The system sets** the identity fields, the country, the platform's provenance fields and the digest. A request that supplies any of them is refused.
- **A new version is written in full.** A field it leaves out is absent from that version and disclosed as such; it is never taken as a deletion of what an earlier version said, which stays readable.
- **No record states its own evidence strength, readiness, safety or approval.** What evidences it is its citations; what is missing is derived in a dossier; whether it may be researched is a person's review.
- **A candidate from CAP-01** names its referral, and carries forward the referral's gaps and disclosures, `SAFETY_ECOLOGY_NOT_ASSESSED` among them.

**Admission** (rules version `cap-06-admission-1`), in order:

| # | Check | On failure |
|---:|---|---|
| 1 | `CURATOR_AUTHORITY`: `INGREDIENT_CURATOR` in the country workspace | **Refuses:** `ROLE_NOT_AUTHORISED` |
| 2 | `RECORD_COMPLETE`: the kind's required fields, and no system-set field supplied | **Refuses:** `REQUEST_VALIDATION_FAILED` |
| 3 | `CLASSIFICATION_COMPLETE` | **Refuses:** `CLASSIFICATION_INCOMPLETE` |
| 4 | `REFERRAL_RECEIVED`: a candidate from CAP-01 names a referral opened by a `REFERRAL_RECEIPT` | **Refuses:** `REFERRAL_NOT_RECEIVED` |
| 5 | `SUPERSESSION_VALID` | **Refuses:** `SUPERSESSION_NOT_PERMITTED` |
| 6 | `SOURCE_IDENTIFIED` | **Limitation:** `SOURCE_UNIDENTIFIED` |
| 7 | `EVIDENCE_CITED`: at least one citation | **Limitation:** `NO_EVIDENCE_CITED` |
| 8 | `EVIDENCE_RESOLVED`: every citation is admitted, current and readable for the purpose `INGREDIENT_INTELLIGENCE` | **Limitation:** `EVIDENCE_UNRESOLVED`, never revealing a record the curator may not see |
| 9 | `SENSITIVE_CONTENT`: neither traditional knowledge nor personal information declared | **Held:** `TRADITIONAL_KNOWLEDGE` or `PERSONAL_INFORMATION` |
| 10 | `MATERIAL_ADMISSIBLE_FOR_RESEARCH`: the material class is not prohibited, restricted, unsafe or unidentified | **Limitation:** `NOT_ADMISSIBLE_FOR_RESEARCH`; the record is kept, and can never be accepted (decision 9) |

- **Held records** are decided by an `INGREDIENT_REVIEWER`, never the submitter (`CAP06_HELD_RESOLUTION`: `ADMIT`, `REJECT`, `REQUIRE_INFORMATION`). For traditional knowledge, the reviewer states the basis on which it may be held and used, which is the country's to set with its institutions.

## The ingredient dossier

**A dossier is an evaluation of one ingredient or candidate** (AAB-PLATFORM-07), over a frozen snapshot of its current version, the candidate it came from if any, and every CAP-04 record cited. It is written once, with its snapshot and receipt. An `INGREDIENT_CURATOR` or `INGREDIENT_REVIEWER` requests it; nothing produces one automatically.

| AAB-PLATFORM-07 field | CAP-06 |
|---|---|
| `manifest.scope.scopeRule` | `cap-06-dossier-scope`, version `1` |
| `manifest.selection.mode` | `SCOPE_DERIVED`; quarantined `EXCLUDE`; policy `ALL_ADMITTED`, version `1` |
| `pinnedInputs[]` | None |
| `integrityRecheck` | `NOT_PERFORMED`, disclosed **Current reading (Note of 2026-10-02; SUPERSEDED):** `PERFORMED` where a cited CAP-03 verification run covers every member; otherwise `NOT_PERFORMED`, disclosed (amendment of 2026-10-02 (third), point 1). |
| `cutoffAt` | The platform's clock |

```typescript
interface Cap06IngredientDossier {
  evaluationId: string;
  capabilityId: "CAP-06";
  resultType: "INGREDIENT_DOSSIER";
  schemaVersion: "urn:aab:schema:agr:cap-06:ingredient-dossier:1";
  binding: SnapshotBinding;              // rulesVersion "cap-06-dossier-rules-1". Current reading (Note of 2026-10-02; SUPERSEDED): rulesVersion "cap-06-dossier-rules-4" (amendments of 2026-10-02, -2, -3 and -4; see the amendment of 2026-10-02 (third), point 1)
  subject: { recordId: string; recordKind: "INGREDIENT" | "INGREDIENT_CANDIDATE"; recordVersion: number };
  requestedBy: ActorReference;
  cutoffAt: string;
  evaluatedAt: string;

  coverage: Array<{
    aspect: "IDENTITY" | "COMPOSITION" | "MECHANISM" | "EFFECT" | "SAFETY" | "HANDLING" | "AVAILABILITY" | "PRIOR_USE" | "REGULATORY_STATUS";
    citedBy: string[];
  }>;

  gaps: Array<{
    findingId: string;
    gapType:
      | "IDENTITY_NOT_EVIDENCED"
      | "COMPOSITION_NOT_EVIDENCED"
      | "MECHANISM_NOT_EVIDENCED"
      | "EFFECT_NOT_EVIDENCED"
      | "HANDLING_NOT_DECLARED"
      | "SAFETY_BASIS_NOT_DECLARED"
      | "SAFETY_ECOLOGY_NOT_ASSESSED"
      | "REGULATORY_STATUS_NOT_DECLARED"
      | "TRADITIONAL_KNOWLEDGE_BASIS_REQUIRED"
      | "NOT_ADMISSIBLE_FOR_RESEARCH";
  }>;
  conflicts: Array<{ findingId: string; aspect: string; records: string[] }>;

  exclusions: EvaluationSnapshot["manifest"]["exclusions"];
  disclosures: string[];

  boundary: {
    dossierIsNotAVerdict: true;
    noScoreOrRank: true;
    noSafetyAssessment: true;
    noRegulatoryAssessment: true;
    noFormulationCreated: true;
  };
}
```

**The rules** (`cap-06-dossier-rules-1`), a pure function of the snapshot, exactly reproducible except `evaluatedAt`:
- **Coverage** lists, per aspect, the CAP-04 records cited for it. Nothing is weighed.
- **Gaps:** every aspect among identity, composition, mechanism and effect with nothing cited; handling or a safety basis not declared; the regulatory status not declared; traditional knowledge linked; a material class not admissible for research. **Missing evidence is `EVIDENCE REQUIRED`,** never a likely or accepted result.
- **`SAFETY_ECOLOGY_NOT_ASSESSED` is always present** until CAP-10 has a contract and an assessment it defines can be cited.
- **Conflicts:** citations that support the same aspect with different declared findings, shown side by side, never resolved.
- **Disclosures, always:** `MACHINE_GENERATED`; `SAFETY_ECOLOGY_NOT_ASSESSED`; `REGULATORY_STATUS_DECLARED_NOT_VERIFIED`; `INPUT_LIMITED_TO_REQUESTER_VIEW`; `INTEGRITY_RECHECK_NOT_PERFORMED`.
- **No score, readiness, rank, band, partner selection or recommendation.**

## Ingredient review, and what it permits

**An `INGREDIENT_REVIEWER` reviews a dossier** with a human decision of the kind `INGREDIENT_REVIEW` (AAB-PLATFORM-08), bound to the dossier's result and snapshot digests.

| Outcome | Class | Means |
|---|---|---|
| `ACCEPT_FOR_FORMULATION_RESEARCH` | `AFFIRMATIVE` | The ingredient may be used as a component in CAP-07's research formulations. **For an `INGREDIENT` only**, never a candidate |
| `ACCEPT_AS_REFERENCE_MATERIAL` | `AFFIRMATIVE` | The ingredient may be used as a comparator or reference in trials, never as a formulation component. **The only acceptance a synthetic agrochemical can receive** |
| `CANDIDATE_WORTH_DEVELOPING` | `AFFIRMATIVE` | **For a candidate only:** it is worth characterising and developing into a registered ingredient |
| `NOT_ACCEPTED` | `NEGATIVE` | Not now, with reasons |
| `MORE_EVIDENCE_NEEDED` | `DEFERRED` | The reasoning names what is needed |

- **Independence:** never the dossier's requester, never the submitter of any member (AAB-PLATFORM-08, section 3). **CAP-06 adds:** never the curator who registered the ingredient or proposed the candidate, in any version.
- **The reasoning addresses every gap and conflict,** and, for acceptance, **the declared safety and handling basis** and `SAFETY_ECOLOGY_NOT_ASSESSED` by name.
- **Refused outright** (`DECISION_NOT_PERMITTED`): any acceptance of a material class that is prohibited, restricted, unsafe or unidentified; `ACCEPT_FOR_FORMULATION_RESEARCH` of a synthetic agrochemical; an acceptance with no declared safety basis.
- **What an acceptance permits, and what it does not.** `ACCEPT_FOR_FORMULATION_RESEARCH` is the only thing that lets CAP-07 use the ingredient as a component, and **CAP-07 relies on it only while it is `VALID` and `CURRENT`**, recording the currency it relied on. It is never an approval, and never a statement that the ingredient is safe, effective, permitted for use, or ready for sale.
- **Currency.** Every platform change kind is a trigger: a new citation, a cited record superseded or quarantined, a new version of the ingredient, a later dossier, the rules version changed. **Lapse:** 12 months.
- **Challenge:** an `INGREDIENT_REVIEWER` other than the decider, or the ingredient's curator. Resolved by a `CHALLENGE_RESOLUTION`, by an `INGREDIENT_REVIEWER` who is neither party. One open challenge per decision. **A challenge resolution is final in CAP-06. This is the pilot position. Whether resolutions should be challengeable under AAB-PLATFORM-08 remains an open platform question.** While a challenge to an acceptance is open, CAP-07 may not rely on it, as AAB-PLATFORM-08 requires of reviews.
- **A rejected ingredient is never a dead end.** A new version, with new evidence, may be reviewed again.

## Referrals from CAP-01

CAP-01's contract leaves to CAP-06 how a referral is received and closed. **An `INGREDIENT_REVIEWER` receives each referral** with a human decision of the kind `REFERRAL_RECEIPT`:

| Outcome | Class | Result |
|---|---|---|
| `OPENED_AS_CANDIDATE` | `AFFIRMATIVE` | A curator may register an `INGREDIENT_CANDIDATE` naming the referral. The referral is closed |
| `DECLINED` | `NEGATIVE` | The referral is closed, with reasons, visible to CAP-01 |

- **A referral is closed by a receipt, and only by a receipt.** CAP-01's rule of one open referral per subject then lets a later referral of the same subject be made.
- **A referral resting on a review later invalidated** is shown as such. It may be declined, or opened only with the reviewer's reasoning acknowledging the invalidation.
- **A receipt carries forward** the referral's gaps and disclosures, `SAFETY_ECOLOGY_NOT_ASSESSED` among them. CAP-06 never reads a referral as a statement that the material is safe.
- **Receiving a referral creates no ingredient.** An ingredient is registered by a curator, and accepted only by a review.

## Brain governance

**CAP-06 cites `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md` as binding.**
- **No brain runs in CAP-06 in this version.** Candidates, registrations, dossier requests, reviews and receipts are all made by people.
- **A future brain may form candidate ingredients or hypotheses** (the record's section 5: "form candidate hypotheses", "suggest possible investigations"). When one is contracted, its outputs are labelled machine-generated, linked, versioned and supersedable, and **held for a person, as CAP-04 holds automated content.** It may never register an ingredient, accept one, or promote a candidate. CAP-06 is amended to say so when it happens.
- **The dossier is automated output,** and meets the record's section 5: labelled `MACHINE_GENERATED`, linked through its snapshot, versioned, reproducible, with its gaps and conflicts, superseded and never changed, and separate from any scientist's decision. **It is arithmetic, not reasoning.**

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-06 |
|---|---|
| Scope rules; selection policies | `cap-06-dossier-scope` v1; `ALL_ADMITTED` v1, `SCOPE_DERIVED`, quarantined `EXCLUDE` |
| Pinned inputs; integrity re-check; empty snapshot | None; not required, disclosed; never empty, since the subject is always a member |
| Evaluator and rules versioning; non-reproducible fields | `cap-06-dossier-rules-1`; `evaluatedAt` **Current reading (Note of 2026-10-02; SUPERSEDED):** `cap-06-dossier-rules-4` (amendment of 2026-10-02 (third), point 1). |
| Existing evaluations and decisions | **None.** The rehearsal's reviews and approvals are not mapped |
| Decision kinds, roles | `INGREDIENT_REVIEW`, `REFERRAL_RECEIPT`, `CAP06_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`, each by `INGREDIENT_REVIEWER` |
| Separation of duties beyond the platform's | Never the curator who registered the ingredient or proposed the candidate |
| Findings a review must address | Every gap and conflict; for acceptance, the safety and handling basis |
| More than one decider | Not required |
| Challenging role | `INGREDIENT_REVIEWER` other than the decider, or the curator |
| Triggers and lapse | All ten change kinds; 12 months |
| What relies on reviews | CAP-07's use of an ingredient, while an acceptance is `VALID` and `CURRENT`. A formulation built on an acceptance later invalidated is CAP-07's to handle |

## Authority

| Role | May |
|---|---|
| `INGREDIENT_CURATOR` | Register ingredients and candidates, and new versions; request dossiers |
| `INGREDIENT_REVIEWER` | Resolve held records; review dossiers; receive referrals; challenge and resolve challenges |
| `INGREDIENT_READER` | Read |

- **Each role is a scoped grant covering the country workspace,** resolved by the platform. A grant with no country is never read as covering every country.
- **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace; people are named by their names, never by their email addresses.

## Receipts, operations and routes

| Decision type | Written when |
|---|---|
| `CAP06_RECORD_ADMISSION` | A record is held or admitted |
| `CAP06_HELD_RESOLUTION` | A held record is resolved |
| `INGREDIENT_DOSSIER_EVALUATION` | A dossier is recorded, with its snapshot |
| `INGREDIENT_REVIEW` | A dossier is reviewed |
| `REFERRAL_RECEIPT` | A CAP-01 referral is received |
| `CAP06_DECISION_CHALLENGE`, `CAP06_CHALLENGE_RESOLUTION` | A decision is challenged; a challenge resolved |

Receipts carry `capabilityId: "CAP-06"`.

| Operation | Route |
|---|---|
| `submitRecord`, `getRecord`, `listRecords` | `POST /agr/v1/ingredients`; `GET /agr/v1/ingredients/:recordId`, with its state derived; `GET /agr/v1/ingredients?kind=&…` |
| `resolveHeldRecord` | `POST /agr/v1/ingredients/:recordId/held-resolutions` |
| `requestDossier`, `getDossier` | `POST /agr/v1/ingredient-dossiers`; `GET …/:evaluationId` |
| `reviewDossier` | `POST /agr/v1/ingredient-dossiers/:evaluationId/reviews` |
| `receiveReferral` | `POST /agr/v1/ingredient-referral-receipts`, naming the CAP-01 referral |
| `challengeDecision`, `resolveChallenge` | `POST /agr/v1/ingredients/challenges`; `…/challenges/:challengeId/resolutions` |

Every write requires an `Idempotency-Key`. **An ingredient's state is derived when read:** registered, held or rejected; superseded; and whether it holds a valid, current acceptance for formulation research or as reference material.

## Failure contract

```typescript
interface Cap06Failure {
  ok: false;
  capabilityId: "CAP-06";
  result: "FAIL_CLOSED";
  correlationId: string;

  error:
    | "UNAUTHENTICATED"
    | "ROLE_NOT_AUTHORISED"
    | "REQUEST_VALIDATION_FAILED"
    | "IDEMPOTENCY_KEY_CONFLICT"
    | "CLASSIFICATION_INCOMPLETE"
    | "REFERRAL_NOT_RECEIVED"
    | "REFERRAL_ALREADY_RECEIVED"
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
| `REFERRAL_NOT_RECEIVED` | 422 | A candidate names a referral with no `OPENED_AS_CANDIDATE` receipt |
| `REFERRAL_ALREADY_RECEIVED` | 409 | A second receipt for the same referral |
| `SUPERSESSION_NOT_PERMITTED` | 409 | The superseded record is not current, or of another kind |
| `CROSS_BOUNDARY_REQUEST_BLOCKED` | 403 | The request names another country workspace |
| `RECORD_NOT_FOUND`, `DOSSIER_NOT_FOUND` | 404 | None the actor may read |
| `DECIDER_NOT_INDEPENDENT` | 403 | The decider fails an independence rule |
| `REASONING_INCOMPLETE` | 422 | A gap, conflict, disclosure or the safety basis is not addressed |
| `BINDING_MISMATCH` | 409 | The digests the decision names no longer match |
| `DECISION_SIGNATURE_INVALID` | 422 | The signature does not verify as at acceptance |
| `DECISION_NOT_PERMITTED` | 409 | An acceptance the material class or subject does not allow, or with no declared safety basis |
| `CHALLENGED_DECISION_NOT_FOUND`, `CHALLENGE_ALREADY_OPEN`, `CHALLENGE_NOT_OPEN`, `CHALLENGE_NOT_PERMITTED` | 404, 409 | As in CAP-01 |
| `DEPENDENCY_UNAVAILABLE` | 503 | CAP-04, the database or the registry could not be reached |

**A refusal never reveals more than the requester may see.** A constraint failure is never reported as an unavailable service.

## Dependencies

| Capability | How CAP-06 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required.** Every citation is an admitted CAP-04 record, read for the purpose `INGREDIENT_INTELLIGENCE` | `designed`; built first |
| CAP-01 Country Intelligence & Discovery | **Sends referrals,** which CAP-06 receives | `designed` |
| CAP-07 Formulation Intelligence | **Relies on acceptances** to use an ingredient in a formulation | `named only` |
| CAP-08 Controlled Trials & Outcomes | **Tests ingredients** as material under trial, citing a CAP-06 record | `designed` |
| CAP-10 Safety & Ecological Intelligence | **Owns safety and ecology.** Until it exists, acceptance rests on a declared basis, disclosed | `named only` |
| CAP-11 Regulatory Translation | **Owns regulatory status,** which CAP-06 records as declared | `named only`, post-launch |
| CAP-05 Governed Scientific Reasoning | **Optional:** a scientist may ask CAP-05 what the evidence on an ingredient says | `designed` |

## Open gaps

**Contract gap: CAP-10.** Acceptance for formulation research rests on a declared safety and handling basis that AAB does not assess, disclosed on every dossier and acceptance. **Current reading (Note of 2026-10-02; SUPERSEDED):** an ingredient with no CAP-10 outcome rests on a declared basis that AAB does not assess, disclosed on every dossier and acceptance; until CAP-10 is built, that is every ingredient (amendment of 2026-10-02, safety and ecology, point 4). The gap stays open in practice.

**Contract gap: regulatory status.** Whether an ingredient may be used or sold is each country's, and CAP-11's to govern when it has a contract. CAP-06 records it as declared. **Current reading (Note of 2026-10-02; PARTIALLY CLOSED):** narrowed. CAP-11 has a canonical contract; a verified, valid and current regulator decision it records supersedes the declared status for that version and jurisdiction, and a CAP-11 dossier assessment replaces the label (amendment of 2026-10-02 (second), point 1). The status remains declared wherever CAP-11 has recorded nothing, which, until CAP-11 is built, is everywhere.

**Contract gap: a shared reference set.** Many ingredients are known everywhere. A reference set shared across countries would save each country registering them again, but needs explicit authorisation under the canonical template rule, and a governed source. Not defined.

**Contract gap: traditional knowledge and benefit-sharing.** Ingredients linked to traditional knowledge are held. The basis for holding and using them, their holders' consent, and the sharing of benefits from any ingredient developed from them are the country's to set with its institutions.

**Contract gap: automated candidate generation.** No brain proposes ingredients in this version. When one does, its outputs are held for a person ("Brain governance").

**Contract gap: ownership and IP.** Who holds rights in an ingredient developed from a country's resources is declared, not governed here.

**Platform gap: an invalidated admission,** as in CAP-01, CAP-04, CAP-05 and CAP-08.

**Current system limit: no implementation.** Nothing of CAP-06 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- It does not establish that any ingredient is safe, effective, permitted, or fit for any use.
- It does not authorise anyone to present an acceptance for research as an approval.
- It does not define CAP-07, CAP-10 or CAP-11, or what CAP-04 admits.
- It does not make CAP-06 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-06: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
