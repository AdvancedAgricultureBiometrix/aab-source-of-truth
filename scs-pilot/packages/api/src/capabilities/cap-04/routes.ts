// SCS-CAP-04 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// submitEvidence only, for the pilot. quarantineEvidence is not yet specified
// as a request and decision (contract gap); the reads are deferred.

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsDeforestationEvidenceSubmissionRequest } from "../../types/cap-04.js";
import { CAPABILITY_ID } from "./errors.js";
import { submitEvidence } from "./submit-evidence.js";

/** A representative submission verifies the representative's link against the public-key registry (AAB-PLATFORM-09). */
export const submitEvidenceRoute: Route<ScsDeforestationEvidenceSubmissionRequest> = {
  method: "POST",
  path: "/scs/v1/deforestation-evidence",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap04EvidenceSubmissionRequest,
  handle: submitEvidence,
};

export const cap04Routes: readonly Route<never>[] = [submitEvidenceRoute as unknown as Route<never>];
