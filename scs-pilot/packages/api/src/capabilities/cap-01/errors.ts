// SCS-CAP-01 failure codes — exactly the error union of the contract's
// ScsFrameworkRegistrationFailure, each with its HTTP status. A code that is
// not in the contract is not added here; the contract changes first.
//
// Every failure is FAIL_CLOSED and writes nothing: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-01" as const;

export const CAP01_FAILURES = {
  REGISTRANT_NOT_AUTHORISED: 403,
  REGULATION_REFERENCE_INVALID: 422,
  COMMODITY_NOT_RECOGNISED: 422,
  COUNTRY_OF_ORIGIN_INVALID: 422,
  DESTINATION_MARKET_INVALID: 422,
  CONFLICTING_FRAMEWORK_EXISTS: 409,
  EVIDENCE_SPEC_CANNOT_BE_GENERATED: 422,
  APPLICABLE_LAWS_UNCONFIRMED: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap01FailureCode = keyof typeof CAP01_FAILURES;

export function cap01Failure(code: Cap01FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap01FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP01_FAILURES[code] });
}
