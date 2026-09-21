(function () {
  "use strict";

  /**
   * CAP-09 (Governed Scientific Learning) live-simulation evaluator.
   *
   * The direct enforcement of "AAB does not learn merely because
   * something happened." Refuses to promote a candidate finding to
   * approved learning unless BOTH the replication requirement is met
   * AND no eligible trial contradicts the others -- either condition
   * failing on its own is sufficient to refuse, and refusal reasons are
   * named explicitly, never collapsed into one flat "no". See
   * cap09-governed-learning.behavioural-test.js, particularly Part C:
   * a satisfied replication requirement does not override a
   * contradicting trial.
   */

  const CAP09_IMPLEMENTATION_VERSION = "1.0.0";
  const CAPABILITY_ID = "CAP-09";
  const CAPABILITY_NAME = "Governed Scientific Learning";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const REQUIRED_REPLICATIONS = 2;

  const INSUFFICIENCY_PATTERN = /\b(absent|missing|insufficient|unknown|not\s+(?:available|established|proven))\b/i;
  const CONFLICT_PATTERN = /\b(no response|disagreement|contradict\w*|inconsistent|conflicting)\b/i;

  function classifyFinding(trial) {
    const text = String((trial && trial.finding) || "");
    if (INSUFFICIENCY_PATTERN.test(text)) return "INSUFFICIENT";
    if (CONFLICT_PATTERN.test(text)) return "CONFLICTING";
    return "SUPPORTING";
  }

  function evaluatePromotion(candidateLearning) {
    const findingId = candidateLearning && candidateLearning.findingId ? candidateLearning.findingId : null;
    const trials = Array.isArray(candidateLearning && candidateLearning.trials) ? candidateLearning.trials : [];
    const eligible = trials.filter((trial) => trial && trial.state === "ELIGIBLE");
    const classified = eligible.map((trial) => classifyFinding(trial));

    const supportingCount = classified.filter((c) => c === "SUPPORTING").length;
    const conflictingCount = classified.filter((c) => c === "CONFLICTING").length;
    const insufficientCount = classified.filter((c) => c === "INSUFFICIENT").length;
    const eligibleCount = eligible.length;

    const refusalReasons = [];
    if (supportingCount < REQUIRED_REPLICATIONS) refusalReasons.push("REPLICATION_REQUIRED");
    if (conflictingCount > 0) refusalReasons.push("CONTRADICTING_EVIDENCE_PRESENT");
    if (insufficientCount > 0) refusalReasons.push("SELF_DECLARED_EVIDENCE_GAP");

    const outcome = refusalReasons.length > 0 ? "PROMOTION_REFUSED" : "PROMOTED_TO_APPROVED_LEARNING";
    const explanation = outcome === "PROMOTION_REFUSED"
      ? "Promotion refused: " + refusalReasons.join(", ") + ". AAB does not promote a candidate finding to approved learning merely because a trial occurred."
      : supportingCount + " independent supporting trial(s) meet the replication requirement of " + REQUIRED_REPLICATIONS + " with no contradicting or self-declared-insufficient trial present.";

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      findingId,
      outcome,
      refusalReasons: Object.freeze(refusalReasons),
      explanation,
      computedFacts: Object.freeze({
        eligibleCount,
        supportingCount,
        conflictingCount,
        insufficientCount,
        requiredReplications: REQUIRED_REPLICATIONS
      })
    });
  }

  window.AAB_CAP34_LIVE_CAP09_GOVERNED_LEARNING = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    implementationVersion: CAP09_IMPLEMENTATION_VERSION,
    evaluatePromotion
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluatePromotion);
  }
}());
