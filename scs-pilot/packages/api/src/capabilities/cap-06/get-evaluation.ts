// SCS-CAP-06 getEvaluationResult — GET /scs/v1/sufficiency-evaluations/:evaluationId.
//
// Returns a recorded evaluation exactly as recorded: the result document that
// was returned and receipted when the evaluation was made (contract 876fc80).
//   1. authority — COMPLIANCE_OFFICER only → REQUESTOR_NOT_AUTHORISED (403)
//   2. lookup    — an unknown evaluationId → EVALUATION_NOT_FOUND (404)

import type { OperationResult } from "../../foundation/idempotency.js";
import type { RouteContext } from "../../foundation/server.js";
import { cap06Failure } from "./errors.js";
import { REQUESTOR_ROLE } from "./evaluate-sufficiency.js";
import { getEvaluation } from "./store.js";

export async function getEvaluationResult(ctx: RouteContext<undefined>): Promise<OperationResult> {
  const actor = ctx.actor!;
  if (!actor.roles.includes(REQUESTOR_ROLE)) {
    throw cap06Failure("REQUESTOR_NOT_AUTHORISED", [`Reading a sufficiency evaluation requires the ${REQUESTOR_ROLE} role; actor ${actor.actorId} does not hold it.`]);
  }
  const evaluationId = ctx.params["evaluationId"]!.toLowerCase();
  const result = await getEvaluation(ctx.tx!, evaluationId);
  if (result === null) throw cap06Failure("EVALUATION_NOT_FOUND", [`No sufficiency evaluation is recorded with evaluationId ${evaluationId}.`]);
  return { status: 200, body: result };
}
