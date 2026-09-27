// AAB-PLATFORM-09: the registry reader (platform/key-registry/store.ts)
// against a database built from every migration, with real Ed25519 keys. Rows
// are inserted directly (the registry endpoints are not built yet); what is
// read back is verified with the platform library, end to end: a record stays
// VERIFIED through rotation, and a compromise puts it under review until a
// person assesses it. Another issuer's key is read only from the evidence
// stored with the record, and its notices.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { publicKeyDigestOf, verifySignedRecord, type RegistryIssuer } from "../platform/key-registry/registry.js";
import { keyRegistryReader, type KeyRegistryReader } from "../platform/key-registry/store.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

let harness: MigratedDatabase;
let api: Database;
before(async () => {
  harness = await createMigratedDatabase();
  // read as the restricted role the API runs as
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  await bootstrap();
});
after(async () => {
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const q: Query = (sql, values) => harness.admin.query(sql, values);
const sig = () => randomBytes(64).toString("base64");
const digest = () => `sha256:${createHash("sha256").update(randomBytes(32)).digest("hex")}`;
const param = (v: unknown) => (typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
function insert(table: string, cols: Record<string, unknown>) {
  const names = Object.keys(cols);
  return q(`INSERT INTO scs.${table} (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => param(cols[n])));
}
async function inTransaction<T>(body: () => Promise<T>): Promise<T> {
  await q("BEGIN");
  try {
    const out = await body();
    await q("COMMIT");
    return out;
  } catch (e) {
    await q("ROLLBACK").catch(() => undefined);
    throw e;
  }
}

const TH: RegistryIssuer = { issuerType: "COUNTRY_TENANCY", countryCode: "TH" };
const PLATFORM: RegistryIssuer = { issuerType: "PLATFORM_CONTROL_PLANE" };
const cols = (i: RegistryIssuer) => ({ issuer_type: i.issuerType, issuer_country_code: i.countryCode ?? null });
const person = (issuer: RegistryIssuer, actorId: string) => ({ referenceVersion: "2", actorId, issuer, actorType: "HUMAN", authenticationMethod: "STATIC_TOKEN", accountableName: `Named ${actorId}` });
const at = (minute: number) => new Date(Date.UTC(2026, 8, 28, 1, minute));

interface Key { readonly keyId: string; readonly publicKey: string; readonly privateKey: KeyObject }
function newKey(): Key {
  const k = generateKeyPairSync("ed25519");
  return { keyId: randomUUID(), publicKey: k.publicKey.export({ format: "der", type: "spki" }).toString("base64"), privateKey: k.privateKey };
}
const signed = (k: Key, statement: unknown) => sign(null, Buffer.from(canonicalJson(statement), "utf8"), k.privateKey).toString("base64");

async function challenge(actorId: string, keyId: string, requestedBy: string, purpose: string): Promise<string> {
  const challengeId = randomUUID();
  await insert("key_registration_challenge", {
    challenge_id: challengeId, purpose, ...cols(TH), actor_id: actorId, key_id: keyId, nonce: randomBytes(32).toString("base64"),
    requested_by: person(TH, requestedBy), issued_at: at(0), expires_at: new Date(at(0).getTime() + 30 * 60_000),
  });
  return challengeId;
}

async function register(actorId: string, key: Key, authority: string, signerKeyId: string, o: { ceremonyId?: string; replaces?: string; activeFrom?: Date } = {}): Promise<void> {
  const challengeId = await challenge(actorId, key.keyId, o.ceremonyId ? actorId : authority, o.ceremonyId ? "BOOTSTRAP" : "REGISTRATION");
  const keyDigest = publicKeyDigestOf(key.publicKey);
  await insert("signing_key_registration", {
    key_id: key.keyId, ...cols(TH), actor_id: actorId, algorithm: "Ed25519", public_key: key.publicKey, public_key_digest: keyDigest,
    active_from: o.activeFrom ?? at(1), registered_at: at(1), challenge_id: challengeId,
    possession_statement: { statementType: "SIGNING_KEY_POSSESSION", keyId: key.keyId, actorId, issuer: TH, publicKeyDigest: keyDigest },
    possession_signature: sig(), registration_authority: person(TH, authority),
    registration_statement: {
      statementType: "SIGNING_KEY_REGISTRATION", keyId: key.keyId, actorId, issuer: TH, publicKeyDigest: keyDigest, algorithm: "Ed25519",
      challengeId, signingKeyId: signerKeyId, ...(o.replaces ? { replacesKeyId: o.replaces } : {}), registrationAuthority: { issuer: TH, actorId: authority },
    },
    registration_signature: sig(), registration_signer_key_id: signerKeyId, replaces_key_id: o.replaces ?? null,
    bootstrap_ceremony_id: o.ceremonyId ?? null, registration_digest: digest(), receipt_id: randomUUID(),
  });
}

const rep = newKey();
const attester = newKey();
const attestationKeyId = "control-plane-attestation-1";

/** The country registry's first key and the pinned control-plane attestation key. Run once, after the database exists. */
async function bootstrap(): Promise<void> {
  await inTransaction(async () => {
    const ceremonyId = randomUUID();
    const challengeId = await challenge("representative", rep.keyId, "representative", "BOOTSTRAP");
    await insert("key_bootstrap_ceremony", {
      ceremony_id: ceremonyId, ...cols(TH), first_key_id: rep.keyId, ceremony_record: { present: ["representative", "platform-owner"] },
      holder: person(TH, "representative"), holder_signature: sig(), cosigner: person(PLATFORM, "platform-owner"),
      cosigner_key_id: "control-plane-key-1", cosignature: sig(), recorded_at: at(1), ceremony_digest: digest(), receipt_id: randomUUID(),
    });
    await insert("pinned_attestation_key", {
      attested_issuer_type: "PLATFORM_CONTROL_PLANE", attested_issuer_country_code: null, attestation_key_id: attestationKeyId,
      algorithm: "Ed25519", public_key: attester.publicKey, public_key_digest: publicKeyDigestOf(attester.publicKey), pinned_by_ceremony_id: ceremonyId, pinned_at: at(1),
    });
    const keyDigest = publicKeyDigestOf(rep.publicKey);
    await insert("signing_key_registration", {
      key_id: rep.keyId, ...cols(TH), actor_id: "representative", algorithm: "Ed25519", public_key: rep.publicKey, public_key_digest: keyDigest,
      active_from: at(1), registered_at: at(1), challenge_id: challengeId,
      possession_statement: { statementType: "SIGNING_KEY_POSSESSION", keyId: rep.keyId, actorId: "representative", issuer: TH, publicKeyDigest: keyDigest },
      possession_signature: sig(), registration_authority: person(TH, "representative"),
      registration_statement: {
        statementType: "SIGNING_KEY_REGISTRATION", keyId: rep.keyId, actorId: "representative", issuer: TH, publicKeyDigest: keyDigest, algorithm: "Ed25519",
        challengeId, signingKeyId: rep.keyId, registrationAuthority: { issuer: TH, actorId: "representative" },
      },
      registration_signature: sig(), registration_signer_key_id: rep.keyId, bootstrap_ceremony_id: ceremonyId, registration_digest: digest(), receipt_id: randomUUID(),
    });
  });
}

/** Reads the registry in one transaction, as scs_api. */
const readOnly = <T>(fn: (r: KeyRegistryReader) => Promise<T>): Promise<T> => api.transaction((tx) => fn(keyRegistryReader(tx)));

test("a key's history reads back as registered, and verifies a record through rotation", async () => {
  const oldKey = newKey();
  const newer = newKey();
  await inTransaction(() => register("officer-a", oldKey, "representative", rep.keyId));
  const statement = { statementType: "TEST", signingKeyId: oldKey.keyId };
  const r = { statement, signature: signed(oldKey, statement), signer: { issuer: TH, actorId: "officer-a" }, acceptedAt: at(5).toISOString() };

  const before = await readOnly((reader) => reader.keyHistory(oldKey.keyId));
  assert.ok(before);
  assert.equal(before.registration.publicKeyDigest, publicKeyDigestOf(oldKey.publicKey));
  assert.equal(before.registration.activeFrom, at(1).toISOString());
  assert.equal(verifySignedRecord({ record: r, key: before }).result, "VERIFIED");

  // rotation: the replacing key's activeFrom retires the old one
  await inTransaction(() => register("officer-a", newer, "representative", rep.keyId, { replaces: oldKey.keyId, activeFrom: at(10) }));
  const after = await readOnly((reader) => reader.keyHistory(oldKey.keyId));
  assert.equal(after?.replacedFrom, at(10).toISOString());
  assert.equal(verifySignedRecord({ record: r, key: after }).result, "VERIFIED", "a retired key still verifies what it signed while active");
  const late = { ...r, acceptedAt: at(11).toISOString() };
  assert.equal(verifySignedRecord({ record: late, key: after }).result, "NOT_VERIFIABLE", "but nothing accepted after its retirement");

  const all = await readOnly((reader) => reader.actorKeyHistories(TH, "officer-a"));
  assert.deepEqual(all.map((h) => h.registration.keyId), [oldKey.keyId, newer.keyId]);
  assert.equal(await readOnly((reader) => reader.keyHistory(randomUUID())), null);
  assert.equal(await readOnly((reader) => reader.keyHistory("not-a-uuid")), null);
});

test("events and compromises read back; a compromise puts a record under review until it is assessed", async () => {
  const k = newKey();
  await inTransaction(() => register("officer-b", k, "representative", rep.keyId));
  const statement = { statementType: "TEST", signingKeyId: k.keyId };
  const recordId = randomUUID();
  const r = { statement, signature: signed(k, statement), signer: { issuer: TH, actorId: "officer-b" }, acceptedAt: at(15).toISOString() };

  await inTransaction(async () => {
    const e = { statementType: "SIGNING_KEY_EVENT", keyId: k.keyId, eventType: "SUSPENDED", reason: "Investigation", signingKeyId: rep.keyId, recordedBy: { issuer: TH, actorId: "representative" } };
    await insert("signing_key_event", {
      event_id: randomUUID(), key_id: k.keyId, event_type: "SUSPENDED", effective_at: at(20), reason: "Investigation", recorded_by: person(TH, "representative"),
      recorded_at: at(20), event_statement: e, statement_signature: sig(), signer_key_id: rep.keyId, event_digest: digest(), receipt_id: randomUUID(),
    });
    await insert("signing_key_compromise", {
      compromise_id: randomUUID(), key_id: k.keyId, suspected_exposure_from: at(12), exposure_basis: "Device lost at 01:12", declared_by: person(TH, "officer-b"),
      declaration_signed: false, recorded_at: at(21), compromise_digest: digest(), receipt_id: randomUUID(),
    });
  });
  const h = await readOnly((reader) => reader.keyHistory(k.keyId));
  assert.deepEqual(h?.events.map((e) => e.eventType), ["SUSPENDED"]);
  assert.deepEqual(h?.compromises, [{ suspectedExposureFrom: at(12).toISOString(), recordedAt: at(21).toISOString() }]);
  assert.equal(verifySignedRecord({ record: r, key: h }).result, "UNDER_COMPROMISE_REVIEW");

  const security = newKey();
  await inTransaction(() => register("security-officer", security, "representative", rep.keyId));
  await inTransaction(async () => {
    const compromiseId = (await q(`SELECT compromise_id FROM scs.signing_key_compromise WHERE key_id = $1`, [k.keyId])).rows[0]!["compromise_id"];
    await insert("key_compromise_assessment", {
      assessment_id: randomUUID(), compromise_id: compromiseId, notice_id: null, record_table: "actor_party_link", record_id: recordId,
      ...{ key_holder_issuer_type: "COUNTRY_TENANCY", key_holder_issuer_country_code: "TH", key_holder_actor_id: "officer-b" },
      outcome: "AFFIRM", reasons: "Confirmed in person", evidence_considered: [], assessed_by: person(TH, "security-officer"),
      assessment_statement: { statementType: "KEY_COMPROMISE_ASSESSMENT", recordTable: "actor_party_link", recordId, outcome: "AFFIRM", signingKeyId: security.keyId, assessedBy: { issuer: TH, actorId: "security-officer" } },
      statement_signature: sig(), signer_key_id: security.keyId, assessed_at: at(30), assessment_digest: digest(), receipt_id: randomUUID(),
    });
  });
  const assessment = await readOnly((reader) => reader.assessmentOf("actor_party_link", recordId));
  assert.equal(assessment, "AFFIRM");
  assert.equal(verifySignedRecord({ record: r, key: h, ...(assessment ? { assessment } : {}) }).result, "AFFIRMED_AFTER_COMPROMISE");
  assert.equal(await readOnly((reader) => reader.assessmentOf("actor_party_link", randomUUID())), undefined);
});

test("another issuer's key: from the evidence stored with the record, and its notices since", async () => {
  const pins = await readOnly((reader) => reader.pinnedAttestationKeys());
  assert.deepEqual(pins, [{ attestedIssuer: PLATFORM, attestationKeyId, publicKey: attester.publicKey }]);

  const owner = newKey();
  const recordId = randomUUID();
  const registration = {
    keyId: "control-plane-key-1", issuer: PLATFORM, actorId: "platform-owner", algorithm: "Ed25519", publicKey: owner.publicKey,
    publicKeyDigest: publicKeyDigestOf(owner.publicKey), activeFrom: at(0).toISOString(), registeredAt: at(0).toISOString(), registrationDigest: digest(),
  };
  const evidence = { issuer: PLATFORM, keyId: "control-plane-key-1", registration, eventsAtAcceptance: [], compromisedAtAcceptance: false, attestedAt: at(1).toISOString(), attestation: sig(), attestationKeyId };
  await inTransaction(() => insert("key_verification_evidence", {
    evidence_id: randomUUID(), key_issuer_type: "PLATFORM_CONTROL_PLANE", key_issuer_country_code: null, actor_id: "platform-owner", key_id: "control-plane-key-1",
    evidence, attestation: evidence.attestation, attestation_key_id: attestationKeyId, attested_at: at(1), record_table: "key_bootstrap_ceremony", record_id: recordId,
    stored_at: at(2), evidence_digest: digest(),
  }));
  const statement = { statementType: "TEST" };
  const r = { statement, signature: signed(owner, statement), signer: { issuer: PLATFORM, actorId: "platform-owner" }, acceptedAt: at(2).toISOString() };
  const foreign = await readOnly((reader) => reader.foreignKeyHistory("key_bootstrap_ceremony", recordId, "control-plane-key-1"));
  assert.equal(verifySignedRecord({ record: r, key: foreign }).result, "VERIFIED");
  assert.equal(await readOnly((reader) => reader.foreignKeyHistory("key_bootstrap_ceremony", randomUUID(), "control-plane-key-1")), null);

  await inTransaction(() => insert("key_compromise_notice", {
    notice_id: randomUUID(), key_issuer_type: "PLATFORM_CONTROL_PLANE", key_issuer_country_code: null, actor_id: "platform-owner", key_id: "control-plane-key-1",
    suspected_exposure_from: at(0), notice: { keyId: "control-plane-key-1", issuer: PLATFORM, actorId: "platform-owner" }, attestation: sig(),
    attestation_key_id: attestationKeyId, recorded_by: person(TH, "representative"), recorded_at: at(40), notice_digest: digest(), receipt_id: randomUUID(),
  }));
  const noticed = await readOnly((reader) => reader.foreignKeyHistory("key_bootstrap_ceremony", recordId, "control-plane-key-1"));
  assert.equal(verifySignedRecord({ record: r, key: noticed }).result, "UNDER_COMPROMISE_REVIEW", "a notice places the country's own records under review");
});
