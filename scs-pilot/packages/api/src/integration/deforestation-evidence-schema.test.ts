// Migration 013: the SCS-CAP-04 deforestation evidence tables, tested against
// a database built from every migration. The party, framework, plot and
// association are registered through the API; evidence rows are inserted
// directly (the CAP-04 endpoint is not built yet). Grants and RLS are covered
// by db-security.test.ts, which checks every scs table.

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

const TOKEN = "defor-schema-officer-token-0123456789a";
const ACTOR = { actorId: "officer-defor-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const ACTOR_JSON = JSON.stringify(ACTOR);
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let party = "";
let fixture: PlotFixture;

interface PlotFixture {
  plotId: string;
  associationId: string;
  specId: string;
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `defor-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.ok(res.status === 201, `${path}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

/** A registered plot with one ACTIVE association to a fresh rubber framework. */
async function plotWithAssociation(): Promise<PlotFixture> {
  const frameworkId = (await post("/scs/v1/frameworks", frameworkRequest()))["frameworkId"] as string;
  const d = await post("/scs/v1/plots", {
    plot: {
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: party, tenureBasis: "UNKNOWN", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId, commodityCode: "4001", associationReason: "EUDR" }],
  });
  const results = d["frameworkAssociationResults"] as Array<{ associationId: string }>;
  const specId = (await harness.admin.query<{ evidence_spec_id: string }>(`SELECT evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`, [frameworkId])).rows[0]!.evidence_spec_id;
  return { plotId: d["plotId"] as string, associationId: results[0]!.associationId, specId };
}

/** An evidence object row, inserted as the owner; returns its digest. */
async function storedObject(): Promise<string> {
  const digest = createHash("sha256").update(randomUUID()).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 10, 'image/tiff', 'b', $1, $2)`,
    [digest, ACTOR_JSON],
  );
  return digest;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  party = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  fixture = await plotWithAssociation();
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

/** Insert an evidence record as the owner (or scs_api); `overrides` replace column values. */
async function insertRecord(f: PlotFixture, overrides: Record<string, unknown> = {}, db: "admin" | "api" = "admin"): Promise<string> {
  const digest = createHash("sha256").update(randomUUID()).digest("hex");
  const cols: Record<string, unknown> = {
    evidence_version: 1,
    schema_version: "1",
    plot_id: f.plotId,
    plot_version: 1,
    framework_association_id: f.associationId,
    evidence_requirement_spec_id: f.specId,
    evidence_type: "REMOTE_SENSING_ANALYSIS",
    source_id: "GFW-2023-0412",
    source_organization_id: "global-forest-watch",
    source_reference: "https://example.org/analysis/0412",
    submitted_by: ACTOR_JSON,
    submitted_at: new Date().toISOString(),
    original_object_reference: "s3://provider/analysis-0412.tif",
    content_digest: digest,
    integrity_status: "UNVERIFIED",
    chain_of_custody_complete: true,
    coverage_geometry_type: "POLYGON",
    coverage_geometry_coordinates: JSON.stringify([SQUARE]),
    coverage_crs: "EPSG:4326",
    intersection_with_plot: "NOT_VERIFIED",
    analysis_period_start: "2020-12-31T00:00:00Z",
    analysis_period_end: "2023-06-14T00:00:00Z",
    coverage_mode: "CHANGE_ANALYSIS",
    claim_type: "NO_DEFORESTATION_DETECTED",
    claim_summary: "No tree cover loss detected in the analysis period.",
    claim_confidence: "MEDIUM",
    claim_limitations: ["10 m resolution"],
    attestation_provided: false,
    admission_status: "ADMITTED_WITH_LIMITATIONS",
    admission_temporal_complete: false,
    admission_spatial_complete: false,
    admission_limitations: ["Spatial coverage not verified."],
    admission_limitation_codes: ["SPATIAL_COVERAGE_NOT_VERIFIED", "TEMPORAL_COVERAGE_NOT_EVALUATED", "INTEGRITY_UNVERIFIED"],
    admitted_by: ACTOR_JSON,
    admitted_at: new Date().toISOString(),
    ...overrides,
  };
  const names = Object.keys(cols);
  const sql = `INSERT INTO scs.deforestation_evidence_record (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING evidence_id`;
  const values = names.map((n) => cols[n]);
  const { rows } = db === "admin"
    ? await harness.admin.query<{ evidence_id: string }>(sql, values)
    : await api.transaction((tx) => tx.query<{ evidence_id: string }>(sql, values));
  return rows[0]!.evidence_id;
}

const insertLineage = (evidenceId: string, plotId: string, cited: string, linked: string | null, type = "DERIVED_FROM") =>
  harness.admin.query(
    `INSERT INTO scs.deforestation_evidence_lineage (evidence_id, plot_id, lineage_type, cited_evidence_id, linked_evidence_id) VALUES ($1, $2, $3, $4, $5)`,
    [evidenceId, plotId, type, cited, linked],
  );


test("migration 013 creates the four CAP-04 tables and the association's (id, plot, spec) key", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name LIKE 'deforestation_evidence%' ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), [
    "deforestation_evidence_excluded_area",
    "deforestation_evidence_known_gap",
    "deforestation_evidence_lineage",
    "deforestation_evidence_record",
  ]);
  const uq = await harness.admin.query(`SELECT 1 FROM pg_constraint WHERE conname = 'plot_framework_association_plot_spec_uq' AND contype = 'u'`);
  assert.equal(uq.rowCount, 1);
});

test("scs_api can insert and read a record; nobody can change it (all four tables append-only)", async () => {
  const id = await insertRecord(fixture, {}, "api");
  const read = await api.transaction((tx) => tx.query(`SELECT 1 FROM scs.deforestation_evidence_record WHERE evidence_id = $1`, [id]));
  assert.equal(read.rowCount, 1);
  await harness.admin.query(`INSERT INTO scs.deforestation_evidence_known_gap (evidence_id, gap_start, gap_end, reason) VALUES ($1, '2021-01-01', '2021-03-18', 'CLOUD_COVER')`, [id]);
  await harness.admin.query(
    `INSERT INTO scs.deforestation_evidence_excluded_area (evidence_id, geometry_type, geometry_coordinates, coordinate_reference_system, reason) VALUES ($1, 'POINT', '[101.5, 13.5]', 'EPSG:4326', 'river')`,
    [id],
  );
  for (const table of ["deforestation_evidence_record", "deforestation_evidence_known_gap", "deforestation_evidence_excluded_area"]) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE evidence_id = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE evidence_id = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE evidence_id = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
  const other = await insertRecord(fixture);
  await insertLineage(id, fixture.plotId, other, other);
  await assert.rejects(harness.admin.query(`DELETE FROM scs.deforestation_evidence_lineage WHERE evidence_id = $1`, [id]), /append-only/);
});

test("the association must belong to the plot, with its own specification", async () => {
  const otherPlot = await plotWithAssociation();
  await assert.rejects(insertRecord(fixture, { framework_association_id: otherPlot.associationId }), /deforestation_evidence_record_association_fk/, "another plot's association");
  await assert.rejects(insertRecord(fixture, { evidence_requirement_spec_id: otherPlot.specId }), /deforestation_evidence_record_association_fk/, "another framework's specification");
  await assert.rejects(insertRecord(fixture, { plot_id: randomUUID() }), /deforestation_evidence_record_(plot|association)_fk/);
});

test("integrity: VERIFIED exactly when a stored object is cited with the declared digest; FAILED never recorded", async () => {
  const digest = await storedObject();
  await insertRecord(fixture, { evidence_object_sha256: digest, content_digest: digest, integrity_status: "VERIFIED", admission_limitation_codes: ["SPATIAL_COVERAGE_NOT_VERIFIED"] });
  await assert.rejects(insertRecord(fixture, { integrity_status: "VERIFIED" }), /deforestation_evidence_record_integrity_ck/, "VERIFIED without an object");
  await assert.rejects(insertRecord(fixture, { evidence_object_sha256: digest, integrity_status: "VERIFIED" }), /deforestation_evidence_record_integrity_ck/, "VERIFIED with another digest");
  await assert.rejects(insertRecord(fixture, { evidence_object_sha256: digest, content_digest: digest }), /deforestation_evidence_record_integrity_ck/, "UNVERIFIED although it matches");
  await assert.rejects(insertRecord(fixture, { integrity_status: "FAILED" }), /deforestation_evidence_record_integrity_ck/);
  const unknown = createHash("sha256").update(randomUUID()).digest("hex");
  await assert.rejects(insertRecord(fixture, { evidence_object_sha256: unknown, content_digest: unknown, integrity_status: "VERIFIED" }), /deforestation_evidence_record_object_fk/);
});

test("outcomes: only ADMITTED / ADMITTED_WITH_LIMITATIONS, with limitations exactly when codes are recorded; codes from the contract", async () => {
  await insertRecord(fixture, { admission_status: "ADMITTED", admission_limitation_codes: [], admission_limitations: [] });
  for (const status of ["QUARANTINED", "REJECTED"]) {
    await assert.rejects(insertRecord(fixture, { admission_status: status }), /deforestation_evidence_record_status_ck/, status);
  }
  await assert.rejects(insertRecord(fixture, { admission_status: "ADMITTED" }), /deforestation_evidence_record_status_ck/, "ADMITTED with codes");
  await assert.rejects(insertRecord(fixture, { admission_limitation_codes: [] }), /deforestation_evidence_record_status_ck/, "WITH_LIMITATIONS without codes");
  await assert.rejects(insertRecord(fixture, { admission_limitation_codes: ["ATTESTATION_EXCEEDS_ANALYSIS", "MADE_UP"] }), /deforestation_evidence_record_limitation_codes_ck/);
  await assert.rejects(insertRecord(fixture, { admission_limitation_codes: ["INTEGRITY_UNVERIFIED", "INTEGRITY_UNVERIFIED"] }), /deforestation_evidence_record_limitation_codes_ck/);
});

test("completeness: temporal never complete at admission; spatial complete only with a FULL intersection", async () => {
  await assert.rejects(insertRecord(fixture, { admission_temporal_complete: true }), /deforestation_evidence_record_completeness_ck/);
  await assert.rejects(insertRecord(fixture, { admission_spatial_complete: true }), /deforestation_evidence_record_completeness_ck/);
  await insertRecord(fixture, { admission_spatial_complete: true, intersection_with_plot: "FULL" });
});

test("dates: starts never after ends; POINT_IN_TIME needs an instant; an instant excludes a start or end", async () => {
  await assert.rejects(insertRecord(fixture, { analysis_period_start: "2024-01-01T00:00:00Z" }), /deforestation_evidence_record_periods_ck/);
  await assert.rejects(insertRecord(fixture, { attested_period_start: "2023-01-01T00:00:00Z", attested_period_end: "2022-01-01T00:00:00Z" }), /deforestation_evidence_record_periods_ck/);
  await assert.rejects(insertRecord(fixture, { coverage_mode: "POINT_IN_TIME" }), /deforestation_evidence_record_instant_ck/);
  await insertRecord(fixture, { coverage_mode: "POINT_IN_TIME", acquisition_instant: "2023-06-14T03:00:00Z" });
  await assert.rejects(insertRecord(fixture, { acquisition_instant: "2023-06-14T03:00:00Z", acquisition_start: "2023-06-01T00:00:00Z" }), /deforestation_evidence_record_instant_ck/);
  const id = await insertRecord(fixture);
  await assert.rejects(
    harness.admin.query(`INSERT INTO scs.deforestation_evidence_known_gap (evidence_id, gap_start, gap_end, reason) VALUES ($1, '2021-03-18', '2021-01-01', 'CLOUD_COVER')`, [id]),
    /deforestation_evidence_known_gap_period_ck/,
  );
});

test("groups: an analytical method is recorded whole or not at all; no attestation, no attestation details", async () => {
  await insertRecord(fixture, { analysis_method_name: "GLAD alerts", analysis_detection_target: "DEFORESTATION", analysis_quality_status: "ACCEPTABLE", analysis_analyst_party_id: party });
  await assert.rejects(insertRecord(fixture, { analysis_method_name: "GLAD alerts" }), /deforestation_evidence_record_method_group_ck/);
  await assert.rejects(insertRecord(fixture, { analysis_cloud_cover_percent: 12 }), /deforestation_evidence_record_method_group_ck/);
  await assert.rejects(insertRecord(fixture, { attestation_attesting_role: "forestry officer" }), /deforestation_evidence_record_attestation_group_ck/);
  await insertRecord(fixture, { attestation_provided: true, attestation_attesting_party_id: party, attestation_declared_start: "2021-01-01T00:00:00Z" });
});

test("parties: the analyst and attesting party must be registered", async () => {
  const missing = randomUUID();
  await assert.rejects(
    insertRecord(fixture, { analysis_method_name: "m", analysis_detection_target: "DEFORESTATION", analysis_quality_status: "LIMITED", analysis_analyst_party_id: missing }),
    /deforestation_evidence_record_analyst_fk/,
  );
  await assert.rejects(insertRecord(fixture, { attestation_provided: true, attestation_attesting_party_id: missing }), /deforestation_evidence_record_attesting_party_fk/);
});

test("geometry and enumerations: EPSG:4326 only, coordinates an array, contract values only", async () => {
  await assert.rejects(insertRecord(fixture, { coverage_crs: "EPSG:3857" }), /deforestation_evidence_record_crs_ck/);
  await assert.rejects(insertRecord(fixture, { coverage_geometry_coordinates: JSON.stringify({}) }), /deforestation_evidence_record_coverage_shape_ck/);
  await assert.rejects(insertRecord(fixture, { claim_type: "NO_DEFORESTATION_OCCURRED" }), /deforestation_evidence_record_claim_type_ck/, "DETECTED, never OCCURRED");
  await assert.rejects(insertRecord(fixture, { evidence_type: "DRONE" }), /deforestation_evidence_record_evidence_type_ck/);
  await assert.rejects(insertRecord(fixture, { content_digest: "ABC" }), /deforestation_evidence_record_digest_ck/);
  const id = await insertRecord(fixture);
  await assert.rejects(
    harness.admin.query(
      `INSERT INTO scs.deforestation_evidence_excluded_area (evidence_id, geometry_type, geometry_coordinates, coordinate_reference_system, reason) VALUES ($1, 'POINT', '[1, 2]', 'EPSG:32647', 'x')`,
      [id],
    ),
    /deforestation_evidence_excluded_area_geometry_ck/,
  );
});

test("lineage: a resolved link names a record of the same plot; an unresolved citation is kept as submitted", async () => {
  const a = await insertRecord(fixture);
  const b = await insertRecord(fixture);
  await insertLineage(a, fixture.plotId, b, b, "BASELINE");
  // cited but not (yet) an admitted record: kept, unresolved
  const unknown = randomUUID();
  await insertLineage(a, fixture.plotId, unknown, null, "COMPARISON");
  await assert.rejects(insertLineage(a, fixture.plotId, unknown, unknown, "DERIVED_FROM"), /deforestation_evidence_lineage_linked_fk/, "a link must resolve to a real record");
  // a record of another plot cannot be linked
  const otherPlot = await plotWithAssociation();
  const c = await insertRecord(otherPlot);
  await assert.rejects(insertLineage(a, fixture.plotId, c, c), /deforestation_evidence_lineage_linked_fk/);
  // linked must be the cited id; no self-citation; no duplicate
  await assert.rejects(insertLineage(a, fixture.plotId, randomUUID(), b), /deforestation_evidence_lineage_resolution_ck/);
  await assert.rejects(insertLineage(a, fixture.plotId, a, null), /deforestation_evidence_lineage_not_self_ck/);
  await assert.rejects(insertLineage(a, fixture.plotId, b, b, "BASELINE"), /deforestation_evidence_lineage_uq/);
  // the citing record's plot must be its own
  await assert.rejects(insertLineage(a, otherPlot.plotId, b, null), /deforestation_evidence_lineage_citing_fk/);
});
