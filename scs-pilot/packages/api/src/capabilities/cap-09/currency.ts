// SCS-CAP-09 currency — derived, never stored (contract ff6d3b8, "Currency —
// derived, never stored"). A decision is never updated: whenever it is read or
// assessed, its currency is derived from the governed landscape now, compared
// with the evaluation it reviewed.
//
// The checks, in the contract's table:
//   NEW_EVIDENCE_ADMITTED          — an admitted record in the evaluation's
//                                    scope (plots, batches, framework) that is
//                                    not in its manifest. A set comparison,
//                                    never a time comparison, so it is correct
//                                    under concurrency
//   CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN
//                                  — a resolution recorded for a conflict the
//                                    evaluation reported that it did not
//                                    apply. SCS-CAP-06 applies every resolution
//                                    visible to it for a conflict it reports,
//                                    so such a resolution was recorded after
//                                    the evaluation. A resolution whose
//                                    conflict the evaluation did not report
//                                    could not have changed its result, so it
//                                    is not reported (a deliberate decision,
//                                    contract a816101). None can be withdrawn
//   CAP06_EVALUATION_SUPERSEDED    — a later evaluation of the same subject
//   every other change type        — UNCHANGED: no operation can cause it yet
//
// The status is the first that applies: SUPERSEDED (a later decision
// supersedes this one), POTENTIALLY_STALE (a check found a change),
// FAIL_CLOSED (a check was UNAVAILABLE), CURRENT. In the pilot no check is
// UNAVAILABLE: every check reads the same database, and a failed read fails
// the whole request (DEPENDENCY_UNAVAILABLE). FAIL_CLOSED is recorded, not
// produced (contract a816101).

import type { Tx } from "../../foundation/db.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import type { ScsCurrencyCheck, ScsMaterialChange, ScsRegulatoryReviewDecision } from "../../types/cap-09.js";
import { findLaterEvaluations, findResolutionsNotApplied, findScopeNow, findSuccessor, type DecisionRow } from "./store.js";

type CurrencyStatus = ScsRegulatoryReviewDecision["currencyStatus"];

export interface Currency {
  readonly currencyStatus: CurrencyStatus;
  readonly assessedAt: Date;
  readonly checksPerformed: readonly ScsCurrencyCheck[];
  readonly materialChanges: readonly ScsMaterialChange[];
  readonly successor: { decisionId: string; decidedAt: string } | null;
}

const NO_OPERATION: ReadonlyArray<ScsCurrencyCheck["checkType"]> = [
  "EVIDENCE_WITHDRAWN_OR_QUARANTINED",
  "EVIDENCE_RECLASSIFIED",
  "PLOT_IDENTITY_CHANGED",
  "PLOT_BOUNDARY_CHANGED",
  "TENURE_RECORD_CHANGED",
  "REGISTRY_VERIFICATION_CHANGED",
  "FRAMEWORK_VERSION_CHANGED",
  "EVIDENCE_INTEGRITY_CHALLENGED",
];

const KIND_NAME = { DEFORESTATION: "SCS-CAP-04 deforestation evidence record", CUSTODY: "SCS-CAP-05 custody event" } as const;

/** Derive the currency of `decision`, which reviewed `evaluation`, at `at` (the transaction's start). Reads only. */
export async function deriveCurrency(
  tx: Tx,
  decision: { decisionId: string; subjectKey: string },
  e: ScsSufficiencyEvaluationResult,
  at: Date,
): Promise<Currency> {
  const checks: ScsCurrencyCheck[] = [];
  const changes: ScsMaterialChange[] = [];

  // NEW_EVIDENCE_ADMITTED
  const manifest = new Set(e.evaluatedEvidence.manifest.map((m) => m.evidenceId));
  const scope = await findScopeNow(tx, { plotIds: e.plotIds, batchIdentifiers: e.batchIdentifiers, frameworkId: e.frameworkId });
  const added = scope.filter((s) => !manifest.has(s.id));
  checks.push({
    checkType: "NEW_EVIDENCE_ADMITTED",
    checkResult: added.length > 0 ? "CHANGED" : "UNCHANGED",
    detail: `${scope.length} admitted item(s) are in the evaluation's scope now; its manifest lists ${manifest.size}; ${added.length} are not in it.`,
  });
  changes.push(
    ...added.map((s) => ({
      changeType: "NEW_EVIDENCE_ADMITTED" as const,
      changedAt: s.admittedAt,
      changedEntityId: s.id,
      explanation: `${KIND_NAME[s.kind]} ${s.id}, admitted at ${s.admittedAt}, is in the scope of evaluation ${e.evaluationId} but was not part of its frozen input (evidence cut-off ${e.evidenceCutoffAt}).`,
    })),
  );

  // CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN
  const reported = e.allConflicts.map((c) => c.conflictKey);
  const unapplied = await findResolutionsNotApplied(tx, reported, e.evaluatedEvidence.appliedResolutionIds);
  checks.push({
    checkType: "CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN",
    checkResult: unapplied.length > 0 ? "CHANGED" : "UNCHANGED",
    detail: `${unapplied.length} conflict resolution(s) are recorded for the ${reported.length} conflict(s) the evaluation reported that it did not apply. No operation can withdraw a resolution yet.`,
  });
  changes.push(
    ...unapplied.map((r) => ({
      changeType: "CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN" as const,
      changedAt: r.resolvedAt,
      changedEntityId: r.resolutionId,
      explanation: `Conflict resolution ${r.resolutionId} of conflict ${r.conflictKey}, recorded at ${r.resolvedAt}, was not applied by evaluation ${e.evaluationId}.`,
    })),
  );

  // CAP06_EVALUATION_SUPERSEDED
  const later = await findLaterEvaluations(tx, e.evaluationId, decision.subjectKey);
  checks.push({
    checkType: "CAP06_EVALUATION_SUPERSEDED",
    checkResult: later.length > 0 ? "CHANGED" : "UNCHANGED",
    detail: `${later.length} later evaluation(s) of the same subject.`,
  });
  changes.push(
    ...later.map((l) => ({
      changeType: "CAP06_EVALUATION_SUPERSEDED" as const,
      changedAt: l.evaluatedAt,
      changedEntityId: l.evaluationId,
      explanation: `Evaluation ${l.evaluationId} of the same subject was made at ${l.evaluatedAt}, after evaluation ${e.evaluationId}.`,
    })),
  );

  checks.push(...NO_OPERATION.map((checkType) => ({ checkType, checkResult: "UNCHANGED" as const, detail: "No operation can cause this change yet." })));

  const successor = await findSuccessor(tx, decision.decisionId);
  const currencyStatus: CurrencyStatus =
    successor !== null ? "SUPERSEDED"
    : checks.some((c) => c.checkResult === "CHANGED") ? "POTENTIALLY_STALE"
    : checks.some((c) => c.checkResult === "UNAVAILABLE") ? "FAIL_CLOSED"
    : "CURRENT";
  return { currencyStatus, assessedAt: at, checksPerformed: checks, materialChanges: changes, successor };
}

export const AUTHORITY_BOUNDARY: ScsRegulatoryReviewDecision["authorityBoundary"] = {
  authorisesWorkflowStepOnly: true,
  noComplianceDetermination: true,
  noRegulatorySubmissionAuthority: true,
  doesNotSubstituteForRegulatoryAcceptance: true,
  legalResponsibilityRemainsWithOperator: true,
};

/** The fields of a decision that depend on when it is read: its currency, derived. */
export const DERIVED_DECISION_FIELDS = ["currencyStatus", "currencyLastAssessedAt", "stalenessReasons", "supersededByDecisionId", "supersededAt"] as const;

export type RecordedDecision = Omit<ScsRegulatoryReviewDecision, (typeof DERIVED_DECISION_FIELDS)[number]>;

/** The decision as recorded: everything but its derived currency (SCS-CAP-08 packages this). */
export function recordedDecision(d: DecisionRow, prior: DecisionRow | null): RecordedDecision {
  return {
    decisionId: d.decisionId,
    schemaVersion: d.schemaVersion,
    evaluationId: d.evaluationId,
    evaluationSnapshotDigest: d.evaluationSnapshotDigest,
    frameworkId: d.frameworkId,
    frameworkVersion: d.frameworkVersion,
    evidenceRequirementSpecId: d.evidenceRequirementSpecId,
    commodityCode: d.commodityCode,
    operatorId: d.operatorPartyId,
    plotIds: [...d.plotIds],
    decisionOutcome: d.decisionOutcome as ScsRegulatoryReviewDecision["decisionOutcome"],
    reviewReasoning: {
      evaluationSummaryAssessed: d.evaluationSummaryAssessed,
      gapsConsidered: d.gapsConsidered.map((g) => ({ gapId: g.gapId, assessment: g.assessment })),
      conflictsConsidered: d.conflictsConsidered.map((c) => ({ conflictKey: c.conflictKey, assessment: c.assessment })),
      limitationsAcknowledged: [...d.limitationsAcknowledged],
      basisForOutcome: d.basisForOutcome,
      remainingConcerns: [...d.remainingConcerns],
      conditionsIfAny: [...d.conditions],
    },
    reviewer: {
      reviewerId: d.reviewer.actorId,
      reviewerName: d.reviewerName,
      reviewerOrganizationId: d.reviewerOrganizationId,
      reviewerRoleReference: d.reviewerRoleReference,
      authorityBasis: d.authorityBasis,
      authorityVerifiedAt: d.authorityVerifiedAt,
    },
    decidedAt: d.decidedAt,
    recordValidity: d.recordValidity as ScsRegulatoryReviewDecision["recordValidity"],
    ...(prior === null || d.supersessionReason === null
      ? {}
      : {
          supersedes: {
            priorDecisionId: prior.decisionId,
            priorEvaluationId: prior.evaluationId,
            priorDecisionOutcome: prior.decisionOutcome as ScsRegulatoryReviewDecision["decisionOutcome"],
            priorDecidedAt: prior.decidedAt,
            supersessionReason: d.supersessionReason,
          },
        }),
    decisionReasons: [...d.decisionReasons],
    authorityBoundary: AUTHORITY_BOUNDARY,
  };
}

/** The decision as the contract defines it: the recorded row, with its currency as derived. */
export function decisionRecord(d: DecisionRow, currency: Currency, prior: DecisionRow | null): ScsRegulatoryReviewDecision {
  return {
    ...recordedDecision(d, prior),
    currencyStatus: currency.currencyStatus,
    currencyLastAssessedAt: currency.assessedAt.toISOString(),
    ...(currency.materialChanges.length === 0 ? {} : { stalenessReasons: currency.materialChanges.map((c) => ({ ...c })) }),
    ...(currency.successor === null ? {} : { supersededByDecisionId: currency.successor.decisionId, supersededAt: currency.successor.decidedAt }),
  };
}
