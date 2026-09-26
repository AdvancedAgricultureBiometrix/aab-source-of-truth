// SCS-CAP-09 failure codes — exactly the error union of the contract's
// ScsRegulatoryReviewFailure (ff6d3b8, a816101), each with its HTTP status. A
// code that is not in the contract is not added here; the contract changes
// first.
//
// Every failure is FAIL_CLOSED and records no decision: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-09" as const;

export const CAP09_FAILURES = {
  REVIEWER_NOT_AUTHORISED: 403,
  REVIEWER_ORGANIZATION_NOT_FOUND: 422,
  EVALUATION_NOT_FOUND: 404,
  DECISION_NOT_FOUND: 404,
  EVALUATION_ALREADY_SUPERSEDED: 409,
  EVALUATION_INTEGRITY_FAILED: 422,
  EVALUATION_DIGEST_MISMATCH: 409,
  REASONING_INCOMPLETE: 400,
  DECISION_ALREADY_RECORDED: 409,
  SUPERSEDES_NOT_CURRENT: 409,
  FRAMEWORK_MISMATCH: 422,
  OPERATOR_PARTY_NOT_FOUND: 422,
  OPERATOR_MISMATCH: 422,
  OUTCOME_NOT_PERMITTED: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap09FailureCode = keyof typeof CAP09_FAILURES;

export function cap09Failure(code: Cap09FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap09FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP09_FAILURES[code] });
}
