// SCS-CAP-01 registerFramework — POST /scs/v1/frameworks.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against framework-registration-request.schema.json, checked the
// Idempotency-Key and opened the transaction (ctx.tx). Everything below runs
// in that one transaction: the framework row, the decision and its receipt
// commit together or not at all.
//
// Order:
//   1. authority     — the actor must hold COMPLIANCE_OFFICER, the role the
//                      contract names ("an authorised compliance officer").
//                      Nothing else authorises registration.
//                      → REGISTRANT_NOT_AUTHORISED (403)
//   1a. attestation  — applicableLawsAttested must be true (the schema makes
//                      it a required boolean). false → APPLICABLE_LAWS_UNCONFIRMED
//                      (422). applicableLawsConfirmed is then evaluated from
//                      the attestation: a registrant declaration, not an
//                      independent confirmation (contract 5eb01d4)
//   2. effective period — effectiveTo, when given, not before effectiveFrom
//                      → REQUEST_VALIDATION_FAILED (400); checked here so the
//                        database constraint is only ever a last line of defence
//   3. conflict      — lock the scope for this transaction, then look for an
//                      ACTIVE framework with the same regulationId,
//                      regulationVersion, commodityCode, countryOfOrigin and
//                      destinationMarket whose effective period overlaps
//                      → CONFLICTING_FRAMEWORK_EXISTS (409), naming it
//   4. insert        — the database generates frameworkId; CAP-01 generates
//                      specId, generatedAt (= transaction time) and
//                      generatedFromFrameworkVersion ("1": first version)
//   5. decision      — REGISTERED. An eligibility check is true only if it
//                      was actually performed and passed; checks the contract
//                      gives no evaluation rule for are false and are named in
//                      decisionReasons as not evaluated, never silently false
//   6. receipt       — written in the same transaction (foundation/receipts.ts)
//   7. 201 with { decision, receipt, receiptDigest }
//
// Any failure is thrown, so the whole transaction rolls back and nothing —
// framework, receipt or idempotency record — is written.

import { randomUUID } from "node:crypto";

import { capabilityPlatformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsFrameworkEligibilityChecks,
  ScsFrameworkRegistrationDecision,
  ScsFrameworkRegistrationReceipt,
  ScsFrameworkRegistrationRequest,
  ScsFrameworkRegistrationResponse,
} from "../../types/cap-01.js";
import { CAPABILITY_ID, cap01Failure } from "./errors.js";
import { findConflictingActiveFramework, insertFramework, lockScope, scopeKeyOf } from "./store.js";

/** The only role that may register a framework — as the SCS-CAP-01 contract states. */
export const REGISTRANT_ROLE = "COMPLIANCE_OFFICER";

/** ScsRegulatoryFramework.schemaVersion written by this implementation. */
export const FRAMEWORK_SCHEMA_VERSION = "1";

/** generatedFromFrameworkVersion at registration: the framework's first version. */
export const INITIAL_FRAMEWORK_VERSION = "1";

/**
 * Eligibility checks the SCS-CAP-01 contract names but gives no evaluation
 * rule for. They are not performed in the pilot and are recorded as false,
 * with an explicit reason each. TODO(eligibility-rules): contract gap — the
 * rules must be specified in the contract before these can be evaluated.
 * (applicableLawsConfirmed is evaluated, from the registrant's attestation.)
 */
const NOT_EVALUATED: ReadonlyArray<keyof ScsFrameworkEligibilityChecks> = [
  "regulationReferenceValid",
  "commodityRecognised",
  "countryOfOriginValid",
  "destinationMarketValid",
];

export async function registerFramework(ctx: RouteContext<ScsFrameworkRegistrationRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;

  // 1. Authority
  if (!actor.roles.includes(REGISTRANT_ROLE)) {
    throw cap01Failure("REGISTRANT_NOT_AUTHORISED", [
      `Registering a regulatory framework requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 1a. Attestation
  if (request.applicableLawsAttested !== true) {
    throw cap01Failure("APPLICABLE_LAWS_UNCONFIRMED", [
      "applicableLawsAttested must be true: the registrant must attest that the applicable national laws for this scope have been confirmed before a framework can be registered.",
    ]);
  }

  // 2. Effective period
  const { effectiveFrom, effectiveTo } = request.scope;
  if (effectiveTo !== undefined && effectiveTo < effectiveFrom) {
    throw capabilityPlatformFailure(CAPABILITY_ID, "REQUEST_VALIDATION_FAILED", [
      `/scope/effectiveTo: must not be before effectiveFrom (${effectiveFrom}).`,
    ]);
  }

  // 3. Conflict
  const key = scopeKeyOf(request);
  await lockScope(tx, key);
  const existing = await findConflictingActiveFramework(tx, key);
  if (existing !== null) {
    throw cap01Failure("CONFLICTING_FRAMEWORK_EXISTS", [
      `An ACTIVE framework already governs this regulation, version, commodity, country of origin and destination market for an overlapping effective period: frameworkId ${existing}.`,
    ]);
  }

  // 4. Insert
  const specId = randomUUID();
  const inserted = await insertFramework(tx, {
    request,
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    registeredBy: actor,
    specId,
    generatedFromFrameworkVersion: INITIAL_FRAMEWORK_VERSION,
  });

  // 5. Decision
  const eligibilityChecks: ScsFrameworkEligibilityChecks = {
    registrantAuthorised: true,
    noConflictingFrameworkExists: true,
    regulationReferenceValid: false,
    commodityRecognised: false,
    countryOfOriginValid: false,
    destinationMarketValid: false,
    applicableLawsConfirmed: true,
  };
  const decision: ScsFrameworkRegistrationDecision = {
    decisionId: randomUUID(),
    frameworkId: inserted.frameworkId,
    decision: "REGISTERED",
    eligibilityChecks,
    decisionReasons: [
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      "noConflictingFrameworkExists: evaluated — no ACTIVE framework governs the same regulation, version, commodity, country of origin and destination market for an overlapping effective period.",
      `applicableLawsConfirmed: evaluated from registrant attestation — actor ${actor.actorId} attested applicableLawsAttested: true. This is the registrant's declaration, not an independent confirmation.`,
      ...NOT_EVALUATED.map(
        (check) =>
          `${check}: NOT EVALUATED — recorded false because the check was not performed, not because it failed. The SCS-CAP-01 contract defines no evaluation rule for it (contract gap).`,
      ),
      `Evidence requirement values were declared by the registrant, not derived (contract gap: no derivation rules); CAP-01 generated specId ${specId}, generatedAt and generatedFromFrameworkVersion ${INITIAL_FRAMEWORK_VERSION}.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.registeredAt,
  };

  // 6. Receipt — same transaction; any failure rolls back the framework too
  const written = await writeReceipt<ScsFrameworkRegistrationReceipt, typeof CAPABILITY_ID, ScsFrameworkRegistrationDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "FRAMEWORK_REGISTRATION",
    subjectId: inserted.frameworkId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap01FrameworkRegistrationReceipt,
  });

  // 7. Response
  const body: ScsFrameworkRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
