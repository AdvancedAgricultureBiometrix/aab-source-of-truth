// AAB-PLATFORM-09 section 11, compromise: the exposure window, end to end,
// over real links, through real HTTP. A record accepted before the window is
// unaffected; one accepted inside it is UNDER_COMPROMISE_REVIEW; a later
// declaration with a later start narrows nothing; one with no start widens the
// window to the key's whole life, moving the earlier record into review; an
// assessment decides a record without removing it, and a repudiated record is
// reported apart from one that does not verify.
// That a record under review fails closed where its authority is required is
// proven end to end by "check 2, the link, and signing-key history"
// (representative-submission.test.ts); the registry's own compromise and
// assessment rules by key-registry-compromise.test.ts.

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
import { keyRegistrarEntry, registerTestKeys, signWith, type TestKey } from "./signing-keys.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const REGISTRAR_TOKEN = "window-key-registrar-token-0123456789abcd";
const token = (who: string) => `window-${who}-token-0123456789abcdefghijk`;
const actor = (who: string, roles: string[]) => ({
  tokenSha256: createHash("sha256").update(token(who)).digest("hex"),
  actor: { actorId: `${who}-window`, actorType: "HUMAN", roles, authenticationMethod: "STATIC_TOKEN" },
  accountableName: `Named ${who}`,
});
const digest = (s: string) => `sha256:${createHash("sha256").update(s).digest("hex")}`;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let keys: Record<"linker-window" | "security-window", TestKey>;
const parties: string[] = [];

interface Res { status: number; json: Record<string, unknown>; text: string }
async function call(method: "GET" | "POST", path: string, body: unknown, who: string): Promise<Res> {
  const headers: Record<string, string> = { authorization: `Bearer ${who === "registrar" ? REGISTRAR_TOKEN : token(who)}` };
  if (method === "POST") Object.assign(headers, { "content-type": "application/json", "idempotency-key": `window-${randomUUID()}` });
  const res = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const auth = StaticTokenAuthenticator.fromConfig({
    actors: [
      keyRegistrarEntry(createHash("sha256").update(REGISTRAR_TOKEN).digest("hex")),
      actor("officer", ["COMPLIANCE_OFFICER"]), actor("linker", ["LINK_OFFICER"]), actor("security", ["KEY_SECURITY_OFFICER"]), actor("staff", []),
    ],
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: [...capabilityRoutes(auth), ...keyRegistryRoutes(auth)], authenticator: auth, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  ({ keys } = await registerTestKeys({ base, token: () => REGISTRAR_TOKEN, issuer: TH }, ["linker-window", "security-window"] as const));
  for (let i = 0; i < 2; i += 1) {
    const p = await call("POST", "/scs/v1/parties", partyRequest("COOPERATIVE"), "officer");
    assert.equal(p.status, 201, p.text);
    parties.push((p.json["decision"] as { partyId: string }).partyId);
  }
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

/** A version 2 link for staff to `party`, signed by the linker. */
async function link(party: string): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, '{"actorId":"test"}')`,
    [sha],
  );
  const key = keys["linker-window"];
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: "staff-window" }, subject: { domain: "SCS", subjectType: "PARTY", subjectId: party },
    relation: "ACTS_FOR_SUBJECT", validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: sha, description: "Letter of authority" }],
    creator: { issuer: TH, actorId: "linker-window" }, statementVersion: "2", signingKeyId: key.keyId,
  };
  const r = await call("POST", "/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signWith(key.privateKey, statement) }, "linker");
  assert.equal(r.status, 201, r.text);
  return (r.json["decision"] as { linkId: string }).linkId;
}

const result = async (linkId: string) => {
  const read = await call("GET", `/scs/v1/actor-party-links/${linkId}`, undefined, "linker");
  return (await api.transaction((tx) => verifyLinkSignature(keyRegistryReader(tx), read.json["link"] as ActorSubjectLink))).result;
};

/** The link officer declares their own key compromised, unsigned (AAB-PLATFORM-09, second amendment). */
async function declare(from?: string): Promise<{ from: string; until: string }> {
  const keyId = keys["linker-window"].keyId;
  const compromiseStatement = {
    statementType: "SIGNING_KEY_COMPROMISE", keyId, exposureBasis: "Laptop stolen", evidence: [{ description: "Police report", digest: digest(`report-${randomUUID()}`) }],
    declaredBy: { issuer: TH, actorId: "linker-window" }, ...(from === undefined ? {} : { suspectedExposureFrom: from }),
  };
  const r = await call("POST", `/aab/v1/signing-keys/${keyId}/compromises`, { compromiseStatement }, "linker");
  assert.equal(r.status, 201, r.text);
  return (r.json["decision"] as { exposureWindow: { from: string; until: string } }).exposureWindow;
}

const pause = () => new Promise((r) => setTimeout(r, 50));
let before_ = "";
let inside = "";

test("a known start: a record accepted before the window is unaffected; one accepted inside it is under review", async () => {
  before_ = await link(parties[0]!);
  await pause();
  const start = new Date().toISOString();
  await pause();
  inside = await link(parties[1]!);
  const window = await declare(start);
  assert.equal(window.from, start);
  assert.equal(await result(before_), "VERIFIED", "accepted before the suspected start");
  assert.equal(await result(inside), "UNDER_COMPROMISE_REVIEW", "accepted inside the window, and not yet assessed");
});

test("a later start narrows nothing; an unknown start widens the window to the key's whole life", async () => {
  const unchanged = await declare(new Date().toISOString());
  assert.ok(Date.parse(unchanged.from) < Date.parse(unchanged.until));
  assert.equal(await result(before_), "VERIFIED", "a later suspected start does not narrow the window, nor move it");
  assert.equal(await result(inside), "UNDER_COMPROMISE_REVIEW");
  const widened = await declare();
  const activeFrom = ((await call("GET", `/aab/v1/signing-keys/${keys["linker-window"].keyId}`, undefined, "registrar")).json["registration"] as { activeFrom: string }).activeFrom;
  assert.equal(widened.from, activeFrom, "an unknown start: from the key's activeFrom");
  assert.equal(widened.until, unchanged.until, "the window still ends at the first compromise record");
  assert.equal(await result(before_), "UNDER_COMPROMISE_REVIEW", "widened: the earlier record is now inside the window");
});

test("an assessment decides a record without removing it; a repudiated record is reported apart from one that does not verify", async () => {
  const security = keys["security-window"];
  const assess = async (recordId: string, outcome: "AFFIRM" | "REPUDIATE") => {
    const assessmentStatement = {
      statementType: "KEY_COMPROMISE_ASSESSMENT", recordTable: "actor_party_link", recordId, outcome, reasons: `${outcome} after speaking to the signer in person`,
      evidenceConsidered: [{ description: "Meeting note", digest: digest(`note-${recordId}`) }], signingKeyId: security.keyId, assessedBy: { issuer: TH, actorId: "security-window" },
    };
    const r = await call("POST", "/aab/v1/key-compromise-assessments", { assessmentStatement, statementSignature: signWith(security.privateKey, assessmentStatement) }, "security");
    assert.equal(r.status, 201, r.text);
  };
  await assess(before_, "AFFIRM");
  await assess(inside, "REPUDIATE");
  assert.equal(await result(before_), "AFFIRMED_AFTER_COMPROMISE");
  assert.equal(await result(inside), "REPUDIATED");
  for (const id of [before_, inside]) assert.equal((await call("GET", `/scs/v1/actor-party-links/${id}`, undefined, "linker")).status, 200, "neither record is removed");
  // the repudiated record, its statement altered: its signature no longer verifies, which is NOT_VERIFIABLE, not REPUDIATED
  const read = (await call("GET", `/scs/v1/actor-party-links/${inside}`, undefined, "linker")).json["link"] as ActorSubjectLink;
  const altered = { ...read, linkStatement: { ...read.linkStatement, relation: "IS_SUBJECT" } } as ActorSubjectLink;
  assert.equal((await api.transaction((tx) => verifyLinkSignature(keyRegistryReader(tx), altered))).result, "NOT_VERIFIABLE");
});
