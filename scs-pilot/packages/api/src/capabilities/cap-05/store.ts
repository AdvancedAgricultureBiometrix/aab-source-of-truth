// SCS-CAP-05 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts). Frameworks (SCS-CAP-01), parties, verification
// assessments and mandates (SCS-CAP-02), plots (SCS-CAP-03) and stored
// objects (AAB-PLATFORM-01) are read from their tables, never written.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsCustodyEventLimitationCode, ScsCustodyEventSubmissionRequest } from "../../types/cap-05.js";
import { CAPABILITY_ID } from "./errors.js";

/** The database clock: "now" for every date check, so that no application clock is trusted. */
export async function databaseNow(tx: Tx): Promise<Date> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () => tx.query<{ now: Date }>("SELECT now() AS now"));
  return rows[0]!.now;
}

export interface FrameworkForCustody {
  readonly frameworkId: string;
  readonly status: string;
  readonly commodityCode: string;
  readonly evidenceSpecId: string;
}

export async function findFramework(tx: Tx, frameworkId: string): Promise<FrameworkForCustody | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ framework_id: string; status: string; commodity_code: string; evidence_spec_id: string }>(
      `SELECT framework_id, status, commodity_code, evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`,
      [frameworkId],
    ),
  );
  const r = rows[0];
  return r === undefined ? null : { frameworkId: r.framework_id, status: r.status, commodityCode: r.commodity_code, evidenceSpecId: r.evidence_spec_id };
}

export interface PartyForCustody {
  readonly registrationStatus: string;
  readonly partyVersion: number;
}

/** Each of `partyIds` that is a registered SCS-CAP-02 party, keyed by partyId. */
export async function findParties(tx: Tx, partyIds: readonly string[]): Promise<Map<string, PartyForCustody>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; registration_status: string; party_version: number }>(
      `SELECT party_id, registration_status, party_version FROM scs.party_identity WHERE party_id = ANY($1::uuid[])`,
      [partyIds],
    ),
  );
  return new Map(rows.map((r) => [r.party_id, { registrationStatus: r.registration_status, partyVersion: r.party_version }]));
}

/**
 * Those of `partyIds` with a current VERIFIED_FOR_DECLARED_SCOPE assessment,
 * in any scope: not superseded by a later assessment, and not expired at the
 * database's now() (SCS-CAP-02 "Current verification status").
 */
export async function findVerifiedParties(tx: Tx, partyIds: readonly string[]): Promise<Set<string>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string }>(
      `SELECT DISTINCT a.party_id
         FROM scs.party_verification_assessment a
        WHERE a.party_id = ANY($1::uuid[])
          AND a.verification_status = 'VERIFIED_FOR_DECLARED_SCOPE'
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND NOT EXISTS (SELECT 1 FROM scs.party_verification_assessment s WHERE s.supersedes_assessment_id = a.assessment_id)`,
      [partyIds],
    ),
  );
  return new Set(rows.map((r) => r.party_id));
}

export interface MandateForCustody {
  readonly mandateId: string;
  readonly grantingPartyId: string;
  readonly permittedActions: readonly string[];
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly revocationStatus: string;
}

/** Each of `mandateIds` that is a registered SCS-CAP-02 representation mandate. */
export async function findMandates(tx: Tx, mandateIds: readonly string[]): Promise<Map<string, MandateForCustody>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ mandate_id: string; granting_party_id: string; permitted_actions: string[]; valid_from: Date; valid_until: Date; revocation_status: string }>(
      `SELECT mandate_id, granting_party_id, permitted_actions, valid_from, valid_until, revocation_status
         FROM scs.representation_mandate WHERE mandate_id = ANY($1::uuid[])`,
      [mandateIds],
    ),
  );
  return new Map(
    rows.map((r) => [
      r.mandate_id,
      { mandateId: r.mandate_id, grantingPartyId: r.granting_party_id, permittedActions: r.permitted_actions, validFrom: r.valid_from, validUntil: r.valid_until, revocationStatus: r.revocation_status },
    ]),
  );
}

/** True if AAB-PLATFORM-01 holds an object with this SHA-256 (the objectId). */
export async function objectExists(tx: Tx, sha256: string): Promise<boolean> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () => tx.query(`SELECT 1 FROM scs.evidence_object WHERE content_sha256 = $1`, [sha256]));
  return rows.length > 0;
}

/** Each of `plotIds` that is a registered SCS-CAP-03 plot, mapped to its registrationStatus. */
export async function findPlots(tx: Tx, plotIds: readonly string[]): Promise<Map<string, string>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ plot_id: string; registration_status: string }>(`SELECT plot_id, registration_status FROM scs.plot WHERE plot_id = ANY($1::uuid[])`, [plotIds]),
  );
  return new Map(rows.map((r) => [r.plot_id, r.registration_status]));
}

export interface AdmittedEvent {
  readonly frameworkId: string;
  readonly batchIdentifier: string;
}

/** Each of `eventIds` that is an admitted custody event, keyed by eventId. */
export async function findEvents(tx: Tx, eventIds: readonly string[]): Promise<Map<string, AdmittedEvent>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ event_id: string; framework_id: string; batch_identifier: string }>(
      `SELECT event_id, framework_id, batch_identifier FROM scs.custody_event WHERE event_id = ANY($1::uuid[])`,
      [eventIds],
    ),
  );
  return new Map(rows.map((r) => [r.event_id, { frameworkId: r.framework_id, batchIdentifier: r.batch_identifier }]));
}

export type LinkType = "PREDECESSOR" | "SUCCESSOR" | "SPLIT_FROM" | "CONSOLIDATED_FROM";

export interface NewCustodyEvent {
  readonly request: ScsCustodyEventSubmissionRequest;
  readonly schemaVersion: string;
  readonly evidenceRequirementSpecId: string;
  readonly sourcePartyVersion: number;
  readonly destinationPartyVersion: number;
  /** Mandate ids that name a registered mandate (linked); the rest stay cited only. */
  readonly sourceMandateLinked: boolean;
  readonly submissionMandateLinked: boolean;
  readonly integrityStatus: "VERIFIED" | "UNVERIFIED";
  readonly admissionStatus: "ADMITTED" | "ADMITTED_WITH_LIMITATIONS";
  readonly limitations: readonly string[];
  readonly limitationCodes: readonly ScsCustodyEventLimitationCode[];
  readonly actor: ActorReference;
}

export interface InsertedCustodyEvent {
  readonly eventId: string;
  /** Transaction timestamp: submittedAt = admittedAt = decidedAt. */
  readonly admittedAt: string;
}

/**
 * Insert the ScsCustodyEventRecord at version 1, with its source plots and
 * links. The database generates eventId. The deferred constraint trigger
 * checks a SPLIT's and a CONSOLIDATION's links when the transaction commits.
 */
export async function insertCustodyEvent(
  tx: Tx,
  n: NewCustodyEvent,
  sourcePlots: ReadonlyArray<{ citedId: string; registered: boolean }>,
  links: ReadonlyArray<{ type: LinkType; citedId: string; admitted: boolean }>,
): Promise<InsertedCustodyEvent> {
  const r = n.request;
  const { sourceParty: sp, destinationParty: dp, commodity: c, eventLocation: loc, eventTime: t, supportingDocument: doc } = r;
  const q = r.quantity;
  const x = r.transformation;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ event_id: string; admitted_at: Date }>(
      `INSERT INTO scs.custody_event (
         event_version, schema_version, framework_id, evidence_requirement_spec_id, event_type,
         source_party_id, source_party_version, source_party_role, source_mandate_cited_id, source_mandate_linked_id,
         destination_party_id, destination_party_version, destination_party_role,
         commodity_code, commodity_name, source_plot_ids_complete, batch_identifier, batch_version,
         quantity_amount, quantity_unit, quantity_unit_description, quantity_measurement_method, quantity_measurement_uncertainty,
         location_country_code, location_administrative_area, location_facility_id, location_facility_name,
         location_latitude, location_longitude, location_accuracy_metres,
         event_date, event_time_utc, time_precision,
         transformation_type, transformation_input_quantity, transformation_input_unit, transformation_input_unit_description,
         transformation_output_quantity, transformation_output_unit, transformation_output_unit_description,
         transformation_conversion_ratio_description,
         document_id, document_type, document_reference, document_issuing_authority, document_date, content_digest,
         evidence_object_sha256, integrity_status,
         submitted_by, submitted_at, submission_mandate_cited_id, submission_mandate_linked_id, chain_of_custody_complete,
         uncertainties, contradictions, known_gaps,
         admission_status, admission_limitations, admission_limitation_codes, admitted_by, admitted_at
       ) VALUES (
         1, $1, $2, $3, $4,
         $5, $6, $7, $8, $9,
         $10, $11, $12,
         $13, $14, $15, $16, $17,
         $18, $19, $20, $21, $22,
         $23, $24, $25, $26,
         $27, $28, $29,
         $30, $31, $32,
         $33, $34, $35, $36,
         $37, $38, $39,
         $40,
         $41, $42, $43, $44, $45, $46,
         $47, $48,
         $49, now(), $50, $51, $52,
         $53, $54, $55,
         $56, $57, $58, $49, now()
       ) RETURNING event_id, admitted_at`,
      [
        n.schemaVersion, r.frameworkAssociationId, n.evidenceRequirementSpecId, r.eventType,
        sp.partyId, n.sourcePartyVersion, sp.partyRoleAtEvent, sp.actingUnderMandateId ?? null, n.sourceMandateLinked ? sp.actingUnderMandateId! : null,
        dp.partyId, n.destinationPartyVersion, dp.partyRoleAtEvent,
        c.commodityCode, c.commodityName, c.sourcePlotIdsComplete, c.batchIdentifier, c.batchVersion ?? null,
        q?.amount ?? null, q?.unit ?? null, q?.unitDescription ?? null, q?.measurementMethod ?? null, q?.measurementUncertainty ?? null,
        loc.countryCode, loc.administrativeArea ?? null, loc.facilityId ?? null, loc.facilityName ?? null,
        loc.coordinates?.latitude ?? null, loc.coordinates?.longitude ?? null, loc.coordinates?.accuracyMetres ?? null,
        t.eventDate, t.eventTimeUTC ?? null, t.timePrecision,
        x?.transformationType ?? null, x?.inputQuantity ?? null, x?.inputUnit ?? null, x?.inputUnitDescription ?? null,
        x?.outputQuantity ?? null, x?.outputUnit ?? null, x?.outputUnitDescription ?? null,
        x?.conversionRatioDescription ?? null,
        doc.documentId, doc.documentType, doc.documentReference, doc.issuingAuthority ?? null, doc.documentDate ?? null, doc.contentDigest,
        doc.objectId ?? null, n.integrityStatus,
        JSON.stringify(n.actor), r.submissionMandateId ?? null, n.submissionMandateLinked ? r.submissionMandateId! : null, r.chainOfCustodyComplete,
        r.uncertainties, r.contradictions, r.knownGaps,
        n.admissionStatus, n.limitations, n.limitationCodes,
      ],
    ),
  );
  const eventId = rows[0]!.event_id;

  for (const p of sourcePlots) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(`INSERT INTO scs.custody_event_source_plot (event_id, cited_plot_id, linked_plot_id) VALUES ($1, $2, $3)`, [eventId, p.citedId, p.registered ? p.citedId : null]),
    );
  }
  for (const l of links) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(
        `INSERT INTO scs.custody_event_link (event_id, event_type, link_type, cited_event_id, linked_event_id) VALUES ($1, $2, $3, $4, $5)`,
        [eventId, r.eventType, l.type, l.citedId, l.admitted ? l.citedId : null],
      ),
    );
  }
  return { eventId, admittedAt: rows[0]!.admitted_at.toISOString() };
}
