# AGR Provenance Adoption Matrix — 2026-10-02

**Status:** GOVERNANCE RECORD — NOT IMPLEMENTATION
**Authority:** RECORDS, FOR EVERY AGR CAPABILITY, HOW EACH OF ITS RECORD KINDS ADOPTS AAB-PLATFORM-05 AND AAB-PLATFORM-10: SOURCE TYPE, GENERATION METHOD AND AUTOMATION CONSTRAINT, SUBMITTER, SUPERSESSION, DIGEST FORM AND RESOLVER KIND; EVERY CITATION, WITH ITS CLASS, RELATION, EXPECTED RECORD KIND, WHETHER IT IS MANDATORY, AND ITS OUTCOME; AND THE CONSEQUENCE OF EACH OF THE SIX PROVENANCE GAPS. Approved by the Platform Owner in review on 2026-10-02. It admits, implements and changes nothing.
**Sources:** `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md` (amendment of 2026-10-02, section G); `governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; each AGR capability's amendment of 2026-10-02 on provenance and digests.

## How it is verified

- **Every table below is reproduced exactly from a contract.** For each capability, its three tables (record kinds, citations, six-gap matrix) appear, byte for byte, in that capability's amendment of 2026-10-02 on provenance and digests.
- **`governance/tools/provenance-matrix/check_matrix.py` checks it:** it reads this record and the twelve contracts, and fails, naming the table, if any table here does not appear exactly in its contract, if any capability is missing, or if any contract's amendment has a table this record does not. Run it from the repository root: `python governance/tools/provenance-matrix/check_matrix.py`.
- **The tables are generated from one source,** so they cannot drift without the check failing.

## How to read it

- **Citation classes:**

| Citation class | Unresolved consequence |
|---|---|
| Subject: the record being evaluated, or that the record is about | Refusal |
| Authority or membership: the basis for the act, or what the record belongs to | Refusal |
| Superseded record | Refusal |
| Mandatory evidence: evidence an outcome relies on | Refusal, or `EVIDENCE_REQUIRED` |
| Optional evidence: supporting or context evidence | Limitation |
| Related: material not relied on | Limitation, or omitted with a disclosure |

- *The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4.
- **Limitation `X`:** the gap or citation is disclosed with the admission, under `X`. **Refusal `X`:** the submission is refused, under `X`, and nothing is written.

## CAP-01

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap01RecordEnvelope` (`PROBLEM_REPORT`, `COUNTRY_RESOURCE`, `WASTE_STREAM`, `BURDEN_ASSESSMENT`, `RECOVERY_PATHWAY`, `OPPORTUNITY`) | Admitted record | `SUBMITTER_AUTHORED`, or the declared external source a report names | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-01:RECORD` |
| Referral to CAP-06 | Admitted record, written once (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-01:REFERRAL` |
| `Cap01DiscoveryDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-01:DISCOVERY_DOSSIER` |
| `CAP01_HELD_RESOLUTION`, `DISCOVERY_REVIEW`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `evidence[]` | Optional evidence | `SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, by role | `CAP-04:MEMORY_RECORD` | No | Limitation `EVIDENCE_UNRESOLVED` (check 8) |
| `links[]` | Subject | `REFERS_TO`, the link relation kept as a qualifier; **now with a declared version** | `CAP-01:RECORD` | Yes | Refusal `LINK_NOT_RESOLVED` (check 4) |
| `objectiveCodes[]` | Related | None: a declared code, matched against the country's register | The objectives register | No | Limitation `OBJECTIVE_UNRESOLVED` (check 9) |
| Referral `reviewDecisionId` | Authority or membership | `DECIDED_ON` | `AAB-PLATFORM-08:HUMAN_DECISION` | Yes | Refusal `REVIEW_NOT_RELIABLE` |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| CAP-01 records | Limitation `SOURCE_UNIDENTIFIED` (check 6) where an external source is declared; otherwise N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Referral | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Discovery dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-02

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap02SourceRegistration` | Admitted record, versioned | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:SOURCE_REGISTRATION` |
| `Cap02Mapping` | Admitted record, versioned | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:MAPPING` |
| Outbound destination | Admitted record (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:OUTBOUND_DESTINATION` |
| `Cap02AcquisitionRun` | Admitted record, written once | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (`ACQUISITION_STEWARD`) | Never superseded; withdrawn by `RUN_WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:ACQUISITION_RUN` |
| `Cap02StagedItem` | Admitted record, written once, quarantined until a governed CAP-04 admission | A term from the registration's `sourceTypes` | `SOURCE_AS_RECEIVED` (`REQUIRED_FALSE`) | `HUMAN` for a supplied file; `SERVICE` for a retrieval, `initiatedBy` the steward | Never superseded; expires or is purged | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-02:STAGED_ITEM` |
| `SOURCE_APPROVAL`, `MAPPING_APPROVAL`, `OUTBOUND_DESTINATION_APPROVAL`, `ACQUISITION_POLICY_APPROVAL`, `RUN_WITHDRAWAL`, `STAGED_ITEM_PURGE`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Basis `evidence[]` | Mandatory evidence | `SUPPORTS`; **now with the applicable version** | `CAP-04:MEMORY_RECORD` | Yes | Refusal `PERMITTED_USE_NOT_ESTABLISHED`, at approval and at run start |
| Mapping `sourceRegistrationId` | Subject | `REFERS_TO`; **now with the registration version** | `CAP-02:SOURCE_REGISTRATION` | Yes | Refusal `RECORD_NOT_FOUND` |
| Run `sourceRegistrationId` and `registrationVersion`, `sourceApprovalDecisionId` | Authority or membership | `RELIED_ON` | `CAP-02:SOURCE_REGISTRATION`; `AAB-PLATFORM-08:HUMAN_DECISION` | Yes | Refusal `SOURCE_NOT_APPROVED` |
| Run `mappingId` and `mappingVersion` | Authority or membership | `RELIED_ON` | `CAP-02:MAPPING` | Yes, when declared | Refusal `MAPPING_NOT_APPROVED` |
| Staged item `runId` | Authority or membership | `PART_OF`, set by the system | `CAP-02:ACQUISITION_RUN` | Yes | Cannot be unresolved: set by the system |
| Staged item `duplicateFlags[].candidate`, `mappingPreview` | Related | None: machine output, never in `lineage`, never relied on | Staged items; `CAP-04:MEMORY_RECORD`; `CAP-02:MAPPING` | No | Omitted, with the flag's disclosure |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Source registration, mapping, outbound destination | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Acquisition run | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Staged item | Limitation `SOURCE_UNIDENTIFIED` where the source gives no identifier for the item | N/A while staged: the bytes are held under a platform-computed digest. After expiry or purge, ORIGINAL_NOT_STORED applies: only the digest and metadata remain. | N/A: the digest is computed on receipt | By citation class (section 4) | N/A for a retrieval: custody is the run; for a supplied file, Limitation `CUSTODY_DECLARED_INCOMPLETE` | N/A for a retrieval; for a supplied file, Limitation `CUSTODY_NOT_DECLARED` |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-03

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| Verification run | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE`, `initiatedBy` the requester where a person requested it | Never superseded; a later run is a new record | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-03:VERIFICATION_RUN` |
| Integrity incident | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE`, triggered by its run | Never superseded; closed by decision | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-03:INTEGRITY_INCIDENT` |
| Lineage evaluation | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` or a capability's evaluation | Never superseded | AAB-PLATFORM-07's digests | `CAP-03:LINEAGE_EVALUATION` |
| Retrieval package | Package (primitive 8) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Compiled on a `HUMAN`'s request | Never superseded | `packageDigest` | None |
| `INCIDENT_CLOSURE`, `INCIDENT_SCOPE_CONFIRMATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_INTEGRITY_POLICY_APPROVAL`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Run subject | Subject | `EVALUATED_IN`, with the subject's `recordDigest` | Any registered written-once record kind | Yes | Refusal `RECORD_NOT_FOUND`. **A subject's own unresolved citations are findings** (`CITATION_UNRESOLVED`), never a refusal of the run |
| Incident trigger | Authority or membership | `PRODUCED_BY`, set by the system | `CAP-03:VERIFICATION_RUN` | Yes | Cannot be unresolved: set by the system |
| Boundary packet | Authority or membership | `CROSSED_BOUNDARY_AS` | A governed packet, when defined | Yes | Refusal `BOUNDARY_NOT_TRAVERSABLE` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Verification run | N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Integrity incident | N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Lineage evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-04

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap04ScientificMemoryRecord` | Admitted record | Its declared `source.sourceType` | Its declared method, within that method's constraint | `HUMAN` (`MEMORY_SUBMITTER`) | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-04:MEMORY_RECORD` |
| Quarantine status record | Status record, written once | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` (`MEMORY_QUARANTINE_OFFICER`) | Never superseded; released by decision | AAB-PLATFORM-08's `recordDigest` | None |
| `MEMORY_HELD_RESOLUTION`, `MEMORY_QUARANTINE`, `MEMORY_QUARANTINE_RELEASE`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `provenance.lineage` | Optional evidence | As declared, from `cap-03-vocabulary-2` | Any registered written-once record kind | No | Limitation `CITATION_UNRESOLVED` (check 8) |
| `acquisitionItemId` | Authority or membership | `EXTRACTED_FROM`, set by the system into `acquisition` | `CAP-02:STAGED_ITEM` | Yes, when declared | Refusal `ACQUISITION_BASIS_INVALID` (check 13) |
| The original | Mandatory evidence | Not a `lineage` entry: `original.objectId`, an `objectDigest` | An AGR-profile object | Yes, when cited | Refusal `ORIGINAL_NOT_FOUND` / Refusal `ORIGINAL_INTEGRITY_MISMATCH` (check 4) |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Memory record | Limitation `SOURCE_UNIDENTIFIED` (check 6) | Limitation `ORIGINAL_NOT_STORED` (check 4, held elsewhere) | Limitation `INTEGRITY_UNVERIFIED` (check 4) | By citation class (section 4) | Limitation `CUSTODY_INCOMPLETE` (check 7) | Limitation `CUSTODY_NOT_DECLARED` (check 7) |
| Quarantine status record | N/A: status record | N/A: status record | N/A: status record | N/A: status record | N/A: status record | N/A: status record |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-05

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap05EvidenceLandscape` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded; a later landscape is a new evaluation | AAB-PLATFORM-07's digests | `CAP-05:EVIDENCE_LANDSCAPE` |
| `LANDSCAPE_REVIEW`, its challenge, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Request `records[].memoryRecordId` | Subject | `EVALUATED_IN`: resolved at the cut-off to an exact version and `recordDigest`, recorded in the snapshot | `CAP-04:MEMORY_RECORD` | Yes | A typed exclusion (AAB-PLATFORM-07), disclosed; Refusal `EVIDENCE_SET_EMPTY` if nothing remains |
| Review binding | Subject | `DECIDED_ON` | `CAP-05:EVIDENCE_LANDSCAPE` | Yes | Refusal `BINDING_MISMATCH` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Evidence landscape | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-06

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap06Record` (`INGREDIENT`, `INGREDIENT_CANDIDATE`) | Admitted record | `SUBMITTER_AUTHORED`, or the declared external source | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-06:RECORD` |
| `Cap06IngredientDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-06:INGREDIENT_DOSSIER` |
| `INGREDIENT_REVIEW`, `REFERRAL_RECEIPT`, `CAP06_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `evidence[]` | Optional evidence | `SUPPORTS`, the aspect a qualifier | `CAP-04:MEMORY_RECORD` | No | Limitation `EVIDENCE_UNRESOLVED` (check 8) |
| `candidate.referralId` | Authority or membership | `REFERS_TO` | `CAP-01:REFERRAL` | Yes, for a candidate from CAP-01 | Refusal `REFERRAL_NOT_RECEIVED` (check 4) |
| `fromCandidate` | Subject | `DERIVED_FROM`; **now resolved** | `CAP-06:RECORD` | Yes, when declared | Refusal `RECORD_NOT_FOUND` |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Ingredient, ingredient candidate | Limitation `SOURCE_UNIDENTIFIED` (check 6) where an external source is declared; otherwise N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Ingredient dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-07

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap07Objective` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-07:RECORD` |
| `Cap07Formulation` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-07:RECORD` |
| `Cap07FormulationDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-07:FORMULATION_DOSSIER` |
| `FORMULATION_REVIEW`, `CAP07_HELD_RESOLUTION`, `COMPOSITION_ACCESS_GRANT`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Objective `problemReportIds[]` | Related | `REFERS_TO`; **now each with a declared version** | `CAP-01:RECORD` | No | Limitation `CITATION_UNRESOLVED` |
| Formulation `objective` | Subject | `REFERS_TO` | `CAP-07:RECORD` | Yes | Refusal `OBJECTIVE_NOT_FOUND` (check 4) |
| `components[].ingredient` | Authority or membership | `DERIVED_FROM` | `CAP-06:RECORD` | Yes | Refusal `COMPONENT_NOT_ACCEPTED` (check 5) |
| `components[].acceptanceReliedOn` | Authority or membership | `RELIED_ON`, set by the system at admission | `AAB-PLATFORM-08:HUMAN_DECISION` | Yes | Cannot be unresolved: set by the system |
| `derivedFrom` | Subject | `DERIVED_FROM`, `variantKind` a qualifier; **now resolved to the declared version** | `CAP-07:RECORD` | Yes, when declared | Refusal `LINEAGE_NOT_VALID` (check 7) |
| `evidence[]` | Optional evidence | `SUPPORTS`, the aspect a qualifier | `CAP-04:MEMORY_RECORD` | No | Limitation `EVIDENCE_UNRESOLVED` (check 9) |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Objective | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Formulation | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Formulation dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-08

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap08TrialRegistration` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:TRIAL_REGISTRATION` |
| `Cap08Protocol` | Admitted record, versioned | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:PROTOCOL` |
| Protocol lock | Status record, written once (no interface yet) | — | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN`, with the activation request | Never superseded | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:PROTOCOL_LOCK` |
| `Cap08TrialObservation`; field events (`PROTOCOL_DEVIATION`, `ADVERSE_EVENT`) | Admitted record (field events have no interface yet) | `FIELD_TRIAL` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) or `INSTRUMENT_CAPTURE` (`REQUIRED_TRUE`), as declared | `HUMAN` (`TRIAL_RECORDER`) | `CORRECTION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:TRIAL_OBSERVATION` |
| Safety-signal request | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE` (CAP-08's registered signal-request service), `initiatedBy` the recorder, in the recorder's own operation | Never superseded | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:SAFETY_SIGNAL_REQUEST` |
| Observation templates, metric definitions | Admitted records, versioned (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `NEW_VERSION`, `CORRECTION` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-08:TEMPLATE` |
| `Cap08OutcomeSummary` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-08:OUTCOME_SUMMARY` |
| `TEMPLATE_APPROVAL`, `TRIAL_ACTIVATION`, `TRIAL_OUTCOME_REVIEW`, `TRIAL_CLOSURE`, `CAP08_HELD_RESOLUTION`, quarantine and release, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `testMaterial` and `arms[].material` | Subject | `APPLIED_IN`; **`testMaterial.reference` is the `{ recordId, recordVersion }` of the amendment of 2026-09-30,** not a string | `CAP-07:RECORD` or `CAP-06:RECORD` | Yes | Refusal `TEST_MATERIAL_NOT_ACCEPTED` |
| `batches[].attestationId` | Authority or membership | `APPLIED_IN`; **now with its version** | `CAP-12:BATCH_ATTESTATION` | Yes, for a pilot batch | Refusal `BATCH_NOT_TRACEABLE` (at activation) |
| `context.problemReportIds` | Related | `REFERS_TO`; **now with declared versions** | `CAP-01:RECORD` | No | Limitation `CITATION_UNRESOLVED` |
| `preconditions.safetyEvidence` | Optional evidence | `SUPPORTS`; **now with declared versions** | `CAP-04:MEMORY_RECORD` | No: activation's safety gate is CAP-10's outcome | Limitation `CITATION_UNRESOLVED`; still disclosed `PRECONDITIONS_DECLARED_NOT_VERIFIED` |
| Protocol `trialRecordId` | Authority or membership | `PART_OF` | `CAP-08:TRIAL_REGISTRATION` | Yes | Refusal `RECORD_NOT_FOUND` |
| Protocol `templates[].templateVersionId` | Authority or membership | `REFERS_TO` | `CAP-08:TEMPLATE` | Yes | Refusal `TEMPLATE_NOT_APPROVED` |
| Protocol lock: the protocol | Subject | `DECIDED_ON`: the protocol's identifier, version and digest, resolved | `CAP-08:PROTOCOL` | Yes | Refusal `RECORD_NOT_FOUND` |
| Observation `trialRecordId`, `protocolRecordId`, `protocolVersion`, `templateVersionId` | Authority or membership | `OBSERVED_IN` | `CAP-08:TRIAL_REGISTRATION`, `CAP-08:PROTOCOL`, `CAP-08:TEMPLATE` | Yes | Refusal `TRIAL_NOT_ACTIVE` / Refusal `NOT_UNDER_PROTOCOL` |
| Observation `photos[]` | Mandatory evidence | Not `lineage`: each an `objectDigest` | AGR-profile objects | Yes, where the template requires them | Refusal `PHOTO_REQUIRED` / Refusal `PHOTO_NOT_FOUND` (check 6) |
| Safety-signal request: the observation or field event | Subject | `DERIVED_FROM`, set by the system | `CAP-08:TRIAL_OBSERVATION` | Yes | Cannot be unresolved: set by the system |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Trial registration, protocol, template, metric definition | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Protocol lock | N/A: status record | N/A: status record | N/A: status record | N/A: status record | N/A: status record | N/A: status record |
| Trial observation, field event | Limitation `SOURCE_UNIDENTIFIED` for a field event reported from outside the trial team; N/A for an observation, recorded at the plot by its recorder | N/A: every attachment is a stored AGR object, or the observation is refused (check 6) | N/A: as for `ORIGINAL_NOT_STORED` | By citation class (section 4) | N/A: born digital, recorded by its recorder | N/A: as for `CUSTODY_DECLARED_INCOMPLETE` |
| Safety-signal request | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Outcome summary | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-09

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap09LearningClaim` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-09:LEARNING_CLAIM` |
| `Cap09LearningDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-09:LEARNING_DOSSIER` |
| `LEARNING_REVIEW`, `CAP09_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| `evidence[]` | Mandatory evidence | `SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, by role | `CAP-04:MEMORY_RECORD` | Yes | Refusal `EVIDENCE_NOT_ADMITTED` (check 5) |
| `landscapes[]` | Mandatory evidence | `REFERS_TO`; reviews `DECIDED_ON`; resolved with their digests | `CAP-05:EVIDENCE_LANDSCAPE`; `AAB-PLATFORM-08:HUMAN_DECISION` | Yes, when declared: the claim relies on what it cites | Refusal `LANDSCAPE_NOT_FOUND` (check 7) |
| `boundary.materials` | Subject | `REFERS_TO`; **now each with a declared version,** resolved | `CAP-06:RECORD` or `CAP-07:RECORD` | Yes, when declared: they define the claim's boundary | Refusal `RECORD_NOT_FOUND` |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Learning claim | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Learning dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-10

### Record kinds

| Record kind | What it is | `source.sourceType` | Generation method (automation constraint) | Submitter | Supersession | Digest | Resolver kind |
|---|---|---|---|---|---|---|---|
| `Cap10AssessmentRequest` | Admitted record | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-10:ASSESSMENT_REQUEST` |
| `Cap10AssessorQualification` | Admitted record | `SUBMITTER_AUTHORED`; the qualifications it lists are declared by issuer and reference | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` (the assessor) | `CORRECTION`, `NEW_VERSION`, `WITHDRAWAL` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-10:ASSESSOR_QUALIFICATION` |
| `Cap10SafetySignal` | Admitted record, quarantined at once | By channel: from a CAP-08 or CAP-12 request, or `MACHINE_GENERATED`, `CAPABILITY_OUTPUT`; `DIRECT_REPORT`, `SUBMITTER_AUTHORED`; `EXTERNAL_REPORT_RECORDED`, as the recorder declares it | From a request or a machine: `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`); a direct or recorded report: `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `SERVICE` (CAP-10's intake service) for a request or a machine signal; `HUMAN` for a direct or recorded report | `CORRECTION`, `NEW_VERSION` | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-10:SAFETY_SIGNAL` |
| `PRECAUTIONARY_HOLD` | Admitted record, written once (no interface yet) | `CAPABILITY_OUTPUT` | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | `SERVICE`, placed by a rule | Never superseded; released by decision | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-10:PRECAUTIONARY_HOLD` |
| `COUNTRY_SAFETY_POLICY`, `EXTERNAL_NOTIFICATION`, acknowledgements | Admitted records, written once (no interface yet) | `SUBMITTER_AUTHORED` | `HUMAN_DECLARATION` (`REQUIRED_FALSE`) | `HUMAN` | Policy: `NEW_VERSION`; others never superseded | `recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`) | `CAP-10:POLICY`, `CAP-10:NOTIFICATION` |
| `Cap10SafetyEcologyDossier` | Evaluation (AAB-PLATFORM-07) | — | `DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`) | Requested by a `HUMAN` | Never superseded | AAB-PLATFORM-07's digests | `CAP-10:SAFETY_ECOLOGY_DOSSIER` |
| `SAFETY_ASSESSMENT`, `SPECIALIST_CONCURRENCE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_SAFETY_POLICY_APPROVAL`, `CAP10_HELD_RESOLUTION`, `SIGNAL_TRIAGE`, `SIGNAL_DETERMINATION`, `SAFETY_DIRECTION`, `HOLD_RELEASE`, `SIGNAL_CLOSURE`, `CHALLENGE_RESOLUTION` | Human decisions (AAB-PLATFORM-08) | — | `HUMAN_DECISION` (`REQUIRED_FALSE`) | `HUMAN` | AAB-PLATFORM-08's rules | AAB-PLATFORM-08's `recordDigest` | `AAB-PLATFORM-08:HUMAN_DECISION` |

### Citations

| Field | Citation class | Relation | Expected record kind | Mandatory | When unresolved |
|---|---|---|---|---|---|
| Request `subject` | Subject | `REFERS_TO` | `CAP-06:RECORD`, `CAP-07:RECORD` or `CAP-01:RECORD` | Yes | Refusal `SUBJECT_NOT_FOUND` (check 4) |
| Request `evidence[]` | Mandatory evidence | `SUPPORTS`, `origin` a source qualifier | `CAP-04:MEMORY_RECORD` | Yes | Refusal `EVIDENCE_NOT_ADMITTED` (check 8) |
| Request `subject.regulatorDecision` (added; optional) | Optional evidence | `REFERS_TO`, enriching the record only | `CAP-11:REGULATOR_DECISION` | No | Limitation `CITATION_UNRESOLVED`; `REGULATORY_STATUS_NOT_ASSESSED` disclosed where none resolves |
| Signal: the CAP-08 or CAP-12 safety-signal request | Authority or membership | `REFERS_TO`, qualifier `SIGNAL_REQUEST`, set by the intake service | `CAP-08:SAFETY_SIGNAL_REQUEST`, `CAP-12:SAFETY_SIGNAL_REQUEST` | Yes, for a requested signal | Refusal `RECORD_NOT_FOUND`: no signal is created; the request stays open and is shown as not received |
| Signal `source`, for a direct or recorded report | Related | `REFERS_TO` | Its record kind | No | Limitation `CITATION_UNRESOLVED`: a signal is never refused for being incomplete (CAP-10's safety rule) |
| Signal `concerns`, `attachments[]`, `machine.inputs[]` | Related | `REFERS_TO`, each with its record kind; attachments are `objectDigest`s held by their source capability | Trials, decisions, subjects, objects | No | Limitation `CITATION_UNRESOLVED`, for the same reason |
| Hold: triggering evidence | Authority or membership | `RELIED_ON`, set by the service | The signal, event or record that met the rule | Yes | Cannot be unresolved: set by the system |
| `supersedes` | Superseded record | The platform's `supersedes` field, never a `lineage` entry | The same record kind | Yes, when declared | Refusal `SUPERSESSION_NOT_PERMITTED` |

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Assessment request | Limitation `SOURCE_UNIDENTIFIED` (check 10) where an external source is declared; otherwise N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Assessor qualification | N/A: `SUBMITTER_AUTHORED` | Limitation `ORIGINAL_NOT_STORED`: qualification evidence is declared by issuer and reference, not stored | Limitation `INTEGRITY_UNVERIFIED`, for the same reason | By citation class (section 4) | N/A: the evidence is declared by reference | N/A: as for `CUSTODY_DECLARED_INCOMPLETE` |
| Safety signal | Limitation `SOURCE_UNIDENTIFIED` for `EXTERNAL_REPORT_RECORDED` without an identifier; otherwise N/A | Limitation `ORIGINAL_NOT_STORED` for attachments held outside a trial | Limitation `INTEGRITY_UNVERIFIED`, for the same | By citation class (section 4) | N/A: attachments are held by their source capability | N/A: as for `CUSTODY_DECLARED_INCOMPLETE` |
| Precautionary hold | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Policy, notification, acknowledgement | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Safety and ecology dossier | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-11

### Record kinds

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

### Citations

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

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Regulatory source | N/A: its source is the cited CAP-04 `DOCUMENT`, required by check 3 | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Requirement, requirement set, evidence mapping, egress record | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Regulator decision | N/A: its source is the regulator, evidenced by the cited `DOCUMENT`s | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Change event, monitoring record, exemption, qualification, policy | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Machine-proposed candidate | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Dossier, determination bases | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## CAP-12

### Record kinds

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

### Citations

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

### Six-gap matrix

| Record kind | `SOURCE_UNIDENTIFIED` | `ORIGINAL_NOT_STORED` | `INTEGRITY_UNVERIFIED` | `CITATION_UNRESOLVED` | `CUSTODY_DECLARED_INCOMPLETE` | `CUSTODY_NOT_DECLARED` |
|---|---|---|---|---|---|---|
| Manufacturing specification, rights authority | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Batch attestation | N/A: its source is the manufacturer, named in the record | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Safety-signal request, hold placed by a rule | N/A: `CAPABILITY_OUTPUT` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Records without an interface | N/A: `SUBMITTER_AUTHORED` | N/A: no original | N/A: no original | By citation class (section 4) | N/A: no original | N/A: no original |
| Transfer evidence basis | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation | N/A: evaluation |
| Human decisions | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision | N/A: human decision |

## What this record does not establish

- It admits nothing, implements nothing, and changes no contract: each capability's amendment is the authority, and the check proves they agree.
- It does not cover SCS, whose adoption of AAB-PLATFORM-05 is a separate decision.
