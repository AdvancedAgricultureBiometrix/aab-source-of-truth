"use strict";

/**
 * CAP-07 (Formulation Intelligence) live-logic behavioural proof.
 *
 * CAP-07 must genuinely combine/score candidate ingredients against a
 * stated objective's constraints: changing the objective OR the available
 * ingredients must change the output. Part C of this file goes further
 * and is the more important half: it does not construct CAP-07 fixtures
 * from hand-written ingredient data. It runs CAP-06's REAL evaluator on a
 * candidate material, feeds that REAL output into CAP-07, then perturbs
 * the upstream evidence, re-runs CAP-06, and feeds the new real output
 * back into CAP-07 with the SAME objective -- proving the two capabilities
 * are actually connected, not just independently passing their own
 * isolated tests.
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
  path.join(ROOT, "cap06-ingredient-intelligence.js"),
  path.join(ROOT, "cap07-formulation-intelligence.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap06 = sandbox.window.AAB_CAP34_LIVE_CAP06_INGREDIENT_INTELLIGENCE;
const cap07 = sandbox.window.AAB_CAP34_LIVE_CAP07_FORMULATION_INTELLIGENCE;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

function ingredientResult(materialId, status, readinessScore) {
  return { materialId, status, readinessScore };
}

const standardObjective = { name: "Standard synthetic objective", minReadinessScore: 0.6, minQualifyingCandidates: 2, maxCandidates: 3 };

// --- Part 0: dispatcher wiring ---
const twoGoodCandidates = [
  ingredientResult("MAT-1", "INGREDIENT_PROGRESSION_CANDIDATE", 1),
  ingredientResult("MAT-2", "INGREDIENT_PROGRESSION_CANDIDATE", 0.8)
];
const dispatched = sim.runLiveCapability("CAP-07", { objective: standardObjective, candidates: twoGoodCandidates });
const direct = cap07.evaluateFormulation(standardObjective, twoGoodCandidates);
check(
  "CAP07-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-07', ...) reaches the same evaluator as calling it directly",
  dispatched.outcome === direct.outcome && dispatched.formulationScore === direct.formulationScore,
  dispatched
);

// --- Part A: baseline combine/score behaviour ---
const baselineResult = cap07.evaluateFormulation(standardObjective, twoGoodCandidates);
check(
  "CAP07-A0-BASELINE-READY",
  "2 qualifying candidates at or above threshold, meeting minQualifyingCandidates, yields FORMULATION_CANDIDATE_READY with a genuinely averaged score",
  baselineResult.outcome === "FORMULATION_CANDIDATE_READY"
    && Math.abs(baselineResult.formulationScore - 0.9) < 1e-9,
  baselineResult
);

// --- Part B: changing the OBJECTIVE changes the output, same ingredients ---
const stricterObjective = Object.assign({}, standardObjective, { minReadinessScore: 0.85 });
const stricterResult = cap07.evaluateFormulation(stricterObjective, twoGoodCandidates);
check(
  "CAP07-B0-STRICTER-OBJECTIVE-EXCLUDES-CANDIDATE",
  "Raising minReadinessScore above MAT-2's score (0.8) drops qualifying count below minQualifyingCandidates, blocking the formulation with the SAME ingredient list",
  stricterResult.outcome === "FORMULATION_BLOCKED_INSUFFICIENT_CANDIDATES"
    && stricterResult.qualifyingCount === 1
    && stricterResult.outcome !== baselineResult.outcome,
  stricterResult
);

const laxerObjective = Object.assign({}, standardObjective, { minQualifyingCandidates: 1 });
const laxerResult = cap07.evaluateFormulation(laxerObjective, [ingredientResult("MAT-1", "INGREDIENT_PROGRESSION_CANDIDATE", 1)]);
check(
  "CAP07-B1-RELAXED-OBJECTIVE-ACCEPTS-SINGLE-CANDIDATE",
  "Lowering minQualifyingCandidates to 1 accepts a single strong candidate that the standard objective alone would still require 2 for",
  laxerResult.outcome === "FORMULATION_CANDIDATE_READY" && laxerResult.qualifyingCount === 1,
  laxerResult
);

// --- Part C: changing the INGREDIENTS changes the output, same objective,
// via CAP-06's REAL evaluator, not hand-written CAP-07 fixtures ---

const wellCorroborated = [
  { id: "E1", source: "Synthetic assay A", state: "ELIGIBLE", finding: "Consistent positive result in synthetic assay A." },
  { id: "E2", source: "Synthetic assay B", state: "ELIGIBLE", finding: "Independent synthetic assay B corroborates the same direction." }
];
const materialA = { materialId: "MAT-A", materialName: "MAT-A", evidenceRecords: wellCorroborated };
const materialB = { materialId: "MAT-B", materialName: "MAT-B", evidenceRecords: copy(wellCorroborated).map((e) => Object.assign({}, e, { id: e.id + "-B" })) };

const cap06ResultA = cap06.evaluateIngredient(materialA);
const cap06ResultB = cap06.evaluateIngredient(materialB);
const formulationBaseline = cap07.evaluateFormulation(standardObjective, [cap06ResultA, cap06ResultB]);
check(
  "CAP07-C0-CROSS-CAPABILITY-BASELINE",
  "CAP-07 fed CAP-06's REAL output for 2 well-corroborated materials reaches FORMULATION_CANDIDATE_READY",
  formulationBaseline.outcome === "FORMULATION_CANDIDATE_READY" && formulationBaseline.qualifyingCount === 2,
  { cap06ResultA, cap06ResultB, formulationBaseline }
);

// Perturb UPSTREAM: remove material A's corroborating evidence record. This
// changes nothing in CAP-07 or in the objective -- only CAP-06's input.
const materialAWeakened = { materialId: "MAT-A", materialName: "MAT-A", evidenceRecords: wellCorroborated.slice(0, 1) };
const cap06ResultAWeakened = cap06.evaluateIngredient(materialAWeakened);
check(
  "CAP07-C1-UPSTREAM-CAP06-CHANGED",
  "Removing MAT-A's corroborating record changes CAP-06's real output for it (sanity check before checking CAP-07 downstream)",
  cap06ResultAWeakened.readinessScore < cap06ResultA.readinessScore
    && cap06ResultAWeakened.status === "INGREDIENT_BLOCKED_EVIDENCE_REQUIRED",
  cap06ResultAWeakened
);

const formulationAfterUpstreamChange = cap07.evaluateFormulation(standardObjective, [cap06ResultAWeakened, cap06ResultB]);
check(
  "CAP07-C2-DOWNSTREAM-FORMULATION-RESPONDS-TO-UPSTREAM-CHANGE",
  "Feeding CAP-06's re-evaluated (weakened) real output into CAP-07, with the SAME objective, changes CAP-07's outcome: only 1 candidate still qualifies, blocking the formulation",
  formulationAfterUpstreamChange.outcome === "FORMULATION_BLOCKED_INSUFFICIENT_CANDIDATES"
    && formulationAfterUpstreamChange.qualifyingCount === 1
    && formulationAfterUpstreamChange.outcome !== formulationBaseline.outcome,
  formulationAfterUpstreamChange
);

// Reverse direction across the boundary: restore the removed evidence and
// confirm the formulation recovers too, driven entirely by CAP-06's output
// changing back.
const cap06ResultARestored = cap06.evaluateIngredient(materialA);
const formulationRestored = cap07.evaluateFormulation(standardObjective, [cap06ResultARestored, cap06ResultB]);
check(
  "CAP07-C3-CROSS-CAPABILITY-BIDIRECTIONAL",
  "Restoring MAT-A's evidence and re-running both CAP-06 then CAP-07 recovers FORMULATION_CANDIDATE_READY",
  formulationRestored.outcome === "FORMULATION_CANDIDATE_READY"
    && formulationRestored.outcome !== formulationAfterUpstreamChange.outcome,
  formulationRestored
);

// A contradiction upstream in CAP-06 must propagate to a review flag in
// CAP-07, not be silently averaged away.
const contradictedMaterial = { materialId: "MAT-C", materialName: "MAT-C", evidenceRecords: copy(sim.scenarios.CONTRADICTION.evidence) };
const cap06ResultContradicted = cap06.evaluateIngredient(contradictedMaterial);
const formulationWithContradiction = cap07.evaluateFormulation(
  Object.assign({}, standardObjective, { minReadinessScore: 0.2 }),
  [cap06ResultContradicted, cap06ResultB]
);
check(
  "CAP07-C4-UPSTREAM-CONTRADICTION-PROPAGATES-TO-REVIEW",
  "A contradicted CAP-06 result, even if numerically above threshold, forces CAP-07 into FORMULATION_REQUIRES_REVIEW rather than a clean READY",
  cap06ResultContradicted.status === "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW"
    && formulationWithContradiction.outcome === "FORMULATION_REQUIRES_REVIEW",
  { cap06ResultContradicted, formulationWithContradiction }
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP07-FORMULATION-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP07_FORMULATION_INTELLIGENCE_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP07_FORMULATION_INTELLIGENCE_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves that CAP-07 genuinely combines/scores candidates against an objective's constraints (changing either changes the output), and -- specifically -- that CAP-07's output responds to CAP-06's REAL, independently re-evaluated output across the capability boundary, in both directions, including upstream contradiction propagating to a review flag rather than being averaged away. It does not prove scientific correctness, production readiness, sovereignty or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-07-FORMULATION-INTELLIGENCE-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
