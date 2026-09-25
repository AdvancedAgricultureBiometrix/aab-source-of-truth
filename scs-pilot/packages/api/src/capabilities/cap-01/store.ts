// SCS-CAP-01 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsFrameworkRegistrationRequest } from "../../types/cap-01.js";
import { CAPABILITY_ID } from "./errors.js";

/** The fields that decide whether two frameworks govern the same thing. */
export interface FrameworkScopeKey {
  readonly regulationId: string;
  readonly regulationVersion: string;
  readonly commodityCode: string;
  readonly countryOfOrigin: string;
  readonly destinationMarket: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
}

export function scopeKeyOf(request: ScsFrameworkRegistrationRequest): FrameworkScopeKey {
  return {
    regulationId: request.regulation.regulationId,
    regulationVersion: request.regulation.regulationVersion,
    commodityCode: request.scope.commodityCode,
    countryOfOrigin: request.scope.countryOfOrigin,
    destinationMarket: request.scope.destinationMarket,
    effectiveFrom: request.scope.effectiveFrom,
    effectiveTo: request.scope.effectiveTo ?? null,
  };
}

/**
 * Serialise registrations for one scope until the transaction ends, so two
 * concurrent requests cannot both pass the conflict check. The lock is taken
 * on the scope without dates: any two registrations that could overlap wait
 * for each other.
 */
export async function lockScope(tx: Tx, key: FrameworkScopeKey): Promise<void> {
  const lockName = ["scs-cap-01", key.regulationId, key.regulationVersion, key.commodityCode, key.countryOfOrigin, key.destinationMarket].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/** An ACTIVE framework for the same regulation, version and scope whose effective period overlaps, if any. */
export async function findConflictingActiveFramework(tx: Tx, key: FrameworkScopeKey): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ framework_id: string }>(
      `SELECT framework_id
         FROM scs.regulatory_framework
        WHERE status = 'ACTIVE'
          AND regulation_id = $1 AND regulation_version = $2
          AND commodity_code = $3 AND country_of_origin = $4 AND destination_market = $5
          AND effective_from <= COALESCE($7::date, 'infinity'::date)
          AND $6::date <= COALESCE(effective_to, 'infinity'::date)
        ORDER BY registered_at
        LIMIT 1`,
      [key.regulationId, key.regulationVersion, key.commodityCode, key.countryOfOrigin, key.destinationMarket, key.effectiveFrom, key.effectiveTo],
    ),
  );
  return rows[0]?.framework_id ?? null;
}

export interface InsertedFramework {
  readonly frameworkId: string;
  /** Transaction timestamp: registeredAt = generatedAt = decidedAt. */
  readonly registeredAt: string;
}

export interface NewFramework {
  readonly request: ScsFrameworkRegistrationRequest;
  readonly schemaVersion: string;
  readonly registeredBy: ActorReference;
  readonly specId: string;
  readonly generatedFromFrameworkVersion: string;
}

/** Insert the ScsRegulatoryFramework row (status ACTIVE, empty versionHistory). The database generates frameworkId. */
export async function insertFramework(tx: Tx, f: NewFramework): Promise<InsertedFramework> {
  const { regulation: reg, scope, evidenceRequirements: ev } = f.request;
  const d = ev.deforestationEvidence;
  const c = ev.custodyEvidence;
  const p = ev.plotRequirements;
  const s = ev.sufficiencyThreshold;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ framework_id: string; registered_at: Date }>(
      `INSERT INTO scs.regulatory_framework (
         schema_version, registered_at, registered_by, status,
         regulation_id, regulation_name, regulation_version, regulation_date, regulatory_authority, regulation_source_reference,
         commodity_code, commodity_name, country_of_origin, destination_market, applicable_national_laws, effective_from, effective_to,
         evidence_spec_id, evidence_spec_generated_at, evidence_spec_generated_from_version,
         deforestation_reference_cutoff_date, deforestation_required_coverage_type, deforestation_accepted_source_types,
         deforestation_minimum_resolution_metres, deforestation_minimum_recency_days, deforestation_integrity_requirement,
         deforestation_authority_confirmation_required,
         custody_required_document_types, custody_chain_of_custody_standards, custody_traceability_depth,
         plot_geolocation_required, plot_land_registry_required, plot_minimum_identifier_type, plot_ownership_verification_required,
         sufficiency_all_plots_registered, sufficiency_all_plots_have_deforestation_evidence, sufficiency_custody_chain_complete,
         sufficiency_no_unresolved_gaps, sufficiency_human_review_completed,
         evidence_spec_limitations, version_history
       ) VALUES (
         $1, now(), $2, 'ACTIVE',
         $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15,
         $16, now(), $17,
         $18, $19, $20, $21, $22, $23, $24,
         $25, $26, $27,
         $28, $29, $30, $31,
         $32, $33, $34, $35, $36,
         $37, '[]'::jsonb
       )
       RETURNING framework_id, registered_at`,
      [
        f.schemaVersion, JSON.stringify(f.registeredBy),
        reg.regulationId, reg.regulationName, reg.regulationVersion, reg.regulationDate, reg.regulatoryAuthority, reg.sourceReference,
        scope.commodityCode, scope.commodityName, scope.countryOfOrigin, scope.destinationMarket, scope.applicableNationalLaws,
        scope.effectiveFrom, scope.effectiveTo ?? null,
        f.specId, f.generatedFromFrameworkVersion,
        d.referenceCutoffDate, d.requiredCoverageType, d.acceptedSourceTypes, d.minimumResolutionMetres ?? null, d.minimumRecencyDays ?? null,
        d.integrityRequirement, d.authorityConfirmationRequired,
        c.requiredDocumentTypes, c.chainOfCustodyStandards, c.traceabilityDepth,
        p.geolocationRequired, p.landRegistryRequired, p.minimumPlotIdentifierType, p.ownershipVerificationRequired,
        s.allPlotsRegistered, s.allPlotsHaveDeforestationEvidence, s.custodyChainComplete, s.noUnresolvedGaps, s.humanReviewCompleted,
        ev.specLimitations,
      ],
    ),
  );
  const row = rows[0]!;
  return { frameworkId: row.framework_id, registeredAt: row.registered_at.toISOString() };
}
