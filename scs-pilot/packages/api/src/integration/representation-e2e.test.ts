// The representation path, end to end through the real endpoints, as a
// cooperative's staff member would use it (representation-path build plan,
// step 4). One story, in order:
//
//   1. A link officer signs an ACTS_FOR_SUBJECT link binding the staff member
//      to the cooperative, and another binding the cooperative's authority
//      representative to it.
//   2. The smallholder's mandate to the cooperative is registered, and a
//      verification officer verifies it.
//   3. The staff member, as PARTY_REPRESENTATIVE, submits identity evidence,
//      deforestation evidence and a custody event for the smallholder.
//   4. Each is admitted, recording the link, the mandate and both parties.
//   5. The cooperative's authority representative suspends the staff
//      member's link; the next submission is refused.
//   6. The link officer reinstates it; the submission succeeds.
//
// Every statement is signed outside the server with a throwaway Ed25519 key.
// Nothing here is inserted directly except the stored evidence objects' rows.

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
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const WHO = ["officer", "linker", "verifier", "staff", "authority"] as const;
type Who = (typeof WHO)[number];
const ROLES: Record<Who, string[]> = { officer: ["COMPLIANCE_OFFICER"], linker: ["LINK_OFFICER"], verifier: ["VERIFICATION_OFFICER"], staff: [], authority: [] };
const actors = Object.fromEntries(WHO.map((w) => [w, { actorId: `${w}-e2e`, actorType: "HUMAN", roles: ROLES[w], authenticationMethod: "STATIC_TOKEN" }])) as Record<Who, { actorId: string; actorType: string; roles: string[]; authenticationMethod: string }>;
const token = (w: Who) => `e2e-${w}-token-0123456789abcdefghijklmnop`;
const keys = Object.fromEntries(WHO.map((w) => [w, generateKeyPairSync("ed25519")])) as Record<Who, { publicKey: KeyObject; privateKey: KeyObject }>;
const signAs = (w: Who, s: unknown) => sign(null, Buffer.from(canonicalJson(s), "utf8"), keys[w].privateKey).toString("base64");
const who = (w: Who) => ({ issuer: TH, actorId: actors[w].actorId });
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
const s = { framework: "", smallholder: "", cooperative: "", plotId: "", associationId: "", mandate: "", staffLink: { linkId: "", linkDigest: "" } };

interface Res { status: number; json: Record<string, unknown>; text: string }
async function call(method: "GET" | "POST", path: string, body: unknown, w: Who): Promise<Res> {
  const headers: Record<string, string> = { authorization: `Bearer ${token(w)}` };
  if (method === "POST") Object.assign(headers, { "content-type": "application/json", "idempotency-key": `e2e-${randomUUID()}` });
  const res = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  return { status: res.status, json: JSON.parse(text) as Record<string, unknown>, text };
}
async function ok(path: string, body: unknown, w: Who): Promise<Record<string, unknown>> {
  const r = await call("POST", path, body, w);
  assert.equal(r.status, 201, `${path}: ${r.text}`);
  return r.json["decision"] as Record<string, unknown>;
}
async function listen(auth: StaticTokenAuthenticator): Promise<void> {
  server = createApiServer({ routes: capabilityRoutes(auth), authenticator: auth, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
/** The actors file. Once the cooperative exists, its staff member and authority representative are granted their roles for it. */
const actorsFor = (cooperative: string | null) =>
  StaticTokenAuthenticator.fromConfig({
    actors: WHO.map((w) => ({
      tokenSha256: createHash("sha256").update(token(w)).digest("hex"),
      actor: actors[w],
      accountableName: `Named ${w}`,
      signingPublicKey: keys[w].publicKey.export({ format: "der", type: "spki" }).toString("base64"),
      ...(cooperative === null ? {} : w === "staff" ? { subjectGrants: [{ role: "PARTY_REPRESENTATIVE", scopeId: `SCS:PARTY:${cooperative}` }] }
        : w === "authority" ? { subjectGrants: [{ role: "PARTY_AUTHORITY_REPRESENTATIVE", scopeId: `SCS:PARTY:${cooperative}` }] } : {}),
    })),
  }, { issuerCountry: "TH" });

async function storedObject(): Promise<string> {
  const sha = createHash("sha256").update(randomBytes(64)).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 64, 'application/pdf', 'test', $1, $2)`,
    [sha, JSON.stringify(actors.officer)],
  );
  return sha;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  await listen(actorsFor(null));
  s.framework = (await ok("/scs/v1/frameworks", frameworkRequest(), "officer"))["frameworkId"] as string;
  s.smallholder = (await ok("/scs/v1/parties", partyRequest("NATURAL_PERSON"), "officer"))["partyId"] as string;
  s.cooperative = (await ok("/scs/v1/parties", partyRequest("COOPERATIVE"), "officer"))["partyId"] as string;
  await new Promise<void>((r) => server.close(() => r()));
  await listen(actorsFor(s.cooperative));
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

const under = () => ({ representativePartyId: s.cooperative, mandateId: s.mandate });
const identity = () => ({ evidenceIds: [randomUUID()], evidenceLimitations: [], actingUnder: under() });

test("1. a link officer signs the staff member's and the authority representative's links to the cooperative", async () => {
  for (const [w, target] of [["staff", "staffLink"], ["authority", null]] as const) {
    const linkStatement = {
      statementType: "ACTOR_SUBJECT_LINK", actor: who(w), subject: { domain: "SCS", subjectType: "PARTY", subjectId: s.cooperative }, relation: "ACTS_FOR_SUBJECT",
      validFrom: new Date(Date.now() - 60_000).toISOString(), validUntil: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
      authorisationEvidence: [{ evidenceObjectSha256: await storedObject(), description: `Cooperative's letter of authority naming ${actors[w].actorId}` }],
      creator: who("linker"),
    };
    const d = await ok("/scs/v1/actor-party-links", { linkStatement, statementSignature: signAs("linker", linkStatement) }, "linker");
    assert.equal(d["decision"], "CREATED");
    if (target !== null) s.staffLink = { linkId: d["linkId"] as string, linkDigest: d["linkDigest"] as string };
  }
  assert.equal((await call("GET", `/scs/v1/actor-party-links/${s.staffLink.linkId}`, undefined, "officer")).json["currentState"], "ACTIVE");
});

test("2. the smallholder's mandate to the cooperative is registered, and verified", async () => {
  await ok("/scs/v1/relationships", {
    fromPartyId: s.smallholder, toPartyId: s.cooperative, relationshipType: "SUPPLIES_TO", commodityScope: ["4001"], geographicScope: ["TH"],
    frameworkAssociationIds: [s.framework], claimedByPartyId: s.smallholder, relationshipEvidenceIds: [],
  }, "officer");
  const evidence = randomUUID();
  s.mandate = (await ok("/scs/v1/mandates", {
    grantingPartyId: s.smallholder, representativePartyId: s.cooperative,
    permittedActions: ["SUBMIT_IDENTITY_EVIDENCE", "SUBMIT_DEFORESTATION_EVIDENCE", "SUBMIT_CUSTODY_EVIDENCE"],
    frameworkAssociationIds: [s.framework], commodityScope: ["4001"], geographicScope: ["TH"],
    validFrom: "2026-01-01T00:00:00Z", validUntil: "2027-06-01T00:00:00Z", mandateEvidenceIds: [evidence],
  }, "officer"))["mandateId"] as string;
  const v = await ok(`/scs/v1/mandates/${s.mandate}/verifications`, {
    verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE",
    verificationScope: { scopeDescription: "The smallholder's thumbprinted consent, witnessed by the village head.", verifiedAttributes: ["grantingPartyConsent", "permittedActions"], excludedFromVerification: [] },
    verifyingAuthority: { authorityId: "th-district-office", authorityName: "District office", authorityBasis: "Consent verification procedure.", jurisdictionCode: "TH" },
    verifiedAt: new Date(Date.now() - 3600_000).toISOString(), evidenceIds: [evidence], limitations: [],
  }, "verifier");
  assert.equal(v["resultingVerificationStatus"], "VERIFIED_FOR_DECLARED_SCOPE");
});

test("3–4. the staff member submits identity evidence, deforestation evidence and a custody event for the smallholder; each records its representation", async () => {
  const plot = await call("POST", "/scs/v1/plots", {
    plot: {
      plotName: "Smallholder rubber plot", countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "cooperative field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: s.smallholder, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId: s.framework, commodityCode: "4001", associationReason: "EUDR due diligence" }],
  }, "officer");
  assert.equal(plot.status, 201, plot.text);
  const pd = plot.json["decision"] as { plotId: string; frameworkAssociationResults: Array<{ associationId: string }> };
  s.plotId = pd.plotId;
  s.associationId = pd.frameworkAssociationResults[0]!.associationId;
  const objectId = await storedObject();

  const acts: Array<[string, unknown]> = [
    [`/scs/v1/parties/${s.smallholder}/evidence`, identity()],
    ["/scs/v1/deforestation-evidence", {
      plotId: s.plotId, frameworkAssociationId: s.associationId, actingUnder: under(), evidenceType: "SATELLITE_IMAGE",
      source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA-COPERNICUS", sourceTitle: "Sentinel-2 L2A scene", providerName: "Copernicus Data Space", sourceReference: "https://dataspace.copernicus.eu/" },
      evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A_20240630T033539", contentDigest: objectId, chainOfCustodyComplete: true },
      spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
      temporalCoverage: { acquisitionStart: "2020-12-01T00:00:00Z", acquisitionEnd: "2024-06-30T00:00:00Z", analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-06-30T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
      evidenceClaim: { claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No tree cover loss detected.", claimedPeriodStart: "2020-12-31T00:00:00Z", claimedPeriodEnd: "2024-06-30T00:00:00Z", confidence: "MEDIUM", limitations: [] },
      coverageAttestation: { attestationProvided: false },
    }],
    ["/scs/v1/custody-events", {
      frameworkAssociationId: s.framework, eventType: "PURCHASE",
      sourceParty: { partyId: s.smallholder, partyRoleAtEvent: "SUPPLIER" }, destinationParty: { partyId: s.cooperative, partyRoleAtEvent: "AGGREGATOR" },
      commodity: { commodityCode: "4001", commodityName: "Natural rubber (cup lump)", sourcePlotIds: [s.plotId], sourcePlotIdsComplete: true, batchIdentifier: `LOT-${randomUUID()}` },
      quantity: { amount: 120, unit: "KG", measurementMethod: "Calibrated platform scale" },
      eventLocation: { countryCode: "TH", administrativeArea: "Rayong" }, eventTime: { eventDate: "2026-06-30", timePrecision: "DATE_ONLY" },
      predecessorEventIds: [], successorEventIds: [], actingUnder: under(),
      supportingDocument: { documentId: "RCPT-0001", documentType: "PURCHASE_RECEIPT", documentReference: "Receipt book, page 12", contentDigest: createHash("sha256").update(randomUUID()).digest("hex") },
      chainOfCustodyComplete: true, uncertainties: [], contradictions: [], knownGaps: [],
    }],
  ];
  const representation = { domain: "SCS", subjectType: "PARTY", subjectId: s.cooperative, actorLinkId: s.staffLink.linkId, basis: { basisType: "MANDATE", basisId: s.mandate, onBehalfOfSubjectId: s.smallholder } };
  for (const [path, body] of acts) {
    const d = await ok(path, body, "staff");
    const checks = (d["eligibilityChecks"] ?? d["admissionChecks"]) as Record<string, unknown>;
    assert.ok(Object.values(checks["representation"] as Record<string, boolean>).every((v) => v === true), path);
    assert.deepEqual((d["decidedBy"] as Record<string, unknown>)["representation"], representation, path);
  }
});

test("5. the cooperative's authority representative suspends the staff member's link; the next submission is refused", async () => {
  const statusStatement = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: s.staffLink.linkId, linkDigest: s.staffLink.linkDigest, action: "SUSPEND", reason: "The staff member has left the cooperative's office pending review.", writer: who("authority") };
  const d = await ok(`/scs/v1/actor-party-links/${s.staffLink.linkId}/status-records`, { statusStatement, statementSignature: signAs("authority", statusStatement) }, "authority");
  assert.equal(d["writerCapacity"], "SUBJECT_AUTHORITY");
  assert.equal(d["resultingState"], "SUSPENDED");
  const refused = await call("POST", `/scs/v1/parties/${s.smallholder}/evidence`, identity(), "staff");
  assert.equal(refused.status, 422, refused.text);
  assert.equal(refused.json["error"], "LINK_NOT_ACTIVE");
  assert.match((refused.json["reasons"] as string[])[0]!, /is SUSPENDED/);
  // only the creating role ends a representative's suspension: the representative cannot reinstate
  const reinstate = { ...statusStatement, action: "REINSTATE", reason: "Review complete." };
  const byAuthority = await call("POST", `/scs/v1/actor-party-links/${s.staffLink.linkId}/status-records`, { statusStatement: reinstate, statementSignature: signAs("authority", reinstate) }, "authority");
  assert.equal(byAuthority.json["error"], "LINK_STATUS_WRITER_NOT_AUTHORISED");
});

test("6. the link officer reinstates the link; the submission succeeds again", async () => {
  const statusStatement = { statementType: "ACTOR_SUBJECT_LINK_STATUS", linkId: s.staffLink.linkId, linkDigest: s.staffLink.linkDigest, action: "REINSTATE", reason: "Review complete; the staff member is back in post.", writer: who("linker") };
  const d = await ok(`/scs/v1/actor-party-links/${s.staffLink.linkId}/status-records`, { statusStatement, statementSignature: signAs("linker", statusStatement) }, "linker");
  assert.equal(d["resultingState"], "ACTIVE");
  const again = await ok(`/scs/v1/parties/${s.smallholder}/evidence`, identity(), "staff");
  assert.equal(again["decision"], "RECORDED");
  const read = await call("GET", `/scs/v1/actor-party-links/${s.staffLink.linkId}`, undefined, "linker");
  assert.deepEqual((read.json["statusRecords"] as Array<{ statusStatement: { action: string } }>).map((r) => r.statusStatement.action), ["SUSPEND", "REINSTATE"]);
});
