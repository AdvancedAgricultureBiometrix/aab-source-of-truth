// SCS-CAP-05 submitCustodyEvent — POST /scs/v1/custody-events.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against custody-event-submission-request.schema.json (enumerations
// including the unit vocabulary; required, non-blank document reference, type
// and digest; a quantity for every event type but CERTIFICATION and
// INSPECTION; ids lowercase UUIDs; no system-set field accepted), checked the
// Idempotency-Key and opened the transaction (ctx.tx). Everything below runs
// in that one transaction.
//
// Failure checks, in the contract's order (7b4fc02, "Checks and the
// decision"); each is FAIL_CLOSED and writes nothing:
//   1. authority     — COMPLIANCE_OFFICER only → SUBMITTER_NOT_AUTHORISED (403)
//   2. consistency   — INTERNAL_INCONSISTENCY (400), naming every material
//                      inconsistency (dates against the database clock)
//   3. framework     — FRAMEWORK_ASSOCIATION_NOT_FOUND (404),
//                      FRAMEWORK_NOT_ACTIVE (422)
//   4. commodity     — the framework's code → COMMODITY_CODE_UNRECOGNISED (422)
//   5. parties       — SOURCE_/DESTINATION_PARTY_NOT_IDENTIFIABLE,
//                      PARTY_RETIRED (422)
//   6. document      — EVIDENCE_OBJECT_NOT_FOUND, DOCUMENT_INTEGRITY_FAILED (422)
//
// Everything else is admitted, each shortfall recorded as a limitation code
// and in prose. A plain ADMITTED is reachable: a fully documented event between
// verified parties, with a stored and verified document.
//
// Written: the custody event, its source plots and links (each kept as cited,
// linked only when it resolves), and the decision's receipt
// (CUSTODY_EVENT_ADMISSION).

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { isIso3166Alpha2 } from "../../reference/countries.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsCustodyEventAdmissionChecks,
  ScsCustodyEventAdmissionDecision,
  ScsCustodyEventAdmissionReceipt,
  ScsCustodyEventAdmissionResponse,
  ScsCustodyEventLimitationCode,
  ScsCustodyEventSubmissionRequest,
} from "../../types/cap-05.js";
import { CAPABILITY_ID, cap05Failure } from "./errors.js";
import {
  type LinkType,
  type MandateForCustody,
  databaseNow,
  findEvents,
  findFramework,
  findMandates,
  findParties,
  findPlots,
  findVerifiedParties,
  insertCustodyEvent,
  objectExists,
} from "./store.js";

/** The only role that may submit a custody event (contract 7b4fc02). A mandate never authorises. */
export const SUBMITTER_ROLE = "COMPLIANCE_OFFICER";

/** ScsCustodyEventRecord.schemaVersion written by this implementation. */
export const CUSTODY_EVENT_SCHEMA_VERSION = "1";

/** Event types that change custody, so their source and destination must differ. */
export const CUSTODY_CHANGING_TYPES: readonly string[] = ["PURCHASE", "TRANSFER", "EXPORT", "IMPORT"];

/** Event types that need not concern a quantity (contract 9845179). */
export const QUANTITY_OPTIONAL_TYPES: readonly string[] = ["CERTIFICATION", "INSPECTION"];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The contract's limitation codes, in its order: recorded codes are reported in this order. */
const LIMITATION_ORDER: readonly ScsCustodyEventLimitationCode[] = [
  "PARTY_UNVERIFIED",
  "SOURCE_PLOTS_INCOMPLETE",
  "SOURCE_PLOT_NOT_REGISTERED",
  "SOURCE_PLOT_RETIRED",
  "QUANTITY_PRECISION_UNCERTAIN",
  "EVENT_TIME_APPROXIMATE",
  "LINKED_EVENT_NOT_ADMITTED",
  "LINKED_EVENT_OUT_OF_SCOPE",
  "INTEGRITY_UNVERIFIED",
  "CHAIN_OF_CUSTODY_INCOMPLETE",
  "MANDATE_NOT_VALID",
  "QUANTITY_GAIN_UNEXPLAINED",
  "CONTRADICTION_DECLARED",
];

/** The UTC instants a local calendar date can cover, across time zones UTC−12:00 to UTC+14:00. */
function localDateSpan(date: string): { start: number; end: number } {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  return { start: midnightUtc - 14 * HOUR_MS, end: midnightUtc + 36 * HOUR_MS };
}

/** Every material inconsistency (contract "Internal consistency"), each naming its JSON pointer. */
export function inconsistencies(req: ScsCustodyEventSubmissionRequest, now: Date): string[] {
  const problems: string[] = [];
  const type = req.eventType;
  const t = req.eventTime;

  // event-type rules
  const transforming = type === "TRANSFORMATION" || type === "PROCESSING";
  if (transforming && req.transformation === undefined) problems.push(`/transformation: required for a ${type} event.`);
  if (!transforming && req.transformation !== undefined) problems.push(`/transformation: only a TRANSFORMATION or PROCESSING event records a transformation, not a ${type} event.`);
  if (type === "SPLIT" && req.splitFromEventId === undefined) problems.push("/splitFromEventId: required for a SPLIT event.");
  if (type !== "SPLIT" && req.splitFromEventId !== undefined) problems.push(`/splitFromEventId: only a SPLIT event is split from another, not a ${type} event.`);
  const consolidated = req.consolidatedFromEventIds ?? [];
  if (type === "CONSOLIDATION" && consolidated.length < 2) {
    problems.push(`/consolidatedFromEventIds: a CONSOLIDATION event needs at least two events it consolidates (has ${consolidated.length}).`);
  }
  if (type !== "CONSOLIDATION" && consolidated.length > 0) problems.push(`/consolidatedFromEventIds: only a CONSOLIDATION event consolidates others, not a ${type} event.`);
  if (CUSTODY_CHANGING_TYPES.includes(type) && req.sourceParty.partyId === req.destinationParty.partyId) {
    problems.push(`/destinationParty/partyId: a ${type} event changes custody, so its source and destination must be different parties.`);
  }

  // time
  if (t.timePrecision === "EXACT" && t.eventTimeUTC === undefined) problems.push("/eventTime/eventTimeUTC: required when timePrecision is EXACT.");
  if (t.eventTimeUTC !== undefined) {
    const at = Date.parse(t.eventTimeUTC);
    const span = localDateSpan(t.eventDate);
    if (at < span.start || at >= span.end) {
      problems.push(
        `/eventTime/eventTimeUTC (${t.eventTimeUTC}) does not fall on eventDate ${t.eventDate} in any time zone from UTC−12:00 to UTC+14:00.`,
      );
    }
    if (at > now.getTime()) problems.push(`/eventTime/eventTimeUTC (${t.eventTimeUTC}) is in the future (database time ${now.toISOString()}).`);
  }
  // the latest calendar date anywhere is the UTC date plus one day
  const latestDate = new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
  if (t.eventDate > latestDate) problems.push(`/eventTime/eventDate (${t.eventDate}) is in the future (database time ${now.toISOString()}).`);
  const docDate = req.supportingDocument.documentDate;
  if (docDate !== undefined && docDate > latestDate) problems.push(`/supportingDocument/documentDate (${docDate}) is after the submission (database time ${now.toISOString()}).`);

  // location
  const loc = req.eventLocation;
  if (!isIso3166Alpha2(loc.countryCode)) problems.push(`/eventLocation/countryCode: "${loc.countryCode}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`);
  if (loc.coordinates !== undefined) {
    const { latitude, longitude, accuracyMetres } = loc.coordinates;
    if (latitude < -90 || latitude > 90) problems.push(`/eventLocation/coordinates/latitude: ${latitude} is outside −90 to 90.`);
    if (longitude < -180 || longitude > 180) problems.push(`/eventLocation/coordinates/longitude: ${longitude} is outside −180 to 180.`);
    if (accuracyMetres !== undefined && accuracyMetres < 0) problems.push(`/eventLocation/coordinates/accuracyMetres: ${accuracyMetres} is negative.`);
  }

  // quantities and units
  const units: Array<[string, string, string | undefined]> = [];
  if (req.quantity !== undefined) {
    if (!(req.quantity.amount > 0)) problems.push(`/quantity/amount: ${req.quantity.amount} must be greater than 0.`);
    units.push(["/quantity/unit", req.quantity.unit, req.quantity.unitDescription]);
  }
  const x = req.transformation;
  if (x !== undefined) {
    if (!(x.inputQuantity > 0)) problems.push(`/transformation/inputQuantity: ${x.inputQuantity} must be greater than 0.`);
    if (!(x.outputQuantity > 0)) problems.push(`/transformation/outputQuantity: ${x.outputQuantity} must be greater than 0.`);
    units.push(["/transformation/inputUnit", x.inputUnit, x.inputUnitDescription], ["/transformation/outputUnit", x.outputUnit, x.outputUnitDescription]);
  }
  for (const [at, unit, description] of units) {
    if (unit === "OTHER" && description === undefined) problems.push(`${at}Description: required when ${at.split("/").pop()} is OTHER.`);
    if (unit !== "OTHER" && description !== undefined) problems.push(`${at}Description: only allowed when ${at.split("/").pop()} is OTHER (it is ${unit}).`);
  }
  return problems;
}

/**
 * Why a cited mandate is not valid for this event (contract "Authority and
 * mandates"); empty if it is. In force means not revoked and the event within
 * the validity period: the exact instant when eventTimeUTC is given, otherwise
 * any part of the event date's span (across time zones).
 */
export function mandateProblems(mandate: MandateForCustody | undefined, req: ScsCustodyEventSubmissionRequest): string[] {
  if (mandate === undefined) return ["no SCS-CAP-02 mandate is registered with that id"];
  const problems: string[] = [];
  if (mandate.revocationStatus !== "NOT_REVOKED") problems.push(`its revocationStatus is ${mandate.revocationStatus}`);
  const from = mandate.validFrom.getTime();
  const until = mandate.validUntil.getTime();
  const t = req.eventTime;
  const inPeriod =
    t.eventTimeUTC !== undefined
      ? from <= Date.parse(t.eventTimeUTC) && Date.parse(t.eventTimeUTC) <= until
      : localDateSpan(t.eventDate).start <= until && localDateSpan(t.eventDate).end > from;
  if (!inPeriod) problems.push(`the event (${t.eventTimeUTC ?? t.eventDate}) is outside its validity period (${mandate.validFrom.toISOString()} to ${mandate.validUntil.toISOString()})`);
  if (!mandate.permittedActions.includes("SUBMIT_CUSTODY_EVIDENCE")) problems.push("it does not permit SUBMIT_CUSTODY_EVIDENCE");
  if (mandate.grantingPartyId !== req.sourceParty.partyId) problems.push(`it is granted by party ${mandate.grantingPartyId}, not by the source party ${req.sourceParty.partyId}`);
  return problems;
}

export async function submitCustodyEvent(ctx: RouteContext<ScsCustodyEventSubmissionRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const req = ctx.body;
  const { sourceParty: sp, destinationParty: dp, commodity, supportingDocument: doc, eventTime: t } = req;

  // 1. Authority
  if (!actor.roles.includes(SUBMITTER_ROLE)) {
    throw cap05Failure("SUBMITTER_NOT_AUTHORISED", [`Submitting a custody event requires the ${SUBMITTER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. Internal consistency, against the database clock
  const now = await databaseNow(tx);
  const problems = inconsistencies(req, now);
  if (problems.length > 0) throw cap05Failure("INTERNAL_INCONSISTENCY", problems);

  // 3. Framework
  const framework = await findFramework(tx, req.frameworkAssociationId);
  if (framework === null) {
    throw cap05Failure("FRAMEWORK_ASSOCIATION_NOT_FOUND", [`/frameworkAssociationId: no SCS-CAP-01 framework is registered with frameworkId ${req.frameworkAssociationId}.`]);
  }
  if (framework.status !== "ACTIVE") {
    throw cap05Failure("FRAMEWORK_NOT_ACTIVE", [`Framework ${framework.frameworkId} is ${framework.status}; custody events are admitted only under an ACTIVE framework.`]);
  }

  // 4. Commodity
  if (commodity.commodityCode !== framework.commodityCode) {
    throw cap05Failure("COMMODITY_CODE_UNRECOGNISED", [
      `/commodity/commodityCode: "${commodity.commodityCode}" is not framework ${framework.frameworkId}'s commodityCode ("${framework.commodityCode}"); only an exact match is accepted.`,
    ]);
  }

  // 5. Parties
  const parties = await findParties(tx, [...new Set([sp.partyId, dp.partyId])]);
  const source = parties.get(sp.partyId);
  const destination = parties.get(dp.partyId);
  if (source === undefined) throw cap05Failure("SOURCE_PARTY_NOT_IDENTIFIABLE", [`/sourceParty/partyId: no SCS-CAP-02 party is registered with partyId ${sp.partyId}.`]);
  if (destination === undefined) {
    throw cap05Failure("DESTINATION_PARTY_NOT_IDENTIFIABLE", [`/destinationParty/partyId: no SCS-CAP-02 party is registered with partyId ${dp.partyId}.`]);
  }
  const retired = [
    ...(source.registrationStatus === "RETIRED" ? [`Source party ${sp.partyId} is RETIRED.`] : []),
    ...(destination.registrationStatus === "RETIRED" && dp.partyId !== sp.partyId ? [`Destination party ${dp.partyId} is RETIRED.`] : []),
  ];
  if (retired.length > 0) throw cap05Failure("PARTY_RETIRED", retired);

  // 6. Supporting document and integrity
  let integrityStatus: "VERIFIED" | "UNVERIFIED" = "UNVERIFIED";
  if (doc.objectId !== undefined) {
    if (!(await objectExists(tx, doc.objectId))) {
      throw cap05Failure("EVIDENCE_OBJECT_NOT_FOUND", [`/supportingDocument/objectId: the SCS evidence object store holds no object ${doc.objectId}.`]);
    }
    if (doc.contentDigest !== doc.objectId) {
      throw cap05Failure("DOCUMENT_INTEGRITY_FAILED", [
        `/supportingDocument/contentDigest: the declared SHA-256 ${doc.contentDigest} does not match the stored document's SHA-256 ${doc.objectId}.`,
      ]);
    }
    integrityStatus = "VERIFIED";
  }

  // Limitations (none of these fails the admission)
  const codes: ScsCustodyEventLimitationCode[] = [];
  const limitations: string[] = [];
  const limit = (code: ScsCustodyEventLimitationCode, ...prose: string[]) => {
    if (!codes.includes(code)) codes.push(code);
    limitations.push(...prose);
  };

  const verified = await findVerifiedParties(tx, [...new Set([sp.partyId, dp.partyId])]);
  const unverified = [...new Set([sp.partyId, dp.partyId])].filter((id) => !verified.has(id));
  if (unverified.length > 0) {
    limit(
      "PARTY_UNVERIFIED",
      ...unverified.map((id) => `Party ${id} is registered but unverified: it has no current SCS-CAP-02 VERIFIED_FOR_DECLARED_SCOPE assessment.`),
    );
  }

  const plots = await findPlots(tx, commodity.sourcePlotIds);
  if (!commodity.sourcePlotIdsComplete || commodity.sourcePlotIds.length === 0) {
    limit(
      "SOURCE_PLOTS_INCOMPLETE",
      commodity.sourcePlotIds.length === 0
        ? "Source plots incomplete: no source plot is identified for this batch."
        : "Source plots incomplete: the submitter declares that the source plots listed are not all the plots the batch came from.",
    );
  }
  const unregistered = commodity.sourcePlotIds.filter((id) => !plots.has(id));
  if (unregistered.length > 0) {
    limit("SOURCE_PLOT_NOT_REGISTERED", ...unregistered.map((id) => `Source plot ${id} is not a registered SCS-CAP-03 plot; it is recorded as cited, unlinked.`));
  }
  const retiredPlots = commodity.sourcePlotIds.filter((id) => plots.get(id) === "RETIRED");
  if (retiredPlots.length > 0) {
    limit("SOURCE_PLOT_RETIRED", ...retiredPlots.map((id) => `Source plot ${id} is RETIRED; the commodity may have been harvested before the plot was retired.`));
  }

  const q = req.quantity;
  if (q !== undefined && (q.measurementUncertainty !== undefined || q.measurementMethod === undefined)) {
    limit(
      "QUANTITY_PRECISION_UNCERTAIN",
      q.measurementUncertainty !== undefined
        ? `Quantity precision uncertain: the stated measurement uncertainty is "${q.measurementUncertainty}".`
        : "Quantity precision uncertain: no measurement method is stated.",
    );
  }
  if (t.timePrecision === "APPROXIMATE" || t.timePrecision === "UNKNOWN") {
    limit("EVENT_TIME_APPROXIMATE", `Event time is ${t.timePrecision === "APPROXIMATE" ? "approximate" : "unknown"}; the event date ${t.eventDate} anchors it.`);
  }

  const cited: Array<{ type: LinkType; citedId: string; at: string }> = [
    ...req.predecessorEventIds.map((id) => ({ type: "PREDECESSOR" as const, citedId: id, at: "/predecessorEventIds" })),
    ...(req.splitFromEventId === undefined ? [] : [{ type: "SPLIT_FROM" as const, citedId: req.splitFromEventId, at: "/splitFromEventId" }]),
    ...(req.consolidatedFromEventIds ?? []).map((id) => ({ type: "CONSOLIDATED_FROM" as const, citedId: id, at: "/consolidatedFromEventIds" })),
  ];
  const admitted = cited.length === 0 ? new Map() : await findEvents(tx, [...new Set(cited.map((c) => c.citedId))]);
  const notAdmitted = cited.filter((c) => !admitted.has(c.citedId));
  if (notAdmitted.length > 0) {
    limit(
      "LINKED_EVENT_NOT_ADMITTED",
      ...notAdmitted.map((c) => `${c.at} cites ${c.citedId}, which is not an admitted custody event; it is recorded as cited, unlinked.`),
    );
  }
  const outOfScope = cited.flatMap((c) => {
    const e = admitted.get(c.citedId);
    if (e === undefined) return [];
    const how = [
      ...(e.frameworkId !== framework.frameworkId ? [`framework ${e.frameworkId}`] : []),
      ...(e.batchIdentifier !== commodity.batchIdentifier ? [`batch "${e.batchIdentifier}"`] : []),
    ];
    return how.length === 0 ? [] : [`${c.at} cites event ${c.citedId}, which belongs to ${how.join(" and ")}; the link is kept.`];
  });
  if (outOfScope.length > 0) limit("LINKED_EVENT_OUT_OF_SCOPE", ...outOfScope);

  if (integrityStatus === "UNVERIFIED") {
    limit("INTEGRITY_UNVERIFIED", `Integrity unverified: no stored document was cited, so nothing SCS holds confirms the declared SHA-256 ${doc.contentDigest}.`);
  }
  if (!req.chainOfCustodyComplete) limit("CHAIN_OF_CUSTODY_INCOMPLETE", "Chain of custody incomplete, as declared by the submitter.");

  const citedMandates: Array<[string, string]> = [
    ...(sp.actingUnderMandateId === undefined ? [] : [["/sourceParty/actingUnderMandateId", sp.actingUnderMandateId] as [string, string]]),
    ...(req.submissionMandateId === undefined ? [] : [["/submissionMandateId", req.submissionMandateId] as [string, string]]),
  ];
  const mandates = citedMandates.length === 0 ? new Map<string, MandateForCustody>() : await findMandates(tx, citedMandates.map(([, id]) => id));
  for (const [at, id] of citedMandates) {
    const why = mandateProblems(mandates.get(id), req);
    if (why.length > 0) limit("MANDATE_NOT_VALID", `Mandate not valid: ${at} cites ${id}, but ${why.join("; ")}. The submission is authorised by the actor's ${SUBMITTER_ROLE} role, not by the mandate.`);
  }

  const x = req.transformation;
  if (x !== undefined && x.inputUnit === x.outputUnit && x.inputUnit !== "OTHER" && x.outputQuantity > x.inputQuantity && x.conversionRatioDescription === undefined) {
    limit(
      "QUANTITY_GAIN_UNEXPLAINED",
      `Quantity gain unexplained: the transformation's output (${x.outputQuantity} ${x.outputUnit}) exceeds its input (${x.inputQuantity} ${x.inputUnit}), and no conversionRatioDescription explains it.`,
    );
  }
  if (req.contradictions.length > 0) {
    limit("CONTRADICTION_DECLARED", ...req.contradictions.map((c) => `Contradiction declared by the submitter: ${c}`));
  }

  codes.sort((a, b) => LIMITATION_ORDER.indexOf(a) - LIMITATION_ORDER.indexOf(b));
  const admissionStatus = codes.length > 0 ? "ADMITTED_WITH_LIMITATIONS" : "ADMITTED";

  // Writes
  const inserted = await insertCustodyEvent(
    tx,
    {
      request: req,
      schemaVersion: CUSTODY_EVENT_SCHEMA_VERSION,
      evidenceRequirementSpecId: framework.evidenceSpecId,
      sourcePartyVersion: source.partyVersion,
      destinationPartyVersion: destination.partyVersion,
      sourceMandateLinked: sp.actingUnderMandateId !== undefined && mandates.has(sp.actingUnderMandateId),
      submissionMandateLinked: req.submissionMandateId !== undefined && mandates.has(req.submissionMandateId),
      integrityStatus,
      admissionStatus,
      limitations,
      limitationCodes: codes,
      actor,
    },
    commodity.sourcePlotIds.map((id) => ({ citedId: id, registered: plots.has(id) })),
    [
      ...cited.map((c) => ({ type: c.type, citedId: c.citedId, admitted: admitted.has(c.citedId) })),
      // successors are recorded as declared and never resolved at admission
      ...req.successorEventIds.map((id) => ({ type: "SUCCESSOR" as const, citedId: id, admitted: false })),
    ],
  );

  // Decision
  const admissionChecks: ScsCustodyEventAdmissionChecks = {
    sourcePartyIdentifiable: true,
    destinationPartyIdentifiable: true,
    commodityCodeRecognised: true,
    batchIdentifierPresent: true,
    eventTypeValid: true,
    quantityRecorded: q !== undefined,
    eventTimeRecorded: true,
    supportingDocumentPresent: true,
    documentIntegrityVerified: integrityStatus === "VERIFIED",
    submitterAuthorised: true,
    internallyConsistent: !codes.includes("QUANTITY_GAIN_UNEXPLAINED"),
  };
  const decisionReasons: string[] = [];
  if (q === undefined) {
    decisionReasons.push(`quantityRecorded: not applicable — a ${req.eventType} event need not concern a quantity, and none was recorded. This is not a limitation.`);
  }
  const decision: ScsCustodyEventAdmissionDecision = {
    decisionId: randomUUID(),
    eventId: inserted.eventId,
    frameworkAssociationId: framework.frameworkId,
    decision: admissionStatus,
    admissionChecks,
    limitations,
    limitationCodes: codes,
    decisionReasons,
    decidedBy: actor,
    decidedAt: inserted.admittedAt,
    authorityBoundary: {
      admissionIsNotSufficiency: true,
      admittedEventDoesNotProveChainContinuity: true,
      admittedEventDoesNotVerifyPartyIdentity: true,
      admittedEventDoesNotConstituteLegalCompliance: true,
    },
  };

  // Receipt — same transaction; any failure rolls back the event, its plots and links too
  const written = await writeReceipt<ScsCustodyEventAdmissionReceipt, typeof CAPABILITY_ID, ScsCustodyEventAdmissionDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "CUSTODY_EVENT_ADMISSION",
    subjectId: inserted.eventId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap05CustodyEventAdmissionReceipt,
  });

  const body: ScsCustodyEventAdmissionResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
