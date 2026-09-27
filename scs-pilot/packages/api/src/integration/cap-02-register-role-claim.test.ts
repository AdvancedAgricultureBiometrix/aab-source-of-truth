// SCS-CAP-02 POST /scs/v1/parties/:partyId/roles, end to end: real HTTP
// through the server layer, real PostgreSQL (database built from every
// migration), the API connected as a restricted member of scs_api. Frameworks
// and parties are registered through their own endpoints.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson, sha256Hex } from "../foundation/canonical.js";
import { runWithCorrelation } from "../foundation/correlation.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { validate } from "../foundation/validation.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ScsRoleClaimRequest, ScsRoleClaimResponse } from "../types/cap-02.js";
import { frameworkRequest, issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap02c-officer-token-0123456789abcdef",
  admin: "cap02c-sysadmin-token-0123456789abcdef",
  viewer: "cap02c-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap02c", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap02c", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02c", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const ROLES = ["OPERATOR", "SUPPLIER", "AGGREGATOR", "PROCESSOR", "EXPORTER", "IMPORTER", "TRADER"] as const;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
/** An ACTIVE EUDR framework for Thai natural rubber (4001 / TH, regulationVersion consolidated-2024). */
let rubberTH = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02c-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

async function created<K extends string>(path: string, body: unknown, idField: K): Promise<string> {
  const r = await post(path, body);
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<K, string>)[idField];
}
const registerFramework = () => created("/scs/v1/frameworks", frameworkRequest(), "frameworkId");
const registerParty = () => created("/scs/v1/parties", partyRequest("COOPERATIVE"), "partyId");
const rolesPath = (partyId: string) => `/scs/v1/parties/${partyId}/roles`;

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Array<keyof typeof TOKENS>).map((k) => ({
      tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"),
      actor: actors[k],
    })),
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  rubberTH = await registerFramework();
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

function claim(overrides: Partial<ScsRoleClaimRequest> = {}): ScsRoleClaimRequest {
  return {
    claimedRole: "AGGREGATOR",
    frameworkAssociationId: rubberTH,
    commodityScope: ["4001"],
    geographicScope: ["TH"],
    roleEvidenceIds: [randomUUID()],
    limitations: ["Self-declared by the cooperative's manager."],
    ...overrides,
  };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const claimsFor = (partyId: string) => count("SELECT count(*) AS n FROM scs.party_role_claim WHERE party_id = $1", [partyId]);
const totalClaims = () => count("SELECT count(*) AS n FROM scs.party_role_claim");
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const idempotencyRecords = (key: string) => count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]);

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(partyId: string, body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = { claims: await totalClaims(), receipts: await totalReceipts() };
  const key = `cap02c-${randomUUID()}`;
  const r = await post(rolesPath(partyId), body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.deepEqual({ claims: await totalClaims(), receipts: await totalReceipts(), idempotency: await idempotencyRecords(key) }, { ...before, idempotency: 0 });
  return r;
}

// ── Valid registration ───────────────────────────────────────────────────────

test("valid role claim → 201; CLAIMED_UNVERIFIED, frameworkVersion from CAP-01, current party version; receipt written", async () => {
  const partyId = await registerParty();
  const body = claim({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" });
  const key = `cap02c-${randomUUID()}`;
  const r = await post(rolesPath(partyId), body, { key });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const res = r.json as unknown as ScsRoleClaimResponse;
  const checked = runWithCorrelation("cap02c-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02RoleClaimResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

  const d = res.decision;
  assert.equal(d.decision, "REGISTERED");
  assert.equal(d.partyId, partyId);
  assert.equal(d.partyVersion, 1);
  assert.equal(Object.keys(d.eligibilityChecks).length, 9);
  for (const [check, value] of Object.entries(d.eligibilityChecks)) {
    assert.equal(value, true, check);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
  }
  assert.ok(!d.decisionReasons.some((x) => x.includes("not paired per framework")), "one framework: no pairing gap to disclose");
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Registration is not verification") && x.includes("Neither the role nor the party is verified")));
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: ") && x.includes("are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest")));

  const row = (await harness.admin.query(`SELECT * FROM scs.party_role_claim WHERE role_claim_id = $1`, [d.roleClaimId])).rows[0] as Record<string, unknown>;
  assert.equal(row["party_id"], partyId);
  assert.equal(row["party_version"], 1);
  assert.equal(row["claimed_role"], "AGGREGATOR");
  assert.equal(row["other_role_description"], null);
  assert.equal(row["framework_association_id"], rubberTH);
  assert.equal(row["framework_version"], "consolidated-2024", "the CAP-01 framework's regulationVersion, set by the system");
  assert.deepEqual(row["commodity_scope"], ["4001"]);
  assert.deepEqual(row["geographic_scope"], ["TH"]);
  assert.deepEqual(row["role_evidence_ids"], body.roleEvidenceIds);
  assert.deepEqual(row["limitations"], body.limitations);
  assert.equal(row["verification_status"], "CLAIMED_UNVERIFIED");
  assert.equal((row["valid_from"] as Date).toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal((row["valid_until"] as Date).toISOString(), "2027-01-01T00:00:00.000Z");
  assert.deepEqual(row["claimed_by"], issuedReference(actors.officer));
  assert.equal((row["claimed_at"] as Date).toISOString(), d.decidedAt);

  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["decision_type"], "ROLE_CLAIM_REGISTRATION");
  assert.equal(receipt["subject_id"], d.roleClaimId);
  assert.equal(receipt["idempotency_key"], key);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d);
});

test("every claimedRole registers; OTHER with its description", async () => {
  const partyId = await registerParty();
  for (const claimedRole of ROLES) assert.equal((await post(rolesPath(partyId), claim({ claimedRole }))).status, 201, claimedRole);
  const r = await post(rolesPath(partyId), claim({ claimedRole: "OTHER", otherRoleDescription: "Latex quality tester" }));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const row = (await harness.admin.query(`SELECT other_role_description FROM scs.party_role_claim WHERE role_claim_id = $1`, [
    (r.json["decision"] as { roleClaimId: string }).roleClaimId,
  ])).rows[0] as Record<string, unknown>;
  assert.equal(row["other_role_description"], "Latex quality tester");
  assert.equal(await claimsFor(partyId), 8);
});

test("the client cannot supply frameworkVersion or verificationStatus", async () => {
  const partyId = await registerParty();
  for (const extra of [{ frameworkVersion: "made-up" }, { verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE" }, { partyVersion: 7 }]) {
    const r = await assertRefused(partyId, { ...claim(), ...extra }, 400, "REQUEST_VALIDATION_FAILED");
    assert.match((r.json["reasons"] as string[])[0]!, /unknown property .* is not allowed/);
  }
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  const partyId = await registerParty();
  for (const who of ["viewer", "admin"] as const) {
    const r = await assertRefused(partyId, claim(), 403, "REGISTRANT_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Registering a role claim requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

test("authority is checked first: an unauthorised actor gets 403 even for an unknown party", async () => {
  await assertRefused(randomUUID(), claim(), 403, "REGISTRANT_NOT_AUTHORISED", { who: "viewer" });
});

// ── Request-level rules ──────────────────────────────────────────────────────

test("claimedRole OTHER without a description → 400 OTHER_TYPE_REQUIRES_DESCRIPTION", async () => {
  await assertRefused(await registerParty(), claim({ claimedRole: "OTHER" }), 400, "OTHER_TYPE_REQUIRES_DESCRIPTION");
});

test("a description without OTHER → 400 REQUEST_VALIDATION_FAILED, refused not ignored", async () => {
  const r = await assertRefused(await registerParty(), claim({ otherRoleDescription: "Something" }), 400, "REQUEST_VALIDATION_FAILED");
  assert.deepEqual(r.json["reasons"], ["/otherRoleDescription: must be absent unless claimedRole is OTHER (it is AGGREGATOR)."]);
});

test("validUntil not after validFrom → 400 VALIDITY_PERIOD_INVALID", async () => {
  await assertRefused(await registerParty(), claim({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2025-01-01T00:00:00Z" }), 400, "VALIDITY_PERIOD_INVALID");
});

test("schema: unknown role, empty scope, no framework, upper-case framework id → 400 REQUEST_VALIDATION_FAILED", async () => {
  const partyId = await registerParty();
  const { frameworkAssociationId: _omitted, ...noFramework } = claim();
  for (const bad of [
    claim({ claimedRole: "BROKER" as never }),
    claim({ commodityScope: [] }),
    claim({ geographicScope: [] }),
    noFramework,
    claim({ frameworkAssociationId: rubberTH.toUpperCase() }),
  ]) {
    await assertRefused(partyId, bad, 400, "REQUEST_VALIDATION_FAILED");
  }
});

// ── Party ────────────────────────────────────────────────────────────────────

test("party not registered → 404 PARTY_NOT_FOUND; partyId not a UUID → 400", async () => {
  const missing = randomUUID();
  const r = await assertRefused(missing, claim(), 404, "PARTY_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`No party is registered with partyId ${missing}.`]);
  await assertRefused("not-a-uuid", claim(), 400, "REQUEST_VALIDATION_FAILED");
});

test("RETIRED party → 422 PARTY_RETIRED", async () => {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', 'RETIRED', '{}', $1, now()) RETURNING party_id`,
    [JSON.stringify(actors.officer), `Retired ${randomUUID()}`],
  );
  await assertRefused(rows[0]!.party_id, claim(), 422, "PARTY_RETIRED");
});

// ── Framework and scope ──────────────────────────────────────────────────────

test("framework not registered → 422 FRAMEWORK_ASSOCIATION_NOT_FOUND; SUPERSEDED → 422 FRAMEWORK_NOT_ACTIVE", async () => {
  const partyId = await registerParty();
  await assertRefused(partyId, claim({ frameworkAssociationId: randomUUID() }), 422, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  const superseded = await registerFramework();
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'SUPERSEDED' WHERE framework_id = $1`, [superseded]);
  await assertRefused(partyId, claim({ frameworkAssociationId: superseded }), 422, "FRAMEWORK_NOT_ACTIVE");
});

test("scope outside the framework → 422 SCOPE_OUTSIDE_FRAMEWORK naming every value", async () => {
  const r = await assertRefused(await registerParty(), claim({ commodityScope: ["4001", "1511"], geographicScope: ["MY"] }), 422, "SCOPE_OUTSIDE_FRAMEWORK");
  assert.deepEqual(r.json["reasons"], [
    '/commodityScope: "1511" is not the commodityCode of any referenced framework (4001).',
    '/geographicScope: "MY" is not the countryOfOrigin of any referenced framework (TH).',
  ]);
});

// ── Conflicts ────────────────────────────────────────────────────────────────

test("same party, role and framework with overlapping validity → 409 CONFLICTING_RECORD naming the existing claim", async () => {
  const partyId = await registerParty();
  const first = await post(rolesPath(partyId), claim({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" }));
  assert.equal(first.status, 201);
  const existing = (first.json["decision"] as { roleClaimId: string }).roleClaimId;
  const r = await assertRefused(partyId, claim({ validFrom: "2026-06-01T00:00:00Z" }), 409, "CONFLICTING_RECORD");
  assert.ok((r.json["reasons"] as string[])[0]!.includes(existing));
});

test("not conflicts: another role, another framework, an adjacent period, another party", async () => {
  const partyId = await registerParty();
  const period = { validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" };
  assert.equal((await post(rolesPath(partyId), claim(period))).status, 201);
  assert.equal((await post(rolesPath(partyId), claim({ ...period, claimedRole: "PROCESSOR" }))).status, 201, "another role");
  assert.equal((await post(rolesPath(partyId), claim({ ...period, frameworkAssociationId: await registerFramework() }))).status, 201, "another framework");
  assert.equal((await post(rolesPath(partyId), claim({ validFrom: "2027-01-01T00:00:00Z", validUntil: "2028-01-01T00:00:00Z" }))).status, 201, "adjacent period");
  assert.equal((await post(rolesPath(await registerParty()), claim(period))).status, 201, "another party");
  assert.equal(await claimsFor(partyId), 4);
});

test("a SUPERSEDED or EXPIRED claim does not block a new overlapping claim; any other status does (contract gap, consistent reading)", async () => {
  // no endpoint changes a claim's status yet; the owner sets it
  const setStatus = (roleClaimId: string, status: string) =>
    harness.admin.query(`UPDATE scs.party_role_claim SET verification_status = $1 WHERE role_claim_id = $2`, [status, roleClaimId]);
  for (const status of ["SUPERSEDED", "EXPIRED"]) {
    const partyId = await registerParty();
    const first = await post(rolesPath(partyId), claim());
    await setStatus((first.json["decision"] as { roleClaimId: string }).roleClaimId, status);
    const second = await post(rolesPath(partyId), claim());
    assert.equal(second.status, 201, `${status}: ${JSON.stringify(second.json)}`);
    assert.equal(await claimsFor(partyId), 2);
  }
  for (const status of ["EVIDENCE_SUBMITTED", "PARTIALLY_VERIFIED", "VERIFIED_FOR_DECLARED_SCOPE", "DISPUTED", "FAIL_CLOSED"]) {
    const partyId = await registerParty();
    const first = await post(rolesPath(partyId), claim());
    await setStatus((first.json["decision"] as { roleClaimId: string }).roleClaimId, status);
    await assertRefused(partyId, claim(), 409, "CONFLICTING_RECORD");
  }
});

test("concurrent identical claims → exactly one 201, the other 409", async () => {
  const partyId = await registerParty();
  const results = await Promise.all([post(rolesPath(partyId), claim()), post(rolesPath(partyId), claim())]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await claimsFor(partyId), 1);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing key → 400; same key same content → byte-identical replay; different content or party → 409", async () => {
  const partyId = await registerParty();
  const body = claim();
  assert.equal((await post(rolesPath(partyId), body, { key: null })).status, 400);
  assert.equal(await claimsFor(partyId), 0);

  const key = `cap02c-${randomUUID()}`;
  const first = await post(rolesPath(partyId), body, { key });
  const second = await post(rolesPath(partyId), body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.equal((await post(rolesPath(partyId), claim({ claimedRole: "TRADER" }), { key })).status, 409, "different content");
  const other = await registerParty();
  assert.equal((await post(rolesPath(other), body, { key })).status, 409, "same body, different party");
  assert.equal(await claimsFor(partyId), 1);
  assert.equal(await claimsFor(other), 0);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the role claim row is absent", async () => {
  const partyId = await registerParty();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const r = await post(rolesPath(partyId), claim());
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.equal(await claimsFor(partyId), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(rolesPath(partyId), claim())).status, 201, "and registration works again once the failure is gone");
});

// ── Database backstops (migration 009) ──────────────────────────────────────

test("migration 009: the database refuses an unregistered framework, OTHER without a description, a stray description and empty scope", async () => {
  const partyId = await registerParty();
  const insert = (framework: string, role: string, description: string | null, commodities: string[]) =>
    harness.admin.query(
      `INSERT INTO scs.party_role_claim (party_id, party_version, claimed_role, other_role_description, framework_association_id,
         framework_version, commodity_scope, geographic_scope, role_evidence_ids, verification_status, limitations, claimed_at, claimed_by)
       VALUES ($1, 1, $2, $3, $4, 'v', $5, '{TH}', '{}', 'CLAIMED_UNVERIFIED', '{}', now(), $6)`,
      [partyId, role, description, framework, commodities, JSON.stringify(actors.officer)],
    );
  await assert.rejects(insert(randomUUID(), "SUPPLIER", null, ["4001"]), /party_role_claim_framework_fk/);
  await assert.rejects(insert(rubberTH, "OTHER", null, ["4001"]), /party_role_claim_other_role_description_ck/);
  await assert.rejects(insert(rubberTH, "SUPPLIER", "x", ["4001"]), /party_role_claim_other_role_description_ck/);
  await assert.rejects(insert(rubberTH, "SUPPLIER", null, []), /party_role_claim_scope_not_empty_ck/);
  // and a framework referenced by a role claim cannot be deleted
  await insert(rubberTH, "SUPPLIER", null, ["4001"]);
  await assert.rejects(harness.admin.query(`DELETE FROM scs.regulatory_framework WHERE framework_id = $1`, [rubberTH]), /party_role_claim_framework_fk/);
});
