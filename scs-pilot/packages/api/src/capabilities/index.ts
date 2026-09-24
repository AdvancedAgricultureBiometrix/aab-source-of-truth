// Every capability route the API serves. A capability is added here once its
// endpoint is built, reviewed and tested; nothing is routed otherwise.

import type { Route } from "../foundation/server.js";
import { cap01Routes } from "./cap-01/routes.js";

export const CAPABILITY_ROUTES: readonly Route<never>[] = [...cap01Routes];
