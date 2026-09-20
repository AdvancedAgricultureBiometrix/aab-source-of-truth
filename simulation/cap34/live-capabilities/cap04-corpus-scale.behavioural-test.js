"use strict";

/**
 * CAP-04 (Governed Scientific Memory) live-logic behavioural proof --
 * stages 5 and 6 of Historical Scientific Memory Recovery (detect
 * problems at scale; deliberately preserve and surface negative/failed
 * results), built together since both operate over a corpus of stage-3
 * extraction output rather than a single record.
 *
 * The standout property (Part B): stage 3's own per-record conflict check
 * only ever compares a new record against whatever priorExtractedRecords
 * its caller happened to pass at extraction time. In a real
 * multi-institution pathway, two records can arrive close together
 * without either extraction call knowing about the other, so a genuine
 * contradiction can slip through stage 3 uncaught. This file proves that
 * scanCorpusForProblems() catches exactly that gap by re-examining the
 * whole corpus together -- and that it only ever reports the problem,
 * never silently resolving or mutating the underlying records (stage 5's
 * "detect without silently fixing").
 *
 * Part D proves stage 6 as a discoverability guarantee, not just a
 * retention one: a negative/failed result is returned by
 * queryCorpusBySubject() with the same prominence, ordering rule and
 * detail as a positive one -- never filtered out or demoted by default.
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

const cap02 = sandbox.window.AAB_CAP34_LIVE_CAP02_SOURCE_ACQUISITION;
const cap04 = sandbox.window.AAB_CAP34_LIVE_CAP04_SCIENTIFIC_MEMORY;

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

const sourceMetadata = {
  country: "Synthetic Country", institution: "Synthetic Institute", department: "Synthetic Research Unit",
  originalSystem: "Synthetic Legacy System", datasetName: "Synthetic Trial Archive", responsibleOwner: "Synthetic Owner",
  dateRangeStart: "1998-01-01", dateRangeEnd: "2015-12-31", authorityToProvide: "Synthetic Institutional Authorisation",
  accessRestrictions: "Institution-only"
};
const registration = cap02.registerSource(sourceMetadata);
const preservedSource = cap02.preserveOriginal(registration, { originalContent: "Synthetic archived trial record bundle.", originalFileName: "archive-bundle.csv" });

function extractionOf(rawExtraction, prior) {
  return cap04.extractAndClassify(preservedSource, rawExtraction, prior || []);
}

// --- Part A: exact duplicates and possible-duplicate variants ---
const dupExtraction = { subjectKey: "Trial Site 50", treatmentLabel: "Treatment H", location: "Region 15", unit: "index units", dateObserved: "2011-02-01", measuredValue: 3, outcomePolarity: "POSITIVE" };
const dupA = extractionOf(dupExtraction);
const dupB = extractionOf(Object.assign({}, dupExtraction, { dateObserved: "2011-02-02" })); // same subject/treatment/location/polarity/value, different date -> looks like the same observation twice
const dupScan = cap04.scanCorpusForProblems([dupA.extractedRecord, dupB.extractedRecord]);
check(
  "CAP04CS-A0-EXACT-DUPLICATE-GROUP-DETECTED",
  "Two records sharing the same subject, treatment, location, polarity and measured value are grouped as an EXACT_DUPLICATE candidate, naming both record ids, without being told about each other at extraction time",
  dupScan.exactDuplicateGroups.length === 1
    && dupScan.exactDuplicateGroups[0].recordIds.includes(dupA.extractedRecord.recordId)
    && dupScan.exactDuplicateGroups[0].recordIds.includes(dupB.extractedRecord.recordId)
    && dupScan.contradictionGroups.length === 0,
  dupScan
);

const variantExtraction = { subjectKey: "Trial Site 51", treatmentLabel: "Treatment I", location: "Region 16", unit: "index units", dateObserved: "2012-02-01", measuredValue: 3, outcomePolarity: "POSITIVE" };
const variantA = extractionOf(variantExtraction);
const variantB = extractionOf(Object.assign({}, variantExtraction, { dateObserved: "2012-02-02", measuredValue: 3.4 })); // same conclusion, different reported value
const variantScan = cap04.scanCorpusForProblems([variantA.extractedRecord, variantB.extractedRecord]);
check(
  "CAP04CS-A1-POSSIBLE-DUPLICATE-VARIANT-DETECTED",
  "Two records agreeing on outcome polarity but reporting different measured values are grouped as a POSSIBLE_DUPLICATE_VARIANT, naming the distinct values -- never silently averaged or picked",
  variantScan.possibleDuplicateVariantGroups.length === 1
    && variantScan.possibleDuplicateVariantGroups[0].distinctMeasuredValues.length === 2
    && variantScan.exactDuplicateGroups.length === 0,
  variantScan
);

// --- Part B: THE standout property. Stage 3's own per-record check misses
// a contradiction because neither extraction call was told about the
// other; corpus-scale scanning catches it after the fact. ---
const missedSubject = { subjectKey: "Trial Site 52", treatmentLabel: "Treatment J", location: "Region 17" };
const recordX = extractionOf(Object.assign({ unit: "index units", dateObserved: "2013-01-01", measuredValue: 4, outcomePolarity: "POSITIVE" }, missedSubject)); // prior = []
const recordY = extractionOf(Object.assign({ unit: "index units", dateObserved: "2013-06-01", measuredValue: 0, outcomePolarity: "NEGATIVE" }, missedSubject)); // ALSO prior = [] -- deliberately NOT told about recordX, simulating two institutions extracting near-simultaneously without shared context

check(
  "CAP04CS-B0-STAGE-3-GENUINELY-MISSED-THE-CONTRADICTION",
  "Sanity check: recordY's own stage-3 extraction, given no knowledge of recordX, reaches PENDING_REVIEW rather than FLAGGED_CONFLICT -- the gap is real, not assumed",
  recordY.extractedRecord.recordStatus === "PENDING_REVIEW"
    && recordY.extractedRecord.conflictingRecordIds.length === 0,
  recordY
);

const corpusScan = cap04.scanCorpusForProblems([recordX.extractedRecord, recordY.extractedRecord]);
check(
  "CAP04CS-B1-CORPUS-SCALE-SCAN-CATCHES-THE-MISSED-CONTRADICTION",
  "Scanning both records together as a corpus DOES surface a CONTRADICTION_GROUP naming both record ids and both distinct outcome polarities, even though stage 3 itself missed it",
  corpusScan.contradictionGroups.length === 1
    && corpusScan.contradictionGroups[0].recordIds.includes(recordX.extractedRecord.recordId)
    && corpusScan.contradictionGroups[0].recordIds.includes(recordY.extractedRecord.recordId)
    && corpusScan.contradictionGroups[0].distinctOutcomePolarities.length === 2,
  corpusScan
);

check(
  "CAP04CS-B2-SCAN-NEVER-MUTATES-THE-UNDERLYING-RECORDS",
  "After the corpus scan surfaces the contradiction, both underlying records are UNCHANGED -- still PENDING_REVIEW, still EXTRACTED_UNREVIEWED -- detection never silently fixes, resolves or reclassifies anything; that remains a stage-7 human decision",
  recordX.extractedRecord.recordStatus === "PENDING_REVIEW"
    && recordY.extractedRecord.recordStatus === "PENDING_REVIEW"
    && recordX.extractedRecord.governanceState === "EXTRACTED_UNREVIEWED"
    && recordY.extractedRecord.governanceState === "EXTRACTED_UNREVIEWED",
  { recordX: recordX.extractedRecord, recordY: recordY.extractedRecord }
);

// --- Part C: quarantined records are excluded from grouping (meaningless
// to compare) but still counted for corpus-level visibility ---
const quarantined = extractionOf({ treatmentLabel: "Treatment K", location: "Region 18", outcomePolarity: "POSITIVE", measuredValue: 1 }); // missing subjectKey, unit, date
const scanWithQuarantine = cap04.scanCorpusForProblems([recordX.extractedRecord, recordY.extractedRecord, quarantined.extractedRecord]);
check(
  "CAP04CS-C0-QUARANTINED-RECORDS-EXCLUDED-FROM-GROUPING-BUT-COUNTED",
  "A quarantined record (missing key fields) is never grouped for duplicate/contradiction analysis, since it has nothing reliable to compare, but is still counted in quarantinedCount for corpus-level visibility",
  scanWithQuarantine.quarantinedCount === 1
    && scanWithQuarantine.contradictionGroups.length === 1
    && scanWithQuarantine.totalRecords === 3,
  scanWithQuarantine
);

// --- Part D: stage 6, negative-result discoverability ---
const discoverySubject = "Trial Site 60";
const positiveDiscovery = extractionOf({ subjectKey: discoverySubject, treatmentLabel: "Treatment L", location: "Region 20", unit: "index units", dateObserved: "2014-01-01", measuredValue: 9, outcomePolarity: "POSITIVE" });
const negativeDiscovery = extractionOf({ subjectKey: discoverySubject, treatmentLabel: "Treatment M", location: "Region 21", unit: "index units", dateObserved: "2013-01-01", measuredValue: 0, outcomePolarity: "NEGATIVE" });
const queryResult = cap04.queryCorpusBySubject([positiveDiscovery.extractedRecord, negativeDiscovery.extractedRecord], discoverySubject);
check(
  "CAP04CS-D0-NEGATIVE-RESULT-DISCOVERABLE-SAME-PROMINENCE-AS-POSITIVE",
  "Querying by subject returns BOTH the positive and negative record, each correctly tagged with its own outcomePolarity, ordered only by date -- the negative result is not filtered out, demoted or reordered to appear less prominent",
  queryResult.matchCount === 2
    && queryResult.matches[0].recordId === negativeDiscovery.extractedRecord.recordId
    && queryResult.matches[0].outcomePolarity === "NEGATIVE"
    && queryResult.matches[1].recordId === positiveDiscovery.extractedRecord.recordId
    && queryResult.matches[1].outcomePolarity === "POSITIVE",
  queryResult
);

const quarantinedDiscovery = extractionOf({ subjectKey: discoverySubject, treatmentLabel: "Treatment N", outcomePolarity: "INCONCLUSIVE", measuredValue: 1 }); // missing location/unit/date -> QUARANTINED
const queryIncludingQuarantined = cap04.queryCorpusBySubject([positiveDiscovery.extractedRecord, negativeDiscovery.extractedRecord, quarantinedDiscovery.extractedRecord], discoverySubject);
check(
  "CAP04CS-D1-QUARANTINED-RECORD-FOR-SAME-SUBJECT-ALSO-DISCOVERABLE",
  "A quarantined record for the same subject is ALSO returned by discovery, not hidden -- full transparency about everything on file for a subject, even material stage 3 could not confidently classify",
  queryIncludingQuarantined.matchCount === 3
    && queryIncludingQuarantined.matches.some((m) => m.recordStatus === "QUARANTINED"),
  queryIncludingQuarantined
);

const emptyQuery = cap04.queryCorpusBySubject([positiveDiscovery.extractedRecord], "Trial Site Nonexistent");
check(
  "CAP04CS-D2-NO-MATCHES-RETURNS-HONEST-EMPTY-RESULT",
  "Querying a subject with no records returns an honest empty result (matchCount 0), not an error and not an invented match",
  emptyQuery.matchCount === 0 && emptyQuery.matches.length === 0,
  emptyQuery
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP04-CORPUS-SCALE-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP04_CORPUS_SCALE_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP04_CORPUS_SCALE_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves stages 5 and 6 of Historical Scientific Memory Recovery: corpus-scale scanning detects exact-duplicate and possible-duplicate-variant groups, and -- the standout property -- catches a genuine contradiction that stage 3's own per-record check missed because neither extraction call knew about the other, all without ever mutating the underlying records (detection, not silent fixing); and negative/failed and quarantined results are discoverable by subject with identical prominence, ordering and detail as positive ones, never filtered or demoted by default. It does not prove real duplicate/near-duplicate detection at true institutional scale, semantic similarity, cross-institution search, scientific correctness, production readiness or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-04-CORPUS-SCALE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
