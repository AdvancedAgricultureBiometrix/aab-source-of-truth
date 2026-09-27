// Every capability route the API serves. A capability is added here once its
// endpoint is built, reviewed and tested; nothing is routed otherwise.
// SCS-CAP-08's routes need the object store and are built with it in index.ts
// (capabilities/cap-08/routes.ts). SCS-CAP-02's actor–party link routes need
// the ActorDirectory and are built with it there too (cap-02/link-routes.ts).

import type { Route } from "../foundation/server.js";
import { cap01Routes } from "./cap-01/routes.js";
import { cap02Routes } from "./cap-02/routes.js";
import { cap03Routes } from "./cap-03/routes.js";
import { cap04Routes } from "./cap-04/routes.js";
import { cap05Routes } from "./cap-05/routes.js";
import { cap06Routes } from "./cap-06/routes.js";
import { cap09Routes } from "./cap-09/routes.js";

export const CAPABILITY_ROUTES: readonly Route<never>[] = [...cap01Routes, ...cap02Routes, ...cap03Routes, ...cap04Routes, ...cap05Routes, ...cap06Routes, ...cap09Routes];
