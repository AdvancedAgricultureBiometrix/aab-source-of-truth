// SCS-CAP-04 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts). Plots and associations (SCS-CAP-03), frameworks
// (SCS-CAP-01), parties (SCS-CAP-02) and stored objects (AAB-PLATFORM-01) are
// read from their tables, never written.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsDeforestationEvidenceLimitationCode, ScsDeforestationEvidenceSubmissionRequest } from "../../types/cap-04.js";
import { CAPABILITY_ID } from "./errors.js";

/** The database clock: "now" for every date check, so that no application clock is trusted. */
export async function databaseNow(tx: Tx): Promise<Date> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () => tx.query<{ now: Date }>("SELECT now() AS now"));
  return rows[0]!.now;
}

export interface PlotForEvidence {
  readonly plotId: string;
  readonly plotVersion: number;
  readonly registrationStatus: string;
  readonly geometryCoordinates: unknown;
  readonly countryCode: string;
}

export async function findPlot(tx: Tx, plotId: string): Promise<PlotForEvidence | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ plot_id: string; plot_version: number; registration_status: string; geometry_coordinates: unknown; country_code: string }>(
      `SELECT plot_id, plot_version, registration_status, geometry_coordinates, country_code FROM scs.plot WHERE plot_id = $1`,
      [plotId],
    ),
  );
  const r = rows[0];
  return r === undefined ? null : { plotId: r.plot_id, plotVersion: r.plot_version, registrationStatus: r.registration_status, geometryCoordinates: r.geometry_coordinates, countryCode: r.country_code };
}

/** A plot framework association with its SCS-CAP-01 framework's deforestation evidence requirements. */
export interface AssociationForEvidence {
  readonly associationId: string;
  readonly plotId: string;
  readonly lifecycleStatus: string;
  readonly evidenceRequirementSpecId: string;
  readonly frameworkId: string;
  readonly frameworkStatus: string;
  readonly commodityCode: string;
  readonly producerOrOperatorId: string | null;
  readonly acceptedSourceTypes: readonly string[];
  readonly minimumResolutionMetres: number | null;
  readonly minimumRecencyDays: number | null;
  readonly integrityRequirement: "VERIFIED" | "VERIFIABLE";
  readonly authorityConfirmationRequired: boolean;
}

export async function findAssociation(tx: Tx, associationId: string): Promise<AssociationForEvidence | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{
      association_id: string;
      plot_id: string;
      lifecycle_status: string;
      evidence_requirement_spec_id: string;
      framework_id: string;
      status: string;
      commodity_code: string;
      producer_or_operator_party_id: string | null;
      deforestation_accepted_source_types: string[];
      deforestation_minimum_resolution_metres: string | null;
      deforestation_minimum_recency_days: number | null;
      deforestation_integrity_requirement: "VERIFIED" | "VERIFIABLE";
      deforestation_authority_confirmation_required: boolean;
    }>(
      `SELECT a.association_id, a.plot_id, a.lifecycle_status, a.evidence_requirement_spec_id, a.framework_id, f.status,
              a.commodity_code, a.producer_or_operator_party_id,
              f.deforestation_accepted_source_types, f.deforestation_minimum_resolution_metres, f.deforestation_minimum_recency_days,
              f.deforestation_integrity_requirement, f.deforestation_authority_confirmation_required
         FROM scs.plot_framework_association a
         JOIN scs.regulatory_framework f ON f.framework_id = a.framework_id
        WHERE a.association_id = $1`,
      [associationId],
    ),
  );
  const r = rows[0];
  return r === undefined
    ? null
    : {
        associationId: r.association_id,
        plotId: r.plot_id,
        lifecycleStatus: r.lifecycle_status,
        evidenceRequirementSpecId: r.evidence_requirement_spec_id,
        frameworkId: r.framework_id,
        frameworkStatus: r.status,
        commodityCode: r.commodity_code,
        producerOrOperatorId: r.producer_or_operator_party_id,
        acceptedSourceTypes: r.deforestation_accepted_source_types,
        minimumResolutionMetres: r.deforestation_minimum_resolution_metres === null ? null : Number(r.deforestation_minimum_resolution_metres),
        minimumRecencyDays: r.deforestation_minimum_recency_days,
        integrityRequirement: r.deforestation_integrity_requirement,
        authorityConfirmationRequired: r.deforestation_authority_confirmation_required,
      };
}

/** The parties holding a tenure claim on the plot at this version (SCS-CAP-03). */
export async function findTenureClaimants(tx: Tx, plotId: string, plotVersion: number): Promise<string[]> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ claimant_party_id: string }>(
      `SELECT DISTINCT claimant_party_id FROM scs.plot_tenure_claim WHERE plot_id = $1 AND plot_version = $2 ORDER BY claimant_party_id`,
      [plotId, plotVersion],
    ),
  );
  return rows.map((r) => r.claimant_party_id);
}

/** True if AAB-PLATFORM-01 holds an object with this SHA-256 (the objectId). */
export async function objectExists(tx: Tx, sha256: string): Promise<boolean> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query(`SELECT 1 FROM scs.evidence_object WHERE content_sha256 = $1`, [sha256]),
  );
  return rows.length > 0;
}

/** Each of `partyIds` that is a registered SCS-CAP-02 party, mapped to its registrationStatus. */
export async function findParties(tx: Tx, partyIds: readonly string[]): Promise<Map<string, string>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; registration_status: string }>(
      `SELECT party_id, registration_status FROM scs.party_identity WHERE party_id = ANY($1::uuid[])`,
      [partyIds],
    ),
  );
  return new Map(rows.map((r) => [r.party_id, r.registration_status]));
}

/** Those of `evidenceIds` that are admitted CAP-04 records for `plotId`. */
export async function findEvidenceForPlot(tx: Tx, plotId: string, evidenceIds: readonly string[]): Promise<Set<string>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ evidence_id: string }>(
      `SELECT evidence_id FROM scs.deforestation_evidence_record WHERE plot_id = $1 AND evidence_id = ANY($2::uuid[])`,
      [plotId, evidenceIds],
    ),
  );
  return new Set(rows.map((r) => r.evidence_id));
}

export type LineageType = "DERIVED_FROM" | "BASELINE" | "COMPARISON";

export interface NewEvidence {
  readonly request: ScsDeforestationEvidenceSubmissionRequest;
  readonly schemaVersion: string;
  readonly plotVersion: number;
  readonly evidenceRequirementSpecId: string;
  readonly integrityStatus: "VERIFIED" | "UNVERIFIED";
  readonly admissionStatus: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";
  readonly limitations: readonly string[];
  readonly limitationCodes: readonly ScsDeforestationEvidenceLimitationCode[];
  readonly actor: ActorReference;
}

export interface InsertedEvidence {
  readonly evidenceId: string;
  /** Transaction timestamp: submittedAt = admittedAt = decidedAt. */
  readonly admittedAt: string;
}

/**
 * Insert the ScsDeforestationEvidenceRecord at version 1, with its known gaps,
 * excluded areas and lineage. The database generates evidenceId. The
 * intersection with the plot is NOT_VERIFIED and neither coverage is complete
 * (no spatial database; the required period is not known at admission).
 */
export async function insertEvidence(tx: Tx, n: NewEvidence, lineage: ReadonlyArray<{ type: LineageType; citedId: string; resolved: boolean }>): Promise<InsertedEvidence> {
  const r = n.request;
  const { source: s, evidenceObject: o, spatialCoverage: sc, temporalCoverage: t, evidenceClaim: c, coverageAttestation: at } = r;
  const m = r.analyticalMethod;
  const g = sc.coverageGeometry;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ evidence_id: string; admitted_at: Date }>(
      `INSERT INTO scs.deforestation_evidence_record (
         evidence_version, schema_version, plot_id, plot_version, framework_association_id, evidence_requirement_spec_id, evidence_type,
         source_id, source_organization_id, source_title, source_provider_name, source_product_name, source_product_version,
         source_reference, source_issuing_authority,
         submitted_by, submitted_at, evidence_object_sha256, original_object_reference, content_digest, integrity_status, chain_of_custody_complete,
         coverage_geometry_type, coverage_geometry_coordinates, coverage_crs, intersection_with_plot, plot_coverage_percent,
         spatial_resolution_metres, positional_accuracy_metres,
         acquisition_instant, acquisition_start, acquisition_end, analysis_period_start, analysis_period_end,
         attested_period_start, attested_period_end, coverage_mode,
         analysis_method_name, analysis_method_version, analysis_analyst_party_id, analysis_detection_target,
         analysis_minimum_detectable_change, analysis_cloud_cover_percent, analysis_quality_status,
         claim_type, claim_summary, claim_period_start, claim_period_end, claim_confidence, claim_limitations,
         attestation_provided, attestation_attesting_party_id, attestation_attesting_role, attestation_authority_basis,
         attestation_attested_at, attestation_declared_start, attestation_declared_end, attestation_declaration_reference,
         admission_status, admission_temporal_complete, admission_spatial_complete, admission_limitations, admission_limitation_codes,
         admitted_by, admitted_at
       ) VALUES (
         1, $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14,
         $15, now(), $16, $17, $18, $19, $20,
         $21, $22, $23, 'NOT_VERIFIED', $24,
         $25, $26,
         $27, $28, $29, $30, $31,
         $32, $33, $34,
         $35, $36, $37, $38,
         $39, $40, $41,
         $42, $43, $44, $45, $46, $47,
         $48, $49, $50, $51,
         $52, $53, $54, $55,
         $56, false, false, $57, $58,
         $15, now()
       ) RETURNING evidence_id, admitted_at`,
      [
        n.schemaVersion, r.plotId, n.plotVersion, r.frameworkAssociationId, n.evidenceRequirementSpecId, r.evidenceType,
        s.sourceId, s.sourceOrganizationId, s.sourceTitle ?? null, s.providerName ?? null, s.productName ?? null, s.productVersion ?? null,
        s.sourceReference, s.issuingAuthority ?? null,
        JSON.stringify(n.actor), o.objectId ?? null, o.originalObjectReference, o.contentDigest, n.integrityStatus, o.chainOfCustodyComplete,
        g.geometryType, JSON.stringify(g.coordinates), g.coordinateReferenceSystem, sc.plotCoveragePercent ?? null,
        sc.spatialResolutionMetres ?? null, sc.positionalAccuracyMetres ?? null,
        t.acquisitionInstant ?? null, t.acquisitionStart ?? null, t.acquisitionEnd ?? null, t.analysisPeriodStart ?? null, t.analysisPeriodEnd ?? null,
        t.attestedPeriodStart ?? null, t.attestedPeriodEnd ?? null, t.coverageMode,
        m?.methodName ?? null, m?.methodVersion ?? null, m?.analystOrganizationId ?? null, m?.detectionTarget ?? null,
        m?.minimumDetectableChange ?? null, m?.cloudCoverPercent ?? null, m?.qualityStatus ?? null,
        c.claimType, c.claimSummary, c.claimedPeriodStart ?? null, c.claimedPeriodEnd ?? null, c.confidence, c.limitations,
        at.attestationProvided, at.attestingPartyId ?? null, at.attestingRole ?? null, at.authorityBasis ?? null,
        at.attestedAt ?? null, at.declaredCoverageStart ?? null, at.declaredCoverageEnd ?? null, at.declarationTextReference ?? null,
        n.admissionStatus, n.limitations, n.limitationCodes,
      ],
    ),
  );
  const evidenceId = rows[0]!.evidence_id;

  for (const gap of t.knownGapPeriods) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(`INSERT INTO scs.deforestation_evidence_known_gap (evidence_id, gap_start, gap_end, reason) VALUES ($1, $2, $3, $4)`, [
        evidenceId, gap.start, gap.end, gap.reason,
      ]),
    );
  }
  for (const area of sc.excludedAreas ?? []) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(
        `INSERT INTO scs.deforestation_evidence_excluded_area (evidence_id, geometry_type, geometry_coordinates, coordinate_reference_system, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [evidenceId, area.geometry.geometryType, JSON.stringify(area.geometry.coordinates), area.geometry.coordinateReferenceSystem, area.reason],
      ),
    );
  }
  for (const l of lineage) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(
        `INSERT INTO scs.deforestation_evidence_lineage (evidence_id, plot_id, lineage_type, cited_evidence_id, linked_evidence_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [evidenceId, r.plotId, l.type, l.citedId, l.resolved ? l.citedId : null],
      ),
    );
  }
  return { evidenceId, admittedAt: rows[0]!.admitted_at.toISOString() };
}
