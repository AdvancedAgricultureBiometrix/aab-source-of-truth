(function () {
  "use strict";

  const CLASSIFICATION = "CONTROLLED_AAB_SIMULATION_SYNTHETIC_REFERENCE_ONLY";
  const DOMAIN = "SUPPLY_CHAIN_SOVEREIGNTY";
  const SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION = "CAP34-SCS-ROADMAP-ACK-1.0.0";
  const DOMAIN_DISCLOSURE = "Supply Chain Sovereignty (SCS) domain preview. None of the twelve SCS capabilities are admitted, implemented, or operational. This section is identity and design documentation only — no evidence is evaluated, no evidence is admitted, and no disclosure receipt is produced here.";

  const MATURITY = Object.freeze({
    DESIGN_CONTRACT: "DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED",
    CONCEPT_PREVIEW: "CONCEPT_PREVIEW_NOT_IMPLEMENTED"
  });

  const capabilities = Object.freeze([
    Object.freeze({
      id: "SCS-CAP-01",
      name: "Regulatory Framework Registration",
      responsibility: "Register a specific regulatory framework and generate the evidence requirement specification that governs what must be admitted before a due diligence evaluation can proceed.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not evaluate evidence.", "Does not make compliance determinations."]),
      contractPath: "governance/workstream-b/SCS-CAP-01-REGULATORY-FRAMEWORK-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-02",
      name: "Operator and Supplier Identity Registration",
      responsibility: "Register legal entities, their roles in the supply chain, and their authority to provide specific types of evidence, including the aggregator role.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not verify legal identity.", "Does not grant compliance authority."]),
      contractPath: null
    }),
    Object.freeze({
      id: "SCS-CAP-03",
      name: "Plot and Land Unit Registration",
      responsibility: "Register a geographic plot as a real-world entity, with boundary evidence, tenure claims, and framework associations recorded as separate records.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not verify legal title or tenure.", "Does not confirm regulatory sufficiency."]),
      contractPath: "governance/workstream-b/SCS-CAP-03-PLOT-AND-LAND-UNIT-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-04",
      name: "Deforestation Evidence Admission",
      responsibility: "Admit genuine, attributable, and usable deforestation evidence and record precisely what each item observed, analysed, and attested.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not determine whether admitted evidence is sufficient for any framework.", "Does not strengthen a source's claim beyond what the source declared."]),
      contractPath: "governance/workstream-b/SCS-CAP-04-DEFORESTATION-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-05",
      name: "Supply Chain Custody Evidence Admission",
      responsibility: "Govern the ingestion of custody chain evidence proving the commodity's journey from plot to market.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not make compliance determinations.", "Does not produce due diligence statements."]),
      contractPath: null
    }),
    Object.freeze({
      id: "SCS-CAP-06",
      name: "Due Diligence Sufficiency Evaluation",
      responsibility: "Given admitted evidence, produce an honest evidence landscape identifying what is sufficient and what gaps remain — a sufficiency evaluation, not a compliance finding.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not produce due diligence statements.", "Does not automatically approve evidence."]),
      contractPath: "governance/workstream-b/SCS-CAP-06-DUE-DILIGENCE-SUFFICIENCY-EVALUATION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-07",
      name: "Evidence Source Discovery",
      responsibility: "For a specific country, commodity and gap type, surface authoritative sources that could provide missing evidence.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not fill gaps itself.", "Does not admit evidence."]),
      contractPath: null
    }),
    Object.freeze({
      id: "SCS-CAP-08",
      name: "Due Diligence Package Compilation",
      responsibility: "Compile a governed due diligence package assembling all admitted evidence, provenance, gaps and the human review decision for presentation to a regulatory authority.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not submit the package to any regulatory authority.", "Does not sign on behalf of the operator."]),
      contractPath: "governance/workstream-b/SCS-CAP-08-DUE-DILIGENCE-PACKAGE-COMPILATION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-09",
      name: "Regulatory Review and Promotion",
      responsibility: "The human gate before any due diligence package can be compiled — a qualified compliance officer reviews the sufficiency evaluation and records a permanent decision.",
      maturity: MATURITY.DESIGN_CONTRACT,
      exclusions: Object.freeze(["Does not make the legal compliance determination.", "Does not produce due diligence statements."]),
      contractPath: "governance/workstream-b/SCS-CAP-09-REGULATORY-REVIEW-AND-PROMOTION-CANONICAL-CONTRACT-2026-09-22.md"
    }),
    Object.freeze({
      id: "SCS-CAP-10",
      name: "Challenge Response and Evidence Retrieval",
      responsibility: "When a due diligence statement is challenged, retrieve the exact evidence package admitted at the time and prove the provenance chain is intact.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not respond to challenges on the operator's behalf.", "Does not alter historical evidence records."]),
      contractPath: null
    }),
    Object.freeze({
      id: "SCS-CAP-11",
      name: "Regulatory Framework Update Management",
      responsibility: "When a regulation is amended, identify which existing evidence packages are affected and surface what needs human review.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not automatically invalidate previously admitted evidence.", "Does not determine that existing evidence is insufficient under a new framework."]),
      contractPath: null
    }),
    Object.freeze({
      id: "SCS-CAP-12",
      name: "Cross-Boundary Evidence Reference",
      responsibility: "For supply chains spanning multiple country environments, manage governed references to evidence admitted in another country's environment.",
      maturity: MATURITY.CONCEPT_PREVIEW,
      exclusions: Object.freeze(["Does not copy evidence across country boundaries.", "Does not bypass the receiving country's admission standards."]),
      contractPath: null
    })
  ]);

  const brainCandidate = Object.freeze({
    designation: "SCS-BRAIN-CANDIDATE-01",
    name: "Governed Supply Chain Evidence Intelligence",
    isNumberedCapability: false,
    admissionStatus: "NOT_ADMITTED",
    implementationStatus: "NOT_IMPLEMENTED",
    statement: "A candidate composition layer that would read governed outputs from SCS-CAP-01, SCS-CAP-03, SCS-CAP-04 and SCS-CAP-06 to produce an evidence landscape for human review. It is not a numbered capability, is not admitted, and is not implemented.",
    contractPath: "governance/workstream-b/SCS-BRAIN-CANDIDATE-01-GOVERNED-EVIDENCE-INTELLIGENCE-2026-09-22.md"
  });

  function revealPreview(acknowledgement) {
    if (!acknowledgement || acknowledgement.accepted !== true || acknowledgement.wordingVersion !== SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION) {
      return Object.freeze({ status: "FAIL_CLOSED_SCS_ROADMAP_ACKNOWLEDGEMENT_REQUIRED" });
    }
    return Object.freeze({
      status: "PASS_SCS_ROADMAP_PREVIEW_DISCLOSED",
      classification: CLASSIFICATION,
      domain: DOMAIN,
      productionAuthority: false,
      implementedCapability: false,
      admittedCapability: false,
      acknowledgement: Object.freeze({ accepted: true, wordingVersion: SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION }),
      capabilities,
      brainCandidate
    });
  }

  function runValidation() {
    const denied = revealPreview({ accepted: false, wordingVersion: SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION });
    const revealed = revealPreview({ accepted: true, wordingVersion: SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION });
    const designContract = capabilities.filter(function (c) { return c.maturity === MATURITY.DESIGN_CONTRACT; });
    const conceptPreview = capabilities.filter(function (c) { return c.maturity === MATURITY.CONCEPT_PREVIEW; });
    const checks = {
      twelveCapabilitiesPresent: capabilities.length === 12,
      rosterOrderPreserved: capabilities.every(function (c, i) { return c.id === "SCS-CAP-" + String(i + 1).padStart(2, "0"); }),
      sixDesignContractCapabilities: designContract.length === 6,
      sixConceptPreviewCapabilities: conceptPreview.length === 6,
      designContractCapabilitiesHaveContracts: designContract.every(function (c) { return typeof c.contractPath === "string" && c.contractPath.length > 0; }),
      conceptPreviewCapabilitiesHaveNoContract: conceptPreview.every(function (c) { return c.contractPath === null; }),
      everyCapabilityHasExclusions: capabilities.every(function (c) { return Array.isArray(c.exclusions) && c.exclusions.length >= 1; }),
      noCapabilityExposesEvaluateOrRun: capabilities.every(function (c) { return typeof c.evaluate === "undefined" && typeof c.run === "undefined"; }),
      gateFailsClosedWithoutAcknowledgement: denied.status === "FAIL_CLOSED_SCS_ROADMAP_ACKNOWLEDGEMENT_REQUIRED",
      gateDisclosesNoAuthorityWhenAccepted: revealed.productionAuthority === false && revealed.implementedCapability === false && revealed.admittedCapability === false,
      brainCandidateNotNumbered: brainCandidate.isNumberedCapability === false,
      brainCandidateNotAmongCapabilities: capabilities.every(function (c) { return c.id !== brainCandidate.designation; }),
      brainCandidateNotAdmittedOrImplemented: brainCandidate.admissionStatus === "NOT_ADMITTED" && brainCandidate.implementationStatus === "NOT_IMPLEMENTED",
      domainDisclosurePresent: typeof DOMAIN_DISCLOSURE === "string" && DOMAIN_DISCLOSURE.length > 0
    };
    const allPassed = Object.values(checks).every(Boolean);
    return Object.freeze({ status: allPassed ? "PASS_SCS_ROADMAP_PREVIEW_READY" : "FAIL_CLOSED", classification: CLASSIFICATION, domain: DOMAIN, checks: checks });
  }

  window.AAB_CAP34_SCS_ROADMAP_PREVIEW = Object.freeze({
    CLASSIFICATION: CLASSIFICATION,
    DOMAIN: DOMAIN,
    SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION: SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION,
    DOMAIN_DISCLOSURE: DOMAIN_DISCLOSURE,
    MATURITY: MATURITY,
    capabilities: capabilities,
    brainCandidate: brainCandidate,
    revealPreview: revealPreview,
    runValidation: runValidation
  });
}());
