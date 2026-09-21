(function () {
  "use strict";

  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const VERSION = "0.2.0";
  const PRODUCTION_AUTHORITY = false;
  const ROADMAP_ACKNOWLEDGEMENT_VERSION = "CAP34-ROADMAP-ACK-1.0.0";

  const scenarios = Object.freeze({
    HAPPY_PATH: Object.freeze({
      id: "SIM-AGR-001", title: "Synthetic agricultural opportunity", dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [
        { id: "E1", source: "Synthetic soil analysis", state: "ELIGIBLE", finding: "Low plant-available silicon in representative synthetic soil." },
        { id: "E2", source: "Synthetic material assay", state: "ELIGIBLE", finding: "Candidate residual stream contains a controlled silicon fraction." },
        { id: "E3", source: "Synthetic open-reference fixture", state: "ELIGIBLE", finding: "Reference mechanism supports investigation, not efficacy." }
      ],
      outcome: "INVESTIGATION_CANDIDATE",
      explanation: "Evidence supports a governed investigation candidate. It does not establish ingredient status, formulation efficacy, safety, regulatory approval or production authority."
    }),
    CONTRADICTION: Object.freeze({
      id: "SIM-AGR-002", title: "Contradictory evidence", dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [
        { id: "E1", source: "Synthetic trial A", state: "ELIGIBLE", finding: "Positive response under condition A." },
        { id: "E2", source: "Synthetic trial B", state: "ELIGIBLE", finding: "No response under comparable condition B." },
        { id: "E3", source: "Synthetic method review", state: "ELIGIBLE", finding: "Measurement-method difference may explain part of the disagreement." }
      ],
      outcome: "CONTRADICTION_REQUIRES_REVIEW",
      explanation: "AAB preserves the disagreement. No consensus finding or approved learning is created."
    }),
    MISSING_EVIDENCE: Object.freeze({
      id: "SIM-AGR-003", title: "Insufficient evidence", dataClass: "SYNTHETIC_REFERENCE_ONLY",
      evidence: [{ id: "E1", source: "Synthetic candidate description", state: "ELIGIBLE", finding: "Material is described but safety evidence is absent." }],
      outcome: "PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",
      explanation: "There is insufficient evidence to support progression. Required safety and characterisation evidence remains missing."
    })
  });

  const roadmapPreviews = Object.freeze({
    HISTORICAL_SCIENTIFIC_MEMORY_RECOVERY: Object.freeze({
      id: "SIM-ROADMAP-MEMORY-001",
      title: "Historical Scientific Memory Recovery",
      capabilityIdentities: Object.freeze(["CAP-02:ROOT", "CAP-04:ROOT"]),
      mode: "ROADMAP_PREVIEW",
      fidelity: "CONCEPT_PREVIEW_NOT_IMPLEMENTED",
      dataClass: "SYNTHETIC_REFERENCE_ONLY",
      proposition: "Connect governed copies and references from existing institutional systems into provenance-preserving scientific memory without requiring those institutions to abandon their systems.",
      previewSteps: Object.freeze([
        "Register source institution and legacy system.",
        "Preserve original record, author, date, method, version and institutional ownership.",
        "Retain positive, negative, null and contradictory results.",
        "Link related records while preserving source trace-back and uncertainty.",
        "Require human review before any record can become approved learning."
      ]),
      limitations: Object.freeze([
        "No complete multi-institution historical recovery workflow has been implemented or behaviourally proven.",
        "Document extraction, legacy adapters, duplicate resolution and corpus-scale discovery remain build work.",
        "Imported records do not automatically become approved learning or scientific fact."
      ]),
      nonImplications: Object.freeze(["This preview does not prove interoperability, scientific completeness, production readiness or commissioning."])
    }),
    GOVERNED_EXPORT_COMPLIANCE_EVIDENCE: Object.freeze({
      id: "SIM-ROADMAP-EXPORT-001",
      title: "Governed Export-Compliance Evidence",
      capabilityIdentities: Object.freeze(["CAP-03:ROOT", "CAP-11:ROOT"]),
      mode: "ROADMAP_PREVIEW",
      fidelity: "CONCEPT_PREVIEW_NOT_IMPLEMENTED",
      dataClass: "SYNTHETIC_REFERENCE_ONLY",
      proposition: "Assemble provenance-backed evidence from synthetic smallholder farms through aggregation and shipment, mapped to a versioned destination-market requirement set such as EUDR.",
      previewSteps: Object.freeze([
        "Preserve farm, plot, producer, lot, aggregation, transformation and shipment lineage.",
        "Bind every evidence item to source, time, geography, method and responsible authority.",
        "Map evidence to the destination requirement version and effective date.",
        "Expose missing, contradictory, expired or unverifiable evidence.",
        "Generate a governed dossier completeness assessment for authorised human review."
      ]),
      limitations: Object.freeze([
        "No EUDR-specific or behaviourally proven smallholder export-compliance workflow has been implemented.",
        "Current provenance, evidence and regulatory schema foundations do not prove end-to-end chain-of-custody or legal sufficiency.",
        "Dossier completeness does not equal regulatory approval, certification, customs acceptance or market access."
      ]),
      nonImplications: Object.freeze(["This preview does not provide legal advice, regulatory approval, certification, production authority or commissioning evidence."])
    })
  });

  const liveCapabilities = {};
  function registerLiveCapability(capabilityId, evaluator) {
    if (typeof evaluator !== "function") return Object.freeze({ status: "FAIL_CLOSED_INVALID_LIVE_CAPABILITY_EVALUATOR" });
    liveCapabilities[capabilityId] = evaluator;
    return Object.freeze({ status: "PASS_LIVE_CAPABILITY_REGISTERED", capabilityId });
  }
  function runLiveCapability(capabilityId, evidenceRecords) {
    const evaluator = liveCapabilities[capabilityId];
    if (typeof evaluator !== "function") return Object.freeze({ status: "FAIL_CLOSED_UNKNOWN_LIVE_CAPABILITY", capabilityId });
    return evaluator(evidenceRecords);
  }

  const roles = Object.freeze({
    COUNTRY_HEAD: Object.freeze({ label: "Country Head", formulation: false, audit: true, administration: true }),
    INSTITUTION_ADMIN: Object.freeze({ label: "Institution Admin", formulation: false, audit: false, administration: true }),
    SCIENTIST: Object.freeze({ label: "Scientist", formulation: true, audit: false, administration: false }),
    RESTRICTED_USER: Object.freeze({ label: "Restricted User", formulation: false, audit: false, administration: false }),
    AUDITOR: Object.freeze({ label: "Bounded Auditor", formulation: false, audit: true, administration: false })
  });

  function capabilityState(roleKey) {
    const role = roles[roleKey] || roles.RESTRICTED_USER;
    return Object.freeze({released:true,selected:true,entitled:true,countryReady:true,userAuthorised:!!role.formulation,productionAuthorised:false,explanation:role.formulation ? "Simulation formulation access is permitted for this synthetic role. No real scientific or production authority is created." : "The simulated country capability is available, but this role does not hold simulated formulation authority."});
  }
  function runScenario(key) { const scenario=scenarios[key]; return scenario ? Object.freeze({classification:CLASSIFICATION,version:VERSION,productionAuthority:PRODUCTION_AUTHORITY,scenario}) : Object.freeze({status:"FAIL_CLOSED_UNKNOWN_SCENARIO"}); }
  function enterRoadmapPreview(key, acknowledgement) {
    const preview=roadmapPreviews[key];
    if (!preview) return Object.freeze({status:"FAIL_CLOSED_UNKNOWN_ROADMAP_PREVIEW"});
    if (!acknowledgement || acknowledgement.accepted!==true || acknowledgement.wordingVersion!==ROADMAP_ACKNOWLEDGEMENT_VERSION) return Object.freeze({status:"FAIL_CLOSED_ROADMAP_ACKNOWLEDGEMENT_REQUIRED"});
    return Object.freeze({status:"PASS_ROADMAP_PREVIEW_DISCLOSED",classification:CLASSIFICATION,version:VERSION,productionAuthority:false,implementedCapability:false,acknowledgement:Object.freeze({accepted:true,wordingVersion:ROADMAP_ACKNOWLEDGEMENT_VERSION}),preview});
  }
  function reset() { return Object.freeze({status:"RESET_TO_CLEAN_SIMULATION_BASELINE",classification:CLASSIFICATION,productionStateCreated:false,retainedScenarioDefinitions:Object.keys(scenarios).length,retainedRoadmapDefinitions:Object.keys(roadmapPreviews).length,acknowledgementRetained:false}); }
  function runValidation() {
    const acknowledged=enterRoadmapPreview("HISTORICAL_SCIENTIFIC_MEMORY_RECOVERY",{accepted:true,wordingVersion:ROADMAP_ACKNOWLEDGEMENT_VERSION});
    const denied=enterRoadmapPreview("GOVERNED_EXPORT_COMPLIANCE_EVIDENCE",{accepted:false,wordingVersion:ROADMAP_ACKNOWLEDGEMENT_VERSION});
    const checks={classificationLocked:CLASSIFICATION==="CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY",productionAuthorityImpossible:PRODUCTION_AUTHORITY===false,threeScenarioClassesPresent:Object.keys(scenarios).length===3,twoRoadmapPreviewsPresent:Object.keys(roadmapPreviews).length===2,roadmapPreviewsExplicitlyUnimplemented:Object.values(roadmapPreviews).every(p=>p.mode==="ROADMAP_PREVIEW"&&p.fidelity==="CONCEPT_PREVIEW_NOT_IMPLEMENTED"),roadmapAcknowledgementRequired:denied.status==="FAIL_CLOSED_ROADMAP_ACKNOWLEDGEMENT_REQUIRED",acknowledgedPreviewCreatesNoAuthority:acknowledged.productionAuthority===false&&acknowledged.implementedCapability===false,contradictionDoesNotPromote:scenarios.CONTRADICTION.outcome==="CONTRADICTION_REQUIRES_REVIEW",missingEvidenceFailsClosed:scenarios.MISSING_EVIDENCE.outcome==="PROGRESSION_BLOCKED_EVIDENCE_REQUIRED",restrictedRoleDenied:capabilityState("RESTRICTED_USER").userAuthorised===false,scientistSimulationOnly:capabilityState("SCIENTIST").productionAuthorised===false,resetCreatesNoProductionState:reset().productionStateCreated===false&&reset().acknowledgementRetained===false};
    const allPassed=Object.values(checks).every(Boolean);
    return Object.freeze({status:allPassed?"PASS_READY_SIMULATION_ONLY":"FAIL_CLOSED",classification:CLASSIFICATION,version:VERSION,checks});
  }
  window.AAB_CAP34_SIMULATION=Object.freeze({CLASSIFICATION,VERSION,ROADMAP_ACKNOWLEDGEMENT_VERSION,scenarios,roadmapPreviews,roles,liveCapabilities,capabilityState,runScenario,enterRoadmapPreview,reset,runValidation,registerLiveCapability,runLiveCapability});
}());
