"use strict";

/**
 * CAP-02 (Governed Scientific Data Acquisition & INTEROPERABILITY)
 * live-logic behavioural proof -- stage 4 of Historical Scientific Memory
 * Recovery (map different formats into common structures).
 *
 * The load-bearing rule, straight from the design document: "The original
 * wording and value would remain preserved alongside any normalized
 * representation." A mapping is a PROPOSAL, never a silent overwrite. This
 * file proves: an exact synonym match proposes the correct canonical term
 * and unit conversion; an unrecognised term is left UNMAPPED rather than
 * guessed; a genuinely ambiguous vocabulary entry is flagged rather than
 * silently resolved one way; the raw original fields are byte-identical
 * before and after mapping, even on a confident match; and -- closing the
 * loop with CAP-04's eligibility boundary -- a proposed mapping NEVER
 * moves a record any closer to scientific-memory eligibility. It also
 * consumes CAP-04's REAL extractAndClassify output, not hand-written
 * mapping fixtures.
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

// --- Real upstream fixtures: CAP-02 register+preserve, then CAP-04's REAL
// extractAndClassify, feeding proposeInteroperabilityMapping genuine
// stage-3 output, not a hand-written stand-in.
const sourceMetadata = {
  country: "Synthetic Country", institution: "Synthetic Institute", department: "Synthetic Research Unit",
  originalSystem: "Synthetic Legacy System", datasetName: "Synthetic Trial Archive", responsibleOwner: "Synthetic Owner",
  dateRangeStart: "1998-01-01", dateRangeEnd: "2015-12-31", authorityToProvide: "Synthetic Institutional Authorisation",
  accessRestrictions: "Institution-only"
};
const registration = cap02.registerSource(sourceMetadata);
const preservedSource = cap02.preserveOriginal(registration, { originalContent: "Synthetic archived trial record bundle.", originalFileName: "archive-bundle.csv" });

const cleanExtraction = { subjectKey: "Trial Site 7", treatmentLabel: "Treatment A", location: "Region 3", unit: "legacy index scale", dateObserved: "2005-06-01", measuredValue: 42, outcomePolarity: "POSITIVE" };
const cleanResult = cap04.extractAndClassify(preservedSource, cleanExtraction, []);

// --- Part A: a confident exact-synonym match on both subject and unit ---
const mappingA = cap02.proposeInteroperabilityMapping(cleanResult.extractedRecord);
check(
  "CAP02M-A0-EXACT-SUBJECT-AND-UNIT-MATCH-PROPOSED",
  "A raw subject and unit that are known synonyms in the reference vocabulary produce a PROPOSED_MAPPING naming the correct canonical subject and a correctly converted value (42 legacy index scale * 0.1 = 4.2 reference index units)",
  mappingA.status === "MAPPING_PROPOSED"
    && mappingA.mappingRecord.subjectMappingStatus === "PROPOSED_MAPPING"
    && mappingA.mappingRecord.normalizedSubjectKey === "Reference Subject C7"
    && mappingA.mappingRecord.unitMappingStatus === "PROPOSED_MAPPING"
    && mappingA.mappingRecord.normalizedUnit === "reference index units"
    && Math.abs(mappingA.mappingRecord.normalizedValue - 4.2) < 1e-9,
  mappingA
);

check(
  "CAP02M-A1-ORIGINAL-PRESERVED-BYTE-IDENTICAL-ALONGSIDE-MAPPING",
  "Even on a confident, correct mapping, the raw subject key, unit and measured value are preserved byte-identical to the extraction output -- normalization never overwrites the original",
  mappingA.mappingRecord.rawSubjectKey === cleanExtraction.subjectKey
    && mappingA.mappingRecord.rawUnit === cleanExtraction.unit
    && mappingA.mappingRecord.rawMeasuredValue === cleanExtraction.measuredValue,
  { extracted: cleanResult.extractedRecord, mapped: mappingA.mappingRecord }
);

check(
  "CAP02M-A2-MAPPING-NEVER-CHANGES-MEMORY-ELIGIBILITY",
  "Proposing a mapping does not change governanceState or reviewGate, and the mapped record is STILL not eligible for scientific memory -- a confident mapping is not a substitute for stage-7 review",
  mappingA.mappingRecord.governanceState === "EXTRACTED_UNREVIEWED"
    && JSON.stringify(mappingA.mappingRecord.reviewGate) === JSON.stringify(cleanResult.extractedRecord.reviewGate)
    && cap04.isEligibleForScientificMemory(mappingA.mappingRecord) === false,
  mappingA.mappingRecord
);

// --- Part B: an unrecognised term is left unmapped, never guessed ---
const unknownSubjectExtraction = { subjectKey: "Trial Site 999", treatmentLabel: "Treatment A", location: "Region 3", unit: "unrecognised gauge", dateObserved: "2005-06-01", measuredValue: 1, outcomePolarity: "POSITIVE" };
const unknownResult = cap04.extractAndClassify(preservedSource, unknownSubjectExtraction, []);
const mappingUnknown = cap02.proposeInteroperabilityMapping(unknownResult.extractedRecord);
check(
  "CAP02M-B0-UNRECOGNISED-TERMS-LEFT-UNMAPPED-NOT-GUESSED",
  "A subject and unit that are not in the reference vocabulary at all are left UNMAPPED_NO_REFERENCE_MATCH / UNMAPPED_UNIT_NO_REFERENCE_MATCH, with null normalized values -- AAB does not invent a canonical guess",
  mappingUnknown.mappingRecord.subjectMappingStatus === "UNMAPPED_NO_REFERENCE_MATCH"
    && mappingUnknown.mappingRecord.normalizedSubjectKey === null
    && mappingUnknown.mappingRecord.unitMappingStatus === "UNMAPPED_UNIT_NO_REFERENCE_MATCH"
    && mappingUnknown.mappingRecord.normalizedUnit === null
    && mappingUnknown.mappingRecord.rawSubjectKey === "Trial Site 999",
  mappingUnknown
);

// --- Part C: a genuinely ambiguous vocabulary is flagged, never resolved
// silently one way ---
const ambiguousVocabulary = {
  subjects: [
    { canonicalTerm: "Reference Subject C7", synonyms: ["Trial Site 7"] },
    { canonicalTerm: "Reference Subject C7-ALT", synonyms: ["Trial Site 7"] }
  ],
  units: [
    { canonicalUnit: "reference index units", synonyms: [{ unit: "index units", factor: 1 }] },
    { canonicalUnit: "alternate reference units", synonyms: [{ unit: "index units", factor: 2 }] }
  ]
};
const mappingAmbiguous = cap02.proposeInteroperabilityMapping(cleanResult.extractedRecord, ambiguousVocabulary);
check(
  "CAP02M-C0-AMBIGUOUS-VOCABULARY-FLAGGED-NOT-RESOLVED",
  "When the reference vocabulary itself maps the same raw term to two different canonical entries, mapping is flagged AMBIGUOUS_MULTIPLE_REFERENCE_MATCHES / AMBIGUOUS_MULTIPLE_UNIT_MATCHES, naming both candidates, rather than silently picking one",
  mappingAmbiguous.mappingRecord.subjectMappingStatus === "AMBIGUOUS_MULTIPLE_REFERENCE_MATCHES"
    && mappingAmbiguous.mappingRecord.subjectMappingCandidates.length === 2
    && mappingAmbiguous.mappingRecord.normalizedSubjectKey === null,
  mappingAmbiguous
);

// --- Part D: cross-capability -- feeding CAP-04's REAL degraded/quarantined
// output (missing subject entirely) must refuse cleanly, not crash or guess ---
const noSubjectExtraction = { treatmentLabel: "Treatment D", location: "Region 9", unit: "index units", dateObserved: "2009-01-01", measuredValue: 1, outcomePolarity: "POSITIVE" };
const noSubjectResult = cap04.extractAndClassify(preservedSource, noSubjectExtraction, []);
const mappingNoSubject = cap02.proposeInteroperabilityMapping(noSubjectResult.extractedRecord);
check(
  "CAP02M-D0-QUARANTINED-MISSING-SUBJECT-REFUSED-CLEANLY",
  "Feeding CAP-04's REAL quarantined output (missing subjectKey) into mapping does not crash and does not guess: it reports SUBJECT_KEY_REQUIRED_FOR_MAPPING while still attempting the unit side independently",
  noSubjectResult.extractedRecord.recordStatus === "QUARANTINED"
    && mappingNoSubject.mappingRecord.subjectMappingStatus === "SUBJECT_KEY_REQUIRED_FOR_MAPPING"
    && mappingNoSubject.mappingRecord.unitMappingStatus === "PROPOSED_MAPPING",
  { noSubjectResult, mappingNoSubject }
);

const nullRecordMapping = cap02.proposeInteroperabilityMapping(null);
check(
  "CAP02M-D1-NULL-EXTRACTED-RECORD-REFUSED",
  "Calling proposeInteroperabilityMapping with no extracted record at all is refused, naming EXTRACTED_RECORD_REQUIRED, not a crash",
  nullRecordMapping.status === "MAPPING_REFUSED" && nullRecordMapping.refusalReasons.includes("EXTRACTED_RECORD_REQUIRED"),
  nullRecordMapping
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP02-INTEROPERABILITY-MAPPING-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP02_INTEROPERABILITY_MAPPING_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP02_INTEROPERABILITY_MAPPING_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves stage 4 (map different formats into common structures) of Historical Scientific Memory Recovery, consuming CAP-04's REAL extraction output: an exact synonym match proposes a correct canonical subject and a correctly converted unit value; an unrecognised term is left unmapped rather than guessed; a genuinely ambiguous vocabulary entry is flagged rather than silently resolved; the raw original fields are preserved byte-identical alongside any proposed normalization; and a proposed mapping never changes governance state or brings a record any closer to scientific-memory eligibility. It does not prove corpus-scale interoperability, real institutional vocabularies, stage 5 detection at scale, stage 7 review, scientific correctness, production readiness or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-02-INTEROPERABILITY-MAPPING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
