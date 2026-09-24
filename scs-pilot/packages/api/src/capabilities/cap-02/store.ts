// SCS-CAP-02 persistence — every SQL statement the capability runs, and
// nothing else. All functions take the request's transaction; they never open
// their own. Database errors are mapped to canonical failures
// (foundation/db-errors.ts).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ScsPartyRegistrationRequest } from "../../types/cap-02.js";
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
