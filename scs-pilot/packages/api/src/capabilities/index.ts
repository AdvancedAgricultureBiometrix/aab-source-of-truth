// Every capability route the API serves. A capability is added here once its
// endpoint is built, reviewed and tested; nothing is routed otherwise.
// SCS-CAP-08's routes need the object store and are built with it in index.ts
// (capabilities/cap-08/routes.ts).
//
// Built with the ActorDirectory, which only the actor–party link routes are
// given (for accountable names). Signing keys come from the public-key
// registry (AAB-PLATFORM-09), read in each act's own transaction.

import type { ActorDirectory } from "../foundation/auth.js";
import type { Route } from "../foundation/server.js";
import { cap01Routes } from "./cap-01/routes.js";
import { cap02Routes } from "./cap-02/routes.js";
import { cap03Routes } from "./cap-03/routes.js";
import { cap04Routes } from "./cap-04/routes.js";
import { cap05Routes } from "./cap-05/routes.js";
import { cap06Routes } from "./cap-06/routes.js";
import { cap09Routes } from "./cap-09/routes.js";

export function capabilityRoutes(directory: ActorDirectory): readonly Route<never>[] {
  return [...cap01Routes, ...cap02Routes(directory), ...cap03Routes, ...cap04Routes, ...cap05Routes, ...cap06Routes, ...cap09Routes];
}
