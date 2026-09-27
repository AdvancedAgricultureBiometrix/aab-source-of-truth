// Migration 015: the SCS-CAP-06 sufficiency evaluation tables, tested against
// a database built from every migration. Parties, the framework, a plot, a
// CAP-04 evidence record and a CAP-05 custody event are admitted through
// their own endpoints; evaluation rows are inserted directly (the CAP-06
// endpoint is not built yet). Grants and RLS are covered by
// db-security.test.ts, which checks every scs table.

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

const TOKEN = "suff-schema-officer-token-0123456789ab";
const ACTOR = { actorId: "officer-suff-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const ACTOR_JSON = JSON.stringify(ACTOR);
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let coop = "";
let plotId = "";
let evidenceId = "";
let eventId = "";
let framework = { frameworkId: "", specId: "", regulationVersion: "" };

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `suff-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.ok(res.status === 201, `${path}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

async function registerFramework() {
  const body = frameworkRequest();
  body.evidenceRequirements.deforestationEvidence.integrityRequirement = "VERIFIABLE";
  const frameworkId = (await post("/scs/v1/frameworks", body))["frameworkId"] as string;
  const row = (await harness.admin.query<{ evidence_spec_id: string; regulation_version: string }>(
    `SELECT evidence_spec_id, regulation_version FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  )).rows[0]!;
  return { frameworkId, specId: row.evidence_spec_id, regulationVersion: row.regulation_version };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  farmer = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  coop = (await post("/scs/v1/parties", partyRequest("COOPERATIVE")))["partyId"] as string;
  framework = await registerFramework();
  const plot = await post("/scs/v1/plots", {
    plot: {
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "UNKNOWN", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId: framework.frameworkId, commodityCode: "4001", associationReason: "EUDR" }],
  });
  plotId = plot["plotId"] as string;
  const associationId = (plot["frameworkAssociationResults"] as Array<{ associationId: string }>)[0]!.associationId;
  evidenceId = (await post("/scs/v1/deforestation-evidence", {
    plotId,
    frameworkAssociationId: associationId,
    evidenceType: "SATELLITE_IMAGE",
    source: { sourceId: "S2-1", sourceOrganizationId: "ESA", sourceReference: "https://dataspace.copernicus.eu/" },
    evidenceObject: { originalObjectReference: "S2B_MSIL2A", contentDigest: createHash("sha256").update(randomUUID()).digest("hex"), chainOfCustodyComplete: true },
    spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
    temporalCoverage: { analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-06-30T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
    evidenceClaim: { claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No loss detected.", confidence: "MEDIUM", limitations: [] },
    coverageAttestation: { attestationProvided: false },
  }))["evidenceId"] as string;
  eventId = (await post("/scs/v1/custody-events", {
    frameworkAssociationId: framework.frameworkId,
    eventType: "PURCHASE",
    sourceParty: { partyId: farmer, partyRoleAtEvent: "SUPPLIER" },
    destinationParty: { partyId: coop, partyRoleAtEvent: "AGGREGATOR" },
    commodity: { commodityCode: "4001", commodityName: "Natural rubber", sourcePlotIds: [plotId], sourcePlotIdsComplete: true, batchIdentifier: "LOT-1" },
    quantity: { amount: 120, unit: "KG", measurementMethod: "Platform scale" },
    eventLocation: { countryCode: "TH" },
    eventTime: { eventDate: "2026-06-30", timePrecision: "DATE_ONLY" },
    predecessorEventIds: [],
    successorEventIds: [],
    supportingDocument: { documentId: "R-1", documentType: "PURCHASE_RECEIPT", documentReference: "Ledger p.1", contentDigest: createHash("sha256").update(randomUUID()).digest("hex") },
    chainOfCustodyComplete: true,
    uncertainties: [],
    contradictions: [],
    knownGaps: [],
  }))["eventId"] as string;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const adminQuery: Query = (sql, values) => harness.admin.query(sql, values);
const subjectKey = (label: string = randomUUID()) => createHash("sha256").update(label).digest("hex");

/** Runs `body` in one owner transaction, so the deferred plot check fires at its COMMIT. */
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

interface EvaluationRow {
  cols?: Record<string, unknown>;
  /** Edits to the result document after it is built from the columns. */
  result?: (doc: Record<string, unknown>) => void;
}

/**
 * Insert an evaluation whose result document agrees with its columns (unless
 * edited), in the caller's transaction. The default is the pilot's best
 * outcome: GAPS_REQUIRE_HUMAN_DECISION with gaps and no conflict.
 */
async function insertEvaluation(q: Query, e: EvaluationRow = {}): Promise<string> {
  const evaluationId = (e.cols?.["evaluation_id"] as string | undefined) ?? randomUUID();
  const cols: Record<string, unknown> = {
    evaluation_id: evaluationId,
    evaluator_version: "scs-cap06-pilot-1",
    request_id: randomUUID(),
    requested_by: ACTOR_JSON,
    requested_at: "2026-09-25T00:00:00Z",
    evaluated_at: "2026-09-25T00:00:01Z",
    subject_key: subjectKey(),
    commodity_code: "4001",
    batch_identifiers: [],
    framework_id: framework.frameworkId,
    framework_version: framework.regulationVersion,
    evidence_requirement_spec_id: framework.specId,
    reference_date: "2020-12-31",
    evaluation_end_date: "2026-09-01",
    assessment_type: "DEFORESTATION",
    requested_analysis: ["TEMPORAL_COVERAGE", "SPATIAL_COVERAGE"],
    overall_state: "GAPS_REQUIRE_HUMAN_DECISION",
    has_evidence_gaps: true,
    has_material_unresolved_conflicts: false,
    ...e.cols,
  };
  const doc: Record<string, unknown> = {
    evaluationId,
    requestId: cols["request_id"],
    evaluatorVersion: cols["evaluator_version"],
    frameworkId: cols["framework_id"],
    frameworkVersion: cols["framework_version"],
    evidenceRequirementSpecId: cols["evidence_requirement_spec_id"],
    commodityCode: cols["commodity_code"],
    overallState: cols["overall_state"],
    hasEvidenceGaps: cols["has_evidence_gaps"],
    hasMaterialUnresolvedConflicts: cols["has_material_unresolved_conflicts"],
    hasFailClosedConditions: false,
    evaluationPeriod: { referenceDate: cols["reference_date"], evaluationEndDate: cols["evaluation_end_date"], assessmentType: cols["assessment_type"] },
    ...(cols["previous_evaluation_id"] === undefined ? {} : { previousEvaluationId: cols["previous_evaluation_id"] }),
  };
  e.result?.(doc);
  cols["result"] = JSON.stringify(doc);
  const names = Object.keys(cols);
  await q(`INSERT INTO scs.sufficiency_evaluation (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => cols[n]));
  return evaluationId;
}

const insertPlot = (q: Query, evaluationId: string, plot = plotId, version = 1) =>
  q(`INSERT INTO scs.sufficiency_evaluation_plot (evaluation_id, plot_id, plot_version) VALUES ($1, $2, $3)`, [evaluationId, plot, version]);

/** A complete evaluation (with its plot), committed. */
const evaluation = (e: EvaluationRow = {}) =>
  inTransaction(async (q) => {
    const id = await insertEvaluation(q, e);
    await insertPlot(q, id);
    return id;
  });

const insertEvidence = (evaluationId: string, kind: string, deforestation: string | null, custody: string | null) =>
  harness.admin.query(
    `INSERT INTO scs.sufficiency_evaluation_evidence (evaluation_id, evidence_kind, deforestation_evidence_id, custody_event_id) VALUES ($1, $2, $3, $4)`,
    [evaluationId, kind, deforestation, custody],
  );


test("migration 015 creates the three CAP-06 tables and the deferred plot check", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name IN ('sufficiency_evaluation', 'sufficiency_evaluation_evidence', 'sufficiency_evaluation_plot') ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["sufficiency_evaluation", "sufficiency_evaluation_evidence", "sufficiency_evaluation_plot"]);
  const trigger = await harness.admin.query(`SELECT tgdeferrable, tginitdeferred FROM pg_trigger WHERE tgname = 'sufficiency_evaluation_has_plots'`);
  assert.deepEqual(trigger.rows, [{ tgdeferrable: true, tginitdeferred: true }]);
});

test("scs_api can record and read an evaluation with its plot and frozen evidence; nobody can change any of it", async () => {
  const id = await api.transaction(async (tx) => {
    const q: Query = (sql, values) => tx.query(sql, values);
    const evaluationId = await insertEvaluation(q);
    await insertPlot(q, evaluationId);
    await q(`INSERT INTO scs.sufficiency_evaluation_evidence (evaluation_id, evidence_kind, deforestation_evidence_id) VALUES ($1, 'DEFORESTATION', $2)`, [evaluationId, evidenceId]);
    await q(`INSERT INTO scs.sufficiency_evaluation_evidence (evaluation_id, evidence_kind, custody_event_id) VALUES ($1, 'CUSTODY', $2)`, [evaluationId, eventId]);
    return evaluationId;
  });
  const read = await api.transaction((tx) => tx.query(`SELECT result FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [id]));
  assert.equal((read.rows[0]!["result"] as Record<string, unknown>)["evaluationId"], id);
  for (const table of ["sufficiency_evaluation", "sufficiency_evaluation_plot", "sufficiency_evaluation_evidence"]) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE evaluation_id = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE evaluation_id = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE evaluation_id = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
});

test("every evaluation covers at least one plot, checked at commit", async () => {
  await assert.rejects(inTransaction((q) => insertEvaluation(q)), /sufficiency_evaluation_plots_ck/);
  const id = await evaluation();
  await assert.rejects(insertPlot(adminQuery, id, randomUUID()), /sufficiency_evaluation_plot_plot_fk/);
  await assert.rejects(insertPlot(adminQuery, id), /sufficiency_evaluation_plot_pk/, "each plot once");
  await assert.rejects(evaluationWithPlotVersion(0), /sufficiency_evaluation_plot_version_ck/);
});

function evaluationWithPlotVersion(version: number) {
  return inTransaction(async (q) => {
    const id = await insertEvaluation(q);
    await insertPlot(q, id, plotId, version);
  });
}

test("framework: the specification and the commodity code must be the framework's", async () => {
  const other = await registerFramework();
  await assert.rejects(evaluation({ cols: { evidence_requirement_spec_id: other.specId } }), /sufficiency_evaluation_framework_spec_fk/);
  await assert.rejects(evaluation({ cols: { commodity_code: "1801" } }), /sufficiency_evaluation_framework_commodity_fk/);
});

test("outcomes: FAIL_CLOSED is never recorded; the state follows the precedence rules; SUFFICIENT is allowed by the database", async () => {
  await assert.rejects(evaluation({ cols: { overall_state: "FAIL_CLOSED" } }), /sufficiency_evaluation_overall_state_ck/);
  await evaluation({ cols: { overall_state: "CONFLICTING_EVIDENCE", has_material_unresolved_conflicts: true } });
  await assert.rejects(evaluation({ cols: { overall_state: "CONFLICTING_EVIDENCE" } }), /sufficiency_evaluation_state_ck/, "conflicting without a conflict");
  await assert.rejects(evaluation({ cols: { overall_state: "INSUFFICIENT", has_material_unresolved_conflicts: true } }), /sufficiency_evaluation_state_ck/, "a conflict must win");
  await assert.rejects(evaluation({ cols: { overall_state: "SUFFICIENT" } }), /sufficiency_evaluation_state_ck/, "SUFFICIENT with gaps");
  await assert.rejects(evaluation({ cols: { has_evidence_gaps: false } }), /sufficiency_evaluation_state_ck/, "GAPS_REQUIRE_HUMAN_DECISION without gaps");
  await evaluation({ cols: { overall_state: "INSUFFICIENT", has_evidence_gaps: false } }); // an adverse finding is not a gap
  await evaluation({ cols: { overall_state: "SUFFICIENT", has_evidence_gaps: false } }); // a pilot limit, not a database rule
});

test("the result document must agree with every key column", async () => {
  const cases: Array<[string, (doc: Record<string, unknown>) => void]> = [
    ["overallState differs", (d) => (d["overallState"] = "INSUFFICIENT")],
    ["hasEvidenceGaps missing", (d) => delete d["hasEvidenceGaps"]],
    ["hasFailClosedConditions true", (d) => (d["hasFailClosedConditions"] = true)],
    ["evaluationId differs", (d) => (d["evaluationId"] = randomUUID())],
    ["frameworkVersion differs", (d) => (d["frameworkVersion"] = "other")],
    ["period differs", (d) => (d["evaluationPeriod"] = { referenceDate: "2020-12-31", evaluationEndDate: "2026-09-02", assessmentType: "DEFORESTATION" })],
    ["a previousEvaluationId the row does not have", (d) => (d["previousEvaluationId"] = randomUUID())],
  ];
  for (const [label, edit] of cases) {
    await assert.rejects(evaluation({ result: edit }), /sufficiency_evaluation_result_ck/, label);
  }
  await assert.rejects(
    inTransaction(async (q) => {
      await q(
        `INSERT INTO scs.sufficiency_evaluation (evaluator_version, request_id, requested_by, requested_at, evaluated_at, subject_key, commodity_code, batch_identifiers,
           framework_id, framework_version, evidence_requirement_spec_id, reference_date, evaluation_end_date, assessment_type, requested_analysis,
           overall_state, has_evidence_gaps, has_material_unresolved_conflicts, result)
         VALUES ('v', $1, $2, now(), now(), $3, '4001', '{}', $4, $5, $6, '2020-12-31', '2026-09-01', 'DEFORESTATION', '{}', 'INSUFFICIENT', false, false, '[]')`,
        [randomUUID(), ACTOR_JSON, subjectKey(), framework.frameworkId, framework.regulationVersion, framework.specId],
      );
    }),
    /sufficiency_evaluation_result_ck/,
    "a document that is not an object",
  );
});

test("period, assessment type and requested analysis", async () => {
  await assert.rejects(evaluation({ cols: { evaluation_end_date: "2020-12-31" } }), /sufficiency_evaluation_period_ck/);
  await assert.rejects(evaluation({ cols: { assessment_type: "LOGGING" } }), /sufficiency_evaluation_assessment_type_ck/);
  await evaluation({ cols: { assessment_type: "BOTH", requested_analysis: [] } });
  await assert.rejects(evaluation({ cols: { requested_analysis: ["MAGIC"] } }), /sufficiency_evaluation_requested_analysis_ck/);
  await assert.rejects(evaluation({ cols: { requested_analysis: ["CUSTODY_CHAIN", "CUSTODY_CHAIN"] } }), /sufficiency_evaluation_requested_analysis_ck/);
});

test("custody subject: batches and the operator together or neither; the operator must be a party", async () => {
  await evaluation({ cols: { batch_identifiers: ["LOT-1"], operator_party_id: coop } });
  await assert.rejects(evaluation({ cols: { batch_identifiers: ["LOT-1"] } }), /sufficiency_evaluation_custody_subject_ck/);
  await assert.rejects(evaluation({ cols: { operator_party_id: coop } }), /sufficiency_evaluation_custody_subject_ck/);
  await assert.rejects(evaluation({ cols: { batch_identifiers: ["LOT-1", "LOT-1"], operator_party_id: coop } }), /sufficiency_evaluation_custody_subject_ck/);
  await assert.rejects(evaluation({ cols: { batch_identifiers: ["LOT-1"], operator_party_id: randomUUID() } }), /sufficiency_evaluation_operator_fk/);
});

test("re-evaluation: the previous evaluation must exist and concern the same subject; never itself", async () => {
  const key = subjectKey("the same subject");
  const first = await evaluation({ cols: { subject_key: key } });
  await evaluation({ cols: { subject_key: key, previous_evaluation_id: first } });
  await assert.rejects(evaluation({ cols: { previous_evaluation_id: first } }), /sufficiency_evaluation_previous_fk/, "another subject");
  await assert.rejects(evaluation({ cols: { subject_key: key, previous_evaluation_id: randomUUID() } }), /sufficiency_evaluation_previous_fk/);
  const self = randomUUID();
  await assert.rejects(evaluation({ cols: { evaluation_id: self, subject_key: key, previous_evaluation_id: self } }), /sufficiency_evaluation_not_self_ck/);
});

test("the frozen evidence: exactly one admitted record of the stated kind, at most once per evaluation", async () => {
  const id = await evaluation();
  await insertEvidence(id, "DEFORESTATION", evidenceId, null);
  await insertEvidence(id, "CUSTODY", null, eventId);
  await assert.rejects(insertEvidence(id, "DEFORESTATION", evidenceId, null), /sufficiency_evaluation_evidence_deforestation_uq/);
  await assert.rejects(insertEvidence(id, "CUSTODY", null, eventId), /sufficiency_evaluation_evidence_custody_uq/);
  await assert.rejects(insertEvidence(id, "DEFORESTATION", null, eventId), /sufficiency_evaluation_evidence_kind_ck/);
  await assert.rejects(insertEvidence(id, "CUSTODY", evidenceId, eventId), /sufficiency_evaluation_evidence_kind_ck/);
  await assert.rejects(insertEvidence(id, "PLOT", evidenceId, null), /sufficiency_evaluation_evidence_kind_ck/);
  await assert.rejects(insertEvidence(id, "DEFORESTATION", randomUUID(), null), /sufficiency_evaluation_evidence_deforestation_fk/);
  await assert.rejects(insertEvidence(id, "CUSTODY", null, randomUUID()), /sufficiency_evaluation_evidence_custody_fk/);
});

test("identifiers: one evaluation per request; the subject key is a SHA-256", async () => {
  const requestId = randomUUID();
  await evaluation({ cols: { request_id: requestId } });
  await assert.rejects(evaluation({ cols: { request_id: requestId } }), /sufficiency_evaluation_request_uq/);
  await assert.rejects(evaluation({ cols: { subject_key: "ABC" } }), /sufficiency_evaluation_subject_key_ck/);
});
