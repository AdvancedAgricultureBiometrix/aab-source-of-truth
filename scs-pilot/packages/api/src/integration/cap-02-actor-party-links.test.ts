// SCS-CAP-02 actor–party links (AAB-PLATFORM-04), end to end through the
// API: createActorPartyLink, recordActorPartyLinkStatus and getActorPartyLink.
// Every statement is signed as a person would sign it, outside the server,
// with a throwaway Ed25519 key generated for this run; the server holds only
// the public keys, from the actors file.
//
// Parties are registered through the API first; the actors file is then
// loaded with the subject grants that name them.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { isIntact, linkIntegrity, statusRecordIntegrity } from "../platform/actor-subject-links/links.js";
import { keyRegistryRoutes } from "../platform/key-registry/routes.js";
import { verifyLinkSignature, verifyStatusSignature } from "../platform/key-registry/signed-records.js";
import { keyRegistryReader } from "../platform/key-registry/store.js";
import { bootstrapCountryRegistry, keyRegistrarEntry, newKeyPair, registerTestKey, signWith, type TestKey } from "./signing-keys.js";
import type { ActorSubjectLink, ActorSubjectLinkStatement, ActorSubjectLinkStatusRecord } from "../types/platform.js";
import { issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const WHO = ["officer", "linker", "linker2", "verifier", "staff", "staff2", "person", "person2", "authority", "authorityElsewhere", "nokey", "noname", "service"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = {
  officer: ["COMPLIANCE_OFFICER"], linker: ["LINK_OFFICER"], linker2: ["LINK_OFFICER"], verifier: ["LINK_OFFICER", "VERIFICATION_OFFICER"],
  staff: [], staff2: [], person: [], person2: [], authority: [], authorityElsewhere: [], nokey: ["LINK_OFFICER"], noname: ["LINK_OFFICER"], service: ["LINK_OFFICER"],
};
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-links`, actorType: w === "service" ? "SERVICE" : "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `links-${w}-token-0123456789abcdefghijklmn`;
const ref = (w: Who) => ({ issuer: TH, actorId: actors[w].actorId });
const REGISTRAR_TOKEN = "links-key-registrar-token-0123456789abcdef";
/** Actors with no key in the public-key registry: nokey by design; noname and service cannot hold one (the registry names HUMAN holders). */
const UNREGISTERED: readonly Who[] = ["nokey", "noname", "service"];
/** Each actor's key: registered in the public-key registry (AAB-PLATFORM-09) before the tests run, or, for UNREGISTERED, a key the registry does not know. */
const keys = {} as Record<Who, TestKey>;
/** Names w's key on a statement, making it version 2 (AAB-PLATFORM-04, third amendment). */
const nameKey = (w: Who, statement: object) => Object.assign(statement, { statementVersion: "2", signingKeyId: keys[w].keyId });
/** Signs a statement as version 2 with w's key. */
const signAs = (w: Who, statement: object) => signWith(keys[w].privateKey, nameKey(w, statement));
/** Verifies records' signatures against the registry, as at their acceptance. */
const verifiedLink = (link: ActorSubjectLink) => api.transaction((tx) => verifyLinkSignature(keyRegistryReader(tx), link));
const verifiedStatus = (r: ActorSubjectLinkStatusRecord) => api.transaction((tx) => verifyStatusSignature(keyRegistryReader(tx), r));

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let authenticator: StaticTokenAuthenticator;
const parties = { person: "", person2: "", coop: "", coop2: "", retired: "" };
/** staff's ACTS_FOR_SUBJECT link to coop, created by the first test and relied on by later ones. */
let staffCoop = { linkId: "", linkDigest: "" };

interface Res { status: number; json: Record<string, unknown>; text: string }

async function call(method: "GET" | "POST", path: string, body?: unknown, opts: { who?: Who; key?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = { authorization: `Bearer ${token(opts.who ?? "linker")}` };
  if (method === "POST") {
    headers["content-type"] = "application/json";
    headers["idempotency-key"] = opts.key ?? `links-${randomUUID()}`;
  }
  const res = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

async function listen(auth: StaticTokenAuthenticator): Promise<void> {
  server = createApiServer({ routes: [...capabilityRoutes(auth), ...keyRegistryRoutes(auth)], authenticator: auth, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  // 1. register the parties, as a compliance officer
  await listen(StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(token("officer")).digest("hex"), actor: actors.officer }] }, TH_OPTS));
  const register = async (type: "NATURAL_PERSON" | "COOPERATIVE" | "LEGAL_ENTITY") => {
    const r = await call("POST", "/scs/v1/parties", partyRequest(type), { who: "officer" });
    assert.equal(r.status, 201, r.text);
    return (r.json["decision"] as { partyId: string }).partyId;
  };
  parties.person = await register("NATURAL_PERSON");
  parties.person2 = await register("NATURAL_PERSON");
  parties.coop = await register("COOPERATIVE");
  parties.coop2 = await register("COOPERATIVE");
  parties.retired = await register("LEGAL_ENTITY");
  await harness.admin.query(`UPDATE scs.party_identity SET registration_status = 'RETIRED' WHERE party_id = $1`, [parties.retired]);
  await new Promise<void>((r) => server.close(() => r()));
  // 2. every actor, with names and the party authority grants; keys are registered in the registry below
  authenticator = StaticTokenAuthenticator.fromConfig({
    actors: [keyRegistrarEntry(createHash("sha256").update(REGISTRAR_TOKEN).digest("hex")), ...WHO.map((w) => ({
      tokenSha256: createHash("sha256").update(token(w)).digest("hex"),
      actor: actors[w],
      ...(w === "service" || w === "noname" ? {} : { accountableName: `Named ${w}` }),
      ...(w === "authority" ? { subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: `SCS:PARTY:${parties.coop}` }] } : {}),
      ...(w === "authorityElsewhere" ? { subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: `SCS:PARTY:${parties.coop2}` }] } : {}),
    }))],
  }, TH_OPTS);
  await listen(authenticator);
  const registry = { base, token: () => REGISTRAR_TOKEN, issuer: TH };
  const registrar = await bootstrapCountryRegistry(registry);
  for (const w of WHO) keys[w] = UNREGISTERED.includes(w) ? { keyId: randomUUID(), ...newKeyPair() } : await registerTestKey(registry, registrar, actors[w].actorId);
});

const TH_OPTS = { issuerCountry: "TH" };

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, $2)`,
    [sha, JSON.stringify(actors.officer)],
  );
  return sha;
}

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const DAY = 24 * 60 * 60 * 1000;

interface LinkOpts {
  actor?: Who;
  party?: keyof typeof parties | string;
  relation?: "IS_SUBJECT" | "ACTS_FOR_SUBJECT";
  validFrom?: string;
  validUntil?: string;
  evidence?: Array<{ evidenceObjectSha256: string; description: string }>;
  supersedes?: string;
  creator?: Who;
  statement?: Partial<ActorSubjectLinkStatement>;
}

async function linkStatement(o: LinkOpts = {}): Promise<ActorSubjectLinkStatement> {
  const partyId = o.party === undefined ? parties.coop : (parties as Record<string, string>)[o.party] ?? o.party;
  const relation = o.relation ?? (partyId === parties.person || partyId === parties.person2 ? "IS_SUBJECT" : "ACTS_FOR_SUBJECT");
  return {
    statementType: "ACTOR_SUBJECT_LINK",
    actor: ref(o.actor ?? "staff"),
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: partyId },
    relation,
    validFrom: o.validFrom ?? iso(-60_000),
    validUntil: o.validUntil ?? iso(90 * DAY),
    authorisationEvidence: o.evidence ?? [{ evidenceObjectSha256: await storedObject(), description: "Letter of authority from the party, naming the actor" }],
    ...(o.supersedes === undefined ? {} : { supersedesLinkId: o.supersedes }),
    creator: ref(o.creator ?? "linker"),
    ...o.statement,
  };
}

/** POST a link; by default signed by the creator named in the statement, sent by the linker. */
async function postLink(o: LinkOpts = {}, send: { who?: Who; signer?: Who; signature?: string; key?: string } = {}): Promise<Res & { statement: ActorSubjectLinkStatement }> {
  const statement = await linkStatement(o);
  const signer = send.signer ?? o.creator ?? "linker";
  const signature = send.signature ?? signAs(signer, statement);
  nameKey(signer, statement);
  const r = await call("POST", "/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signature }, { who: send.who ?? o.creator ?? "linker", ...(send.key === undefined ? {} : { key: send.key }) });
  return { ...r, statement };
}

async function created(o: LinkOpts = {}, send: { who?: Who; signer?: Who } = {}): Promise<{ linkId: string; linkDigest: string }> {
  const r = await postLink(o, send);
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { linkId: string; linkDigest: string };
  return { linkId: d.linkId, linkDigest: d.linkDigest };
}

async function postStatus(link: { linkId: string; linkDigest: string }, action: "SUSPEND" | "REINSTATE" | "REVOKE", who: Who = "linker", o: { statement?: Record<string, unknown>; signer?: Who } = {}): Promise<Res> {
  const statusStatement = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: link.linkId, linkDigest: link.linkDigest, action, reason: `${action} for the test.`, writer: ref(who), ...o.statement };
  const statementSignature = signAs(o.signer ?? who, statusStatement);
  if (o.signer !== undefined) nameKey(who, statusStatement); // the statement names the writer's key; another person signed it
  return call("POST", `/scs/v1/actor-party-links/${link.linkId}/status-records`, { statusStatement, statementSignature }, { who });
}

const getLink = (linkId: string, who: Who = "officer") => call("GET", `/scs/v1/actor-party-links/${linkId}`, undefined, { who });
const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async () => ({
  links: await count("SELECT count(*) AS n FROM scs.actor_party_link"),
  statuses: await count("SELECT count(*) AS n FROM scs.actor_party_link_status"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt WHERE capability_id = 'SCS-CAP-02'"),
});

async function assertRefused(p: Promise<Res>, status: number, error: string): Promise<Res> {
  const before = await writes();
  const r = await p;
  assert.equal(r.status, status, r.text);
  assert.equal(r.json["error"], error, r.text);
  assert.deepEqual(await writes(), before, `${error}: nothing written`);
  return r;
}

// ── Creation ─────────────────────────────────────────────────────────────────

test("a signed link → 201 CREATED: every check true, the record digested as recorded, a receipt, and ACTIVE when read", async () => {
  const r = await postLink({ actor: "staff", party: "coop" });
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as Record<string, unknown>;
  assert.equal(d["decision"], "CREATED");
  assert.equal(d["partyId"], parties.coop);
  assert.ok(Object.values(d["eligibilityChecks"] as Record<string, boolean>).every((v) => v === true));
  assert.equal((d["eligibilityChecks"] as Record<string, boolean>)["statementSignatureVerified"], true);
  assert.deepEqual(d["decidedBy"], { ...issuedReference(actors.linker), accountableName: "Named linker" }, "a governance decision names its accountable person");
  const receipt = r.json["receipt"] as Record<string, unknown>;
  assert.equal(receipt["decisionType"], "ACTOR_PARTY_LINK_CREATION");
  assert.equal(receipt["subjectId"], d["linkId"]);
  assert.deepEqual(receipt["issuedFor"], issuedReference(actors.linker), "the request's own reference carries no personal name");

  const read = await getLink(d["linkId"] as string);
  assert.equal(read.status, 200, read.text);
  const link = read.json["link"] as ActorSubjectLink;
  assert.equal(read.json["currentState"], "ACTIVE");
  assert.deepEqual(read.json["statusRecords"], []);
  assert.equal(link.linkDigest, d["linkDigest"]);
  assert.deepEqual(link.linkStatement, r.statement, "the statement is stored exactly as signed");
  assert.equal(link.relation, "ACTS_FOR_SUBJECT");
  assert.deepEqual(link.createdBy, d["decidedBy"]);
  const verified = await verifiedLink(link);
  assert.equal(verified.result, "VERIFIED", verified.reason);
  assert.ok(isIntact(linkIntegrity(link, verified.result)), "signature, statement and digest verify from what is read back, against the registry");
  staffCoop = { linkId: link.linkId, linkDigest: link.linkDigest };
});

test("same key, same body → byte-identical 201 replay; one link", async () => {
  const statement = await linkStatement({ actor: "staff2", party: "coop2" });
  const body = { linkStatement: statement, statementSignature: signAs("linker", statement) };
  const key = `links-replay-${randomUUID()}`;
  const first = await call("POST", "/scs/v1/actor-party-links", body, { key });
  const second = await call("POST", "/scs/v1/actor-party-links", body, { key });
  assert.equal(first.status, 201, first.text);
  assert.equal(second.text, first.text);
  assert.equal(await count("SELECT count(*) AS n FROM scs.actor_party_link WHERE actor_id = $1 AND party_id = $2", [actors.staff2.actorId, parties.coop2]), 1);
});

test("rule 1: only a LINK_OFFICER creates a link → 403 LINK_CREATOR_NOT_AUTHORISED, nothing written", async () => {
  const r = await assertRefused(postLink({ creator: "officer" }), 403, "LINK_CREATOR_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /requires the LINK_OFFICER role/);
  await assertRefused(postLink({ creator: "staff", actor: "staff2" }), 403, "LINK_CREATOR_NOT_AUTHORISED");
});

test("rule 2: never a link for oneself → 403 LINK_SELF_ASSERTED", async () => {
  await assertRefused(postLink({ actor: "linker", creator: "linker" }), 403, "LINK_SELF_ASSERTED");
});

test("rule 3: the party exists and is current; the relation fits its type", async () => {
  await assertRefused(postLink({ party: randomUUID() }), 422, "LINK_SUBJECT_NOT_FOUND");
  await assertRefused(postLink({ party: "retired", relation: "ACTS_FOR_SUBJECT" }), 422, "LINK_SUBJECT_NOT_CURRENT");
  await assertRefused(postLink({ party: "coop", relation: "IS_SUBJECT" }), 422, "LINK_RELATION_NOT_PERMITTED");
  await assertRefused(postLink({ party: "person", relation: "ACTS_FOR_SUBJECT" }), 422, "LINK_RELATION_NOT_PERMITTED");
});

test("rule 4: every evidence object is stored, and cited once", async () => {
  const unstored = createHash("sha256").update(randomUUID()).digest("hex");
  const r = await assertRefused(postLink({ evidence: [{ evidenceObjectSha256: await storedObject(), description: "stored" }, { evidenceObjectSha256: unstored, description: "never uploaded" }] }), 422, "LINK_EVIDENCE_MISSING");
  assert.match((r.json["reasons"] as string[]).join(" "), new RegExp(unstored));
  const sha = await storedObject();
  await assertRefused(postLink({ evidence: [{ evidenceObjectSha256: sha, description: "one" }, { evidenceObjectSha256: sha, description: "two" }] }), 400, "REQUEST_VALIDATION_FAILED");
  await assertRefused(postLink({ evidence: [] }), 400, "REQUEST_VALIDATION_FAILED");
});

test("rule 5: validity ordered, at most 12 months, and valid when recorded", async () => {
  const code = "LINK_VALIDITY_INVALID";
  const from = iso(-60_000);
  await assertRefused(postLink({ validFrom: from, validUntil: from }), 400, code);
  const d = new Date(Date.now() - 60_000);
  const twelve = new Date(d); twelve.setUTCMonth(twelve.getUTCMonth() + 12);
  await assertRefused(postLink({ validFrom: d.toISOString(), validUntil: new Date(twelve.getTime() + 1000).toISOString() }), 400, code);
  await assertRefused(postLink({ validFrom: iso(DAY), validUntil: iso(30 * DAY) }), 400, code);
  await assertRefused(postLink({ validFrom: iso(-30 * DAY), validUntil: iso(-DAY) }), 400, code);
  // exactly twelve months is allowed
  await created({ actor: "staff", party: "coop2", validFrom: d.toISOString(), validUntil: twelve.toISOString() });
});

test("independence: whoever verified a mandate to a party cannot create links to it", async () => {
  const mandate = (await harness.admin.query<{ mandate_id: string }>(
    `INSERT INTO scs.representation_mandate (schema_version, granting_party_id, representative_party_id, permitted_actions, framework_association_ids,
       commodity_scope, geographic_scope, valid_from, valid_until, mandate_evidence_ids, verification_status, revocation_status, created_by)
     VALUES ('1', $1, $2, '{SUBMIT_IDENTITY_EVIDENCE}', $3, '{4001}', '{TH}', now() - interval '1 day', now() + interval '300 days', $4, 'CLAIMED_UNVERIFIED', 'NOT_REVOKED', $5)
     RETURNING mandate_id`,
    [parties.person2, parties.coop2, [randomUUID()], [randomUUID()], JSON.stringify(actors.officer)],
  )).rows[0]!.mandate_id;
  const evidence = (await harness.admin.query<{ e: string[] }>(`SELECT mandate_evidence_ids AS e FROM scs.representation_mandate WHERE mandate_id = $1`, [mandate])).rows[0]!.e;
  await harness.admin.query(
    `INSERT INTO scs.mandate_verification_assessment (mandate_id, schema_version, verification_status, scope_description, scope_verified_attributes,
       scope_excluded_from_verification, verifying_authority_id, verifying_authority_name, verifying_authority_basis, verifying_authority_jurisdiction_code,
       verified_at, evidence_ids, limitations, recorded_by)
     VALUES ($1, '1', 'VERIFIED_FOR_DECLARED_SCOPE', 'The mandate.', '{signature}', '{}', 'reg', 'Registry', 'Procedure', 'TH', now(), $2, '{}', $3)`,
    [mandate, evidence, JSON.stringify(issuedReference(actors.verifier))],
  );
  const r = await assertRefused(postLink({ actor: "staff", party: "coop2", creator: "verifier" }), 403, "LINK_CREATOR_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /recorded verification assessment .*\(separation of duties\)/);
  // the same actor may link to a party whose mandates they have not verified
  await created({ actor: "person", party: "person", creator: "verifier" });
});

test("rule 6: one ACTIVE link per actor, party and relation; a SUSPENDED one blocks too; supersede to change it", async () => {
  const actor = "staff2";
  const a = await created({ actor, party: "coop" });
  const again = await assertRefused(postLink({ actor, party: "coop" }), 409, "LINK_ALREADY_ACTIVE");
  assert.match((again.json["reasons"] as string[])[0]!, /supersede it/);
  // superseding replaces it, and the predecessor is REVOKED from then on
  const b = await created({ actor, party: "coop", supersedes: a.linkId });
  const readA = await getLink(a.linkId);
  assert.equal(readA.json["currentState"], "REVOKED");
  assert.equal(readA.json["supersededByLinkId"], b.linkId);
  assert.equal((await getLink(b.linkId)).json["currentState"], "ACTIVE");
  // a superseded link is superseded once, and is no longer ACTIVE
  await assertRefused(postLink({ actor, party: "coop", supersedes: a.linkId }), 422, "LINK_NOT_ACTIVE");
  // a suspended link blocks a new link, and cannot be superseded
  assert.equal((await postStatus(b, "SUSPEND")).status, 201);
  const blocked = await assertRefused(postLink({ actor, party: "coop" }), 409, "LINK_ALREADY_ACTIVE");
  assert.match((blocked.json["reasons"] as string[])[0]!, /SUSPENDED; reinstate or revoke it first/);
  await assertRefused(postLink({ actor, party: "coop", supersedes: b.linkId }), 422, "LINK_NOT_ACTIVE");
  // once revoked, a new link (without supersession) is allowed
  assert.equal((await postStatus(b, "REVOKE")).status, 201);
  await assertRefused(postLink({ actor, party: "coop", supersedes: b.linkId }), 422, "LINK_NOT_ACTIVE");
  await created({ actor, party: "coop" });
  // supersession names a link for the same actor and party
  await assertRefused(postLink({ actor: "staff", party: "coop2", supersedes: b.linkId }), 404, "LINK_NOT_FOUND");
  await assertRefused(postLink({ actor, party: "coop", supersedes: randomUUID() }), 404, "LINK_NOT_FOUND");
});

test("a version 1 statement, naming no key, is refused: there is no transition period (AAB-PLATFORM-04, third amendment)", async () => {
  const statement = await linkStatement({ actor: "person2", party: "person2" });
  const v1 = signWith(keys.linker.privateKey, statement); // signed as it is, with no statementVersion or signingKeyId
  const r = await call("POST", "/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: v1 });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  const statusStatement = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: staffCoop.linkId, linkDigest: staffCoop.linkDigest, action: "SUSPEND", reason: "v1.", writer: ref("linker") };
  const s = await call("POST", `/scs/v1/actor-party-links/${staffCoop.linkId}/status-records`, { statusStatement, statementSignature: signWith(keys.linker.privateKey, statusStatement) });
  assert.equal(s.status, 400, s.text);
});

test("rule 7: the creator is a named human who signed exactly this statement → otherwise 422 LINK_SIGNATURE_INVALID", async () => {
  const code = "LINK_SIGNATURE_INVALID";
  const reason = async (p: Promise<Res>) => ((await assertRefused(p, 422, code)).json["reasons"] as string[])[0]!;
  assert.match(await reason(postLink({ actor: "person2", party: "person2", creator: "service" })), /is a SERVICE, not a HUMAN/);
  assert.match(await reason(postLink({ actor: "person2", party: "person2", creator: "noname" })), /no accountable name/);
  assert.match(await reason(postLink({ actor: "person2", party: "person2", creator: "nokey" })), /cannot be resolved/, "a key the registry does not hold");
  assert.match(await reason(postLink({ actor: "person2", party: "person2", creator: "linker2" }, { who: "linker", signer: "linker2" })), /creator \(linker2-links\) is not the authenticated actor/);
  assert.match(await reason(postLink({ actor: "person2", party: "person2" }, { signer: "linker2" })), /does not verify/, "signed with another person's key");
  const other = await linkStatement({ actor: "person2", party: "person2", relation: "IS_SUBJECT" });
  assert.match(await reason(postLink({ actor: "person2", party: "person2" }, { signature: signAs("linker", { ...other, validUntil: iso(10 * DAY) }) })), /does not verify/, "a signature over another statement");
});

test("two concurrent creations for the same actor, party and relation → exactly one link", async () => {
  const s1 = await linkStatement({ actor: "authorityElsewhere", party: "coop" });
  const s2 = await linkStatement({ actor: "authorityElsewhere", party: "coop" });
  const results = await Promise.all([s1, s2].map((s) => call("POST", "/scs/v1/actor-party-links", { linkStatement: s, statementSignature: signAs("linker", s) })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await count("SELECT count(*) AS n FROM scs.actor_party_link WHERE actor_id = $1 AND party_id = $2", [actors.authorityElsewhere.actorId, parties.coop]), 1);
});

test("receipt write fails → 500; no link and no evidence rows", async () => {
  const before = await writes();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_link_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_link_receipt BEFORE INSERT ON scs.decision_receipt FOR EACH ROW EXECUTE FUNCTION scs.test_fail_link_receipt();`);
  try {
    const r = await postLink({ actor: "person2", party: "person2" });
    assert.equal(r.status, 500);
    assert.ok(!r.text.includes("simulated"));
    assert.deepEqual(await writes(), before);
    assert.equal(await count("SELECT count(*) AS n FROM scs.actor_party_link_evidence e WHERE NOT EXISTS (SELECT 1 FROM scs.actor_party_link l WHERE l.link_id = e.link_id)"), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_link_receipt ON scs.decision_receipt; DROP FUNCTION scs.test_fail_link_receipt();`);
  }
});

// ── Status records ───────────────────────────────────────────────────────────

test("the creating role suspends, reinstates and revokes; each record is signed, digested, receipted and ordered", async () => {
  const link = await created({ actor: "person", party: "person2" });
  for (const [action, state] of [["SUSPEND", "SUSPENDED"], ["REINSTATE", "ACTIVE"], ["SUSPEND", "SUSPENDED"], ["REVOKE", "REVOKED"]] as const) {
    const r = await postStatus(link, action);
    assert.equal(r.status, 201, r.text);
    const d = r.json["decision"] as Record<string, unknown>;
    assert.equal(d["action"], action);
    assert.equal(d["writerCapacity"], "CREATING_ROLE");
    assert.equal(d["resultingState"], state);
    assert.equal((r.json["receipt"] as Record<string, unknown>)["decisionType"], "ACTOR_PARTY_LINK_STATUS");
    assert.equal((await getLink(link.linkId)).json["currentState"], state);
  }
  const read = await getLink(link.linkId);
  const records = read.json["statusRecords"] as ActorSubjectLinkStatusRecord[];
  assert.deepEqual(records.map((r) => r.statusStatement.action), ["SUSPEND", "REINSTATE", "SUSPEND", "REVOKE"]);
  assert.ok(records.every((r, i) => i === 0 || Date.parse(r.recordedAt) > Date.parse(records[i - 1]!.recordedAt)), "strictly increasing recordedAt");
  for (const r of records) assert.ok(isIntact(statusRecordIntegrity(r, read.json["link"] as ActorSubjectLink, (await verifiedStatus(r)).result)));
});

test("an action impossible from the link's state → 409 LINK_STATUS_NOT_PERMITTED", async () => {
  const l = await created({ actor: "authority", party: "coop2" });
  await assertRefused(postStatus(l, "REINSTATE"), 409, "LINK_STATUS_NOT_PERMITTED");
  assert.equal((await postStatus(l, "SUSPEND")).status, 201);
  await assertRefused(postStatus(l, "SUSPEND"), 409, "LINK_STATUS_NOT_PERMITTED");
  assert.equal((await postStatus(l, "REVOKE")).status, 201);
  for (const action of ["SUSPEND", "REINSTATE", "REVOKE"] as const) await assertRefused(postStatus(l, action), 409, "LINK_STATUS_NOT_PERMITTED");
});

test("the linked actor never writes a status record on their own link, even holding LINK_OFFICER", async () => {
  const own = await created({ actor: "linker2", party: "coop2" });
  const r = await assertRefused(postStatus(own, "SUSPEND", "linker2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /is the linked actor/);
});

test("a natural person, through their own ACTIVE IS_SUBJECT link, may suspend another link to them — never reinstate or revoke", async () => {
  const self = await created({ actor: "person2", party: "person" });
  const other = await created({ actor: "staff", party: "person" });
  await assertRefused(postStatus(other, "REINSTATE", "person2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  await assertRefused(postStatus(other, "REVOKE", "person2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  const r = await postStatus(other, "SUSPEND", "person2");
  assert.equal(r.status, 201, r.text);
  assert.equal((r.json["decision"] as Record<string, unknown>)["writerCapacity"], "SUBJECT_AUTHORITY");
  assert.equal((r.json["decision"] as Record<string, unknown>)["resultingState"], "SUSPENDED");
  // only the creating role ends a representative's suspension
  await assertRefused(postStatus(other, "REINSTATE", "person2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.equal((await postStatus(other, "REINSTATE")).status, 201);
  // without an ACTIVE IS_SUBJECT link of their own, the person cannot suspend
  assert.equal((await postStatus(self, "SUSPEND")).status, 201);
  const refused = await assertRefused(postStatus(other, "SUSPEND", "person2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.match((refused.json["reasons"] as string[]).join(" "), /holds no ACTIVE IS_SUBJECT link/);
});

test("for an organisation: PARTY_AUTHORITY_REPRESENTATIVE for it AND an ACTIVE ACTS_FOR_SUBJECT link — either alone is not enough", async () => {
  const target = staffCoop;
  assert.equal((await getLink(target.linkId)).json["currentState"], "ACTIVE");
  // the grant alone: no link yet
  let r = await assertRefused(postStatus(target, "SUSPEND", "authority"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[]).join(" "), /holds no ACTIVE ACTS_FOR_SUBJECT link/);
  // a link alone: another staff member of the same organisation, with no grant
  r = await assertRefused(postStatus(target, "SUSPEND", "staff2"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[]).join(" "), /does not hold PARTY_AUTHORITY_REPRESENTATIVE granted for party/);
  // a grant for another party, with a link to this one (created by the concurrency test)
  r = await assertRefused(postStatus(target, "SUSPEND", "authorityElsewhere"), 403, "LINK_STATUS_WRITER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[]).join(" "), /does not hold PARTY_AUTHORITY_REPRESENTATIVE granted for party/);
  // both: the grant for this party and an ACTIVE link to it
  await created({ actor: "authority", party: "coop" });
  const ok = await postStatus(target, "SUSPEND", "authority");
  assert.equal(ok.status, 201, ok.text);
  const d = ok.json["decision"] as { writerCapacity: string; decisionReasons: string[] };
  assert.equal(d.writerCapacity, "SUBJECT_AUTHORITY");
  assert.ok(d.decisionReasons.some((x) => /Pilot limitation: the PARTY_AUTHORITY_REPRESENTATIVE designation is operator configuration/.test(x)), "the designation's limitation is disclosed");
});

test("the status statement binds this link, its current digest and the writer, and is signed by the writer → otherwise 422 LINK_SIGNATURE_INVALID", async () => {
  const l = await created({ actor: "staff", party: "person2" });
  const other = await created({ actor: "staff2", party: "person2" });
  const code = "LINK_SIGNATURE_INVALID";
  await assertRefused(postStatus(l, "SUSPEND", "linker", { statement: { linkId: other.linkId } }), 422, code);
  await assertRefused(postStatus(l, "SUSPEND", "linker", { statement: { linkDigest: other.linkDigest } }), 422, code);
  await assertRefused(postStatus(l, "SUSPEND", "linker", { statement: { writer: ref("linker2") } }), 422, code);
  await assertRefused(postStatus(l, "SUSPEND", "linker", { signer: "linker2" }), 422, code);
  await assertRefused(postStatus(l, "SUSPEND", "nokey"), 422, code);
  await assertRefused(postStatus(l, "SUSPEND", "noname"), 422, code);
  assert.equal((await postStatus(l, "SUSPEND")).status, 201, "the same record, correctly bound and signed");
});

test("an unknown link → 404 LINK_NOT_FOUND; a malformed linkId → 400", async () => {
  await assertRefused(postStatus({ linkId: randomUUID(), linkDigest: `sha256:${"0".repeat(64)}` }, "SUSPEND"), 404, "LINK_NOT_FOUND");
  assert.equal((await getLink(randomUUID())).status, 404);
  assert.equal((await getLink("not-a-uuid")).status, 400);
});

// ── Reading ──────────────────────────────────────────────────────────────────

test("reading: LINK_OFFICER and COMPLIANCE_OFFICER only → otherwise 403 LINK_READER_NOT_AUTHORISED", async () => {
  const l = staffCoop;
  for (const who of ["officer", "linker"] as const) assert.equal((await getLink(l.linkId, who)).status, 200, who);
  const r = await getLink(l.linkId, "staff");
  assert.equal(r.status, 403);
  assert.equal(r.json["error"], "LINK_READER_NOT_AUTHORISED");
});

test("a link reads EXPIRED once its validUntil has passed, and can then only be revoked", async () => {
  const l = await created({ actor: "linker", party: "coop2", creator: "linker2", validUntil: iso(1500) }, { who: "linker2" });
  assert.equal((await getLink(l.linkId)).json["currentState"], "ACTIVE");
  await new Promise((r) => setTimeout(r, 1800));
  assert.equal((await getLink(l.linkId)).json["currentState"], "EXPIRED");
  await assertRefused(postStatus(l, "SUSPEND", "linker2"), 409, "LINK_STATUS_NOT_PERMITTED");
  const revoked = await postStatus(l, "REVOKE", "linker2");
  assert.equal(revoked.status, 201, revoked.text);
  assert.equal((revoked.json["decision"] as Record<string, unknown>)["resultingState"], "REVOKED");
});
