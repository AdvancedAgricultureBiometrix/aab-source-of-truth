// Migration 016: the SCS-CAP-06 conflict resolution tables, tested against a
// database built from every migration. The framework, a party and a plot are
// registered through the API; evaluation and resolution rows are inserted
// directly (submitConflictResolution is not built yet). Grants and RLS are
// covered by db-security.test.ts, which checks every scs table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKEN = "resolution-schema-officer-token-012345";
const ACTOR = { actorId: "officer-resolution-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const RESOLVER = JSON.stringify({ actorId: "resolver-1", actorType: "HUMAN", roles: ["CONFLICT_RESOLVER"], authenticationMethod: "STATIC_TOKEN" });
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let plotId = "";
let framework = { frameworkId: "", specId: "", regulationVersion: "" };

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `resolution-schema-${randomUUID()}` },
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
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const farmer = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  const frameworkId = (await post("/scs/v1/frameworks", frameworkRequest()))["frameworkId"] as string;
  const row = (await harness.admin.query<{ evidence_spec_id: string; regulation_version: string }>(
    `SELECT evidence_spec_id, regulation_version FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  )).rows[0]!;
  framework = { frameworkId, specId: row.evidence_spec_id, regulationVersion: row.regulation_version };
  plotId = (await post("/scs/v1/plots", {
    plot: {
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "UNKNOWN", evidenceIds: [], limitations: [] }],
  }))["plotId"] as string;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const adminQuery: Query = (sql, values) => harness.admin.query(sql, values);

/** Two evidence ids in sorted order, and the key of their conflict under `code`. */
function pair(code = "DEF-TEMPORAL-COVERAGE", self = false) {
  const ids = [randomUUID(), randomUUID()].sort();
  const a = ids[0]!;
  const b = self ? a : ids[1]!;
  return { a, b, code, key: `${code}:${a}:${b}` };
}

/** Records an evaluation (with its plot) whose result reports conflicts under `conflictKeys`. */
async function evaluationReporting(...conflictKeys: string[]): Promise<string> {
  const evaluationId = randomUUID();
  const requestId = randomUUID();
  const result = {
    evaluationId, requestId, evaluatorVersion: "scs-cap06-pilot-1", frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion,
    evidenceRequirementSpecId: framework.specId, commodityCode: "4001", overallState: "CONFLICTING_EVIDENCE", hasEvidenceGaps: true,
    hasMaterialUnresolvedConflicts: true, hasFailClosedConditions: false,
    evaluationPeriod: { referenceDate: "2020-12-31", evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    allConflicts: conflictKeys.map((conflictKey) => ({ conflictKey })),
  };
  await harness.admin.query("BEGIN");
  try {
    await harness.admin.query(
      `INSERT INTO scs.sufficiency_evaluation (evaluation_id, evaluator_version, request_id, requested_by, requested_at, evaluated_at, subject_key, commodity_code,
         batch_identifiers, framework_id, framework_version, evidence_requirement_spec_id, reference_date, evaluation_end_date, assessment_type,
         requested_analysis, overall_state, has_evidence_gaps, has_material_unresolved_conflicts, result)
       VALUES ($1, 'scs-cap06-pilot-1', $2, $3, now(), now(), $4, '4001', '{}', $5, $6, $7, '2020-12-31', '2024-06-30', 'DEFORESTATION', '{}',
               'CONFLICTING_EVIDENCE', true, true, $8)`,
      [evaluationId, requestId, JSON.stringify(ACTOR), createHash("sha256").update(randomUUID()).digest("hex"), framework.frameworkId, framework.regulationVersion, framework.specId, JSON.stringify(result)],
    );
    await harness.admin.query(`INSERT INTO scs.sufficiency_evaluation_plot (evaluation_id, plot_id, plot_version) VALUES ($1, $2, 1)`, [evaluationId, plotId]);
    await harness.admin.query("COMMIT");
  } catch (e) {
    await harness.admin.query("ROLLBACK");
    throw e;
  }
  return evaluationId;
}

/** Inserts a resolution of `p` found in `evaluationId`; `overrides` replace column values. */
async function insertResolution(evaluationId: string, p: ReturnType<typeof pair>, overrides: Record<string, unknown> = {}, q: Query = adminQuery): Promise<string> {
  const cols: Record<string, unknown> = {
    conflict_key: p.key,
    requirement_code: p.code,
    evidence_a_id: p.a,
    evidence_b_id: p.b,
    evaluation_id: evaluationId,
    compared_evidence_ids: p.a === p.b ? [p.a] : [p.a, p.b],
    provenance_and_methods_considered: "Compared sensor, resolution, cloud masks and analysis windows of both items.",
    resolution_reason: "The later analysis used a mask that excluded the plot; it is not applicable to this plot.",
    additional_evidence_obtained: false,
    additional_evidence_ids: [],
    remaining_limitations: ["Field verification not performed."],
    reviewer: RESOLVER,
    authority_basis: "Appointed conflict resolver under the operator's due diligence procedure.",
    resolved_at: new Date().toISOString(),
    re_evaluation_required: true,
    ...overrides,
  };
  const names = Object.keys(cols);
  const { rows } = await q(
    `INSERT INTO scs.conflict_resolution (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING resolution_id`,
    names.map((n) => cols[n]),
  );
  return rows[0]!["resolution_id"] as string;
}


test("migration 016 creates the two tables and the conflict-reported trigger", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name IN ('conflict_resolution', 'sufficiency_evaluation_resolution') ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["conflict_resolution", "sufficiency_evaluation_resolution"]);
  assert.equal((await harness.admin.query(`SELECT 1 FROM pg_trigger WHERE tgname = 'conflict_resolution_conflict_reported'`)).rowCount, 1);
});

test("scs_api can record and read a resolution and its application; nobody can change either", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key);
  const id = await api.transaction((tx) => insertResolution(evaluationId, p, {}, (sql, values) => tx.query(sql, values)));
  const later = await evaluationReporting(p.key);
  await api.transaction((tx) => tx.query(`INSERT INTO scs.sufficiency_evaluation_resolution (evaluation_id, resolution_id) VALUES ($1, $2)`, [later, id]));
  const read = await api.transaction((tx) => tx.query(`SELECT conflict_key FROM scs.conflict_resolution WHERE resolution_id = $1`, [id]));
  assert.equal(read.rows[0]!["conflict_key"], p.key);
  for (const table of ["conflict_resolution", "sufficiency_evaluation_resolution"]) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE resolution_id = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE resolution_id = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE resolution_id = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
});

test("a conflict key is resolved once", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key);
  await insertResolution(evaluationId, p);
  const again = await evaluationReporting(p.key);
  await assert.rejects(insertResolution(again, p), /conflict_resolution_key_uq/);
});

test("the conflict must have been reported under that key in the named evaluation", async () => {
  const p = pair();
  const other = pair();
  const evaluationId = await evaluationReporting(other.key);
  await assert.rejects(insertResolution(evaluationId, p), /conflict_resolution_conflict_ck/);
  await assert.rejects(insertResolution(randomUUID(), p), /conflict_resolution_conflict_ck|conflict_resolution_evaluation_fk/);
});

test("the key is its parts: requirement code and the two ids in sorted order", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key, `${p.code}:${p.b}:${p.a}`, `DEF-INTEGRITY:${p.a}:${p.b}`);
  await assert.rejects(insertResolution(evaluationId, p, { conflict_key: `${p.code}:${p.b}:${p.a}` }), /conflict_resolution_key_ck/, "ids out of order");
  await assert.rejects(insertResolution(evaluationId, p, { evidence_a_id: p.b, evidence_b_id: p.a, conflict_key: `${p.code}:${p.b}:${p.a}`, compared_evidence_ids: [p.b, p.a] }), /conflict_resolution_key_ck/, "a > b");
  await assert.rejects(insertResolution(evaluationId, p, { conflict_key: `DEF-INTEGRITY:${p.a}:${p.b}` }), /conflict_resolution_key_ck/, "the key's code is not the row's");
  await assert.rejects(insertResolution(evaluationId, p, { requirement_code: "MADE-UP", conflict_key: `MADE-UP:${p.a}:${p.b}` }), /conflict_resolution_requirement_code_ck|conflict_resolution_conflict_ck/);
});

test("compared items are exactly the conflict's items; an inapplicable item is one of them", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key);
  await assert.rejects(insertResolution(evaluationId, p, { compared_evidence_ids: [p.a] }), /conflict_resolution_compared_ck/, "one missing");
  await assert.rejects(insertResolution(evaluationId, p, { compared_evidence_ids: [p.a, p.b, randomUUID()] }), /conflict_resolution_compared_ck/, "one extra");
  await assert.rejects(insertResolution(evaluationId, p, { compared_evidence_ids: [p.a, p.a, p.b] }), /conflict_resolution_compared_ck/, "a repeat");
  await assert.rejects(insertResolution(evaluationId, p, { inapplicable_evidence_id: randomUUID() }), /conflict_resolution_inapplicable_ck/);
  await insertResolution(evaluationId, p, { compared_evidence_ids: [p.b, p.a], inapplicable_evidence_id: p.b });
});

test("a self-conflict (a declared custody contradiction) compares its one event", async () => {
  const p = pair("CUSTODY-CHAIN-CONTINUITY", true);
  const evaluationId = await evaluationReporting(p.key);
  await assert.rejects(insertResolution(evaluationId, p, { compared_evidence_ids: [p.a, p.a] }), /conflict_resolution_compared_ck/);
  await insertResolution(evaluationId, p, { inapplicable_evidence_id: p.a });
});

test("additional evidence: obtained exactly when some is listed; text required; reviewer an object", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key);
  await assert.rejects(insertResolution(evaluationId, p, { additional_evidence_obtained: true }), /conflict_resolution_additional_ck/);
  await assert.rejects(insertResolution(evaluationId, p, { additional_evidence_ids: [randomUUID()] }), /conflict_resolution_additional_ck/);
  await assert.rejects(insertResolution(evaluationId, p, { resolution_reason: "  " }), /conflict_resolution_text_ck/);
  await assert.rejects(insertResolution(evaluationId, p, { reviewer: JSON.stringify("resolver-1") }), /conflict_resolution_reviewer_ck/);
  await insertResolution(evaluationId, p, { additional_evidence_obtained: true, additional_evidence_ids: [randomUUID()] });
});

test("an applied resolution must be a recorded resolution and a recorded evaluation, once each", async () => {
  const p = pair();
  const evaluationId = await evaluationReporting(p.key);
  const id = await insertResolution(evaluationId, p);
  const later = await evaluationReporting(p.key);
  const apply = (e: string, r: string) => harness.admin.query(`INSERT INTO scs.sufficiency_evaluation_resolution (evaluation_id, resolution_id) VALUES ($1, $2)`, [e, r]);
  await apply(later, id);
  await assert.rejects(apply(later, id), /sufficiency_evaluation_resolution_pk/);
  await assert.rejects(apply(later, randomUUID()), /sufficiency_evaluation_resolution_resolution_fk/);
  await assert.rejects(apply(randomUUID(), id), /sufficiency_evaluation_resolution_evaluation_fk/);
});
