// Migration 022: the SCS-CAP-02 mandate verification assessment table, tested
// against a database built from every migration. Parties are registered
// through the API; mandates and assessments are inserted directly (the
// verification endpoint is not built yet). Grants and RLS are covered by
// db-security.test.ts, which checks every scs table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKEN = "mandate-verification-schema-token-0123456789";
const ACTOR = { actorId: "officer-mandate-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const VERIFIER = {
  referenceVersion: "2", actorId: "verification-officer-1", issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" }, actorType: "HUMAN",
  authenticationMethod: "STATIC_TOKEN", authorityBasis: [{ role: "VERIFICATION_OFFICER", scopeType: "COUNTRY", scopeId: "TH" }],
};
const VALID_UNTIL = "2027-06-30T00:00:00.000Z";

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let grantor = "";
let representative = "";

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `mandate-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.ok(res.status === 201, `${path}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] }, { issuerCountry: "TH" });
  server = createApiServer({ routes: capabilityRoutes(authenticator), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  grantor = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  representative = (await post("/scs/v1/parties", partyRequest("COOPERATIVE")))["partyId"] as string;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const adminQuery: Query = (sql, values) => harness.admin.query(sql, values);

interface Mandate { mandateId: string; evidence: string[] }

/** Registers a mandate directly, with two evidence ids. */
async function mandate(): Promise<Mandate> {
  const evidence = [randomUUID(), randomUUID()];
  const { rows } = await harness.admin.query<{ mandate_id: string }>(
    `INSERT INTO scs.representation_mandate (schema_version, granting_party_id, representative_party_id, permitted_actions,
       framework_association_ids, commodity_scope, geographic_scope, valid_from, valid_until, mandate_evidence_ids,
       verification_status, revocation_status, created_by)
     VALUES ('1', $1, $2, '{SUBMIT_IDENTITY_EVIDENCE}', $3, '{4001}', '{TH}', '2026-07-01T00:00:00Z', $4, $5, 'CLAIMED_UNVERIFIED', 'NOT_REVOKED', $6)
     RETURNING mandate_id`,
    [grantor, representative, [randomUUID()], VALID_UNTIL, evidence, JSON.stringify(ACTOR)],
  );
  return { mandateId: rows[0]!.mandate_id, evidence };
}

function assess(m: Mandate, cols: Record<string, unknown> = {}, q: Query = adminQuery): Promise<string> {
  const c: Record<string, unknown> = {
    assessment_id: randomUUID(),
    mandate_id: m.mandateId,
    schema_version: "1",
    verification_status: "VERIFIED_FOR_DECLARED_SCOPE",
    scope_description: "The grantor's signature on the mandate and its declared scope.",
    scope_verified_attributes: ["grantorSignature", "permittedActions", "validity"],
    scope_excluded_from_verification: ["grantorIdentity"],
    verifying_authority_id: "th-coop-registry",
    verifying_authority_name: "Cooperative registry office",
    verifying_authority_basis: "Registry of cooperatives, mandate verification procedure.",
    verifying_authority_jurisdiction_code: "TH",
    verified_at: "2026-09-26T00:00:00Z",
    expires_at: "2027-03-26T00:00:00Z",
    evidence_ids: [m.evidence[0]],
    limitations: [],
    recorded_by: JSON.stringify(VERIFIER),
    ...cols,
  };
  const names = Object.keys(c);
  return q(`INSERT INTO scs.mandate_verification_assessment (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, names.map((n) => c[n]))
    .then(() => c["assessment_id"] as string);
}


test("migration 022 creates the table and its trigger", async () => {
  const { rows } = await harness.admin.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'scs' AND table_name = 'mandate_verification_assessment'`);
  assert.equal(rows.length, 1);
  const t = await harness.admin.query(`SELECT tgname FROM pg_trigger WHERE tgname = 'mandate_verification_assessment_within_mandate'`);
  assert.equal(t.rows.length, 1);
});

test("scs_api can record and read an assessment; nobody can change it", async () => {
  const m = await mandate();
  const id = await api.transaction((tx) => assess(m, {}, (sql, values) => tx.query(sql, values)));
  const read = await api.transaction((tx) => tx.query(`SELECT verification_status FROM scs.mandate_verification_assessment WHERE assessment_id = $1`, [id]));
  assert.equal(read.rows[0]!["verification_status"], "VERIFIED_FOR_DECLARED_SCOPE");
  await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.mandate_verification_assessment SET limitations = '{}' WHERE assessment_id = $1`, [id])), /permission denied/);
  await assert.rejects(api.transaction((tx) => tx.query(`DELETE FROM scs.mandate_verification_assessment WHERE assessment_id = $1`, [id])), /permission denied/);
  await assert.rejects(harness.admin.query(`UPDATE scs.mandate_verification_assessment SET limitations = '{}' WHERE assessment_id = $1`, [id]), /append-only/);
  await assert.rejects(harness.admin.query(`DELETE FROM scs.mandate_verification_assessment WHERE assessment_id = $1`, [id]), /append-only/);
  await assert.rejects(harness.admin.query(`TRUNCATE scs.mandate_verification_assessment`), /append-only/);
  // the mandate's own status is never updated by verification
  const status = await harness.admin.query(`SELECT verification_status FROM scs.representation_mandate WHERE mandate_id = $1`, [m.mandateId]);
  assert.equal(status.rows[0]!["verification_status"], "CLAIMED_UNVERIFIED");
});

test("only recordable statuses; every recordable status is accepted", async () => {
  const m = await mandate();
  for (const s of ["PARTIALLY_VERIFIED", "VERIFIED_FOR_DECLARED_SCOPE", "DISPUTED", "FAIL_CLOSED"]) await assess(m, { verification_status: s });
  for (const s of ["CLAIMED_UNVERIFIED", "VERIFICATION_EXPIRED", "VERIFIED"]) {
    await assert.rejects(assess(m, { verification_status: s }), /mandate_verification_assessment_recordable_status_ck/, s);
  }
});

test("evidence: at least one, each among the mandate's own evidence", async () => {
  const m = await mandate();
  await assess(m, { evidence_ids: m.evidence });
  await assert.rejects(assess(m, { evidence_ids: [] }), /mandate_verification_assessment_evidence_not_empty_ck/);
  await assert.rejects(assess(m, { evidence_ids: [m.evidence[0], randomUUID()] }), /mandate_verification_assessment_evidence_in_mandate_ck/);
  const other = await mandate();
  await assert.rejects(assess(m, { evidence_ids: [other.evidence[0]] }), /mandate_verification_assessment_evidence_in_mandate_ck/, "another mandate's evidence");
  await assert.rejects(assess(m, { evidence_ids: [m.evidence[0], null] }), /mandate_verification_assessment_arrays_no_null_elements_ck/);
});

test("expiry: after verification, never after the mandate's validUntil; optional", async () => {
  const m = await mandate();
  await assess(m, { expires_at: VALID_UNTIL });
  await assess(m, { expires_at: null });
  await assert.rejects(assess(m, { expires_at: "2027-06-30T00:00:01Z" }), /mandate_verification_assessment_within_validity_ck/);
  await assert.rejects(assess(m, { expires_at: "2026-09-25T00:00:00Z" }), /mandate_verification_assessment_expiry_after_verification_ck/);
  await assert.rejects(assess(m, { verified_at: "2099-01-01T00:00:00Z", expires_at: null }), /mandate_verification_assessment_verified_not_after_recorded_ck/);
});

test("the mandate exists; the boundary holds; text, jurisdiction and recorder are well formed", async () => {
  const m = await mandate();
  await assert.rejects(assess({ mandateId: randomUUID(), evidence: m.evidence }), /mandate_verification_assessment_mandate_fk/);
  for (const flag of ["boundary_does_not_extend_the_mandates_scope", "boundary_does_not_verify_either_partys_identity", "boundary_does_not_grant_regulatory_eligibility"]) {
    await assert.rejects(assess(m, { [flag]: false }), /mandate_verification_assessment_boundary_ck/, flag);
  }
  for (const col of ["scope_description", "verifying_authority_id", "verifying_authority_name", "verifying_authority_basis"]) {
    await assert.rejects(assess(m, { [col]: "  " }), /mandate_verification_assessment_required_text_not_blank_ck/, col);
  }
  await assert.rejects(assess(m, { verifying_authority_jurisdiction_code: "th" }), /mandate_verification_assessment_jurisdiction_ck/);
  await assert.rejects(assess(m, { limitations: [null] }), /mandate_verification_assessment_arrays_no_null_elements_ck/);
  await assert.rejects(assess(m, { scope_verified_attributes: [null] }), /mandate_verification_assessment_arrays_no_null_elements_ck/);
  await assert.rejects(assess(m, { recorded_by: JSON.stringify("verification-officer-1") }), /mandate_verification_assessment_recorded_by_object_ck/);
});

test("supersession: within the same mandate, at most once, never itself", async () => {
  const m = await mandate();
  const first = await assess(m);
  await assess(m, { supersedes_assessment_id: first, verification_status: "DISPUTED" });
  await assert.rejects(assess(m, { supersedes_assessment_id: first }), /mandate_verification_assessment_supersedes_once_uq/);
  const other = await mandate();
  const theirs = await assess(other);
  await assert.rejects(assess(m, { supersedes_assessment_id: theirs }), /mandate_verification_assessment_supersedes_fk/);
  const self = randomUUID();
  await assert.rejects(assess(m, { assessment_id: self, supersedes_assessment_id: self }), /mandate_verification_assessment_not_self_superseding_ck/);
});
