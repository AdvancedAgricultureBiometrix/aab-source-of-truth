// SCS-CAP-02 registerRelationship — POST /scs/v1/relationships.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against relationship-registration-request.schema.json (party and
// framework ids are lowercase UUIDs; at least one framework; scope not
// empty), checked the Idempotency-Key and opened the transaction (ctx.tx).
// Everything below runs in that one transaction.
//
// Order (contract 9a3e978):
//   1. authority       — COMPLIANCE_OFFICER only → REGISTRANT_NOT_AUTHORISED (403)
//   2. OTHER described — relationshipType OTHER needs
//                        otherRelationshipTypeDescription
//                        → OTHER_TYPE_REQUIRES_DESCRIPTION (400); a description
//                        without OTHER is a request error
//                        → REQUEST_VALIDATION_FAILED (400)
//   3. validity period — validUntil after validFrom → VALIDITY_PERIOD_INVALID (400)
//   4. two parties     — fromPartyId ≠ toPartyId → SELF_REFERENTIAL_RELATIONSHIP (422)
//   5. claiming party  — claimedByPartyId is fromPartyId or toPartyId
//                        → CLAIMING_PARTY_NOT_IN_RELATIONSHIP (400)
//   6. parties exist   — FROM_PARTY_NOT_FOUND, TO_PARTY_NOT_FOUND (422)
//   7. not retired     — neither party RETIRED → PARTY_RETIRED (422)
//   8. frameworks      — each a registered CAP-01 framework
//                        (FRAMEWORK_ASSOCIATION_NOT_FOUND, 422) and ACTIVE
//                        (FRAMEWORK_NOT_ACTIVE, 422)
//   9. scope           — within the frameworks → SCOPE_OUTSIDE_FRAMEWORK (422)
//  10. conflict        — lock (from, to, type), then an ACTIVE relationship with
//                        the same from, to and type, a shared framework and an
//                        overlapping validity period → CONFLICTING_RECORD (409),
//                        naming it
//  11. insert          — CLAIMED_UNVERIFIED, ACTIVE; database-generated
//                        relationshipId; never supersedes another relationship
//  12. decision        — REGISTERED; all twelve checks were performed, so all
//                        are true, each with an "evaluated" reason
//  13. receipt         — RELATIONSHIP_REGISTRATION, same transaction; 201
//
// Registering a relationship verifies neither party and proves no commodity
// movement. Any failure is thrown, so nothing is written.

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsRelationshipEligibilityChecks,
  ScsRelationshipRegistrationDecision,
  ScsRelationshipRegistrationReceipt,
  ScsRelationshipRegistrationRequest,
  ScsRelationshipRegistrationResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { REGISTRANT_ROLE } from "./register-party.js";
import { checkFrameworks, checkScope, checkValidityPeriod, scopeReason } from "./rules.js";
import { findConflictingRelationship, findPartiesById, insertRelationship, lockRelationshipKey } from "./store.js";

/** ScsSupplyChainRelationship.schemaVersion written by this implementation. */
export const RELATIONSHIP_SCHEMA_VERSION = "1";

/** Contract gap (9a3e978): representationVersion's meaning is undefined; the system sets "1" until it is. */
export const REPRESENTATION_VERSION = "1";

export async function registerRelationship(ctx: RouteContext<ScsRelationshipRegistrationRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const { fromPartyId, toPartyId, claimedByPartyId, relationshipType } = request;

  // 1. Authority
  if (!holdsRole(actor, REGISTRANT_ROLE)) {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Registering a relationship requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. OTHER described
  if (relationshipType === "OTHER" && request.otherRelationshipTypeDescription === undefined) {
    throw cap02Failure("OTHER_TYPE_REQUIRES_DESCRIPTION", ["relationshipType OTHER requires otherRelationshipTypeDescription naming the relationship."]);
  }
  if (relationshipType !== "OTHER" && request.otherRelationshipTypeDescription !== undefined) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/otherRelationshipTypeDescription: must be absent unless relationshipType is OTHER (it is ${relationshipType}).`,
    ]);
  }

  // 3. Validity period
  checkValidityPeriod(request.validFrom, request.validUntil);

  // 4. Two parties
  if (fromPartyId === toPartyId) {
    throw cap02Failure("SELF_REFERENTIAL_RELATIONSHIP", [`fromPartyId and toPartyId are both ${fromPartyId}; a relationship connects exactly two parties.`]);
  }

  // 5. Claiming party
  if (claimedByPartyId !== fromPartyId && claimedByPartyId !== toPartyId) {
    throw cap02Failure("CLAIMING_PARTY_NOT_IN_RELATIONSHIP", [
      `claimedByPartyId ${claimedByPartyId} is neither fromPartyId nor toPartyId; a bilateral relationship is claimed by a party to it.`,
    ]);
  }

  // 6. Parties exist
  const parties = await findPartiesById(tx, [fromPartyId, toPartyId]);
  const from = parties.get(fromPartyId);
  const to = parties.get(toPartyId);
  if (from === undefined) throw cap02Failure("FROM_PARTY_NOT_FOUND", [`No party is registered with fromPartyId ${fromPartyId}.`]);
  if (to === undefined) throw cap02Failure("TO_PARTY_NOT_FOUND", [`No party is registered with toPartyId ${toPartyId}.`]);

  // 7. Not retired
  const retired = [from, to].filter((p) => p.registrationStatus === "RETIRED");
  if (retired.length > 0) {
    throw cap02Failure("PARTY_RETIRED", retired.map((p) => `Party ${p.partyId} is RETIRED and cannot take part in a new relationship.`));
  }

  // 8. Frameworks
  const frameworks = await checkFrameworks(tx, request.frameworkAssociationIds);

  // 9. Scope
  checkScope(frameworks, request.commodityScope, request.geographicScope);

  // 10. Conflict
  const key = { fromPartyId, toPartyId, relationshipType };
  await lockRelationshipKey(tx, key);
  const existing = await findConflictingRelationship(tx, {
    ...key,
    frameworkAssociationIds: request.frameworkAssociationIds,
    validFrom: request.validFrom ?? null,
    validUntil: request.validUntil ?? null,
  });
  if (existing !== null) {
    throw cap02Failure("CONFLICTING_RECORD", [
      `An ACTIVE ${relationshipType} relationship from ${fromPartyId} to ${toPartyId} sharing a framework and overlapping this validity period already exists: relationshipId ${existing}.`,
    ]);
  }

  // 11. Insert
  const inserted = await insertRelationship(tx, {
    request,
    schemaVersion: RELATIONSHIP_SCHEMA_VERSION,
    representationVersion: REPRESENTATION_VERSION,
    createdBy: actor,
  });

  // 12. Decision
  const eligibilityChecks: ScsRelationshipEligibilityChecks = {
    registrantAuthorised: true,
    fromPartyExists: true,
    toPartyExists: true,
    partiesNotRetired: true,
    notSelfReferential: true,
    claimingPartyIsAParty: true,
    otherTypeDescribed: true,
    frameworksExist: true,
    frameworksActive: true,
    scopeWithinFrameworks: true,
    validityPeriodValid: true,
    noConflictingRecord: true,
  };
  const frameworkList = frameworks.map((f) => f.frameworkId).join(", ");
  const evidenceCount = request.relationshipEvidenceIds.length;
  const decision: ScsRelationshipRegistrationDecision = {
    decisionId: randomUUID(),
    relationshipId: inserted.relationshipId,
    decision: "REGISTERED",
    eligibilityChecks,
    decisionReasons: [
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      `fromPartyExists: evaluated — party ${fromPartyId} is registered.`,
      `toPartyExists: evaluated — party ${toPartyId} is registered.`,
      `partiesNotRetired: evaluated — registrationStatus ${from.registrationStatus} and ${to.registrationStatus}; neither is RETIRED.`,
      "notSelfReferential: evaluated — fromPartyId and toPartyId differ.",
      `claimingPartyIsAParty: evaluated — claimedByPartyId is the ${claimedByPartyId === fromPartyId ? "from" : "to"} party.`,
      relationshipType === "OTHER"
        ? "otherTypeDescribed: evaluated — relationshipType OTHER carries otherRelationshipTypeDescription."
        : `otherTypeDescribed: evaluated — relationshipType ${relationshipType} needs no description, and none was given.`,
      `frameworksExist: evaluated — ${frameworks.length} SCS-CAP-01 framework(s) registered: ${frameworkList}.`,
      "frameworksActive: evaluated — every referenced framework is ACTIVE.",
      scopeReason(frameworks.length),
      request.validFrom !== undefined && request.validUntil !== undefined
        ? "validityPeriodValid: evaluated — validUntil is after validFrom."
        : "validityPeriodValid: evaluated — the validity period is open-ended on at least one side.",
      "noConflictingRecord: evaluated — no ACTIVE relationship with the same from, to and type shares a framework and overlaps this validity period.",
      "Registration is not verification: REGISTERED records a claimed relationship (verificationStatus CLAIMED_UNVERIFIED). It verifies neither party and proves no commodity movement.",
      // TODO(evidence-id-model): evidence ids predate the AAB-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${evidenceCount} cited relationship evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. They are recorded as submitted.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.createdAt,
  };

  // 13. Receipt — same transaction; any failure rolls back the relationship too
  const written = await writeReceipt<ScsRelationshipRegistrationReceipt, typeof CAPABILITY_ID, ScsRelationshipRegistrationDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "RELATIONSHIP_REGISTRATION",
    subjectId: inserted.relationshipId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02RelationshipRegistrationReceipt,
  });

  const body: ScsRelationshipRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
