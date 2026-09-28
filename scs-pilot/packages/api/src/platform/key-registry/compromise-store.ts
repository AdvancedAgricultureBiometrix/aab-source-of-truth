// AAB-PLATFORM-09 sections 8 and 9: the compromise records' writes (migration
// 023: scs.signing_key_compromise and its evidence, scs.key_compromise_notice,
// scs.key_compromise_assessment), and finding which key signed a record and
// when the server accepted it. All functions take the request's transaction.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import { recordDigest } from "../../foundation/signatures.js";
import type { KeyAssessmentStatement, KeyCompromiseNotice, KeyCompromiseStatement } from "../../types/key-registry.js";
import type { ActorReferenceV2 } from "../../types/shared.js";
import { CAPABILITY_ID } from "./errors.js";
import type { RegistryIssuer } from "./registry.js";
import type { SignedRecordTable } from "./store.js";

const db = <T>(fn: () => Promise<T>) => withDatabaseErrors(CAPABILITY_ID, fn);
const issuerOf = (type: RegistryIssuer["issuerType"], country: string | null): RegistryIssuer =>
  country === null ? { issuerType: type } : { issuerType: type, countryCode: country };

// ── Compromise records ───────────────────────────────────────────────────────

export interface CompromiseRecord {
  readonly compromiseId: string;
  readonly keyId: string;
  readonly suspectedExposureFrom: string;
  readonly exposureBasis: string;
  readonly evidence: KeyCompromiseStatement["evidence"];
  readonly declaredBy: ActorReferenceV2;
  readonly declarationSigned: boolean;
  readonly declarationStatement?: KeyCompromiseStatement;
  readonly statementSignature?: string;
  readonly signerKeyId?: string;
  readonly recordedAt: string;
  readonly receiptId: string;
}

export const compromiseDigestOf = (c: CompromiseRecord): string => recordDigest(c);

export async function insertCompromise(tx: Tx, c: CompromiseRecord, compromiseDigest: string): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.signing_key_compromise
         (compromise_id, key_id, suspected_exposure_from, exposure_basis, declared_by, declaration_signed, declaration_statement,
          statement_signature, signer_key_id, recorded_at, compromise_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        c.compromiseId, c.keyId, c.suspectedExposureFrom, c.exposureBasis, JSON.stringify(c.declaredBy), c.declarationSigned,
        c.declarationStatement === undefined ? null : JSON.stringify(c.declarationStatement), c.statementSignature ?? null,
        c.signerKeyId ?? null, c.recordedAt, compromiseDigest, c.receiptId,
      ],
    ),
  );
  for (const e of c.evidence) {
    await db(() =>
      tx.query(
        `INSERT INTO scs.signing_key_compromise_evidence (compromise_id, evidence_digest, description) VALUES ($1, $2, $3)`,
        [c.compromiseId, e.digest, e.description],
      ),
    );
  }
}

// ── Notices ──────────────────────────────────────────────────────────────────

export interface NoticeRecord {
  readonly noticeId: string;
  readonly notice: KeyCompromiseNotice;
  readonly attestation: string;
  readonly recordedBy: ActorReferenceV2;
  readonly recordedAt: string;
  readonly receiptId: string;
}

export const noticeDigestOf = (n: NoticeRecord): string => recordDigest(n);

export async function insertNotice(tx: Tx, n: NoticeRecord, noticeDigest: string): Promise<void> {
  const i = n.notice.issuer;
  await db(() =>
    tx.query(
      `INSERT INTO scs.key_compromise_notice
         (notice_id, key_issuer_type, key_issuer_country_code, actor_id, key_id, suspected_exposure_from, notice, attestation,
          attestation_key_id, recorded_by, recorded_at, notice_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        n.noticeId, i.issuerType, i.countryCode ?? null, n.notice.actorId, n.notice.keyId, n.notice.suspectedExposureFrom,
        JSON.stringify(n.notice), n.attestation, n.notice.attestationKeyId, JSON.stringify(n.recordedBy), n.recordedAt, noticeDigest, n.receiptId,
      ],
    ),
  );
}

// ── Assessments ──────────────────────────────────────────────────────────────

export interface AssessmentRecord {
  readonly assessmentId: string;
  readonly compromiseId?: string;
  readonly noticeId?: string;
  readonly recordTable: SignedRecordTable;
  readonly recordId: string;
  readonly keyHolder: { readonly issuer: RegistryIssuer; readonly actorId: string };
  readonly outcome: "AFFIRM" | "REPUDIATE";
  readonly reasons: string;
  readonly evidenceConsidered: KeyAssessmentStatement["evidenceConsidered"];
  readonly assessedBy: ActorReferenceV2;
  readonly assessmentStatement: KeyAssessmentStatement;
  readonly statementSignature: string;
  readonly signerKeyId: string;
  readonly assessedAt: string;
  readonly receiptId: string;
}

export const assessmentDigestOf = (a: AssessmentRecord): string => recordDigest(a);

export async function insertAssessment(tx: Tx, a: AssessmentRecord, assessmentDigest: string): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.key_compromise_assessment
         (assessment_id, compromise_id, notice_id, record_table, record_id, key_holder_issuer_type, key_holder_issuer_country_code,
          key_holder_actor_id, outcome, reasons, evidence_considered, assessed_by, assessment_statement, statement_signature,
          signer_key_id, assessed_at, assessment_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        a.assessmentId, a.compromiseId ?? null, a.noticeId ?? null, a.recordTable, a.recordId, a.keyHolder.issuer.issuerType,
        a.keyHolder.issuer.countryCode ?? null, a.keyHolder.actorId, a.outcome, a.reasons, JSON.stringify(a.evidenceConsidered),
        JSON.stringify(a.assessedBy), JSON.stringify(a.assessmentStatement), a.statementSignature, a.signerKeyId, a.assessedAt,
        assessmentDigest, a.receiptId,
      ],
    ),
  );
}

export async function assessmentExists(tx: Tx, recordTable: SignedRecordTable, recordId: string): Promise<boolean> {
  const { rows } = await db(() => tx.query("SELECT 1 FROM scs.key_compromise_assessment WHERE record_table = $1 AND record_id = $2::uuid", [recordTable, recordId]));
  return rows.length > 0;
}

/** This registry's compromise records for a key, earliest first. */
export async function compromisesOf(tx: Tx, keyId: string): Promise<Array<{ compromiseId: string }>> {
  const { rows } = await db(() =>
    tx.query<{ compromise_id: string }>("SELECT compromise_id FROM scs.signing_key_compromise WHERE key_id = $1::uuid ORDER BY recorded_at, compromise_id", [keyId]),
  );
  return rows.map((r) => ({ compromiseId: r.compromise_id }));
}

/** Another issuer's notices for a key, earliest first. */
export async function noticesOf(tx: Tx, issuer: RegistryIssuer, keyId: string): Promise<Array<{ noticeId: string }>> {
  const { rows } = await db(() =>
    tx.query<{ notice_id: string }>(
      `SELECT notice_id FROM scs.key_compromise_notice
        WHERE key_issuer_type = $1 AND key_issuer_country_code IS NOT DISTINCT FROM $2 AND key_id = $3 ORDER BY recorded_at, notice_id`,
      [issuer.issuerType, issuer.countryCode ?? null, keyId],
    ),
  );
  return rows.map((r) => ({ noticeId: r.notice_id }));
}

// ── Which key signed a record ────────────────────────────────────────────────

/** A signature on a record: who signed it, with which key, and when the server accepted it. */
export interface RecordSignature {
  readonly signer: { readonly issuer: RegistryIssuer; readonly actorId: string };
  /** The key the statement names; undefined for a statement that names none (a version 1 link statement). */
  readonly signingKeyId: string | undefined;
  /** Whether the key is another issuer's, known from the evidence stored with this record. */
  readonly foreign: boolean;
  readonly acceptedAt: string;
}

const actorFrom = (ref: { actorId: string; issuer: { issuerType: RegistryIssuer["issuerType"]; countryCode?: string } }) => ({
  issuer: issuerOf(ref.issuer.issuerType, ref.issuer.countryCode ?? null),
  actorId: ref.actorId,
});

/**
 * Every signature on a record, as stored. A record may carry more than one:
 * a country's bootstrap ceremony is signed by its holder and co-signed by the
 * Platform Owner. Empty when there is no such record.
 */
export async function signaturesOf(tx: Tx, table: SignedRecordTable, recordId: string): Promise<RecordSignature[]> {
  type Row = Record<string, unknown>;
  const one = async (sql: string): Promise<Row | undefined> => (await db(() => tx.query<Row>(sql, [recordId]))).rows[0];
  const iso = (d: unknown) => (d as Date).toISOString();
  switch (table) {
    case "signing_key_registration": {
      const r = await one("SELECT registration_authority, registration_signer_key_id, registered_at FROM scs.signing_key_registration WHERE key_id = $1::uuid");
      return r === undefined ? [] : [{ signer: actorFrom(r["registration_authority"] as never), signingKeyId: r["registration_signer_key_id"] as string, foreign: false, acceptedAt: iso(r["registered_at"]) }];
    }
    case "signing_key_event": {
      const r = await one("SELECT recorded_by, signer_key_id, recorded_at FROM scs.signing_key_event WHERE event_id = $1::uuid");
      return r === undefined ? [] : [{ signer: actorFrom(r["recorded_by"] as never), signingKeyId: r["signer_key_id"] as string, foreign: false, acceptedAt: iso(r["recorded_at"]) }];
    }
    case "signing_key_compromise": {
      const r = await one("SELECT declared_by, signer_key_id, recorded_at FROM scs.signing_key_compromise WHERE compromise_id = $1::uuid AND declaration_signed");
      return r === undefined ? [] : [{ signer: actorFrom(r["declared_by"] as never), signingKeyId: r["signer_key_id"] as string, foreign: false, acceptedAt: iso(r["recorded_at"]) }];
    }
    case "key_compromise_assessment": {
      const r = await one("SELECT assessed_by, signer_key_id, assessed_at FROM scs.key_compromise_assessment WHERE assessment_id = $1::uuid");
      return r === undefined ? [] : [{ signer: actorFrom(r["assessed_by"] as never), signingKeyId: r["signer_key_id"] as string, foreign: false, acceptedAt: iso(r["assessed_at"]) }];
    }
    case "key_bootstrap_ceremony": {
      const r = await one("SELECT holder, first_key_id, cosigner, cosigner_key_id, recorded_at FROM scs.key_bootstrap_ceremony WHERE ceremony_id = $1::uuid");
      if (r === undefined) return [];
      const at = iso(r["recorded_at"]);
      const own: RecordSignature = { signer: actorFrom(r["holder"] as never), signingKeyId: r["first_key_id"] as string, foreign: false, acceptedAt: at };
      return r["cosigner"] === null ? [own] : [own, { signer: actorFrom(r["cosigner"] as never), signingKeyId: r["cosigner_key_id"] as string, foreign: true, acceptedAt: at }];
    }
    case "actor_party_link": {
      const r = await one("SELECT created_by, link_statement ->> 'signingKeyId' AS signing_key_id, created_at FROM scs.actor_party_link WHERE link_id = $1::uuid");
      return r === undefined ? [] : [{ signer: actorFrom(r["created_by"] as never), signingKeyId: (r["signing_key_id"] as string | null) ?? undefined, foreign: false, acceptedAt: iso(r["created_at"]) }];
    }
    case "actor_party_link_status": {
      const r = await one("SELECT written_by, status_statement ->> 'signingKeyId' AS signing_key_id, recorded_at FROM scs.actor_party_link_status WHERE status_record_id = $1::uuid");
      return r === undefined ? [] : [{ signer: actorFrom(r["written_by"] as never), signingKeyId: (r["signing_key_id"] as string | null) ?? undefined, foreign: false, acceptedAt: iso(r["recorded_at"]) }];
    }
  }
}
