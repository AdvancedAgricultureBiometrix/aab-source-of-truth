// Idempotency keys.
//
// A mutating request may carry "Idempotency-Key: <8–128 of [A-Za-z0-9._:-]>".
// Keys are scoped per actor. The request fingerprint is the SHA-256 of the
// canonical {method, route, body}.
//
// TODO(multi-issuer-idempotency): keys are scoped by ActorReference.actorId,
// which is unique while a deployment has one issuer. When a second issuer
// first acts in a deployment, scope keys by (issuer, actorId), by a migration
// defined at that point (AAB-PLATFORM-03 ActorReference, section 4).
//
//   * key not seen before     → run the operation; on success (2xx) record
//                               the response in the SAME transaction
//   * key seen, same request  → return the original response unchanged
//                               (replayed: true); nothing runs again
//   * key seen, other request → IDEMPOTENCY_KEY_CONFLICT (409); nothing runs
//
// Records are insert-only (scs_api has no UPDATE; migration 005 trigger), so
// there is no "pending" state to update. Concurrent requests with one key are
// settled by the unique index: the later one's INSERT waits for the earlier
// transaction, then fails; its whole transaction — including anything the
// operation wrote — rolls back, and it returns the earlier one's recorded
// response (or a conflict if its request differed).
//
// Failed requests are not recorded: they made no writes (fail closed), so a
// retry simply runs again.

import type { IncomingHttpHeaders } from "node:http";

import { digest } from "./canonical.js";
import { requireCorrelationId } from "./correlation.js";
import type { Database, Tx, TransactionOptions } from "./db.js";
import { platformFailure } from "./errors.js";

export const IDEMPOTENCY_HEADER = "idempotency-key";
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const UNIQUE_VIOLATION = "23505";
const KEY_CONSTRAINT = "idempotency_record_actor_key_uq";

/** The request's idempotency key, or null when absent. A malformed or repeated header is refused. */
export function readIdempotencyKey(headers: IncomingHttpHeaders): string | null {
  const value = headers[IDEMPOTENCY_HEADER];
  if (value === undefined) return null;
  if (typeof value !== "string" || !KEY_PATTERN.test(value)) {
    throw platformFailure("REQUEST_VALIDATION_FAILED", ["Idempotency-Key must be 8–128 characters of A–Z a–z 0–9 . _ : -"]);
  }
  return value;
}

export function requestFingerprint(method: string, route: string, body: unknown): string {
  return digest({ method, route, body });
}

export interface OperationResult {
  readonly status: number;
  readonly body: unknown;
  /**
   * Bytes sent as they are instead of the JSON body, e.g. a PDF rendition.
   * Only for routes without idempotency: a stored idempotent response is JSON.
   */
  readonly raw?: { readonly bytes: Buffer; readonly contentType: string; readonly headers?: Readonly<Record<string, string>> };
}

export interface IdempotentResult extends OperationResult {
  readonly replayed: boolean;
}

interface Scope {
  readonly actorId: string;
  readonly key: string;
  readonly fingerprint: string;
}

async function findRecorded(tx: Tx, scope: Scope): Promise<OperationResult | null> {
  const { rows } = await tx.query<{ request_fingerprint: string; response_status: number; response_body: unknown }>(
    `SELECT request_fingerprint, response_status, response_body
       FROM scs.idempotency_record WHERE actor_id = $1 AND idempotency_key = $2`,
    [scope.actorId, scope.key],
  );
  const row = rows[0];
  if (row === undefined) return null;
  if (row.request_fingerprint !== scope.fingerprint) {
    throw platformFailure("IDEMPOTENCY_KEY_CONFLICT", [
      "This Idempotency-Key was already used for a different request. Use a new key for a new request.",
    ]);
  }
  return { status: row.response_status, body: row.response_body };
}

function isKeyRace(err: unknown): boolean {
  const e = err as { code?: unknown; constraint?: unknown };
  return e.code === UNIQUE_VIOLATION && e.constraint === KEY_CONSTRAINT;
}

/**
 * Run `operation` in one transaction under an idempotency key. The recorded
 * response is written in that same transaction, so the operation's writes and
 * its idempotency record commit or roll back together.
 */
export async function runIdempotent(
  db: Database,
  scope: Scope,
  operation: (tx: Tx) => Promise<OperationResult>,
  options: TransactionOptions = {},
): Promise<IdempotentResult> {
  try {
    return await db.transaction(async (tx) => {
      const recorded = await findRecorded(tx, scope);
      if (recorded !== null) return { ...recorded, replayed: true };

      const result = await operation(tx);
      if (result.status >= 200 && result.status < 300) {
        await tx.query(
          `INSERT INTO scs.idempotency_record
             (actor_id, idempotency_key, request_fingerprint, response_status, response_body, correlation_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [scope.actorId, scope.key, scope.fingerprint, result.status, JSON.stringify(result.body), requireCorrelationId()],
        );
      }
      return { ...result, replayed: false };
    }, options);
  } catch (err) {
    if (!isKeyRace(err)) throw err;
    // A concurrent request with the same key committed first; everything this
    // one wrote has rolled back. Answer with what was recorded.
    const recorded = await db.transaction((tx) => findRecorded(tx, scope));
    if (recorded === null) throw err;
    return { ...recorded, replayed: true };
  }
}
