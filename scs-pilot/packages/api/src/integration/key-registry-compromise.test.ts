// AAB-PLATFORM-09 compromise, notices and assessments (PR 5), and the
// cross-issuer proof: the control plane's registry and Thailand's run the same
// code in two separate databases. The country verifies the Platform Owner's
// co-signature from the evidence stored with its ceremony — with the control
// plane's server stopped and its database dropped — and a compromise notice,
// attested offline and carried by hand, puts that record under review until a
// person assesses it. Real Ed25519 keys throughout, signing outside the server.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { attestedContent, publicKeyDigestOf, verifySignedRecord } from "../platform/key-registry/registry.js";
import { keyRegistryRoutes } from "../platform/key-registry/routes.js";
import { keyRegistryReader } from "../platform/key-registry/store.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

interface Key { readonly publicKey: string; readonly privateKey: KeyObject }
function newKey(): Key {
  const k = generateKeyPairSync("ed25519");
  return { publicKey: k.publicKey.export({ format: "der", type: "spki" }).toString("base64"), privateKey: k.privateKey };
}
const signed = (k: Key, statement: unknown) => sign(null, Buffer.from(canonicalJson(statement), "utf8"), k.privateKey).toString("base64");
const digest = (s: string) => `sha256:${createHash("sha256").update(s).digest("hex")}`;

const TH = { issuerType: "COUNTRY_TENANCY", countryCode: "TH" } as const;
const PLATFORM = { issuerType: "PLATFORM_CONTROL_PLANE" } as const;
type Issuer = typeof TH | typeof PLATFORM;

const token = (who: string) => `key-compromise-token-${who}-0123456789abcdef`;
const entry = (who: string, roles: string[]) => ({
  tokenSha256: createHash("sha256").update(token(who)).digest("hex"),
  actor: { actorId: who, actorType: "HUMAN", roles, authenticationMethod: "STATIC_TOKEN" },
  accountableName: `Named ${who}`,
});

// Two databases: the country's and the control plane's.
let country: MigratedDatabase;
let controlPlane: MigratedDatabase;
let countryApi: Database;
let controlPlaneApi: Database;
let countryServer: Server;
let controlPlaneServer: Server;
let countryBase = "";
let platformBase = "";

async function serve(harness: MigratedDatabase, authenticator: StaticTokenAuthenticator): Promise<{ db: Database; server: Server; base: string }> {
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  const db = await connectDatabase(harness.configFor(role.user, role.password));
  const server = createApiServer({ routes: keyRegistryRoutes(authenticator), authenticator, db });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { db, server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

before(async () => {
  country = await createMigratedDatabase();
  controlPlane = await createMigratedDatabase();
  const cp = await serve(controlPlane, StaticTokenAuthenticator.fromConfig({ actors: [entry("platform-owner", ["KEY_REGISTRAR"])] }, { controlPlane: true }));
  controlPlaneApi = cp.db; controlPlaneServer = cp.server; platformBase = cp.base;
  const th = await serve(country, StaticTokenAuthenticator.fromConfig({
    actors: [
      entry("representative", ["KEY_REGISTRAR"]),
      entry("dual", ["KEY_REGISTRAR", "KEY_SECURITY_OFFICER"]),
      entry("security", ["KEY_SECURITY_OFFICER"]),
      entry("officer", []),
      entry("officer-3", []),
      entry("bystander", []),
    ],
  }, { issuerCountry: "TH" }));
  countryApi = th.db; countryServer = th.server; countryBase = th.base;
});

after(async () => {
  await new Promise<void>((r) => countryServer.close(() => r()));
  await countryApi?.close();
  await country?.drop();
  if (controlPlaneServer.listening) await new Promise<void>((r) => controlPlaneServer.close(() => r()));
  await controlPlaneApi?.close().catch(() => undefined);
  await controlPlane?.drop().catch(() => undefined);
});

interface Reply { status: number; json: Record<string, unknown> }
async function call(base: string, who: string, method: string, path: string, body?: unknown): Promise<Reply> {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${token(who)}`, ...(body === undefined ? {} : { "content-type": "application/json", "idempotency-key": `key-compromise-${randomUUID()}` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}
async function ok(p: Promise<Reply>, status = 201): Promise<Record<string, unknown>> {
  const r = await p;
  assert.equal(r.status, status, JSON.stringify(r.json));
  return status === 200 ? r.json : (r.json["decision"] as Record<string, unknown>);
}
async function refused(p: Promise<Reply>, status: number, error: string): Promise<void> {
  const r = await p;
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error, JSON.stringify(r.json));
}

interface Challenge { challengeId: string; keyId: string; nonce: string }
async function challenge(base: string, who: string, purpose: string, actorId: string): Promise<Challenge> {
  const d = await ok(call(base, who, "POST", "/aab/v1/key-registration-challenges", { purpose, actorId }));
  return { challengeId: d["challengeId"] as string, keyId: d["keyId"] as string, nonce: d["nonce"] as string };
}
function possession(issuer: Issuer, actorId: string, c: Challenge, key: Key) {
  const statement = { statementType: "SIGNING_KEY_POSSESSION", keyId: c.keyId, actorId, issuer, publicKeyDigest: publicKeyDigestOf(key.publicKey), challengeId: c.challengeId, nonce: c.nonce };
  return { possessionStatement: statement, possessionSignature: signed(key, statement) };
}
function registration(issuer: Issuer, actorId: string, c: Challenge, key: Key, authority: string, authorityKey: Key, authorityKeyId: string) {
  const statement = {
    statementType: "SIGNING_KEY_REGISTRATION", keyId: c.keyId, actorId, issuer, publicKeyDigest: publicKeyDigestOf(key.publicKey), algorithm: "Ed25519",
    challengeId: c.challengeId, signingKeyId: authorityKeyId, registrationAuthority: { issuer, actorId: authority },
  };
  return { registrationStatement: statement, registrationSignature: signed(authorityKey, statement) };
}
const record = (who: string[]) => ({ present: who, procedure: "Key generated offline; public key compared aloud.", performedAt: new Date().toISOString() });

// ── Shared state, in test order ───────────────────────────────────────────────

const po = newKey();
const attestation = newKey();
const ATTESTATION_KEY_ID = "control-plane-attestation-1";
let poKeyId = "";
const rep = newKey();
let repKeyId = "";
let ceremonyId = "";
const keys: Record<string, { key: Key; keyId: string }> = {};

async function registerCountryKey(actorId: string, by = "representative", byKey = rep, byKeyId = repKeyId): Promise<string> {
  const k = newKey();
  const c = await challenge(countryBase, by, "REGISTRATION", actorId);
  const d = await ok(call(countryBase, by, "POST", "/aab/v1/signing-keys", {
    publicKey: k.publicKey, ...possession(TH, actorId, c, k), ...registration(TH, actorId, c, k, by, byKey, byKeyId),
  }));
  keys[actorId] = { key: k, keyId: d["keyId"] as string };
  return d["keyId"] as string;
}

test("setup: the Platform Owner's registry and Thailand's, bootstrapped in their own databases", async () => {
  const pc = await challenge(platformBase, "platform-owner", "BOOTSTRAP", "platform-owner");
  const pcs = {
    statementType: "KEY_BOOTSTRAP_CEREMONY", registry: PLATFORM, holder: { issuer: PLATFORM, actorId: "platform-owner" },
    keyId: pc.keyId, challengeId: pc.challengeId, publicKeyDigest: publicKeyDigestOf(po.publicKey), record: record(["Platform Owner"]),
    declaredAttestationKey: { attestationKeyId: ATTESTATION_KEY_ID, publicKey: attestation.publicKey },
  };
  poKeyId = (await ok(call(platformBase, "platform-owner", "POST", "/aab/v1/key-bootstrap-ceremonies", {
    publicKey: po.publicKey, ...possession(PLATFORM, "platform-owner", pc, po), ...registration(PLATFORM, "platform-owner", pc, po, "platform-owner", po, pc.keyId),
    ceremonyStatement: pcs, holderSignature: signed(po, pcs),
  })))["keyId"] as string;

  const read = await ok(call(platformBase, "platform-owner", "GET", `/aab/v1/signing-keys/${poKeyId}`), 200);
  const base = { issuer: PLATFORM, keyId: poKeyId, registration: read["registration"], eventsAtAcceptance: read["events"], compromisedAtAcceptance: false, attestedAt: new Date().toISOString(), attestationKeyId: ATTESTATION_KEY_ID };
  const evidence = { ...base, attestation: signed(attestation, attestedContent({ ...base, attestation: "" } as never)) };

  const cc = await challenge(countryBase, "representative", "BOOTSTRAP", "representative");
  const ccs = {
    statementType: "KEY_BOOTSTRAP_CEREMONY", registry: TH, holder: { issuer: TH, actorId: "representative" },
    keyId: cc.keyId, challengeId: cc.challengeId, publicKeyDigest: publicKeyDigestOf(rep.publicKey), record: record(["Country representative", "Platform Owner"]),
    pinnedAttestationKey: { attestationKeyId: ATTESTATION_KEY_ID, publicKey: attestation.publicKey },
    cosigner: { actor: { issuer: PLATFORM, actorId: "platform-owner" }, accountableName: "Named platform-owner", signingKeyId: poKeyId },
  };
  const d = await ok(call(countryBase, "representative", "POST", "/aab/v1/key-bootstrap-ceremonies", {
    publicKey: rep.publicKey, ...possession(TH, "representative", cc, rep), ...registration(TH, "representative", cc, rep, "representative", rep, cc.keyId),
    ceremonyStatement: ccs, holderSignature: signed(rep, ccs), cosignature: signed(po, ccs), cosignerKeyEvidence: evidence,
  }));
  repKeyId = d["keyId"] as string;
  ceremonyId = d["ceremonyId"] as string;
  for (const who of ["dual", "security", "officer"]) await registerCountryKey(who);
  // the country's database holds no control-plane key registration, only the evidence
  assert.equal((await country.admin.query("SELECT count(*)::int AS n FROM scs.signing_key_registration WHERE issuer_type = 'PLATFORM_CONTROL_PLANE'")).rows[0]!["n"], 0);
});

// ── Compromise, in this registry ──────────────────────────────────────────────

function compromiseStatement(keyId: string, by: string, o: { from?: string; signingKeyId?: string } = {}) {
  return {
    statementType: "SIGNING_KEY_COMPROMISE", keyId, exposureBasis: "Laptop left unattended at a conference", evidence: [{ description: "Incident report", digest: digest(`incident-${keyId}-${by}`) }],
    declaredBy: { issuer: TH, actorId: by }, ...(o.from === undefined ? {} : { suspectedExposureFrom: o.from }), ...(o.signingKeyId === undefined ? {} : { signingKeyId: o.signingKeyId }),
  };
}
const compromise = (who: string, keyId: string, statement: Record<string, unknown>, signer?: Key) =>
  call(countryBase, who, "POST", `/aab/v1/signing-keys/${keyId}/compromises`, { compromiseStatement: statement, ...(signer === undefined ? {} : { statementSignature: signed(signer, statement) }) });

test("compromise: the holder declares unsigned; anyone else signs with their own key, never the compromised one", async () => {
  const officer = keys["officer"]!;
  const dual = keys["dual"]!;
  await refused(compromise("bystander", officer.keyId, compromiseStatement(officer.keyId, "bystander")), 403, "KEY_COMPROMISE_NOT_AUTHORISED");
  await refused(compromise("dual", officer.keyId, compromiseStatement(officer.keyId, "dual")), 422, "KEY_SIGNATURE_INVALID");
  await refused(compromise("dual", officer.keyId, compromiseStatement(officer.keyId, "dual", { signingKeyId: officer.keyId }), officer.key), 422, "KEY_SIGNATURE_INVALID");
  await refused(compromise("officer", officer.keyId, compromiseStatement(officer.keyId, "officer", { from: "2020-01-01T00:00:00.000Z" })), 422, "KEY_EXPOSURE_INVALID");
  await refused(compromise("officer", officer.keyId, compromiseStatement(officer.keyId, "officer", { from: new Date(Date.now() + 3_600_000).toISOString() })), 422, "KEY_EXPOSURE_INVALID");

  const first = await ok(compromise("officer", officer.keyId, compromiseStatement(officer.keyId, "officer", { from: new Date().toISOString() })));
  assert.equal(first["declarationSigned"], false);
  const firstWindow = first["exposureWindow"] as { from: string; until: string };
  const widened = await ok(compromise("dual", officer.keyId, compromiseStatement(officer.keyId, "dual", { signingKeyId: dual.keyId }), dual.key));
  assert.equal(widened["declarationSigned"], true);
  const w = widened["exposureWindow"] as { from: string; until: string };
  assert.ok(Date.parse(w.from) < Date.parse(firstWindow.from), "an unknown start widens the window to the key's whole life");
  assert.equal(w.until, firstWindow.until, "the window ends at the first compromise record");
  const read = await ok(call(countryBase, "officer", "GET", `/aab/v1/signing-keys/${officer.keyId}`), 200);
  assert.equal(read["currentState"], "COMPROMISED");
});

// ── Assessment ────────────────────────────────────────────────────────────────

async function assess(who: string, table: string, recordId: string, outcome = "AFFIRM", byKey = keys[who]!): Promise<Reply> {
  const statement = {
    statementType: "KEY_COMPROMISE_ASSESSMENT", recordTable: table, recordId, outcome, reasons: "Confirmed with the signer in person",
    evidenceConsidered: [{ description: "Meeting note", digest: digest(`note-${recordId}`) }], signingKeyId: byKey.keyId, assessedBy: { issuer: TH, actorId: who },
  };
  return call(countryBase, who, "POST", "/aab/v1/key-compromise-assessments", { assessmentStatement: statement, statementSignature: signed(byKey.key, statement) });
}

test("assessment: a record signed with a compromised key, inside the window, by a security officer who is not its holder, once", async () => {
  const dual = keys["dual"]!;
  const officer3 = await registerCountryKey("officer-3", "dual", dual.key, dual.keyId); // a registration signed with dual's key
  await ok(compromise("dual", dual.keyId, compromiseStatement(dual.keyId, "dual")));    // dual's key: whole life
  const reader = (fn: (r: ReturnType<typeof keyRegistryReader>) => Promise<unknown>) => countryApi.transaction((tx) => fn(keyRegistryReader(tx)));

  await refused(assess("bystander", "signing_key_registration", officer3, "AFFIRM", keys["security"]), 403, "KEY_ASSESSOR_NOT_AUTHORISED"); // no role: refused before any signature
  await refused(assess("dual", "signing_key_registration", officer3), 403, "KEY_ASSESSOR_NOT_AUTHORISED");
  await refused(assess("security", "signing_key_registration", randomUUID()), 404, "KEY_RECORD_NOT_FOUND");
  await refused(assess("security", "signing_key_registration", keys["security"]!.keyId), 409, "KEY_RECORD_NOT_UNDER_REVIEW");
  const d = await ok(assess("security", "signing_key_registration", officer3, "REPUDIATE"));
  assert.equal(d["resultingVerification"], "REPUDIATED");
  assert.equal(await reader((r) => r.assessmentOf("signing_key_registration", officer3)), "REPUDIATE");
  await refused(assess("security", "signing_key_registration", officer3, "AFFIRM"), 409, "KEY_RECORD_ALREADY_ASSESSED");
  const kept = (await country.admin.query("SELECT count(*)::int AS n FROM scs.signing_key_registration WHERE key_id = $1", [officer3])).rows[0]!["n"];
  assert.equal(kept, 1, "a repudiated record is never removed");
});

// ── Another issuer: the notice, and the proof with the control plane gone ─────

let notice: Record<string, unknown> = {};

test("the Platform Owner's key is compromised in the control plane; the notice is attested offline", async () => {
  const d = await ok(call(platformBase, "platform-owner", "POST", `/aab/v1/signing-keys/${poKeyId}/compromises`, {
    compromiseStatement: {
      statementType: "SIGNING_KEY_COMPROMISE", keyId: poKeyId, exposureBasis: "Unknown: the device was lost", evidence: [],
      declaredBy: { issuer: PLATFORM, actorId: "platform-owner" },
    },
  }));
  const w = d["exposureWindow"] as { from: string; until: string };
  notice = { issuer: PLATFORM, keyId: poKeyId, actorId: "platform-owner", suspectedExposureFrom: w.from, recordedAt: w.until, attestedAt: new Date().toISOString(), attestationKeyId: ATTESTATION_KEY_ID };
});

test("cross-issuer: with the control plane stopped and its database dropped, the country verifies its ceremony, records the notice, and assesses", async () => {
  await new Promise<void>((r) => controlPlaneServer.close(() => r()));
  await controlPlaneApi.close();
  await controlPlane.drop();

  const verifyCosignature = () => countryApi.transaction(async (tx) => {
    const row = (await tx.query<{ ceremony_record: unknown; cosignature: string; recorded_at: Date }>(
      "SELECT ceremony_record, cosignature, recorded_at FROM scs.key_bootstrap_ceremony WHERE ceremony_id = $1", [ceremonyId])).rows[0]!;
    const reader = keyRegistryReader(tx);
    const key = await reader.foreignKeyHistory("key_bootstrap_ceremony", ceremonyId, poKeyId);
    const assessment = await reader.assessmentOf("key_bootstrap_ceremony", ceremonyId);
    return verifySignedRecord({
      record: { statement: row.ceremony_record, signature: row.cosignature, signer: { issuer: PLATFORM, actorId: "platform-owner" }, acceptedAt: row.recorded_at.toISOString() },
      key, ...(assessment === undefined ? {} : { assessment }),
    }).result;
  });
  assert.equal(await verifyCosignature(), "VERIFIED", "verified from the evidence the country holds, with the control plane gone");

  await refused(call(countryBase, "officer-3", "POST", "/aab/v1/key-compromise-notices", { notice, attestation: signed(attestation, notice) }), 403, "KEY_NOTICE_NOT_AUTHORISED");
  await refused(call(countryBase, "security", "POST", "/aab/v1/key-compromise-notices", { notice, attestation: signed(newKey(), notice) }), 422, "KEY_NOTICE_INVALID");
  const unpinned = { ...notice, attestationKeyId: "not-pinned" };
  await refused(call(countryBase, "security", "POST", "/aab/v1/key-compromise-notices", { notice: unpinned, attestation: signed(attestation, unpinned) }), 422, "KEY_NOTICE_INVALID");
  const own = { ...notice, issuer: TH };
  await refused(call(countryBase, "security", "POST", "/aab/v1/key-compromise-notices", { notice: own, attestation: signed(attestation, own) }), 422, "KEY_ISSUER_MISMATCH");

  await ok(call(countryBase, "security", "POST", "/aab/v1/key-compromise-notices", { notice, attestation: signed(attestation, notice) }));
  assert.equal(await verifyCosignature(), "UNDER_COMPROMISE_REVIEW", "the notice puts the country's own record under review");

  await ok(assess("security", "key_bootstrap_ceremony", ceremonyId, "AFFIRM"));
  assert.equal(await verifyCosignature(), "AFFIRMED_AFTER_COMPROMISE");
});
