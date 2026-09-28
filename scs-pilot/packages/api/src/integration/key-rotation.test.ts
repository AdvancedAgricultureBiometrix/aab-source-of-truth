// AAB-PLATFORM-09 section 11, rotation: through real HTTP, with Ed25519 keys
// registered in the public-key registry and signing outside the server.
//   - a record signed with a key later retired still verifies, and the link
//     it created stays usable;
//   - a new signature with a retired key is refused, whatever date its
//     statement claims;
//   - rotation by a replacing registration retires the old key at the new
//     key's activeFrom; retirement by an event, with no replacement, leaves the
//     holder with no key until a new one is registered.
// That a rotated key's link can still be acted under is proven end to end by
// "check 2, the link, and signing-key history" (representative-submission.test.ts).

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { verifyLinkSignature } from "../platform/key-registry/signed-records.js";
import { keyRegistryReader } from "../platform/key-registry/store.js";
import { keyRegistryRoutes } from "../platform/key-registry/routes.js";
import type { ActorSubjectLink } from "../types/platform.js";
import { partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";
import { bootstrapCountryRegistry, keyRegistrarEntry, registerTestKey, signWith, type TestKey } from "./signing-keys.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const REGISTRAR_TOKEN = "rotation-key-registrar-token-0123456789ab";
const token = (who: string) => `rotation-${who}-token-0123456789abcdefghij`;
const actor = (who: string, roles: string[]) => ({
  tokenSha256: createHash("sha256").update(token(who)).digest("hex"),
  actor: { actorId: `${who}-rotation`, actorType: "HUMAN", roles, authenticationMethod: "STATIC_TOKEN" },
  accountableName: `Named ${who}`,
});

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
const registry = { base: "", token: () => REGISTRAR_TOKEN, issuer: TH };
let registrar: TestKey;
let party = "";

interface Res { status: number; json: Record<string, unknown>; text: string }
async function call(method: "GET" | "POST", path: string, body: unknown, who: string): Promise<Res> {
  const headers: Record<string, string> = { authorization: `Bearer ${who === "registrar" ? REGISTRAR_TOKEN : token(who)}` };
  if (method === "POST") Object.assign(headers, { "content-type": "application/json", "idempotency-key": `rotation-${randomUUID()}` });
  const res = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const auth = StaticTokenAuthenticator.fromConfig({
    actors: [keyRegistrarEntry(createHash("sha256").update(REGISTRAR_TOKEN).digest("hex")), actor("officer", ["COMPLIANCE_OFFICER"]), actor("linker", ["LINK_OFFICER"]), actor("staff", [])],
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: [...capabilityRoutes(auth), ...keyRegistryRoutes(auth)], authenticator: auth, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = registry.base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  registrar = await bootstrapCountryRegistry(registry);
  const p = await call("POST", "/scs/v1/parties", partyRequest("COOPERATIVE"), "officer");
  assert.equal(p.status, 201, p.text);
  party = (p.json["decision"] as { partyId: string }).partyId;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, '{"actorId":"test"}')`,
    [sha],
  );
  return sha;
}

/** A version 2 link statement for staff, to the party, signed by the linker with `key`. */
async function postLink(key: TestKey, validFrom = new Date(Date.now() - 60_000).toISOString(), supersedesLinkId?: string): Promise<Res> {
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: "staff-rotation" }, subject: { domain: "SCS", subjectType: "PARTY", subjectId: party },
    relation: "ACTS_FOR_SUBJECT", validFrom, validUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: await storedObject(), description: "Letter of authority" }],
    ...(supersedesLinkId === undefined ? {} : { supersedesLinkId }),
    creator: { issuer: TH, actorId: "linker-rotation" }, statementVersion: "2", signingKeyId: key.keyId,
  };
  return call("POST", "/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signWith(key.privateKey, statement) }, "linker");
}

async function postStatus(key: TestKey, link: { linkId: string; linkDigest: string }, action: string): Promise<Res> {
  const statusStatement = {
    statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: link.linkId, linkDigest: link.linkDigest, action, reason: `${action} in the rotation test.`,
    writer: { issuer: TH, actorId: "linker-rotation" }, statementVersion: "2", signingKeyId: key.keyId,
  };
  return call("POST", `/scs/v1/actor-party-links/${link.linkId}/status-records`, { statusStatement, statementSignature: signWith(key.privateKey, statusStatement) }, "linker");
}

const verified = async (linkId: string) => {
  const read = await call("GET", `/scs/v1/actor-party-links/${linkId}`, undefined, "linker");
  return api.transaction((tx) => verifyLinkSignature(keyRegistryReader(tx), read.json["link"] as ActorSubjectLink));
};
const keyRead = async (keyId: string) => (await call("GET", `/aab/v1/signing-keys/${keyId}`, undefined, "registrar")).json;

let first: TestKey;
let second: TestKey;
let linkA = { linkId: "", linkDigest: "" };
let linkB = { linkId: "", linkDigest: "" };

test("rotation by a replacing registration: the old key retires at the new key's activeFrom, and what it signed still verifies", async () => {
  first = await registerTestKey(registry, registrar, "linker-rotation");
  const a = await postLink(first);
  assert.equal(a.status, 201, a.text);
  linkA = { linkId: (a.json["decision"] as { linkId: string }).linkId, linkDigest: (a.json["decision"] as { linkDigest: string }).linkDigest };
  assert.equal((await verified(linkA.linkId)).result, "VERIFIED");

  second = await registerTestKey(registry, registrar, "linker-rotation", { replaces: first.keyId });
  const old = await keyRead(first.keyId);
  const next = await keyRead(second.keyId);
  assert.equal(old["currentState"], "RETIRED");
  assert.equal(old["retiredAt"], (next["registration"] as { activeFrom: string }).activeFrom, "retired exactly as its replacement becomes active");
  assert.equal(next["currentState"], "ACTIVE");

  const after = await verified(linkA.linkId);
  assert.equal(after.result, "VERIFIED", `verified against the retired key, as at the link's createdAt: ${after.reason ?? ""}`);
  // the link stays usable: its creator's new key writes a status record on it
  assert.equal((await postStatus(second, linkA, "SUSPEND")).status, 201);
  assert.equal((await postStatus(second, linkA, "REINSTATE")).status, 201);
  assert.equal((await call("GET", `/scs/v1/actor-party-links/${linkA.linkId}`, undefined, "linker")).json["currentState"], "ACTIVE");
});

test("a new signature with a retired key is refused, whatever date its statement claims", async () => {
  const claimsEarlier = await postLink(first, new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), linkA.linkId);
  assert.equal(claimsEarlier.status, 422, claimsEarlier.text);
  assert.equal(claimsEarlier.json["error"], "LINK_SIGNATURE_INVALID");
  assert.match((claimsEarlier.json["reasons"] as string[])[0]!, /was RETIRED when the record was accepted/);
  const status = await postStatus(first, linkA, "SUSPEND");
  assert.equal(status.status, 422, status.text);
  assert.match((status.json["reasons"] as string[])[0]!, /was RETIRED/);
  // the same, signed with the key in use, is accepted (and supersedes link A)
  const b = await postLink(second, undefined, linkA.linkId);
  assert.equal(b.status, 201, b.text);
  linkB = { linkId: (b.json["decision"] as { linkId: string }).linkId, linkDigest: (b.json["decision"] as { linkDigest: string }).linkDigest };
});

test("retirement by an event, with no replacement: the holder has no key until a new one is registered", async () => {
  const retire = { statementType: "SIGNING_KEY_EVENT", keyId: second.keyId, eventType: "RETIRED", reason: "Leaving the post", signingKeyId: second.keyId, recordedBy: { issuer: TH, actorId: "linker-rotation" } };
  const r = await call("POST", `/aab/v1/signing-keys/${second.keyId}/events`, { eventStatement: retire, statementSignature: signWith(second.privateKey, retire) }, "linker");
  assert.equal(r.status, 201, r.text);
  assert.equal((await keyRead(second.keyId))["currentState"], "RETIRED");
  const refused = await postStatus(second, linkB, "SUSPEND");
  assert.equal(refused.status, 422, refused.text);
  assert.match((refused.json["reasons"] as string[])[0]!, /was RETIRED/);
  const third = await registerTestKey(registry, registrar, "linker-rotation"); // no key in use: nothing to replace
  assert.equal((await keyRead(third.keyId))["currentState"], "ACTIVE");
  assert.equal((await postStatus(third, linkB, "SUSPEND")).status, 201, "the new key acts on the link the retired one signed");
  assert.equal((await verified(linkA.linkId)).result, "VERIFIED", "link A still verifies against the first key");
  assert.equal((await verified(linkB.linkId)).result, "VERIFIED", "link B still verifies against the second key, retired by its event");
});
