// SCS-CAP-03 POST /scs/v1/plots, end to end: real HTTP through the server
// layer, real PostgreSQL (database built from every migration), the API
// connected as a restricted member of scs_api. Claimant and producer parties
// are registered through POST /scs/v1/parties, frameworks through
// POST /scs/v1/frameworks.

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
import type { RegisterPlotRequest, ScsPlotFrameworkAssociationInput, ScsPlotRegistrationResponse } from "../types/cap-03.js";
import { frameworkRequest, issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap03-officer-token-0123456789abcdefgh",
  admin: "cap03-sysadmin-token-0123456789abcdefg",
  viewer: "cap03-viewer-token-0123456789abcdefghij",
};
const actors = {
  officer: { actorId: "officer-cap03", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap03", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap03", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const PLOTS = "/scs/v1/plots";
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let smallholder = "";
let cooperative = "";
let rubberTH = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap03-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

async function created(path: string, body: unknown, idField: string): Promise<string> {
  const r = await post(path, body);
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}
const registerFramework = (commodity?: string, country?: string) => created("/scs/v1/frameworks", frameworkRequest(commodity, country), "frameworkId");
const registerParty = (type: Parameters<typeof partyRequest>[0] = "NATURAL_PERSON") => created("/scs/v1/parties", partyRequest(type), "partyId");

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
    actors: (Object.keys(TOKENS) as Array<keyof typeof TOKENS>).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  smallholder = await registerParty("NATURAL_PERSON");
  cooperative = await registerParty("COOPERATIVE");
  rubberTH = await registerFramework();
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type PlotInput = RegisterPlotRequest["plot"];
type GeometryInput = PlotInput["geometry"];
/** Geometry overrides; a key set to undefined removes that field (e.g. areaHectares: undefined). */
type GeometryOverride = { [K in keyof GeometryInput]?: GeometryInput[K] | undefined };

function geometryOf(override: GeometryOverride = {}): GeometryInput {
  const merged: Record<string, unknown> = {
    geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS", positionalAccuracyMetres: 5, ...override,
  };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  return merged as unknown as GeometryInput;
}

/** A Thai rubber smallholding: a 1.2 ha polygon, one customary tenure claim, no associations. */
function plotRequest(opts: { geometry?: GeometryOverride; plot?: Partial<PlotInput>; tenureClaims?: RegisterPlotRequest["tenureClaims"]; associations?: ScsPlotFrameworkAssociationInput[] } = {}): RegisterPlotRequest {
  return {
    plot: {
      plotName: `Rubber plot ${randomUUID()}`,
      countryCode: "TH",
      administrativeAreas: ["Rayong", "Ban Khai"],
      geometry: geometryOf(opts.geometry),
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [randomUUID()], evidenceLimitations: ["Boundary walked with a phone; no survey."] },
      sourceType: "cooperative field survey",
      ...opts.plot,
    },
    tenureClaims: opts.tenureClaims ?? [
      { claimantType: "INDIVIDUAL", claimantId: smallholder, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: ["Village head attestation only."] },
    ],
    ...(opts.associations !== undefined ? { initialFrameworkAssociations: opts.associations } : {}),
  };
}

const rubberAssociation = (overrides: Partial<ScsPlotFrameworkAssociationInput> = {}): ScsPlotFrameworkAssociationInput => ({
  frameworkId: rubberTH,
  commodityCode: "4001",
  producerOrOperatorId: cooperative,
  associationReason: "EUDR due diligence for natural rubber exports",
  ...overrides,
});

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  plots: await count("SELECT count(*) AS n FROM scs.plot"),
  claims: await count("SELECT count(*) AS n FROM scs.plot_tenure_claim"),
  associations: await count("SELECT count(*) AS n FROM scs.plot_framework_association"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});
const plotRow = async (plotId: string) => (await harness.admin.query(`SELECT * FROM scs.plot WHERE plot_id = $1`, [plotId])).rows[0] as Record<string, unknown>;
const decisionOf = (r: { json: Record<string, unknown> }) => (r.json as unknown as ScsPlotRegistrationResponse).decision;

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = await totals();
  const key = `cap03-${randomUUID()}`;
  const r = await post(PLOTS, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-03");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.equal(r.json["noPlotRegistered"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r;
}

/** Posts a plot that must register; returns the decision after checking the response schema and receipt. */
async function registerOk(body: RegisterPlotRequest) {
  const r = await post(PLOTS, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsPlotRegistrationResponse;
  const checked = runWithCorrelation("cap03-test-schema", () => validate("SCS-CAP-03", SCHEMAS.cap03PlotRegistrationResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-03");
  assert.equal(receipt["decision_type"], "PLOT_REGISTRATION");
  assert.equal(receipt["subject_id"], res.decision.plotId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, res.decision);
  return res.decision;
}

const gapCodes = (d: { gaps: Array<{ gapCode: string }> }) => d.gaps.map((g) => g.gapCode).sort();

// ── Valid registrations ──────────────────────────────────────────────────────

test("valid POLYGON → 201 REGISTERED_WITH_GAPS; plot, tenure claim and association written; overlap NOT EVALUATED", async () => {
  const body = plotRequest({ associations: [rubberAssociation()] });
  const d = await registerOk(body);
  assert.equal(d.decision, "REGISTERED_WITH_GAPS");
  assert.deepEqual(gapCodes(d), ["OVERLAP_NOT_EVALUATED", "REGISTRY_REFERENCE_MISSING"]);
  assert.deepEqual(d.gaps.find((g) => g.gapCode === "OVERLAP_NOT_EVALUATED"), {
    gapCode: "OVERLAP_NOT_EVALUATED",
    gapDescription: d.gaps.find((g) => g.gapCode === "OVERLAP_NOT_EVALUATED")!.gapDescription,
    automaticFailure: false,
    humanReviewRequired: true,
  });
  assert.equal(d.eligibilityChecks.noFatalOverlapDetected, false, "not evaluated, so not true");
  assert.ok(d.decisionReasons.some((x) => x.startsWith("noFatalOverlapDetected: NOT EVALUATED")));
  for (const [check, value] of Object.entries(d.eligibilityChecks).filter(([c]) => c !== "noFatalOverlapDetected")) {
    assert.equal(value, true, check);
    assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
  }
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Registration is not verification")));
  assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: ") && x.includes("are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest")));
  assert.equal(d.frameworkAssociationResults.length, 1);
  assert.equal(d.frameworkAssociationResults[0]!.outcome, "ASSOCIATED");

  const p = await plotRow(d.plotId);
  assert.equal(p["registration_status"], "REGISTERED_WITH_GAPS");
  assert.equal(p["overlap_state"], "NOT_EVALUATED");
  assert.equal(p["geometry_type"], "POLYGON");
  assert.deepEqual(p["geometry_coordinates"], [SQUARE]);
  assert.equal(p["coordinate_reference_system"], "EPSG:4326");
  assert.equal(Number(p["area_hectares"]), 1.2);
  assert.equal(p["plot_version"], 1);
  assert.deepEqual(p["registered_by"], issuedReference(actors.officer));
  assert.deepEqual(p["provenance_submitted_by"], issuedReference(actors.officer));
  assert.deepEqual(p["administrative_areas"], ["Rayong", "Ban Khai"]);
  assert.equal((p["registered_at"] as Date).toISOString(), d.decidedAt);

  const claim = (await harness.admin.query(`SELECT * FROM scs.plot_tenure_claim WHERE plot_id = $1`, [d.plotId])).rows as Array<Record<string, unknown>>;
  assert.equal(claim.length, 1);
  assert.equal(claim[0]!["claimant_party_id"], smallholder);
  assert.equal(claim[0]!["claimant_type"], "INDIVIDUAL");
  assert.equal(claim[0]!["verification_status"], "UNVERIFIED");
  assert.deepEqual(claim[0]!["recorded_by"], issuedReference(actors.officer));

  const assoc = (await harness.admin.query(`SELECT * FROM scs.plot_framework_association WHERE plot_id = $1`, [d.plotId])).rows[0] as Record<string, unknown>;
  assert.equal(assoc["association_id"], d.frameworkAssociationResults[0]!.associationId);
  assert.equal(assoc["framework_id"], rubberTH);
  assert.equal(assoc["framework_version"], "consolidated-2024", "the framework's regulationVersion, set by the system");
  assert.equal(assoc["commodity_code"], "4001");
  assert.equal(assoc["producer_or_operator_party_id"], cooperative);
  assert.equal(assoc["applicability_status"], "APPLICABLE");
  assert.equal(assoc["lifecycle_status"], "ACTIVE");
  const spec = (await harness.admin.query(`SELECT evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`, [rubberTH])).rows[0] as Record<string, unknown>;
  assert.equal(assoc["evidence_requirement_spec_id"], spec["evidence_spec_id"]);
});

test("valid POINT without a declared area → 201, POINT_AREA_UNDECLARED disclosed", async () => {
  const d = await registerOk(plotRequest({ geometry: { geometryType: "POINT", coordinates: [101.5, 13.5], areaHectares: undefined } }));
  assert.deepEqual(gapCodes(d), ["OVERLAP_NOT_EVALUATED", "POINT_AREA_UNDECLARED", "REGISTRY_REFERENCE_MISSING"]);
  const p = await plotRow(d.plotId);
  assert.equal(p["geometry_type"], "POINT");
  assert.equal(p["area_hectares"], null);
});

test("valid POINT with a declared area of at most 4 ha → 201, no area gap", async () => {
  const d = await registerOk(plotRequest({ geometry: { geometryType: "POINT", coordinates: [101.5, 13.5], areaHectares: 3.5 } }));
  assert.ok(!gapCodes(d).includes("POINT_AREA_UNDECLARED"));
  assert.equal(Number((await plotRow(d.plotId))["area_hectares"]), 3.5);
});

test("valid MULTIPOLYGON → 201", async () => {
  const second = SQUARE.map(([x, y]) => [x! + 0.01, y!]);
  const d = await registerOk(plotRequest({ geometry: { geometryType: "MULTIPOLYGON", coordinates: [[SQUARE], [second]], areaHectares: 2.4 } }));
  assert.equal((await plotRow(d.plotId))["geometry_type"], "MULTIPOLYGON");
});

test("with a registry reference → no REGISTRY_REFERENCE_MISSING gap; several tenure claims, including a cooperative", async () => {
  const d = await registerOk(
    plotRequest({
      plot: { identityEvidence: { registryReference: "Chanote 44721", registryAuthority: "Department of Lands", registryVerificationStatus: "UNVERIFIED", supportingEvidenceIds: [], evidenceLimitations: [] } },
      tenureClaims: [
        { claimantType: "INDIVIDUAL", claimantId: smallholder, tenureBasis: "FORMAL_TITLE", evidenceIds: [], limitations: [] },
        { claimantType: "COOPERATIVE", claimantId: cooperative, tenureBasis: "COMMUNITY_ATTESTATION", evidenceIds: [], validFrom: "2020-01-01T00:00:00Z", validUntil: "2030-01-01T00:00:00Z", limitations: [] },
      ],
    }),
  );
  assert.deepEqual(gapCodes(d), ["OVERLAP_NOT_EVALUATED"], "overlap is always a gap in the pilot");
  assert.equal(d.decision, "REGISTERED_WITH_GAPS");
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot_tenure_claim WHERE plot_id = $1", [d.plotId]), 2);
});

// ── Plot-level failures (fail closed) ────────────────────────────────────────

test("a POINT declaring more than 4 ha → 422 GEOMETRY_INVALID", async () => {
  const r = await assertRefused(plotRequest({ geometry: { geometryType: "POINT", coordinates: [101.5, 13.5], areaHectares: 6 } }), 422, "GEOMETRY_INVALID");
  assert.match((r.json["reasons"] as string[])[0]!, /at most 4 hectares \(EUDR Article 2\(28\)\)/);
});

test("invalid GeoJSON geometry → 422 GEOMETRY_INVALID naming each problem", async () => {
  const bowtie = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]];
  for (const [geometry, reason] of [
    [{ coordinates: [bowtie] }, /intersects itself/],
    [{ coordinates: [SQUARE.slice(0, 4)] }, /not closed/],
    [{ coordinates: [[[101.5, 13.5], [101.6, 13.5], [101.5, 13.5]]] }, /at least 4 positions/],
    [{ coordinates: [SQUARE.map(([x, y]) => [x! + 100, y!])] }, /longitude .* is outside/],
    [{ geometryType: "POINT" as const, coordinates: [[101.5, 13.5]], areaHectares: undefined }, /a position must be/],
    [{ areaHectares: undefined }, /areaHectares: required for a POLYGON/],
  ] as Array<[GeometryOverride, RegExp]>) {
    const r = await assertRefused(plotRequest({ geometry }), 422, "GEOMETRY_INVALID");
    assert.ok((r.json["reasons"] as string[]).some((x) => reason.test(x)), `${reason}: ${JSON.stringify(r.json["reasons"])}`);
  }
});

test("coordinate reference system other than EPSG:4326 → 422 COORDINATE_REFERENCE_SYSTEM_UNSUPPORTED", async () => {
  const r = await assertRefused(plotRequest({ geometry: { coordinateReferenceSystem: "EPSG:32647" } }), 422, "COORDINATE_REFERENCE_SYSTEM_UNSUPPORTED");
  assert.match((r.json["reasons"] as string[])[0]!, /only EPSG:4326 \(WGS 84\) is accepted/);
});

test("invalid country code → 422 COUNTRY_CODE_UNRECOGNISED", async () => {
  await assertRefused(plotRequest({ plot: { countryCode: "XX" } }), 422, "COUNTRY_CODE_UNRECOGNISED");
});

test("claimant party not registered → 422 CLAIMANT_PARTY_NOT_FOUND naming it", async () => {
  const missing = randomUUID();
  const r = await assertRefused(
    plotRequest({ tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: missing, tenureBasis: "UNKNOWN", evidenceIds: [], limitations: [] }] }),
    422,
    "CLAIMANT_PARTY_NOT_FOUND",
  );
  assert.deepEqual(r.json["reasons"], [`No SCS-CAP-02 party is registered with claimantId ${missing}.`]);
});

test("claimant party RETIRED → 422 PARTY_RETIRED", async () => {
  const retired = await seedRetiredParty();
  await assertRefused(
    plotRequest({ tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: retired, tenureBasis: "OCCUPANCY_OR_USE_CLAIM", evidenceIds: [], limitations: [] }] }),
    422,
    "PARTY_RETIRED",
  );
});

test("tenure claim validUntil not after validFrom → 400 VALIDITY_PERIOD_INVALID", async () => {
  await assertRefused(
    plotRequest({
      tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: smallholder, tenureBasis: "LEASE", evidenceIds: [], validFrom: "2026-01-01T00:00:00Z", validUntil: "2026-01-01T00:00:00Z", limitations: [] }],
    }),
    400,
    "VALIDITY_PERIOD_INVALID",
  );
});

test("no tenure claim → 400 from the schema", async () => {
  const r = await assertRefused(plotRequest({ tenureClaims: [] }), 400, "REQUEST_VALIDATION_FAILED");
  assert.ok((r.json["reasons"] as string[]).some((x) => x.startsWith("/tenureClaims: must NOT have fewer than 1 items")));
  const { tenureClaims: _omitted, ...none } = plotRequest();
  await assertRefused(none, 400, "REQUEST_VALIDATION_FAILED");
});

test("a submitted tenure verificationStatus or plot overlapState is refused → 400 from the schema", async () => {
  const body = plotRequest();
  await assertRefused({ ...body, tenureClaims: [{ ...body.tenureClaims[0], verificationStatus: "VERIFIED" }] }, 400, "REQUEST_VALIDATION_FAILED");
  await assertRefused({ ...body, plot: { ...body.plot, overlapState: "NO_KNOWN_OVERLAP" } }, 400, "REQUEST_VALIDATION_FAILED");
});

test("registryVerificationStatus other than NOT_APPLICABLE without a registryReference → 400", async () => {
  const r = await assertRefused(
    plotRequest({ plot: { identityEvidence: { registryVerificationStatus: "VERIFIED", supportingEvidenceIds: [], evidenceLimitations: [] } } }),
    400,
    "REQUEST_VALIDATION_FAILED",
  );
  assert.deepEqual(r.json["reasons"], ["/plot/identityEvidence/registryReference: required when registryVerificationStatus is VERIFIED (only NOT_APPLICABLE needs none)."]);
});

test("the same framework twice in initialFrameworkAssociations → 400", async () => {
  await assertRefused(plotRequest({ associations: [rubberAssociation(), rubberAssociation({ producerOrOperatorId: smallholder })] }), 400, "REQUEST_VALIDATION_FAILED");
});

// ── Association-level failures (the plot still registers) ────────────────────

async function oneFailedAssociation(association: ScsPlotFrameworkAssociationInput, failureCode: string) {
  const d = await registerOk(plotRequest({ associations: [association] }));
  assert.equal(d.decision, "REGISTERED_WITH_GAPS");
  assert.equal(d.frameworkAssociationResults.length, 1);
  const result = d.frameworkAssociationResults[0]!;
  assert.equal(result.outcome, "FAILED");
  assert.equal(result.failureCode, failureCode);
  assert.equal(result.associationId, undefined);
  assert.ok(gapCodes(d).includes("FRAMEWORK_ASSOCIATION_FAILED"));
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot WHERE plot_id = $1", [d.plotId]), 1, "the plot is registered");
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot_framework_association WHERE plot_id = $1", [d.plotId]), 0, "nothing written for the association");
  return result;
}

test("producer party not registered → FAILED PRODUCER_PARTY_NOT_FOUND; the plot registers", async () => {
  const missing = randomUUID();
  const result = await oneFailedAssociation(rubberAssociation({ producerOrOperatorId: missing }), "PRODUCER_PARTY_NOT_FOUND");
  assert.ok(result.reason!.includes(missing));
});

test("producer party RETIRED → FAILED PARTY_RETIRED; the plot registers", async () => {
  await oneFailedAssociation(rubberAssociation({ producerOrOperatorId: await seedRetiredParty() }), "PARTY_RETIRED");
});

test("framework not registered → FAILED FRAMEWORK_REFERENCE_NOT_FOUND; the plot registers", async () => {
  await oneFailedAssociation(rubberAssociation({ frameworkId: randomUUID() }), "FRAMEWORK_REFERENCE_NOT_FOUND");
});

test("framework not ACTIVE → FAILED FRAMEWORK_NOT_ACTIVE; the plot registers", async () => {
  const withdrawn = await registerFramework();
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'WITHDRAWN' WHERE framework_id = $1`, [withdrawn]);
  await oneFailedAssociation(rubberAssociation({ frameworkId: withdrawn }), "FRAMEWORK_NOT_ACTIVE");
});

test("commodity outside the framework → FAILED COMMODITY_OUTSIDE_FRAMEWORK; the plot registers", async () => {
  const result = await oneFailedAssociation(rubberAssociation({ commodityCode: "0901" }), "COMMODITY_OUTSIDE_FRAMEWORK");
  assert.match(result.reason!, /"0901" is not framework .*'s commodityCode \("4001"\)/);
});

test("mixed outcomes: one association succeeds, one fails; mixed-use plot with two commodities", async () => {
  const coffeeTH = await registerFramework("0901", "TH");
  const d = await registerOk(plotRequest({ associations: [rubberAssociation(), rubberAssociation({ frameworkId: coffeeTH, commodityCode: "0901" }), rubberAssociation({ frameworkId: randomUUID() })] }));
  assert.deepEqual(d.frameworkAssociationResults.map((r) => r.outcome), ["ASSOCIATED", "ASSOCIATED", "FAILED"]);
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot_framework_association WHERE plot_id = $1", [d.plotId]), 2);
  assert.ok(d.decisionReasons.includes("Framework associations: 2 associated, 1 failed. A failed association does not fail the plot registration."));
});

test("all associations failed → the plot registers with every association FAILED", async () => {
  const d = await registerOk(plotRequest({ associations: [rubberAssociation({ frameworkId: randomUUID() }), rubberAssociation({ commodityCode: "1511" })] }));
  assert.deepEqual(d.frameworkAssociationResults.map((r) => [r.outcome, r.failureCode]), [["FAILED", "FRAMEWORK_REFERENCE_NOT_FOUND"], ["FAILED", "COMMODITY_OUTSIDE_FRAMEWORK"]]);
  assert.equal(d.gaps.filter((g) => g.gapCode === "FRAMEWORK_ASSOCIATION_FAILED").length, 2);
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot WHERE plot_id = $1", [d.plotId]), 1);
  assert.equal(await count("SELECT count(*) AS n FROM scs.plot_framework_association WHERE plot_id = $1", [d.plotId]), 0);
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 REGISTRANT_NOT_AUTHORISED, nothing written", async () => {
  for (const who of ["viewer", "admin"] as const) {
    const r = await assertRefused(plotRequest(), 403, "REGISTRANT_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Registering a plot requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const before = await totals();
  const r = await post(PLOTS, plotRequest(), { key: null });
  assert.equal(r.status, 400);
  assert.deepEqual(await totals(), before);
});

test("same key, same content → byte-identical 201 replay; same key, different content → 409", async () => {
  const body = plotRequest({ associations: [rubberAssociation()] });
  const key = `cap03-${randomUUID()}`;
  const first = await post(PLOTS, body, { key });
  const before = await totals();
  const second = await post(PLOTS, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before, "no second write");
  const conflict = await post(PLOTS, plotRequest(), { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500; plot, tenure claims and associations all absent", async () => {
  const body = plotRequest({ associations: [rubberAssociation()] });
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(PLOTS, body);
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noPlotRegistered"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
    assert.equal(await count("SELECT count(*) AS n FROM scs.plot WHERE plot_name = $1", [body.plot.plotName]), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(PLOTS, body)).status, 201, "and registration works again once the failure is gone");
});

// ── The pilot's honest outcome (runs last) ───────────────────────────────────

test("every registered plot has overlapState NOT_EVALUATED and registrationStatus REGISTERED_WITH_GAPS", async () => {
  const { rows } = await harness.admin.query<{ overlap_state: string; registration_status: string; n: string }>(
    `SELECT overlap_state, registration_status, count(*) AS n FROM scs.plot GROUP BY 1, 2`,
  );
  assert.ok(rows.length > 0, "plots were registered by the tests above");
  assert.deepEqual(rows.map((r) => [r.overlap_state, r.registration_status]), [["NOT_EVALUATED", "REGISTERED_WITH_GAPS"]]);
  const receipts = await harness.admin.query<{ decision: string }>(`SELECT DISTINCT decision FROM scs.decision_receipt WHERE decision_type = 'PLOT_REGISTRATION'`);
  assert.deepEqual(receipts.rows, [{ decision: "REGISTERED_WITH_GAPS" }]);
});
