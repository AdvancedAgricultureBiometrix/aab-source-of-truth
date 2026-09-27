// SCS-CAP-03 registerPlot — POST /scs/v1/plots.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against plot-registration-request.schema.json (at least one tenure
// claim; enumerations; ids lowercase UUIDs; no system-set field accepted),
// checked the Idempotency-Key and opened the transaction (ctx.tx). Everything
// below runs in that one transaction.
//
// Plot-level checks (contract 2151321, "Registration checks and outcome"); each
// failure is FAIL_CLOSED and writes nothing:
//   1. authority     — COMPLIANCE_OFFICER only → REGISTRANT_NOT_AUTHORISED (403)
//   2. CRS           — "EPSG:4326" → COORDINATE_REFERENCE_SYSTEM_UNSUPPORTED (422)
//   3. geometry      — geometry.ts, including the EUDR point/area rule
//                      → GEOMETRY_INVALID (422), naming every problem
//   4. country       — ISO 3166-1 alpha-2 → COUNTRY_CODE_UNRECOGNISED (422)
//   5. request rules — a registryVerificationStatus other than NOT_APPLICABLE
//                      needs a registryReference; each framework at most once
//                      → REQUEST_VALIDATION_FAILED (400)
//   6. tenure claims — validity periods (VALIDITY_PERIOD_INVALID, 400); every
//                      claimant a registered party (CLAIMANT_PARTY_NOT_FOUND,
//                      422) that is not RETIRED (PARTY_RETIRED, 422)
//
// Then each initial framework association is evaluated on its own. A failing
// association never fails the registration: it becomes a FAILED result with a
// failureCode, in this order — FRAMEWORK_REFERENCE_NOT_FOUND,
// FRAMEWORK_NOT_ACTIVE, COMMODITY_OUTSIDE_FRAMEWORK, PRODUCER_PARTY_NOT_FOUND,
// PARTY_RETIRED — and nothing is written for it. The associations are
// evaluated before anything is written, because the plot's registrationStatus
// (which scs_api cannot update later) depends on them.
//
// Written: the plot (overlapState NOT_EVALUATED — no spatial database), its
// tenure claims (UNVERIFIED), each successful association (APPLICABLE,
// ACTIVE), the decision and its receipt (PLOT_REGISTRATION). The decision is
// REGISTERED_WITH_GAPS whenever a gap is disclosed; since overlap is never
// evaluated in the pilot, every pilot plot is REGISTERED_WITH_GAPS.

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { isIso3166Alpha2 } from "../../reference/countries.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  RegisterPlotRequest,
  ScsPlotEligibilityChecks,
  ScsPlotFrameworkAssociationResult,
  ScsPlotRegistrationDecision,
  ScsPlotRegistrationGap,
  ScsPlotRegistrationReceipt,
  ScsPlotRegistrationResponse,
} from "../../types/cap-03.js";
import { type AssociationFailureCode, CAPABILITY_ID, cap03Failure } from "./errors.js";
import { validateGeometry } from "./geometry.js";
import { type FrameworkForPlot, findFrameworks, findParties, insertAssociation, insertPlot, insertTenureClaims } from "./store.js";

/** The only role that may register a plot (contract 2151321). TODO(role-registry): see foundation/auth.ts. */
export const REGISTRANT_ROLE = "COMPLIANCE_OFFICER";

/** The only coordinate reference system accepted: WGS 84. */
export const SUPPORTED_CRS = "EPSG:4326";

/** ScsPlotRegistration.schemaVersion written by this implementation. */
export const PLOT_SCHEMA_VERSION = "1";

export async function registerPlot(ctx: RouteContext<RegisterPlotRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const { plot, tenureClaims } = ctx.body;
  const associations = ctx.body.initialFrameworkAssociations ?? [];
  const { geometry } = plot;

  // 1. Authority
  if (!holdsRole(actor, REGISTRANT_ROLE)) {
    throw cap03Failure("REGISTRANT_NOT_AUTHORISED", [`Registering a plot requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. Coordinate reference system
  if (geometry.coordinateReferenceSystem !== SUPPORTED_CRS) {
    throw cap03Failure("COORDINATE_REFERENCE_SYSTEM_UNSUPPORTED", [
      `/plot/geometry/coordinateReferenceSystem: "${geometry.coordinateReferenceSystem}" is not supported; only ${SUPPORTED_CRS} (WGS 84) is accepted.`,
    ]);
  }

  // 3. Geometry
  const problems = validateGeometry(geometry.geometryType, geometry.coordinates, geometry.areaHectares);
  if (problems.length > 0) throw cap03Failure("GEOMETRY_INVALID", problems);

  // 4. Country
  if (!isIso3166Alpha2(plot.countryCode)) {
    throw cap03Failure("COUNTRY_CODE_UNRECOGNISED", [`/plot/countryCode: "${plot.countryCode}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`]);
  }

  // 5. Request rules that span fields
  const registry = plot.identityEvidence;
  if (registry.registryVerificationStatus !== "NOT_APPLICABLE" && registry.registryReference === undefined) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/plot/identityEvidence/registryReference: required when registryVerificationStatus is ${registry.registryVerificationStatus} (only NOT_APPLICABLE needs none).`,
    ]);
  }
  const repeated = associations.map((a) => a.frameworkId).filter((id, i, all) => all.indexOf(id) !== i);
  if (repeated.length > 0) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/initialFrameworkAssociations: each framework may appear at most once; repeated: ${[...new Set(repeated)].join(", ")}.`,
    ]);
  }

  // 6. Tenure claims
  const badPeriods = tenureClaims
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.validFrom !== undefined && c.validUntil !== undefined && Date.parse(c.validUntil) <= Date.parse(c.validFrom));
  if (badPeriods.length > 0) {
    throw cap03Failure(
      "VALIDITY_PERIOD_INVALID",
      badPeriods.map(({ c, i }) => `/tenureClaims/${i}: validUntil (${c.validUntil}) must be after validFrom (${c.validFrom}).`),
    );
  }
  const partyIds = [...new Set([...tenureClaims.map((c) => c.claimantId), ...associations.flatMap((a) => (a.producerOrOperatorId === undefined ? [] : [a.producerOrOperatorId]))])];
  const parties = await findParties(tx, partyIds);
  const missingClaimants = [...new Set(tenureClaims.map((c) => c.claimantId).filter((id) => !parties.has(id)))];
  if (missingClaimants.length > 0) {
    throw cap03Failure("CLAIMANT_PARTY_NOT_FOUND", missingClaimants.map((id) => `No SCS-CAP-02 party is registered with claimantId ${id}.`));
  }
  const retiredClaimants = [...new Set(tenureClaims.map((c) => c.claimantId).filter((id) => parties.get(id)!.registrationStatus === "RETIRED"))];
  if (retiredClaimants.length > 0) {
    throw cap03Failure("PARTY_RETIRED", retiredClaimants.map((id) => `Claimant party ${id} is RETIRED and cannot claim tenure of a new plot.`));
  }

  // Framework associations: evaluated one by one, never fatal
  const frameworks = await findFrameworks(tx, associations.map((a) => a.frameworkId));
  const evaluated = associations.map((a) => {
    const fail = (failureCode: AssociationFailureCode, reason: string) => ({ a, framework: null, failureCode, reason });
    const f = frameworks.get(a.frameworkId);
    if (f === undefined) return fail("FRAMEWORK_REFERENCE_NOT_FOUND", `No SCS-CAP-01 framework is registered with frameworkId ${a.frameworkId}.`);
    if (f.status !== "ACTIVE") return fail("FRAMEWORK_NOT_ACTIVE", `Framework ${f.frameworkId} is ${f.status}; only an ACTIVE framework can be associated.`);
    if (a.commodityCode !== f.commodityCode) {
      return fail("COMMODITY_OUTSIDE_FRAMEWORK", `commodityCode "${a.commodityCode}" is not framework ${f.frameworkId}'s commodityCode ("${f.commodityCode}").`);
    }
    if (a.producerOrOperatorId !== undefined) {
      const producer = parties.get(a.producerOrOperatorId);
      if (producer === undefined) return fail("PRODUCER_PARTY_NOT_FOUND", `No SCS-CAP-02 party is registered with producerOrOperatorId ${a.producerOrOperatorId}.`);
      if (producer.registrationStatus === "RETIRED") return fail("PARTY_RETIRED", `Producer or operator party ${producer.partyId} is RETIRED.`);
    }
    return { a, framework: f as FrameworkForPlot, failureCode: null, reason: null };
  });
  const failedCount = evaluated.filter((e) => e.failureCode !== null).length;

  // Gaps and outcome
  const gaps: ScsPlotRegistrationGap[] = [];
  if (registry.registryReference === undefined) {
    gaps.push({ gapCode: "REGISTRY_REFERENCE_MISSING", gapDescription: "No formal registry reference was provided for this plot.", automaticFailure: false, humanReviewRequired: false });
  }
  gaps.push({
    gapCode: "OVERLAP_NOT_EVALUATED",
    gapDescription: "Overlap with other registered plots was not evaluated: the pilot has no spatial database. An undetected overlap could hide a competing claim to the same land.",
    automaticFailure: false,
    humanReviewRequired: true,
  });
  if (geometry.geometryType === "POINT" && geometry.areaHectares === undefined) {
    gaps.push({
      gapCode: "POINT_AREA_UNDECLARED",
      gapDescription: "The plot is a single point with no declared area; it is accepted as the registrant's representation of a plot of 4 hectares or less (EUDR Article 2(28)).",
      automaticFailure: false,
      humanReviewRequired: false,
    });
  }
  for (const e of evaluated.filter((x) => x.failureCode !== null)) {
    gaps.push({
      gapCode: "FRAMEWORK_ASSOCIATION_FAILED",
      gapDescription: `The association with framework ${e.a.frameworkId} failed (${e.failureCode}); the plot is not associated with it.`,
      automaticFailure: false,
      humanReviewRequired: false,
    });
  }
  const outcome = gaps.length > 0 ? "REGISTERED_WITH_GAPS" : "REGISTERED";

  // Writes
  const inserted = await insertPlot(tx, { plot, schemaVersion: PLOT_SCHEMA_VERSION, registrationStatus: outcome, overlapState: "NOT_EVALUATED", registeredBy: actor });
  await insertTenureClaims(tx, inserted, tenureClaims, actor);
  const frameworkAssociationResults: ScsPlotFrameworkAssociationResult[] = [];
  for (const e of evaluated) {
    if (e.failureCode === null) {
      const associationId = await insertAssociation(tx, inserted.plotId, e.a, e.framework!, actor);
      frameworkAssociationResults.push({ frameworkId: e.a.frameworkId, associationId, outcome: "ASSOCIATED" });
    } else {
      frameworkAssociationResults.push({ frameworkId: e.a.frameworkId, outcome: "FAILED", failureCode: e.failureCode, reason: e.reason! });
    }
  }

  // Decision
  const eligibilityChecks: ScsPlotEligibilityChecks = {
    geometryValid: true,
    countryCodeValid: true,
    coordinateReferenceSystemRecognised: true,
    captureMethodRecorded: true,
    registrantAuthorised: true,
    noFatalOverlapDetected: false,
    tenureClaimsValid: true,
    claimantPartiesRegistered: true,
  };
  const evidenceCount = registry.supportingEvidenceIds.length + tenureClaims.reduce((n, c) => n + c.evidenceIds.length, 0);
  const decision: ScsPlotRegistrationDecision = {
    decisionId: randomUUID(),
    plotId: inserted.plotId,
    decision: outcome,
    eligibilityChecks,
    gaps,
    frameworkAssociationResults,
    decisionReasons: [
      `geometryValid: evaluated — a valid ${geometry.geometryType} (GeoJSON, checked in the application: positions, ranges, closed and non-self-intersecting rings${geometry.geometryType === "POINT" ? ", the 4-hectare point rule" : ", a declared area"}).`,
      `countryCodeValid: evaluated — ${plot.countryCode} is an officially assigned ISO 3166-1 alpha-2 code. Whether the geometry lies inside it is not checked: there is no country boundary data.`,
      `coordinateReferenceSystemRecognised: evaluated — ${SUPPORTED_CRS}.`,
      `captureMethodRecorded: evaluated — ${geometry.captureMethod}.`,
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      "noFatalOverlapDetected: NOT EVALUATED — overlap with other registered plots is not evaluated in the pilot (no spatial database). overlapState is NOT_EVALUATED.",
      `tenureClaimsValid: evaluated — ${tenureClaims.length} tenure claim(s), each with a valid validity period. Each is recorded UNVERIFIED: registering a claim does not verify it.`,
      `claimantPartiesRegistered: evaluated — every claimant is a registered SCS-CAP-02 party that is not RETIRED.`,
      `Framework associations: ${evaluated.length - failedCount} associated, ${failedCount} failed. A failed association does not fail the plot registration.`,
      `Area recorded as declared: ${geometry.areaHectares === undefined ? "no area was declared" : `${geometry.areaHectares} ha`}; it is not computed from, or checked against, the geometry.`,
      "Registration is not verification: REGISTERED_WITH_GAPS or REGISTERED records that SCS has a governed record of this place. Legal title, tenure, boundary, framework compliance and commodity eligibility are not verified.",
      // TODO(evidence-id-model): evidence ids predate the AAB-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${evidenceCount} cited plot and tenure evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. They are recorded as submitted.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.registeredAt,
  };

  // Receipt — same transaction; any failure rolls back the plot, claims and associations too
  const written = await writeReceipt<ScsPlotRegistrationReceipt, typeof CAPABILITY_ID, ScsPlotRegistrationDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "PLOT_REGISTRATION",
    subjectId: inserted.plotId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap03PlotRegistrationReceipt,
  });

  const body: ScsPlotRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
