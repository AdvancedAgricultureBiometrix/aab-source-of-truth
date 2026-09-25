// SCS-CAP-06 failure codes — exactly the error union of the contract's
// ScsSufficiencyEvaluationFailure (0fd8c25, 876fc80), each with its HTTP
// status. A code that is not in the contract is not added here; the contract
// changes first.
//
// Every failure is FAIL_CLOSED and produces no evaluation: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).
//
// Not returned by the pilot, and why:
//   EVIDENCE_INTEGRITY_FAILED    — stored files are not re-hashed at
//                                  evaluation; integrity is as verified at
//                                  admission (contract gap)
//   QUARANTINED_EVIDENCE_IN_SCOPE — no quarantine operation exists yet
//   ACCESS_SCOPE_INVALID         — no tenants in the pilot (TODO(tenant-scope))
//   CONFLICT_NOT_FOUND, RESOLVER_NOT_AUTHORISED, RESOLUTION_INCOMPLETE —
//                                  submitConflictResolution is not built yet

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-06" as const;

export const CAP06_FAILURES = {
  REQUESTOR_NOT_AUTHORISED: 403,
  FRAMEWORK_VERSION_NOT_RESOLVED: 422,
  EVIDENCE_REQUIREMENT_SPEC_NOT_FOUND: 422,
  PLOT_NOT_FOUND: 404,
  FRAMEWORK_ASSOCIATION_NOT_FOUND: 404,
  EVIDENCE_RECORD_NOT_RESOLVED: 422,
  EVIDENCE_INTEGRITY_FAILED: 422,
  QUARANTINED_EVIDENCE_IN_SCOPE: 422,
  ACCESS_SCOPE_INVALID: 403,
  EVALUATION_PERIOD_INVALID: 400,
  EVIDENCE_SCOPE_INCOMPLETE: 422,
  BATCH_NOT_FOUND: 404,
  OPERATOR_PARTY_NOT_FOUND: 422,
  EVALUATION_NOT_FOUND: 404,
  PREVIOUS_EVALUATION_NOT_SAME_SUBJECT: 422,
  CONFLICT_NOT_FOUND: 404,
  RESOLVER_NOT_AUTHORISED: 403,
  RESOLUTION_INCOMPLETE: 400,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap06FailureCode = keyof typeof CAP06_FAILURES;

export function cap06Failure(code: Cap06FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap06FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP06_FAILURES[code] });
}
