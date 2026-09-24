// SCS-CAP-02 POST /scs/v1/parties, end to end: real HTTP through the server
// layer, real PostgreSQL (database built from every migration), the API
// connected as a restricted member of scs_api.

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
import type { ScsPartyRegistrationRequest, ScsPartyRegistrationResponse } from "../types/cap-02.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap02-officer-token-0123456789abcdef",
  admin: "cap02-sysadmin-token-0123456789abcdef",
  viewer: "cap02-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap02", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap02", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const PARTY_TYPES = ["NATURAL_PERSON", "LEGAL_ENTITY", "COOPERATIVE", "COMMUNITY_GROUP", "GOVERNMENT_BODY", "OTHER"] as const;
const CONFLICT_CHECKED = ["LEGAL_ENTITY", "COOPERATIVE", "COMMUNITY_GROUP", "GOVERNMENT_BODY"] as const;
const NOT_CONFLICT_CHECKED = ["NATURAL_PERSON", "OTHER"] as const;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let url = "";

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
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/scs/v1/parties`;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

/** A valid Thai smallholder registration. Each test uses its own partyName so tests never collide. */
function request(overrides: Partial<ScsPartyRegistrationRequest> = {}): ScsPartyRegistrationRequest {
  return {
    partyType: "NATURAL_PERSON",
    partyName: `Somchai Rattanakorn ${randomUUID()}`,
    countryOfRegistration: "TH",
    identityEvidence: {
      evidenceIds: [randomUUID(), randomUUID()],
      evidenceLimitations: ["Copy of national ID card; not checked against the civil registry."],
    },
    ...overrides,
  };
}

async function post(body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async (partyName: string, key?: string) => ({
  parties: await count("SELECT count(*) AS n FROM scs.party_identity WHERE party_name = $1", [partyName]),
  evidence: await count("SELECT count(*) AS n FROM scs.party_identity_evidence WHERE party_id IN (SELECT party_id FROM scs.party_identity WHERE party_name = $1)", [partyName]),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt WHERE subject_id IN (SELECT party_id FROM scs.party_identity WHERE party_name = $1)", [partyName]),
  idempotency: key === undefined ? 0 : await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]),
});
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const totalParties = () => count("SELECT count(*) AS n FROM scs.party_identity");
const NOTHING = { parties: 0, evidence: 0, receipts: 0, idempotency: 0 };

function assertFailClosed(r: Awaited<ReturnType<typeof post>>, status: number, error: string) {
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.equal(r.json["noPartyRegistered"], true);
}

// ── Valid registration, each partyType ───────────────────────────────────────

for (const partyType of PARTY_TYPES) {
  test(`valid ${partyType} registration → 201; party, evidence links and receipt in the database`, async () => {
    const body = request({ partyType, countryOfOperation: "MY", submittingOrganizationId: "org-cap02-test" });
    const key = `cap02-${randomUUID()}`;
    const r = await post(body, { key });
    assert.equal(r.status, 201, JSON.stringify(r.json));

    const res = r.json as unknown as ScsPartyRegistrationResponse;
    const checked = runWithCorrelation("cap02-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02PartyRegistrationResponse, res));
    assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

    const d = res.decision;
    assert.equal(d.decision, "REGISTERED");
    assert.deepEqual(d.gaps, []);
    assert.deepEqual(d.decidedBy, actors.officer);
    for (const check of ["partyTypeValid", "partyNameProvided", "countryCodeValid", "registrantAuthorised"] as const) {
      assert.equal(d.eligibilityChecks[check], true, `${check} ran, so it is true`);
      assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
    }
    const conflictChecked = (CONFLICT_CHECKED as readonly string[]).includes(partyType);
    assert.equal(d.eligibilityChecks.noConflictingRegistrationDetected, conflictChecked, "true only where the conflict check ran");
    assert.ok(
      d.decisionReasons.some((x) => x.startsWith(`noConflictingRegistrationDetected: ${conflictChecked ? "evaluated" : "NOT EVALUATED"}`)),
      "the conflict check's reason says whether it ran",
    );
    assert.equal(d.decisionReasons.filter((x) => x.includes("NOT EVALUATED")).length, conflictChecked ? 0 : 1);
    assert.ok(d.decisionReasons.some((x) => x.startsWith("Registration is not verification")));

    const p = (await harness.admin.query(`SELECT * FROM scs.party_identity WHERE party_id = $1`, [d.partyId])).rows[0] as Record<string, unknown>;
    assert.equal(p["party_type"], partyType);
    assert.equal(p["party_name"], body.partyName);
    assert.equal(p["country_of_registration"], "TH");
    assert.equal(p["country_of_operation"], "MY");
    assert.equal(p["registration_status"], "REGISTERED");
    assert.equal(p["party_version"], 1);
    assert.equal(p["schema_version"], "1");
    assert.deepEqual(p["registered_by"], actors.officer);
    assert.deepEqual(p["provenance_submitted_by"], actors.officer);
    assert.equal(p["provenance_submitting_organization_id"], "org-cap02-test");
    assert.deepEqual(p["identity_evidence_limitations"], body.identityEvidence.evidenceLimitations);
    assert.equal((p["registered_at"] as Date).toISOString(), d.decidedAt);

    const links = (await harness.admin.query(`SELECT evidence_id FROM scs.party_identity_evidence WHERE party_id = $1 ORDER BY evidence_id`, [d.partyId])).rows as Array<{ evidence_id: string }>;
    assert.deepEqual(links.map((l) => l.evidence_id), [...body.identityEvidence.evidenceIds].sort());

    const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
    assert.equal(receipt["capability_id"], "SCS-CAP-02");
    assert.equal(receipt["decision_type"], "PARTY_REGISTRATION");
    assert.equal(receipt["subject_id"], d.partyId);
    assert.equal(receipt["decision"], "REGISTERED");
    assert.equal(receipt["idempotency_key"], key);
    assert.equal(receipt["receipt_digest"], res.receiptDigest);
    assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
    assert.deepEqual(res.receipt.decision, d, "the receipt records the decision returned");
    assert.equal(res.receipt.correlationId, r.headers.get("x-correlation-id"));

    assert.deepEqual(await writes(body.partyName, key), { parties: 1, evidence: 2, receipts: 1, idempotency: 1 });
  });
}

test("no evidence ids and no countryOfOperation → 201, no evidence links", async () => {
  const body = request({ identityEvidence: { evidenceIds: [], evidenceLimitations: [] } });
  const r = await post(body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const p = (await harness.admin.query(`SELECT country_of_operation FROM scs.party_identity WHERE party_name = $1`, [body.partyName])).rows[0] as Record<string, unknown>;
  assert.equal(p["country_of_operation"], null);
  assert.deepEqual(await writes(body.partyName), { parties: 1, evidence: 0, receipts: 1, idempotency: 0 });
});

// ── Conflicting registration ─────────────────────────────────────────────────

test("same partyName and countryOfRegistration → 409 CONFLICTING_REGISTRATION_DETECTED naming the existing partyId, nothing written", async () => {
  const partyName = `Rubber Growers Co-op ${randomUUID()}`;
  const first = await post(request({ partyName, partyType: "COOPERATIVE" }));
  assert.equal(first.status, 201);
  const existingId = (first.json["decision"] as { partyId: string }).partyId;
  const receiptsBefore = await totalReceipts();

  const key = `cap02-${randomUUID()}`;
  const r = await post(request({ partyName, partyType: "LEGAL_ENTITY" }), { key });
  assertFailClosed(r, 409, "CONFLICTING_REGISTRATION_DETECTED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.includes(existingId)), "the existing partyId is named");
  assert.deepEqual(await writes(partyName, key), { parties: 1, evidence: 2, receipts: 1, idempotency: 0 });
  assert.equal(await totalReceipts(), receiptsBefore);
});

test("same partyName, different countryOfRegistration → 201 (not a conflict)", async () => {
  const partyName = `Mekong Latex ${randomUUID()}`;
  assert.equal((await post(request({ partyName, partyType: "LEGAL_ENTITY", countryOfRegistration: "TH" }))).status, 201);
  assert.equal((await post(request({ partyName, partyType: "LEGAL_ENTITY", countryOfRegistration: "LA" }))).status, 201);
  assert.equal((await writes(partyName)).parties, 2);
});

test("RETIRED party with the same partyName and countryOfRegistration → 201, not a conflict", async () => {
  const partyName = `Retired Estate ${randomUUID()}`;
  // No endpoint retires a party yet; the owner seeds a RETIRED row directly.
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', 'RETIRED', '{}', $1, now()) RETURNING party_id`,
    [JSON.stringify(actors.officer), partyName],
  );
  const retiredId = rows[0]!.party_id;

  const r = await post(request({ partyName, partyType: "LEGAL_ENTITY" }));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.notEqual((r.json["decision"] as { partyId: string }).partyId, retiredId);
  assert.equal((await writes(partyName)).parties, 2);

  // …and the new, non-RETIRED registration now does conflict
  const again = await post(request({ partyName, partyType: "LEGAL_ENTITY" }));
  assert.equal(again.status, 409);
  assert.ok(!(again.json["reasons"] as string[]).some((x) => x.includes(retiredId)), "the RETIRED party is not named");
});

test("non-RETIRED statuses (REQUIRES_HUMAN_REVIEW, DISPUTED) do conflict", async () => {
  for (const status of ["REQUIRES_HUMAN_REVIEW", "DISPUTED"]) {
    const partyName = `Held Party ${randomUUID()}`;
    await harness.admin.query(
      `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
         country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
       VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', $3, '{}', $1, now())`,
      [JSON.stringify(actors.officer), partyName, status],
    );
    assert.equal((await post(request({ partyName, partyType: "LEGAL_ENTITY" }))).status, 409, status);
  }
});

test("concurrent registrations of the same name and country → exactly one 201, the other 409", async () => {
  const partyName = `Concurrent ${randomUUID()}`;
  const results = await Promise.all([post(request({ partyName, partyType: "COOPERATIVE" })), post(request({ partyName, partyType: "COOPERATIVE" }))]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await writes(partyName)).parties, 1);
});

test("every conflict-checked partyType conflicts on the same name and country", async () => {
  for (const partyType of CONFLICT_CHECKED) {
    const partyName = `Checked ${randomUUID()}`;
    assert.equal((await post(request({ partyName, partyType }))).status, 201, partyType);
    assertFailClosed(await post(request({ partyName, partyType })), 409, "CONFLICTING_REGISTRATION_DETECTED");
  }
});

test("two NATURAL_PERSON registrations with identical name and country both succeed", async () => {
  const partyName = `Somchai Rattanakorn ${randomUUID()}`;
  const first = await post(request({ partyName, partyType: "NATURAL_PERSON" }));
  const second = await post(request({ partyName, partyType: "NATURAL_PERSON" }));
  assert.equal(first.status, 201, JSON.stringify(first.json));
  assert.equal(second.status, 201, JSON.stringify(second.json));
  const ids = [first, second].map((r) => (r.json["decision"] as { partyId: string }).partyId);
  assert.notEqual(ids[0], ids[1], "two distinct parties");
  for (const r of [first, second]) {
    const d = r.json["decision"] as { decision: string; eligibilityChecks: Record<string, boolean>; decisionReasons: string[] };
    assert.equal(d.decision, "REGISTERED");
    assert.equal(d.eligibilityChecks["noConflictingRegistrationDetected"], false, "the conflict check did not run");
    assert.ok(d.decisionReasons.some((x) => /^noConflictingRegistrationDetected: NOT EVALUATED .*human review/.test(x)));
  }
  assert.deepEqual(await writes(partyName), { parties: 2, evidence: 4, receipts: 2, idempotency: 0 });
});

test("two OTHER registrations with identical name and country both succeed", async () => {
  const partyName = `Unclassified ${randomUUID()}`;
  assert.equal((await post(request({ partyName, partyType: "OTHER" }))).status, 201);
  assert.equal((await post(request({ partyName, partyType: "OTHER" }))).status, 201);
  assert.equal((await writes(partyName)).parties, 2);
});

test("NATURAL_PERSON / OTHER and organisations never conflict with each other, in either direction", async () => {
  for (const unchecked of NOT_CONFLICT_CHECKED) {
    // an existing person does not block an organisation of the same name…
    const a = `Shared Name ${randomUUID()}`;
    assert.equal((await post(request({ partyName: a, partyType: unchecked }))).status, 201);
    assert.equal((await post(request({ partyName: a, partyType: "LEGAL_ENTITY" }))).status, 201, `${unchecked} then LEGAL_ENTITY`);
    // …and an existing organisation does not block a person of the same name
    const b = `Shared Name ${randomUUID()}`;
    assert.equal((await post(request({ partyName: b, partyType: "COOPERATIVE" }))).status, 201);
    assert.equal((await post(request({ partyName: b, partyType: unchecked }))).status, 201, `COOPERATIVE then ${unchecked}`);
  }
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  for (const who of ["viewer", "admin"] as const) {
    const body = request();
    const key = `cap02-${randomUUID()}`;
    const r = await post(body, { key, who });
    assertFailClosed(r, 403, "REGISTRANT_NOT_AUTHORISED");
    assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it`));
    assert.deepEqual(await writes(body.partyName, key), NOTHING, who);
  }
});

test("authority is checked before the country code: unauthorised actor with a bad code → 403, not 422", async () => {
  const r = await post(request({ countryOfRegistration: "XX" }), { who: "viewer" });
  assert.equal(r.status, 403);
});

// ── Country codes ────────────────────────────────────────────────────────────

test("unrecognised countryOfRegistration → 422 COUNTRY_CODE_UNRECOGNISED, nothing written", async () => {
  for (const code of ["XX", "XK", "th", "THA", "Thailand", "EU"]) {
    const body = request({ countryOfRegistration: code });
    const key = `cap02-${randomUUID()}`;
    const r = await post(body, { key });
    assertFailClosed(r, 422, "COUNTRY_CODE_UNRECOGNISED");
    assert.deepEqual(r.json["reasons"], [`/countryOfRegistration: "${code}" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).`]);
    assert.deepEqual(await writes(body.partyName, key), NOTHING, code);
  }
});

test("unrecognised countryOfOperation → 422, and both bad codes are reported together", async () => {
  const one = request({ countryOfOperation: "ZZ" });
  const r1 = await post(one);
  assertFailClosed(r1, 422, "COUNTRY_CODE_UNRECOGNISED");
  assert.deepEqual(r1.json["reasons"], ['/countryOfOperation: "ZZ" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).']);
  assert.equal((await writes(one.partyName)).parties, 0);

  const r2 = await post(request({ countryOfRegistration: "QQ", countryOfOperation: "ZZ" }));
  assert.equal(r2.status, 422);
  assert.equal((r2.json["reasons"] as string[]).length, 2);
});

// ── Validation layer ─────────────────────────────────────────────────────────

test("missing partyName → 400 from the validation layer, nothing written", async () => {
  const { partyName: _omitted, ...body } = request();
  const before = await totalParties();
  const r = await post(body);
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.ok((r.json["reasons"] as string[]).includes('(root): missing required property "partyName"'));
  assert.equal(await totalParties(), before);
});

test("blank partyName → 400 from the validation layer, nothing written", async () => {
  const before = await totalParties();
  const r = await post(request({ partyName: "   " }));
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/partyName:")));
  assert.equal(await totalParties(), before);
});

test("invalid partyType → 400 from the validation layer, nothing written", async () => {
  const body = { ...request(), partyType: "SOLE_TRADER" };
  const r = await post(body);
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/partyType: must be one of")));
  assert.equal((await writes(body.partyName)).parties, 0);
});

test("evidence ids must be lowercase: an upper-case id, or the same id in two cases, → 400, nothing written", async () => {
  const id = randomUUID();
  for (const evidenceIds of [[id.toUpperCase()], [id, id.toUpperCase()]]) {
    const body = request({ identityEvidence: { evidenceIds, evidenceLimitations: [] } });
    const r = await post(body);
    assert.equal(r.status, 400, JSON.stringify(evidenceIds));
    assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
    assert.ok((r.json["reasons"] as string[]).some((x) => /^\/identityEvidence\/evidenceIds\/\d+: must match pattern/.test(x)));
    assert.equal((await writes(body.partyName)).parties, 0);
  }
});

test("duplicate evidence id within the request → 400 from schema validation", async () => {
  const id = randomUUID();
  const r = await post(request({ identityEvidence: { evidenceIds: [id, id], evidenceLimitations: [] } }));
  assert.equal(r.status, 400);
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/identityEvidence/evidenceIds: must NOT have duplicate items")));
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("duplicate idempotency key, same content → the same 201 response, no second write", async () => {
  const body = request();
  const key = `cap02-${randomUUID()}`;
  const first = await post(body, { key });
  const second = await post(body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text, "the replay is byte-identical to the original response");
  assert.deepEqual(await writes(body.partyName, key), { parties: 1, evidence: 2, receipts: 1, idempotency: 1 });
});

test("duplicate idempotency key, different content → 409 IDEMPOTENCY_KEY_CONFLICT, nothing written", async () => {
  const key = `cap02-${randomUUID()}`;
  assert.equal((await post(request(), { key })).status, 201);
  const before = await totalReceipts();

  const other = request();
  const r = await post(other, { key });
  assert.equal(r.status, 409);
  assert.equal(r.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.deepEqual(await writes(other.partyName), NOTHING);
  assert.equal(await totalReceipts(), before);
});

test("missing Idempotency-Key → 400, nothing written", async () => {
  const body = request();
  const r = await post(body, { key: null });
  assert.equal(r.status, 400);
  assert.equal((await writes(body.partyName)).parties, 0);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the party row and evidence links are absent too", async () => {
  // Simulate a receipt write failure: a test-only trigger makes every receipt INSERT fail.
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const body = request();
    const key = `cap02-${randomUUID()}`;
    const r = await post(body, { key });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noPartyRegistered"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"), "the database error text is not leaked");
    assert.deepEqual(await writes(body.partyName, key), NOTHING);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  // and registration works again once the failure is gone
  assert.equal((await post(request())).status, 201);
});

// ── Receipt immutability ─────────────────────────────────────────────────────

test("a CAP-02 receipt and party row cannot be updated by scs_api", async () => {
  const r = await post(request());
  const receiptId = (r.json["receipt"] as { receiptId: string }).receiptId;
  const partyId = (r.json["decision"] as { partyId: string }).partyId;
  await assert.rejects(
    api.transaction((tx) => tx.query(`UPDATE scs.decision_receipt SET decision = 'REJECTED' WHERE receipt_id = $1`, [receiptId])),
    /permission denied/,
  );
  await assert.rejects(
    api.transaction((tx) => tx.query(`UPDATE scs.party_identity SET registration_status = 'RETIRED' WHERE party_id = $1`, [partyId])),
    /permission denied/,
  );
});
