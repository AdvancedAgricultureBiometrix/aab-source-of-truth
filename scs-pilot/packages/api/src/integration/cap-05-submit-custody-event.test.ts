// SCS-CAP-05 POST /scs/v1/custody-events, end to end: real HTTP through the
// server layer, real PostgreSQL (database built from every migration), the API
// connected as a restricted member of scs_api. Parties, verifications,
// relationships, mandates, frameworks and plots are registered through their
// own endpoints. Stored documents are inserted as SCS-PLATFORM-01 rows
// directly: CAP-05 reads the row, never the object store, so no MinIO is
// needed here. Lifecycle states no endpoint can reach yet (a RETIRED plot or
// party, a SUPERSEDED framework, a REVOKED mandate) are set by SQL as the
// owner.

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
import type { ScsCustodyEventAdmissionDecision, ScsCustodyEventAdmissionResponse, ScsCustodyEventSubmissionRequest } from "../types/cap-05.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  officer: "cap05-officer-token-0123456789abcdefgh",
  verifier: "cap05-verifier-token-0123456789abcdefg",
  admin: "cap05-sysadmin-token-0123456789abcdefg",
  viewer: "cap05-viewer-token-0123456789abcdefghij",
};
const actors = {
  officer: { actorId: "officer-cap05", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap05", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  admin: { actorId: "sysadmin-cap05", actorType: "HUMAN", roles: ["SYSTEM_ADMIN"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap05", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const EVENTS = "/scs/v1/custody-events";
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
/** Verified parties: a smallholder and the cooperative that buys from them. */
let farmer = "";
let coop = "";
let unverified = "";
let retiredParty = "";
let rubber = "";
let plotId = "";
let validMandate = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: keyof typeof TOKENS } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "officer"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap05-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

async function created(path: string, body: unknown, idField: string, who: keyof typeof TOKENS = "officer"): Promise<string> {
  const r = await post(path, body, { who });
  assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.json)}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}

/** A party with one identity evidence id linked at registration, and optionally an assessment recorded by the verifier. */
async function registerParty(
  type: Parameters<typeof partyRequest>[0],
  assessment?: { verificationStatus: string; verifiedAt?: string; expiresAt?: string },
): Promise<{ partyId: string; evidence: string }> {
  const evidence = randomUUID();
  const partyId = await created("/scs/v1/parties", { ...partyRequest(type), identityEvidence: { evidenceIds: [evidence], evidenceLimitations: [] } }, "partyId");
  if (assessment !== undefined) await recordAssessment(partyId, evidence, assessment);
  return { partyId, evidence };
}

function recordAssessment(partyId: string, evidence: string, a: { verificationStatus: string; verifiedAt?: string; expiresAt?: string; supersedesAssessmentId?: string }) {
  return created(
    `/scs/v1/parties/${partyId}/verifications`,
    {
      verificationStatus: a.verificationStatus,
      verificationScope: { scopeDescription: "Legal name", jurisdictionCode: "TH", verifiedAttributes: ["legal name"], excludedFromVerification: ["land title"] },
      verifyingAuthority: { authorityId: "TH-DOPA", authorityName: "Department of Provincial Administration", authorityBasis: "Registry check", jurisdictionCode: "TH" },
      verifiedAt: a.verifiedAt ?? "2026-03-01T00:00:00Z",
      ...(a.expiresAt === undefined ? {} : { expiresAt: a.expiresAt }),
      ...(a.supersedesAssessmentId === undefined ? {} : { supersedesAssessmentId: a.supersedesAssessmentId }),
      evidenceIds: [evidence],
      limitations: [],
    },
    "assessmentId",
    "verifier",
  );
}

const verified = async (type: Parameters<typeof partyRequest>[0]) => (await registerParty(type, { verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE" })).partyId;

async function registerFramework(): Promise<string> {
  return created("/scs/v1/frameworks", frameworkRequest(), "frameworkId");
}

async function registerPlot(): Promise<string> {
  return created(
    "/scs/v1/plots",
    {
      plot: {
        countryCode: "TH",
        geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
        identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
        sourceType: "field survey",
      },
      tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    },
    "plotId",
  );
}

/** A mandate granted by `granting` to `representative` (with the relationship it needs, when `withRelationship`). */
async function registerMandate(granting: string, representative: string, overrides: Record<string, unknown> = {}, withRelationship = true): Promise<string> {
  if (withRelationship) {
    await created(
      "/scs/v1/relationships",
      {
        fromPartyId: granting,
        toPartyId: representative,
        relationshipType: "SUPPLIES_TO",
        commodityScope: ["4001"],
        geographicScope: ["TH"],
        frameworkAssociationIds: [rubber],
        claimedByPartyId: granting,
        relationshipEvidenceIds: [],
      },
      "relationshipId",
    );
  }
  return created(
    "/scs/v1/mandates",
    {
      grantingPartyId: granting,
      representativePartyId: representative,
      permittedActions: ["SUBMIT_CUSTODY_EVIDENCE"],
      frameworkAssociationIds: [rubber],
      commodityScope: ["4001"],
      geographicScope: ["TH"],
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: "2027-01-01T00:00:00Z",
      mandateEvidenceIds: [randomUUID()],
      ...overrides,
    },
    "mandateId",
  );
}

/** Inserts an SCS-PLATFORM-01 evidence object row for fresh random bytes; returns its SHA-256 (the objectId). */
async function storedObject(): Promise<string> {
  const digest = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, $2)`,
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
  rubber = await registerFramework();
  farmer = await verified("NATURAL_PERSON");
  coop = await verified("COOPERATIVE");
  unverified = (await registerParty("LEGAL_ENTITY")).partyId;
  retiredParty = await seedRetiredParty();
  plotId = await registerPlot();
  validMandate = await registerMandate(farmer, coop);
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Req = ScsCustodyEventSubmissionRequest;

/**
 * A fully documented farm-gate purchase that is admitted without limitation:
 * 120 kg of cup lump rubber from a verified smallholder to a verified
 * cooperative, from one registered plot, weighed on a calibrated scale, with a
 * stored receipt whose digest matches. `objectId` null cites no stored object.
 */
function eventRequest(objectId: string | null, edit: (r: Req) => void = () => {}): Req {
  const r: Req = {
    frameworkAssociationId: rubber,
    eventType: "PURCHASE",
    sourceParty: { partyId: farmer, partyRoleAtEvent: "SUPPLIER" },
    destinationParty: { partyId: coop, partyRoleAtEvent: "AGGREGATOR" },
    commodity: { commodityCode: "4001", commodityName: "Natural rubber (cup lump)", sourcePlotIds: [plotId], sourcePlotIdsComplete: true, batchIdentifier: `LOT-${randomUUID()}` },
    quantity: { amount: 120, unit: "KG", measurementMethod: "Calibrated platform scale" },
    eventLocation: { countryCode: "TH", administrativeArea: "Rayong", facilityName: "Ban Khai collection point" },
    eventTime: { eventDate: "2026-06-30", timePrecision: "DATE_ONLY" },
    predecessorEventIds: [],
    successorEventIds: [],
    supportingDocument: {
      ...(objectId === null ? {} : { objectId }),
      documentId: `RCPT-${randomUUID().slice(0, 8)}`,
      documentType: "PURCHASE_RECEIPT",
      documentReference: "Cooperative purchase receipt book, page 12",
      documentDate: "2026-06-30",
      contentDigest: objectId ?? randomDigest(),
    },
    chainOfCustodyComplete: true,
    uncertainties: [],
    contradictions: [],
    knownGaps: [],
  };
  edit(r);
  return r;
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const totals = async () => ({
  events: await count("SELECT count(*) AS n FROM scs.custody_event"),
  plots: await count("SELECT count(*) AS n FROM scs.custody_event_source_plot"),
  links: await count("SELECT count(*) AS n FROM scs.custody_event_link"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});
const eventRow = async (eventId: string) => (await harness.admin.query(`SELECT * FROM scs.custody_event WHERE event_id = $1`, [eventId])).rows[0] as Record<string, unknown>;
const linksOf = async (eventId: string) =>
  (await harness.admin.query(`SELECT link_type, cited_event_id, linked_event_id FROM scs.custody_event_link WHERE event_id = $1 ORDER BY link_type, cited_event_id`, [eventId])).rows;

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(body: unknown, status: number, error: string, opts: { who?: keyof typeof TOKENS } = {}) {
  const before = await totals();
  const key = `cap05-${randomUUID()}`;
  const r = await post(EVENTS, body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-05");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.equal(r.json["noEventAdmitted"], true);
  assert.deepEqual(await totals(), before);
  assert.equal(await count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]), 0);
  return r;
}

/** Posts an event that must be admitted; returns the decision after checking the response schema, receipt and record. */
async function admitOk(body: Req): Promise<ScsCustodyEventAdmissionDecision> {
  const r = await post(EVENTS, body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const res = r.json as unknown as ScsCustodyEventAdmissionResponse;
  const checked = runWithCorrelation("cap05-test-schema", () => validate("SCS-CAP-05", SCHEMAS.cap05CustodyEventAdmissionResponse, res));
  assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);
  const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
  assert.equal(receipt["capability_id"], "SCS-CAP-05");
  assert.equal(receipt["decision_type"], "CUSTODY_EVENT_ADMISSION");
  assert.equal(receipt["subject_id"], res.decision.eventId);
  assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
  assert.deepEqual(res.receipt.decision, res.decision);

  const d = res.decision;
  const row = await eventRow(d.eventId);
  assert.equal(row["admission_status"], d.decision);
  assert.deepEqual(row["admission_limitation_codes"], d.limitationCodes);
  assert.deepEqual(row["admission_limitations"], d.limitations);
  assert.equal(d.decision, d.limitationCodes.length > 0 ? "ADMITTED_WITH_LIMITATIONS" : "ADMITTED");
  assert.deepEqual(d.authorityBoundary, {
    admissionIsNotSufficiency: true,
    admittedEventDoesNotProveChainContinuity: true,
    admittedEventDoesNotVerifyPartyIdentity: true,
    admittedEventDoesNotConstituteLegalCompliance: true,
  });
  return d;
}

const codesOf = async (body: Req) => (await admitOk(body)).limitationCodes;

// ── Plain admission ──────────────────────────────────────────────────────────

test("fully documented event between verified parties with a stored, matching document → 201 plain ADMITTED, no limitation", async () => {
  const objectId = await storedObject();
  const body = eventRequest(objectId);
  const d = await admitOk(body);
  assert.equal(d.decision, "ADMITTED");
  assert.deepEqual(d.limitationCodes, []);
  assert.deepEqual(d.limitations, []);
  assert.deepEqual(d.decisionReasons, []);
  assert.ok(Object.values(d.admissionChecks).every((v) => v === true), JSON.stringify(d.admissionChecks));
  assert.equal(d.frameworkAssociationId, rubber);
  assert.deepEqual(d.decidedBy, actors.officer);

  const row = await eventRow(d.eventId);
  const spec = (await harness.admin.query(`SELECT evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`, [rubber])).rows[0]!;
  assert.equal(row["framework_id"], rubber);
  assert.equal(row["evidence_requirement_spec_id"], spec["evidence_spec_id"], "spec id from the framework");
  assert.equal(row["source_party_version"], 1);
  assert.equal(row["destination_party_version"], 1);
  assert.equal(row["integrity_status"], "VERIFIED");
  assert.equal(row["evidence_object_sha256"], objectId);
  assert.equal(row["quantity_unit"], "KG");
  assert.equal(row["batch_identifier"], body.commodity.batchIdentifier);
  assert.equal((row["submitted_at"] as Date).toISOString(), d.decidedAt);
  const plots = (await harness.admin.query(`SELECT cited_plot_id, linked_plot_id FROM scs.custody_event_source_plot WHERE event_id = $1`, [d.eventId])).rows;
  assert.deepEqual(plots, [{ cited_plot_id: plotId, linked_plot_id: plotId }]);
});

test("CERTIFICATION and INSPECTION without a quantity → admitted; quantityRecorded false, explained in decisionReasons, not a limitation", async () => {
  for (const eventType of ["CERTIFICATION", "INSPECTION"] as const) {
    const d = await admitOk(
      eventRequest(await storedObject(), (r) => {
        r.eventType = eventType;
        delete r.quantity;
        r.destinationParty = { partyId: farmer, partyRoleAtEvent: "OTHER" };
        r.supportingDocument.documentType = eventType === "CERTIFICATION" ? "CERTIFICATION_DOCUMENT" : "INSPECTION_REPORT";
      }),
    );
    assert.equal(d.decision, "ADMITTED", eventType);
    assert.equal(d.admissionChecks.quantityRecorded, false);
    assert.deepEqual(d.decisionReasons, [`quantityRecorded: not applicable — a ${eventType} event need not concern a quantity, and none was recorded. This is not a limitation.`]);
    const row = await eventRow(d.eventId);
    assert.equal(row["quantity_amount"], null);
  }
});

test("same party on both sides for WEIGHING; an EXACT time at 06:00 in Bangkok (the previous UTC day) is accepted", async () => {
  const d = await admitOk(
    eventRequest(await storedObject(), (r) => {
      r.eventType = "WEIGHING";
      r.destinationParty = { partyId: farmer, partyRoleAtEvent: "OTHER" };
      r.eventTime = { eventDate: "2026-06-30", eventTimeUTC: "2026-06-29T23:00:00Z", timePrecision: "EXACT" };
      r.supportingDocument.documentType = "WEIGHT_TICKET";
    }),
  );
  assert.equal(d.decision, "ADMITTED");
  assert.equal(((await eventRow(d.eventId))["event_time_utc"] as Date).toISOString(), "2026-06-29T23:00:00.000Z");
});

// ── Limitation paths ─────────────────────────────────────────────────────────

test("PARTY_UNVERIFIED: no assessment; PARTIALLY_VERIFIED, expired or superseded assessments do not count", async () => {
  const partial = (await registerParty("COOPERATIVE", { verificationStatus: "PARTIALLY_VERIFIED" })).partyId;
  const expired = (await registerParty("COOPERATIVE", { verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE", verifiedAt: "2025-01-01T00:00:00Z", expiresAt: "2025-06-01T00:00:00Z" })).partyId;
  const superseded = await registerParty("COOPERATIVE");
  const first = await recordAssessment(superseded.partyId, superseded.evidence, { verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE" });
  await recordAssessment(superseded.partyId, superseded.evidence, { verificationStatus: "DISPUTED", supersedesAssessmentId: first });
  for (const party of [unverified, partial, expired, superseded.partyId]) {
    const d = await admitOk(eventRequest(await storedObject(), (r) => (r.destinationParty.partyId = party)));
    assert.deepEqual(d.limitationCodes, ["PARTY_UNVERIFIED"], party);
    assert.deepEqual(d.limitations, [`Party ${party} is registered but unverified: it has no current SCS-CAP-02 VERIFIED_FOR_DECLARED_SCOPE assessment.`]);
    assert.equal(d.decision, "ADMITTED_WITH_LIMITATIONS");
    assert.equal(d.admissionChecks.destinationPartyIdentifiable, true, "registered is identifiable");
  }
});

test("SOURCE_PLOTS_INCOMPLETE: declared incomplete, or no source plot at all", async () => {
  assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => (r.commodity.sourcePlotIdsComplete = false))), ["SOURCE_PLOTS_INCOMPLETE"]);
  assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => (r.commodity.sourcePlotIds = []))), ["SOURCE_PLOTS_INCOMPLETE"]);
});

test("SOURCE_PLOT_NOT_REGISTERED: kept as cited, unlinked; SOURCE_PLOT_RETIRED: linked, a limitation not a failure", async () => {
  const ghost = randomUUID();
  const d = await admitOk(eventRequest(await storedObject(), (r) => (r.commodity.sourcePlotIds = [plotId, ghost])));
  assert.deepEqual(d.limitationCodes, ["SOURCE_PLOT_NOT_REGISTERED"]);
  const plots = (await harness.admin.query(`SELECT cited_plot_id, linked_plot_id FROM scs.custody_event_source_plot WHERE event_id = $1 ORDER BY (linked_plot_id IS NULL)`, [d.eventId])).rows;
  assert.deepEqual(plots, [{ cited_plot_id: plotId, linked_plot_id: plotId }, { cited_plot_id: ghost, linked_plot_id: null }]);

  const retired = await registerPlot();
  await harness.admin.query(`UPDATE scs.plot SET registration_status = 'RETIRED' WHERE plot_id = $1`, [retired]);
  const r = await admitOk(eventRequest(await storedObject(), (b) => (b.commodity.sourcePlotIds = [retired])));
  assert.deepEqual(r.limitationCodes, ["SOURCE_PLOT_RETIRED"]);
  assert.match(r.limitations[0]!, /RETIRED; the commodity may have been harvested before the plot was retired/);
});

test("QUANTITY_PRECISION_UNCERTAIN: a stated uncertainty, or no measurement method", async () => {
  assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => (r.quantity!.measurementUncertainty = "±5 kg (uncalibrated hanging scale)"))), ["QUANTITY_PRECISION_UNCERTAIN"]);
  assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => delete r.quantity!.measurementMethod)), ["QUANTITY_PRECISION_UNCERTAIN"]);
});

test("EVENT_TIME_APPROXIMATE: APPROXIMATE or UNKNOWN precision; the date still anchors the event", async () => {
  for (const timePrecision of ["APPROXIMATE", "UNKNOWN"] as const) {
    assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => (r.eventTime.timePrecision = timePrecision))), ["EVENT_TIME_APPROXIMATE"], timePrecision);
  }
});

test("linked events: an admitted predecessor in scope is linked with no limitation; LINKED_EVENT_NOT_ADMITTED keeps the citation unlinked", async () => {
  const lot = `LOT-${randomUUID()}`;
  const first = await admitOk(eventRequest(await storedObject(), (r) => (r.commodity.batchIdentifier = lot)));
  const d = await admitOk(
    eventRequest(await storedObject(), (r) => {
      r.commodity.batchIdentifier = lot;
      r.eventType = "TRANSFER";
      r.sourceParty = { partyId: coop, partyRoleAtEvent: "AGGREGATOR" };
      r.destinationParty = { partyId: farmer, partyRoleAtEvent: "PROCESSOR" };
      r.predecessorEventIds = [first.eventId];
    }),
  );
  assert.deepEqual(d.limitationCodes, []);
  assert.deepEqual(await linksOf(d.eventId), [{ link_type: "PREDECESSOR", cited_event_id: first.eventId, linked_event_id: first.eventId }]);

  const ghost = randomUUID();
  const u = await admitOk(eventRequest(await storedObject(), (r) => (r.predecessorEventIds = [ghost])));
  assert.deepEqual(u.limitationCodes, ["LINKED_EVENT_NOT_ADMITTED"]);
  assert.deepEqual(u.limitations, [`/predecessorEventIds cites ${ghost}, which is not an admitted custody event; it is recorded as cited, unlinked.`]);
  assert.deepEqual(await linksOf(u.eventId), [{ link_type: "PREDECESSOR", cited_event_id: ghost, linked_event_id: null }]);
});

test("LINKED_EVENT_OUT_OF_SCOPE: a linked event of another batch or framework is kept, with the difference named", async () => {
  const otherBatch = await admitOk(eventRequest(await storedObject()));
  const d = await admitOk(eventRequest(await storedObject(), (r) => (r.predecessorEventIds = [otherBatch.eventId])));
  assert.deepEqual(d.limitationCodes, ["LINKED_EVENT_OUT_OF_SCOPE"]);
  assert.match(d.limitations[0]!, /which belongs to batch "LOT-.*"; the link is kept\.$/);
  assert.deepEqual(await linksOf(d.eventId), [{ link_type: "PREDECESSOR", cited_event_id: otherBatch.eventId, linked_event_id: otherBatch.eventId }]);

  const cocoa = await registerFramework();
  const lot = `LOT-${randomUUID()}`;
  const elsewhere = await admitOk(eventRequest(await storedObject(), (r) => ((r.frameworkAssociationId = cocoa), (r.commodity.batchIdentifier = lot))));
  const e = await admitOk(eventRequest(await storedObject(), (r) => ((r.commodity.batchIdentifier = lot), (r.predecessorEventIds = [elsewhere.eventId]))));
  assert.deepEqual(e.limitationCodes, ["LINKED_EVENT_OUT_OF_SCOPE"]);
  assert.match(e.limitations[0]!, new RegExp(`belongs to framework ${cocoa}; the link is kept`));
});

test("INTEGRITY_UNVERIFIED: no stored document cited (a handwritten ledger stays admissible)", async () => {
  const d = await admitOk(eventRequest(null, (r) => (r.supportingDocument.documentReference = "Handwritten collector ledger, page 4")));
  assert.deepEqual(d.limitationCodes, ["INTEGRITY_UNVERIFIED"]);
  assert.equal(d.admissionChecks.documentIntegrityVerified, false);
  const row = await eventRow(d.eventId);
  assert.equal(row["integrity_status"], "UNVERIFIED");
  assert.equal(row["evidence_object_sha256"], null);
});

test("CHAIN_OF_CUSTODY_INCOMPLETE: as declared by the submitter", async () => {
  assert.deepEqual(await codesOf(eventRequest(await storedObject(), (r) => (r.chainOfCustodyComplete = false))), ["CHAIN_OF_CUSTODY_INCOMPLETE"]);
});

test("mandates: a valid mandate is linked with no limitation; otherwise MANDATE_NOT_VALID names each failed condition", async () => {
  const ok = await admitOk(eventRequest(await storedObject(), (r) => ((r.sourceParty.actingUnderMandateId = validMandate), (r.submissionMandateId = validMandate))));
  assert.deepEqual(ok.limitationCodes, []);
  const row = await eventRow(ok.eventId);
  assert.equal(row["source_mandate_linked_id"], validMandate);
  assert.equal(row["submission_mandate_linked_id"], validMandate);

  const ghost = randomUUID();
  const missing = await admitOk(eventRequest(await storedObject(), (r) => (r.submissionMandateId = ghost)));
  assert.deepEqual(missing.limitationCodes, ["MANDATE_NOT_VALID"]);
  assert.match(missing.limitations[0]!, new RegExp(`/submissionMandateId cites ${ghost}, but no SCS-CAP-02 mandate is registered with that id\\. The submission is authorised by the actor's COMPLIANCE_OFFICER role`));
  assert.equal((await eventRow(missing.eventId))["submission_mandate_linked_id"], null);
  assert.equal((await eventRow(missing.eventId))["submission_mandate_cited_id"], ghost);

  // outside its period
  const early = await admitOk(eventRequest(await storedObject(), (r) => ((r.sourceParty.actingUnderMandateId = validMandate), (r.eventTime.eventDate = "2025-06-30"))));
  assert.match(early.limitations.find((l) => l.startsWith("Mandate not valid"))!, /the event \(2025-06-30\) is outside its validity period/);
  // not granted by the source party
  const wrongParty = await admitOk(
    eventRequest(await storedObject(), (r) => ((r.sourceParty = { partyId: coop, partyRoleAtEvent: "AGGREGATOR", actingUnderMandateId: validMandate }), (r.destinationParty.partyId = farmer))),
  );
  assert.match(wrongParty.limitations.find((l) => l.startsWith("Mandate not valid"))!, new RegExp(`it is granted by party ${farmer}, not by the source party ${coop}`));
  // not permitting custody evidence, and revoked
  const grower = await verified("NATURAL_PERSON");
  const narrow = await registerMandate(grower, coop, { permittedActions: ["SUBMIT_DEFORESTATION_EVIDENCE"] });
  const revoked = await registerMandate(grower, coop, { validFrom: "2025-01-01T00:00:00Z", validUntil: "2025-12-31T00:00:00Z" }, false);
  await harness.admin.query(`UPDATE scs.representation_mandate SET revocation_status = 'REVOKED', revoked_at = '2025-09-01T00:00:00Z', revocation_reason = 'Withdrawn by grower' WHERE mandate_id = $1`, [revoked]);
  const n = await admitOk(eventRequest(await storedObject(), (r) => (r.sourceParty = { partyId: grower, partyRoleAtEvent: "SUPPLIER", actingUnderMandateId: narrow })));
  assert.deepEqual(n.limitationCodes, ["MANDATE_NOT_VALID"]);
  assert.match(n.limitations[0]!, /but it does not permit SUBMIT_CUSTODY_EVIDENCE\./);
  const v = await admitOk(
    eventRequest(await storedObject(), (r) => ((r.sourceParty = { partyId: grower, partyRoleAtEvent: "SUPPLIER", actingUnderMandateId: revoked }), (r.eventTime.eventDate = "2025-10-01"))),
  );
  assert.deepEqual(v.limitationCodes, ["MANDATE_NOT_VALID"]);
  assert.match(v.limitations[0]!, /but its revocationStatus is REVOKED\./);
});

test("QUANTITY_GAIN_UNEXPLAINED: output above input in the same unit, with no explanation; internallyConsistent false", async () => {
  const processing = async (edit: (r: Req) => void) =>
    eventRequest(await storedObject(), (r) => {
      r.eventType = "PROCESSING";
      r.destinationParty = { partyId: farmer, partyRoleAtEvent: "PROCESSOR" };
      r.supportingDocument.documentType = "PROCESSING_RECORD";
      r.transformation = { transformationType: "BLENDING", inputQuantity: 100, inputUnit: "KG", outputQuantity: 140, outputUnit: "KG" };
      edit(r);
    });
  const d = await admitOk(await processing(() => {}));
  assert.deepEqual(d.limitationCodes, ["QUANTITY_GAIN_UNEXPLAINED"]);
  assert.equal(d.admissionChecks.internallyConsistent, false);
  const explained = await admitOk(await processing((r) => (r.transformation!.conversionRatioDescription = "Blended with 40 kg of field latex from the same lot")));
  assert.deepEqual(explained.limitationCodes, []);
  assert.equal(explained.admissionChecks.internallyConsistent, true);
  const drying = await admitOk(await processing((r) => (r.transformation = { transformationType: "DRYING", inputQuantity: 100, inputUnit: "KG", outputQuantity: 60, outputUnit: "KG" })));
  assert.deepEqual(drying.limitationCodes, [], "a loss is not a gain");
  const sheets = await admitOk(await processing((r) => (r.transformation = { transformationType: "PRESSING", inputQuantity: 100, inputUnit: "KG", outputQuantity: 400, outputUnit: "OTHER", outputUnitDescription: "Ribbed smoked sheets" })));
  assert.deepEqual(sheets.limitationCodes, [], "different units are never compared");
});

test("CONTRADICTION_DECLARED: declared contradictions are a limitation, kept verbatim; uncertainties and known gaps are disclosure only", async () => {
  const d = await admitOk(eventRequest(await storedObject(), (r) => (r.contradictions = ["The weight ticket says 118 kg; the receipt says 120 kg."])));
  assert.deepEqual(d.limitationCodes, ["CONTRADICTION_DECLARED"]);
  assert.deepEqual(d.limitations, ["Contradiction declared by the submitter: The weight ticket says 118 kg; the receipt says 120 kg."]);
  const e = await admitOk(eventRequest(await storedObject(), (r) => ((r.uncertainties = ["Harvest week not recorded"]), (r.knownGaps = ["No transport record from farm to collection point"]))));
  assert.equal(e.decision, "ADMITTED");
  const row = await eventRow(e.eventId);
  assert.deepEqual(row["uncertainties"], ["Harvest week not recorded"]);
  assert.deepEqual(row["known_gaps"], ["No transport record from farm to collection point"]);
});

test("several limitations at once are reported in the contract's order", async () => {
  const d = await admitOk(
    eventRequest(null, (r) => {
      r.contradictions = ["Dates differ"];
      r.chainOfCustodyComplete = false;
      r.eventTime.timePrecision = "APPROXIMATE";
      r.destinationParty.partyId = unverified;
      r.commodity.sourcePlotIdsComplete = false;
    }),
  );
  assert.deepEqual(d.limitationCodes, ["PARTY_UNVERIFIED", "SOURCE_PLOTS_INCOMPLETE", "EVENT_TIME_APPROXIMATE", "INTEGRITY_UNVERIFIED", "CHAIN_OF_CUSTODY_INCOMPLETE", "CONTRADICTION_DECLARED"]);
});

test("SPLIT and CONSOLIDATION: sources linked; successors recorded as declared, never linked", async () => {
  const lot = `LOT-${randomUUID()}`;
  const a = await admitOk(eventRequest(await storedObject(), (r) => (r.commodity.batchIdentifier = lot)));
  const b = await admitOk(eventRequest(await storedObject(), (r) => (r.commodity.batchIdentifier = lot)));
  const same = { partyId: coop, partyRoleAtEvent: "AGGREGATOR" } as const;
  const merged = await admitOk(
    eventRequest(await storedObject(), (r) => {
      r.eventType = "CONSOLIDATION";
      r.sourceParty = { ...same };
      r.destinationParty = { ...same };
      r.commodity.batchIdentifier = lot;
      r.consolidatedFromEventIds = [a.eventId, b.eventId];
      r.quantity = { amount: 240, unit: "KG", measurementMethod: "Calibrated platform scale" };
      r.successorEventIds = [a.eventId];
    }),
  );
  assert.deepEqual(merged.limitationCodes, []);
  assert.deepEqual(
    await linksOf(merged.eventId),
    [
      { link_type: "CONSOLIDATED_FROM", cited_event_id: a.eventId, linked_event_id: a.eventId },
      { link_type: "CONSOLIDATED_FROM", cited_event_id: b.eventId, linked_event_id: b.eventId },
      { link_type: "SUCCESSOR", cited_event_id: a.eventId, linked_event_id: null },
    ].sort((x, y) => (x.link_type + x.cited_event_id < y.link_type + y.cited_event_id ? -1 : 1)),
  );
  const split = await admitOk(
    eventRequest(await storedObject(), (r) => {
      r.eventType = "SPLIT";
      r.sourceParty = { ...same };
      r.destinationParty = { ...same };
      r.commodity.batchIdentifier = lot;
      r.splitFromEventId = merged.eventId;
      r.quantity = { amount: 100, unit: "KG", measurementMethod: "Calibrated platform scale" };
    }),
  );
  assert.deepEqual(await linksOf(split.eventId), [{ link_type: "SPLIT_FROM", cited_event_id: merged.eventId, linked_event_id: merged.eventId }]);
});

// ── Failures ─────────────────────────────────────────────────────────────────

test("actor without COMPLIANCE_OFFICER (VIEWER, SYSTEM_ADMIN, VERIFICATION_OFFICER) → 403 SUBMITTER_NOT_AUTHORISED", async () => {
  for (const who of ["viewer", "admin", "verifier"] as const) {
    const r = await assertRefused(eventRequest(await storedObject()), 403, "SUBMITTER_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Submitting a custody event requires the COMPLIANCE_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

test("INTERNAL_INCONSISTENCY: event-type rules, each named", async () => {
  const r = await assertRefused(
    eventRequest(await storedObject(), (b) => {
      b.transformation = { transformationType: "DRYING", inputQuantity: 100, inputUnit: "KG", outputQuantity: 60, outputUnit: "KG" };
      b.splitFromEventId = randomUUID();
      b.consolidatedFromEventIds = [randomUUID()];
      b.destinationParty.partyId = farmer;
    }),
    400,
    "INTERNAL_INCONSISTENCY",
  );
  assert.deepEqual(r.json["reasons"], [
    "/transformation: only a TRANSFORMATION or PROCESSING event records a transformation, not a PURCHASE event.",
    "/splitFromEventId: only a SPLIT event is split from another, not a PURCHASE event.",
    "/consolidatedFromEventIds: only a CONSOLIDATION event consolidates others, not a PURCHASE event.",
    "/destinationParty/partyId: a PURCHASE event changes custody, so its source and destination must be different parties.",
  ]);
  const s = await assertRefused(eventRequest(await storedObject(), (b) => ((b.eventType = "SPLIT"), (b.destinationParty.partyId = farmer))), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(s.json["reasons"], ["/splitFromEventId: required for a SPLIT event."]);
  const c = await assertRefused(eventRequest(await storedObject(), (b) => ((b.eventType = "CONSOLIDATION"), (b.consolidatedFromEventIds = [randomUUID()]))), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(c.json["reasons"], ["/consolidatedFromEventIds: a CONSOLIDATION event needs at least two events it consolidates (has 1)."]);
  const p = await assertRefused(eventRequest(await storedObject(), (b) => (b.eventType = "PROCESSING")), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(p.json["reasons"], ["/transformation: required for a PROCESSING event."]);
});

test("INTERNAL_INCONSISTENCY: time — EXACT without a timestamp, a timestamp off its date in every time zone, future dates", async () => {
  const r = await assertRefused(eventRequest(await storedObject(), (b) => (b.eventTime.timePrecision = "EXACT")), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(r.json["reasons"], ["/eventTime/eventTimeUTC: required when timePrecision is EXACT."]);
  const off = await assertRefused(eventRequest(await storedObject(), (b) => (b.eventTime = { eventDate: "2026-06-30", eventTimeUTC: "2026-07-01T12:00:00Z", timePrecision: "EXACT" })), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(off.json["reasons"], ["/eventTime/eventTimeUTC (2026-07-01T12:00:00Z) does not fall on eventDate 2026-06-30 in any time zone from UTC−12:00 to UTC+14:00."]);
  const future = await assertRefused(
    eventRequest(await storedObject(), (b) => ((b.eventTime = { eventDate: "2999-01-01", eventTimeUTC: "2999-01-01T00:00:00Z", timePrecision: "EXACT" }), (b.supportingDocument.documentDate = "2999-01-02"))),
    400,
    "INTERNAL_INCONSISTENCY",
  );
  const reasons = future.json["reasons"] as string[];
  assert.equal(reasons.length, 3, JSON.stringify(reasons));
  assert.ok(reasons[0]!.startsWith("/eventTime/eventTimeUTC (2999-01-01T00:00:00Z) is in the future"));
  assert.ok(reasons[1]!.startsWith("/eventTime/eventDate (2999-01-01) is in the future"));
  assert.ok(reasons[2]!.startsWith("/supportingDocument/documentDate (2999-01-02) is after the submission"));
});

test("INTERNAL_INCONSISTENCY: location, quantities and units", async () => {
  const r = await assertRefused(
    eventRequest(await storedObject(), (b) => {
      b.eventLocation = { countryCode: "XX", coordinates: { latitude: 95, longitude: -200, accuracyMetres: -1 } };
      b.quantity = { amount: 0, unit: "OTHER", measurementMethod: "scale" };
    }),
    400,
    "INTERNAL_INCONSISTENCY",
  );
  assert.deepEqual(r.json["reasons"], [
    '/eventLocation/countryCode: "XX" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).',
    "/eventLocation/coordinates/latitude: 95 is outside −90 to 90.",
    "/eventLocation/coordinates/longitude: -200 is outside −180 to 180.",
    "/eventLocation/coordinates/accuracyMetres: -1 is negative.",
    "/quantity/amount: 0 must be greater than 0.",
    "/quantity/unitDescription: required when unit is OTHER.",
  ]);
  const d = await assertRefused(eventRequest(await storedObject(), (b) => (b.quantity!.unitDescription = "kilograms")), 400, "INTERNAL_INCONSISTENCY");
  assert.deepEqual(d.json["reasons"], ["/quantity/unitDescription: only allowed when unit is OTHER (it is KG)."]);
});

test("FRAMEWORK_ASSOCIATION_NOT_FOUND (404) and FRAMEWORK_NOT_ACTIVE (422)", async () => {
  const missing = randomUUID();
  const r = await assertRefused(eventRequest(await storedObject(), (b) => (b.frameworkAssociationId = missing)), 404, "FRAMEWORK_ASSOCIATION_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`/frameworkAssociationId: no SCS-CAP-01 framework is registered with frameworkId ${missing}.`]);
  const old = await registerFramework();
  await harness.admin.query(`UPDATE scs.regulatory_framework SET status = 'SUPERSEDED' WHERE framework_id = $1`, [old]);
  const s = await assertRefused(eventRequest(await storedObject(), (b) => (b.frameworkAssociationId = old)), 422, "FRAMEWORK_NOT_ACTIVE");
  assert.deepEqual(s.json["reasons"], [`Framework ${old} is SUPERSEDED; custody events are admitted only under an ACTIVE framework.`]);
});

test("COMMODITY_CODE_UNRECOGNISED: not exactly the framework's commodity code (no product hierarchy)", async () => {
  for (const code of ["1801", "4001.21"]) {
    const r = await assertRefused(eventRequest(await storedObject(), (b) => (b.commodity.commodityCode = code)), 422, "COMMODITY_CODE_UNRECOGNISED");
    assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`"${code.replace(".", "\\.")}" is not framework .*'s commodityCode \\("4001"\\)`));
  }
});

test("SOURCE_PARTY_NOT_IDENTIFIABLE, DESTINATION_PARTY_NOT_IDENTIFIABLE, PARTY_RETIRED", async () => {
  await assertRefused(eventRequest(await storedObject(), (b) => (b.sourceParty.partyId = randomUUID())), 422, "SOURCE_PARTY_NOT_IDENTIFIABLE");
  await assertRefused(eventRequest(await storedObject(), (b) => (b.destinationParty.partyId = randomUUID())), 422, "DESTINATION_PARTY_NOT_IDENTIFIABLE");
  const r = await assertRefused(eventRequest(await storedObject(), (b) => (b.destinationParty.partyId = retiredParty)), 422, "PARTY_RETIRED");
  assert.deepEqual(r.json["reasons"], [`Destination party ${retiredParty} is RETIRED.`]);
  const s = await assertRefused(eventRequest(await storedObject(), (b) => (b.sourceParty.partyId = retiredParty)), 422, "PARTY_RETIRED");
  assert.deepEqual(s.json["reasons"], [`Source party ${retiredParty} is RETIRED.`]);
});

test("EVIDENCE_OBJECT_NOT_FOUND and DOCUMENT_INTEGRITY_FAILED (altered document: digest mismatch)", async () => {
  const missing = randomDigest();
  const r = await assertRefused(eventRequest(missing), 422, "EVIDENCE_OBJECT_NOT_FOUND");
  assert.deepEqual(r.json["reasons"], [`/supportingDocument/objectId: the SCS evidence object store holds no object ${missing}.`]);
  const objectId = await storedObject();
  const declared = randomDigest();
  const m = await assertRefused(eventRequest(objectId, (b) => (b.supportingDocument.contentDigest = declared)), 422, "DOCUMENT_INTEGRITY_FAILED");
  assert.deepEqual(m.json["reasons"], [`/supportingDocument/contentDigest: the declared SHA-256 ${declared} does not match the stored document's SHA-256 ${objectId}.`]);
});

test("QUANTITY_NOT_RECORDED and SUPPORTING_DOCUMENT_ABSENT are refused by the schema (400 REQUEST_VALIDATION_FAILED)", async () => {
  const cases: Array<[string, (b: Req) => void, string]> = [
    ["no quantity on a PURCHASE", (b) => delete b.quantity, "quantity"],
    ["no supporting document", (b) => delete (b as Partial<Req>).supportingDocument, "supportingDocument"],
    ["no content digest", (b) => delete (b.supportingDocument as Partial<Req["supportingDocument"]>).contentDigest, "contentDigest"],
    ["a blank document reference", (b) => (b.supportingDocument.documentReference = "  "), "/supportingDocument/documentReference"],
    ["a unit outside the vocabulary", (b) => (b.quantity!.unit = "POUND" as never), "/quantity/unit"],
    ["a local time in eventTimeUTC", (b) => (b.eventTime = { eventDate: "2026-06-30", eventTimeUTC: "2026-06-30T06:00:00+07:00", timePrecision: "EXACT" }), "/eventTime/eventTimeUTC"],
  ];
  for (const [label, edit, mention] of cases) {
    const before = await totals();
    const r = await post(EVENTS, eventRequest(await storedObject(), edit));
    assert.equal(r.status, 400, `${label}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json["error"], "REQUEST_VALIDATION_FAILED", label);
    assert.ok(JSON.stringify(r.json["reasons"]).includes(mention), `${label}: ${JSON.stringify(r.json["reasons"])}`);
    assert.deepEqual(await totals(), before, label);
  }
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const before = await totals();
  const r = await post(EVENTS, eventRequest(await storedObject()), { key: null });
  assert.equal(r.status, 400);
  assert.deepEqual(await totals(), before);
});

test("same key, same content → byte-identical 201 replay; same key, different content → 409", async () => {
  const body = eventRequest(await storedObject(), (r) => (r.predecessorEventIds = [randomUUID()]));
  const key = `cap05-${randomUUID()}`;
  const first = await post(EVENTS, body, { key });
  const before = await totals();
  const second = await post(EVENTS, body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  assert.deepEqual(await totals(), before, "no second write");
  const conflict = await post(EVENTS, eventRequest(await storedObject()), { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500; event, source plots and links all absent", async () => {
  const body = eventRequest(await storedObject(), (r) => ((r.predecessorEventIds = [randomUUID()]), (r.successorEventIds = [randomUUID()])));
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const before = await totals();
    const r = await post(EVENTS, body);
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.equal(r.json["noEventAdmitted"], true);
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.deepEqual(await totals(), before);
    assert.equal(await count("SELECT count(*) AS n FROM scs.custody_event WHERE batch_identifier = $1", [body.commodity.batchIdentifier]), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(EVENTS, body)).status, 201, "and admission works again once the failure is gone");
});

// ── Outcomes across every test (runs last) ───────────────────────────────────

test("every admitted event is ADMITTED exactly when it has no limitation code, and plain ADMITTED occurred", async () => {
  const { rows } = await harness.admin.query<{ admission_status: string; limited: boolean; n: string }>(
    `SELECT admission_status, cardinality(admission_limitation_codes) > 0 AS limited, count(*) AS n FROM scs.custody_event GROUP BY 1, 2 ORDER BY 1`,
  );
  assert.deepEqual(rows.map((r) => [r.admission_status, r.limited]), [["ADMITTED", false], ["ADMITTED_WITH_LIMITATIONS", true]]);
  const receipts = await harness.admin.query(`SELECT DISTINCT decision FROM scs.decision_receipt WHERE decision_type = 'CUSTODY_EVENT_ADMISSION' ORDER BY decision`);
  assert.deepEqual(receipts.rows, [{ decision: "ADMITTED" }, { decision: "ADMITTED_WITH_LIMITATIONS" }]);
});
