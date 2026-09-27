// Migration 011: scs.plot, scs.plot_tenure_claim and
// scs.plot_framework_association, tested against a database built from every
// migration. A party and a framework are registered through the API; plots are
// inserted directly (the CAP-03 endpoint is not built yet). Grants and RLS on
// the new tables are covered by db-security.test.ts, which checks every scs table.

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

const TOKEN = "plot-schema-officer-token-0123456789ab";
const ACTOR = { actorId: "officer-plot-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const ACTOR_JSON = JSON.stringify(ACTOR);

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let partyId = "";
let frameworkId = "";
let specId = "";

async function created(path: string, body: unknown, idField: string): Promise<string> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `plot-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { decision: Record<string, string> };
  assert.equal(res.status, 201, JSON.stringify(json));
  return json.decision[idField]!;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  partyId = await created("/scs/v1/parties", partyRequest("NATURAL_PERSON"), "partyId");
  frameworkId = await created("/scs/v1/frameworks", frameworkRequest(), "frameworkId");
  specId = (await harness.admin.query<{ evidence_spec_id: string }>(`SELECT evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`, [frameworkId])).rows[0]!.evidence_spec_id;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

const RING = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.5]];

/** Insert a plot as the owner, with `overrides` replacing column values. */
async function insertPlot(overrides: Record<string, unknown> = {}, db: "admin" | "api" = "admin"): Promise<string> {
  const cols: Record<string, unknown> = {
    plot_version: 1,
    schema_version: "1",
    registered_at: new Date().toISOString(),
    registered_by: ACTOR_JSON,
    registration_status: "REGISTERED_WITH_GAPS",
    country_code: "TH",
    geometry_type: "POLYGON",
    geometry_coordinates: JSON.stringify([RING]),
    coordinate_reference_system: "EPSG:4326",
    area_hectares: 1.2,
    capture_method: "PHONE_GPS",
    registry_verification_status: "NOT_APPLICABLE",
    supporting_evidence_ids: [],
    evidence_limitations: [],
    overlap_state: "NOT_EVALUATED",
    provenance_submitted_by: ACTOR_JSON,
    provenance_source_type: "cooperative field survey",
    provenance_recorded_at: new Date().toISOString(),
    ...overrides,
  };
  const names = Object.keys(cols);
  const sql = `INSERT INTO scs.plot (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING plot_id`;
  const values = names.map((n) => cols[n]);
  const { rows } = db === "admin"
    ? await harness.admin.query<{ plot_id: string }>(sql, values)
    : await api.transaction((tx) => tx.query<{ plot_id: string }>(sql, values));
  return rows[0]!.plot_id;
}

const insertClaim = (plotId: string, overrides: Record<string, unknown> = {}) => {
  const cols: Record<string, unknown> = {
    plot_id: plotId, plot_version: 1, claimant_type: "INDIVIDUAL", claimant_party_id: partyId, tenure_basis: "CUSTOMARY_INDIVIDUAL_RIGHT",
    evidence_ids: [], verification_status: "UNVERIFIED", limitations: [], recorded_at: new Date().toISOString(), recorded_by: ACTOR_JSON, ...overrides,
  };
  const names = Object.keys(cols);
  return harness.admin.query(`INSERT INTO scs.plot_tenure_claim (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => cols[n]));
};

const insertAssociation = (plotId: string, overrides: Record<string, unknown> = {}) => {
  const cols: Record<string, unknown> = {
    plot_id: plotId, framework_id: frameworkId, framework_version: "consolidated-2024", commodity_code: "4001", applicability_status: "APPLICABLE",
    associated_at: new Date().toISOString(), associated_by: ACTOR_JSON, association_reason: "EUDR rubber export", evidence_requirement_spec_id: specId,
    lifecycle_status: "ACTIVE", ...overrides,
  };
  const names = Object.keys(cols);
  return harness.admin.query(`INSERT INTO scs.plot_framework_association (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => cols[n]));
};

test("migration 011 creates the three CAP-03 tables", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name LIKE 'plot%' ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["plot", "plot_framework_association", "plot_tenure_claim"]);
});

test("scs_api can insert and read a plot; it cannot update or delete one", async () => {
  const plotId = await insertPlot({}, "api");
  const read = await api.transaction((tx) => tx.query(`SELECT 1 FROM scs.plot WHERE plot_id = $1`, [plotId]));
  assert.equal(read.rowCount, 1);
  await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.plot SET registration_status = 'REGISTERED' WHERE plot_id = $1`, [plotId])), /permission denied/);
  await assert.rejects(api.transaction((tx) => tx.query(`DELETE FROM scs.plot WHERE plot_id = $1`, [plotId])), /permission denied/);
});

test("a point: area optional, at most 4 hectares when declared (EUDR Article 2(28))", async () => {
  await insertPlot({ geometry_type: "POINT", geometry_coordinates: JSON.stringify([101.5, 13.5]), area_hectares: null });
  await insertPlot({ geometry_type: "POINT", geometry_coordinates: JSON.stringify([101.5, 13.5]), area_hectares: 4 });
  await assert.rejects(insertPlot({ geometry_type: "POINT", geometry_coordinates: JSON.stringify([101.5, 13.5]), area_hectares: 4.01 }), /plot_area_rule_ck/);
});

test("a polygon or multipolygon must declare its area", async () => {
  await assert.rejects(insertPlot({ area_hectares: null }), /plot_area_rule_ck/);
  await assert.rejects(insertPlot({ geometry_type: "MULTIPOLYGON", geometry_coordinates: JSON.stringify([[RING]]), area_hectares: null }), /plot_area_rule_ck/);
  await insertPlot({ geometry_type: "MULTIPOLYGON", geometry_coordinates: JSON.stringify([[RING]]), area_hectares: 12 });
});

test("plot checks: EPSG:4326 only, coordinates an array, registry reference when not NOT_APPLICABLE, enumerations, country format", async () => {
  await assert.rejects(insertPlot({ coordinate_reference_system: "EPSG:3857" }), /plot_crs_ck/);
  await assert.rejects(insertPlot({ geometry_coordinates: JSON.stringify({ type: "Polygon" }) }), /plot_coordinates_array_ck/);
  await assert.rejects(insertPlot({ registry_verification_status: "VERIFIED" }), /plot_registry_reference_ck/);
  await insertPlot({ registry_verification_status: "VERIFIED", registry_reference: "Chanote 12345", registry_authority: "Department of Lands" });
  await assert.rejects(insertPlot({ geometry_type: "LINESTRING" }), /plot_geometry_type_ck/);
  await assert.rejects(insertPlot({ registration_status: "VERIFIED" }), /plot_registration_status_ck/);
  await assert.rejects(insertPlot({ overlap_state: "UNKNOWN" }), /plot_overlap_state_ck/);
  await assert.rejects(insertPlot({ country_code: "th" }), /plot_country_code_format_ck/);
  await assert.rejects(insertPlot({ area_hectares: 0 }), /plot_numbers_positive_ck/);
});

test("tenure claim: claimant must be a registered party; enumerations; validity range", async () => {
  const plotId = await insertPlot();
  await insertClaim(plotId);
  await assert.rejects(insertClaim(plotId, { claimant_party_id: randomUUID() }), /plot_tenure_claim_claimant_fk/);
  await assert.rejects(insertClaim(randomUUID()), /plot_tenure_claim_plot_fk/);
  await assert.rejects(insertClaim(plotId, { tenure_basis: "COOPERATIVE_MEMBERSHIP" }), /plot_tenure_claim_tenure_basis_ck/);
  await assert.rejects(insertClaim(plotId, { verification_status: "CLAIMED_UNVERIFIED" }), /plot_tenure_claim_verification_status_ck/);
  await assert.rejects(
    insertClaim(plotId, { valid_from: "2026-01-01T00:00:00Z", valid_until: "2026-01-01T00:00:00Z" }),
    /plot_tenure_claim_validity_range_ck/,
  );
});

test("framework association: the specification must be its own framework's; producer a registered party; one ACTIVE per framework", async () => {
  const plotId = await insertPlot();
  const otherFramework = await created("/scs/v1/frameworks", frameworkRequest(), "frameworkId");
  // the spec of one framework cannot be named with another framework
  await assert.rejects(insertAssociation(plotId, { framework_id: otherFramework }), /plot_framework_association_framework_spec_fk/);
  await assert.rejects(insertAssociation(plotId, { evidence_requirement_spec_id: "no-such-spec" }), /plot_framework_association_framework_spec_fk/);
  await assert.rejects(insertAssociation(plotId, { producer_or_operator_party_id: randomUUID() }), /plot_framework_association_producer_fk/);
  await insertAssociation(plotId, { producer_or_operator_party_id: partyId });
  await assert.rejects(insertAssociation(plotId), /plot_framework_association_active_uq/);
  // a withdrawn association does not block a new ACTIVE one
  await harness.admin.query(`UPDATE scs.plot_framework_association SET lifecycle_status = 'WITHDRAWN' WHERE plot_id = $1`, [plotId]);
  await insertAssociation(plotId);
  await assert.rejects(insertAssociation(await insertPlot(), { commodity_code: " " }), /plot_framework_association_required_text_not_blank_ck/);
});

test("regulatory_framework gains UNIQUE (framework_id, evidence_spec_id), and a referenced framework cannot be deleted", async () => {
  const { rows } = await harness.admin.query(
    `SELECT 1 FROM pg_constraint WHERE conname = 'regulatory_framework_framework_spec_uq' AND contype = 'u'`,
  );
  assert.equal(rows.length, 1);
  await assert.rejects(harness.admin.query(`DELETE FROM scs.regulatory_framework WHERE framework_id = $1`, [frameworkId]), /plot_framework_association_framework_spec_fk/);
});
