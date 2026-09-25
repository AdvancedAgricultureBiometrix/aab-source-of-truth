// SCS-CAP-03 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts). CAP-02 parties and CAP-01 frameworks are read
// from their tables (scs_api may SELECT them), never written.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsPlotFrameworkAssociationInput, ScsPlotRegistrationInput, ScsPlotTenureClaimInput } from "../../types/cap-03.js";
import { CAPABILITY_ID } from "./errors.js";

export interface PartyStatus {
  readonly partyId: string;
  readonly registrationStatus: string;
}

/** Each of `partyIds` that is a registered SCS-CAP-02 party, keyed by partyId. */
export async function findParties(tx: Tx, partyIds: readonly string[]): Promise<Map<string, PartyStatus>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; registration_status: string }>(
      `SELECT party_id, registration_status FROM scs.party_identity WHERE party_id = ANY($1::uuid[])`,
      [partyIds],
    ),
  );
  return new Map(rows.map((r) => [r.party_id, { partyId: r.party_id, registrationStatus: r.registration_status }]));
}

export interface FrameworkForPlot {
  readonly frameworkId: string;
  readonly status: string;
  readonly regulationVersion: string;
  readonly commodityCode: string;
  readonly evidenceSpecId: string;
}

/** Each of `frameworkIds` registered by SCS-CAP-01, keyed by frameworkId: the contract's GetFramework. */
export async function findFrameworks(tx: Tx, frameworkIds: readonly string[]): Promise<Map<string, FrameworkForPlot>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ framework_id: string; status: string; regulation_version: string; commodity_code: string; evidence_spec_id: string }>(
      `SELECT framework_id, status, regulation_version, commodity_code, evidence_spec_id
         FROM scs.regulatory_framework WHERE framework_id = ANY($1::uuid[])`,
      [frameworkIds],
    ),
  );
  return new Map(
    rows.map((r) => [
      r.framework_id,
      { frameworkId: r.framework_id, status: r.status, regulationVersion: r.regulation_version, commodityCode: r.commodity_code, evidenceSpecId: r.evidence_spec_id },
    ]),
  );
}

export interface NewPlot {
  readonly plot: ScsPlotRegistrationInput;
  readonly schemaVersion: string;
  readonly registrationStatus: string;
  readonly overlapState: string;
  readonly registeredBy: ActorReference;
}

export interface InsertedPlot {
  readonly plotId: string;
  readonly plotVersion: number;
  /** Transaction timestamp: registeredAt = recordedAt = decidedAt. */
  readonly registeredAt: string;
}

/** Insert the ScsPlotRegistration row at version 1. The database generates plotId. */
export async function insertPlot(tx: Tx, n: NewPlot): Promise<InsertedPlot> {
  const p = n.plot;
  const g = p.geometry;
  const e = p.identityEvidence;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ plot_id: string; plot_version: number; registered_at: Date }>(
      `INSERT INTO scs.plot (
         plot_version, schema_version, registered_at, registered_by, registration_status,
         plot_name, country_code, administrative_areas,
         geometry_type, geometry_coordinates, coordinate_reference_system, area_hectares, capture_method,
         positional_accuracy_metres, boundary_uncertainty_description, captured_at,
         registry_reference, registry_authority, registry_verification_status, supporting_evidence_ids, evidence_limitations,
         overlap_state, provenance_submitted_by, provenance_submitting_organization_id, provenance_source_type, provenance_recorded_at
       ) VALUES (1, $1, now(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $2, $21, $22, now())
       RETURNING plot_id, plot_version, registered_at`,
      [
        n.schemaVersion,
        JSON.stringify(n.registeredBy),
        n.registrationStatus,
        p.plotName ?? null,
        p.countryCode,
        p.administrativeAreas ?? null,
        g.geometryType,
        JSON.stringify(g.coordinates),
        g.coordinateReferenceSystem,
        g.areaHectares ?? null,
        g.captureMethod,
        g.positionalAccuracyMetres ?? null,
        g.boundaryUncertaintyDescription ?? null,
        g.capturedAt ?? null,
        e.registryReference ?? null,
        e.registryAuthority ?? null,
        e.registryVerificationStatus,
        e.supportingEvidenceIds,
        e.evidenceLimitations,
        n.overlapState,
        p.submittingOrganizationId ?? null,
        p.sourceType,
      ],
    ),
  );
  const row = rows[0]!;
  return { plotId: row.plot_id, plotVersion: row.plot_version, registeredAt: row.registered_at.toISOString() };
}

/** Insert the ScsPlotTenureClaim rows, UNVERIFIED, recorded by `recordedBy`. Returns their ids in request order. */
export async function insertTenureClaims(
  tx: Tx,
  plot: InsertedPlot,
  claims: readonly ScsPlotTenureClaimInput[],
  recordedBy: ActorReference,
): Promise<string[]> {
  const ids: string[] = [];
  for (const c of claims) {
    const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query<{ tenure_claim_id: string }>(
        `INSERT INTO scs.plot_tenure_claim (
           plot_id, plot_version, claimant_type, claimant_party_id, tenure_basis, evidence_ids,
           verification_status, valid_from, valid_until, limitations, recorded_at, recorded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'UNVERIFIED', $7, $8, $9, now(), $10)
         RETURNING tenure_claim_id`,
        [plot.plotId, plot.plotVersion, c.claimantType, c.claimantId, c.tenureBasis, c.evidenceIds, c.validFrom ?? null, c.validUntil ?? null, c.limitations, JSON.stringify(recordedBy)],
      ),
    );
    ids.push(rows[0]!.tenure_claim_id);
  }
  return ids;
}

/**
 * Insert one ScsPlotFrameworkAssociation: APPLICABLE, ACTIVE, the framework's
 * regulationVersion and current evidence requirement specification. The
 * database generates associationId.
 */
export async function insertAssociation(
  tx: Tx,
  plotId: string,
  a: ScsPlotFrameworkAssociationInput,
  framework: FrameworkForPlot,
  associatedBy: ActorReference,
): Promise<string> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ association_id: string }>(
      `INSERT INTO scs.plot_framework_association (
         plot_id, framework_id, framework_version, commodity_code, producer_or_operator_party_id,
         applicability_status, associated_at, associated_by, association_reason,
         evidence_requirement_spec_id, lifecycle_status
       ) VALUES ($1, $2, $3, $4, $5, 'APPLICABLE', now(), $6, $7, $8, 'ACTIVE')
       RETURNING association_id`,
      [plotId, framework.frameworkId, framework.regulationVersion, a.commodityCode, a.producerOrOperatorId ?? null, JSON.stringify(associatedBy), a.associationReason, framework.evidenceSpecId],
    ),
  );
  return rows[0]!.association_id;
}
