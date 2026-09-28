// SCS-CAP-04 failure codes — exactly the error union of the contract's
// ScsDeforestationEvidenceAdmissionFailure (5c6a263), each with its HTTP
// status. A code that is not in the contract is not added here; the contract
// changes first.
//
// Every failure is FAIL_CLOSED and writes nothing: it is thrown, so the
// request's transaction rolls back (receipt and idempotency record included).
//
// Not returned by the pilot, and why:
//   SOURCE_NOT_IDENTIFIABLE — the required source fields (sourceId,
//                             sourceOrganizationId, sourceReference) are
//                             enforced by the request schema, non-blank
//                             (REQUEST_VALIDATION_FAILED)
// ATTESTATION_EXCEEDS_ANALYSIS and PROVENANCE_INCOMPLETE are limitation codes,
// not failures (contract "Admission rules for the pilot").

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "SCS-CAP-04" as const;

export const CAP04_FAILURES = {
  SUBMITTER_NOT_AUTHORISED: 403,
  // Representative submission (amendment of 2026-09-27; SCS-CAP-02). The same statuses as in SCS-CAP-02
  REPRESENTATIVE_NOT_AUTHORISED: 403,
  LINK_NOT_FOUND: 404,
  LINK_AMBIGUOUS: 409,
  LINK_NOT_ACTIVE: 422,
  LINK_SIGNATURE_INVALID: 422,
  LINK_SIGNATURE_UNDER_REVIEW: 422,     // AAB-PLATFORM-04 third amendment, 2026-09-28
  LINK_RELATION_NOT_PERMITTED: 422,
  LINK_SUBJECT_NOT_CURRENT: 422,
  MANDATE_NOT_FOUND: 404,
  MANDATE_PARTIES_MISMATCH: 422,
  MANDATE_NOT_CURRENT: 422,
  MANDATE_ACTION_NOT_PERMITTED: 422,
  MANDATE_SCOPE_MISMATCH: 422,
  MANDATE_RELATIONSHIP_NOT_ACTIVE: 422,
  MANDATE_NOT_VERIFIED: 422,
  PLOT_NOT_FOUND: 404,
  PLOT_RETIRED: 422,
  FRAMEWORK_ASSOCIATION_NOT_FOUND: 404,
  FRAMEWORK_ASSOCIATION_NOT_ACTIVE: 422,
  SOURCE_NOT_IDENTIFIABLE: 400,
  EVIDENCE_OBJECT_NOT_FOUND: 422,
  OBJECT_INTEGRITY_FAILED: 422,
  COVERAGE_GEOMETRY_INVALID: 422,
  EVIDENCE_NOT_RELATED_TO_PLOT: 422,
  TEMPORAL_DATES_INCONSISTENT: 400,
  EVIDENCE_TYPE_INCOMPATIBLE: 422,
  ATTESTING_PARTY_NOT_FOUND: 422,
  ANALYST_PARTY_NOT_FOUND: 422,
  PARTY_RETIRED: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap04FailureCode = keyof typeof CAP04_FAILURES;

export function cap04Failure(code: Cap04FailureCode, reasons: readonly string[]): ScsFailure<typeof CAPABILITY_ID, Cap04FailureCode> {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: CAP04_FAILURES[code] });
}
