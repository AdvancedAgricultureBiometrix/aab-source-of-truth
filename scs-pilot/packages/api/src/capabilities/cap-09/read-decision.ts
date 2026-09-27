// SCS-CAP-09 getDecision and assessCurrency: a recorded decision, with its
// currency derived now (contract ff6d3b8, "Currency — derived, never stored";
// a816101, "Reading and assessing").
//
//   GET  /scs/v1/review-decisions/:decisionId
//        the decision as recorded, its currency derived; nothing is written
//   POST /scs/v1/review-decisions/:decisionId/currency-assessments
//        the same derivation, recorded as an append-only
//        ScsDecisionCurrencyAssessment naming who requested it. An assessment
//        is not a decision, so it has no receipt
//
// Both routes run in one REPEATABLE READ transaction, so every check reads one
// snapshot. Checks:
//   1. authority — REGULATORY_REVIEWER or COMPLIANCE_OFFICER
//                  → REVIEWER_NOT_AUTHORISED (403)
//   2. lookup    — an unknown decisionId → DECISION_NOT_FOUND (404)

import { holdsRole } from "../../foundation/actor.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import type { RouteContext } from "../../foundation/server.js";
import type { ScsDecisionCurrencyAssessment } from "../../types/cap-09.js";
import { decisionRecord, deriveCurrency, type Currency } from "./currency.js";
import { cap09Failure } from "./errors.js";
import { findDecision, findEvaluation, insertAssessment, transactionStart, type DecisionRow } from "./store.js";
import { REVIEWER_ROLE } from "./submit-decision.js";

/** Roles that may read a decision or assess its currency (contract a816101). */
export const READER_ROLES = [REVIEWER_ROLE, "COMPLIANCE_OFFICER"] as const;

async function derive(ctx: RouteContext<unknown>, action: string): Promise<{ row: DecisionRow; prior: DecisionRow | null; currency: Currency }> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  if (!READER_ROLES.some((r) => holdsRole(actor, r))) {
    throw cap09Failure("REVIEWER_NOT_AUTHORISED", [`${action} requires the ${READER_ROLES.join(" or ")} role; actor ${actor.actorId} holds neither.`]);
  }
  const decisionId = ctx.params["decisionId"]!.toLowerCase();
  const at = await transactionStart(tx);
  const row = await findDecision(tx, decisionId);
  if (row === null) throw cap09Failure("DECISION_NOT_FOUND", [`No review decision is recorded with decisionId ${decisionId}.`]);
  // the evaluation exists: the decision's foreign key requires it
  const evaluation = (await findEvaluation(tx, row.evaluationId))!;
  const prior = row.supersedesDecisionId === null ? null : await findDecision(tx, row.supersedesDecisionId);
  return { row, prior, currency: await deriveCurrency(tx, row, evaluation.result, at) };
}

export async function getDecision(ctx: RouteContext<undefined>): Promise<OperationResult> {
  const { row, prior, currency } = await derive(ctx, "Reading a review decision");
  return { status: 200, body: decisionRecord(row, currency, prior) };
}

export async function assessCurrency(ctx: RouteContext<Record<string, never>>): Promise<OperationResult> {
  const { row, currency } = await derive(ctx, "Assessing a review decision's currency");
  const actor = ctx.actor!;
  const supersededBy = currency.successor?.decisionId ?? null;
  const assessmentId = await insertAssessment(ctx.tx!, {
    decisionId: row.decisionId,
    assessedAt: currency.assessedAt,
    assessedBy: actor,
    currencyStatus: currency.currencyStatus,
    supersededByDecisionId: supersededBy,
    checksPerformed: currency.checksPerformed,
    materialChanges: currency.materialChanges,
  });
  const body: ScsDecisionCurrencyAssessment = {
    assessmentId,
    decisionId: row.decisionId,
    assessedAt: currency.assessedAt.toISOString(),
    assessedBy: actor,
    currencyStatus: currency.currencyStatus,
    ...(supersededBy === null ? {} : { supersededByDecisionId: supersededBy }),
    checksPerformed: [...currency.checksPerformed],
    materialChanges: [...currency.materialChanges],
  };
  return { status: 201, body };
}
