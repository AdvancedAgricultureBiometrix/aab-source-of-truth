import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "../../foundation/canonical.js";
import type { ActorSubjectLink, ActorSubjectLinkStatement, ActorSubjectLinkStatusRecord } from "../../types/platform.js";
import type { ActorReferenceV2 } from "../../types/shared.js";
import {
  actionPossible,
  deriveLinkState,
  isIntact,
  isStatementActor,
  linkDigestOf,
  linkIntegrity,
  stateAfter,
  statusRecordDigestOf,
  statusRecordIntegrity,
  type LinkHistory,
} from "./links.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const keys = () => generateKeyPairSync("ed25519");
const signWith = (k: KeyObject, s: unknown) => sign(null, Buffer.from(canonicalJson(s), "utf8"), k).toString("base64");
const creatorRef: ActorReferenceV2 = {
  referenceVersion: "2", actorId: "link-officer-1", issuer: TH, actorType: "HUMAN", authenticationMethod: "STATIC_TOKEN",
  accountableName: "L. Officer", authorityBasis: [{ role: "LINK_OFFICER", scopeType: "DEPLOYMENT", scopeId: "SCS-PILOT-TH" }],
};

function makeLink(creatorKey: KeyObject, overrides: Partial<ActorSubjectLinkStatement> = {}): ActorSubjectLink {
  const statement: ActorSubjectLinkStatement = {
    statementType: "ACTOR_SUBJECT_LINK",
    actor: { issuer: TH, actorId: "staff-1" },
    subject: { domain: "SCS", subjectType: "PARTY", subjectId: randomUUID() },
    relation: "ACTS_FOR_SUBJECT",
    validFrom: "2026-09-01T00:00:00.000Z",
    validUntil: "2027-03-01T00:00:00.000Z",
    authorisationEvidence: [{ evidenceObjectSha256: "a".repeat(64), description: "Letter of authority" }],
    creator: { issuer: TH, actorId: "link-officer-1" },
    ...overrides,
  };
  const unsigned: Omit<ActorSubjectLink, "linkDigest"> = {
    linkId: randomUUID(), schemaVersion: "1", actor: statement.actor, subject: statement.subject, relation: statement.relation,
    validFrom: statement.validFrom, validUntil: statement.validUntil, authorisationEvidence: statement.authorisationEvidence,
    ...(statement.supersedesLinkId === undefined ? {} : { supersedesLinkId: statement.supersedesLinkId }),
    createdAt: "2026-09-27T01:00:00.000Z", createdBy: creatorRef, linkStatement: statement, statementSignature: signWith(creatorKey, statement),
  };
  return { ...unsigned, linkDigest: linkDigestOf(unsigned) };
}

const at = (iso: string) => new Date(iso);
const rec = (action: "SUSPEND" | "REINSTATE" | "REVOKE", recordedAt: string) => ({ recordedAt, statusStatement: { action } as ActorSubjectLinkStatusRecord["statusStatement"] });
const history = (records: ReturnType<typeof rec>[] = [], successor?: LinkHistory["successor"]): LinkHistory => ({
  link: { linkId: "l-1", validFrom: "2026-09-01T00:00:00.000Z", validUntil: "2027-03-01T00:00:00.000Z" },
  statusRecords: records,
  ...(successor === undefined ? {} : { successor }),
});

test("state: ACTIVE within validity; EXPIRED from validUntil on, with no grace period", () => {
  assert.equal(deriveLinkState(history(), at("2026-09-01T00:00:00.000Z")), "ACTIVE", "from validFrom");
  assert.equal(deriveLinkState(history(), at("2027-02-28T23:59:59.999Z")), "ACTIVE");
  assert.equal(deriveLinkState(history(), at("2027-03-01T00:00:00.000Z")), "EXPIRED", "validUntil is not included");
  assert.throws(() => deriveLinkState(history(), at("2026-08-31T23:59:59.999Z")), /not yet valid/, "before validFrom no state applies");
});

test("state: the latest SUSPEND or REINSTATE decides; only records made by `at` count, in recordedAt order", () => {
  const h = history([rec("REINSTATE", "2026-10-03T00:00:00.000Z"), rec("SUSPEND", "2026-10-01T00:00:00.000Z")]);
  assert.equal(deriveLinkState(h, at("2026-09-30T00:00:00.000Z")), "ACTIVE", "before any record");
  assert.equal(deriveLinkState(h, at("2026-10-02T00:00:00.000Z")), "SUSPENDED", "records are ordered by recordedAt, not array order");
  assert.equal(deriveLinkState(h, at("2026-10-04T00:00:00.000Z")), "ACTIVE");
});

test("state: REVOKED by a REVOKE record or a successor, from the moment it is recorded, and over expiry and suspension", () => {
  const revoked = history([rec("SUSPEND", "2026-10-01T00:00:00.000Z"), rec("REVOKE", "2026-10-02T00:00:00.000Z")]);
  assert.equal(deriveLinkState(revoked, at("2026-10-01T12:00:00.000Z")), "SUSPENDED");
  assert.equal(deriveLinkState(revoked, at("2026-10-02T00:00:00.000Z")), "REVOKED");
  assert.equal(deriveLinkState(revoked, at("2027-06-01T00:00:00.000Z")), "REVOKED", "revoked stays revoked after expiry");
  const superseded = history([], { linkId: "l-2", createdAt: "2026-11-01T00:00:00.000Z" });
  assert.equal(deriveLinkState(superseded, at("2026-10-31T00:00:00.000Z")), "ACTIVE");
  assert.equal(deriveLinkState(superseded, at("2026-11-01T00:00:00.000Z")), "REVOKED");
  const suspendedThenExpired = history([rec("SUSPEND", "2026-10-01T00:00:00.000Z")]);
  assert.equal(deriveLinkState(suspendedThenExpired, at("2027-03-02T00:00:00.000Z")), "EXPIRED", "expiry is final over suspension");
});

test("which action is possible from which state", () => {
  const table: Record<string, string[]> = { SUSPEND: ["ACTIVE"], REINSTATE: ["SUSPENDED"], REVOKE: ["ACTIVE", "SUSPENDED", "EXPIRED"] };
  for (const action of ["SUSPEND", "REINSTATE", "REVOKE"] as const) {
    for (const state of ["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"] as const) {
      assert.equal(actionPossible(action, state), table[action]!.includes(state), `${action} from ${state}`);
    }
  }
  const h = history();
  assert.equal(stateAfter("SUSPEND", h, at("2026-10-01T00:00:00.000Z")), "SUSPENDED");
  assert.equal(stateAfter("REVOKE", h, at("2026-10-01T00:00:00.000Z")), "REVOKED");
});

test("a link is intact when its creator signed the statement, the record is the statement, and the digest matches", () => {
  const k = keys();
  const link = makeLink(k.privateKey);
  assert.ok(isIntact(linkIntegrity(link, k.publicKey)));
  assert.equal(linkIntegrity(link, null).signatureVerified, false, "no registered key: not verified");
  assert.equal(linkIntegrity(link, keys().publicKey).signatureVerified, false, "another person's key");
  // the record changed after signing, digest recomputed to hide it
  const widened = { ...link, validUntil: "2027-09-01T00:00:00.000Z" };
  const rehashed = { ...widened, linkDigest: linkDigestOf(widened) };
  assert.equal(linkIntegrity(rehashed, k.publicKey).statementIsRecord, false, "record differs from what was signed");
  assert.equal(linkIntegrity(widened, k.publicKey).digestMatches, false, "digest no longer matches");
  // the statement changed, re-signed by someone else
  const other = keys();
  const forged = { ...link, statementSignature: signWith(other.privateKey, link.linkStatement) };
  assert.equal(linkIntegrity(forged, k.publicKey).signatureVerified, false);
  // the recorded creator is not the statement's creator
  const wrongCreator = { ...link, createdBy: { ...creatorRef, actorId: "someone-else" } };
  assert.equal(linkIntegrity({ ...wrongCreator, linkDigest: linkDigestOf(wrongCreator) }, k.publicKey).statementIsRecord, false);
});

test("a status record is intact when its writer signed a statement binding this link's digest, and the digest matches", () => {
  const k = keys();
  const link = makeLink(k.privateKey);
  const writer = keys();
  const statement = { statementType: "ACTOR_SUBJECT_LINK_STATUS" as const, linkId: link.linkId, linkDigest: link.linkDigest, action: "SUSPEND" as const, reason: "Review.", writer: { issuer: TH, actorId: "link-officer-1" } };
  const unsigned: Omit<ActorSubjectLinkStatusRecord, "recordDigest"> = {
    statusRecordId: randomUUID(), linkId: link.linkId, schemaVersion: "1", statusStatement: statement, statementSignature: signWith(writer.privateKey, statement),
    writerCapacity: "CREATING_ROLE", recordedAt: "2026-10-01T00:00:00.000Z", writtenBy: creatorRef,
  };
  const record = { ...unsigned, recordDigest: statusRecordDigestOf(unsigned) };
  assert.ok(isIntact(statusRecordIntegrity(record, link, writer.publicKey)));
  const anotherLink = makeLink(k.privateKey);
  assert.equal(statusRecordIntegrity(record, anotherLink, writer.publicKey).statementIsRecord, false, "bound to another link");
  assert.equal(statusRecordIntegrity({ ...record, writerCapacity: "SUBJECT_AUTHORITY" }, link, writer.publicKey).digestMatches, false);
  assert.equal(statusRecordIntegrity(record, link, k.publicKey).signatureVerified, false);
});

test("the statement's actor is compared by (issuer, actorId); a version 1 reference by actorId", () => {
  assert.equal(isStatementActor(creatorRef, { issuer: TH, actorId: "link-officer-1" }), true);
  assert.equal(isStatementActor(creatorRef, { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" }, actorId: "link-officer-1" }), false);
  assert.equal(isStatementActor(creatorRef, { issuer: { issuerType: "PLATFORM_CONTROL_PLANE" }, actorId: "link-officer-1" }), false);
  assert.equal(isStatementActor(creatorRef, { issuer: TH, actorId: "x" }), false);
  const v1 = { actorId: "link-officer-1", actorType: "HUMAN" as const, roles: [], authenticationMethod: "STATIC_TOKEN" as const };
  assert.equal(isStatementActor(v1, { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" }, actorId: "link-officer-1" }), true);
});
