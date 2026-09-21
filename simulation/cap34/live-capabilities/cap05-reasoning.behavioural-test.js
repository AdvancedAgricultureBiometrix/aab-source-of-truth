"use strict";

/**
 * CAP-05 (Governed Scientific Reasoning) live-logic behavioural proof.
 *
 * CAP-05 must be mechanistically different from CAP-01, not a re-skin of
 * it: contradiction detection compares PAIRS of evidence records sharing
 * the same derived subject and flags a conflict only when their stances
 * genuinely disagree (real attribute comparison, not a per-record tally),
 * and knowledge-gap identification names the SPECIFIC missing required
 * category rather than reporting a bare insufficiency count. Every fixture
 * either runs the evaluator against the three canonical scenarios
 * unmodified, or perturbs one input value and asserts the output -- and
 * the specific subject/category named in it -- changes as predicted.
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
  path.join(ROOT, "cap05-reasoning.js")
]);

const sim = sandbox.window.AAB_CAP34_SIMULATION;
const cap05 = sandbox.window.AAB_CAP34_LIVE_CAP05_REASONING;

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const cases = [];
function check(fixtureId, description, passed, actual) {
  cases.push({ fixtureId, description, passed, actual });
}

// --- Part 0: dispatcher wiring ---
const dispatched = sim.runLiveCapability("CAP-05", sim.scenarios.HAPPY_PATH.evidence);
const direct = cap05.evaluateReasoning(sim.scenarios.HAPPY_PATH.evidence);
check(
  "CAP05-D0-DISPATCHER-WIRED",
  "sim.runLiveCapability('CAP-05', ...) reaches the same evaluator as calling it directly",
  dispatched.outcome === direct.outcome && JSON.stringify(dispatched.computedFacts) === JSON.stringify(direct.computedFacts),
  dispatched
);

// --- Part A: the three canonical scenarios, evidence unmodified ---
const happyResult = cap05.evaluateReasoning(sim.scenarios.HAPPY_PATH.evidence);
check(
  "CAP05-A1-HAPPY-PATH",
  "Unmodified HAPPY_PATH evidence (3 distinct subjects, no self-declared gap) yields REASONING_SUPPORTS_PROGRESSION with zero missing categories and zero contradictions",
  happyResult.outcome === "REASONING_SUPPORTS_PROGRESSION" && happyResult.computedFacts.missingCategories.length === 0 && happyResult.computedFacts.contradictingSubjects.length === 0,
  happyResult
);

const contradictionResult = cap05.evaluateReasoning(sim.scenarios.CONTRADICTION.evidence);
check(
  "CAP05-A2-CONTRADICTION",
  "Unmodified CONTRADICTION evidence: pairwise comparison finds 'trial A' and 'trial B' share a subject with opposing stances, naming that subject explicitly",
  contradictionResult.outcome === "CONTRADICTION_REQUIRES_REVIEW" && contradictionResult.computedFacts.contradictingSubjects.includes("trial"),
  contradictionResult
);

const missingResult = cap05.evaluateReasoning(sim.scenarios.MISSING_EVIDENCE.evidence);
check(
  "CAP05-A3-MISSING-EVIDENCE",
  "Unmodified MISSING_EVIDENCE evidence: both required categories are named as missing, not just a count",
  missingResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED"
    && missingResult.computedFacts.missingCategories.includes("SUFFICIENT_VOLUME")
    && missingResult.computedFacts.missingCategories.includes("NO_SELF_DECLARED_GAP"),
  missingResult
);

// --- Part B: perturbation of a purpose-built baseline ---
const baseline = [
  { id: "P1", source: "Synthetic reading A", state: "ELIGIBLE", finding: "Consistent positive result observed in synthetic condition set A." },
  { id: "P2", source: "Synthetic reading B", state: "ELIGIBLE", finding: "Consistent positive result observed in an independent synthetic condition set B." }
];
const baselineResult = cap05.evaluateReasoning(baseline);
check(
  "CAP05-B0-BASELINE",
  "Purpose-built 2-record baseline (distinct subjects, both positive) yields REASONING_SUPPORTS_PROGRESSION",
  baselineResult.outcome === "REASONING_SUPPORTS_PROGRESSION" && baselineResult.computedFacts.missingCategories.length === 0,
  baselineResult
);

// Perturbation 1: two records about the SAME subject, one flips negative.
// This is the pairwise-attribute-comparison proof: CAP-01-style per-record
// tallying would just see "1 supporting, 1 conflicting" without ever
// comparing them; CAP-05 must recognise they share a subject and disagree.
const samSubjectBaseline = [
  { id: "S1", source: "Synthetic trial X", state: "ELIGIBLE", finding: "Positive result under synthetic condition X." },
  { id: "S2", source: "Synthetic trial Y", state: "ELIGIBLE", finding: "Positive result under synthetic condition Y, consistent with X." }
];
const samSubjectResult = cap05.evaluateReasoning(samSubjectBaseline);
check(
  "CAP05-B1-DISTINCT-TRIALS-NO-CONTRADICTION",
  "Two distinct-subject trial records, both positive, produce zero contradictions (subjects only compared within the same group)",
  samSubjectResult.computedFacts.contradictingSubjects.length === 0,
  samSubjectResult
);

const flippedSameSubject = copy(samSubjectBaseline);
flippedSameSubject[0].source = "Synthetic trial X";
flippedSameSubject[1].source = "Synthetic trial X"; // force the SAME subject key
flippedSameSubject[1].finding = "No response under synthetic condition X, contradicting the first reading.";
const flippedSameSubjectResult = cap05.evaluateReasoning(flippedSameSubject);
check(
  "CAP05-B2-SAME-SUBJECT-OPPOSING-STANCE-DETECTED",
  "Forcing two records onto the same subject key with opposing stances flips outcome to CONTRADICTION_REQUIRES_REVIEW and names that subject",
  flippedSameSubjectResult.outcome === "CONTRADICTION_REQUIRES_REVIEW"
    && flippedSameSubjectResult.computedFacts.contradictingSubjects.includes("trial")
    && flippedSameSubjectResult.outcome !== samSubjectResult.outcome,
  flippedSameSubjectResult
);

// Perturbation 1B: the discriminating counterpart to B2. Two records on
// GENUINELY DIFFERENT subjects, where one carries a real opposing (negative)
// stance -- not merely two agreeing records like B1 above, which contains no
// disagreement anywhere and so cannot tell subject-grouped comparison apart
// from a flat/global tally. If findContradictingSubjects ever regressed to
// grouping everything into one bucket (the exact class of bug CAP-05's
// design guards against), this fixture -- unlike B1 -- would catch it: a
// positive stance on "trial" and a negative stance on "result" must NOT be
// reported as a contradiction, because they never share a subject to
// disagree within.
const differentSubjectsOpposingStances = [
  { id: "S3", source: "Synthetic trial X", state: "ELIGIBLE", finding: "Positive result under synthetic condition X." },
  { id: "S4", source: "Synthetic result Q", state: "ELIGIBLE", finding: "No response observed under synthetic condition Q." }
];
const differentSubjectsResult = cap05.evaluateReasoning(differentSubjectsOpposingStances);
check(
  "CAP05-B2B-DIFFERENT-SUBJECTS-OPPOSING-STANCES-NOT-A-CONTRADICTION",
  "Two records on genuinely different derived subjects ('trial' positive, 'result' negative) produce ZERO contradictions even though an opposing stance is present somewhere in the set -- proving comparison is genuinely scoped within a shared subject, not a flat tally of stances across the whole evidence array",
  differentSubjectsResult.outcome === "REASONING_SUPPORTS_PROGRESSION"
    && differentSubjectsResult.computedFacts.contradictingSubjects.length === 0
    && differentSubjectsResult.computedFacts.missingCategories.length === 0,
  differentSubjectsResult
);

// Perturbation 2: remove evidence down to 1 record.
// Assertion: SUFFICIENT_VOLUME is named as the specific missing category.
const removedResult = cap05.evaluateReasoning(baseline.slice(0, 1));
check(
  "CAP05-B3-VOLUME-GAP-NAMED",
  "Removing 1 of 2 baseline records flips outcome to blocked and names SUFFICIENT_VOLUME specifically",
  removedResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED"
    && removedResult.computedFacts.missingCategories.length === 1
    && removedResult.computedFacts.missingCategories[0] === "SUFFICIENT_VOLUME"
    && removedResult.outcome !== baselineResult.outcome,
  removedResult
);

// Perturbation 3: constant count, inject a self-declared gap into one
// record. Proves the gap check is content-driven, not just a count -- same
// discipline as CAP-01's B4 fixture, applied to CAP-05's distinct
// mechanism (a NAMED category, not a bare count).
const gapInjected = copy(baseline);
gapInjected[1].finding = "Required corroborating evidence for this reading remains absent.";
const gapInjectedResult = cap05.evaluateReasoning(gapInjected);
check(
  "CAP05-B4-CONTENT-GAP-AT-CONSTANT-COUNT",
  "Injecting a self-declared gap (count unchanged at 2) flips outcome to blocked and names NO_SELF_DECLARED_GAP specifically, not SUFFICIENT_VOLUME",
  gapInjectedResult.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED"
    && gapInjectedResult.computedFacts.missingCategories.length === 1
    && gapInjectedResult.computedFacts.missingCategories[0] === "NO_SELF_DECLARED_GAP"
    && gapInjectedResult.computedFacts.eligibleCount === baselineResult.computedFacts.eligibleCount
    && gapInjectedResult.outcome !== baselineResult.outcome,
  gapInjectedResult
);

// Perturbation 4 (reverse direction): resolve the canonical CONTRADICTION
// scenario's conflicting trial finding. Outcome must flip back.
const resolvedContradiction = copy(sim.scenarios.CONTRADICTION.evidence);
resolvedContradiction[1].finding = "Positive response under comparable condition B, consistent with condition A.";
const resolvedResult = cap05.evaluateReasoning(resolvedContradiction);
check(
  "CAP05-B5-CONTRADICTION-RESOLVED-BIDIRECTIONAL",
  "Resolving the CONTRADICTION scenario's conflicting trial finding flips outcome back to REASONING_SUPPORTS_PROGRESSION",
  resolvedResult.outcome === "REASONING_SUPPORTS_PROGRESSION"
    && resolvedResult.computedFacts.contradictingSubjects.length === 0
    && resolvedResult.outcome !== contradictionResult.outcome,
  resolvedResult
);

const allPassed = cases.every((c) => c.passed);
const proof = {
  proofId: "AAB-CAP34-CAP05-REASONING-LIVE-LOGIC-BEHAVIOURAL-PROOF",
  proofVersion: "1.0.0",
  generatedAtUtc: new Date().toISOString(),
  result: allPassed ? "PASS_CAP05_REASONING_LIVE_LOGIC_BEHAVIOURAL_PROOF" : "FAIL_CLOSED_CAP05_REASONING_LIVE_LOGIC_BEHAVIOURAL_PROOF",
  scope: "Proves that CAP-05's live-simulation evaluator detects contradiction by comparing pairs of evidence sharing a derived subject (not per-record tallying), and identifies knowledge gaps by naming the specific missing required category (not a bare count), in both directions of perturbation. It does not prove scientific correctness, production readiness, sovereignty or commissioning.",
  fixtureCount: cases.length,
  passedFixtureCount: cases.filter((c) => c.passed).length,
  fixtures: cases
};

fs.writeFileSync(path.join(ROOT, "..", "..", "..", "governance", "workstream-b", "CAP-05-REASONING-LIVE-LOGIC-BEHAVIOURAL-PROOF.json"), JSON.stringify(proof, null, 2) + "\n");
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
process.exitCode = allPassed ? 0 : 1;
