// SCS-CAP-03 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// registerPlot only, for the pilot. addTenureClaim and associateFramework must
// be redefined with request shapes and decisions before they are built
// (contract gap); the reads (getPlot, listPlots…) and retirePlot are deferred.

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { RegisterPlotRequest } from "../../types/cap-03.js";
import { CAPABILITY_ID } from "./errors.js";
import { registerPlot } from "./register-plot.js";

export const registerPlotRoute: Route<RegisterPlotRequest> = {
  method: "POST",
  path: "/scs/v1/plots",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap03PlotRegistrationRequest,
  handle: registerPlot,
};

export const cap03Routes: readonly Route<never>[] = [registerPlotRoute as unknown as Route<never>];
