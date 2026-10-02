"""Source data and generator for the AGR provenance conformance amendments of 2026-10-02.

The data below is the single source of the three tables (record kinds, citations, six-gap
matrix) in each AGR capability's amendment of 2026-10-02 on provenance and digests
(AAB-PLATFORM-05 and AAB-PLATFORM-10), and of
governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md.

Usage (from the repository root):
    python governance/tools/provenance-matrix/generate_matrix.py           # regenerate the matrix record only
    python governance/tools/provenance-matrix/generate_matrix.py --apply   # insert the amendments; refuses if present

The amendments are already in the contracts, committed with this script, so --apply refuses
to insert them again. To change a table: change the data here, amend the contract to match by
a governed amendment, regenerate the matrix, and run check_matrix.py.
"""
from pathlib import Path
import glob
import sys

WB = Path(__file__).resolve().parents[2] / "workstream-b"
GAPS = ["SOURCE_UNIDENTIFIED", "ORIGINAL_NOT_STORED", "INTEGRITY_UNVERIFIED",
        "CITATION_UNRESOLVED", "CUSTODY_DECLARED_INCOMPLETE", "CUSTODY_NOT_DECLARED"]

# Cell vocabulary
NO = "N/A: no original"
EV = "N/A: evaluation"
DE = "N/A: human decision"
ST = "N/A: status record"
SA = "N/A: `SUBMITTER_AUTHORED`"
BYCLASS = "By citation class (section 4)"
def lim(c): return f"Limitation `{c}`"
def ref(c): return f"Refusal `{c}`"
def native(src=SA, cit=BYCLASS): return [src, NO, NO, cit, NO, NO]
EVROW = [EV] * 6
DEROW = [DE] * 6
STROW = [ST] * 6

# Citation classes
SUBJ, AUTHB, SUPS, MAND, OPT, REL = ("Subject", "Authority or membership", "Superseded record",
                                     "Mandatory evidence", "Optional evidence", "Related")

# Digest forms
RD = "`recordDigest` (`DigestReference`, `aab-canonical-json-1`, `sha-256`)"
P07 = "AAB-PLATFORM-07's digests"
P08 = "AAB-PLATFORM-08's `recordDigest`"

# Generation methods
HD = "`HUMAN_DECLARATION` (`REQUIRED_FALSE`)"
DET = "`DETERMINISTIC_EVALUATION` (`REQUIRED_TRUE`)"
HDEC = "`HUMAN_DECISION` (`REQUIRED_FALSE`)"
NONE = "—"


def K(kind, what, src, method, submitter, supersession, digest, resolver):
    return dict(kind=kind, what=what, src=src, method=method, submitter=submitter,
                supersession=supersession, digest=digest, resolver=resolver)


def Cit(field, cls, relation, kind, mandatory, outcome):
    return (field, cls, relation, kind, mandatory, outcome)


SUPROW = Cit("`supersedes`", SUPS, "The platform's `supersedes` field, never a `lineage` entry", "The same record kind", "Yes, when declared", ref("SUPERSESSION_NOT_PERMITTED"))

DEC_KIND = lambda names: K(names, "Human decisions (AAB-PLATFORM-08)", NONE, HDEC, "`HUMAN`", "AAB-PLATFORM-08's rules", P08, "`AAB-PLATFORM-08:HUMAN_DECISION`")

C = {}

C["CAP-01"] = dict(
    ordinal="fourth",
    kinds=[
        K("`Cap01RecordEnvelope` (`PROBLEM_REPORT`, `COUNTRY_RESOURCE`, `WASTE_STREAM`, `BURDEN_ASSESSMENT`, `RECOVERY_PATHWAY`, `OPPORTUNITY`)", "Admitted record", "`SUBMITTER_AUTHORED`, or the declared external source a report names", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-01:RECORD`"),
        K("Referral to CAP-06", "Admitted record, written once (no interface yet)", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-01:REFERRAL`"),
        K("`Cap01DiscoveryDossier`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-01:DISCOVERY_DOSSIER`"),
        DEC_KIND("`CAP01_HELD_RESOLUTION`, `DISCOVERY_REVIEW`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("`evidence[]`", OPT, "`SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, by role", "`CAP-04:MEMORY_RECORD`", "No", lim("EVIDENCE_UNRESOLVED") + " (check 8)"),
        Cit("`links[]`", SUBJ, "`REFERS_TO`, the link relation kept as a qualifier; **now with a declared version**", "`CAP-01:RECORD`", "Yes", ref("LINK_NOT_RESOLVED") + " (check 4)"),
        Cit("`objectiveCodes[]`", REL, "None: a declared code, matched against the country's register", "The objectives register", "No", lim("OBJECTIVE_UNRESOLVED") + " (check 9)"),
        Cit("Referral `reviewDecisionId`", AUTHB, "`DECIDED_ON`", "`AAB-PLATFORM-08:HUMAN_DECISION`", "Yes", ref("REVIEW_NOT_RELIABLE")),
        SUPROW,
    ],
    matrix=[
        ("CAP-01 records", [lim("SOURCE_UNIDENTIFIED") + " (check 6) where an external source is declared; otherwise " + SA, NO, NO, BYCLASS, NO, NO]),
        ("Referral", native()),
        ("Discovery dossier", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (second), on dossiers, reviews and referrals, is **derived when read:** a CAP-03 run or lineage evaluation cites the output, and a read shows it. Nothing is written into the output after it is written.",
    supersession="`supersedes` takes the platform's declared and resolved shape. `UPDATE` maps to `NEW_VERSION`. Check 5, `SUPERSESSION_VALID`, is the platform's validity check, with its refusal unchanged.",
    submitters="**Every CAP-01 record is submitted by a `HUMAN`, in their own name** (decision 9).",
    actors="`Cap01DiscoveryDossier.requestedBy` is the requester in AAB, and stays an `ActorReference`. `PROBLEM_REPORT.reportedBy` is declared data (AAB-PLATFORM-05, decision 13).",
    specific=[],
)

C["CAP-02"] = dict(
    ordinal=None,
    kinds=[
        K("`Cap02SourceRegistration`", "Admitted record, versioned", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`NEW_VERSION`, `CORRECTION`, `WITHDRAWAL`", RD, "`CAP-02:SOURCE_REGISTRATION`"),
        K("`Cap02Mapping`", "Admitted record, versioned", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`NEW_VERSION`, `CORRECTION`, `WITHDRAWAL`", RD, "`CAP-02:MAPPING`"),
        K("Outbound destination", "Admitted record (no interface yet)", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-02:OUTBOUND_DESTINATION`"),
        K("`Cap02AcquisitionRun`", "Admitted record, written once", "`SUBMITTER_AUTHORED`", HD, "`HUMAN` (`ACQUISITION_STEWARD`)", "Never superseded; withdrawn by `RUN_WITHDRAWAL`", RD, "`CAP-02:ACQUISITION_RUN`"),
        K("`Cap02StagedItem`", "Admitted record, written once, quarantined until a governed CAP-04 admission", "A term from the registration's `sourceTypes`", "`SOURCE_AS_RECEIVED` (`REQUIRED_FALSE`)", "`HUMAN` for a supplied file; `SERVICE` for a retrieval, `initiatedBy` the steward", "Never superseded; expires or is purged", RD, "`CAP-02:STAGED_ITEM`"),
        DEC_KIND("`SOURCE_APPROVAL`, `MAPPING_APPROVAL`, `OUTBOUND_DESTINATION_APPROVAL`, `ACQUISITION_POLICY_APPROVAL`, `RUN_WITHDRAWAL`, `STAGED_ITEM_PURGE`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Basis `evidence[]`", MAND, "`SUPPORTS`; **now with the applicable version**", "`CAP-04:MEMORY_RECORD`", "Yes", ref("PERMITTED_USE_NOT_ESTABLISHED") + ", at approval and at run start"),
        Cit("Mapping `sourceRegistrationId`", SUBJ, "`REFERS_TO`; **now with the registration version**", "`CAP-02:SOURCE_REGISTRATION`", "Yes", ref("RECORD_NOT_FOUND")),
        Cit("Run `sourceRegistrationId` and `registrationVersion`, `sourceApprovalDecisionId`", AUTHB, "`RELIED_ON`", "`CAP-02:SOURCE_REGISTRATION`; `AAB-PLATFORM-08:HUMAN_DECISION`", "Yes", ref("SOURCE_NOT_APPROVED")),
        Cit("Run `mappingId` and `mappingVersion`", AUTHB, "`RELIED_ON`", "`CAP-02:MAPPING`", "Yes, when declared", ref("MAPPING_NOT_APPROVED")),
        Cit("Staged item `runId`", AUTHB, "`PART_OF`, set by the system", "`CAP-02:ACQUISITION_RUN`", "Yes", "Cannot be unresolved: set by the system"),
        Cit("Staged item `duplicateFlags[].candidate`, `mappingPreview`", REL, "None: machine output, never in `lineage`, never relied on", "Staged items; `CAP-04:MEMORY_RECORD`; `CAP-02:MAPPING`", "No", "Omitted, with the flag's disclosure"),
        SUPROW,
    ],
    matrix=[
        ("Source registration, mapping, outbound destination", native()),
        ("Acquisition run", native()),
        ("Staged item", [lim("SOURCE_UNIDENTIFIED") + " where the source gives no identifier for the item", "N/A while staged: the bytes are held under a platform-computed digest. After expiry or purge, ORIGINAL_NOT_STORED applies: only the digest and metadata remain.", "N/A: the digest is computed on receipt", BYCLASS, "N/A for a retrieval: custody is the run; for a supplied file, " + lim("CUSTODY_DECLARED_INCOMPLETE"), "N/A for a retrieval; for a supplied file, " + lim("CUSTODY_NOT_DECLARED")]),
        ("Human decisions", DEROW),
    ],
    integrity="**A staged item is written once.** Its duplicate flags, mapping preview and intake checks are machine output written **with** the item, in the same transaction, never added later; a later check is a record of its own, citing the item's digest. Its purge or expiry is a receipt (`ITEM_PURGED`, `ITEM_EXPIRED`), never a change to the item.",
    supersession="A new registration or mapping version supersedes the previous one with the platform's declared and resolved `supersedes`, reason `NEW_VERSION`, or `CORRECTION` or `WITHDRAWAL`. **Runs and staged items are never superseded.**",
    submitters="**Registrations, mappings, outbound destinations, runs and supplied files are submitted by a `HUMAN`, in their own name.** **A staged item from a retrieval is written by the platform's acquisition service,** under AAB-PLATFORM-05, section C, and only when:\n  - the service is a **registered, scoped `SERVICE`** actor, for this country and CAP-02's staged items only;\n  - **`initiatedBy` is the steward** who started the run;\n  - **the source adapter and the software release are recorded** (`service.method`, `service.methodVersion`, `service.softwareRelease`);\n  - **the run is cited** (`triggerKind` `RECORD`, naming the run);\n  - **the service creates no admission decision, and cannot submit to CAP-04;**\n  - **the staged item stays quarantined until a governed CAP-04 admission.**\n\n  **Decision 5 now reads:** no service account submits to CAP-04, and no service decides; a retrieval's staged items are recorded as the acquisition service's, initiated by the steward, under these conditions.",
    actors="`Cap02AcquisitionRun.startedBy` is the run's `provenance.submission.submittedBy`, kept as a read alias and never set separately.",
    specific=[
        "**Provenance is added** to `Cap02AcquisitionRun` and `Cap02StagedItem`, as line 29 already said of every CAP-02 record: each now has `provenance: Provenance` and `recordDigest: DigestReference`.",
        "**The staged item's digests are typed** (AAB-PLATFORM-10, section 5): `digest` is an `objectDigest`, `raw-bytes`, `sha-256`, held as a `DigestReference`; `stagingReference` keeps its form as a storage reference.",
        "**`AUTOMATED_MAPPING` has the automation constraint `REQUIRED_TRUE`** in CAP-03's vocabulary (its amendment of 2026-10-02). Decision 23's sentence \"It contains `AUTOMATED`, so it always has `automated: true`\" is replaced by that declaration.",
        "**The open gap \"canonicalisation\" is closed** by AAB-PLATFORM-10. The sovereign data boundary stays open.",
    ],
)

C["CAP-03"] = dict(
    ordinal=None,
    kinds=[
        K("Verification run", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE`, `initiatedBy` the requester where a person requested it", "Never superseded; a later run is a new record", RD, "`CAP-03:VERIFICATION_RUN`"),
        K("Integrity incident", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE`, triggered by its run", "Never superseded; closed by decision", RD, "`CAP-03:INTEGRITY_INCIDENT`"),
        K("Lineage evaluation", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN` or a capability's evaluation", "Never superseded", P07, "`CAP-03:LINEAGE_EVALUATION`"),
        K("Retrieval package", "Package (primitive 8)", NONE, DET, "Compiled on a `HUMAN`'s request", "Never superseded", "`packageDigest`", "None"),
        DEC_KIND("`INCIDENT_CLOSURE`, `INCIDENT_SCOPE_CONFIRMATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_INTEGRITY_POLICY_APPROVAL`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Run subject", SUBJ, "`EVALUATED_IN`, with the subject's `recordDigest`", "Any registered written-once record kind", "Yes", ref("RECORD_NOT_FOUND") + ". **A subject's own unresolved citations are findings** (`CITATION_UNRESOLVED`), never a refusal of the run"),
        Cit("Incident trigger", AUTHB, "`PRODUCED_BY`, set by the system", "`CAP-03:VERIFICATION_RUN`", "Yes", "Cannot be unresolved: set by the system"),
        Cit("Boundary packet", AUTHB, "`CROSSED_BOUNDARY_AS`", "A governed packet, when defined", "Yes", ref("BOUNDARY_NOT_TRAVERSABLE")),
    ],
    matrix=[
        ("Verification run", ["N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service", NO, NO, BYCLASS, NO, NO]),
        ("Integrity incident", ["N/A: `CAPABILITY_OUTPUT` of CAP-03's registered service", NO, NO, BYCLASS, NO, NO]),
        ("Lineage evaluation", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="**CAP-03 writes nothing into another capability's record.** The `integrity?` references the CAP-03 adoption amendments placed on other capabilities' outputs are derived when read: a run or lineage evaluation cites the output, and the output's read shows it.",
    supersession="CAP-03's records are never superseded. **The lineage relation `SUPERSEDES` maps to the platform's `supersedes` field,** and is never recorded as a second, separate `lineage` entry (AAB-PLATFORM-05, section D).",
    submitters="**Runs and incidents are service-submitted,** under AAB-PLATFORM-05, section C: `submittedBy` CAP-03's registered verification service; `initiatedBy` the person who requested the run, where one did; `triggerKind` `RECORD` or `SCHEDULED_JOB`; `generation.method` `DETERMINISTIC_EVALUATION`. **A service never closes an incident, confirms its scope, or decides anything** (decision 19 stands).",
    actors="None in content.",
    specific=[
        "**Canonicalisation (decisions 6 and 7, prerequisites, open gaps).** The platform's canonicalisation is AAB-PLATFORM-10's `aab-canonical-json-1`. **Decision 7's list is answered** by AAB-PLATFORM-10, sections 3 to 6, and AAB-PLATFORM-05's envelope (its amendment of 2026-10-02, section A). **The prerequisite \"the platform's canonicalisation completed\" is met in the contracts;** `RECORD_DIGEST_VERIFIED` is built only for record schemas whose envelope is declared, and `CANONICALISATION_UNDEFINED` remains for one whose envelope is not. Decision 6's citation of \"AAB-PLATFORM-07, section 3\" now reads \"AAB-PLATFORM-10\".",
        "VOCAB",
        "**Corrections to \"What the rehearsal does\", recorded here, dated, not rewritten in place.** A later read of the step 0 snapshots, for AAB-PLATFORM-05's amendment, found five statements too broad or wrong:\n  1. **\"23 canonical tables write an event\":** there are **22** `mutation_audit` triggers (`agriculture/triggers.sql`).\n  2. **\"append-only triggers protect … versions\":** only partly. `entity_version` is protected against deletion only (a `BEFORE DELETE` trigger); `ingredient_version` and `evidence_packet_item` have no protecting trigger.\n  3. **\"Hashes are claimed, not computed\":** too broad. **The photo SHA-256 is computed by the gateway from the uploaded bytes** (`api.php`, line 1775), though never re-verified. Every other hash is as stated.\n  4. **\"No integrity check has ever run\" and \"provenance cannot be asserted\":** a schema-only snapshot cannot show what never ran. It shows that **no function or gateway action writes** `integrity_check_run` or `source_object`; migrations or direct SQL could have written rows.\n  5. **\"the continuity checkpoint's hash covers the schema and row counts\":** it covers **object counts per schema** and row counts, **not the schema's definitions.**\n  The conclusions drawn from them stand: nothing of the rehearsal's hash chain, assertions or caller-supplied hashes is carried across.",
    ],
)

VOCAB = """**The vocabulary becomes `cap-03-vocabulary-2`:** version 1, with these changes. No term of version 1 is renamed or removed; one is deprecated, with its replacements named.
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

  Every capability's adoption of version 1 is read as an adoption of version 2."""

C["CAP-04"] = dict(
    ordinal="third",
    kinds=[
        K("`Cap04ScientificMemoryRecord`", "Admitted record", "Its declared `source.sourceType`", "Its declared method, within that method's constraint", "`HUMAN` (`MEMORY_SUBMITTER`)", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-04:MEMORY_RECORD`"),
        K("Quarantine status record", "Status record, written once", NONE, HDEC, "`HUMAN` (`MEMORY_QUARANTINE_OFFICER`)", "Never superseded; released by decision", P08, "None"),
        DEC_KIND("`MEMORY_HELD_RESOLUTION`, `MEMORY_QUARANTINE`, `MEMORY_QUARANTINE_RELEASE`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("`provenance.lineage`", OPT, "As declared, from `cap-03-vocabulary-2`", "Any registered written-once record kind", "No", lim("CITATION_UNRESOLVED") + " (check 8)"),
        Cit("`acquisitionItemId`", AUTHB, "`EXTRACTED_FROM`, set by the system into `acquisition`", "`CAP-02:STAGED_ITEM`", "Yes, when declared", ref("ACQUISITION_BASIS_INVALID") + " (check 13)"),
        Cit("The original", MAND, "Not a `lineage` entry: `original.objectId`, an `objectDigest`", "An AGR-profile object", "Yes, when cited", ref("ORIGINAL_NOT_FOUND") + " / " + ref("ORIGINAL_INTEGRITY_MISMATCH") + " (check 4)"),
        SUPROW,
    ],
    matrix=[
        ("Memory record", [lim("SOURCE_UNIDENTIFIED") + " (check 6)", lim("ORIGINAL_NOT_STORED") + " (check 4, held elsewhere)", lim("INTEGRITY_UNVERIFIED") + " (check 4)", BYCLASS, lim("CUSTODY_INCOMPLETE") + " (check 7)", lim("CUSTODY_NOT_DECLARED") + " (check 7)"]),
        ("Quarantine status record", STROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 is **derived when read,** never written into the record. **`acquisition` is not affected:** it is set at admission, inside the nine steps, and is part of the envelope.",
    supersession="`supersedes` takes the platform's declared and resolved shape: the submitter declares `memoryRecordId`, the reason and the explanation; the system resolves the identifier, version and digest. Reasons: `CORRECTION` and `WITHDRAWAL`, unchanged; **`NEW_VERSION` is not used by CAP-04,** whose records are corrected or withdrawn, never revised.",
    submitters="**Every CAP-04 record is submitted by a `HUMAN` holding `MEMORY_SUBMITTER`, in their own name.** No CAP-04 record is service-submitted.",
    actors="`extraction.extractorName` and `sourceReviewerName` stay declared data. No `ActorReference` in content.",
    specific=[
        "**The record's digest is typed and its envelope declared:** `recordDigest` is a `DigestReference` (`recordDigest`, `aab-canonical-json-1`, `sha-256`); the envelope is every field of `Cap04ScientificMemoryRecord`, `acquisition` included, except `recordDigest` (AAB-PLATFORM-05, section A).",
        "**The interface gains the field its amendment added:** `acquisition?` (amendment of 2026-10-02, second). `integrity?` is not a field: it is derived.",
        "**The rules version is `cap-04-admission-3`** wherever `cap-04-admission-2` still appears (\"Admission rules\" and `Cap04MemoryAdmissionDecision`): it follows from check 13, which this contract's amendment of 2026-10-02 (second) added; version 2 was never in force.",
        "**A record's `automated` must match its method's constraint** (`cap-03-vocabulary-2`), or it is refused (`REQUEST_VALIDATION_FAILED`); check 9 then holds every record whose `automated` is `true`, as before.",
    ],
)

C["CAP-05"] = dict(
    ordinal="second",
    kinds=[
        K("`Cap05EvidenceLandscape`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded; a later landscape is a new evaluation", P07, "`CAP-05:EVIDENCE_LANDSCAPE`"),
        DEC_KIND("`LANDSCAPE_REVIEW`, its challenge, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Request `records[].memoryRecordId`", SUBJ, "`EVALUATED_IN`: resolved at the cut-off to an exact version and `recordDigest`, recorded in the snapshot", "`CAP-04:MEMORY_RECORD`", "Yes", "A typed exclusion (AAB-PLATFORM-07), disclosed; " + ref("EVIDENCE_SET_EMPTY") + " if nothing remains"),
        Cit("Review binding", SUBJ, "`DECIDED_ON`", "`CAP-05:EVIDENCE_LANDSCAPE`", "Yes", ref("BINDING_MISMATCH")),
    ],
    matrix=[
        ("Evidence landscape", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02, on landscapes and reviews, is **derived when read.**",
    supersession="CAP-05 writes no admitted record. **\"The evaluation superseded\"** (a currency trigger) means a later landscape on the same request, derived when read.",
    submitters="**Every landscape is requested by a `HUMAN`;** the landscape is computed deterministically.",
    actors="`requestedBy` is the requester in AAB, and stays an `ActorReference`.",
    specific=[
        "**Members' digests are typed:** a member's digest is the admitted record's `recordDigest` (a `DigestReference`), as its admission decision binds it, never an admission decision's own digest.",
        "**The disclosure `MACHINE_GENERATED` is added** to every landscape, as CAP-06, CAP-07 and CAP-08 already disclose for their evaluations.",
    ],
)

C["CAP-06"] = dict(
    ordinal="fourth",
    kinds=[
        K("`Cap06Record` (`INGREDIENT`, `INGREDIENT_CANDIDATE`)", "Admitted record", "`SUBMITTER_AUTHORED`, or the declared external source", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-06:RECORD`"),
        K("`Cap06IngredientDossier`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-06:INGREDIENT_DOSSIER`"),
        DEC_KIND("`INGREDIENT_REVIEW`, `REFERRAL_RECEIPT`, `CAP06_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("`evidence[]`", OPT, "`SUPPORTS`, the aspect a qualifier", "`CAP-04:MEMORY_RECORD`", "No", lim("EVIDENCE_UNRESOLVED") + " (check 8)"),
        Cit("`candidate.referralId`", AUTHB, "`REFERS_TO`", "`CAP-01:REFERRAL`", "Yes, for a candidate from CAP-01", ref("REFERRAL_NOT_RECEIVED") + " (check 4)"),
        Cit("`fromCandidate`", SUBJ, "`DERIVED_FROM`; **now resolved**", "`CAP-06:RECORD`", "Yes, when declared", ref("RECORD_NOT_FOUND")),
        SUPROW,
    ],
    matrix=[
        ("Ingredient, ingredient candidate", [lim("SOURCE_UNIDENTIFIED") + " (check 6) where an external source is declared; otherwise " + SA, NO, NO, BYCLASS, NO, NO]),
        ("Ingredient dossier", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (third), on dossiers and acceptances, is **derived when read.**",
    supersession="`supersedes` takes the platform's declared and resolved shape; `UPDATE` maps to `NEW_VERSION`.",
    submitters="**Every CAP-06 record is submitted by a `HUMAN`** (decision 11).",
    actors="`requestedBy` stays an `ActorReference`; no other.",
    specific=[
        "**\"Carries forward the referral's gaps and disclosures\"** means the referral's disclosures (such as `SAFETY_ECOLOGY_NOT_ASSESSED`). **Provenance gaps are never carried into a new record:** they are set from the record itself (AAB-PLATFORM-05, section 6); the referral's own are read by reference.",
    ],
)

C["CAP-07"] = dict(
    ordinal="fifth",
    kinds=[
        K("`Cap07Objective`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-07:RECORD`"),
        K("`Cap07Formulation`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-07:RECORD`"),
        K("`Cap07FormulationDossier`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-07:FORMULATION_DOSSIER`"),
        DEC_KIND("`FORMULATION_REVIEW`, `CAP07_HELD_RESOLUTION`, `COMPOSITION_ACCESS_GRANT`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Objective `problemReportIds[]`", REL, "`REFERS_TO`; **now each with a declared version**", "`CAP-01:RECORD`", "No", lim("CITATION_UNRESOLVED")),
        Cit("Formulation `objective`", SUBJ, "`REFERS_TO`", "`CAP-07:RECORD`", "Yes", ref("OBJECTIVE_NOT_FOUND") + " (check 4)"),
        Cit("`components[].ingredient`", AUTHB, "`DERIVED_FROM`", "`CAP-06:RECORD`", "Yes", ref("COMPONENT_NOT_ACCEPTED") + " (check 5)"),
        Cit("`components[].acceptanceReliedOn`", AUTHB, "`RELIED_ON`, set by the system at admission", "`AAB-PLATFORM-08:HUMAN_DECISION`", "Yes", "Cannot be unresolved: set by the system"),
        Cit("`derivedFrom`", SUBJ, "`DERIVED_FROM`, `variantKind` a qualifier; **now resolved to the declared version**", "`CAP-07:RECORD`", "Yes, when declared", ref("LINEAGE_NOT_VALID") + " (check 7)"),
        Cit("`evidence[]`", OPT, "`SUPPORTS`, the aspect a qualifier", "`CAP-04:MEMORY_RECORD`", "No", lim("EVIDENCE_UNRESOLVED") + " (check 9)"),
        SUPROW,
    ],
    matrix=[
        ("Objective", native()),
        ("Formulation", native()),
        ("Formulation dossier", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (fourth), on dossiers and acceptances for trial, is **derived when read.** `acceptanceReliedOn` is unaffected: it is set at admission.",
    supersession="`supersedes` takes the platform's declared and resolved shape on objectives and formulations; `UPDATE` maps to `NEW_VERSION`.",
    submitters="**Every CAP-07 record is submitted by a `HUMAN`.**",
    actors="`requestedBy` stays an `ActorReference`. **The person named in a `COMPOSITION_ACCESS_GRANT`** acts in AAB by reading under it, and is an `ActorReference`.",
    specific=[
        "**Check 8's `SOURCE_UNIDENTIFIED`** applies where an objective or formulation declares an external source; for `SUBMITTER_AUTHORED` it is not applicable.",
    ],
)

C["CAP-08"] = dict(
    ordinal="fifth",
    kinds=[
        K("`Cap08TrialRegistration`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-08:TRIAL_REGISTRATION`"),
        K("`Cap08Protocol`", "Admitted record, versioned", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`NEW_VERSION`, `CORRECTION`", RD, "`CAP-08:PROTOCOL`"),
        K("Protocol lock", "Status record, written once (no interface yet)", NONE, HD, "`HUMAN`, with the activation request", "Never superseded", RD, "`CAP-08:PROTOCOL_LOCK`"),
        K("`Cap08TrialObservation`; field events (`PROTOCOL_DEVIATION`, `ADVERSE_EVENT`)", "Admitted record (field events have no interface yet)", "`FIELD_TRIAL`", "`HUMAN_DECLARATION` (`REQUIRED_FALSE`) or `INSTRUMENT_CAPTURE` (`REQUIRED_TRUE`), as declared", "`HUMAN` (`TRIAL_RECORDER`)", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-08:TRIAL_OBSERVATION`"),
        K("Safety-signal request", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE` (CAP-08's registered signal-request service), `initiatedBy` the recorder, in the recorder's own operation", "Never superseded", RD, "`CAP-08:SAFETY_SIGNAL_REQUEST`"),
        K("Observation templates, metric definitions", "Admitted records, versioned (no interface yet)", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`NEW_VERSION`, `CORRECTION`", RD, "`CAP-08:TEMPLATE`"),
        K("`Cap08OutcomeSummary`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-08:OUTCOME_SUMMARY`"),
        DEC_KIND("`TEMPLATE_APPROVAL`, `TRIAL_ACTIVATION`, `TRIAL_OUTCOME_REVIEW`, `TRIAL_CLOSURE`, `CAP08_HELD_RESOLUTION`, quarantine and release, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("`testMaterial` and `arms[].material`", SUBJ, "`APPLIED_IN`; **`testMaterial.reference` is the `{ recordId, recordVersion }` of the amendment of 2026-09-30,** not a string", "`CAP-07:RECORD` or `CAP-06:RECORD`", "Yes", ref("TEST_MATERIAL_NOT_ACCEPTED")),
        Cit("`batches[].attestationId`", AUTHB, "`APPLIED_IN`; **now with its version**", "`CAP-12:BATCH_ATTESTATION`", "Yes, for a pilot batch", ref("BATCH_NOT_TRACEABLE") + " (at activation)"),
        Cit("`context.problemReportIds`", REL, "`REFERS_TO`; **now with declared versions**", "`CAP-01:RECORD`", "No", lim("CITATION_UNRESOLVED")),
        Cit("`preconditions.safetyEvidence`", OPT, "`SUPPORTS`; **now with declared versions**", "`CAP-04:MEMORY_RECORD`", "No: activation's safety gate is CAP-10's outcome", lim("CITATION_UNRESOLVED") + "; still disclosed `PRECONDITIONS_DECLARED_NOT_VERIFIED`"),
        Cit("Protocol `trialRecordId`", AUTHB, "`PART_OF`", "`CAP-08:TRIAL_REGISTRATION`", "Yes", ref("RECORD_NOT_FOUND")),
        Cit("Protocol `templates[].templateVersionId`", AUTHB, "`REFERS_TO`", "`CAP-08:TEMPLATE`", "Yes", ref("TEMPLATE_NOT_APPROVED")),
        Cit("Protocol lock: the protocol", SUBJ, "`DECIDED_ON`: the protocol's identifier, version and digest, resolved", "`CAP-08:PROTOCOL`", "Yes", ref("RECORD_NOT_FOUND")),
        Cit("Observation `trialRecordId`, `protocolRecordId`, `protocolVersion`, `templateVersionId`", AUTHB, "`OBSERVED_IN`", "`CAP-08:TRIAL_REGISTRATION`, `CAP-08:PROTOCOL`, `CAP-08:TEMPLATE`", "Yes", ref("TRIAL_NOT_ACTIVE") + " / " + ref("NOT_UNDER_PROTOCOL")),
        Cit("Observation `photos[]`", MAND, "Not `lineage`: each an `objectDigest`", "AGR-profile objects", "Yes, where the template requires them", ref("PHOTO_REQUIRED") + " / " + ref("PHOTO_NOT_FOUND") + " (check 6)"),
        Cit("Safety-signal request: the observation or field event", SUBJ, "`DERIVED_FROM`, set by the system", "`CAP-08:TRIAL_OBSERVATION`", "Yes", "Cannot be unresolved: set by the system"),
        SUPROW,
    ],
    matrix=[
        ("Trial registration, protocol, template, metric definition", native()),
        ("Protocol lock", STROW),
        ("Trial observation, field event", [lim("SOURCE_UNIDENTIFIED") + " for a field event reported from outside the trial team; N/A for an observation, recorded at the plot by its recorder", "N/A: every attachment is a stored AGR object, or the observation is refused (check 6)", "N/A: as for `ORIGINAL_NOT_STORED`", BYCLASS, "N/A: born digital, recorded by its recorder", "N/A: as for `CUSTODY_DECLARED_INCOMPLETE`"]),
        ("Safety-signal request", ["N/A: `CAPABILITY_OUTPUT`", NO, NO, BYCLASS, NO, NO]),
        ("Outcome summary", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (fourth) is **derived when read.** **`lockedAt` is no longer a protocol field:** when activation is requested, a **protocol lock status record** is written, resolving the protocol's identifier, version and digest; `lockedAt` is derived when read. **A protocol version is written once;** a change before the lock is a new version, and `PROTOCOL_LOCKED` refuses a new version of a locked protocol without a new activation, as before.",
    supersession="`supersedes` takes the platform's declared and resolved shape on registrations, protocols and observations; the registration's `UPDATE` maps to `NEW_VERSION`.",
    submitters="**Every CAP-08 record is submitted by a `HUMAN`,** except the safety-signal request. **CAP-08 never writes a CAP-10 record.** Where the amendment of 2026-10-02 said \"CAP-08 writes a CAP-10 safety signal\", it now reads:\n  1. **CAP-08 records the observation or field event** in its own operation;\n  2. **in the same transaction, CAP-08's registered signal-request service writes a CAP-08 safety-signal request,** service-submitted under AAB-PLATFORM-05, section C, `initiatedBy` the recorder, citing the observation or field event, with the channel (`CAP08_OBSERVATION` or `CAP08_ADVERSE_EVENT`) and what the signal concerns;\n  3. **CAP-10's registered intake service creates the CAP-10 signal,** service-submitted under AAB-PLATFORM-05, section C, `initiatedBy` the recorder, `triggerKind` `RECORD` naming the request;\n  4. **the signal cites the request** by a resolved reference; that the request was received is derived when the request is read. A request not yet received is shown as such, never dropped.\n\n  **Every `ADVERSE_EVENT` still produces a signal request.** CAP-10's holds and directions still reach CAP-08 as before.",
    actors="`requestedBy` stays an `ActorReference`. Hosts, permit holders, ethics bodies, farmers and landholders stay declared data.",
    specific=[
        "**Provenance and the country are added to `Cap08Protocol`,** with the platform's `supersedes`; every CAP-08 record gains `recordKind` (`TRIAL_REGISTRATION`, `PROTOCOL`, `PROTOCOL_LOCK`, `TRIAL_OBSERVATION`, `FIELD_EVENT`, `SAFETY_SIGNAL_REQUEST`, `TEMPLATE`, `METRIC_DEFINITION`).",
        "**Offline capture moves into the platform's `capture` block:** `deviceCapturedAt` becomes `capture.deviceRecordedAt`, and `clientCaptureId` becomes `capture.deviceCaptureId` (AAB-PLATFORM-05, decision 12). Checks 5 and 8, and offline replay, are unchanged in meaning.",
        "**An observation by instrument** uses `INSTRUMENT_CAPTURE`, under `cap-03-vocabulary-2`'s requirements: the instrument's identity and configuration recorded, its calibration evidence cited where it exists, any human intervention disclosed, and no implication of scientific validation.",
        "**Schema versions follow the envelope:** the fields added by the amendments of 2026-09-30 and 2026-10-02 (`arms[].material`, `arms[].application`, `batches`) belong to the next schema version of the record, never to version 1, so each version's envelope is exact.",
    ],
)

C["CAP-09"] = dict(
    ordinal="third",
    kinds=[
        K("`Cap09LearningClaim`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-09:LEARNING_CLAIM`"),
        K("`Cap09LearningDossier`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-09:LEARNING_DOSSIER`"),
        DEC_KIND("`LEARNING_REVIEW`, `CAP09_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("`evidence[]`", MAND, "`SUPPORTS`, `CONTRADICTS` or `REFERS_TO`, by role", "`CAP-04:MEMORY_RECORD`", "Yes", ref("EVIDENCE_NOT_ADMITTED") + " (check 5)"),
        Cit("`landscapes[]`", MAND, "`REFERS_TO`; reviews `DECIDED_ON`; resolved with their digests", "`CAP-05:EVIDENCE_LANDSCAPE`; `AAB-PLATFORM-08:HUMAN_DECISION`", "Yes, when declared: the claim relies on what it cites", ref("LANDSCAPE_NOT_FOUND") + " (check 7)"),
        Cit("`boundary.materials`", SUBJ, "`REFERS_TO`; **now each with a declared version,** resolved", "`CAP-06:RECORD` or `CAP-07:RECORD`", "Yes, when declared: they define the claim's boundary", ref("RECORD_NOT_FOUND")),
        SUPROW,
    ],
    matrix=[
        ("Learning claim", native()),
        ("Learning dossier", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (second), on dossiers and promotions, is **derived when read.**",
    supersession="`supersedes` takes the platform's declared and resolved shape; `UPDATE` maps to `NEW_VERSION`. The submitter no longer supplies the superseded record's digest: the system resolves it.",
    submitters="**Every learning claim is submitted by a `HUMAN`** (decision 14).",
    actors="`requestedBy` stays an `ActorReference`; no other.",
    specific=[
        "**Check 9's `SOURCE_UNIDENTIFIED`** applies where a claim declares an external source; for `SUBMITTER_AUTHORED` it is not applicable.",
    ],
)

C["CAP-10"] = dict(
    ordinal="fourth",
    kinds=[
        K("`Cap10AssessmentRequest`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-10:ASSESSMENT_REQUEST`"),
        K("`Cap10AssessorQualification`", "Admitted record", "`SUBMITTER_AUTHORED`; the qualifications it lists are declared by issuer and reference", HD, "`HUMAN` (the assessor)", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-10:ASSESSOR_QUALIFICATION`"),
        K("`Cap10SafetySignal`", "Admitted record, quarantined at once", "By channel: from a CAP-08 or CAP-12 request, or `MACHINE_GENERATED`, `CAPABILITY_OUTPUT`; `DIRECT_REPORT`, `SUBMITTER_AUTHORED`; `EXTERNAL_REPORT_RECORDED`, as the recorder declares it", "From a request or a machine: " + DET + "; a direct or recorded report: " + HD, "`SERVICE` (CAP-10's intake service) for a request or a machine signal; `HUMAN` for a direct or recorded report", "`CORRECTION`, `NEW_VERSION`", RD, "`CAP-10:SAFETY_SIGNAL`"),
        K("`PRECAUTIONARY_HOLD`", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE`, placed by a rule", "Never superseded; released by decision", RD, "`CAP-10:PRECAUTIONARY_HOLD`"),
        K("`COUNTRY_SAFETY_POLICY`, `EXTERNAL_NOTIFICATION`, acknowledgements", "Admitted records, written once (no interface yet)", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "Policy: `NEW_VERSION`; others never superseded", RD, "`CAP-10:POLICY`, `CAP-10:NOTIFICATION`"),
        K("`Cap10SafetyEcologyDossier`", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-10:SAFETY_ECOLOGY_DOSSIER`"),
        DEC_KIND("`SAFETY_ASSESSMENT`, `SPECIALIST_CONCURRENCE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_SAFETY_POLICY_APPROVAL`, `CAP10_HELD_RESOLUTION`, `SIGNAL_TRIAGE`, `SIGNAL_DETERMINATION`, `SAFETY_DIRECTION`, `HOLD_RELEASE`, `SIGNAL_CLOSURE`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Request `subject`", SUBJ, "`REFERS_TO`", "`CAP-06:RECORD`, `CAP-07:RECORD` or `CAP-01:RECORD`", "Yes", ref("SUBJECT_NOT_FOUND") + " (check 4)"),
        Cit("Request `evidence[]`", MAND, "`SUPPORTS`, `origin` a source qualifier", "`CAP-04:MEMORY_RECORD`", "Yes", ref("EVIDENCE_NOT_ADMITTED") + " (check 8)"),
        Cit("Request `subject.regulatorDecision` (added; optional)", OPT, "`REFERS_TO`, enriching the record only", "`CAP-11:REGULATOR_DECISION`", "No", lim("CITATION_UNRESOLVED") + "; `REGULATORY_STATUS_NOT_ASSESSED` disclosed where none resolves"),
        Cit("Signal: the CAP-08 or CAP-12 safety-signal request", AUTHB, "`REFERS_TO`, qualifier `SIGNAL_REQUEST`, set by the intake service", "`CAP-08:SAFETY_SIGNAL_REQUEST`, `CAP-12:SAFETY_SIGNAL_REQUEST`", "Yes, for a requested signal", ref("RECORD_NOT_FOUND") + ": no signal is created; the request stays open and is shown as not received"),
        Cit("Signal `source`, for a direct or recorded report", REL, "`REFERS_TO`", "Its record kind", "No", lim("CITATION_UNRESOLVED") + ": a signal is never refused for being incomplete (CAP-10's safety rule)"),
        Cit("Signal `concerns`, `attachments[]`, `machine.inputs[]`", REL, "`REFERS_TO`, each with its record kind; attachments are `objectDigest`s held by their source capability", "Trials, decisions, subjects, objects", "No", lim("CITATION_UNRESOLVED") + ", for the same reason"),
        Cit("Hold: triggering evidence", AUTHB, "`RELIED_ON`, set by the service", "The signal, event or record that met the rule", "Yes", "Cannot be unresolved: set by the system"),
        SUPROW,
    ],
    matrix=[
        ("Assessment request", [lim("SOURCE_UNIDENTIFIED") + " (check 10) where an external source is declared; otherwise " + SA, NO, NO, BYCLASS, NO, NO]),
        ("Assessor qualification", [SA, lim("ORIGINAL_NOT_STORED") + ": qualification evidence is declared by issuer and reference, not stored", lim("INTEGRITY_UNVERIFIED") + ", for the same reason", BYCLASS, "N/A: the evidence is declared by reference", "N/A: as for `CUSTODY_DECLARED_INCOMPLETE`"]),
        ("Safety signal", [lim("SOURCE_UNIDENTIFIED") + " for `EXTERNAL_REPORT_RECORDED` without an identifier; otherwise N/A", lim("ORIGINAL_NOT_STORED") + " for attachments held outside a trial", lim("INTEGRITY_UNVERIFIED") + ", for the same", BYCLASS, "N/A: attachments are held by their source capability", "N/A: as for `CUSTODY_DECLARED_INCOMPLETE`"]),
        ("Precautionary hold", ["N/A: `CAPABILITY_OUTPUT`", NO, NO, BYCLASS, NO, NO]),
        ("Policy, notification, acknowledgement", native()),
        ("Safety and ecology dossier", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (third), on signals, dossiers and assessments, is **derived when read.**",
    supersession="`supersedes` takes the platform's declared and resolved shape on requests, **and is added** to qualifications and signals (\"a correction is a new version\"); `UPDATE` maps to `NEW_VERSION`. A duplicate signal is linked by `REFERS_TO`, qualifier `DUPLICATE_OF`, never superseded.",
    submitters="**Requests, qualifications, policies, notifications, direct reports and recorded external reports are submitted by a `HUMAN`.** **Service-submitted, under AAB-PLATFORM-05, section C, by CAP-10's registered services:**\n  - **a signal from a CAP-08 or CAP-12 safety-signal request,** created by CAP-10's intake service, `initiatedBy` the person who recorded the originating record, `triggerKind` `RECORD` naming the request. **CAP-10's records are written only by CAP-10;**\n  - **a `MACHINE_GENERATED` signal,** from a capability whose contract names CAP-10 as a recipient (none is contracted yet);\n  - **a `PRECAUTIONARY_HOLD` placed by a rule.** **Every automatic hold records:** the rule's identifier and version; the triggering evidence; the service and its release (`service.serviceRegistrationId`, `service.softwareRelease`); the time (`submittedAt`); the affected subject; the reason; and **the human review required** (a `HOLD_RELEASE` by a `SAFETY_GOVERNOR`).\n\n  **The signal's `machine` block maps onto the platform's `service` block and `generation`:** `producer` is the service registration, `ruleOrModelVersion` the method version. **A service never triages, determines, directs, releases or closes.**",
    actors="`requestedBy` stays an `ActorReference`. **`Cap10AssessorQualification.person`** is the submitter, read from `provenance.submission.submittedBy`; the field is kept as a read alias. `affectedPeople` stays declared data.",
    specific=[
        "**The interface catches up with the amendment of 2026-10-02 (second), points 1 and 2,** which decided them: `useStage` includes `MANUFACTURING_HANDLING`; `channel` includes `MANUFACTURING_REPORT`; `concerns.kind` includes `MANUFACTURING_TRANSFER`. Nothing changes in meaning.",
        "**The optional regulator-decision citation** (section 4) **never makes CAP-10 depend on CAP-11.** CAP-10 assesses safety without it, disclosing `REGULATORY_STATUS_NOT_ASSESSED` where none is cited or resolved. The citation enriches a record; **it never converts regulatory authority into safety evidence, or safety evidence into regulatory authority.**",
    ],
)

C["CAP-11"] = dict(
    ordinal="third",
    kinds=[
        K("`Cap11RegulatorySource`", "Admitted record", "`REGULATORY_SOURCE_TEXT`", HD + "; a translation `TRANSLATION_HUMAN` or `TRANSLATION_MACHINE`", "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-11:REGULATORY_SOURCE`"),
        K("`Cap11RegulatoryRequirement`, `Cap11RequirementSet`, `Cap11EvidenceMapping`", "Admitted records", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-11:REGULATORY_REQUIREMENT`, `CAP-11:REQUIREMENT_SET`, `CAP-11:EVIDENCE_MAPPING`"),
        K("`Cap11RegulatorDecisionRecord`", "Admitted record", "`REGULATOR_CORRESPONDENCE`", HD, "`HUMAN`", "`CORRECTION`, `WITHDRAWAL`; a regulator's own change is `changesRegulatorDecision`, never a supersession", RD, "`CAP-11:REGULATOR_DECISION`"),
        K("`Cap11EgressRecord`", "Admitted record", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-11:DOSSIER_EGRESS`"),
        K("Change events, `MONITORING_RECORD`, `COUNTRY_GOVERNANCE_EXEMPTION`, `ASSESSOR_QUALIFICATION`, `COUNTRY_REGULATORY_POLICY`", "Admitted records, written once (no interface yet)", "`SUBMITTER_AUTHORED`", HD, "`HUMAN`", "`CORRECTION`, `NEW_VERSION`, `WITHDRAWAL`", RD, "`CAP-11:RECORD`"),
        K("Machine-proposed candidates (change events, extractions)", "Admitted records, held for a person (no interface yet)", "`CAPABILITY_OUTPUT`", "`AUTOMATED_EXTRACTION` or `TRANSLATION_MACHINE` (`REQUIRED_TRUE`)", "`SERVICE`", "Never superseded", RD, "`CAP-11:CANDIDATE`"),
        K("`Cap11RegulatoryDossier`, determination bases", "Evaluations (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-11:REGULATORY_DOSSIER`"),
        DEC_KIND("`REQUIREMENT_SET_VERIFICATION`, `DOSSIER_ASSESSMENT`, `REGULATOR_DECISION_VERIFICATION`, `PERMIT_DETERMINATION`, `MARKET_AUTHORISATION_DETERMINATION`, `COUNTRY_GOVERNANCE_EXEMPTION_APPROVAL`, `EGRESS_AUTHORISATION`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_REGULATORY_POLICY_APPROVAL`, `CAP11_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Source `document`", SUBJ, "`EXTRACTED_FROM`", "`CAP-04:MEMORY_RECORD` (`DOCUMENT`)", "Yes", ref("EVIDENCE_NOT_ADMITTED") + " (check 3)"),
        Cit("Source `translation.of`", SUBJ, "`TRANSLATION_OF`; **now resolved**", "`CAP-11:REGULATORY_SOURCE`", "Yes, for a translation", ref("RECORD_NOT_FOUND")),
        Cit("Requirement `sources[]`", MAND, "`EXTRACTED_FROM`, the provision a qualifier", "`CAP-11:REGULATORY_SOURCE`", "Yes", ref("AUTHORITATIVE_SOURCE_REQUIRED") + " (check 4)"),
        Cit("Set `requirements[]`", AUTHB, "`PART_OF`; **the digest is resolved by the system,** no longer declared", "`CAP-11:REGULATORY_REQUIREMENT`", "Yes", ref("REQUIREMENT_SET_INCONSISTENT") + " (check 6)"),
        Cit("Mapping `requirementSet`, `requirement`, `subject`", SUBJ, "`REFERS_TO`", "`CAP-11:REQUIREMENT_SET`, `CAP-11:REGULATORY_REQUIREMENT`, the subject's kind", "Yes", ref("REQUIREMENT_SET_NOT_VERIFIED") + " / " + ref("RECORD_NOT_FOUND")),
        Cit("Mapping `evidence[]`", MAND, "`SUPPORTS`; **CAP-10 outcomes now cite each decision's identifier and digest**", "`CAP-04:MEMORY_RECORD`, `AAB-PLATFORM-08:HUMAN_DECISION`, `CAP-11:REGULATOR_DECISION`", "Yes: the mapping is its evidence", ref("EVIDENCE_NOT_ADMITTED") + "; evidence that later stops being current shows as `NOT_MAPPED` in the dossier, as before"),
        Cit("Regulator decision `subject`", SUBJ, "`REFERS_TO`", "The subject's kind, where it has one", "Yes, when it names a record", ref("RECORD_NOT_FOUND") + "; a declared subject stays declared"),
        Cit("Regulator decision `authenticityEvidence[].document`", MAND, "`SUPPORTS`", "`CAP-04:MEMORY_RECORD` (`DOCUMENT`)", "Yes", ref("EVIDENCE_NOT_ADMITTED")),
        Cit("Regulator decision `changesRegulatorDecision`", SUBJ, "`REFERS_TO`, qualifier `CHANGES`: resolves the earlier decision's identifier, version, digest, issuing authority and jurisdiction", "`CAP-11:REGULATOR_DECISION`", "Yes, when declared", ref("RECORD_NOT_FOUND") + "; a different issuing authority or jurisdiction also refuses (`REQUEST_VALIDATION_FAILED`)"),
        Cit("Egress `authorisationDecisionId`, `package`", AUTHB, "`RELIED_ON`; the package by its `packageDigest` and `renditionDigest`", "`AAB-PLATFORM-08:HUMAN_DECISION`; the package", "Yes", ref("EGRESS_NOT_AUTHORISED")),
        Cit("Egress `legalBasisEvidence[]` (added)", MAND, "`SUPPORTS`", "`CAP-04:MEMORY_RECORD`", "Yes", ref("EVIDENCE_NOT_ADMITTED")),
        SUPROW,
    ],
    matrix=[
        ("Regulatory source", ["N/A: its source is the cited CAP-04 `DOCUMENT`, required by check 3", NO, NO, BYCLASS, NO, NO]),
        ("Requirement, requirement set, evidence mapping, egress record", native()),
        ("Regulator decision", ["N/A: its source is the regulator, evidenced by the cited `DOCUMENT`s", NO, NO, BYCLASS, NO, NO]),
        ("Change event, monitoring record, exemption, qualification, policy", native()),
        ("Machine-proposed candidate", ["N/A: `CAPABILITY_OUTPUT`", NO, NO, BYCLASS, NO, NO]),
        ("Dossier, determination bases", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the amendment of 2026-10-02 (second) is **derived when read.**",
    supersession="**The platform's `supersedes` is added** to sources, requirements, sets and mappings, which check 7 already validates. **The regulator decision's `supersedes` is renamed `changesRegulatorDecision`:** a regulator's amendment, suspension or revocation is the regulator's act, recorded as a new regulator decision naming the decision it changes, never a platform supersession. A regulator decision recorded wrongly is corrected by the platform's `supersedes`, reason `CORRECTION`.",
    submitters="**Every CAP-11 record is submitted by a `HUMAN`,** except **machine-proposed candidates,** service-submitted under AAB-PLATFORM-05, section C, and held for a person.",
    actors="**`interpretation.author` is exactly one of** `actorReference` (when the author acted in AAB in that role, as the submitting curator) **or `declaredPerson`** (`{ name, role, qualification? }`, as declared: an author outside AAB, such as an external legal professional) (AAB-PLATFORM-05, decision 13). `preparedBy` and `irreversibilityAcknowledgedBy` act in AAB, and stay `ActorReference`s.",
    specific=[
        "**Digests inside records are typed** (AAB-PLATFORM-10): `sourceDigest`, `sourceDigests[]` and `documentDigest` are `objectDigest`s of the cited documents' originals, set by the system from CAP-04; the egress `packageDigest` and `renditionDigest` are those types.",
        "**`Cap11EgressRecord` gains `recordVersion`** (always 1: written once, corrected only by supersession).",
        "**The egress `legalBasis`** stays a declared statement, and **cites the evidence it rests on** in the added `legalBasisEvidence[]`, as admitted CAP-04 documents by version (AAB-PLATFORM-05, section F).",
    ],
)

C["CAP-12"] = dict(
    ordinal="second",
    kinds=[
        K("`Cap12ManufacturingSpecification`", "Admitted record, versioned under change control", "`SUBMITTER_AUTHORED`", HD, "`HUMAN` (`TRANSFER_REQUESTER`)", "`NEW_VERSION` (under an approved change request), `CORRECTION`, `WITHDRAWAL`", RD, "`CAP-12:SPECIFICATION`"),
        K("`Cap12RightsAuthority`", "Admitted record", "`SUBMITTER_AUTHORED`; its evidence is `RIGHTS_OR_CONTRACT_DOCUMENT`s in CAP-04", HD, "`HUMAN` (`AUTHORISED_RIGHTS_CONTROLLER`)", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-12:RIGHTS_AUTHORITY`"),
        K("`Cap12BatchAttestation`", "Admitted record", "`MANUFACTURER_RECORD`", HD, "`HUMAN` (`MANUFACTURER_RECIPIENT`)", "`CORRECTION`, `WITHDRAWAL`", RD, "`CAP-12:BATCH_ATTESTATION`"),
        K("Safety-signal request, from a manufacturing report", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE` (CAP-12's registered signal-request service), `initiatedBy` the reporting `MANUFACTURER_RECIPIENT`", "Never superseded", RD, "`CAP-12:SAFETY_SIGNAL_REQUEST`"),
        K("`TRANSFER_HOLD` placed by a rule", "Admitted record, written once (no interface yet)", "`CAPABILITY_OUTPUT`", DET, "`SERVICE`", "Never superseded; released by decision", RD, "`CAP-12:TRANSFER_HOLD`"),
        K("Transfer request, `CHANGE_REQUEST`, `RECIPIENT_UNDERTAKING`, `MANUFACTURER_ACCEPTANCE`, `MANUFACTURING_REPORT`, a hold placed by a person, notifications and acknowledgements, `TRANSFER_EGRESS`, ingress, `ASSESSOR_QUALIFICATION`, country transfer policy", "Admitted records, written once (no interface yet)", "`SUBMITTER_AUTHORED`; reports and acceptances, `MANUFACTURER_RECORD`", HD, "`HUMAN`", "`CORRECTION`, `WITHDRAWAL`; policy `NEW_VERSION`", RD, "`CAP-12:RECORD`"),
        K("Transfer package", "Package (primitive 8)", NONE, DET, "Compiled on a `HUMAN`'s request", "Never superseded", "`packageDigest`", "None"),
        K("Transfer evidence basis", "Evaluation (AAB-PLATFORM-07)", NONE, DET, "Requested by a `HUMAN`", "Never superseded", P07, "`CAP-12:EVIDENCE_BASIS`"),
        DEC_KIND("`RIGHTS_AUTHORITY_APPROVAL`, `EVIDENCE_BASIS_REVIEW`, `TRANSFER_AUTHORISATION`, `CHANGE_REQUEST_APPROVAL`, `TRANSFER_EGRESS_AUTHORISATION`, `HOLD_RELEASE`, `ASSESSOR_QUALIFICATION_REVIEW`, `COUNTRY_TRANSFER_POLICY_APPROVAL`, `CAP12_HELD_RESOLUTION`, `CHALLENGE_RESOLUTION`"),
    ],
    cites=[
        Cit("Specification `formulation`, `formula.components[].ingredient`", SUBJ, "`DERIVED_FROM`", "`CAP-07:RECORD`, `CAP-06:RECORD`", "Yes", ref("SPECIFICATION_MISMATCH")),
        Cit("Specification `conditionsCarriedOver`", MAND, "`RELIED_ON`; **now resolved,** with digests", "`AAB-PLATFORM-08:HUMAN_DECISION` (CAP-10, CAP-11)", "Yes", ref("EVIDENCE_REQUIRED")),
        Cit("Specification `equivalence.trialledSpecification`", MAND, "`REFERS_TO`", "`CAP-12:SPECIFICATION`", "Yes, when equivalence is claimed", ref("EVIDENCE_REQUIRED")),
        Cit("Rights `basis[].evidence[]`", MAND, "`SUPPORTS`", "`CAP-04:MEMORY_RECORD` (`DOCUMENT`)", "Yes", ref("EVIDENCE_NOT_ADMITTED") + ", at admission; a stage relying on a concern without evidence is still refused `EVIDENCE_REQUIRED` at authorisation"),
        Cit("Batch `specification`", SUBJ, "`MANUFACTURED_FROM`; **the digest is resolved by the system,** no longer declared", "`CAP-12:SPECIFICATION`", "Yes", ref("SPECIFICATION_MISMATCH")),
        Cit("Batch `transferAuthorisationId`, `trials[]`", AUTHB, "`RELIED_ON`; `APPLIED_IN`; trials **now with versions**", "`AAB-PLATFORM-08:HUMAN_DECISION`; `CAP-08:TRIAL_REGISTRATION`", "Yes", ref("EVIDENCE_REQUIRED")),
        Cit("Batch `materialLots[].ingredient`", SUBJ, "`DERIVED_FROM`", "`CAP-06:RECORD`", "Yes", ref("EVIDENCE_REQUIRED") + " (an ingredient not in the specification)"),
        Cit("Batch `qcDocument`", MAND, "`SUPPORTS`", "`CAP-04:MEMORY_RECORD` (`DOCUMENT`)", "Yes", ref("EVIDENCE_REQUIRED")),
        Cit("Batch `release.authorityEvidence[]` (added)", OPT, "`SUPPORTS`", "`CAP-04:MEMORY_RECORD` (`DOCUMENT`)", "No", lim("CITATION_UNRESOLVED")),
        Cit("Hold: triggering evidence", AUTHB, "`RELIED_ON`, set by the service", "The CAP-10 or CAP-11 record whose event met the rule", "Yes", "Cannot be unresolved: set by the system"),
        SUPROW,
    ],
    matrix=[
        ("Manufacturing specification, rights authority", native()),
        ("Batch attestation", ["N/A: its source is the manufacturer, named in the record", NO, NO, BYCLASS, NO, NO]),
        ("Safety-signal request, hold placed by a rule", ["N/A: `CAPABILITY_OUTPUT`", NO, NO, BYCLASS, NO, NO]),
        ("Records without an interface", native()),
        ("Transfer evidence basis", EVROW),
        ("Human decisions", DEROW),
    ],
    integrity="The `integrity?` reference of the CAP-03 amendment, on specifications, batch attestations, packages, evidence bases and authorisations, is **derived when read.**",
    supersession="**The platform's `supersedes` is added:** a specification's new version, under an approved change request, supersedes the previous one with reason `NEW_VERSION`; rights authorities and batch attestations are corrected or withdrawn with `CORRECTION` or `WITHDRAWAL`.",
    submitters="**Specifications, rights authorities, batch attestations, requests, undertakings, acceptances and reports are submitted by a `HUMAN`,** except the safety-signal request below. **A hold placed at once on a CAP-10 or CAP-11 event** is service-submitted under AAB-PLATFORM-05, section C, and **records:** the rule's identifier and version; the triggering evidence; the service and its release; the time (`submittedAt`); the affected transfer; the reason; and **the human review required** (a `HOLD_RELEASE` by a `TRANSFER_GOVERNOR`). **\"Every actor is `HUMAN`\" now reads \"Every actor is `HUMAN`, except a hold placed by a rule\",** as in CAP-10. **CAP-12 never writes a CAP-10 record:** a manufacturing report with a possible safety implication has CAP-12's registered signal-request service write a CAP-12 **safety-signal request,** `initiatedBy` the reporter, and CAP-10's intake service creates the signal from it, citing it, as for CAP-08 (CAP-10's amendment of 2026-10-02, fourth).",
    actors="**`release` names its releaser by exactly one of** `releasedByActor` (an `ActorReference`, where the manufacturer's release authority is a registered AAB actor) **or `releasedByDeclaredPerson`** (`{ name, qualification, organisation, authorityBasis }`, as declared). **The release record carries the batch attestation's provenance, and evidence of the releaser's authority** where it exists (`release.authorityEvidence[]`, section 4). **AAB records that external act; it does not itself release the batch.** `controller` is the `AUTHORISED_RIGHTS_CONTROLLER`, who acts in AAB, and stays an `ActorReference`; `onBehalfOf` stays declared data.",
    specific=[
        "**`Cap12BatchAttestation` gains `recordVersion`** (always 1, corrected only by supersession).",
        "**`qcResultsDigest` is typed:** the `objectDigest` of the QC document's original, **set by the system from the cited CAP-04 record,** never declared.",
    ],
)

C["CAP-03"]["specific"][1] = VOCAB


# Generation ----------------------------------------------------------------

def md_table(header, rows):
    out = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def t_kinds(d):
    return md_table(["Record kind", "What it is", "`source.sourceType`", "Generation method (automation constraint)", "Submitter", "Supersession", "Digest", "Resolver kind"],
                    [[k["kind"], k["what"], k["src"], k["method"], k["submitter"], k["supersession"], k["digest"], k["resolver"]] for k in d["kinds"]])


def t_cites(d):
    return md_table(["Field", "Citation class", "Relation", "Expected record kind", "Mandatory", "When unresolved"], [list(c) for c in d["cites"]])


def t_matrix(d):
    return md_table(["Record kind"] + [f"`{g}`" for g in GAPS], [[k] + v for k, v in d["matrix"]])


CLASS_TABLE = md_table(["Citation class", "Unresolved consequence"], [
    ["Subject: the record being evaluated, or that the record is about", "Refusal"],
    ["Authority or membership: the basis for the act, or what the record belongs to", "Refusal"],
    ["Superseded record", "Refusal"],
    ["Mandatory evidence: evidence an outcome relies on", "Refusal, or `EVIDENCE_REQUIRED`"],
    ["Optional evidence: supporting or context evidence", "Limitation"],
    ["Related: material not relied on", "Limitation, or omitted with a disclosure"],
])

LEGEND = "*The matrix's reasons:* **no original:** the record holds no original of its own; what it cites are CAP-04 records, whose gaps are carried by reference. **`SUBMITTER_AUTHORED`:** its content was created by the identified human or authorised service submitting it, so its source is the submission itself. **Evaluation:** an AAB-PLATFORM-07 evaluation, whose members' gaps are carried by reference. **Human decision:** an AAB-PLATFORM-08 decision, bound by digest to what it decides. **Status record:** a written-once record of a state change, bound by digest to the record it concerns. **By citation class:** each citation's consequence is its row in section 4."


def heading(d):
    o = f" ({d['ordinal']})" if d["ordinal"] else ""
    return f"## Amendment of 2026-10-02{o}: provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10"


def section(cap, d):
    P = [heading(d), ""]
    P.append(f"**Why.** AAB-PLATFORM-05 Governed Provenance is amended, and AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests is new (`governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; PR #118). **An adoption without its matrix is incomplete** (AAB-PLATFORM-05, amendment of 2026-10-02, section G). This amendment applies their confirmed decisions to {cap}, record kind by record kind. Approved by the Platform Owner in review on 2026-10-02. **Nothing of {cap} is built, so nothing stored is renamed or rewritten.** Its three tables are reproduced exactly in `governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md`, which `governance/tools/provenance-matrix/check_matrix.py` checks against this contract.")
    P += ["", f"**1. Record kinds.** Every record kind {cap} writes, and how each adopts AAB-PLATFORM-05 and AAB-PLATFORM-10:", "", t_kinds(d), ""]
    P.append("- **Every admitted record kind** carries `provenance: Provenance` (`provenanceVersion` `\"2\"`) and a **`recordDigest`: a `DigestReference`** (`recordDigest`, `aab-canonical-json-1`, `sha-256`), calculated in AAB-PLATFORM-05's nine steps over its envelope: every field of the record except `recordDigest`, derived status, later verification results, access logs and presentation-only fields. **Each schema declares its envelope, machine-readably,** before step 4. A `\"sha256:\"` comment on a `recordDigest` in this contract now reads so.")
    P.append("- **A record kind named here without an interface** is a written-once admitted record under these same rules; its schema, with its envelope, is written before step 4.")
    P.append("- **Evaluations** keep AAB-PLATFORM-07's digests; **human decisions** keep AAB-PLATFORM-08's, typed as `recordDigest`s of written-once records.")
    P.append("- **Every digest of a cited or superseded record is resolved by the system,** never declared in a request.")
    P.append("- **Each resolver kind is registered** (AAB-PLATFORM-05, section E): by identifier, and version where the kind is versioned, in the country workspace, disclosing only what the reader may see under this contract's read rules; what may not be disclosed is unresolved, never revealed.")
    P += ["", "**2. Written once.** " + d["integrity"], "", "**3. Supersession.** " + d["supersession"], ""]
    P.append(f"**4. Citations.** Every reference {cap} relies on follows the same cite-then-resolve behaviour (AAB-PLATFORM-05, decision 10), through the registered resolver of the expected record kind. A declared version that differs from the version found is unresolved. **The consequence of an unresolved citation follows its class:**")
    P += ["", CLASS_TABLE, "", f"Every citation {cap} makes, with its class, relation, expected record kind, whether it is mandatory, and its outcome and failure code. The field names stay:", "", t_cites(d), ""]
    P += ["**5. The six-gap matrix.**", "", t_matrix(d), "", LEGEND, ""]
    P.append(f"**6. Vocabulary.** {cap} adopts **`cap-03-vocabulary-2`** (CAP-03's amendment of 2026-10-02), in place of version 1: `OTHER` and `SUBMITTER_AUTHORED` among the source types, and **every generation method with an automation constraint** (`REQUIRED_TRUE`, `REQUIRED_FALSE` or `DECLARED_PER_RECORD`), never inferred from its name. A record whose `automated` contradicts its method's constraint is refused.")
    P += ["", "**7. Submitters.** " + d["submitters"], "", "**8. People in content.** " + d["actors"]]
    n = 9
    for s in d["specific"]:
        P += ["", f"**{n}.** " + s]
        n += 1
    P += ["", f"**{n}. What this amendment replaces.** The interfaces, field rules, admission checks' consequences and failure contract are read as above wherever they differ; `RECORD_NOT_FOUND` joins the failure contract where it is named above and is not already there. The dependencies gain a row: **AAB-PLATFORM-10 Canonical Serialisation and Cryptographic Digests: canonicalisation and digest types; `designed`.** Nothing else in this contract changes. **Nothing is implemented by this amendment.**", ""]
    return "\n".join(P)


def header_line(d):
    o = f", {d['ordinal']}" if d["ordinal"] else ""
    return f"2026-10-02{o} (provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10), with AAB-PLATFORM-10's canonical contract"


def apply(cap, d):
    f = glob.glob(str(WB / f"{cap}-*CANONICAL-CONTRACT*.md"))
    assert len(f) == 1, (cap, f)
    p = Path(f[0])
    lines = p.read_bytes().decode().split("\n")
    if heading(d) in lines:
        raise SystemExit(f"{cap}: the amendment is already in {p.name}; refusing to insert it again")
    idx = [i for i, l in enumerate(lines[:15]) if l.startswith("**Amended:**")]
    if idx:
        l = lines[idx[0]].rstrip()
        assert l.endswith(".")
        lines[idx[0]] = l[:-1] + "; and " + header_line(d) + "."
    else:
        w = [i for i, l in enumerate(lines[:15]) if l.startswith("**Written:**")][0]
        lines.insert(w + 1, "**Amended:** " + header_line(d) + ".")
    am = [i for i, l in enumerate(lines) if l.startswith("## Amendment of ")]
    if am:
        pos = [i for i in range(am[-1] + 1, len(lines)) if lines[i].startswith("## ")][0]
    else:
        pos = [i for i, l in enumerate(lines) if l.startswith("## Why this contract")][0]
    lines[pos:pos] = section(cap, d).split("\n")
    p.write_bytes("\n".join(lines).encode())
    return p.name


def matrix_doc():
    O = ["# AGR Provenance Adoption Matrix — 2026-10-02", "",
         "**Status:** GOVERNANCE RECORD — NOT IMPLEMENTATION",
         "**Authority:** RECORDS, FOR EVERY AGR CAPABILITY, HOW EACH OF ITS RECORD KINDS ADOPTS AAB-PLATFORM-05 AND AAB-PLATFORM-10: SOURCE TYPE, GENERATION METHOD AND AUTOMATION CONSTRAINT, SUBMITTER, SUPERSESSION, DIGEST FORM AND RESOLVER KIND; EVERY CITATION, WITH ITS CLASS, RELATION, EXPECTED RECORD KIND, WHETHER IT IS MANDATORY, AND ITS OUTCOME; AND THE CONSEQUENCE OF EACH OF THE SIX PROVENANCE GAPS. Approved by the Platform Owner in review on 2026-10-02. It admits, implements and changes nothing.",
         "**Sources:** `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md` (amendment of 2026-10-02, section G); `governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`; each AGR capability's amendment of 2026-10-02 on provenance and digests.",
         "",
         "## How it is verified",
         "",
         "- **Every table below is reproduced exactly from a contract.** For each capability, its three tables (record kinds, citations, six-gap matrix) appear, byte for byte, in that capability's amendment of 2026-10-02 on provenance and digests.",
         "- **`governance/tools/provenance-matrix/check_matrix.py` checks it:** it reads this record and the twelve contracts, and fails, naming the table, if any table here does not appear exactly in its contract, if any capability is missing, or if any contract's amendment has a table this record does not. Run it from the repository root: `python governance/tools/provenance-matrix/check_matrix.py`.",
         "- **The tables are generated from one source,** so they cannot drift without the check failing.",
         "",
         "## How to read it",
         "",
         "- **Citation classes:**",
         "",
         CLASS_TABLE,
         "",
         "- " + LEGEND,
         "- **Limitation `X`:** the gap or citation is disclosed with the admission, under `X`. **Refusal `X`:** the submission is refused, under `X`, and nothing is written.",
         ""]
    for cap in sorted(C):
        d = C[cap]
        O += [f"## {cap}", "", "### Record kinds", "", t_kinds(d), "", "### Citations", "", t_cites(d), "", "### Six-gap matrix", "", t_matrix(d), ""]
    O += ["## What this record does not establish", "",
          "- It admits nothing, implements nothing, and changes no contract: each capability's amendment is the authority, and the check proves they agree.",
          "- It does not cover SCS, whose adoption of AAB-PLATFORM-05 is a separate decision.", ""]
    p = WB / "AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md"
    p.write_bytes("\n".join(O).encode())
    return p.name


if __name__ == "__main__":
    if "--apply" in sys.argv[1:]:
        for cap in sorted(C):
            print(apply(cap, C[cap]))
    print(matrix_doc())
