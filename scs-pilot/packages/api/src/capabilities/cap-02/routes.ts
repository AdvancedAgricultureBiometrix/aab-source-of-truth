// SCS-CAP-02 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// Party identity only for now; role claims, identity evidence, verification
// assessments, relationships and mandates follow as separate routes.

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsPartyRegistrationRequest } from "../../types/cap-02.js";
import { CAPABILITY_ID } from "./errors.js";
import { registerParty } from "./register-party.js";

export const registerPartyRoute: Route<ScsPartyRegistrationRequest> = {
  method: "POST",
  path: "/scs/v1/parties",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap02PartyRegistrationRequest,
  handle: registerParty,
};

export const cap02Routes: readonly Route<never>[] = [registerPartyRoute as unknown as Route<never>];
