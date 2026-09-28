// AAB-PLATFORM-09 failure codes — exactly the codes of the contract's
// KeyRegistryFailure (section 13, as amended with the registry's endpoints),
// each with its HTTP status. A code that is not in the contract is not added
// here; the contract changes first.
//
// Every failure is FAIL_CLOSED and writes nothing (noWrites): it is thrown, so
// the request's transaction rolls back, receipt and idempotency record
// included.

import { ScsFailure } from "../../foundation/errors.js";

export const CAPABILITY_ID = "AAB-PLATFORM-09" as const;

export const KEY_REGISTRY_FAILURES = {
  KEY_REGISTRAR_NOT_AUTHORISED: 403,
  KEY_SELF_REGISTRATION: 403,
  KEY_EVENT_NOT_AUTHORISED: 403,
  KEY_READER_NOT_AUTHORISED: 403,
  KEY_ISSUER_MISMATCH: 422,
  KEY_REGISTRY_ALREADY_STARTED: 409,
  KEY_REGISTRY_NOT_STARTED: 409,
  KEY_HOLDER_UNKNOWN: 422,
  KEY_CHALLENGE_INVALID: 422,
  KEY_PUBLIC_KEY_INVALID: 400,
  KEY_ALREADY_REGISTERED: 409,
  KEY_POSSESSION_NOT_PROVEN: 422,
  KEY_SIGNATURE_INVALID: 422,
  KEY_ACTIVE_KEY_EXISTS: 409,
  KEY_REPLACEMENT_INVALID: 422,
  KEY_NOT_FOUND: 404,
  KEY_STATE_NOT_PERMITTED: 409,
  KEY_CEREMONY_INVALID: 422,
  KEY_EVIDENCE_INVALID: 422,
  // Compromise, notices and assessments (PR 5)
  KEY_COMPROMISE_NOT_AUTHORISED: 403,
  KEY_NOTICE_NOT_AUTHORISED: 403,
  KEY_ASSESSOR_NOT_AUTHORISED: 403,
  KEY_EXPOSURE_INVALID: 422,
  KEY_NOTICE_INVALID: 422,
  KEY_RECORD_NOT_FOUND: 404,
  KEY_RECORD_NOT_UNDER_REVIEW: 409,
  KEY_RECORD_ALREADY_ASSESSED: 409,
} as const;

export type KeyRegistryFailureCode = keyof typeof KEY_REGISTRY_FAILURES;

export function keyRegistryFailure(code: KeyRegistryFailureCode, reasons: readonly string[]): ScsFailure {
  return new ScsFailure({ capabilityId: CAPABILITY_ID, code, reasons, httpStatus: KEY_REGISTRY_FAILURES[code] });
}

/** The issuer's key-registration role (AAB-PLATFORM-09, second amendment). TODO(role-registry). */
export const KEY_REGISTRAR_ROLE = "KEY_REGISTRAR";
/** The issuer's security role (second amendment): declares compromises, records notices, assesses records. TODO(role-registry). */
export const KEY_SECURITY_OFFICER_ROLE = "KEY_SECURITY_OFFICER";
