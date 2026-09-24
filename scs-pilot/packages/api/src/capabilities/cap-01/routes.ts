// SCS-CAP-01 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsFrameworkRegistrationRequest } from "../../types/cap-01.js";
import { CAPABILITY_ID } from "./errors.js";
import { registerFramework } from "./register.js";

export const registerFrameworkRoute: Route<ScsFrameworkRegistrationRequest> = {
  method: "POST",
  path: "/scs/v1/frameworks",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap01FrameworkRegistrationRequest,
  handle: registerFramework,
};

export const cap01Routes: readonly Route<never>[] = [registerFrameworkRoute as unknown as Route<never>];
