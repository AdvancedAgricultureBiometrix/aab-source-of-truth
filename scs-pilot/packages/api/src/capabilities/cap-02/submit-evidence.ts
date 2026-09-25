// SCS-CAP-02 submitIdentityEvidence — POST /scs/v1/parties/:partyId/evidence.
//
// Before this runs, the server layer has authenticated the actor, validated
// partyId (a UUID) and the body against
// identity-evidence-submission-request.schema.json (1–200 evidence ids,
// lowercase UUIDs, no duplicates within the request), checked the
// Idempotency-Key and opened the transaction (ctx.tx). Everything below runs
// in that one transaction: the submission, its evidence links, the decision
// and its receipt commit together or not at all.
//
// Order (the contract's submission rules):
//   1. authority   — the actor must hold COMPLIANCE_OFFICER. Submission under
//                    a representation mandate is a contract gap and is not
//                    accepted → REGISTRANT_NOT_AUTHORISED (403)
//   2. party       — the partyId must identify a registered party
//                    → PARTY_NOT_FOUND (404)
//   3. not retired — a RETIRED party accepts no new evidence
//                    → PARTY_RETIRED (422). REGISTERED, REQUIRES_HUMAN_REVIEW
//                    and DISPUTED parties accept evidence
//   4. duplicates  — lock the party's evidence for this transaction, then
//                    refuse any evidence id already linked to the party's
//                    current version, at registration or by an earlier
//                    submission → EVIDENCE_ALREADY_LINKED (409), naming every
//                    duplicate. Duplicates are never skipped silently
//   5. insert      — the submission (database-generated submissionId) and one
//                    evidence link per id, at the party's current version
//   6. decision    — RECORDED. All four checks were performed, so all are
//                    true, each with an "evaluated" reason
//   7. receipt     — written in the same transaction (foundation/receipts.ts)
//   8. 201 with { decision, receipt, receiptDigest }
//
// Evidence is admitted, not verified: the party identity record is never
// touched — registrationStatus is unchanged, no party version is created and
// no verification assessment is created or changed. Any failure is thrown, so
// the whole transaction rolls back and nothing is written.

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsIdentityEvidenceEligibilityChecks,
  ScsIdentityEvidenceSubmissionDecision,
  ScsIdentityEvidenceSubmissionReceipt,
  ScsIdentityEvidenceSubmissionRequest,
  ScsIdentityEvidenceSubmissionResponse,
} from "../../types/cap-02.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { REGISTRANT_ROLE } from "./register-party.js";
import { findLinkedEvidence, findParty, insertEvidenceSubmission, lockPartyEvidence } from "./store.js";

export async function submitIdentityEvidence(ctx: RouteContext<ScsIdentityEvidenceSubmissionRequest>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const request = ctx.body;
  const requestedPartyId = ctx.params["partyId"]!;

  // 1. Authority
  if (!actor.roles.includes(REGISTRANT_ROLE)) {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Submitting identity evidence requires the ${REGISTRANT_ROLE} role; actor ${actor.actorId} does not hold it.`,
    ]);
  }

  // 2. Party exists
  const party = await findParty(tx, requestedPartyId);
  if (party === null) {
    throw cap02Failure("PARTY_NOT_FOUND", [`No party is registered with partyId ${requestedPartyId}.`]);
  }

  // 3. Party not retired
  if (party.registrationStatus === "RETIRED") {
    throw cap02Failure("PARTY_RETIRED", [`Party ${party.partyId} is RETIRED and accepts no new identity evidence.`]);
  }

  // 4. No duplicate links
  await lockPartyEvidence(tx, party.partyId);
  const duplicates = await findLinkedEvidence(tx, party.partyId, party.partyVersion, request.evidenceIds);
  if (duplicates.length > 0) {
    throw cap02Failure("EVIDENCE_ALREADY_LINKED", [
      `${duplicates.length} evidence id(s) already linked to party ${party.partyId} version ${party.partyVersion}: ${duplicates.join(", ")}.`,
    ]);
  }

  // 5. Insert
  const inserted = await insertEvidenceSubmission(tx, { party, request, submittedBy: actor });

  // 6. Decision
  const eligibilityChecks: ScsIdentityEvidenceEligibilityChecks = {
    partyExists: true,
    partyNotRetired: true,
    submitterAuthorised: true,
    evidenceIdsNotAlreadyLinked: true,
  };
  const count = request.evidenceIds.length;
  const decision: ScsIdentityEvidenceSubmissionDecision = {
    decisionId: randomUUID(),
    submissionId: inserted.submissionId,
    partyId: party.partyId,
    partyVersion: party.partyVersion,
    decision: "RECORDED",
    eligibilityChecks,
    decisionReasons: [
      `partyExists: evaluated — party ${party.partyId} is registered (version ${party.partyVersion}).`,
      `partyNotRetired: evaluated — registrationStatus is ${party.registrationStatus}, not RETIRED.`,
      `submitterAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`,
      `evidenceIdsNotAlreadyLinked: evaluated — none of the ${count} evidence id(s) is already linked to party version ${party.partyVersion}.`,
      `Evidence admitted, not verified: submitting identity evidence does not verify identity. registrationStatus is unchanged (${party.registrationStatus}), no party version is created, and no verification assessment is created or changed. What the evidence proves is evaluated separately, by a verification assessment.`,
      // TODO(evidence-id-model): evidence ids predate the SCS-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${count} cited evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. They are recorded as submitted.`,
    ],
    decidedBy: actor,
    decidedAt: inserted.submittedAt,
  };

  // 7. Receipt — same transaction; any failure rolls back the submission too
  const written = await writeReceipt<ScsIdentityEvidenceSubmissionReceipt, typeof CAPABILITY_ID, ScsIdentityEvidenceSubmissionDecision>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "IDENTITY_EVIDENCE_SUBMISSION",
    subjectId: inserted.submissionId,
    decision,
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap02IdentityEvidenceSubmissionReceipt,
  });

  // 8. Response
  const body: ScsIdentityEvidenceSubmissionResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
