// SCS-CAP-02 addMandateVerificationAssessment — POST /scs/v1/mandates/:mandateId/verifications.
//
// Before this runs, the server layer has authenticated the actor, validated
// mandateId and the body (mandate-verification-request.schema.json: at least
// one evidence id, ids lowercase UUIDs), checked the Idempotency-Key and
// opened the transaction.
//
// Assessments of one mandate are serialised by an advisory lock taken first,
// and the clock is read once, after it: that instant is recordedAt, and
// "now" for every check. Order (SCS-CAP-02, "Mandate verification",
// "Recording rules"):
//   1. authority    — VERIFICATION_OFFICER → VERIFIER_NOT_AUTHORISED (403)
//   2. status       — PARTIALLY_VERIFIED, VERIFIED_FOR_DECLARED_SCOPE, DISPUTED
//                     or FAIL_CLOSED → VERIFICATION_STATUS_NOT_RECORDABLE (400)
//   3. dates        — verifiedAt not in the future; expiresAt after verifiedAt
//                     and, when the mandate exists, not after its validUntil
//                     → VALIDITY_PERIOD_INVALID (400)
//   4. jurisdiction — ISO 3166-1 alpha-2 → COUNTRY_CODE_UNRECOGNISED (422)
//   5. mandate      — exists (MANDATE_NOT_FOUND, 404); NOT_REVOKED and before
//                     its validUntil (MANDATE_NOT_CURRENT, 422)
//   6. independence — (fourth amendment of 2026-09-27) the actor did not
//                     register the mandate, holds no link
//                     (in any state) to either of its parties, and created no
//                     link (in any state) to its representative party
//                     → VERIFIER_NOT_AUTHORISED (403)
//   7. evidence     — each id among the mandate's mandateEvidenceIds
//                     → VERIFICATION_EVIDENCE_NOT_LINKED (422)
//   8. supersession — an assessment of the same mandate
//                     (SUPERSEDED_ASSESSMENT_NOT_FOUND, 422), not already
//                     superseded (CONFLICTING_RECORD, 409)
//   9. insert, the derived status after it, and the receipt
//      (MANDATE_VERIFICATION), in the same transaction; 201
//
// The mandate record is never changed: its verification status is derived
// when read (mandate-verification-status.ts).

import { randomUUID } from "node:crypto";

import { holdsRole, sameActor } from "../../foundation/actor.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { isStatementActor } from "../../platform/actor-subject-links/links.js";
import { isIso3166Alpha2 } from "../../reference/countries.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsMandateVerificationAssessmentDecision,
  ScsMandateVerificationAssessmentRequest,
  ScsMandateVerificationEligibilityChecks,
  ScsMandateVerificationReceipt,
  ScsMandateVerificationResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { clockNow } from "./link-store.js";
import {
  findLinkCreators,
  findLinksHeldBy,
  findMandateAssessments,
  findMandateForVerification,
  insertMandateAssessment,
  lockMandateVerification,
} from "./mandate-verification-store.js";
import { deriveMandateVerificationStatus } from "./mandate-verification-status.js";
import { RECORDABLE_STATUSES, VERIFIER_ROLE } from "./record-verification.js";

export async function addMandateVerificationAssessment(ctx: RouteContext<ScsMandateVerificationAssessmentRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const mandateId = ctx.params["mandateId"]!.toLowerCase();
  const status = request.verificationStatus;

  // 1. Authority
  if (!holdsRole(actor, VERIFIER_ROLE)) {
    throw cap02Failure("VERIFIER_NOT_AUTHORISED", [`Recording a mandate verification assessment requires the ${VERIFIER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. Recordable status
  if (!RECORDABLE_STATUSES.includes(status)) {
    throw cap02Failure("VERIFICATION_STATUS_NOT_RECORDABLE", [
      `verificationStatus ${status} is derived when read, never recorded; an assessment records one of ${RECORDABLE_STATUSES.join(", ")}.`,
    ]);
  }

  await lockMandateVerification(tx, mandateId);
  const now = await clockNow(tx);
  const mandate = await findMandateForVerification(tx, mandateId);

  // 3. Dates
  const verifiedAt = Date.parse(request.verifiedAt);
  if (verifiedAt > now.getTime()) {
    throw cap02Failure("VALIDITY_PERIOD_INVALID", [`verifiedAt (${request.verifiedAt}) is in the future; the assessment is recorded at ${now.toISOString()}.`]);
  }
  if (request.expiresAt !== undefined) {
    const expiresAt = Date.parse(request.expiresAt);
    if (expiresAt <= verifiedAt) {
      throw cap02Failure("VALIDITY_PERIOD_INVALID", [
        expiresAt === verifiedAt
          ? `expiresAt equals verifiedAt (${request.verifiedAt}): a zero-length verification window is not valid.`
          : `expiresAt (${request.expiresAt}) must be after verifiedAt (${request.verifiedAt}).`,
      ]);
    }
    if (mandate !== null && expiresAt > mandate.validUntil.getTime()) {
      throw cap02Failure("VALIDITY_PERIOD_INVALID", [`expiresAt (${request.expiresAt}) is after mandate ${mandateId}'s validUntil (${mandate.validUntil.toISOString()}); a verification cannot outlast the mandate.`]);
    }
  }

  // 4. Jurisdiction
  if (!isIso3166Alpha2(request.verifyingAuthority.jurisdictionCode)) {
    throw cap02Failure("COUNTRY_CODE_UNRECOGNISED", [`/verifyingAuthority/jurisdictionCode: "${request.verifyingAuthority.jurisdictionCode}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`]);
  }

  // 5. Mandate
  if (mandate === null) throw cap02Failure("MANDATE_NOT_FOUND", [`No mandate is registered with mandateId ${mandateId}.`]);
  if (mandate.revocationStatus !== "NOT_REVOKED") {
    throw cap02Failure("MANDATE_NOT_CURRENT", [`Mandate ${mandateId} is ${mandate.revocationStatus}; only a current mandate is verified.`]);
  }
  if (mandate.validUntil.getTime() <= now.getTime()) {
    throw cap02Failure("MANDATE_NOT_CURRENT", [`Mandate ${mandateId} ended at ${mandate.validUntil.toISOString()}; only a current mandate is verified.`]);
  }

  // 6. Independence
  const parties = [mandate.grantingPartyId, mandate.representativePartyId];
  const held = (await findLinksHeldBy(tx, actor.actorId, parties)).filter((l) => isStatementActor(actor, l.actor));
  const createdLinks = (await findLinkCreators(tx, mandate.representativePartyId)).filter((l) => sameActor(l.createdBy, actor));
  const dependence = [
    ...(sameActor(mandate.createdBy, actor) ? [`Actor ${actor.actorId} registered mandate ${mandateId} and cannot also verify it (separation of duties).`] : []),
    ...held.map((l) => `Actor ${actor.actorId} holds link ${l.linkId} to party ${l.partyId}, a party to mandate ${mandateId}, and cannot verify it (separation of duties).`),
    ...createdLinks.map((l) => `Actor ${actor.actorId} created link ${l.linkId} to party ${mandate.representativePartyId}, the mandate's representative, and cannot verify the mandate (separation of duties).`),
  ];
  if (dependence.length > 0) {
    throw cap02Failure("VERIFIER_NOT_AUTHORISED", dependence);
  }

  // 7. Evidence
  const onMandate = new Set(mandate.mandateEvidenceIds);
  const outside = request.evidenceIds.filter((id) => !onMandate.has(id));
  if (outside.length > 0) {
    throw cap02Failure("VERIFICATION_EVIDENCE_NOT_LINKED", [
      `${outside.length} evidence id(s) are not among mandate ${mandateId}'s mandateEvidenceIds: ${outside.join(", ")}.`,
    ]);
  }

  // 8. Supersession
  const assessments = await findMandateAssessments(tx, mandateId);
  const supersedes = request.supersedesAssessmentId;
  if (supersedes !== undefined) {
    if (!assessments.some((a) => a.assessmentId === supersedes)) {
      throw cap02Failure("SUPERSEDED_ASSESSMENT_NOT_FOUND", [`No verification assessment ${supersedes} is recorded for mandate ${mandateId}.`]);
    }
    const already = assessments.find((a) => a.supersedesAssessmentId === supersedes);
    if (already !== undefined) {
      throw cap02Failure("CONFLICTING_RECORD", [`Assessment ${supersedes} is already superseded by assessment ${already.assessmentId}; an assessment is superseded at most once.`]);
    }
  }

  // 9. Insert, and the status it leaves the mandate in
  const assessmentId = await insertMandateAssessment(tx, { mandateId, request, recordedBy: actor, recordedAt: now });
  const after = deriveMandateVerificationStatus(
    [...assessments, { assessmentId, verificationStatus: status, expiresAt: request.expiresAt ?? null, recordedAt: now.toISOString(), supersedesAssessmentId: supersedes ?? null }],
    now,
  );
  const expired = request.expiresAt !== undefined && Date.parse(request.expiresAt) <= now.getTime();
  const count = request.evidenceIds.length;

  const eligibilityChecks: ScsMandateVerificationEligibilityChecks = {
    verifierAuthorised: true,
    statusRecordable: true,
    datesValid: true,
    jurisdictionRecognised: true,
    mandateExists: true,
    mandateCurrent: true,
    verifierIndependent: true,
    evidenceAmongMandateEvidence: true,
    supersessionValid: true,
  };
  const decision: ScsMandateVerificationAssessmentDecision = {
    decisionId: randomUUID(),
    assessmentId,
    mandateId,
    decision: "RECORDED",
    eligibilityChecks,
    resultingVerificationStatus: after.status as ScsMandateVerificationAssessmentDecision["resultingVerificationStatus"],
    decisionReasons: [
      `verifierAuthorised: evaluated — actor ${actor.actorId} holds ${VERIFIER_ROLE}.`,
      `statusRecordable: evaluated — ${status} is a recordable status.`,
      request.expiresAt === undefined
        ? "datesValid: evaluated — verifiedAt is not in the future; no expiry."
        : `datesValid: evaluated — verifiedAt is not in the future; expiresAt is after it and not after the mandate's validUntil${expired ? "; the assessment has already expired and is recorded as a historical fact" : ""}.`,
      `jurisdictionRecognised: evaluated — ${request.verifyingAuthority.jurisdictionCode} is an officially assigned ISO 3166-1 alpha-2 code.`,
      `mandateExists: evaluated — mandate ${mandateId} is registered.`,
      `mandateCurrent: evaluated — NOT_REVOKED, and valid until ${mandate.validUntil.toISOString()}.`,
      `verifierIndependent: evaluated — actor ${actor.actorId} did not register the mandate, holds no link to party ${mandate.grantingPartyId} or party ${mandate.representativePartyId}, and created no link to the representative party.`,
      `evidenceAmongMandateEvidence: evaluated — all ${count} cited evidence id(s) are among the mandate's mandateEvidenceIds.`,
      supersedes === undefined
        ? "supersessionValid: evaluated — this assessment supersedes none."
        : `supersessionValid: evaluated — supersedes assessment ${supersedes} of the same mandate, not previously superseded; that assessment no longer counts when the mandate's verification status is derived.`,
      `The mandate's verification status, derived after this assessment, is ${after.status}. The mandate record is unchanged; its stored verificationStatus keeps its starting value.`,
      `Verifying a mandate verifies the mandate only: not either party's identity, not any scope beyond the mandate's, and not regulatory eligibility.`,
      `Verifying authority recorded as declared: ${request.verifyingAuthority.authorityName} (${request.verifyingAuthority.authorityId}) cannot be checked against a registry of verifying authorities; none exists.`,
      // TODO(evidence-id-model): mandateEvidenceIds predate the AAB-PLATFORM-01 object store; replace this disclosure with an existence check once they cite stored objects.
      `Evidence ids not confirmed: the ${count} cited evidence id(s) are CAP-02 evidence ids, which are not linked to the SCS evidence object store, so they cannot be confirmed against stored objects. Their membership of the mandate's evidence was checked; their content was not.`,
    ],
    decidedBy: actor,
    decidedAt: now.toISOString(),
  };

  const written = await writeReceipt<ScsMandateVerificationReceipt, typeof CAPABILITY_ID, ScsMandateVerificationAssessmentDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "MANDATE_VERIFICATION",
    subjectId: assessmentId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02MandateVerificationReceipt,
  });

  const body: ScsMandateVerificationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
