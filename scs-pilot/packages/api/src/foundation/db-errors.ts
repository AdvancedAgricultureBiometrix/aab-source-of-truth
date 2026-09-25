// Database errors → canonical failures.
//
// Capability code runs its queries through withDatabaseErrors(). A database
// error then becomes a failure in the canonical envelope, attributed to the
// capability, and the transaction rolls back:
//   * connection lost, server shutting down, out of resources
//       → DEPENDENCY_UNAVAILABLE (503)
//   * an integrity constraint rejected the write (SQLSTATE class 23)
//       → INTERNAL_ERROR (500), naming the constraint. Capabilities check
//         request-level rules themselves first; a constraint firing means the
//         capability let something through that the database had to stop.
//   * anything else is passed through unchanged (the server turns it into
//     INTERNAL_ERROR without leaking detail). Foundation code that needs the
//     raw error — e.g. idempotency detecting a concurrent key — does not use
//     this wrapper.

import { log } from "./correlation.js";
import { ScsFailure, type CapabilityId } from "./errors.js";

interface PgError {
  code?: unknown;
  constraint?: unknown;
  table?: unknown;
}

function isUnavailable(code: string): boolean {
  return code.startsWith("08") || code.startsWith("53") || code.startsWith("57P") || code === "57014";
}

export async function withDatabaseErrors<T>(capabilityId: CapabilityId, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof ScsFailure) throw err;
    const e = err as PgError;
    const code = typeof e.code === "string" ? e.code : "";
    if (isUnavailable(code)) {
      log.error("database unavailable during capability operation", { capabilityId, sqlstate: code, err });
      throw new ScsFailure({
        capabilityId,
        code: "DEPENDENCY_UNAVAILABLE",
        reasons: ["The database is unavailable or the operation timed out; nothing was recorded."],
        httpStatus: 503,
      });
    }
    if (code.startsWith("23")) {
      const constraint = typeof e.constraint === "string" ? e.constraint : "unnamed constraint";
      log.error("database constraint rejected a capability write", { capabilityId, sqlstate: code, constraint });
      throw new ScsFailure({
        capabilityId,
        code: "INTERNAL_ERROR",
        reasons: [`A database constraint rejected the write (${constraint}); nothing was recorded.`],
        httpStatus: 500,
      });
    }
    throw err;
  }
}
