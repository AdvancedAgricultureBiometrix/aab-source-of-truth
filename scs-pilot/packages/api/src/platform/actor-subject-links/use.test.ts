import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "../../foundation/canonical.js";
import type { ActorSubjectLink, ActorSubjectLinkStatement, ActorSubjectLinkStatusRecord } from "../../types/platform.js";
import type { ActorReferenceV2 } from "../../types/shared.js";
import { linkDigestOf, type SubjectResolution } from "./links.js";
import { checkLinkUse, type LinkUseInput } from "./use.js";

const TH = { issuerType: "COUNTRY_TENANCY" as const, countryCode: "TH" };
const creator = generateKeyPairSync("ed25519");
const creatorRef: ActorReferenceV2 = { referenceVersion: "2", actorId: "link-officer", issuer: TH, actorType: "HUMAN", authenticationMethod: "STATIC_TOKEN", accountableName: "L. Officer", authorityBasis: [] };
const ACTOR = { issuer: TH, actorId: "staff-1" };
const SUBJECT = { domain: "SCS", subjectType: "PARTY", subjectId: randomUUID() };
const NOW = new Date("2026-10-01T00:00:00Z");

function link(relation: "IS_SUBJECT" | "ACTS_FOR_SUBJECT", o: { key?: KeyObject; createdAt?: string; validUntil?: string; actor?: typeof ACTOR } = {}): ActorSubjectLink {
  const statement: ActorSubjectLinkStatement = {
    statementType: "ACTOR_SUBJECT_LINK", actor: o.actor ?? ACTOR, subject: SUBJECT, relation,
    validFrom: "2026-09-01T00:00:00.000Z", validUntil: o.validUntil ?? "2027-03-01T00:00:00.000Z",
    authorisationEvidence: [{ evidenceObjectSha256: "a".repeat(64), description: "Letter of authority" }],
    creator: { issuer: TH, actorId: "link-officer" },
  };
  const unsigned: Omit<ActorSubjectLink, "linkDigest"> = {
    linkId: randomUUID(), schemaVersion: "1", actor: statement.actor, subject: SUBJECT, relation, validFrom: statement.validFrom, validUntil: statement.validUntil,
    authorisationEvidence: statement.authorisationEvidence, createdAt: o.createdAt ?? "2026-09-02T00:00:00.000Z", createdBy: creatorRef, linkStatement: statement,
    statementSignature: sign(null, Buffer.from(canonicalJson(statement), "utf8"), o.key ?? creator.privateKey).toString("base64"),
  };
  return { ...unsigned, linkDigest: linkDigestOf(unsigned) };
}
const suspended = (l: ActorSubjectLink) => ({ link: l, statusRecords: [{ recordedAt: "2026-09-10T00:00:00.000Z", statusStatement: { action: "SUSPEND" } as ActorSubjectLinkStatusRecord["statusStatement"] }] });
const revoked = (l: ActorSubjectLink) => ({ link: l, statusRecords: [{ recordedAt: "2026-09-10T00:00:00.000Z", statusStatement: { action: "REVOKE" } as ActorSubjectLinkStatusRecord["statusStatement"] }] });
const plain = (l: ActorSubjectLink) => ({ link: l, statusRecords: [] });

const check = (links: LinkUseInput["links"], o: { relation?: "IS_SUBJECT" | "ACTS_FOR_SUBJECT"; resolution?: SubjectResolution } = {}) =>
  checkLinkUse({
    actor: ACTOR, subject: SUBJECT, relation: o.relation ?? "ACTS_FOR_SUBJECT", links,
    signingKeyOf: () => creator.publicKey,
    resolver: { resolve: async () => o.resolution ?? "CURRENT" },
    at: NOW,
  });
const code = async (p: ReturnType<typeof check>) => { const r = await p; return r.ok ? "OK" : r.code; };

test("one ACTIVE, intact link with the act's relation, to a current subject → usable", async () => {
  const l = link("ACTS_FOR_SUBJECT");
  const r = await check([plain(l)]);
  assert.ok(r.ok);
  assert.equal(r.ok && r.link.linkId, l.linkId);
});

test("check 1: none → LINK_NOT_FOUND; only ended links of the relation → LINK_NOT_ACTIVE, naming the state", async () => {
  assert.equal(await code(check([])), "LINK_NOT_FOUND");
  const r = await check([revoked(link("ACTS_FOR_SUBJECT"))]);
  assert.equal(r.ok ? "OK" : r.code, "LINK_NOT_ACTIVE");
  assert.match(!r.ok ? r.reasons[0]! : "", /is REVOKED/);
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT", { validUntil: "2026-09-30T00:00:00.000Z" }))])), "LINK_NOT_ACTIVE", "EXPIRED");
  // links of another actor or subject are not this actor's
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT", { actor: { issuer: TH, actorId: "someone-else" } }))])), "LINK_NOT_FOUND");
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT", { actor: { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" }, actorId: "staff-1" } }))])), "LINK_NOT_FOUND", "the same actorId from another issuer");
});

test("check 1: two current links of the act's relation → LINK_AMBIGUOUS; none is chosen", async () => {
  const r = await check([plain(link("ACTS_FOR_SUBJECT")), suspended(link("ACTS_FOR_SUBJECT"))]);
  assert.equal(r.ok ? "OK" : r.code, "LINK_AMBIGUOUS");
  // an ended link beside a current one is not ambiguity
  assert.equal(await code(check([revoked(link("ACTS_FOR_SUBJECT")), plain(link("ACTS_FOR_SUBJECT"))])), "OK");
});

test("check 3: a current link of the other relation only → LINK_RELATION_NOT_PERMITTED", async () => {
  assert.equal(await code(check([plain(link("IS_SUBJECT"))])), "LINK_RELATION_NOT_PERMITTED");
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT"))], { relation: "IS_SUBJECT" })), "LINK_RELATION_NOT_PERMITTED");
});

test("check 2: SUSPENDED → LINK_NOT_ACTIVE; a signature by another key → LINK_SIGNATURE_INVALID", async () => {
  const r = await check([suspended(link("ACTS_FOR_SUBJECT"))]);
  assert.equal(r.ok ? "OK" : r.code, "LINK_NOT_ACTIVE");
  assert.match(!r.ok ? r.reasons[0]! : "", /is SUSPENDED/);
  const forged = link("ACTS_FOR_SUBJECT", { key: generateKeyPairSync("ed25519").privateKey });
  const f = await check([plain(forged)]);
  assert.equal(f.ok ? "OK" : f.code, "LINK_SIGNATURE_INVALID");
  assert.match(!f.ok ? f.reasons[0]! : "", /signature does not verify/);
  const altered = link("ACTS_FOR_SUBJECT");
  assert.equal(await code(check([plain({ ...altered, validUntil: "2027-06-01T00:00:00.000Z" })])), "LINK_SIGNATURE_INVALID", "record differs from its statement");
  const noKey = await checkLinkUse({
    actor: ACTOR, subject: SUBJECT, relation: "ACTS_FOR_SUBJECT", links: [plain(link("ACTS_FOR_SUBJECT"))], signingKeyOf: () => null,
    resolver: { resolve: async () => "CURRENT" }, at: NOW,
  });
  assert.equal(noKey.ok ? "OK" : noKey.code, "LINK_SIGNATURE_INVALID", "no registered key");
});

test("check 4: the subject is current, as its resolver answers → otherwise LINK_SUBJECT_NOT_CURRENT", async () => {
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT"))], { resolution: "NOT_CURRENT" })), "LINK_SUBJECT_NOT_CURRENT");
  assert.equal(await code(check([plain(link("ACTS_FOR_SUBJECT"))], { resolution: "NOT_FOUND" })), "LINK_SUBJECT_NOT_CURRENT");
});
