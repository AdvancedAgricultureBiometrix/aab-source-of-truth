// SCS-CAP-06 POST /scs/v1/sufficiency-evaluations and GET
// /scs/v1/sufficiency-evaluations/:evaluationId, end to end: real HTTP through
// the server layer, real PostgreSQL (database built from every migration),
// the API connected as a restricted member of scs_api. Everything evaluated is
// admitted through its own endpoint first — parties and verifications
// (CAP-02), frameworks (CAP-01), plots and associations (CAP-03), deforestation
// evidence (CAP-04) and custody events (CAP-05) — so these tests run the
// vertical proof chain. Stored documents are AAB-PLATFORM-01 rows inserted
// directly (no object store is needed). A SUPERSEDED framework and a RETIRED
// party are set by SQL as the owner: no endpoint reaches those states yet.

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
import type { ScsSufficiencyEvaluationResponse, ScsSufficiencyEvaluationResult, ScsSufficiencyEvaluationSubmission } from "../types/cap-06.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap06-officer-token-0123456789abcdefgh",
  verifier: "cap06-verifier-token-0123456789abcdefg",
  viewer: "cap06-viewer-token-0123456789abcdefghij",
  reviewer: "cap06-reviewer-token-0123456789abcdefg",
};
const actors = {
  officer: { actorId: "officer-cap06", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap06", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap06", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
  reviewer: { actorId: "reviewer-cap06", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const EVALUATIONS = "/scs/v1/sufficiency-evaluations";
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];
const ALL_ANALYSIS = ["TEMPORAL_COVERAGE", "SPATIAL_COVERAGE", "REQUIREMENT_BY_REQUIREMENT", "CONFLICT_DETECTION", "GAP_IDENTIFICATION", "PROVENANCE_AND_AUTHORITY", "CUSTODY_CHAIN"] as const;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let coop = "";

interface Framework { frameworkId: string; regulationVersion: string; specId: string }
/** The fixture's framework: custody chain required (FULL_CHAIN, a PURCHASE_RECEIPT), VERIFIED integrity, 10 m resolution. */
let full: Framework;
/** Deforestation only: no custody requirement. */
let defOnly: Framework;

async function call(method: "GET" | "POST", path: string, body?: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}` };
  if (method === "POST") {
    headers["content-type"] = "application/json";
    const key = opts.key === undefined ? `cap06-${randomUUID()}` : opts.key;
    if (key !== null) headers["idempotency-key"] = key;
  }
  const res = await fetch(base + path, { method, headers, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}
const post = (path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) => call("POST", path, body, opts);

async function created(path: string, body: unknown, idField: string, who: keyof typeof TOKENS = "officer"): Promise<string> {
  const r = await post(path, body, { who });
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}

/** A party verified VERIFIED_FOR_DECLARED_SCOPE by the verification officer. */
async function verifiedParty(type: Parameters<typeof partyRequest>[0]): Promise<string> {
  const evidence = randomUUID();
  const partyId = await created("/scs/v1/parties", { ...partyRequest(type), identityEvidence: { evidenceIds: [evidence], evidenceLimitations: [] } }, "partyId");
  await created(
    `/scs/v1/parties/${partyId}/verifications`,
    {
      verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE",
      verificationScope: { scopeDescription: "Legal name", jurisdictionCode: "TH", verifiedAttributes: ["legal name"], excludedFromVerification: [] },
      verifyingAuthority: { authorityId: "TH-DOPA", authorityName: "Department of Provincial Administration", authorityBasis: "Registry check", jurisdictionCode: "TH" },
      verifiedAt: "2026-03-01T00:00:00Z",
      evidenceIds: [evidence],
      limitations: [],
    },
    "assessmentId",
    "verifier",
  );
  return partyId;
}

type DefReq = ScsFrameworkRegistrationRequest["evidenceRequirements"];
async function registerFramework(edit: (e: DefReq) => void = () => {}): Promise<Framework> {
  const body = frameworkRequest();
  edit(body.evidenceRequirements);
  const frameworkId = await created("/scs/v1/frameworks", body, "frameworkId");
  const row = (await harness.admin.query<{ regulation_version: string; evidence_spec_id: string }>(
    `SELECT regulation_version, evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  )).rows[0]!;
  return { frameworkId, regulationVersion: row.regulation_version, specId: row.evidence_spec_id };
}

async function registerPlot(f: Framework): Promise<{ plotId: string; associationId: string }> {
  const r = await post("/scs/v1/plots", {
    plot: {
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId: f.frameworkId, commodityCode: "4001", associationReason: "EUDR due diligence" }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const d = r.json["decision"] as { plotId: string; frameworkAssociationResults: Array<{ associationId: string }> };
  return { plotId: d.plotId, associationId: d.frameworkAssociationResults[0]!.associationId };
}

async function storedObject(): Promise<string> {
  const digest = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'image/tiff', 'test', $1, $2)`,
    [digest, JSON.stringify(actors.officer)],
  );
  return digest;
}

/**
 * Admits a Sentinel-2 change analysis for `plot`: 2020-12-31 to 2024-07-01,
 * DEFORESTATION, "no deforestation detected", 10 m, a stored and matching
 * object. `edit` changes the request.
 */
async function admitEvidence(plot: { plotId: string; associationId: string }, edit: (r: Record<string, unknown>) => void = () => {}): Promise<string> {
  const objectId = await storedObject();
  const body: Record<string, unknown> = {
    plotId: plot.plotId,
    frameworkAssociationId: plot.associationId,
    evidenceType: "SATELLITE_IMAGE",
    source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA", sourceReference: "https://dataspace.copernicus.eu/" },
    evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A", contentDigest: objectId, chainOfCustodyComplete: true },
    spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
    temporalCoverage: { analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-07-01T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
    analyticalMethod: { methodName: "Forest loss change detection", detectionTarget: "DEFORESTATION", qualityStatus: "ACCEPTABLE" },
    evidenceClaim: { claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No tree cover loss detected.", confidence: "HIGH", limitations: [] },
    coverageAttestation: { attestationProvided: false },
  };
  edit(body);
  return created("/scs/v1/deforestation-evidence", body, "evidenceId");
}

/** Admits a farm-gate PURCHASE of `batch` from the farmer's plot to the cooperative, with a stored receipt. */
async function admitPurchase(f: Framework, plotId: string, batch: string): Promise<string> {
  const objectId = await storedObject();
  return created(
    "/scs/v1/custody-events",
    {
      frameworkAssociationId: f.frameworkId,
      eventType: "PURCHASE",
      sourceParty: { partyId: farmer, partyRoleAtEvent: "SUPPLIER" },
      destinationParty: { partyId: coop, partyRoleAtEvent: "AGGREGATOR" },
      commodity: { commodityCode: "4001", commodityName: "Natural rubber", sourcePlotIds: [plotId], sourcePlotIdsComplete: true, batchIdentifier: batch },
      quantity: { amount: 120, unit: "KG", measurementMethod: "Calibrated platform scale" },
      eventLocation: { countryCode: "TH" },
      eventTime: { eventDate: "2026-06-30", timePrecision: "DATE_ONLY" },
      predecessorEventIds: [],
      successorEventIds: [],
      supportingDocument: { objectId, documentId: "R-1", documentType: "PURCHASE_RECEIPT", documentReference: "Receipt book p.12", contentDigest: objectId },
      chainOfCustodyComplete: true,
      uncertainties: [],
      contradictions: [],
      knownGaps: [],
    },
    "eventId",
  );
}

function evaluationRequest(f: Framework, plotIds: string[], edit: (r: ScsSufficiencyEvaluationSubmission) => void = () => {}): ScsSufficiencyEvaluationSubmission {
  const r: ScsSufficiencyEvaluationSubmission = {
    subject: { plotIds, commodityCode: "4001" },
    framework: { frameworkId: f.frameworkId, frameworkVersion: f.regulationVersion, evidenceRequirementSpecId: f.specId },
    evaluationPeriod: { evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    evidenceScope: { includeQuarantinedEvidence: false },
    requestedAnalysis: [...ALL_ANALYSIS],
  };
  edit(r);
  return r;
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
  farmer = await verifiedParty("NATURAL_PERSON");
  coop = await verifiedParty("COOPERATIVE");
  full = await registerFramework();
  defOnly = await registerFramework((e) => {
    e.sufficiencyThreshold.custodyChainComplete = false;
    e.custodyEvidence.requiredDocumentTypes = [];
  });
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  evaluations: await count("SELECT count(*) AS n FROM scs.sufficiency_evaluation"),
  plots: await count("SELECT count(*) AS n FROM scs.sufficiency_evaluation_plot"),
  evidence: await count("SELECT count(*) AS n FROM scs.sufficiency_evaluation_evidence"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});

async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = await totals();
  const key = `cap06-${randomUUID()}`;
  const r = await post(EVALUATIONS, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-06");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noEvaluationProduced"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r;
}

/** Posts an evaluation that must be recorded; checks the response schema, receipt and stored rows; returns the result. */
async function evaluateOk(body: ScsSufficiencyEvaluationSubmission): Promise<ScsSufficiencyEvaluationResult> {
  const r = await post(EVALUATIONS, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsSufficiencyEvaluationResponse;
  const checked = runWithCorrelation("cap06-test-schema", () => validate("SCS-CAP-06", SCHEMAS.cap06SufficiencyEvaluationResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);
  const d = res.decision;
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-06");
  assert.equal(receipt["decision_type"], "SUFFICIENCY_EVALUATION");
  assert.equal(receipt["decision"], d.overallState);
  assert.equal(receipt["subject_id"], d.evaluationId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, d);
  const row = (await harness.admin.query(`SELECT * FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [d.evaluationId])).rows[0] as Record<string, unknown>;
  assert.deepEqual(row["result"], d, "the stored document is the returned result");
  assert.equal(await count("SELECT count(*) AS n FROM scs.sufficiency_evaluation_plot WHERE evaluation_id = $1", [d.evaluationId]), d.plotIds.length);
  assert.equal(await count("SELECT count(*) AS n FROM scs.sufficiency_evaluation_evidence WHERE evaluation_id = $1", [d.evaluationId]), d.evaluatedEvidence.manifest.length);
  assert.equal(d.hasFailClosedConditions, false);
  assert.ok(d.evaluationExplanation.some((x) => x.startsWith("Pilot limit: spatial coverage and plot overlap are not evaluated")));
  assert.deepEqual(d.authorityBoundary, {
    advisoryOnly: true,
    noComplianceDetermination: true,
    noDueDiligenceStatementAuthority: true,
    noRegulatoryPromotionAuthority: true,
    sufficientMeansEvidenceSufficient: true,
    sufficientDoesNotMeanLegallyCompliant: true,
  });
  return d;
}

const stateOf = (d: ScsSufficiencyEvaluationResult, code: string) => d.requirementEvaluations.find((r) => r.requirementCode === code)!.state;
const gapTypes = (d: ScsSufficiencyEvaluationResult) => [...new Set(d.allGaps.map((g) => g.gapType))].sort();

/** A plot under `f` with full-period evidence, and (under `full`) a continuous custody chain to the cooperative. */
async function coveredSubject(f: Framework) {
  const plot = await registerPlot(f);
  const evidenceId = await admitEvidence(plot);
  const batch = `LOT-${randomUUID()}`;
  const eventId = f === full ? await admitPurchase(f, plot.plotId, batch) : null;
  return { plot, evidenceId, batch, eventId };
}

// ── The vertical proof chain and the expected pilot outcome ──────────────────

test("end to end over real admitted CAP-04 and CAP-05 records → 201 GAPS_REQUIRE_HUMAN_DECISION, the expected pilot outcome", async () => {
  const s = await coveredSubject(full);
  const d = await evaluateOk(evaluationRequest(full, [s.plot.plotId], (r) => ((r.subject.batchIdentifiers = [s.batch]), (r.subject.operatorPartyId = coop))));

  assert.equal(d.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
  assert.equal(d.hasEvidenceGaps, true);
  assert.equal(d.hasMaterialUnresolvedConflicts, false);
  // the only gaps left are the pilot's own limits, both for human decision
  assert.deepEqual(gapTypes(d), ["OVERLAP_NOT_EVALUATED", "SPATIAL_COVERAGE_NOT_EVALUATED"]);
  assert.ok(d.allGaps.every((g) => g.humanDecisionRequired && !g.automaticFailure));
  assert.equal(stateOf(d, "DEF-TEMPORAL-COVERAGE"), "SATISFIED");
  assert.equal(stateOf(d, "DEF-SPATIAL-COVERAGE"), "GAP_REQUIRES_HUMAN_DECISION");
  assert.equal(stateOf(d, "PLOT-REGISTERED"), "GAP_REQUIRES_HUMAN_DECISION");
  assert.equal(stateOf(d, "CUSTODY-CHAIN-CONTINUITY"), "SATISFIED");
  assert.equal(stateOf(d, "CUSTODY-DOCUMENT-TYPES"), "SATISFIED");
  assert.equal(stateOf(d, "CUSTODY-TRACEABILITY-DEPTH"), "SATISFIED");
  assert.equal(stateOf(d, "PLOT-LAND-REGISTRY"), "NOT_APPLICABLE");

  // the frozen input: both kinds of evidence, with versions and digests
  assert.deepEqual(d.evaluatedEvidence.deforestationEvidenceIds, [s.evidenceId]);
  assert.deepEqual(d.evaluatedEvidence.custodyEventIds, [s.eventId]);
  assert.deepEqual(d.evaluatedEvidence.manifest.map((m) => [m.kind, m.evidenceId, m.version]), [["DEFORESTATION", s.evidenceId, 1], ["CUSTODY", s.eventId, 1]]);
  const digest = (await harness.admin.query(`SELECT content_digest FROM scs.deforestation_evidence_record WHERE evidence_id = $1`, [s.evidenceId])).rows[0]!["content_digest"];
  assert.equal(d.evaluatedEvidence.manifest[0]!.contentDigest, digest);
  const rows = (await harness.admin.query(`SELECT evidence_kind, deforestation_evidence_id, custody_event_id FROM scs.sufficiency_evaluation_evidence WHERE evaluation_id = $1 ORDER BY evidence_kind DESC`, [d.evaluationId])).rows;
  assert.deepEqual(rows, [
    { evidence_kind: "DEFORESTATION", deforestation_evidence_id: s.evidenceId, custody_event_id: null },
    { evidence_kind: "CUSTODY", deforestation_evidence_id: null, custody_event_id: s.eventId },
  ]);

  // the dimensions
  assert.deepEqual(d.temporalCoverage[0]!.uncoveredIntervals, []);
  assert.deepEqual(d.temporalCoverage[0]!.requiredPeriod, { start: "2020-12-31T00:00:00.000Z", end: "2024-07-01T00:00:00.000Z", assessmentType: "DEFORESTATION" });
  assert.equal(d.spatialCoverage[0]!.coverageAssessment, "NOT_EVALUATED");
  assert.equal(d.custodyChain![0]!.chainAssessment, "CONTINUOUS");
  assert.deepEqual(d.custodyChain![0]!.documentTypesMissing, []);
  assert.equal(d.evaluationPeriod.referenceDate, "2020-12-31", "the specification's cut-off, set by the system");
  assert.equal(d.evaluatorVersion, "scs-cap06-pilot-1");
  assert.equal(d.evidenceCutoffAt, d.evaluatedAt);
  assert.ok(d.nextSteps.every((n) => n.priority !== "BLOCKING"), "nothing blocking: only human decisions remain");
  assert.ok(d.evaluationExplanation.includes("Evaluation cannot reach SUFFICIENT because:"));
});

test("INSUFFICIENT from an adverse finding: uncontradicted deforestation detected after the cut-off; never SUFFICIENT", async () => {
  const plot = await registerPlot(defOnly);
  await admitEvidence(plot);
  const adverseId = await admitEvidence(plot, (b) => {
    delete b["analyticalMethod"];
    b["evidenceClaim"] = { claimType: "DEFORESTATION_DETECTED", claimSummary: "Clearing of 0.3 ha in the north-east corner.", claimedPeriodStart: "2023-02-01T00:00:00Z", claimedPeriodEnd: "2023-03-01T00:00:00Z", confidence: "MEDIUM", limitations: [] };
  });
  const d = await evaluateOk(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(d.overallState, "INSUFFICIENT");
  assert.equal(stateOf(d, "DEF-TEMPORAL-COVERAGE"), "UNSATISFIED");
  assert.equal(d.hasMaterialUnresolvedConflicts, false, "not contradicted, so not a conflict");
  assert.deepEqual(d.temporalCoverage[0]!.uncoveredIntervals, [], "coverage is complete: the result is INSUFFICIENT because of the finding");
  assert.ok(d.evaluationExplanation.some((x) => x.includes(`Adverse finding: evidence ${adverseId} reports DEFORESTATION_DETECTED`)));
  assert.ok(d.nextSteps.some((n) => n.priority === "BLOCKING" && n.stepType === "HUMAN_DECISION_REQUIRED" && n.requirementCode === "DEF-TEMPORAL-COVERAGE"));
});

test("CONFLICTING_EVIDENCE from opposing deforestation claims; the gaps are still reported alongside", async () => {
  const plot = await registerPlot(defOnly);
  const a = await admitEvidence(plot);
  const b = await admitEvidence(plot, (x) => {
    x["temporalCoverage"] = { analysisPeriodStart: "2022-01-01T00:00:00Z", analysisPeriodEnd: "2024-01-01T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] };
    x["evidenceClaim"] = { claimType: "DEFORESTATION_DETECTED", claimSummary: "Loss detected in 2023.", confidence: "MEDIUM", limitations: [] };
  });
  const d = await evaluateOk(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(d.overallState, "CONFLICTING_EVIDENCE");
  assert.equal(d.hasMaterialUnresolvedConflicts, true);
  assert.equal(d.hasEvidenceGaps, true, "conflicts do not make gaps disappear");
  assert.equal(d.allConflicts.length, 1);
  const c = d.allConflicts[0]!;
  assert.equal(c.conflictKey, `DEF-TEMPORAL-COVERAGE:${[a, b].sort().join(":")}`);
  assert.equal(c.materiality, "MATERIAL_UNRESOLVED");
  assert.equal(c.resolutionStatus, "UNRESOLVED");
  assert.equal(c.conflictType, "OPPOSING_FINDINGS");
  assert.deepEqual(c.temporalOverlap, { start: "2022-01-01T00:00:00.000Z", end: "2024-01-01T00:00:00.000Z" });
  assert.match(c.spatialOverlapReference!, /^possible: the coverage bounding boxes intersect/);
  assert.deepEqual(d.temporalCoverage[0]!.conflictingIntervals.map((i) => i.conflictId), [c.conflictId]);
  assert.ok(d.nextSteps.some((n) => n.stepType === "RESOLVE_CONFLICT" && n.priority === "BLOCKING"));
});

test("missing coverage is INSUFFICIENT: an uncovered interval is a missing-evidence gap human review cannot remove", async () => {
  const plot = await registerPlot(defOnly);
  await admitEvidence(plot, (x) => {
    x["temporalCoverage"] = { analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2023-02-15T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] };
  });
  const d = await evaluateOk(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(d.overallState, "INSUFFICIENT");
  assert.deepEqual(d.temporalCoverage[0]!.uncoveredIntervals.map((i) => [i.start, i.end]), [["2023-02-15T00:00:00.000Z", "2024-07-01T00:00:00.000Z"]]);
  const g = d.allGaps.find((x) => x.gapType === "TEMPORAL_INTERVAL_MISSING")!;
  assert.equal(g.automaticFailure, true);
  assert.equal(d.temporalCoverage[0]!.uncoveredIntervals[0]!.gapId, g.gapId);
  assert.ok(d.evaluationExplanation.some((x) => x.includes("Human review cannot remove this missing-evidence fact.")));
});

// ── getEvaluationResult ──────────────────────────────────────────────────────

test("getEvaluationResult returns the recorded result exactly; an unknown id → 404 EVALUATION_NOT_FOUND", async () => {
  const s = await coveredSubject(defOnly);
  const d = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId]));
  const got = await call("GET", `${EVALUATIONS}/${d.evaluationId}`);
  assert.equal(got.status, 200, got.text);
  assert.deepEqual(got.json, d);
  const upper = await call("GET", `${EVALUATIONS}/${d.evaluationId.toUpperCase()}`);
  assert.deepEqual(upper.json, d, "the id is case-insensitive");
  const missing = randomUUID();
  const r = await call("GET", `${EVALUATIONS}/${missing}`);
  assert.equal(r.status, 404);
  assert.equal(r.json["error"], "EVALUATION_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`No sufficiency evaluation is recorded with evaluationId ${missing}.`]);
});

test("a REGULATORY_REVIEWER may read an evaluation (to review it under SCS-CAP-09), but not request one", async () => {
  const s = await coveredSubject(defOnly);
  const d = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId]));
  const got = await call("GET", `${EVALUATIONS}/${d.evaluationId}`, undefined, { who: "reviewer" });
  assert.equal(got.status, 200, got.text);
  assert.deepEqual(got.json, d);
  await assertRefused(evaluationRequest(defOnly, [s.plot.plotId]), 403, "REQUESTOR_NOT_AUTHORISED", { who: "reviewer" });
});

// ── Failures ─────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER → 403 REQUESTOR_NOT_AUTHORISED, for evaluating; nor REGULATORY_REVIEWER, for reading", async () => {
  const s = await coveredSubject(defOnly);
  for (const who of ["viewer", "verifier"] as const) {
    await assertRefused(evaluationRequest(defOnly, [s.plot.plotId]), 403, "REQUESTOR_NOT_AUTHORISED", { who });
  }
  const d = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId]));
  const r = await call("GET", `${EVALUATIONS}/${d.evaluationId}`, undefined, { who: "viewer" });
  assert.equal(r.status, 403);
  assert.equal(r.json["error"], "REQUESTOR_NOT_AUTHORISED");
});

test("EVALUATION_PERIOD_INVALID: an end not after the cut-off, or in the future", async () => {
  const s = await coveredSubject(defOnly);
  const r = await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evaluationPeriod.evaluationEndDate = "2020-12-31")), 400, "EVALUATION_PERIOD_INVALID");
  assert.deepEqual(r.json["reasons"], ["/evaluationPeriod/evaluationEndDate (2020-12-31) must be after the reference date 2020-12-31 (the specification's referenceCutoffDate)."]);
  const f = await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evaluationPeriod.evaluationEndDate = "2999-01-01")), 400, "EVALUATION_PERIOD_INVALID");
  assert.match((f.json["reasons"] as string[])[0]!, /^\/evaluationPeriod\/evaluationEndDate \(2999-01-01\) is in the future/);
});

test("evidence scope: the system decides it; a list that does not match → EVIDENCE_SCOPE_INCOMPLETE; an unknown id → EVIDENCE_RECORD_NOT_RESOLVED", async () => {
  const s = await coveredSubject(defOnly);
  const second = await admitEvidence(s.plot);
  const elsewhere = (await coveredSubject(defOnly)).evidenceId;
  const missing = await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evidenceScope.admittedEvidenceIds = [s.evidenceId])), 422, "EVIDENCE_SCOPE_INCOMPLETE");
  assert.ok((missing.json["reasons"] as string[]).includes(`Missing from the list: ${second}, which is in scope.`), "adverse or inconvenient evidence cannot be left out");
  const extra = await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evidenceScope.admittedEvidenceIds = [s.evidenceId, second, elsewhere])), 422, "EVIDENCE_SCOPE_INCOMPLETE");
  assert.ok((extra.json["reasons"] as string[]).includes(`Not in scope: ${elsewhere}.`));
  const ghost = randomUUID();
  await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evidenceScope.admittedEvidenceIds = [ghost])), 422, "EVIDENCE_RECORD_NOT_RESOLVED");
  const ok = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.evidenceScope.admittedEvidenceIds = [second, s.evidenceId])));
  assert.deepEqual([...ok.evaluatedEvidence.deforestationEvidenceIds].sort(), [s.evidenceId, second].sort());
  // there is no option to exclude evidence with limitations
  const r = await post(EVALUATIONS, { ...evaluationRequest(defOnly, [s.plot.plotId]), evidenceScope: { includeQuarantinedEvidence: false, includeEvidenceWithLimitations: false } });
  assert.equal(r.status, 400);
  assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED");
});

test("framework, specification, plots and the custody subject are validated before anything is evaluated", async () => {
  const s = await coveredSubject(full);
  const req = (edit: (r: ScsSufficiencyEvaluationSubmission) => void) => evaluationRequest(full, [s.plot.plotId], edit);
  await assertRefused(req((r) => (r.framework.frameworkVersion = "other")), 422, "FRAMEWORK_VERSION_NOT_RESOLVED");
  await assertRefused(req((r) => (r.subject.commodityCode = "1801")), 422, "FRAMEWORK_VERSION_NOT_RESOLVED");
  await assertRefused(req((r) => (r.framework.evidenceRequirementSpecId = defOnly.specId)), 422, "EVIDENCE_REQUIREMENT_SPEC_NOT_FOUND");
  const superseded = await registerFramework();
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'SUPERSEDED' WHERE framework_id = $1`, [superseded.frameworkId]);
  await assertRefused(evaluationRequest(superseded, [s.plot.plotId]), 422, "FRAMEWORK_VERSION_NOT_RESOLVED");
  await assertRefused(req((r) => (r.subject.plotIds = [randomUUID()])), 404, "PLOT_NOT_FOUND");
  await assertRefused(req((r) => (r.subject.plotVersions = { [s.plot.plotId]: 2 })), 404, "PLOT_NOT_FOUND");
  await assertRefused(evaluationRequest(defOnly, [s.plot.plotId]), 404, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  await assertRefused(req((r) => ((r.subject.batchIdentifiers = ["NO-SUCH-LOT"]), (r.subject.operatorPartyId = coop))), 404, "BATCH_NOT_FOUND");
  await assertRefused(req((r) => ((r.subject.batchIdentifiers = [s.batch]), (r.subject.operatorPartyId = randomUUID()))), 422, "OPERATOR_PARTY_NOT_FOUND");
  const r = await post(EVALUATIONS, req((x) => (x.subject.batchIdentifiers = [s.batch])));
  assert.equal(r.status, 400);
  assert.deepEqual(r.json["reasons"], ["/subject: batchIdentifiers and operatorPartyId are given together or not at all."]);
});

test("a custody requirement with no batch named is missing evidence → INSUFFICIENT", async () => {
  const s = await coveredSubject(full);
  const d = await evaluateOk(evaluationRequest(full, [s.plot.plotId]));
  assert.equal(d.overallState, "INSUFFICIENT");
  assert.equal(stateOf(d, "CUSTODY-CHAIN-CONTINUITY"), "UNSATISFIED");
  assert.ok(d.allGaps.some((g) => g.gapType === "EVIDENCE_ABSENT" && g.requirementCode === "CUSTODY-CHAIN-CONTINUITY"));
  assert.ok(d.nextSteps.some((n) => n.stepType === "OBTAIN_CUSTODY_EVIDENCE"));
});

// ── Idempotency, rollback, re-evaluation, determinism, the frozen input ──────

test("same key, same content → byte-identical 201 replay; nothing new is recorded", async () => {
  const s = await coveredSubject(defOnly);
  const body = evaluationRequest(defOnly, [s.plot.plotId]);
  const key = `cap06-${randomUUID()}`;
  const first = await post(EVALUATIONS, body, { key });
  const before = await totals();
  const second = await post(EVALUATIONS, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before);
});

test("receipt write fails → 500; the evaluation, its plots and its evidence rows are all absent", async () => {
  const s = await coveredSubject(defOnly);
  const body = evaluationRequest(defOnly, [s.plot.plotId]);
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(EVALUATIONS, body);
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noEvaluationProduced"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(EVALUATIONS, body)).status, 201, "and evaluation works again once the failure is gone");
});

test("re-evaluation citing previousEvaluationId creates a new record and leaves the original unchanged; another subject is refused", async () => {
  const s = await coveredSubject(defOnly);
  const first = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId]));
  const storedBefore = (await harness.admin.query(`SELECT result, created_at FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [first.evaluationId])).rows[0];
  await admitEvidence(s.plot); // new evidence since the first evaluation
  const again = await evaluateOk(evaluationRequest(defOnly, [s.plot.plotId], (r) => (r.previousEvaluationId = first.evaluationId)));
  assert.notEqual(again.evaluationId, first.evaluationId);
  assert.equal(again.previousEvaluationId, first.evaluationId);
  assert.equal(again.evaluatedEvidence.deforestationEvidenceIds.length, 2, "the re-evaluation sees the new evidence");
  assert.ok(again.evaluationExplanation.some((x) => x.startsWith(`An evaluation of this subject for the same period and assessment type already exists (${first.evaluationId}`)), "repetition is disclosed, not blocked");
  assert.ok(again.evaluationExplanation.includes(`This is a re-evaluation of ${first.evaluationId}, which is unchanged.`));
  const storedAfter = (await harness.admin.query(`SELECT result, created_at FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [first.evaluationId])).rows[0];
  assert.deepEqual(storedAfter, storedBefore, "the original evaluation is unchanged");
  assert.equal(first.evaluatedEvidence.deforestationEvidenceIds.length, 1, "its frozen input still lists only what it evaluated");

  const other = await coveredSubject(defOnly);
  await assertRefused(evaluationRequest(defOnly, [other.plot.plotId], (r) => (r.previousEvaluationId = first.evaluationId)), 422, "PREVIOUS_EVALUATION_NOT_SAME_SUBJECT");
  await assertRefused(evaluationRequest(defOnly, [s.plot.plotId], (r) => (r.previousEvaluationId = randomUUID())), 404, "EVALUATION_NOT_FOUND");
});

test("the same frozen input gives the same evaluation: requirement results, gaps, conflicts and next steps are identical", async () => {
  const s = await coveredSubject(full);
  await admitEvidence(s.plot, (x) => (x["evidenceClaim"] = { claimType: "DEFORESTATION_DETECTED", claimSummary: "Loss.", confidence: "LOW", limitations: [] }));
  const body = evaluationRequest(full, [s.plot.plotId], (r) => ((r.subject.batchIdentifiers = [s.batch]), (r.subject.operatorPartyId = coop)));
  const a = await evaluateOk(body);
  const b = await evaluateOk(body);
  const stable = (d: ScsSufficiencyEvaluationResult) => ({
    overallState: d.overallState,
    requirementEvaluations: d.requirementEvaluations,
    allGaps: d.allGaps,
    allConflicts: d.allConflicts,
    nextSteps: d.nextSteps,
    temporalCoverage: d.temporalCoverage,
    spatialCoverage: d.spatialCoverage,
    custodyChain: d.custodyChain,
    manifest: d.evaluatedEvidence.manifest,
  });
  assert.equal(a.overallState, "CONFLICTING_EVIDENCE");
  assert.deepEqual(stable(b), stable(a));
  assert.notEqual(a.evaluationId, b.evaluationId);
});

test("the evaluation transaction is REPEATABLE READ: one snapshot for every read", async () => {
  const level = await api.transaction((tx) => tx.query<{ l: string }>(`SELECT current_setting('transaction_isolation') AS l`), { isolation: "repeatable read" });
  assert.equal(level.rows[0]!.l, "repeatable read");
  const plain = await api.transaction((tx) => tx.query<{ l: string }>(`SELECT current_setting('transaction_isolation') AS l`));
  assert.equal(plain.rows[0]!.l, "read committed");
  // inside one repeatable-read transaction, a record committed after the snapshot is invisible
  const s = await coveredSubject(defOnly);
  const seen = await api.transaction(async (tx) => {
    const n = async () => Number((await tx.query<{ n: string }>(`SELECT count(*) AS n FROM scs.deforestation_evidence_record WHERE plot_id = $1`, [s.plot.plotId])).rows[0]!.n);
    const before = await n();
    await admitEvidence(s.plot); // committed by another connection, after the snapshot
    return [before, await n()];
  }, { isolation: "repeatable read" });
  assert.deepEqual(seen, [1, 1], "evidence admitted after the snapshot cannot affect the evaluation");
  assert.equal(await count(`SELECT count(*) AS n FROM scs.deforestation_evidence_record WHERE plot_id = $1`, [s.plot.plotId]), 2);
});
