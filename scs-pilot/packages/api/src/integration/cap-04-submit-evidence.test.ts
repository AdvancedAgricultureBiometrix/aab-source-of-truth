// SCS-CAP-04 POST /scs/v1/deforestation-evidence, end to end: real HTTP
// through the server layer, real PostgreSQL (database built from every
// migration), the API connected as a restricted member of scs_api. Parties,
// frameworks and plots are registered through their own endpoints. Stored
// evidence objects are inserted as SCS-PLATFORM-01 rows directly: CAP-04
// reads the row, never the object store, so no MinIO is needed here.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
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
import type { ScsFrameworkRegistrationRequest } from "../types/cap-01.js";
import type { ScsPlotRegistrationResponse } from "../types/cap-03.js";
import type {
  ScsDeforestationEvidenceAdmissionDecision,
  ScsDeforestationEvidenceAdmissionResponse,
  ScsDeforestationEvidenceSubmissionRequest,
} from "../types/cap-04.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap04-officer-token-0123456789abcdefgh",
  admin: "cap04-sysadmin-token-0123456789abcdefg",
  viewer: "cap04-viewer-token-0123456789abcdefghij",
};
const actors = {
  officer: { actorId: "officer-cap04", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap04", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap04", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const EVIDENCE = "/scs/v1/deforestation-evidence";
/** The plot: a ~1.2 ha square in Rayong, Thailand. */
const PLOT_SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
/** A satellite scene footprint around the plot. */
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];
/** A footprint in Brazil: nowhere near the plot. */
const ELSEWHERE = [[-55.1, -10.1], [-55.0, -10.1], [-55.0, -10.0], [-55.1, -10.0], [-55.1, -10.1]];

const BASE_CODES = ["SPATIAL_COVERAGE_NOT_VERIFIED", "TEMPORAL_COVERAGE_NOT_EVALUATED"];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let attester = "";
let analyst = "";
let retiredParty = "";
/** Framework requiring VERIFIED integrity (the fixture's), and one requiring only VERIFIABLE. */
let strict = { plotId: "", associationId: "" };
let open = { plotId: "", associationId: "" };

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap04-${randomUUID()}` : opts.key;
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

type DeforestationRequirement = ScsFrameworkRegistrationRequest["evidenceRequirements"]["deforestationEvidence"];
function registerFramework(requirement: Partial<DeforestationRequirement> = {}) {
  const body = frameworkRequest();
  body.evidenceRequirements.deforestationEvidence = { ...body.evidenceRequirements.deforestationEvidence, ...requirement };
  return created("/scs/v1/frameworks", body, "frameworkId");
}

/** Registers a rubber plot associated with `frameworkId`; returns its plotId and associationId. */
async function registerPlot(frameworkId: string, coordinates: unknown = [PLOT_SQUARE]) {
  const r = await post("/scs/v1/plots", {
    plot: {
      plotName: `Rubber plot ${randomUUID()}`,
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates, coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "cooperative field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: attester, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId, commodityCode: "4001", associationReason: "EUDR due diligence" }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const d = (r.json as unknown as ScsPlotRegistrationResponse).decision;
  assert.equal(d.frameworkAssociationResults[0]!.outcome, "ASSOCIATED");
  return { plotId: d.plotId, associationId: d.frameworkAssociationResults[0]!.associationId! };
}

/** Inserts an SCS-PLATFORM-01 evidence object row for fresh random bytes; returns its SHA-256 (the objectId). */
async function storedObject(): Promise<string> {
  const digest = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'image/tiff', 'test', $1, $2)`,
    [digest, JSON.stringify(actors.officer)],
  );
  return digest;
}

const randomDigest = () => createHash("sha256").update(randomBytes(32)).digest("hex");

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
    actors: (Object.keys(TOKENS) as Array<keyof typeof TOKENS>).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  attester = await created("/scs/v1/parties", partyRequest("LEGAL_ENTITY"), "partyId");
  analyst = await created("/scs/v1/parties", partyRequest("LEGAL_ENTITY"), "partyId");
  retiredParty = await seedRetiredParty();
  strict = await registerPlot(await registerFramework());
  open = await registerPlot(await registerFramework({ integrityRequirement: "VERIFIABLE", acceptedSourceTypes: ["SATELLITE_IMAGE", "REMOTE_SENSING_ANALYSIS"] }));
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Req = ScsDeforestationEvidenceSubmissionRequest;

/**
 * A Sentinel-2 change analysis over the plot, 2020-12-31 to 2024-06-30, with
 * one cloud-cover gap, a registered analyst, no attestation, and full chain of
 * custody. `objectId` null cites no stored object.
 */
function evidenceRequest(target: { plotId: string; associationId: string }, objectId: string | null, edit: (r: Req) => void = () => {}): Req {
  const digest = objectId ?? randomDigest();
  const r: Req = {
    plotId: target.plotId,
    frameworkAssociationId: target.associationId,
    evidenceType: "SATELLITE_IMAGE",
    source: {
      sourceId: `S2-${randomUUID()}`,
      sourceOrganizationId: "ESA-COPERNICUS",
      sourceTitle: "Sentinel-2 L2A scene",
      providerName: "Copernicus Data Space",
      sourceReference: "https://dataspace.copernicus.eu/",
    },
    evidenceObject: {
      ...(objectId === null ? {} : { objectId }),
      originalObjectReference: "S2B_MSIL2A_20240630T033539_N0510_R061_T47PQR",
      contentDigest: digest,
      chainOfCustodyComplete: true,
    },
    spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
    temporalCoverage: {
      acquisitionStart: "2020-12-01T00:00:00Z",
      acquisitionEnd: "2024-06-30T00:00:00Z",
      analysisPeriodStart: "2020-12-31T00:00:00Z",
      analysisPeriodEnd: "2024-06-30T00:00:00Z",
      coverageMode: "CHANGE_ANALYSIS",
      knownGapPeriods: [{ start: "2021-01-05T00:00:00Z", end: "2021-03-18T00:00:00Z", reason: "CLOUD_COVER" }],
    },
    analyticalMethod: { methodName: "Forest loss change detection", methodVersion: "2.1", analystOrganizationId: analyst, detectionTarget: "DEFORESTATION", qualityStatus: "ACCEPTABLE" },
    evidenceClaim: {
      claimType: "NO_DEFORESTATION_DETECTED",
      claimSummary: "No tree cover loss detected within the plot boundary.",
      claimedPeriodStart: "2020-12-31T00:00:00Z",
      claimedPeriodEnd: "2024-06-30T00:00:00Z",
      confidence: "MEDIUM",
      limitations: ["10 m resolution; losses under 0.1 ha may be missed."],
    },
    coverageAttestation: { attestationProvided: false },
  };
  edit(r);
  return r;
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  records: await count("SELECT count(*) AS n FROM scs.deforestation_evidence_record"),
  gaps: await count("SELECT count(*) AS n FROM scs.deforestation_evidence_known_gap"),
  excluded: await count("SELECT count(*) AS n FROM scs.deforestation_evidence_excluded_area"),
  lineage: await count("SELECT count(*) AS n FROM scs.deforestation_evidence_lineage"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});
const recordRow = async (evidenceId: string) =>
  (await harness.admin.query(`SELECT * FROM scs.deforestation_evidence_record WHERE evidence_id = $1`, [evidenceId])).rows[0] as Record<string, unknown>;

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = await totals();
  const key = `cap04-${randomUUID()}`;
  const r = await post(EVIDENCE, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-04");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.equal(r.json["noEvidenceAdmitted"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r;
}

/** Posts evidence that must be admitted; returns the decision after checking the response schema, receipt and record. */
async function admitOk(body: Req): Promise<ScsDeforestationEvidenceAdmissionDecision> {
  const r = await post(EVIDENCE, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsDeforestationEvidenceAdmissionResponse;
  const checked = runWithCorrelation("cap04-test-schema", () => validate("SCS-CAP-04", SCHEMAS.cap04EvidenceAdmissionResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-04");
  assert.equal(receipt["decision_type"], "DEFORESTATION_EVIDENCE_ADMISSION");
  assert.equal(receipt["subject_id"], res.decision.evidenceId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, res.decision);

  const d = res.decision;
  const row = await recordRow(d.evidenceId);
  assert.equal(row["admission_status"], d.decision);
  assert.deepEqual(row["admission_limitation_codes"], d.limitationCodes);
  assert.deepEqual(row["admission_limitations"], d.limitations);
  assert.equal(row["intersection_with_plot"], "NOT_VERIFIED");
  assert.equal(row["admission_spatial_complete"], false);
  assert.equal(row["admission_temporal_complete"], false);
  assert.equal(d.spatialCoverageCompleteAtAdmission, false);
  assert.equal(d.temporalCoverageCompleteAtAdmission, false);
  assert.equal(d.decision, "ADMITTED_WITH_LIMITATIONS", "every pilot admission has limitations");
  return d;
}

// ── Valid admissions ─────────────────────────────────────────────────────────

test("cited stored object → 201 ADMITTED_WITH_LIMITATIONS: integrity VERIFIED; spatial coverage not verified, temporal coverage not evaluated", async () => {
  const objectId = await storedObject();
  const body = evidenceRequest(strict, objectId);
  const d = await admitOk(body);
  assert.deepEqual(d.limitationCodes, BASE_CODES);
  assert.deepEqual(d.admissionChecks, {
    sourceIdentifiable: true,
    attributionEstablished: true,
    objectIntegrityVerified: true,
    evidenceRelatedToClaimedPlot: true,
    temporalDatesInternallyConsistent: true,
    attestationConsistentWithAnalysis: true,
    provenanceComplete: true,
    evidenceTypeCompatibleWithRequirement: true,
    submitterAuthorised: true,
  });
  assert.ok(d.limitations.some((l) => l.startsWith("Spatial coverage not verified")));
  assert.ok(d.limitations.some((l) => l.startsWith("Temporal coverage not evaluated")));
  assert.ok(d.limitations.some((l) => l.startsWith("Known gap declared by the source: 2021-01-05T00:00:00Z")));
  assert.equal(d.plotId, strict.plotId);
  assert.equal(d.frameworkAssociationId, strict.associationId);
  assert.deepEqual(d.decidedBy, actors.officer);

  const row = await recordRow(d.evidenceId);
  assert.equal(row["integrity_status"], "VERIFIED");
  assert.equal(row["evidence_object_sha256"], objectId);
  assert.equal(row["content_digest"], objectId);
  assert.equal(row["evidence_version"], 1);
  assert.equal(row["plot_version"], 1);
  assert.equal(row["claim_type"], "NO_DEFORESTATION_DETECTED");
  assert.deepEqual(row["claim_limitations"], body.evidenceClaim.limitations);
  assert.equal(row["analysis_analyst_party_id"], analyst);
  assert.deepEqual(row["coverage_geometry_coordinates"], [SCENE]);
  assert.equal((row["submitted_at"] as Date).toISOString(), d.decidedAt);
  const spec = (await harness.admin.query(`SELECT evidence_requirement_spec_id FROM scs.plot_framework_association WHERE association_id = $1`, [strict.associationId])).rows[0];
  assert.equal(row["evidence_requirement_spec_id"], spec!["evidence_requirement_spec_id"], "spec id from the association");
  const gaps = (await harness.admin.query(`SELECT gap_start, gap_end, reason FROM scs.deforestation_evidence_known_gap WHERE evidence_id = $1`, [d.evidenceId])).rows;
  assert.deepEqual(gaps.map((g) => [(g["gap_start"] as Date).toISOString(), g["reason"]]), [["2021-01-05T00:00:00.000Z", "CLOUD_COVER"]]);
});

test("no cited object → 201 ADMITTED_WITH_LIMITATIONS with INTEGRITY_UNVERIFIED (framework requires VERIFIABLE)", async () => {
  const d = await admitOk(evidenceRequest(open, null));
  assert.deepEqual(d.limitationCodes, [...BASE_CODES, "INTEGRITY_UNVERIFIED"]);
  assert.equal(d.admissionChecks.objectIntegrityVerified, false);
  const row = await recordRow(d.evidenceId);
  assert.equal(row["integrity_status"], "UNVERIFIED");
  assert.equal(row["evidence_object_sha256"], null);
});

test("excluded areas are validated and stored with the record", async () => {
  const hole = [[101.45, 13.45], [101.46, 13.45], [101.46, 13.46], [101.45, 13.46], [101.45, 13.45]];
  const d = await admitOk(
    evidenceRequest(strict, await storedObject(), (r) => {
      r.spatialCoverage.excludedAreas = [{ geometry: { geometryType: "POLYGON", coordinates: [hole], coordinateReferenceSystem: "EPSG:4326" }, reason: "Cloud shadow mask" }];
    }),
  );
  const rows = (await harness.admin.query(`SELECT geometry_type, geometry_coordinates, reason FROM scs.deforestation_evidence_excluded_area WHERE evidence_id = $1`, [d.evidenceId])).rows;
  assert.deepEqual(rows, [{ geometry_type: "POLYGON", geometry_coordinates: [hole], reason: "Cloud shadow mask" }]);
});

// ── Integrity ────────────────────────────────────────────────────────────────

test("integrityRequirement VERIFIED and no object cited → 422 OBJECT_INTEGRITY_FAILED, nothing written", async () => {
  const r = await assertRefused(evidenceRequest(strict, null), 422, "OBJECT_INTEGRITY_FAILED");
  assert.match((r.json["reasons"] as string[])[0]!, /requires VERIFIED integrity, but no stored object is cited/);
});

test("integrityRequirement VERIFIED and the declared digest does not match the stored object → 422 OBJECT_INTEGRITY_FAILED", async () => {
  const objectId = await storedObject();
  const declared = randomDigest();
  const r = await assertRefused(evidenceRequest(strict, objectId, (b) => (b.evidenceObject.contentDigest = declared)), 422, "OBJECT_INTEGRITY_FAILED");
  assert.deepEqual(r.json["reasons"], [`/evidenceObject/contentDigest: the declared SHA-256 ${declared} does not match the stored object's SHA-256 ${objectId}.`]);
});

test("cited object not in the store → 422 EVIDENCE_OBJECT_NOT_FOUND", async () => {
  const missing = randomDigest();
  const r = await assertRefused(evidenceRequest(strict, missing), 422, "EVIDENCE_OBJECT_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`/evidenceObject/objectId: the SCS evidence object store holds no object ${missing}.`]);
});

// ── Plot and association ─────────────────────────────────────────────────────

test("unknown plot → 404 PLOT_NOT_FOUND", async () => {
  await assertRefused(evidenceRequest({ plotId: randomUUID(), associationId: strict.associationId }, await storedObject()), 404, "PLOT_NOT_FOUND");
});

test("RETIRED plot → 422 PLOT_RETIRED", async () => {
  const target = await registerPlot(await registerFramework());
  await harness.admin.query(`UPDATE scs.plot SET registration_status = 'RETIRED' WHERE plot_id = $1`, [target.plotId]);
  await assertRefused(evidenceRequest(target, await storedObject()), 422, "PLOT_RETIRED");
});

test("association of another plot, or unknown → 404 FRAMEWORK_ASSOCIATION_NOT_FOUND", async () => {
  await assertRefused(evidenceRequest({ plotId: strict.plotId, associationId: open.associationId }, await storedObject()), 404, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  await assertRefused(evidenceRequest({ plotId: strict.plotId, associationId: randomUUID() }, await storedObject()), 404, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
});

test("association not ACTIVE → 422 FRAMEWORK_ASSOCIATION_NOT_ACTIVE", async () => {
  const target = await registerPlot(await registerFramework());
  await harness.admin.query(`UPDATE scs.plot_framework_association SET lifecycle_status = 'WITHDRAWN' WHERE association_id = $1`, [target.associationId]);
  const r = await assertRefused(evidenceRequest(target, await storedObject()), 422, "FRAMEWORK_ASSOCIATION_NOT_ACTIVE");
  assert.match((r.json["reasons"] as string[])[0]!, /is WITHDRAWN; only an ACTIVE association accepts evidence/);
});

test("association's framework not ACTIVE → 422 FRAMEWORK_ASSOCIATION_NOT_ACTIVE", async () => {
  const frameworkId = await registerFramework();
  const target = await registerPlot(frameworkId);
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'SUPERSEDED' WHERE framework_id = $1`, [frameworkId]);
  const r = await assertRefused(evidenceRequest(target, await storedObject()), 422, "FRAMEWORK_ASSOCIATION_NOT_ACTIVE");
  assert.deepEqual(r.json["reasons"], [`Framework ${frameworkId} of association ${target.associationId} is SUPERSEDED; it must be ACTIVE.`]);
});

// ── Parties ──────────────────────────────────────────────────────────────────

test("unknown attesting party → 422 ATTESTING_PARTY_NOT_FOUND", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.coverageAttestation = { attestationProvided: true, attestingPartyId: randomUUID() }));
  await assertRefused(body, 422, "ATTESTING_PARTY_NOT_FOUND");
});

test("RETIRED attesting party → 422 PARTY_RETIRED", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.coverageAttestation = { attestationProvided: true, attestingPartyId: retiredParty }));
  const r = await assertRefused(body, 422, "PARTY_RETIRED");
  assert.deepEqual(r.json["reasons"], [`Attesting party ${retiredParty} is RETIRED.`]);
});

test("unknown analyst organisation → 422 ANALYST_PARTY_NOT_FOUND", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.analyticalMethod!.analystOrganizationId = randomUUID()));
  await assertRefused(body, 422, "ANALYST_PARTY_NOT_FOUND");
});

// ── Geometry and relation to the plot ────────────────────────────────────────

test("invalid coverage geometry (open ring, wrong CRS, bad excluded area) → 422 COVERAGE_GEOMETRY_INVALID naming each problem", async () => {
  const open_ = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6]];
  const body = evidenceRequest(strict, await storedObject(), (r) => {
    r.spatialCoverage.coverageGeometry = { geometryType: "POLYGON", coordinates: [[...open_, [101.41, 13.41]]], coordinateReferenceSystem: "EPSG:3857" };
    r.spatialCoverage.excludedAreas = [{ geometry: { geometryType: "POINT", coordinates: [200, 13], coordinateReferenceSystem: "EPSG:4326" }, reason: "x" }];
  });
  const r = await assertRefused(body, 422, "COVERAGE_GEOMETRY_INVALID");
  assert.deepEqual(r.json["reasons"], [
    '/spatialCoverage/coverageGeometry/coordinateReferenceSystem: "EPSG:3857" is not supported; only EPSG:4326 (WGS 84) is accepted.',
    "/spatialCoverage/coverageGeometry/coordinates/0: the ring is not closed (its first and last positions differ).",
    "/spatialCoverage/excludedAreas/0/geometry/coordinates: longitude 200 is outside −180 to 180.",
  ]);
});

test("coverage bounding box does not touch the plot's → 422 EVIDENCE_NOT_RELATED_TO_PLOT", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.spatialCoverage.coverageGeometry.coordinates = [ELSEWHERE]));
  const r = await assertRefused(body, 422, "EVIDENCE_NOT_RELATED_TO_PLOT");
  assert.match((r.json["reasons"] as string[])[0]!, /does not intersect plot .* bounding box/);
});

test("coverage bounding box only touching the plot's edge is related (touching counts)", async () => {
  const touching = [[101.501, 13.5], [101.6, 13.5], [101.6, 13.6], [101.501, 13.6], [101.501, 13.5]];
  await admitOk(evidenceRequest(strict, await storedObject(), (r) => (r.spatialCoverage.coverageGeometry.coordinates = [touching])));
});

// ── Claim vocabulary and evidence type ───────────────────────────────────────

test("claimType NO_DEFORESTATION_OCCURRED → 400 REQUEST_VALIDATION_FAILED (the vocabulary is DETECTED, never OCCURRED)", async () => {
  const body = evidenceRequest(strict, await storedObject());
  (body.evidenceClaim as { claimType: string }).claimType = "NO_DEFORESTATION_OCCURRED";
  const before = await totals();
  const r = await post(EVIDENCE, body);
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.ok(JSON.stringify(r.json["reasons"]).includes("/evidenceClaim/claimType"));
  assert.deepEqual(await totals(), before);
});

test("evidenceType not among the specification's accepted source types → 422 EVIDENCE_TYPE_INCOMPATIBLE", async () => {
  const r = await assertRefused(evidenceRequest(strict, await storedObject(), (b) => (b.evidenceType = "FIELD_VERIFICATION")), 422, "EVIDENCE_TYPE_INCOMPATIBLE");
  assert.match((r.json["reasons"] as string[])[0]!, /FIELD_VERIFICATION is not among the accepted source types .* \(SATELLITE_IMAGE\)/);
});

// ── Dates ────────────────────────────────────────────────────────────────────

test("inconsistent dates → 400 TEMPORAL_DATES_INCONSISTENT naming each problem", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => {
    r.temporalCoverage.analysisPeriodStart = "2024-07-01T00:00:00Z"; // after its end
    r.temporalCoverage.knownGapPeriods = [{ start: "2019-01-01T00:00:00Z", end: "2019-02-01T00:00:00Z", reason: "NO_ACQUISITION" }]; // outside every window
    r.evidenceClaim.claimedPeriodEnd = "2999-01-01T00:00:00Z"; // future
  });
  const r = await assertRefused(body, 400, "TEMPORAL_DATES_INCONSISTENT");
  const reasons = r.json["reasons"] as string[];
  assert.equal(reasons.length, 3, JSON.stringify(reasons));
  assert.ok(reasons[0]!.startsWith("/temporalCoverage/analysisPeriodStart (2024-07-01T00:00:00Z) is after /temporalCoverage/analysisPeriodEnd"));
  assert.ok(reasons[1]!.startsWith("/evidenceClaim/claimedPeriodEnd (2999-01-01T00:00:00Z) is in the future"));
  assert.ok(reasons[2]!.startsWith("/temporalCoverage/knownGapPeriods/0 (2019-01-01T00:00:00Z to 2019-02-01T00:00:00Z) does not lie within"));
});

test("POINT_IN_TIME without an instant, or an instant with a start → 400 TEMPORAL_DATES_INCONSISTENT", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => {
    r.temporalCoverage.coverageMode = "POINT_IN_TIME";
    r.temporalCoverage.knownGapPeriods = [];
  });
  const r = await assertRefused(body, 400, "TEMPORAL_DATES_INCONSISTENT");
  assert.deepEqual(r.json["reasons"], ["/temporalCoverage/acquisitionInstant: required when coverageMode is POINT_IN_TIME."]);
  const both = evidenceRequest(strict, await storedObject(), (r) => {
    r.temporalCoverage.acquisitionInstant = "2024-06-30T00:00:00Z";
    r.temporalCoverage.knownGapPeriods = [];
  });
  const r2 = await assertRefused(both, 400, "TEMPORAL_DATES_INCONSISTENT");
  assert.deepEqual(r2.json["reasons"], ["/temporalCoverage/acquisitionInstant: an acquisition instant cannot be given together with acquisitionStart or acquisitionEnd."]);
});

// ── Attestation ──────────────────────────────────────────────────────────────

test("attestation claiming more than the analysis → 201 with ATTESTATION_EXCEEDS_ANALYSIS; both periods recorded", async () => {
  const d = await admitOk(
    evidenceRequest(strict, await storedObject(), (r) => {
      r.temporalCoverage.attestedPeriodStart = "2020-01-01T00:00:00Z"; // analysis begins 2020-12-31
      r.temporalCoverage.attestedPeriodEnd = "2024-06-30T00:00:00Z";
      r.coverageAttestation = { attestationProvided: true, attestingPartyId: attester, attestingRole: "Provincial forestry officer", attestedAt: "2024-07-15T00:00:00Z" };
    }),
  );
  assert.deepEqual(d.limitationCodes, [...BASE_CODES, "ATTESTATION_EXCEEDS_ANALYSIS"]);
  assert.equal(d.admissionChecks.attestationConsistentWithAnalysis, false);
  assert.ok(d.limitations.some((l) => l.includes("2020-01-01T00:00:00Z to 2024-06-30T00:00:00Z, extends beyond the analysis period") && l.includes("beginning before it")));
  const row = await recordRow(d.evidenceId);
  assert.equal((row["attested_period_start"] as Date).toISOString(), "2020-01-01T00:00:00.000Z");
  assert.equal((row["analysis_period_start"] as Date).toISOString(), "2020-12-31T00:00:00.000Z");
  assert.equal(row["attestation_attesting_party_id"], attester);
});

test("AUTHORITY_ATTESTATION with no analysis period is exempt from ATTESTATION_EXCEEDS_ANALYSIS", async () => {
  const d = await admitOk(
    evidenceRequest(open, await storedObject(), (r) => {
      r.evidenceType = "SATELLITE_IMAGE";
      delete r.temporalCoverage.analysisPeriodStart;
      delete r.temporalCoverage.analysisPeriodEnd;
      delete r.analyticalMethod;
      r.temporalCoverage.coverageMode = "AUTHORITY_ATTESTATION";
      r.coverageAttestation = { attestationProvided: true, attestingPartyId: attester, declaredCoverageStart: "2020-12-31T00:00:00Z", declaredCoverageEnd: "2024-06-30T00:00:00Z" };
    }),
  );
  assert.deepEqual(d.limitationCodes, BASE_CODES);
});

test("attestation details with attestationProvided false → 400 REQUEST_VALIDATION_FAILED", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.coverageAttestation = { attestationProvided: false, attestingRole: "Officer" }));
  const before = await totals();
  const r = await post(EVIDENCE, body);
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
  assert.deepEqual(r.json["reasons"], ["/coverageAttestation/attestingRole: not allowed when attestationProvided is false."]);
  assert.deepEqual(await totals(), before);
});

// ── Lineage ──────────────────────────────────────────────────────────────────

test("lineage citing a record that does not exist → 201 with PROVENANCE_INCOMPLETE; linked_evidence_id null", async () => {
  const ghost = randomUUID();
  const d = await admitOk(evidenceRequest(strict, await storedObject(), (r) => (r.evidenceObject.derivedFromEvidenceIds = [ghost])));
  assert.deepEqual(d.limitationCodes, [...BASE_CODES, "PROVENANCE_INCOMPLETE"]);
  assert.equal(d.admissionChecks.provenanceComplete, false);
  assert.ok(d.limitations.some((l) => l.includes(`/evidenceObject/derivedFromEvidenceIds cites ${ghost}`)));
  const rows = (await harness.admin.query(`SELECT lineage_type, cited_evidence_id, linked_evidence_id FROM scs.deforestation_evidence_lineage WHERE evidence_id = $1`, [d.evidenceId])).rows;
  assert.deepEqual(rows, [{ lineage_type: "DERIVED_FROM", cited_evidence_id: ghost, linked_evidence_id: null }]);
});

test("lineage citing an admitted record for the same plot → admitted without PROVENANCE_INCOMPLETE; linked_evidence_id populated", async () => {
  const baseline = await admitOk(evidenceRequest(strict, await storedObject()));
  const other = await admitOk(evidenceRequest(open, await storedObject()));
  const d = await admitOk(evidenceRequest(strict, await storedObject(), (r) => (r.analyticalMethod!.baselineEvidenceIds = [baseline.evidenceId])));
  assert.deepEqual(d.limitationCodes, BASE_CODES);
  assert.equal(d.admissionChecks.provenanceComplete, true);
  const rows = (await harness.admin.query(`SELECT lineage_type, cited_evidence_id, linked_evidence_id FROM scs.deforestation_evidence_lineage WHERE evidence_id = $1`, [d.evidenceId])).rows;
  assert.deepEqual(rows, [{ lineage_type: "BASELINE", cited_evidence_id: baseline.evidenceId, linked_evidence_id: baseline.evidenceId }]);

  // a record of another plot does not resolve
  const cross = await admitOk(evidenceRequest(strict, await storedObject(), (r) => (r.analyticalMethod!.comparisonEvidenceIds = [other.evidenceId])));
  assert.deepEqual(cross.limitationCodes, [...BASE_CODES, "PROVENANCE_INCOMPLETE"]);
});

// ── Specification requirements recorded as limitations ───────────────────────

test("coarse resolution, broken chain of custody, unknown source-type vocabulary, stale observation and missing authority confirmation → limitations, not failures", async () => {
  const target = await registerPlot(
    await registerFramework({
      integrityRequirement: "VERIFIABLE",
      acceptedSourceTypes: ["SATELLITE_IMAGE", "Sentinel-2 L2A"],
      minimumResolutionMetres: 10,
      minimumRecencyDays: 30,
      authorityConfirmationRequired: true,
    }),
  );
  const d = await admitOk(
    evidenceRequest(target, await storedObject(), (r) => {
      r.spatialCoverage.spatialResolutionMetres = 30;
      r.evidenceObject.chainOfCustodyComplete = false;
    }),
  );
  assert.deepEqual(d.limitationCodes, [
    ...BASE_CODES,
    "CHAIN_OF_CUSTODY_INCOMPLETE",
    "RESOLUTION_BELOW_REQUIREMENT",
    "RECENCY_BELOW_REQUIREMENT",
    "AUTHORITY_CONFIRMATION_MISSING",
    "SOURCE_TYPE_VOCABULARY_UNKNOWN",
  ]);
  assert.equal(d.admissionChecks.provenanceComplete, false);
  assert.ok(d.limitations.some((l) => l.includes("ignored for the compatibility check: Sentinel-2 L2A")));

  const undated = await admitOk(
    evidenceRequest(target, await storedObject(), (r) => {
      delete r.temporalCoverage.acquisitionStart;
      delete r.temporalCoverage.acquisitionEnd;
    }),
  );
  assert.ok(undated.limitationCodes.includes("RECENCY_NOT_EVALUATED"));
});

// ── Authority ────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN) → 403 SUBMITTER_NOT_AUTHORISED, nothing written", async () => {
  for (const who of ["viewer", "admin"] as const) {
    const r = await assertRefused(evidenceRequest(strict, await storedObject()), 403, "SUBMITTER_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Submitting deforestation evidence requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const before = await totals();
  const r = await post(EVIDENCE, evidenceRequest(strict, await storedObject()), { key: null });
  assert.equal(r.status, 400);
  assert.deepEqual(await totals(), before);
});

test("same key, same content → byte-identical 201 replay; same key, different content → 409", async () => {
  const body = evidenceRequest(strict, await storedObject());
  const key = `cap04-${randomUUID()}`;
  const first = await post(EVIDENCE, body, { key });
  const before = await totals();
  const second = await post(EVIDENCE, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before, "no second write");
  const conflict = await post(EVIDENCE, evidenceRequest(strict, await storedObject()), { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500; evidence record, gaps and lineage all absent", async () => {
  const body = evidenceRequest(strict, await storedObject(), (r) => (r.evidenceObject.derivedFromEvidenceIds = [randomUUID()]));
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(EVIDENCE, body);
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noEvidenceAdmitted"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
    assert.equal(await count("SELECT count(*) AS n FROM scs.deforestation_evidence_record WHERE source_id = $1", [body.source.sourceId]), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(EVIDENCE, body)).status, 201, "and admission works again once the failure is gone");
});

// ── The pilot's honest outcome (runs last) ───────────────────────────────────

test("every admitted record is ADMITTED_WITH_LIMITATIONS with spatial coverage not verified and temporal coverage not evaluated", async () => {
  const { rows } = await harness.admin.query<{ admission_status: string; intersection_with_plot: string; spatial: boolean; temporal: boolean }>(
    `SELECT DISTINCT admission_status, intersection_with_plot,
            'SPATIAL_COVERAGE_NOT_VERIFIED' = ANY(admission_limitation_codes) AS spatial,
            'TEMPORAL_COVERAGE_NOT_EVALUATED' = ANY(admission_limitation_codes) AS temporal
       FROM scs.deforestation_evidence_record`,
  );
  assert.deepEqual(rows, [{ admission_status: "ADMITTED_WITH_LIMITATIONS", intersection_with_plot: "NOT_VERIFIED", spatial: true, temporal: true }]);
  const receipts = await harness.admin.query(`SELECT DISTINCT decision FROM scs.decision_receipt WHERE decision_type = 'DEFORESTATION_EVIDENCE_ADMISSION'`);
  assert.deepEqual(receipts.rows, [{ decision: "ADMITTED_WITH_LIMITATIONS" }]);
});
