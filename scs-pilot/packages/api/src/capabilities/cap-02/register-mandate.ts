// SCS-CAP-02 registerMandate — POST /scs/v1/mandates.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against mandate-registration-request.schema.json (every permitted
// action enumerated, at least one; validUntil present; at least one consent
// evidence id; at least one framework; scope not empty; ids lowercase UUIDs),
// checked the Idempotency-Key and opened the transaction (ctx.tx).
// Everything below runs in that one transaction.
//
// Order (contract 9a3e978):
//   1. authority         — COMPLIANCE_OFFICER only → REGISTRANT_NOT_AUTHORISED (403)
//   2. OTHER described   — OTHER_EXPLICITLY_NAMED needs otherActionDescription
//                          → OTHER_TYPE_REQUIRES_DESCRIPTION (400); a description
//                          without it is a request error → REQUEST_VALIDATION_FAILED (400)
//   3. validity period   — validUntil after validFrom → VALIDITY_PERIOD_INVALID (400)
//   4. two parties       — grantingPartyId ≠ representativePartyId
//                          → SELF_GRANTED_MANDATE (400)
//   5. parties exist     — GRANTING_PARTY_NOT_FOUND, REPRESENTATIVE_PARTY_NOT_FOUND (422)
//   6. not retired       — neither party RETIRED → PARTY_RETIRED (422)
//   7. frameworks        — each a registered, ACTIVE CAP-01 framework
//                          → FRAMEWORK_ASSOCIATION_NOT_FOUND, FRAMEWORK_NOT_ACTIVE (422)
//   8. scope             — within the frameworks → SCOPE_OUTSIDE_FRAMEWORK (422)
//   9. relationship      — an ACTIVE relationship between the two parties,
//                          either direction, any type, not past its validUntil,
//                          referencing every mandate framework
//                          → RELATIONSHIP_NOT_FOUND (422)
//  10. conflict          — lock (granting, representative), then a NOT_REVOKED
//                          mandate for the same pair sharing a framework and a
//                          permitted action with an overlapping validity period
//                          → CONFLICTING_RECORD (409), naming it
//  11. insert            — CLAIMED_UNVERIFIED, NOT_REVOKED, authorityBoundary all
//                          true; database-generated mandateId
//  12. decision          — REGISTERED; all thirteen checks were performed, so all
//                          are true, each with an "evaluated" reason
//  13. receipt           — MANDATE_REGISTRATION, same transaction; 201
//
// The consent evidence is required but, with no evidence store yet, cannot be
// confirmed to show that the granting party agreed; the decision says so.

import { randomUUID } from "node:crypto";

import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsMandateEligibilityChecks,
  ScsMandateRegistrationDecision,
  ScsMandateRegistrationReceipt,
  ScsMandateRegistrationRequest,
  ScsMandateRegistrationResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { REGISTRANT_ROLE } from "./register-party.js";
import { checkFrameworks, checkScope, checkValidityPeriod, scopeReason } from "./rules.js";
import { findConflictingMandate, findCoveringRelationship, findPartiesById, insertMandate, lockMandatePair } from "./store.js";

/** ScsRepresentationMandate.schemaVersion written by this implementation. */
export const MANDATE_SCHEMA_VERSION = "1";

const OTHER_ACTION = "OTHER_EXPLICITLY_NAMED";

export async function registerMandate(ctx: RouteContext<ScsMandateRegistrationRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const { grantingPartyId, representativePartyId, permittedActions } = request;

  // 1. Authority
  if (!actor.roles.includes(REGISTRANT_ROLE)) {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Registering a mandate requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. OTHER described
  const namesOther = permittedActions.includes(OTHER_ACTION);
  if (namesOther && request.otherActionDescription === undefined) {
    throw cap02Failure("OTHER_TYPE_REQUIRES_DESCRIPTION", [`permittedActions includes ${OTHER_ACTION}; otherActionDescription must name the specific action.`]);
  }
  if (!namesOther && request.otherActionDescription !== undefined) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/otherActionDescription: must be absent unless permittedActions includes ${OTHER_ACTION}.`,
    ]);
  }

  // 3. Validity period (both bounds are required by the schema)
  checkValidityPeriod(request.validFrom, request.validUntil);

  // 4. Two parties
  if (grantingPartyId === representativePartyId) {
    throw cap02Failure("SELF_GRANTED_MANDATE", [`grantingPartyId and representativePartyId are both ${grantingPartyId}; a party cannot grant a mandate to itself.`]);
  }

  // 5. Parties exist
  const parties = await findPartiesById(tx, [grantingPartyId, representativePartyId]);
  const granting = parties.get(grantingPartyId);
  const representative = parties.get(representativePartyId);
  if (granting === undefined) throw cap02Failure("GRANTING_PARTY_NOT_FOUND", [`No party is registered with grantingPartyId ${grantingPartyId}.`]);
  if (representative === undefined) {
    throw cap02Failure("REPRESENTATIVE_PARTY_NOT_FOUND", [`No party is registered with representativePartyId ${representativePartyId}.`]);
  }

  // 6. Not retired
  const retired = [granting, representative].filter((p) => p.registrationStatus === "RETIRED");
  if (retired.length > 0) {
    throw cap02Failure("PARTY_RETIRED", retired.map((p) => `Party ${p.partyId} is RETIRED and cannot take part in a new mandate.`));
  }

  // 7. Frameworks
  const frameworks = await checkFrameworks(tx, request.frameworkAssociationIds);

  // 8. Scope
  checkScope(frameworks, request.commodityScope, request.geographicScope);

  // 9. Relationship prerequisite
  const relationshipId = await findCoveringRelationship(tx, grantingPartyId, representativePartyId, request.frameworkAssociationIds);
  if (relationshipId === null) {
    throw cap02Failure("RELATIONSHIP_NOT_FOUND", [
      `No ACTIVE, unexpired relationship between ${grantingPartyId} and ${representativePartyId} references every framework of this mandate (${request.frameworkAssociationIds.join(", ")}). A mandate grants submission authority within a registered supply-chain relationship.`,
    ]);
  }

  // 10. Conflict
  await lockMandatePair(tx, grantingPartyId, representativePartyId);
  const existing = await findConflictingMandate(tx, {
    grantingPartyId,
    representativePartyId,
    frameworkAssociationIds: request.frameworkAssociationIds,
    permittedActions,
    validFrom: request.validFrom,
    validUntil: request.validUntil,
  });
  if (existing !== null) {
    throw cap02Failure("CONFLICTING_RECORD", [
      `A NOT_REVOKED mandate from ${grantingPartyId} to ${representativePartyId} sharing a framework and a permitted action and overlapping this validity period already exists: mandateId ${existing}.`,
    ]);
  }

  // 11. Insert
  const inserted = await insertMandate(tx, { request, schemaVersion: MANDATE_SCHEMA_VERSION, createdBy: actor });

  // 12. Decision
  const eligibilityChecks: ScsMandateEligibilityChecks = {
    registrantAuthorised: true,
    grantingPartyExists: true,
    representativePartyExists: true,
    partiesNotRetired: true,
    notSelfGranted: true,
    activeRelationshipExists: true,
    otherActionDescribed: true,
    frameworksExist: true,
    frameworksActive: true,
    scopeWithinFrameworks: true,
    validityPeriodValid: true,
    consentEvidenceProvided: true,
    noConflictingRecord: true,
  };
  const consentCount = request.mandateEvidenceIds.length;
  const decision: ScsMandateRegistrationDecision = {
    decisionId: randomUUID(),
    mandateId: inserted.mandateId,
    decision: "REGISTERED",
    eligibilityChecks,
    decisionReasons: [
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      `grantingPartyExists: evaluated — party ${grantingPartyId} is registered.`,
      `representativePartyExists: evaluated — party ${representativePartyId} is registered.`,
      `partiesNotRetired: evaluated — registrationStatus ${granting.registrationStatus} and ${representative.registrationStatus}; neither is RETIRED.`,
      "notSelfGranted: evaluated — the granting and representative parties differ.",
      `activeRelationshipExists: evaluated — relationship ${relationshipId} is ACTIVE, unexpired and references every framework of this mandate.`,
      namesOther
        ? `otherActionDescribed: evaluated — ${OTHER_ACTION} carries otherActionDescription.`
        : `otherActionDescribed: evaluated — no ${OTHER_ACTION} action, and no description was given.`,
      `frameworksExist: evaluated — ${frameworks.length} SCS-CAP-01 framework(s) registered: ${frameworks.map((f) => f.frameworkId).join(", ")}.`,
      "frameworksActive: evaluated — every referenced framework is ACTIVE.",
      scopeReason(frameworks.length),
      `validityPeriodValid: evaluated — the mandate runs from ${request.validFrom} and expires at ${request.validUntil}.`,
      `consentEvidenceProvided: evaluated — ${consentCount} consent evidence id(s) provided. Their content is not verified: see below.`,
      "noConflictingRecord: evaluated — no NOT_REVOKED mandate for this pair shares a framework and a permitted action and overlaps this validity period.",
      `Registration is not verification: REGISTERED records a claimed mandate (verificationStatus CLAIMED_UNVERIFIED) permitting only ${permittedActions.join(", ")}. It verifies neither party and permits no approval, alteration of the granting party's identity, or legal declaration on its behalf.`,
      // TODO(evidence-store): replace this disclosure with a real existence check once the evidence store is built.
      `Evidence ids not confirmed: the evidence store is not yet built, so the ${consentCount} consent evidence id(s) cannot be confirmed to identify any document, or to show that the granting party agreed. They are recorded as submitted.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.createdAt,
  };

  // 13. Receipt — same transaction; any failure rolls back the mandate too
  const written = await writeReceipt<ScsMandateRegistrationReceipt, typeof CAPABILITY_ID, ScsMandateRegistrationDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "MANDATE_REGISTRATION",
    subjectId: inserted.mandateId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02MandateRegistrationReceipt,
  });

  const body: ScsMandateRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
