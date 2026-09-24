// SCS-CAP-02 failure codes — exactly the error union of the contract's
// ScsPartyRegistrationFailure, each with its HTTP status. A code that is not
// in the contract is not added here; the contract changes first.
//
// Every failure is FAIL_CLOSED and writes nothing: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).
//
// PARTY_TYPE_INVALID and PARTY_NAME_MISSING are enforced by the request schema
// (enum and required non-blank), so the server layer refuses them first with
// REQUEST_VALIDATION_FAILED (400); the codes stay listed because the contract
// defines them.

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-02" as const;

export const CAP02_FAILURES = {
  REGISTRANT_NOT_AUTHORISED: 403,
  PARTY_TYPE_INVALID: 400,
  COUNTRY_CODE_UNRECOGNISED: 422,
  PARTY_NAME_MISSING: 400,
  CONFLICTING_REGISTRATION_DETECTED: 409,
  FRAMEWORK_ASSOCIATION_NOT_FOUND: 422,
  FROM_PARTY_NOT_FOUND: 422,
  TO_PARTY_NOT_FOUND: 422,
  SELF_REFERENTIAL_RELATIONSHIP: 422,
  MANDATE_ACTION_NOT_ENUMERATED: 422,
  GRANTING_PARTY_NOT_FOUND: 422,
  REPRESENTATIVE_PARTY_NOT_FOUND: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap02FailureCode = keyof typeof CAP02_FAILURES;

export function cap02Failure(code: Cap02FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap02FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP02_FAILURES[code] });
}
