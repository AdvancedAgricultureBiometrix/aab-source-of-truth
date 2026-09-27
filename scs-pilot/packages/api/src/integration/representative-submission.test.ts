// Representative submission (SCS-CAP-02 "Representative submission";
// AAB-PLATFORM-03 section 3; AAB-PLATFORM-04 section 3), end to end through
// the API, for all three acts that are mandate actions:
//   SCS-CAP-02 identity evidence, SCS-CAP-04 deforestation evidence,
//   SCS-CAP-05 custody events.
// The eight checks are shared code, so they are exercised one by one on
// identity evidence; SCS-CAP-04 and SCS-CAP-05 are exercised on what is their
// own: the party the act is for, the scope, and what is recorded.
//
// Set-up runs in two phases. Parties, frameworks, relationships, links (signed
// with throwaway Ed25519 keys), mandate verifications and a plot are created
// first; the actors file is then loaded again with the subject grants that
// name those parties, and with one link creator's key rotated, so a link they
// signed no longer verifies. Mandates are inserted directly, so each test can
// set their actions, validity and revocation.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { capabilityRoutes } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { canonicalJson } from "../foundation/canonical.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import type { ScsCustodyEventSubmissionRequest } from "../types/cap-05.js";
import type { ScsDeforestationEvidenceSubmissionRequest } from "../types/cap-04.js";
import { frameworkRequest, issuedReference, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const WHO = ["officer", "linker", "linkerOld", "verifier", "viewer", "rep", "repScoped", "repElsewhere", "rep2", "repPerson", "repSuspended", "repRetired", "repForged", "dual", "repDeployment"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = {
  officer: ["COMPLIANCE_OFFICER"], linker: ["LINK_OFFICER"], linkerOld: ["LINK_OFFICER"], verifier: ["VERIFICATION_OFFICER"], viewer: ["VIEWER"],
  // PARTY_REPRESENTATIVE counts only when granted for the representative party (subjectGrants, phase 2)
  rep: [], repScoped: [], repElsewhere: [], rep2: [], repPerson: [], repSuspended: [], repRetired: [], repForged: [], dual: ["COMPLIANCE_OFFICER"],
  // deployment-wide: never enough (SCS-CAP-02, fifth amendment)
  repDeployment: ["PARTY_REPRESENTATIVE"],
};
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-rs`, actorType: "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `rs-${w}-token-0123456789abcdefghijklmnopq`;
const keys = Object.fromEntries(WHO.map((w) => [w, generateKeyPairSync("ed25519")])) as Record<Who, { publicKey: KeyObject; privateKey: KeyObject }>;
const rotated = generateKeyPairSync("ed25519");
const spki = (k: KeyObject) => k.export({ format: "der", type: "spki" }).toString("base64");
const signAs = (w: Who, s: unknown) => sign(null, Buffer.from(canonicalJson(s), "utf8"), keys[w].privateKey).toString("base64");
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
const p = { farmer: "", farmerVN: "", otherFarmer: "", coop: "", coop2: "", coop3: "" };
const fw = { rubber: "", cocoa: "" };
const plot = { rubber: { plotId: "", associationId: "" }, cocoa: { plotId: "", associationId: "" } };
const m = { all: "", unverified: "", disputed: "", narrow: "", otherRep: "", revoked: "", future: "", vn: "", noRelationship: "" };
const links: Record<string, string> = {};

interface Res { status: number; json: Record<string, unknown>; text: string }

async function post(path: string, body: unknown, who: Who = "officer", key?: string): Promise<Res> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${token(who)}`, "content-type": "application/json", "idempotency-key": key ?? `rs-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}
async function created(path: string, body: unknown, idField: string, who: Who = "officer"): Promise<string> {
  const r = await post(path, body, who);
  assert.equal(r.status, 201, `${path}: ${r.text}`);
  return (r.json["decision"] as Record<string, string>)[idField]!;
}

function authenticator(phase: 1 | 2): StaticTokenAuthenticator {
  const representing = (partyId: string) => [{ role: "PARTY_REPRESENTATIVE", scopeId: `SCS:PARTY:${partyId}` }];
  const grants: Partial<Record<Who, Array<{ role: string; scopeId: string }>>> = phase === 1 ? {} : {
    rep: representing(p.coop), repScoped: representing(p.coop), rep2: representing(p.coop), repSuspended: representing(p.coop),
    repForged: representing(p.coop), dual: representing(p.coop), repElsewhere: representing(p.coop2),
    repPerson: representing(p.otherFarmer), repRetired: representing(p.coop3),
  };
  return StaticTokenAuthenticator.fromConfig({
    actors: WHO.map((w) => ({
      tokenSha256: createHash("sha256").update(token(w)).digest("hex"),
      actor: actors[w],
      accountableName: `Named ${w}`,
      signingPublicKey: spki(phase === 2 && w === "linkerOld" ? rotated.publicKey : keys[w].publicKey),
      ...(grants[w] === undefined ? {} : { subjectGrants: grants[w] }),
    })),
  }, { issuerCountry: "TH" });
}

async function listen(auth: StaticTokenAuthenticator): Promise<void> {
  server = createApiServer({ routes: capabilityRoutes(auth), authenticator: auth, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'image/tiff', 'test', $1, $2)`,
    [sha, JSON.stringify(actors.officer)],
  );
  return sha;
}

async function relationship(from: string, to: string): Promise<string> {
  return created("/scs/v1/relationships", {
    fromPartyId: from, toPartyId: to, relationshipType: "SUPPLIES_TO", commodityScope: ["4001"], geographicScope: ["TH"],
    frameworkAssociationIds: [fw.rubber], claimedByPartyId: from, relationshipEvidenceIds: [],
  }, "relationshipId");
}

/** A mandate, inserted directly: from `granting` to `rep`, permitting every mandate action unless told otherwise. */
async function mandate(granting: string, rep: string, o: { actions?: string[]; validFrom?: string; validUntil?: string; revoked?: boolean } = {}): Promise<string> {
  const { rows } = await harness.admin.query<{ mandate_id: string }>(
    `INSERT INTO scs.representation_mandate (schema_version, granting_party_id, representative_party_id, permitted_actions, framework_association_ids,
       commodity_scope, geographic_scope, valid_from, valid_until, mandate_evidence_ids, verification_status, revocation_status, revoked_at, revocation_reason, created_by)
     VALUES ('1', $1, $2, $3, $4, '{4001}', '{TH}', $5, $6, $7, 'CLAIMED_UNVERIFIED', $8, $9, $10, $11) RETURNING mandate_id`,
    [granting, rep, o.actions ?? ["SUBMIT_IDENTITY_EVIDENCE", "SUBMIT_DEFORESTATION_EVIDENCE", "SUBMIT_CUSTODY_EVIDENCE"], [fw.rubber],
      o.validFrom ?? "2026-01-01T00:00:00Z", o.validUntil ?? "2027-06-01T00:00:00Z", [randomUUID()],
      o.revoked ? "REVOKED" : "NOT_REVOKED", o.revoked ? "2026-08-01T00:00:00Z" : null, o.revoked ? "Withdrawn by the grantor." : null, JSON.stringify(issuedReference(actors.officer))],
  );
  return rows[0]!.mandate_id;
}

async function verifyMandate(mandateId: string, status = "VERIFIED_FOR_DECLARED_SCOPE"): Promise<void> {
  const evidence = (await harness.admin.query<{ e: string[] }>(`SELECT mandate_evidence_ids AS e FROM scs.representation_mandate WHERE mandate_id = $1`, [mandateId])).rows[0]!.e;
  const r = await post(`/scs/v1/mandates/${mandateId}/verifications`, {
    verificationStatus: status,
    verificationScope: { scopeDescription: "The grantor's signed consent and the mandate's scope.", verifiedAttributes: ["grantingPartyConsent"], excludedFromVerification: [] },
    verifyingAuthority: { authorityId: "th-registry", authorityName: "Registry office", authorityBasis: "Mandate procedure.", jurisdictionCode: "TH" },
    verifiedAt: new Date(Date.now() - 3600_000).toISOString(),
    evidenceIds: evidence,
    limitations: [],
  }, "verifier");
  assert.equal(r.status, 201, r.text);
}

async function link(actor: Who, partyId: string, relation: "IS_SUBJECT" | "ACTS_FOR_SUBJECT", creator: Who = "linker"): Promise<{ linkId: string; linkDigest: string }> {
  const statement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: { issuer: TH, actorId: actors[actor].actorId },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: partyId }, relation,
    validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    authorisationEvidence: [{ evidenceObjectSha256: await storedObject(), description: "Letter of authority from the party" }],
    creator: { issuer: TH, actorId: actors[creator].actorId },
  };
  const r = await post("/scs/v1/actor-party-links", { linkStatement: statement, statementSignature: signAs(creator, statement) }, creator);
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { linkId: string; linkDigest: string };
  links[actor] = d.linkId;
  return d;
}

async function registerPlot(frameworkId: string, commodityCode: string) {
  const r = await post("/scs/v1/plots", {
    plot: {
      plotName: `Plot ${randomUUID()}`, countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "cooperative field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: p.farmer, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId, commodityCode, associationReason: "EUDR due diligence" }],
  });
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { plotId: string; frameworkAssociationResults: Array<{ associationId: string }> };
  return { plotId: d.plotId, associationId: d.frameworkAssociationResults[0]!.associationId };
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  await listen(authenticator(1));

  fw.rubber = await created("/scs/v1/frameworks", frameworkRequest(), "frameworkId");
  fw.cocoa = await created("/scs/v1/frameworks", frameworkRequest("1801", "TH"), "frameworkId");
  p.farmer = await created("/scs/v1/parties", partyRequest("NATURAL_PERSON"), "partyId");
  p.farmerVN = await created("/scs/v1/parties", { ...partyRequest("NATURAL_PERSON"), countryOfRegistration: "VN" }, "partyId");
  p.otherFarmer = await created("/scs/v1/parties", partyRequest("NATURAL_PERSON"), "partyId");
  p.coop = await created("/scs/v1/parties", partyRequest("COOPERATIVE"), "partyId");
  p.coop2 = await created("/scs/v1/parties", partyRequest("COOPERATIVE"), "partyId");
  p.coop3 = await created("/scs/v1/parties", partyRequest("COOPERATIVE"), "partyId");
  await relationship(p.farmer, p.coop);
  await relationship(p.farmer, p.coop2);
  await relationship(p.farmerVN, p.coop);

  m.all = await mandate(p.farmer, p.coop);
  m.unverified = await mandate(p.farmer, p.coop);
  m.disputed = await mandate(p.farmer, p.coop);
  m.narrow = await mandate(p.farmer, p.coop, { actions: ["SUBMIT_CUSTODY_EVIDENCE"] });
  m.otherRep = await mandate(p.farmer, p.coop2);
  m.revoked = await mandate(p.farmer, p.coop, { revoked: true });
  m.future = await mandate(p.farmer, p.coop, { validFrom: "2026-12-01T00:00:00Z" });
  m.vn = await mandate(p.farmerVN, p.coop);
  m.noRelationship = await mandate(p.otherFarmer, p.coop);
  for (const id of [m.all, m.disputed, m.narrow, m.otherRep, m.future, m.vn, m.noRelationship]) await verifyMandate(id);
  // the latest assessment is adverse: it decides, over the older positive one
  await verifyMandate(m.disputed, "DISPUTED");

  for (const w of ["rep", "repScoped", "repElsewhere", "repSuspended", "dual", "repDeployment"] as const) await link(w, p.coop, "ACTS_FOR_SUBJECT");
  await link("repPerson", p.otherFarmer, "IS_SUBJECT");
  await link("repRetired", p.coop3, "ACTS_FOR_SUBJECT");
  await link("repForged", p.coop, "ACTS_FOR_SUBJECT", "linkerOld");
  const suspendedLink = (await harness.admin.query<{ link_id: string; link_digest: string }>(`SELECT link_id, link_digest FROM scs.actor_party_link WHERE link_id = $1`, [links["repSuspended"]])).rows[0]!;
  const suspend = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: suspendedLink.link_id, linkDigest: suspendedLink.link_digest, action: "SUSPEND", reason: "Under review.", writer: { issuer: TH, actorId: actors.linker.actorId } };
  assert.equal((await post(`/scs/v1/actor-party-links/${suspendedLink.link_id}/status-records`, { statusStatement: suspend, statementSignature: signAs("linker", suspend) }, "linker")).status, 201);
  await harness.admin.query(`UPDATE scs.party_identity SET registration_status = 'RETIRED' WHERE party_id = $1`, [p.coop3]);

  plot.rubber = await registerPlot(fw.rubber, "4001");
  plot.cocoa = await registerPlot(fw.cocoa, "1801");

  await new Promise<void>((r) => server.close(() => r()));
  await listen(authenticator(2));
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const writes = async () => ({
  submissions: await count("SELECT count(*) AS n FROM scs.party_identity_evidence_submission"),
  evidence: await count("SELECT count(*) AS n FROM scs.deforestation_evidence_record"),
  events: await count("SELECT count(*) AS n FROM scs.custody_event"),
  receipts: await count("SELECT count(*) AS n FROM scs.decision_receipt"),
});
async function refused(r: Promise<Res>, status: number, error: string): Promise<Res> {
  const before = await writes();
  const res = await r;
  assert.equal(res.status, status, res.text);
  assert.equal(res.json["error"], error, res.text);
  assert.deepEqual(await writes(), before, `${error}: nothing written`);
  return res;
}

const under = (mandateId: string, representativePartyId = p.coop) => ({ representativePartyId, mandateId });
const identity = (actingUnder?: { representativePartyId: string; mandateId: string }) => ({ evidenceIds: [randomUUID()], evidenceLimitations: [], ...(actingUnder === undefined ? {} : { actingUnder }) });
const submitIdentity = (partyId: string, who: Who, actingUnder?: { representativePartyId: string; mandateId: string }, key?: string) =>
  post(`/scs/v1/parties/${partyId}/evidence`, identity(actingUnder), who, key);

// ── Authority ────────────────────────────────────────────────────────────────

test("authority: a COMPLIANCE_OFFICER submits directly; sending actingUnder, or a PARTY_REPRESENTATIVE without it, is refused", async () => {
  const direct = await submitIdentity(p.farmer, "officer");
  assert.equal(direct.status, 201, direct.text);
  assert.equal("representation" in ((direct.json["decision"] as Record<string, Record<string, unknown>>)["eligibilityChecks"]!), false, "a direct act records no representation");
  assert.deepEqual((direct.json["decision"] as Record<string, unknown>)["decidedBy"], issuedReference(actors.officer));
  let r = await refused(submitIdentity(p.farmer, "officer", under(m.all)), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /requires the PARTY_REPRESENTATIVE role .* A COMPLIANCE_OFFICER submits directly, without actingUnder\./);
  r = await refused(submitIdentity(p.farmer, "rep"), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /submits only under a mandate/);
  await refused(submitIdentity(p.farmer, "viewer"), 403, "REGISTRANT_NOT_AUTHORISED");
  await refused(submitIdentity(p.farmer, "viewer", under(m.all)), 403, "REPRESENTATIVE_NOT_AUTHORISED");
});

test("check 1: PARTY_REPRESENTATIVE counts only when granted for the representative party — never deployment-wide, never for another party", async () => {
  assert.equal((await submitIdentity(p.farmer, "repScoped", under(m.all))).status, 201, "granted for this party");
  let r = await refused(submitIdentity(p.farmer, "repElsewhere", under(m.all)), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`PARTY_REPRESENTATIVE role granted for party ${p.coop} \\(scopeType SUBJECT\\)`));
  r = await refused(submitIdentity(p.farmer, "repDeployment", under(m.all)), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /granted for party/, "a deployment-wide grant, even with an ACTIVE link, is not enough");
  // without actingUnder, a deployment-wide representative is still a representative, refused as one
  r = await refused(submitIdentity(p.farmer, "repDeployment"), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  assert.match((r.json["reasons"] as string[])[0]!, /submits only under a mandate/);
});

// ── A representative submission, recorded ────────────────────────────────────

test("identity evidence as a representative → 201: every check recorded, and the act names its link, mandate and both parties", async () => {
  const r = await submitIdentity(p.farmer, "rep", under(m.all));
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { submissionId: string; eligibilityChecks: Record<string, unknown>; decidedBy: Record<string, unknown>; decisionReasons: string[] };
  assert.deepEqual(d.eligibilityChecks["representation"], {
    representativeRoleHeld: true, activeLinkToRepresentativeParty: true, mandatePartiesMatch: true, mandateCurrent: true,
    actionPermitted: true, withinMandateScope: true, relationshipActive: true, mandateVerified: true,
  });
  const representation = { domain: "SCS", subjectType: "PARTY", subjectId: p.coop, actorLinkId: links["rep"], basis: { basisType: "MANDATE", basisId: m.all, onBehalfOfSubjectId: p.farmer } };
  // the recorded reference carries the party-scoped grant the act relied on, and the representation
  const authorityBasis = [{ role: "PARTY_REPRESENTATIVE", scopeType: "SUBJECT", scopeId: `SCS:PARTY:${p.coop}` }];
  assert.deepEqual(d.decidedBy, { ...issuedReference(actors.rep), authorityBasis, representation });
  assert.deepEqual((r.json["receipt"] as Record<string, unknown>)["issuedFor"], d.decidedBy);
  assert.equal(d.decisionReasons.filter((x) => x.startsWith("representation.")).length, 8);
  const row = (await harness.admin.query(`SELECT submitted_by FROM scs.party_identity_evidence_submission WHERE submission_id = $1`, [d.submissionId])).rows[0] as { submitted_by: unknown };
  assert.deepEqual(row.submitted_by, d.decidedBy, "the stored submission names the representation");
});

test("same key, same body → byte-identical replay; a dual-role actor acts as a representative only with actingUnder", async () => {
  const key = `rs-replay-${randomUUID()}`;
  const body = identity(under(m.all));
  const first = await post(`/scs/v1/parties/${p.farmer}/evidence`, body, "rep", key);
  const second = await post(`/scs/v1/parties/${p.farmer}/evidence`, body, "rep", key);
  assert.equal(first.status, 201, first.text);
  assert.equal(second.text, first.text);
  const asRep = await submitIdentity(p.farmer, "dual", under(m.all));
  assert.equal(asRep.status, 201, asRep.text);
  assert.ok("representation" in ((asRep.json["decision"] as Record<string, Record<string, unknown>>)["eligibilityChecks"]!));
  const direct = await submitIdentity(p.farmer, "dual");
  assert.equal(direct.status, 201, direct.text);
  assert.equal("representation" in ((direct.json["decision"] as Record<string, Record<string, unknown>>)["eligibilityChecks"]!), false);
});

// ── The eight checks, each failing in turn ───────────────────────────────────

test("check 2, the link: none, suspended, not verifying, the wrong relation, a retired party", async () => {
  let r = await refused(submitIdentity(p.farmer, "rep2", under(m.all)), 404, "LINK_NOT_FOUND");
  assert.match((r.json["reasons"] as string[])[0]!, /holds no ACTS_FOR_SUBJECT link/);
  r = await refused(submitIdentity(p.farmer, "repSuspended", under(m.all)), 422, "LINK_NOT_ACTIVE");
  assert.match((r.json["reasons"] as string[])[0]!, /is SUSPENDED/);
  r = await refused(submitIdentity(p.farmer, "repForged", under(m.all)), 422, "LINK_SIGNATURE_INVALID");
  assert.match((r.json["reasons"] as string[])[0]!, /does not verify against its creator's registered key/, "signed with a key its creator no longer holds");
  r = await refused(submitIdentity(p.otherFarmer, "repPerson", under(m.noRelationship, p.otherFarmer)), 422, "LINK_RELATION_NOT_PERMITTED");
  assert.match((r.json["reasons"] as string[])[0]!, /is IS_SUBJECT; this act requires ACTS_FOR_SUBJECT/);
  await refused(submitIdentity(p.farmer, "repRetired", under(m.all, p.coop3)), 422, "LINK_SUBJECT_NOT_CURRENT");
});

test("check 3, the mandate and its parties: it exists, names the linked party, and is granted by the party the act is for", async () => {
  await refused(submitIdentity(p.farmer, "rep", under(randomUUID())), 404, "MANDATE_NOT_FOUND");
  let r = await refused(submitIdentity(p.farmer, "rep", under(m.otherRep)), 422, "MANDATE_PARTIES_MISMATCH");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`representative is party ${p.coop2}, not the linked party ${p.coop}`));
  r = await refused(submitIdentity(p.otherFarmer, "rep", under(m.all)), 422, "MANDATE_PARTIES_MISMATCH");
  assert.match((r.json["reasons"] as string[])[0]!, new RegExp(`granted by party ${p.farmer}, which is not the path's party`));
  await refused(submitIdentity(randomUUID(), "rep", under(m.all)), 422, "MANDATE_PARTIES_MISMATCH");
});

test("checks 4 and 5: the mandate is current, and permits the act", async () => {
  await refused(submitIdentity(p.farmer, "rep", under(m.revoked)), 422, "MANDATE_NOT_CURRENT");
  const r = await refused(submitIdentity(p.farmer, "rep", under(m.future)), 422, "MANDATE_NOT_CURRENT");
  assert.match((r.json["reasons"] as string[])[0]!, /outside mandate .* validity/);
  await refused(submitIdentity(p.farmer, "rep", under(m.narrow)), 422, "MANDATE_ACTION_NOT_PERMITTED");
});

test("check 6, scope: for identity evidence, the party's country is within the mandate's geographicScope", async () => {
  const r = await refused(submitIdentity(p.farmerVN, "rep", under(m.vn)), 422, "MANDATE_SCOPE_MISMATCH");
  assert.match((r.json["reasons"] as string[])[0]!, /the party's country of operation \(or registration\) \(VN\) is not within its geographicScope \(TH\)/);
});

test("checks 7 and 8: an ACTIVE relationship covers the mandate; the mandate is verified — a newer adverse assessment decides", async () => {
  await refused(submitIdentity(p.otherFarmer, "rep", under(m.noRelationship)), 422, "MANDATE_RELATIONSHIP_NOT_ACTIVE");
  let r = await refused(submitIdentity(p.farmer, "rep", under(m.unverified)), 422, "MANDATE_NOT_VERIFIED");
  assert.match((r.json["reasons"] as string[])[0]!, /CLAIMED_UNVERIFIED; .* never accepted as a limitation/);
  r = await refused(submitIdentity(p.farmer, "rep", under(m.disputed)), 422, "MANDATE_NOT_VERIFIED");
  assert.match((r.json["reasons"] as string[])[0]!, /is DISPUTED/);
});

// ── SCS-CAP-04: deforestation evidence ───────────────────────────────────────

function deforestation(target: { plotId: string; associationId: string }, objectId: string, actingUnder?: { representativePartyId: string; mandateId: string }): ScsDeforestationEvidenceSubmissionRequest {
  return {
    plotId: target.plotId,
    frameworkAssociationId: target.associationId,
    ...(actingUnder === undefined ? {} : { actingUnder }),
    evidenceType: "SATELLITE_IMAGE",
    source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA-COPERNICUS", sourceTitle: "Sentinel-2 L2A scene", providerName: "Copernicus Data Space", sourceReference: "https://dataspace.copernicus.eu/" },
    evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A_20240630T033539", contentDigest: objectId, chainOfCustodyComplete: true },
    spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
    temporalCoverage: {
      acquisitionStart: "2020-12-01T00:00:00Z", acquisitionEnd: "2024-06-30T00:00:00Z", analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-06-30T00:00:00Z",
      coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [],
    },
    evidenceClaim: {
      claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No tree cover loss detected within the plot boundary.", claimedPeriodStart: "2020-12-31T00:00:00Z",
      claimedPeriodEnd: "2024-06-30T00:00:00Z", confidence: "MEDIUM", limitations: [],
    },
    coverageAttestation: { attestationProvided: false },
  };
}

test("SCS-CAP-04 as a representative → admitted, the representation in the admission checks and the stored record", async () => {
  const r = await post("/scs/v1/deforestation-evidence", deforestation(plot.rubber, await storedObject(), under(m.all)), "rep");
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { evidenceId: string; admissionChecks: Record<string, unknown>; decidedBy: Record<string, unknown> };
  assert.ok(Object.values(d.admissionChecks["representation"] as Record<string, boolean>).every((v) => v === true));
  assert.deepEqual((d.decidedBy["representation"] as Record<string, unknown>)["basis"], { basisType: "MANDATE", basisId: m.all, onBehalfOfSubjectId: p.farmer });
  const row = (await harness.admin.query(`SELECT submitted_by FROM scs.deforestation_evidence_record WHERE evidence_id = $1`, [d.evidenceId])).rows[0] as { submitted_by: unknown };
  assert.deepEqual(row.submitted_by, d.decidedBy);
});

test("SCS-CAP-04: the act is for the plot's producer or a tenure claimant, within the association's framework and commodity", async () => {
  // otherFarmer neither produces on the plot nor claims it
  const r = await refused(post("/scs/v1/deforestation-evidence", deforestation(plot.rubber, await storedObject(), under(m.noRelationship)), "rep"), 422, "MANDATE_PARTIES_MISMATCH");
  assert.match((r.json["reasons"] as string[])[0]!, /not the plot's producer or operator, or a party holding a tenure claim/);
  // the cocoa plot's association is outside the rubber mandate
  const s = await refused(post("/scs/v1/deforestation-evidence", deforestation(plot.cocoa, await storedObject(), under(m.all)), "rep"), 422, "MANDATE_SCOPE_MISMATCH");
  assert.match((s.json["reasons"] as string[])[0]!, new RegExp(`framework ${fw.cocoa} is not among .*commodity 1801 is not within`));
  await refused(post("/scs/v1/deforestation-evidence", deforestation(plot.rubber, await storedObject(), under(m.all)), "officer"), 403, "REPRESENTATIVE_NOT_AUTHORISED");
  await refused(post("/scs/v1/deforestation-evidence", deforestation(plot.rubber, await storedObject()), "rep"), 403, "REPRESENTATIVE_NOT_AUTHORISED");
});

// ── SCS-CAP-05: custody events ───────────────────────────────────────────────

function custody(o: { source?: string; country?: string; actingUnder?: { representativePartyId: string; mandateId: string }; eventMandate?: string; framework?: string; commodity?: string } = {}): ScsCustodyEventSubmissionRequest {
  return {
    frameworkAssociationId: o.framework ?? fw.rubber,
    eventType: "PURCHASE",
    sourceParty: { partyId: o.source ?? p.farmer, partyRoleAtEvent: "SUPPLIER", ...(o.eventMandate === undefined ? {} : { actingUnderMandateId: o.eventMandate }) },
    destinationParty: { partyId: p.coop, partyRoleAtEvent: "AGGREGATOR" },
    commodity: { commodityCode: o.commodity ?? "4001", commodityName: "Natural rubber (cup lump)", sourcePlotIds: [plot.rubber.plotId], sourcePlotIdsComplete: true, batchIdentifier: `LOT-${randomUUID()}` },
    quantity: { amount: 120, unit: "KG", measurementMethod: "Calibrated platform scale" },
    eventLocation: { countryCode: o.country ?? "TH", administrativeArea: "Rayong" },
    eventTime: { eventDate: "2026-06-30", timePrecision: "DATE_ONLY" },
    predecessorEventIds: [],
    successorEventIds: [],
    ...(o.actingUnder === undefined ? {} : { actingUnder: o.actingUnder }),
    supportingDocument: { documentId: `RCPT-${randomUUID().slice(0, 8)}`, documentType: "PURCHASE_RECEIPT", documentReference: "Receipt book, page 12", contentDigest: createHash("sha256").update(randomUUID()).digest("hex") },
    chainOfCustodyComplete: true,
    uncertainties: [],
    contradictions: [],
    knownGaps: [],
  };
}

test("SCS-CAP-05 as a representative → admitted; provenance.submissionMandateId is set from actingUnder", async () => {
  const r = await post("/scs/v1/custody-events", custody({ actingUnder: under(m.all) }), "rep");
  assert.equal(r.status, 201, r.text);
  const d = r.json["decision"] as { eventId: string; admissionChecks: Record<string, unknown>; decidedBy: Record<string, unknown>; decisionReasons: string[] };
  assert.ok(Object.values(d.admissionChecks["representation"] as Record<string, boolean>).every((v) => v === true));
  assert.equal(d.decisionReasons.filter((x) => x.startsWith("representation.")).length, 8);
  const row = (await harness.admin.query(`SELECT submitted_by, submission_mandate_cited_id, submission_mandate_linked_id FROM scs.custody_event WHERE event_id = $1`, [d.eventId])).rows[0] as Record<string, unknown>;
  assert.equal(row["submission_mandate_cited_id"], m.all);
  assert.equal(row["submission_mandate_linked_id"], m.all);
  assert.deepEqual(row["submitted_by"], d.decidedBy);
});

test("SCS-CAP-05: the act is for the source party, within the event's framework, commodity and country", async () => {
  // the mandate is the farmer's; the source party is the other farmer
  const r = await refused(post("/scs/v1/custody-events", custody({ source: p.otherFarmer, actingUnder: under(m.all) }), "rep"), 422, "MANDATE_PARTIES_MISMATCH");
  assert.match((r.json["reasons"] as string[])[0]!, /which is not the source party/);
  const s = await refused(post("/scs/v1/custody-events", custody({ country: "VN", actingUnder: under(m.all) }), "rep"), 422, "MANDATE_SCOPE_MISMATCH");
  assert.match((s.json["reasons"] as string[])[0]!, /the event location's country \(VN\) is not within its geographicScope/);
  await refused(post("/scs/v1/custody-events", custody({ actingUnder: under(m.all) }), "officer"), 403, "REPRESENTATIVE_NOT_AUTHORISED");
});

test("SCS-CAP-05 breaking change: submissionMandateId is no longer accepted → 400; a direct submission names no submission mandate", async () => {
  const r = await refused(post("/scs/v1/custody-events", { ...custody(), submissionMandateId: m.all }, "officer"), 400, "REQUEST_VALIDATION_FAILED");
  assert.match((r.json["reasons"] as string[])[0]!, /unknown property "submissionMandateId"/);
  const direct = await post("/scs/v1/custody-events", custody(), "officer");
  assert.equal(direct.status, 201, direct.text);
  const row = (await harness.admin.query(`SELECT submission_mandate_cited_id FROM scs.custody_event WHERE event_id = $1`, [(direct.json["decision"] as { eventId: string }).eventId])).rows[0] as Record<string, unknown>;
  assert.equal(row["submission_mandate_cited_id"], null);
});

test("SCS-CAP-05 the event's mandate is checked against its scope too: outside it, MANDATE_NOT_VALID names why, and the event is still admitted", async () => {
  const outside = await post("/scs/v1/custody-events", custody({ country: "VN", eventMandate: m.all }), "officer");
  assert.equal(outside.status, 201, outside.text);
  const d = outside.json["decision"] as { limitationCodes: string[]; limitations: string[] };
  assert.ok(d.limitationCodes.includes("MANDATE_NOT_VALID"));
  assert.match(d.limitations.find((l) => l.startsWith("Mandate not valid"))!, /the event's location country VN is not within its geographicScope \(TH\)/);
  const inside = await post("/scs/v1/custody-events", custody({ eventMandate: m.all }), "officer");
  assert.equal(inside.status, 201, inside.text);
  assert.ok(!(inside.json["decision"] as { limitationCodes: string[] }).limitationCodes.includes("MANDATE_NOT_VALID"));
});
