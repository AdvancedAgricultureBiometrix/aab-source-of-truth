// SCS-CAP-04 submitEvidence — POST /scs/v1/deforestation-evidence.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against evidence-submission-request.schema.json (enumerations —
// including the DETECTED-only claim vocabulary; required, non-blank source
// fields; ids lowercase UUIDs; digests lowercase hex; no system-set field
// accepted), checked the Idempotency-Key and opened the transaction (ctx.tx).
// Everything below runs in that one transaction.
//
// Failure checks, in the contract's order (5c6a263, "Checks and the
// decision"); each is FAIL_CLOSED and writes nothing:
//   1. authority     — COMPLIANCE_OFFICER only → SUBMITTER_NOT_AUTHORISED (403)
//   2. request rules — attestation details need attestationProvided
//                      → REQUEST_VALIDATION_FAILED (400)
//   3. dates         — TEMPORAL_DATES_INCONSISTENT (400), naming every problem
//   4. geometry      — coverage and excluded areas, EPSG:4326, validated like
//                      a plot geometry without the plot area rule
//                      → COVERAGE_GEOMETRY_INVALID (422)
//   5. plot and association — PLOT_NOT_FOUND, PLOT_RETIRED,
//                      FRAMEWORK_ASSOCIATION_NOT_FOUND,
//                      FRAMEWORK_ASSOCIATION_NOT_ACTIVE
//   6. object and integrity — EVIDENCE_OBJECT_NOT_FOUND, OBJECT_INTEGRITY_FAILED
//   7. relation to the plot — bounding boxes → EVIDENCE_NOT_RELATED_TO_PLOT
//   8. evidence type — EVIDENCE_TYPE_INCOMPATIBLE
//   9. parties       — ATTESTING_PARTY_NOT_FOUND, ANALYST_PARTY_NOT_FOUND, PARTY_RETIRED
//
// Everything else is admitted, each shortfall recorded as a limitation code
// and in prose. Spatial coverage is never verified and temporal completeness
// never evaluated at admission, so every pilot admission is
// ADMITTED_WITH_LIMITATIONS.
//
// Written: the evidence record (intersectionWithPlot NOT_VERIFIED), its known
// gaps, excluded areas and lineage, and the decision's receipt
// (DEFORESTATION_EVIDENCE_ADMISSION).

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsDeforestationEvidenceAdmissionDecision,
  ScsDeforestationEvidenceAdmissionReceipt,
  ScsDeforestationEvidenceAdmissionResponse,
  ScsDeforestationEvidenceLimitationCode,
  ScsDeforestationEvidenceSubmissionRequest,
  ScsEvidenceAdmissionChecks,
} from "../../types/cap-04.js";
import { boundingBox, boxesIntersect, validateGeometry } from "../cap-03/geometry.js";
import { CAPABILITY_ID, cap04Failure } from "./errors.js";
import { type LineageType, databaseNow, findAssociation, findEvidenceForPlot, findParties, findPlot, insertEvidence, objectExists } from "./store.js";

/** The only role that may submit deforestation evidence (contract 5c6a263). Mandate-based submission is a contract gap. */
export const SUBMITTER_ROLE = "COMPLIANCE_OFFICER";

/** The only coordinate reference system accepted: WGS 84. */
export const SUPPORTED_CRS = "EPSG:4326";

/** ScsDeforestationEvidenceRecord.schemaVersion written by this implementation. */
export const EVIDENCE_SCHEMA_VERSION = "1";

/** The contract's evidenceType values: the only vocabulary acceptedSourceTypes can be matched against. */
export const EVIDENCE_TYPES: readonly string[] = [
  "SATELLITE_IMAGE",
  "REMOTE_SENSING_ANALYSIS",
  "LAND_COVER_DATA_PRODUCT",
  "FORESTRY_AUTHORITY_CERTIFICATE",
  "GOVERNMENT_RECORD",
  "FIELD_VERIFICATION",
  "EXPERT_ASSESSMENT",
  "OTHER",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The contract's limitation codes, in its order: recorded codes are reported in this order. */
const LIMITATION_ORDER: readonly ScsDeforestationEvidenceLimitationCode[] = [
  "SPATIAL_COVERAGE_NOT_VERIFIED",
  "TEMPORAL_COVERAGE_NOT_EVALUATED",
  "INTEGRITY_UNVERIFIED",
  "ATTESTATION_EXCEEDS_ANALYSIS",
  "PROVENANCE_INCOMPLETE",
  "CHAIN_OF_CUSTODY_INCOMPLETE",
  "RESOLUTION_BELOW_REQUIREMENT",
  "RECENCY_BELOW_REQUIREMENT",
  "RECENCY_NOT_EVALUATED",
  "AUTHORITY_CONFIRMATION_MISSING",
  "SOURCE_TYPE_VOCABULARY_UNKNOWN",
];

type Temporal = ScsDeforestationEvidenceSubmissionRequest["temporalCoverage"];

/** Every date inconsistency in the request (contract "Dates"), each naming its JSON pointer. */
export function dateProblems(req: ScsDeforestationEvidenceSubmissionRequest, now: Date): string[] {
  const problems: string[] = [];
  const t = req.temporalCoverage;
  const ms = (v: string | undefined) => (v === undefined ? undefined : Date.parse(v));

  const pairs: Array<[string, string | undefined, string, string | undefined]> = [
    ["/temporalCoverage/acquisitionStart", t.acquisitionStart, "/temporalCoverage/acquisitionEnd", t.acquisitionEnd],
    ["/temporalCoverage/analysisPeriodStart", t.analysisPeriodStart, "/temporalCoverage/analysisPeriodEnd", t.analysisPeriodEnd],
    ["/temporalCoverage/attestedPeriodStart", t.attestedPeriodStart, "/temporalCoverage/attestedPeriodEnd", t.attestedPeriodEnd],
    ["/evidenceClaim/claimedPeriodStart", req.evidenceClaim.claimedPeriodStart, "/evidenceClaim/claimedPeriodEnd", req.evidenceClaim.claimedPeriodEnd],
    [
      "/coverageAttestation/declaredCoverageStart",
      req.coverageAttestation.declaredCoverageStart,
      "/coverageAttestation/declaredCoverageEnd",
      req.coverageAttestation.declaredCoverageEnd,
    ],
    ...t.knownGapPeriods.map((g, i): [string, string, string, string] => [`/temporalCoverage/knownGapPeriods/${i}/start`, g.start, `/temporalCoverage/knownGapPeriods/${i}/end`, g.end]),
  ];
  for (const [startAt, start, endAt, end] of pairs) {
    if (start !== undefined && end !== undefined && ms(start)! > ms(end)!) problems.push(`${startAt} (${start}) is after ${endAt} (${end}).`);
  }

  if (t.coverageMode === "POINT_IN_TIME" && t.acquisitionInstant === undefined) {
    problems.push("/temporalCoverage/acquisitionInstant: required when coverageMode is POINT_IN_TIME.");
  }
  if (t.acquisitionInstant !== undefined && (t.acquisitionStart !== undefined || t.acquisitionEnd !== undefined)) {
    problems.push("/temporalCoverage/acquisitionInstant: an acquisition instant cannot be given together with acquisitionStart or acquisitionEnd.");
  }

  const dated: Array<[string, string | undefined]> = [
    ...pairs.flatMap(([sa, s, ea, e]): Array<[string, string | undefined]> => [[sa, s], [ea, e]]),
    ["/temporalCoverage/acquisitionInstant", t.acquisitionInstant],
    ["/coverageAttestation/attestedAt", req.coverageAttestation.attestedAt],
  ];
  for (const [at, v] of dated) {
    if (v !== undefined && ms(v)! > now.getTime()) problems.push(`${at} (${v}) is in the future (database time ${now.toISOString()}).`);
  }

  // A gap must lie within a window that has both bounds: the acquisition
  // window (start–end, or the instant) or the analysis window.
  const windows = gapWindows(t);
  t.knownGapPeriods.forEach((g, i) => {
    const s = ms(g.start)!;
    const e = ms(g.end)!;
    if (!windows.some((w) => w.start <= s && e <= w.end)) {
      problems.push(
        windows.length === 0
          ? `/temporalCoverage/knownGapPeriods/${i}: a known gap needs an acquisition or analysis window with both a start and an end to lie within; none is given.`
          : `/temporalCoverage/knownGapPeriods/${i} (${g.start} to ${g.end}) does not lie within the acquisition window or the analysis window.`,
      );
    }
  });
  return problems;
}

function gapWindows(t: Temporal): Array<{ start: number; end: number }> {
  const windows: Array<{ start: number; end: number }> = [];
  if (t.acquisitionInstant !== undefined) windows.push({ start: Date.parse(t.acquisitionInstant), end: Date.parse(t.acquisitionInstant) });
  if (t.acquisitionStart !== undefined && t.acquisitionEnd !== undefined) windows.push({ start: Date.parse(t.acquisitionStart), end: Date.parse(t.acquisitionEnd) });
  if (t.analysisPeriodStart !== undefined && t.analysisPeriodEnd !== undefined) windows.push({ start: Date.parse(t.analysisPeriodStart), end: Date.parse(t.analysisPeriodEnd) });
  return windows;
}

/**
 * How each attested period exceeds the analysis period (contract
 * "Attestation"); empty if none does. Only the bounds an attested period
 * states are compared. With no analysis period at all, an attested period is
 * supported by no analysis and exceeds it — except under AUTHORITY_ATTESTATION,
 * which the contract exempts. With only one analysis bound, an attested bound
 * on the missing side is not supported.
 */
export function attestationExcesses(req: ScsDeforestationEvidenceSubmissionRequest): string[] {
  const t = req.temporalCoverage;
  const a = req.coverageAttestation;
  const periods: Array<[string, string | undefined, string | undefined]> = [
    ["The attested period (temporalCoverage.attestedPeriodStart–attestedPeriodEnd)", t.attestedPeriodStart, t.attestedPeriodEnd],
  ];
  if (a.attestationProvided) periods.push(["The attestation's declared coverage (coverageAttestation.declaredCoverageStart–declaredCoverageEnd)", a.declaredCoverageStart, a.declaredCoverageEnd]);
  const noAnalysis = t.analysisPeriodStart === undefined && t.analysisPeriodEnd === undefined;
  if (noAnalysis && t.coverageMode === "AUTHORITY_ATTESTATION") return [];

  const out: string[] = [];
  for (const [label, start, end] of periods) {
    if (start === undefined && end === undefined) continue;
    const shown = `${start ?? "…"} to ${end ?? "…"}`;
    if (noAnalysis) {
      out.push(`${label}, ${shown}, is not supported by any analysis period: none is given.`);
      continue;
    }
    const before = start !== undefined && (t.analysisPeriodStart === undefined || Date.parse(start) < Date.parse(t.analysisPeriodStart));
    const after = end !== undefined && (t.analysisPeriodEnd === undefined || Date.parse(end) > Date.parse(t.analysisPeriodEnd));
    if (before || after) {
      out.push(
        `${label}, ${shown}, extends beyond the analysis period (${t.analysisPeriodStart ?? "…"} to ${t.analysisPeriodEnd ?? "…"})` +
          `${before ? ", beginning before it" : ""}${after ? ", ending after it" : ""}. Both periods are recorded; SCS-CAP-06 decides whether the difference matters.`,
      );
    }
  }
  return out;
}

export async function submitEvidence(ctx: RouteContext<ScsDeforestationEvidenceSubmissionRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const req = ctx.body;
  const { temporalCoverage: t, spatialCoverage: sc, evidenceObject: o, coverageAttestation: att } = req;
  const method = req.analyticalMethod;

  // 1. Authority
  if (!holdsRole(actor, SUBMITTER_ROLE)) {
    throw cap04Failure("SUBMITTER_NOT_AUTHORISED", [`Submitting deforestation evidence requires the ${SUBMITTER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. Request rules that span fields
  if (!att.attestationProvided) {
    const given = (["attestingPartyId", "attestingRole", "authorityBasis", "attestedAt", "declaredCoverageStart", "declaredCoverageEnd", "declarationTextReference"] as const).filter(
      (k) => att[k] !== undefined,
    );
    if (given.length > 0) {
      throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", given.map((k) => `/coverageAttestation/${k}: not allowed when attestationProvided is false.`));
    }
  }

  // 3. Dates, against the database clock
  const now = await databaseNow(tx);
  const dates = dateProblems(req, now);
  if (dates.length > 0) throw cap04Failure("TEMPORAL_DATES_INCONSISTENT", dates);

  // 4. Coverage and excluded area geometries
  const geometries = [
    { base: "/spatialCoverage/coverageGeometry", g: sc.coverageGeometry },
    ...(sc.excludedAreas ?? []).map((a, i) => ({ base: `/spatialCoverage/excludedAreas/${i}/geometry`, g: a.geometry })),
  ];
  const geometryProblems = geometries.flatMap(({ base, g }) => [
    ...(g.coordinateReferenceSystem === SUPPORTED_CRS ? [] : [`${base}/coordinateReferenceSystem: "${g.coordinateReferenceSystem}" is not supported; only ${SUPPORTED_CRS} (WGS 84) is accepted.`]),
    ...validateGeometry(g.geometryType, g.coordinates, undefined, { base, areaRule: false }),
  ]);
  if (geometryProblems.length > 0) throw cap04Failure("COVERAGE_GEOMETRY_INVALID", geometryProblems);

  // 5. Plot and framework association
  const plot = await findPlot(tx, req.plotId);
  if (plot === null) throw cap04Failure("PLOT_NOT_FOUND", [`No SCS-CAP-03 plot is registered with plotId ${req.plotId}.`]);
  if (plot.registrationStatus === "RETIRED") throw cap04Failure("PLOT_RETIRED", [`Plot ${plot.plotId} is RETIRED; evidence cannot be admitted for it.`]);
  const association = await findAssociation(tx, req.frameworkAssociationId);
  if (association === null || association.plotId !== plot.plotId) {
    throw cap04Failure("FRAMEWORK_ASSOCIATION_NOT_FOUND", [`Plot ${plot.plotId} has no framework association ${req.frameworkAssociationId}.`]);
  }
  const inactive = [
    ...(association.lifecycleStatus === "ACTIVE" ? [] : [`Framework association ${association.associationId} is ${association.lifecycleStatus}; only an ACTIVE association accepts evidence.`]),
    ...(association.frameworkStatus === "ACTIVE" ? [] : [`Framework ${association.frameworkId} of association ${association.associationId} is ${association.frameworkStatus}; it must be ACTIVE.`]),
  ];
  if (inactive.length > 0) throw cap04Failure("FRAMEWORK_ASSOCIATION_NOT_ACTIVE", inactive);

  // 6. Evidence object and integrity
  const codes: ScsDeforestationEvidenceLimitationCode[] = [];
  const limitations: string[] = [];
  const limit = (code: ScsDeforestationEvidenceLimitationCode, ...prose: string[]) => {
    if (!codes.includes(code)) codes.push(code);
    limitations.push(...prose);
  };
  let integrityStatus: "VERIFIED" | "UNVERIFIED";
  if (o.objectId !== undefined) {
    if (!(await objectExists(tx, o.objectId))) {
      throw cap04Failure("EVIDENCE_OBJECT_NOT_FOUND", [`/evidenceObject/objectId: the SCS evidence object store holds no object ${o.objectId}.`]);
    }
    if (o.contentDigest !== o.objectId) {
      throw cap04Failure("OBJECT_INTEGRITY_FAILED", [
        `/evidenceObject/contentDigest: the declared SHA-256 ${o.contentDigest} does not match the stored object's SHA-256 ${o.objectId}.`,
      ]);
    }
    integrityStatus = "VERIFIED";
  } else {
    if (association.integrityRequirement === "VERIFIED") {
      throw cap04Failure("OBJECT_INTEGRITY_FAILED", [
        `Framework ${association.frameworkId}'s evidence requirement specification ${association.evidenceRequirementSpecId} requires VERIFIED integrity, but no stored object is cited (/evidenceObject/objectId), so the declared digest cannot be verified.`,
      ]);
    }
    integrityStatus = "UNVERIFIED";
    limit("INTEGRITY_UNVERIFIED", `Integrity unverified: no stored evidence object was cited, so nothing SCS holds confirms the declared SHA-256 ${o.contentDigest}.`);
  }

  // 7. Relation to the plot: bounding boxes only (no spatial database)
  const coverageBox = boundingBox(sc.coverageGeometry.coordinates)!;
  const plotBox = boundingBox(plot.geometryCoordinates);
  if (plotBox === null || !boxesIntersect(coverageBox, plotBox)) {
    throw cap04Failure("EVIDENCE_NOT_RELATED_TO_PLOT", [
      `/spatialCoverage/coverageGeometry: its bounding box (longitude ${coverageBox.minLon} to ${coverageBox.maxLon}, latitude ${coverageBox.minLat} to ${coverageBox.maxLat}) does not intersect plot ${plot.plotId}'s bounding box${plotBox === null ? "" : ` (longitude ${plotBox.minLon} to ${plotBox.maxLon}, latitude ${plotBox.minLat} to ${plotBox.maxLat})`}; the evidence cannot relate to the plot.`,
    ]);
  }

  // 8. Evidence type compatibility
  const knownAccepted = association.acceptedSourceTypes.filter((s) => EVIDENCE_TYPES.includes(s));
  const unknownAccepted = association.acceptedSourceTypes.filter((s) => !EVIDENCE_TYPES.includes(s));
  if (!knownAccepted.includes(req.evidenceType)) {
    throw cap04Failure("EVIDENCE_TYPE_INCOMPATIBLE", [
      `/evidenceType: ${req.evidenceType} is not among the accepted source types of specification ${association.evidenceRequirementSpecId} (${knownAccepted.length === 0 ? "none in this contract's vocabulary" : knownAccepted.join(", ")}).`,
    ]);
  }

  // 9. Parties
  const attesting = att.attestingPartyId;
  const analyst = method?.analystOrganizationId;
  const partyIds = [...new Set([attesting, analyst].filter((id): id is string => id !== undefined))];
  const parties = await findParties(tx, partyIds);
  if (attesting !== undefined && !parties.has(attesting)) {
    throw cap04Failure("ATTESTING_PARTY_NOT_FOUND", [`/coverageAttestation/attestingPartyId: no SCS-CAP-02 party is registered with partyId ${attesting}.`]);
  }
  if (analyst !== undefined && !parties.has(analyst)) {
    throw cap04Failure("ANALYST_PARTY_NOT_FOUND", [`/analyticalMethod/analystOrganizationId: no SCS-CAP-02 party is registered with partyId ${analyst}.`]);
  }
  const retired = [
    ...(attesting !== undefined && parties.get(attesting) === "RETIRED" ? [`Attesting party ${attesting} is RETIRED.`] : []),
    ...(analyst !== undefined && parties.get(analyst) === "RETIRED" ? [`Analyst party ${analyst} is RETIRED.`] : []),
  ];
  if (retired.length > 0) throw cap04Failure("PARTY_RETIRED", retired);

  // Limitations (none of these fails the admission)
  limit(
    "SPATIAL_COVERAGE_NOT_VERIFIED",
    "Spatial coverage not verified: the coverage's bounding box intersects the plot's, but the intersection with the plot was not computed (no spatial database). intersectionWithPlot is NOT_VERIFIED" +
      (sc.plotCoveragePercent === undefined ? "." : `; the declared plotCoveragePercent (${sc.plotCoveragePercent}) is recorded as declared, not checked.`),
  );
  limit(
    "TEMPORAL_COVERAGE_NOT_EVALUATED",
    "Temporal coverage not evaluated: the framework-required period ends on a due diligence date not known at admission. SCS-CAP-06 will evaluate whether collective admitted evidence covers the full framework-required period.",
  );
  for (const g of t.knownGapPeriods) limitations.push(`Known gap declared by the source: ${g.start} to ${g.end} (${g.reason}); this interval is not covered by this evidence item.`);
  for (const a of sc.excludedAreas ?? []) limitations.push(`Excluded area declared by the source (${a.geometry.geometryType}): ${a.reason}`);

  const excesses = attestationExcesses(req);
  if (excesses.length > 0) limit("ATTESTATION_EXCEEDS_ANALYSIS", ...excesses);

  const cited: Array<{ type: LineageType; citedId: string; at: string }> = [
    ...(o.derivedFromEvidenceIds ?? []).map((id) => ({ type: "DERIVED_FROM" as const, citedId: id, at: "/evidenceObject/derivedFromEvidenceIds" })),
    ...(method?.baselineEvidenceIds ?? []).map((id) => ({ type: "BASELINE" as const, citedId: id, at: "/analyticalMethod/baselineEvidenceIds" })),
    ...(method?.comparisonEvidenceIds ?? []).map((id) => ({ type: "COMPARISON" as const, citedId: id, at: "/analyticalMethod/comparisonEvidenceIds" })),
  ];
  const resolved = cited.length === 0 ? new Set<string>() : await findEvidenceForPlot(tx, plot.plotId, [...new Set(cited.map((c) => c.citedId))]);
  const unresolved = cited.filter((c) => !resolved.has(c.citedId));
  if (unresolved.length > 0) {
    limit(
      "PROVENANCE_INCOMPLETE",
      ...unresolved.map((c) => `Provenance incomplete: ${c.at} cites ${c.citedId}, which is not an admitted deforestation evidence record for plot ${plot.plotId}. It is recorded as cited, unlinked.`),
    );
  }
  if (!o.chainOfCustodyComplete) limit("CHAIN_OF_CUSTODY_INCOMPLETE", "Chain of custody incomplete, as declared by the submitter.");

  if (association.minimumResolutionMetres !== null) {
    if (sc.spatialResolutionMetres === undefined) {
      limit("RESOLUTION_BELOW_REQUIREMENT", `Resolution not stated; specification ${association.evidenceRequirementSpecId} requires ${association.minimumResolutionMetres} m or finer.`);
    } else if (sc.spatialResolutionMetres > association.minimumResolutionMetres) {
      limit(
        "RESOLUTION_BELOW_REQUIREMENT",
        `Resolution ${sc.spatialResolutionMetres} m is coarser than the ${association.minimumResolutionMetres} m required by specification ${association.evidenceRequirementSpecId}.`,
      );
    }
  }
  if (association.minimumRecencyDays !== null) {
    const latest = t.acquisitionInstant ?? t.acquisitionEnd;
    if (latest === undefined) {
      limit("RECENCY_NOT_EVALUATED", `Recency not evaluated: no acquisitionInstant or acquisitionEnd is given; specification ${association.evidenceRequirementSpecId} requires an observation within ${association.minimumRecencyDays} days.`);
    } else if (now.getTime() - Date.parse(latest) > association.minimumRecencyDays * DAY_MS) {
      limit(
        "RECENCY_BELOW_REQUIREMENT",
        `The most recent observation (${latest}) is older than the ${association.minimumRecencyDays} days required by specification ${association.evidenceRequirementSpecId} at admission (${now.toISOString()}).`,
      );
    }
  }
  if (association.authorityConfirmationRequired && !att.attestationProvided) {
    limit("AUTHORITY_CONFIRMATION_MISSING", `Specification ${association.evidenceRequirementSpecId} requires authority confirmation, and no attestation is provided.`);
  }
  if (unknownAccepted.length > 0) {
    limit(
      "SOURCE_TYPE_VOCABULARY_UNKNOWN",
      `Specification ${association.evidenceRequirementSpecId} lists accepted source types that are not evidenceType values and were ignored for the compatibility check: ${unknownAccepted.join(", ")}.`,
    );
  }

  codes.sort((x, y) => LIMITATION_ORDER.indexOf(x) - LIMITATION_ORDER.indexOf(y));
  const admissionStatus = codes.length > 0 ? "ADMITTED_WITH_LIMITATIONS" : "ADMITTED";

  // Writes
  const inserted = await insertEvidence(
    tx,
    {
      request: req,
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      plotVersion: plot.plotVersion,
      evidenceRequirementSpecId: association.evidenceRequirementSpecId,
      integrityStatus,
      admissionStatus,
      limitations,
      limitationCodes: codes,
      actor,
    },
    cited.map((c) => ({ type: c.type, citedId: c.citedId, resolved: resolved.has(c.citedId) })),
  );

  // Decision
  const admissionChecks: ScsEvidenceAdmissionChecks = {
    sourceIdentifiable: true,
    attributionEstablished: true,
    objectIntegrityVerified: integrityStatus === "VERIFIED",
    evidenceRelatedToClaimedPlot: true,
    temporalDatesInternallyConsistent: true,
    attestationConsistentWithAnalysis: !codes.includes("ATTESTATION_EXCEEDS_ANALYSIS"),
    provenanceComplete: !codes.includes("PROVENANCE_INCOMPLETE") && !codes.includes("CHAIN_OF_CUSTODY_INCOMPLETE"),
    evidenceTypeCompatibleWithRequirement: true,
    submitterAuthorised: true,
  };
  const decision: ScsDeforestationEvidenceAdmissionDecision = {
    decisionId: randomUUID(),
    evidenceId: inserted.evidenceId,
    plotId: plot.plotId,
    frameworkAssociationId: association.associationId,
    decision: admissionStatus,
    admissionChecks,
    temporalCoverageCompleteAtAdmission: false,
    spatialCoverageCompleteAtAdmission: false,
    limitations,
    limitationCodes: codes,
    decidedBy: actor,
    decidedAt: inserted.admittedAt,
  };

  // Receipt — same transaction; any failure rolls back the evidence record too
  const written = await writeReceipt<ScsDeforestationEvidenceAdmissionReceipt, typeof CAPABILITY_ID, ScsDeforestationEvidenceAdmissionDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "DEFORESTATION_EVIDENCE_ADMISSION",
    subjectId: inserted.evidenceId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap04EvidenceAdmissionReceipt,
  });

  const body: ScsDeforestationEvidenceAdmissionResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
