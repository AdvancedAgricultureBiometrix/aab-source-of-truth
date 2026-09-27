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
//   1. authority   — directly: COMPLIANCE_OFFICER, without actingUnder
//                    → REGISTRANT_NOT_AUTHORISED (403). As a representative:
//                    PARTY_REPRESENTATIVE with actingUnder, for the path's
//                    party, passing every check of "Representative
//                    submission" (capabilities/shared/representation.ts) →
//                    REPRESENTATIVE_NOT_AUTHORISED (403) or the check's own
//                    failure. For SUBMIT_IDENTITY_EVIDENCE the scope is the
//                    party's country only
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

import type { SigningKeyDirectory } from "../../foundation/auth.js";
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
import { checkRepresentation, RepresentationRefused, submissionAuthority, type Representation } from "../shared/representation.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { REGISTRANT_ROLE } from "./register-party.js";
import { findLinkedEvidence, findParty, findPartyCountry, insertEvidenceSubmission, lockPartyEvidence } from "./store.js";

export const submitIdentityEvidence = (keys: SigningKeyDirectory) => async (ctx: RouteContext<ScsIdentityEvidenceSubmissionRequest>): Promise<OperationResult> => {
  const tx = ctx.tx!;
  const request = ctx.body;
  const requestedPartyId = ctx.params["partyId"]!.toLowerCase();

  // 1. Authority: directly, or as a representative passing every check
  const authority = submissionAuthority(ctx.actor!, REGISTRANT_ROLE, request.actingUnder);
  if (authority.kind === "REFUSED_DIRECT") {
    throw cap02Failure("REGISTRANT_NOT_AUTHORISED", [
      `Submitting identity evidence requires the ${REGISTRANT_ROLE} role; actor ${ctx.actor!.actorId} does not hold it.`,
    ]);
  }
  if (authority.kind === "REFUSED_REPRESENTATIVE") throw cap02Failure("REPRESENTATIVE_NOT_AUTHORISED", authority.reasons);
  let representation: Representation | null = null;
  if (authority.kind === "REPRESENTATIVE") {
    try {
      representation = await checkRepresentation(CAPABILITY_ID, tx, keys, ctx.actor!, authority.actingUnder, {
        action: "SUBMIT_IDENTITY_EVIDENCE",
        forParties: [requestedPartyId],
        forDescription: "the path's party",
        scope: { countryCode: await findPartyCountry(tx, requestedPartyId), countryDescription: "the party's country of operation (or registration)" },
      });
    } catch (err) {
      if (err instanceof RepresentationRefused) throw cap02Failure(err.code, err.reasons);
      throw err;
    }
  }
  // The actor as recorded for this act: with representation, for a representative
  const actor = representation?.reference ?? ctx.actor!;

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
    ...(representation === null ? {} : { representation: representation.checks }),
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
      representation === null
        ? `submitterAuthorised: evaluated — actor ${actor.actorId} holds ${REGISTRANT_ROLE}.`
        : `submitterAuthorised: evaluated — actor ${actor.actorId} submits as a representative, under a mandate from party ${party.partyId}, every representation check passing.`,
      `evidenceIdsNotAlreadyLinked: evaluated — none of the ${count} evidence id(s) is already linked to party version ${party.partyVersion}.`,
      `Evidence admitted, not verified: submitting identity evidence does not verify identity. registrationStatus is unchanged (${party.registrationStatus}), no party version is created, and no verification assessment is created or changed. What the evidence proves is evaluated separately, by a verification assessment.`,
      // TODO(evidence-id-model): evidence ids predate the AAB-PLATFORM-01 object store (contract gap); replace this disclosure with an existence check once ids cite stored objects.
      `Evidence ids not confirmed: the ${count} cited evidence id(s) are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest, so these ids cannot be confirmed against it. They are recorded as submitted.`,
      ...(representation?.reasons ?? []),
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
};
