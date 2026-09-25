// SCS-CAP-02 POST /scs/v1/parties/:partyId/evidence, end to end: real HTTP
// through the server layer, real PostgreSQL (database built from every
// migration), the API connected as a restricted member of scs_api.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson, sha256Hex } from "../foundation/canonical.js";
import { runWithCorrelation } from "../foundation/correlation.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { validate } from "../foundation/validation.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ScsIdentityEvidenceSubmissionRequest, ScsIdentityEvidenceSubmissionResponse } from "../types/cap-02.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap02e-officer-token-0123456789abcdef",
  admin: "cap02e-sysadmin-token-0123456789abcdef",
  viewer: "cap02e-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap02e", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap02e", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02e", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Array<keyof typeof TOKENS>).map((k) => ({
      tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"),
      actor: actors[k],
    })),
  });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02e-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

const evidencePath = (partyId: string) => `/scs/v1/parties/${partyId}/evidence`;

/** Register a party through the API; returns its partyId and the evidence ids given at registration. */
async function registerParty(): Promise<{ partyId: string; registrationEvidence: string[] }> {
  const registrationEvidence = [randomUUID(), randomUUID()];
  const r = await post("/scs/v1/parties", {
    partyType: "LEGAL_ENTITY",
    partyName: `Evidence Test Estate ${randomUUID()}`,
    countryOfRegistration: "TH",
    identityEvidence: { evidenceIds: registrationEvidence, evidenceLimitations: ["Registration copy"] },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { partyId: (r.json["decision"] as { partyId: string }).partyId, registrationEvidence };
}

/** A party in a status the API cannot yet produce (no status-change endpoint exists), seeded by the owner. */
async function seedParty(status: "RETIRED" | "REQUIRES_HUMAN_REVIEW" | "DISPUTED"): Promise<string> {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', $3, '{}', $1, now()) RETURNING party_id`,
    [JSON.stringify(actors.officer), `Seeded ${status} ${randomUUID()}`, status],
  );
  return rows[0]!.party_id;
}

function submission(overrides: Partial<ScsIdentityEvidenceSubmissionRequest> = {}): ScsIdentityEvidenceSubmissionRequest {
  return {
    evidenceIds: [randomUUID(), randomUUID(), randomUUID()],
    evidenceLimitations: ["Land title deed copy; not checked against the land registry."],
    ...overrides,
  };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async (partyId: string, key?: string) => ({
  submissions: await count("SELECT count(*) AS n FROM scs.party_identity_evidence_submission WHERE party_id = $1", [partyId]),
  links: await count("SELECT count(*) AS n FROM scs.party_identity_evidence WHERE party_id = $1", [partyId]),
  submittedLinks: await count("SELECT count(*) AS n FROM scs.party_identity_evidence WHERE party_id = $1 AND submission_id IS NOT NULL", [partyId]),
  receipts: await count(
    "SELECT count(*) AS n FROM scs.decision_receipt WHERE decision_type = 'IDENTITY_EVIDENCE_SUBMISSION' AND subject_id IN (SELECT submission_id FROM scs.party_identity_evidence_submission WHERE party_id = $1)",
    [partyId],
  ),
  idempotency: key === undefined ? 0 : await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]),
});
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const partyRow = async (partyId: string) => (await harness.admin.query(`SELECT * FROM scs.party_identity WHERE party_id = $1`, [partyId])).rows[0] as Record<string, unknown>;

function assertFailClosed(r: Awaited<ReturnType<typeof post>>, status: number, error: string) {
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
}

// ── Valid submission ─────────────────────────────────────────────────────────

test("valid submission → 201; submission row, evidence links with submission_id, receipt; party record unchanged", async () => {
  const { partyId, registrationEvidence } = await registerParty();
  const before = await partyRow(partyId);
  const body = submission({ submittingOrganizationId: "org-evidence-test" });
  const key = `cap02e-${randomUUID()}`;
  const r = await post(evidencePath(partyId), body, { key });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const res = r.json as unknown as ScsIdentityEvidenceSubmissionResponse;
  const checked = runWithCorrelation("cap02e-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02IdentityEvidenceSubmissionResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

  const d = res.decision;
  assert.equal(d.decision, "RECORDED");
  assert.equal(d.partyId, partyId);
  assert.equal(d.partyVersion, 1);
  assert.deepEqual(d.decidedBy, actors.officer);
  for (const check of ["partyExists", "partyNotRetired", "submitterAuthorised", "evidenceIdsNotAlreadyLinked"] as const) {
    assert.equal(d.eligibilityChecks[check], true, check);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
  }
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence admitted, not verified") && x.includes("registrationStatus is unchanged (REGISTERED)")));
  assert.ok(
    d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: the evidence store is not yet built")),
    "discloses that the evidence store is not yet built",
  );

  const sub = (await harness.admin.query(`SELECT * FROM scs.party_identity_evidence_submission WHERE submission_id = $1`, [d.submissionId])).rows[0] as Record<string, unknown>;
  assert.equal(sub["party_id"], partyId);
  assert.equal(sub["party_version"], 1);
  assert.deepEqual(sub["evidence_limitations"], body.evidenceLimitations);
  assert.deepEqual(sub["submitted_by"], actors.officer);
  assert.equal(sub["submitting_organization_id"], "org-evidence-test");
  assert.equal((sub["submitted_at"] as Date).toISOString(), d.decidedAt);

  const links = (await harness.admin.query<{ evidence_id: string; submission_id: string | null; party_version: number }>(
    `SELECT evidence_id, submission_id, party_version FROM scs.party_identity_evidence WHERE party_id = $1 ORDER BY evidence_id`,
    [partyId],
  )).rows;
  assert.deepEqual(
    links.filter((l) => l.submission_id === d.submissionId).map((l) => l.evidence_id).sort(),
    [...body.evidenceIds].sort(),
    "each submitted id is linked, naming the submission",
  );
  assert.ok(links.every((l) => l.party_version === 1));
  assert.deepEqual(
    links.filter((l) => l.submission_id === null).map((l) => l.evidence_id).sort(),
    [...registrationEvidence].sort(),
    "registration evidence is untouched",
  );

  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-02");
  assert.equal(receipt["decision_type"], "IDENTITY_EVIDENCE_SUBMISSION");
  assert.equal(receipt["subject_id"], d.submissionId);
  assert.equal(receipt["decision"], "RECORDED");
  assert.equal(receipt["idempotency_key"], key);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d);

  assert.deepEqual(await partyRow(partyId), before, "the party identity record is not changed");
  assert.deepEqual(await writes(partyId, key), { submissions: 1, links: 5, submittedLinks: 3, receipts: 1, idempotency: 1 });
});

test("a second submission of different evidence is recorded separately", async () => {
  const { partyId } = await registerParty();
  assert.equal((await post(evidencePath(partyId), submission())).status, 201);
  assert.equal((await post(evidencePath(partyId), submission({ evidenceLimitations: [] }))).status, 201);
  assert.deepEqual(await writes(partyId), { submissions: 2, links: 8, submittedLinks: 6, receipts: 2, idempotency: 0 });
});

// ── Party status ─────────────────────────────────────────────────────────────

test("party in REQUIRES_HUMAN_REVIEW or DISPUTED → 201, evidence accepted, status unchanged", async () => {
  for (const status of ["REQUIRES_HUMAN_REVIEW", "DISPUTED"] as const) {
    const partyId = await seedParty(status);
    const r = await post(evidencePath(partyId), submission());
    assert.equal(r.status, 201, `${status}: ${JSON.stringify(r.json)}`);
    const d = r.json["decision"] as { decisionReasons: string[] };
    assert.ok(d.decisionReasons.some((x) => x === `partyNotRetired: evaluated — registrationStatus is ${status}, not RETIRED.`));
    assert.equal((await partyRow(partyId))["registration_status"], status);
    assert.equal((await writes(partyId)).submissions, 1);
  }
});

test("party RETIRED → 422 PARTY_RETIRED, nothing written", async () => {
  const partyId = await seedParty("RETIRED");
  const key = `cap02e-${randomUUID()}`;
  const r = await post(evidencePath(partyId), submission(), { key });
  assertFailClosed(r, 422, "PARTY_RETIRED");
  assert.deepEqual(r.json["reasons"], [`Party ${partyId} is RETIRED and accepts no new identity evidence.`]);
  assert.deepEqual(await writes(partyId, key), { submissions: 0, links: 0, submittedLinks: 0, receipts: 0, idempotency: 0 });
});

test("partyId not found → 404 PARTY_NOT_FOUND, nothing written", async () => {
  const partyId = randomUUID();
  const before = await totalReceipts();
  const r = await post(evidencePath(partyId), submission());
  assertFailClosed(r, 404, "PARTY_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`No party is registered with partyId ${partyId}.`]);
  assert.equal(await totalReceipts(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.party_identity_evidence_submission WHERE party_id = $1", [partyId]), 0);
});

test("partyId that is not a UUID → 400 from path validation", async () => {
  const r = await post(evidencePath("not-a-uuid"), submission());
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.deepEqual(r.json["reasons"], ['path /partyId: must match format "uuid"']);
});

// ── Duplicate evidence ───────────────────────────────────────────────────────

test("evidence ids already linked at registration → 409 EVIDENCE_ALREADY_LINKED naming every duplicate, nothing written", async () => {
  const { partyId, registrationEvidence } = await registerParty();
  const fresh = randomUUID();
  const key = `cap02e-${randomUUID()}`;
  const r = await post(evidencePath(partyId), submission({ evidenceIds: [...registrationEvidence, fresh] }), { key });
  assertFailClosed(r, 409, "EVIDENCE_ALREADY_LINKED");
  const reason = (r.json["reasons"] as string[])[0]!;
  for (const id of registrationEvidence) assert.ok(reason.includes(id), `names ${id}`);
  assert.ok(!reason.includes(fresh), "does not name the new id");
  assert.match(reason, /^2 evidence id\(s\) already linked to party /);
  assert.deepEqual(await writes(partyId, key), { submissions: 0, links: 2, submittedLinks: 0, receipts: 0, idempotency: 0 });
});

test("evidence id already linked by an earlier submission → 409", async () => {
  const { partyId } = await registerParty();
  const first = submission();
  assert.equal((await post(evidencePath(partyId), first)).status, 201);
  const r = await post(evidencePath(partyId), submission({ evidenceIds: [first.evidenceIds[1]!, randomUUID()] }));
  assertFailClosed(r, 409, "EVIDENCE_ALREADY_LINKED");
  assert.ok((r.json["reasons"] as string[])[0]!.includes(first.evidenceIds[1]!));
  assert.equal((await writes(partyId)).submissions, 1);
});

test("the same evidence id for a different party is not a duplicate", async () => {
  const a = await registerParty();
  const b = await registerParty();
  assert.equal((await post(evidencePath(b.partyId), submission({ evidenceIds: [a.registrationEvidence[0]!] }))).status, 201);
});

test("duplicate evidence id within the same request → 400 from schema validation, nothing written", async () => {
  const { partyId } = await registerParty();
  const id = randomUUID();
  const r = await post(evidencePath(partyId), submission({ evidenceIds: [id, id] }));
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/evidenceIds: must NOT have duplicate items")));
  // the same id in upper case is still a duplicate: evidence ids must be lowercase
  const upper = await post(evidencePath(partyId), submission({ evidenceIds: [id, id.toUpperCase()] }));
  assert.equal(upper.status, 400);
  assert.ok((upper.json["reasons"] as string[]).some((x) => x.startsWith("/evidenceIds/1: must match pattern")));
  assert.equal((await writes(partyId)).submissions, 0);
});

test("no evidence ids → 400 from schema validation", async () => {
  const { partyId } = await registerParty();
  const r = await post(evidencePath(partyId), submission({ evidenceIds: [] }));
  assert.equal(r.status, 400);
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/evidenceIds: must NOT have fewer than 1 items")));
});

test("concurrent submissions of the same evidence id → exactly one 201, the other 409", async () => {
  const { partyId } = await registerParty();
  const shared = randomUUID();
  const results = await Promise.all([
    post(evidencePath(partyId), submission({ evidenceIds: [shared, randomUUID()] })),
    post(evidencePath(partyId), submission({ evidenceIds: [shared, randomUUID()] })),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((results.find((r) => r.status === 409)!.json["error"]), "EVIDENCE_ALREADY_LINKED");
  assert.equal((await writes(partyId)).submissions, 1);
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  const { partyId } = await registerParty();
  for (const who of ["viewer", "admin"] as const) {
    const key = `cap02e-${randomUUID()}`;
    const r = await post(evidencePath(partyId), submission(), { key, who });
    assertFailClosed(r, 403, "REGISTRANT_NOT_AUTHORISED");
    assert.deepEqual(r.json["reasons"], [`Submitting identity evidence requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
    assert.deepEqual(await writes(partyId, key), { submissions: 0, links: 2, submittedLinks: 0, receipts: 0, idempotency: 0 }, who);
  }
});

test("authority is checked before the party: an unauthorised actor gets 403 even for an unknown party", async () => {
  assert.equal((await post(evidencePath(randomUUID()), submission(), { who: "viewer" })).status, 403);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const { partyId } = await registerParty();
  const r = await post(evidencePath(partyId), submission(), { key: null });
  assert.equal(r.status, 400);
  assert.deepEqual(r.json["reasons"], ["An Idempotency-Key header is required for this request."]);
  assert.equal((await writes(partyId)).submissions, 0);
});

test("same key, same content → the same 201 response byte for byte, no second write", async () => {
  const { partyId } = await registerParty();
  const body = submission();
  const key = `cap02e-${randomUUID()}`;
  const first = await post(evidencePath(partyId), body, { key });
  const second = await post(evidencePath(partyId), body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await writes(partyId, key), { submissions: 1, links: 5, submittedLinks: 3, receipts: 1, idempotency: 1 });
});

test("same key, different content → 409 IDEMPOTENCY_KEY_CONFLICT, nothing written", async () => {
  const { partyId } = await registerParty();
  const key = `cap02e-${randomUUID()}`;
  assert.equal((await post(evidencePath(partyId), submission(), { key })).status, 201);
  const r = await post(evidencePath(partyId), submission(), { key });
  assert.equal(r.status, 409);
  assert.equal(r.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal((await writes(partyId)).submissions, 1);
});

test("same key and body sent to a different party → 409 conflict, never a replay of the first party's response", async () => {
  const a = await registerParty();
  const b = await registerParty();
  const body = submission();
  const key = `cap02e-${randomUUID()}`;
  assert.equal((await post(evidencePath(a.partyId), body, { key })).status, 201);
  const r = await post(evidencePath(b.partyId), body, { key });
  assert.equal(r.status, 409);
  assert.equal(r.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal((await writes(b.partyId)).submissions, 0);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500; submission row absent and evidence links unchanged", async () => {
  const { partyId } = await registerParty();
  const linksBefore = (await harness.admin.query(`SELECT * FROM scs.party_identity_evidence WHERE party_id = $1 ORDER BY evidence_id`, [partyId])).rows;
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const key = `cap02e-${randomUUID()}`;
    const r = await post(evidencePath(partyId), submission(), { key });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"), "the database error text is not leaked");
    assert.deepEqual(await writes(partyId, key), { submissions: 0, links: 2, submittedLinks: 0, receipts: 0, idempotency: 0 });
    const linksAfter = (await harness.admin.query(`SELECT * FROM scs.party_identity_evidence WHERE party_id = $1 ORDER BY evidence_id`, [partyId])).rows;
    assert.deepEqual(linksAfter, linksBefore, "evidence links unchanged");
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(evidencePath(partyId), submission())).status, 201, "and submission works again once the failure is gone");
});
