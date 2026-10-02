# CAP-03 Evidence Integrity & Provenance — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-03 Evidence Integrity & Provenance. It is not SCS-CAP-03 (Plot and Land Unit Registration), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-03: HOW AGR APPLIES THE PLATFORM'S INTEGRITY AND PROVENANCE MECHANISMS TO ITS OWN EVIDENCE RELATIONSHIPS; THE AGR PROVENANCE VOCABULARY AND ITS MAPPINGS; VERIFICATION PROFILES AND VERIFICATION RUNS OVER AGR RECORDS AND OUTPUTS; LINEAGE EVALUATION ACROSS AGR CAPABILITIES; HOW INTEGRITY FINDINGS PROPAGATE THROUGH AGR'S DEPENDENCY CHAINS; INTEGRITY INCIDENTS; AND EVIDENCE RETRIEVAL WHEN AN AGR OUTPUT IS CHALLENGED. Establishes no commissioning, production, Gate D, WP05, scientific-validity, authenticity-in-the-world, regulatory or audit-ledger authority, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-10-02, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-03 had no design contract before this one. Its horizon stays **launch release** in the CAP-34 fidelity manifest.
**Amended:** 2026-10-02 (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract.

## The boundary, and the governing principle

> **The platform proves the integrity and provenance mechanics. CAP-03 applies those mechanics to AGR's evidence relationships, traces what an AGR output relied upon, retrieves that evidence when challenged, and fails closed when integrity or lineage cannot be established.**
>
> **Integrity proves that the evidence and its history remain what AAB recorded. It does not prove that the evidence is scientifically true, sufficient, or authentic in the world.**

## Amendment of 2026-10-02: provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-03, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-03 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-03 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| Verification run | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE`, `initiatedBy` the requester where a person requested it | Never superseded; a later run is a new record | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-03:VERIFICATION_RUN` |
| Integrity incident | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE`, triggered by its run | Never superseded; closed by decision | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-03:INTEGRITY_INCIDENT` |
| Lineage evaluation | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` or a capability's evaluation | Never superseded | AAB-PLATFORM-07's digests | `CAP-03:LINEAGE_EVALUATION` |
| Retrieval package | Package (primitive 8) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Compiled on a `HUMAN`'s request | Never superseded | `packageDigest` | None |
| `INCIDENT_CLOSURE`, `INCIDENT_SCOPE_CONFIRMATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_INTEGRITY_POLICY_APPROVAL`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** **CAP-03 writes nothing into another capability's record.** The `integrity?` references the CAP-03 adoption amendments placed on other capabilities' outputs are derived when read: a run or lineage evaluation cites the output, and the output's read shows it.

**3. Supersession.** CAP-03's records are never superseded. **The lineage relation `SUPERSEDES` maps to the platform's `supersedes` field,** and is never recorded as a second, separate `lineage` entry (AAB-PLATFORM-05, section D).

**4. Citations.** Every reference CAP-03 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-03 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Run subject | Subject | `EVALUATED_IN`, with the subject's `recordDigest` | Any registered written-once record kind | Yes | Refusal `RECORD_NOT_FOUND`. **A subject's own unresolved citations are findings** (`CITATION_UNRESOLVED`), never a refusal of the run |
| Incident trigger | Authority or membership | `PRODUCED_BY`, set by the system | `CAP-03:VERIFICATION_RUN` | Yes | Cannot be unresolved: set by the system |
| Boundary packet | Authority or membership | `CROSSED_BOUNDARY_AS` | A governed packet, when defined | Yes | Refusal `BOUNDARY_NOT_TRAVERSABLE` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Verification run | N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Integrity incident | N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Lineage evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-03 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Runs and incidents are service-submitted,** under AAB-PLATFORM-05, section C: `submittedBy` CAP-03's registered verification service; `initiatedBy` the person who requested the run, where one did; `triggerKind` `RECORD` or `SCHEDULED_JOB`; `generation.method` `DETERMINISTIC_EVALUATION`. **A service never closes an incident, confirms its scope, or decides anything** (decision 19 stands).

**8. People in content.** None in content.

**9.** **Canonicalisation (decisions 6 and 7, prerequisites, open gaps).** The platform's canonicalisation is AAB-PLATFORM-10's `aab-canonical-json-1`. **Decision 7's list is answered** by AAB-PLATFORM-10, sections 3 to 6, and AAB-PLATFORM-05's envelope (its amendment of 2026-10-02, section A). **The prerequisite "the platform's canonicalisation completed" is met in the contracts;** `RECORD_DIGEST_VERIFIED` is built only for record schemas whose envelope is declared, and `CANONICALISATION_UNDEFINED` remains for one whose envelope is not. Decision 6's citation of "AAB-PLATFORM-07, section 3" now reads "AAB-PLATFORM-10".

**10.** **The vocabulary becomes `cap-03-vocabulary-2`:** version 1, with these changes. No term of version 1 is renamed or removed; one is deprecated, with its replacements named.
  - **`OTHER` is added to the source types,** correcting "CAP-04's ten" to **CAP-04's eleven.** CAP-04 always had it; version 1 omitted it, so the mapping "Identical" was not true for source types.
  - **A source type is added: `SUBMITTER_AUTHORED`:** content created by the identified human, or authorised service, submitting the record, rather than extracted from another source (a registration, a protocol, a formulation, a mapping). For it, `SOURCE_UNIDENTIFIED` is not applicable: its source is the submission itself. **Content a machine generated is never `SUBMITTER_AUTHORED`:** it states its generation method, and a registered `SERVICE` submits it.
  - **Every generation method has an automation constraint** (AAB-PLATFORM-05, decision 11): `REQUIRED_TRUE` (the record must state `automated: true`), `REQUIRED_FALSE` (it must state `false`), or `DECLARED_PER_RECORD` (each record states it, and is refused if it does not). A record whose `automated` contradicts its method's constraint is refused (`REQUEST_VALIDATION_FAILED`).

    | Method | Constraint | Method | Constraint |
    |---|---|---|---|
    | `HUMAN_TRANSCRIPTION` | `REQUIRED_FALSE` | `SOURCE_AS_RECEIVED` | `REQUIRED_FALSE` |
    | `HUMAN_EXTRACTION` | `REQUIRED_FALSE` | `INSTRUMENT_CAPTURE` | `REQUIRED_TRUE` |
    | `AUTOMATED_EXTRACTION` | `REQUIRED_TRUE` | `DETERMINISTIC_EVALUATION` | `REQUIRED_TRUE` |
    | `AUTOMATED_EXTRACTION_HUMAN_CHECKED` | `REQUIRED_TRUE` | `HUMAN_DECISION` | `REQUIRED_FALSE` |
    | `HUMAN_ANALYSIS` (added) | `REQUIRED_FALSE` | `HUMAN_DECLARATION` | `REQUIRED_FALSE` |
    | `MACHINE_ANALYSIS` (added) | `REQUIRED_TRUE` | `TRANSLATION_HUMAN` | `REQUIRED_FALSE` |
    | `ANALYSIS` (deprecated: use `HUMAN_ANALYSIS` or `MACHINE_ANALYSIS`) | `DECLARED_PER_RECORD` | `TRANSLATION_MACHINE` | `REQUIRED_TRUE` |
    | `DIGITISATION` | `DECLARED_PER_RECORD` | `AUTOMATED_MAPPING` (CAP-02) | `REQUIRED_TRUE` |
    | `OTHER` | `DECLARED_PER_RECORD` | | |

    The name rule (`AUTOMATED` or `MACHINE` in a method's name means `automated: true`) stays as a minimum check, never as the definition.
  - **`INSTRUMENT_CAPTURE` requires:** the instrument's identity recorded (`generation.generatedBy`, and `generation.methodVersion` for its configuration); its configuration or calibration evidence cited, where it exists, as `REFERS_TO`; any human intervention in the capture disclosed in the record; and **capture never implies scientific validation.** CAP-04 still holds automated and instrument-derived material for review under its own admission rules.
  - **Mappings added:** CAP-01's link relations → `REFERS_TO`, kept as qualifiers; CAP-07's `derivedFrom` → `DERIVED_FROM` (its `variantKind` a qualifier) and `objective` → `REFERS_TO`; CAP-10's signal `source` → `REFERS_TO`, and its `channel` a source qualifier; CAP-11's requirement `sources[]` → `EXTRACTED_FROM`; CAP-12's specification `formulation` → `DERIVED_FROM`, `conditionsCarriedOver` → `RELIED_ON`, `equivalence` → `REFERS_TO`; CAP-12's batch `trials` → `APPLIED_IN`.
  - **`SUPERSEDES`** maps to the platform's `supersedes` field (above).

  Every capability's adoption of version 1 is read as an adoption of version 2.

**11.** **Corrections to "What the rehearsal does", recorded here, dated, not rewritten in place.** A later read of the step 0 snapshots, for AAB-PLATFORM-05's amendment, found five statements too broad or wrong:
  1. **"23 canonical tables write an event":** there are **22** `mutation_audit` triggers (`agriculture/triggers.sql`).
  2. **"append-only triggers protect … versions":** only partly. `entity_version` is protected against deletion only (a `BEFORE DELETE` trigger); `ingredient_version` and `evidence_packet_item` have no protecting trigger.
  3. **"Hashes are claimed, not computed":** too broad. **The photo SHA-256 is computed by the gateway from the uploaded bytes** (`api.php`, line 1775), though never re-verified. Every other hash is as stated.
  4. **"No integrity check has ever run" and "provenance cannot be asserted":** a schema-only snapshot cannot show what never ran. It shows that **no function or gateway action writes** `integrity_check_run` or `source_object`; migrations or direct SQL could have written rows.
  5. **"the continuity checkpoint's hash covers the schema and row counts":** it covers **object counts per schema** and row counts, **not the schema's definitions.**
  The conclusions drawn from them stand: nothing of the rehearsal's hash chain, assertions or caller-supplied hashes is carried across.

**12. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Why this contract, and what it adopts

**Why.** Most of what CAP-03's name describes is already a platform primitive with a contract:
- **AAB-PLATFORM-01** stores originals content-addressed by SHA-256, never overwritten, every read verified.
- **AAB-PLATFORM-05** writes provenance once, establishes the integrity of an original at admission, resolves citations to an exact version, corrects by supersession, and carries provenance by reference.
- **AAB-PLATFORM-07** freezes snapshots, with digests over canonical JSON and an `integrityRecheck` flag.
- **AAB-PLATFORM-08** and **AAB-PLATFORM-09** make every human decision signed, verified against the signer's key at acceptance.
- **Receipts** (primitive 9) and **package compilation** (primitive 8) are the platform's.

The roadmap (section 4) lists CAP-03 only as the "closest landscape counterpart" of primitives 3 and 4, proposed, not established, and the platform–domain separation decision forbids a domain capability re-owning a platform mechanism. **This contract therefore defines CAP-03 as AGR's use of those mechanisms** (decision 2), which no platform contract defines:
- every AGR evaluation (CAP-01, CAP-05 to CAP-11) discloses `INTEGRITY_RECHECK_NOT_PERFORMED`, because nothing performs one;
- nothing traces an AGR output back through promotion, trials and admitted records to its originals, which the overview says CAP-03 does ("keeps the chain from original source through reasoning, experiment, decision and outcome");
- AAB-PLATFORM-05 leaves source types, generation methods and lineage relations to the domain, and each AGR contract uses its own;
- nothing retrieves the evidence behind an AGR output when it is challenged (the SCS counterpart, SCS-CAP-10, is `named only`);
- nothing defines what an integrity failure does to what relied on it.

The evidence is the step 0 snapshots, **with every audit, provenance, integrity, evidence-packet, source and version path in `agriculture` read in full,** and the hash and provenance fields of `cognitive_core`, `country_core`, `continuity_core`, `presentation_core` and `public` ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-01, 03, 05, 07, 08 and 09,** and **package compilation (primitive 8)** and **receipts (primitive 9):** CAP-03 uses them, and re-implements none.
- **CAP-04 as amended:** CAP-03's verification and lineage reach admitted records through CAP-04's reads, for the purpose `INTEGRITY_VERIFICATION`.
- **The country isolation architecture, the non-return boundary and the egress specification:** CAP-03 is bound by them.
- **The platform's observation and brain governance,** the brain boundary and **the domain register and cognitive architecture.**

AAB-PLATFORM-04 and 06 are **not adopted:** CAP-03 admits no submitted record and acts for no one.

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review, with corrections recorded in the same review):
1. **Capability identifier `CAP-03`, named "Evidence Integrity & Provenance",** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-03:`. Receipts are accepted already (migration 025). Its horizon stays launch release.
2. **What CAP-03 is.** **The platform owns:** immutable, content-addressed storage; canonical digests; record provenance structures; frozen snapshots; receipts; signatures and historical key verification; package compilation. **CAP-03 owns:** the AGR provenance vocabulary; AGR-specific lineage relations; verification profiles for AGR records; lineage evaluation across AGR capabilities; integrity recheck requests; evidence retrieval when an AGR output is challenged; integrity-incident coordination; and the propagation of integrity status through AGR's dependency chains. **CAP-03 never re-implements a platform mechanism, and never owns an audit ledger.**
3. **The boundary and principle above are binding.**
4. **"Verified" is never one label.** CAP-03 reports separate findings (decision 5), and **a correct hash says nothing about whether a claim is true; a valid signature says nothing about the signer's expertise; complete lineage says nothing about sufficiency.**
5. **The findings:** `BYTES_DIGEST_VERIFIED`, `RECORD_DIGEST_VERIFIED`, `SNAPSHOT_MANIFEST_VERIFIED`, `SIGNATURE_VALID_AT_ACCEPTANCE`, `SOURCE_IDENTITY_VERIFIED`, `SOURCE_AUTHORITY_NOT_VERIFIED`, `LINEAGE_COMPLETE`, `LINEAGE_INCOMPLETE`, `CITATION_UNRESOLVED`, `OBJECT_UNAVAILABLE`, `INTEGRITY_MISMATCH`, `VERIFICATION_EVIDENCE_STALE` and `EVIDENCE_REQUIRED`.
6. **Canonicalisation is the platform's.** A record digest is meaningful only under one exact serialisation. CAP-03 uses the platform's canonical JSON (AAB-PLATFORM-07, section 3) and **never invents an AGR hashing method.** Where the platform's definition is incomplete (decision 7), CAP-03 waits for it.
7. **A platform prerequisite, recorded:** the platform's canonicalisation must specify its serialisation format and version, field ordering, number and date representation, Unicode normalisation, absent and null values, included and excluded metadata, schema version, hashing algorithm, and attachment and manifest handling. **Today it specifies key order, whitespace, and number and string form.** No CAP-03 record-digest verification is built until the rest is specified.
8. **Integrity failures have classified consequences** (the consequence table, "Integrity findings and their consequences"). **Historical decisions are never rewritten;** their current reliance and currency change.
9. **An integrity incident** identifies the **dependency closure,** every snapshot, evaluation, decision, promotion, dossier, determination or transfer that relied on the affected record, **without modifying any of them.**
10. **Failure is never a denial-of-service path.** Deterministic verification establishes the failure; affected objects are marked; dependency impact is calculated; further reliance fails closed; **unaffected evidence remains usable;** an authorised custodian investigates; restoration or supersession creates new evidence; **the failure record is permanent.** A report alone invalidates nothing; scope is demonstrated, never assumed; human discretion never turns a failed digest into a pass.
11. **Verifying an original verifies the real stored object:** it exists in the expected sovereign store; its bytes are retrieved through an authorised, verified read; their digest matches the admitted digest; its metadata and identifier match; encryption and key evidence is available where required; and no other object satisfies the reference. **Backup and recovery are separate,** primitive 11's.
12. **Historical signatures are verified with historical key state:** the exact signed statement bytes, the signature, the key identifier, the key's registration evidence, its status at acceptance, the acceptance receipt and trusted time, relevant compromise information, and the algorithm and version of the time. **A key's current status is never substituted for its status at acceptance** (AAB-PLATFORM-09).
13. **Retrieval leaves the country only through the platform's sovereign data boundary,** the egress specification and the non-return boundary, **never through CAP-11.** CAP-11 and CAP-12 use the same boundary for their own egress; there is no dependency of CAP-03 on either.
14. **Cross-domain and cross-country lineage only through an explicit packet.** At an authorised boundary, CAP-03 records the exporting and receiving domain, the exact governed packet and its digest, the authorised purpose, the provenance disclosed, the correlation reference, the country boundary, and what was withheld. **It never inspects another domain's tables, and never traverses into another country.**
15. **The AGR vocabulary is defined now** ("The AGR provenance vocabulary"): source types, generation methods, lineage relations, verification states and integrity findings, **with mappings from every term CAP-01 and CAP-04 to CAP-12 use today,** deprecation rules and extension rules. **No existing record is renamed.**
16. **Adoption before implementation.** Every AGR capability adopts the vocabulary and CAP-03's verification before its step 4 (code). **CAP-01 and CAP-04 to CAP-12 adopt it by a linked change** of the same date. A capability-specific term is permitted only when registered and mapped to the shared vocabulary.
17. **The audit trail is the platform's,** and **the rehearsal's hash chain is not carried across.** Its removal does not solve tamper evidence: the platform must still prove that receipts and signed decisions are append-only, that privileged owners cannot silently alter them, that verification detects modification, that restoration preserves the audit record, and whether external or independently controlled anchoring is required. **That is a separately traceable platform gap,** which may affect commissioning evidence; CAP-03 cites the platform's guarantee and substitutes no chain of its own.
18. **No score:** no "provenance confidence" or "integrity rating". Findings only.
19. **Machines run every check; only a person closes an incident.** No machine reports a finding it has not computed.
20. **Roles:** `INTEGRITY_CUSTODIAN`, within a qualification reviewed by an `INTEGRITY_GOVERNOR`; `INTEGRITY_GOVERNOR`; `PROVENANCE_READER`. Retrieval is requested by the roles of the output's own capability.
21. **Records stay in the country.** Verification runs, lineage evaluations and incidents belong to the country workspace.
22. **Separation from the platform and SCS.** CAP-03 registers AGR's integrity checks through the platform's mechanism (the dependency audit's V1 remedy, extraction step 1); it imports no SCS code, and is built only after the extraction.
23. **Rehearsal data and labels are not carried across:** its audit events, assertions, packets, source objects and provenance types (such as `AAB_DETECTION`).
24. **The export-compliance pathway** (CAP-03 with CAP-11, "including EUDR") is superseded by the platform–domain split, as CAP-11 recorded: EUDR stays with SCS.

**Prerequisites before any code:** CAP-04 built first; the dependency audit's independent verification and the extraction (roadmap, section 8.5); the platform's canonicalisation completed (decision 7).

**Nothing is implemented by this contract.**

## What CAP-03 answers, and what it does not

| Question | Answered by |
|---|---|
| Are these bytes the bytes AAB admitted? | **CAP-03**, a verification run, over AAB-PLATFORM-01's verified read |
| Is this record, snapshot or decision as AAB recorded it? | **CAP-03**, recomputing the platform's digests |
| Was this decision validly signed when it was accepted? | **CAP-03**, through AAB-PLATFORM-09's historical verification |
| What did this AGR output rely on, all the way back to the originals? | **CAP-03**, a lineage evaluation |
| If this record is compromised, what relied on it? | **CAP-03**, the dependency closure |
| Give me exactly what this challenged output rested on | **CAP-03**, a retrieval package |
| Is the evidence true, sufficient or authentic in the world? | **Not CAP-03.** Scientific review, and the capabilities that make those judgements |
| Is the source an authority on the subject? | **Not CAP-03.** It reports `SOURCE_AUTHORITY_NOT_VERIFIED` unless a capability has decided otherwise |
| Is the audit trail tamper-evident? | **The platform** (decision 17) |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:** in `agriculture`, `audit_event`, `provenance_assertion`, `source_object`, `source_system`, `source_record_reference`, `evidence_source`, `evidence_packet` and its items, `entity_version`, `data_integrity_rule`, `integrity_check_run` and `integrity_check_result`; the functions `api_record_audit_event`, `audit_canonical_mutation`, `api_assert_provenance`, `api_create_evidence_packet`, `api_add_evidence_packet_item`, `api_finalize_evidence_packet`, `api_register_evidence_source`, `system_integrity_check` and every `prevent_*` guard; the views `v_audit_integrity`, `v_audit_event_ledger`, `v_mutation_audit_coverage` and `v_archive_only_protection`; every trigger in the schema. Elsewhere: `country_core`'s source-evidence snapshot and legal-document digests, `continuity_core`'s checkpoint, `cognitive_core`'s provenance types, and the gateway's `country_foundation_integrity`.

**What it does, as read:**
- **Good discipline:** archive-only triggers block deletes of canonical records; append-only triggers protect provenance assertions, versions, transition logs and validation and integrity results; accepted observations, measurements and locked formulation lines cannot change.
- **A hash-chained audit ledger** (`audit_event`): each event stores a SHA-256 of its content and the previous event's hash; updates and deletes are blocked; 23 canonical tables write an event on every insert or update.
- **But the chain can fork and cannot detect edits.** The previous hash is read with no lock, ordered by `occurred_at`, so concurrent events can name the same predecessor. **`v_audit_integrity` compares stored links only, and never recomputes a hash from content.** Each event records "INSERT on agriculture.X", **with no digest of the row.** The table's owner can disable the triggers.
- **Provenance cannot be asserted, and is never verified.** No function writes `source_object`, yet an assertion requires one. **Nothing ever sets `verified_status`:** every assertion is `UNVERIFIED`.
- **Hashes are claimed, not computed:** `source_hash` and `source_hash_sha256` come from the caller, and are never computed or compared.
- **"Complete" means a count:** a packet is `COMPLETE` with one supporting item; it has no content digest, and remains updatable.
- **No writer:** integrity rules, runs and results, entity versions, source-record references, country source-evidence snapshots. **No integrity check has ever run.**
- **"Integrity" attests structure:** `system_integrity_check` returns `PASS_READY_FOR_CONTROLLED_WIRING` when tables, functions and chain links exist; the continuity checkpoint's hash covers the schema and **row counts.**

**In one line:** the right instincts, but the chain can fork and cannot detect edits, hashes are trusted rather than computed, and **no provenance is ever verified and no integrity check ever runs.**

| Rehearsal | This contract |
|---|---|
| Append-only and archive-only triggers | **Kept, as the platform's write-once rule** (AAB-PLATFORM-05, section 5) |
| A hash-chained audit ledger | **Not carried across.** The audit trail is the platform's (decision 17) |
| Provenance assertions, always `UNVERIFIED` | **Platform provenance at admission,** and CAP-03 findings, each computed (decision 5) |
| Caller-supplied hashes | **Digests computed by the platform,** verified against the stored object (decision 11) |
| Packets `COMPLETE` by count | **Snapshots with digests** (AAB-PLATFORM-07); "complete lineage" only as `LINEAGE_COMPLETE`, as at a time |
| Integrity rules, runs and results with no writer | **Verification profiles and runs,** registered through the platform |
| A structural attestation | **Findings over content** |
| `AAB_DETECTION` and other provenance labels | **Not carried across;** the AGR vocabulary |

**The rehearsal's data is not CAP-03's.**

## The AGR provenance vocabulary

**Version `cap-03-vocabulary-1`.** Every AGR capability uses these terms in its provenance and lineage. **Its own terms stay valid,** mapped below; no record is renamed.

**Source types** (`source.sourceType`): CAP-04's ten — `INSTITUTIONAL_RECORD`, `FIELD_TRIAL`, `FIELD_OBSERVATION`, `LABORATORY`, `PEER_REVIEWED_PUBLICATION`, `GOVERNMENT_PUBLICATION`, `STANDARD`, `HISTORICAL_ARCHIVE`, `DATASET_PUBLICATION`, `CAPABILITY_OUTPUT` — and, added: `REGULATORY_SOURCE_TEXT`, `REGULATOR_CORRESPONDENCE`, `RIGHTS_OR_CONTRACT_DOCUMENT`, `MANUFACTURER_RECORD`, `SUPPLIER_DOCUMENT`, `TRADITIONAL_KNOWLEDGE_RECORD`.

**Generation methods** (`generation.method`): CAP-04's seven — `HUMAN_TRANSCRIPTION`, `HUMAN_EXTRACTION`, `AUTOMATED_EXTRACTION`, `AUTOMATED_EXTRACTION_HUMAN_CHECKED`, `ANALYSIS`, `DIGITISATION`, `OTHER` — and, added: `SOURCE_AS_RECEIVED`, `INSTRUMENT_CAPTURE`, `DETERMINISTIC_EVALUATION`, `HUMAN_DECISION`, `HUMAN_DECLARATION`, `TRANSLATION_HUMAN`, `TRANSLATION_MACHINE`. A method containing `AUTOMATED` or `MACHINE` always has `automated: true`.

**Lineage relations** (`lineage.relation`), each with one meaning:

| Relation | Means: the subject … the cited record |
|---|---|
| `EXTRACTED_FROM` | took its content from |
| `DERIVED_FROM` | was computed or composed from, changing it |
| `PART_OF` | is a component of |
| `REPLICATES` | repeats the study or measurement of |
| `SUPPORTS` | is cited as evidence for, by a person |
| `CONTRADICTS` | is cited as evidence against, by a person |
| `REFERS_TO` | cites for context only |
| `PRODUCED_BY` | was produced by (a capability's evaluation or decision) |
| `EVALUATED_IN` | was a member of the snapshot of |
| `DECIDED_ON` | is a human decision bound to |
| `RELIED_ON` | depended on, as a gate, while it was valid and current |
| `OBSERVED_IN` | was observed within (a trial, under its protocol) |
| `MANUFACTURED_FROM` | was made to (a specification version) |
| `APPLIED_IN` | was applied as material in (a trial) |
| `TRANSLATION_OF` | is a translation of |
| `SUPERSEDES` | replaces, under AAB-PLATFORM-05, section 5 |
| `CROSSED_BOUNDARY_AS` | arrived as (an explicit cross-domain or cross-country packet, decision 14) |

**"Observed by", "generated by" and "cites"** are not relations: who observed or generated a record is its provenance (`submission`, `generation`), and "cites" is the act of any relation.

**Verification states and findings:** the findings of decision 5, and the consequences below.

**Mappings from existing terms:**

| Capability and term | Maps to |
|---|---|
| CAP-04 `sourceType`, `generation.method`, `lineage.relation` | **Identical;** CAP-04's lists are the base of this vocabulary |
| CAP-09 citation `role`: `SUPPORTING`, `CONTRADICTING`, `CONTEXT` | `SUPPORTS`, `CONTRADICTS`, `REFERS_TO` |
| CAP-01, CAP-05 citations of admitted evidence | `SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, as the citation's role says; `REFERS_TO` where it has none |
| CAP-06 evidence `supports: <aspect>` (`IDENTITY`, `SAFETY`, …); CAP-07 `supports: <aspect>` | `SUPPORTS`, with the aspect kept as a qualifier |
| CAP-10 evidence `origin` (`INDEPENDENT`, `SUPPLIER`, `TRADITIONAL_KNOWLEDGE`, …) | A **source qualifier,** not a relation; `SUPPLIER` and `TRADITIONAL_KNOWLEDGE` also map to the source types `SUPPLIER_DOCUMENT` and `TRADITIONAL_KNOWLEDGE_RECORD` |
| CAP-11 `authorityKind` | A **source qualifier;** its documents' source types are `REGULATORY_SOURCE_TEXT` or `REGULATOR_CORRESPONDENCE`; `UNOFFICIAL_TRANSLATION` and `MACHINE_ASSISTED_EXTRACTION` also map to `TRANSLATION_OF` with `TRANSLATION_MACHINE` or `AUTOMATED_EXTRACTION` |
| CAP-11 evidence mapping kinds (`CAP04_RECORD`, `CAP10_OUTCOME`, `REGULATOR_DECISION`) | `SUPPORTS` (mapped evidence), with the kind kept |
| CAP-08 arm material and batches; CAP-12 batch attestations | `APPLIED_IN`; `MANUFACTURED_FROM` |
| Every capability's snapshot members, decisions and gate reliance | `EVALUATED_IN`, `DECIDED_ON`, `RELIED_ON` |

**Deprecation:** a term is deprecated only by a new vocabulary version naming its replacement; records using it keep it, and read with its mapping. **Extension:** a capability may register a term of its own only in its contract, mapped to one term here, with a reason; an unmapped term is refused at admission (`VOCABULARY_TERM_UNMAPPED`).

## Verification profiles and runs

**A verification profile** (`cap-03-profiles-1`) says, for each kind of AGR thing, which checks apply:

| Profile | Checks |
|---|---|
| `ORIGINAL_OBJECT` | Decision 11, in full: existence in the expected sovereign store; verified read; `BYTES_DIGEST_VERIFIED`; metadata and identifier; key evidence; no alternate object |
| `ADMITTED_RECORD` | `RECORD_DIGEST_VERIFIED` (under the platform's canonicalisation); its original, by `ORIGINAL_OBJECT`; its citations resolved (`CITATION_UNRESOLVED` otherwise) |
| `SNAPSHOT` | `SNAPSHOT_MANIFEST_VERIFIED` (manifest and snapshot digests recomputed); every member, by `ADMITTED_RECORD` |
| `DECISION` | `RECORD_DIGEST_VERIFIED`; `SIGNATURE_VALID_AT_ACCEPTANCE` by decision 12; its bound digests match their evaluation |
| `SOURCE` | `SOURCE_IDENTITY_VERIFIED` where the source's identity is evidenced (a stored object, an official reference); **`SOURCE_AUTHORITY_NOT_VERIFIED` always,** unless a capability's own decision has established it |

**A verification run** is requested by a capability (for its snapshot, before or after evaluation), by an `INTEGRITY_CUSTODIAN`, or on a schedule the country's policy sets. It is **deterministic,** written once with its receipt, and lists every finding by subject. **A run's findings are as at its time:** past the policy's period, they are `VERIFICATION_EVIDENCE_STALE`, and nothing shows them as current.

**What a capability's evaluation shows.** Where a run covering every member of its snapshot is cited, `INTEGRITY_RECHECK_NOT_PERFORMED` is replaced by **the run's findings, by kind,** and `integrityRecheck` is `PERFORMED`. Otherwise the disclosure stays. **A run never makes anything "verified" in general.**

## Lineage evaluation

**A lineage evaluation is an evaluation** (AAB-PLATFORM-07) of one AGR output (an evaluation, decision, promotion, dossier, determination, transfer or package), over a frozen snapshot of everything its lineage reaches, **by resolved references only.**

- **Rules** (`cap-03-lineage-rules-1`): traverse each resolved reference, by its relation, back to originals; show each link with its relation, its target's version and digest, and its latest verification findings. **Findings:** `LINEAGE_COMPLETE` only where every link resolved and every reached record and original has a current verification without mismatch; otherwise `LINEAGE_INCOMPLETE`, naming each `CITATION_UNRESOLVED`, unverified original, `OBJECT_UNAVAILABLE`, superseded link and boundary.
- **It stops at a boundary:** another domain or another country is shown as the `CROSSED_BOUNDARY_AS` packet it arrived as (decision 14), or as a cited reference only.
- **`LINEAGE_COMPLETE` is as at a stated time,** and never says the output is true, sufficient or authentic.
- **No score, depth rank or confidence.**

## Integrity findings and their consequences

| Finding | Consequence |
|---|---|
| `INTEGRITY_MISMATCH` (a digest), or a signature invalid at acceptance | **`INTEGRITY_COMPROMISED`:** reliance on the record, and on everything in its dependency closure that relied on it, is **prohibited.** An incident is opened |
| `OBJECT_UNAVAILABLE` (a required object missing or unreadable) | **`UNDETERMINED`:** evidence required; reliance waits; an incident is opened |
| `LINEAGE_INCOMPLETE` | **No claim of complete traceability** may be made for the output; it is shown with its gaps |
| `SOURCE_AUTHORITY_NOT_VERIFIED` | **Disclosed;** the source is never described as authoritative |
| Superseded but intact evidence | **The historical decision is preserved;** current reliance is reassessed under the relying capability's currency rules |
| `VERIFICATION_EVIDENCE_STALE` | **A recheck is required** before the findings may be shown as current |

- **Historical decisions are never rewritten.** What a decision was, what it relied on and when stay as recorded; **its current reliance and currency change,** derived when read.
- **Propagation is a currency trigger.** `INTEGRITY_COMPROMISED` and `UNDETERMINED` on a record are triggers (AAB-PLATFORM-08, section 10) for every AGR decision whose snapshot includes it; each capability's adoption says what follows (the linked amendments).

## Integrity incidents

**An `INTEGRITY_INCIDENT`** is opened by a run's `INTEGRITY_MISMATCH`, invalid signature or `OBJECT_UNAVAILABLE`, **never by a report alone.**

1. **Deterministic verification establishes the failure;** a report from a person or machine starts a run, and nothing else.
2. **The affected objects are marked,** `INTEGRITY_COMPROMISED` or `UNDETERMINED`, on every read.
3. **The dependency closure is calculated** from resolved references: every snapshot, evaluation, decision, promotion, dossier, determination, transfer and package that relied on them. **Scope is demonstrated, never assumed.**
4. **Further reliance on the closure fails closed.**
5. **Unaffected evidence remains usable.** Nothing outside the demonstrated closure is restricted.
6. **An `INTEGRITY_CUSTODIAN` investigates,** with an `INTEGRITY_GOVERNOR` for a closure the country's policy marks wide.
7. **Restoration or supersession creates new evidence:** a restored object is a new admission with its own provenance, or the record is superseded. **Restoring from backup is primitive 11's,** never CAP-03's.
8. **The failure record is permanent.** The incident is closed only by a person (`INCIDENT_CLOSURE`), naming what replaced the affected evidence; **no closure turns a failed digest into a pass.**

## Evidence retrieval for a challenged output

- **When an AGR output is challenged,** under AAB-PLATFORM-08 or from outside, a person holding a role in the output's own capability requests a **retrieval package:** the output; the exact versions of everything in its lineage; their originals, where the requester may read them; their digests; the lineage evaluation; and the latest verification findings.
- **Compiled by the platform's package compilation** (primitive 8), with its digest, **and disclosing only what the requester may see,** stating what was withheld.
- **Retrieval leaves the country only through the platform's sovereign data boundary** (decision 13), recorded with the boundary's egress fields; **it never relies on CAP-11.**
- **A retrieval package proves what AAB recorded and relied on.** It never asserts that the output was right.

## Adopting AAB-PLATFORM-07 and AAB-PLATFORM-08

| Required by the platform | CAP-03 |
|---|---|
| Scope rules; selection | `cap-03-lineage-scope` v1: **`SCOPE_DERIVED`**, everything reached by resolved references; quarantined members shown, never excluded silently |
| Integrity re-check | **Performed:** this is CAP-03's purpose |
| Evaluator and rules versioning | `cap-03-lineage-rules-1`, `cap-03-profiles-1`, `cap-03-vocabulary-1`; `evaluatedAt` |
| Decision kinds | `INCIDENT_CLOSURE`, `INCIDENT_SCOPE_CONFIRMATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_INTEGRITY_POLICY_APPROVAL`, `CHALLENGE_RESOLUTION` |
| Triggers | `INTEGRITY_COMPROMISED` and `UNDETERMINED` on a member, for every adopting capability |

## Authority

| Role | May |
|---|---|
| `INTEGRITY_CUSTODIAN` | **Within a valid, current qualification only:** request runs; investigate and close incidents; confirm incident scope |
| `INTEGRITY_GOVERNOR` | Review qualifications; approve the country's integrity policy (run schedules, staleness periods, what marks a closure wide); take part in wide incidents |
| `PROVENANCE_READER` | Read runs, lineage evaluations and incidents, within the country workspace and what the underlying records permit |

- **A custodian never closes an incident on records they submitted,** or in which they hold a declared conflict.
- **Retrieval** is requested by the output's own capability's roles; **runs** may also be requested by a capability's evaluation automatically.

## Receipts, operations and routes

Receipts carry `capabilityId: "CAP-03"`: `VERIFICATION_RUN_RECORDED`, `LINEAGE_EVALUATION_RECORDED`, `INTEGRITY_INCIDENT_OPENED`, `INCIDENT_SCOPE_CONFIRMED`, `INCIDENT_CLOSED`, `RETRIEVAL_PACKAGE_COMPILED`, and the decision kinds above.

| Operation | Route |
|---|---|
| `requestRun`, `getRun` | `POST /agr/v1/integrity/verification-runs`; `GET …/:runId` |
| `requestLineage`, `getLineage` | `POST /agr/v1/integrity/lineage-evaluations`; `GET …/:evaluationId` |
| `getIncident`, `confirmScope`, `closeIncident` | `GET /agr/v1/integrity/incidents/:incidentId`; `POST …/scope-confirmations`; `…/closures` |
| `requestRetrieval`, `getRetrieval` | `POST /agr/v1/integrity/retrieval-packages`; `GET …/:packageId` |
| `getVocabulary` | `GET /agr/v1/integrity/vocabulary`: the current version, with mappings |

## Failure contract

`Cap03Failure`, with `capabilityId: "CAP-03"`, `FAIL_CLOSED` and `noWrites: true`, uses the common codes, and:

| Code | HTTP | Meaning |
|---|---:|---|
| `CANONICALISATION_UNDEFINED` | 503 | A record-digest check needs a canonicalisation the platform has not specified (decision 7) |
| `VOCABULARY_TERM_UNMAPPED` | 422 | A term not in the vocabulary or a registered extension |
| `BOUNDARY_NOT_TRAVERSABLE` | 403 | A lineage or retrieval request that would cross a domain or country without a packet |
| `INCIDENT_NOT_CLOSABLE` | 409 | No replacement named, or the closer submitted the affected records |
| `EGRESS_NOT_AUTHORISED` | 403 | A retrieval leaving the country without the platform boundary's authorisation |

**A verification never reports success it did not compute;** an unreadable object is `OBJECT_UNAVAILABLE`, never a pass.

## Dependencies

| Capability or primitive | How CAP-03 depends on it | Its state |
|---|---|---|
| AAB-PLATFORM-01 | **Verified reads** of originals | `behaviourally proven` |
| AAB-PLATFORM-05, 07, 08 | **Provenance, snapshots, digests, currency triggers** | `designed` |
| AAB-PLATFORM-09 | **Historical signature verification** | `behaviourally proven` (signing-key history) |
| Package compilation, receipts | **Retrieval packages; receipts** | `implemented` |
| The platform's sovereign data boundary | **Egress of retrieval packages** | the egress specification; **no platform capability contract yet** |
| CAP-04 | **Admitted records, read for `INTEGRITY_VERIFICATION`** | `designed`; built first |
| CAP-01, CAP-05 to CAP-12 | **Adopt the vocabulary and verification** (the linked amendments) | `designed` |

## Open gaps

**Platform prerequisite: canonicalisation** (decision 7).

**Platform gap: audit tamper evidence** (decision 17). Receipts and signed decisions must be shown append-only against privileged owners, modification-detecting, preserved by restoration, and, where required, independently anchored. **It may affect commissioning evidence.**

**Platform gap: the sovereign data boundary.** The egress specification exists; a platform capability operating it has no contract. Until it does, no retrieval package leaves the country.

**Contract gap: cross-domain packets.** Their format, and the SCS side's acceptance, are not defined.

**Contract gap: run schedules and staleness** are country policy, with no platform default yet.

**Current system limit: no implementation.** Nothing of CAP-03 is built. **Until it is, every AGR evaluation keeps `INTEGRITY_RECHECK_NOT_PERFORMED`.**

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- **It does not establish that any evidence is true, sufficient, authoritative or authentic in the world.**
- It does not define or replace any platform mechanism, or own an audit ledger.
- It does not define backup or reconstruction, or cross-boundary sharing arrangements.
- It does not make CAP-03 canonical in the registry, the CAP-34 fidelity manifest or the validators.
- It does not admit CAP-03: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
