// SCS-CAP-02 addRoleClaim — POST /scs/v1/parties/:partyId/roles.
//
// Before this runs, the server layer has authenticated the actor, validated
// partyId (a UUID) and the body against role-claim-request.schema.json (role
// enumerated; framework id a lowercase UUID; scope not empty), checked the
// Idempotency-Key and opened the transaction (ctx.tx). Everything below runs
// in that one transaction.
//
// Order (contract 9a3e978):
//   1. authority       — COMPLIANCE_OFFICER only → REGISTRANT_NOT_AUTHORISED (403)
//   2. OTHER described — claimedRole OTHER needs otherRoleDescription
//                        → OTHER_TYPE_REQUIRES_DESCRIPTION (400); a description
//                        without OTHER is a request error → REQUEST_VALIDATION_FAILED (400)
//   3. validity period — validUntil after validFrom → VALIDITY_PERIOD_INVALID (400)
//   4. party           — the path's party exists → PARTY_NOT_FOUND (404)
//   5. not retired     — PARTY_RETIRED (422)
//   6. framework       — a registered CAP-01 framework
//                        (FRAMEWORK_ASSOCIATION_NOT_FOUND, 422) and ACTIVE
//                        (FRAMEWORK_NOT_ACTIVE, 422)
//   7. scope           — within the framework → SCOPE_OUTSIDE_FRAMEWORK (422)
//   8. conflict        — lock (party, role, framework), then a claim for the
//                        same party, role and framework, not SUPERSEDED or
//                        EXPIRED, with an overlapping validity period
//                        → CONFLICTING_RECORD (409), naming it (the status
//                        exclusion is a contract gap recorded in 211be95)
//   9. insert          — the party's current version; frameworkVersion is the
//                        framework's regulationVersion (set by the system, never
//                        by the client); CLAIMED_UNVERIFIED
//  10. decision        — REGISTERED; all nine checks were performed, so all are
//                        true, each with an "evaluated" reason
//  11. receipt         — ROLE_CLAIM_REGISTRATION, same transaction; 201
//
// A role claim is a claim: registering it verifies neither the role nor the
// party. Any failure is thrown, so nothing is written.

import { randomUUID } from "node:crypto";

import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsRoleClaimDecision,
  ScsRoleClaimEligibilityChecks,
  ScsRoleClaimReceipt,
  ScsRoleClaimRequest,
  ScsRoleClaimResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { REGISTRANT_ROLE } from "./register-party.js";
import { checkFrameworks, checkScope, checkValidityPeriod, scopeReason } from "./rules.js";
import { findConflictingRoleClaim, findParty, insertRoleClaim, lockRoleClaimKey } from "./store.js";

export async function addRoleClaim(ctx: RouteContext<ScsRoleClaimRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const requestedPartyId = ctx.params["partyId"]!;
  const { claimedRole } = request;

  // 1. Authority
  if (!actor.roles.includes(REGISTRANT_ROLE)) {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Registering a role claim requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. OTHER described
  if (claimedRole === "OTHER" && request.otherRoleDescription === undefined) {
    throw cap02Failure("OTHER_TYPE_REQUIRES_DESCRIPTION", ["claimedRole OTHER requires otherRoleDescription naming the role."]);
  }
  if (claimedRole !== "OTHER" && request.otherRoleDescription !== undefined) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/otherRoleDescription: must be absent unless claimedRole is OTHER (it is ${claimedRole}).`,
    ]);
  }

  // 3. Validity period
  checkValidityPeriod(request.validFrom, request.validUntil);

  // 4. Party exists
  const party = await findParty(tx, requestedPartyId);
  if (party === null) throw cap02Failure("PARTY_NOT_FOUND", [`No party is registered with partyId ${requestedPartyId}.`]);

  // 5. Not retired
  if (party.registrationStatus === "RETIRED") {
    throw cap02Failure("PARTY_RETIRED", [`Party ${party.partyId} is RETIRED and cannot take a new role claim.`]);
  }

  // 6. Framework
  const [framework] = await checkFrameworks(tx, [request.frameworkAssociationId]);

  // 7. Scope
  checkScope([framework!], request.commodityScope, request.geographicScope);

  // 8. Conflict
  await lockRoleClaimKey(tx, party.partyId, claimedRole, framework!.frameworkId);
  const existing = await findConflictingRoleClaim(tx, {
    partyId: party.partyId,
    claimedRole,
    frameworkId: framework!.frameworkId,
    validFrom: request.validFrom ?? null,
    validUntil: request.validUntil ?? null,
  });
  if (existing !== null) {
    throw cap02Failure("CONFLICTING_RECORD", [
      `A ${claimedRole} role claim for party ${party.partyId} under framework ${framework!.frameworkId}, not SUPERSEDED or EXPIRED, overlapping this validity period already exists: roleClaimId ${existing}.`,
    ]);
  }

  // 9. Insert
  const inserted = await insertRoleClaim(tx, { party, framework: framework!, request, claimedBy: actor });

  // 10. Decision
  const eligibilityChecks: ScsRoleClaimEligibilityChecks = {
    registrantAuthorised: true,
    partyExists: true,
    partyNotRetired: true,
    otherRoleDescribed: true,
    frameworkExists: true,
    frameworkActive: true,
    scopeWithinFramework: true,
    validityPeriodValid: true,
    noConflictingRecord: true,
  };
  const evidenceCount = request.roleEvidenceIds.length;
  const decision: ScsRoleClaimDecision = {
    decisionId: randomUUID(),
    roleClaimId: inserted.roleClaimId,
    partyId: party.partyId,
    partyVersion: party.partyVersion,
    decision: "REGISTERED",
    eligibilityChecks,
    decisionReasons: [
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      `partyExists: evaluated — party ${party.partyId} is registered (version ${party.partyVersion}).`,
      `partyNotRetired: evaluated — registrationStatus is ${party.registrationStatus}, not RETIRED.`,
      claimedRole === "OTHER"
        ? "otherRoleDescribed: evaluated — claimedRole OTHER carries otherRoleDescription."
        : `otherRoleDescribed: evaluated — claimedRole ${claimedRole} needs no description, and none was given.`,
      `frameworkExists: evaluated — SCS-CAP-01 framework ${framework!.frameworkId} is registered; frameworkVersion recorded as its regulationVersion (${framework!.regulationVersion}).`,
      "frameworkActive: evaluated — the framework is ACTIVE.",
      // one framework: the per-framework pairing gap cannot arise
      scopeReason(1, "scopeWithinFramework"),
      request.validFrom !== undefined && request.validUntil !== undefined
        ? "validityPeriodValid: evaluated — validUntil is after validFrom."
        : "validityPeriodValid: evaluated — the validity period is open-ended on at least one side.",
      "noConflictingRecord: evaluated — no role claim for this party, role and framework that is not SUPERSEDED or EXPIRED overlaps this validity period.",
      `Registration is not verification: REGISTERED records a claimed ${claimedRole} role (verificationStatus CLAIMED_UNVERIFIED). Neither the role nor the party is verified.`,
      // TODO(evidence-id-model): evidence ids predate the SCS-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${evidenceCount} cited role evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. They are recorded as submitted.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.claimedAt,
  };

  // 11. Receipt — same transaction; any failure rolls back the claim too
  const written = await writeReceipt<ScsRoleClaimReceipt, typeof CAPABILITY_ID, ScsRoleClaimDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "ROLE_CLAIM_REGISTRATION",
    subjectId: inserted.roleClaimId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02RoleClaimReceipt,
  });

  const body: ScsRoleClaimResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
