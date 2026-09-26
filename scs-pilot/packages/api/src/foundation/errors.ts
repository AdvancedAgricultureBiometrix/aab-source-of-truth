// Canonical error envelope.
//
// Every error response from every capability has this shape. It follows the
// failure contract pattern shared by the SCS canonical contracts:
//
//   { ok: false, capabilityId, result: "FAIL_CLOSED", error, reasons,
//     …capability-specific boundary flags (noWrites, noFrameworkRegistered, …) }
//
// plus `correlationId`, so any failure can be traced to its log lines.
//
// The boundary flags differ per capability and are copied verbatim from each
// contract's failure interface (see CAPABILITY_BOUNDARY_FLAGS). They sit at the
// top level of the envelope, exactly as the contracts write them.
//
// Framework-agnostic: nothing here knows about HTTP servers. Code throws an
// ScsFailure; the server turns it into an envelope and a status code.

export const CAPABILITY_IDS = [
  "SCS-CAP-01",
  "SCS-CAP-02",
  "SCS-CAP-03",
  "SCS-CAP-04",
  "SCS-CAP-05",
  "SCS-CAP-06",
  "SCS-CAP-08",
  "SCS-CAP-09",
] as const;

/**
 * "SCS-PLATFORM" covers pre-capability platform errors only: failures that
 * happen before any capability is involved (unknown route, bad JSON, missing
 * token). It is NOT a governed capability — no contract defines it, because no
 * single capability owns these failures — and it must never be used for a
 * failure a capability's own contract describes.
 */
export type CapabilityId = (typeof CAPABILITY_IDS)[number] | "SCS-PLATFORM";

/**
 * Boundary flags from each contract's failure interface, verbatim.
 * CAP-06, CAP-08 and CAP-09 do not declare `noWrites` in their contracts, so
 * they do not get it here either. To add or change a flag, change the
 * canonical contract first, then this table — never the other way round.
 */
export const CAPABILITY_BOUNDARY_FLAGS = {
  "SCS-CAP-01": { noWrites: true, noFrameworkRegistered: true },
  "SCS-CAP-02": { noWrites: true, noPartyRegistered: true },
  "SCS-CAP-03": { noWrites: true, noPlotRegistered: true },
  "SCS-CAP-04": { noWrites: true, noEvidenceAdmitted: true },
  "SCS-CAP-05": { noWrites: true, noEventAdmitted: true },
  "SCS-CAP-06": { noEvaluationProduced: true },
  "SCS-CAP-08": { noPackageCompiled: true, noPartialPackage: true },
  "SCS-CAP-09": { noDecisionRecorded: true },
  "SCS-PLATFORM": { noWrites: true },
} as const satisfies Record<CapabilityId, Readonly<Record<string, true>>>;

export type BoundaryFlags<C extends CapabilityId> = (typeof CAPABILITY_BOUNDARY_FLAGS)[C];

export type FailureEnvelope<C extends CapabilityId = CapabilityId, E extends string = string> = Readonly<
  {
    ok: false;
    capabilityId: C;
    result: "FAIL_CLOSED";
    error: E;
    reasons: readonly string[];
    correlationId: string;
  } & BoundaryFlags<C>
>;

/**
 * Failure codes raised by the platform itself, with their HTTP status.
 * Capability codes (REGISTRANT_NOT_AUTHORISED, …) come from each contract and
 * carry their own status when thrown.
 */
export const PLATFORM_ERRORS = {
  ROUTE_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  MALFORMED_JSON: 400,
  REQUEST_VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  IDEMPOTENCY_KEY_CONFLICT: 409,
  DEPENDENCY_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  // SCS-PLATFORM-01 evidence object store (raw-body upload route)
  EVIDENCE_OBJECT_TOO_LARGE: 413,
  EVIDENCE_OBJECT_TYPE_UNSUPPORTED: 415,
  // SCS-PLATFORM-02 rendition download
  READER_NOT_AUTHORISED: 403,
  RENDITION_NOT_FOUND: 404,
  RENDITION_INTEGRITY_FAILED: 422,
} as const;

export type PlatformErrorCode = keyof typeof PLATFORM_ERRORS;

/**
 * The one way code signals a failure. Throw it; the server writes the
 * envelope. `reasons` must be non-empty and every reason non-blank: a failure
 * that cannot say why is itself a defect.
 */
export class ScsFailure<C extends CapabilityId = CapabilityId, E extends string = string> extends Error {
  readonly capabilityId: C;
  readonly code: E;
  readonly reasons: readonly string[];
  readonly httpStatus: number;
  /**
   * Further fields a capability's failure contract defines (e.g. SCS-CAP-08's
   * failedGateCheck and blockers). They are added to the envelope, but can
   * never replace its core fields or boundary flags.
   */
  readonly extra: Readonly<Record<string, unknown>> | undefined;

  constructor(args: { capabilityId: C; code: E; reasons: readonly string[]; httpStatus: number; extra?: Readonly<Record<string, unknown>> }) {
    const reasons = args.reasons.map((r) => r.trim()).filter((r) => r.length > 0);
    if (reasons.length === 0) {
      throw new TypeError(`ScsFailure ${args.code}: at least one non-blank reason is required`);
    }
    if (!Number.isInteger(args.httpStatus) || args.httpStatus < 400 || args.httpStatus > 599) {
      throw new TypeError(`ScsFailure ${args.code}: httpStatus must be 4xx or 5xx, got ${args.httpStatus}`);
    }
    super(`${args.capabilityId} ${args.code}: ${reasons.join("; ")}`);
    this.name = "ScsFailure";
    this.capabilityId = args.capabilityId;
    this.code = args.code;
    this.reasons = Object.freeze(reasons);
    this.httpStatus = args.httpStatus;
    this.extra = args.extra === undefined ? undefined : Object.freeze({ ...args.extra });
  }
}

/** A platform failure with its fixed HTTP status. */
export function platformFailure(code: PlatformErrorCode, reasons: readonly string[]): ScsFailure<"SCS-PLATFORM", PlatformErrorCode> {
  return new ScsFailure({ capabilityId: "SCS-PLATFORM", code, reasons, httpStatus: PLATFORM_ERRORS[code] });
}

/**
 * A platform-coded failure attributed to a capability (e.g. request validation
 * inside CAP-01), so the envelope carries that capability's boundary flags.
 */
export function capabilityPlatformFailure<C extends CapabilityId>(
  capabilityId: C,
  code: PlatformErrorCode,
  reasons: readonly string[],
): ScsFailure<C, PlatformErrorCode> {
  return new ScsFailure({ capabilityId, code, reasons, httpStatus: PLATFORM_ERRORS[code] });
}

/** Build the immutable envelope for a failure. */
export function toEnvelope<C extends CapabilityId, E extends string>(
  failure: ScsFailure<C, E>,
  correlationId: string,
): FailureEnvelope<C, E> {
  const core = {
    ok: false as const,
    capabilityId: failure.capabilityId,
    result: "FAIL_CLOSED" as const,
    error: failure.code,
    reasons: failure.reasons,
    correlationId,
  };
  const flags: BoundaryFlags<C> = CAPABILITY_BOUNDARY_FLAGS[failure.capabilityId];
  // extra first: the core fields and the flags always win
  return Object.freeze(Object.assign({}, failure.extra ?? {}, core, flags));
}

/**
 * Anything that is not an ScsFailure is an unexpected fault. It becomes
 * INTERNAL_ERROR with a generic reason: messages and stack traces are logged
 * (with the correlation id), never returned to the caller.
 */
export function asScsFailure(err: unknown, capabilityId: CapabilityId = "SCS-PLATFORM"): ScsFailure {
  if (err instanceof ScsFailure) return err;
  return new ScsFailure({
    capabilityId,
    code: "INTERNAL_ERROR",
    reasons: ["An internal error occurred. Quote the correlationId when reporting it."],
    httpStatus: PLATFORM_ERRORS.INTERNAL_ERROR,
  });
}
