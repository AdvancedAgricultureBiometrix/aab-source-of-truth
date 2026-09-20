"use strict";

/**
 * CAP-01 (Country Intelligence & Discovery) live-logic behavioural proof.
 *
 * This file defines what "the perturbation test passes" means for CAP-01
 * BEFORE cap01-discovery.js is treated as REAL_LOGIC: the evaluator must
 * respond to the actual content of the evidence it is given, not to which
 * scenario name was selected. Every fixture below either (a) runs the
 * evaluator against the three canonical scenario evidence sets unmodified,
 * or (b) perturbs one input value and asserts the output changes in the
 * specific, predicted direction. A fixture that only checks "some output
 * came back" does not belong in this file.
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
  path.join(ROOT, "cap01-discovery.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap01 = sandbox.window.AAB_CAP34_LIVE_CAP01_DISCOVERY;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

// --- Part 0: the dispatcher wiring itself, not just the standalone module ---
const dispatched = sim.runLiveCapability("CAP-01", sim.scenarios.HAPPY_PATH.evidence);
const direct = cap01.evaluateDiscovery(sim.scenarios.HAPPY_PATH.evidence);
check(
  "CAP01-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-01', ...) reaches the same evaluator as calling it directly, proving registration actually happened",
  dispatched.outcome === direct.outcome && JSON.stringify(dispatched.computedFacts) === JSON.stringify(direct.computedFacts),
  dispatched
);
const unknownDispatch = sim.runLiveCapability("CAP-99-NOT-REGISTERED", []);
check(
  "CAP01-D1-DISPATCHER-FAIL-CLOSED",
  "Dispatching an unregistered capability id fails closed instead of silently returning something",
  unknownDispatch.status === "FAIL_CLOSED_UNKNOWN_LIVE_CAPABILITY",
  unknownDispatch
);

// --- Part A: the three canonical scenarios, evidence unmodified ---
// Each must produce its own distinct, genuinely-derived outcome. If any two
// of these three converge on the same outcome for the same reason as any
// other, or if MISSING_EVIDENCE/CONTRADICTION come back reading like a
// confident answer, the evaluator is narrating, not evaluating.

const happyResult = cap01.evaluateDiscovery(sim.scenarios.HAPPY_PATH.evidence);
check(
  "CAP01-A1-HAPPY-PATH",
  "Unmodified HAPPY_PATH evidence (3 eligible, no conflict, no insufficiency) yields INVESTIGATION_CANDIDATE",
  happyResult.outcome === "INVESTIGATION_CANDIDATE" && happyResult.computedFacts.eligibleCount === 3 && happyResult.computedFacts.conflictingCount === 0 && happyResult.computedFacts.insufficientCount === 0,
  happyResult
);

const contradictionResult = cap01.evaluateDiscovery(sim.scenarios.CONTRADICTION.evidence);
check(
  "CAP01-A2-CONTRADICTION",
  "Unmodified CONTRADICTION evidence (conflicting findings present) yields CONTRADICTION_REQUIRES_REVIEW, not a smoothed-over answer",
  contradictionResult.outcome === "CONTRADICTION_REQUIRES_REVIEW" && contradictionResult.computedFacts.conflictingCount > 0,
  contradictionResult
);

const missingResult = cap01.evaluateDiscovery(sim.scenarios.MISSING_EVIDENCE.evidence);
check(
  "CAP01-A3-MISSING-EVIDENCE",
  "Unmodified MISSING_EVIDENCE evidence (1 record, explicitly insufficient) yields PROGRESSION_BLOCKED_EVIDENCE_REQUIRED, not a confident answer",
  missingResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED" && missingResult.computedFacts.eligibleCount === 1,
  missingResult
);

// --- Part B: perturbation of a purpose-built baseline ---
// A clean 3-record baseline, independent of the narrative scenarios, so
// each perturbation isolates exactly one changed variable.

const baseline = [
  { id: "P1", source: "Synthetic baseline record A", state: "ELIGIBLE", finding: "Consistent positive signal observed in representative synthetic conditions." },
  { id: "P2", source: "Synthetic baseline record B", state: "ELIGIBLE", finding: "Independent synthetic measurement corroborates the same direction of effect." },
  { id: "P3", source: "Synthetic baseline record C", state: "ELIGIBLE", finding: "Synthetic reference check supports continued investigation." }
];

const baselineResult = cap01.evaluateDiscovery(baseline);
check(
  "CAP01-B0-BASELINE",
  "Purpose-built 3-record baseline yields INVESTIGATION_CANDIDATE",
  baselineResult.outcome === "INVESTIGATION_CANDIDATE" && baselineResult.computedFacts.eligibleCount === 3,
  baselineResult
);

// Perturbation 1: remove evidence down to below the minimum threshold.
// Assertion: eligibleCount drops, and outcome flips to
// PROGRESSION_BLOCKED_EVIDENCE_REQUIRED. If it doesn't flip, the evaluator
// isn't actually counting.
const removedEvidence = baseline.slice(0, 1);
const removedResult = cap01.evaluateDiscovery(removedEvidence);
check(
  "CAP01-B1-EVIDENCE-REMOVED",
  "Removing 2 of 3 baseline records (down to 1, below the minimum) flips outcome to PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",
  removedResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED"
    && removedResult.computedFacts.eligibleCount === 1
    && removedResult.computedFacts.eligibleCount !== baselineResult.computedFacts.eligibleCount
    && removedResult.outcome !== baselineResult.outcome,
  removedResult
);

// Perturbation 2: contradict something that was previously consistent by
// flipping one record's finding text to a conflicting value, nothing else
// changed. Assertion: conflictingCount goes from 0 to >0 and outcome flips
// to CONTRADICTION_REQUIRES_REVIEW.
const contradicted = copy(baseline);
contradicted[1].finding = "No response observed under comparable synthetic conditions, contradicting record A.";
const contradictedResult = cap01.evaluateDiscovery(contradicted);
check(
  "CAP01-B2-VALUE-FLIPPED-TO-CONFLICT",
  "Flipping one baseline record's finding to a conflicting value flips outcome to CONTRADICTION_REQUIRES_REVIEW",
  contradictedResult.outcome === "CONTRADICTION_REQUIRES_REVIEW"
    && contradictedResult.computedFacts.conflictingCount > baselineResult.computedFacts.conflictingCount
    && contradictedResult.outcome !== baselineResult.outcome,
  contradictedResult
);

// Perturbation 3 (reverse direction): take the canonical CONTRADICTION
// scenario and resolve its conflicting record to a supporting value.
// Assertion: outcome flips from CONTRADICTION_REQUIRES_REVIEW back to
// INVESTIGATION_CANDIDATE. Proves sensitivity runs both directions, not
// just towards failure.
const resolvedContradiction = copy(sim.scenarios.CONTRADICTION.evidence);
resolvedContradiction[1].finding = "Positive response under comparable condition B, consistent with condition A.";
resolvedContradiction[2].finding = "Synthetic method review confirms consistent methodology across both trials.";
const resolvedResult = cap01.evaluateDiscovery(resolvedContradiction);
check(
  "CAP01-B3-VALUE-FLIPPED-TO-RESOLVED",
  "Resolving the CONTRADICTION scenario's conflicting findings flips outcome back to INVESTIGATION_CANDIDATE",
  resolvedResult.outcome === "INVESTIGATION_CANDIDATE"
    && resolvedResult.computedFacts.conflictingCount === 0
    && resolvedResult.outcome !== contradictionResult.outcome,
  resolvedResult
);

// Perturbation 4: introduce an explicit insufficiency marker into an
// otherwise-healthy record set. Assertion: outcome flips to
// PROGRESSION_BLOCKED_EVIDENCE_REQUIRED even though eligibleCount stays at 3
// (proves the block is driven by content, not just count).
const insufficiencyInjected = copy(baseline);
insufficiencyInjected[2].finding = "Required safety characterisation evidence remains absent for this candidate.";
const insufficiencyResult = cap01.evaluateDiscovery(insufficiencyInjected);
check(
  "CAP01-B4-INSUFFICIENCY-INJECTED-AT-CONSTANT-COUNT",
  "Injecting an explicit insufficiency finding (count unchanged at 3) still flips outcome to PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",
  insufficiencyResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED"
    && insufficiencyResult.computedFacts.eligibleCount === baselineResult.computedFacts.eligibleCount
    && insufficiencyResult.outcome !== baselineResult.outcome,
  insufficiencyResult
);

// Perturbation 5: ineligible evidence must not count towards corroboration.
// Assertion: adding a non-ELIGIBLE record does not change eligibleCount or
// outcome versus baseline.
const withIneligible = copy(baseline).concat([
  { id: "P4", source: "Synthetic excluded record", state: "EXCLUDED", finding: "Positive signal, but this record was excluded from eligibility." }
]);
const ineligibleResult = cap01.evaluateDiscovery(withIneligible);
check(
  "CAP01-B5-INELIGIBLE-EVIDENCE-IGNORED",
  "Adding a non-ELIGIBLE record does not change eligibleCount or outcome",
  ineligibleResult.outcome === baselineResult.outcome
    && ineligibleResult.computedFacts.eligibleCount === baselineResult.computedFacts.eligibleCount,
  ineligibleResult
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP01-DISCOVERY-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP01_DISCOVERY_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP01_DISCOVERY_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves only that CAP-01's live-simulation evaluator computes its outcome from the actual evidence content and state passed to it, in both directions (evidence removed/added, findings flipped), and reaches every defined outcome from real scenario data. It does not prove scientific correctness, production readiness, sovereignty or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-01-DISCOVERY-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
