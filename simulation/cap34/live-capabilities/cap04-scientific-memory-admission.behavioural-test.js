"use strict";

/**
 * CAP-04 (Governed Scientific Memory) live-logic behavioural proof --
 * stage 7 of Historical Scientific Memory Recovery (human review and
 * governed admission).
 *
 * The permanent rule from the design document, enforced structurally, not
 * just documented: "Uploading information does not make it approved
 * scientific knowledge." A reviewer's decision is NECESSARY but never
 * SUFFICIENT on its own -- this is the stage-7 equivalent of CAP-09's
 * "replication alone does not override contradiction": a fully authorised,
 * well-formed ADMIT decision is still refused for a quarantined record or
 * an unresolved conflict.
 *
 * This file also closes the loop opened in
 * cap04-scientific-memory.behavioural-test.js's Part G: that file proved
 * the eligibility boundary using a HAND-AUTHORED admission shape (a
 * necessary positive control, since stage 7 did not exist yet). This file
 * re-proves the same boundary using a GENUINE admitToScientificMemory()
 * decision -- a strictly stronger claim -- without touching or
 * invalidating that earlier, still-valid proof.
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

// --- Real upstream fixtures via CAP-02, then CAP-04's real extraction ---
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

const cleanExtraction = { subjectKey: "Trial Site 40", treatmentLabel: "Treatment E", location: "Region 11", unit: "index units", dateObserved: "2012-04-01", measuredValue: 2.5, outcomePolarity: "POSITIVE" };
const cleanResult = extractionOf(cleanExtraction);

const conflictFirst = extractionOf({ subjectKey: "Trial Site 41", treatmentLabel: "Treatment F", location: "Region 12", unit: "index units", dateObserved: "2013-01-01", measuredValue: 5, outcomePolarity: "POSITIVE" });
const conflictSecond = extractionOf({ subjectKey: "Trial Site 41", treatmentLabel: "Treatment F", location: "Region 12", unit: "index units", dateObserved: "2013-06-01", measuredValue: 0, outcomePolarity: "NEGATIVE" }, [conflictFirst.extractedRecord]);

const degradedResult = extractionOf({ subjectKey: "Trial Site 42", treatmentLabel: "Treatment G", location: "Region 13", outcomePolarity: "POSITIVE", measuredValue: 1 }); // missing dateObserved + unit -> QUARANTINED

const validDecisionBase = { reviewerId: "Synthetic Reviewer 1", reviewerRole: "SCIENTIST", decision: "ADMIT", reviewedAt: "2026-09-20T00:00:00Z" };

// --- Part A: the baseline positive path -- a clean PENDING_REVIEW record,
// a fully authorised ADMIT decision, genuinely admitted ---
const cleanAdmission = cap04.admitToScientificMemory(cleanResult.extractedRecord, validDecisionBase);
check(
  "CAP04ADM-A0-CLEAN-RECORD-AUTHORISED-ADMIT-SUCCEEDS",
  "A PENDING_REVIEW record reviewed by an authorised SCIENTIST with a well-formed ADMIT decision is genuinely admitted to scientific memory",
  cleanAdmission.status === "RECORD_ADMITTED"
    && cleanAdmission.memoryRecord.governanceState === "ADMITTED_SCIENTIFIC_MEMORY"
    && cleanAdmission.memoryRecord.reviewGate.decision === "ADMIT"
    && cleanAdmission.memoryRecord.reviewGate.reviewerId === "Synthetic Reviewer 1",
  cleanAdmission
);

// --- THE load-bearing property: closes the loop with the structural
// eligibility boundary using a GENUINE admission, not a hand-authored
// stand-in. ---
check(
  "CAP04ADM-B0-GENUINE-ADMISSION-IS-ELIGIBLE-STRONGER-THAN-HAND-AUTHORED-CONTROL",
  "The record produced by a REAL admitToScientificMemory() call -- not a hand-authored fixture -- genuinely satisfies isEligibleForScientificMemory",
  cap04.isEligibleForScientificMemory(cleanAdmission.memoryRecord) === true,
  cleanAdmission.memoryRecord
);

const mixedBatchWithGenuineAdmission = [cleanResult.extractedRecord, conflictSecond.extractedRecord, degradedResult.extractedRecord, cleanAdmission.memoryRecord];
const assembledWithGenuine = cap04.assembleEligibleEvidenceForReasoning(mixedBatchWithGenuineAdmission);
check(
  "CAP04ADM-B1-DOWNSTREAM-ASSEMBLY-INCLUDES-ONLY-THE-GENUINELY-ADMITTED-RECORD",
  "Feeding a batch of unreviewed extraction outcomes plus the ONE genuinely admitted record into the downstream assembler includes only that real admission: eligibleCount 1, excludedCount 3",
  assembledWithGenuine.eligibleCount === 1
    && assembledWithGenuine.excludedCount === 3
    && assembledWithGenuine.eligibleRecords[0].recordId === cleanResult.extractedRecord.recordId,
  assembledWithGenuine
);

// --- Part C: reviewer decision alone is NOT sufficient -- refused for a
// quarantined record even with a fully authorised, well-formed ADMIT ---
const quarantinedAdmissionAttempt = cap04.admitToScientificMemory(degradedResult.extractedRecord, validDecisionBase);
check(
  "CAP04ADM-C0-AUTHORISED-ADMIT-STILL-REFUSED-FOR-QUARANTINED-RECORD",
  "An authorised reviewer's well-formed ADMIT decision is STILL refused, naming QUARANTINED_RECORD_CANNOT_BE_ADMITTED, when the underlying extraction was quarantined -- reviewer authority does not override missing/malformed data",
  quarantinedAdmissionAttempt.status === "ADMISSION_REFUSED"
    && quarantinedAdmissionAttempt.refusalReasons.includes("QUARANTINED_RECORD_CANNOT_BE_ADMITTED")
    && quarantinedAdmissionAttempt.memoryRecord === null,
  quarantinedAdmissionAttempt
);

// --- Part D: an unresolved conflict blocks admission independently, but
// admits once genuinely resolved and documented -- proving the requirement
// is real, not vacuously always-refusing ---
const unresolvedConflictAttempt = cap04.admitToScientificMemory(conflictSecond.extractedRecord, validDecisionBase);
check(
  "CAP04ADM-D0-UNRESOLVED-CONFLICT-BLOCKS-ADMISSION",
  "An authorised ADMIT decision on a FLAGGED_CONFLICT record without documented conflict resolution is refused, naming UNRESOLVED_CONFLICT_REQUIRES_DOCUMENTED_RESOLUTION",
  unresolvedConflictAttempt.status === "ADMISSION_REFUSED"
    && unresolvedConflictAttempt.refusalReasons.includes("UNRESOLVED_CONFLICT_REQUIRES_DOCUMENTED_RESOLUTION"),
  unresolvedConflictAttempt
);

const resolvedConflictAttempt = cap04.admitToScientificMemory(conflictSecond.extractedRecord, Object.assign({}, validDecisionBase, { conflictResolutionNotes: "Synthetic methodological review reconciled the disagreement between trials." }));
check(
  "CAP04ADM-D1-DOCUMENTED-RESOLUTION-ALLOWS-ADMISSION",
  "The SAME conflicted record, with a documented conflict resolution added to the decision, is genuinely admitted -- proving the requirement is real and satisfiable, not a permanent block",
  resolvedConflictAttempt.status === "RECORD_ADMITTED"
    && resolvedConflictAttempt.memoryRecord.governanceState === "ADMITTED_SCIENTIFIC_MEMORY"
    && resolvedConflictAttempt.memoryRecord.reviewGate.conflictResolutionNotes
    && cap04.isEligibleForScientificMemory(resolvedConflictAttempt.memoryRecord) === true,
  resolvedConflictAttempt
);

// --- Part E: authority is checked, not assumed ---
const unauthorisedRoleAttempt = cap04.admitToScientificMemory(cleanResult.extractedRecord, Object.assign({}, validDecisionBase, { reviewerRole: "RESTRICTED_USER" }));
check(
  "CAP04ADM-E0-UNAUTHORISED-ROLE-CANNOT-ADMIT-EVEN-CLEAN-RECORD",
  "A RESTRICTED_USER role cannot admit even the cleanest possible record, naming AUTHORISED_REVIEWER_ROLE_REQUIRED",
  unauthorisedRoleAttempt.status === "ADMISSION_REFUSED" && unauthorisedRoleAttempt.refusalReasons.includes("AUTHORISED_REVIEWER_ROLE_REQUIRED"),
  unauthorisedRoleAttempt
);

const missingReviewerIdAttempt = cap04.admitToScientificMemory(cleanResult.extractedRecord, Object.assign({}, validDecisionBase, { reviewerId: "" }));
check(
  "CAP04ADM-E1-MISSING-REVIEWER-ID-REFUSED",
  "An empty reviewerId is refused, naming REVIEWER_ID_REQUIRED, even with an otherwise authorised role and valid decision",
  missingReviewerIdAttempt.status === "ADMISSION_REFUSED" && missingReviewerIdAttempt.refusalReasons.includes("REVIEWER_ID_REQUIRED"),
  missingReviewerIdAttempt
);

// --- Part F: rejection is a first-class, documented outcome -- never a
// bare "no" -- and is structurally distinct from "nobody has looked yet" ---
const rejectionWithoutReason = cap04.admitToScientificMemory(cleanResult.extractedRecord, Object.assign({}, validDecisionBase, { decision: "REJECT" }));
check(
  "CAP04ADM-F0-REJECTION-WITHOUT-REASON-REFUSED",
  "A REJECT decision with no rejectionReason is itself refused, naming REJECTION_REASON_REQUIRED -- even a human reviewer's rejection must be documented, not a bare no",
  rejectionWithoutReason.status === "ADMISSION_REFUSED" && rejectionWithoutReason.refusalReasons.includes("REJECTION_REASON_REQUIRED"),
  rejectionWithoutReason
);

const documentedRejection = cap04.admitToScientificMemory(cleanResult.extractedRecord, Object.assign({}, validDecisionBase, { decision: "REJECT", rejectionReason: "Synthetic duplicate of a previously admitted record." }));
check(
  "CAP04ADM-F1-DOCUMENTED-REJECTION-IS-STRUCTURALLY-DISTINCT-FROM-UNREVIEWED",
  "A documented REJECT decision succeeds, produces governanceState REJECTED_NOT_ADMITTED (distinct from EXTRACTED_UNREVIEWED -- 'reviewed and refused' is not the same fact as 'nobody has looked yet'), and remains permanently ineligible for scientific memory",
  documentedRejection.status === "RECORD_REJECTED"
    && documentedRejection.memoryRecord.governanceState === "REJECTED_NOT_ADMITTED"
    && documentedRejection.memoryRecord.governanceState !== "EXTRACTED_UNREVIEWED"
    && cap04.isEligibleForScientificMemory(documentedRejection.memoryRecord) === false,
  documentedRejection
);

// --- Part G: a record cannot be reviewed twice, preventing a decision
// from being silently overridden by a later, different one ---
const secondReviewAttempt = cap04.admitToScientificMemory(cleanAdmission.memoryRecord, validDecisionBase);
check(
  "CAP04ADM-G0-ALREADY-REVIEWED-RECORD-CANNOT-BE-RE-REVIEWED",
  "Attempting to admit a record that has already been admitted is refused, naming RECORD_ALREADY_REVIEWED -- a decision cannot be silently overridden by a second one",
  secondReviewAttempt.status === "ADMISSION_REFUSED" && secondReviewAttempt.refusalReasons.includes("RECORD_ALREADY_REVIEWED"),
  secondReviewAttempt
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP04-SCIENTIFIC-MEMORY-ADMISSION-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP04_SCIENTIFIC_MEMORY_ADMISSION_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP04_SCIENTIFIC_MEMORY_ADMISSION_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves stage 7 (human review and governed admission) of Historical Scientific Memory Recovery: a reviewer's decision is necessary but never sufficient on its own -- an authorised, well-formed ADMIT is still refused for a quarantined record or an unresolved conflict, admits once a conflict is genuinely documented as resolved, requires real reviewer authority and identity, requires a documented reason even for rejection, distinguishes REJECTED_NOT_ADMITTED from EXTRACTED_UNREVIEWED, and forbids re-reviewing an already-reviewed record. It also re-proves CAP-04's structural eligibility boundary using a GENUINE admission decision, not the hand-authored positive control used before stage 7 existed. It does not prove stage 5 detection at scale, real institutional review workflows, scientific correctness, production readiness or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-04-SCIENTIFIC-MEMORY-ADMISSION-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
