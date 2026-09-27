// SCS-CAP-02 addMandateVerificationAssessment — POST /scs/v1/mandates/:mandateId/verifications,
// end to end through the API. Parties are registered through the API, and
// links through the link endpoints, signed with throwaway Ed25519 keys.
// Mandates are inserted directly, so each test can set who registered one,
// its evidence, validity and revocation.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { cap02LinkRoutes } from "../capabilities/cap-02/link-routes.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import type { ScsMandateVerificationAssessmentRequest } from "../types/cap-02.js";
import { issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const WHO = ["officer", "verifier", "verifier2", "dual", "linker", "linkedVerifier", "personVerifier", "linkingVerifier", "staff"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = {
  officer: ["COMPLIANCE_OFFICER"], verifier: ["VERIFICATION_OFFICER"], verifier2: ["VERIFICATION_OFFICER"], dual: ["COMPLIANCE_OFFICER", "VERIFICATION_OFFICER"],
  linker: ["LINK_OFFICER"], linkedVerifier: ["VERIFICATION_OFFICER"], personVerifier: ["VERIFICATION_OFFICER"], linkingVerifier: ["LINK_OFFICER", "VERIFICATION_OFFICER"], staff: [],
};
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-mv`, actorType: "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `mv-${w}-token-0123456789abcdefghijklmnopq`;
const keys = Object.fromEntries(WHO.map((w) => [w, generateKeyPairSync("ed25519")])) as Record<Who, { publicKey: KeyObject; privateKey: KeyObject }>;
const signAs = (w: Who, s: unknown) => sign(null, Buffer.from(canonicalJson(s), "utf8"), keys[w].privateKey).toString("base64");

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
const parties = { grantor: "", rep: "", otherRep: "" };

interface Res { status: number; json: Record<string, unknown>; text: string }

async function call(path: string, body: unknown, opts: { who?: Who; key?: string } = {}): Promise<Res> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${token(opts.who ?? "verifier")}`, "content-type": "application/json", "idempotency-key": opts.key ?? `mv-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({
    actors: WHO.map((w) => ({ tokenSha256: createHash("sha256").update(token(w)).digest("hex"), actor: actors[w], accountableName: `Named ${w}`, signingPublicKey: keys[w].publicKey.export({ format: "der", type: "spki" }).toString("base64") })),
  }, { issuerCountry: "TH" });
  server = createApiServer({ routes: [...CAPABILITY_ROUTES, ...cap02LinkRoutes(authenticator)], authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const register = async (type: "NATURAL_PERSON" | "COOPERATIVE") => {
    const r = await call("/scs/v1/parties", partyRequest(type), { who: "officer" });
    assert.equal(r.status, 201, r.text);
    return (r.json["decision"] as { partyId: string }).partyId;
  };
  parties.grantor = await register("NATURAL_PERSON");
  parties.rep = await register("COOPERATIVE");
  parties.otherRep = await register("COOPERATIVE");
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

interface Mandate { mandateId: string; evidence: string[]; validUntil: string }

/** A mandate from the grantor to a representative party, inserted directly. */
async function mandate(o: { rep?: string; createdBy?: unknown; validUntil?: string; validFrom?: string; revoked?: boolean } = {}): Promise<Mandate> {
  const evidence = [randomUUID(), randomUUID()];
  const validUntil = o.validUntil ?? new Date(Date.now() + 200 * 24 * 3600 * 1000).toISOString();
  const { rows } = await harness.admin.query<{ mandate_id: string; valid_until: Date }>(
    `INSERT INTO scs.representation_mandate (schema_version, granting_party_id, representative_party_id, permitted_actions, framework_association_ids,
       commodity_scope, geographic_scope, valid_from, valid_until, mandate_evidence_ids, verification_status, revocation_status, revoked_at, revocation_reason, created_by)
     VALUES ('1', $1, $2, '{SUBMIT_IDENTITY_EVIDENCE}', $3, '{4001}', '{TH}', $4, $5, $6, 'CLAIMED_UNVERIFIED', $7, $8, $9, $10)
     RETURNING mandate_id, valid_until`,
    [parties.grantor, o.rep ?? parties.rep, [randomUUID()], o.validFrom ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), validUntil, evidence,
      o.revoked ? "REVOKED" : "NOT_REVOKED", o.revoked ? new Date().toISOString() : null, o.revoked ? "The grantor withdrew it." : null,
      JSON.stringify(o.createdBy ?? issuedReference(actors.officer))],
  );
  return { mandateId: rows[0]!.mandate_id, evidence, validUntil: rows[0]!.valid_until.toISOString() };
}

function assessment(m: Mandate, overrides: Partial<ScsMandateVerificationAssessmentRequest> = {}): ScsMandateVerificationAssessmentRequest {
  return {
    verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE",
    verificationScope: {
      scopeDescription: "The grantor's signed consent, and the mandate's actions, commodities and geography.",
      verifiedAttributes: ["grantingPartyConsent", "permittedActions", "commodityScope", "geographicScope"],
      excludedFromVerification: ["frameworkScope"],
    },
    verifyingAuthority: { authorityId: "th-coop-registry", authorityName: "Cooperative registry office", authorityBasis: "Registry procedure for mandates.", jurisdictionCode: "TH" },
    verifiedAt: new Date(Date.now() - 3600_000).toISOString(),
    evidenceIds: [m.evidence[0]!],
    limitations: [],
    ...overrides,
  };
}

const verify = (m: Mandate | string, body: unknown, who: Who = "verifier", key?: string) =>
  call(`/scs/v1/mandates/${typeof m === "string" ? m : m.mandateId}/verifications`, body, { who, ...(key === undefined ? {} : { key }) });
const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async () => ({
  assessments: await count("SELECT count(*) AS n FROM scs.mandate_verification_assessment"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt WHERE capability_id = 'SCS-CAP-02'"),
});

async function refused(p: Promise<Res>, status: number, error: string): Promise<Res> {
  const before = await writes();
  const r = await p;
  assert.equal(r.status, status, r.text);
  assert.equal(r.json["error"], error, r.text);
  assert.deepEqual(await writes(), before, `${error}: nothing written`);
  return r;
}

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, $2)`,
    [sha, JSON.stringify(actors.officer)],
  );
  return sha;
}

/** A link created through the API by `creator`, for `actor` to `partyId`. */
async function link(actor: Who, partyId: string, relation: "IS_SUBJECT" | "ACTS_FOR_SUBJECT", creator: Who = "linker"): Promise<{ linkId: string; linkDigest: string }> {
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: actors[actor].actorId },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: partyId }, relation,
    validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: await storedObject(), description: "Authorisation from the party" }],
    creator: { issuer: TH, actorId: actors[creator].actorId },
  };
  const r = await call("/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signAs(creator, statement) }, { who: creator });
  assert.equal(r.status, 201, r.text);
  return r.json["decision"] as { linkId: string; linkDigest: string };
}

// ── Recording ────────────────────────────────────────────────────────────────

test("a valid assessment → 201 RECORDED: every check true, the derived status, a receipt; the mandate record is unchanged", async () => {
  const m = await mandate();
  const r = await verify(m, assessment(m));
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as Record<string, unknown>;
  assert.equal(d["decision"], "RECORDED");
  assert.equal(d["mandateId"], m.mandateId);
  assert.ok(Object.values(d["eligibilityChecks"] as Record<string, boolean>).every((v) => v === true));
  assert.equal(d["resultingVerificationStatus"], "VERIFIED_FOR_DECLARED_SCOPE");
  assert.deepEqual(d["decidedBy"], issuedReference(actors.verifier));
  const reasons = (d["decisionReasons"] as string[]).join("\n");
  assert.match(reasons, /Verifying authority recorded as declared/);
  assert.match(reasons, /Evidence ids not confirmed/);
  assert.match(reasons, /not either party's identity/);
  const receipt = r.json["receipt"] as Record<string, unknown>;
  assert.equal(receipt["decisionType"], "MANDATE_VERIFICATION");
  assert.equal(receipt["subjectId"], d["assessmentId"]);
  const row = (await harness.admin.query(`SELECT * FROM scs.mandate_verification_assessment WHERE assessment_id = $1`, [d["assessmentId"]])).rows[0] as Record<string, unknown>;
  assert.equal(row["verification_status"], "VERIFIED_FOR_DECLARED_SCOPE");
  assert.deepEqual(row["recorded_by"], issuedReference(actors.verifier));
  assert.equal((row["recorded_at"] as Date).toISOString(), d["decidedAt"]);
  const stored = (await harness.admin.query<{ verification_status: string }>(`SELECT verification_status FROM scs.representation_mandate WHERE mandate_id = $1`, [m.mandateId])).rows[0]!;
  assert.equal(stored.verification_status, "CLAIMED_UNVERIFIED", "the mandate's stored status keeps its starting value");
});

test("same key, same body → byte-identical 201 replay; one assessment", async () => {
  const m = await mandate();
  const body = assessment(m);
  const key = `mv-replay-${randomUUID()}`;
  const first = await verify(m, body, "verifier", key);
  const second = await verify(m, body, "verifier", key);
  assert.equal(first.status, 201, first.text);
  assert.equal(second.text, first.text);
  assert.equal(await count("SELECT count(*) AS n FROM scs.mandate_verification_assessment WHERE mandate_id = $1", [m.mandateId]), 1);
});

test("rule 1: only a VERIFICATION_OFFICER → 403 VERIFIER_NOT_AUTHORISED; rule 2: derived statuses are never recorded → 400", async () => {
  const m = await mandate();
  await refused(verify(m, assessment(m), "officer"), 403, "VERIFIER_NOT_AUTHORISED");
  await refused(verify(m, assessment(m), "linker"), 403, "VERIFIER_NOT_AUTHORISED");
  for (const s of ["CLAIMED_UNVERIFIED", "VERIFICATION_EXPIRED"] as const) {
    await refused(verify(m, assessment(m, { verificationStatus: s })), 400, "VERIFICATION_STATUS_NOT_RECORDABLE");
  }
});

test("rule 3: dates — not in the future; expiry after verification, and never after the mandate's validUntil", async () => {
  const m = await mandate();
  const code = "VALIDITY_PERIOD_INVALID";
  const verifiedAt = new Date(Date.now() - 3600_000).toISOString();
  await refused(verify(m, assessment(m, { verifiedAt: new Date(Date.now() + 3600_000).toISOString() })), 400, code);
  await refused(verify(m, assessment(m, { verifiedAt, expiresAt: verifiedAt })), 400, code);
  await refused(verify(m, assessment(m, { verifiedAt, expiresAt: new Date(Date.now() - 7200_000).toISOString() })), 400, code);
  const r = await refused(verify(m, assessment(m, { verifiedAt, expiresAt: new Date(Date.parse(m.validUntil) + 1000).toISOString() })), 400, code);
  assert.match((r.json["reasons"] as string[])[0]!, /cannot outlast the mandate/);
  // exactly the mandate's validUntil is allowed
  assert.equal((await verify(m, assessment(m, { verifiedAt, expiresAt: m.validUntil }))).status, 201);
});

test("rule 4: the authority's jurisdiction is an ISO 3166-1 alpha-2 code → 422 COUNTRY_CODE_UNRECOGNISED", async () => {
  const m = await mandate();
  for (const code of ["XX", "th", "THA"]) {
    await refused(verify(m, assessment(m, { verifyingAuthority: { ...assessment(m).verifyingAuthority, jurisdictionCode: code } })), 422, "COUNTRY_CODE_UNRECOGNISED");
  }
});

test("rule 5: the mandate exists, is not revoked and has not ended", async () => {
  const unknown = randomUUID();
  await refused(verify(unknown, assessment({ mandateId: unknown, evidence: [randomUUID()], validUntil: "" }, { expiresAt: "2099-01-01T00:00:00Z" })), 404, "MANDATE_NOT_FOUND");
  const revoked = await mandate({ revoked: true });
  await refused(verify(revoked, assessment(revoked)), 422, "MANDATE_NOT_CURRENT");
  const ended = await mandate({ validFrom: new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString(), validUntil: new Date(Date.now() - 24 * 3600 * 1000).toISOString() });
  await refused(verify(ended, assessment(ended, { verifiedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() })), 422, "MANDATE_NOT_CURRENT");
});

test("rule 6: the mandate's registrant never verifies it, whichever reference version recorded them", async () => {
  const v2 = await mandate({ createdBy: issuedReference(actors.dual) });
  const r = await refused(verify(v2, assessment(v2), "dual"), 403, "VERIFIER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /registered mandate .* \(separation of duties\)/);
  const v1 = await mandate({ createdBy: actors.dual });
  await refused(verify(v1, assessment(v1), "dual"), 403, "VERIFIER_NOT_AUTHORISED");
  // the same actor may verify a mandate someone else registered
  const other = await mandate();
  assert.equal((await verify(other, assessment(other), "dual")).status, 201);
});

test("rule 6: no verifier holds a link to either party, in any state, or created a link to the representative", async () => {
  const m = await mandate({ rep: parties.otherRep });
  // holds an ACTS_FOR_SUBJECT link to the representative party; still refused once it is revoked
  const held = await link("linkedVerifier", parties.otherRep, "ACTS_FOR_SUBJECT");
  let r = await refused(verify(m, assessment(m), "linkedVerifier"), 403, "VERIFIER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`holds link ${held.linkId} to party ${parties.otherRep}`));
  const revoke = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: held.linkId, linkDigest: held.linkDigest, action: "REVOKE", reason: "Left the cooperative.", writer: { issuer: TH, actorId: actors.linker.actorId } };
  assert.equal((await call(`/scs/v1/actor-party-links/${held.linkId}/status-records`, { statusStatement: revoke, statementSignature: signAs("linker", revoke) }, { who: "linker" })).status, 201);
  await refused(verify(m, assessment(m), "linkedVerifier"), 403, "VERIFIER_NOT_AUTHORISED");
  // holds an IS_SUBJECT link to the granting party: the person is the grantor
  await link("personVerifier", parties.grantor, "IS_SUBJECT");
  r = await refused(verify(m, assessment(m), "personVerifier"), 403, "VERIFIER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`to party ${parties.grantor}, a party to mandate`));
  // created a link to the representative party
  const created = await link("staff", parties.otherRep, "ACTS_FOR_SUBJECT", "linkingVerifier");
  r = await refused(verify(m, assessment(m), "linkingVerifier"), 403, "VERIFIER_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`created link ${created.linkId} to party ${parties.otherRep}, the mandate's representative`));
  // none of that touches an independent verifier
  assert.equal((await verify(m, assessment(m), "verifier2")).status, 201);
});

test("rule 7: every evidence id is among the mandate's own → 422 VERIFICATION_EVIDENCE_NOT_LINKED, naming the others", async () => {
  const m = await mandate();
  const other = await mandate();
  const stranger = randomUUID();
  const r = await refused(verify(m, assessment(m, { evidenceIds: [m.evidence[0]!, stranger, other.evidence[0]!] })), 422, "VERIFICATION_EVIDENCE_NOT_LINKED");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`2 evidence id\\(s\\).*${stranger}, ${other.evidence[0]}`));
  assert.equal((await verify(m, assessment(m, { evidenceIds: m.evidence }))).status, 201, "all of the mandate's evidence");
});

test("rule 8: supersession within the same mandate, at most once", async () => {
  const m = await mandate();
  const other = await mandate();
  const first = ((await verify(m, assessment(m))).json["decision"] as { assessmentId: string }).assessmentId;
  const theirs = ((await verify(other, assessment(other))).json["decision"] as { assessmentId: string }).assessmentId;
  await refused(verify(m, assessment(m, { supersedesAssessmentId: theirs })), 422, "SUPERSEDED_ASSESSMENT_NOT_FOUND");
  await refused(verify(m, assessment(m, { supersedesAssessmentId: randomUUID() })), 422, "SUPERSEDED_ASSESSMENT_NOT_FOUND");
  const second = await verify(m, assessment(m, { verificationStatus: "DISPUTED", supersedesAssessmentId: first }));
  assert.equal(second.status, 201, second.text);
  assert.equal((second.json["decision"] as Record<string, unknown>)["resultingVerificationStatus"], "DISPUTED");
  await refused(verify(m, assessment(m, { supersedesAssessmentId: first })), 409, "CONFLICTING_RECORD");
});

test("two concurrent supersessions of one assessment → exactly one 201, the other 409 CONFLICTING_RECORD", async () => {
  const m = await mandate();
  const first = ((await verify(m, assessment(m))).json["decision"] as { assessmentId: string }).assessmentId;
  const results = await Promise.all(["verifier", "verifier2"].map((who) => verify(m, assessment(m, { verificationStatus: "PARTIALLY_VERIFIED", supersedesAssessmentId: first }), who as Who)));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});

test("the derived status: the latest standing assessment decides; an expired one reads VERIFICATION_EXPIRED", async () => {
  const m = await mandate();
  const status = async (body: ScsMandateVerificationAssessmentRequest, who: Who = "verifier") => {
    const r = await verify(m, body, who);
    assert.equal(r.status, 201, r.text);
    return (r.json["decision"] as Record<string, unknown>)["resultingVerificationStatus"];
  };
  assert.equal(await status(assessment(m, { verificationStatus: "PARTIALLY_VERIFIED" })), "PARTIALLY_VERIFIED");
  assert.equal(await status(assessment(m), "verifier2"), "VERIFIED_FOR_DECLARED_SCOPE", "a second, independent assessment is the latest");
  const past = new Date(Date.now() - 2 * 3600_000).toISOString();
  assert.equal(await status(assessment(m, { verifiedAt: past, expiresAt: new Date(Date.now() - 3600_000).toISOString() })), "VERIFICATION_EXPIRED", "recorded already expired");
});

test("receipt write fails → 500; no assessment", async () => {
  const m = await mandate();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_mv_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated receipt write failure'; END; $$;
    CREATE TRIGGER test_fail_mv_receipt BEFORE INSERT ON scs.decision_receipt FOR EACH ROW EXECUTE FUNCTION scs.test_fail_mv_receipt();`);
  try {
    const r = await verify(m, assessment(m));
    assert.equal(r.status, 500);
    assert.ok(!r.text.includes("simulated"));
    assert.equal(await count("SELECT count(*) AS n FROM scs.mandate_verification_assessment WHERE mandate_id = $1", [m.mandateId]), 0);
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_mv_receipt ON scs.decision_receipt; DROP FUNCTION scs.test_fail_mv_receipt();`);
  }
});

test("the other half of separation of duties: a verifier of a mandate cannot then link to its representative (PR 4's rule, through the API)", async () => {
  const m = await mandate({ rep: parties.rep });
  assert.equal((await verify(m, assessment(m), "linkingVerifier")).status, 201, "linkingVerifier has created no link to this representative");
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: actors.staff.actorId },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: parties.rep }, relation: "ACTS_FOR_SUBJECT",
    validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: await storedObject(), description: "Letter of authority" }],
    creator: { issuer: TH, actorId: actors.linkingVerifier.actorId },
  };
  const r = await call("/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signAs("linkingVerifier", statement) }, { who: "linkingVerifier" });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json["error"], "LINK_CREATOR_NOT_AUTHORISED");
});
