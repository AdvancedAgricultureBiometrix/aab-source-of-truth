// AAB-PLATFORM-09 Governed Public-Key Registry: reading the registry (migration
// 023). Every function takes the caller's transaction, so a key's history is
// read in the same snapshot as the act that relies on it. Nothing here writes.
//
// This registry holds its own issuer's keys (scs.signing_key_registration).
// Another issuer's key is known only from the verification evidence stored
// with the record that needed it, and that issuer's compromise notices
// (scs.key_verification_evidence, scs.key_compromise_notice): never by a call
// outside the domain (section 9).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type {
  KeyCompromiseView,
  KeyEventView,
  KeyHistory,
  KeyRegistrationView,
  KeyVerificationEvidence,
  PinnedAttestationKey,
  RegistryIssuer,
} from "./registry.js";

import { CAPABILITY_ID } from "./errors.js";

const db = <T>(fn: () => Promise<T>) => withDatabaseErrors(CAPABILITY_ID, fn);
const iso = (d: Date): string => d.toISOString();

/** The records whose signatures the registry can be asked about (migration 023's record_table values). */
export type SignedRecordTable =
  | "actor_party_link"
  | "actor_party_link_status"
  | "signing_key_registration"
  | "signing_key_event"
  | "signing_key_compromise"
  | "key_bootstrap_ceremony"
  | "key_compromise_assessment";

/** What a signed record's verification needs from the registry, inside one transaction. */
export interface KeyRegistryReader {
  /** A key of this registry's own issuer, with its whole history; null if it is not registered. */
  keyHistory(keyId: string): Promise<KeyHistory | null>;
  /** Every key registered for an actor, oldest first. */
  actorKeyHistories(issuer: RegistryIssuer, actorId: string): Promise<KeyHistory[]>;
  /** Another issuer's key, as the evidence stored with this record shows it, with that issuer's compromise notices since. */
  foreignKeyHistory(recordTable: SignedRecordTable, recordId: string, keyId: string): Promise<KeyHistory | null>;
  /** The compromise assessment of a record, if one has been made. */
  assessmentOf(recordTable: SignedRecordTable, recordId: string): Promise<"AFFIRM" | "REPUDIATE" | undefined>;
  /** The attestation keys pinned in this registry. */
  pinnedAttestationKeys(): Promise<PinnedAttestationKey[]>;
}

interface RegistrationRow {
  key_id: string;
  issuer_type: RegistryIssuer["issuerType"];
  issuer_country_code: string | null;
  actor_id: string;
  algorithm: "Ed25519";
  public_key: string;
  public_key_digest: string;
  active_from: Date;
  registered_at: Date;
  replaces_key_id: string | null;
  registration_digest: string;
  replaced_from: Date | null;
}

const issuerOf = (type: RegistryIssuer["issuerType"], country: string | null): RegistryIssuer =>
  country === null ? { issuerType: type } : { issuerType: type, countryCode: country };

function registrationOf(r: RegistrationRow): KeyRegistrationView {
  return {
    keyId: r.key_id,
    issuer: issuerOf(r.issuer_type, r.issuer_country_code),
    actorId: r.actor_id,
    algorithm: r.algorithm,
    publicKey: r.public_key,
    publicKeyDigest: r.public_key_digest,
    activeFrom: iso(r.active_from),
    registeredAt: iso(r.registered_at),
    ...(r.replaces_key_id === null ? {} : { replacesKeyId: r.replaces_key_id }),
    registrationDigest: r.registration_digest,
  };
}

const REGISTRATION_SELECT = `
  SELECT k.key_id, k.issuer_type, k.issuer_country_code, k.actor_id, k.algorithm, k.public_key, k.public_key_digest,
         k.active_from, k.registered_at, k.replaces_key_id, k.registration_digest,
         (SELECT n.active_from FROM scs.signing_key_registration n WHERE n.replaces_key_id = k.key_id) AS replaced_from
    FROM scs.signing_key_registration k`;

async function historiesOf(tx: Tx, rows: RegistrationRow[]): Promise<KeyHistory[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.key_id);
  const events = (await db(() =>
    tx.query<{ key_id: string; event_type: KeyEventView["eventType"]; effective_at: Date; recorded_at: Date }>(
      `SELECT key_id, event_type, effective_at, recorded_at FROM scs.signing_key_event
        WHERE key_id = ANY($1::uuid[]) ORDER BY effective_at, recorded_at, event_id`,
      [ids],
    ),
  )).rows;
  const compromises = (await db(() =>
    tx.query<{ key_id: string; suspected_exposure_from: Date; recorded_at: Date }>(
      `SELECT key_id, suspected_exposure_from, recorded_at FROM scs.signing_key_compromise
        WHERE key_id = ANY($1::uuid[]) ORDER BY recorded_at, compromise_id`,
      [ids],
    ),
  )).rows;
  return rows.map((r) => ({
    registration: registrationOf(r),
    events: events.filter((e) => e.key_id === r.key_id).map((e) => ({ eventType: e.event_type, effectiveAt: iso(e.effective_at), recordedAt: iso(e.recorded_at) })),
    compromises: compromises.filter((c) => c.key_id === r.key_id).map((c) => ({ suspectedExposureFrom: iso(c.suspected_exposure_from), recordedAt: iso(c.recorded_at) })),
    ...(r.replaced_from === null ? {} : { replacedFrom: iso(r.replaced_from) }),
  }));
}

/** The registry, read inside the caller's transaction. */
export function keyRegistryReader(tx: Tx): KeyRegistryReader {
  return {
    async keyHistory(keyId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyId)) return null;
      const { rows } = await db(() => tx.query<RegistrationRow>(`${REGISTRATION_SELECT} WHERE k.key_id = $1::uuid`, [keyId]));
      return (await historiesOf(tx, rows))[0] ?? null;
    },

    async actorKeyHistories(issuer, actorId) {
      const { rows } = await db(() =>
        tx.query<RegistrationRow>(
          `${REGISTRATION_SELECT}
            WHERE k.issuer_type = $1 AND k.issuer_country_code IS NOT DISTINCT FROM $2 AND k.actor_id = $3
            ORDER BY k.active_from, k.registered_at, k.key_id`,
          [issuer.issuerType, issuer.countryCode ?? null, actorId],
        ),
      );
      return historiesOf(tx, rows);
    },

    async foreignKeyHistory(recordTable, recordId, keyId) {
      const { rows } = await db(() =>
        tx.query<{ evidence: KeyVerificationEvidence; key_issuer_type: RegistryIssuer["issuerType"]; key_issuer_country_code: string | null }>(
          `SELECT evidence, key_issuer_type, key_issuer_country_code FROM scs.key_verification_evidence
            WHERE record_table = $1 AND record_id = $2::uuid AND key_id = $3`,
          [recordTable, recordId, keyId],
        ),
      );
      const row = rows[0];
      if (row === undefined) return null;
      const notices = (await db(() =>
        tx.query<{ suspected_exposure_from: Date; recorded_at: Date }>(
          `SELECT suspected_exposure_from, recorded_at FROM scs.key_compromise_notice
            WHERE key_issuer_type = $1 AND key_issuer_country_code IS NOT DISTINCT FROM $2 AND key_id = $3
            ORDER BY recorded_at, notice_id`,
          [row.key_issuer_type, row.key_issuer_country_code, keyId],
        ),
      )).rows;
      const compromises: KeyCompromiseView[] = notices.map((n) => ({ suspectedExposureFrom: iso(n.suspected_exposure_from), recordedAt: iso(n.recorded_at) }));
      return { registration: row.evidence.registration, events: row.evidence.eventsAtAcceptance, compromises };
    },

    async assessmentOf(recordTable, recordId) {
      const { rows } = await db(() =>
        tx.query<{ outcome: "AFFIRM" | "REPUDIATE" }>(
          `SELECT outcome FROM scs.key_compromise_assessment WHERE record_table = $1 AND record_id = $2::uuid`,
          [recordTable, recordId],
        ),
      );
      return rows[0]?.outcome;
    },

    async pinnedAttestationKeys() {
      const { rows } = await db(() =>
        tx.query<{ attested_issuer_type: RegistryIssuer["issuerType"]; attested_issuer_country_code: string | null; attestation_key_id: string; public_key: string }>(
          `SELECT attested_issuer_type, attested_issuer_country_code, attestation_key_id, public_key
             FROM scs.pinned_attestation_key ORDER BY pinned_at, attestation_key_id`,
        ),
      );
      return rows.map((r) => ({
        attestedIssuer: issuerOf(r.attested_issuer_type, r.attested_issuer_country_code),
        attestationKeyId: r.attestation_key_id,
        publicKey: r.public_key,
      }));
    },
  };
}
