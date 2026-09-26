// SCS-CAP-09 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// submitDecision runs at READ COMMITTED and serialises decisions on a subject
// with an advisory lock (submit-decision.ts explains why not REPEATABLE READ).
// getDecision and assessCurrency run in one REPEATABLE READ transaction, so
// every currency check reads one snapshot. validateForPackageCompilation is
// not a route: SCS-CAP-08 calls it in its own transaction
// (validate-for-package.ts). requestReview and listDecisionsForSubject are not
// built (contract, "Deferred").

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsCurrencyAssessmentRequest, ScsReviewDecisionSubmission } from "../../types/cap-09.js";
import { CAPABILITY_ID } from "./errors.js";
import { assessCurrency, getDecision } from "./read-decision.js";
import { submitDecision } from "./submit-decision.js";

export const submitDecisionRoute: Route<ScsReviewDecisionSubmission> = {
  method: "POST",
  path: "/scs/v1/review-decisions",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  idempotency: "required",
  requestSchema: SCHEMAS.cap09ReviewDecisionRequest,
  handle: submitDecision,
};

export const getDecisionRoute: Route<undefined> = {
  method: "GET",
  path: "/scs/v1/review-decisions/:decisionId",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  isolation: "repeatable read",
  idempotency: "none",
  paramsSchema: SCHEMAS.cap09ReviewDecisionParams,
  handle: getDecision,
};

export const assessCurrencyRoute: Route<ScsCurrencyAssessmentRequest> = {
  method: "POST",
  path: "/scs/v1/review-decisions/:decisionId/currency-assessments",
  capabilityId: CAPABILITY_ID,
  auth: "required",
  transactional: true,
  isolation: "repeatable read",
  idempotency: "required",
  requestSchema: SCHEMAS.cap09CurrencyAssessmentRequest,
  paramsSchema: SCHEMAS.cap09ReviewDecisionParams,
  handle: assessCurrency,
};

export const cap09Routes: readonly Route<never>[] = [
  submitDecisionRoute as unknown as Route<never>,
  getDecisionRoute as unknown as Route<never>,
  assessCurrencyRoute as unknown as Route<never>,
];
