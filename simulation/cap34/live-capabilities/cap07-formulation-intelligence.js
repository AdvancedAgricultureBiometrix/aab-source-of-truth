(function () {
  "use strict";

  /**
   * CAP-07 (Formulation Intelligence) live-simulation evaluator.
   *
   * Consumes CAP-06 (Ingredient Intelligence) evaluation results -- not
   * raw evidence -- and genuinely combines/scores them against an
   * objective's constraints. Both the objective and the candidate list are
   * live inputs: changing either changes the output. See
   * cap07-formulation-intelligence.behavioural-test.js, particularly its
   * Part C, which proves this against CAP-06's REAL output rather than
   * hand-written CAP-07 fixtures.
   */

  const CAPABILITY_ID = "CAP-07";
  const CAPABILITY_NAME = "Formulation Intelligence";
  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const BLOCKED_INGREDIENT_STATUS = "INGREDIENT_BLOCKED_EVIDENCE_REQUIRED";
  const CONTRADICTION_INGREDIENT_STATUS = "INGREDIENT_CONTRADICTION_REQUIRES_REVIEW";

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function evaluateFormulation(objective, candidates) {
    const obj = objective || {};
    const minReadinessScore = typeof obj.minReadinessScore === "number" ? obj.minReadinessScore : 0;
    const minQualifyingCandidates = typeof obj.minQualifyingCandidates === "number" ? obj.minQualifyingCandidates : 1;
    const maxCandidates = typeof obj.maxCandidates === "number" ? obj.maxCandidates : Infinity;

    const list = Array.isArray(candidates) ? candidates : [];
    const qualifying = list.filter((candidate) =>
      candidate
      && candidate.status !== BLOCKED_INGREDIENT_STATUS
      && typeof candidate.readinessScore === "number"
      && candidate.readinessScore >= minReadinessScore
    );
    const qualifyingCount = qualifying.length;

    let outcome;
    let formulationScore;
    let selectedCandidates;
    let explanation;

    if (qualifyingCount < minQualifyingCandidates) {
      outcome = "FORMULATION_BLOCKED_INSUFFICIENT_CANDIDATES";
      formulationScore = 0;
      selectedCandidates = [];
      explanation = "Only " + qualifyingCount + " candidate(s) meet the objective's minimum readiness score of "
        + minReadinessScore + ", below the required " + minQualifyingCandidates + ".";
    } else {
      const sorted = qualifying.slice().sort((a, b) => b.readinessScore - a.readinessScore);
      selectedCandidates = sorted.slice(0, maxCandidates);
      formulationScore = average(selectedCandidates.map((c) => c.readinessScore));
      const hasContradiction = selectedCandidates.some((c) => c.status === CONTRADICTION_INGREDIENT_STATUS);

      if (hasContradiction) {
        outcome = "FORMULATION_REQUIRES_REVIEW";
        explanation = "At least one selected candidate carries an unresolved ingredient-level contradiction. The formulation score is reported, but the formulation is not clean-ready.";
      } else {
        outcome = "FORMULATION_CANDIDATE_READY";
        explanation = selectedCandidates.length + " candidate(s) selected with no unresolved contradiction, average readiness "
          + formulationScore.toFixed(3) + ".";
      }
    }

    return Object.freeze({
      capabilityId: CAPABILITY_ID,
      capabilityName: CAPABILITY_NAME,
      classification: CLASSIFICATION,
      productionAuthority: false,
      objectiveName: obj.name || null,
      outcome,
      formulationScore,
      qualifyingCount,
      selectedCandidates: Object.freeze(selectedCandidates.map((c) => Object.freeze({ materialId: c.materialId, status: c.status, readinessScore: c.readinessScore }))),
      explanation,
      computedFacts: Object.freeze({
        totalCandidatesConsidered: list.length,
        qualifyingCount,
        minReadinessScore,
        minQualifyingCandidates,
        maxCandidates: Number.isFinite(maxCandidates) ? maxCandidates : null
      })
    });
  }

  window.AAB_CAP34_LIVE_CAP07_FORMULATION_INTELLIGENCE = Object.freeze({
    capabilityId: CAPABILITY_ID,
    capabilityName: CAPABILITY_NAME,
    classification: CLASSIFICATION,
    evaluateFormulation
  });

  if (window.AAB_CAP34_SIMULATION && typeof window.AAB_CAP34_SIMULATION.registerLiveCapability === "function") {
    window.AAB_CAP34_SIMULATION.registerLiveCapability(CAPABILITY_ID, function (input) {
      const payload = input || {};
      return evaluateFormulation(payload.objective, payload.candidates);
    });
  }
}());
