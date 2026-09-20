(function () {
  "use strict";

  /**
   * CAP-01 (Country Intelligence & Discovery) live-simulation evaluator.
   *
   * Computes its outcome from the evidence records it is given. It has no
   * branch on scenario name or scenario id anywhere in this file — only on
   * the eligibility state and finding text of the records passed in. See
   * cap01-discovery.behavioural-test.js for the perturbation proof this is
   * held to.
   */

  const CAPABILITY_ID = "CAP-01";
  const CAPABILITY_NAME = "Country Intelligence & Discovery";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const MINIMUM_ELIGIBLE_EVIDENCE = 2;

  // A finding that states its own evidentiary gap (absence, missing data,
  // an unproven/unestablished claim) is insufficient regardless of how much
  // other evidence exists alongside it.
  const INSUFFICIENCY_PATTERN = /\b(absent|missing|insufficient|unknown|not\s+(?:available|established|proven))\b/i;

  // A finding that reports a null/negative result, an explicit
  // contradiction, or a disagreement between records is conflicting.
  const CONFLICT_PATTERN = /\b(no response|disagreement|contradict\w*|inconsistent|conflicting)\b/i;

  function classifyFinding(evidence) {
    const text = String((evidence && evidence.finding) || "");
    if (INSUFFICIENCY_PATTERN.test(text)) return "INSUFFICIENT";
    if (CONFLICT_PATTERN.test(text)) return "CONFLICTING";
    return "SUPPORTING";
  }

  function evaluateDiscovery(evidenceRecords) {
    const records = Array.isArray(evidenceRecords) ? evidenceRecords : [];
    const eligible = records.filter((record) => record && record.state === "ELIGIBLE");
    const classified = eligible.map((record) => Object.freeze({
      id: record.id,
      classification: classifyFinding(record)
    }));

    const supportingCount = classified.filter((c) => c.classification === "SUPPORTING").length;
    const conflictingCount = classified.filter((c) => c.classification === "CONFLICTING").length;
    const insufficientCount = classified.filter((c) => c.classification === "INSUFFICIENT").length;
    const eligibleCount = eligible.length;

    let outcome;
    let explanation;

    if (insufficientCount > 0 || eligibleCount < MINIMUM_ELIGIBLE_EVIDENCE) {
      outcome = "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED";
      explanation = "There is insufficient evidence to support progression: "
        + (insufficientCount > 0
          ? insufficientCount + " eligible record(s) explicitly report missing or unproven evidence."
          : "only " + eligibleCount + " eligible record(s) were supplied, below the minimum of " + MINIMUM_ELIGIBLE_EVIDENCE + ".");
    } else if (conflictingCount > 0) {
      outcome = "CONTRADICTION_REQUIRES_REVIEW";
      explanation = "AAB preserves the disagreement: " + conflictingCount + " of " + eligibleCount
        + " eligible record(s) report a conflicting or null result. No consensus finding or approved learning is created.";
    } else {
      outcome = "INVESTIGATION_CANDIDATE";
      explanation = "All " + eligibleCount + " eligible record(s) support the same direction with no conflict or insufficiency. "
        + "Evidence supports a governed investigation candidate. It does not establish ingredient status, formulation efficacy, safety, regulatory approval or production authority.";
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      outcome,
      explanation,
      computedFacts: Object.freeze({
        eligibleCount,
        supportingCount,
        conflictingCount,
        insufficientCount,
        minimumEligibleEvidence: MINIMUM_ELIGIBLE_EVIDENCE
      }),
      evidenceClassification: Object.freeze(classified)
    });
  }

  window.AAB_CAP34_LIVE_CAP01_DISCOVERY = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    evaluateDiscovery
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateDiscovery);
  }
}());
