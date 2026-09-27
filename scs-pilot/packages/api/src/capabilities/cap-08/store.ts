// SCS-CAP-08 persistence — every SQL statement the capability runs, and
// nothing else. requestCompilation runs in one REPEATABLE READ transaction, so
// every read below sees the snapshot the gate was checked in. Frameworks,
// parties, plots, evidence records, custody events, evaluations, decisions and
// receipts are read, never written. Packages and compilation records are
// append-only (migration 018).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import { CAPABILITY_ID } from "./errors.js";

const q = <R extends Record<string, unknown>>(tx: Tx, sql: string, values: readonly unknown[] = []) =>
  withDatabaseErrors(CAPABILITY_ID, () => tx.query<R>(sql, values)).then((r) => r.rows);

const iso = (d: Date | null): string | undefined => (d === null ? undefined : d.toISOString());
const num = (v: string | number | null): number | undefined => (v === null ? undefined : Number(v));

/** The transaction's start time: compiledAt. */
export async function transactionStart(tx: Tx): Promise<Date> {
  return (await q<{ now: Date }>(tx, "SELECT now() AS now"))[0]!.now;
}

// ── Receipts ────────────────────────────────────────────────────────────────

export interface StoredReceipt { readonly receiptId: string; readonly receipt: Record<string, unknown>; readonly receiptDigest: string }

export async function findReceipts(tx: Tx, capabilityId: string, decisionType: string, subjectId: string): Promise<StoredReceipt[]> {
  const rows = await q<{ receipt_id: string; receipt: Record<string, unknown>; receipt_digest: string }>(
    tx,
    `SELECT receipt_id, receipt, receipt_digest FROM scs.decision_receipt WHERE capability_id = $1 AND decision_type = $2 AND subject_id = $3`,
    [capabilityId, decisionType, subjectId],
  );
  return rows.map((r) => ({ receiptId: r.receipt_id, receipt: r.receipt, receiptDigest: r.receipt_digest }));
}

/** The admission receipt of each id (exactly one expected per id). */
export async function findAdmissionReceipts(tx: Tx, capabilityId: string, decisionType: string, ids: readonly string[]): Promise<Map<string, string[]>> {
  const rows = await q<{ subject_id: string; receipt_id: string }>(
    tx,
    `SELECT subject_id, receipt_id FROM scs.decision_receipt WHERE capability_id = $1 AND decision_type = $2 AND subject_id = ANY($3::uuid[])
      ORDER BY subject_id, receipt_id`,
    [capabilityId, decisionType, ids],
  );
  const out = new Map<string, string[]>();
  for (const r of rows) out.set(r.subject_id, [...(out.get(r.subject_id) ?? []), r.receipt_id]);
  return out;
}

// ── SCS-CAP-01 framework ────────────────────────────────────────────────────

export interface FrameworkRow {
  readonly frameworkId: string;
  readonly regulationName: string;
  readonly regulationVersion: string;
  readonly regulatoryAuthority: string;
  readonly commodityCode: string;
  readonly commodityName: string;
  readonly countryOfOrigin: string;
  readonly destinationMarket: string;
  readonly applicableNationalLaws: readonly string[];
  readonly evidenceSpecId: string;
  readonly registeredAt: string;
}

export async function findFramework(tx: Tx, frameworkId: string): Promise<FrameworkRow | null> {
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT framework_id, regulation_name, regulation_version, regulatory_authority, commodity_code, commodity_name, country_of_origin,
            destination_market, applicable_national_laws, evidence_spec_id, registered_at
       FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    frameworkId: r["framework_id"] as string,
    regulationName: r["regulation_name"] as string,
    regulationVersion: r["regulation_version"] as string,
    regulatoryAuthority: r["regulatory_authority"] as string,
    commodityCode: r["commodity_code"] as string,
    commodityName: r["commodity_name"] as string,
    countryOfOrigin: r["country_of_origin"] as string,
    destinationMarket: r["destination_market"] as string,
    applicableNationalLaws: r["applicable_national_laws"] as string[],
    evidenceSpecId: r["evidence_spec_id"] as string,
    registeredAt: (r["registered_at"] as Date).toISOString(),
  };
}

// ── SCS-CAP-02 operator ─────────────────────────────────────────────────────

export interface PartyRow {
  readonly partyId: string;
  readonly partyName: string;
  readonly partyType: string;
  readonly countryOfRegistration: string;
  readonly countryOfOperation: string | undefined;
}

export async function findParty(tx: Tx, partyId: string): Promise<PartyRow | null> {
  const rows = await q<{ party_id: string; party_name: string; party_type: string; country_of_registration: string; country_of_operation: string | null }>(
    tx,
    `SELECT party_id, party_name, party_type, country_of_registration, country_of_operation FROM scs.party_identity WHERE party_id = $1`,
    [partyId],
  );
  const r = rows[0];
  return r === undefined
    ? null
    : { partyId: r.party_id, partyName: r.party_name, partyType: r.party_type, countryOfRegistration: r.country_of_registration, countryOfOperation: r.country_of_operation ?? undefined };
}

// ── SCS-CAP-03 plots, as evaluated ──────────────────────────────────────────

export interface PlotRow {
  readonly plotId: string;
  readonly evaluatedVersion: number;
  /** null when the plot is no longer at the evaluated version */
  readonly plotVersion: number | null;
  readonly plotName: string | undefined;
  readonly countryCode: string;
  readonly administrativeAreas: readonly string[] | undefined;
  readonly captureMethod: string;
  readonly positionalAccuracyMetres: number | undefined;
  readonly registryVerificationStatus: string;
  readonly overlapState: string;
  readonly registrationStatus: string;
  readonly evidenceLimitations: readonly string[];
  readonly associationId: string | null;
  readonly tenureClaims: ReadonlyArray<{ tenureClaimId: string; claimantType: string; tenureBasis: string; verificationStatus: string; limitations: string[] }>;
}

/** The evaluation's plots, each with its current record, its ACTIVE association with the framework and its tenure claims at the evaluated version. */
export async function findEvaluatedPlots(tx: Tx, evaluationId: string, frameworkId: string): Promise<PlotRow[]> {
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT ep.plot_id, ep.plot_version AS evaluated_version, p.plot_version, p.plot_name, p.country_code, p.administrative_areas, p.capture_method,
            p.positional_accuracy_metres, p.registry_verification_status, p.overlap_state, p.registration_status, p.evidence_limitations,
            (SELECT a.association_id FROM scs.plot_framework_association a
              WHERE a.plot_id = ep.plot_id AND a.framework_id = $2 AND a.lifecycle_status = 'ACTIVE'
              ORDER BY a.associated_at, a.association_id LIMIT 1) AS association_id,
            (SELECT coalesce(json_agg(json_build_object('tenureClaimId', t.tenure_claim_id, 'claimantType', t.claimant_type, 'tenureBasis', t.tenure_basis,
                                                        'verificationStatus', t.verification_status, 'limitations', t.limitations)
                                      ORDER BY t.tenure_claim_id), '[]'::json)
               FROM scs.plot_tenure_claim t WHERE t.plot_id = ep.plot_id AND t.plot_version = ep.plot_version) AS tenure_claims
       FROM scs.sufficiency_evaluation_plot ep
       LEFT JOIN scs.plot p ON p.plot_id = ep.plot_id AND p.plot_version = ep.plot_version
      WHERE ep.evaluation_id = $1
      ORDER BY ep.plot_id`,
    [evaluationId, frameworkId],
  );
  return rows.map((r) => ({
    plotId: r["plot_id"] as string,
    evaluatedVersion: r["evaluated_version"] as number,
    plotVersion: r["plot_version"] as number | null,
    plotName: (r["plot_name"] as string | null) ?? undefined,
    countryCode: r["country_code"] as string,
    administrativeAreas: (r["administrative_areas"] as string[] | null) ?? undefined,
    captureMethod: r["capture_method"] as string,
    positionalAccuracyMetres: num(r["positional_accuracy_metres"] as string | null),
    registryVerificationStatus: r["registry_verification_status"] as string,
    overlapState: r["overlap_state"] as string,
    registrationStatus: r["registration_status"] as string,
    evidenceLimitations: (r["evidence_limitations"] as string[] | null) ?? [],
    associationId: r["association_id"] as string | null,
    tenureClaims: r["tenure_claims"] as Array<{ tenureClaimId: string; claimantType: string; tenureBasis: string; verificationStatus: string; limitations: string[] }>,
  }));
}

// ── SCS-CAP-04 deforestation evidence ───────────────────────────────────────

export interface DeforestationRow {
  readonly evidenceId: string;
  readonly evidenceVersion: number;
  readonly evidenceType: string;
  readonly plotId: string;
  readonly sourceOrganizationId: string;
  readonly sourceTitle: string | undefined;
  readonly providerName: string | undefined;
  readonly sourceReference: string;
  readonly issuingAuthority: string | undefined;
  readonly submittedBy: string;
  readonly submittedAt: string;
  /** The cited AAB-PLATFORM-01 object, if any. */
  readonly objectSha256: string | null;
  readonly contentDigest: string;
  readonly integrityStatus: string;
  readonly chainOfCustodyComplete: boolean;
  readonly acquisitionInstant: string | undefined;
  readonly acquisitionStart: string | undefined;
  readonly acquisitionEnd: string | undefined;
  readonly analysisPeriodStart: string | undefined;
  readonly analysisPeriodEnd: string | undefined;
  readonly attestedPeriodStart: string | undefined;
  readonly attestedPeriodEnd: string | undefined;
  readonly coverageMode: string;
  readonly knownGapPeriods: ReadonlyArray<{ start: string; end: string; reason: string }>;
  readonly intersectionWithPlot: string;
  readonly spatialResolutionMetres: number | undefined;
  readonly excludedAreaIds: readonly string[];
  readonly claimType: string;
  readonly claimSummary: string;
  readonly claimedPeriodStart: string | undefined;
  readonly claimedPeriodEnd: string | undefined;
  readonly claimConfidence: string;
  readonly claimLimitations: readonly string[];
  readonly admissionStatus: string;
  readonly admissionLimitations: readonly string[];
}

export async function findDeforestationRecords(tx: Tx, ids: readonly string[]): Promise<Map<string, DeforestationRow>> {
  if (ids.length === 0) return new Map();
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT r.*, r.submitted_by ->> 'actorId' AS submitted_by_actor,
            (SELECT coalesce(json_agg(json_build_object('start', g.gap_start, 'end', g.gap_end, 'reason', g.reason) ORDER BY g.gap_start, g.known_gap_id), '[]'::json)
               FROM scs.deforestation_evidence_known_gap g WHERE g.evidence_id = r.evidence_id) AS known_gaps,
            (SELECT coalesce(array_agg(x.excluded_area_id::text ORDER BY x.excluded_area_id), '{}')
               FROM scs.deforestation_evidence_excluded_area x WHERE x.evidence_id = r.evidence_id) AS excluded_area_ids
       FROM scs.deforestation_evidence_record r WHERE r.evidence_id = ANY($1::uuid[])`,
    [ids],
  );
  return new Map(
    rows.map((r) => [
      r["evidence_id"] as string,
      {
        evidenceId: r["evidence_id"] as string,
        evidenceVersion: r["evidence_version"] as number,
        evidenceType: r["evidence_type"] as string,
        plotId: r["plot_id"] as string,
        sourceOrganizationId: r["source_organization_id"] as string,
        sourceTitle: (r["source_title"] as string | null) ?? undefined,
        providerName: (r["source_provider_name"] as string | null) ?? undefined,
        sourceReference: r["source_reference"] as string,
        issuingAuthority: (r["source_issuing_authority"] as string | null) ?? undefined,
        submittedBy: r["submitted_by_actor"] as string,
        submittedAt: (r["submitted_at"] as Date).toISOString(),
        objectSha256: r["evidence_object_sha256"] as string | null,
        contentDigest: r["content_digest"] as string,
        integrityStatus: r["integrity_status"] as string,
        chainOfCustodyComplete: r["chain_of_custody_complete"] as boolean,
        acquisitionInstant: iso(r["acquisition_instant"] as Date | null),
        acquisitionStart: iso(r["acquisition_start"] as Date | null),
        acquisitionEnd: iso(r["acquisition_end"] as Date | null),
        analysisPeriodStart: iso(r["analysis_period_start"] as Date | null),
        analysisPeriodEnd: iso(r["analysis_period_end"] as Date | null),
        attestedPeriodStart: iso(r["attested_period_start"] as Date | null),
        attestedPeriodEnd: iso(r["attested_period_end"] as Date | null),
        coverageMode: r["coverage_mode"] as string,
        knownGapPeriods: (r["known_gaps"] as Array<{ start: string; end: string; reason: string }>).map((g) => ({
          start: new Date(g.start).toISOString(), end: new Date(g.end).toISOString(), reason: g.reason,
        })),
        intersectionWithPlot: r["intersection_with_plot"] as string,
        spatialResolutionMetres: num(r["spatial_resolution_metres"] as string | null),
        excludedAreaIds: r["excluded_area_ids"] as string[],
        claimType: r["claim_type"] as string,
        claimSummary: r["claim_summary"] as string,
        claimedPeriodStart: iso(r["claim_period_start"] as Date | null),
        claimedPeriodEnd: iso(r["claim_period_end"] as Date | null),
        claimConfidence: r["claim_confidence"] as string,
        claimLimitations: r["claim_limitations"] as string[],
        admissionStatus: r["admission_status"] as string,
        admissionLimitations: r["admission_limitations"] as string[],
      },
    ]),
  );
}

// ── SCS-CAP-05 custody events ───────────────────────────────────────────────

export interface CustodyRow {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly eventType: string;
  readonly batchIdentifier: string;
  readonly commodityCode: string;
  readonly sourcePartyId: string;
  readonly destinationPartyId: string;
  readonly eventDate: string;
  readonly timePrecision: string;
  readonly quantityAmount: number | undefined;
  readonly quantityUnit: string | undefined;
  readonly quantityMeasurementMethod: string | undefined;
  readonly documentType: string;
  readonly documentReference: string;
  /** The cited AAB-PLATFORM-01 object, if any. */
  readonly objectSha256: string | null;
  readonly contentDigest: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly integrityStatus: string;
  readonly chainOfCustodyComplete: boolean;
  readonly sourcePlotIds: readonly string[];
  readonly links: ReadonlyArray<{ linkType: string; citedEventId: string; linkedEventId: string | null }>;
  readonly uncertainties: readonly string[];
  readonly contradictions: readonly string[];
  readonly admissionStatus: string;
  readonly admissionLimitations: readonly string[];
}

export async function findCustodyRecords(tx: Tx, ids: readonly string[]): Promise<Map<string, CustodyRow>> {
  if (ids.length === 0) return new Map();
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT e.*, e.event_date::text AS event_date_text, e.submitted_by ->> 'actorId' AS submitted_by_actor,
            (SELECT coalesce(array_agg(sp.linked_plot_id::text ORDER BY sp.linked_plot_id), '{}') FROM scs.custody_event_source_plot sp
              WHERE sp.event_id = e.event_id AND sp.linked_plot_id IS NOT NULL) AS source_plot_ids,
            (SELECT coalesce(json_agg(json_build_object('linkType', l.link_type, 'citedEventId', l.cited_event_id, 'linkedEventId', l.linked_event_id)
                      ORDER BY l.link_type, l.cited_event_id), '[]'::json)
               FROM scs.custody_event_link l WHERE l.event_id = e.event_id) AS links
       FROM scs.custody_event e WHERE e.event_id = ANY($1::uuid[])`,
    [ids],
  );
  return new Map(
    rows.map((r) => [
      r["event_id"] as string,
      {
        eventId: r["event_id"] as string,
        eventVersion: r["event_version"] as number,
        eventType: r["event_type"] as string,
        batchIdentifier: r["batch_identifier"] as string,
        commodityCode: r["commodity_code"] as string,
        sourcePartyId: r["source_party_id"] as string,
        destinationPartyId: r["destination_party_id"] as string,
        eventDate: r["event_date_text"] as string,
        timePrecision: r["time_precision"] as string,
        quantityAmount: num(r["quantity_amount"] as string | null),
        quantityUnit: (r["quantity_unit"] as string | null) ?? undefined,
        quantityMeasurementMethod: (r["quantity_measurement_method"] as string | null) ?? undefined,
        documentType: r["document_type"] as string,
        documentReference: r["document_reference"] as string,
        objectSha256: r["evidence_object_sha256"] as string | null,
        contentDigest: r["content_digest"] as string,
        submittedBy: r["submitted_by_actor"] as string,
        submittedAt: (r["submitted_at"] as Date).toISOString(),
        integrityStatus: r["integrity_status"] as string,
        chainOfCustodyComplete: r["chain_of_custody_complete"] as boolean,
        sourcePlotIds: r["source_plot_ids"] as string[],
        links: r["links"] as Array<{ linkType: string; citedEventId: string; linkedEventId: string | null }>,
        uncertainties: r["uncertainties"] as string[],
        contradictions: r["contradictions"] as string[],
        admissionStatus: r["admission_status"] as string,
        admissionLimitations: r["admission_limitations"] as string[],
      },
    ]),
  );
}

// ── Packages ────────────────────────────────────────────────────────────────

export interface PackageRow {
  readonly packageId: string;
  readonly reviewDecisionId: string;
  readonly evaluationId: string;
  readonly packageContent: unknown;
  readonly packageDigest: string;
  readonly compiledAt: string;
  readonly requestedByActorId: string;
  readonly compiledByServiceIdentity: string;
}

export async function findPackage(tx: Tx, packageId: string): Promise<PackageRow | null> {
  const rows = await q<Record<string, unknown>>(
    tx,
    `SELECT package_id, review_decision_id, evaluation_id, package, package_digest, compiled_at, requested_by_actor_id, compiled_by_service_identity
       FROM scs.due_diligence_package WHERE package_id = $1`,
    [packageId],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    packageId: r["package_id"] as string,
    reviewDecisionId: r["review_decision_id"] as string,
    evaluationId: r["evaluation_id"] as string,
    packageContent: r["package"],
    packageDigest: r["package_digest"] as string,
    compiledAt: (r["compiled_at"] as Date).toISOString(),
    requestedByActorId: r["requested_by_actor_id"] as string,
    compiledByServiceIdentity: r["compiled_by_service_identity"] as string,
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────

export async function insertPackage(
  tx: Tx,
  p: {
    readonly packageId: string;
    readonly schemaVersion: string;
    readonly reviewDecisionId: string;
    readonly evaluationId: string;
    readonly operatorPartyId: string;
    readonly frameworkId: string;
    readonly frameworkVersion: string;
    readonly commodityCode: string;
    readonly packageContent: unknown;
    readonly packageDigest: string;
    readonly compiledAt: Date;
    readonly requestedByActorId: string;
    readonly compiledByServiceIdentity: string;
  },
): Promise<void> {
  await q(
    tx,
    `INSERT INTO scs.due_diligence_package (package_id, schema_version, review_decision_id, evaluation_id, operator_party_id, framework_id, framework_version,
       commodity_code, decision_outcome, package, package_digest, compiled_at, requested_by_actor_id, compiled_by_service_identity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROCEED_TO_PACKAGE_COMPILATION', $9, $10, $11, $12, $13)`,
    [p.packageId, p.schemaVersion, p.reviewDecisionId, p.evaluationId, p.operatorPartyId, p.frameworkId, p.frameworkVersion, p.commodityCode,
      JSON.stringify(p.packageContent), p.packageDigest, p.compiledAt, p.requestedByActorId, p.compiledByServiceIdentity],
  );
}

export async function insertCompilation(
  tx: Tx,
  c: {
    readonly compilationId: string;
    readonly packageId: string;
    readonly packageDigest: string;
    readonly compiledAt: Date;
    readonly requestId: string;
    readonly compiledBy: ActorReference;
    readonly gateChecks: Readonly<Record<string, true>>;
    readonly renditionId: string;
  },
): Promise<void> {
  await q(
    tx,
    `INSERT INTO scs.package_compilation (compilation_id, package_id, package_digest, compiled_at, request_id, compiled_by, gate_checks, rendition_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [c.compilationId, c.packageId, c.packageDigest, c.compiledAt, c.requestId, JSON.stringify(c.compiledBy), JSON.stringify(c.gateChecks), c.renditionId],
  );
}
