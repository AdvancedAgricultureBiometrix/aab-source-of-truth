"use strict";

/**
 * CAP-04 (Governed Scientific Memory) live-logic behavioural proof --
 * stage 3 of Historical Scientific Memory Recovery (extract and classify
 * cautiously), consuming CAP-02's REAL preserved-source output.
 *
 * Three things this file exists to prove, matching the standard already
 * set by CAP-01/05/06/07/09:
 *
 * 1. Uploading a clean, a conflicting, and a degraded synthetic file set
 *    against the SAME preserved source produces three DIFFERENT outcomes
 *    (PENDING_REVIEW, FLAGGED_CONFLICT, QUARANTINED), driven purely by
 *    extraction content -- there is no scenario switch anywhere in the
 *    implementation for this to be keying off instead.
 * 2. A synthetic failed/null-result ("negative") trial is retained and
 *    classified with exactly the same rigor as a positive one: same
 *    status vocabulary, same structural shape, not silently suppressed or
 *    deprioritised.
 * 3. THE load-bearing property (Part G below): no output of stage 3 --
 *    clean, conflicting or quarantined alike -- is ever structurally
 *    eligible for scientific memory or for CAP-05/CAP-06-style downstream
 *    reasoning. This is the CAP-04 equivalent of CAP-09's
 *    CONTRADICTING_EVIDENCE_PRESENT test: if it is not real, the pathway
 *    is dishonest regardless of how clean everything else looks.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const SIM_ROOT = path.join(ROOT, "..");

function loadIntoSandbox(files) {
  const sandbox = { window: {}, TextEncoder };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: path.basename(file) });
  }
  return sandbox;
}

const sandbox = loadIntoSandbox([
  path.join(SIM_ROOT, "cap34-simulation.js"),
  path.join(ROOT, "cap02-source-acquisition.js"),
  path.join(ROOT, "cap04-scientific-memory.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap02 = sandbox.window.AAB_CAP34_LIVE_CAP02_SOURCE_ACQUISITION;
const cap04 = sandbox.window.AAB_CAP34_LIVE_CAP04_SCIENTIFIC_MEMORY;

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

// --- Shared real CAP-02 fixture: one genuinely registered + preserved
// source, produced by CAP-02's REAL evaluator, not a hand-written stand-in.
const sourceMetadata = {
  country: "Synthetic Country", institution: "Synthetic Institute", department: "Synthetic Research Unit",
  originalSystem: "Synthetic Legacy System", datasetName: "Synthetic Trial Archive", responsibleOwner: "Synthetic Owner",
  dateRangeStart: "1998-01-01", dateRangeEnd: "2015-12-31", authorityToProvide: "Synthetic Institutional Authorisation",
  accessRestrictions: "Institution-only"
};
const registration = cap02.registerSource(sourceMetadata);
const preservedSource = cap02.preserveOriginal(registration, { originalContent: "Synthetic archived trial record bundle.", originalFileName: "archive-bundle.csv" });
const unpreservedSource = cap02.preserveOriginal(registration, {}); // refused: no original content supplied

// --- Part 0: dispatcher wiring ---
const cleanPositiveExtraction = { subjectKey: "Trial Site 7", treatmentLabel: "Treatment A", location: "Region 3", unit: "index units", dateObserved: "2005-06-01", measuredValue: 4.2, outcomePolarity: "POSITIVE" };
const dispatched = sim.runLiveCapability("CAP-04", { preservedSource, rawExtraction: cleanPositiveExtraction, priorExtractedRecords: [] });
const direct = cap04.evaluateMemoryClassification({ preservedSource, rawExtraction: cleanPositiveExtraction, priorExtractedRecords: [] });
check(
  "CAP04-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-04', ...) reaches the same evaluator as calling it directly",
  dispatched.outcome === direct.outcome && dispatched.eligibleForScientificMemory === direct.eligibleForScientificMemory,
  dispatched
);

// --- Part A: real cross-capability dependency on CAP-02 ---
const refusedExtraction = cap04.extractAndClassify(unpreservedSource, cleanPositiveExtraction, []);
check(
  "CAP04-A0-EXTRACTION-REFUSED-WITHOUT-REAL-PRESERVATION",
  "Extraction is refused, naming ORIGINAL_NOT_PRESERVED, when CAP-02's REAL preservation call was itself refused (no original content supplied)",
  refusedExtraction.status === "EXTRACTION_REFUSED"
    && refusedExtraction.refusalReasons.includes("ORIGINAL_NOT_PRESERVED")
    && refusedExtraction.extractedRecord === null,
  { unpreservedSource, refusedExtraction }
);

const cleanPositiveResult = cap04.extractAndClassify(preservedSource, cleanPositiveExtraction, []);
check(
  "CAP04-A1-EXTRACTION-LINKS-BACK-TO-REAL-PRESERVED-SOURCE",
  "A successful extraction's fileId/sourceId trace back to CAP-02's REAL preservedRecord, not a disconnected fixture",
  cleanPositiveResult.status === "EXTRACTION_COMPLETE"
    && cleanPositiveResult.extractedRecord.fileId === preservedSource.preservedRecord.fileId
    && cleanPositiveResult.extractedRecord.sourceId === preservedSource.preservedRecord.sourceId,
  { preservedSource, cleanPositiveResult }
);

// --- Part B: the three synthetic file sets, same preserved source,
// producing three different outcomes purely from extraction content ---
const cleanNegativeExtraction = { subjectKey: "Trial Site 12", treatmentLabel: "Treatment B", location: "Region 5", unit: "index units", dateObserved: "2007-03-15", measuredValue: 0.1, outcomePolarity: "NEGATIVE" };
const cleanNegativeResult = cap04.extractAndClassify(preservedSource, cleanNegativeExtraction, []);
check(
  "CAP04-B0-CLEAN-SET-POSITIVE-PENDING-REVIEW",
  "The clean set's positive record extracts to PENDING_REVIEW with zero quarantine or conflict reasons",
  cleanPositiveResult.extractedRecord.recordStatus === "PENDING_REVIEW"
    && cleanPositiveResult.extractedRecord.quarantineReasons.length === 0
    && cleanPositiveResult.extractedRecord.conflictingRecordIds.length === 0,
  cleanPositiveResult
);
check(
  "CAP04-B1-CLEAN-SET-NEGATIVE-SAME-RIGOR-AS-POSITIVE",
  "The clean set's NEGATIVE (null-result) record is retained and reaches the SAME PENDING_REVIEW status with zero quarantine reasons -- not silently deprioritised, suppressed or given a different status vocabulary than the positive record",
  cleanNegativeResult.status === "EXTRACTION_COMPLETE"
    && cleanNegativeResult.extractedRecord.recordStatus === "PENDING_REVIEW"
    && cleanNegativeResult.extractedRecord.quarantineReasons.length === 0
    && JSON.stringify(Object.keys(cleanNegativeResult.extractedRecord).sort()) === JSON.stringify(Object.keys(cleanPositiveResult.extractedRecord).sort()),
  { cleanPositiveResult, cleanNegativeResult }
);

const conflictFirstExtraction = { subjectKey: "Trial Site 20", treatmentLabel: "Treatment C", location: "Region 8", unit: "index units", dateObserved: "2010-01-01", measuredValue: 5.0, outcomePolarity: "POSITIVE" };
const conflictSecondExtraction = { subjectKey: "Trial Site 20", treatmentLabel: "Treatment C", location: "Region 8", unit: "index units", dateObserved: "2011-01-01", measuredValue: 0.2, outcomePolarity: "NEGATIVE" };
const conflictFirstResult = cap04.extractAndClassify(preservedSource, conflictFirstExtraction, []);
const conflictSecondResult = cap04.extractAndClassify(preservedSource, conflictSecondExtraction, [conflictFirstResult.extractedRecord]);
check(
  "CAP04-B2-CONFLICTING-SET-FLAGS-NAMED-CONFLICT",
  "The conflicting set's second record -- same subject, treatment and location as the first, but contradicting outcome polarity -- is FLAGGED_CONFLICT and names the first record's id explicitly, never silently overwritten or averaged",
  conflictFirstResult.extractedRecord.recordStatus === "PENDING_REVIEW"
    && conflictSecondResult.extractedRecord.recordStatus === "FLAGGED_CONFLICT"
    && conflictSecondResult.extractedRecord.conflictingRecordIds.includes(conflictFirstResult.extractedRecord.recordId),
  { conflictFirstResult, conflictSecondResult }
);

const degradedExtraction = { subjectKey: "Trial Site 30", treatmentLabel: "Treatment D", location: "Region 9", outcomePolarity: "POSITIVE", measuredValue: 3.0 }; // dateObserved and unit deliberately absent
const degradedResult = cap04.extractAndClassify(preservedSource, degradedExtraction, []);
check(
  "CAP04-B3-DEGRADED-SET-QUARANTINED-NAMED-REASONS",
  "The degraded set's malformed record (missing dateObserved and unit) is QUARANTINED, naming exactly those two missing fields, never guessed or invented",
  degradedResult.extractedRecord.recordStatus === "QUARANTINED"
    && degradedResult.extractedRecord.quarantineReasons.length === 2
    && degradedResult.extractedRecord.quarantineReasons.includes("MISSING_DATE_OBSERVED")
    && degradedResult.extractedRecord.quarantineReasons.includes("UNKNOWN_UNIT"),
  degradedResult
);

check(
  "CAP04-B4-THREE-SETS-SAME-SOURCE-THREE-DIFFERENT-OUTCOMES",
  "Uploading the clean, conflicting-second and degraded synthetic extraction payloads against the SAME preserved source correctly produces three DIFFERENT recordStatus outcomes (PENDING_REVIEW, FLAGGED_CONFLICT, QUARANTINED), driven purely by what was extracted -- there is no scenario/file-set label anywhere in extractAndClassify for this to be keying off instead",
  cleanPositiveResult.extractedRecord.recordStatus === "PENDING_REVIEW"
    && conflictSecondResult.extractedRecord.recordStatus === "FLAGGED_CONFLICT"
    && degradedResult.extractedRecord.recordStatus === "QUARANTINED"
    && new Set([cleanPositiveResult.extractedRecord.recordStatus, conflictSecondResult.extractedRecord.recordStatus, degradedResult.extractedRecord.recordStatus]).size === 3,
  { clean: cleanPositiveResult.extractedRecord.recordStatus, conflict: conflictSecondResult.extractedRecord.recordStatus, degraded: degradedResult.extractedRecord.recordStatus }
);

// --- Part C: negative-result retention and discoverability ---
const combinedCleanList = [cleanPositiveResult.extractedRecord, cleanNegativeResult.extractedRecord];
check(
  "CAP04-C0-NEGATIVE-RESULT-RETAINED-AND-DISCOVERABLE",
  "Both the positive and the negative clean-set records are present in a combined listing and independently retrievable by recordId -- the negative result is not dropped, merged away or hidden behind the positive one",
  combinedCleanList.length === 2
    && combinedCleanList.some((r) => r.recordId === cleanPositiveResult.extractedRecord.recordId && r.outcomePolarity === "POSITIVE")
    && combinedCleanList.some((r) => r.recordId === cleanNegativeResult.extractedRecord.recordId && r.outcomePolarity === "NEGATIVE"),
  combinedCleanList
);

// --- Part G: the single most important property of this capability.
// Extracted-but-unreviewed data must be STRUCTURALLY blocked from being
// treated as CAP-04 memory or feeding downstream reasoning -- not just
// differently labelled in a UI string. ---

function admittedControlRecord(overrides) {
  return Object.assign({
    recordId: "EXT-CONTROL-ADMITTED", governanceState: "ADMITTED_SCIENTIFIC_MEMORY",
    reviewGate: { required: true, passed: true, decision: "ADMIT", reviewerId: "Synthetic Reviewer 1" }
  }, overrides || {});
}

const allExtractionOutcomes = [cleanPositiveResult.extractedRecord, cleanNegativeResult.extractedRecord, conflictSecondResult.extractedRecord, degradedResult.extractedRecord];
check(
  "CAP04-G0-NO-EXTRACTION-OUTCOME-EVER-ELIGIBLE-FOR-MEMORY",
  "None of the four real stage-3 outcomes above -- clean positive, clean negative, flagged conflict, or quarantined -- is ever eligible for scientific memory, enumerated individually",
  allExtractionOutcomes.every((record) => cap04.isEligibleForScientificMemory(record) === false)
    && allExtractionOutcomes.every((record) => record.governanceState === "EXTRACTED_UNREVIEWED"),
  allExtractionOutcomes.map((record) => ({ recordId: record.recordId, recordStatus: record.recordStatus, eligible: cap04.isEligibleForScientificMemory(record) }))
);

check(
  "CAP04-G1-WELL-FORMED-ADMISSION-IS-A-SATISFIABLE-POSITIVE-CONTROL",
  "A hand-authored, well-formed stage-7-shaped admission record (ADMITTED_SCIENTIFIC_MEMORY, passed reviewGate, decision ADMIT, named reviewer) IS accepted -- proving the eligibility check is a real gate, not a stub that is vacuously always false",
  cap04.isEligibleForScientificMemory(admittedControlRecord()) === true,
  admittedControlRecord()
);

const nearMissVariants = [
  admittedControlRecord({ reviewGate: { required: true, passed: false, decision: "ADMIT", reviewerId: "Synthetic Reviewer 1" } }),
  admittedControlRecord({ reviewGate: { required: true, passed: true, decision: null, reviewerId: "Synthetic Reviewer 1" } }),
  admittedControlRecord({ reviewGate: { required: true, passed: true, decision: "ADMIT", reviewerId: "" } }),
  admittedControlRecord({ reviewGate: { required: true, passed: true, decision: "ADMIT" } }),
  Object.assign({}, cleanPositiveResult.extractedRecord, { governanceState: "ADMITTED_SCIENTIFIC_MEMORY" })
];
check(
  "CAP04-G2-LABEL-ALONE-IS-NOT-ELIGIBILITY",
  "Setting governanceState to ADMITTED_SCIENTIFIC_MEMORY as a bare label -- with a failed, incomplete or missing reviewGate, or by relabelling a real stage-3 output -- is NOT sufficient for eligibility in any of five near-miss variants; the check is structural, not a single string flag",
  nearMissVariants.every((record) => cap04.isEligibleForScientificMemory(record) === false),
  nearMissVariants
);

check(
  "CAP04-G3-CLEANEST-EXTRACTION-OUTCOME-STILL-BLOCKED",
  "Even the single cleanest, most trustworthy-looking stage-3 outcome (PENDING_REVIEW, zero quarantine or conflict reasons) is STILL not eligible for scientific memory -- being clean does not itself grant eligibility, only a genuine stage-7 admission does",
  cleanPositiveResult.extractedRecord.recordStatus === "PENDING_REVIEW"
    && cap04.isEligibleForScientificMemory(cleanPositiveResult.extractedRecord) === false,
  cleanPositiveResult.extractedRecord
);

const mixedBatch = [cleanPositiveResult.extractedRecord, cleanNegativeResult.extractedRecord, conflictSecondResult.extractedRecord, degradedResult.extractedRecord, admittedControlRecord()];
const assembled = cap04.assembleEligibleEvidenceForReasoning(mixedBatch);
check(
  "CAP04-G4-DOWNSTREAM-ASSEMBLY-EXCLUDES-ALL-UNREVIEWED-RECORDS",
  "Feeding a mixed batch of all four real extracted-unreviewed outcomes plus one genuinely admitted control record into the illustrative CAP-05/CAP-06-style downstream assembler includes ONLY the admitted record: eligibleCount 1, excludedCount 4 -- this is the direct proof that extracted-but-unreviewed data cannot feed downstream reasoning",
  assembled.consideredCount === 5
    && assembled.eligibleCount === 1
    && assembled.excludedCount === 4
    && assembled.eligibleRecords.length === 1
    && assembled.eligibleRecords[0].recordId === "EXT-CONTROL-ADMITTED",
  assembled
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP04-SCIENTIFIC-MEMORY-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP04_SCIENTIFIC_MEMORY_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP04_SCIENTIFIC_MEMORY_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves stage 3 (extract and classify cautiously) of Historical Scientific Memory Recovery, consuming CAP-02's REAL preserved-source output: three synthetic file sets (clean, conflicting, degraded) against the same preserved source produce three different, content-driven outcomes; a negative/null-result record is retained and classified with identical rigor to a positive one; and -- the load-bearing property -- no stage-3 outcome is ever structurally eligible for scientific memory or downstream reasoning, proven with a positive control, five adversarial near-miss variants, and a direct downstream-exclusion proof. It does not prove stage 4 (format/unit interoperability mapping), stage 5 detection at corpus scale, stage 7's real human-review workflow, scientific correctness, production readiness or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-04-SCIENTIFIC-MEMORY-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
