"use strict";

/**
 * CAP-09 (Governed Scientific Learning) live-logic behavioural proof.
 *
 * This is the direct enforcement of "AAB does not learn merely because
 * something happened." The evaluator must be CAPABLE OF REFUSING to
 * promote a candidate finding to approved learning under defined
 * conditions -- a single unreplicated trial, or contradicting evidence --
 * and must name exactly which condition(s) triggered the refusal, not
 * return one flat "no" for every reason. It must also promote correctly
 * once the missing condition is genuinely satisfied: a system that can
 * only ever move toward "refused" as evidence accumulates isn't
 * evaluating evidence, it's just accumulating caution.
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
  path.join(ROOT, "cap09-governed-learning.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap09 = sandbox.window.AAB_CAP34_LIVE_CAP09_GOVERNED_LEARNING;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

function candidateLearningFrom(findingId, trials) {
  return { findingId, claim: findingId, trials };
}

// --- Part 0: dispatcher wiring ---
const dispatched = sim.runLiveCapability("CAP-09", candidateLearningFrom("F-HAPPY", sim.scenarios.HAPPY_PATH.evidence));
const direct = cap09.evaluatePromotion(candidateLearningFrom("F-HAPPY", sim.scenarios.HAPPY_PATH.evidence));
check(
  "CAP09-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-09', ...) reaches the same evaluator as calling it directly",
  dispatched.outcome === direct.outcome && JSON.stringify(dispatched.refusalReasons) === JSON.stringify(direct.refusalReasons),
  dispatched
);

// --- Part A: the three canonical scenarios, unmodified ---
const happyResult = cap09.evaluatePromotion(candidateLearningFrom("F-HAPPY", sim.scenarios.HAPPY_PATH.evidence));
check(
  "CAP09-A1-HAPPY-PATH-PROMOTES",
  "3 independent consistent trials (>= replication requirement, no contradiction) promotes to approved learning with zero refusal reasons",
  happyResult.outcome === "PROMOTED_TO_APPROVED_LEARNING" && happyResult.refusalReasons.length === 0,
  happyResult
);

const contradictionResult = cap09.evaluatePromotion(candidateLearningFrom("F-CONTRA", sim.scenarios.CONTRADICTION.evidence));
check(
  "CAP09-A2-CONTRADICTION-REFUSES-NAMED",
  "CONTRADICTION scenario refuses promotion and names CONTRADICTING_EVIDENCE_PRESENT explicitly among its reasons",
  contradictionResult.outcome === "PROMOTION_REFUSED" && contradictionResult.refusalReasons.includes("CONTRADICTING_EVIDENCE_PRESENT"),
  contradictionResult
);

const missingResult = cap09.evaluatePromotion(candidateLearningFrom("F-MISSING", sim.scenarios.MISSING_EVIDENCE.evidence));
check(
  "CAP09-A3-MISSING-EVIDENCE-REFUSES-NAMED",
  "MISSING_EVIDENCE scenario (1 trial only) refuses and names REPLICATION_REQUIRED explicitly",
  missingResult.outcome === "PROMOTION_REFUSED" && missingResult.refusalReasons.includes("REPLICATION_REQUIRED"),
  missingResult
);

// --- Part B: the exact case named in the spec -- a single unreplicated
// trial -- must refuse on its own, distinctly named, then promote once
// genuinely replicated. ---
const singleTrial = [
  { id: "T1", source: "Synthetic trial 1", state: "ELIGIBLE", finding: "Positive result in a single synthetic trial." }
];
const singleTrialResult = cap09.evaluatePromotion(candidateLearningFrom("F-SINGLE", singleTrial));
check(
  "CAP09-B0-SINGLE-UNREPLICATED-TRIAL-REFUSED",
  "A single unreplicated trial, with no contradiction at all, is STILL refused, naming REPLICATION_REQUIRED and nothing else",
  singleTrialResult.outcome === "PROMOTION_REFUSED"
    && singleTrialResult.refusalReasons.length === 1
    && singleTrialResult.refusalReasons[0] === "REPLICATION_REQUIRED",
  singleTrialResult
);

const replicatedTrial = singleTrial.concat([
  { id: "T2", source: "Synthetic trial 2", state: "ELIGIBLE", finding: "Independent synthetic replication confirms the same positive result." }
]);
const replicatedResult = cap09.evaluatePromotion(candidateLearningFrom("F-REPLICATED", replicatedTrial));
check(
  "CAP09-B1-REPLICATION-SATISFIED-PROMOTES",
  "Adding one genuinely independent replicating trial (2 total, no conflict) flips the SAME finding from refused to promoted",
  replicatedResult.outcome === "PROMOTED_TO_APPROVED_LEARNING"
    && replicatedResult.refusalReasons.length === 0
    && replicatedResult.outcome !== singleTrialResult.outcome,
  replicatedResult
);

// --- Part C: replication ALONE is not sufficient -- a contradicting third
// trial must refuse even though the replication requirement is already
// met. This is the "does not learn merely because something happened"
// case in its sharpest form: 2 successful trials do not override a 3rd
// that disagrees. ---
const contradictedAfterReplication = replicatedTrial.concat([
  { id: "T3", source: "Synthetic trial 3", state: "ELIGIBLE", finding: "No response observed in a third synthetic trial, contradicting trials 1 and 2." }
]);
const contradictedAfterReplicationResult = cap09.evaluatePromotion(candidateLearningFrom("F-CONTRADICTED-REPLICATED", contradictedAfterReplication));
check(
  "CAP09-C0-CONTRADICTION-OVERRIDES-SATISFIED-REPLICATION",
  "Even with the replication requirement already met (2 supporting trials), a contradicting 3rd trial refuses promotion, naming CONTRADICTING_EVIDENCE_PRESENT specifically -- not REPLICATION_REQUIRED, since replication is genuinely satisfied",
  contradictedAfterReplicationResult.outcome === "PROMOTION_REFUSED"
    && contradictedAfterReplicationResult.refusalReasons.includes("CONTRADICTING_EVIDENCE_PRESENT")
    && !contradictedAfterReplicationResult.refusalReasons.includes("REPLICATION_REQUIRED")
    && contradictedAfterReplicationResult.outcome !== replicatedResult.outcome,
  contradictedAfterReplicationResult
);

// --- Part D: reverse direction -- resolving the contradiction in the
// canonical CONTRADICTION scenario must recover promotion, proving
// sensitivity runs both ways here too. ---
const resolvedContradiction = copy(sim.scenarios.CONTRADICTION.evidence);
resolvedContradiction[1].finding = "Positive response under comparable condition B, consistent with condition A.";
resolvedContradiction[2].finding = "Synthetic method review confirms consistent methodology across both trials.";
const resolvedResult = cap09.evaluatePromotion(candidateLearningFrom("F-RESOLVED", resolvedContradiction));
check(
  "CAP09-D1-RESOLVED-CONTRADICTION-PROMOTES",
  "Resolving the CONTRADICTION scenario's disagreement recovers PROMOTED_TO_APPROVED_LEARNING with zero refusal reasons",
  resolvedResult.outcome === "PROMOTED_TO_APPROVED_LEARNING"
    && resolvedResult.refusalReasons.length === 0
    && resolvedResult.outcome !== contradictionResult.outcome,
  resolvedResult
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP09-GOVERNED-LEARNING-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP09_GOVERNED_LEARNING_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP09_GOVERNED_LEARNING_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves that CAP-09 can and does explicitly refuse to promote a candidate finding to approved learning under named conditions (unreplicated single trial; contradicting evidence, including when replication alone is already satisfied), correctly names which condition(s) triggered the refusal, and correctly promotes once the missing condition is genuinely satisfied. It does not prove scientific correctness, production readiness, sovereignty or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-09-GOVERNED-LEARNING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
