// SCS-CAP-08 package assembly: a pure function from what requestCompilation
// read in its snapshot to the package content (contract 4b1f05b, "Where each
// section comes from", and 901a600). No reads, no clock, no randomness: the
// same records always give the same content, and so the same packageDigest.
//
// Nothing that depends on when or by whom a package is compiled is content:
// packageId, compiledAt, the requester and the service are in the envelope's
// compilationMetadata, and the decision is packaged without its derived
// currency fields.

import { canonicalJson, sha256Hex } from "../../foundation/canonical.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import type {
  ScsDueDiligencePackage,
  ScsPackageBlockingGap,
  ScsPackageCustodyEvent,
  ScsPackageDeforestationEvidence,
  ScsPackageNonBlockingGap,
  ScsPackagePlot,
  ScsPackageProvenanceChain,
} from "../../types/cap-08.js";
import type { ScsRecordedReviewDecision } from "../../types/cap-09.js";
import type { CustodyRow, DeforestationRow, FrameworkRow, PartyRow, PlotRow } from "./store.js";

export const PACKAGE_SCHEMA_VERSION = "1";

/** compilationBasis.compilationVersion: the rules this code compiles by. */
export const COMPILATION_VERSION = "scs-cap08-pilot-1";

export const AUTHORITY_BOUNDARY: ScsDueDiligencePackage["authorityBoundary"] = {
  compiledNotSubmitted: true,
  operatorMustMakeDeclaration: true,
  noComplianceDetermination: true,
  doesNotGuaranteeRegulatoryAcceptance: true,
  legalResponsibilityRemainsWithOperator: true,
  sufficientEvidenceDoesNotMeanLegallyCompliant: true,
  gapsDisclosedNotResolved: true,
};

/** Section 8, always (contract 4b1f05b, "Package limitations"). */
export const PACKAGE_LIMITATIONS: readonly string[] = [
  "Spatial coverage and plot overlap are not evaluated in the pilot (no spatial database), so no evaluation can be SUFFICIENT.",
  "Every pilot plot is REGISTERED_WITH_GAPS.",
  "The reviewer's authority basis is recorded as declared, not verified.",
  "This package is in English only.",
  "The original evidence files are not included in the package; each is identified by its verified SHA-256, and the evidence export bundle that carries them is not yet implemented.",
];

/** "sha256:" + the SHA-256 of the canonical JSON of the package content. */
export function packageDigestOf(content: ScsDueDiligencePackage): string {
  return `sha256:${sha256Hex(canonicalJson(content))}`;
}

export interface AssemblyInput {
  readonly packageTitle: string | undefined;
  readonly framework: FrameworkRow;
  readonly operator: PartyRow;
  readonly plots: readonly PlotRow[];
  /** In manifest order. */
  readonly deforestation: readonly DeforestationRow[];
  /** In manifest order. */
  readonly custody: readonly CustodyRow[];
  readonly evaluation: ScsSufficiencyEvaluationResult;
  readonly evaluationSnapshotDigest: string;
  readonly evaluationReceiptDigest: string;
  readonly decision: ScsRecordedReviewDecision;
  readonly decisionReceiptDigest: string;
  /** Admission receipt id of each evidence item. */
  readonly admissionReceipts: ReadonlyMap<string, string>;
  /** The items whose cited file was re-hashed and matched. An item that cites no stored file is not in it. */
  readonly verifiedFiles: ReadonlySet<string>;
}

const opt = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } => (value === undefined ? {} : ({ [key]: value } as { [P in K]: V }));

export function assemblePackage(i: AssemblyInput): ScsDueDiligencePackage {
  const e = i.evaluation;
  const d = i.decision;

  const plots: ScsPackagePlot[] = i.plots.map((p) => ({
    plotId: p.plotId,
    plotVersion: p.evaluatedVersion,
    ...opt("plotName", p.plotName),
    countryCode: p.countryCode,
    ...opt("administrativeAreas", p.administrativeAreas === undefined ? undefined : [...p.administrativeAreas]),
    geometryCaptureMethod: p.captureMethod,
    ...opt("positionalAccuracyMetres", p.positionalAccuracyMetres),
    registryVerificationStatus: p.registryVerificationStatus,
    overlapState: p.overlapState,
    tenureClaims: p.tenureClaims.map((t) => ({ ...t, limitations: [...t.limitations] })),
    frameworkAssociationId: p.associationId!,
    registrationStatus: p.registrationStatus,
    plotGaps: [
      {
        gapType: "OVERLAP_NOT_EVALUATED",
        explanation: `Plot overlap is not evaluated in the pilot (no spatial database); the plot's recorded overlap state is ${p.overlapState}.`,
      },
      ...p.evidenceLimitations.map((l) => ({ gapType: "PLOT_EVIDENCE_LIMITATION", explanation: l })),
      ...e.allGaps.filter((g) => g.subject.plotId === p.plotId).map((g) => ({ gapType: g.gapType, explanation: g.explanation })),
    ],
  }));

  const deforestationEvidence: ScsPackageDeforestationEvidence[] = i.deforestation.map((r) => ({
    evidenceId: r.evidenceId,
    evidenceVersion: r.evidenceVersion,
    evidenceType: r.evidenceType,
    plotId: r.plotId,
    source: {
      sourceOrganizationId: r.sourceOrganizationId,
      ...opt("sourceTitle", r.sourceTitle),
      ...opt("providerName", r.providerName),
      sourceReference: r.sourceReference,
      ...opt("issuingAuthority", r.issuingAuthority),
    },
    provenance: {
      submittedBy: r.submittedBy,
      submittedAt: r.submittedAt,
      contentDigest: r.contentDigest,
      integrityStatus: r.integrityStatus,
      chainOfCustodyComplete: r.chainOfCustodyComplete,
    },
    temporalCoverage: {
      ...opt("acquisitionInstant", r.acquisitionInstant),
      ...opt("acquisitionStart", r.acquisitionStart),
      ...opt("acquisitionEnd", r.acquisitionEnd),
      ...opt("analysisPeriodStart", r.analysisPeriodStart),
      ...opt("analysisPeriodEnd", r.analysisPeriodEnd),
      ...opt("attestedPeriodStart", r.attestedPeriodStart),
      ...opt("attestedPeriodEnd", r.attestedPeriodEnd),
      coverageMode: r.coverageMode,
      knownGapPeriods: r.knownGapPeriods.map((g) => ({ ...g })),
    },
    // as SCS-CAP-04 recorded it; the declared plotCoveragePercent is left out (contract 901a600)
    spatialCoverage: {
      intersectionWithPlot: r.intersectionWithPlot,
      ...opt("spatialResolutionMetres", r.spatialResolutionMetres),
      excludedAreaIds: [...r.excludedAreaIds],
    },
    evidenceClaim: {
      claimType: r.claimType,
      claimSummary: r.claimSummary,
      ...opt("claimedPeriodStart", r.claimedPeriodStart),
      ...opt("claimedPeriodEnd", r.claimedPeriodEnd),
      confidence: r.claimConfidence,
      limitations: [...r.claimLimitations],
    },
    admissionStatus: r.admissionStatus,
    admissionLimitations: [...r.admissionLimitations],
  }));

  const custodyEvidence: ScsPackageCustodyEvent[] = i.custody.map((c) => ({
    eventId: c.eventId,
    eventVersion: c.eventVersion,
    eventType: c.eventType,
    batchIdentifier: c.batchIdentifier,
    commodityCode: c.commodityCode,
    sourcePartyId: c.sourcePartyId,
    destinationPartyId: c.destinationPartyId,
    eventDate: c.eventDate,
    timePrecision: c.timePrecision,
    ...(c.quantityAmount === undefined || c.quantityUnit === undefined || c.quantityMeasurementMethod === undefined
      ? {}
      : { quantity: { amount: c.quantityAmount, unit: c.quantityUnit, measurementMethod: c.quantityMeasurementMethod } }),
    supportingDocument: { documentType: c.documentType, documentReference: c.documentReference, contentDigest: c.contentDigest },
    provenance: { submittedBy: c.submittedBy, submittedAt: c.submittedAt, integrityStatus: c.integrityStatus, chainOfCustodyComplete: c.chainOfCustodyComplete },
    sourcePlotIds: [...c.sourcePlotIds],
    links: c.links.map((l) => ({ linkType: l.linkType, citedEventId: l.citedEventId, ...opt("linkedEventId", l.linkedEventId ?? undefined) })),
    uncertainties: [...c.uncertainties],
    contradictions: [...c.contradictions],
    admissionStatus: c.admissionStatus,
    admissionLimitations: [...c.admissionLimitations],
  }));

  // Section 7: every gap, with the reviewer's assessment verbatim
  const assessment = new Map(d.reviewReasoning.gapsConsidered.map((g) => [g.gapId, g.assessment]));
  const blockingGaps: ScsPackageBlockingGap[] = [];
  const nonBlockingGaps: ScsPackageNonBlockingGap[] = [];
  for (const g of e.allGaps) {
    const reviewerAssessment = assessment.get(g.gapId);
    // SCS-CAP-09 records a decision only when every gap is addressed
    if (reviewerAssessment === undefined) throw new Error(`decision ${d.decisionId} does not address gap ${g.gapId}`);
    const base = { gapId: g.gapId, requirementCode: g.requirementCode, gapType: g.gapType, explanation: g.explanation, reviewerAssessment };
    if (g.automaticFailure || g.humanDecisionRequired) blockingGaps.push({ ...base, humanDecisionMade: true, humanDecisionId: d.decisionId });
    else nonBlockingGaps.push(base);
  }

  const provenance: ScsPackageProvenanceChain[] = [
    ...i.deforestation.map((r) => ({ evidenceId: r.evidenceId, evidenceKind: "DEFORESTATION" as const, admissionReceiptId: i.admissionReceipts.get(r.evidenceId)!, contentDigest: r.contentDigest, fileSha256Verified: i.verifiedFiles.has(r.evidenceId) })),
    ...i.custody.map((c) => ({ evidenceId: c.eventId, evidenceKind: "CUSTODY" as const, admissionReceiptId: i.admissionReceipts.get(c.eventId)!, contentDigest: c.contentDigest, fileSha256Verified: i.verifiedFiles.has(c.eventId) })),
  ];

  return {
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    ...opt("packageTitle", i.packageTitle),
    compilationBasis: {
      reviewDecisionId: d.decisionId,
      evaluationId: e.evaluationId,
      frameworkId: e.frameworkId,
      frameworkVersion: e.frameworkVersion,
      evidenceRequirementSpecId: e.evidenceRequirementSpecId,
      compilationVersion: COMPILATION_VERSION,
    },
    regulatoryFramework: {
      frameworkId: i.framework.frameworkId,
      frameworkVersion: i.framework.regulationVersion,
      regulationName: i.framework.regulationName,
      regulationVersion: i.framework.regulationVersion,
      regulatoryAuthority: i.framework.regulatoryAuthority,
      commodityCode: i.framework.commodityCode,
      commodityName: i.framework.commodityName,
      countryOfOrigin: i.framework.countryOfOrigin,
      destinationMarket: i.framework.destinationMarket,
      applicableNationalLaws: [...i.framework.applicableNationalLaws],
      evidenceRequirementSpecId: i.framework.evidenceSpecId,
      frameworkRegisteredAt: i.framework.registeredAt,
    },
    operator: {
      operatorId: i.operator.partyId,
      operatorName: i.operator.partyName,
      operatorOrganizationType: i.operator.partyType,
      countryOfRegistration: i.operator.countryOfRegistration,
      ...opt("countryOfOperation", i.operator.countryOfOperation),
    },
    plots,
    deforestationEvidence,
    custodyEvidence,
    sufficiencyEvaluation: {
      evaluationId: e.evaluationId,
      evaluationSnapshotDigest: i.evaluationSnapshotDigest,
      evaluationReceiptDigest: i.evaluationReceiptDigest,
      result: e,
    },
    reviewDecision: {
      decisionId: d.decisionId,
      decision: d,
      decisionReceiptDigest: i.decisionReceiptDigest,
      currencyStatusAtCompilation: "CURRENT",
      recordValidityAtCompilation: "VALID",
    },
    gapDisclosure: {
      totalGapsIdentified: e.allGaps.length,
      blockingGaps,
      nonBlockingGaps,
      gapDisclosureStatement:
        `${e.allGaps.length} gaps were identified: ${blockingGaps.length} blocking and ${nonBlockingGaps.length} non-blocking. ` +
        `Each was addressed by human review decision ${d.decisionId}, whose assessment is recorded with the gap. This package discloses the gaps; it does not resolve them.`,
    },
    packageLimitations: [...PACKAGE_LIMITATIONS],
    authorityBoundary: AUTHORITY_BOUNDARY,
    challengeResponseMetadata: {
      allEvidenceIds: [...i.deforestation.map((r) => r.evidenceId), ...i.custody.map((c) => c.eventId)],
      allProvenanceChains: provenance,
      retrievableViaCapability: "SCS-CAP-10",
    },
  };
}
