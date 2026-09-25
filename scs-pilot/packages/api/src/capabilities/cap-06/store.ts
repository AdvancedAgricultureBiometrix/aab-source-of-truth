// SCS-CAP-06 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction, which for
// evaluateSufficiency is REPEATABLE READ: every read below sees the same
// snapshot, so nothing admitted after it began can affect the evaluation.
// Frameworks (SCS-CAP-01), parties and verification assessments (SCS-CAP-02),
// plots (SCS-CAP-03), evidence records (SCS-CAP-04) and custody events
// (SCS-CAP-05) are read, never written.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsSufficiencyEvaluationResult } from "../../types/cap-06.js";
import { CAPABILITY_ID } from "./errors.js";

const q = <R extends Record<string, unknown>>(tx: Tx, sql: string, values: readonly unknown[] = []) =>
  withDatabaseErrors(CAPABILITY_ID, () => tx.query<R>(sql, values)).then((r) => r.rows);

const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());
// SQL dates are read as text (column::text), never as a JavaScript Date: pg
// turns a date into local midnight, which toISOString() can shift to the
// previous day in any time zone ahead of UTC.
const num = (v: string | number | null): number | null => (v === null ? null : Number(v));

/** The transaction's start time: the evidence cut-off. */
export async function transactionStart(tx: Tx): Promise<Date> {
  return (await q<{ now: Date }>(tx, "SELECT now() AS now"))[0]!.now;
}

// ── Framework and specification ─────────────────────────────────────────────

export interface FrameworkSpec {
  readonly frameworkId: string;
  readonly status: string;
  readonly regulationVersion: string;
  readonly commodityCode: string;
  readonly specId: string;
  readonly referenceCutoffDate: string;
  readonly requiredCoverageType: string;
  readonly acceptedSourceTypes: readonly string[];
  readonly minimumResolutionMetres: number | null;
  readonly minimumRecencyDays: number | null;
  readonly integrityRequirement: string;
  readonly authorityConfirmationRequired: boolean;
  readonly requiredDocumentTypes: readonly string[];
  readonly chainOfCustodyStandards: readonly string[];
  readonly traceabilityDepth: "FIRST_SUPPLIER" | "FULL_CHAIN" | "RISK_PROPORTIONATE";
  readonly geolocationRequired: boolean;
  readonly landRegistryRequired: boolean;
  readonly minimumPlotIdentifierType: string;
  readonly ownershipVerificationRequired: boolean;
  readonly threshold: {
    readonly allPlotsRegistered: boolean;
    readonly allPlotsHaveDeforestationEvidence: boolean;
    readonly custodyChainComplete: boolean;
    readonly noUnresolvedGaps: boolean;
    readonly humanReviewCompleted: boolean;
  };
}

export async function findFramework(tx: Tx, frameworkId: string): Promise<FrameworkSpec | null> {
  const rows = await q<Record<string, never>>(
    tx,
    `SELECT *, deforestation_reference_cutoff_date::text AS reference_cutoff_date_text FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  );
  const r = rows[0] as Record<string, unknown> | undefined;
  if (r === undefined) return null;
  return {
    frameworkId: r["framework_id"] as string,
    status: r["status"] as string,
    regulationVersion: r["regulation_version"] as string,
    commodityCode: r["commodity_code"] as string,
    specId: r["evidence_spec_id"] as string,
    referenceCutoffDate: r["reference_cutoff_date_text"] as string,
    requiredCoverageType: r["deforestation_required_coverage_type"] as string,
    acceptedSourceTypes: r["deforestation_accepted_source_types"] as string[],
    minimumResolutionMetres: num(r["deforestation_minimum_resolution_metres"] as string | null),
    minimumRecencyDays: r["deforestation_minimum_recency_days"] as number | null,
    integrityRequirement: r["deforestation_integrity_requirement"] as string,
    authorityConfirmationRequired: r["deforestation_authority_confirmation_required"] as boolean,
    requiredDocumentTypes: r["custody_required_document_types"] as string[],
    chainOfCustodyStandards: r["custody_chain_of_custody_standards"] as string[],
    traceabilityDepth: r["custody_traceability_depth"] as FrameworkSpec["traceabilityDepth"],
    geolocationRequired: r["plot_geolocation_required"] as boolean,
    landRegistryRequired: r["plot_land_registry_required"] as boolean,
    minimumPlotIdentifierType: r["plot_minimum_identifier_type"] as string,
    ownershipVerificationRequired: r["plot_ownership_verification_required"] as boolean,
    threshold: {
      allPlotsRegistered: r["sufficiency_all_plots_registered"] as boolean,
      allPlotsHaveDeforestationEvidence: r["sufficiency_all_plots_have_deforestation_evidence"] as boolean,
      custodyChainComplete: r["sufficiency_custody_chain_complete"] as boolean,
      noUnresolvedGaps: r["sufficiency_no_unresolved_gaps"] as boolean,
      humanReviewCompleted: r["sufficiency_human_review_completed"] as boolean,
    },
  };
}

// ── Plots ───────────────────────────────────────────────────────────────────

export interface PlotInput {
  readonly plotId: string;
  readonly plotVersion: number;
  readonly registrationStatus: string;
  readonly overlapState: string;
  readonly geometryType: string;
  readonly registryVerificationStatus: string;
  readonly tenureStatuses: readonly string[];
  /** The plot's ACTIVE association with the framework, if any. */
  readonly associationId: string | null;
}

export async function findPlots(tx: Tx, plotIds: readonly string[], frameworkId: string): Promise<Map<string, PlotInput>> {
  const rows = await q<{
    plot_id: string; plot_version: number; registration_status: string; overlap_state: string; geometry_type: string;
    registry_verification_status: string; tenure_statuses: string[] | null; association_id: string | null;
  }>(
    tx,
    `SELECT p.plot_id, p.plot_version, p.registration_status, p.overlap_state, p.geometry_type, p.registry_verification_status,
            (SELECT array_agg(t.verification_status ORDER BY t.tenure_claim_id) FROM scs.plot_tenure_claim t WHERE t.plot_id = p.plot_id) AS tenure_statuses,
            (SELECT a.association_id FROM scs.plot_framework_association a
              WHERE a.plot_id = p.plot_id AND a.framework_id = $2 AND a.lifecycle_status = 'ACTIVE'
              ORDER BY a.associated_at, a.association_id LIMIT 1) AS association_id
       FROM scs.plot p WHERE p.plot_id = ANY($1::uuid[])`,
    [plotIds, frameworkId],
  );
  return new Map(
    rows.map((r) => [
      r.plot_id,
      {
        plotId: r.plot_id, plotVersion: r.plot_version, registrationStatus: r.registration_status, overlapState: r.overlap_state,
        geometryType: r.geometry_type, registryVerificationStatus: r.registry_verification_status, tenureStatuses: r.tenure_statuses ?? [],
        associationId: r.association_id,
      },
    ]),
  );
}

// ── Parties ─────────────────────────────────────────────────────────────────

export async function findParty(tx: Tx, partyId: string): Promise<{ registrationStatus: string } | null> {
  const rows = await q<{ registration_status: string }>(tx, `SELECT registration_status FROM scs.party_identity WHERE party_id = $1`, [partyId]);
  return rows[0] === undefined ? null : { registrationStatus: rows[0].registration_status };
}

/** Those of `partyIds` with a current VERIFIED_FOR_DECLARED_SCOPE assessment (any scope): not superseded, not expired at the snapshot. */
export async function findVerifiedParties(tx: Tx, partyIds: readonly string[]): Promise<Set<string>> {
  const rows = await q<{ party_id: string }>(
    tx,
    `SELECT DISTINCT a.party_id FROM scs.party_verification_assessment a
      WHERE a.party_id = ANY($1::uuid[]) AND a.verification_status = 'VERIFIED_FOR_DECLARED_SCOPE'
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND NOT EXISTS (SELECT 1 FROM scs.party_verification_assessment s WHERE s.supersedes_assessment_id = a.assessment_id)`,
    [partyIds],
  );
  return new Set(rows.map((r) => r.party_id));
}

// ── Deforestation evidence (SCS-CAP-04) ─────────────────────────────────────

export interface DeforestationInput {
  readonly evidenceId: string;
  readonly evidenceVersion: number;
  readonly plotId: string;
  readonly plotVersion: number;
  readonly evidenceType: string;
  readonly contentDigest: string;
  readonly integrityStatus: string;
  readonly admittedAt: string;
  readonly coverageMode: string;
  readonly coverageBox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  readonly spatialResolutionMetres: number | null;
  readonly acquisitionInstant: string | null;
  readonly acquisitionStart: string | null;
  readonly acquisitionEnd: string | null;
  readonly analysisStart: string | null;
  readonly analysisEnd: string | null;
  readonly attestedStart: string | null;
  readonly attestedEnd: string | null;
  readonly detectionTarget: string | null;
  readonly qualityStatus: string | null;
  readonly analystPartyId: string | null;
  readonly claimType: string;
  readonly claimConfidence: string;
  readonly claimStart: string | null;
  readonly claimEnd: string | null;
  readonly attestationProvided: boolean;
  readonly attestingPartyId: string | null;
  readonly declaredStart: string | null;
  readonly declaredEnd: string | null;
  readonly limitationCodes: readonly string[];
  readonly knownGaps: ReadonlyArray<{ start: string; end: string; reason: string }>;
  readonly excludedAreaIds: readonly string[];
}

function box(coordinates: unknown): DeforestationInput["coverageBox"] {
  let b: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null = null;
  const visit = (v: unknown): void => {
    if (!Array.isArray(v)) return;
    if (v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") {
      const [lon, lat] = v as [number, number];
      b = b === null ? { minLon: lon, minLat: lat, maxLon: lon, maxLat: lat } : { minLon: Math.min(b.minLon, lon), minLat: Math.min(b.minLat, lat), maxLon: Math.max(b.maxLon, lon), maxLat: Math.max(b.maxLat, lat) };
      return;
    }
    v.forEach(visit);
  };
  visit(coordinates);
  return b;
}

/** Every admitted CAP-04 record for these plots under the framework (through the plots' associations with it), oldest first. */
export async function findDeforestationEvidence(tx: Tx, plotIds: readonly string[], frameworkId: string): Promise<DeforestationInput[]> {
  const rows = await q<Record<string, never>>(
    tx,
    `SELECT r.*,
            (SELECT coalesce(json_agg(json_build_object('start', g.gap_start, 'end', g.gap_end, 'reason', g.reason) ORDER BY g.gap_start, g.known_gap_id), '[]'::json)
               FROM scs.deforestation_evidence_known_gap g WHERE g.evidence_id = r.evidence_id) AS known_gaps,
            (SELECT coalesce(array_agg(x.excluded_area_id::text ORDER BY x.excluded_area_id), '{}')
               FROM scs.deforestation_evidence_excluded_area x WHERE x.evidence_id = r.evidence_id) AS excluded_area_ids
       FROM scs.deforestation_evidence_record r
       JOIN scs.plot_framework_association a ON a.association_id = r.framework_association_id
      WHERE r.plot_id = ANY($1::uuid[]) AND a.framework_id = $2
      ORDER BY r.admitted_at, r.evidence_id`,
    [plotIds, frameworkId],
  );
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    evidenceId: r["evidence_id"] as string,
    evidenceVersion: r["evidence_version"] as number,
    plotId: r["plot_id"] as string,
    plotVersion: r["plot_version"] as number,
    evidenceType: r["evidence_type"] as string,
    contentDigest: r["content_digest"] as string,
    integrityStatus: r["integrity_status"] as string,
    admittedAt: iso(r["admitted_at"] as Date)!,
    coverageMode: r["coverage_mode"] as string,
    coverageBox: box(r["coverage_geometry_coordinates"]),
    spatialResolutionMetres: num(r["spatial_resolution_metres"] as string | null),
    acquisitionInstant: iso(r["acquisition_instant"] as Date | null),
    acquisitionStart: iso(r["acquisition_start"] as Date | null),
    acquisitionEnd: iso(r["acquisition_end"] as Date | null),
    analysisStart: iso(r["analysis_period_start"] as Date | null),
    analysisEnd: iso(r["analysis_period_end"] as Date | null),
    attestedStart: iso(r["attested_period_start"] as Date | null),
    attestedEnd: iso(r["attested_period_end"] as Date | null),
    detectionTarget: r["analysis_detection_target"] as string | null,
    qualityStatus: r["analysis_quality_status"] as string | null,
    analystPartyId: r["analysis_analyst_party_id"] as string | null,
    claimType: r["claim_type"] as string,
    claimConfidence: r["claim_confidence"] as string,
    claimStart: iso(r["claim_period_start"] as Date | null),
    claimEnd: iso(r["claim_period_end"] as Date | null),
    attestationProvided: r["attestation_provided"] as boolean,
    attestingPartyId: r["attestation_attesting_party_id"] as string | null,
    declaredStart: iso(r["attestation_declared_start"] as Date | null),
    declaredEnd: iso(r["attestation_declared_end"] as Date | null),
    limitationCodes: r["admission_limitation_codes"] as string[],
    knownGaps: (r["known_gaps"] as Array<{ start: string; end: string; reason: string }>).map((g) => ({
      start: new Date(g.start).toISOString(), end: new Date(g.end).toISOString(), reason: g.reason,
    })),
    excludedAreaIds: r["excluded_area_ids"] as string[],
  }));
}

// ── Custody events (SCS-CAP-05) ─────────────────────────────────────────────

export interface CustodyInput {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly batchIdentifier: string;
  readonly eventType: string;
  readonly sourcePartyId: string;
  readonly destinationPartyId: string;
  readonly quantityAmount: number | null;
  readonly quantityUnit: string | null;
  readonly documentType: string;
  readonly contentDigest: string;
  readonly integrityStatus: string;
  readonly admittedAt: string;
  readonly eventDate: string;
  readonly contradictions: readonly string[];
  readonly limitationCodes: readonly string[];
  /** Linked source plots (registered). */
  readonly sourcePlotIds: readonly string[];
  /** Cited links, with the linked event when it resolved. */
  readonly links: ReadonlyArray<{ type: string; citedId: string; linkedId: string | null }>;
}

/** Every admitted CAP-05 event under the framework for these batches, oldest first. */
export async function findCustodyEvents(tx: Tx, batchIdentifiers: readonly string[], frameworkId: string): Promise<CustodyInput[]> {
  if (batchIdentifiers.length === 0) return [];
  const rows = await q<Record<string, never>>(
    tx,
    `SELECT e.*, e.event_date::text AS event_date_text,
            (SELECT coalesce(array_agg(sp.linked_plot_id::text ORDER BY sp.linked_plot_id), '{}') FROM scs.custody_event_source_plot sp
              WHERE sp.event_id = e.event_id AND sp.linked_plot_id IS NOT NULL) AS linked_plot_ids,
            (SELECT coalesce(json_agg(json_build_object('type', l.link_type, 'citedId', l.cited_event_id, 'linkedId', l.linked_event_id)
                      ORDER BY l.link_type, l.cited_event_id), '[]'::json)
               FROM scs.custody_event_link l WHERE l.event_id = e.event_id) AS links
       FROM scs.custody_event e
      WHERE e.framework_id = $2 AND e.batch_identifier = ANY($1::text[])
      ORDER BY e.admitted_at, e.event_id`,
    [batchIdentifiers, frameworkId],
  );
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    eventId: r["event_id"] as string,
    eventVersion: r["event_version"] as number,
    batchIdentifier: r["batch_identifier"] as string,
    eventType: r["event_type"] as string,
    sourcePartyId: r["source_party_id"] as string,
    destinationPartyId: r["destination_party_id"] as string,
    quantityAmount: num(r["quantity_amount"] as string | null),
    quantityUnit: r["quantity_unit"] as string | null,
    documentType: r["document_type"] as string,
    contentDigest: r["content_digest"] as string,
    integrityStatus: r["integrity_status"] as string,
    admittedAt: iso(r["admitted_at"] as Date)!,
    eventDate: r["event_date_text"] as string,
    contradictions: r["contradictions"] as string[],
    limitationCodes: r["admission_limitation_codes"] as string[],
    sourcePlotIds: r["linked_plot_ids"] as string[],
    links: r["links"] as Array<{ type: string; citedId: string; linkedId: string | null }>,
  }));
}

/** Which of `ids` are admitted records of either kind. */
export async function findAdmittedIds(tx: Tx, ids: readonly string[]): Promise<Set<string>> {
  const rows = await q<{ id: string }>(
    tx,
    `SELECT evidence_id AS id FROM scs.deforestation_evidence_record WHERE evidence_id = ANY($1::uuid[])
     UNION SELECT event_id FROM scs.custody_event WHERE event_id = ANY($1::uuid[])`,
    [ids],
  );
  return new Set(rows.map((r) => r.id));
}

// ── Conflict resolutions ────────────────────────────────────────────────────

export interface ResolutionInput {
  readonly resolutionId: string;
  readonly conflictKey: string;
  /** The evaluation in which the conflict was first found. */
  readonly evaluationId: string;
  readonly inapplicableEvidenceId: string | null;
  readonly remainingLimitations: readonly string[];
  readonly resolvedAt: string;
}

/** Every recorded resolution whose two items are both among `evidenceIds`, in key order. */
export async function findResolutions(tx: Tx, evidenceIds: readonly string[]): Promise<ResolutionInput[]> {
  if (evidenceIds.length === 0) return [];
  const rows = await q<{
    resolution_id: string; conflict_key: string; evaluation_id: string; inapplicable_evidence_id: string | null; remaining_limitations: string[]; resolved_at: Date;
  }>(
    tx,
    `SELECT resolution_id, conflict_key, evaluation_id, inapplicable_evidence_id, remaining_limitations, resolved_at FROM scs.conflict_resolution
      WHERE evidence_a_id = ANY($1::uuid[]) AND evidence_b_id = ANY($1::uuid[]) ORDER BY conflict_key`,
    [evidenceIds],
  );
  return rows.map((r) => ({
    resolutionId: r.resolution_id, conflictKey: r.conflict_key, evaluationId: r.evaluation_id, inapplicableEvidenceId: r.inapplicable_evidence_id,
    remainingLimitations: r.remaining_limitations, resolvedAt: r.resolved_at.toISOString(),
  }));
}

/** Serialise resolutions of the same conflict key until the transaction ends. */
export async function lockConflictKey(tx: Tx, conflictKey: string): Promise<void> {
  await q(tx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`scs-conflict-resolution\u001f${conflictKey}`]);
}

export interface ReportedConflict {
  readonly requirementCode: string;
  readonly evidenceAId: string;
  readonly evidenceBId: string;
}

/** The evaluation's conflict under `conflictKey`: null when there is no such evaluation; { conflict: null } when it reported none under that key. */
export async function findReportedConflict(tx: Tx, evaluationId: string, conflictKey: string): Promise<{ conflict: ReportedConflict | null } | null> {
  const rows = await q<{ conflict: ReportedConflict | null }>(
    tx,
    `SELECT (SELECT c FROM jsonb_array_elements(e.result -> 'allConflicts') AS c WHERE c ->> 'conflictKey' = $2 LIMIT 1) AS conflict
       FROM scs.sufficiency_evaluation e WHERE e.evaluation_id = $1`,
    [evaluationId, conflictKey],
  );
  return rows[0] === undefined ? null : { conflict: rows[0].conflict };
}

/** The actorId that submitted each of `ids`, whether an SCS-CAP-04 record or an SCS-CAP-05 event. */
export async function findSubmitters(tx: Tx, ids: readonly string[]): Promise<Map<string, string>> {
  const rows = await q<{ id: string; actor_id: string }>(
    tx,
    `SELECT evidence_id AS id, submitted_by ->> 'actorId' AS actor_id FROM scs.deforestation_evidence_record WHERE evidence_id = ANY($1::uuid[])
     UNION ALL SELECT event_id, submitted_by ->> 'actorId' FROM scs.custody_event WHERE event_id = ANY($1::uuid[])`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id, r.actor_id]));
}

/** The resolution already recorded for `conflictKey`, if any. */
export async function findResolutionForKey(tx: Tx, conflictKey: string): Promise<string | null> {
  const rows = await q<{ resolution_id: string }>(tx, `SELECT resolution_id FROM scs.conflict_resolution WHERE conflict_key = $1`, [conflictKey]);
  return rows[0]?.resolution_id ?? null;
}

export interface NewResolution {
  readonly conflictKey: string;
  readonly requirementCode: string;
  readonly evidenceAId: string;
  readonly evidenceBId: string;
  readonly evaluationId: string;
  readonly comparedEvidenceIds: readonly string[];
  readonly provenanceAndMethodsConsidered: string;
  readonly resolutionReason: string;
  readonly inapplicableEvidenceId: string | null;
  readonly additionalEvidenceObtained: boolean;
  readonly additionalEvidenceIds: readonly string[];
  readonly remainingLimitations: readonly string[];
  readonly reviewer: ActorReference;
  readonly authorityBasis: string;
  readonly reEvaluationRequired: boolean;
}

/** Insert the resolution; the database generates resolutionId. resolvedAt is the transaction time. */
export async function insertResolution(tx: Tx, r: NewResolution): Promise<{ resolutionId: string; resolvedAt: string }> {
  const rows = await q<{ resolution_id: string; resolved_at: Date }>(
    tx,
    `INSERT INTO scs.conflict_resolution (
       conflict_key, requirement_code, evidence_a_id, evidence_b_id, evaluation_id, compared_evidence_ids, provenance_and_methods_considered,
       resolution_reason, inapplicable_evidence_id, additional_evidence_obtained, additional_evidence_ids, remaining_limitations, reviewer,
       authority_basis, resolved_at, re_evaluation_required
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), $15)
     RETURNING resolution_id, resolved_at`,
    [
      r.conflictKey, r.requirementCode, r.evidenceAId, r.evidenceBId, r.evaluationId, r.comparedEvidenceIds, r.provenanceAndMethodsConsidered,
      r.resolutionReason, r.inapplicableEvidenceId, r.additionalEvidenceObtained, r.additionalEvidenceIds, r.remainingLimitations, JSON.stringify(r.reviewer),
      r.authorityBasis, r.reEvaluationRequired,
    ],
  );
  return { resolutionId: rows[0]!.resolution_id, resolvedAt: rows[0]!.resolved_at.toISOString() };
}

// ── Evaluations ─────────────────────────────────────────────────────────────

export async function findEvaluationSubject(tx: Tx, evaluationId: string): Promise<{ subjectKey: string } | null> {
  const rows = await q<{ subject_key: string }>(tx, `SELECT subject_key FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [evaluationId]);
  return rows[0] === undefined ? null : { subjectKey: rows[0].subject_key };
}

/** The most recent earlier evaluation of the same subject, period and assessment type, if any. */
export async function findRepeatedEvaluation(
  tx: Tx,
  subjectKey: string,
  evaluationEndDate: string,
  assessmentType: string,
): Promise<{ evaluationId: string; evaluatedAt: string } | null> {
  const rows = await q<{ evaluation_id: string; evaluated_at: Date }>(
    tx,
    `SELECT evaluation_id, evaluated_at FROM scs.sufficiency_evaluation
      WHERE subject_key = $1 AND evaluation_end_date = $2 AND assessment_type = $3
      ORDER BY evaluated_at DESC, evaluation_id LIMIT 1`,
    [subjectKey, evaluationEndDate, assessmentType],
  );
  return rows[0] === undefined ? null : { evaluationId: rows[0].evaluation_id, evaluatedAt: rows[0].evaluated_at.toISOString() };
}

export async function getEvaluation(tx: Tx, evaluationId: string): Promise<ScsSufficiencyEvaluationResult | null> {
  const rows = await q<{ result: ScsSufficiencyEvaluationResult }>(tx, `SELECT result FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [evaluationId]);
  return rows[0]?.result ?? null;
}

/** Insert the evaluation, its plots and its frozen evidence rows. */
export async function insertEvaluation(
  tx: Tx,
  e: {
    readonly result: ScsSufficiencyEvaluationResult;
    readonly subjectKey: string;
    readonly requestedBy: ActorReference;
    readonly plots: ReadonlyArray<{ plotId: string; plotVersion: number }>;
  },
): Promise<void> {
  const r = e.result;
  await q(
    tx,
    `INSERT INTO scs.sufficiency_evaluation (
       evaluation_id, evaluator_version, request_id, requested_by, requested_at, evaluated_at, subject_key, commodity_code,
       batch_identifiers, operator_party_id, framework_id, framework_version, evidence_requirement_spec_id,
       reference_date, evaluation_end_date, assessment_type, requested_analysis, overall_state,
       has_evidence_gaps, has_material_unresolved_conflicts, previous_evaluation_id, result
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
    [
      r.evaluationId, r.evaluatorVersion, r.requestId, JSON.stringify(e.requestedBy), r.requestedAt, r.evaluatedAt, e.subjectKey, r.commodityCode,
      r.batchIdentifiers, r.operatorPartyId ?? null, r.frameworkId, r.frameworkVersion, r.evidenceRequirementSpecId,
      r.evaluationPeriod.referenceDate, r.evaluationPeriod.evaluationEndDate, r.evaluationPeriod.assessmentType, r.requestedAnalysis, r.overallState,
      r.hasEvidenceGaps, r.hasMaterialUnresolvedConflicts, r.previousEvaluationId ?? null, JSON.stringify(r),
    ],
  );
  for (const p of e.plots) {
    await q(tx, `INSERT INTO scs.sufficiency_evaluation_plot (evaluation_id, plot_id, plot_version) VALUES ($1, $2, $3)`, [r.evaluationId, p.plotId, p.plotVersion]);
  }
  for (const resolutionId of r.evaluatedEvidence.appliedResolutionIds) {
    await q(tx, `INSERT INTO scs.sufficiency_evaluation_resolution (evaluation_id, resolution_id) VALUES ($1, $2)`, [r.evaluationId, resolutionId]);
  }
  for (const m of r.evaluatedEvidence.manifest) {
    await q(
      tx,
      `INSERT INTO scs.sufficiency_evaluation_evidence (evaluation_id, evidence_kind, deforestation_evidence_id, custody_event_id) VALUES ($1, $2, $3, $4)`,
      [r.evaluationId, m.kind, m.kind === "DEFORESTATION" ? m.evidenceId : null, m.kind === "CUSTODY" ? m.evidenceId : null],
    );
  }
}
