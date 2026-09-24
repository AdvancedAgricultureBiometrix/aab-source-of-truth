// SCS-CAP-02 POST /scs/v1/relationships, end to end: real HTTP through the
// server layer, real PostgreSQL (database built from every migration), the
// API connected as a restricted member of scs_api. Parties are registered
// through POST /scs/v1/parties and frameworks through POST /scs/v1/frameworks.

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
import type { ScsRelationshipRegistrationRequest, ScsRelationshipRegistrationResponse } from "../types/cap-02.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap02r-officer-token-0123456789abcdef",
  admin: "cap02r-sysadmin-token-0123456789abcdef",
  viewer: "cap02r-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap02r", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap02r", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02r", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const RELATIONSHIPS = "/scs/v1/relationships";

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
/** An ACTIVE EUDR framework for Thai natural rubber (4001 / TH), registered once. */
let rubberTH = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02r-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

/** Register an SCS-CAP-01 framework through the API; returns its frameworkId. */
async function registerFramework(commodityCode = "4001", countryOfOrigin = "TH"): Promise<string> {
  const r = await post("/scs/v1/frameworks", {
    applicableLawsAttested: true,
    regulation: {
      regulationId: `EUDR-${randomUUID()}`,
      regulationName: "EU Deforestation Regulation",
      regulationVersion: "consolidated-2024",
      regulationDate: "2023-05-31",
      regulatoryAuthority: "European Commission",
      sourceReference: "Regulation (EU) 2023/1115",
    },
    scope: {
      commodityCode,
      commodityName: `Commodity ${commodityCode}`,
      countryOfOrigin,
      destinationMarket: "EU",
      applicableNationalLaws: ["National forestry law"],
      effectiveFrom: "2025-12-30",
    },
    evidenceRequirements: {
      deforestationEvidence: {
        referenceCutoffDate: "2020-12-31",
        requiredCoverageType: "FULL_PLOT_COVERAGE",
        acceptedSourceTypes: ["SATELLITE_IMAGE"],
        minimumResolutionMetres: 10,
        integrityRequirement: "VERIFIED",
        authorityConfirmationRequired: false,
      },
      custodyEvidence: { requiredDocumentTypes: ["PURCHASE_RECEIPT"], chainOfCustodyStandards: [], traceabilityDepth: "FULL_CHAIN" },
      plotRequirements: { geolocationRequired: true, landRegistryRequired: false, minimumPlotIdentifierType: "GPS_POLYGON", ownershipVerificationRequired: false },
      sufficiencyThreshold: { allPlotsRegistered: true, allPlotsHaveDeforestationEvidence: true, custodyChainComplete: true, noUnresolvedGaps: true, humanReviewCompleted: true },
      specLimitations: [],
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return (r.json["decision"] as { frameworkId: string }).frameworkId;
}

/** Register a party through the API; returns its partyId. */
async function registerParty(partyType = "LEGAL_ENTITY"): Promise<string> {
  const r = await post("/scs/v1/parties", {
    partyType,
    partyName: `Relationship Test Party ${randomUUID()}`,
    countryOfRegistration: "TH",
    identityEvidence: { evidenceIds: [], evidenceLimitations: [] },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return (r.json["decision"] as { partyId: string }).partyId;
}

/** A party in a status the API cannot yet produce, seeded by the owner. */
async function seedRetiredParty(): Promise<string> {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'LEGAL_ENTITY', $2, 'TH', 'RETIRED', '{}', $1, now()) RETURNING party_id`,
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
  });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  rubberTH = await registerFramework();
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

/** A valid smallholder → aggregator SUPPLIES_TO relationship between two fresh parties, claimed by the supplier. */
async function relationship(overrides: Partial<ScsRelationshipRegistrationRequest> = {}): Promise<ScsRelationshipRegistrationRequest> {
  const fromPartyId = overrides.fromPartyId ?? (await registerParty("NATURAL_PERSON"));
  const toPartyId = overrides.toPartyId ?? (await registerParty("COOPERATIVE"));
  return {
    fromPartyId,
    toPartyId,
    relationshipType: "SUPPLIES_TO",
    commodityScope: ["4001"],
    geographicScope: ["TH"],
    frameworkAssociationIds: [rubberTH],
    claimedByPartyId: fromPartyId,
    relationshipEvidenceIds: [randomUUID()],
    ...overrides,
  };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const relationshipsBetween = (a: string, b: string) =>
  count("SELECT count(*) AS n FROM scs.supply_chain_relationship WHERE from_party_id = $1 AND to_party_id = $2", [a, b]);
const totalRelationships = () => count("SELECT count(*) AS n FROM scs.supply_chain_relationship");
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const idempotencyRecords = (key: string) => count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]);

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = { relationships: await totalRelationships(), receipts: await totalReceipts() };
  const key = `cap02r-${randomUUID()}`;
  const r = await post(RELATIONSHIPS, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.deepEqual({ relationships: await totalRelationships(), receipts: await totalReceipts(), idempotency: await idempotencyRecords(key) }, { ...before, idempotency: 0 });
  return r;
}

// ── Valid registration ───────────────────────────────────────────────────────

test("valid registration → 201; relationship CLAIMED_UNVERIFIED and ACTIVE; receipt written", async () => {
  const body = await relationship({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" });
  const key = `cap02r-${randomUUID()}`;
  const r = await post(RELATIONSHIPS, body, { key });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const res = r.json as unknown as ScsRelationshipRegistrationResponse;
  const checked = runWithCorrelation("cap02r-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02RelationshipRegistrationResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

  const d = res.decision;
  assert.equal(d.decision, "REGISTERED");
  assert.deepEqual(d.decidedBy, actors.officer);
  for (const [check, value] of Object.entries(d.eligibilityChecks)) {
    assert.equal(value, true, check);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
  }
  assert.equal(Object.keys(d.eligibilityChecks).length, 12);
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Registration is not verification") && x.includes("verifies neither party")));
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: the evidence store is not yet built")));

  const row = (await harness.admin.query(`SELECT * FROM scs.supply_chain_relationship WHERE relationship_id = $1`, [d.relationshipId])).rows[0] as Record<string, unknown>;
  assert.equal(row["from_party_id"], body.fromPartyId);
  assert.equal(row["to_party_id"], body.toPartyId);
  assert.equal(row["claimed_by_party_id"], body.fromPartyId);
  assert.equal(row["relationship_type"], "SUPPLIES_TO");
  assert.equal(row["other_relationship_type_description"], null);
  assert.equal(row["verification_status"], "CLAIMED_UNVERIFIED");
  assert.equal(row["lifecycle_status"], "ACTIVE");
  assert.equal(row["verification_scope"], null);
  assert.equal(row["supersedes_relationship_id"], null);
  assert.equal(row["superseded_by_relationship_id"], null);
  assert.equal(row["schema_version"], "1");
  assert.equal(row["representation_version"], "1");
  assert.deepEqual(row["framework_association_ids"], [rubberTH]);
  assert.deepEqual(row["commodity_scope"], ["4001"]);
  assert.deepEqual(row["geographic_scope"], ["TH"]);
  assert.deepEqual(row["relationship_evidence_ids"], body.relationshipEvidenceIds);
  assert.equal((row["valid_from"] as Date).toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal((row["valid_until"] as Date).toISOString(), "2027-01-01T00:00:00.000Z");
  assert.deepEqual(row["created_by"], actors.officer);
  assert.equal((row["claimed_at"] as Date).toISOString(), d.decidedAt);

  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["decision_type"], "RELATIONSHIP_REGISTRATION");
  assert.equal(receipt["subject_id"], d.relationshipId);
  assert.equal(receipt["decision"], "REGISTERED");
  assert.equal(receipt["idempotency_key"], key);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d);
});

test("every relationshipType registers; OTHER with its description", async () => {
  for (const relationshipType of ["SUPPLIES_TO", "PROCESSES_FOR", "AGGREGATES_FOR", "EXPORTS_FOR", "CERTIFIES_FOR"] as const) {
    assert.equal((await post(RELATIONSHIPS, await relationship({ relationshipType }))).status, 201, relationshipType);
  }
  const other = await relationship({ relationshipType: "OTHER", otherRelationshipTypeDescription: "Provides latex testing services" });
  const r = await post(RELATIONSHIPS, other);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const row = (await harness.admin.query(`SELECT other_relationship_type_description FROM scs.supply_chain_relationship WHERE relationship_id = $1`, [
    (r.json["decision"] as { relationshipId: string }).relationshipId,
  ])).rows[0] as Record<string, unknown>;
  assert.equal(row["other_relationship_type_description"], "Provides latex testing services");
});

test("claimed by the to party → 201", async () => {
  const body = await relationship();
  assert.equal((await post(RELATIONSHIPS, { ...body, claimedByPartyId: body.toPartyId })).status, 201);
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  const body = await relationship();
  for (const who of ["viewer", "admin"] as const) {
    const r = await assertRefused(body, 403, "REGISTRANT_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Registering a relationship requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

test("authority is checked first: an unauthorised actor gets 403 even for a self-referential request", async () => {
  const body = await relationship();
  await assertRefused({ ...body, toPartyId: body.fromPartyId }, 403, "REGISTRANT_NOT_AUTHORISED", { who: "viewer" });
});

// ── Request-level rules ──────────────────────────────────────────────────────

test("relationshipType OTHER without a description → 400 OTHER_TYPE_REQUIRES_DESCRIPTION", async () => {
  await assertRefused(await relationship({ relationshipType: "OTHER" }), 400, "OTHER_TYPE_REQUIRES_DESCRIPTION");
});

test("a description without OTHER → 400 REQUEST_VALIDATION_FAILED, refused not ignored", async () => {
  const r = await assertRefused(await relationship({ otherRelationshipTypeDescription: "Something" }), 400, "REQUEST_VALIDATION_FAILED");
  assert.deepEqual(r.json["reasons"], ["/otherRelationshipTypeDescription: must be absent unless relationshipType is OTHER (it is SUPPLIES_TO)."]);
});

test("validUntil not after validFrom → 400 VALIDITY_PERIOD_INVALID", async () => {
  for (const validUntil of ["2025-12-31T00:00:00Z", "2026-01-01T00:00:00Z"]) {
    await assertRefused(await relationship({ validFrom: "2026-01-01T00:00:00Z", validUntil }), 400, "VALIDITY_PERIOD_INVALID");
  }
});

test("fromPartyId = toPartyId → 422 SELF_REFERENTIAL_RELATIONSHIP", async () => {
  const p = await registerParty();
  await assertRefused(await relationship({ fromPartyId: p, toPartyId: p, claimedByPartyId: p }), 422, "SELF_REFERENTIAL_RELATIONSHIP");
});

test("claimedByPartyId is a third party → 400 CLAIMING_PARTY_NOT_IN_RELATIONSHIP", async () => {
  const third = await registerParty();
  const r = await assertRefused(await relationship({ claimedByPartyId: third }), 400, "CLAIMING_PARTY_NOT_IN_RELATIONSHIP");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`claimedByPartyId ${third} is neither fromPartyId nor toPartyId`));
});

test("schema: no frameworks, empty scope, upper-case ids → 400 REQUEST_VALIDATION_FAILED", async () => {
  const body = await relationship();
  for (const bad of [
    { frameworkAssociationIds: [] },
    { commodityScope: [] },
    { geographicScope: [] },
    { fromPartyId: body.fromPartyId.toUpperCase() },
  ]) {
    await assertRefused({ ...body, ...bad }, 400, "REQUEST_VALIDATION_FAILED");
  }
});

// ── Parties ──────────────────────────────────────────────────────────────────

test("from party not registered → 422 FROM_PARTY_NOT_FOUND; to party → 422 TO_PARTY_NOT_FOUND", async () => {
  const missing = randomUUID();
  const to = await registerParty();
  await assertRefused(await relationship({ fromPartyId: missing, toPartyId: to, claimedByPartyId: to }), 422, "FROM_PARTY_NOT_FOUND");
  const from = await registerParty();
  await assertRefused(await relationship({ fromPartyId: from, toPartyId: missing, claimedByPartyId: from }), 422, "TO_PARTY_NOT_FOUND");
});

test("a RETIRED party on either side → 422 PARTY_RETIRED", async () => {
  const retired = await seedRetiredParty();
  const active = await registerParty();
  await assertRefused(await relationship({ fromPartyId: retired, toPartyId: active, claimedByPartyId: active }), 422, "PARTY_RETIRED");
  const r = await assertRefused(await relationship({ fromPartyId: active, toPartyId: retired, claimedByPartyId: active }), 422, "PARTY_RETIRED");
  assert.deepEqual(r.json["reasons"], [`Party ${retired} is RETIRED and cannot take part in a new relationship.`]);
});

// ── Frameworks and scope ─────────────────────────────────────────────────────

test("framework not registered → 422 FRAMEWORK_ASSOCIATION_NOT_FOUND naming it", async () => {
  const missing = randomUUID();
  const r = await assertRefused(await relationship({ frameworkAssociationIds: [rubberTH, missing] }), 422, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`No SCS-CAP-01 framework is registered with frameworkId ${missing}.`]);
});

test("framework SUPERSEDED or WITHDRAWN → 422 FRAMEWORK_NOT_ACTIVE", async () => {
  for (const status of ["SUPERSEDED", "WITHDRAWN"]) {
    const framework = await registerFramework();
    // no CAP-01 endpoint changes a framework's status yet; the owner sets it
    await harness.admin.query(`UPDATE scs.regulatory_framework SET status = $1 WHERE framework_id = $2`, [status, framework]);
    const r = await assertRefused(await relationship({ frameworkAssociationIds: [framework] }), 422, "FRAMEWORK_NOT_ACTIVE");
    assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`Framework ${framework} is ${status}`));
  }
});

test("scope outside the framework → 422 SCOPE_OUTSIDE_FRAMEWORK naming every value", async () => {
  const r = await assertRefused(await relationship({ commodityScope: ["4001", "0901"], geographicScope: ["TH", "VN"] }), 422, "SCOPE_OUTSIDE_FRAMEWORK");
  assert.deepEqual(r.json["reasons"], [
    '/commodityScope: "0901" is not the commodityCode of any referenced framework (4001).',
    '/geographicScope: "VN" is not the countryOfOrigin of any referenced framework (TH).',
  ]);
});

test("known contract gap: across two frameworks scope values are checked one by one (rubber from VN passes), and the decision says so", async () => {
  const coffeeVN = await registerFramework("0901", "VN");
  const r = await post(RELATIONSHIPS, await relationship({ frameworkAssociationIds: [rubberTH, coffeeVN], commodityScope: ["4001"], geographicScope: ["VN"] }));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const reasons = (r.json["decision"] as { decisionReasons: string[] }).decisionReasons;
  assert.ok(reasons.some((x) => x.startsWith("scopeWithinFrameworks: evaluated") && x.includes("not paired per framework (contract gap)")));
});

// ── Conflicts ────────────────────────────────────────────────────────────────

test("same from, to, type and framework with overlapping validity → 409 CONFLICTING_RECORD naming the existing relationship", async () => {
  const body = await relationship({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" });
  const first = await post(RELATIONSHIPS, body);
  assert.equal(first.status, 201);
  const existing = (first.json["decision"] as { relationshipId: string }).relationshipId;
  const r = await assertRefused({ ...body, validFrom: "2026-06-01T00:00:00Z", validUntil: "2026-07-01T00:00:00Z" }, 409, "CONFLICTING_RECORD");
  assert.ok((r.json["reasons"] as string[])[0]!.includes(existing));
  // open-ended overlaps too
  await assertRefused({ ...body, validFrom: undefined, validUntil: undefined }, 409, "CONFLICTING_RECORD");
});

test("not conflicts: adjacent or later periods, the opposite direction, another type, no shared framework", async () => {
  const body = await relationship({ validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-01-01T00:00:00Z" });
  assert.equal((await post(RELATIONSHIPS, body)).status, 201);
  // a period starting exactly when the first ends does not overlap
  assert.equal((await post(RELATIONSHIPS, { ...body, validFrom: "2027-01-01T00:00:00Z", validUntil: "2028-01-01T00:00:00Z" })).status, 201);
  assert.equal((await post(RELATIONSHIPS, { ...body, fromPartyId: body.toPartyId, toPartyId: body.fromPartyId })).status, 201, "opposite direction");
  assert.equal((await post(RELATIONSHIPS, { ...body, relationshipType: "PROCESSES_FOR" })).status, 201, "another type");
  const otherRubber = await registerFramework();
  assert.equal((await post(RELATIONSHIPS, { ...body, frameworkAssociationIds: [otherRubber] })).status, 201, "no shared framework");
  assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 4);
});

test("concurrent identical registrations → exactly one 201, the other 409", async () => {
  const body = await relationship();
  const results = await Promise.all([post(RELATIONSHIPS, body), post(RELATIONSHIPS, body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 1);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const body = await relationship();
  const r = await post(RELATIONSHIPS, body, { key: null });
  assert.equal(r.status, 400);
  assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 0);
});

test("same key, same content → byte-identical 201 replay; same key, different content → 409", async () => {
  const body = await relationship();
  const key = `cap02r-${randomUUID()}`;
  const first = await post(RELATIONSHIPS, body, { key });
  const second = await post(RELATIONSHIPS, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 1);

  const conflict = await post(RELATIONSHIPS, { ...body, relationshipType: "PROCESSES_FOR" }, { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 1);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the relationship row is absent", async () => {
  const body = await relationship();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const key = `cap02r-${randomUUID()}`;
    const r = await post(RELATIONSHIPS, body, { key });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.equal(await relationshipsBetween(body.fromPartyId, body.toPartyId), 0);
    assert.equal(await idempotencyRecords(key), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(RELATIONSHIPS, body)).status, 201, "and registration works again once the failure is gone");
});

// ── Database backstops (migration 007) ──────────────────────────────────────

test("migration 007: the database refuses OTHER without a description, a description without OTHER, and empty scope", async () => {
  const a = await registerParty();
  const b = await registerParty();
  const insert = (type: string, description: string | null, frameworks: string[], commodities: string[]) =>
    harness.admin.query(
      `INSERT INTO scs.supply_chain_relationship (schema_version, from_party_id, to_party_id, relationship_type, other_relationship_type_description,
         commodity_scope, geographic_scope, framework_association_ids, claimed_by_party_id, claimed_at, relationship_evidence_ids,
         verification_status, lifecycle_status, representation_version, created_by)
       VALUES ('1', $1, $2, $3, $4, $5, '{TH}', $6, $1, now(), '{}', 'CLAIMED_UNVERIFIED', 'ACTIVE', '1', $7)`,
      [a, b, type, description, commodities, frameworks, JSON.stringify(actors.officer)],
    );
  await assert.rejects(insert("OTHER", null, [rubberTH], ["4001"]), /supply_chain_relationship_other_type_description_ck/);
  await assert.rejects(insert("SUPPLIES_TO", "x", [rubberTH], ["4001"]), /supply_chain_relationship_other_type_description_ck/);
  await assert.rejects(insert("SUPPLIES_TO", null, [], ["4001"]), /supply_chain_relationship_scope_not_empty_ck/);
  await assert.rejects(insert("SUPPLIES_TO", null, [rubberTH], []), /supply_chain_relationship_scope_not_empty_ck/);
});
