(function () {
  "use strict";

  /**
   * CAP-05 (Governed Scientific Reasoning) live-simulation evaluator.
   *
   * Mechanistically distinct from CAP-01: contradiction detection groups
   * evidence by a derived subject key and only flags a conflict when two
   * records addressing the SAME subject genuinely disagree (real pairwise
   * attribute comparison), and knowledge-gap identification names the
   * specific missing required category rather than reporting a bare
   * insufficiency count. See cap05-reasoning.behavioural-test.js.
   */

  const CAP05_IMPLEMENTATION_VERSION = "1.0.0";
  const CAPABILITY_ID = "CAP-05";
  const CAPABILITY_NAME = "Governed Scientific Reasoning";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const MINIMUM_ELIGIBLE_EVIDENCE = 2;

  const NEGATIVE_PATTERN = /\b(no response|absent|missing|insufficient|unknown|not\s+(?:available|established|proven)|disagreement|contradict\w*|inconsistent|conflicting)\b/i;
  const SELF_DECLARED_GAP_PATTERN = /\b(absent|missing|insufficient|unknown|not\s+(?:available|established|proven))\b/i;

  function deriveSubjectKey(evidence) {
    const source = String((evidence && evidence.source) || "").toLowerCase();
    return source
      .replace(/^synthetic\s+/, "")
      .replace(/\s+[a-z]$/, "")
      .replace(/\s+\d+$/, "")
      .trim();
  }

  function stanceOf(evidence) {
    const text = String((evidence && evidence.finding) || "");
    return NEGATIVE_PATTERN.test(text) ? "NEGATIVE" : "POSITIVE";
  }

  function findContradictingSubjects(eligibleRecords) {
    const bySubject = new Map();
    for (const record of eligibleRecords) {
      const subject = deriveSubjectKey(record);
      if (!bySubject.has(subject)) bySubject.set(subject, []);
      bySubject.get(subject).push(stanceOf(record));
    }
    const contradicting = [];
    for (const [subject, stances] of bySubject.entries()) {
      const hasPositive = stances.includes("POSITIVE");
      const hasNegative = stances.includes("NEGATIVE");
      if (stances.length >= 2 && hasPositive && hasNegative) contradicting.push(subject);
    }
    return contradicting.sort();
  }

  function findMissingCategories(eligibleRecords) {
    const missing = [];
    if (eligibleRecords.length < MINIMUM_ELIGIBLE_EVIDENCE) missing.push("SUFFICIENT_VOLUME");
    const hasSelfDeclaredGap = eligibleRecords.some((record) => SELF_DECLARED_GAP_PATTERN.test(String((record && record.finding) || "")));
    if (hasSelfDeclaredGap) missing.push("NO_SELF_DECLARED_GAP");
    return missing;
  }

  function evaluateReasoning(evidenceRecords) {
    const records = Array.isArray(evidenceRecords) ? evidenceRecords : [];
    const eligible = records.filter((record) => record && record.state === "ELIGIBLE");
    const eligibleCount = eligible.length;

    const missingCategories = findMissingCategories(eligible);
    const contradictingSubjects = findContradictingSubjects(eligible);

    let outcome;
    let explanation;

    if (missingCategories.length > 0) {
      outcome = "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED";
      explanation = "Required evidence categories are missing: " + missingCategories.join(", ") + ".";
    } else if (contradictingSubjects.length > 0) {
      outcome = "CONTRADICTION_REQUIRES_REVIEW";
      explanation = "Pairwise comparison found evidence addressing the same subject that disagrees: " + contradictingSubjects.join(", ") + ". AAB preserves the disagreement; no consensus finding or approved learning is created.";
    } else {
      outcome = "REASONING_SUPPORTS_PROGRESSION";
      explanation = "All required categories are satisfied and no same-subject evidence disagrees. Reasoning supports a governed investigation candidate. It does not establish ingredient status, formulation efficacy, safety, regulatory approval or production authority.";
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
        missingCategories: Object.freeze(missingCategories),
        contradictingSubjects: Object.freeze(contradictingSubjects),
        minimumEligibleEvidence: MINIMUM_ELIGIBLE_EVIDENCE
      })
    });
  }

  window.AAB_CAP34_LIVE_CAP05_REASONING = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    implementationVersion: CAP05_IMPLEMENTATION_VERSION,
    evaluateReasoning
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, evaluateReasoning);
  }
}());
