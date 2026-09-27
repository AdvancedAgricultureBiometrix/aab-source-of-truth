// Migration 021: the AAB-PLATFORM-04 actor–party link tables, tested against
// a database built from every migration. Parties are registered through the
// API; links, their evidence and status records are inserted directly (the
// link endpoints are not built yet). Signatures and digests here are
// well-formed placeholders: the API verifies them, the database does not.
// Grants and RLS are covered by db-security.test.ts, which checks every scs
// table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKEN = "link-schema-officer-token-0123456789";
const ACTOR = { actorId: "officer-link-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const TH = { issuerType: "COUNTRY_TENANCY", countryCode: "TH" };
/** ActorReference v2 of the link officer who creates links and writes status records. */
const actorRef = (actorId: string, extra: Record<string, unknown> = {}) => ({
  referenceVersion: "2", actorId, issuer: TH, actorType: "HUMAN", authenticationMethod: "STATIC_TOKEN",
  accountableName: `Named ${actorId}`, authorityBasis: [{ role: "LINK_OFFICER", scopeType: "COUNTRY", scopeId: "TH" }], ...extra,
});
const CREATOR = actorRef("link-officer-1");
const FROM = "2026-09-27T00:00:00.000Z";
const UNTIL = "2027-03-27T00:00:00.000Z";

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let person = "";
let organisation = "";

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `link-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.ok(res.status === 201, `${path}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  person = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  organisation = (await post("/scs/v1/parties", partyRequest("LEGAL_ENTITY")))["partyId"] as string;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const adminQuery: Query = (sql, values) => harness.admin.query(sql, values);
const sig = () => randomBytes(64).toString("base64");
const digest = () => `sha256:${createHash("sha256").update(randomBytes(32)).digest("hex")}`;
/** jsonb columns are sent as JSON text; everything else as is. */
const param = (v: unknown) => (typeof v === "object" && v !== null && !Array.isArray(v) ? JSON.stringify(v) : v);

async function inTransaction<T>(body: (q: Query) => Promise<T>): Promise<T> {
  await harness.admin.query("BEGIN");
  try {
    const out = await body(adminQuery);
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

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, $2)`,
    [sha, JSON.stringify(ACTOR)],
  );
  return sha;
}

interface Link { linkId: string; linkDigest: string; actorId: string; partyId: string }
interface Evidence { evidenceObjectSha256: string; description: string }
interface LinkOpts {
  actorId?: string;
  partyId?: string;
  relation?: string;
  supersedes?: string;
  /** Column overrides, applied after the statement is built. */
  cols?: Record<string, unknown>;
  /** Statement field overrides. */
  statement?: Record<string, unknown>;
  /** The evidence rows written; by default exactly the statement's. */
  rows?: Evidence[];
}

/** Writes a link and its evidence rows in one transaction (the evidence is checked at commit). */
async function link(opts: LinkOpts = {}, via?: (fn: (q: Query) => Promise<Link>) => Promise<Link>): Promise<Link> {
  const linkId = (opts.cols?.["link_id"] as string | undefined) ?? randomUUID();
  const actorId = opts.actorId ?? `actor-${randomUUID()}`;
  const partyId = opts.partyId ?? person;
  const relation = opts.relation ?? (partyId === organisation ? "ACTS_FOR_SUBJECT" : "IS_SUBJECT");
  const evidence: Evidence[] = [{ evidenceObjectSha256: await storedObject(), description: "Consent form signed by the party" }];
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK",
    actor: { issuer: TH, actorId },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: partyId },
    relation,
    validFrom: FROM,
    validUntil: UNTIL,
    authorisationEvidence: evidence,
    ...(opts.supersedes === undefined ? {} : { supersedesLinkId: opts.supersedes }),
    creator: { issuer: CREATOR.issuer, actorId: CREATOR.actorId },
    ...opts.statement,
  };
  const linkDigest = (opts.cols?.["link_digest"] as string | undefined) ?? digest();
  const cols: Record<string, unknown> = {
    link_id: linkId,
    schema_version: "1",
    actor_issuer_type: "COUNTRY_TENANCY",
    actor_issuer_country_code: "TH",
    actor_id: actorId,
    subject_domain: "SCS",
    subject_type: "PARTY",
    party_id: partyId,
    relation,
    valid_from: FROM,
    valid_until: UNTIL,
    supersedes_link_id: opts.supersedes ?? null,
    link_statement: statement,
    statement_signature: sig(),
    created_by: CREATOR,
    link_digest: linkDigest,
    ...opts.cols,
  };
  const rows = opts.rows ?? (statement.authorisationEvidence as Evidence[]);
  const run = async (q: Query) => {
    await insert(q, "actor_party_link", cols);
    for (const e of rows) {
      await insert(q, "actor_party_link_evidence", { link_id: linkId, evidence_object_sha256: e.evidenceObjectSha256, description: e.description });
    }
    return { linkId, linkDigest, actorId, partyId };
  };
  return via === undefined ? inTransaction(run) : via(run);
}

interface StatusOpts {
  action?: string;
  writer?: Record<string, unknown>;
  cols?: Record<string, unknown>;
  statement?: Record<string, unknown>;
}

function status(l: Link, opts: StatusOpts = {}, q: Query = adminQuery) {
  const action = opts.action ?? "SUSPEND";
  const reason = "The party asked for the link to be reviewed.";
  const writer = opts.writer ?? CREATOR;
  return insert(q, "actor_party_link_status", {
    link_id: l.linkId,
    schema_version: "1",
    action,
    reason,
    writer_capacity: "CREATING_ROLE",
    status_statement: {
      statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: l.linkId, linkDigest: l.linkDigest, action, reason,
      writer: { issuer: writer["issuer"], actorId: writer["actorId"] }, ...opts.statement,
    },
    statement_signature: sig(),
    written_by: writer,
    record_digest: digest(),
    ...opts.cols,
  });
}


test("migration 021 creates the three tables and their triggers, the evidence check deferred to commit", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name LIKE 'actor_party_link%' ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["actor_party_link", "actor_party_link_evidence", "actor_party_link_status"]);
  const t = await harness.admin.query(
    `SELECT tgname, tgdeferrable, tginitdeferred FROM pg_trigger
      WHERE tgname IN ('actor_party_link_evidence_complete', 'actor_party_link_evidence_in_statement', 'actor_party_link_relation_fits_party',
                       'actor_party_link_validity_matches_statement', 'actor_party_link_status_binds_link')
      ORDER BY tgname`,
  );
  assert.deepEqual(t.rows, [
    { tgname: "actor_party_link_evidence_complete", tgdeferrable: true, tginitdeferred: true },
    { tgname: "actor_party_link_evidence_in_statement", tgdeferrable: false, tginitdeferred: false },
    { tgname: "actor_party_link_relation_fits_party", tgdeferrable: false, tginitdeferred: false },
    { tgname: "actor_party_link_status_binds_link", tgdeferrable: false, tginitdeferred: false },
    { tgname: "actor_party_link_validity_matches_statement", tgdeferrable: false, tginitdeferred: false },
  ]);
});

test("scs_api can record and read a link, its evidence and a status record; nobody can change any of it", async () => {
  const l = await link({}, (fn) => api.transaction((tx) => fn((sql, values) => tx.query(sql, values))));
  await api.transaction((tx) => status(l, {}, (sql, values) => tx.query(sql, values)));
  const read = await api.transaction((tx) => tx.query(`SELECT relation FROM scs.actor_party_link WHERE link_id = $1`, [l.linkId]));
  assert.equal(read.rows[0]!["relation"], "IS_SUBJECT");
  for (const [table, column] of [["actor_party_link", "created_at"], ["actor_party_link_evidence", "created_at"], ["actor_party_link_status", "recorded_at"]] as const) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET ${column} = now() WHERE link_id = $1`, [l.linkId])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(api.transaction((tx) => tx.query(`DELETE FROM scs.${table} WHERE link_id = $1`, [l.linkId])), /permission denied/, `scs_api delete: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET ${column} = now() WHERE link_id = $1`, [l.linkId]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE link_id = $1`, [l.linkId]), /append-only/, `owner delete: ${table}`);
    await assert.rejects(harness.admin.query(`TRUNCATE scs.${table} CASCADE`), /append-only/, `owner truncate: ${table}`);
  }
});

test("evidence: exactly the statement's, each a stored object, recorded by commit; none added later", async () => {
  await assert.rejects(link({ rows: [] }), /actor_party_link_evidence_complete_ck/, "no evidence rows");
  await assert.rejects(link({ statement: { authorisationEvidence: [] } }), /actor_party_link_statement_ck/, "a statement with no evidence");
  const extra = { evidenceObjectSha256: await storedObject(), description: "Not in the statement" };
  await assert.rejects(link({ rows: [extra] }), /actor_party_link_evidence_in_statement_ck/, "a row the creator did not sign");
  const unstored = { evidenceObjectSha256: createHash("sha256").update(randomUUID()).digest("hex"), description: "Never uploaded" };
  await assert.rejects(link({ statement: { authorisationEvidence: [unstored] } }), /actor_party_link_evidence_object_fk/);
  const blank = { evidenceObjectSha256: await storedObject(), description: "  " };
  await assert.rejects(link({ statement: { authorisationEvidence: [blank] } }), /actor_party_link_evidence_description_ck/);
  // two items signed, one recorded
  const two = [
    { evidenceObjectSha256: await storedObject(), description: "Consent form" },
    { evidenceObjectSha256: await storedObject(), description: "Identity check record" },
  ];
  await assert.rejects(link({ statement: { authorisationEvidence: two }, rows: [two[0]!] }), /actor_party_link_evidence_complete_ck/);
  const l = await link({ statement: { authorisationEvidence: two } });
  await assert.rejects(
    harness.admin.query(`INSERT INTO scs.actor_party_link_evidence (link_id, evidence_object_sha256, description) VALUES ($1, $2, $3)`,
      [l.linkId, extra.evidenceObjectSha256, extra.description]),
    /actor_party_link_evidence_in_statement_ck/,
    "added after the link was recorded",
  );
});

test("the actor's issuer, the subject and the relation", async () => {
  // the columns and the statement agree, so only the rule under test is broken
  const issuer = (issuerType: string, countryCode: string | null) => {
    const actorId = `actor-${randomUUID()}`;
    return link({
      actorId,
      cols: { actor_issuer_type: issuerType, actor_issuer_country_code: countryCode },
      statement: { actor: { issuer: countryCode === null ? { issuerType } : { issuerType, countryCode }, actorId } },
    });
  };
  await assert.rejects(issuer("COUNTRY_TENANCY", null), /actor_party_link_issuer_ck/, "a tenancy names its country");
  await assert.rejects(issuer("COUNTRY_TENANCY", "th"), /actor_party_link_issuer_ck/);
  await assert.rejects(issuer("PLATFORM_CONTROL_PLANE", "TH"), /actor_party_link_issuer_ck/, "the control plane has no country");
  await assert.rejects(issuer("OTHER", null), /actor_party_link_issuer_ck/);
  await assert.rejects(link({ actorId: " " }), /actor_party_link_actor_id_not_blank_ck/);
  const subject = (domain: string, subjectType: string) =>
    link({ cols: { subject_domain: domain, subject_type: subjectType }, statement: { subject: { domain, subjectType, subjectId: person } } });
  await assert.rejects(subject("AGR", "PARTY"), /actor_party_link_subject_ck/);
  await assert.rejects(subject("SCS", "PLOT"), /actor_party_link_subject_ck/);
  await assert.rejects(link({ partyId: randomUUID(), relation: "IS_SUBJECT" }), /actor_party_link_party_fk/);
  await assert.rejects(link({ relation: "OWNS" }), /actor_party_link_relation_ck/);
  // a platform actor is recorded without a country
  await issuer("PLATFORM_CONTROL_PLANE", null);
});

test("IS_SUBJECT only to a natural person; ACTS_FOR_SUBJECT only to an organisation", async () => {
  await assert.rejects(link({ partyId: person, relation: "ACTS_FOR_SUBJECT" }), /actor_party_link_relation_fits_party_ck/);
  await assert.rejects(link({ partyId: organisation, relation: "IS_SUBJECT" }), /actor_party_link_relation_fits_party_ck/);
  await link({ partyId: person, relation: "IS_SUBJECT" });
  await link({ partyId: organisation, relation: "ACTS_FOR_SUBJECT" });
});

test("validity: ends after it starts, lasts at most 12 months, and is the statement's", async () => {
  const valid = (from: string, until: string) => link({ cols: { valid_from: from, valid_until: until }, statement: { validFrom: from, validUntil: until } });
  await valid(FROM, "2027-09-27T00:00:00.000Z");
  await assert.rejects(valid(FROM, "2027-09-27T00:00:01.000Z"), /actor_party_link_validity_ck/, "a day over 12 months");
  await assert.rejects(valid(FROM, FROM), /actor_party_link_validity_ck/);
  await assert.rejects(link({ cols: { valid_until: "2027-01-01T00:00:00.000Z" } }), /actor_party_link_validity_matches_statement_ck/);
  await assert.rejects(link({ statement: { validFrom: "2026-09-28T00:00:00.000Z" } }), /actor_party_link_validity_matches_statement_ck/);
  await assert.rejects(link({ statement: { validUntil: "next spring" } }), /actor_party_link_validity_matches_statement_ck/, "malformed, refused as a violation");
  await assert.rejects(link({ statement: { validUntil: undefined } }), /actor_party_link_validity_matches_statement_ck/, "missing");
  // the same instant, written with an offset
  await link({ statement: { validFrom: "2026-09-27T07:00:00+07:00" } });
});

test("the record is its signed statement", async () => {
  const rule = /actor_party_link_statement_ck/;
  await assert.rejects(link({ statement: { statementType: "ACTOR_SUBJECT_LINK_STATUS" } }), rule);
  await assert.rejects(link({ statement: { actor: { issuer: TH, actorId: "someone-else" } } }), rule);
  await assert.rejects(link({ statement: { actor: { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" }, actorId: "x" } }, actorId: "x" }), rule, "another tenancy");
  await assert.rejects(link({ statement: { subject: { domain: "SCS", subjectType: "PARTY", subjectId: organisation } } }), rule);
  await assert.rejects(link({ statement: { subject: { domain: "AGR", subjectType: "PARTY", subjectId: person } } }), rule);
  await assert.rejects(link({ statement: { relation: "ACTS_FOR_SUBJECT" } }), rule);
  await assert.rejects(link({ statement: { supersedesLinkId: randomUUID() } }), rule, "a supersession the record does not carry");
  await assert.rejects(link({ cols: { link_statement: "[]" } }), rule);
  // a missing key is refused, not passed as NULL
  await assert.rejects(link({ statement: { relation: undefined } }), rule, "no relation");
  await assert.rejects(link({ statement: { statementType: undefined } }), rule, "no statementType");
  await assert.rejects(link({ statement: { actor: { issuer: TH } } }), rule, "no actorId");
  await assert.rejects(link({ statement: { actor: { actorId: "x" } }, actorId: "x" }), rule, "no issuer");
  await assert.rejects(link({ statement: { subject: { domain: "SCS", subjectType: "PARTY" } } }), rule, "no subjectId");
  await assert.rejects(link({ statement: { authorisationEvidence: undefined } }), rule, "no evidence");
});

test("the creator: a named human, who signed the statement, never the linked actor", async () => {
  const rule = /actor_party_link_creator_ck/;
  const signed = /actor_party_link_statement_ck/;
  const as = (createdBy: Record<string, unknown>) => link({ cols: { created_by: createdBy }, statement: { creator: { issuer: createdBy["issuer"], actorId: createdBy["actorId"] } } });
  await assert.rejects(as(actorRef("link-service", { actorType: "SERVICE" })), rule);
  await assert.rejects(as(actorRef("link-officer-2", { accountableName: " " })), rule);
  const { accountableName: _omitted, ...unnamed } = actorRef("link-officer-3");
  await assert.rejects(as(unnamed), rule);
  await assert.rejects(link({ statement: { creator: { issuer: TH, actorId: "link-officer-9" } } }), signed, "signed by someone else");
  await assert.rejects(link({ statement: { creator: { issuer: { issuerType: "PLATFORM_CONTROL_PLANE" }, actorId: CREATOR.actorId } } }), signed, "the same id from another issuer");
  await assert.rejects(link({ actorId: CREATOR.actorId }), rule, "self-asserted");
  await assert.rejects(link({ cols: { created_by: JSON.stringify("link-officer-1") } }), rule);
  // a missing key is refused, not passed as NULL
  const { actorId: _noId, ...anonymous } = CREATOR;
  // with no actorId the creator is unidentified and the statement unbound: both checks refuse it
  await assert.rejects(link({ cols: { created_by: anonymous }, statement: { creator: { issuer: TH } } }), /actor_party_link_(creator|statement)_ck/, "no actorId anywhere");
  const { actorType: _noType, ...untyped } = CREATOR;
  await assert.rejects(link({ cols: { created_by: untyped } }), rule, "no actorType");
  await assert.rejects(link({ statement: { creator: undefined } }), signed, "a statement naming no creator");
});

test("signature and digest formats; a digest names one link", async () => {
  await assert.rejects(link({ cols: { statement_signature: "not base64" } }), /actor_party_link_signature_format_ck/);
  await assert.rejects(link({ cols: { statement_signature: randomBytes(32).toString("base64") } }), /actor_party_link_signature_format_ck/, "too short for Ed25519");
  await assert.rejects(link({ cols: { link_digest: createHash("sha256").update("x").digest("hex") } }), /actor_party_link_digest_format_ck/, "no sha256: prefix");
  await assert.rejects(link({ cols: { link_digest: `sha256:${"A".repeat(64)}` } }), /actor_party_link_digest_format_ck/);
  const l = await link();
  await assert.rejects(link({ cols: { link_digest: l.linkDigest } }), /actor_party_link_digest_uq/);
});

test("supersession: same actor and party, at most once, never itself", async () => {
  const first = await link();
  const same = { actorId: first.actorId, partyId: first.partyId };
  await link({ ...same, supersedes: first.linkId });
  await assert.rejects(link({ ...same, supersedes: first.linkId }), /actor_party_link_supersedes_once_uq/);
  const other = await link();
  await assert.rejects(link({ partyId: other.partyId, supersedes: other.linkId }), /actor_party_link_supersedes_fk/, "another actor");
  await assert.rejects(link({ actorId: other.actorId, partyId: organisation, supersedes: other.linkId }), /actor_party_link_supersedes_fk/, "another party");
  await assert.rejects(link({ supersedes: randomUUID() }), /actor_party_link_supersedes_fk/, "no such link");
  const self = randomUUID();
  await assert.rejects(link({ cols: { link_id: self }, supersedes: self }), /actor_party_link_not_self_superseding_ck/);
});

test("status records: actions, reasons, and the subject authority may only suspend", async () => {
  const l = await link();
  await assert.rejects(status(l, { action: "EXPIRE" }), /actor_party_link_status_action_ck/);
  await assert.rejects(status(l, { cols: { reason: " " }, statement: { reason: " " } }), /actor_party_link_status_reason_ck/);
  await assert.rejects(status(l, { action: "REVOKE", cols: { writer_capacity: "SUBJECT_AUTHORITY" } }), /actor_party_link_status_capacity_ck/);
  await assert.rejects(status(l, { action: "REINSTATE", cols: { writer_capacity: "SUBJECT_AUTHORITY" } }), /actor_party_link_status_capacity_ck/);
  await assert.rejects(status(l, { cols: { writer_capacity: "LINKED_ACTOR" } }), /actor_party_link_status_capacity_ck/);
  await status(l, { cols: { writer_capacity: "SUBJECT_AUTHORITY" }, writer: actorRef("party-authority-1") });
  await status(l, { action: "REINSTATE" });
  await status(l, { action: "SUSPEND" });
  await status(l, { action: "REVOKE" });
  await assert.rejects(status(l, { action: "REVOKE" }), /actor_party_link_status_revoked_once_uq/);
  await assert.rejects(status({ ...l, linkId: randomUUID() }), /actor_party_link_status_link_fk/);
});

test("a status record is its signed statement, binds its link's digest, and is never the linked actor's", async () => {
  const l = await link();
  const rule = /actor_party_link_status_statement_ck/;
  await assert.rejects(status(l, { statement: { statementType: "ACTOR_SUBJECT_LINK" } }), rule);
  await assert.rejects(status(l, { statement: { linkId: randomUUID() } }), rule);
  await assert.rejects(status(l, { statement: { action: "REVOKE" } }), rule);
  await assert.rejects(status(l, { statement: { reason: "A different reason." } }), rule);
  await assert.rejects(status(l, { statement: { linkDigest: "sha256:abc" } }), rule);
  await assert.rejects(status(l, { cols: { status_statement: "[]" } }), rule);
  // a missing key is refused, not passed as NULL
  await assert.rejects(status(l, { statement: { reason: undefined } }), rule, "no reason");
  await assert.rejects(status(l, { statement: { action: undefined } }), rule, "no action");
  await assert.rejects(status(l, { statement: { linkId: undefined } }), rule, "no linkId");
  await assert.rejects(status(l, { statement: { writer: undefined } }), rule, "a statement naming no writer");
  const { actorId: _noId, ...anonymous } = CREATOR;
  await assert.rejects(status(l, { writer: anonymous }), /actor_party_link_status_(writer|statement)_ck/, "no actorId anywhere");
  await assert.rejects(status(l, { statement: { linkDigest: digest() } }), /actor_party_link_status_binds_link_ck/, "another link's digest");
  await assert.rejects(status(l, { writer: actorRef(l.actorId) }), /actor_party_link_status_not_linked_actor_ck/);
  const writer = /actor_party_link_status_writer_ck/;
  await assert.rejects(status(l, { writer: actorRef("status-service", { actorType: "SERVICE" }) }), writer);
  await assert.rejects(status(l, { writer: actorRef("status-officer", { accountableName: "" }) }), writer);
  await assert.rejects(status(l, { statement: { writer: { issuer: TH, actorId: "someone-else" } } }), rule, "signed by someone else");
  await assert.rejects(status(l, { statement: { writer: { issuer: { issuerType: "PLATFORM_CONTROL_PLANE" }, actorId: CREATOR.actorId } } }), rule, "another issuer");
  await assert.rejects(status(l, { cols: { statement_signature: "x" } }), /actor_party_link_status_signature_format_ck/);
  await assert.rejects(status(l, { cols: { record_digest: "sha256:XYZ" } }), /actor_party_link_status_digest_format_ck/);
  await assert.rejects(status(l, { cols: { record_digest: l.linkDigest } }).then(() => status(l, { cols: { record_digest: l.linkDigest } })), /actor_party_link_status_digest_uq/);
});
