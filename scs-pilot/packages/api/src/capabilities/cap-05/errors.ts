// SCS-CAP-05 failure codes — exactly the error union of the contract's
// ScsCustodyEventAdmissionFailure (7b4fc02), each with its HTTP status. A code
// that is not in the contract is not added here; the contract changes first.
//
// Every failure is FAIL_CLOSED and writes nothing: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).
//
// Not returned by the pilot, and why:
//   QUANTITY_NOT_RECORDED      — a missing quantity (on any event type other
//                                than CERTIFICATION and INSPECTION) is refused
//                                by the request schema
//                                (REQUEST_VALIDATION_FAILED)
//   SUPPORTING_DOCUMENT_ABSENT — the document's reference, type and digest
//                                are required by the request schema
//                                (REQUEST_VALIDATION_FAILED)
// Every other shortfall is a limitation code, not a failure (contract
// "Admission rules for the pilot").

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-05" as const;

export const CAP05_FAILURES = {
  SUBMITTER_NOT_AUTHORISED: 403,
  // Representative submission (amendment of 2026-09-27; SCS-CAP-02). The same statuses as in SCS-CAP-02
  REPRESENTATIVE_NOT_AUTHORISED: 403,
  LINK_NOT_FOUND: 404,
  LINK_AMBIGUOUS: 409,
  LINK_NOT_ACTIVE: 422,
  LINK_SIGNATURE_INVALID: 422,
  LINK_RELATION_NOT_PERMITTED: 422,
  LINK_SUBJECT_NOT_CURRENT: 422,
  MANDATE_NOT_FOUND: 404,
  MANDATE_PARTIES_MISMATCH: 422,
  MANDATE_NOT_CURRENT: 422,
  MANDATE_ACTION_NOT_PERMITTED: 422,
  MANDATE_SCOPE_MISMATCH: 422,
  MANDATE_RELATIONSHIP_NOT_ACTIVE: 422,
  MANDATE_NOT_VERIFIED: 422,
  SOURCE_PARTY_NOT_IDENTIFIABLE: 422,
  DESTINATION_PARTY_NOT_IDENTIFIABLE: 422,
  PARTY_RETIRED: 422,
  COMMODITY_CODE_UNRECOGNISED: 422,
  QUANTITY_NOT_RECORDED: 400,
  SUPPORTING_DOCUMENT_ABSENT: 400,
  EVIDENCE_OBJECT_NOT_FOUND: 422,
  DOCUMENT_INTEGRITY_FAILED: 422,
  INTERNAL_INCONSISTENCY: 400,
  FRAMEWORK_ASSOCIATION_NOT_FOUND: 404,
  FRAMEWORK_NOT_ACTIVE: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap05FailureCode = keyof typeof CAP05_FAILURES;

export function cap05Failure(code: Cap05FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap05FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP05_FAILURES[code] });
}
