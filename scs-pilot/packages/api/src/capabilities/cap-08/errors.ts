// SCS-CAP-08 failure codes — exactly the error union of the contract's
// ScsPackageCompilationFailure (4b1f05b), each with its HTTP status. A code
// that is not in the contract is not added here; the contract changes first.
//
// Every failure is FAIL_CLOSED: no package, no compilation record, no
// rendition record and no receipt (a rendition's bytes already stored are an
// unreferenced object). A gate failure also names the check that failed
// (failedGateCheck) and every blocker the gate reported.
//
// Not returned, and why:
//   FRAMEWORK_NOT_FOUND — the decision's foreign keys guarantee its framework
// verifyPackageIntegrity never fails on what it finds: a change is a result
// (contract 700c40a). Only REQUESTOR_NOT_AUTHORISED and PACKAGE_NOT_FOUND.

import { ScsFailure } from "../../foundation/errors.js";
import type { Blocker } from "../cap-09/validate-for-package.js";

export const CAPABILITY_ID = "SCS-CAP-08" as const;

/** Who may read a package, verify it or download its rendition (contract 4b1f05b, 700c40a). */
export const READER_ROLES = ["COMPLIANCE_OFFICER", "REGULATORY_REVIEWER"] as const;

export const CAP08_FAILURES = {
  REQUESTOR_NOT_AUTHORISED: 403,
  REVIEW_DECISION_NOT_FOUND: 404,
  REVIEW_DECISION_NOT_CURRENT: 409,
  REVIEW_DECISION_NOT_VALID: 409,
  REVIEW_DECISION_OUTCOME_NOT_PROCEED: 409,
  EVALUATION_ID_MISMATCH: 422,
  FRAMEWORK_VERSION_MISMATCH: 422,
  PLOT_IDS_MISMATCH: 422,
  OPERATOR_MISMATCH: 422,
  COMMODITY_MISMATCH: 422,
  EVIDENCE_SCOPE_MISMATCH: 422,
  EVIDENCE_RECORDS_NOT_RESOLVED: 422,
  EVIDENCE_INTEGRITY_FAILED: 422,
  EVALUATION_INTEGRITY_FAILED: 422,
  REVIEW_DECISION_INTEGRITY_FAILED: 422,
  PLOT_RECORDS_NOT_FOUND: 422,
  FRAMEWORK_NOT_FOUND: 422,
  PACKAGE_NOT_FOUND: 404,
  RENDITION_FAILED: 422,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type Cap08FailureCode = keyof typeof CAP08_FAILURES;

export function cap08Failure(
  code: Cap08FailureCode,
  reasons: readonly string[],
  gate?: { readonly failedGateCheck: string; readonly blockers: readonly Blocker[] },
): ScsFailure<typeof CAPABILITY_ID, Cap08FailureCode> {
  return new ScsFailure({
    capabilityId: CAPABILITY_ID,
    code,
    reasons,
    httpStatus: CAP08_FAILURES[code],
    ...(gate === undefined ? {} : { extra: { failedGateCheck: gate.failedGateCheck, blockers: gate.blockers } }),
  });
}
