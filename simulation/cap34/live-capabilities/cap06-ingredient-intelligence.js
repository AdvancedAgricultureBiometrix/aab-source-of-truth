(function () {
  "use strict";

  /**
   * CAP-06 (Ingredient Intelligence) live-simulation evaluator.
   *
   * Produces a categorical status AND a continuous readinessScore in
   * [0,1] computed from evidence sufficiency and corroboration -- the
   * score exists specifically so CAP-07 (Formulation Intelligence) has
   * something real to combine/rank rather than just a label to branch on.
   * See cap06-ingredient-intelligence.behavioural-test.js.
   */

  const CAP06_IMPLEMENTATION_VERSION = "1.0.0";
  const CAPABILITY_ID = "CAP-06";
  const CAPABILITY_NAME = "Ingredient Intelligence";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const REQUIRED_CORROBORATION = 2;

  const INSUFFICIENCY_PATTERN = /\b(absent|missing|insufficient|unknown|not\s+(?:available|established|proven))\b/i;
  const CONFLICT_PATTERN = /\b(no response|disagreement|contradict\w*|inconsistent|conflicting)\b/i;

  function classifyFinding(evidence) {
    const text = String((evidence && evidence.finding) || "");
    if (INSUFFICIENCY_PATTERN.test(text)) return "INSUFFICIENT";
    if (CONFLICT_PATTERN.test(text)) return "CONFLICTING";
    return "SUPPORTING";
  }

  function evaluateIngredient(candidate) {
    const materialId = candidate && candidate.materialId ? candidate.materialId : null;
    const records = Array.isArray(candidate && candidate.evidenceRecords) ? candidate.evidenceRecords : [];
    const eligible = records.filter((record) => record && record.state === "ELIGIBLE");
    const classified = eligible.map((record) => classifyFinding(record));

    const supportingCount = classified.filter((c) => c === "SUPPORTING").length;
    const conflictingCount = classified.filter((c) => c === "CONFLICTING").length;
    const insufficientCount = classified.filter((c) => c === "INSUFFICIENT").length;
    const eligibleCount = eligible.length;

    let status;
    let readinessScore;
    let explanation;

    if (insufficientCount > 0 || eligibleCount < REQUIRED_CORROBORATION) {
      status = "INGREDIENT_BLOCKED_EVIDENCE_REQUIRED";
      readinessScore = 0;
      explanation = insufficientCount > 0
        ? insufficientCount + " eligible record(s) explicitly report missing or unproven evidence."
        : "Only " + eligibleCount + " eligible record(s) supplied, below the corroboration requirement of " + REQUIRED_CORROBORATION + ".";
    } else if (conflictingCount > 0) {
      status = "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW";
      readinessScore = supportingCount / (supportingCount + conflictingCount);
      explanation = conflictingCount + " of " + eligibleCount + " eligible record(s) conflict with the rest. Readiness is reduced, not zero, and not full confidence.";
    } else {
      status = "INGREDIENT_PROGRESSION_CANDIDATE";
      readinessScore = Math.min(1, supportingCount / REQUIRED_CORROBORATION);
      explanation = supportingCount + " eligible record(s) support the candidate with no conflict or insufficiency.";
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      materialId,
      status,
      readinessScore,
      explanation,
      computedFacts: Object.freeze({
        eligibleCount,
        supportingCount,
        conflictingCount,
        insufficientCount,
        requiredCorroboration: REQUIRED_CORROBORATION
      })
    });
  }

  window.AAB_CAP34_LIVE_CAP06_INGREDIENT_INTELLIGENCE = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    implementationVersion: CAP06_IMPLEMENTATION_VERSION,
    evaluateIngredient
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateIngredient);
  }
}());
