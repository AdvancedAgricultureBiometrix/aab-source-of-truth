// SCS-CAP-06 submitConflictResolution — POST /scs/v1/conflict-resolutions.
//
// A conflict is resolved only by a human (contract e0b7634, "Conflict
// resolution records"). CAP-06 never creates a resolution. Before this runs,
// the server layer has authenticated the actor, validated the body against
// conflict-resolution-request.schema.json (every field but
// inapplicableEvidenceId required; ids lowercase UUIDs), checked the
// Idempotency-Key and opened the transaction.
//
// Checks, in the contract's order; each is FAIL_CLOSED and writes nothing:
//   1. role          — CONFLICT_RESOLVER → RESOLVER_NOT_AUTHORISED (403). Checked
//                      first, so an unauthorised actor learns nothing about
//                      the conflict
//   2. the conflict  — the evaluation exists (EVALUATION_NOT_FOUND) and reported
//                      a conflict under conflictKey (CONFLICT_NOT_FOUND)
//   3. independence  — the resolver did not submit either item
//                      → RESOLVER_NOT_AUTHORISED (403)
//   4. once only     — no resolution yet for the key (the key is locked for the
//                      transaction) → CONFLICT_ALREADY_RESOLVED (409)
//   5. consistency   — compared items, inapplicable item, additional evidence
//                      → RESOLUTION_INCOMPLETE (400), naming every problem
//
// Written: the resolution and its receipt (CONFLICT_RESOLUTION, outcome
// RESOLVED), in one transaction. Recording a resolution never triggers an
// evaluation: the next evaluation of the subject applies it.

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsConflictResolutionReceipt, ScsConflictResolutionRecord, ScsConflictResolutionResponse, ScsConflictResolutionSubmission } from "../../types/cap-06.js";
import { CAPABILITY_ID, cap06Failure } from "./errors.js";
import { findAdmittedIds, findReportedConflict, findResolutionForKey, findSubmitters, insertResolution, lockConflictKey } from "./store.js";

/** The only role that may resolve a conflict (contract e0b7634): separate from COMPLIANCE_OFFICER and VERIFICATION_OFFICER. */
export const RESOLVER_ROLE = "CONFLICT_RESOLVER";

export async function submitConflictResolution(ctx: RouteContext<ScsConflictResolutionSubmission>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const req = ctx.body;

  // 1. Role
  if (!actor.roles.includes(RESOLVER_ROLE)) {
    throw cap06Failure("RESOLVER_NOT_AUTHORISED", [`Resolving a conflict requires the ${RESOLVER_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }

  // 2. The conflict, as reported in the named evaluation
  const found = await findReportedConflict(tx, req.evaluationId, req.conflictKey);
  if (found === null) throw cap06Failure("EVALUATION_NOT_FOUND", [`/evaluationId: no sufficiency evaluation is recorded with evaluationId ${req.evaluationId}.`]);
  if (found.conflict === null) {
    throw cap06Failure("CONFLICT_NOT_FOUND", [`/conflictKey: evaluation ${req.evaluationId} reported no conflict under key ${req.conflictKey}.`]);
  }
  const c = found.conflict;
  const [a, b] = [c.evidenceAId, c.evidenceBId].sort() as [string, string];
  const items = [...new Set([a, b])];

  // 3. Independence
  const submitters = await findSubmitters(tx, items);
  const own = items.filter((id) => submitters.get(id) === actor.actorId);
  if (own.length > 0) {
    throw cap06Failure("RESOLVER_NOT_AUTHORISED", own.map((id) => `Actor ${actor.actorId} submitted ${id}, one of the items in conflict, and cannot resolve the conflict.`));
  }

  // 4. Once only
  await lockConflictKey(tx, req.conflictKey);
  const existing = await findResolutionForKey(tx, req.conflictKey);
  if (existing !== null) {
    throw cap06Failure("CONFLICT_ALREADY_RESOLVED", [`Conflict ${req.conflictKey} is already resolved by ${existing}. Revising a resolution is not defined (contract gap).`]);
  }

  // 5. Consistency
  const problems: string[] = [];
  const compared = [...req.comparedEvidenceIds].sort();
  if (compared.length !== items.length || compared.some((id, i) => id !== items[i])) {
    problems.push(`/comparedEvidenceIds: must be exactly the conflict's item${items.length === 1 ? "" : "s"} (${items.join(", ")}).`);
  }
  if (req.inapplicableEvidenceId !== undefined && !items.includes(req.inapplicableEvidenceId)) {
    problems.push(`/inapplicableEvidenceId: ${req.inapplicableEvidenceId} is not one of the conflict's items (${items.join(", ")}).`);
  }
  if (req.additionalEvidenceObtained !== req.additionalEvidenceIds.length > 0) {
    problems.push(`/additionalEvidenceObtained: must be ${req.additionalEvidenceIds.length > 0} when ${req.additionalEvidenceIds.length} additional evidence id(s) are listed.`);
  }
  if (req.additionalEvidenceIds.length > 0) {
    const admitted = await findAdmittedIds(tx, req.additionalEvidenceIds);
    for (const id of req.additionalEvidenceIds.filter((x) => !admitted.has(x))) {
      problems.push(`/additionalEvidenceIds: ${id} is not an admitted SCS-CAP-04 record or SCS-CAP-05 event.`);
    }
  }
  if (problems.length > 0) throw cap06Failure("RESOLUTION_INCOMPLETE", problems);

  // Write the resolution and its receipt
  const inserted = await insertResolution(tx, {
    conflictKey: req.conflictKey,
    requirementCode: c.requirementCode,
    evidenceAId: a,
    evidenceBId: b,
    evaluationId: req.evaluationId,
    comparedEvidenceIds: compared,
    provenanceAndMethodsConsidered: req.provenanceAndMethodsConsidered,
    resolutionReason: req.resolutionReason,
    inapplicableEvidenceId: req.inapplicableEvidenceId ?? null,
    additionalEvidenceObtained: req.additionalEvidenceObtained,
    additionalEvidenceIds: req.additionalEvidenceIds,
    remainingLimitations: req.remainingLimitations,
    reviewer: actor,
    authorityBasis: req.authorityBasis,
    reEvaluationRequired: req.reEvaluationRequired,
  });
  const record: ScsConflictResolutionRecord = {
    resolutionId: inserted.resolutionId,
    conflictKey: req.conflictKey,
    evaluationId: req.evaluationId,
    comparedEvidenceIds: compared,
    provenanceAndMethodsConsidered: req.provenanceAndMethodsConsidered,
    resolutionReason: req.resolutionReason,
    ...(req.inapplicableEvidenceId === undefined ? {} : { inapplicableEvidenceId: req.inapplicableEvidenceId }),
    additionalEvidenceObtained: req.additionalEvidenceObtained,
    additionalEvidenceIds: req.additionalEvidenceIds,
    remainingLimitations: req.remainingLimitations,
    reviewer: actor,
    authorityBasis: req.authorityBasis,
    resolvedAt: inserted.resolvedAt,
    reEvaluationRequired: req.reEvaluationRequired,
  };
  const written = await writeReceipt<ScsConflictResolutionReceipt, typeof CAPABILITY_ID, ScsConflictResolutionRecord>(tx, {
    capabilityId: CAPABILITY_ID,
    decisionType: "CONFLICT_RESOLUTION",
    subjectId: inserted.resolutionId,
    decision: record,
    outcome: "RESOLVED",
    issuedFor: actor,
    requestDigest: ctx.requestDigest,
    idempotencyKey: ctx.idempotencyKey,
    schema: SCHEMAS.cap06ConflictResolutionReceipt,
  });

  const body: ScsConflictResolutionResponse = { decision: record, receipt: written.receipt, receiptDigest: written.receiptDigest };
  return { status: 201, body };
}
