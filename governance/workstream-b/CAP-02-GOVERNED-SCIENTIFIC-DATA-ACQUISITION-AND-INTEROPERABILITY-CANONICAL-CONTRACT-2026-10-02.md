# CAP-02 Governed Scientific Data Acquisition & Interoperability — Canonical Contract — 2026-10-02

**Status:** CANONICAL CONTRACT — NOT IMPLEMENTATION
**Domain:** Agricultural Science (AGR)
**Capability:** CAP-02 Governed Scientific Data Acquisition & Interoperability. It is not SCS-CAP-02 (Operator and Supplier Identity Registration), a different capability in another domain.
**Authority:** DEFINES THE CONTRACT FOR CAP-02: HOW AN EXTERNAL SOURCE OF SCIENTIFIC DATA IS REGISTERED, AND APPROVED FOR ACQUISITION ON A RECORDED PERMITTED-USE BASIS; HOW A PERSON STARTS AN ACQUISITION RUN, FROM FILES THEY SUPPLY OR FROM AN ALLOWLISTED PUBLIC SOURCE; HOW WHAT IS ACQUIRED IS STAGED, WITH A DIGEST THE PLATFORM COMPUTES; HOW A SOURCE'S FIELDS, TERMS AND UNITS ARE MAPPED BY APPROVED, VERSIONED MAPPINGS; HOW ACQUIRED MATERIAL IS HANDED TO CAP-04 BY A PERSON, AS A SUBMISSION LIKE ANY OTHER; HOW A RUN IS WITHDRAWN; AND ITS BOUNDARIES WITH CAP-01, CAP-03, CAP-04, PROPOSED CAP-36, THE PLANNED DOMAINS AND THE SOVEREIGN DATA BOUNDARY. Establishes no commissioning, production, Gate D, WP05, scientific-validity, source-authority or regulatory authority, authorises no outbound connection, and makes no Supabase or other provider change. This capability is PROPOSED_NOT_ADMITTED. No implementation exists.
**Written:** 2026-10-02, step 1 of the AGR rehearsal migration workstream (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3). CAP-02 had no design contract before this one. Its horizon stays **launch release** in the CAP-34 fidelity manifest; what launches is limited by decision 21.
**Amended:** 2026-10-02 (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract.

## The governing principle

> **CAP-02 brings external material to CAP-04's door, with its source, its terms of use, its retrieval and any mapping applied to it recorded. It never makes anything evidence, true or authoritative.**
>
> **Everything CAP-02 acquires reaches every other capability only as admitted CAP-04 records, submitted by a named person. Where the basis for acquiring or using material cannot be established, CAP-02 does not acquire it.**

## Amendment of 2026-10-02: provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10

**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to CAP-02, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of CAP-02 is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.

**1. Record kinds.** Every record kind CAP-02 writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap02SourceRegistration` | Admitted record, versioned | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:SOURCE_REGISTRATION` |
| `Cap02Mapping` | Admitted record, versioned | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:MAPPING` |
| Outbound destination | Admitted record (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:OUTBOUND_DESTINATION` |
| `Cap02AcquisitionRun` | Admitted record, written once | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (`ACQUISITION_STEWARD`) | Never superseded; withdrawn by `RUN_WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:ACQUISITION_RUN` |
| `Cap02StagedItem` | Admitted record, written once, quarantined until a governed CAP-04 admission | A term from the registration's `sourceTypes` | `SOURCE_AS_RECEIVED` (`REQUIRED_FALSE`) | `HUMAN` for a supplied file; `SERVICE` for a retrieval, `initiatedBy` the steward | Never superseded; expires or is purged | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:STAGED_ITEM` |
| `SOURCE_APPROVAL`, `MAPPING_APPROVAL`, `OUTBOUND_DESTINATION_APPROVAL`, `ACQUISITION_POLICY_APPROVAL`, `RUN_WITHDRAWAL`, `STAGED_ITEM_PURGE`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `"2"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `"sha256:"` comment on a `recordDigest` in this contract now reads so.
- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.
- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.
- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.
- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.

**2. Written once.** **A staged item is written once.** Its duplicate flags, mapping preview and intake checks are machine output written **with** the item, in the same transaction, never added later; a later check is a record of its own, citing the item's digest. Its purge or expiry is a receipt (`ITEM_PURGED`, `ITEM_EXPIRED`), never a change to the item.

**3. Supersession.** A new registration or mapping version supersedes the previous one with the platform's declared and resolved `supersedes`, reason `NEW_VERSION`, or `CORRECTION` or `WITHDRAWAL`. **Runs and staged items are never superseded.**

**4. Citations.** Every reference CAP-02 relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

Every citation CAP-02 makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Basis `evidence[]` | Mandatory evidence | `SUPPORTS`; **now with the applicable version** | `CAP-04:MEMORY_RECORD` | Yes | Refusal `PERMITTED_USE_NOT_ESTABLISHED`, at approval and at run start |
| Mapping `sourceRegistrationId` | Subject | `REFERS_TO`; **now with the registration version** | `CAP-02:SOURCE_REGISTRATION` | Yes | Refusal `RECORD_NOT_FOUND` |
| Run `sourceRegistrationId` and `registrationVersion`, `sourceApprovalDecisionId` | Authority or membership | `RELIED_ON` | `CAP-02:SOURCE_REGISTRATION`; `AAB-PLATFORM-08:HUMAN_DECISION` | Yes | Refusal `SOURCE_NOT_APPROVED` |
| Run `mappingId` and `mappingVersion` | Authority or membership | `RELIED_ON` | `CAP-02:MAPPING` | Yes, when declared | Refusal `MAPPING_NOT_APPROVED` |
| Staged item `runId` | Authority or membership | `PART_OF`, set by the system | `CAP-02:ACQUISITION_RUN` | Yes | Cannot be unresolved: set by the system |
| Staged item `duplicateFlags[].candidate`, `mappingPreview` | Related | None: machine output, never in `lineage`, never relied on | Staged items; `CAP-04:MEMORY_RECORD`; `CAP-02:MAPPING` | No | Omitted, with the flag's disclosure |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

**5. The six-gap matrix.**

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Source registration, mapping, outbound destination | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Acquisition run | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Staged item | Limitation `SOURCE_UNIDENTIFIED` where the source gives no identifier for the item | N/A while staged: the bytes are held under a platform-computed digest. After expiry or purge, ORIGINAL_NOT_STORED applies: only the digest and metadata remain. | N/A: the digest is computed on receipt | By citation class (section 4) | N/A for a retrieval: custody is the run; for a supplied file, Limitation `CUSTODY_DECLARED_INCOMPLETE` | N/A for a retrieval; for a supplied file, Limitation `CUSTODY_NOT_DECLARED` |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.

**6. Vocabulary.** CAP-02 adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.

**7. Submitters.** **Registrations, mappings, outbound destinations, runs and supplied files are submitted by a `HUMAN`, in their own name.** **A staged item from a retrieval is written by the platform's acquisition service,** under AAB-PLATFORM-05, section C, and only when:
  - the service is a **registered, scoped `SERVICE`** actor, for this country and CAP-02's staged items only;
  - **`initiatedBy` is the steward** who started the run;
  - **the source adapter and the software release are recorded** (`service.method`, `service.methodVersion`, `service.softwareRelease`);
  - **the run is cited** (`triggerKind` `RECORD`, naming the run);
  - **the service creates no admission decision, and cannot submit to CAP-04;**
  - **the staged item stays quarantined until a governed CAP-04 admission.**

  **Decision 5 now reads:** no service account submits to CAP-04, and no service decides; a retrieval's staged items are recorded as the acquisition service's, initiated by the steward, under these conditions.

**8. People in content.** `Cap02AcquisitionRun.startedBy` is the run's `provenance.submission.submittedBy`, kept as a read alias and never set separately.

**9.** **Provenance is added** to `Cap02AcquisitionRun` and `Cap02StagedItem`, as line 29 already said of every CAP-02 record: each now has `provenance: Provenance` and `recordDigest: DigestReference`.

**10.** **The staged item's digests are typed** (AAB-PLATFORM-10, section 5): `digest` is an `objectDigest`, `raw-bytes`, `sha-256`, held as a `DigestReference`; `stagingReference` keeps its form as a storage reference.

**11.** **`AUTOMATED_MAPPING` has the automation constraint `REQUIRED_TRUE`** in CAP-03's vocabulary (its amendment of 2026-10-02). Decision 23's sentence "It contains `AUTOMATED`, so it always has `automated: true`" is replaced by that declaration.

**12.** **The open gap "canonicalisation" is closed** by AAB-PLATFORM-10. The sovereign data boundary stays open.

**13. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**

## Why this contract, and what it adopts

**Why.** Committed records already place CAP-02:
- **CAP-01** says CAP-02 "owns external sources", that material it brings in "reaches CAP-01 only as CAP-04 evidence", that the rehearsal's "source registry, adapters, snapshots, atoms, synthesis" are "CAP-02's, when it is contracted", and that any outbound retrieval is "an explicit outbound surface under the egress specification and Gate D". It leaves spatial investigation open between CAP-01, CAP-02 and proposed CAP-36 (CAP-01, "Open gaps"). **This contract answers both** (decisions 8 and 12), with CAP-01's amendment.
- **CAP-04** replaced its staged `registerSource`, `preserveOriginal` and `registerExtraction` with one submission, and made source and provenance the platform's provenance, "never a separate, optional registry". **CAP-02 keeps it so:** a CAP-02 source registration governs acquisition; the provenance of what is admitted stays CAP-04's.
- **The Historical Scientific Memory Recovery pathway** (CAP-34 pathway reconciliation, "DESIGNED — BUILD REQUIRED; EVIDENCE REQUIRED") pairs CAP-02 with CAP-04, and sets its outcomes: provenance-preserving, reversible adapters; failed, null, contradictory and negative results kept; duplicates detected and never silently merged; institutions keeping their own systems; imported material never becoming approved learning or scientific fact automatically. **This contract adopts them** (decision 10).
- **The researcher adoption and scientific memory principles:** "AAB must not guess when meaning, units, methods, provenance or relationships cannot be established confidently," and "Historical ingestion is not equivalent to acceptance into governed scientific knowledge."

**Its description** (the overview, section 7.3): CAP-02 "brings scientific data in from authorised sources". **The name is kept** (decision 1): acquisition is bringing material in, and interoperability is mapping it to AAB's structures.

The evidence is the step 0 snapshots, **with every acquisition, source, adapter, snapshot, atom, synthesis, spatial, investigation, economic-fact and crosswalk path in `country_core`, `agriculture`, `public`, `observation_core` and `regulatory_core`, and the whole PHP gateway, read in full** ("What the rehearsal does").

**What it adopts:**
- **AAB-PLATFORM-03 (ActorReference)** and **AAB-PLATFORM-09 (public-key registry):** every actor server-resolved and scoped; every human decision signed.
- **AAB-PLATFORM-05 (governed provenance)** and **AAB-PLATFORM-06 (admission decisions):** every CAP-02 record carries the platform's provenance, and is refused or written in one transaction.
- **AAB-PLATFORM-08 (attributable human review):** source approval, mapping approval, outbound destination approval, run withdrawal, staged-item purge and challenge are human decisions.
- **AAB-PLATFORM-01 (evidence object store),** as amended on 2026-10-02 with this contract: **the AGR acquisition staging area,** where acquired bytes wait, and the copy of a staged item into the AGR profile when a person submits it.
- **CAP-03 (evidence integrity and provenance):** `cap-03-vocabulary-1`, with one term registered here (decision 23); CAP-03's verification of the CAP-04 records CAP-02 hands over.
- **CAP-04 as amended:** every licence, agreement and terms document a permitted-use basis cites is an admitted CAP-04 `DOCUMENT` record, read for the purpose `ACQUISITION_GOVERNANCE`; every acquired item reaches AGR only by a CAP-04 submission, through the batch route and check 13 its amendment adds.
- **The platform's observation and brain governance,** the brain boundary, **the domain register and cognitive architecture**, **the non-return boundary** and **the egress specification:** CAP-02 is bound by them, and cites them.

AAB-PLATFORM-07 is **not adopted:** CAP-02 makes no evaluation of admitted evidence. Its duplicate flags record the time of the CAP-04 search they used, and are machine output, never an evaluation. AAB-PLATFORM-02 and package compilation are **not adopted:** CAP-02 compiles no package. AAB-PLATFORM-04 is **not adopted:** nothing in CAP-02 is submitted on behalf of another party.

**Decisions recorded on 2026-10-02** (approved by the Platform Owner in review; decisions 5, 7, 12 and 21 confirmed as recommended, after the options were set out):
1. **Capability identifier `CAP-02`, named "Governed Scientific Data Acquisition & Interoperability",** domain `AGR`; routes under `/agr/v1/`; schema `agr`; JSON schemas under `urn:aab:schema:agr:cap-02:`. Receipts are accepted already (migration 025).
2. **The governing principle above is binding** on every part of this contract.
3. **Sources are registered and approved, never ranked.** A source registration states the publisher, the source's own identifier, the access method, its jurisdiction and the publisher's kind, as declared facts. **A person who did not register the source approves it for acquisition.** No authority tier, confidence or `VERIFIED_SOURCE` label exists: a source's authority stays CAP-03's `SOURCE_AUTHORITY_NOT_VERIFIED`, and is never inferred from its kind.
4. **Permitted use is a hard gate.** No acquisition proceeds without a recorded basis for using the source for the run's purpose: a licence, an agreement or a statutory basis, each evidenced by admitted CAP-04 documents. **An unknown or expired basis fails closed** (`PERMITTED_USE_NOT_ESTABLISHED`). The basis and its terms travel with every acquired item, and bound the `permittedUses` of every record submitted from it (CAP-04, check 13).
5. **A named person starts each run; a named person submits.** An `ACQUISITION_STEWARD` starts every acquisition run. What it acquires is staged. **A `MEMORY_SUBMITTER` submits staged items to CAP-04 in their own name,** each as its own CAP-04 submission and decision, singly or through CAP-04's batch route. **No service account submits, and no service actor is ever an uploader, submitter or decider.** The platform's API identity performs a retrieval only within a run a steward started, and the run names that person.
6. **What counts as automated.** An item acquired unchanged is `SOURCE_AS_RECEIVED`, `automated: false`, with its retrieval recorded. **Any extraction, field mapping, unit conversion or machine translation is `automated: true`,** and a CAP-04 record of such content is always held for review (CAP-04, decision 5).
7. **Integrity and staging.** **The platform computes every digest on receipt; a digest supplied by a caller is never accepted as the item's.** Acquired bytes wait in the country-local **AGR acquisition staging area** (AAB-PLATFORM-01's amendment of 2026-10-02), with their digest and a short retention, **90 days as the pilot value.** **They enter the AGR profile only when a person submits them to CAP-04,** copied and re-hashed. The digest, size and media type of every staged item are recorded in CAP-02 permanently, whether or not it is ever submitted.
8. **Every retrieval is an outbound surface.** A retrieval reaches only an **outbound destination approved by an `ACQUISITION_GOVERNOR`,** through a **fixed query template** approved with the source. **No URL is ever supplied by a caller. No query parameter may carry country scientific information** (the egress specification's category 2), such as a trial plot, a resource site or an ingredient: parameters are limited to the template's declared, non-protected values. **No scheduled or background run exists, as the pilot position:** a person starts every run.
9. **Interoperability by approved mappings.** A mapping (a source's fields, terms and units to AAB's canonical forms) is a versioned record, authored by one person and **approved by a `SOURCE_APPROVER` who did not author it.** **Mapping by name is never allowed.** An unmapped or ambiguous field, term or unit is never guessed: the item cannot be submitted as mapped content, and may still be submitted as received. **Original values are always kept:** the original is stored with every record made from it. **Units are converted only by a declared rule** of the mapping.
10. **The historical recovery rules.** Negative, null, failed and contradictory results are kept: **a mapping never filters by outcome,** and a null stays null. **Possible duplicates are flagged and shown, never merged.** The institution keeps its own system: CAP-02 copies, and changes nothing at the source. **Nothing becomes CAP-09 learning, or any capability's record, automatically.** A run can be withdrawn: its staged items are purged or left to expire, and its admitted records are withdrawn by CAP-04 supersession, **never by deletion.**
11. **No automatic materialisation.** Nothing CAP-02 acquires creates a CAP-01, CAP-06 or any other capability's record. The rehearsal's automatic capture is not carried across.
12. **Spatial and satellite data.** **CAP-02 owns acquiring spatial datasets and satellite scenes** like any other source. **A metric computed from them is automated content.** Interpreting them belongs to CAP-01 (resources and environmental burden) or proposed CAP-36 (field observation). **Spatial computation is out of launch scope.** This closes CAP-01's open gap, with CAP-01's amendment.
13. **Other countries and planned domains.** **CAP-02 never acquires from another AAB country environment or another AAB domain;** that waits for governed packets (CAP-03, decision 14). Public data on soil, water, climate or environmental subjects may be acquired as an external source, **but CAP-02 does not become those planned domains.** A centrally shared reference set needs separate authorisation under the canonical template rule (as CAP-06, decision 12); until then, **each country registers its own sources.**
14. **Roles:** `ACQUISITION_STEWARD` (registers sources and mappings, starts runs, supplies files); `SOURCE_APPROVER` (approves sources and mappings, never their registrant or author); `ACQUISITION_GOVERNOR` (approves outbound destinations and the country's acquisition policy, purges staged items, resolves challenges); `ACQUISITION_READER`; and CAP-04's `MEMORY_SUBMITTER`.
15. **Adoptions:** as listed above.
16. **Machines may** fetch within an approved run, compute digests, validate formats, scan for malicious content, extract metadata, propose mappings, apply approved mappings to produce previews, and flag possible duplicates, **every output labelled `MACHINE_GENERATED`.** **Machines may never** register or approve a source, approve a mapping or a destination, choose a source's authority, submit, admit, merge, or start a run.
17. **No score of any kind:** no source quality, reliability, coverage percentage or confidence.
18. **Not carried across:** the Airtable adapters and the rehearsal's browser adapter files; the authority tiers and literal `VERIFIED` statuses; caller-supplied hashes; runner secret-hash policies; `SECURITY DEFINER` writers with no actor check; the ingest function and its automatic capture; the Thailand seed and its overwrites; the Western Australia-only spatial tables; cascading deletes; `country_source_status`. **The rehearsal's data is not CAP-02's;** any figure wanted again is acquired again, with real provenance.
19. **Country policy may add requirements, never remove platform floors. CAP-02's records stay in the country.**
20. **CAP-01, CAP-04 and AAB-PLATFORM-01 are amended in the same change as this contract.** CAP-03 is not: its extension rule admits CAP-02's one term (decision 23).
21. **Launch scope:** **person-supplied files,** and **allowlisted public sources retrieved when a person starts the run.** **Live connectors into institutional systems wait** for the sovereign data boundary's platform contract and Gate D's inventory of outbound endpoints.
22. **Currency.** A source approval lapses at the earliest of its permitted-use basis's expiry and **12 months, as the pilot position;** a run may not start under a lapsed approval. **A change in a source's format** (a field, structure or code list its mapping relies on) **blocks the mapping** until a new mapping version is approved (`SOURCE_FORMAT_CHANGED`).
23. **The vocabulary.** CAP-02 adopts `cap-03-vocabulary-1`, and registers one generation method of its own: **`AUTOMATED_MAPPING`,** mapped to `AUTOMATED_EXTRACTION`, because applying a mapping takes content from an original and restructures it by machine. It contains `AUTOMATED`, so it always has `automated: true`.

**Prerequisites before any code:** CAP-04 built first; the AAB-PLATFORM-01 staging area built and its store behaviour tested (its amendment, section 7); the dependency audit's independent verification and the extraction (roadmap, section 8.5). **For retrieval from public sources, also:** Gate D's inventory of outbound endpoints, with each approved destination in it.

**Nothing is implemented by this contract.**

## The boundary, in plain English

> **When a country wants scientific data from outside AAB, a person registers where it comes from and on what terms it may be used, and someone else approves that. A person then brings it in, by supplying the files or by starting a retrieval from an approved public source. AAB keeps an exact, digested copy, waiting. If its fields need translating into AAB's terms, an approved mapping does it, and keeps the originals. A person decides what to submit to scientific memory, where it is checked like anything else. AAB never decides that a source is authoritative, never guesses a meaning, never merges what looks the same, and never lets anything it brought in become knowledge by itself.**

CAP-02 keeps the governed record of sources, their approvals and permitted-use bases, outbound destinations, mappings, acquisition runs, staged items and withdrawals. It does not admit evidence (CAP-04), verify integrity or lineage after admission (CAP-03), interpret what it acquires (CAP-01, CAP-05, proposed CAP-36), recommend sources, or operate the sovereign data boundary.

## What CAP-02 answers, and what it does not

| Question | Answered by |
|---|---|
| Where does this material come from, and on what terms may it be used here? | **CAP-02,** a source registration and its approval |
| Is the source an authority on its subject? | **Not CAP-02,** and not CAP-03 (`SOURCE_AUTHORITY_NOT_VERIFIED`). A scientist's judgement, in the capability that relies on it |
| What exactly was acquired, from where, when, and by whose run? | **CAP-02,** the run and its staged items |
| What does this source's field or term mean in AAB's terms? | **An approved CAP-02 mapping,** or nothing: never a guess |
| Is it evidence? | **CAP-04,** on a person's submission |
| Is it still what AAB recorded? | **CAP-03,** once admitted |
| What does it show about a resource, a problem or a field? | CAP-01, CAP-05, proposed CAP-36 |
| Which sources should a country use? | **Not CAP-02.** A person's choice; no source is recommended |

## What the rehearsal does, and how this contract accounts for it

**Read in full for this contract:**
- **`country_core`** (`agr-rehearsal/snapshot-2026-09-28-supplementary/source-b/country_core/`): `country_source_registry`, `country_source_adapter_config`, `bootstrap_source_adapter`, `country_scan_knowledge_definition`, `country_scan_source_requirement`, `country_scan_profile`, `spatial_source_connection`, the three execution-policy tables, `bootstrap_scan_run`, `bootstrap_scan_brain_event`, `bootstrap_scan_finding`, `country_source_evidence_snapshot`, `discovery_evidence_atom`, `discovery_synthesis_result`, `country_discovery_recipe`, `spatial_acquisition`, `spatial_computed_observation`, `spatial_investigation_area`, `spatial_investigation_run`, the demo-jurisdiction tables, `country_economic_fact`, `country_economic_baseline`, the institution unit and metric definitions, the sharing tables; every function that reads or writes them (`api_start_country_bootstrap`, `api_seed_country_economic_baseline`, `api_ingest_bootstrap_finding`, `api_materialise_country_resource_finding`, `api_generate_country_brief`, the context, onboarding, scan-knowledge and impact functions), their views, grants and row-level security.
- **`agriculture`** (`agr-rehearsal/snapshot-2026-09-28/source-b/agriculture/`): `source_system`, `source_object`, `source_record_reference`, `evidence_source`, `provenance_assertion`, `input_submission`, the resource investigation tables, and `api_register_evidence_source`, `api_assert_provenance` and the resource candidate functions they reach.
- **`public`**'s spatial investigation tables; **`observation_core`**'s domain adapters, source modes and external evidence links; **`regulatory_core`**'s sources; **`database.sql`**'s extensions; and `migrations.sql`.
- **The whole PHP gateway** (`agr-rehearsal/snapshot-2026-09-28/source-a/`, 29 files): every outbound call, every action, the configuration loaders and the deployment guard.
- **The catalogue's adapters** (`governance/AAB-current-technical-contract-catalogue-2026-09-20.md`): the six browser adapter files are not in the step 0 snapshot, whose static files are excluded, and are evidenced by the catalogue only.

**What it does, as read:**
- **Nothing connects to anything.** The database has no `pg_net` or http extension and no scheduled jobs, and no function makes a network call. The gateway's only live outbound calls are to its own authentication service. A generic HTTP helper, left from the Airtable era, is never called (`api.php`, line 132).
- **A complete acquisition model with no writer.** A global source registry with authority tiers (`TIER_1_GOVERNMENT` to `TIER_5_DISCOVERY_UNVERIFIED`), `VERIFIED_SOURCE` statuses and refresh cadences, and no licence, terms or version; adapter configurations with endpoint URLs, read and written by nothing; evidence snapshots recording retrieval time, HTTP status, a content hash and duplicates; evidence atoms and synthesis results constrained away from the brain; satellite scenes from STAC catalogues, with a free-text checksum; computed spatial observations. **No function writes any of them.** Their rows came from migrations or from runners outside the database, authorised by secret hashes the database never checks.
- **The one ingest function has no authority check** (`country_core/functions.sql`, lines 639 to 667). It runs with owner rights, accepts any caller's `p_confidence`, including `VERIFIED`, and, when an adapter allows it, creates CAP-01 resource candidates as a system actor. Its waste-stream branch always fails. The gateway never calls it.
- **The country bootstrap is narration,** ending in `AWAITING_EXTERNAL_SOURCES`, where it stays.
- **Economic facts are typed into code,** for Thailand only, labelled `VERIFIED_SOURCE`, and **overwritten in place with `retrieved_at` set to the time of the overwrite** (lines 959 to 969), contradicting the rehearsal's own principle `NO_SILENT_OVERWRITE` (line 496).
- **Hashes are claimed, not computed:** the snapshot's content hash, `source_object`'s, `evidence_source`'s and the spatial checksum are supplied by their writer, and no stored original exists to recompute them.
- **Mapping is free text:** adapter versions, units and metric codes are strings, payloads have no schema version, and the only governed mapping is an institution's unit and metric definitions, overwritable in place.
- **Weak foundations:** owner-rights writers with no actor check; cascading deletes from profiles and runs; row-level security disabled on `observation_core` and `regulatory_core`; full privileges, `TRUNCATE` included, for the service role on the public spatial tables; the Western Australia spatial tables hard-limited to `AU-WA`; sovereignty and imagery policies held as unenforced JSON.
- **The gateway's one CAP-02 action,** `country_source_status` (`api.php`, line 292), lists the adapter catalogue to any signed-in user, with no workspace scope. It is not brought across (CAP-01, decision 11).
- **The catalogue's six adapters** (`AAB-ADAPTER-AGRI-01`, `-AQUA-01`, `-ENV-01`, `-MFG-01`, `-WATER-01` and the cross-domain `-CORE-01`) are browser files describing field mappings, each `*_DEFINED_NOT_CONNECTED`. The agriculture adapter maps Airtable tables. **Every Airtable action is retired** (HTTP 410), and the gateway refuses to start when Airtable credentials are configured.

**In one line:** the rehearsal names every part of acquisition, connects none of them, trusts its writers' hashes and confidence, and has one ingest path that creates records as a system actor without asking anyone. **That is not carried across, in any form.**

**How this contract accounts for it:**

| Rehearsal | This contract |
|---|---|
| Source registry with authority tiers and `VERIFIED_SOURCE` | **A source registration, approved by a second person; no tier, no verified label** (decision 3) |
| No licence, terms or permitted use | **A permitted-use basis, evidenced, a hard gate** (decision 4) |
| Adapter configuration with an endpoint URL in a row | **An outbound destination approved by a governor, and a fixed query template** (decision 8) |
| Refresh cadence, scheduled jobs expected by a readiness seal | **No scheduled run,** as the pilot position (decision 8) |
| Snapshot with a caller-supplied hash | **A staged item, digested by the platform** (decision 7) |
| Free-text adapter versions, units, metric codes | **Approved, versioned mappings; declared unit rules; never by name** (decision 9) |
| Duplicate-of links | **Duplicate flags, machine output, shown, never merged** (decision 10) |
| Evidence atoms, synthesis results, computed observations | **Not carried across.** Extraction and computation are automated content, held in CAP-04; synthesis is not CAP-02's |
| Ingest that creates candidates as a system actor | **Not carried across.** Nothing is materialised (decision 11) |
| Satellite scenes and spatial connections | **Acquisition is CAP-02's; computation out of launch scope** (decision 12) |
| Demo jurisdictions, Western Australia spatial tables | **Not carried across** |
| Thailand economic seed, overwritten | **Not carried across.** A figure is acquired again, as a CAP-04 record with its source |
| Legacy crosswalk (`source_record_reference`), never written | **A run's items and their CAP-04 records,** traceable both ways |
| `country_source_status` | **Not carried across** (CAP-01, decision 11) |
| Airtable adapters; the retired Airtable actions | **Not carried across.** An institution's system is reached, after launch, only through a live connector this contract defers (decision 21) |
| Owner-rights writers; no row security; cascades; service role with `TRUNCATE` | **Not carried across** |

**The rehearsal's data is not CAP-02's.** CAP-02's records start empty in a new deployment.

## Sources and their approval

```typescript
interface Cap02SourceRegistration {
  sourceRegistrationId: string;
  registrationVersion: number;          // a change is a new version, approved again
  schemaVersion: string;                // "urn:aab:schema:agr:cap-02:source-registration:1"
  countryWorkspaceId: string;

  // Declared
  sourceName: string;
  publisher: string;                    // who publishes or holds it, as declared
  publisherKind:                        // a declared fact, never a rank (decision 3)
    | "GOVERNMENT_BODY" | "INTERGOVERNMENTAL_BODY" | "RESEARCH_INSTITUTION"
    | "UNIVERSITY" | "INDUSTRY_BODY" | "COMPANY" | "COMMUNITY_ORGANISATION"
    | "INDIVIDUAL" | "OTHER";
  sourceIdentifier?: string;            // the source's own identifier: a DOI, accession, dataset id
  jurisdiction: string;                 // where the publisher operates, as declared
  sourceTypes: string[];                // cap-03-vocabulary-1 source types its material carries
  accessMethod: "PERSON_SUPPLIED_FILE" | "ALLOWLISTED_PUBLIC_RETRIEVAL";   // decision 21
  description?: string;

  // For ALLOWLISTED_PUBLIC_RETRIEVAL only
  retrieval?: {
    outboundDestinationId: string;      // an approved destination (decision 8)
    queryTemplates: Array<{
      templateId: string;
      pathTemplate: string;             // fixed; only declared parameters vary
      parameters: Array<{
        name: string;
        allowedValues?: string[];       // an enumeration, or
        pattern?: string;               // a pattern of non-protected values
        protectedValueRefused: true;    // always: no category-2 content (decision 8)
      }>;
      expectedMediaTypes: string[];     // within the staging area's accepted types
    }>;
  };

  provenance: Provenance;               // AAB-PLATFORM-05
  recordDigest: string;
}
```

- **Approval is a human decision** (AAB-PLATFORM-08) of the kind `SOURCE_APPROVAL`, by a `SOURCE_APPROVER` who did not register the source, bound to the registration's identifier, version and digest. Its outcome is `APPROVE`, `REFUSE` or `REQUIRE_INFORMATION`.
- **An approval records the permitted-use basis:**

  ```typescript
  interface Cap02PermittedUseBasis {
    basisKind: "LICENCE" | "AGREEMENT" | "STATUTORY";
    licenceIdentifier?: string;         // e.g. an SPDX identifier, for a standard licence
    evidence: string[];                 // admitted CAP-04 DOCUMENT records: the licence, the agreement,
                                        // or the provision; read for ACQUISITION_GOVERNANCE
    permittedPurposes: string[];        // what acquired material may be used for; never empty
    obligations: string[];              // attribution, share-alike, no redistribution, as stated
    restrictions: string[];             // what the terms forbid
    expiresAt?: string;                 // when the basis ends, if it does
  }
  ```

  The approver states that they read the evidence, and that it covers the purposes. **An approval never says the source is authoritative, reliable or accurate.**
- **A run may start only under a valid, current approval** of the registration's current version, for a purpose within `permittedPurposes`. Otherwise it is refused: `SOURCE_NOT_APPROVED` or `PERMITTED_USE_NOT_ESTABLISHED`.
- **Currency** (decision 22): an approval lapses at the earliest of the basis's `expiresAt` and 12 months; a new registration version, a superseded evidence document, or an upheld challenge ends it at once. **Lapse stops new runs only.** Items already staged or submitted keep the basis they were acquired under, shown with its state.

## Outbound destinations

- **An outbound destination** is a host and a scheme, `https` only, recorded with its purpose, the sources that use it and the egress specification's inventory reference. **An `ACQUISITION_GOVERNOR` approves it** with a human decision of the kind `OUTBOUND_DESTINATION_APPROVAL`, and may withdraw it at any time.
- **A retrieval reaches only its source's approved destination,** by one of its templates, with declared parameters only. **Redirects are not followed** to any other host; a response from elsewhere is refused (`OUTBOUND_DESTINATION_NOT_APPROVED`).
- **A parameter carrying country scientific information is refused** (`OUTBOUND_PARAMETER_NOT_PERMITTED`): a location, name or code drawn from a CAP-01, CAP-06, CAP-07, CAP-08 or CAP-36 record is never a parameter. A public administrative boundary or a date range may be.
- **No destination is another AAB country environment or domain** (decision 13): such a destination is refused at approval (`CROSS_BOUNDARY_REQUEST_BLOCKED`).
- **No retrieval may proceed until Gate D's outbound inventory lists the destination.** Approving a destination in CAP-02 does not open it at the network: the country environment's egress controls do, under the egress specification.

## Mappings

```typescript
interface Cap02Mapping {
  mappingId: string;
  mappingVersion: number;               // any change is a new version, approved again
  schemaVersion: string;                // "urn:aab:schema:agr:cap-02:mapping:1"
  countryWorkspaceId: string;
  sourceRegistrationId: string;
  sourceFormat: {                       // what the mapping relies on; a change blocks it (decision 22)
    formatDescription: string;
    fields: string[];
    codeLists?: Record<string, string[]>;
  };
  targetRecordType: string;             // a CAP-04 record type
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;                // a field of the CAP-04 record type
    termMappings?: Array<{ sourceTerm: string; canonicalTerm: string }>;
    unitRule?: {
      sourceUnit: string;
      targetUnit: string;
      multiplier: number;
      offset: number;
      reference: string;                // where the rule comes from
    };
  }>;
  nullHandling: "KEEP_NULL";            // the only value: a null is never a zero (decision 10)
  rowFilter: "NONE";                    // the only value: no row is dropped by its outcome (decision 10)
  provenance: Provenance;
  recordDigest: string;
}
```

- **A `SOURCE_APPROVER` who did not author it approves it,** with a human decision of the kind `MAPPING_APPROVAL`, bound to the mapping's version and digest.
- **Applying a mapping is machine work, and its output is automated content:** generation method `AUTOMATED_MAPPING`, `automated: true` (decision 23), with the mapping's identifier and version in `generation.methodVersion`. A CAP-04 record of it is always held (CAP-04, decision 5).
- **A field, term or unit the mapping does not cover is not mapped,** and is never guessed. An item with an unmapped value **cannot be submitted as mapped content** (`MAPPING_INCOMPLETE`); it may still be submitted as received. **A value matching more than one mapping is refused** (`MAPPING_AMBIGUOUS`).
- **A machine may propose a mapping.** A proposal is labelled `MACHINE_GENERATED`, and is nothing until a person authors it as a mapping and another approves it.
- **The original is kept.** Every record submitted from mapped content cites its staged item, whose bytes become the record's stored original, and states where in the original the content came from (CAP-04's `extraction.sourceLocation`).

## Acquisition runs

```typescript
interface Cap02AcquisitionRun {
  runId: string;
  schemaVersion: string;                // "urn:aab:schema:agr:cap-02:acquisition-run:1"
  countryWorkspaceId: string;
  startedBy: ActorReference;            // an ACQUISITION_STEWARD, set by the system
  startedAt: string;                    // the platform's clock
  sourceRegistrationId: string;
  registrationVersion: number;
  sourceApprovalDecisionId: string;     // the approval relied on, valid and current at start
  purpose: string;                      // within the basis's permittedPurposes
  method: "PERSON_SUPPLIED_FILE" | "ALLOWLISTED_PUBLIC_RETRIEVAL";
  retrieval?: { templateId: string; parameters: Record<string, string> };
  mappingId?: string;                   // an approved mapping, if previews are wanted
  mappingVersion?: number;
  recordDigest: string;
}
```

**Each staged item:**

```typescript
interface Cap02StagedItem {
  itemId: string;
  runId: string;
  stagingReference: string;             // "agr-staging:sha256:…", set by the system
  digest: string;                       // "sha256:…", computed by the platform on receipt
  sizeBytes: number;
  mediaType: string;                    // as received; within the staging area's accepted types
  receivedAt: string;                   // the platform's clock
  stagingExpiresAt: string;             // receivedAt + the staging retention (decision 7)
  sourceItemIdentifier?: string;        // the source's own identifier for it: a file name, scene id, DOI
  retrievalObservation?: {              // ALLOWLISTED_PUBLIC_RETRIEVAL only, as observed
    requestedPath: string;
    httpStatus: number;
    etag?: string;
    lastModified?: string;              // as the source states it
    sourcePublishedAt?: string;         // as the source states it
  };
  sourceDeclaredMetadata?: Record<string, unknown>;  // e.g. a scene's footprint, cloud cover:
                                                     // recorded as the source states it, never verified
  mappingPreview?: { mappingId: string; mappingVersion: number;
                     outcome: "MAPPED" | "MAPPING_INCOMPLETE" | "MAPPING_AMBIGUOUS" };  // MACHINE_GENERATED
  duplicateFlags: Array<{               // MACHINE_GENERATED; never a merge (decision 10)
    basis: "SAME_DIGEST" | "SAME_SOURCE_IDENTIFIER" | "SIMILAR_CONTENT";
    candidate: string;                  // a staged item or an admitted CAP-04 record
    searchedAt: string;                 // when the comparison read CAP-04
  }>;
  intakeChecks: Array<{                 // MACHINE_GENERATED; intake processing, not interpretation
    check: "FORMAT_VALID" | "MALICIOUS_CONTENT_SCAN" | "METADATA_EXTRACTED";
    result: "PASSED" | "NOT_PASSED" | "NOT_EVALUATED";
    detail?: string;
  }>;
}
```

- **A run is written once,** when it starts. What happened since is derived when read: its items, their submissions and decisions in CAP-04, its withdrawal and any purge.
- **Person-supplied files:** the steward uploads each file to the run, into the staging area. **Retrieval:** the platform makes the template's request, with the run's parameters, and stages each response accepted. A failed retrieval records its observation and stages nothing.
- **Intake checks** are those the observation and brain governance allows on quarantined material: format, malicious content, metadata. **No interpretation happens in CAP-02.** An item that fails the malicious content scan cannot be submitted (`STAGED_ITEM_UNSAFE`).
- **Nothing in staging is evidence.** It is read only by CAP-02's roles and by `MEMORY_SUBMITTER`, within the country workspace, served as a download, never rendered.

## Handing over to CAP-04

**The only way out of CAP-02 is a person's CAP-04 submission** (decision 5).
1. **A `MEMORY_SUBMITTER` copies the staged item into the AGR profile** (`POST /agr/v1/evidence-objects/from-staging`, AAB-PLATFORM-01's amendment of 2026-10-02). The platform re-hashes the bytes, which must equal the item's recorded digest, or nothing is stored (`STAGED_ITEM_INTEGRITY_MISMATCH`). The result is an ordinary `agr-object:sha256:…`, under the profile's hundred-year lock.
2. **They submit the record** to CAP-04, singly or in a batch (CAP-04's amendment of 2026-10-02), citing the item by `acquisitionItemId`. **CAP-04 decides it, by its own rules, with check 13** (its amendment).
3. **What the submitter declares, and what the system sets:**
   - `provenance.source`: the source registration's `sourceTypes` term, the item's source identifier, the publisher as `sourceOrganizationId` where registered, and the source's published time as `originatedAt`, all **declared** by the submitter, and checked against the registration by check 13;
   - `provenance.generation`: `SOURCE_AS_RECEIVED` with `automated: false` for an item submitted unchanged; `AUTOMATED_MAPPING` with `automated: true` for mapped content (decision 6);
   - `provenance.custody`: the steps the submitter accounts for, the CAP-02 run among them;
   - `classification.permittedUses`: **within the basis's `permittedPurposes`,** or check 13 refuses;
   - `acquisition`: **set by the system** from the item: the item, run, registration version and approval, and any mapping version.
4. **CAP-04's other checks are unchanged.** In particular, **a submitter whose grant is not scoped to the owning institution** has the record held (check 10), and **automated content is always held** (check 9).

**Traceability both ways.** An item shows every CAP-04 record submitted from it, and each record shows its item, run, source approval and mapping. The rehearsal's crosswalk, never written, is replaced by this.

## Withdrawing a run

- **An `ACQUISITION_STEWARD` or `ACQUISITION_GOVERNOR` withdraws a run** with a human decision of the kind `RUN_WITHDRAWAL`, stating the reason, for example a basis found invalid or material acquired in error.
- **Staged items not submitted** are purged at once, by the platform, or left to expire, as the decision says. **Their digests, sizes and media types stay recorded** in CAP-02.
- **Records already submitted are withdrawn in CAP-04,** each by a supersession with the reason `WITHDRAWAL`, made by a `MEMORY_SUBMITTER` whose grant covers the owning institution (CAP-04, "Supersession and withdrawal"). The run's decision lists them, and shows which are still to be withdrawn.
- **Nothing is deleted from CAP-04.** A withdrawn record stays readable, and everything that cited it still names it.

**Purging one staged item** without withdrawing a run, for material that must not be held, such as personal information acquired in error, is a human decision of the kind `STAGED_ITEM_PURGE` by an `ACQUISITION_GOVERNOR` (AAB-PLATFORM-01's amendment, section 4).

## Spatial and satellite acquisition

- **A satellite scene or spatial dataset is an item like any other** (decision 12), acquired from an approved public catalogue by a template whose parameters are public: a collection, a date range, an administrative boundary. **A trial plot, a resource site or any CAP-01, CAP-08 or CAP-36 location is never a parameter** (decision 8).
- **Its footprint, acquisition time, cloud cover and asset list are the catalogue's statements,** recorded as `sourceDeclaredMetadata`, never verified by CAP-02.
- **Assets larger than the staging area accepts** are not staged: they are cited by their accession where held, and a record citing them is `UNVERIFIED`, with its limitations (CAP-04, "The original, and its integrity").
- **No metric is computed in CAP-02.** A computed index, classification or change detection is automated content, and **spatial computation is out of launch scope.** Interpreting a scene is CAP-01's (resources and environmental burden) or proposed CAP-36's (field observation).

## Machines, brains and the planned domains

- **Machines may** (decision 16): retrieve within an approved run; compute digests; run intake checks; extract metadata; propose mappings; apply approved mappings to produce previews; flag possible duplicates. **Every output is labelled `MACHINE_GENERATED`,** reproducible, and separate from any person's decision.
- **Machines may never:** register or approve a source; approve a mapping or a destination; judge a source's authority; start a run; submit; admit; merge; or decide what anything means scientifically.
- **No brain reads staged material.** Staging is quarantine in the sense of the observation and brain governance: "Quarantine must never be a back door into accepted memory."
- **CAP-02 owns AGR's acquisition workflow, not the planned domains' knowledge** (decision 13). Soil, Water, Climate, Environment, Ecosystem and Aquaculture data from another AAB domain arrive only through governed packets, which are not yet defined.

## The deciders

| Decision kind | Decider | Independence |
|---|---|---|
| `SOURCE_APPROVAL` | `SOURCE_APPROVER` | Never the registrant of the version |
| `MAPPING_APPROVAL` | `SOURCE_APPROVER` | Never the author of the version |
| `OUTBOUND_DESTINATION_APPROVAL` | `ACQUISITION_GOVERNOR` | Never the person who requested it |
| `ACQUISITION_POLICY_APPROVAL` | `ACQUISITION_GOVERNOR` | — |
| `RUN_WITHDRAWAL` | `ACQUISITION_STEWARD` or `ACQUISITION_GOVERNOR` | — |
| `STAGED_ITEM_PURGE` | `ACQUISITION_GOVERNOR` | — |
| `CHALLENGE_RESOLUTION` | `ACQUISITION_GOVERNOR` | Neither the challenger nor the challenged decision's decider |

- **Every decider is a `HUMAN`,** in their own name, with a verified scoped grant, and signs the decision (AAB-PLATFORM-09).
- **Challenge:** a `SOURCE_APPROVER` or `ACQUISITION_GOVERNOR` other than the decider, or the registrant or author of the challenged version. **Final in CAP-02, as the pilot position.** While a challenge to a source approval is open, no new run starts under it.
- **Decisions carry their reasoning,** addressing every element: for a source approval, the basis's evidence, purposes, obligations and restrictions.

## Adopting AAB-PLATFORM-08

| Required by the platform | CAP-02 |
|---|---|
| Decision kinds | The seven above |
| More than one decider | **None required.** A country's policy may require two for a source approval |
| Triggers and lapse | A new registration or mapping version; a superseded or quarantined evidence document of the basis; an upheld challenge; **lapse: the basis's expiry, and at most 12 months** for a source approval (decision 22); a detected source format change, for a mapping |
| Existing decisions | **None.** The rehearsal's `verification_status` values are not mapped |
| What relies on reviews | Starting a run (source approval); a mapping preview and a mapped submission (mapping approval); a retrieval (destination approval); each in the same read as its own write |

## Authority

| Role | May |
|---|---|
| `ACQUISITION_STEWARD` | Register sources and mappings; request outbound destinations; start runs; supply files; withdraw a run they started |
| `SOURCE_APPROVER` | Approve or refuse source registrations and mappings they did not register or author; challenge |
| `ACQUISITION_GOVERNOR` | Approve outbound destinations and the country's acquisition policy; withdraw any run; purge staged items; resolve challenges |
| `ACQUISITION_READER` | Read sources, approvals, mappings, runs and item records, never staged bytes, in the country workspace |
| `MEMORY_SUBMITTER` (CAP-04) | Read staged items; copy them into the AGR profile; submit them to CAP-04 |

- **Each role is a scoped grant,** resolved by the platform; a grant with no country is never read as covering every country. **Every actor is `HUMAN`,** in their own name. **Every read is authenticated,** within one country workspace.

## Receipts, operations and routes

Receipts carry `capabilityId: "CAP-02"`, for every record admission and decision kind above, and `RUN_STARTED`, `ITEM_STAGED`, `RETRIEVAL_FAILED`, `ITEM_PURGED` and `ITEM_EXPIRED`.

| Operation | Route |
|---|---|
| `registerSource`, `getSource` | `POST /agr/v1/acquisition-sources`; `GET …/:sourceRegistrationId` |
| `approveSource` | `POST /agr/v1/acquisition-sources/:sourceRegistrationId/approvals` |
| `requestDestination`, `approveDestination` | `POST /agr/v1/outbound-destinations`; `…/:destinationId/approvals` |
| `registerMapping`, `approveMapping` | `POST /agr/v1/acquisition-mappings`; `…/:mappingId/approvals` |
| `startRun`, `getRun` | `POST /agr/v1/acquisition-runs`; `GET …/:runId`, with every item and its CAP-04 records derived |
| `supplyFile` | `POST /agr/v1/acquisition-runs/:runId/files` |
| `getStagedItem` | `GET /agr/v1/acquisition-runs/:runId/items/:itemId`; `…/content` (download only) |
| `withdrawRun`, `purgeItem` | `POST …/:runId/withdrawals`; `POST …/:runId/items/:itemId/purges` |
| policy, challenges | `POST /agr/v1/acquisition-policies`; `…/challenges`, as in CAP-04 |
| Copy into the AGR profile | `POST /agr/v1/evidence-objects/from-staging` (AAB-PLATFORM-01) |
| Submit | `POST /agr/v1/memory-records`, or `…/memory-records/batches` (CAP-04) |

Every write requires an `Idempotency-Key`. **States are derived when read.**

## Failure contract

`Cap02Failure` follows CAP-04's shape, with `capabilityId: "CAP-02"`, `FAIL_CLOSED`, `noWrites: true`, and these codes in addition to the common ones (`UNAUTHENTICATED`, `ROLE_NOT_AUTHORISED`, `REQUEST_VALIDATION_FAILED`, `IDEMPOTENCY_KEY_CONFLICT`, `EVIDENCE_NOT_ADMITTED`, `CROSS_BOUNDARY_REQUEST_BLOCKED`, `RECORD_NOT_FOUND`, `DECIDER_NOT_INDEPENDENT`, `REASONING_INCOMPLETE`, `DECISION_SIGNATURE_INVALID`, the four challenge codes, `DEPENDENCY_UNAVAILABLE`):

| Code | HTTP | Meaning |
|---|---:|---|
| `SOURCE_NOT_APPROVED` | 409 | No valid, current approval of the registration's current version |
| `PERMITTED_USE_NOT_ESTABLISHED` | 422 | The basis is missing, expired, or does not cover the purpose |
| `OUTBOUND_DESTINATION_NOT_APPROVED` | 403 | The destination is not approved, or a response came from another host |
| `OUTBOUND_PARAMETER_NOT_PERMITTED` | 422 | A parameter outside the template's declared values, or one carrying country scientific information |
| `RETRIEVAL_METHOD_NOT_AVAILABLE` | 422 | A method outside launch scope, such as a live institutional connector or a schedule (decision 21) |
| `MAPPING_NOT_APPROVED` | 409 | The mapping version has no valid approval |
| `MAPPING_INCOMPLETE` | 422 | A value the mapping does not cover |
| `MAPPING_AMBIGUOUS` | 422 | A value matching more than one mapping |
| `SOURCE_FORMAT_CHANGED` | 409 | The item's format differs from the mapping's `sourceFormat` |
| `STAGED_ITEM_EXPIRED` | 410 | The staged item has expired or been purged |
| `STAGED_ITEM_UNSAFE` | 422 | The item failed the malicious content scan |
| `STAGED_ITEM_INTEGRITY_MISMATCH` | 422 | The staged bytes do not re-hash to the recorded digest |
| `POLICY_BELOW_PLATFORM_FLOOR` | 422 | A country policy relaxes a platform floor |

**A refusal never reveals more than the requester may see.**

## Dependencies

| Capability | How CAP-02 depends on it | Its state |
|---|---|---|
| CAP-04 Governed Scientific Memory | **Required:** every basis document, and every hand-over; the batch route and check 13 | `designed`; built first; amended 2026-10-02 |
| CAP-03 Evidence Integrity & Provenance | **The vocabulary;** the integrity re-check and lineage of what CAP-04 admits from CAP-02 | `designed` |
| AAB-PLATFORM-01 Evidence Object Store | **The staging area,** and the copy into the AGR profile | `behaviourally proven` for the SCS profile; amended 2026-10-02 |
| CAP-01 Country Intelligence & Discovery | **A consumer,** through CAP-04 only | `designed`; amended 2026-10-02 |
| Proposed CAP-36 Governed Observation and Field Evidence | **Interprets field and spatial observation,** through CAP-04 only | proposed |
| The sovereign data boundary (CAP-26; the egress specification) | **Required for live institutional connectors** (decision 21); its inventory of outbound endpoints for any retrieval | `named only`; no contract |
| The country's tenancy and participation (CAP-16, CAP-24) | **Organisations, and the people who hold the roles** | `named only` |

## Open gaps

**Contract gap: live institutional connectors.** Reaching an institution's own system (a laboratory system, a spreadsheet service, a database) while it keeps working there is the recovery pathway's aim, and **is deferred** until the sovereign data boundary has a platform contract and Gate D's outbound inventory exists (decision 21). Until then, an institution exports, and a person supplies the file.

**Contract gap: scheduled runs.** No run is scheduled (decision 8). Whether a country may schedule retrieval from a public source, and how such a run is attributed to a person, is a later decision.

**Contract gap: scale.** Historical recovery may mean many thousands of records, each a person's submission and, when mapped, each held for review. The batch route eases submission, not review. Whether review may be sampled, and on what terms, is not defined.

**Contract gap: check 10 for approved public sources.** A record from a public source, submitted by someone whose grant is not scoped to the publisher, is held by CAP-04's check 10 for a reviewer to decide whether the submitter may provide it. **Whether a valid CAP-02 source approval should answer that question** is not decided here: it would change CAP-04's check 10, and is the Platform Owner's decision.

**Contract gap: attribution in use.** A basis's obligations, such as attribution, are recorded and carried to CAP-04. How a capability that relies on the material honours them, in a dossier or a package, is not defined.

**Contract gap: source discovery.** CAP-02 recommends no source. Surfacing sources to close a gap is not defined for AGR (SCS-CAP-07 is SCS's counterpart, `named only`).

**Contract gap: spatial computation.** Out of launch scope (decision 12). When it is defined, every computed metric is automated content, its method versioned and reproducible.

**Contract gap: staging and backups.** The staging area is not backed up (AAB-PLATFORM-01's amendment, section 5): items lost before submission are acquired again. Their records, digests included, are backed up.

**Contract gap: vocabularies** for publisher kinds beyond the declared list, purposes and jurisdictions: declared strings, matched exactly.

**Platform gap: canonicalisation and the sovereign data boundary,** as CAP-03 records.

**Platform gap: an invalidated admission,** as in CAP-01 and CAP-03 to CAP-12.

**Current system limit: no implementation.** Nothing of CAP-02 is built.

## What this document does not establish

- It does not implement, deploy or migrate anything. No code, Supabase or other provider change is made or authorised.
- **It authorises no outbound connection.** A destination is opened only by the country environment's egress controls, under the egress specification and Gate D.
- It does not establish that any source is authoritative, accurate or lawful to use beyond the basis a person recorded.
- It does not admit any record, or bring any rehearsal data into governed memory.
- It does not define the sovereign data boundary, the planned domains, or governed packets between countries or domains.
- It does not make CAP-02 canonical in the registry, the CAP-34 fidelity manifest or the validators, and does not change its launch-release horizon.
- It does not admit CAP-02: the capability stays `PROPOSED_NOT_ADMITTED`.
- It does not alter commissioning status, satisfy Gate D, close WP05, or grant any production or commissioning authority.
