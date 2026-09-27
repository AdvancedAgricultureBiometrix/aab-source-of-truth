// SCS-CAP-02 POST /scs/v1/parties/:partyId/verifications, end to end: real
// HTTP through the server layer, real PostgreSQL (database built from every
// migration), the API connected as a restricted member of scs_api. Parties
// are registered by a COMPLIANCE_OFFICER; assessments are recorded by a
// separate VERIFICATION_OFFICER.

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
import type { ScsVerificationAssessmentRequest, ScsVerificationAssessmentResponse } from "../types/cap-02.js";
import { issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = {
  registrar: "cap02v-registrar-token-0123456789abcdef",
  verifier: "cap02v-verifier-token-0123456789abcdefgh",
  dual: "cap02v-dual-role-token-0123456789abcdefg",
  viewer: "cap02v-viewer-token-0123456789abcdefghi",
};
const actors = {
  registrar: { actorId: "registrar-cap02v", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  verifier: { actorId: "verifier-cap02v", actorType: "HUMAN", roles: ["VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  dual: { actorId: "dual-cap02v", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER", "VERIFICATION_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-cap02v", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;
type Who = keyof typeof TOKENS;

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";

async function post(path: string, body: unknown, opts: { key?: string | null; who?: Who } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKENS[opts.who ?? "verifier"]}`, "content-type": "application/json" };
  const key = opts.key === undefined ? `cap02v-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

const verificationsPath = (partyId: string) => `/scs/v1/parties/${partyId}/verifications`;

/** A party registered by `who` (the registrar by default) with two evidence ids linked at registration. */
async function registerParty(who: Who = "registrar"): Promise<{ partyId: string; evidence: string[] }> {
  const evidence = [randomUUID(), randomUUID()];
  const body = { ...partyRequest("NATURAL_PERSON"), identityEvidence: { evidenceIds: evidence, evidenceLimitations: [] } };
  const r = await post("/scs/v1/parties", body, { who });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { partyId: (r.json["decision"] as { partyId: string }).partyId, evidence };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Who[]).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

function assessment(evidenceIds: string[], overrides: Partial<ScsVerificationAssessmentRequest> = {}): ScsVerificationAssessmentRequest {
  return {
    verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE",
    verificationScope: {
      scopeDescription: "Legal name and national ID number",
      jurisdictionCode: "TH",
      verifiedAttributes: ["legal name", "national ID number"],
      excludedFromVerification: ["sanctions status", "beneficial ownership", "land title"],
    },
    verifyingAuthority: {
      authorityId: "TH-DOPA",
      authorityName: "Department of Provincial Administration",
      authorityBasis: "Civil registration record check",
      jurisdictionCode: "TH",
    },
    verifiedAt: "2026-03-01T00:00:00Z",
    evidenceIds,
    limitations: ["Checked against a photocopy; original not seen."],
    ...overrides,
  };
}

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const assessmentsFor = (partyId: string) => count("SELECT count(*) AS n FROM scs.party_verification_assessment WHERE party_id = $1", [partyId]);
const totalAssessments = () => count("SELECT count(*) AS n FROM scs.party_verification_assessment");
const totalReceipts = () => count("SELECT count(*) AS n FROM scs.decision_receipt");
const idempotencyRecords = (key: string) => count("SELECT count(*) AS n FROM scs.idempotency_record WHERE idempotency_key = $1", [key]);
const assessmentId = (r: { json: Record<string, unknown> }) => (r.json["decision"] as { assessmentId: string }).assessmentId;

/** Posts `body` and checks it failed closed with `error`, and that nothing at all was written. */
async function assertRefused(partyId: string, body: unknown, status: number, error: string, opts: { who?: Who } = {}) {
  const before = { assessments: await totalAssessments(), receipts: await totalReceipts() };
  const key = `cap02v-${randomUUID()}`;
  const r = await post(verificationsPath(partyId), body, { key, ...opts });
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-CAP-02");
  assert.equal(r.json["result"], "FAIL_CLOSED");
  assert.equal(r.json["noWrites"], true);
  assert.deepEqual(
    { assessments: await totalAssessments(), receipts: await totalReceipts(), idempotency: await idempotencyRecords(key) },
    { ...before, idempotency: 0 },
  );
  return r;
}

// ── Valid assessments ────────────────────────────────────────────────────────

test("each recordable status → 201; recorded by the verifier; registrationStatus unchanged", async () => {
  for (const verificationStatus of ["PARTIALLY_VERIFIED", "VERIFIED_FOR_DECLARED_SCOPE", "DISPUTED", "FAIL_CLOSED"] as const) {
    const { partyId, evidence } = await registerParty();
    const key = `cap02v-${randomUUID()}`;
    const body = assessment([evidence[0]!], { verificationStatus, expiresAt: "2028-03-01T00:00:00Z" });
    const r = await post(verificationsPath(partyId), body, { key });
    assert.equal(r.status, 201, `${verificationStatus}: ${JSON.stringify(r.json)}`);

    const res = r.json as unknown as ScsVerificationAssessmentResponse;
    const checked = runWithCorrelation("cap02v-test-schema", () => validate("SCS-CAP-02", SCHEMAS.cap02VerificationAssessmentResponse, res));
    assert.ok(checked.ok, `response matches the response schema: ${checked.ok ? "" : checked.envelope.reasons.join("; ")}`);

    const d = res.decision;
    assert.equal(d.decision, "RECORDED");
    assert.equal(d.partyId, partyId);
    assert.equal(d.partyVersion, 1);
    assert.equal(Object.keys(d.eligibilityChecks).length, 9);
    for (const [check, value] of Object.entries(d.eligibilityChecks)) {
      assert.equal(value, true, check);
      assert.ok(d.decisionReasons.some((x) => x.startsWith(`${check}: evaluated`)), `${check} has an evaluated reason`);
    }
    assert.ok(d.decisionReasons.includes("Assessment is not registration: the party's registrationStatus is unchanged (REGISTERED); no earlier assessment is changed."));
    assert.ok(d.decisionReasons.some((x) => x.startsWith("Verifying authority recorded as declared") && x.includes("none exists")));
    assert.ok(d.decisionReasons.some((x) => x.startsWith("Evidence ids not confirmed: ") && x.includes("are not linked to the SCS evidence object store; the store identifies files by SHA-256 digest")));
    assert.ok(d.decisionReasons.some((x) => x.includes("Independence from the actors who submitted the cited evidence is not checked (contract gap)")));

    const row = (await harness.admin.query(`SELECT * FROM scs.party_verification_assessment WHERE assessment_id = $1`, [d.assessmentId])).rows[0] as Record<string, unknown>;
    assert.equal(row["verification_status"], verificationStatus);
    assert.equal(row["party_version"], 1);
    assert.equal(row["scope_jurisdiction_code"], "TH");
    assert.deepEqual(row["scope_excluded_from_verification"], ["sanctions status", "beneficial ownership", "land title"]);
    assert.equal(row["verifying_authority_id"], "TH-DOPA");
    assert.deepEqual(row["evidence_ids"], [evidence[0]]);
    assert.deepEqual(row["recorded_by"], issuedReference(actors.verifier));
    assert.equal((row["recorded_at"] as Date).toISOString(), d.decidedAt);
    assert.equal((row["verified_at"] as Date).toISOString(), "2026-03-01T00:00:00.000Z");
    assert.equal(row["supersedes_assessment_id"], null);
    for (const flag of Object.keys(row).filter((k) => k.startsWith("boundary_"))) assert.equal(row[flag], true, flag);

    const party = (await harness.admin.query(`SELECT registration_status FROM scs.party_identity WHERE party_id = $1`, [partyId])).rows[0] as Record<string, unknown>;
    assert.equal(party["registration_status"], "REGISTERED", `${verificationStatus} does not change registrationStatus`);

    const receipt = (await harness.admin.query(`SELECT * FROM scs.decision_receipt WHERE receipt_id = $1`, [res.receipt.receiptId])).rows[0] as Record<string, unknown>;
    assert.equal(receipt["decision_type"], "VERIFICATION_ASSESSMENT");
    assert.equal(receipt["subject_id"], d.assessmentId);
    assert.equal(receipt["idempotency_key"], key);
    assert.equal(sha256Hex(canonicalJson(receipt["receipt"])), res.receiptDigest);
    assert.deepEqual(res.receipt.decision, d);
  }
});

test("evidence linked by a later identity evidence submission counts as linked", async () => {
  const { partyId } = await registerParty();
  const later = randomUUID();
  assert.equal((await post(`/scs/v1/parties/${partyId}/evidence`, { evidenceIds: [later], evidenceLimitations: [] }, { who: "registrar" })).status, 201);
  assert.equal((await post(verificationsPath(partyId), assessment([later]))).status, 201);
});

test("already expired (expiresAt in the past) → 201, recorded as a historical fact", async () => {
  const { partyId, evidence } = await registerParty();
  const r = await post(verificationsPath(partyId), assessment(evidence, { verifiedAt: "2020-01-01T00:00:00Z", expiresAt: "2021-01-01T00:00:00Z" }));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const reasons = (r.json["decision"] as { decisionReasons: string[] }).decisionReasons;
  assert.ok(reasons.some((x) => x.includes("the assessment has already expired and is recorded as a historical fact")));
  assert.ok(reasons.includes("Already expired: this assessment counts as VERIFICATION_EXPIRED when the party's verification status is derived."));
});

test("verifiedAt before the party's registration → 201", async () => {
  const { partyId, evidence } = await registerParty();
  assert.equal((await post(verificationsPath(partyId), assessment(evidence, { verifiedAt: "2019-06-01T00:00:00Z" }))).status, 201);
});

// ── Status ───────────────────────────────────────────────────────────────────

test("a derived status (REGISTERED_UNVERIFIED, VERIFICATION_EXPIRED) → 400 VERIFICATION_STATUS_NOT_RECORDABLE", async () => {
  const { partyId, evidence } = await registerParty();
  for (const verificationStatus of ["REGISTERED_UNVERIFIED", "VERIFICATION_EXPIRED"] as const) {
    const r = await assertRefused(partyId, assessment(evidence, { verificationStatus }), 400, "VERIFICATION_STATUS_NOT_RECORDABLE");
    assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`^verificationStatus ${verificationStatus} is derived when read, never recorded`));
  }
});

test("a status outside the contract's type → 400 REQUEST_VALIDATION_FAILED", async () => {
  const { partyId, evidence } = await registerParty();
  await assertRefused(partyId, assessment(evidence, { verificationStatus: "VERIFIED" as never }), 400, "REQUEST_VALIDATION_FAILED");
});

// ── Dates ────────────────────────────────────────────────────────────────────

test("verifiedAt in the future → 400 VALIDITY_PERIOD_INVALID", async () => {
  const { partyId, evidence } = await registerParty();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
  const r = await assertRefused(partyId, assessment(evidence, { verifiedAt: tomorrow }), 400, "VALIDITY_PERIOD_INVALID");
  assert.match((r.json["reasons"] as string[])[0]!, /is in the future/);
});

test("expiresAt before verifiedAt → 400 VALIDITY_PERIOD_INVALID", async () => {
  const { partyId, evidence } = await registerParty();
  const r = await assertRefused(partyId, assessment(evidence, { expiresAt: "2026-02-01T00:00:00Z" }), 400, "VALIDITY_PERIOD_INVALID");
  assert.match((r.json["reasons"] as string[])[0]!, /must be after verifiedAt/);
});

test("expiresAt the same instant as verifiedAt (zero-length window) → 400 VALIDITY_PERIOD_INVALID", async () => {
  const { partyId, evidence } = await registerParty();
  // the same instant written two ways
  const r = await assertRefused(partyId, assessment(evidence, { expiresAt: "2026-03-01T07:00:00+07:00" }), 400, "VALIDITY_PERIOD_INVALID");
  assert.match((r.json["reasons"] as string[])[0]!, /zero-length verification window/);
});

// ── Jurisdictions ────────────────────────────────────────────────────────────

test("invalid jurisdictionCode in the scope → 422 COUNTRY_CODE_UNRECOGNISED", async () => {
  const { partyId, evidence } = await registerParty();
  const body = assessment(evidence);
  const r = await assertRefused(partyId, { ...body, verificationScope: { ...body.verificationScope, jurisdictionCode: "TH-10" } }, 422, "COUNTRY_CODE_UNRECOGNISED");
  assert.deepEqual(r.json["reasons"], ['/verificationScope/jurisdictionCode: "TH-10" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).']);
});

test("invalid jurisdictionCode in the verifying authority → 422 COUNTRY_CODE_UNRECOGNISED", async () => {
  const { partyId, evidence } = await registerParty();
  const body = assessment(evidence);
  const r = await assertRefused(partyId, { ...body, verifyingAuthority: { ...body.verifyingAuthority, jurisdictionCode: "th" } }, 422, "COUNTRY_CODE_UNRECOGNISED");
  assert.deepEqual(r.json["reasons"], ['/verifyingAuthority/jurisdictionCode: "th" is not an officially assigned ISO 3166-1 alpha-2 code (uppercase, e.g. TH).']);
});

// ── Party ────────────────────────────────────────────────────────────────────

test("party not found → 404 PARTY_NOT_FOUND", async () => {
  await assertRefused(randomUUID(), assessment([randomUUID()]), 404, "PARTY_NOT_FOUND");
});

test("party RETIRED → 422 PARTY_RETIRED", async () => {
  const { rows } = await harness.admin.query<{ party_id: string }>(
    `INSERT INTO scs.party_identity (party_version, schema_version, registered_at, registered_by, party_type, party_name,
       country_of_registration, registration_status, identity_evidence_limitations, provenance_submitted_by, provenance_recorded_at)
     VALUES (1, '1', now(), $1, 'NATURAL_PERSON', $2, 'TH', 'RETIRED', '{}', $1, now()) RETURNING party_id`,
    [JSON.stringify(actors.registrar), `Retired ${randomUUID()}`],
  );
  await assertRefused(rows[0]!.party_id, assessment([randomUUID()]), 422, "PARTY_RETIRED");
});

// ── Authority and separation of duties ───────────────────────────────────────

test("actor without VERIFICATION_OFFICER (COMPLIANCE_OFFICER, VIEWER) → 403 VERIFIER_NOT_AUTHORISED, nothing written", async () => {
  const { partyId, evidence } = await registerParty();
  for (const who of ["registrar", "viewer"] as const) {
    const r = await assertRefused(partyId, assessment(evidence), 403, "VERIFIER_NOT_AUTHORISED", { who });
    assert.deepEqual(r.json["reasons"], [`Recording a verification assessment requires the VERIFICATION_OFFICER role; actor ${actors[who].actorId} does not hold it.`]);
  }
});

test("the party's registrant → 403 VERIFIER_NOT_AUTHORISED, even holding VERIFICATION_OFFICER", async () => {
  const { partyId, evidence } = await registerParty("dual");
  const r = await assertRefused(partyId, assessment(evidence), 403, "VERIFIER_NOT_AUTHORISED", { who: "dual" });
  assert.deepEqual(r.json["reasons"], [`Actor dual-cap02v registered party ${partyId} and cannot also verify it (separation of duties).`]);
  // the same dual-role actor may verify a party someone else registered
  const other = await registerParty();
  assert.equal((await post(verificationsPath(other.partyId), assessment(other.evidence), { who: "dual" })).status, 201);
});

test("a party registered before ActorReference version 2 keeps its version 1 registrant, who still cannot verify it", async () => {
  // Parties registered before version 2 hold a version 1 registered_by, with no issuer.
  // The registrant now authenticates with a version 2 reference: the same actor (AAB-PLATFORM-03, sameActor).
  const { partyId, evidence } = await registerParty("dual");
  await harness.admin.query(`UPDATE scs.party_identity SET registered_by = $2 WHERE party_id = $1`, [partyId, JSON.stringify(actors.dual)]);
  const stored = (await harness.admin.query<{ registered_by: Record<string, unknown> }>(`SELECT registered_by FROM scs.party_identity WHERE party_id = $1`, [partyId])).rows[0]!.registered_by;
  assert.equal("referenceVersion" in stored, false, "the stored registrant is version 1");
  const r = await assertRefused(partyId, assessment(evidence), 403, "VERIFIER_NOT_AUTHORISED", { who: "dual" });
  assert.deepEqual(r.json["reasons"], [`Actor dual-cap02v registered party ${partyId} and cannot also verify it (separation of duties).`]);
  // another verifier may verify it; the version 1 record is read, not rewritten
  assert.equal((await post(verificationsPath(partyId), assessment(evidence), { who: "verifier" })).status, 201);
  const after = (await harness.admin.query<{ registered_by: Record<string, unknown> }>(`SELECT registered_by FROM scs.party_identity WHERE party_id = $1`, [partyId])).rows[0]!.registered_by;
  assert.deepEqual(after, actors.dual);
});

// ── Evidence ─────────────────────────────────────────────────────────────────

test("evidence not linked to the party → 422 VERIFICATION_EVIDENCE_NOT_LINKED naming the unlinked ids", async () => {
  const { partyId, evidence } = await registerParty();
  const stranger = randomUUID();
  const elsewhere = (await registerParty()).evidence[0]!;
  const r = await assertRefused(partyId, assessment([evidence[0]!, stranger, elsewhere]), 422, "VERIFICATION_EVIDENCE_NOT_LINKED");
  const reason = (r.json["reasons"] as string[])[0]!;
  assert.match(reason, /^2 evidence id\(s\) are not linked to party /);
  assert.ok(reason.includes(stranger) && reason.includes(elsewhere), "names every unlinked id, including one linked to another party");
  assert.ok(!reason.includes(evidence[0]!), "does not name the linked id");
});

test("no evidence ids → 400 from the schema", async () => {
  const { partyId } = await registerParty();
  await assertRefused(partyId, assessment([]), 400, "REQUEST_VALIDATION_FAILED");
});

// ── Supersession ─────────────────────────────────────────────────────────────

test("valid supersession → 201; the newer assessment names the older, which is unchanged", async () => {
  const { partyId, evidence } = await registerParty();
  const first = await post(verificationsPath(partyId), assessment(evidence, { verificationStatus: "PARTIALLY_VERIFIED" }));
  const older = assessmentId(first);
  const olderRowBefore = (await harness.admin.query(`SELECT * FROM scs.party_verification_assessment WHERE assessment_id = $1`, [older])).rows[0];

  const second = await post(verificationsPath(partyId), assessment(evidence, { supersedesAssessmentId: older }));
  assert.equal(second.status, 201, JSON.stringify(second.json));
  const newer = assessmentId(second);
  assert.ok((second.json["decision"] as { decisionReasons: string[] }).decisionReasons.some((x) => x.startsWith(`supersessionValid: evaluated — supersedes assessment ${older}`)));

  const superseding = await harness.admin.query(`SELECT assessment_id FROM scs.party_verification_assessment WHERE supersedes_assessment_id = $1`, [older]);
  assert.deepEqual(superseding.rows, [{ assessment_id: newer }], "the older assessment is superseded by the newer one");
  assert.deepEqual((await harness.admin.query(`SELECT * FROM scs.party_verification_assessment WHERE assessment_id = $1`, [older])).rows[0], olderRowBefore, "the older row is not changed");
});

test("supersedesAssessmentId not found → 422 SUPERSEDED_ASSESSMENT_NOT_FOUND", async () => {
  const { partyId, evidence } = await registerParty();
  await assertRefused(partyId, assessment(evidence, { supersedesAssessmentId: randomUUID() }), 422, "SUPERSEDED_ASSESSMENT_NOT_FOUND");
});

test("an assessment of a different party → 422 SUPERSEDED_ASSESSMENT_NOT_FOUND", async () => {
  const a = await registerParty();
  const b = await registerParty();
  const ofA = assessmentId(await post(verificationsPath(a.partyId), assessment(a.evidence)));
  await assertRefused(b.partyId, assessment(b.evidence, { supersedesAssessmentId: ofA }), 422, "SUPERSEDED_ASSESSMENT_NOT_FOUND");
});

test("an assessment already superseded → 409 CONFLICTING_RECORD naming the one that superseded it", async () => {
  const { partyId, evidence } = await registerParty();
  const older = assessmentId(await post(verificationsPath(partyId), assessment(evidence)));
  const newer = assessmentId(await post(verificationsPath(partyId), assessment(evidence, { supersedesAssessmentId: older })));
  const r = await assertRefused(partyId, assessment(evidence, { supersedesAssessmentId: older }), 409, "CONFLICTING_RECORD");
  assert.deepEqual(r.json["reasons"], [`Assessment ${older} is already superseded by assessment ${newer}; an assessment is superseded at most once.`]);
});

test("concurrent supersessions of one assessment → exactly one 201, the other 409", async () => {
  const { partyId, evidence } = await registerParty();
  const older = assessmentId(await post(verificationsPath(partyId), assessment(evidence)));
  const results = await Promise.all([
    post(verificationsPath(partyId), assessment(evidence, { supersedesAssessmentId: older })),
    post(verificationsPath(partyId), assessment(evidence, { supersedesAssessmentId: older, verificationStatus: "DISPUTED" })),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await assessmentsFor(partyId), 2);
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400, nothing written", async () => {
  const { partyId, evidence } = await registerParty();
  assert.equal((await post(verificationsPath(partyId), assessment(evidence), { key: null })).status, 400);
  assert.equal(await assessmentsFor(partyId), 0);
});

test("same key, same content → byte-identical 201 replay; same key, different content → 409", async () => {
  const { partyId, evidence } = await registerParty();
  const body = assessment(evidence);
  const key = `cap02v-${randomUUID()}`;
  const first = await post(verificationsPath(partyId), body, { key });
  const second = await post(verificationsPath(partyId), body, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  const conflict = await post(verificationsPath(partyId), assessment(evidence, { verificationStatus: "DISPUTED" }), { key });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(await assessmentsFor(partyId), 1);
});

// ── Rollback ─────────────────────────────────────────────────────────────────

test("receipt write fails → 500 and the assessment row is absent", async () => {
  const { partyId, evidence } = await registerParty();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_receipt_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_receipt_insert BEFORE INSERT ON scs.decision_receipt
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_receipt_insert();`);
  try {
    const r = await post(verificationsPath(partyId), assessment(evidence));
    assert.equal(r.status, 500);
    assert.equal(r.json["error"], "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.equal(await assessmentsFor(partyId), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_receipt_insert ON scs.decision_receipt; DROP FUNCTION scs.test_fail_receipt_insert();`);
  }
  assert.equal((await post(verificationsPath(partyId), assessment(evidence))).status, 201, "and recording works again once the failure is gone");
});

// ── Database backstops (migration 010) ──────────────────────────────────────

test("migration 010: assessments are append-only — scs_api lacks the privilege; the owner is stopped by the trigger", async () => {
  const { partyId, evidence } = await registerParty();
  const id = assessmentId(await post(verificationsPath(partyId), assessment(evidence)));
  for (const sql of [
    `UPDATE scs.party_verification_assessment SET verification_status = 'DISPUTED' WHERE assessment_id = '${id}'`,
    `DELETE FROM scs.party_verification_assessment WHERE assessment_id = '${id}'`,
  ]) {
    await assert.rejects(api.transaction((tx) => tx.query(sql)), /permission denied/, `scs_api: ${sql}`);
    await assert.rejects(harness.admin.query(sql), /append-only/, `owner: ${sql}`);
  }
  const cols = await harness.admin.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'scs' AND table_name = 'party_verification_assessment' AND column_name = 'updated_at'`,
  );
  assert.equal(cols.rowCount, 0, "updated_at is dropped");
});

test("migration 010: the database refuses a derived status, no evidence, verified after recording, cross-party or double supersession", async () => {
  const a = await registerParty();
  const b = await registerParty();
  const ofA = assessmentId(await post(verificationsPath(a.partyId), assessment(a.evidence)));
  const insert = (partyId: string, status: string, evidence: string[], verifiedAt: string, supersedes: string | null) =>
    harness.admin.query(
      `INSERT INTO scs.party_verification_assessment (party_id, party_version, verification_status, scope_description,
         scope_jurisdiction_code, scope_verified_attributes, scope_excluded_from_verification, verifying_authority_id,
         verifying_authority_name, verifying_authority_basis, verifying_authority_jurisdiction_code, verified_at,
         evidence_ids, limitations, recorded_by, supersedes_assessment_id)
       VALUES ($1, 1, $2, 's', 'TH', '{}', '{}', 'a', 'n', 'b', 'TH', $3, $4, '{}', $5, $6)`,
      [partyId, status, verifiedAt, evidence, JSON.stringify(actors.verifier), supersedes],
    );
  const past = "2025-01-01T00:00:00Z";
  await assert.rejects(insert(a.partyId, "REGISTERED_UNVERIFIED", a.evidence, past, null), /party_verification_assessment_recordable_status_ck/);
  await assert.rejects(insert(a.partyId, "DISPUTED", [], past, null), /party_verification_assessment_evidence_not_empty_ck/);
  await assert.rejects(insert(a.partyId, "DISPUTED", a.evidence, "2999-01-01T00:00:00Z", null), /party_verification_assessment_verified_not_after_recorded_ck/);
  await assert.rejects(insert(b.partyId, "DISPUTED", b.evidence, past, ofA), /party_verification_assessment_supersedes_fk/);
  await insert(a.partyId, "DISPUTED", a.evidence, past, ofA);
  await assert.rejects(insert(a.partyId, "DISPUTED", a.evidence, past, ofA), /party_verification_assessment_supersedes_once_uq/);
});
