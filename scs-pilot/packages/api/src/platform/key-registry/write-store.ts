// AAB-PLATFORM-09 Governed Public-Key Registry: every write the registry's
// endpoints make (migration 023), and the locks and clock they use. All
// functions take the request's transaction.
//
// Each record is written exactly as it is digested: its statements as signed,
// its times at millisecond precision, its actors as recorded. So the digest
// recomputes from what is read.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import { recordDigest } from "../../foundation/signatures.js";
import type {
  KeyBootstrapCeremonyStatement,
  KeyEventStatement,
  KeyPossessionStatement,
  KeyRegistrationStatement,
  KeyVerificationEvidence,
} from "../../types/key-registry.js";
import type { ActorReferenceV2 } from "../../types/shared.js";
import { CAPABILITY_ID } from "./errors.js";
import type { RegistryIssuer } from "./registry.js";
import type { SignedRecordTable } from "./store.js";

const db = <T>(fn: () => Promise<T>) => withDatabaseErrors(CAPABILITY_ID, fn);
const issuerCols = (i: RegistryIssuer) => [i.issuerType, i.countryCode ?? null] as const;

// ── Locks and the clock ──────────────────────────────────────────────────────

/** Serialise every write to one registry: bootstraps and challenges, so "the registry is empty" cannot change underneath a request. */
export async function lockRegistry(tx: Tx, issuer: RegistryIssuer): Promise<void> {
  const name = ["aab-platform-09-registry", issuer.issuerType, issuer.countryCode ?? ""].join("\u001f");
  await db(() => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [name]));
}

/** Serialise every write to one actor's keys: registrations and events, so "one active key per actor" cannot change underneath a request. */
export async function lockActorKeys(tx: Tx, issuer: RegistryIssuer, actorId: string): Promise<void> {
  const name = ["aab-platform-09-actor", issuer.issuerType, issuer.countryCode ?? "", actorId].join("\u001f");
  await db(() => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [name]));
}

/** The database clock now, at millisecond precision, read after the lock: acceptedAt (AAB-PLATFORM-09, second amendment). */
export async function clockNow(tx: Tx): Promise<Date> {
  const { rows } = await db(() => tx.query<{ t: Date }>("SELECT date_trunc('milliseconds', clock_timestamp()) AS t"));
  return rows[0]!.t;
}

export async function registryStarted(tx: Tx, issuer: RegistryIssuer): Promise<boolean> {
  const { rows } = await db(() => tx.query<{ started: boolean }>("SELECT scs.key_registry_started($1, $2) AS started", [...issuerCols(issuer)]));
  return rows[0]!.started;
}

// ── Challenges ───────────────────────────────────────────────────────────────

export interface StoredChallenge {
  readonly challengeId: string;
  readonly purpose: "BOOTSTRAP" | "REGISTRATION";
  readonly issuer: RegistryIssuer;
  readonly actorId: string;
  readonly keyId: string;
  readonly nonce: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  /** Whether a registration has consumed it. */
  readonly used: boolean;
}

export async function insertChallenge(tx: Tx, c: Omit<StoredChallenge, "used">, requestedBy: ActorReferenceV2): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.key_registration_challenge
         (challenge_id, purpose, issuer_type, issuer_country_code, actor_id, key_id, nonce, requested_by, issued_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [c.challengeId, c.purpose, ...issuerCols(c.issuer), c.actorId, c.keyId, c.nonce, JSON.stringify(requestedBy), c.issuedAt, c.expiresAt],
    ),
  );
}

export async function findChallenge(tx: Tx, challengeId: string): Promise<StoredChallenge | null> {
  const { rows } = await db(() =>
    tx.query<{
      challenge_id: string; purpose: "BOOTSTRAP" | "REGISTRATION"; issuer_type: RegistryIssuer["issuerType"]; issuer_country_code: string | null;
      actor_id: string; key_id: string; nonce: string; issued_at: Date; expires_at: Date; used: boolean;
    }>(
      `SELECT c.*, EXISTS (SELECT 1 FROM scs.signing_key_registration k WHERE k.challenge_id = c.challenge_id) AS used
         FROM scs.key_registration_challenge c WHERE c.challenge_id = $1::uuid`,
      [challengeId],
    ),
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    challengeId: r.challenge_id, purpose: r.purpose,
    issuer: r.issuer_country_code === null ? { issuerType: r.issuer_type } : { issuerType: r.issuer_type, countryCode: r.issuer_country_code },
    actorId: r.actor_id, keyId: r.key_id, nonce: r.nonce, issuedAt: r.issued_at, expiresAt: r.expires_at, used: r.used,
  };
}

// ── Registrations ────────────────────────────────────────────────────────────

/** A key registration exactly as stored (migration 023), with registrationDigest over every other field. */
export interface RegistrationRecord {
  readonly keyId: string;
  readonly issuer: RegistryIssuer;
  readonly actorId: string;
  readonly algorithm: "Ed25519";
  readonly publicKey: string;
  readonly publicKeyDigest: string;
  readonly activeFrom: string;
  readonly registeredAt: string;
  readonly challengeId: string;
  readonly possessionStatement: KeyPossessionStatement;
  readonly possessionSignature: string;
  readonly registrationAuthority: ActorReferenceV2;
  readonly registrationStatement: KeyRegistrationStatement;
  readonly registrationSignature: string;
  readonly registrationSignerKeyId: string;
  readonly replacesKeyId?: string;
  readonly bootstrapCeremonyId?: string;
  readonly receiptId: string;
}

export const registrationDigestOf = (r: RegistrationRecord): string => recordDigest(r);

export async function publicKeyRegistered(tx: Tx, publicKeyDigest: string): Promise<boolean> {
  const { rows } = await db(() => tx.query("SELECT 1 FROM scs.signing_key_registration WHERE public_key_digest = $1", [publicKeyDigest]));
  return rows.length > 0;
}

export async function insertRegistration(tx: Tx, r: RegistrationRecord, registrationDigest: string): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.signing_key_registration
         (key_id, issuer_type, issuer_country_code, actor_id, algorithm, public_key, public_key_digest, active_from, registered_at,
          challenge_id, possession_statement, possession_signature, registration_authority, registration_statement,
          registration_signature, registration_signer_key_id, replaces_key_id, bootstrap_ceremony_id, registration_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        r.keyId, ...issuerCols(r.issuer), r.actorId, r.algorithm, r.publicKey, r.publicKeyDigest, r.activeFrom, r.registeredAt,
        r.challengeId, JSON.stringify(r.possessionStatement), r.possessionSignature, JSON.stringify(r.registrationAuthority),
        JSON.stringify(r.registrationStatement), r.registrationSignature, r.registrationSignerKeyId, r.replacesKeyId ?? null,
        r.bootstrapCeremonyId ?? null, registrationDigest, r.receiptId,
      ],
    ),
  );
}

// ── Bootstrap ceremonies ─────────────────────────────────────────────────────

export interface CeremonyCosigner {
  readonly actorId: string;
  readonly issuer: RegistryIssuer;
  readonly actorType: "HUMAN";
  readonly accountableName: string;
}

export interface CeremonyRecord {
  readonly ceremonyId: string;
  readonly registry: RegistryIssuer;
  readonly firstKeyId: string;
  /** The ceremony statement, as signed: the record the ceremony_record column holds. */
  readonly ceremonyStatement: KeyBootstrapCeremonyStatement;
  readonly holder: ActorReferenceV2;
  readonly holderSignature: string;
  /** The Platform Owner, as the ceremony statement they signed names them: not an authenticated reference. */
  readonly cosigner?: CeremonyCosigner;
  readonly cosignerKeyId?: string;
  readonly cosignature?: string;
  readonly recordedAt: string;
  readonly receiptId: string;
}

export const ceremonyDigestOf = (c: CeremonyRecord): string => recordDigest(c);

export async function insertCeremony(tx: Tx, c: CeremonyRecord, ceremonyDigest: string): Promise<void> {
  const declared = c.ceremonyStatement.declaredAttestationKey;
  await db(() =>
    tx.query(
      `INSERT INTO scs.key_bootstrap_ceremony
         (ceremony_id, issuer_type, issuer_country_code, first_key_id, ceremony_record, holder, holder_signature,
          cosigner, cosigner_key_id, cosignature, declared_attestation_key_id, declared_attestation_public_key,
          recorded_at, ceremony_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        c.ceremonyId, ...issuerCols(c.registry), c.firstKeyId, JSON.stringify(c.ceremonyStatement), JSON.stringify(c.holder), c.holderSignature,
        c.cosigner === undefined ? null : JSON.stringify(c.cosigner), c.cosignerKeyId ?? null, c.cosignature ?? null,
        declared?.attestationKeyId ?? null, declared?.publicKey ?? null, c.recordedAt, ceremonyDigest, c.receiptId,
      ],
    ),
  );
}

export async function insertPinnedAttestationKey(
  tx: Tx,
  pin: { attestedIssuer: RegistryIssuer; attestationKeyId: string; publicKey: string; publicKeyDigest: string; ceremonyId: string; pinnedAt: string },
): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.pinned_attestation_key
         (attested_issuer_type, attested_issuer_country_code, attestation_key_id, algorithm, public_key, public_key_digest, pinned_by_ceremony_id, pinned_at)
       VALUES ($1, $2, $3, 'Ed25519', $4, $5, $6, $7)`,
      [...issuerCols(pin.attestedIssuer), pin.attestationKeyId, pin.publicKey, pin.publicKeyDigest, pin.ceremonyId, pin.pinnedAt],
    ),
  );
}

// ── Cross-issuer verification evidence ───────────────────────────────────────

export async function insertVerificationEvidence(
  tx: Tx,
  e: { evidenceId: string; evidence: KeyVerificationEvidence; recordTable: SignedRecordTable; recordId: string; storedAt: string },
): Promise<string> {
  const evidenceDigest = recordDigest(e.evidence);
  await db(() =>
    tx.query(
      `INSERT INTO scs.key_verification_evidence
         (evidence_id, key_issuer_type, key_issuer_country_code, actor_id, key_id, evidence, attestation, attestation_key_id,
          attested_at, record_table, record_id, stored_at, evidence_digest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        e.evidenceId, ...issuerCols(e.evidence.issuer), e.evidence.registration.actorId, e.evidence.keyId, JSON.stringify(e.evidence),
        e.evidence.attestation, e.evidence.attestationKeyId, e.evidence.attestedAt, e.recordTable, e.recordId, e.storedAt, evidenceDigest,
      ],
    ),
  );
  return evidenceDigest;
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventRecord {
  readonly eventId: string;
  readonly keyId: string;
  readonly eventType: KeyEventStatement["eventType"];
  readonly effectiveAt: string;
  readonly reason: string;
  readonly recordedBy: ActorReferenceV2;
  readonly recordedAt: string;
  readonly eventStatement: KeyEventStatement;
  readonly statementSignature: string;
  readonly signerKeyId: string;
  readonly receiptId: string;
}

export const eventDigestOf = (e: EventRecord): string => recordDigest(e);

export async function insertEvent(tx: Tx, e: EventRecord, eventDigest: string): Promise<void> {
  await db(() =>
    tx.query(
      `INSERT INTO scs.signing_key_event
         (event_id, key_id, event_type, effective_at, reason, recorded_by, recorded_at, event_statement, statement_signature,
          signer_key_id, event_digest, receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        e.eventId, e.keyId, e.eventType, e.effectiveAt, e.reason, JSON.stringify(e.recordedBy), e.recordedAt,
        JSON.stringify(e.eventStatement), e.statementSignature, e.signerKeyId, eventDigest, e.receiptId,
      ],
    ),
  );
}
