// SCS-CAP-08 package template for SCS-PLATFORM-02: the stored package
// envelope, laid out as blocks. It presents the package and adds nothing but
// headings, labels and the notices PLATFORM-02 requires. Sections 7 (gap
// disclosure), 8 (limitations) and 9 (authority boundary) are mandatory: every
// entry is rendered on its own, never summarised.

import type { Block, RenditionDocument } from "../../platform/renditions/renderer.js";
import { RENDERER_BASE_VERSION } from "../../platform/renditions/renderer.js";
import type { ScsDueDiligencePackageEnvelope } from "../../types/cap-08.js";

export const TEMPLATE_VERSION = "scs-cap08-package@1";
export const RENDERER_VERSION = `${RENDERER_BASE_VERSION};${TEMPLATE_VERSION}`;

export const FIRST_PAGE_NOTICE =
  "Compiled, not submitted. This package is the governed evidence record that supports a due diligence statement. It is not a compliance " +
  "certificate, not a legal declaration and not a submission to any authority. The operator makes their own declaration, and legal " +
  "responsibility remains with the operator.";

export const FOOTER_NOTICE = "Presentation of a governed record. Not the record. Verify against the digest.";

const list = (xs: readonly string[] | undefined) => (xs === undefined || xs.length === 0 ? "none" : xs.join("; "));
const yes = (b: boolean) => (b ? "yes" : "no");

export function packageDocument(env: ScsDueDiligencePackageEnvelope): RenditionDocument {
  const p = env.package;
  const m = env.compilationMetadata;
  const e = p.sufficiencyEvaluation.result;
  const d = p.reviewDecision.decision;
  const b: Block[] = [];
  const field = (label: string, value: string | number | boolean | undefined) => {
    if (value !== undefined) b.push({ kind: "field", label, value: typeof value === "boolean" ? yes(value) : String(value) });
  };

  b.push({ kind: "title", text: p.packageTitle ?? "Due diligence package" });
  b.push({ kind: "notice", text: FIRST_PAGE_NOTICE });
  field("Package", m.packageId);
  field("Package digest", env.packageDigest);
  field("Compiled at", m.compiledAt);
  field("Requested by", m.requestedByActorId);
  field("Compiled by", m.compiledByServiceIdentity);
  field("Review decision", p.compilationBasis.reviewDecisionId);
  field("Evaluation", p.compilationBasis.evaluationId);
  field("Compilation version", p.compilationBasis.compilationVersion);

  b.push({ kind: "heading", text: "1. Regulatory framework" });
  const f = p.regulatoryFramework;
  field("Framework", `${f.frameworkId} (version ${f.frameworkVersion})`);
  field("Regulation", `${f.regulationName}, ${f.regulationVersion}`);
  field("Regulatory authority", f.regulatoryAuthority);
  field("Commodity", `${f.commodityCode} ${f.commodityName}`);
  field("Country of origin", f.countryOfOrigin);
  field("Destination market", f.destinationMarket);
  field("Applicable national laws", list(f.applicableNationalLaws));
  field("Evidence requirement specification", f.evidenceRequirementSpecId);
  field("Framework registered at", f.frameworkRegisteredAt);

  b.push({ kind: "heading", text: "2. Operator" });
  field("Operator", `${p.operator.operatorName} (${p.operator.operatorId})`);
  field("Organisation type", p.operator.operatorOrganizationType);
  field("Country of registration", p.operator.countryOfRegistration);
  field("Country of operation", p.operator.countryOfOperation);

  b.push({ kind: "heading", text: "3. Plots" });
  for (const pl of p.plots) {
    b.push({ kind: "subheading", text: `Plot ${pl.plotId} (version ${pl.plotVersion})${pl.plotName === undefined ? "" : `: ${pl.plotName}`}` });
    field("Country", pl.countryCode);
    field("Administrative areas", pl.administrativeAreas === undefined ? undefined : list(pl.administrativeAreas));
    field("Geometry capture method", pl.geometryCaptureMethod);
    field("Positional accuracy (m)", pl.positionalAccuracyMetres);
    field("Registry verification", pl.registryVerificationStatus);
    field("Overlap", pl.overlapState);
    field("Registration status", pl.registrationStatus);
    field("Framework association", pl.frameworkAssociationId);
    for (const t of pl.tenureClaims) {
      b.push({ kind: "item", text: `Tenure claim ${t.tenureClaimId}: ${t.claimantType}, ${t.tenureBasis}, ${t.verificationStatus}; limitations: ${list(t.limitations)}` });
    }
    for (const g of pl.plotGaps) b.push({ kind: "item", text: `Plot gap ${g.gapType}: ${g.explanation}` });
  }

  b.push({ kind: "heading", text: "4. Deforestation evidence" });
  if (p.deforestationEvidence.length === 0) b.push({ kind: "text", text: "None in the evaluated scope." });
  for (const r of p.deforestationEvidence) {
    b.push({ kind: "subheading", text: `Evidence ${r.evidenceId} (version ${r.evidenceVersion}), plot ${r.plotId}` });
    field("Type", r.evidenceType);
    field("Source", `${r.source.sourceOrganizationId}; ${r.source.sourceReference}`);
    field("Source title", r.source.sourceTitle);
    field("Provider", r.source.providerName);
    field("Issuing authority", r.source.issuingAuthority);
    field("Submitted", `${r.provenance.submittedBy} at ${r.provenance.submittedAt}`);
    field("Content digest", r.provenance.contentDigest);
    field("Integrity", r.provenance.integrityStatus);
    field("Chain of custody complete", r.provenance.chainOfCustodyComplete);
    const t = r.temporalCoverage;
    field("Acquisition", t.acquisitionInstant ?? (t.acquisitionStart === undefined ? undefined : `${t.acquisitionStart} to ${t.acquisitionEnd}`));
    field("Analysis period", t.analysisPeriodStart === undefined ? undefined : `${t.analysisPeriodStart} to ${t.analysisPeriodEnd}`);
    field("Attested period", t.attestedPeriodStart === undefined ? undefined : `${t.attestedPeriodStart} to ${t.attestedPeriodEnd}`);
    field("Coverage mode", t.coverageMode);
    for (const g of t.knownGapPeriods) b.push({ kind: "item", text: `Known gap ${g.start} to ${g.end}: ${g.reason}` });
    field("Intersection with plot", r.spatialCoverage.intersectionWithPlot);
    field("Spatial resolution (m)", r.spatialCoverage.spatialResolutionMetres);
    field("Excluded areas", list(r.spatialCoverage.excludedAreaIds));
    field("Claim", `${r.evidenceClaim.claimType} (${r.evidenceClaim.confidence}): ${r.evidenceClaim.claimSummary}`);
    field("Claimed period", r.evidenceClaim.claimedPeriodStart === undefined ? undefined : `${r.evidenceClaim.claimedPeriodStart} to ${r.evidenceClaim.claimedPeriodEnd}`);
    field("Source limitations", list(r.evidenceClaim.limitations));
    field("Admission", r.admissionStatus);
    field("Admission limitations", list(r.admissionLimitations));
  }

  b.push({ kind: "heading", text: "4b. Custody events" });
  if (p.custodyEvidence.length === 0) b.push({ kind: "text", text: "None in the evaluated scope." });
  for (const c of p.custodyEvidence) {
    b.push({ kind: "subheading", text: `Event ${c.eventId} (version ${c.eventVersion}): ${c.eventType}, batch ${c.batchIdentifier}` });
    field("Commodity", c.commodityCode);
    field("From", c.sourcePartyId);
    field("To", c.destinationPartyId);
    field("Date", `${c.eventDate} (${c.timePrecision})`);
    field("Quantity", c.quantity === undefined ? undefined : `${c.quantity.amount} ${c.quantity.unit} (${c.quantity.measurementMethod})`);
    field("Document", `${c.supportingDocument.documentType}, ${c.supportingDocument.documentReference}; digest ${c.supportingDocument.contentDigest}`);
    field("Submitted", `${c.provenance.submittedBy} at ${c.provenance.submittedAt}`);
    field("Integrity", c.provenance.integrityStatus);
    field("Chain of custody complete", c.provenance.chainOfCustodyComplete);
    field("Source plots", list(c.sourcePlotIds));
    for (const l of c.links) b.push({ kind: "item", text: `Link ${l.linkType}: ${l.citedEventId}${l.linkedEventId === undefined ? " (not resolved)" : ""}` });
    field("Uncertainties", list(c.uncertainties));
    field("Contradictions", list(c.contradictions));
    field("Admission", c.admissionStatus);
    field("Admission limitations", list(c.admissionLimitations));
  }

  b.push({ kind: "heading", text: "5. Sufficiency evaluation" });
  field("Evaluation", `${e.evaluationId}, evaluated at ${e.evaluatedAt}`);
  field("Overall state", e.overallState);
  field("Evidence gaps", e.hasEvidenceGaps);
  field("Material unresolved conflicts", e.hasMaterialUnresolvedConflicts);
  field("Evidence cut-off", e.evidenceCutoffAt);
  field("Evaluation digest", p.sufficiencyEvaluation.evaluationSnapshotDigest);
  field("Evaluation receipt digest", p.sufficiencyEvaluation.evaluationReceiptDigest);
  for (const x of e.evaluationExplanation) b.push({ kind: "item", text: x });
  b.push({ kind: "subheading", text: "Requirement evaluations" });
  for (const r of e.requirementEvaluations) b.push({ kind: "item", text: `${r.requirementCode}: ${r.state}. ${r.evaluationExplanation}` });
  b.push({ kind: "subheading", text: "Conflicts" });
  if (e.allConflicts.length === 0) b.push({ kind: "text", text: "None." });
  for (const c of e.allConflicts) b.push({ kind: "item", text: `${c.conflictKey} (${c.conflictType}, ${c.resolutionStatus}): ${c.explanation}` });

  b.push({ kind: "heading", text: "6. Human review decision" });
  field("Decision", `${d.decisionId}: ${d.decisionOutcome}`);
  field("Decided at", d.decidedAt);
  field("Reviewer", `${d.reviewer.reviewerName} (${d.reviewer.reviewerId}), ${d.reviewer.reviewerRoleReference}`);
  field("Reviewer organisation", d.reviewer.reviewerOrganizationId);
  field("Authority basis (declared, not verified)", d.reviewer.authorityBasis);
  field("Role checked at", d.reviewer.authorityVerifiedAt);
  field("Currency at compilation", p.reviewDecision.currencyStatusAtCompilation);
  field("Record validity at compilation", p.reviewDecision.recordValidityAtCompilation);
  field("Decision receipt digest", p.reviewDecision.decisionReceiptDigest);
  field("Evaluation summary assessed", d.reviewReasoning.evaluationSummaryAssessed);
  for (const c of d.reviewReasoning.conflictsConsidered) b.push({ kind: "item", text: `Conflict ${c.conflictKey}: ${c.assessment}` });
  field("Limitations acknowledged", list(d.reviewReasoning.limitationsAcknowledged));
  field("Basis for outcome", d.reviewReasoning.basisForOutcome);
  field("Remaining concerns", list(d.reviewReasoning.remainingConcerns));
  field("Conditions", list(d.reviewReasoning.conditionsIfAny));
  if (d.supersedes !== undefined) field("Supersedes", `${d.supersedes.priorDecisionId}: ${d.supersedes.supersessionReason}`);
  b.push({ kind: "subheading", text: "Decision reasons" });
  for (const r of d.decisionReasons) b.push({ kind: "item", text: r });

  // ── Mandatory sections: every entry on its own ────────────────────────────
  b.push({ kind: "heading", text: "7. Gap disclosure" });
  b.push({ kind: "text", text: p.gapDisclosure.gapDisclosureStatement });
  b.push({ kind: "subheading", text: `Blocking gaps (${p.gapDisclosure.blockingGaps.length})` });
  for (const g of p.gapDisclosure.blockingGaps) {
    b.push({ kind: "item", text: `${g.gapId}, ${g.requirementCode} ${g.gapType}: ${g.explanation}` });
    b.push({ kind: "field", label: "Reviewer's assessment", value: `${g.reviewerAssessment} (decision ${g.humanDecisionId ?? "none"})` });
  }
  b.push({ kind: "subheading", text: `Non-blocking gaps (${p.gapDisclosure.nonBlockingGaps.length})` });
  for (const g of p.gapDisclosure.nonBlockingGaps) {
    b.push({ kind: "item", text: `${g.gapId}, ${g.requirementCode} ${g.gapType}: ${g.explanation}` });
    b.push({ kind: "field", label: "Reviewer's assessment", value: g.reviewerAssessment });
  }

  b.push({ kind: "heading", text: "8. Package limitations" });
  for (const l of p.packageLimitations) b.push({ kind: "item", text: l });

  b.push({ kind: "heading", text: "9. Authority boundary" });
  for (const [k, v] of Object.entries(p.authorityBoundary)) b.push({ kind: "item", text: `${k}: ${String(v)}` });

  b.push({ kind: "heading", text: "10. Challenge response support" });
  field("Retrievable via", p.challengeResponseMetadata.retrievableViaCapability);
  for (const c of p.challengeResponseMetadata.allProvenanceChains) {
    b.push({ kind: "item", text: `${c.evidenceKind} ${c.evidenceId}: admission receipt ${c.admissionReceiptId}; digest ${c.contentDigest}; file verified: ${yes(c.fileSha256Verified)}` });
  }

  return {
    title: `Due diligence package ${m.packageId}`,
    date: new Date(m.compiledAt),
    blocks: b,
    footer: (page, count) => [
      `SCS-CAP-08 due diligence package ${m.packageId} · Page ${page} of ${count}`,
      `Package digest: ${env.packageDigest}`,
      FOOTER_NOTICE,
    ],
  };
}
