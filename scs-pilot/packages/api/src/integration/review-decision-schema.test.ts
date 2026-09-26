// Migration 017: the SCS-CAP-09 review decision tables, tested against a
// database built from every migration. The framework, parties and a plot are
// registered through the API; evaluation, decision, reasoning and assessment
// rows are inserted directly (the CAP-09 endpoints are not built yet).
// Grants and RLS are covered by db-security.test.ts, which checks every scs
// table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKEN = "review-schema-officer-token-0123456789";
const ACTOR = { actorId: "officer-review-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const REVIEWER = JSON.stringify({ actorId: "reviewer-1", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" });
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

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
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `review-schema-${randomUUID()}` },
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

interface Evaluation { evaluationId: string; subjectKey: string; overallState: string; gaps: string[]; conflicts: Array<{ key: string; resolved: boolean }> }

/** Records an evaluation (with its plot) reporting these gaps and conflicts, in this overall state. */
async function evaluation(opts: { state?: string; gaps?: string[]; conflicts?: Array<{ key: string; resolved: boolean }>; subjectKey?: string } = {}): Promise<Evaluation> {
  const state = opts.state ?? "GAPS_REQUIRE_HUMAN_DECISION";
  const gaps = opts.gaps ?? [randomUUID()];
  const conflicts = opts.conflicts ?? [];
  const unresolved = conflicts.some((c) => !c.resolved);
  const evaluationId = randomUUID();
  const requestId = randomUUID();
  const subjectKey = opts.subjectKey ?? hex();
  const result = {
    evaluationId, requestId, evaluatorVersion: "scs-cap06-pilot-1", frameworkId: framework.frameworkId, frameworkVersion: framework.regulationVersion,
    evidenceRequirementSpecId: framework.specId, commodityCode: "4001", overallState: state, hasEvidenceGaps: gaps.length > 0,
    hasMaterialUnresolvedConflicts: unresolved, hasFailClosedConditions: false,
    evaluationPeriod: { referenceDate: "2020-12-31", evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    allGaps: gaps.map((gapId) => ({ gapId })),
    allConflicts: conflicts.map((c) => ({ conflictKey: c.key, resolutionStatus: c.resolved ? "RESOLVED" : "UNRESOLVED" })),
  };
  await inTransaction(async (q) => {
    await q(
      `INSERT INTO scs.sufficiency_evaluation (evaluation_id, evaluator_version, request_id, requested_by, requested_at, evaluated_at, subject_key, commodity_code,
         batch_identifiers, framework_id, framework_version, evidence_requirement_spec_id, reference_date, evaluation_end_date, assessment_type,
         requested_analysis, overall_state, has_evidence_gaps, has_material_unresolved_conflicts, result)
       VALUES ($1, 'scs-cap06-pilot-1', $2, $3, now(), now(), $4, '4001', '{}', $5, $6, $7, '2020-12-31', '2024-06-30', 'DEFORESTATION', '{}', $8, $9, $10, $11)`,
      [evaluationId, requestId, JSON.stringify(ACTOR), subjectKey, framework.frameworkId, framework.regulationVersion, framework.specId, state, gaps.length > 0, unresolved, JSON.stringify(result)],
    );
    await q(`INSERT INTO scs.sufficiency_evaluation_plot (evaluation_id, plot_id, plot_version) VALUES ($1, $2, 1)`, [evaluationId, plotId]);
  });
  return { evaluationId, subjectKey, overallState: state, gaps, conflicts };
}

interface DecisionOpts {
  cols?: Record<string, unknown>;
  /** Reasoning items; by default every gap and unresolved conflict of the evaluation. */
  items?: Array<{ kind: "GAP" | "CONFLICT"; id: string }>;
}

/** Inserts a decision on `e` with its reasoning items, in one transaction (the reasoning check runs at commit). */
function decide(e: Evaluation, opts: DecisionOpts = {}, via?: (fn: (q: Query) => Promise<string>) => Promise<string>): Promise<string> {
  const decisionId = (opts.cols?.["decision_id"] as string | undefined) ?? randomUUID();
  const cols: Record<string, unknown> = {
    decision_id: decisionId,
    schema_version: "1",
    evaluation_id: e.evaluationId,
    evaluation_snapshot_digest: hex(),
    subject_key: e.subjectKey,
    framework_id: framework.frameworkId,
    framework_version: framework.regulationVersion,
    evidence_requirement_spec_id: framework.specId,
    commodity_code: "4001",
    evaluation_overall_state: e.overallState,
    operator_party_id: operator,
    plot_ids: [plotId],
    decision_outcome: "PROCEED_TO_PACKAGE_COMPILATION",
    evaluation_summary_assessed: "Coverage complete; spatial coverage and overlap not evaluated in the pilot.",
    limitations_acknowledged: ["Spatial coverage not evaluated (no spatial database)."],
    basis_for_outcome: "Both remaining gaps are system limits disclosed to the operator; the evidence otherwise supports proceeding.",
    remaining_concerns: [],
    conditions: [],
    reviewer: REVIEWER,
    reviewer_name: "A. Reviewer",
    reviewer_organization_id: organization,
    reviewer_role_reference: "Head of Due Diligence",
    authority_basis: "Delegated authority under the operator's due diligence procedure.",
    authority_verified_at: "2026-09-25T00:00:00Z",
    decided_at: "2026-09-25T00:00:01Z",
    record_validity: "VALID",
    decision_reasons: ["This PROCEED is a human decision on disclosed gaps."],
    ...opts.cols,
  };
  const items = opts.items ?? [
    ...e.gaps.map((id) => ({ kind: "GAP" as const, id })),
    ...e.conflicts.filter((c) => !c.resolved).map((c) => ({ kind: "CONFLICT" as const, id: c.key })),
  ];
  const run = async (q: Query) => {
    const names = Object.keys(cols);
    await q(`INSERT INTO scs.regulatory_review_decision (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => cols[n]));
    for (const it of items) {
      await q(
        `INSERT INTO scs.review_reasoning_item (decision_id, item_kind, gap_id, conflict_key, assessment) VALUES ($1, $2, $3, $4, $5)`,
        [decisionId, it.kind, it.kind === "GAP" ? it.id : null, it.kind === "CONFLICT" ? it.id : null, `Weighed ${it.id}: disclosed and accepted.`],
      );
    }
    return decisionId;
  };
  return via === undefined ? inTransaction(run) : via(run);
}

const assess = (decisionId: string, cols: Record<string, unknown> = {}) => {
  const c: Record<string, unknown> = {
    decision_id: decisionId,
    assessed_at: "2026-09-26T00:00:00Z",
    assessed_by: JSON.stringify(ACTOR),
    currency_status: "CURRENT",
    checks_performed: JSON.stringify([{ checkType: "NEW_EVIDENCE_ADMITTED", checkResult: "UNCHANGED" }]),
    material_changes: JSON.stringify([]),
    ...cols,
  };
  const names = Object.keys(c);
  return harness.admin.query(`INSERT INTO scs.decision_currency_assessment (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => c[n]));
};
const checks = (...results: string[]) => JSON.stringify(results.map((checkResult, i) => ({ checkType: `CHECK_${i}`, checkResult })));
const change = JSON.stringify([{ changeType: "NEW_EVIDENCE_ADMITTED", changedAt: "2026-09-26T00:00:00Z", changedEntityId: randomUUID(), explanation: "New evidence." }]);


test("migration 017 creates the three tables, the evaluation's context key and both reasoning triggers", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs'
        AND table_name IN ('regulatory_review_decision', 'review_reasoning_item', 'decision_currency_assessment') ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["decision_currency_assessment", "regulatory_review_decision", "review_reasoning_item"]);
  assert.equal((await harness.admin.query(`SELECT 1 FROM pg_constraint WHERE conname = 'sufficiency_evaluation_context_uq' AND contype = 'u'`)).rowCount, 1);
  const t = await harness.admin.query(`SELECT tgname, tgdeferrable FROM pg_trigger WHERE tgname IN ('regulatory_review_decision_reasoning_complete', 'review_reasoning_item_reported') ORDER BY tgname`);
  assert.deepEqual(t.rows, [{ tgname: "regulatory_review_decision_reasoning_complete", tgdeferrable: true }, { tgname: "review_reasoning_item_reported", tgdeferrable: false }]);
});

test("scs_api can record and read a decision, its reasoning and an assessment; nobody can change any of it", async () => {
  const e = await evaluation();
  const id = await decide(e, {}, (fn) => api.transaction((tx) => fn((sql, values) => tx.query(sql, values))));
  await api.transaction((tx) =>
    tx.query(`INSERT INTO scs.decision_currency_assessment (decision_id, assessed_at, assessed_by, currency_status, checks_performed, material_changes)
              VALUES ($1, now(), $2, 'CURRENT', $3, '[]')`, [id, JSON.stringify(ACTOR), checks("UNCHANGED")]),
  );
  const read = await api.transaction((tx) => tx.query(`SELECT decision_outcome FROM scs.regulatory_review_decision WHERE decision_id = $1`, [id]));
  assert.equal(read.rows[0]!["decision_outcome"], "PROCEED_TO_PACKAGE_COMPILATION");
  for (const table of ["regulatory_review_decision", "review_reasoning_item", "decision_currency_assessment"]) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE decision_id = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE decision_id = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE decision_id = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
});

test("the frozen context is the reviewed evaluation's own; an evaluation is decided once", async () => {
  const e = await evaluation();
  const fk = /regulatory_review_decision_context_fk/;
  await assert.rejects(decide(e, { cols: { framework_version: "other" } }), fk);
  await assert.rejects(decide(e, { cols: { commodity_code: "1801" } }), fk);
  await assert.rejects(decide(e, { cols: { subject_key: hex() } }), fk);
  await assert.rejects(decide(e, { cols: { evaluation_overall_state: "SUFFICIENT" } }), fk, "the evaluation's state as recorded");
  await decide(e);
  await assert.rejects(decide(e), /regulatory_review_decision_evaluation_uq/);
});

test("permitted outcomes: PROCEED only on GAPS_REQUIRE_HUMAN_DECISION or SUFFICIENT; REVIEW_ABORTED_FAIL_CLOSED never recorded; always VALID", async () => {
  const insufficient = await evaluation({ state: "INSUFFICIENT" });
  await assert.rejects(decide(insufficient), /regulatory_review_decision_permitted_outcome_ck/);
  await decide(insufficient, { cols: { decision_outcome: "REQUIRES_FURTHER_EVIDENCE" } });
  const conflicting = await evaluation({ state: "CONFLICTING_EVIDENCE", conflicts: [{ key: `DEF-TEMPORAL-COVERAGE:${randomUUID()}:${randomUUID()}`, resolved: false }] });
  await assert.rejects(decide(conflicting), /regulatory_review_decision_permitted_outcome_ck/);
  await decide(conflicting, { cols: { decision_outcome: "DO_NOT_PROCEED" } });
  await decide(await evaluation({ state: "SUFFICIENT", gaps: [] }));
  await assert.rejects(decide(await evaluation(), { cols: { decision_outcome: "REVIEW_ABORTED_FAIL_CLOSED" } }), /regulatory_review_decision_outcome_ck/);
  await assert.rejects(decide(await evaluation(), { cols: { record_validity: "PROCEDURALLY_INVALID" } }), /regulatory_review_decision_validity_ck/);
});

test("reasoning: every gap and unresolved conflict addressed at commit; nothing the evaluation did not report", async () => {
  const conflict = `DEF-TEMPORAL-COVERAGE:${randomUUID()}:${randomUUID()}`;
  const resolved = `CUSTODY-CHAIN-CONTINUITY:${randomUUID()}:${randomUUID()}`;
  const e = await evaluation({ gaps: [randomUUID(), randomUUID()], conflicts: [{ key: conflict, resolved: false }, { key: resolved, resolved: true }], state: "CONFLICTING_EVIDENCE" });
  const dnp = { decision_outcome: "DO_NOT_PROCEED" };
  await assert.rejects(decide(e, { cols: dnp, items: [{ kind: "GAP", id: e.gaps[0]! }, { kind: "CONFLICT", id: conflict }] }), /regulatory_review_decision_reasoning_ck: .* does not address gap/);
  await assert.rejects(decide(e, { cols: dnp, items: e.gaps.map((id) => ({ kind: "GAP" as const, id })) }), /does not address conflict/);
  await assert.rejects(decide(e, { cols: dnp, items: [...e.gaps.map((id) => ({ kind: "GAP" as const, id })), { kind: "CONFLICT", id: conflict }, { kind: "GAP", id: randomUUID() }] }), /review_reasoning_item_reported_ck/);
  await assert.rejects(decide(e, { cols: dnp, items: [...e.gaps.map((id) => ({ kind: "GAP" as const, id })), { kind: "CONFLICT", id: conflict }, { kind: "CONFLICT", id: `X:${randomUUID()}:${randomUUID()}` }] }), /review_reasoning_item_reported_ck/);
  await assert.rejects(decide(e, { cols: dnp, items: [...e.gaps.map((id) => ({ kind: "GAP" as const, id })), { kind: "CONFLICT", id: conflict }, { kind: "GAP", id: e.gaps[0]! }] }), /review_reasoning_item_gap_uq/);
  // a resolved conflict may also be addressed
  await decide(e, { cols: dnp, items: [...e.gaps.map((id) => ({ kind: "GAP" as const, id })), { kind: "CONFLICT", id: conflict }, { kind: "CONFLICT", id: resolved }] });
  // the item's kind and its reference agree; the assessment is not blank (a reported gap, so the trigger passes)
  const g = await evaluation({ state: "INSUFFICIENT" });
  const id = await decide(g, { cols: { decision_outcome: "DO_NOT_PROCEED" } });
  await assert.rejects(
    harness.admin.query(`INSERT INTO scs.review_reasoning_item (decision_id, item_kind, gap_id, conflict_key, assessment) VALUES ($1, 'GAP', $2, 'X:1:2', 'x')`, [id, g.gaps[0]]),
    /review_reasoning_item_kind_ck/,
  );
  await assert.rejects(
    harness.admin.query(`INSERT INTO scs.review_reasoning_item (decision_id, item_kind, gap_id, assessment) VALUES ($1, 'GAP', $2, '  ')`, [id, g.gaps[0]]),
    /review_reasoning_item_assessment_ck/,
  );
});

test("supersession: within the subject, at most once, never itself, always with a reason", async () => {
  const key = hex("one subject");
  const first = await decide(await evaluation({ subjectKey: key }));
  const second = await decide(await evaluation({ subjectKey: key }), { cols: { supersedes_decision_id: first, supersession_reason: "New evidence was admitted; re-evaluated." } });
  await assert.rejects(decide(await evaluation({ subjectKey: key }), { cols: { supersedes_decision_id: first, supersession_reason: "again" } }), /regulatory_review_decision_supersedes_uq/);
  await assert.rejects(decide(await evaluation(), { cols: { supersedes_decision_id: second, supersession_reason: "another subject" } }), /regulatory_review_decision_supersedes_fk/);
  await assert.rejects(decide(await evaluation({ subjectKey: key }), { cols: { supersedes_decision_id: second } }), /regulatory_review_decision_supersession_ck/, "no reason");
  const self = randomUUID();
  await assert.rejects(decide(await evaluation({ subjectKey: key }), { cols: { decision_id: self, supersedes_decision_id: self, supersession_reason: "self" } }), /regulatory_review_decision_supersession_ck/);
});

test("currency assessments follow their precedence; SUPERSEDED names the decision that actually supersedes", async () => {
  const key = hex("assessed subject");
  const first = await decide(await evaluation({ subjectKey: key }));
  const second = await decide(await evaluation({ subjectKey: key }), { cols: { supersedes_decision_id: first, supersession_reason: "Re-evaluated." } });
  const rule = /decision_currency_assessment_precedence_ck/;
  await assess(first, { currency_status: "SUPERSEDED", superseded_by_decision_id: second, checks_performed: checks("UNCHANGED") });
  await assert.rejects(assess(second, { currency_status: "SUPERSEDED", superseded_by_decision_id: first, checks_performed: checks("UNCHANGED") }), /decision_currency_assessment_superseded_by_fk/, "first does not supersede second");
  await assert.rejects(assess(first, { currency_status: "SUPERSEDED" }), rule, "SUPERSEDED without its successor");
  await assert.rejects(assess(second, { superseded_by_decision_id: randomUUID() }), rule);
  await assess(second, { currency_status: "POTENTIALLY_STALE", checks_performed: checks("CHANGED", "UNAVAILABLE"), material_changes: change });
  await assert.rejects(assess(second, { currency_status: "POTENTIALLY_STALE", checks_performed: checks("CHANGED") }), rule, "stale with no material change");
  await assess(second, { currency_status: "FAIL_CLOSED", checks_performed: checks("UNCHANGED", "UNAVAILABLE") });
  await assert.rejects(assess(second, { currency_status: "FAIL_CLOSED", checks_performed: checks("CHANGED", "UNAVAILABLE"), material_changes: change }), rule, "a known change outranks FAIL_CLOSED");
  await assert.rejects(assess(second, { checks_performed: checks("UNAVAILABLE") }), rule, "CURRENT with an unknown check");
  await assert.rejects(assess(second, { checks_performed: checks("CHANGED") }), rule, "CURRENT with a change");
  await assert.rejects(assess(second, { checks_performed: JSON.stringify([]) }), /decision_currency_assessment_shape_ck/);
  await assert.rejects(assess(second, { currency_status: "STALE" }), /decision_currency_assessment_status_ck/);
});

test("parties, digest, plots and text: the organisation and operator are registered parties", async () => {
  const e = () => evaluation();
  await assert.rejects(decide(await e(), { cols: { operator_party_id: randomUUID() } }), /regulatory_review_decision_operator_fk/);
  await assert.rejects(decide(await e(), { cols: { reviewer_organization_id: randomUUID() } }), /regulatory_review_decision_organization_fk/);
  await assert.rejects(decide(await e(), { cols: { evaluation_snapshot_digest: "ABC" } }), /regulatory_review_decision_digest_ck/);
  await assert.rejects(decide(await e(), { cols: { plot_ids: [] } }), /regulatory_review_decision_arrays_ck/);
  await assert.rejects(decide(await e(), { cols: { basis_for_outcome: "  " } }), /regulatory_review_decision_text_ck/);
  await assert.rejects(decide(await e(), { cols: { reviewer: JSON.stringify({ actorType: "HUMAN" }) } }), /regulatory_review_decision_reviewer_ck/);
  await assert.rejects(decide(await e(), { cols: { authority_verified_at: "2026-09-26T00:00:00Z" } }), /regulatory_review_decision_times_ck/);
});
