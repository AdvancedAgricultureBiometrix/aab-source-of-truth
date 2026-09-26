// SCS-CAP-02 addVerificationAssessment — POST /scs/v1/parties/:partyId/verifications.
//
// Before this runs, the server layer has authenticated the actor, validated
// partyId (a UUID) and the body against
// verification-assessment-request.schema.json (at least one evidence id, ids
// lowercase UUIDs), checked the Idempotency-Key and opened the transaction
// (ctx.tx). Everything below runs in that one transaction.
//
// Order (contract e85c58a, "Recording rules"):
//   1. authority      — VERIFICATION_OFFICER → VERIFIER_NOT_AUTHORISED (403)
//   2. status         — PARTIALLY_VERIFIED, VERIFIED_FOR_DECLARED_SCOPE, DISPUTED
//                       or FAIL_CLOSED; REGISTERED_UNVERIFIED and
//                       VERIFICATION_EXPIRED are derived, never recorded
//                       → VERIFICATION_STATUS_NOT_RECORDABLE (400)
//   3. dates          — verifiedAt not after the transaction time (the database
//                       clock, the instant recordedAt holds); expiresAt strictly
//                       after verifiedAt, so a zero-length window is refused
//                       → VALIDITY_PERIOD_INVALID (400). An already-expired
//                       assessment, and a verifiedAt before the party's
//                       registration, are allowed
//   4. jurisdictions  — both jurisdictionCodes ISO 3166-1 alpha-2
//                       → COUNTRY_CODE_UNRECOGNISED (422)
//   5. party          — exists (PARTY_NOT_FOUND, 404), not RETIRED (PARTY_RETIRED, 422)
//   6. independence   — the actor is not the party's registrant
//                       → VERIFIER_NOT_AUTHORISED (403)
//   7. evidence       — every cited id is linked to the party's current version
//                       → VERIFICATION_EVIDENCE_NOT_LINKED (422), naming the unlinked ids
//   8. supersession   — when given: an assessment of the same party
//                       (SUPERSEDED_ASSESSMENT_NOT_FOUND, 422), not already
//                       superseded (lock, then CONFLICTING_RECORD, 409)
//   9. insert         — at the party's current version; recordedBy the actor
//  10. decision       — RECORDED; all nine checks were performed, so all are true
//  11. receipt        — VERIFICATION_ASSESSMENT, same transaction; 201
//
// An assessment never changes the party's registrationStatus or any earlier
// assessment: supersession is recorded on the new assessment. A party's
// current verification status is derived when read, not stored.

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { isIso3166Alpha2 } from "../../reference/countries.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsVerificationAssessmentDecision,
  ScsVerificationAssessmentReceipt,
  ScsVerificationAssessmentRequest,
  ScsVerificationAssessmentResponse,
  ScsVerificationEligibilityChecks,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import {
  findAssessmentParty,
  findLinkedEvidence,
  findPartyForVerification,
  findSupersedingAssessment,
  insertAssessment,
  lockAssessmentSupersession,
  transactionTime,
} from "./store.js";

/**
 * The only role that may record a verification assessment (contract 9a3e978,
 * separation of duties). TODO(role-registry): see foundation/auth.ts.
 */
export const VERIFIER_ROLE = "VERIFICATION_OFFICER";

/** The statuses an assessment may record; the other two are derived when read. */
export const RECORDABLE_STATUSES: readonly string[] = ["PARTIALLY_VERIFIED", "VERIFIED_FOR_DECLARED_SCOPE", "DISPUTED", "FAIL_CLOSED"];

export async function addVerificationAssessment(ctx: RouteContext<ScsVerificationAssessmentRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const requestedPartyId = ctx.params["partyId"]!;
  const status = request.verificationStatus;

  // 1. Authority
  if (!actor.roles.includes(VERIFIER_ROLE)) {
    throw cap02Failure("VERIFIER_NOT_AUTHORISED", [
      `Recording a verification assessment requires the ${VERIFIER_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. Recordable status
  if (!RECORDABLE_STATUSES.includes(status)) {
    throw cap02Failure("VERIFICATION_STATUS_NOT_RECORDABLE", [
      `verificationStatus ${status} is derived when read, never recorded; an assessment records one of ${RECORDABLE_STATUSES.join(", ")}.`,
    ]);
  }

  // 3. Dates — against the database clock, the instant recordedAt will hold
  const now = await transactionTime(tx);
  const verifiedAt = Date.parse(request.verifiedAt);
  if (verifiedAt > now.getTime()) {
    throw cap02Failure("VALIDITY_PERIOD_INVALID", [`verifiedAt (${request.verifiedAt}) is in the future; the assessment is recorded at ${now.toISOString()}.`]);
  }
  if (request.expiresAt !== undefined && Date.parse(request.expiresAt) <= verifiedAt) {
    throw cap02Failure("VALIDITY_PERIOD_INVALID", [
      Date.parse(request.expiresAt) === verifiedAt
        ? `expiresAt equals verifiedAt (${request.verifiedAt}): a zero-length verification window is not valid.`
        : `expiresAt (${request.expiresAt}) must be after verifiedAt (${request.verifiedAt}).`,
    ]);
  }

  // 4. Jurisdictions
  const unrecognised = [
    ["verificationScope/jurisdictionCode", request.verificationScope.jurisdictionCode],
    ["verifyingAuthority/jurisdictionCode", request.verifyingAuthority.jurisdictionCode],
  ].filter(([, code]) => !isIso3166Alpha2(code!));
  if (unrecognised.length > 0) {
    throw cap02Failure(
      "COUNTRY_CODE_UNRECOGNISED",
      unrecognised.map(([field, code]) => `/${field}: "${code}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`),
    );
  }

  // 5. Party
  const party = await findPartyForVerification(tx, requestedPartyId);
  if (party === null) throw cap02Failure("PARTY_NOT_FOUND", [`No party is registered with partyId ${requestedPartyId}.`]);
  if (party.registrationStatus === "RETIRED") {
    throw cap02Failure("PARTY_RETIRED", [`Party ${party.partyId} is RETIRED and cannot take a new verification assessment.`]);
  }

  // 6. Independence
  if (party.registeredByActorId === actor.actorId) {
    throw cap02Failure("VERIFIER_NOT_AUTHORISED", [
      `Actor ${actor.actorId} registered party ${party.partyId} and cannot also verify it (separation of duties).`,
    ]);
  }

  // 7. Evidence
  const linked = new Set(await findLinkedEvidence(tx, party.partyId, party.partyVersion, request.evidenceIds));
  const unlinked = request.evidenceIds.filter((id) => !linked.has(id));
  if (unlinked.length > 0) {
    throw cap02Failure("VERIFICATION_EVIDENCE_NOT_LINKED", [
      `${unlinked.length} evidence id(s) are not linked to party ${party.partyId} version ${party.partyVersion}: ${unlinked.join(", ")}. Evidence is linked at registration or by an identity evidence submission.`,
    ]);
  }

  // 8. Supersession
  const supersedes = request.supersedesAssessmentId;
  if (supersedes !== undefined) {
    const supersededParty = await findAssessmentParty(tx, supersedes);
    if (supersededParty !== party.partyId) {
      throw cap02Failure("SUPERSEDED_ASSESSMENT_NOT_FOUND", [`No verification assessment ${supersedes} is recorded for party ${party.partyId}.`]);
    }
    await lockAssessmentSupersession(tx, supersedes);
    const already = await findSupersedingAssessment(tx, supersedes);
    if (already !== null) {
      throw cap02Failure("CONFLICTING_RECORD", [`Assessment ${supersedes} is already superseded by assessment ${already}; an assessment is superseded at most once.`]);
    }
  }

  // 9. Insert
  const inserted = await insertAssessment(tx, { party, request, recordedBy: actor });

  // 10. Decision
  const eligibilityChecks: ScsVerificationEligibilityChecks = {
    verifierAuthorised: true,
    statusRecordable: true,
    datesValid: true,
    jurisdictionsRecognised: true,
    partyExists: true,
    partyNotRetired: true,
    verifierIndependentOfRegistrant: true,
    evidenceLinkedToParty: true,
    supersessionValid: true,
  };
  const expired = request.expiresAt !== undefined && Date.parse(request.expiresAt) <= now.getTime();
  const count = request.evidenceIds.length;
  const decision: ScsVerificationAssessmentDecision = {
    decisionId: randomUUID(),
    assessmentId: inserted.assessmentId,
    partyId: party.partyId,
    partyVersion: party.partyVersion,
    decision: "RECORDED",
    eligibilityChecks,
    decisionReasons: [
      `verifierAuthorised: evaluated — actor ${actor.actorId} holds ${VERIFIER_ROLE}.`,
      `statusRecordable: evaluated — ${status} is a recordable status.`,
      request.expiresAt === undefined
        ? "datesValid: evaluated — verifiedAt is not in the future; no expiry."
        : `datesValid: evaluated — verifiedAt is not in the future and expiresAt is after it${expired ? "; the assessment has already expired and is recorded as a historical fact" : ""}.`,
      `jurisdictionsRecognised: evaluated — ${request.verificationScope.jurisdictionCode} and ${request.verifyingAuthority.jurisdictionCode} are officially assigned ISO 3166-1 alpha-2 codes.`,
      `partyExists: evaluated — party ${party.partyId} is registered (version ${party.partyVersion}).`,
      `partyNotRetired: evaluated — registrationStatus is ${party.registrationStatus}, not RETIRED.`,
      `verifierIndependentOfRegistrant: evaluated — actor ${actor.actorId} did not register the party. Independence from the actors who submitted the cited evidence is not checked (contract gap).`,
      `evidenceLinkedToParty: evaluated — all ${count} cited evidence id(s) are linked to party version ${party.partyVersion}.`,
      supersedes === undefined
        ? "supersessionValid: evaluated — this assessment supersedes none."
        : `supersessionValid: evaluated — supersedes assessment ${supersedes} of the same party, not previously superseded; that assessment no longer counts when the party's verification status is derived.`,
      `Assessment is not registration: the party's registrationStatus is unchanged (${party.registrationStatus}); no earlier assessment is changed.`,
      ...(expired ? ["Already expired: this assessment counts as VERIFICATION_EXPIRED when the party's verification status is derived."] : []),
      `Verifying authority recorded as declared: ${request.verifyingAuthority.authorityName} (${request.verifyingAuthority.authorityId}) cannot be checked against a registry of verifying authorities; none exists.`,
      // TODO(evidence-id-model): evidence ids predate the AAB-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${count} cited evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. Their link to the party was checked; their content was not.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.recordedAt,
  };

  // 11. Receipt — same transaction; any failure rolls back the assessment too
  const written = await writeReceipt<ScsVerificationAssessmentReceipt, typeof CAPABILITY_ID, ScsVerificationAssessmentDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "VERIFICATION_ASSESSMENT",
    subjectId: inserted.assessmentId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02VerificationAssessmentReceipt,
  });

  const body: ScsVerificationAssessmentResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
