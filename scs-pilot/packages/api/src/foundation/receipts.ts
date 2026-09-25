// Immutable decision receipts.
//
// Every registration or admission decision produces a receipt, written by
// writeReceipt() inside the SAME transaction as the decision (it takes the
// transaction's Tx, so it cannot be called outside one). If anything about
// the receipt fails — it does not match the capability's receipt schema, the
// insert fails, the digest cannot be computed — writeReceipt throws, and the
// transaction, decision included, rolls back. A decision without its receipt
// can never be committed.
//
// Receipts are never updated or deleted: scs_api has only SELECT + INSERT on
// scs.decision_receipt (migration 004/005), and a trigger rejects UPDATE,
// DELETE and TRUNCATE for every role, the owner included (migration 005).
// There is deliberately no update or delete function here.
//
// The receipt document is validated, stored exactly as returned to the caller
// (column `receipt`) and hashed: receiptDigest = SHA-256 of its canonical JSON.

import { randomUUID } from "node:crypto";

import { canonicalJson, sha256Hex } from "./canonical.js";
import { requireCorrelationId } from "./correlation.js";
import type { Tx } from "./db.js";
import { ScsFailure, type CapabilityId } from "./errors.js";
import { validate, type JsonSchema } from "./validation.js";
import type { ActorReference } from "./auth.js";

type GovernedCapabilityId = Exclude<CapabilityId, "SCS-PLATFORM">;

/**
 * A decision object: its outcome is its `decision` field, or, for an SCS-CAP-06
 * evaluation result, its `overallState`. A record with neither (an SCS-CAP-06
 * conflict resolution) states its outcome explicitly (ReceiptInput.outcome).
 */
export type ReceiptDecision = { decision: string } | { overallState: string } | object;

export interface ReceiptInput<C extends GovernedCapabilityId, D extends ReceiptDecision> {
  readonly capabilityId: C;
  /** e.g. "FRAMEWORK_REGISTRATION" — must equal the receipt schema's decisionType. */
  readonly decisionType: string;
  /** The record decided on (e.g. frameworkId); null when the decision created nothing. */
  readonly subjectId: string | null;
  /** The capability's decision object, as its contract defines it. Its outcome (`outcome`, else `decision`, else `overallState`) is recorded. */
  readonly decision: D;
  /** The recorded outcome, for a decision object that has neither `decision` nor `overallState`. */
  readonly outcome?: string;
  readonly issuedFor: ActorReference;
  readonly requestDigest: string;
  readonly idempotencyKey: string | null;
  /** The capability's receipt schema; the whole receipt document is validated against it. */
  readonly schema: JsonSchema;
}

export interface WrittenReceipt<R> {
  readonly receipt: R;
  readonly receiptDigest: string;
}

function outcomeOf(input: { readonly decision: object; readonly outcome?: string }): string {
  if (input.outcome !== undefined) return input.outcome;
  const d = input.decision as { decision?: unknown; overallState?: unknown };
  const outcome = typeof d.decision === "string" ? d.decision : d.overallState;
  if (typeof outcome !== "string") throw new Error("receipt: the decision has no outcome (decision, overallState) and none was given");
  return outcome;
}

export async function writeReceipt<R, C extends GovernedCapabilityId, D extends ReceiptDecision>(
  tx: Tx,
  input: ReceiptInput<C, D>,
): Promise<WrittenReceipt<R>> {
  const document = {
    receiptId: randomUUID(),
    receiptVersion: "1",
    capabilityId: input.capabilityId,
    decisionType: input.decisionType,
    subjectId: input.subjectId,
    correlationId: requireCorrelationId(),
    requestDigest: input.requestDigest,
    idempotencyKey: input.idempotencyKey,
    issuedAt: new Date().toISOString(),
    issuedFor: input.issuedFor,
    decision: input.decision,
  };

  // A receipt that does not match its schema is a defect in the capability,
  // not a caller error: fail as INTERNAL_ERROR so the decision rolls back.
  const checked = validate<R, C>(input.capabilityId, input.schema, document);
  if (!checked.ok) {
    throw new ScsFailure({
      capabilityId: input.capabilityId,
      code: "INTERNAL_ERROR",
      reasons: ["The decision receipt could not be produced; nothing was recorded. Quote the correlationId when reporting it."],
      httpStatus: 500,
    });
  }

  const receiptDigest = sha256Hex(canonicalJson(document));
  await tx.query(
    `INSERT INTO scs.decision_receipt
       (receipt_id, capability_id, decision_type, decision, subject_id, actor, correlation_id,
        idempotency_key, request_digest, receipt, receipt_digest, issued_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      document.receiptId,
      document.capabilityId,
      document.decisionType,
      outcomeOf(input),
      document.subjectId,
      JSON.stringify(document.issuedFor),
      document.correlationId,
      document.idempotencyKey,
      document.requestDigest,
      JSON.stringify(document),
      receiptDigest,
      document.issuedAt,
    ],
  );

  return Object.freeze({ receipt: Object.freeze(checked.value), receiptDigest });
}
