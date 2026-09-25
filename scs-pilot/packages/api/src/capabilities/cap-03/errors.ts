// SCS-CAP-03 failure codes — exactly the error union of the contract's
// ScsPlotRegistrationFailure (2151321), each with its HTTP status. A code that
// is not in the contract is not added here; the contract changes first.
//
// Every failure is FAIL_CLOSED and writes nothing: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).
//
// Not returned by the pilot, and why:
//   FATAL_OVERLAP_DETECTED — overlap is not evaluated (no spatial database)
//   TENURE_CLAIM_INVALID   — a structurally invalid tenure claim is refused
//                            by the request schema (REQUEST_VALIDATION_FAILED)
// Framework association problems are not failures: they are per-association
// results (ASSOCIATION_FAILURE_CODES) and never fail the registration.

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-03" as const;

export const CAP03_FAILURES = {
  REGISTRANT_NOT_AUTHORISED: 403,
  GEOMETRY_INVALID: 422,
  COUNTRY_CODE_UNRECOGNISED: 422,
  COORDINATE_REFERENCE_SYSTEM_UNSUPPORTED: 422,
  FATAL_OVERLAP_DETECTED: 409,
  TENURE_CLAIM_INVALID: 400,
  CLAIMANT_PARTY_NOT_FOUND: 422,
  PARTY_RETIRED: 422,
  VALIDITY_PERIOD_INVALID: 400,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap03FailureCode = keyof typeof CAP03_FAILURES;

export function cap03Failure(code: Cap03FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap03FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP03_FAILURES[code] });
}

/** The per-association failure codes of ScsPlotRegistrationDecision.frameworkAssociationResults. */
export type AssociationFailureCode =
  | "FRAMEWORK_REFERENCE_NOT_FOUND"
  | "FRAMEWORK_NOT_ACTIVE"
  | "COMMODITY_OUTSIDE_FRAMEWORK"
  | "PRODUCER_PARTY_NOT_FOUND"
  | "PARTY_RETIRED";
