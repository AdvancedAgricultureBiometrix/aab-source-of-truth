// SCS-CAP-02 actor–party links: every SQL statement the link operations run
// (migration 021: scs.actor_party_link, scs.actor_party_link_evidence,
// scs.actor_party_link_status). All functions take the request's transaction.
//
// A link record is rebuilt from its row exactly as it was digested: its
// actor, subject, relation, validity, evidence and supersession are the
// signed statement's own values (the database refuses a row that differs),
// createdAt is stored at millisecond precision, and createdBy is stored as
// recorded. So the digest recomputes from what is read.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { LinkHistory } from "../../platform/actor-subject-links/links.js";
import type { ActorSubjectLink, ActorSubjectLinkActor, ActorSubjectLinkStatement, ActorSubjectLinkStatusRecord } from "../../types/platform.js";
import type { ActorReference } from "../../types/shared.js";
import { CAPABILITY_ID } from "./errors.js";

const db = <T>(fn: () => Promise<T>) => withDatabaseErrors(CAPABILITY_ID, fn);

/** A link as recorded, its status records in recordedAt order, and its successor if any. */
export interface StoredLink extends LinkHistory {
  readonly link: ActorSubjectLink;
  readonly statusRecords: readonly ActorSubjectLinkStatusRecord[];
}

/**
 * Serialise every write to the links of one actor and one party — creation,
 * supersession and status records — until the transaction ends. So "at most
 * one active link" and the state a status record acts on cannot change
 * underneath a request.
 */
export async function lockActorParty(tx: Tx, actor: ActorSubjectLinkActor, partyId: string): Promise<void> {
  const lockName = ["scs-cap-02-actor-party-link", actor.issuer.issuerType, actor.issuer.countryCode ?? "", actor.actorId, partyId].join("\u001f");
  await db(() => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

/** The database clock now, at millisecond precision: what createdAt and recordedAt hold. Read after the lock is held. */
export async function clockNow(tx: Tx): Promise<Date> {
  const { rows } = await db(() => tx.query<{ t: Date }>("SELECT date_trunc('milliseconds', clock_timestamp()) AS t"));
  return rows[0]!.t;
}

/** Whether validUntil is within 12 months of validFrom, by the database's own interval arithmetic (the check migration 021 enforces). */
export async function withinTwelveMonths(tx: Tx, validFrom: string, validUntil: string): Promise<boolean> {
  const { rows } = await db(() => tx.query<{ ok: boolean }>("SELECT $2::timestamptz <= $1::timestamptz + interval '12 months' AS ok", [validFrom, validUntil]));
  return rows[0]!.ok;
}

export interface PartyForLink {
  readonly partyId: string;
  readonly partyType: string;
  readonly registrationStatus: string;
}

export async function findPartyForLink(tx: Tx, partyId: string): Promise<PartyForLink | null> {
  const { rows } = await db(() =>
    tx.query<{ party_id: string; party_type: string; registration_status: string }>(
      `SELECT party_id, party_type, registration_status FROM scs.party_identity WHERE party_id = $1::uuid`,
      [partyId],
    ),
  );
  const r = rows[0];
  return r === undefined ? null : { partyId: r.party_id, partyType: r.party_type, registrationStatus: r.registration_status };
}

/** Which of `sha256s` are stored objects (AAB-PLATFORM-01). */
export async function findStoredObjects(tx: Tx, sha256s: readonly string[]): Promise<Set<string>> {
  const { rows } = await db(() =>
    tx.query<{ content_sha256: string }>(`SELECT content_sha256 FROM scs.evidence_object WHERE content_sha256 = ANY($1::text[])`, [sha256s]),
  );
  return new Set(rows.map((r) => r.content_sha256));
}

/**
 * Who recorded a verification assessment of any mandate whose representative
 * party is `partyId` (SCS-CAP-02, "Creating role": such an actor may not
 * create a link to that party).
 */
export async function findMandateVerifiersOfRepresentative(tx: Tx, partyId: string): Promise<Array<{ assessmentId: string; mandateId: string; recordedBy: ActorReference }>> {
  const { rows } = await db(() =>
    tx.query<{ assessment_id: string; mandate_id: string; recorded_by: ActorReference }>(
      `SELECT a.assessment_id, a.mandate_id, a.recorded_by
         FROM scs.mandate_verification_assessment a
         JOIN scs.representation_mandate m ON m.mandate_id = a.mandate_id
        WHERE m.representative_party_id = $1::uuid
        ORDER BY a.recorded_at, a.assessment_id`,
      [partyId],
    ),
  );
  return rows.map((r) => ({ assessmentId: r.assessment_id, mandateId: r.mandate_id, recordedBy: r.recorded_by }));
}

// ── Reading links ────────────────────────────────────────────────────────────

interface LinkRow {
  link_id: string;
  schema_version: string;
  created_at: Date;
  created_by: ActorReference;
  link_statement: ActorSubjectLinkStatement;
  statement_signature: string;
  link_digest: string;
  successor_id: string | null;
  successor_created_at: Date | null;
}

interface StatusRow {
  status_record_id: string;
  link_id: string;
  schema_version: string;
  status_statement: ActorSubjectLinkStatusRecord["statusStatement"];
  statement_signature: string;
  writer_capacity: ActorSubjectLinkStatusRecord["writerCapacity"];
  recorded_at: Date;
  written_by: ActorReference;
  record_digest: string;
}

const LINK_COLUMNS = `l.link_id, l.schema_version, l.created_at, l.created_by, l.link_statement, l.statement_signature, l.link_digest,
       s.link_id AS successor_id, s.created_at AS successor_created_at`;
const LINK_FROM = `scs.actor_party_link l LEFT JOIN scs.actor_party_link s ON s.supersedes_link_id = l.link_id`;

function toLink(r: LinkRow): ActorSubjectLink {
  const s = r.link_statement;
  return {
    linkId: r.link_id,
    schemaVersion: r.schema_version as "1",
    actor: s.actor,
    subject: s.subject,
    relation: s.relation,
    validFrom: s.validFrom,
    validUntil: s.validUntil,
    authorisationEvidence: s.authorisationEvidence,
    ...(s.supersedesLinkId === undefined ? {} : { supersedesLinkId: s.supersedesLinkId }),
    createdAt: r.created_at.toISOString(),
    createdBy: r.created_by,
    linkStatement: s,
    statementSignature: r.statement_signature,
    linkDigest: r.link_digest,
  };
}

function toStatusRecord(r: StatusRow): ActorSubjectLinkStatusRecord {
  return {
    statusRecordId: r.status_record_id,
    linkId: r.link_id,
    schemaVersion: r.schema_version as "1",
    statusStatement: r.status_statement,
    statementSignature: r.statement_signature,
    writerCapacity: r.writer_capacity,
    recordedAt: r.recorded_at.toISOString(),
    writtenBy: r.written_by,
    recordDigest: r.record_digest,
  };
}

async function withHistory(tx: Tx, rows: readonly LinkRow[]): Promise<StoredLink[]> {
  if (rows.length === 0) return [];
  const { rows: statusRows } = await db(() =>
    tx.query<StatusRow>(
      `SELECT status_record_id, link_id, schema_version, status_statement, statement_signature, writer_capacity, recorded_at, written_by, record_digest
         FROM scs.actor_party_link_status WHERE link_id = ANY($1::uuid[]) ORDER BY recorded_at, status_record_id`,
      [rows.map((r) => r.link_id)],
    ),
  );
  return rows.map((r) => ({
    link: toLink(r),
    statusRecords: statusRows.filter((s) => s.link_id === r.link_id).map(toStatusRecord),
    ...(r.successor_id === null ? {} : { successor: { linkId: r.successor_id, createdAt: r.successor_created_at!.toISOString() } }),
  }));
}

/** One link as recorded, with its history; null if no link has this id. */
export async function findLink(tx: Tx, linkId: string): Promise<StoredLink | null> {
  const { rows } = await db(() => tx.query<LinkRow>(`SELECT ${LINK_COLUMNS} FROM ${LINK_FROM} WHERE l.link_id = $1::uuid`, [linkId]));
  return (await withHistory(tx, rows))[0] ?? null;
}

/** Every link, in any state, for this actor (issuer, actorId) and party, oldest first. */
export async function findLinksForActorParty(tx: Tx, actor: ActorSubjectLinkActor, partyId: string): Promise<StoredLink[]> {
  const { rows } = await db(() =>
    tx.query<LinkRow>(
      `SELECT ${LINK_COLUMNS} FROM ${LINK_FROM}
        WHERE l.actor_issuer_type = $1 AND l.actor_issuer_country_code IS NOT DISTINCT FROM $2 AND l.actor_id = $3 AND l.party_id = $4::uuid
        ORDER BY l.created_at, l.link_id`,
      [actor.issuer.issuerType, actor.issuer.countryCode ?? null, actor.actorId, partyId],
    ),
  );
  return withHistory(tx, rows);
}

// ── Writing ──────────────────────────────────────────────────────────────────

/** Inserts the link and one evidence row per statement item. The evidence is checked complete at commit (migration 021). */
export async function insertLink(tx: Tx, link: ActorSubjectLink): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.actor_party_link (link_id, schema_version, actor_issuer_type, actor_issuer_country_code, actor_id,
         subject_domain, subject_type, party_id, relation, valid_from, valid_until, supersedes_link_id,
         link_statement, statement_signature, created_at, created_by, link_digest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        link.linkId, link.schemaVersion, link.actor.issuer.issuerType, link.actor.issuer.countryCode ?? null, link.actor.actorId,
        link.subject.domain, link.subject.subjectType, link.subject.subjectId, link.relation, link.validFrom, link.validUntil,
        link.supersedesLinkId ?? null, JSON.stringify(link.linkStatement), link.statementSignature, link.createdAt,
        JSON.stringify(link.createdBy), link.linkDigest,
      ],
    ),
  );
  for (const e of link.authorisationEvidence) {
    await db(() =>
      tx.query(`INSERT INTO scs.actor_party_link_evidence (link_id, evidence_object_sha256, description) VALUES ($1, $2, $3)`, [link.linkId, e.evidenceObjectSha256, e.description]),
    );
  }
}

export async function insertStatusRecord(tx: Tx, r: ActorSubjectLinkStatusRecord): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.actor_party_link_status (status_record_id, link_id, schema_version, action, reason, writer_capacity,
         status_statement, statement_signature, recorded_at, written_by, record_digest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        r.statusRecordId, r.linkId, r.schemaVersion, r.statusStatement.action, r.statusStatement.reason, r.writerCapacity,
        JSON.stringify(r.statusStatement), r.statementSignature, r.recordedAt, JSON.stringify(r.writtenBy), r.recordDigest,
      ],
    ),
  );
}
