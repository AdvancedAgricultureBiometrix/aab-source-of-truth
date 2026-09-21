"use strict";

/**
 * CAP-06 (Ingredient Intelligence) live-logic behavioural proof.
 *
 * CAP-06 evaluates a candidate material against evidence sufficiency and
 * corroboration criteria and produces BOTH a categorical status and a
 * continuous readinessScore in [0,1] -- the score exists specifically so
 * CAP-07 has something real to combine/rank, not just a label to branch on.
 * Every fixture perturbs one input value and asserts status and/or
 * readinessScore change in the predicted direction.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const SIM_ROOT = path.join(ROOT, "..");

function loadIntoSandbox(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: path.basename(file) });
  }
  return sandbox;
}

const sandbox = loadIntoSandbox([
  path.join(SIM_ROOT, "cap34-simulation.js"),
  path.join(ROOT, "cap06-ingredient-intelligence.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap06 = sandbox.window.AAB_CAP34_LIVE_CAP06_INGREDIENT_INTELLIGENCE;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

function candidateFrom(materialId, evidenceRecords) {
  return { materialId, materialName: materialId, evidenceRecords };
}

// --- Part 0: dispatcher wiring ---
const happyCandidate = candidateFrom("MAT-HAPPY", sim.scenarios.HAPPY_PATH.evidence);
const dispatched = sim.runLiveCapability("CAP-06", happyCandidate);
const direct = cap06.evaluateIngredient(happyCandidate);
check(
  "CAP06-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-06', ...) reaches the same evaluator as calling it directly",
  dispatched.status === direct.status && dispatched.readinessScore === direct.readinessScore,
  dispatched
);

// --- Part A: three canonical scenarios, evidence unmodified ---
const happyResult = cap06.evaluateIngredient(happyCandidate);
check(
  "CAP06-A1-HAPPY-PATH",
  "HAPPY_PATH evidence yields INGREDIENT_PROGRESSION_CANDIDATE with a full readinessScore",
  happyResult.status === "INGREDIENT_PROGRESSION_CANDIDATE" && happyResult.readinessScore === 1,
  happyResult
);

const contradictionCandidate = candidateFrom("MAT-CONTRA", sim.scenarios.CONTRADICTION.evidence);
const contradictionResult = cap06.evaluateIngredient(contradictionCandidate);
check(
  "CAP06-A2-CONTRADICTION",
  "CONTRADICTION evidence yields INGREDIENT_CONTRADICTION_REQUIRES_REVIEW with a reduced (not zero, not full) readinessScore",
  contradictionResult.status === "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW"
    && contradictionResult.readinessScore > 0 && contradictionResult.readinessScore < 1,
  contradictionResult
);

const missingCandidate = candidateFrom("MAT-MISSING", sim.scenarios.MISSING_EVIDENCE.evidence);
const missingResult = cap06.evaluateIngredient(missingCandidate);
check(
  "CAP06-A3-MISSING-EVIDENCE",
  "MISSING_EVIDENCE yields INGREDIENT_BLOCKED_EVIDENCE_REQUIRED with a zero readinessScore, not a confident partial score",
  missingResult.status === "INGREDIENT_BLOCKED_EVIDENCE_REQUIRED" && missingResult.readinessScore === 0,
  missingResult
);

// --- Part B: perturbation of a purpose-built baseline ---
const baseline = [
  { id: "P1", source: "Synthetic assay A", state: "ELIGIBLE", finding: "Consistent positive result in synthetic assay A." },
  { id: "P2", source: "Synthetic assay B", state: "ELIGIBLE", finding: "Independent synthetic assay B corroborates the same direction." }
];
const baselineCandidate = candidateFrom("MAT-BASE", baseline);
const baselineResult = cap06.evaluateIngredient(baselineCandidate);
check(
  "CAP06-B0-BASELINE",
  "2-record baseline (both supporting) yields INGREDIENT_PROGRESSION_CANDIDATE, readinessScore 1",
  baselineResult.status === "INGREDIENT_PROGRESSION_CANDIDATE" && baselineResult.readinessScore === 1,
  baselineResult
);

// Perturbation 1: remove one corroborating record. Score must drop, status
// must flip -- this is the score existing to actually move, not just the
// label.
const oneRecordCandidate = candidateFrom("MAT-ONE", baseline.slice(0, 1));
const oneRecordResult = cap06.evaluateIngredient(oneRecordCandidate);
check(
  "CAP06-B1-CORROBORATION-REMOVED",
  "Removing 1 of 2 corroborating records drops readinessScore to 0 and flips status to blocked",
  oneRecordResult.status === "INGREDIENT_BLOCKED_EVIDENCE_REQUIRED"
    && oneRecordResult.readinessScore === 0
    && oneRecordResult.readinessScore !== baselineResult.readinessScore,
  oneRecordResult
);

// Perturbation 2: add a third corroborating record beyond the requirement.
// Score is capped at 1, proving the cap is real (not an unbounded score
// that would misrepresent "more evidence than required" as literally
// infinite confidence).
const threeRecordCandidate = candidateFrom("MAT-THREE", baseline.concat([
  { id: "P3", source: "Synthetic assay C", state: "ELIGIBLE", finding: "A third independent synthetic assay also corroborates." }
]));
const threeRecordResult = cap06.evaluateIngredient(threeRecordCandidate);
check(
  "CAP06-B2-SCORE-CAPPED-AT-ONE",
  "A third corroborating record still yields readinessScore 1 (capped), not > 1",
  threeRecordResult.readinessScore === 1 && threeRecordResult.status === "INGREDIENT_PROGRESSION_CANDIDATE",
  threeRecordResult
);

// Perturbation 3: flip one record to conflicting, constant count.
// Status must flip to review and score must drop from 1 but stay > 0
// (partial credit, not a cliff to zero -- distinguishes "disputed" from
// "no evidence at all").
const conflictInjected = copy(baseline);
conflictInjected[1].finding = "No response observed, contradicting assay A.";
const conflictCandidate = candidateFrom("MAT-CONFLICT", conflictInjected);
const conflictResult = cap06.evaluateIngredient(conflictCandidate);
check(
  "CAP06-B3-CONFLICT-INJECTED-PARTIAL-SCORE",
  "Flipping one record to conflicting (count unchanged) flips status to review with a nonzero, sub-1 score, distinct from the zero-evidence case",
  conflictResult.status === "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW"
    && conflictResult.readinessScore > 0 && conflictResult.readinessScore < 1
    && conflictResult.readinessScore !== oneRecordResult.readinessScore
    && conflictResult.status !== baselineResult.status,
  conflictResult
);

// Perturbation 4 (reverse direction): resolve the CONTRADICTION scenario's
// conflict. Status and score must both recover.
const resolvedEvidence = copy(sim.scenarios.CONTRADICTION.evidence);
resolvedEvidence[1].finding = "Positive response under comparable condition B, consistent with condition A.";
resolvedEvidence[2].finding = "Synthetic method review confirms consistent methodology across both trials.";
const resolvedCandidate = candidateFrom("MAT-RESOLVED", resolvedEvidence);
const resolvedResult = cap06.evaluateIngredient(resolvedCandidate);
check(
  "CAP06-B4-RESOLVED-BIDIRECTIONAL",
  "Resolving the CONTRADICTION scenario's conflict flips status back to progression-candidate with readinessScore 1",
  resolvedResult.status === "INGREDIENT_PROGRESSION_CANDIDATE"
    && resolvedResult.readinessScore === 1
    && resolvedResult.status !== contradictionResult.status,
  resolvedResult
);

// Mechanism distinctness: CAP-06 has no subject-grouping concept at all --
// unlike CAP-05, which only flags a contradiction between two records that
// share a derived subject key, CAP-06 flat-tallies every eligible record
// supplied for the one candidate, regardless of subject wording. Two
// records that would derive to the SAME CAP-05-style subject, and two
// records that would derive to genuinely DIFFERENT ones, each pair carrying
// one supporting and one conflicting finding, must produce the IDENTICAL
// outcome -- proving subject identity/difference has no effect on CAP-06's
// result, because CAP-06 has no subject-comparison gate to be affected by
// it. A regression toward CAP-05-style subject-grouping in CAP-06 would
// make these two results diverge.
const sameSubjectWording = [
  { id: "M1", source: "Synthetic assay Alpha", state: "ELIGIBLE", finding: "Consistent positive result in synthetic assay Alpha." },
  { id: "M2", source: "Synthetic assay Alpha", state: "ELIGIBLE", finding: "No response observed, contradicting the first assay." }
];
const sameSubjectResult = cap06.evaluateIngredient(candidateFrom("MAT-SAME-SUBJECT-WORDING", sameSubjectWording));

const differentSubjectWording = [
  { id: "M3", source: "Synthetic assay Alpha", state: "ELIGIBLE", finding: "Consistent positive result in synthetic assay Alpha." },
  { id: "M4", source: "Synthetic trial Beta", state: "ELIGIBLE", finding: "No response observed, contradicting the first assay." }
];
const differentSubjectResult = cap06.evaluateIngredient(candidateFrom("MAT-DIFFERENT-SUBJECT-WORDING", differentSubjectWording));

check(
  "CAP06-B5-FLAT-TALLY-NOT-SUBJECT-GROUPED",
  "A same-subject-wording pair and a different-subject-wording pair, each with one supporting and one conflicting finding, produce the IDENTICAL contradiction status, conflictingCount and readinessScore -- proving CAP-06 flat-tallies all evidence about the candidate and has no CAP-05-style subject-comparison mechanism gating the result",
  sameSubjectResult.status === "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW"
    && differentSubjectResult.status === "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW"
    && sameSubjectResult.readinessScore === differentSubjectResult.readinessScore
    && sameSubjectResult.computedFacts.conflictingCount === 1
    && differentSubjectResult.computedFacts.conflictingCount === 1
    && sameSubjectResult.computedFacts.supportingCount === differentSubjectResult.computedFacts.supportingCount,
  { sameSubjectResult, differentSubjectResult }
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP06-INGREDIENT-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP06_INGREDIENT_INTELLIGENCE_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP06_INGREDIENT_INTELLIGENCE_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves that CAP-06's live-simulation evaluator computes a continuous readinessScore that genuinely tracks evidence sufficiency and corroboration in both directions, distinguishing zero-evidence, disputed and fully-corroborated states with different score values, not just different labels. It does not prove scientific correctness, production readiness, sovereignty or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-06-INGREDIENT-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
