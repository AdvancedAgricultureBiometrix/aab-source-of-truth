// Every capability route the API serves. A capability is added here once its
// endpoint is built, reviewed and tested; nothing is routed otherwise.

import type { Route } from "../foundation/server.js";
import { cap01Routes } from "./cap-01/routes.js";
import { cap02Routes } from "./cap-02/routes.js";
import { cap03Routes } from "./cap-03/routes.js";

export const CAPABILITY_ROUTES: readonly Route<never>[] = [...cap01Routes, ...cap02Routes, ...cap03Routes];
