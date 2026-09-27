// SCS-CAP-06 POST /scs/v1/conflict-resolutions, and how a resolution changes a
// later evaluation (contract e0b7634), end to end: real HTTP, real PostgreSQL,
// the API connected as a restricted member of scs_api. Every conflict is
// produced by a real evaluation over evidence admitted through the CAP-04 and
// CAP-05 endpoints, resolved through the endpoint under test, and then
// re-evaluated — the full cycle.

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
import type {
  ScsConflictResolutionResponse,
  ScsConflictResolutionSubmission,
  ScsSufficiencyEvaluationResponse,
  ScsSufficiencyEvaluationResult,
  ScsSufficiencyEvaluationSubmission,
} from "../types/cap-06.js";
import { frameworkRequest, issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap06r-officer-token-0123456789abcdefg",
  verifier: "cap06r-verifier-token-0123456789abcdef",
  resolver: "cap06r-resolver-token-0123456789abcdef",
  dual: "cap06r-dual-token-0123456789abcdefghijk",
  viewer: "cap06r-viewer-token-0123456789abcdefghi",
};
const actors = {
  officer: { actorId: "officer-cap06r", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap06r", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  resolver: { actorId: "resolver-cap06r", actorType: "HUMAN", roles: ["CONFLICT_RESOLVER"], authenticationMethod: "STATIC_TOKEN" },
  dual: { actorId: "dual-cap06r", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER", "CONFLICT_RESOLVER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap06r", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;
type Who = keyof typeof TOKENS;

const EVALUATIONS = "/scs/v1/sufficiency-evaluations";
const RESOLUTIONS = "/scs/v1/conflict-resolutions";
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let coop = "";
interface Framework { frameworkId: string; regulationVersion: string; specId: string }
let full: Framework;
let defOnly: Framework;

async function post(path: string, body: unknown, opts: { key?: string | null; who?: Who } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap06r-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

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
async function admitEvidence(
  plot: { plotId: string; associationId: string },
  opts: { claim?: string; period?: [string, string] } = {},
): Promise<string> {
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

/** Admits a custody event of `batch` under the full framework; `edit` changes the request. */
async function admitCustody(batch: string, edit: (r: Record<string, unknown>) => void, who: Who = "officer"): Promise<string> {
  const objectId = await storedObject();
  const body: Record<string, unknown> = {
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
  };
  edit(body);
  return created("/scs/v1/custody-events", body, "eventId", who);
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

async function evaluate(body: ScsSufficiencyEvaluationSubmission): Promise<ScsSufficiencyEvaluationResult> {
  const r = await post(EVALUATIONS, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsSufficiencyEvaluationResponse;
  const checked = runWithCorrelation("cap06r-eval-schema", () => validate("SCS-CAP-06", SCHEMAS.cap06SufficiencyEvaluationResponse, res));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
  return res.decision;
}

function resolution(e: ScsSufficiencyEvaluationResult, edit: (r: ScsConflictResolutionSubmission) => void = () => {}): ScsConflictResolutionSubmission {
  const c = e.allConflicts[0]!;
  const r: ScsConflictResolutionSubmission = {
    conflictKey: c.conflictKey,
    evaluationId: e.evaluationId,
    comparedEvidenceIds: [...new Set([c.evidenceAId, c.evidenceBId])],
    provenanceAndMethodsConsidered: "Compared the sensors, analysis windows, cloud masks and methods of both items.",
    resolutionReason: "The later analysis applied a mask that excluded this plot's area; it does not apply to this plot.",
    additionalEvidenceObtained: false,
    additionalEvidenceIds: [],
    remainingLimitations: ["No field verification was carried out."],
    authorityBasis: "Appointed conflict resolver under the operator's due diligence procedure.",
    reEvaluationRequired: true,
  };
  edit(r);
  return r;
}

async function resolve(body: ScsConflictResolutionSubmission, who: Who = "resolver") {
  const r = await post(RESOLUTIONS, body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsConflictResolutionResponse;
  const checked = runWithCorrelation("cap06r-res-schema", () => validate("SCS-CAP-06", SCHEMAS.cap06ConflictResolutionResponse, res));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["decision_type"], "CONFLICT_RESOLUTION");
  assert.equal(receipt["decision"], "RESOLVED");
  assert.equal(receipt["subject_id"], res.decision.resolutionId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  return res.decision;
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  resolutions: await count("SELECT count(*) AS n FROM scs.conflict_resolution"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});

async function assertRefused(body: unknown, status: number, error: string, who: Who = "resolver") {
  const before = await totals();
  const key = `cap06r-${randomUUID()}`;
  const r = await post(RESOLUTIONS, body, { key, who });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-06");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r;
}

const stateOf = (d: ScsSufficiencyEvaluationResult, code: string) => d.requirementEvaluations.find((r) => r.requirementCode === code)!.state;

/** A plot with a full-period "no deforestation" item and an overlapping "deforestation detected" item: a conflict. */
async function conflictingPlot() {
  const plot = await registerPlot(defOnly);
  const none = await admitEvidence(plot);
  const detected = await admitEvidence(plot, { claim: "DEFORESTATION_DETECTED", period: ["2022-01-01T00:00:00Z", "2024-01-01T00:00:00Z"] });
  const first = await evaluate(evaluationRequest(defOnly, [plot.plotId]));
  assert.equal(first.overallState, "CONFLICTING_EVIDENCE");
  return { plot, none, detected, first };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Who[]).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  }, { issuerCountry: "TH" });
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

// ── The full cycle ───────────────────────────────────────────────────────────

test("full cycle: conflict → resolution (adverse item inapplicable) → re-evaluation MATERIAL_RESOLVED, recomputed, disclosed", async () => {
  const s = await conflictingPlot();
  const firstStored = (await harness.admin.query(`SELECT result FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [s.first.evaluationId])).rows[0];
  const key = s.first.allConflicts[0]!.conflictKey;

  const r = await resolve(resolution(s.first, (x) => (x.inapplicableEvidenceId = s.detected)));
  assert.equal(r.conflictKey, key);
  assert.deepEqual(r.reviewer, issuedReference(actors.resolver));
  assert.equal(r.inapplicableEvidenceId, s.detected);

  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId], (x) => (x.previousEvaluationId = s.first.evaluationId)));
  const c = again.allConflicts.find((x) => x.conflictKey === key)!;
  assert.equal(c.materiality, "MATERIAL_RESOLVED");
  assert.equal(c.resolutionStatus, "RESOLVED");
  assert.equal(c.resolutionDecisionId, r.resolutionId);
  assert.match(c.explanation, new RegExp(`Resolved by ${r.resolutionId}, recorded .* for the conflict first found in evaluation ${s.first.evaluationId}; ${s.detected} was found inapplicable`));
  assert.match(c.explanation, /Remaining limitations: No field verification was carried out\./);
  assert.equal(again.hasMaterialUnresolvedConflicts, false);
  assert.equal(stateOf(again, "DEF-TEMPORAL-COVERAGE"), "SATISFIED", "the adverse item is set aside; the remaining evidence covers the period");
  assert.equal(again.overallState, "GAPS_REQUIRE_HUMAN_DECISION", "only the pilot's own limits remain");
  assert.ok(!again.nextSteps.some((n) => n.stepType === "RESOLVE_CONFLICT"));
  // the frozen input and the disclosure
  assert.deepEqual(again.evaluatedEvidence.appliedResolutionIds, [r.resolutionId]);
  assert.deepEqual(again.evaluatedEvidence.deforestationEvidenceIds.sort(), [s.none, s.detected].sort(), "the set-aside item stays in the manifest");
  assert.ok(again.evaluationExplanation.includes(
    `Applied conflict resolution ${r.resolutionId} to conflict ${key}, first found in evaluation ${s.first.evaluationId}: ${s.detected} was found inapplicable and is set aside for that requirement. Remaining limitations: No field verification was carried out.`,
  ));
  assert.equal(await count(`SELECT count(*) AS n FROM scs.sufficiency_evaluation_resolution WHERE evaluation_id = $1 AND resolution_id = $2`, [again.evaluationId, r.resolutionId]), 1);
  // the original evaluation is unchanged
  assert.deepEqual((await harness.admin.query(`SELECT result FROM scs.sufficiency_evaluation WHERE evaluation_id = $1`, [s.first.evaluationId])).rows[0], firstStored);
  // and the same input still gives the same result
  const third = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  assert.deepEqual(third.allConflicts, again.allConflicts);
  assert.deepEqual(third.requirementEvaluations, again.requirementEvaluations);
});

test("the 'no deforestation' item found inapplicable: the adverse finding stands, and its coverage is lost → INSUFFICIENT", async () => {
  const s = await conflictingPlot();
  await resolve(resolution(s.first, (x) => (x.inapplicableEvidenceId = s.none)));
  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  assert.equal(again.overallState, "INSUFFICIENT");
  assert.equal(stateOf(again, "DEF-TEMPORAL-COVERAGE"), "UNSATISFIED");
  assert.ok(again.evaluationExplanation.some((x) => x.includes(`Adverse finding: evidence ${s.detected} reports DEFORESTATION_DETECTED`)));
  assert.ok(again.temporalCoverage[0]!.uncoveredIntervals.length > 0, "the set-aside item no longer supports coverage");
});

test("no item found inapplicable: the conflict is resolved but both stand — the adverse claim is still an adverse finding", async () => {
  const s = await conflictingPlot();
  const r = await resolve(resolution(s.first));
  const again = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  assert.equal(again.allConflicts[0]!.resolutionStatus, "RESOLVED");
  assert.equal(again.hasMaterialUnresolvedConflicts, false);
  assert.equal(again.overallState, "INSUFFICIENT", "a human reconciling two sources cannot make detected deforestation disappear");
  assert.ok(again.evaluationExplanation.some((x) => x.includes("a recorded resolution did not find it inapplicable: a human reconciling two sources cannot make detected deforestation disappear")));
  assert.ok(again.evaluationExplanation.some((x) => x.startsWith(`Applied conflict resolution ${r.resolutionId}`) && x.includes("neither item was found inapplicable, so both stand")));
});

test("custody self-conflict: its submitter cannot resolve it; another resolver can, and the chain is then continuous", async () => {
  const plot = await registerPlot(full);
  await admitEvidence(plot);
  const batch = `LOT-${randomUUID()}`;
  const event = await admitCustody(batch, (b) => {
    (b["commodity"] as Record<string, unknown>)["sourcePlotIds"] = [plot.plotId];
    b["contradictions"] = ["The weight ticket says 118 kg; the receipt says 120 kg."];
  }, "dual");
  const body = evaluationRequest(full, [plot.plotId], (x) => ((x.subject.batchIdentifiers = [batch]), (x.subject.operatorPartyId = coop)));
  const first = await evaluate(body);
  assert.equal(first.overallState, "CONFLICTING_EVIDENCE");
  const c = first.allConflicts[0]!;
  assert.equal(c.conflictKey, `CUSTODY-CHAIN-CONTINUITY:${event}:${event}`);
  // independence: the dual-role actor submitted the event
  const refused = await assertRefused(resolution(first), 403, "RESOLVER_NOT_AUTHORISED", "dual");
  assert.deepEqual(refused.json["reasons"], [`Actor dual-cap06r submitted ${event}, one of the items in conflict, and cannot resolve the conflict.`]);
  // another resolver passes: one submitter is easy to be independent of
  const r = await resolve(resolution(first, (x) => (x.comparedEvidenceIds = [event])));
  const again = await evaluate({ ...body, previousEvaluationId: first.evaluationId });
  assert.equal(stateOf(again, "CUSTODY-CHAIN-CONTINUITY"), "SATISFIED");
  assert.equal(again.overallState, "GAPS_REQUIRE_HUMAN_DECISION");
  assert.deepEqual(again.evaluatedEvidence.appliedResolutionIds, [r.resolutionId]);
  assert.deepEqual(again.custodyChain![0]!.conflictIds, [c.conflictId]);
});

test("a custody event found inapplicable leaves the chain: the event that cites it shows a break", async () => {
  const plot = await registerPlot(full);
  await admitEvidence(plot);
  const batch = `LOT-${randomUUID()}`;
  const purchase = await admitCustody(batch, (b) => {
    (b["commodity"] as Record<string, unknown>)["sourcePlotIds"] = [plot.plotId];
    b["contradictions"] = ["The receipt is dated after the weighing."];
  });
  await admitCustody(batch, (b) => {
    b["eventType"] = "WEIGHING";
    b["sourceParty"] = { partyId: coop, partyRoleAtEvent: "AGGREGATOR" };
    b["destinationParty"] = { partyId: coop, partyRoleAtEvent: "OTHER" };
    b["predecessorEventIds"] = [purchase];
    b["quantity"] = { amount: 118, unit: "KG", measurementMethod: "Calibrated platform scale" };
    (b["supportingDocument"] as Record<string, unknown>)["documentType"] = "WEIGHT_TICKET";
  });
  const body = evaluationRequest(full, [plot.plotId], (x) => ((x.subject.batchIdentifiers = [batch]), (x.subject.operatorPartyId = coop)));
  const first = await evaluate(body);
  assert.equal(first.overallState, "CONFLICTING_EVIDENCE");
  await resolve(resolution(first, (x) => ((x.comparedEvidenceIds = [purchase]), (x.inapplicableEvidenceId = purchase))));
  const again = await evaluate(body);
  assert.equal(again.hasMaterialUnresolvedConflicts, false);
  assert.equal(stateOf(again, "CUSTODY-CHAIN-CONTINUITY"), "UNSATISFIED");
  assert.equal(again.custodyChain![0]!.chainAssessment, "BROKEN");
  assert.ok(again.custodyChain![0]!.breaks.some((b) => b.explanation.includes(`which a recorded resolution found inapplicable: it cannot support the chain`)));
  assert.ok(!again.custodyChain![0]!.eventIds.includes(purchase), "the set-aside event is not part of the chain");
  assert.ok(again.evaluatedEvidence.custodyEventIds.includes(purchase), "but it stays in the manifest");
  assert.equal(again.overallState, "INSUFFICIENT");
});

// ── Refusals ─────────────────────────────────────────────────────────────────

test("without CONFLICT_RESOLVER → 403 RESOLVER_NOT_AUTHORISED, before the conflict is looked up", async () => {
  const s = await conflictingPlot();
  for (const who of ["officer", "viewer", "verifier"] as const) {
    const r = await assertRefused(resolution(s.first), 403, "RESOLVER_NOT_AUTHORISED", who);
    assert.deepEqual(r.json["reasons"], [`Resolving a conflict requires the CONFLICT_RESOLVER role; actor ${actors[who].actorId} does not hold it.`]);
  }
  await assertRefused(resolution(s.first, (x) => (x.evaluationId = randomUUID())), 403, "RESOLVER_NOT_AUTHORISED", "officer");
});

test("EVALUATION_NOT_FOUND and CONFLICT_NOT_FOUND", async () => {
  const s = await conflictingPlot();
  await assertRefused(resolution(s.first, (x) => (x.evaluationId = randomUUID())), 404, "EVALUATION_NOT_FOUND");
  const ids = [randomUUID(), randomUUID()].sort();
  const r = await assertRefused(resolution(s.first, (x) => ((x.conflictKey = `DEF-TEMPORAL-COVERAGE:${ids[0]}:${ids[1]}`), (x.comparedEvidenceIds = ids))), 404, "CONFLICT_NOT_FOUND");
  assert.match((r.json["reasons"] as string[])[0]!, /reported no conflict under key/);
});

test("a conflict key is resolved once → 409 CONFLICT_ALREADY_RESOLVED, even through a later evaluation", async () => {
  const s = await conflictingPlot();
  const r = await resolve(resolution(s.first));
  await assertRefused(resolution(s.first), 409, "CONFLICT_ALREADY_RESOLVED");
  const later = await evaluate(evaluationRequest(defOnly, [s.plot.plotId]));
  const again = await assertRefused(resolution(later), 409, "CONFLICT_ALREADY_RESOLVED");
  assert.deepEqual(again.json["reasons"], [`Conflict ${s.first.allConflicts[0]!.conflictKey} is already resolved by ${r.resolutionId}. Revising a resolution is not defined (contract gap).`]);
});

test("RESOLUTION_INCOMPLETE names every cross-field problem; a missing field is a schema error", async () => {
  const s = await conflictingPlot();
  const ghost = randomUUID();
  const r = await assertRefused(
    resolution(s.first, (x) => {
      x.comparedEvidenceIds = [s.none];
      x.inapplicableEvidenceId = randomUUID();
      x.additionalEvidenceObtained = true;
      x.additionalEvidenceIds = [ghost];
    }),
    400,
    "RESOLUTION_INCOMPLETE",
  );
  const reasons = r.json["reasons"] as string[];
  assert.equal(reasons.length, 3, JSON.stringify(reasons));
  assert.match(reasons[0]!, /^\/comparedEvidenceIds: must be exactly the conflict's items/);
  assert.match(reasons[1]!, /^\/inapplicableEvidenceId: .* is not one of the conflict's items/);
  assert.equal(reasons[2], `/additionalEvidenceIds: ${ghost} is not an admitted SCS-CAP-04 record or SCS-CAP-05 event.`);
  const mismatch = await assertRefused(resolution(s.first, (x) => (x.additionalEvidenceObtained = true)), 400, "RESOLUTION_INCOMPLETE");
  assert.deepEqual(mismatch.json["reasons"], ["/additionalEvidenceObtained: must be false when 0 additional evidence id(s) are listed."]);
  // additional evidence that is admitted is accepted
  const extra = await admitEvidence(s.plot);
  await resolve(resolution(s.first, (x) => ((x.additionalEvidenceObtained = true), (x.additionalEvidenceIds = [extra]))));
  const noReason = { ...resolution(s.first) } as Partial<ScsConflictResolutionSubmission>;
  delete noReason.resolutionReason;
  const bad = await post(RESOLUTIONS, noReason, { who: "resolver" });
  assert.equal(bad.status, 400);
  assert.equal(bad.json["error"], "REQUEST_VALIDATION_FAILED");
});

// ── Idempotency and rollback ─────────────────────────────────────────────────

test("same key, same content → byte-identical 201 replay; nothing new is recorded", async () => {
  const s = await conflictingPlot();
  const body = resolution(s.first);
  const key = `cap06r-${randomUUID()}`;
  const first = await post(RESOLUTIONS, body, { key, who: "resolver" });
  const before = await totals();
  const second = await post(RESOLUTIONS, body, { key, who: "resolver" });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before);
});

test("receipt write fails → 500; no resolution is recorded, and the conflict can still be resolved", async () => {
  const s = await conflictingPlot();
  const body = resolution(s.first);
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(RESOLUTIONS, body, { who: "resolver" });
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  await resolve(body);
});
