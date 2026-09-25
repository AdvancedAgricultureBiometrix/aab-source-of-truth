// SCS-CAP-09 validateForPackageCompilation: the SCS-CAP-08 gate, defined once
// (contract 9a7e2f8, "Validation for package compilation").
//
// Not an endpoint in the pilot: SCS-CAP-08 calls it inside its own
// transaction, so the decision, its currency and the records packaged are read
// in one snapshot. It reads only and records nothing. Each failed check is a
// blocker whose blockerType is the SCS-CAP-08 failure code for that check, in
// the gate's order.

import type { Tx } from "../../foundation/db.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import { deriveCurrency, type Currency } from "./currency.js";
import { findDecision, findEvaluation, type DecisionRow } from "./store.js";

/** ScsPackageCompilationInputs: the scope of the package SCS-CAP-08 has been asked to compile. */
export interface PackageCompilationInputs {
  readonly operatorId: string;
  readonly frameworkId: string;
  readonly frameworkVersion: string;
  readonly commodityCode: string;
  readonly plotIds: readonly string[];
  readonly evaluationId: string;
}

export interface Blocker {
  readonly blockerType: string;
  readonly explanation: string;
  readonly requiredAction: string;
}

/** ScsDecisionPackageValidationResult. */
export interface DecisionPackageValidationResult {
  readonly valid: boolean;
  readonly decisionId: string;
  readonly decisionFound: boolean;
  readonly currencyStatus?: Currency["currencyStatus"];
  readonly recordValidity?: string;
  readonly outcomePermitsCompilation: boolean;
  readonly evaluationIdMatches: boolean;
  readonly frameworkVersionMatches: boolean;
  readonly plotIdsMatch: boolean;
  readonly operatorIdMatches: boolean;
  readonly commodityCodeMatches: boolean;
  readonly blockers: readonly Blocker[];
}

export interface Validation {
  readonly result: DecisionPackageValidationResult;
  /** What the validation read, for the caller to use in the same snapshot. */
  readonly decision: DecisionRow | null;
  readonly prior: DecisionRow | null;
  readonly evaluation: ScsSufficiencyEvaluationResult | null;
  readonly currency: Currency | null;
}

const PROCEED = "PROCEED_TO_PACKAGE_COMPILATION";
const sameSet = (a: readonly string[], b: readonly string[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

export async function validateForPackageCompilation(tx: Tx, decisionId: string, inputs: PackageCompilationInputs, at: Date): Promise<Validation> {
  const d = await findDecision(tx, decisionId);
  if (d === null) {
    return {
      result: {
        valid: false, decisionId, decisionFound: false, outcomePermitsCompilation: false, evaluationIdMatches: false, frameworkVersionMatches: false,
        plotIdsMatch: false, operatorIdMatches: false, commodityCodeMatches: false,
        blockers: [{
          blockerType: "REVIEW_DECISION_NOT_FOUND",
          explanation: `No SCS-CAP-09 review decision is recorded with decisionId ${decisionId}.`,
          requiredAction: "Name a recorded review decision with outcome PROCEED_TO_PACKAGE_COMPILATION.",
        }],
      },
      decision: null, prior: null, evaluation: null, currency: null,
    };
  }
  // the evaluation exists: the decision's foreign key requires it
  const evaluation = (await findEvaluation(tx, d.evaluationId))!.result;
  const prior = d.supersedesDecisionId === null ? null : await findDecision(tx, d.supersedesDecisionId);
  const currency = await deriveCurrency(tx, d, evaluation, at);

  const checks = {
    outcomePermitsCompilation: d.decisionOutcome === PROCEED,
    recordIsValid: d.recordValidity === "VALID",
    currencyIsCurrent: currency.currencyStatus === "CURRENT",
    evaluationIdMatches: inputs.evaluationId === d.evaluationId,
    frameworkVersionMatches: inputs.frameworkId === d.frameworkId && inputs.frameworkVersion === d.frameworkVersion,
    plotIdsMatch: sameSet(inputs.plotIds, d.plotIds),
    operatorIdMatches: inputs.operatorId === d.operatorPartyId,
    commodityCodeMatches: inputs.commodityCode === d.commodityCode,
  };
  const blockers: Blocker[] = [];
  if (!checks.outcomePermitsCompilation) {
    blockers.push({
      blockerType: "REVIEW_DECISION_OUTCOME_NOT_PROCEED",
      explanation: `Decision ${d.decisionId} is ${d.decisionOutcome}; only ${PROCEED} authorises compilation.`,
      requiredAction: `A review decision with outcome ${PROCEED}.`,
    });
  }
  if (!checks.recordIsValid) {
    blockers.push({
      blockerType: "REVIEW_DECISION_NOT_VALID",
      explanation: `Decision ${d.decisionId} is ${d.recordValidity}, not VALID.`,
      requiredAction: "A valid review decision.",
    });
  }
  if (!checks.currencyIsCurrent) {
    blockers.push({
      blockerType: "REVIEW_DECISION_NOT_CURRENT",
      explanation:
        currency.successor !== null
          ? `Decision ${d.decisionId} is SUPERSEDED by decision ${currency.successor.decisionId} (decided at ${currency.successor.decidedAt}).`
          : `Decision ${d.decisionId} is ${currency.currencyStatus}: ${currency.materialChanges.map((c) => c.explanation).join(" ")}`,
      requiredAction:
        currency.successor !== null
          ? `Compile from the subject's current decision, ${currency.successor.decisionId}, if it permits compilation.`
          : "A new SCS-CAP-06 evaluation of the subject and a new SCS-CAP-09 review decision on it.",
    });
  }
  if (!checks.evaluationIdMatches) {
    blockers.push({
      blockerType: "EVALUATION_ID_MISMATCH",
      explanation: `evaluationId ${inputs.evaluationId} is not the evaluation decision ${d.decisionId} reviewed (${d.evaluationId}).`,
      requiredAction: `Package evaluation ${d.evaluationId}, or name the decision on ${inputs.evaluationId}.`,
    });
  }
  if (!checks.frameworkVersionMatches) {
    blockers.push({
      blockerType: "FRAMEWORK_VERSION_MISMATCH",
      explanation: `Framework ${inputs.frameworkId} version "${inputs.frameworkVersion}" is not the decision's (${d.frameworkId} version "${d.frameworkVersion}").`,
      requiredAction: "Name the decision's framework and version.",
    });
  }
  if (!checks.plotIdsMatch) {
    blockers.push({
      blockerType: "PLOT_IDS_MISMATCH",
      explanation: `The plots (${[...inputs.plotIds].sort().join(", ")}) are not the decision's (${[...d.plotIds].sort().join(", ")}).`,
      requiredAction: "Name exactly the decision's plots.",
    });
  }
  if (!checks.operatorIdMatches) {
    blockers.push({
      blockerType: "OPERATOR_MISMATCH",
      explanation: `operatorId ${inputs.operatorId} is not the decision's operator (${d.operatorPartyId}).`,
      requiredAction: "Name the decision's operator.",
    });
  }
  if (!checks.commodityCodeMatches) {
    blockers.push({
      blockerType: "COMMODITY_MISMATCH",
      explanation: `commodityCode "${inputs.commodityCode}" is not the decision's ("${d.commodityCode}").`,
      requiredAction: "Name the decision's commodity.",
    });
  }
  return {
    result: {
      valid: blockers.length === 0,
      decisionId,
      decisionFound: true,
      currencyStatus: currency.currencyStatus,
      recordValidity: d.recordValidity,
      outcomePermitsCompilation: checks.outcomePermitsCompilation,
      evaluationIdMatches: checks.evaluationIdMatches,
      frameworkVersionMatches: checks.frameworkVersionMatches,
      plotIdsMatch: checks.plotIdsMatch,
      operatorIdMatches: checks.operatorIdMatches,
      commodityCodeMatches: checks.commodityCodeMatches,
      blockers,
    },
    decision: d,
    prior,
    evaluation,
    currency,
  };
}
