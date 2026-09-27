// SCS-CAP-05 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// submitCustodyEvent only, for the pilot. submitTransformationRecord must be
// redefined before it is built; the reads and quarantineCustodyEvent are
// deferred (contract "Deferred operations").

import type { SigningKeyDirectory } from "../../foundation/auth.js";
import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsCustodyEventSubmissionRequest } from "../../types/cap-05.js";
import { CAPABILITY_ID } from "./errors.js";
import { submitCustodyEvent } from "./submit-custody-event.js";

/** Built with the signing keys: a representative submission verifies the representative's link. */
export const submitCustodyEventRoute = (keys: SigningKeyDirectory): Route<ScsCustodyEventSubmissionRequest> => ({
  method: "POST",
  path: "/scs/v1/custody-events",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap05CustodyEventSubmissionRequest,
  handle: submitCustodyEvent(keys),
});

export const cap05Routes = (keys: SigningKeyDirectory): readonly Route<never>[] => [submitCustodyEventRoute(keys) as unknown as Route<never>];
