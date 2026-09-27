// SCS-CAP-01 POST /scs/v1/frameworks, end to end: real HTTP through the
// server layer, real PostgreSQL (database built from every migration), the
// API connected as a restricted member of scs_api.

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
import type { ScsFrameworkRegistrationRequest, ScsFrameworkRegistrationResponse } from "../types/cap-01.js";
import { issuedReference } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap01-officer-token-0123456789abcdef",
  admin: "cap01-sysadmin-token-0123456789abcdef",
  viewer: "cap01-viewer-token-0123456789abcdefgh",
};
const actors = {
  officer: { actorId: "officer-cap01", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap01", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap01", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

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
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/scs/v1/frameworks`;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

/** A valid EUDR / Thai natural rubber registration. Each test uses its own regulationId so tests never collide. */
function request(overrides: { regulationId?: string; commodityCode?: string; effectiveFrom?: string; effectiveTo?: string } = {}): ScsFrameworkRegistrationRequest {
  return {
    applicableLawsAttested: true,
    regulation: {
      regulationId: overrides.regulationId ?? `EUDR-${randomUUID()}`,
      regulationName: "EU Deforestation Regulation",
      regulationVersion: "consolidated-2024",
      regulationDate: "2023-05-31",
      regulatoryAuthority: "European Commission",
      sourceReference: "Regulation (EU) 2023/1115, OJ L 150, 9.6.2023",
    },
    scope: {
      commodityCode: overrides.commodityCode ?? "4001",
      commodityName: "Natural rubber",
      countryOfOrigin: "TH",
      destinationMarket: "EU",
      applicableNationalLaws: ["Forest Act B.E. 2484 (1941)"],
      effectiveFrom: overrides.effectiveFrom ?? "2025-12-30",
      ...(overrides.effectiveTo !== undefined ? { effectiveTo: overrides.effectiveTo } : {}),
    },
    evidenceRequirements: {
      deforestationEvidence: {
        referenceCutoffDate: "2020-12-31",
        requiredCoverageType: "FULL_PLOT_COVERAGE",
        acceptedSourceTypes: ["SATELLITE_IMAGE", "REMOTE_SENSING_ANALYSIS"],
        minimumResolutionMetres: 10,
        integrityRequirement: "VERIFIED",
        authorityConfirmationRequired: false,
      },
      custodyEvidence: {
        requiredDocumentTypes: ["PURCHASE_RECEIPT", "WEIGHT_TICKET"],
        chainOfCustodyStandards: [],
        traceabilityDepth: "FULL_CHAIN",
      },
      plotRequirements: {
        geolocationRequired: true,
        landRegistryRequired: false,
        minimumPlotIdentifierType: "GPS_POLYGON",
        ownershipVerificationRequired: false,
      },
      sufficiencyThreshold: {
        allPlotsRegistered: true,
        allPlotsHaveDeforestationEvidence: true,
        custodyChainComplete: true,
        noUnresolvedGaps: true,
        humanReviewCompleted: true,
      },
      specLimitations: ["Declared by the registrant; not validated against current regulatory guidance."],
    },
  };
}

async function post(body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap01-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async (regulationId: string, key?: string) => ({
  frameworks: await count("SELECT count(*) AS n FROM scs.regulatory_framework WHERE regulation_id = $1", [regulationId]),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt WHERE receipt -> 'decision' ->> 'frameworkId' IN (SELECT framework_id::text FROM scs.regulatory_framework WHERE regulation_id = $1)", [regulationId]),
  idempotency: key === undefined ? 0 : await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]),
});
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");

// ── 1. Valid registration ────────────────────────────────────────────────────

test("valid registration → 201; framework and receipt in the database", async () => {
  const body = request();
  const key = `cap01-${randomUUID()}`;
  const r = await post(body, { key });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  const res = r.json as unknown as ScsFrameworkRegistrationResponse;
  const checked = runWithCorrelation("cap01-test-schema", () => validate("SCS-CAP-01", SCHEMAS.cap01FrameworkRegistrationResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

  const d = res.decision;
  assert.equal(d.decision, "REGISTERED");
  assert.deepEqual(d.decidedBy, issuedReference(actors.officer));
  assert.equal(d.eligibilityChecks.registrantAuthorised, true);
  assert.equal(d.eligibilityChecks.noConflictingFrameworkExists, true);
  assert.equal(d.eligibilityChecks.applicableLawsConfirmed, true, "evaluated from the registrant's attestation");
  assert.ok(d.decisionReasons.some((x) => x.startsWith("applicableLawsConfirmed: evaluated from registrant attestation")));
  assert.ok(!d.decisionReasons.some((x) => x.startsWith("applicableLawsConfirmed: NOT EVALUATED")));
  for (const unrun of ["regulationReferenceValid", "commodityRecognised", "countryOfOriginValid", "destinationMarketValid"] as const) {
    assert.equal(d.eligibilityChecks[unrun], false, `${unrun} is recorded false: it was not performed`);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${unrun}: NOT EVALUATED`)), `${unrun} has an explicit not-evaluated reason`);
  }

  const { rows } = await harness.admin.query(`SELECT * FROM scs.regulatory_framework WHERE framework_id = $1`, [d.frameworkId]);
  const f = rows[0] as Record<string, unknown>;
  assert.equal(f["status"], "ACTIVE");
  assert.equal(f["regulation_id"], body.regulation.regulationId);
  assert.equal(f["commodity_code"], "4001");
  assert.equal(f["schema_version"], "1");
  assert.equal(f["evidence_spec_generated_from_version"], "1");
  assert.match(String(f["evidence_spec_id"]), /^[0-9a-f-]{36}$/);
  assert.deepEqual(f["version_history"], []);
  assert.deepEqual(f["registered_by"], issuedReference(actors.officer));

  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["subject_id"], d.frameworkId);
  assert.equal(receipt["decision"], "REGISTERED");
  assert.equal(receipt["idempotency_key"], key);
  assert.equal(receipt["receipt_digest"], res.receiptDigest);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d, "the receipt records the decision returned");
  assert.equal(res.receipt.correlationId, r.headers.get("x-correlation-id"));

  assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 1, receipts: 1, idempotency: 1 });
});

// ── 2–3. Idempotency ─────────────────────────────────────────────────────────

test("duplicate idempotency key, same content → the same 201 response, no second write", async () => {
  const body = request();
  const key = `cap01-${randomUUID()}`;
  const first = await post(body, { key });
  const second = await post(body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text, "the replay is byte-identical to the original response");
  assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 1, receipts: 1, idempotency: 1 });
});

test("duplicate idempotency key, different content → 409, nothing written", async () => {
  const key = `cap01-${randomUUID()}`;
  const original = request();
  assert.equal((await post(original, { key })).status, 201);
  const before = await totalReceipts();

  const other = request();
  const r = await post(other, { key });
  assert.equal(r.status, 409);
  assert.equal(r.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.deepEqual(await writes(other.regulation.regulationId), { frameworks: 0, receipts: 0, idempotency: 0 });
  assert.equal(await totalReceipts(), before);
});

// ── 4. Authority ─────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  for (const who of ["viewer", "admin"] as const) {
    const body = request();
    const key = `cap01-${randomUUID()}`;
    const r = await post(body, { key, who });
    assert.equal(r.status, 403, who);
    assert.equal(r.json["error"], "REGISTRANT_NOT_AUTHORISED");
    assert.equal(r.json["capabilityId"], "SCS-CAP-01");
    assert.equal(r.json["result"], "FAIL_CLOSED");
    assert.equal(r.json["noWrites"], true);
    assert.equal(r.json["noFrameworkRegistered"], true);
    assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 0, receipts: 0, idempotency: 0 }, who);
  }
});

test("SYSTEM_ADMIN alone does not authorise registration — only the contract's COMPLIANCE_OFFICER does", async () => {
  const r = await post(request(), { who: "admin" });
  assert.equal(r.status, 403);
  assert.match((r.json["reasons"] as string[])[0]!, /requires the COMPLIANCE_OFFICER role; actor sysadmin-cap01 does not hold it/);
});

// ── Applicable laws attestation ──────────────────────────────────────────────

test("applicableLawsAttested: false → 422 APPLICABLE_LAWS_UNCONFIRMED, nothing written", async () => {
  const body = { ...request(), applicableLawsAttested: false };
  const key = `cap01-${randomUUID()}`;
  const r = await post(body, { key });
  assert.equal(r.status, 422);
  assert.equal(r.json["error"], "APPLICABLE_LAWS_UNCONFIRMED");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noFrameworkRegistered"], true);
  assert.match((r.json["reasons"] as string[])[0]!, /^applicableLawsAttested must be true/);
  assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 0, receipts: 0, idempotency: 0 });
});

test("applicableLawsAttested absent → 400 from schema validation, nothing written", async () => {
  const { applicableLawsAttested: _omitted, ...body } = request();
  const key = `cap01-${randomUUID()}`;
  const r = await post(body, { key });
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).includes('(root): missing required property "applicableLawsAttested"'));
  assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 0, receipts: 0, idempotency: 0 });
});

// ── 5. Conflicting framework ─────────────────────────────────────────────────

test("same regulation and scope already ACTIVE → 409 CONFLICTING_FRAMEWORK_EXISTS naming it, nothing written", async () => {
  const regulationId = `EUDR-${randomUUID()}`;
  const first = await post(request({ regulationId }));
  assert.equal(first.status, 201);
  const existingId = (first.json["decision"] as { frameworkId: string }).frameworkId;
  const receiptsBefore = await totalReceipts();

  const key = `cap01-${randomUUID()}`;
  const r = await post(request({ regulationId }), { key });
  assert.equal(r.status, 409);
  assert.equal(r.json["error"], "CONFLICTING_FRAMEWORK_EXISTS");
  assert.equal(r.json["noFrameworkRegistered"], true);
  assert.ok((r.json["reasons"] as string[]).some((x) => x.includes(existingId)), "the existing frameworkId is named");
  assert.deepEqual(await writes(regulationId, key), { frameworks: 1, receipts: 1, idempotency: 0 });
  assert.equal(await totalReceipts(), receiptsBefore);
});

test("same regulation, different commodity is a different scope → 201 (full-scope match)", async () => {
  const regulationId = `EUDR-${randomUUID()}`;
  assert.equal((await post(request({ regulationId, commodityCode: "4001" }))).status, 201);
  assert.equal((await post(request({ regulationId, commodityCode: "0901" }))).status, 201);
  assert.equal((await writes(regulationId)).frameworks, 2);
});

test("same scope, non-overlapping effective periods → 201; overlapping → 409", async () => {
  const regulationId = `EUDR-${randomUUID()}`;
  assert.equal((await post(request({ regulationId, effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" }))).status, 201);
  assert.equal((await post(request({ regulationId, effectiveFrom: "2026-01-01" }))).status, 201);
  assert.equal((await post(request({ regulationId, effectiveFrom: "2025-06-01", effectiveTo: "2025-06-30" }))).status, 409);
});

test("concurrent registrations of the same scope → exactly one 201, the other 409", async () => {
  const regulationId = `EUDR-${randomUUID()}`;
  const results = await Promise.all([post(request({ regulationId })), post(request({ regulationId }))]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await writes(regulationId)).frameworks, 1);
});

// ── 6–7. Validation layer ────────────────────────────────────────────────────

test("missing required field → 400 from the validation layer, nothing written", async () => {
  const body = request() as unknown as { regulation: Record<string, unknown> };
  delete body.regulation["regulationName"];
  const before = await totalReceipts();
  const r = await post(body);
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.equal(r.json["capabilityId"], "SCS-CAP-01");
  assert.ok((r.json["reasons"] as string[]).includes('/regulation: missing required property "regulationName"'));
  assert.equal(await totalReceipts(), before);
});

test("unknown enum value → 400 from the validation layer, nothing written", async () => {
  const body = request();
  (body.evidenceRequirements.custodyEvidence as { traceabilityDepth: string }).traceabilityDepth = "BEST_EFFORT";
  const r = await post(body);
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/evidenceRequirements/custodyEvidence/traceabilityDepth: must be one of")));
  assert.equal((await writes(body.regulation.regulationId)).frameworks, 0);
});

test("effectiveTo before effectiveFrom → 400 from the capability, before the database constraint", async () => {
  const body = request({ effectiveFrom: "2026-01-01", effectiveTo: "2025-01-01" });
  const r = await post(body);
  assert.equal(r.status, 400);
  assert.deepEqual(r.json["reasons"], ["/scope/effectiveTo: must not be before effectiveFrom (2026-01-01)."]);
  assert.equal((await writes(body.regulation.regulationId)).frameworks, 0);
});

// ── 8. Receipt immutability ──────────────────────────────────────────────────

test("a CAP-01 receipt cannot be updated directly — by scs_api or by the owner", async () => {
  const r = await post(request());
  const receiptId = (r.json["receipt"] as { receiptId: string }).receiptId;
  await assert.rejects(
    api.transaction((tx) => tx.query(`UPDATE scs.decision_receipt SET decision = 'REJECTED' WHERE receipt_id = $1`, [receiptId])),
    /permission denied/,
  );
  await assert.rejects(harness.admin.query(`UPDATE scs.decision_receipt SET decision = 'REJECTED' WHERE receipt_id = $1`, [receiptId]), /append-only/);
  const { rows } = await harness.admin.query(`SELECT decision FROM scs.decision_receipt WHERE receipt_id = $1`, [receiptId]);
  assert.equal((rows[0] as { decision: string }).decision, "REGISTERED");
});

// ── 9. Rollback ──────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the framework row is absent too", async () => {
  // Simulate a receipt write failure: a test-only trigger makes every receipt INSERT fail.
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const body = request();
    const key = `cap01-${randomUUID()}`;
    const r = await post(body, { key });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noFrameworkRegistered"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"), "the database error text is not leaked");
    assert.deepEqual(await writes(body.regulation.regulationId, key), { frameworks: 0, receipts: 0, idempotency: 0 });
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  // and registration works again once the failure is gone
  assert.equal((await post(request())).status, 201);
});
