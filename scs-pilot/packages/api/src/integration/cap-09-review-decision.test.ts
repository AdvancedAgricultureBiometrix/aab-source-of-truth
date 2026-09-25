// SCS-CAP-09 submitDecision, getDecision and assessCurrency (contract ff6d3b8,
// a816101), end to end: real HTTP, real PostgreSQL, the API connected as a
// restricted member of scs_api. Every evaluation reviewed is made through the
// SCS-CAP-06 endpoint over evidence admitted through the CAP-04 and CAP-05
// endpoints, and every change that makes a decision stale is made through an
// endpoint too — the full cycle. SQL is used only to inspect, and to simulate
// tampering and a failed receipt write.

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
import { validate, type JsonSchema } from "../foundation/validation.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ScsFrameworkRegistrationRequest } from "../types/cap-01.js";
import type { ScsConflictResolutionSubmission, ScsSufficiencyEvaluationResult, ScsSufficiencyEvaluationSubmission } from "../types/cap-06.js";
import type { ScsDecisionCurrencyAssessment, ScsRegulatoryReviewDecision, ScsReviewDecisionResponse, ScsReviewDecisionSubmission } from "../types/cap-09.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap09-officer-token-0123456789abcdefghi",
  verifier: "cap09-verifier-token-0123456789abcdefgh",
  resolver: "cap09-resolver-token-0123456789abcdefgh",
  reviewer: "cap09-reviewer-token-0123456789abcdefgh",
  reviewer2: "cap09-reviewer2-token-0123456789abcdefg",
  requesterReviewer: "cap09-reqrev-token-0123456789abcdefghij",
  resolverReviewer: "cap09-resrev-token-0123456789abcdefghij",
  viewer: "cap09-viewer-token-0123456789abcdefghijk",
};
const actors = {
  officer: { actorId: "officer-cap09", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap09", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  resolver: { actorId: "resolver-cap09", actorType: "HUMAN", roles: ["CONFLICT_RESOLVER"], authenticationMethod: "STATIC_TOKEN" },
  reviewer: { actorId: "reviewer-cap09", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  reviewer2: { actorId: "reviewer2-cap09", actorType: "HUMAN", roles: ["REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  requesterReviewer: { actorId: "reqrev-cap09", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER", "REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  resolverReviewer: { actorId: "resrev-cap09", actorType: "HUMAN", roles: ["CONFLICT_RESOLVER", "REGULATORY_REVIEWER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap09", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;
type Who = keyof typeof TOKENS;

const EVALUATIONS = "/scs/v1/sufficiency-evaluations";
const DECISIONS = "/scs/v1/review-decisions";
const assessPath = (id: string) => `${DECISIONS}/${id}/currency-assessments`;
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];
const PROCEED = "PROCEED_TO_PACKAGE_COMPILATION";
const D15 =
  "PROCEED_TO_PACKAGE_COMPILATION on a GAPS_REQUIRE_HUMAN_DECISION evaluation is a human decision on disclosed gaps";
const PILOT = "No pilot evaluation can be SUFFICIENT (SCS-CAP-06 does not evaluate spatial coverage), so every pilot PROCEED_TO_PACKAGE_COMPILATION is a human decision on disclosed gaps.";

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let coop = "";
let operatorParty = "";
let reviewerOrg = "";
interface Framework { frameworkId: string; regulationVersion: string; specId: string }
let full: Framework;
let defOnly: Framework;

async function send(method: "GET" | "POST", path: string, body: unknown, opts: { key?: string | null; who?: Who } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}` };
  if (method === "POST") {
    headers["content-type"] = "application/json";
    const key = opts.key === undefined ? `cap09-${randomUUID()}` : opts.key;
    if (key !== null) headers["idempotency-key"] = key;
  }
  const res = await fetch(base + path, { method, headers, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}
const post = (path: string, body: unknown, opts: { key?: string | null; who?: Who } = {}) => send("POST", path, body, opts);
const get = (path: string, who: Who = "reviewer") => send("GET", path, undefined, { who });

async function created(path: string, body: unknown, idField: string, who: Who = "officer"): Promise<string> {
  const r = await post(path, body, { who });
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}

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

async function registerPlot(f: Framework) {
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

/** Full-period "no deforestation detected" analysis for the plot; `claim` and `period` change it. */
async function admitEvidence(plot: { plotId: string; associationId: string }, opts: { claim?: string; period?: [string, string] } = {}): Promise<string> {
  const objectId = await storedObject();
  const [start, end] = opts.period ?? ["2020-12-31T00:00:00Z", "2024-07-01T00:00:00Z"];
  return created(
    "/scs/v1/deforestation-evidence",
    {
      plotId: plot.plotId,
      frameworkAssociationId: plot.associationId,
      evidenceType: "SATELLITE_IMAGE",
      source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA", sourceReference: "https://dataspace.copernicus.eu/" },
      evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A", contentDigest: objectId, chainOfCustodyComplete: true },
      spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
      temporalCoverage: { analysisPeriodStart: start, analysisPeriodEnd: end, coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
      analyticalMethod: { methodName: "Forest loss change detection", detectionTarget: "DEFORESTATION", qualityStatus: "ACCEPTABLE" },
      evidenceClaim: { claimType: opts.claim ?? "NO_DEFORESTATION_DETECTED", claimSummary: "Analysis result.", confidence: "HIGH", limitations: [] },
      coverageAttestation: { attestationProvided: false },
    },
    "evidenceId",
  );
}

async function admitCustody(batch: string): Promise<string> {
  const objectId = await storedObject();
  return created(
    "/scs/v1/custody-events",
    {
      frameworkAssociationId: full.frameworkId,
      eventType: "PURCHASE",
      sourceParty: { partyId: farmer, partyRoleAtEvent: "SUPPLIER" },
      destinationParty: { partyId: coop, partyRoleAtEvent: "AGGREGATOR" },
      commodity: { commodityCode: "4001", commodityName: "Natural rubber", sourcePlotIds: [], sourcePlotIdsComplete: true, batchIdentifier: batch },
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
    requestedAnalysis: ["CONFLICT_DETECTION"],
  };
  edit(r);
  return r;
}

/** Requests an evaluation, then the reviewer reads it through getEvaluationResult (contract b9b5f77): what the reviewer reviews, and its digest. */
async function evaluate(body: ScsSufficiencyEvaluationSubmission, who: Who = "officer"): Promise<{ e: ScsSufficiencyEvaluationResult; digest: string }> {
  const r = await post(EVALUATIONS, body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const id = (r.json["decision"] as ScsSufficiencyEvaluationResult).evaluationId;
  const read = await get(`${EVALUATIONS}/${id}`, "reviewer");
  assert.equal(read.status, 200, JSON.stringify(read.json));
  const e = read.json as unknown as ScsSufficiencyEvaluationResult;
  return { e, digest: sha256Hex(canonicalJson(e)) };
}

/** A decision on `e` that addresses every gap and every reported conflict. */
function decision(e: ScsSufficiencyEvaluationResult, digest: string, edit: (r: ScsReviewDecisionSubmission) => void = () => {}): ScsReviewDecisionSubmission {
  const r: ScsReviewDecisionSubmission = {
    evaluationId: e.evaluationId,
    evaluationSnapshotDigest: digest,
    frameworkId: e.frameworkId,
    frameworkVersion: e.frameworkVersion,
    commodityCode: e.commodityCode,
    operatorId: e.operatorPartyId ?? operatorParty,
    decisionOutcome: e.overallState === "GAPS_REQUIRE_HUMAN_DECISION" ? PROCEED : "REQUIRES_FURTHER_EVIDENCE",
    reviewReasoning: {
      evaluationSummaryAssessed: `Reviewed evaluation ${e.evaluationId} (${e.overallState}): requirement states, coverage, gaps and conflicts.`,
      gapsConsidered: e.allGaps.map((g) => ({ gapId: g.gapId, assessment: `Gap ${g.requirementCode} weighed against the remaining evidence and the plot's risk.` })),
      conflictsConsidered: e.allConflicts.map((c) => ({ conflictKey: c.conflictKey, assessment: `Conflict ${c.requirementCode} is material to the decision.` })),
      limitationsAcknowledged: ["Spatial coverage is not evaluated in the pilot."],
      basisForOutcome: "The disclosed gaps are limits of the pilot, not missing evidence for this plot.",
      remainingConcerns: ["No field verification."],
    },
    reviewer: {
      reviewerName: "A. Reviewer",
      reviewerOrganizationId: reviewerOrg,
      reviewerRoleReference: "Independent reviewer, due diligence procedure s.4",
      authorityBasis: "Appointed by the operator's due diligence procedure.",
    },
  };
  edit(r);
  return r;
}

const checkSchema = (schema: JsonSchema, body: unknown) => {
  const checked = runWithCorrelation("cap09-schema", () => validate("SCS-CAP-09", schema, body));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
};

async function decide(body: ScsReviewDecisionSubmission, who: Who = "reviewer"): Promise<ScsReviewDecisionResponse> {
  const r = await post(DECISIONS, body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsReviewDecisionResponse;
  checkSchema(SCHEMAS.cap09ReviewDecisionResponse, res);
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-09");
  assert.equal(receipt["decision_type"], "REGULATORY_REVIEW_DECISION");
  assert.equal(receipt["decision"], body.decisionOutcome);
  assert.equal(receipt["subject_id"], res.decision.decisionId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, res.decision);
  return res;
}

async function read(id: string, who: Who = "reviewer"): Promise<ScsRegulatoryReviewDecision> {
  const r = await get(`${DECISIONS}/${id}`, who);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  checkSchema(SCHEMAS.cap09ReviewDecision, r.json);
  return r.json as unknown as ScsRegulatoryReviewDecision;
}

async function assess(id: string, who: Who = "reviewer"): Promise<ScsDecisionCurrencyAssessment> {
  const r = await post(assessPath(id), {}, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  checkSchema(SCHEMAS.cap09CurrencyAssessment, r.json);
  const a = r.json as unknown as ScsDecisionCurrencyAssessment;
  const row = (await harness.admin.query(`SELECT * FROM scs.decision_currency_assessment WHERE assessment_id = $1`, [a.assessmentId])).rows[0] as Record<string, unknown>;
  assert.equal(row["currency_status"], a.currencyStatus);
  assert.deepEqual(row["assessed_by"], actors[who]);
  assert.deepEqual(row["checks_performed"], a.checksPerformed);
  assert.deepEqual(row["material_changes"], a.materialChanges);
  assert.equal(row["superseded_by_decision_id"], a.supersededByDecisionId ?? null);
  return a;
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  decisions: await count("SELECT count(*) AS n FROM scs.regulatory_review_decision"),
  reasoning: await count("SELECT count(*) AS n FROM scs.review_reasoning_item"),
  assessments: await count("SELECT count(*) AS n FROM scs.decision_currency_assessment"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});

async function assertRefused(path: string, body: unknown, status: number, error: string, who: Who = "reviewer") {
  const before = await totals();
  const key = `cap09-${randomUUID()}`;
  const r = await post(path, body, { key, who });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-09");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noDecisionRecorded"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r.json["reasons"] as string[];
}

const changeTypes = (d: { stalenessReasons?: Array<{ changeType: string }> }) => (d.stalenessReasons ?? []).map((s) => s.changeType).sort();
const checkResult = (a: ScsDecisionCurrencyAssessment, type: string) => a.checksPerformed.find((c) => c.checkType === type)!.checkResult;

/** A plot with one full-period "no deforestation" item, evaluated under defOnly: GAPS_REQUIRE_HUMAN_DECISION (the pilot's own limits). */
async function gapsSubject() {
  const plot = await registerPlot(defOnly);
  await admitEvidence(plot);
  const ev = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(ev.e.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
  assert.ok(ev.e.allGaps.length > 0);
  return { plot, ...ev };
}

/** A plot with conflicting items: CONFLICTING_EVIDENCE with one unresolved conflict. */
async function conflictingSubject() {
  const plot = await registerPlot(defOnly);
  const none = await admitEvidence(plot);
  const detected = await admitEvidence(plot, { claim: "DEFORESTATION_DETECTED", period: ["2022-01-01T00:00:00Z", "2024-01-01T00:00:00Z"] });
  const ev = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(ev.e.overallState, "CONFLICTING_EVIDENCE");
  return { plot, none, detected, ...ev };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Who[]).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  farmer = await verifiedParty("NATURAL_PERSON");
  coop = await verifiedParty("COOPERATIVE");
  operatorParty = await created("/scs/v1/parties", partyRequest("LEGAL_ENTITY"), "partyId");
  reviewerOrg = await created("/scs/v1/parties", partyRequest("LEGAL_ENTITY"), "partyId");
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

// ── The full staleness cycle ─────────────────────────────────────────────────

test("full staleness cycle: CURRENT → new evidence admitted → POTENTIALLY_STALE → re-evaluation and superseding decision → SUPERSEDED; the first decision never changes", async () => {
  // 1. An evaluation, read and decided on
  const s = await gapsSubject();
  const first = await decide(decision(s.e, s.digest));
  const d1 = first.decision;
  assert.equal(d1.decisionOutcome, PROCEED);
  assert.equal(d1.currencyStatus, "CURRENT");
  assert.equal(d1.currencyLastAssessedAt, d1.decidedAt);
  assert.equal(d1.stalenessReasons, undefined);
  assert.equal(d1.evaluationSnapshotDigest, s.digest);
  assert.equal(d1.evidenceRequirementSpecId, s.e.evidenceRequirementSpecId);
  assert.deepEqual(d1.plotIds, s.e.plotIds);
  assert.equal(d1.reviewer.reviewerId, actors.reviewer.actorId);
  assert.equal(d1.reviewer.authorityVerifiedAt, d1.decidedAt);
  assert.equal(d1.recordValidity, "VALID");
  assert.ok(d1.decisionReasons.some((r) => r.startsWith(D15)), "the D15 disclosure is always made on a PROCEED on gaps");
  assert.ok(d1.decisionReasons.includes(PILOT));
  assert.ok(d1.decisionReasons.some((r) => r.startsWith("The authority basis is recorded as declared, not verified")));
  const d1Row = (await harness.admin.query(`SELECT * FROM scs.regulatory_review_decision WHERE decision_id = $1`, [d1.decisionId])).rows[0];
  const d1Items = (await harness.admin.query(`SELECT * FROM scs.review_reasoning_item WHERE decision_id = $1 ORDER BY reasoning_item_id`, [d1.decisionId])).rows;
  assert.equal(d1Items.length, s.e.allGaps.length + s.e.allConflicts.length);

  // read and assessed while nothing has changed: CURRENT
  const read1 = await read(d1.decisionId);
  assert.equal(read1.currencyStatus, "CURRENT");
  assert.deepEqual({ ...read1, currencyLastAssessedAt: d1.currencyLastAssessedAt }, d1, "the decision reads back exactly as recorded");
  const a1 = await assess(d1.decisionId, "officer");
  assert.equal(a1.currencyStatus, "CURRENT");
  assert.deepEqual(a1.materialChanges, []);
  assert.equal(a1.checksPerformed.length, 11);
  assert.ok(a1.checksPerformed.every((c) => c.checkResult === "UNCHANGED"));
  assert.equal(a1.checksPerformed.find((c) => c.checkType === "PLOT_BOUNDARY_CHANGED")!.detail, "No operation can cause this change yet.");

  // 2. New evidence is admitted for the plot, through CAP-04
  const newEvidence = await admitEvidence(s.plot);
  const stale = await read(d1.decisionId);
  assert.equal(stale.currencyStatus, "POTENTIALLY_STALE");
  assert.deepEqual(changeTypes(stale), ["NEW_EVIDENCE_ADMITTED"]);
  assert.equal(stale.stalenessReasons![0]!.changedEntityId, newEvidence);
  assert.match(stale.stalenessReasons![0]!.explanation, new RegExp(`deforestation evidence record ${newEvidence}.*not part of its frozen input`));
  const a2 = await assess(d1.decisionId);
  assert.equal(a2.currencyStatus, "POTENTIALLY_STALE");
  assert.equal(checkResult(a2, "NEW_EVIDENCE_ADMITTED"), "CHANGED");
  assert.equal(checkResult(a2, "CAP06_EVALUATION_SUPERSEDED"), "UNCHANGED");
  assert.equal(a2.materialChanges.length, 1);

  // 3. The subject is re-evaluated, through CAP-06
  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.previousEvaluationId = s.e.evaluationId)));
  assert.ok(again.e.evaluatedEvidence.deforestationEvidenceIds.includes(newEvidence));
  const stale2 = await read(d1.decisionId);
  assert.equal(stale2.currencyStatus, "POTENTIALLY_STALE");
  assert.deepEqual(changeTypes(stale2), ["CAP06_EVALUATION_SUPERSEDED", "NEW_EVIDENCE_ADMITTED"]);
  assert.equal(stale2.stalenessReasons!.find((x) => x.changeType === "CAP06_EVALUATION_SUPERSEDED")!.changedEntityId, again.e.evaluationId);

  // the old evaluation can no longer be decided on; the new one must supersede the current decision
  await assertRefused(DECISIONS, decision(s.e, s.digest), 409, "EVALUATION_ALREADY_SUPERSEDED", "reviewer2");
  const unnamed = await assertRefused(DECISIONS, decision(again.e, again.digest), 409, "SUPERSEDES_NOT_CURRENT", "reviewer2");
  assert.match(unnamed[0]!, new RegExp(`current decision is ${d1.decisionId}`));

  // 4. The superseding decision
  const second = await decide(
    decision(again.e, again.digest, (x) => (x.supersedes = { priorDecisionId: d1.decisionId, supersessionReason: "New deforestation evidence was admitted and the subject re-evaluated." })),
    "reviewer2",
  );
  const d2 = second.decision;
  assert.equal(d2.currencyStatus, "CURRENT");
  assert.deepEqual(d2.supersedes, {
    priorDecisionId: d1.decisionId,
    priorEvaluationId: s.e.evaluationId,
    priorDecisionOutcome: PROCEED,
    priorDecidedAt: d1.decidedAt,
    supersessionReason: "New deforestation evidence was admitted and the subject re-evaluated.",
  });
  assert.ok(d2.decisionReasons.some((r) => r.startsWith(`It supersedes decision ${d1.decisionId}`)));
  const read2 = await read(d2.decisionId, "officer");
  assert.deepEqual({ ...read2, currencyLastAssessedAt: d2.currencyLastAssessedAt }, d2);

  // 5. The first decision is now SUPERSEDED — derived; its record is unchanged
  const superseded = await read(d1.decisionId);
  assert.equal(superseded.currencyStatus, "SUPERSEDED");
  assert.equal(superseded.supersededByDecisionId, d2.decisionId);
  assert.equal(superseded.supersededAt, d2.decidedAt);
  assert.deepEqual(changeTypes(superseded), ["CAP06_EVALUATION_SUPERSEDED", "NEW_EVIDENCE_ADMITTED"], "what changed is still reported");
  const a3 = await assess(d1.decisionId);
  assert.equal(a3.currencyStatus, "SUPERSEDED");
  assert.equal(a3.supersededByDecisionId, d2.decisionId);
  const { currencyStatus: _c, currencyLastAssessedAt: _l, stalenessReasons: _r, supersededByDecisionId: _s, supersededAt: _a, ...recorded } = superseded;
  const { currencyStatus: _c1, currencyLastAssessedAt: _l1, stalenessReasons: _r1, ...recorded1 } = d1;
  assert.deepEqual(recorded, recorded1, "everything but the derived currency reads exactly as decided");
  assert.deepEqual((await harness.admin.query(`SELECT * FROM scs.regulatory_review_decision WHERE decision_id = $1`, [d1.decisionId])).rows[0], d1Row);
  assert.deepEqual((await harness.admin.query(`SELECT * FROM scs.review_reasoning_item WHERE decision_id = $1 ORDER BY reasoning_item_id`, [d1.decisionId])).rows, d1Items);
  const receipt1 = (await harness.admin.query(`SELECT receipt, receipt_digest FROM scs.decision_receipt WHERE receipt_id = $1`, [first.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.deepEqual(receipt1["receipt"], first.receipt);
  assert.equal(receipt1["receipt_digest"], first.receiptDigest);

  // every assessment is recorded, attributable, and append-only
  assert.deepEqual(
    (await harness.admin.query(`SELECT currency_status, assessed_by ->> 'actorId' AS by FROM scs.decision_currency_assessment WHERE decision_id = $1 ORDER BY assessed_at`, [d1.decisionId])).rows,
    [
      { currency_status: "CURRENT", by: actors.officer.actorId },
      { currency_status: "POTENTIALLY_STALE", by: actors.reviewer.actorId },
      { currency_status: "SUPERSEDED", by: actors.reviewer.actorId },
    ],
  );

  // the superseded decision cannot be superseded again, and the chain has one current decision
  const third = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  const reasons = await assertRefused(
    DECISIONS,
    decision(third.e, third.digest, (x) => (x.supersedes = { priorDecisionId: d1.decisionId, supersessionReason: "Naming the wrong decision." })),
    409,
    "SUPERSEDES_NOT_CURRENT",
  );
  assert.match(reasons[0]!, new RegExp(`${d1.decisionId} is not the subject's current decision \\(${d2.decisionId}\\)`));
});

test("a conflict resolution recorded after the decision makes it POTENTIALLY_STALE (CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN)", async () => {
  const s = await conflictingSubject();
  const d = (await decide(decision(s.e, s.digest, (x) => (x.decisionOutcome = "REQUIRES_SPECIALIST_REVIEW")))).decision;
  assert.equal(d.currencyStatus, "CURRENT");
  const conflict = s.e.allConflicts[0]!;
  const body: ScsConflictResolutionSubmission = {
    conflictKey: conflict.conflictKey,
    evaluationId: s.e.evaluationId,
    comparedEvidenceIds: [...new Set([conflict.evidenceAId, conflict.evidenceBId])],
    provenanceAndMethodsConsidered: "Compared the sensors, windows and methods of both items.",
    resolutionReason: "The later analysis does not apply to this plot.",
    inapplicableEvidenceId: s.detected,
    additionalEvidenceObtained: false,
    additionalEvidenceIds: [],
    remainingLimitations: [],
    authorityBasis: "Appointed conflict resolver.",
    reEvaluationRequired: true,
  };
  const resolutionId = await created("/scs/v1/conflict-resolutions", body, "resolutionId", "resolver");
  const stale = await read(d.decisionId);
  assert.equal(stale.currencyStatus, "POTENTIALLY_STALE");
  assert.deepEqual(changeTypes(stale), ["CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN"]);
  assert.equal(stale.stalenessReasons![0]!.changedEntityId, resolutionId);
  const a = await assess(d.decisionId);
  assert.equal(checkResult(a, "CONFLICT_RESOLUTION_ADDED_OR_WITHDRAWN"), "CHANGED");
  assert.equal(checkResult(a, "NEW_EVIDENCE_ADMITTED"), "UNCHANGED");
});

test("a decision on an evaluation whose scope has already changed is recorded, and is POTENTIALLY_STALE from the start", async () => {
  const s = await gapsSubject();
  const late = await admitEvidence(s.plot);
  const r = await decide(decision(s.e, s.digest, (x) => (x.decisionOutcome = "REQUIRES_FURTHER_EVIDENCE")));
  assert.equal(r.decision.currencyStatus, "POTENTIALLY_STALE");
  assert.equal(r.receipt.decision.currencyStatus, "POTENTIALLY_STALE", "the receipt records the currency as derived when decided");
  assert.equal(r.decision.stalenessReasons![0]!.changedEntityId, late);
});

// ── Outcomes and reasoning ───────────────────────────────────────────────────

test("OUTCOME_NOT_PERMITTED: PROCEED on CONFLICTING_EVIDENCE or INSUFFICIENT; the other outcomes are permitted", async () => {
  const c = await conflictingSubject();
  const r1 = await assertRefused(DECISIONS, decision(c.e, c.digest, (x) => (x.decisionOutcome = PROCEED)), 422, "OUTCOME_NOT_PERMITTED");
  assert.match(r1[0]!, /CONFLICTING_EVIDENCE evaluation: a conflict is resolved only through a recorded SCS-CAP-06 conflict resolution/);

  const plot = await registerPlot(defOnly);
  const i = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(i.e.overallState, "INSUFFICIENT");
  const r2 = await assertRefused(DECISIONS, decision(i.e, i.digest, (x) => (x.decisionOutcome = PROCEED)), 422, "OUTCOME_NOT_PERMITTED");
  assert.match(r2[0]!, /INSUFFICIENT evaluation: human review cannot cure missing evidence/);
  const d = (await decide(decision(i.e, i.digest, (x) => (x.decisionOutcome = "DO_NOT_PROCEED")))).decision;
  assert.equal(d.decisionOutcome, "DO_NOT_PROCEED");
  assert.ok(!d.decisionReasons.some((x) => x.startsWith(D15)), "the D15 sentence is made only on a PROCEED on gaps");
  assert.ok(d.decisionReasons.includes(PILOT));
});

test("REASONING_INCOMPLETE names every problem: blank text, a gap or unresolved conflict left out, unknown and duplicate entries", async () => {
  const c = await conflictingSubject();
  const [g0, g1] = c.e.allGaps;
  assert.ok(g0 !== undefined && g1 !== undefined, "the evaluation reports at least two gaps");
  const reasons = await assertRefused(
    DECISIONS,
    decision(c.e, c.digest, (x) => {
      x.decisionOutcome = "DO_NOT_PROCEED";
      x.reviewReasoning.evaluationSummaryAssessed = "   ";
      x.reviewReasoning.basisForOutcome = "	";
      x.reviewReasoning.limitationsAcknowledged = [" "];
      x.reviewReasoning.gapsConsidered = [
        { gapId: g0.gapId, assessment: " " },
        { gapId: g0.gapId, assessment: "Again." },
        { gapId: randomUUID(), assessment: "A gap that was never reported." },
      ];
      x.reviewReasoning.conflictsConsidered = [{ conflictKey: "DEF-TEMPORAL-COVERAGE:x:y", assessment: "Unknown." }];
    }),
    400,
    "REASONING_INCOMPLETE",
  );
  const all = reasons.join("\n");
  assert.match(all, /evaluationSummaryAssessed: must not be blank/);
  assert.match(all, /basisForOutcome: must not be blank/);
  assert.match(all, /limitationsAcknowledged\/0: must not be blank/);
  assert.match(all, /gapsConsidered\/0\/assessment: must not be blank/);
  assert.match(all, new RegExp(`gapsConsidered/1: gap ${g0.gapId} is addressed more than once`));
  assert.match(all, /gapsConsidered\/2: the evaluation reports no gap/);
  assert.match(all, new RegExp(`gap ${g1.gapId} \\(${g1.requirementCode}\\) is not addressed`));
  assert.match(all, /conflictsConsidered\/0: the evaluation reports no conflict DEF-TEMPORAL-COVERAGE:x:y/);
  assert.match(all, new RegExp(`unresolved conflict ${c.e.allConflicts[0]!.conflictKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is not addressed`));
  // a missing required field is a schema error, not REASONING_INCOMPLETE
  const bad = await post(DECISIONS, { ...decision(c.e, c.digest), reviewReasoning: { evaluationSummaryAssessed: "x" } }, { who: "reviewer" });
  assert.equal(bad.status, 400);
  assert.equal(bad.json["error"], "REQUEST_VALIDATION_FAILED");
});

// ── The evaluation reviewed ──────────────────────────────────────────────────

test("EVALUATION_DIGEST_MISMATCH: the reviewer reviewed a different version", async () => {
  const s = await gapsSubject();
  const other = sha256Hex(canonicalJson({ ...s.e, overallState: "SUFFICIENT" }));
  const reasons = await assertRefused(DECISIONS, decision(s.e, s.digest, (x) => (x.evaluationSnapshotDigest = other)), 409, "EVALUATION_DIGEST_MISMATCH");
  assert.match(reasons[0]!, new RegExp(`is not the digest of evaluation ${s.e.evaluationId} as recorded \\(${s.digest}\\)`));
});

test("EVALUATION_INTEGRITY_FAILED: a stored result that no longer matches its receipt, or a receipt that no longer hashes to its digest", async () => {
  // simulated tampering: only the table owner, with the append-only triggers disabled, can do this
  const tamper = async (sql: string, table: string, id: string) => {
    await harness.admin.query(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
    try {
      await harness.admin.query(sql, [id]);
    } finally {
      await harness.admin.query(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
    }
  };
  const a = await gapsSubject();
  await tamper(
    `UPDATE scs.sufficiency_evaluation SET result = jsonb_set(result, '{evaluationExplanation,0}', '"Tampered."') WHERE evaluation_id = $1`,
    "scs.sufficiency_evaluation",
    a.e.evaluationId,
  );
  const tampered = (await get(`${EVALUATIONS}/${a.e.evaluationId}`, "reviewer")).json as unknown as ScsSufficiencyEvaluationResult;
  const r1 = await assertRefused(DECISIONS, decision(tampered, sha256Hex(canonicalJson(tampered))), 422, "EVALUATION_INTEGRITY_FAILED");
  assert.match(r1[0]!, /stored result of evaluation .* is not the result its receipt records/);

  const b = await gapsSubject();
  await tamper(
    `UPDATE scs.decision_receipt SET receipt = jsonb_set(receipt, '{issuedAt}', '"2020-01-01T00:00:00.000Z"') WHERE subject_id = $1`,
    "scs.decision_receipt",
    b.e.evaluationId,
  );
  const r2 = await assertRefused(DECISIONS, decision(b.e, b.digest), 422, "EVALUATION_INTEGRITY_FAILED");
  assert.match(r2[0]!, /no longer hashes to its recorded receipt digest/);
});

test("EVALUATION_NOT_FOUND, FRAMEWORK_MISMATCH, OPERATOR_PARTY_NOT_FOUND and REVIEWER_ORGANIZATION_NOT_FOUND", async () => {
  const s = await gapsSubject();
  await assertRefused(DECISIONS, decision(s.e, s.digest, (x) => (x.evaluationId = randomUUID())), 404, "EVALUATION_NOT_FOUND");
  const fm = await assertRefused(
    DECISIONS,
    decision(s.e, s.digest, (x) => {
      x.frameworkId = full.frameworkId;
      x.frameworkVersion = "other";
      x.commodityCode = "1801";
    }),
    422,
    "FRAMEWORK_MISMATCH",
  );
  assert.equal(fm.length, 3, "every mismatch is named");
  const unknown = randomUUID();
  const op = await assertRefused(DECISIONS, decision(s.e, s.digest, (x) => (x.operatorId = unknown)), 422, "OPERATOR_PARTY_NOT_FOUND");
  assert.match(op[0]!, new RegExp(`no SCS-CAP-02 party is registered with partyId ${unknown}`));
  await assertRefused(DECISIONS, decision(s.e, s.digest, (x) => (x.reviewer.reviewerOrganizationId = unknown)), 422, "REVIEWER_ORGANIZATION_NOT_FOUND");
});

test("OPERATOR_MISMATCH: a custody evaluation names its operator, and the decision must name the same one", async () => {
  const plot = await registerPlot(full);
  await admitEvidence(plot);
  const batch = `B-${randomUUID()}`;
  await admitCustody(batch);
  const ev = await evaluate(evaluationRequest(full, [plot.plotId], (x) => {
    x.subject.batchIdentifiers = [batch];
    x.subject.operatorPartyId = coop;
  }));
  assert.equal(ev.e.operatorPartyId, coop);
  const reasons = await assertRefused(DECISIONS, decision(ev.e, ev.digest, (x) => (x.operatorId = farmer)), 422, "OPERATOR_MISMATCH");
  assert.match(reasons[0]!, new RegExp(`${farmer} is not the operator of evaluation ${ev.e.evaluationId} \\(${coop}\\)`));
  const d = (await decide(decision(ev.e, ev.digest, (x) => (x.decisionOutcome = "REQUIRES_FURTHER_EVIDENCE")))).decision;
  assert.equal(d.operatorId, coop);
});

// ── Authority and independence ───────────────────────────────────────────────

test("without REGULATORY_REVIEWER → 403 REVIEWER_NOT_AUTHORISED, before the evaluation is looked up", async () => {
  const s = await gapsSubject();
  for (const who of ["officer", "resolver", "viewer"] as const) {
    await assertRefused(DECISIONS, decision(s.e, s.digest), 403, "REVIEWER_NOT_AUTHORISED", who);
  }
  const reasons = await assertRefused(DECISIONS, decision(s.e, s.digest, (x) => (x.evaluationId = randomUUID())), 403, "REVIEWER_NOT_AUTHORISED", "officer");
  assert.match(reasons[0]!, /requires the REGULATORY_REVIEWER role/);
});

test("independence: the evaluation's requester cannot review it, even holding REGULATORY_REVIEWER", async () => {
  const plot = await registerPlot(defOnly);
  await admitEvidence(plot);
  const ev = await evaluate(evaluationRequest(defOnly, [plot.plotId]), "requesterReviewer");
  const reasons = await assertRefused(DECISIONS, decision(ev.e, ev.digest), 403, "REVIEWER_NOT_AUTHORISED", "requesterReviewer");
  assert.match(reasons[0]!, new RegExp(`requested evaluation ${ev.e.evaluationId} and cannot review it`));
  await decide(decision(ev.e, ev.digest));
});

test("independence: the resolver of a conflict resolution the evaluation applied cannot review it", async () => {
  const s = await conflictingSubject();
  const conflict = s.e.allConflicts[0]!;
  const resolutionId = await created(
    "/scs/v1/conflict-resolutions",
    {
      conflictKey: conflict.conflictKey,
      evaluationId: s.e.evaluationId,
      comparedEvidenceIds: [...new Set([conflict.evidenceAId, conflict.evidenceBId])],
      provenanceAndMethodsConsidered: "Compared both items.",
      resolutionReason: "The later analysis does not apply to this plot.",
      inapplicableEvidenceId: s.detected,
      additionalEvidenceObtained: false,
      additionalEvidenceIds: [],
      remainingLimitations: [],
      authorityBasis: "Appointed conflict resolver.",
      reEvaluationRequired: true,
    },
    "resolutionId",
    "resolverReviewer",
  );
  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  assert.deepEqual(again.e.evaluatedEvidence.appliedResolutionIds, [resolutionId]);
  const reasons = await assertRefused(DECISIONS, decision(again.e, again.digest), 403, "REVIEWER_NOT_AUTHORISED", "resolverReviewer");
  assert.match(reasons[0]!, new RegExp(`recorded conflict resolution ${resolutionId}, which evaluation ${again.e.evaluationId} applied`));
  // resolved conflicts may be addressed but need not be
  await decide(decision(again.e, again.digest, (x) => (x.reviewReasoning.conflictsConsidered = [])));
});

// ── Once only and supersession ───────────────────────────────────────────────

test("DECISION_ALREADY_RECORDED, and SUPERSEDES_NOT_CURRENT when the subject has no decision to supersede", async () => {
  const s = await gapsSubject();
  const named = await assertRefused(
    DECISIONS,
    decision(s.e, s.digest, (x) => (x.supersedes = { priorDecisionId: randomUUID(), supersessionReason: "Nothing to supersede." })),
    409,
    "SUPERSEDES_NOT_CURRENT",
  );
  assert.match(named[0]!, /the subject has no decision/);
  const d = (await decide(decision(s.e, s.digest))).decision;
  const reasons = await assertRefused(DECISIONS, decision(s.e, s.digest), 409, "DECISION_ALREADY_RECORDED", "reviewer2");
  assert.match(reasons[0]!, new RegExp(`already decided by ${d.decisionId}`));
});

// ── Reading and assessing ────────────────────────────────────────────────────

test("getDecision and assessCurrency: REGULATORY_REVIEWER or COMPLIANCE_OFFICER only; an unknown decision is DECISION_NOT_FOUND", async () => {
  const s = await gapsSubject();
  const d = (await decide(decision(s.e, s.digest))).decision;
  await read(d.decisionId, "officer");
  await read(d.decisionId.toUpperCase(), "reviewer2");
  for (const who of ["resolver", "viewer"] as const) {
    const r = await get(`${DECISIONS}/${d.decisionId}`, who);
    assert.equal(r.status, 403);
    assert.equal(r.json["error"], "REVIEWER_NOT_AUTHORISED");
    await assertRefused(assessPath(d.decisionId), {}, 403, "REVIEWER_NOT_AUTHORISED", who);
  }
  const unknown = randomUUID();
  const r = await get(`${DECISIONS}/${unknown}`);
  assert.equal(r.status, 404);
  assert.equal(r.json["error"], "DECISION_NOT_FOUND");
  await assertRefused(assessPath(unknown), {}, 404, "DECISION_NOT_FOUND");
  const bad = await get(`${DECISIONS}/not-a-uuid`);
  assert.equal(bad.status, 400);
  // reading writes nothing
  const before = await totals();
  await read(d.decisionId);
  assert.deepEqual(await totals(), before);
});

// ── Idempotency and rollback ─────────────────────────────────────────────────

test("same key, same content → byte-identical 201 replay; nothing new is recorded (decision and assessment)", async () => {
  const s = await gapsSubject();
  const body = decision(s.e, s.digest);
  const key = `cap09-${randomUUID()}`;
  const first = await post(DECISIONS, body, { key, who: "reviewer" });
  const before = await totals();
  const second = await post(DECISIONS, body, { key, who: "reviewer" });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before);

  const decisionId = (first.json["decision"] as { decisionId: string }).decisionId;
  const akey = `cap09-${randomUUID()}`;
  const a1 = await post(assessPath(decisionId), {}, { key: akey, who: "reviewer" });
  const afterFirst = await totals();
  const a2 = await post(assessPath(decisionId), {}, { key: akey, who: "reviewer" });
  assert.equal(a1.status, 201);
  assert.equal(a2.text, a1.text);
  assert.equal(a2.headers.get("idempotent-replayed"), "true");
  assert.deepEqual(await totals(), afterFirst);
});

test("receipt write fails → 500; no decision or reasoning is recorded, and the evaluation can still be decided", async () => {
  const s = await gapsSubject();
  const body = decision(s.e, s.digest);
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(DECISIONS, body, { who: "reviewer" });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  await decide(body);
});
