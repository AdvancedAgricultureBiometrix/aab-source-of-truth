// SCS-CAP-02 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type {
  ScsIdentityEvidenceSubmissionRequest,
  ScsMandateRegistrationRequest,
  ScsPartyRegistrationRequest,
  ScsRelationshipRegistrationRequest,
  ScsRoleClaimRequest,
  ScsVerificationAssessmentRequest,
} from "../../types/cap-02.js";
import { CAPABILITY_ID } from "./errors.js";

/**
 * The party types checked automatically for a conflicting registration. An
 * organisation's name and country of registration identify it; a natural
 * person's do not (two smallholders can share a name), so NATURAL_PERSON and
 * OTHER are never checked and deduplication is a human review concern.
 */
export const CONFLICT_CHECKED_PARTY_TYPES = ["LEGAL_ENTITY", "COOPERATIVE", "COMMUNITY_GROUP", "GOVERNMENT_BODY"] as const;

export type ConflictCheckedPartyType = (typeof CONFLICT_CHECKED_PARTY_TYPES)[number];

export function isConflictChecked(partyType: string): partyType is ConflictCheckedPartyType {
  return (CONFLICT_CHECKED_PARTY_TYPES as readonly string[]).includes(partyType);
}

/** What decides whether two conflict-checked registrations are the same party. */
export interface PartyConflictKey {
  readonly partyName: string;
  readonly countryOfRegistration: string;
}

/**
 * Serialise registrations with the same conflict key until the transaction
 * ends, so two concurrent requests cannot both pass the conflict check.
 */
export async function lockPartyKey(tx: Tx, key: PartyConflictKey): Promise<void> {
  const lockName = ["scs-cap-02-party", key.partyName, key.countryOfRegistration].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/**
 * A conflict-checked party (CONFLICT_CHECKED_PARTY_TYPES) that is not RETIRED
 * with exactly this partyName and countryOfRegistration, if any. NATURAL_PERSON
 * and OTHER parties never conflict, in either direction.
 */
export async function findConflictingParty(tx: Tx, key: PartyConflictKey): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string }>(
      `SELECT party_id
         FROM scs.party_identity
        WHERE party_name = $1 AND country_of_registration = $2 AND registration_status <> 'RETIRED'
          AND party_type = ANY($3::text[])
        ORDER BY registered_at
        LIMIT 1`,
      [key.partyName, key.countryOfRegistration, CONFLICT_CHECKED_PARTY_TYPES],
    ),
  );
  return rows[0]?.party_id ?? null;
}

export interface InsertedParty {
  readonly partyId: string;
  /** Transaction timestamp: registeredAt = provenance.recordedAt = decidedAt. */
  readonly registeredAt: string;
}

export interface NewParty {
  readonly request: ScsPartyRegistrationRequest;
  readonly partyVersion: number;
  readonly schemaVersion: string;
  readonly registeredBy: ActorReference;
}

/**
 * Insert the ScsPartyIdentity row (registrationStatus REGISTERED) and one
 * scs.party_identity_evidence row per evidence id. The database generates
 * partyId.
 */
export async function insertParty(tx: Tx, p: NewParty): Promise<InsertedParty> {
  const r = p.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; registered_at: Date }>(
      `INSERT INTO scs.party_identity (
         party_version, schema_version, registered_at, registered_by,
         party_type, party_name, country_of_registration, country_of_operation,
         registration_status, identity_evidence_limitations,
         provenance_submitted_by, provenance_submitting_organization_id, provenance_recorded_at
       ) VALUES ($1, $2, now(), $3, $4, $5, $6, $7, 'REGISTERED', $8, $3, $9, now())
       RETURNING party_id, registered_at`,
      [
        p.partyVersion,
        p.schemaVersion,
        JSON.stringify(p.registeredBy),
        r.partyType,
        r.partyName,
        r.countryOfRegistration,
        r.countryOfOperation ?? null,
        r.identityEvidence.evidenceLimitations,
        r.submittingOrganizationId ?? null,
      ],
    ),
  );
  const row = rows[0]!;

  if (r.identityEvidence.evidenceIds.length > 0) {
    await withDatabaseErrors(CAPABILITY_ID, () =>
      tx.query(
        `INSERT INTO scs.party_identity_evidence (party_id, party_version, evidence_id)
         SELECT $1, $2, unnest($3::uuid[])`,
        [row.party_id, p.partyVersion, r.identityEvidence.evidenceIds],
      ),
    );
  }

  return { partyId: row.party_id, registeredAt: row.registered_at.toISOString() };
}

// ── Identity evidence submission ────────────────────────────────────────────

export interface PartyForEvidence {
  readonly partyId: string;
  readonly partyVersion: number;
  readonly registrationStatus: string;
}

/** The party as it stands (current version and status), or null if no party has this id. */
export async function findParty(tx: Tx, partyId: string): Promise<PartyForEvidence | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; party_version: number; registration_status: string }>(
      `SELECT party_id, party_version, registration_status FROM scs.party_identity WHERE party_id = $1::uuid`,
      [partyId],
    ),
  );
  const row = rows[0];
  return row === undefined ? null : { partyId: row.party_id, partyVersion: row.party_version, registrationStatus: row.registration_status };
}

/**
 * The party's country for a mandate's geographic scope: its countryOfOperation,
 * or its countryOfRegistration when none is recorded (SCS-CAP-02,
 * "Representative submission", check 6). Null if no party has this id.
 */
export async function findPartyCountry(tx: Tx, partyId: string): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ country: string }>(
      `SELECT coalesce(country_of_operation, country_of_registration) AS country FROM scs.party_identity WHERE party_id = $1::uuid`,
      [partyId],
    ),
  );
  return rows[0]?.country ?? null;
}

/**
 * Serialise evidence submissions for one party until the transaction ends, so
 * two concurrent submissions of the same evidence id cannot both pass the
 * duplicate check (the second gets EVIDENCE_ALREADY_LINKED, not a constraint error).
 */
export async function lockPartyEvidence(tx: Tx, partyId: string): Promise<void> {
  const lockName = ["scs-cap-02-party-evidence", partyId].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/** Which of `evidenceIds` are already linked to this party version, at registration or by any submission. */
export async function findLinkedEvidence(tx: Tx, partyId: string, partyVersion: number, evidenceIds: readonly string[]): Promise<string[]> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ evidence_id: string }>(
      `SELECT evidence_id::text AS evidence_id
         FROM scs.party_identity_evidence
        WHERE party_id = $1 AND party_version = $2 AND evidence_id = ANY($3::uuid[])
        ORDER BY evidence_id`,
      [partyId, partyVersion, evidenceIds],
    ),
  );
  return rows.map((r) => r.evidence_id);
}

export interface NewEvidenceSubmission {
  readonly party: PartyForEvidence;
  readonly request: ScsIdentityEvidenceSubmissionRequest;
  readonly submittedBy: ActorReference;
}

export interface InsertedEvidenceSubmission {
  readonly submissionId: string;
  /** Transaction timestamp: submittedAt = decidedAt. */
  readonly submittedAt: string;
}

/**
 * Insert the ScsPartyIdentityEvidenceSubmission row and one
 * scs.party_identity_evidence row per evidence id, naming the submission and
 * the party's current version. The database generates submissionId. The
 * party identity record is not touched.
 */
export async function insertEvidenceSubmission(tx: Tx, s: NewEvidenceSubmission): Promise<InsertedEvidenceSubmission> {
  const r = s.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ submission_id: string; submitted_at: Date }>(
      `INSERT INTO scs.party_identity_evidence_submission (
         party_id, party_version, evidence_limitations, submitted_by, submitting_organization_id, submitted_at
       ) VALUES ($1, $2, $3, $4, $5, now())
       RETURNING submission_id, submitted_at`,
      [s.party.partyId, s.party.partyVersion, r.evidenceLimitations, JSON.stringify(s.submittedBy), r.submittingOrganizationId ?? null],
    ),
  );
  const row = rows[0]!;

  await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query(
      `INSERT INTO scs.party_identity_evidence (party_id, party_version, evidence_id, submission_id)
       SELECT $1, $2, unnest($3::uuid[]), $4`,
      [s.party.partyId, s.party.partyVersion, r.evidenceIds, row.submission_id],
    ),
  );

  return { submissionId: row.submission_id, submittedAt: row.submitted_at.toISOString() };
}

// ── Shared lookups: parties and CAP-01 frameworks ─────────────────────────────

/** Each of `partyIds` that is registered, keyed by partyId. */
export async function findPartiesById(tx: Tx, partyIds: readonly string[]): Promise<Map<string, PartyForEvidence>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; party_version: number; registration_status: string }>(
      `SELECT party_id, party_version, registration_status FROM scs.party_identity WHERE party_id = ANY($1::uuid[])`,
      [partyIds],
    ),
  );
  return new Map(rows.map((r) => [r.party_id, { partyId: r.party_id, partyVersion: r.party_version, registrationStatus: r.registration_status }]));
}

export interface FrameworkForAssociation {
  readonly frameworkId: string;
  readonly status: string;
  readonly regulationVersion: string;
  readonly commodityCode: string;
  readonly countryOfOrigin: string;
}

/**
 * Each of `frameworkIds` registered by SCS-CAP-01, keyed by frameworkId: the
 * contract's GetFramework, read from CAP-01's table (scs_api may SELECT it).
 */
export async function findFrameworksById(tx: Tx, frameworkIds: readonly string[]): Promise<Map<string, FrameworkForAssociation>> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ framework_id: string; status: string; regulation_version: string; commodity_code: string; country_of_origin: string }>(
      `SELECT framework_id, status, regulation_version, commodity_code, country_of_origin
         FROM scs.regulatory_framework WHERE framework_id = ANY($1::uuid[])`,
      [frameworkIds],
    ),
  );
  return new Map(
    rows.map((r) => [
      r.framework_id,
      { frameworkId: r.framework_id, status: r.status, regulationVersion: r.regulation_version, commodityCode: r.commodity_code, countryOfOrigin: r.country_of_origin },
    ]),
  );
}

// ── Relationship registration ────────────────────────────────────────────────

/** What decides whether two relationships can conflict (the rest is compared in findConflictingRelationship). */
export interface RelationshipConflictKey {
  readonly fromPartyId: string;
  readonly toPartyId: string;
  readonly relationshipType: string;
}

/** Serialise registrations of the same from, to and type until the transaction ends. */
export async function lockRelationshipKey(tx: Tx, key: RelationshipConflictKey): Promise<void> {
  const lockName = ["scs-cap-02-relationship", key.fromPartyId, key.toPartyId, key.relationshipType].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/**
 * An ACTIVE relationship with the same from, to and type that shares at least
 * one framework and whose validity period overlaps [validFrom, validUntil), if
 * any. A missing bound is open-ended; a period ending exactly when the other
 * begins does not overlap.
 */
export async function findConflictingRelationship(
  tx: Tx,
  key: RelationshipConflictKey & { readonly frameworkAssociationIds: readonly string[]; readonly validFrom: string | null; readonly validUntil: string | null },
): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ relationship_id: string }>(
      `SELECT relationship_id
         FROM scs.supply_chain_relationship
        WHERE from_party_id = $1 AND to_party_id = $2 AND relationship_type = $3
          AND lifecycle_status = 'ACTIVE'
          AND framework_association_ids && $4::uuid[]
          AND tstzrange(valid_from, valid_until, '[)') && tstzrange($5::timestamptz, $6::timestamptz, '[)')
        ORDER BY created_at
        LIMIT 1`,
      [key.fromPartyId, key.toPartyId, key.relationshipType, key.frameworkAssociationIds, key.validFrom, key.validUntil],
    ),
  );
  return rows[0]?.relationship_id ?? null;
}

export interface NewRelationship {
  readonly request: ScsRelationshipRegistrationRequest;
  readonly schemaVersion: string;
  readonly representationVersion: string;
  readonly createdBy: ActorReference;
}

export interface InsertedRelationship {
  readonly relationshipId: string;
  /** Transaction timestamp: claimedAt = createdAt = decidedAt. */
  readonly createdAt: string;
}

/**
 * Insert the ScsSupplyChainRelationship row: CLAIMED_UNVERIFIED, ACTIVE, no
 * supersession, no verification scope. The database generates relationshipId.
 */
export async function insertRelationship(tx: Tx, n: NewRelationship): Promise<InsertedRelationship> {
  const r = n.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ relationship_id: string; created_at: Date }>(
      `INSERT INTO scs.supply_chain_relationship (
         schema_version, from_party_id, to_party_id, relationship_type, other_relationship_type_description,
         commodity_scope, geographic_scope, framework_association_ids, valid_from, valid_until,
         claimed_by_party_id, claimed_at, relationship_evidence_ids,
         verification_status, lifecycle_status, representation_version, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12,
                 'CLAIMED_UNVERIFIED', 'ACTIVE', $13, $14)
       RETURNING relationship_id, created_at`,
      [
        n.schemaVersion,
        r.fromPartyId,
        r.toPartyId,
        r.relationshipType,
        r.otherRelationshipTypeDescription ?? null,
        r.commodityScope,
        r.geographicScope,
        r.frameworkAssociationIds,
        r.validFrom ?? null,
        r.validUntil ?? null,
        r.claimedByPartyId,
        r.relationshipEvidenceIds,
        n.representationVersion,
        JSON.stringify(n.createdBy),
      ],
    ),
  );
  const row = rows[0]!;
  return { relationshipId: row.relationship_id, createdAt: row.created_at.toISOString() };
}

// ── Mandate registration ─────────────────────────────────────────────────────

/**
 * An ACTIVE relationship between the two parties, in either direction and of
 * any type, not past its validUntil, whose frameworks include every one of
 * `frameworkAssociationIds`, if any: the mandate's governed context.
 */
export async function findCoveringRelationship(
  tx: Tx,
  partyA: string,
  partyB: string,
  frameworkAssociationIds: readonly string[],
): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ relationship_id: string }>(
      `SELECT relationship_id
         FROM scs.supply_chain_relationship
        WHERE ((from_party_id = $1 AND to_party_id = $2) OR (from_party_id = $2 AND to_party_id = $1))
          AND lifecycle_status = 'ACTIVE'
          AND (valid_until IS NULL OR valid_until > now())
          AND framework_association_ids @> $3::uuid[]
        ORDER BY created_at
        LIMIT 1`,
      [partyA, partyB, frameworkAssociationIds],
    ),
  );
  return rows[0]?.relationship_id ?? null;
}

/** Serialise registrations of mandates from one granting party to one representative until the transaction ends. */
export async function lockMandatePair(tx: Tx, grantingPartyId: string, representativePartyId: string): Promise<void> {
  const lockName = ["scs-cap-02-mandate", grantingPartyId, representativePartyId].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/**
 * A NOT_REVOKED mandate from the same granting party to the same
 * representative that shares at least one framework and at least one
 * permitted action and whose validity period overlaps [validFrom, validUntil),
 * if any.
 */
export async function findConflictingMandate(
  tx: Tx,
  m: {
    readonly grantingPartyId: string;
    readonly representativePartyId: string;
    readonly frameworkAssociationIds: readonly string[];
    readonly permittedActions: readonly string[];
    readonly validFrom: string;
    readonly validUntil: string;
  },
): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ mandate_id: string }>(
      `SELECT mandate_id
         FROM scs.representation_mandate
        WHERE granting_party_id = $1 AND representative_party_id = $2
          AND revocation_status = 'NOT_REVOKED'
          AND framework_association_ids && $3::uuid[]
          AND permitted_actions && $4::text[]
          AND tstzrange(valid_from, valid_until, '[)') && tstzrange($5::timestamptz, $6::timestamptz, '[)')
        ORDER BY created_at
        LIMIT 1`,
      [m.grantingPartyId, m.representativePartyId, m.frameworkAssociationIds, m.permittedActions, m.validFrom, m.validUntil],
    ),
  );
  return rows[0]?.mandate_id ?? null;
}

export interface NewMandate {
  readonly request: ScsMandateRegistrationRequest;
  readonly schemaVersion: string;
  readonly createdBy: ActorReference;
}

export interface InsertedMandate {
  readonly mandateId: string;
  /** Transaction timestamp: createdAt = decidedAt. */
  readonly createdAt: string;
}

/**
 * Insert the ScsRepresentationMandate row: CLAIMED_UNVERIFIED, NOT_REVOKED,
 * every authorityBoundary flag true (column defaults, checked by the
 * database). The database generates mandateId.
 */
export async function insertMandate(tx: Tx, n: NewMandate): Promise<InsertedMandate> {
  const r = n.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ mandate_id: string; created_at: Date }>(
      `INSERT INTO scs.representation_mandate (
         schema_version, granting_party_id, representative_party_id, permitted_actions, other_action_description,
         framework_association_ids, commodity_scope, geographic_scope, valid_from, valid_until,
         mandate_evidence_ids, verification_status, revocation_status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'CLAIMED_UNVERIFIED', 'NOT_REVOKED', $12)
       RETURNING mandate_id, created_at`,
      [
        n.schemaVersion,
        r.grantingPartyId,
        r.representativePartyId,
        r.permittedActions,
        r.otherActionDescription ?? null,
        r.frameworkAssociationIds,
        r.commodityScope,
        r.geographicScope,
        r.validFrom,
        r.validUntil,
        r.mandateEvidenceIds,
        JSON.stringify(n.createdBy),
      ],
    ),
  );
  const row = rows[0]!;
  return { mandateId: row.mandate_id, createdAt: row.created_at.toISOString() };
}

// ── Role claim registration ──────────────────────────────────────────────────

/** Serialise role claims for one party, role and framework until the transaction ends. */
export async function lockRoleClaimKey(tx: Tx, partyId: string, claimedRole: string, frameworkId: string): Promise<void> {
  const lockName = ["scs-cap-02-role-claim", partyId, claimedRole, frameworkId].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/**
 * A role claim for the same party, role and framework, not SUPERSEDED or
 * EXPIRED, whose validity period overlaps [validFrom, validUntil), if any.
 * Contract gap (recorded in 211be95): the rule names no status; like
 * relationships (ACTIVE only) and mandates (NOT_REVOKED only), a superseded
 * or expired claim never blocks.
 */
export async function findConflictingRoleClaim(
  tx: Tx,
  c: { readonly partyId: string; readonly claimedRole: string; readonly frameworkId: string; readonly validFrom: string | null; readonly validUntil: string | null },
): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ role_claim_id: string }>(
      `SELECT role_claim_id
         FROM scs.party_role_claim
        WHERE party_id = $1 AND claimed_role = $2 AND framework_association_id = $3
          AND verification_status NOT IN ('SUPERSEDED', 'EXPIRED')
          AND tstzrange(valid_from, valid_until, '[)') && tstzrange($4::timestamptz, $5::timestamptz, '[)')
        ORDER BY created_at
        LIMIT 1`,
      [c.partyId, c.claimedRole, c.frameworkId, c.validFrom, c.validUntil],
    ),
  );
  return rows[0]?.role_claim_id ?? null;
}

export interface NewRoleClaim {
  readonly party: PartyForEvidence;
  readonly framework: FrameworkForAssociation;
  readonly request: ScsRoleClaimRequest;
  readonly claimedBy: ActorReference;
}

export interface InsertedRoleClaim {
  readonly roleClaimId: string;
  /** Transaction timestamp: claimedAt = decidedAt. */
  readonly claimedAt: string;
}

/**
 * Insert the ScsPartyRoleClaim row: the party's current version, the
 * framework's regulationVersion as frameworkVersion, CLAIMED_UNVERIFIED. The
 * database generates roleClaimId.
 */
export async function insertRoleClaim(tx: Tx, n: NewRoleClaim): Promise<InsertedRoleClaim> {
  const r = n.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ role_claim_id: string; claimed_at: Date }>(
      `INSERT INTO scs.party_role_claim (
         party_id, party_version, claimed_role, other_role_description, framework_association_id, framework_version,
         commodity_scope, geographic_scope, role_evidence_ids, verification_status, valid_from, valid_until,
         limitations, claimed_at, claimed_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CLAIMED_UNVERIFIED', $10, $11, $12, now(), $13)
       RETURNING role_claim_id, claimed_at`,
      [
        n.party.partyId,
        n.party.partyVersion,
        r.claimedRole,
        r.otherRoleDescription ?? null,
        n.framework.frameworkId,
        n.framework.regulationVersion,
        r.commodityScope,
        r.geographicScope,
        r.roleEvidenceIds,
        r.validFrom ?? null,
        r.validUntil ?? null,
        r.limitations,
        JSON.stringify(n.claimedBy),
      ],
    ),
  );
  const row = rows[0]!;
  return { roleClaimId: row.role_claim_id, claimedAt: row.claimed_at.toISOString() };
}

// ── Verification assessment recording ────────────────────────────────────────

/** The transaction's timestamp (now()): the instant recorded_at will hold, read from the database clock. */
export async function transactionTime(tx: Tx): Promise<Date> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () => tx.query<{ now: Date }>("SELECT now() AS now"));
  return rows[0]!.now;
}

export interface PartyForVerification extends PartyForEvidence {
  /** The party's registrant, who may not verify it. */
  readonly registeredBy: ActorReference;
}

/** The party with its registrant, or null if no party has this id. */
export async function findPartyForVerification(tx: Tx, partyId: string): Promise<PartyForVerification | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string; party_version: number; registration_status: string; registered_by: ActorReference }>(
      `SELECT party_id, party_version, registration_status, registered_by
         FROM scs.party_identity WHERE party_id = $1::uuid`,
      [partyId],
    ),
  );
  const r = rows[0];
  return r === undefined
    ? null
    : { partyId: r.party_id, partyVersion: r.party_version, registrationStatus: r.registration_status, registeredBy: r.registered_by };
}

/** The assessment's party, or null if no assessment has this id. */
export async function findAssessmentParty(tx: Tx, assessmentId: string): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ party_id: string }>(`SELECT party_id FROM scs.party_verification_assessment WHERE assessment_id = $1`, [assessmentId]),
  );
  return rows[0]?.party_id ?? null;
}

/** Serialise supersessions of one assessment until the transaction ends. */
export async function lockAssessmentSupersession(tx: Tx, assessmentId: string): Promise<void> {
  const lockName = ["scs-cap-02-supersede", assessmentId].join("\u001f");
  await withDatabaseErrors(CAPABILITY_ID, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/** The assessment that already supersedes `assessmentId`, if any. */
export async function findSupersedingAssessment(tx: Tx, assessmentId: string): Promise<string | null> {
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ assessment_id: string }>(
      `SELECT assessment_id FROM scs.party_verification_assessment WHERE supersedes_assessment_id = $1`,
      [assessmentId],
    ),
  );
  return rows[0]?.assessment_id ?? null;
}

export interface NewAssessment {
  readonly party: PartyForEvidence;
  readonly request: ScsVerificationAssessmentRequest;
  readonly recordedBy: ActorReference;
}

export interface InsertedAssessment {
  readonly assessmentId: string;
  /** Transaction timestamp: recordedAt = decidedAt. */
  readonly recordedAt: string;
}

/**
 * Insert the ScsPartyVerificationAssessment row at the party's current
 * version; every authorityBoundary flag true (column defaults, checked by the
 * database). The database generates assessmentId. Nothing else is touched:
 * not the party, not the superseded assessment.
 */
export async function insertAssessment(tx: Tx, n: NewAssessment): Promise<InsertedAssessment> {
  const r = n.request;
  const { rows } = await withDatabaseErrors(CAPABILITY_ID, () =>
    tx.query<{ assessment_id: string; recorded_at: Date }>(
      `INSERT INTO scs.party_verification_assessment (
         party_id, party_version, verification_status,
         scope_description, scope_jurisdiction_code, scope_verified_attributes, scope_excluded_from_verification,
         verifying_authority_id, verifying_authority_name, verifying_authority_basis, verifying_authority_jurisdiction_code,
         verified_at, expires_at, evidence_ids, limitations, recorded_by, recorded_at, supersedes_assessment_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), $17)
       RETURNING assessment_id, recorded_at`,
      [
        n.party.partyId,
        n.party.partyVersion,
        r.verificationStatus,
        r.verificationScope.scopeDescription,
        r.verificationScope.jurisdictionCode,
        r.verificationScope.verifiedAttributes,
        r.verificationScope.excludedFromVerification,
        r.verifyingAuthority.authorityId,
        r.verifyingAuthority.authorityName,
        r.verifyingAuthority.authorityBasis,
        r.verifyingAuthority.jurisdictionCode,
        r.verifiedAt,
        r.expiresAt ?? null,
        r.evidenceIds,
        r.limitations,
        JSON.stringify(n.recordedBy),
        r.supersedesAssessmentId ?? null,
      ],
    ),
  );
  const row = rows[0]!;
  return { assessmentId: row.assessment_id, recordedAt: row.recorded_at.toISOString() };
}
