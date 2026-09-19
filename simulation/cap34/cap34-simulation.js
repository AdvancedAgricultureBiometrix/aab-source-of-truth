(function () {
  "use strict";

  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const VERSION = "0.1.0";
  const PRODUCTION_AUTHORITY = false;

  const scenarios = Object.freeze({
    HAPPY_PATH: Object.freeze({
      id: "SIM-AGR-001",
      title: "Synthetic agricultural opportunity",
      dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [
        { id: "E1", source: "Synthetic soil analysis", state: "ELIGIBLE", finding: "Low plant-available silicon in representative synthetic soil." },
        { id: "E2", source: "Synthetic material assay", state: "ELIGIBLE", finding: "Candidate residual stream contains a controlled silicon fraction." },
        { id: "E3", source: "Synthetic open-reference fixture", state: "ELIGIBLE", finding: "Reference mechanism supports investigation, not efficacy." }
      ],
      outcome: "INVESTIGATION_CANDIDATE",
      explanation: "Evidence supports a governed investigation candidate. It does not establish ingredient status, formulation efficacy, safety, regulatory approval or production authority."
    }),
    CONTRADICTION: Object.freeze({
      id: "SIM-AGR-002",
      title: "Contradictory evidence",
      dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [
        { id: "E1", source: "Synthetic trial A", state: "ELIGIBLE", finding: "Positive response under condition A." },
        { id: "E2", source: "Synthetic trial B", state: "ELIGIBLE", finding: "No response under comparable condition B." },
        { id: "E3", source: "Synthetic method review", state: "ELIGIBLE", finding: "Measurement-method difference may explain part of the disagreement." }
      ],
      outcome: "CONTRADICTION_REQUIRES_REVIEW",
      explanation: "AAB preserves the disagreement. No consensus finding or approved learning is created."
    }),
    MISSING_EVIDENCE: Object.freeze({
      id: "SIM-AGR-003",
      title: "Insufficient evidence",
      dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [
        { id: "E1", source: "Synthetic candidate description", state: "ELIGIBLE", finding: "Material is described but safety evidence is absent." }
      ],
      outcome: "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",
      explanation: "There is insufficient evidence to support progression. Required safety and characterisation evidence remains missing."
    })
  });

  const roles = Object.freeze({
    COUNTRY_HEAD: Object.freeze({ label: "Country Head", formulation: false, audit: true, administration: true }),
    INSTITUTION_ADMIN: Object.freeze({ label: "Institution Admin", formulation: false, audit: false, administration: true }),
    SCIENTIST: Object.freeze({ label: "Scientist", formulation: true, audit: false, administration: false }),
    RESTRICTED_USER: Object.freeze({ label: "Restricted User", formulation: false, audit: false, administration: false }),
    AUDITOR: Object.freeze({ label: "Bounded Auditor", formulation: false, audit: true, administration: false })
  });

  function capabilityState(roleKey) {
    const role = roles[roleKey] || roles.RESTRICTED_USER;
    return Object.freeze({
      released: true,
      selected: true,
      entitled: true,
      countryReady: true,
      userAuthorised: !!role.formulation,
      productionAuthorised: false,
      explanation: role.formulation
        ? "Simulation formulation access is permitted for this synthetic role. No real scientific or production authority is created."
        : "The simulated country capability is available, but this role does not hold simulated formulation authority."
    });
  }

  function runScenario(key) {
    const scenario = scenarios[key];
    if (!scenario) return Object.freeze({ status: "FAIL_CLOSED_UNKNOWN_SCENARIO" });
    return Object.freeze({
      classification: CLASSIFICATION,
      version: VERSION,
      productionAuthority: PRODUCTION_AUTHORITY,
      scenario
    });
  }

  function reset() {
    return Object.freeze({
      status: "RESET_TO_CLEAN_SIMULATION_BASELINE",
      classification: CLASSIFICATION,
      productionStateCreated: false,
      retainedScenarioDefinitions: Object.keys(scenarios).length
    });
  }

  function runValidation() {
    const checks = {
      classificationLocked: CLASSIFICATION === "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY",
      productionAuthorityImpossible: PRODUCTION_AUTHORITY === false,
      threeScenarioClassesPresent: Object.keys(scenarios).length === 3,
      contradictionDoesNotPromote: scenarios.CONTRADICTION.outcome === "CONTRADICTION_REQUIRES_REVIEW",
      missingEvidenceFailsClosed: scenarios.MISSING_EVIDENCE.outcome === "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",
      restrictedRoleDenied: capabilityState("RESTRICTED_USER").userAuthorised === false,
      scientistSimulationOnly: capabilityState("SCIENTIST").productionAuthorised === false,
      resetCreatesNoProductionState: reset().productionStateCreated === false
    };
    const allPassed = Object.values(checks).every(Boolean);
    return Object.freeze({
      status: allPassed ? "PASS_READY_SIMULATION_ONLY" : "FAIL_CLOSED",
      classification: CLASSIFICATION,
      version: VERSION,
      checks
    });
  }

  window.AAB_CAP34_SIMULATION = Object.freeze({
    CLASSIFICATION, VERSION, scenarios, roles, capabilityState, runScenario, reset, runValidation
  });
}());
