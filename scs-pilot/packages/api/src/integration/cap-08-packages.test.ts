// SCS-CAP-08 packages (contract 4b1f05b, 901a600, 700c40a) — requestCompilation
// with its AAB-PLATFORM-02 rendition (a0f8c46), getPackage,
// verifyPackageIntegrity and the rendition download — end to end: real HTTP, real
// PostgreSQL (the API connected as a restricted member of scs_api) and a real
// S3-compatible object store. Every record packaged is made through its
// endpoint — framework, parties, plot, evidence files and records, custody
// events, evaluation, review decision — and every change that blocks a
// compilation is made through an endpoint too. SQL and the raw S3 client are
// used only to inspect, and to simulate tampering and a failed receipt write.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { READER_ROLES as CAP08_READER_ROLES } from "../capabilities/cap-08/errors.js";
import { cap08Routes } from "../capabilities/cap-08/routes.js";
import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson, sha256Hex } from "../foundation/canonical.js";
import { runWithCorrelation } from "../foundation/correlation.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer, type Route } from "../foundation/server.js";
import { validate, type JsonSchema } from "../foundation/validation.js";
import { S3ObjectStore } from "../platform/evidence-objects/object-store.js";
import { evidenceObjectRoutes } from "../platform/evidence-objects/routes.js";
import { renditionRoutes } from "../platform/renditions/routes.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ScsFrameworkRegistrationRequest } from "../types/cap-01.js";
import type { ScsSufficiencyEvaluationResult, ScsSufficiencyEvaluationSubmission } from "../types/cap-06.js";
import type { ScsPackageCompilationResponse, ScsPackageCompilationSubmission, ScsPackageIntegrityVerificationResult, ScsPackageReadResult } from "../types/cap-08.js";
import type { ScsRegulatoryReviewDecision, ScsReviewDecisionResponse, ScsReviewDecisionSubmission } from "../types/cap-09.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";
import { createTestObjectStore, type TestObjectStore } from "./object-store-harness.js";
import { contains, pdfBodyText, pdfPages } from "./pdf-text.js";

const TOKENS = {
  officer: "cap08-officer-token-0123456789abcdefghi",
  verifier: "cap08-verifier-token-0123456789abcdefgh",
  reviewer: "cap08-reviewer-token-0123456789abcdefgh",
  reviewer2: "cap08-reviewer2-token-0123456789abcdefg",
  reviewerOfficer: "cap08-revoff-token-0123456789abcdefghij",
  viewer: "cap08-viewer-token-0123456789abcdefghijk",
};
const actors = {
  officer: { actorId: "officer-cap08", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap08", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  reviewer: { actorId: "reviewer-cap08", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  reviewer2: { actorId: "reviewer2-cap08", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  reviewerOfficer: { actorId: "revoff-cap08", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER", "COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap08", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;
type Who = keyof typeof TOKENS;

const EVALUATIONS = "/scs/v1/sufficiency-evaluations";
const DECISIONS = "/scs/v1/review-decisions";
const PACKAGES = "/scs/v1/due-diligence-packages";
const PROCEED = "PROCEED_TO_PACKAGE_COMPILATION";
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];
const DERIVED = ["currencyStatus", "currencyLastAssessedAt", "stalenessReasons", "supersededByDecisionId", "supersededAt"];

let harness: MigratedDatabase;
let objects: TestObjectStore;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let coop = "";
let operatorParty = "";
let reviewerOrg = "";
interface Framework { frameworkId: string; regulationVersion: string; specId: string }
let defOnly: Framework;

async function send(method: "GET" | "POST", path: string, body: unknown, opts: { key?: string | null; who?: Who; raw?: Buffer; type?: string; to?: string } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}` };
  if (method === "POST") {
    headers["content-type"] = opts.type ?? "application/json";
    const key = opts.key === undefined ? `cap08-${randomUUID()}` : opts.key;
    if (key !== null) headers["idempotency-key"] = key;
  }
  const payload = opts.raw !== undefined ? new Uint8Array(opts.raw) : method === "POST" ? JSON.stringify(body) : undefined;
  const res = await fetch((opts.to ?? base) + path, { method, headers, ...(payload === undefined ? {} : { body: payload }) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}
const post = (path: string, body: unknown, opts: { key?: string | null; who?: Who; to?: string } = {}) => send("POST", path, body, opts);
const get = (path: string, who: Who = "officer") => send("GET", path, undefined, { who });

async function created(path: string, body: unknown, idField: string, who: Who = "officer"): Promise<string> {
  const r = await post(path, body, { who });
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}

async function verifiedParty(type: Parameters<typeof partyRequest>[0], name?: string): Promise<string> {
  const evidence = randomUUID();
  const partyId = await created("/scs/v1/parties", { ...partyRequest(type), ...(name === undefined ? {} : { partyName: name }), identityEvidence: { evidenceIds: [evidence], evidenceLimitations: [] } }, "partyId");
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

async function registerFramework(edit: (e: ScsFrameworkRegistrationRequest["evidenceRequirements"]) => void = () => {}): Promise<Framework> {
  const body = frameworkRequest();
  edit(body.evidenceRequirements);
  const frameworkId = await created("/scs/v1/frameworks", body, "frameworkId");
  const row = (await harness.admin.query<{ regulation_version: string; evidence_spec_id: string }>(
    `SELECT regulation_version, evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`,
    [frameworkId],
  )).rows[0]!;
  return { frameworkId, regulationVersion: row.regulation_version, specId: row.evidence_spec_id };
}

async function registerPlot(f: Framework, plotName?: string) {
  const r = await post("/scs/v1/plots", {
    plot: {
      ...(plotName === undefined ? {} : { plotName }),
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

/** Uploads a real file through AAB-PLATFORM-01 and returns its SHA-256 (the objectId). */
async function storedObject(): Promise<string> {
  const bytes = Buffer.concat([Buffer.from("II*\0"), randomBytes(256)]);
  const r = await send("POST", "/scs/v1/evidence-objects", undefined, { raw: bytes, type: "image/tiff" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return createHash("sha256").update(bytes).digest("hex");
}

async function admitEvidence(plot: { plotId: string; associationId: string }): Promise<{ evidenceId: string; objectId: string }> {
  const objectId = await storedObject();
  const evidenceId = await created(
    "/scs/v1/deforestation-evidence",
    {
      plotId: plot.plotId,
      frameworkAssociationId: plot.associationId,
      evidenceType: "SATELLITE_IMAGE",
      source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA", sourceReference: "https://dataspace.copernicus.eu/", sourceTitle: "Sentinel-2 L2A" },
      evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A", contentDigest: objectId, chainOfCustodyComplete: true },
      spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
      temporalCoverage: { analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-07-01T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
      analyticalMethod: { methodName: "Forest loss change detection", detectionTarget: "DEFORESTATION", qualityStatus: "ACCEPTABLE" },
      evidenceClaim: { claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No forest loss detected over the plot.", confidence: "HIGH", limitations: ["Cloud cover 12% in 2022."] },
      coverageAttestation: { attestationProvided: false },
    },
    "evidenceId",
  );
  return { evidenceId, objectId };
}

function evaluationRequest(f: Framework, plotIds: string[], edit: (r: ScsSufficiencyEvaluationSubmission) => void = () => {}): ScsSufficiencyEvaluationSubmission {
  const r: ScsSufficiencyEvaluationSubmission = {
    subject: { plotIds, commodityCode: "4001" },
    framework: { frameworkId: f.frameworkId, frameworkVersion: f.regulationVersion, evidenceRequirementSpecId: f.specId },
    evaluationPeriod: { evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    evidenceScope: { includeQuarantinedEvidence: false },
    requestedAnalysis: ["CONFLICT_DETECTION"],
  };
  edit(r);
  return r;
}

async function evaluate(body: ScsSufficiencyEvaluationSubmission): Promise<{ e: ScsSufficiencyEvaluationResult; digest: string }> {
  const r = await post(EVALUATIONS, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const id = (r.json["decision"] as ScsSufficiencyEvaluationResult).evaluationId;
  const read = await get(`${EVALUATIONS}/${id}`, "reviewer");
  assert.equal(read.status, 200, JSON.stringify(read.json));
  const e = read.json as unknown as ScsSufficiencyEvaluationResult;
  return { e, digest: sha256Hex(canonicalJson(e)) };
}

function decisionBody(e: ScsSufficiencyEvaluationResult, digest: string, edit: (r: ScsReviewDecisionSubmission) => void = () => {}): ScsReviewDecisionSubmission {
  const r: ScsReviewDecisionSubmission = {
    evaluationId: e.evaluationId,
    evaluationSnapshotDigest: digest,
    frameworkId: e.frameworkId,
    frameworkVersion: e.frameworkVersion,
    commodityCode: e.commodityCode,
    operatorId: e.operatorPartyId ?? operatorParty,
    decisionOutcome: e.overallState === "GAPS_REQUIRE_HUMAN_DECISION" ? PROCEED : "REQUIRES_FURTHER_EVIDENCE",
    reviewReasoning: {
      evaluationSummaryAssessed: `Reviewed evaluation ${e.evaluationId} (${e.overallState}).`,
      gapsConsidered: e.allGaps.map((g) => ({ gapId: g.gapId, assessment: `Gap ${g.requirementCode} ${g.gapId}: accepted as a disclosed pilot limit.` })),
      conflictsConsidered: e.allConflicts.map((c) => ({ conflictKey: c.conflictKey, assessment: `Conflict ${c.requirementCode} weighed.` })),
      limitationsAcknowledged: ["Spatial coverage is not evaluated in the pilot."],
      basisForOutcome: "The disclosed gaps are limits of the pilot, not missing evidence for this plot.",
    },
    reviewer: { reviewerName: "A. Reviewer", reviewerOrganizationId: reviewerOrg, reviewerRoleReference: "Independent reviewer", authorityBasis: "Appointed under the due diligence procedure." },
  };
  edit(r);
  return r;
}

async function decide(body: ScsReviewDecisionSubmission, who: Who = "reviewer"): Promise<ScsRegulatoryReviewDecision> {
  const r = await post(DECISIONS, body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return (r.json as unknown as ScsReviewDecisionResponse).decision;
}

/** A subject with one admitted evidence item, evaluated (GAPS) and decided PROCEED. */
async function approvedSubject(opts: { plotName?: string } = {}) {
  const plot = await registerPlot(defOnly, opts.plotName);
  const ev = await admitEvidence(plot);
  const { e, digest } = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(e.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
  const decision = await decide(decisionBody(e, digest));
  return { plot, ev, e, digest, decision };
}

function compileBody(s: { e: ScsSufficiencyEvaluationResult; decision: ScsRegulatoryReviewDecision }, edit: (r: ScsPackageCompilationSubmission) => void = () => {}): ScsPackageCompilationSubmission {
  const r: ScsPackageCompilationSubmission = {
    reviewDecisionId: s.decision.decisionId,
    operatorId: s.decision.operatorId,
    frameworkId: s.decision.frameworkId,
    frameworkVersion: s.decision.frameworkVersion,
    commodityCode: s.decision.commodityCode,
    plotIds: [...s.decision.plotIds],
    evaluationId: s.e.evaluationId,
    deforestationEvidenceIds: [...s.e.evaluatedEvidence.deforestationEvidenceIds],
    custodyEvidenceIds: [...s.e.evaluatedEvidence.custodyEventIds],
  };
  edit(r);
  return r;
}

const checkSchema = (body: unknown) => {
  const checked = runWithCorrelation("cap08-schema", () => validate("SCS-CAP-08", SCHEMAS.cap08PackageCompilationResponse, body));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
};

async function compile(body: ScsPackageCompilationSubmission, who: Who = "officer"): Promise<ScsPackageCompilationResponse> {
  const r = await post(PACKAGES, body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  checkSchema(r.json);
  return r.json as unknown as ScsPackageCompilationResponse;
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  packages: await count("SELECT count(*) AS n FROM scs.due_diligence_package"),
  compilations: await count("SELECT count(*) AS n FROM scs.package_compilation"),
  renditions: await count("SELECT count(*) AS n FROM scs.rendition"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});

async function assertRefused(body: unknown, status: number, error: string, opts: { who?: Who; to?: string } = {}) {
  const before = await totals();
  const key = `cap08-${randomUUID()}`;
  const r = await post(PACKAGES, body, { key, who: opts.who ?? "officer", ...(opts.to === undefined ? {} : { to: opts.to }) });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-08");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noPackageCompiled"], true);
  assert.equal(r.json["noPartialPackage"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r.json;
}

const tamper = async (table: string, sql: string, values: unknown[]) => {
  await harness.admin.query(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
  try {
    await harness.admin.query(sql, values);
  } finally {
    await harness.admin.query(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
  }
};

before(async () => {
  objects = await createTestObjectStore();
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Who[]).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  });
  server = createApiServer({
    routes: [...evidenceObjectRoutes(objects.store), ...renditionRoutes(objects.store, { "SCS-CAP-08": CAP08_READER_ROLES }), ...CAPABILITY_ROUTES, ...cap08Routes(objects.store)],
    authenticator,
    db: api,
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  farmer = await verifiedParty("NATURAL_PERSON");
  coop = await verifiedParty("COOPERATIVE");
  operatorParty = await created("/scs/v1/parties", { ...partyRequest("LEGAL_ENTITY"), partyName: `Hợp tác xã Cà phê Đắk Lắk ${randomUUID().slice(0, 8)}` }, "partyId");
  reviewerOrg = await created("/scs/v1/parties", partyRequest("LEGAL_ENTITY"), "partyId");
  defOnly = await registerFramework((e) => {
    e.sufficiencyThreshold.custodyChainComplete = false;
    e.custodyEvidence.requiredDocumentTypes = [];
  });
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
  await objects?.drop();
});

// ── The full chain ───────────────────────────────────────────────────────────

test("full chain: framework → plot → evidence file → evaluation → decision → package and rendition, bound by digest, every gap disclosed", async () => {
  const s = await approvedSubject({ plotName: "สวนยางบ้านนาสาร จำกัด" });
  const title = "Due diligence package: rubber lots, Surat Thani (สุราษฎร์ธานี) for Hợp tác xã Đắk Lắk";
  const r = await compile(compileBody(s, (x) => (x.packageTitle = title)));
  const env = r.package;
  const p = env.package;

  // the digest is over the package content only, and anyone can recompute it
  assert.equal(env.packageDigest, `sha256:${sha256Hex(canonicalJson(p))}`);
  assert.equal(r.decision.packageDigest, env.packageDigest);
  assert.equal(env.compilationMetadata.requestedByActorId, actors.officer.actorId);
  assert.equal(r.decision.compiledByServiceIdentity, env.compilationMetadata.compiledByServiceIdentity);
  assert.equal(r.decision.compiledAt, env.compilationMetadata.compiledAt);

  // the package's sections come from the records exactly
  assert.equal(p.packageTitle, title);
  assert.deepEqual(p.sufficiencyEvaluation.result, s.e, "the evaluation in full, as recorded");
  assert.equal(p.sufficiencyEvaluation.evaluationSnapshotDigest, s.decision.evaluationSnapshotDigest, "the digest the reviewer decided on");
  const decisionNow = (await get(`${DECISIONS}/${s.decision.decisionId}`, "reviewer")).json;
  assert.deepEqual(p.reviewDecision.decision, Object.fromEntries(Object.entries(decisionNow).filter(([k]) => !DERIVED.includes(k))), "the decision without its derived currency");
  assert.equal(p.reviewDecision.currencyStatusAtCompilation, "CURRENT");
  assert.deepEqual(p.deforestationEvidence.map((x) => x.evidenceId), s.e.evaluatedEvidence.deforestationEvidenceIds);
  assert.equal(p.deforestationEvidence[0]!.spatialCoverage.intersectionWithPlot, "NOT_VERIFIED", "as SCS-CAP-04 recorded it");
  assert.equal(p.deforestationEvidence[0]!.provenance.contentDigest, s.ev.objectId);
  assert.deepEqual(p.deforestationEvidence[0]!.evidenceClaim.limitations, ["Cloud cover 12% in 2022."]);
  assert.deepEqual(p.custodyEvidence, []);
  assert.equal(p.plots[0]!.plotName, "สวนยางบ้านนาสาร จำกัด");
  assert.ok(p.plots[0]!.plotGaps.some((g) => g.gapType === "OVERLAP_NOT_EVALUATED"));
  assert.match(p.operator.operatorName, /^Hợp tác xã Cà phê Đắk Lắk/);
  assert.equal(p.gapDisclosure.totalGapsIdentified, s.e.allGaps.length);
  assert.equal(p.gapDisclosure.blockingGaps.length + p.gapDisclosure.nonBlockingGaps.length, s.e.allGaps.length);
  for (const g of [...p.gapDisclosure.blockingGaps, ...p.gapDisclosure.nonBlockingGaps]) {
    assert.equal(g.reviewerAssessment, s.decision.reviewReasoning.gapsConsidered.find((x) => x.gapId === g.gapId)!.assessment);
  }
  const admission = (await harness.admin.query(`SELECT receipt_id FROM scs.decision_receipt WHERE decision_type = 'DEFORESTATION_EVIDENCE_ADMISSION' AND subject_id = $1`, [s.ev.evidenceId])).rows[0]!;
  assert.deepEqual(p.challengeResponseMetadata.allProvenanceChains, [
    { evidenceId: s.ev.evidenceId, evidenceKind: "DEFORESTATION", admissionReceiptId: admission["receipt_id"], contentDigest: s.ev.objectId, fileSha256Verified: true },
  ]);

  // recorded: the envelope, the compilation record, the rendition, the receipt
  const row = (await harness.admin.query(`SELECT * FROM scs.due_diligence_package WHERE package_id = $1`, [env.compilationMetadata.packageId])).rows[0] as Record<string, unknown>;
  assert.deepEqual(row["package"], p);
  assert.equal(row["package_digest"], env.packageDigest);
  assert.equal(`sha256:${sha256Hex(canonicalJson(row["package"]))}`, env.packageDigest, "the stored content still hashes to its digest");
  const comp = (await harness.admin.query(`SELECT * FROM scs.package_compilation WHERE package_id = $1`, [env.compilationMetadata.packageId])).rows[0] as Record<string, unknown>;
  assert.equal(comp["rendition_id"], r.decision.rendition.renditionId);
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [r.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["decision_type"], "PACKAGE_COMPILATION");
  assert.equal(receipt["decision"], "COMPILED");
  assert.equal(receipt["subject_id"], env.compilationMetadata.packageId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), r.receiptDigest);
  const rend = (await harness.admin.query(`SELECT * FROM scs.rendition WHERE rendition_id = $1`, [r.decision.rendition.renditionId])).rows[0] as Record<string, unknown>;
  assert.equal(rend["source_record_id"], env.compilationMetadata.packageId);
  assert.equal(rend["source_digest"], env.packageDigest);
  assert.equal(rend["renderer_version"], "pdfkit@0.20.2;noto-sans@2.015;noto-sans-thai@2.002;scs-cap08-package@1");
  assert.equal(await count(`SELECT count(*) AS n FROM scs.evidence_object WHERE content_sha256 = $1`, [rend["sha256"]]), 0, "a rendition is never evidence");

  // the rendition: its bytes are stored under their SHA-256, and present the whole package
  const pdf = (await objects.store.get(r.decision.rendition.sha256))!;
  assert.equal(createHash("sha256").update(pdf).digest("hex"), r.decision.rendition.sha256);
  assert.equal(pdf.length, Number(rend["byte_length"]));
  const pages = await pdfPages(pdf);
  for (const [i, pg] of pages.entries()) {
    assert.deepEqual(pg.footer, [
      `SCS-CAP-08 due diligence package ${env.compilationMetadata.packageId} · Page ${i + 1} of ${pages.length}`,
      `Package digest: ${env.packageDigest}`,
      "Presentation of a governed record. Not the record. Verify against the digest.",
    ]);
  }
  const text = await pdfBodyText(pdf);
  assert.ok(contains(pages[0]!.body, "Compiled, not submitted."), "the first page says what the package is not");
  for (const t of [title, p.plots[0]!.plotName!, p.operator.operatorName]) assert.ok(contains(text, t), `Thai and Vietnamese text extracts intact: ${t}`);
  for (const g of [...p.gapDisclosure.blockingGaps, ...p.gapDisclosure.nonBlockingGaps]) {
    assert.ok(contains(text, g.explanation), `gap ${g.gapId} explanation`);
    assert.ok(contains(text, g.reviewerAssessment), `gap ${g.gapId} assessment`);
  }
  assert.ok(contains(text, p.gapDisclosure.gapDisclosureStatement));
  for (const l of p.packageLimitations) assert.ok(contains(text, l), `limitation: ${l}`);
  for (const k of Object.keys(p.authorityBoundary)) assert.ok(contains(text, `${k}: true`), `authority boundary: ${k}`);
  for (const reason of p.reviewDecision.decision.decisionReasons) assert.ok(contains(text, reason), `decision reason: ${reason}`);
  assert.ok(contains(text, "PROCEED_TO_PACKAGE_COMPILATION on a GAPS_REQUIRE_HUMAN_DECISION evaluation is a human decision on disclosed gaps"));
});

test("the same decision compiled again: a new package, the same digest; the earlier package is unchanged", async () => {
  const s = await approvedSubject();
  const a = await compile(compileBody(s));
  const b = await compile(compileBody(s));
  assert.notEqual(a.package.compilationMetadata.packageId, b.package.compilationMetadata.packageId);
  assert.equal(a.package.packageDigest, b.package.packageDigest, "identical content, identical digest");
  assert.deepEqual(a.package.package, b.package.package);
  assert.notEqual(a.decision.rendition.renditionId, b.decision.rendition.renditionId);
  const first = (await harness.admin.query(`SELECT package FROM scs.due_diligence_package WHERE package_id = $1`, [a.package.compilationMetadata.packageId])).rows[0]!;
  assert.deepEqual(first["package"], a.package.package);
});

// ── The gate ─────────────────────────────────────────────────────────────────

test("staleness blocks compilation: new evidence → REVIEW_DECISION_NOT_CURRENT; after re-evaluation and a superseding decision, the new decision compiles", async () => {
  const s = await approvedSubject();
  await compile(compileBody(s));
  const late = await admitEvidence(s.plot);
  const refused = await assertRefused(compileBody(s), 409, "REVIEW_DECISION_NOT_CURRENT");
  assert.equal(refused["failedGateCheck"], "currencyIsCurrent");
  const blockers = refused["blockers"] as Array<{ blockerType: string; explanation: string; requiredAction: string }>;
  assert.equal(blockers[0]!.blockerType, "REVIEW_DECISION_NOT_CURRENT");
  assert.match(blockers[0]!.explanation, new RegExp(late.evidenceId));
  assert.match(blockers[0]!.requiredAction, /new SCS-CAP-06 evaluation .* new SCS-CAP-09 review decision/);

  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  const d2 = await decide(decisionBody(again.e, again.digest, (x) => (x.supersedes = { priorDecisionId: s.decision.decisionId, supersessionReason: "New evidence admitted; re-evaluated." })), "reviewer2");
  const superseded = await assertRefused(compileBody(s), 409, "REVIEW_DECISION_NOT_CURRENT");
  assert.match((superseded["blockers"] as Array<{ requiredAction: string }>)[0]!.requiredAction, new RegExp(`current decision, ${d2.decisionId}`));
  const r = await compile(compileBody({ e: again.e, decision: d2 }));
  assert.deepEqual(r.package.package.deforestationEvidence.map((x) => x.evidenceId).sort(), [s.ev.evidenceId, late.evidenceId].sort());
});

test("gate: each mismatch has its own code in the gate's order, names its check, and lists every blocker", async () => {
  const s = await approvedSubject();
  const other = await approvedSubject();
  const cases: Array<[(x: ScsPackageCompilationSubmission) => void, string, string]> = [
    [(x) => (x.evaluationId = other.e.evaluationId), "EVALUATION_ID_MISMATCH", "evaluationIdMatches"],
    [(x) => (x.frameworkVersion = "other"), "FRAMEWORK_VERSION_MISMATCH", "frameworkVersionMatches"],
    [(x) => (x.plotIds = [other.plot.plotId]), "PLOT_IDS_MISMATCH", "plotIdsMatch"],
    [(x) => (x.operatorId = reviewerOrg), "OPERATOR_MISMATCH", "operatorIdMatches"],
    [(x) => (x.commodityCode = "1801"), "COMMODITY_MISMATCH", "commodityCodeMatches"],
  ];
  for (const [edit, code, check] of cases) {
    const r = await assertRefused(compileBody(s, edit), 422, code);
    assert.equal(r["failedGateCheck"], check);
  }
  const many = await assertRefused(compileBody(s, (x) => { x.commodityCode = "1801"; x.frameworkVersion = "other"; }), 422, "FRAMEWORK_VERSION_MISMATCH");
  assert.deepEqual((many["blockers"] as Array<{ blockerType: string }>).map((b) => b.blockerType), ["FRAMEWORK_VERSION_MISMATCH", "COMMODITY_MISMATCH"]);
  const missing = randomUUID();
  const nf = await assertRefused(compileBody(s, (x) => (x.reviewDecisionId = missing)), 404, "REVIEW_DECISION_NOT_FOUND");
  assert.equal(nf["failedGateCheck"], "reviewDecisionFound");
});

test("gate: a decision that is not PROCEED cannot be packaged", async () => {
  const plot = await registerPlot(defOnly);
  const { e, digest } = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(e.overallState, "INSUFFICIENT");
  const d = await decide(decisionBody(e, digest, (x) => (x.decisionOutcome = "DO_NOT_PROCEED")));
  const r = await assertRefused(compileBody({ e, decision: d }), 409, "REVIEW_DECISION_OUTCOME_NOT_PROCEED");
  assert.equal(r["failedGateCheck"], "outcomePermitsCompilation");
});

test("EVIDENCE_SCOPE_MISMATCH: the request's evidence must be the manifest exactly, nothing missing or extra", async () => {
  const s = await approvedSubject();
  await assertRefused(compileBody(s, (x) => (x.deforestationEvidenceIds = [])), 422, "EVIDENCE_SCOPE_MISMATCH");
  await assertRefused(compileBody(s, (x) => x.deforestationEvidenceIds.push(randomUUID())), 422, "EVIDENCE_SCOPE_MISMATCH");
  await assertRefused(compileBody(s, (x) => (x.custodyEvidenceIds = [randomUUID()])), 422, "EVIDENCE_SCOPE_MISMATCH");
});

// ── Authority ────────────────────────────────────────────────────────────────

test("only a COMPLIANCE_OFFICER compiles, and never the decision's reviewer", async () => {
  const s = await approvedSubject();
  for (const who of ["reviewer", "viewer", "verifier"] as const) await assertRefused(compileBody(s), 403, "REQUESTOR_NOT_AUTHORISED", { who });
  const plot = await registerPlot(defOnly);
  await admitEvidence(plot);
  const { e, digest } = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  const d = await decide(decisionBody(e, digest), "reviewerOfficer");
  const r = await assertRefused(compileBody({ e, decision: d }), 403, "REQUESTOR_NOT_AUTHORISED", { who: "reviewerOfficer" });
  assert.match((r["reasons"] as string[])[0]!, /made review decision .* and cannot compile it/);
  await compile(compileBody({ e, decision: d }));
});

// ── Integrity ────────────────────────────────────────────────────────────────

test("EVIDENCE_INTEGRITY_FAILED: a cited file altered or missing in the object store", async () => {
  const s = await approvedSubject();
  await objects.s3.send(new PutObjectCommand({ Bucket: objects.config.bucket, Key: s.ev.objectId, Body: Buffer.from("corrupted") }));
  const altered = await assertRefused(compileBody(s), 422, "EVIDENCE_INTEGRITY_FAILED");
  assert.match((altered["reasons"] as string[])[0]!, new RegExp(`hashes to [0-9a-f]{64}, not its recorded SHA-256 ${s.ev.objectId}`));
  await objects.s3.send(new DeleteObjectCommand({ Bucket: objects.config.bucket, Key: s.ev.objectId }));
  const gone = await assertRefused(compileBody(s), 422, "EVIDENCE_INTEGRITY_FAILED");
  assert.match((gone["reasons"] as string[])[0]!, /is not in the object store/);
});

test("EVALUATION_INTEGRITY_FAILED and REVIEW_DECISION_INTEGRITY_FAILED: stored records that no longer match their receipts", async () => {
  const a = await approvedSubject();
  await tamper("scs.sufficiency_evaluation", `UPDATE scs.sufficiency_evaluation SET result = jsonb_set(result, '{evaluationExplanation,0}', '"Tampered."') WHERE evaluation_id = $1`, [a.e.evaluationId]);
  await assertRefused(compileBody(a), 422, "EVALUATION_INTEGRITY_FAILED");
  const b = await approvedSubject();
  await tamper("scs.regulatory_review_decision", `UPDATE scs.regulatory_review_decision SET basis_for_outcome = 'Tampered.' WHERE decision_id = $1`, [b.decision.decisionId]);
  const r = await assertRefused(compileBody(b), 422, "REVIEW_DECISION_INTEGRITY_FAILED");
  assert.match((r["reasons"] as string[])[0]!, /is not the decision its receipt records/);
});

test("EVIDENCE_RECORDS_NOT_RESOLVED: a record no longer at its manifest version", async () => {
  const s = await approvedSubject();
  await tamper("scs.deforestation_evidence_record", `UPDATE scs.deforestation_evidence_record SET evidence_version = 2 WHERE evidence_id = $1`, [s.ev.evidenceId]);
  const r = await assertRefused(compileBody(s), 422, "EVIDENCE_RECORDS_NOT_RESOLVED");
  assert.match((r["reasons"] as string[])[0]!, /is at version 2 .* not the manifest's version 1/);
});

// ── Rendering and dependencies ───────────────────────────────────────────────

test("RENDITION_FAILED: text in a script no recorded font covers is refused, and nothing is compiled", async () => {
  const s = await approvedSubject();
  const r = await assertRefused(compileBody(s, (x) => (x.packageTitle = "橡胶 due diligence")), 422, "RENDITION_FAILED");
  assert.match((r["reasons"] as string[])[0]!, /U\+6A61 .* is in a script no recorded font covers/);
});

test("the object store unavailable → 503 DEPENDENCY_UNAVAILABLE (SCS-CAP-08); nothing is recorded", async () => {
  const s = await approvedSubject();
  const down = new S3ObjectStore({ ...objects.config, endpoint: "http://127.0.0.1:1" });
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKENS.officer).digest("hex"), actor: actors.officer }] });
  const alt = createApiServer({ routes: cap08Routes(down), authenticator, db: api });
  await new Promise<void>((r) => alt.listen(0, "127.0.0.1", r));
  try {
    await assertRefused(compileBody(s), 503, "DEPENDENCY_UNAVAILABLE", { to: `http://127.0.0.1:${(alt.address() as AddressInfo).port}` });
  } finally {
    await new Promise<void>((r) => alt.close(() => r()));
  }
});

// ── Idempotency and rollback ─────────────────────────────────────────────────

test("same key, same content → byte-identical 201 replay; nothing new is recorded or rendered", async () => {
  const s = await approvedSubject();
  const key = `cap08-${randomUUID()}`;
  const first = await post(PACKAGES, compileBody(s), { key });
  const before = await totals();
  const second = await post(PACKAGES, compileBody(s), { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before);
});

test("receipt write fails → 500; no package, compilation record or rendition record; the decision can still be compiled", async () => {
  const s = await approvedSubject();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(PACKAGES, compileBody(s));
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  await compile(compileBody(s));
});

// ── getPackage ───────────────────────────────────────────────────────────────

const readSchema = (schema: JsonSchema, body: unknown) => {
  const checked = runWithCorrelation("cap08-read-schema", () => validate("SCS-CAP-08", schema, body));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
};

async function readPackage(packageId: string, who: Who = "officer"): Promise<ScsPackageReadResult> {
  const r = await get(`${PACKAGES}/${packageId}`, who);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  readSchema(SCHEMAS.cap08PackageReadResult, r.json);
  return r.json as unknown as ScsPackageReadResult;
}

async function verify(packageId: string, opts: { who?: Who; to?: string } = {}): Promise<ScsPackageIntegrityVerificationResult> {
  const before = await totals();
  const r = await send("GET", `${PACKAGES}/${packageId}/integrity`, undefined, { who: opts.who ?? "officer", ...(opts.to === undefined ? {} : { to: opts.to }) });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  readSchema(SCHEMAS.cap08PackageIntegrityResult, r.json);
  assert.deepEqual(await totals(), before, "verification records nothing");
  return r.json as unknown as ScsPackageIntegrityVerificationResult;
}

const resultOf = (v: ScsPackageIntegrityVerificationResult, check: string, evidenceId?: string) =>
  v.checks.find((c) => c.check === check && (evidenceId === undefined || c.evidenceId === evidenceId))!.result;

async function readRefused(path: string, status: number, error: string, capabilityId: string, who: Who = "officer") {
  const r = await get(path, who);
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], capabilityId);
  return r.json;
}

/** A compiled package of a fresh subject. */
async function compiled() {
  const s = await approvedSubject();
  const r = await compile(compileBody(s));
  return { s, r, packageId: r.package.compilationMetadata.packageId };
}

/** A server whose object store cannot be reached. */
async function withStoreDown<T>(routes: (store: S3ObjectStore) => readonly Route<never>[], fn: (to: string) => Promise<T>): Promise<T> {
  const down = new S3ObjectStore({ ...objects.config, endpoint: "http://127.0.0.1:1" });
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKENS.officer).digest("hex"), actor: actors.officer }] });
  const alt = createApiServer({ routes: routes(down), authenticator, db: api });
  await new Promise<void>((r) => alt.listen(0, "127.0.0.1", r));
  try {
    return await fn(`http://127.0.0.1:${(alt.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((r) => alt.close(() => r()));
  }
}

test("getPackage: the envelope exactly as stored, with its decision's currency derived at read time beside it", async () => {
  const { s, r, packageId } = await compiled();
  for (const who of ["officer", "reviewer"] as const) {
    const read = await readPackage(packageId, who);
    assert.deepEqual(read.envelope, r.package, "exactly the envelope compiled and stored");
    assert.equal(read.envelope.packageDigest, `sha256:${sha256Hex(canonicalJson(read.envelope.package))}`);
    assert.equal(read.currency.decisionId, s.decision.decisionId);
    assert.equal(read.currency.status, "CURRENT");
    assert.equal(read.currency.stalenessReasons, undefined);
  }

  // the decision goes stale: the package is unchanged; its currency says so
  const late = await admitEvidence(s.plot);
  const stale = await readPackage(packageId);
  assert.deepEqual(stale.envelope, r.package);
  assert.equal(stale.currency.status, "POTENTIALLY_STALE");
  assert.ok(stale.currency.stalenessReasons!.some((x) => x.changedEntityId === late.evidenceId));
  assert.ok(!("currency" in stale.envelope.package), "currency is never inside the digested content");

  // and superseded
  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  const d2 = await decide(decisionBody(again.e, again.digest, (x) => (x.supersedes = { priorDecisionId: s.decision.decisionId, supersessionReason: "Re-evaluated." })), "reviewer2");
  const superseded = await readPackage(packageId, "reviewer");
  assert.deepEqual(superseded.envelope, r.package);
  assert.equal(superseded.currency.status, "SUPERSEDED");
  assert.equal(superseded.currency.supersededByDecisionId, d2.decisionId);
});

test("getPackage: other actors → 403 REQUESTOR_NOT_AUTHORISED; an unknown package → 404 PACKAGE_NOT_FOUND", async () => {
  const { packageId } = await compiled();
  for (const who of ["viewer", "verifier"] as const) await readRefused(`${PACKAGES}/${packageId}`, 403, "REQUESTOR_NOT_AUTHORISED", "SCS-CAP-08", who);
  await readPackage(packageId.toUpperCase(), "reviewer2");
  await readRefused(`${PACKAGES}/${randomUUID()}`, 404, "PACKAGE_NOT_FOUND", "SCS-CAP-08");
  assert.equal((await get(`${PACKAGES}/not-a-uuid`)).status, 400);
});

// ── verifyPackageIntegrity ───────────────────────────────────────────────────

test("verifyPackageIntegrity: INTACT — the digest recomputes, evaluation and decision match their receipts, every record and file matches", async () => {
  const { s, packageId, r } = await compiled();
  for (const who of ["officer", "reviewer"] as const) {
    const v = await verify(packageId, { who });
    assert.equal(v.integrityStatus, "INTACT");
    assert.equal(v.packageDigest, r.package.packageDigest);
    assert.deepEqual(v.checks.map((c) => [c.check, c.evidenceId ?? null, c.result]), [
      ["PACKAGE_DIGEST", null, "PASS"],
      ["EVALUATION_RECEIPT", null, "PASS"],
      ["DECISION_RECEIPT", null, "PASS"],
      ["EVIDENCE_RECORD", s.ev.evidenceId, "PASS"],
      ["EVIDENCE_FILE", s.ev.evidenceId, "PASS"],
    ]);
  }
});

test("verifyPackageIntegrity: tampered package content → DIGEST_MISMATCH", async () => {
  const { packageId } = await compiled();
  await tamper("scs.due_diligence_package", `UPDATE scs.due_diligence_package SET package = jsonb_set(package, '{packageLimitations,0}', '"Tampered."') WHERE package_id = $1`, [packageId]);
  const v = await verify(packageId);
  assert.equal(v.integrityStatus, "DIGEST_MISMATCH");
  assert.equal(resultOf(v, "PACKAGE_DIGEST"), "DIGEST_MISMATCH");
  assert.match(v.checks[0]!.detail, /The stored content hashes to sha256:[0-9a-f]{64}, not its packageDigest/);
});

test("verifyPackageIntegrity: tampered evaluation → EVALUATION_CHANGED; tampered decision → REVIEW_DECISION_CHANGED", async () => {
  const a = await compiled();
  await tamper("scs.sufficiency_evaluation", `UPDATE scs.sufficiency_evaluation SET result = jsonb_set(result, '{evaluationExplanation,0}', '"Tampered."') WHERE evaluation_id = $1`, [a.s.e.evaluationId]);
  const va = await verify(a.packageId);
  assert.equal(va.integrityStatus, "EVALUATION_CHANGED");
  assert.equal(resultOf(va, "PACKAGE_DIGEST"), "PASS", "the package itself is intact");

  const b = await compiled();
  await tamper("scs.regulatory_review_decision", `UPDATE scs.regulatory_review_decision SET basis_for_outcome = 'Tampered.' WHERE decision_id = $1`, [b.s.decision.decisionId]);
  const vb = await verify(b.packageId);
  assert.equal(vb.integrityStatus, "REVIEW_DECISION_CHANGED");
  assert.match(vb.checks.find((c) => c.check === "DECISION_RECEIPT")!.detail, /is not the decision its receipt records/);
});

test("verifyPackageIntegrity: a changed evidence record → EVIDENCE_RECORDS_CHANGED", async () => {
  const { s, packageId } = await compiled();
  await tamper("scs.deforestation_evidence_record", `UPDATE scs.deforestation_evidence_record SET evidence_version = 2 WHERE evidence_id = $1`, [s.ev.evidenceId]);
  const v = await verify(packageId);
  assert.equal(v.integrityStatus, "EVIDENCE_RECORDS_CHANGED");
  assert.equal(resultOf(v, "EVIDENCE_RECORD", s.ev.evidenceId), "EVIDENCE_RECORDS_CHANGED");
});

test("verifyPackageIntegrity: a missing file → EVIDENCE_OBJECT_MISSING; changed bytes → EVIDENCE_CHANGED", async () => {
  const a = await compiled();
  await objects.s3.send(new DeleteObjectCommand({ Bucket: objects.config.bucket, Key: a.s.ev.objectId }));
  const va = await verify(a.packageId);
  assert.equal(va.integrityStatus, "EVIDENCE_OBJECT_MISSING");
  assert.equal(resultOf(va, "EVIDENCE_FILE", a.s.ev.evidenceId), "EVIDENCE_OBJECT_MISSING");

  const b = await compiled();
  await objects.s3.send(new PutObjectCommand({ Bucket: objects.config.bucket, Key: b.s.ev.objectId, Body: Buffer.from("corrupted") }));
  const vb = await verify(b.packageId);
  assert.equal(vb.integrityStatus, "EVIDENCE_CHANGED");
  assert.match(vb.checks.find((c) => c.check === "EVIDENCE_FILE")!.detail, /hashes to [0-9a-f]{64}, not its recorded SHA-256/);
});

test("verifyPackageIntegrity: object store unreachable → 200 UNVERIFIABLE; a change found elsewhere still outranks it", async () => {
  const { s, packageId } = await compiled();
  await withStoreDown((store) => cap08Routes(store), async (to) => {
    const v = await verify(packageId, { to });
    assert.equal(v.integrityStatus, "UNVERIFIABLE");
    assert.equal(resultOf(v, "EVIDENCE_FILE", s.ev.evidenceId), "UNVERIFIABLE");
    assert.equal(resultOf(v, "PACKAGE_DIGEST"), "PASS");
    await tamper("scs.regulatory_review_decision", `UPDATE scs.regulatory_review_decision SET basis_for_outcome = 'Tampered.' WHERE decision_id = $1`, [s.decision.decisionId]);
    const both = await verify(packageId, { to });
    assert.equal(both.integrityStatus, "REVIEW_DECISION_CHANGED", "a change found outranks a check that could not be performed");
    assert.equal(resultOf(both, "EVIDENCE_FILE", s.ev.evidenceId), "UNVERIFIABLE");
  });
});

test("verifyPackageIntegrity: other actors → 403; an unknown package → 404", async () => {
  const { packageId } = await compiled();
  for (const who of ["viewer", "verifier"] as const) await readRefused(`${PACKAGES}/${packageId}/integrity`, 403, "REQUESTOR_NOT_AUTHORISED", "SCS-CAP-08", who);
  await readRefused(`${PACKAGES}/${randomUUID()}/integrity`, 404, "PACKAGE_NOT_FOUND", "SCS-CAP-08");
});

// ── Rendition download (AAB-PLATFORM-02) ─────────────────────────────────────

async function download(renditionId: string, opts: { who?: Who; to?: string } = {}) {
  const res = await fetch(`${opts.to ?? base}/scs/v1/renditions/${renditionId}`, { headers: { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}` } });
  return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) };
}
const errorOf = (bytes: Buffer) => JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;

test("rendition download: the PDF bytes, re-hashed on every read, for COMPLIANCE_OFFICER and REGULATORY_REVIEWER", async () => {
  const { r } = await compiled();
  const rend = r.decision.rendition;
  for (const who of ["officer", "reviewer"] as const) {
    const d = await download(rend.renditionId, { who });
    assert.equal(d.status, 200);
    assert.equal(d.headers.get("content-type"), "application/pdf");
    assert.equal(createHash("sha256").update(d.bytes).digest("hex"), rend.sha256);
    assert.equal(d.headers.get("repr-digest"), `sha-256=:${Buffer.from(rend.sha256, "hex").toString("base64")}:`);
    assert.match(d.headers.get("content-disposition")!, /^attachment; filename="scs-cap-08-.*\.pdf"$/);
    assert.match(d.bytes.subarray(0, 8).toString("latin1"), /^%PDF-/);
  }
});

test("rendition download: bytes changed or missing → RENDITION_INTEGRITY_FAILED, nothing returned; store unreachable → 503", async () => {
  const a = await compiled();
  await objects.s3.send(new PutObjectCommand({ Bucket: objects.config.bucket, Key: a.r.decision.rendition.sha256, Body: Buffer.from("%PDF-1.7 tampered") }));
  const changed = await download(a.r.decision.rendition.renditionId);
  assert.equal(changed.status, 422);
  assert.equal(errorOf(changed.bytes)["error"], "RENDITION_INTEGRITY_FAILED");
  assert.equal(errorOf(changed.bytes)["capabilityId"], "SCS-PLATFORM");
  assert.match((errorOf(changed.bytes)["reasons"] as string[])[0]!, /hash to [0-9a-f]{64} .* not the recorded/);
  assert.ok(!changed.bytes.includes(Buffer.from("tampered")), "the tampered bytes are never returned");

  const b = await compiled();
  await objects.s3.send(new DeleteObjectCommand({ Bucket: objects.config.bucket, Key: b.r.decision.rendition.sha256 }));
  const missing = await download(b.r.decision.rendition.renditionId);
  assert.equal(missing.status, 422);
  assert.equal(errorOf(missing.bytes)["error"], "RENDITION_INTEGRITY_FAILED");

  const c = await compiled();
  await withStoreDown((store) => renditionRoutes(store, { "SCS-CAP-08": CAP08_READER_ROLES }), async (to) => {
    const unavailable = await download(c.r.decision.rendition.renditionId, { to });
    assert.equal(unavailable.status, 503);
    assert.equal(errorOf(unavailable.bytes)["error"], "DEPENDENCY_UNAVAILABLE");
  });
});

test("rendition download: other actors → 403 READER_NOT_AUTHORISED; an unknown rendition → 404 RENDITION_NOT_FOUND", async () => {
  const { r } = await compiled();
  for (const who of ["viewer", "verifier"] as const) {
    await readRefused(`/scs/v1/renditions/${r.decision.rendition.renditionId}`, 403, "READER_NOT_AUTHORISED", "SCS-PLATFORM", who);
  }
  await readRefused(`/scs/v1/renditions/${randomUUID()}`, 404, "RENDITION_NOT_FOUND", "SCS-PLATFORM");
});
