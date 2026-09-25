// SCS-CAP-06 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// evaluateSufficiency runs in one REPEATABLE READ transaction, so everything it
// reads comes from one snapshot (contract 876fc80, "The frozen input").
// submitConflictResolution records a human resolution; listEvaluationsForPlot
// is deferred.

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsConflictResolutionSubmission, ScsSufficiencyEvaluationSubmission } from "../../types/cap-06.js";
import { CAPABILITY_ID } from "./errors.js";
import { evaluateSufficiency } from "./evaluate-sufficiency.js";
import { getEvaluationResult } from "./get-evaluation.js";
import { submitConflictResolution } from "./submit-conflict-resolution.js";

export const evaluateSufficiencyRoute: Route<ScsSufficiencyEvaluationSubmission> = {
  method: "POST",
  path: "/scs/v1/sufficiency-evaluations",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  isolation: "repeatable read",
  idempotency: "required",
  requestSchema: SCHEMAS.cap06SufficiencyEvaluationRequest,
  handle: evaluateSufficiency,
};

export const getEvaluationResultRoute: Route<undefined> = {
  method: "GET",
  path: "/scs/v1/sufficiency-evaluations/:evaluationId",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "none",
  paramsSchema: SCHEMAS.cap06SufficiencyEvaluationParams,
  handle: getEvaluationResult,
};

export const submitConflictResolutionRoute: Route<ScsConflictResolutionSubmission> = {
  method: "POST",
  path: "/scs/v1/conflict-resolutions",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap06ConflictResolutionRequest,
  handle: submitConflictResolution,
};

export const cap06Routes: readonly Route<never>[] = [
  evaluateSufficiencyRoute as unknown as Route<never>,
  getEvaluationResultRoute as unknown as Route<never>,
  submitConflictResolutionRoute as unknown as Route<never>,
];
