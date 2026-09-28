// AAB-PLATFORM-09 registry endpoints (PR 4): both bootstrap ceremonies,
// challenges, registration, rotation, events and reads, through real HTTP,
// with real Ed25519 keys signing outside the server, as signers do.
//
// Two servers run the same registry code: the control plane's (actors issued
// by PLATFORM_CONTROL_PLANE) and Thailand's (COUNTRY_TENANCY TH). They share
// this test's database, separated by issuer; that the country never calls the
// control plane is proven with the cross-issuer tests (PR 5). Here the country
// verifies the Platform Owner's co-signature only from the attested evidence
// the request carries.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { attestedContent, publicKeyDigestOf } from "../platform/key-registry/registry.js";
import { keyRegistryRoutes } from "../platform/key-registry/routes.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

// ── Keys, signing, actors ─────────────────────────────────────────────────────

interface Key { readonly publicKey: string; readonly privateKey: KeyObject }
function newKey(): Key {
  const k = generateKeyPairSync("ed25519");
  return { publicKey: k.publicKey.export({ format: "der", type: "spki" }).toString("base64"), privateKey: k.privateKey };
}
const signed = (k: Key, statement: unknown) => sign(null, Buffer.from(canonicalJson(statement), "utf8"), k.privateKey).toString("base64");

const TH = { issuerType: "COUNTRY_TENANCY", countryCode: "TH" } as const;
const PLATFORM = { issuerType: "PLATFORM_CONTROL_PLANE" } as const;
type Issuer = typeof TH | typeof PLATFORM;

const token = (who: string) => `key-registry-token-${who}-0123456789abcdef`;
const entry = (who: string, roles: string[], o: { actorType?: string; named?: boolean } = {}) => ({
  tokenSha256: createHash("sha256").update(token(who)).digest("hex"),
  actor: { actorId: who, actorType: o.actorType ?? "HUMAN", roles, authenticationMethod: "STATIC_TOKEN" },
  ...(o.named === false || (o.actorType ?? "HUMAN") !== "HUMAN" ? {} : { accountableName: `Named ${who}` }),
});

let harness: MigratedDatabase;
let api: Database;
const servers: Server[] = [];
let countryBase = "";
let platformBase = "";

async function serve(authenticator: StaticTokenAuthenticator): Promise<string> {
  const server = createApiServer({ routes: keyRegistryRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  platformBase = await serve(StaticTokenAuthenticator.fromConfig({ actors: [entry("platform-owner", ["KEY_REGISTRAR"]), entry("platform-staff", [])] }, { controlPlane: true }));
  countryBase = await serve(StaticTokenAuthenticator.fromConfig({
    actors: [
      entry("representative", ["KEY_REGISTRAR"]),
      entry("registrar-2", ["KEY_REGISTRAR"]),
      entry("officer", []),
      entry("officer-2", []),
      entry("security", ["KEY_SECURITY_OFFICER"]),
      entry("bystander", []),
      entry("unnamed", [], { named: false }),
      entry("robot", [], { actorType: "SERVICE" }),
    ],
  }, { issuerCountry: "TH" }));
});

after(async () => {
  for (const s of servers) await new Promise<void>((r) => s.close(() => r()));
  await api?.close();
  await harness?.drop();
});

interface Reply { status: number; json: Record<string, unknown> }
async function call(base: string, who: string, method: string, path: string, body?: unknown): Promise<Reply> {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${token(who)}`, ...(body === undefined ? {} : { "content-type": "application/json", "idempotency-key": `key-registry-${randomUUID()}` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}
const decisionOf = (r: Reply) => r.json["decision"] as Record<string, unknown>;
async function ok(p: Promise<Reply>, status = 201): Promise<Record<string, unknown>> {
  const r = await p;
  assert.equal(r.status, status, JSON.stringify(r.json));
  return status === 200 ? r.json : decisionOf(r);
}
async function refused(p: Promise<Reply>, status: number, error: string): Promise<Reply> {
  const r = await p;
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error, JSON.stringify(r.json));
  assert.equal(r.json["capabilityId"] === "AAB-PLATFORM-09" ? r.json["noWrites"] : true, true);
  return r;
}

// ── Building requests ─────────────────────────────────────────────────────────

interface Challenge { challengeId: string; keyId: string; nonce: string }
async function challenge(base: string, who: string, purpose: string, actorId: string): Promise<Challenge> {
  const d = await ok(call(base, who, "POST", "/aab/v1/key-registration-challenges", { purpose, actorId }));
  return { challengeId: d["challengeId"] as string, keyId: d["keyId"] as string, nonce: d["nonce"] as string };
}

function possession(issuer: Issuer, actorId: string, c: Challenge, key: Key) {
  const statement = { statementType: "SIGNING_KEY_POSSESSION", keyId: c.keyId, actorId, issuer, publicKeyDigest: publicKeyDigestOf(key.publicKey), challengeId: c.challengeId, nonce: c.nonce };
  return { possessionStatement: statement, possessionSignature: signed(key, statement) };
}

function registration(issuer: Issuer, actorId: string, c: Challenge, key: Key, authority: string, authorityKey: Key, authorityKeyId: string, extra: Record<string, unknown> = {}) {
  const statement = {
    statementType: "SIGNING_KEY_REGISTRATION", keyId: c.keyId, actorId, issuer, publicKeyDigest: publicKeyDigestOf(key.publicKey), algorithm: "Ed25519",
    challengeId: c.challengeId, signingKeyId: authorityKeyId, registrationAuthority: { issuer, actorId: authority }, ...extra,
  };
  return { registrationStatement: statement, registrationSignature: signed(authorityKey, statement) };
}

const record = (who: string[]) => ({ present: who, procedure: "Key generated on an offline laptop; public key read aloud and compared.", performedAt: new Date().toISOString() });

// ── State shared through the tests, in order ──────────────────────────────────

const po = newKey();
const attestation = newKey();
const ATTESTATION_KEY_ID = "control-plane-attestation-1";
let poKeyId = "";
const rep = newKey();
let repKeyId = "";

async function platformBootstrap(): Promise<void> {
  const c = await challenge(platformBase, "platform-owner", "BOOTSTRAP", "platform-owner");
  const ceremonyStatement = {
    statementType: "KEY_BOOTSTRAP_CEREMONY", registry: PLATFORM, holder: { issuer: PLATFORM, actorId: "platform-owner" },
    keyId: c.keyId, challengeId: c.challengeId, publicKeyDigest: publicKeyDigestOf(po.publicKey), record: record(["Platform Owner"]),
    declaredAttestationKey: { attestationKeyId: ATTESTATION_KEY_ID, publicKey: attestation.publicKey },
  };
  const d = await ok(call(platformBase, "platform-owner", "POST", "/aab/v1/key-bootstrap-ceremonies", {
    publicKey: po.publicKey, ...possession(PLATFORM, "platform-owner", c, po),
    ...registration(PLATFORM, "platform-owner", c, po, "platform-owner", po, c.keyId),
    ceremonyStatement, holderSignature: signed(po, ceremonyStatement),
  }));
  assert.equal(d["decision"], "BOOTSTRAPPED");
  poKeyId = d["keyId"] as string;
}

/** The Platform Owner's key, as the control plane exports it, attested offline with the attestation key. */
async function poEvidence(o: { attester?: Key; attestedAt?: string } = {}) {
  const read = await ok(call(platformBase, "platform-owner", "GET", `/aab/v1/signing-keys/${poKeyId}`), 200);
  const base = {
    issuer: PLATFORM, keyId: poKeyId, registration: read["registration"], eventsAtAcceptance: read["events"], compromisedAtAcceptance: false as const,
    attestedAt: o.attestedAt ?? new Date().toISOString(), attestationKeyId: ATTESTATION_KEY_ID,
  };
  return { ...base, attestation: signed(o.attester ?? attestation, attestedContent({ ...base, attestation: "" } as never)) };
}

async function countryBootstrapRequest(o: { cosignWith?: Key; evidence?: unknown; omit?: string[] } = {}) {
  const c = await challenge(countryBase, "representative", "BOOTSTRAP", "representative");
  const ceremonyStatement = {
    statementType: "KEY_BOOTSTRAP_CEREMONY", registry: TH, holder: { issuer: TH, actorId: "representative" },
    keyId: c.keyId, challengeId: c.challengeId, publicKeyDigest: publicKeyDigestOf(rep.publicKey), record: record(["Country representative", "Platform Owner (witness)"]),
    pinnedAttestationKey: { attestationKeyId: ATTESTATION_KEY_ID, publicKey: attestation.publicKey },
    cosigner: { actor: { issuer: PLATFORM, actorId: "platform-owner" }, accountableName: "Named platform-owner", signingKeyId: poKeyId },
  };
  const body: Record<string, unknown> = {
    publicKey: rep.publicKey, ...possession(TH, "representative", c, rep),
    ...registration(TH, "representative", c, rep, "representative", rep, c.keyId),
    ceremonyStatement, holderSignature: signed(rep, ceremonyStatement),
    cosignature: signed(o.cosignWith ?? po, ceremonyStatement), cosignerKeyEvidence: o.evidence ?? (await poEvidence()),
  };
  for (const k of o.omit ?? []) delete body[k];
  return body;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

test("the Platform Owner's ceremony: self-attested, declaring the attestation key, once", async () => {
  await refused(call(platformBase, "platform-staff", "POST", "/aab/v1/key-registration-challenges", { purpose: "BOOTSTRAP", actorId: "platform-staff" }), 403, "KEY_REGISTRAR_NOT_AUTHORISED");
  await refused(call(platformBase, "platform-owner", "POST", "/aab/v1/key-registration-challenges", { purpose: "REGISTRATION", actorId: "platform-staff" }), 409, "KEY_REGISTRY_NOT_STARTED");
  await platformBootstrap();
  await refused(call(platformBase, "platform-owner", "POST", "/aab/v1/key-registration-challenges", { purpose: "BOOTSTRAP", actorId: "platform-owner" }), 409, "KEY_REGISTRY_ALREADY_STARTED");
  const read = await ok(call(platformBase, "platform-owner", "GET", `/aab/v1/signing-keys/${poKeyId}`), 200);
  assert.equal(read["currentState"], "ACTIVE");
  const stored = (await harness.admin.query("SELECT capability_id, decision_type FROM scs.decision_receipt WHERE subject_id IS NOT NULL AND capability_id = 'AAB-PLATFORM-09' AND decision_type = 'KEY_BOOTSTRAP'")).rows;
  assert.equal(stored.length, 1);
});

test("a country's ceremony: refused without the Platform Owner's verified co-signature and attested evidence", async () => {
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", await countryBootstrapRequest({ omit: ["cosignature"] })), 422, "KEY_CEREMONY_INVALID");
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", await countryBootstrapRequest({ cosignWith: newKey() })), 422, "KEY_CEREMONY_INVALID");
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", await countryBootstrapRequest({ evidence: await poEvidence({ attester: newKey() }) })), 422, "KEY_EVIDENCE_INVALID");
  const stale = new Date(Date.now() - 61 * 60_000).toISOString();
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", await countryBootstrapRequest({ evidence: await poEvidence({ attestedAt: stale }) })), 422, "KEY_EVIDENCE_INVALID");
  const n = (await harness.admin.query("SELECT count(*)::int AS n FROM scs.key_bootstrap_ceremony WHERE issuer_country_code = 'TH'")).rows[0]!["n"];
  assert.equal(n, 0, "a refusal writes nothing");
});

test("a country's ceremony: the representative's first key, co-signed; the attestation key pinned; the evidence kept", async () => {
  const d = await ok(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", await countryBootstrapRequest()));
  repKeyId = d["keyId"] as string;
  assert.equal(d["pinnedAttestationKeyId"], ATTESTATION_KEY_ID);
  assert.equal((d["cosignatureAcceptance"] as Record<string, unknown>)["signingKeyId"], poKeyId);
  const pins = (await harness.admin.query("SELECT attestation_key_id FROM scs.pinned_attestation_key")).rows;
  assert.deepEqual(pins.map((p) => p["attestation_key_id"]), [ATTESTATION_KEY_ID]);
  const evidence = (await harness.admin.query("SELECT record_table, key_id FROM scs.key_verification_evidence")).rows;
  assert.deepEqual(evidence, [{ record_table: "key_bootstrap_ceremony", key_id: poKeyId }]);
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-registration-challenges", { purpose: "BOOTSTRAP", actorId: "representative" }), 409, "KEY_REGISTRY_ALREADY_STARTED");
});

// ── Registration ──────────────────────────────────────────────────────────────

async function register(actorId: string, key: Key, o: { authority?: string; authorityKey?: Key; authorityKeyId?: string; extra?: Record<string, unknown>; nonce?: string } = {}): Promise<Reply> {
  const authority = o.authority ?? "representative";
  const c = await challenge(countryBase, authority, "REGISTRATION", actorId);
  const cc = o.nonce === undefined ? c : { ...c, nonce: o.nonce };
  return call(countryBase, authority, "POST", "/aab/v1/signing-keys", {
    publicKey: key.publicKey, ...possession(TH, actorId, cc, key),
    ...registration(TH, actorId, c, key, authority, o.authorityKey ?? rep, o.authorityKeyId ?? repKeyId, o.extra),
  });
}

const officerKey = newKey();
let officerKeyId = "";
const registrar2Key = newKey();
let registrar2KeyId = "";

test("registration: by a registration authority who is not the holder, with proof of possession", async () => {
  const d = await ok(register("officer", officerKey));
  officerKeyId = d["keyId"] as string;
  assert.equal((d["signatureAcceptance"] as Record<string, unknown>)["signingKeyId"], repKeyId);
  registrar2KeyId = (await ok(register("registrar-2", registrar2Key)))["keyId"] as string;

  await refused(call(countryBase, "officer", "POST", "/aab/v1/key-registration-challenges", { purpose: "REGISTRATION", actorId: "officer-2" }), 403, "KEY_REGISTRAR_NOT_AUTHORISED");
  await refused(call(countryBase, "representative", "POST", "/aab/v1/key-registration-challenges", { purpose: "REGISTRATION", actorId: "representative" }), 403, "KEY_SELF_REGISTRATION");
  for (const who of ["unnamed", "robot", "nobody"]) {
    await refused(call(countryBase, "representative", "POST", "/aab/v1/key-registration-challenges", { purpose: "REGISTRATION", actorId: who }), 422, "KEY_HOLDER_UNKNOWN");
  }
  await refused(register("officer-2", newKey(), { nonce: Buffer.alloc(32, 7).toString("base64") }), 422, "KEY_POSSESSION_NOT_PROVEN");
  await refused(register("officer-2", officerKey), 409, "KEY_ALREADY_REGISTERED");
  await refused(register("officer-2", newKey(), { authorityKey: registrar2Key }), 422, "KEY_SIGNATURE_INVALID");
});

test("a challenge is used once, for the actor and key it names", async () => {
  const k = newKey();
  const c = await challenge(countryBase, "representative", "REGISTRATION", "officer-2");
  const body = { publicKey: k.publicKey, ...possession(TH, "officer-2", c, k), ...registration(TH, "officer-2", c, k, "representative", rep, repKeyId) };
  await ok(call(countryBase, "representative", "POST", "/aab/v1/signing-keys", body));
  const again = newKey();
  const reuse = { publicKey: again.publicKey, ...possession(TH, "officer-2", c, again), ...registration(TH, "officer-2", c, again, "representative", rep, repKeyId) };
  await refused(call(countryBase, "representative", "POST", "/aab/v1/signing-keys", reuse), 422, "KEY_CHALLENGE_INVALID");
});

test("one active key per actor: a second key replaces the first, which retires and stays readable", async () => {
  const next = newKey();
  await refused(register("officer", next), 409, "KEY_ACTIVE_KEY_EXISTS");
  await refused(register("officer", next, { extra: { replacesKeyId: repKeyId } }), 422, "KEY_REPLACEMENT_INVALID");
  const d = await ok(register("officer", next, { extra: { replacesKeyId: officerKeyId } }));
  const old = await ok(call(countryBase, "officer", "GET", `/aab/v1/signing-keys/${officerKeyId}`), 200);
  assert.equal(old["currentState"], "RETIRED");
  assert.equal(old["retiredAt"], d["activeFrom"]);
  officerKeyId = d["keyId"] as string;
  Object.assign(officerKey, next);
});

// ── Events ────────────────────────────────────────────────────────────────────

async function event(who: string, whoKey: Key, whoKeyId: string, keyId: string, eventType: string): Promise<Reply> {
  const eventStatement = { statementType: "SIGNING_KEY_EVENT", keyId, eventType, reason: "Scheduled review", signingKeyId: whoKeyId, recordedBy: { issuer: TH, actorId: who } };
  return call(countryBase, who, "POST", `/aab/v1/signing-keys/${keyId}/events`, { eventStatement, statementSignature: signed(whoKey, eventStatement) });
}

test("events: a registrar suspends and reinstates; the holder never does, but may retire their own key", async () => {
  await refused(event("officer", officerKey, officerKeyId, officerKeyId, "SUSPENDED"), 403, "KEY_EVENT_NOT_AUTHORISED");
  assert.equal((await ok(event("registrar-2", registrar2Key, registrar2KeyId, officerKeyId, "SUSPENDED")))["resultingState"], "SUSPENDED");
  await refused(event("registrar-2", registrar2Key, registrar2KeyId, officerKeyId, "SUSPENDED"), 409, "KEY_STATE_NOT_PERMITTED");
  await refused(event("officer", officerKey, officerKeyId, officerKeyId, "REINSTATED"), 403, "KEY_EVENT_NOT_AUTHORISED");
  assert.equal((await ok(event("representative", rep, repKeyId, officerKeyId, "REINSTATED")))["resultingState"], "ACTIVE");
  await refused(event("bystander", newKey(), randomUUID(), officerKeyId, "RETIRED"), 403, "KEY_EVENT_NOT_AUTHORISED");
  await refused(event("representative", registrar2Key, registrar2KeyId, officerKeyId, "SUSPENDED"), 422, "KEY_SIGNATURE_INVALID");
  assert.equal((await ok(event("officer", officerKey, officerKeyId, officerKeyId, "RETIRED")))["resultingState"], "RETIRED");
  await refused(event("representative", rep, repKeyId, officerKeyId, "RETIRED"), 409, "KEY_STATE_NOT_PERMITTED");
  await refused(event("representative", rep, repKeyId, randomUUID(), "RETIRED"), 404, "KEY_NOT_FOUND");
});

// ── Reads ─────────────────────────────────────────────────────────────────────

test("reads: registrars, security officers and the holder; nobody else, and not whether a key exists", async () => {
  await ok(call(countryBase, "security", "GET", `/aab/v1/signing-keys/${repKeyId}`), 200);
  await ok(call(countryBase, "registrar-2", "GET", `/aab/v1/signing-keys/${repKeyId}`), 200);
  await refused(call(countryBase, "bystander", "GET", `/aab/v1/signing-keys/${repKeyId}`), 403, "KEY_READER_NOT_AUTHORISED");
  await refused(call(countryBase, "bystander", "GET", `/aab/v1/signing-keys/${randomUUID()}`), 403, "KEY_READER_NOT_AUTHORISED");
  await refused(call(countryBase, "security", "GET", `/aab/v1/signing-keys/${randomUUID()}`), 404, "KEY_NOT_FOUND");
});

test("every registry decision has its receipt, and every registry record names it", async () => {
  const orphans = (await harness.admin.query(`
    SELECT 'registration' AS t, key_id::text AS id FROM scs.signing_key_registration k
     WHERE NOT EXISTS (SELECT 1 FROM scs.decision_receipt r WHERE r.receipt_id = k.receipt_id AND r.capability_id = 'AAB-PLATFORM-09')
    UNION ALL
    SELECT 'event', event_id::text FROM scs.signing_key_event e
     WHERE NOT EXISTS (SELECT 1 FROM scs.decision_receipt r WHERE r.receipt_id = e.receipt_id AND r.capability_id = 'AAB-PLATFORM-09')
    UNION ALL
    SELECT 'ceremony', ceremony_id::text FROM scs.key_bootstrap_ceremony c
     WHERE NOT EXISTS (SELECT 1 FROM scs.decision_receipt r WHERE r.receipt_id = c.receipt_id AND r.capability_id = 'AAB-PLATFORM-09')`)).rows;
  assert.deepEqual(orphans, []);
});
