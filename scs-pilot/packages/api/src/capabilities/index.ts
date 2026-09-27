// Every capability route the API serves. A capability is added here once its
// endpoint is built, reviewed and tested; nothing is routed otherwise.
// SCS-CAP-08's routes need the object store and are built with it in index.ts
// (capabilities/cap-08/routes.ts).
//
// Built with the ActorDirectory. Each capability passes on only what a route
// needs: the actor–party link routes the directory (accountable names and
// signing keys), and the three submissions that accept a representative only
// the signing keys. Every other route gets neither.

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
  const keys = { signingKeyOf: directory.signingKeyOf.bind(directory) };
  return [...cap01Routes, ...cap02Routes(directory), ...cap03Routes, ...cap04Routes(keys), ...cap05Routes(keys), ...cap06Routes, ...cap09Routes];
}
