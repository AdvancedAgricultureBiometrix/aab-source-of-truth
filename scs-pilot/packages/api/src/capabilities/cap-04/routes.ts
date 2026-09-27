// SCS-CAP-04 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// submitEvidence only, for the pilot. quarantineEvidence is not yet specified
// as a request and decision (contract gap); the reads are deferred.

import type { SigningKeyDirectory } from "../../foundation/auth.js";
import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsDeforestationEvidenceSubmissionRequest } from "../../types/cap-04.js";
import { CAPABILITY_ID } from "./errors.js";
import { submitEvidence } from "./submit-evidence.js";

/** Built with the signing keys: a representative submission verifies the representative's link. */
export const submitEvidenceRoute = (keys: SigningKeyDirectory): Route<ScsDeforestationEvidenceSubmissionRequest> => ({
  method: "POST",
  path: "/scs/v1/deforestation-evidence",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap04EvidenceSubmissionRequest,
  handle: submitEvidence(keys),
});

export const cap04Routes = (keys: SigningKeyDirectory): readonly Route<never>[] => [submitEvidenceRoute(keys) as unknown as Route<never>];
