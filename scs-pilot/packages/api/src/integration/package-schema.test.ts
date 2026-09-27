// Migration 018: the SCS-CAP-08 package tables and the AAB-PLATFORM-02
// rendition table, tested against a database built from every migration. The
// framework, parties and a plot are registered through the API; evaluation,
// decision, rendition, package, compilation and receipt rows are inserted
// directly (the CAP-08 endpoints are not built yet). Grants and RLS are
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

const TOKEN = "package-schema-officer-token-0123456789";
const ACTOR = { actorId: "officer-package-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const REVIEWER = { actorId: "reviewer-package-schema", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" };
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const BOUNDARY = {
  compiledNotSubmitted: true,
  operatorMustMakeDeclaration: true,
  noComplianceDetermination: true,
  doesNotGuaranteeRegulatoryAcceptance: true,
  legalResponsibilityRemainsWithOperator: true,
  sufficientEvidenceDoesNotMeanLegallyCompliant: true,
  gapsDisclosedNotResolved: true,
};
const GATE = {
  reviewDecisionFound: true,
  outcomePermitsCompilation: true,
  recordIsValid: true,
  currencyIsCurrent: true,
  evaluationIdMatches: true,
  frameworkVersionMatches: true,
  plotIdsMatch: true,
  operatorIdMatches: true,
  commodityCodeMatches: true,
};

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let plotId = "";
let operator = "";
let organization = "";
let framework = { frameworkId: "", specId: "", regulationVersion: "" };

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `package-schema-${randomUUID()}` },
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
  operator = (await post("/scs/v1/parties", partyRequest("LEGAL_ENTITY")))["partyId"] as string;
  organization = (await post("/scs/v1/parties", partyRequest("LEGAL_ENTITY")))["partyId"] as string;
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
const hex = (label: string = randomUUID()) => createHash("sha256").update(label).digest("hex");

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

const insert = (q: Query, table: string, cols: Record<string, unknown>) => {
  const names = Object.keys(cols);
  return q(`INSERT INTO scs.${table} (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => cols[n]));
};

/** A recorded evaluation (no gaps) and a decision on it with `outcome`, by REVIEWER. */
async function decided(outcome = "PROCEED_TO_PACKAGE_COMPILATION"): Promise<{ decisionId: string; evaluationId: string }> {
  const evaluationId = randomUUID();
  const decisionId = randomUUID();
  const subjectKey = hex();
  const state = outcome === "PROCEED_TO_PACKAGE_COMPILATION" ? "GAPS_REQUIRE_HUMAN_DECISION" : "INSUFFICIENT";
  const requestId = randomUUID();
  const gapId = randomUUID();
  const result = {
    evaluationId, requestId, evaluatorVersion: "scs-cap06-pilot-1", frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion,
    evidenceRequirementSpecId: framework.specId, commodityCode: "4001", overallState: state, hasEvidenceGaps: true,
    hasMaterialUnresolvedConflicts: false, hasFailClosedConditions: false,
    evaluationPeriod: { referenceDate: "2020-12-31", evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    allGaps: [{ gapId }], allConflicts: [],
  };
  await inTransaction(async (q) => {
    await q(
      `INSERT INTO scs.sufficiency_evaluation (evaluation_id, evaluator_version, request_id, requested_by, requested_at, evaluated_at, subject_key, commodity_code,
         batch_identifiers, framework_id, framework_version, evidence_requirement_spec_id, reference_date, evaluation_end_date, assessment_type,
         requested_analysis, overall_state, has_evidence_gaps, has_material_unresolved_conflicts, result)
       VALUES ($1, 'scs-cap06-pilot-1', $2, $3, now(), now(), $4, '4001', '{}', $5, $6, $7, '2020-12-31', '2024-06-30', 'DEFORESTATION', '{}', $8, true, false, $9)`,
      [evaluationId, requestId, JSON.stringify(ACTOR), subjectKey, framework.frameworkId, framework.regulationVersion, framework.specId, state, JSON.stringify(result)],
    );
    await q(`INSERT INTO scs.sufficiency_evaluation_plot (evaluation_id, plot_id, plot_version) VALUES ($1, $2, 1)`, [evaluationId, plotId]);
    await insert(q, "regulatory_review_decision", {
      decision_id: decisionId, schema_version: "1", evaluation_id: evaluationId, evaluation_snapshot_digest: hex(), subject_key: subjectKey,
      framework_id: framework.frameworkId, framework_version: framework.regulationVersion, evidence_requirement_spec_id: framework.specId,
      commodity_code: "4001", evaluation_overall_state: state, operator_party_id: operator, plot_ids: [plotId], decision_outcome: outcome,
      evaluation_summary_assessed: "Reviewed.", limitations_acknowledged: [], basis_for_outcome: "Disclosed gaps accepted.", remaining_concerns: [],
      conditions: [], reviewer: JSON.stringify(REVIEWER), reviewer_name: "A. Reviewer", reviewer_organization_id: organization,
      reviewer_role_reference: "Reviewer", authority_basis: "Declared.", authority_verified_at: "2026-09-26T00:00:00Z",
      decided_at: "2026-09-26T00:00:01Z", record_validity: "VALID", decision_reasons: ["A human decision on disclosed gaps."],
    });
    await q(`INSERT INTO scs.review_reasoning_item (decision_id, item_kind, gap_id, assessment) VALUES ($1, 'GAP', $2, 'Weighed and accepted.')`, [decisionId, gapId]);
  });
  return { decisionId, evaluationId };
}

interface Compile {
  pkg?: Record<string, unknown>;
  content?: Record<string, unknown>;
  rendition?: Record<string, unknown>;
  compilation?: Record<string, unknown>;
  /** Leave out the compilation record, or the receipt. */
  omit?: "compilation" | "receipt";
}

/** Records a package with its rendition, compilation record and receipt, in one transaction (the completeness check runs at commit). */
function compile(d: { decisionId: string; evaluationId: string }, o: Compile = {}, via?: (fn: (q: Query) => Promise<string>) => Promise<string>): Promise<string> {
  const packageId = randomUUID();
  const renditionId = randomUUID();
  const digest = `sha256:${hex()}`;
  const compiledAt = "2026-09-26T10:00:00Z";
  const pdf = hex();
  const content = {
    schemaVersion: "1",
    compilationBasis: { reviewDecisionId: d.decisionId, evaluationId: d.evaluationId, frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion },
    operator: { operatorId: operator },
    authorityBoundary: BOUNDARY,
    ...o.content,
  };
  const run = async (q: Query) => {
    await insert(q, "rendition", {
      rendition_id: renditionId, source_capability_id: "SCS-CAP-08", source_record_id: packageId, source_digest: digest,
      source_digest_algorithm: "SHA-256", renderer_version: "pdf-lib@x.y.z; scs-cap08-package@1", media_type: "application/pdf",
      byte_length: 2048, sha256: pdf, storage_bucket: "scs-evidence", storage_key: pdf, rendered_at: compiledAt, rendered_for: JSON.stringify(ACTOR),
      ...o.rendition,
    });
    await insert(q, "due_diligence_package", {
      package_id: packageId, schema_version: "1", review_decision_id: d.decisionId, evaluation_id: d.evaluationId, operator_party_id: operator,
      framework_id: framework.frameworkId, framework_version: framework.regulationVersion, commodity_code: "4001",
      decision_outcome: "PROCEED_TO_PACKAGE_COMPILATION", package: JSON.stringify(content), package_digest: digest, compiled_at: compiledAt,
      requested_by_actor_id: ACTOR.actorId, compiled_by_service_identity: "scs-api/0.1.0",
      ...o.pkg,
    });
    if (o.omit !== "compilation") {
      await insert(q, "package_compilation", {
        package_id: packageId, package_digest: digest, compiled_at: compiledAt, request_id: randomUUID(), compiled_by: JSON.stringify(ACTOR),
        gate_checks: JSON.stringify(GATE), rendition_id: renditionId,
        ...o.compilation,
      });
    }
    if (o.omit !== "receipt") {
      const receiptId = randomUUID();
      await insert(q, "decision_receipt", {
        receipt_id: receiptId, capability_id: "SCS-CAP-08", decision_type: "PACKAGE_COMPILATION", decision: "COMPILED", subject_id: packageId,
        actor: JSON.stringify(ACTOR), correlation_id: "package-schema-test", idempotency_key: null, request_digest: hex(),
        receipt: JSON.stringify({ receiptId }), receipt_digest: hex(), issued_at: compiledAt,
      });
    }
    return packageId;
  };
  return via === undefined ? inTransaction(run) : via(run);
}

test("migration 018 creates the three tables, the decision's package context key and both triggers", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs'
        AND table_name IN ('due_diligence_package', 'package_compilation', 'rendition') ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["due_diligence_package", "package_compilation", "rendition"]);
  assert.equal((await harness.admin.query(`SELECT 1 FROM pg_constraint WHERE conname = 'regulatory_review_decision_package_context_uq' AND contype = 'u'`)).rowCount, 1);
  const t = await harness.admin.query(`SELECT tgname, tgdeferrable FROM pg_trigger WHERE tgname IN ('due_diligence_package_compiled', 'package_compilation_independent') ORDER BY tgname`);
  assert.deepEqual(t.rows, [{ tgname: "due_diligence_package_compiled", tgdeferrable: true }, { tgname: "package_compilation_independent", tgdeferrable: false }]);
});

test("scs_api can record and read a package, its compilation record and rendition; nobody can change any of it", async () => {
  const d = await decided();
  const id = await compile(d, {}, (fn) => api.transaction((tx) => fn((sql, values) => tx.query(sql, values))));
  const read = await api.transaction((tx) => tx.query(`SELECT package_digest FROM scs.due_diligence_package WHERE package_id = $1`, [id]));
  assert.match(read.rows[0]!["package_digest"] as string, /^sha256:[0-9a-f]{64}$/);
  for (const [table, key] of [["due_diligence_package", "package_id"], ["package_compilation", "package_id"], ["rendition", "source_record_id"]] as const) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE ${key} = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE ${key} = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE ${key} = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
});

test("a package's scope is its decision's own, and only a PROCEED decision can be packaged", async () => {
  const d = await decided();
  const fk = /due_diligence_package_decision_fk/;
  await assert.rejects(compile(d, { pkg: { framework_version: "other" }, content: { compilationBasis: { reviewDecisionId: d.decisionId, evaluationId: d.evaluationId, frameworkId: framework.frameworkId, frameworkVersion: "other" } } }), fk);
  await assert.rejects(compile(d, { pkg: { commodity_code: "1801" } }), fk);
  await assert.rejects(compile(d, { pkg: { operator_party_id: organization }, content: { operator: { operatorId: organization } } }), fk);
  const other = await decided();
  await assert.rejects(compile(d, { pkg: { evaluation_id: other.evaluationId }, content: { compilationBasis: { reviewDecisionId: d.decisionId, evaluationId: other.evaluationId, frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion } } }), fk);
  const dnp = await decided("DO_NOT_PROCEED");
  await assert.rejects(compile(dnp), fk, "the decision's outcome as recorded");
  await assert.rejects(compile(dnp, { pkg: { decision_outcome: "DO_NOT_PROCEED" } }), /due_diligence_package_outcome_ck/);
  await compile(d);
  assert.ok(await compile(d), "a decision may be compiled again");
});

test("the content names its decision, evaluation, framework and operator; the authority boundary is always complete; the digest's form", async () => {
  const d = await decided();
  const content = /due_diligence_package_content_ck/;
  await assert.rejects(compile(d, { content: { compilationBasis: { reviewDecisionId: randomUUID(), evaluationId: d.evaluationId, frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion } } }), content);
  await assert.rejects(compile(d, { content: { operator: { operatorId: organization } } }), content);
  await assert.rejects(compile(d, { content: { compilationBasis: undefined } }), content);
  const boundary = /due_diligence_package_authority_boundary_ck/;
  await assert.rejects(compile(d, { content: { authorityBoundary: { ...BOUNDARY, noComplianceDetermination: false } } }), boundary);
  const { gapsDisclosedNotResolved: _dropped, ...partial } = BOUNDARY;
  await assert.rejects(compile(d, { content: { authorityBoundary: partial } }), boundary);
  await assert.rejects(compile(d, { content: { authorityBoundary: undefined } }), boundary);
  const digest = `sha256:${hex()}`;
  await assert.rejects(compile(d, { pkg: { package_digest: hex() } }), /due_diligence_package_digest_ck/, "the sha256: prefix is required");
  await assert.rejects(compile(d, { pkg: { package_digest: digest.toUpperCase() } }), /due_diligence_package_digest_ck/);
  await assert.rejects(compile(d, { pkg: { compiled_by_service_identity: " " } }), /due_diligence_package_text_ck/);
});

test("the compilation record is bound to the package's digest and time, passed every gate check, and names a rendition of that package", async () => {
  const d = await decided();
  await assert.rejects(compile(d, { compilation: { package_digest: `sha256:${hex()}` } }), /package_compilation_package_fk/);
  await assert.rejects(compile(d, { compilation: { compiled_at: "2026-09-26T11:00:00Z" } }), /package_compilation_package_fk/);
  await assert.rejects(compile(d, { compilation: { gate_checks: JSON.stringify({ ...GATE, currencyIsCurrent: false }) } }), /package_compilation_gate_checks_ck/);
  const { plotIdsMatch: _p, ...eight } = GATE;
  await assert.rejects(compile(d, { compilation: { gate_checks: JSON.stringify(eight) } }), /package_compilation_gate_checks_ck/);
  await assert.rejects(compile(d, { rendition: { source_digest: `sha256:${hex()}` } }), /package_compilation_rendition_fk/, "a rendition of another digest");
  await assert.rejects(compile(d, { rendition: { source_record_id: randomUUID() } }), /package_compilation_rendition_fk/, "a rendition of another record");
  await assert.rejects(compile(d, { compilation: { compiled_by: JSON.stringify({ actorType: "HUMAN" }) } }), /package_compilation_compiled_by_ck/);
  // one compilation record per package, one package per rendition
  const id = await compile(d);
  const row = (await harness.admin.query(`SELECT * FROM scs.package_compilation WHERE package_id = $1`, [id])).rows[0] as Record<string, unknown>;
  await assert.rejects(
    insert(adminQuery, "package_compilation", { package_id: id, package_digest: row["package_digest"], compiled_at: row["compiled_at"], request_id: randomUUID(), compiled_by: JSON.stringify(ACTOR), gate_checks: JSON.stringify(GATE), rendition_id: row["rendition_id"] }),
    /package_compilation_package_uq/,
  );
});

test("the compiler is not the decision's reviewer", async () => {
  const d = await decided();
  await assert.rejects(compile(d, { compilation: { compiled_by: JSON.stringify(REVIEWER) } }), /package_compilation_independent_ck: actor reviewer-package-schema made the decision/);
});

test("at commit, every package has its compilation record and its PACKAGE_COMPILATION receipt", async () => {
  const d = await decided();
  await assert.rejects(compile(d, { omit: "compilation" }), /due_diligence_package_compiled_ck: package .* has no compilation record/);
  await assert.rejects(compile(d, { omit: "receipt" }), /due_diligence_package_compiled_ck: package .* has no PACKAGE_COMPILATION receipt/);
  assert.equal(Number((await harness.admin.query(`SELECT count(*) AS n FROM scs.due_diligence_package WHERE review_decision_id = $1`, [d.decisionId])).rows[0]!["n"]), 0);
});

test("a rendition: a PDF, stored under its SHA-256, of a known capability's record, for an actor", async () => {
  const d = await decided();
  await assert.rejects(compile(d, { rendition: { media_type: "text/html" } }), /rendition_media_type_ck/);
  await assert.rejects(compile(d, { rendition: { sha256: "ABC", storage_key: "ABC" } }), /rendition_sha256_ck/);
  await assert.rejects(compile(d, { rendition: { storage_key: hex() } }), /rendition_storage_key_ck/);
  await assert.rejects(compile(d, { rendition: { byte_length: 0 } }), /rendition_size_ck/);
  await assert.rejects(compile(d, { rendition: { source_capability_id: "SCS-CAP-04" } }), /rendition_source_ck/);
  await assert.rejects(compile(d, { rendition: { renderer_version: "  " } }), /rendition_text_ck/);
  await assert.rejects(compile(d, { rendition: { rendered_for: JSON.stringify({ actorType: "HUMAN" }) } }), /rendition_actor_ck/);
});
