// SCS-CAP-09 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction. Evaluations and
// conflict resolutions (SCS-CAP-06), parties (SCS-CAP-02), evidence records
// (SCS-CAP-04), custody events (SCS-CAP-05) and receipts are read, never
// written. Decisions, their reasoning items and currency assessments are
// append-only (migration 017).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import type { ScsCurrencyCheck, ScsMaterialChange } from "../../types/cap-09.js";
import { CAPABILITY_ID } from "./errors.js";

const q = <R extends Record<string, unknown>>(tx: Tx, sql: string, values: readonly unknown[] = []) =>
  withDatabaseErrors(CAPABILITY_ID, () => tx.query<R>(sql, values)).then((r) => r.rows);

/** The transaction's start time. */
export async function transactionStart(tx: Tx): Promise<Date> {
  return (await q<{ now: Date }>(tx, "SELECT now() AS now"))[0]!.now;
}

// ── The evaluation reviewed (SCS-CAP-06) ────────────────────────────────────

export interface ReviewedEvaluation {
  readonly result: ScsSufficiencyEvaluationResult;
  readonly subjectKey: string;
  readonly requestedBy: ActorReference;
}

export async function findEvaluation(tx: Tx, evaluationId: string): Promise<ReviewedEvaluation | null> {
  const rows = await q<{ result: ScsSufficiencyEvaluationResult; subject_key: string; requested_by: ActorReference }>(
    tx,
    `SELECT result, subject_key, requested_by FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`,
    [evaluationId],
  );
  const r = rows[0];
  return r === undefined ? null : { result: r.result, subjectKey: r.subject_key, requestedBy: r.requested_by };
}

/** The SUFFICIENCY_EVALUATION receipts recorded for the evaluation (exactly one, unless the record is corrupt). */
export async function findEvaluationReceipts(tx: Tx, evaluationId: string): Promise<Array<{ receipt: { decision?: unknown }; receiptDigest: string }>> {
  const rows = await q<{ receipt: { decision?: unknown }; receipt_digest: string }>(
    tx,
    `SELECT receipt, receipt_digest FROM scs.decision_receipt
      WHERE capability_id = 'SCS-CAP-06' AND decision_type = 'SUFFICIENCY_EVALUATION' AND subject_id = $1`,
    [evaluationId],
  );
  return rows.map((r) => ({ receipt: r.receipt, receiptDigest: r.receipt_digest }));
}

/** The actor who recorded each conflict resolution the evaluation applied. */
export async function findAppliedResolutionReviewers(tx: Tx, evaluationId: string): Promise<Array<{ resolutionId: string; actorId: string }>> {
  const rows = await q<{ resolution_id: string; actor_id: string }>(
    tx,
    `SELECT r.resolution_id, r.reviewer ->> 'actorId' AS actor_id
       FROM scs.sufficiency_evaluation_resolution er
       JOIN scs.conflict_resolution r ON r.resolution_id = er.resolution_id
      WHERE er.evaluation_id = $1 ORDER BY r.resolution_id`,
    [evaluationId],
  );
  return rows.map((r) => ({ resolutionId: r.resolution_id, actorId: r.actor_id }));
}

/**
 * Every other evaluation of the same subject evaluated at or after this one,
 * latest first. An evaluation evaluated at the same instant counts as later:
 * which of the two is newer cannot be told, so neither is taken as current.
 */
export async function findLaterEvaluations(
  tx: Tx,
  evaluationId: string,
  subjectKey: string,
): Promise<Array<{ evaluationId: string; evaluatedAt: string }>> {
  // compared in SQL: evaluated_at has microseconds, a JavaScript Date only milliseconds
  const rows = await q<{ evaluation_id: string; evaluated_at: Date }>(
    tx,
    `SELECT l.evaluation_id, l.evaluated_at
       FROM scs.sufficiency_evaluation e
       JOIN scs.sufficiency_evaluation l ON l.subject_key = e.subject_key AND l.evaluation_id <> e.evaluation_id AND l.evaluated_at >= e.evaluated_at
      WHERE e.evaluation_id = $1 AND e.subject_key = $2
      ORDER BY l.evaluated_at DESC, l.evaluation_id`,
    [evaluationId, subjectKey],
  );
  return rows.map((r) => ({ evaluationId: r.evaluation_id, evaluatedAt: r.evaluated_at.toISOString() }));
}

export async function findParty(tx: Tx, partyId: string): Promise<{ registrationStatus: string } | null> {
  const rows = await q<{ registration_status: string }>(tx, `SELECT registration_status FROM scs.party_identity WHERE party_id = $1`, [partyId]);
  return rows[0] === undefined ? null : { registrationStatus: rows[0].registration_status };
}

// ── The evaluation's scope now (for currency) ───────────────────────────────
// The same scope SCS-CAP-06 evaluates (capabilities/cap-06/store.ts,
// findDeforestationEvidence and findCustodyEvents): every admitted CAP-04
// record for the plots under the framework, and every admitted CAP-05 event
// for the batches under the framework. Only ids and admission times are read.

export async function findScopeNow(
  tx: Tx,
  s: { plotIds: readonly string[]; batchIdentifiers: readonly string[]; frameworkId: string },
): Promise<Array<{ kind: "DEFORESTATION" | "CUSTODY"; id: string; admittedAt: string }>> {
  const rows = await q<{ kind: "DEFORESTATION" | "CUSTODY"; id: string; admitted_at: Date }>(
    tx,
    `SELECT 'DEFORESTATION' AS kind, r.evidence_id AS id, r.admitted_at
       FROM scs.deforestation_evidence_record r
       JOIN scs.plot_framework_association a ON a.association_id = r.framework_association_id
      WHERE r.plot_id = ANY($1::uuid[]) AND a.framework_id = $3
     UNION ALL
     SELECT 'CUSTODY', e.event_id, e.admitted_at
       FROM scs.custody_event e
      WHERE e.framework_id = $3 AND e.batch_identifier = ANY($2::text[])
     ORDER BY admitted_at, id`,
    [s.plotIds, s.batchIdentifiers, s.frameworkId],
  );
  return rows.map((r) => ({ kind: r.kind, id: r.id, admittedAt: r.admitted_at.toISOString() }));
}

/** Conflict resolutions recorded for any of these conflict keys, except those listed. */
export async function findResolutionsNotApplied(
  tx: Tx,
  conflictKeys: readonly string[],
  applied: readonly string[],
): Promise<Array<{ resolutionId: string; conflictKey: string; resolvedAt: string }>> {
  if (conflictKeys.length === 0) return [];
  const rows = await q<{ resolution_id: string; conflict_key: string; resolved_at: Date }>(
    tx,
    `SELECT resolution_id, conflict_key, resolved_at FROM scs.conflict_resolution
      WHERE conflict_key = ANY($1::text[]) AND NOT (resolution_id = ANY($2::uuid[]))
      ORDER BY resolved_at, resolution_id`,
    [conflictKeys, applied],
  );
  return rows.map((r) => ({ resolutionId: r.resolution_id, conflictKey: r.conflict_key, resolvedAt: r.resolved_at.toISOString() }));
}

// ── Decisions ───────────────────────────────────────────────────────────────

/** Serialise decisions on the same subject until the transaction ends. */
export async function lockSubject(tx: Tx, subjectKey: string): Promise<void> {
  await q(tx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`scs-review-decision\u001f${subjectKey}`]);
}

export async function findDecisionForEvaluation(tx: Tx, evaluationId: string): Promise<string | null> {
  const rows = await q<{ decision_id: string }>(tx, `SELECT decision_id FROM scs.regulatory_review_decision WHERE evaluation_id = $1`, [evaluationId]);
  return rows[0]?.decision_id ?? null;
}

/** The subject's current decision: its most recent decision that no later decision supersedes. */
export async function findCurrentDecision(tx: Tx, subjectKey: string): Promise<string | null> {
  const rows = await q<{ decision_id: string }>(
    tx,
    `SELECT d.decision_id FROM scs.regulatory_review_decision d
      WHERE d.subject_key = $1
        AND NOT EXISTS (SELECT 1 FROM scs.regulatory_review_decision s WHERE s.supersedes_decision_id = d.decision_id)
      ORDER BY d.decided_at DESC, d.decision_id LIMIT 1`,
    [subjectKey],
  );
  return rows[0]?.decision_id ?? null;
}

export interface DecisionRow {
  readonly decisionId: string;
  readonly schemaVersion: string;
  readonly evaluationId: string;
  readonly evaluationSnapshotDigest: string;
  readonly subjectKey: string;
  readonly frameworkId: string;
  readonly frameworkVersion: string;
  readonly evidenceRequirementSpecId: string;
  readonly commodityCode: string;
  readonly evaluationOverallState: string;
  readonly operatorPartyId: string;
  readonly plotIds: readonly string[];
  readonly decisionOutcome: string;
  readonly evaluationSummaryAssessed: string;
  readonly limitationsAcknowledged: readonly string[];
  readonly basisForOutcome: string;
  readonly remainingConcerns: readonly string[];
  readonly conditions: readonly string[];
  readonly gapsConsidered: ReadonlyArray<{ gapId: string; assessment: string }>;
  readonly conflictsConsidered: ReadonlyArray<{ conflictKey: string; assessment: string }>;
  readonly reviewer: ActorReference;
  readonly reviewerName: string;
  readonly reviewerOrganizationId: string;
  readonly reviewerRoleReference: string;
  readonly authorityBasis: string;
  readonly authorityVerifiedAt: string;
  readonly decidedAt: string;
  readonly recordValidity: string;
  readonly decisionReasons: readonly string[];
  readonly supersedesDecisionId: string | null;
  readonly supersessionReason: string | null;
}

export async function findDecision(tx: Tx, decisionId: string): Promise<DecisionRow | null> {
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT d.*,
            (SELECT coalesce(json_agg(json_build_object('gapId', i.gap_id, 'assessment', i.assessment) ORDER BY i.gap_id), '[]'::json)
               FROM scs.review_reasoning_item i WHERE i.decision_id = d.decision_id AND i.item_kind = 'GAP') AS gaps_considered,
            (SELECT coalesce(json_agg(json_build_object('conflictKey', i.conflict_key, 'assessment', i.assessment) ORDER BY i.conflict_key), '[]'::json)
               FROM scs.review_reasoning_item i WHERE i.decision_id = d.decision_id AND i.item_kind = 'CONFLICT') AS conflicts_considered
       FROM scs.regulatory_review_decision d WHERE d.decision_id = $1`,
    [decisionId],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    decisionId: r["decision_id"] as string,
    schemaVersion: r["schema_version"] as string,
    evaluationId: r["evaluation_id"] as string,
    evaluationSnapshotDigest: r["evaluation_snapshot_digest"] as string,
    subjectKey: r["subject_key"] as string,
    frameworkId: r["framework_id"] as string,
    frameworkVersion: r["framework_version"] as string,
    evidenceRequirementSpecId: r["evidence_requirement_spec_id"] as string,
    commodityCode: r["commodity_code"] as string,
    evaluationOverallState: r["evaluation_overall_state"] as string,
    operatorPartyId: r["operator_party_id"] as string,
    plotIds: r["plot_ids"] as string[],
    decisionOutcome: r["decision_outcome"] as string,
    evaluationSummaryAssessed: r["evaluation_summary_assessed"] as string,
    limitationsAcknowledged: r["limitations_acknowledged"] as string[],
    basisForOutcome: r["basis_for_outcome"] as string,
    remainingConcerns: r["remaining_concerns"] as string[],
    conditions: r["conditions"] as string[],
    gapsConsidered: r["gaps_considered"] as Array<{ gapId: string; assessment: string }>,
    conflictsConsidered: r["conflicts_considered"] as Array<{ conflictKey: string; assessment: string }>,
    reviewer: r["reviewer"] as ActorReference,
    reviewerName: r["reviewer_name"] as string,
    reviewerOrganizationId: r["reviewer_organization_id"] as string,
    reviewerRoleReference: r["reviewer_role_reference"] as string,
    authorityBasis: r["authority_basis"] as string,
    authorityVerifiedAt: (r["authority_verified_at"] as Date).toISOString(),
    decidedAt: (r["decided_at"] as Date).toISOString(),
    recordValidity: r["record_validity"] as string,
    decisionReasons: r["decision_reasons"] as string[],
    supersedesDecisionId: r["supersedes_decision_id"] as string | null,
    supersessionReason: r["supersession_reason"] as string | null,
  };
}

/** The decision that supersedes this one, if any (at most one: supersedes_decision_id is unique). */
export async function findSuccessor(tx: Tx, decisionId: string): Promise<{ decisionId: string; decidedAt: string } | null> {
  const rows = await q<{ decision_id: string; decided_at: Date }>(
    tx,
    `SELECT decision_id, decided_at FROM scs.regulatory_review_decision WHERE supersedes_decision_id = $1`,
    [decisionId],
  );
  return rows[0] === undefined ? null : { decisionId: rows[0].decision_id, decidedAt: rows[0].decided_at.toISOString() };
}

export type NewDecision = Omit<DecisionRow, "decidedAt" | "authorityVerifiedAt"> & { readonly decidedAt: Date; readonly authorityVerifiedAt: Date };

/** Insert the decision and one reasoning item per gap and conflict addressed. */
export async function insertDecision(tx: Tx, d: NewDecision): Promise<void> {
  await q(
    tx,
    `INSERT INTO scs.regulatory_review_decision (
       decision_id, schema_version, evaluation_id, evaluation_snapshot_digest, subject_key, framework_id, framework_version,
       evidence_requirement_spec_id, commodity_code, evaluation_overall_state, operator_party_id, plot_ids, decision_outcome,
       evaluation_summary_assessed, limitations_acknowledged, basis_for_outcome, remaining_concerns, conditions,
       reviewer, reviewer_name, reviewer_organization_id, reviewer_role_reference, authority_basis, authority_verified_at,
       decided_at, record_validity, decision_reasons, supersedes_decision_id, supersession_reason
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
    [
      d.decisionId, d.schemaVersion, d.evaluationId, d.evaluationSnapshotDigest, d.subjectKey, d.frameworkId, d.frameworkVersion,
      d.evidenceRequirementSpecId, d.commodityCode, d.evaluationOverallState, d.operatorPartyId, d.plotIds, d.decisionOutcome,
      d.evaluationSummaryAssessed, d.limitationsAcknowledged, d.basisForOutcome, d.remainingConcerns, d.conditions,
      JSON.stringify(d.reviewer), d.reviewerName, d.reviewerOrganizationId, d.reviewerRoleReference, d.authorityBasis, d.authorityVerifiedAt,
      d.decidedAt, d.recordValidity, d.decisionReasons, d.supersedesDecisionId, d.supersessionReason,
    ],
  );
  for (const g of d.gapsConsidered) {
    await q(tx, `INSERT INTO scs.review_reasoning_item (decision_id, item_kind, gap_id, assessment) VALUES ($1, 'GAP', $2, $3)`, [d.decisionId, g.gapId, g.assessment]);
  }
  for (const c of d.conflictsConsidered) {
    await q(tx, `INSERT INTO scs.review_reasoning_item (decision_id, item_kind, conflict_key, assessment) VALUES ($1, 'CONFLICT', $2, $3)`, [
      d.decisionId, c.conflictKey, c.assessment,
    ]);
  }
}

// ── Currency assessments ────────────────────────────────────────────────────

export async function insertAssessment(
  tx: Tx,
  a: {
    readonly decisionId: string;
    readonly assessedAt: Date;
    readonly assessedBy: ActorReference;
    readonly currencyStatus: string;
    readonly supersededByDecisionId: string | null;
    readonly checksPerformed: readonly ScsCurrencyCheck[];
    readonly materialChanges: readonly ScsMaterialChange[];
  },
): Promise<string> {
  const rows = await q<{ assessment_id: string }>(
    tx,
    `INSERT INTO scs.decision_currency_assessment
       (decision_id, assessed_at, assessed_by, currency_status, superseded_by_decision_id, checks_performed, material_changes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING assessment_id`,
    [a.decisionId, a.assessedAt, JSON.stringify(a.assessedBy), a.currencyStatus, a.supersededByDecisionId, JSON.stringify(a.checksPerformed), JSON.stringify(a.materialChanges)],
  );
  return rows[0]!.assessment_id;
}
