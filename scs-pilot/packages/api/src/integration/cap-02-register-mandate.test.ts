// SCS-CAP-02 POST /scs/v1/mandates, end to end: real HTTP through the server
// layer, real PostgreSQL (database built from every migration), the API
// connected as a restricted member of scs_api. Frameworks, parties and the
// prerequisite relationships are registered through their own endpoints.

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
import type { ScsMandateRegistrationRequest, ScsMandateRegistrationResponse, ScsRelationshipRegistrationRequest } from "../types/cap-02.js";
import { frameworkRequest, issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap02m-officer-token-0123456789abcdef",
  admin: "cap02m-sysadmin-token-0123456789abcdef",
  viewer: "cap02m-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap02m", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap02m", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02m", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const MANDATES = "/scs/v1/mandates";

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
/** An ACTIVE EUDR framework for Thai natural rubber (4001 / TH). */
let rubberTH = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02m-${randomUUID()}` : opts.key;
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
const registerFramework = (commodity?: string, country?: string) => created("/scs/v1/frameworks", frameworkRequest(commodity, country), "frameworkId");
const registerParty = (type?: Parameters<typeof partyRequest>[0]) => created("/scs/v1/parties", partyRequest(type), "partyId");

/** A relationship from → to through the API (claimed by `from`); returns its relationshipId. */
function registerRelationship(from: string, to: string, overrides: Partial<ScsRelationshipRegistrationRequest> = {}): Promise<string> {
  return created(
    "/scs/v1/relationships",
    {
      fromPartyId: from,
      toPartyId: to,
      relationshipType: "SUPPLIES_TO",
      commodityScope: ["4001"],
      geographicScope: ["TH"],
      frameworkAssociationIds: [rubberTH],
      claimedByPartyId: from,
      relationshipEvidenceIds: [],
      ...overrides,
    },
    "relationshipId",
  );
}

async function seedRetiredParty(): Promise<string> {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'NATURAL_PERSON', $2, 'TH', 'RETIRED', '{}', $1, now()) RETURNING party_id`,
    [JSON.stringify(actors.officer), `Retired ${randomUUID()}`],
  );
  return rows[0]!.party_id;
}

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

/**
 * A smallholder (granting) and a cooperative (representative) with a
 * SUPPLIES_TO relationship between them, and a valid mandate request for the
 * pair. `withRelationship: false` skips the relationship.
 */
async function scenario(overrides: Partial<ScsMandateRegistrationRequest> = {}, opts: { withRelationship?: boolean } = {}) {
  const smallholder = await registerParty("NATURAL_PERSON");
  const cooperative = await registerParty("COOPERATIVE");
  const relationshipId = opts.withRelationship === false ? null : await registerRelationship(smallholder, cooperative);
  const body: ScsMandateRegistrationRequest = {
    grantingPartyId: smallholder,
    representativePartyId: cooperative,
    permittedActions: ["SUBMIT_IDENTITY_EVIDENCE", "SUBMIT_CUSTODY_EVIDENCE"],
    frameworkAssociationIds: [rubberTH],
    commodityScope: ["4001"],
    geographicScope: ["TH"],
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
    mandateEvidenceIds: [randomUUID()],
    ...overrides,
  };
  return { smallholder, cooperative, relationshipId, body };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const mandatesFrom = (granting: string) => count("SELECT count(*) AS n FROM scs.representation_mandate WHERE granting_party_id = $1", [granting]);
const totalMandates = () => count("SELECT count(*) AS n FROM scs.representation_mandate");
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const idempotencyRecords = (key: string) => count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]);

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = { mandates: await totalMandates(), receipts: await totalReceipts() };
  const key = `cap02m-${randomUUID()}`;
  const r = await post(MANDATES, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.deepEqual({ mandates: await totalMandates(), receipts: await totalReceipts(), idempotency: await idempotencyRecords(key) }, { ...before, idempotency: 0 });
  return r;
}

// ── Valid registration ───────────────────────────────────────────────────────

test("valid mandate → 201; CLAIMED_UNVERIFIED, NOT_REVOKED, boundary flags true; receipt written", async () => {
  const { body, relationshipId } = await scenario();
  const key = `cap02m-${randomUUID()}`;
  const r = await post(MANDATES, body, { key });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const res = r.json as unknown as ScsMandateRegistrationResponse;
  const checked = runWithCorrelation("cap02m-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02MandateRegistrationResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

  const d = res.decision;
  assert.equal(d.decision, "REGISTERED");
  assert.equal(Object.keys(d.eligibilityChecks).length, 13);
  for (const [check, value] of Object.entries(d.eligibilityChecks)) {
    assert.equal(value, true, check);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
  }
  assert.ok(d.decisionReasons.some((x) => x.startsWith(`activeRelationshipExists: evaluated — relationship ${relationshipId} is ACTIVE`)));
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: ") && x.includes("are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest") && x.includes("Nothing confirms that the granting party agreed")));
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Registration is not verification") && x.includes("permitting only SUBMIT_IDENTITY_EVIDENCE, SUBMIT_CUSTODY_EVIDENCE")));

  const row = (await harness.admin.query(`SELECT * FROM scs.representation_mandate WHERE mandate_id = $1`, [d.mandateId])).rows[0] as Record<string, unknown>;
  assert.equal(row["granting_party_id"], body.grantingPartyId);
  assert.equal(row["representative_party_id"], body.representativePartyId);
  assert.deepEqual(row["permitted_actions"], body.permittedActions);
  assert.equal(row["other_action_description"], null);
  assert.deepEqual(row["framework_association_ids"], [rubberTH]);
  assert.deepEqual(row["mandate_evidence_ids"], body.mandateEvidenceIds);
  assert.equal((row["valid_from"] as Date).toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal((row["valid_until"] as Date).toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(row["verification_status"], "CLAIMED_UNVERIFIED");
  assert.equal(row["revocation_status"], "NOT_REVOKED");
  assert.equal(row["revoked_at"], null);
  assert.equal(row["schema_version"], "1");
  assert.deepEqual(row["created_by"], issuedReference(actors.officer));
  for (const flag of Object.keys(row).filter((k) => k.startsWith("boundary_"))) assert.equal(row[flag], true, flag);
  assert.equal(Object.keys(row).filter((k) => k.startsWith("boundary_")).length, 6);

  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["decision_type"], "MANDATE_REGISTRATION");
  assert.equal(receipt["subject_id"], d.mandateId);
  assert.equal(receipt["idempotency_key"], key);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d);
});

test("the prerequisite relationship may run in the other direction and be of any type", async () => {
  const { smallholder, cooperative, body } = await scenario({}, { withRelationship: false });
  await registerRelationship(cooperative, smallholder, { relationshipType: "AGGREGATES_FOR" });
  assert.equal((await post(MANDATES, body)).status, 201);
});

test("OTHER_EXPLICITLY_NAMED with its description → 201, description stored", async () => {
  const { body } = await scenario({ permittedActions: ["OTHER_EXPLICITLY_NAMED"], otherActionDescription: "Collect latex weight tickets" });
  const r = await post(MANDATES, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const row = (await harness.admin.query(`SELECT other_action_description FROM scs.representation_mandate WHERE mandate_id = $1`, [
    (r.json["decision"] as { mandateId: string }).mandateId,
  ])).rows[0] as Record<string, unknown>;
  assert.equal(row["other_action_description"], "Collect latex weight tickets");
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  const { body } = await scenario();
  for (const who of ["viewer", "admin"] as const) {
    const r = await assertRefused(body, 403, "REGISTRANT_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Registering a mandate requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

test("authority is checked first: an unauthorised actor gets 403 even for a self-granted mandate", async () => {
  const { body } = await scenario();
  await assertRefused({ ...body, representativePartyId: body.grantingPartyId }, 403, "REGISTRANT_NOT_AUTHORISED", { who: "viewer" });
});

// ── Request-level rules ──────────────────────────────────────────────────────

test("OTHER_EXPLICITLY_NAMED without a description → 400 OTHER_TYPE_REQUIRES_DESCRIPTION", async () => {
  const { body } = await scenario({ permittedActions: ["SUBMIT_IDENTITY_EVIDENCE", "OTHER_EXPLICITLY_NAMED"] });
  await assertRefused(body, 400, "OTHER_TYPE_REQUIRES_DESCRIPTION");
});

test("a description without OTHER_EXPLICITLY_NAMED → 400 REQUEST_VALIDATION_FAILED, refused not ignored", async () => {
  const { body } = await scenario({ otherActionDescription: "Something" });
  const r = await assertRefused(body, 400, "REQUEST_VALIDATION_FAILED");
  assert.deepEqual(r.json["reasons"], ["/otherActionDescription: must be absent unless permittedActions includes OTHER_EXPLICITLY_NAMED."]);
});

test("schema: no expiry, no consent evidence, an action outside the enumeration, no or duplicate actions, no framework → 400", async () => {
  const { body } = await scenario();
  const { validUntil: _omitted, ...noExpiry } = body;
  const cases: Array<[unknown, RegExp]> = [
    [noExpiry, /^\(root\): missing required property "validUntil"$/],
    [{ ...body, mandateEvidenceIds: [] }, /^\/mandateEvidenceIds: must NOT have fewer than 1 items$/],
    [{ ...body, permittedActions: ["APPROVE_GRANTING_PARTY"] }, /^\/permittedActions\/0: must be one of/],
    [{ ...body, permittedActions: [] }, /^\/permittedActions: must NOT have fewer than 1 items$/],
    [{ ...body, permittedActions: ["SUBMIT_CUSTODY_EVIDENCE", "SUBMIT_CUSTODY_EVIDENCE"] }, /^\/permittedActions: must NOT have duplicate items/],
    [{ ...body, frameworkAssociationIds: [] }, /^\/frameworkAssociationIds: must NOT have fewer than 1 items$/],
  ];
  for (const [bad, reason] of cases) {
    const r = await assertRefused(bad, 400, "REQUEST_VALIDATION_FAILED");
    assert.ok((r.json["reasons"] as string[]).some((x) => reason.test(x)), `${reason}: ${JSON.stringify(r.json["reasons"])}`);
  }
});

test("validUntil not after validFrom → 400 VALIDITY_PERIOD_INVALID", async () => {
  const { body } = await scenario({ validUntil: "2026-01-01T00:00:00Z" });
  await assertRefused(body, 400, "VALIDITY_PERIOD_INVALID");
});

test("granting party = representative party → 400 SELF_GRANTED_MANDATE", async () => {
  const { body } = await scenario();
  const r = await assertRefused({ ...body, representativePartyId: body.grantingPartyId }, 400, "SELF_GRANTED_MANDATE");
  assert.match((r.json["reasons"] as string[])[0]!, /a party cannot grant a mandate to itself/);
});

// ── Parties ──────────────────────────────────────────────────────────────────

test("granting party not registered → 422 GRANTING_PARTY_NOT_FOUND; representative → 422 REPRESENTATIVE_PARTY_NOT_FOUND", async () => {
  const { body } = await scenario();
  await assertRefused({ ...body, grantingPartyId: randomUUID() }, 422, "GRANTING_PARTY_NOT_FOUND");
  await assertRefused({ ...body, representativePartyId: randomUUID() }, 422, "REPRESENTATIVE_PARTY_NOT_FOUND");
});

test("a RETIRED party on either side → 422 PARTY_RETIRED", async () => {
  const { body } = await scenario();
  const retired = await seedRetiredParty();
  await assertRefused({ ...body, grantingPartyId: retired }, 422, "PARTY_RETIRED");
  await assertRefused({ ...body, representativePartyId: retired }, 422, "PARTY_RETIRED");
});

// ── Frameworks and scope ─────────────────────────────────────────────────────

test("framework not registered → 422 FRAMEWORK_ASSOCIATION_NOT_FOUND; WITHDRAWN → 422 FRAMEWORK_NOT_ACTIVE", async () => {
  const { body } = await scenario();
  await assertRefused({ ...body, frameworkAssociationIds: [randomUUID()] }, 422, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  const withdrawn = await registerFramework();
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'WITHDRAWN' WHERE framework_id = $1`, [withdrawn]);
  await assertRefused({ ...body, frameworkAssociationIds: [withdrawn] }, 422, "FRAMEWORK_NOT_ACTIVE");
});

test("scope outside the framework → 422 SCOPE_OUTSIDE_FRAMEWORK", async () => {
  const { body } = await scenario({ commodityScope: ["0901"] });
  const r = await assertRefused(body, 422, "SCOPE_OUTSIDE_FRAMEWORK");
  assert.deepEqual(r.json["reasons"], ['/commodityScope: "0901" is not the commodityCode of any referenced framework (4001).']);
});

// ── Relationship prerequisite ────────────────────────────────────────────────

test("no relationship between the two parties → 422 RELATIONSHIP_NOT_FOUND", async () => {
  const { body } = await scenario({}, { withRelationship: false });
  const r = await assertRefused(body, 422, "RELATIONSHIP_NOT_FOUND");
  assert.match((r.json["reasons"] as string[])[0]!, /No ACTIVE, unexpired relationship between/);
});

test("a relationship with only one of the parties does not count", async () => {
  const { smallholder, body } = await scenario({}, { withRelationship: false });
  const other = await registerParty("COOPERATIVE");
  await registerRelationship(smallholder, other);
  await assertRefused(body, 422, "RELATIONSHIP_NOT_FOUND");
});

test("a relationship that does not reference every mandate framework → 422 RELATIONSHIP_NOT_FOUND", async () => {
  const secondRubber = await registerFramework();
  const { body } = await scenario({ frameworkAssociationIds: [rubberTH, secondRubber] });
  await assertRefused(body, 422, "RELATIONSHIP_NOT_FOUND");
});

test("an expired relationship → 422 RELATIONSHIP_NOT_FOUND", async () => {
  const { smallholder, cooperative, body } = await scenario({}, { withRelationship: false });
  await registerRelationship(smallholder, cooperative, { validFrom: "2020-01-01T00:00:00Z", validUntil: "2021-01-01T00:00:00Z" });
  await assertRefused(body, 422, "RELATIONSHIP_NOT_FOUND");
});

test("a relationship that is not ACTIVE → 422 RELATIONSHIP_NOT_FOUND", async () => {
  const { relationshipId, body } = await scenario();
  // no endpoint withdraws a relationship yet; the owner sets it
  await harness.admin.query(`UPDATE scs.supply_chain_relationship SET lifecycle_status = 'WITHDRAWN' WHERE relationship_id = $1`, [relationshipId]);
  await assertRefused(body, 422, "RELATIONSHIP_NOT_FOUND");
});

// ── Conflicts ────────────────────────────────────────────────────────────────

test("same pair, shared framework and action, overlapping validity → 409 CONFLICTING_RECORD naming the existing mandate", async () => {
  const { body } = await scenario();
  const first = await post(MANDATES, body);
  assert.equal(first.status, 201);
  const existing = (first.json["decision"] as { mandateId: string }).mandateId;
  const r = await assertRefused(
    { ...body, permittedActions: ["SUBMIT_CUSTODY_EVIDENCE"], validFrom: "2026-06-01T00:00:00Z", validUntil: "2026-07-01T00:00:00Z", mandateEvidenceIds: [randomUUID()] },
    409,
    "CONFLICTING_RECORD",
  );
  assert.ok((r.json["reasons"] as string[])[0]!.includes(existing));
});

test("not conflicts: different actions, adjacent periods, the reverse grant, a revoked mandate", async () => {
  const { body, smallholder, cooperative } = await scenario();
  const first = await post(MANDATES, body);
  assert.equal(first.status, 201);
  assert.equal((await post(MANDATES, { ...body, permittedActions: ["SUBMIT_DEFORESTATION_EVIDENCE"] })).status, 201, "different actions");
  assert.equal((await post(MANDATES, { ...body, validFrom: "2027-01-01T00:00:00Z", validUntil: "2028-01-01T00:00:00Z" })).status, 201, "adjacent period");
  assert.equal((await post(MANDATES, { ...body, grantingPartyId: cooperative, representativePartyId: smallholder })).status, 201, "reverse grant");
  // no endpoint revokes a mandate yet; the owner sets it
  await harness.admin.query(
    `UPDATE scs.representation_mandate SET revocation_status = 'REVOKED', revoked_at = now(), revocation_reason = 'test' WHERE mandate_id = $1`,
    [(first.json["decision"] as { mandateId: string }).mandateId],
  );
  assert.equal((await post(MANDATES, body)).status, 201, "the conflicting mandate is revoked");
  assert.equal(await mandatesFrom(smallholder), 4);
});

test("concurrent identical registrations → exactly one 201, the other 409", async () => {
  const { body, smallholder } = await scenario();
  const results = await Promise.all([post(MANDATES, body), post(MANDATES, body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await mandatesFrom(smallholder), 1);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400; same key same content → byte-identical replay; same key different content → 409", async () => {
  const { body, smallholder } = await scenario();
  assert.equal((await post(MANDATES, body, { key: null })).status, 400);
  assert.equal(await mandatesFrom(smallholder), 0);

  const key = `cap02m-${randomUUID()}`;
  const first = await post(MANDATES, body, { key });
  const second = await post(MANDATES, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  const conflict = await post(MANDATES, { ...body, permittedActions: ["SUBMIT_DEFORESTATION_EVIDENCE"] }, { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(await mandatesFrom(smallholder), 1);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the mandate row is absent", async () => {
  const { body, smallholder } = await scenario();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const r = await post(MANDATES, body);
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.equal(await mandatesFrom(smallholder), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(MANDATES, body)).status, 201, "and registration works again once the failure is gone");
});

// ── Database backstops (migration 008) ──────────────────────────────────────

test("migration 008: the database refuses a mandate with no expiry, no consent evidence or empty scope", async () => {
  const { body } = await scenario();
  const insert = (validUntil: string | null, evidence: string[], commodities: string[]) =>
    harness.admin.query(
      `INSERT INTO scs.representation_mandate (schema_version, granting_party_id, representative_party_id, permitted_actions,
         framework_association_ids, commodity_scope, geographic_scope, valid_from, valid_until, mandate_evidence_ids,
         verification_status, revocation_status, created_by)
       VALUES ('1', $1, $2, '{SUBMIT_IDENTITY_EVIDENCE}', $3, $4, '{TH}', now(), $5, $6, 'CLAIMED_UNVERIFIED', 'NOT_REVOKED', $7)`,
      [body.grantingPartyId, body.representativePartyId, [rubberTH], commodities, validUntil, evidence, JSON.stringify(actors.officer)],
    );
  const later = new Date(Date.now() + 86_400_000).toISOString();
  await assert.rejects(insert(null, [randomUUID()], ["4001"]), /null value in column "valid_until"/);
  await assert.rejects(insert(later, [], ["4001"]), /representation_mandate_consent_evidence_ck/);
  await assert.rejects(insert(later, [randomUUID()], []), /representation_mandate_scope_not_empty_ck/);
});
