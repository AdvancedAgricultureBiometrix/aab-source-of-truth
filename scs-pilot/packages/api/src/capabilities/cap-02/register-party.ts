// SCS-CAP-02 registerParty — POST /scs/v1/parties.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against party-registration-request.schema.json (partyType is one of
// the contract's six values; partyName is present and not blank), checked the
// Idempotency-Key and opened the transaction (ctx.tx). Everything below runs
// in that one transaction: the party row, its evidence links, the decision and
// its receipt commit together or not at all.
//
// Order:
//   1. authority     — the actor must hold COMPLIANCE_OFFICER, the role that
//                      registers parties in the contract's registration
//                      sequence. Nothing else authorises registration.
//                      → REGISTRANT_NOT_AUTHORISED (403)
//   2. country codes — countryOfRegistration, and countryOfOperation when
//                      given, must be officially assigned ISO 3166-1 alpha-2
//                      codes (src/reference) → COUNTRY_CODE_UNRECOGNISED (422)
//   3. conflict      — LEGAL_ENTITY, COOPERATIVE, COMMUNITY_GROUP and
//                      GOVERNMENT_BODY only: lock the conflict key for this
//                      transaction, then look for a party of those types that
//                      is not RETIRED with exactly the same partyName and
//                      countryOfRegistration
//                      → CONFLICTING_REGISTRATION_DETECTED (409), naming it.
//                      NATURAL_PERSON and OTHER are not checked: name and
//                      country cannot identify a person, so deduplication is a
//                      human review concern (contract gap, recorded)
//   4. insert        — the database generates partyId; partyVersion 1,
//                      registrationStatus REGISTERED; one evidence link per
//                      evidence id
//   5. decision      — REGISTERED, no gaps. Every check performed is true
//                      with an "evaluated" reason; for NATURAL_PERSON and
//                      OTHER, noConflictingRegistrationDetected was not
//                      performed, so it is false with a NOT EVALUATED reason
//   6. receipt       — written in the same transaction (foundation/receipts.ts)
//   7. 201 with { decision, receipt, receiptDigest }
//
// Registration is not verification: REGISTERED means a governed record
// exists, nothing more. Any failure is thrown, so the whole transaction rolls
// back and nothing — party, evidence links, receipt or idempotency record —
// is written.

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { isIso3166Alpha2 } from "../../reference/countries.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsPartyEligibilityChecks,
  ScsPartyRegistrationDecision,
  ScsPartyRegistrationReceipt,
  ScsPartyRegistrationRequest,
  ScsPartyRegistrationResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { CONFLICT_CHECKED_PARTY_TYPES, findConflictingParty, insertParty, isConflictChecked, lockPartyKey } from "./store.js";

/** The only role that may register a party — the Compliance Officer of the contract's registration sequence. */
export const REGISTRANT_ROLE = "COMPLIANCE_OFFICER";

/** ScsPartyIdentity.schemaVersion written by this implementation. */
export const PARTY_SCHEMA_VERSION = "1";

/** partyVersion at registration. */
export const INITIAL_PARTY_VERSION = 1;

export async function registerParty(ctx: RouteContext<ScsPartyRegistrationRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;

  // 1. Authority
  if (!holdsRole(actor, REGISTRANT_ROLE)) {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Registering a party requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. Country codes
  const unrecognised = [
    ["countryOfRegistration", request.countryOfRegistration],
    ["countryOfOperation", request.countryOfOperation],
  ].filter((pair): pair is [string, string] => pair[1] !== undefined && !isIso3166Alpha2(pair[1]));
  if (unrecognised.length > 0) {
    throw cap02Failure(
      "COUNTRY_CODE_UNRECOGNISED",
      unrecognised.map(([field, value]) => `/${field}: "${value}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`),
    );
  }

  // 3. Conflict — organisational party types only
  const conflictChecked = isConflictChecked(request.partyType);
  if (conflictChecked) {
    const key = { partyName: request.partyName, countryOfRegistration: request.countryOfRegistration };
    await lockPartyKey(tx, key);
    const existing = await findConflictingParty(tx, key);
    if (existing !== null) {
      throw cap02Failure("CONFLICTING_REGISTRATION_DETECTED", [
        `A ${CONFLICT_CHECKED_PARTY_TYPES.join(" / ")} party that is not RETIRED is already registered with this partyName and countryOfRegistration: partyId ${existing}.`,
      ]);
    }
  }

  // 4. Insert
  const inserted = await insertParty(tx, {
    request,
    partyVersion: INITIAL_PARTY_VERSION,
    schemaVersion: PARTY_SCHEMA_VERSION,
    registeredBy: actor,
  });

  // 5. Decision
  const eligibilityChecks: ScsPartyEligibilityChecks = {
    partyTypeValid: true,
    partyNameProvided: true,
    countryCodeValid: true,
    registrantAuthorised: true,
    noConflictingRegistrationDetected: conflictChecked,
  };
  const evidenceCount = request.identityEvidence.evidenceIds.length;
  const decision: ScsPartyRegistrationDecision = {
    decisionId: randomUUID(),
    partyId: inserted.partyId,
    decision: "REGISTERED",
    eligibilityChecks,
    gaps: [],
    decisionReasons: [
      `partyTypeValid: evaluated — ${request.partyType} is one of the contract's party types (request schema).`,
      "partyNameProvided: evaluated — partyName is present and not blank (request schema).",
      `countryCodeValid: evaluated — ${[request.countryOfRegistration, request.countryOfOperation].filter((c) => c !== undefined).join(" and ")} ${request.countryOfOperation === undefined ? "is an" : "are"} officially assigned ISO 3166-1 alpha-2 code${request.countryOfOperation === undefined ? "" : "s"}.`,
      `registrantAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      conflictChecked
        ? `noConflictingRegistrationDetected: evaluated — no ${CONFLICT_CHECKED_PARTY_TYPES.join(" / ")} party that is not RETIRED has the same partyName and countryOfRegistration.`
        : `noConflictingRegistrationDetected: NOT EVALUATED — no automatic conflict check for ${request.partyType}: name and country of registration cannot establish that two registrations are the same party. Deduplication is a human review concern.`,
      `Registration is not verification: REGISTERED means a governed record of this party exists, nothing more. Legal identity, sanctions clearance, beneficial ownership, regulatory eligibility and supply-chain role are not verified. ${evidenceCount} identity evidence id(s) recorded, not verified.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.registeredAt,
  };

  // 6. Receipt — same transaction; any failure rolls back the party too
  const written = await writeReceipt<ScsPartyRegistrationReceipt, typeof CAPABILITY_ID, ScsPartyRegistrationDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "PARTY_REGISTRATION",
    subjectId: inserted.partyId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02PartyRegistrationReceipt,
  });

  // 7. Response
  const body: ScsPartyRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
