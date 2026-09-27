// Migrations 023 and 024: the AAB-PLATFORM-09 public-key registry tables, and
// receipts carrying AAB-PLATFORM-09, tested against a database built from
// every migration. Rows are inserted directly (the registry endpoints are not
// built yet). Keys, signatures and digests here are well-formed placeholders:
// the API verifies them, the database does not. Each test uses its own
// registry (its own country code), since a registry has one bootstrap. Grants
// and RLS are covered by db-security.test.ts, which checks every scs table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

let harness: MigratedDatabase;

before(async () => {
  harness = await createMigratedDatabase();
});

after(async () => {
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const sig = () => randomBytes(64).toString("base64");
const digest = () => `sha256:${createHash("sha256").update(randomBytes(32)).digest("hex")}`;
const publicKey = () => randomBytes(44).toString("base64");
const nonce = () => randomBytes(32).toString("base64");
/** jsonb columns are sent as JSON text; everything else as is. */
const param = (v: unknown) => (typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);

async function inTransaction<T>(body: (q: Query) => Promise<T>): Promise<T> {
  await harness.admin.query("BEGIN");
  try {
    const out = await body((sql, values) => harness.admin.query(sql, values));
    await harness.admin.query("COMMIT");
    return out;
  } catch (e) {
    await harness.admin.query("ROLLBACK").catch(() => undefined);
    throw e;
  }
}

function insert(q: Query, table: string, cols: Record<string, unknown>) {
  const names = Object.keys(cols);
  return q(`INSERT INTO scs.${table} (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => param(cols[n])));
}

/** Each test's own registry: a country code no other test uses. */
let nextCountry = 0;
const COUNTRIES = ["TH", "LA", "VN", "KH", "MY", "ID", "PH", "MM", "BN", "SG", "TL", "BD", "LK", "NP", "IN", "PK", "KE", "GH", "BR", "PE"];
const country = () => ({ issuerType: "COUNTRY_TENANCY", countryCode: COUNTRIES[nextCountry++]! });
const PLATFORM = { issuerType: "PLATFORM_CONTROL_PLANE" };
type Issuer = { issuerType: string; countryCode?: string };
const cols = (i: Issuer) => ({ issuer_type: i.issuerType, issuer_country_code: i.countryCode ?? null });
const person = (issuer: Issuer, actorId: string) => ({
  referenceVersion: "2", actorId, issuer, actorType: "HUMAN", authenticationMethod: "STATIC_TOKEN", accountableName: `Named ${actorId}`,
});

const T0 = new Date("2026-09-28T01:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

/** A receipt, as the API writes one with every registry record (migration 024 lets it carry AAB-PLATFORM-09). */
async function receipt(q: Query, capabilityId = "AAB-PLATFORM-09"): Promise<string> {
  const receiptId = randomUUID();
  const hex = () => createHash("sha256").update(randomBytes(16)).digest("hex");
  await insert(q, "decision_receipt", {
    receipt_id: receiptId, capability_id: capabilityId, decision_type: "KEY_TEST", decision: "RECORDED", subject_id: null,
    actor: person(PLATFORM, "receipt-actor"), correlation_id: `key-registry-${receiptId.slice(0, 8)}`, idempotency_key: null,
    request_digest: hex(), receipt: { receiptId }, receipt_digest: hex(), issued_at: T0,
  });
  return receiptId;
}

interface Challenge { challengeId: string; keyId: string }
async function challenge(q: Query, issuer: Issuer, actorId: string, requestedBy: string, purpose: string, issuedAt = T0): Promise<Challenge> {
  const c = { challengeId: randomUUID(), keyId: randomUUID() };
  await insert(q, "key_registration_challenge", {
    challenge_id: c.challengeId, purpose, ...cols(issuer), actor_id: actorId, key_id: c.keyId, nonce: nonce(),
    requested_by: person(issuer, requestedBy), issued_at: issuedAt, expires_at: new Date(issuedAt.getTime() + 30 * 60_000),
  });
  return c;
}

interface RegOpts {
  authority: string;
  signerKeyId: string | "self";
  ceremonyId?: string;
  replaces?: string;
  registeredAt?: Date;
  activeFrom?: Date;
  publicKeyDigest?: string;
  statement?: Record<string, unknown>;
}
async function register(q: Query, issuer: Issuer, actorId: string, c: Challenge, o: RegOpts): Promise<string> {
  const keyDigest = o.publicKeyDigest ?? digest();
  const signer = o.signerKeyId === "self" ? c.keyId : o.signerKeyId;
  const registeredAt = o.registeredAt ?? at(1);
  await insert(q, "signing_key_registration", {
    key_id: c.keyId, ...cols(issuer), actor_id: actorId, algorithm: "Ed25519", public_key: publicKey(), public_key_digest: keyDigest,
    active_from: o.activeFrom ?? registeredAt, registered_at: registeredAt, challenge_id: c.challengeId,
    possession_statement: { statementType: "SIGNING_KEY_POSSESSION", keyId: c.keyId, actorId, issuer, publicKeyDigest: keyDigest },
    possession_signature: sig(),
    registration_authority: person(issuer, o.authority),
    registration_statement: {
      statementType: "SIGNING_KEY_REGISTRATION", keyId: c.keyId, actorId, issuer, publicKeyDigest: keyDigest, algorithm: "Ed25519",
      challengeId: c.challengeId, signingKeyId: signer, ...(o.replaces ? { replacesKeyId: o.replaces } : {}),
      registrationAuthority: { issuer, actorId: o.authority }, ...o.statement,
    },
    registration_signature: sig(), registration_signer_key_id: signer, replaces_key_id: o.replaces ?? null,
    bootstrap_ceremony_id: o.ceremonyId ?? null, registration_digest: digest(), receipt_id: await receipt(q),
  });
  return c.keyId;
}

/** A country registry started by its representative, co-signed by the Platform Owner. Returns the representative's key. */
async function bootstrapCountry(issuer: Issuer, holder = "representative", ceremony: Record<string, unknown> = {}): Promise<string> {
  const c = await inTransaction((q) => challenge(q, issuer, holder, holder, "BOOTSTRAP"));
  return inTransaction(async (q) => {
    const ceremonyId = randomUUID();
    await insert(q, "key_bootstrap_ceremony", {
      ceremony_id: ceremonyId, ...cols(issuer), first_key_id: c.keyId,
      ceremony_record: { present: [holder, "platform-owner"], done: "registered the first key", at: at(1).toISOString() },
      holder: person(issuer, holder), holder_signature: sig(),
      cosigner: person(PLATFORM, "platform-owner"), cosigner_key_id: "control-plane-key-1", cosignature: sig(),
      declared_attestation_key_id: null, declared_attestation_public_key: null,
      recorded_at: at(1), ceremony_digest: digest(), receipt_id: await receipt(q), ...ceremony,
    });
    await insert(q, "pinned_attestation_key", {
      attested_issuer_type: "PLATFORM_CONTROL_PLANE", attested_issuer_country_code: null, attestation_key_id: `attestation-${randomUUID()}`,
      algorithm: "Ed25519", public_key: publicKey(), public_key_digest: digest(), pinned_by_ceremony_id: ceremonyId, pinned_at: at(1),
    });
    return register(q, issuer, holder, c, { authority: holder, signerKeyId: "self", ceremonyId });
  });
}

/** A key for `actorId`, registered by `registrar` with their key. */
async function registered(issuer: Issuer, actorId: string, registrar: string, registrarKey: string, o: Partial<RegOpts> = {}): Promise<string> {
  const c = await inTransaction((q) => challenge(q, issuer, actorId, registrar, "REGISTRATION"));
  return inTransaction((q) => register(q, issuer, actorId, c, { authority: registrar, signerKeyId: registrarKey, ...o }));
}

async function refused(p: Promise<unknown>, constraint: RegExp): Promise<void> {
  await assert.rejects(p, (e: unknown) => e instanceof Error && constraint.test(e.message), `expected ${constraint}`);
}

// ── bootstrap ────────────────────────────────────────────────────────────────

test("a country registry starts with one co-signed bootstrap, and never a second", async () => {
  const issuer = country();
  const first = await bootstrapCountry(issuer);
  assert.ok(first);
  await refused(inTransaction((q) => challenge(q, issuer, "someone", "someone", "BOOTSTRAP")), /key_bootstrap_registry_empty_ck/);
  await refused(bootstrapCountry(issuer, "second-representative"), /key_bootstrap_registry_empty_ck/);
});

test("a registration challenge is refused before the registry's first key", async () => {
  const issuer = country();
  await refused(inTransaction((q) => challenge(q, issuer, "officer", "registrar", "REGISTRATION")), /key_registry_started_ck/);
});

test("a country ceremony is co-signed by a control-plane actor; the Platform Owner's declares the attestation key", async () => {
  const issuer = country();
  await refused(bootstrapCountry(issuer, "representative", { cosigner: person(issuer, "not-the-platform-owner") }), /key_bootstrap_ceremony_kind_ck/);
  await refused(bootstrapCountry(issuer, "representative", { cosignature: null }), /key_bootstrap_ceremony_kind_ck/);

  const c = await inTransaction((q) => challenge(q, PLATFORM, "platform-owner", "platform-owner", "BOOTSTRAP"));
  const platformCeremony = (extra: Record<string, unknown>) => inTransaction(async (q) => {
    const ceremonyId = randomUUID();
    await insert(q, "key_bootstrap_ceremony", {
      ceremony_id: ceremonyId, ...cols(PLATFORM), first_key_id: c.keyId, ceremony_record: { present: ["platform-owner"] },
      holder: person(PLATFORM, "platform-owner"), holder_signature: sig(), cosigner: null, cosigner_key_id: null, cosignature: null,
      declared_attestation_key_id: "control-plane-attestation-1", declared_attestation_public_key: publicKey(),
      recorded_at: at(1), ceremony_digest: digest(), receipt_id: await receipt(q), ...extra,
    });
    await register(q, PLATFORM, "platform-owner", c, { authority: "platform-owner", signerKeyId: "self", ceremonyId });
  });
  await refused(platformCeremony({ declared_attestation_key_id: null }), /key_bootstrap_ceremony_kind_ck/);
  await platformCeremony({});
});

// ── registration ─────────────────────────────────────────────────────────────

test("a registration authority registers another actor's key, never their own", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  assert.ok(await registered(issuer, "link-officer", "representative", rep));
  // a registration challenge requested for oneself
  await refused(inTransaction((q) => challenge(q, issuer, "representative", "representative", "REGISTRATION")), /key_registration_challenge_requester_ck/);
  // a registration whose authority is the key holder
  const c = await inTransaction((q) => challenge(q, issuer, "officer-2", "representative", "REGISTRATION"));
  await refused(inTransaction((q) => register(q, issuer, "officer-2", c, { authority: "officer-2", signerKeyId: rep })), /signing_key_registration_separation_ck/);
});

test("the registration is signed with the registration authority's own key", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const officer = await registered(issuer, "officer-a", "representative", rep);
  const c = await inTransaction((q) => challenge(q, issuer, "officer-b", "representative", "REGISTRATION"));
  await refused(inTransaction((q) => register(q, issuer, "officer-b", c, { authority: "representative", signerKeyId: officer })), /signing_key_registration_signer_ck/);
});

test("a challenge is used once, within 30 minutes, for the actor it names", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const c = await inTransaction((q) => challenge(q, issuer, "officer", "representative", "REGISTRATION"));
  await refused(inTransaction((q) => register(q, issuer, "officer", c, { authority: "representative", signerKeyId: rep, registeredAt: at(31) })), /signing_key_registration_challenge_ck/);
  await refused(inTransaction((q) => register(q, issuer, "someone-else", c, { authority: "representative", signerKeyId: rep })), /signing_key_registration_challenge_ck|possession_statement_ck/);
  await inTransaction((q) => register(q, issuer, "officer", c, { authority: "representative", signerKeyId: rep }));
  await refused(inTransaction((q) => register(q, issuer, "officer", c, { authority: "representative", signerKeyId: rep })), /signing_key_registration_pk|signing_key_registration_challenge_uq/);
});

test("a public key is registered once; a key is never active before it is registered", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const shared = digest();
  await registered(issuer, "officer-a", "representative", rep, { publicKeyDigest: shared });
  await refused(registered(issuer, "officer-b", "representative", rep, { publicKeyDigest: shared }), /signing_key_registration_public_key_uq/);
  await refused(registered(issuer, "officer-c", "representative", rep, { registeredAt: at(5), activeFrom: at(4) }), /signing_key_registration_active_from_ck/);
});

test("a key is replaced at most once, and only by the same actor's key", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const old = await registered(issuer, "officer", "representative", rep);
  await refused(registered(issuer, "another-officer", "representative", rep, { replaces: old }), /signing_key_registration_replaces_ck/);
  await registered(issuer, "officer", "representative", rep, { replaces: old });
  await refused(registered(issuer, "officer", "representative", rep, { replaces: old }), /signing_key_registration_replaces_once_uq/);
});

test("what was signed is what is stored", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  await refused(registered(issuer, "officer", "representative", rep, { statement: { publicKeyDigest: digest() } }), /signing_key_registration_statement_ck/);
});

// ── events ───────────────────────────────────────────────────────────────────

async function event(issuer: Issuer, keyId: string, eventType: string, by: string, signerKeyId: string): Promise<void> {
  await inTransaction(async (q) => insert(q, "signing_key_event", {
    event_id: randomUUID(), key_id: keyId, event_type: eventType, effective_at: at(10), reason: "Routine rotation",
    recorded_by: person(issuer, by), recorded_at: at(10),
    event_statement: { statementType: "SIGNING_KEY_EVENT", keyId, eventType, reason: "Routine rotation", signingKeyId: signerKeyId, recordedBy: { issuer, actorId: by } },
    statement_signature: sig(), signer_key_id: signerKeyId, event_digest: digest(), receipt_id: await receipt(q),
  }));
}

test("a key holder retires their own key, but never suspends or reinstates it; a key is retired once", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const officer = await registered(issuer, "officer", "representative", rep);
  await refused(event(issuer, officer, "SUSPENDED", "officer", officer), /signing_key_event_holder_ck/);
  await event(issuer, officer, "SUSPENDED", "representative", rep);
  await refused(event(issuer, officer, "REINSTATED", "officer", officer), /signing_key_event_holder_ck/);
  await event(issuer, officer, "REINSTATED", "representative", rep);
  await event(issuer, officer, "RETIRED", "officer", officer);
  await refused(event(issuer, officer, "RETIRED", "representative", rep), /signing_key_event_retired_once_uq/);
  // signed with a key that is not the recorder's
  await refused(event(issuer, rep, "RETIRED", "representative", officer), /signing_key_event_signer_ck/);
});

// ── compromise ───────────────────────────────────────────────────────────────

async function compromise(issuer: Issuer, keyId: string, by: string, signerKeyId: string | null, from = at(2)): Promise<string> {
  const compromiseId = randomUUID();
  await inTransaction(async (q) => {
    await insert(q, "signing_key_compromise", {
      compromise_id: compromiseId, key_id: keyId, suspected_exposure_from: from, exposure_basis: "Laptop stolen; last known safe at 01:02",
      declared_by: person(issuer, by), declaration_signed: signerKeyId !== null,
      declaration_statement: signerKeyId === null ? null : { statementType: "SIGNING_KEY_COMPROMISE", keyId, signingKeyId: signerKeyId },
      statement_signature: signerKeyId === null ? null : sig(), signer_key_id: signerKeyId,
      recorded_at: at(20), compromise_digest: digest(), receipt_id: await receipt(q),
    });
    await insert(q, "signing_key_compromise_evidence", { compromise_id: compromiseId, evidence_digest: digest(), description: "Police report" });
  });
  return compromiseId;
}

test("only the key holder declares a compromise unsigned; a signed declaration never uses the compromised key", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const officer = await registered(issuer, "officer", "representative", rep);
  await refused(compromise(issuer, officer, "representative", null), /signing_key_compromise_unsigned_ck/);
  await refused(compromise(issuer, officer, "officer", officer), /signing_key_compromise_signed_ck/);
  assert.ok(await compromise(issuer, officer, "officer", null));
  assert.ok(await compromise(issuer, officer, "representative", rep, at(1)), "a later record may widen the window");
});

test("an exposure window never starts before the key was active", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const officer = await registered(issuer, "officer", "representative", rep, { registeredAt: at(3) });
  await refused(compromise(issuer, officer, "officer", null, at(2)), /signing_key_compromise_window_ck/);
});

// ── assessment ───────────────────────────────────────────────────────────────

test("one assessment per record, never by the key holder", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  const officer = await registered(issuer, "officer", "representative", rep);
  const security = await registered(issuer, "security-officer", "representative", rep);
  const compromiseId = await compromise(issuer, officer, "officer", null);
  const recordId = randomUUID();
  const assess = (by: string, signer: string) => inTransaction(async (q) => insert(q, "key_compromise_assessment", {
    assessment_id: randomUUID(), compromise_id: compromiseId, notice_id: null, record_table: "actor_party_link", record_id: recordId,
    key_holder_issuer_type: issuer.issuerType, key_holder_issuer_country_code: issuer.countryCode, key_holder_actor_id: "officer",
    outcome: "AFFIRM", reasons: "Confirmed with the officer by phone", evidence_considered: [{ description: "Call record", digest: digest() }],
    assessed_by: person(issuer, by),
    assessment_statement: { statementType: "KEY_COMPROMISE_ASSESSMENT", recordTable: "actor_party_link", recordId, outcome: "AFFIRM", signingKeyId: signer, assessedBy: { issuer, actorId: by } },
    statement_signature: sig(), signer_key_id: signer, assessed_at: at(30), assessment_digest: digest(), receipt_id: await receipt(q),
  }));
  await refused(assess("officer", officer), /key_compromise_assessment_assessor_ck/);
  await assess("security-officer", security);
  await refused(assess("representative", rep), /key_compromise_assessment_record_uq/);
});

// ── cross-issuer evidence ────────────────────────────────────────────────────

test("verification evidence is accepted only against a pinned attestation key, and never for a compromised key", async () => {
  const issuer = country();
  await bootstrapCountry(issuer);
  const pinned = (await harness.admin.query(
    `SELECT p.attestation_key_id FROM scs.pinned_attestation_key p JOIN scs.key_bootstrap_ceremony b ON b.ceremony_id = p.pinned_by_ceremony_id
      WHERE b.issuer_country_code = $1`, [issuer.countryCode])).rows[0]!["attestation_key_id"] as string;
  const evidence = (attestationKeyId: string, compromised: unknown) => inTransaction((q) => insert(q, "key_verification_evidence", {
    evidence_id: randomUUID(), key_issuer_type: "PLATFORM_CONTROL_PLANE", key_issuer_country_code: null, actor_id: "platform-owner",
    key_id: "control-plane-key-1",
    evidence: { issuer: PLATFORM, keyId: "control-plane-key-1", registration: { actorId: "platform-owner" }, eventsAtAcceptance: [], compromisedAtAcceptance: compromised, attestationKeyId },
    attestation: sig(), attestation_key_id: attestationKeyId, attested_at: at(1), record_table: "actor_party_link", record_id: randomUUID(),
    stored_at: at(2), evidence_digest: digest(),
  }));
  await refused(evidence("not-pinned", false), /key_verification_evidence_pin_fk/);
  await refused(evidence(pinned, true), /key_verification_evidence_shape_ck/);
  await evidence(pinned, false);
});

// ── append-only, and receipts ────────────────────────────────────────────────

test("registry records are never changed or removed", async () => {
  const issuer = country();
  const rep = await bootstrapCountry(issuer);
  await refused(harness.admin.query("UPDATE scs.signing_key_registration SET actor_id = 'changed' WHERE key_id = $1", [rep]), /append-only/);
  await refused(harness.admin.query("DELETE FROM scs.signing_key_registration WHERE key_id = $1", [rep]), /append-only/);
});

test("receipts carry AAB-PLATFORM-09, and no other new capability id", async () => {
  await inTransaction((q) => receipt(q, "AAB-PLATFORM-09"));
  await refused(inTransaction((q) => receipt(q, "AAB-PLATFORM-10")), /decision_receipt_capability_id_ck/);
});
