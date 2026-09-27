import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";

import { canonicalJson } from "./canonical.js";
import { parseSigningPublicKey, recordDigest, SIGNATURE_PATTERN, statementBytes, verifyStatementSignature } from "./signatures.js";

// Keys are throwaway, generated per run, as a signer would outside the server.
const signer = () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return { privateKey, publicKey, spki: publicKey.export({ format: "der", type: "spki" }).toString("base64") };
};
const signAs = (privateKey: KeyObject, statement: unknown) => sign(null, Buffer.from(canonicalJson(statement), "utf8"), privateKey).toString("base64");

const STATEMENT = {
  statementType: "ACTOR_SUBJECT_LINK",
  actor: { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" }, actorId: "staff-1" },
  subject: { domain: "SCS", subjectType: "PARTY", subjectId: "4b1f05b0-0000-4000-8000-000000000001" },
  relation: "ACTS_FOR_SUBJECT",
  validFrom: "2026-09-27T00:00:00.000Z",
  validUntil: "2027-03-27T00:00:00.000Z",
  authorisationEvidence: [{ evidenceObjectSha256: "a".repeat(64), description: "Signed staff authorisation" }],
  creator: { issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "TH" }, actorId: "link-officer-1" },
};

test("a signature by the signer's key over the statement verifies; the key parses from base64 SPKI", () => {
  const s = signer();
  const signature = signAs(s.privateKey, STATEMENT);
  assert.match(signature, SIGNATURE_PATTERN);
  assert.equal(verifyStatementSignature(STATEMENT, signature, parseSigningPublicKey(s.spki)), true);
});

test("what is signed is the canonical JSON: key order does not matter, content does", () => {
  const s = signer();
  const signature = signAs(s.privateKey, STATEMENT);
  const reordered = Object.fromEntries(Object.entries(STATEMENT).reverse());
  assert.equal(verifyStatementSignature(reordered, signature, s.publicKey), true, "the same statement, keys in another order");
  assert.equal(statementBytes(reordered).equals(statementBytes(STATEMENT)), true);
  for (const [label, changed] of [
    ["another relation", { ...STATEMENT, relation: "IS_SUBJECT" }],
    ["another actor", { ...STATEMENT, actor: { ...STATEMENT.actor, actorId: "staff-2" } }],
    ["another issuer", { ...STATEMENT, actor: { ...STATEMENT.actor, issuer: { issuerType: "COUNTRY_TENANCY", countryCode: "VN" } } }],
    ["a day longer", { ...STATEMENT, validUntil: "2027-03-28T00:00:00.000Z" }],
    ["evidence added", { ...STATEMENT, authorisationEvidence: [...STATEMENT.authorisationEvidence, { evidenceObjectSha256: "b".repeat(64), description: "x" }] }],
    ["a field added", { ...STATEMENT, supersedesLinkId: "4b1f05b0-0000-4000-8000-000000000009" }],
    ["a field removed", { ...STATEMENT, creator: undefined }],
  ] as const) {
    assert.equal(verifyStatementSignature(JSON.parse(JSON.stringify(changed)), signature, s.publicKey), false, label);
  }
});

test("another person's key does not verify; nor does a signature over another statement", () => {
  const s = signer();
  const other = signer();
  const signature = signAs(s.privateKey, STATEMENT);
  assert.equal(verifyStatementSignature(STATEMENT, signature, other.publicKey), false);
  const otherStatement = { ...STATEMENT, relation: "IS_SUBJECT" };
  assert.equal(verifyStatementSignature(STATEMENT, signAs(s.privateKey, otherStatement), s.publicKey), false);
});

test("malformed signatures and unverifiable statements are not valid, and never throw", () => {
  const s = signer();
  const signature = signAs(s.privateKey, STATEMENT);
  const flipped = Buffer.from(signature, "base64");
  flipped[0] = flipped[0]! ^ 1;
  for (const [label, bad] of [
    ["empty", ""],
    ["not base64", "!".repeat(86) + "=="],
    ["too short", signature.slice(4)],
    ["no padding", signature.slice(0, 86)],
    ["one bit changed", flipped.toString("base64")],
    ["64 zero bytes", Buffer.alloc(64).toString("base64")],
  ] as const) {
    assert.equal(verifyStatementSignature(STATEMENT, bad, s.publicKey), false, label);
  }
  assert.equal(verifyStatementSignature({ ...STATEMENT, n: Number.NaN }, signature, s.publicKey), false, "not plain JSON");
  assert.equal(verifyStatementSignature(new Date(0), signature, s.publicKey), false, "not a plain object");
  assert.equal(verifyStatementSignature(STATEMENT, signature, s.privateKey), false, "a private key is not a public key");
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
  assert.equal(verifyStatementSignature(STATEMENT, signature, rsa), false, "another algorithm");
});

test("parseSigningPublicKey refuses anything but an Ed25519 SPKI public key, saying why", () => {
  assert.throws(() => parseSigningPublicKey(""), /standard base64/);
  assert.throws(() => parseSigningPublicKey("abc"), /standard base64/);
  assert.throws(() => parseSigningPublicKey("-----BEGIN PUBLIC KEY-----"), /standard base64/);
  assert.throws(() => parseSigningPublicKey(Buffer.from("hello world, not a key").toString("base64")), /not a DER SPKI public key/);
  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ format: "der", type: "spki" }).toString("base64");
  assert.throws(() => parseSigningPublicKey(ec), /must be Ed25519, not ec/);
  const x25519 = generateKeyPairSync("x25519").publicKey.export({ format: "der", type: "spki" }).toString("base64");
  assert.throws(() => parseSigningPublicKey(x25519), /must be Ed25519, not x25519/, "a key-agreement key is not a signing key");
});

test("recordDigest is sha256: and the SHA-256 of the canonical JSON", () => {
  const expected = `sha256:${createHash("sha256").update(canonicalJson(STATEMENT)).digest("hex")}`;
  assert.equal(recordDigest(STATEMENT), expected);
  assert.equal(recordDigest(Object.fromEntries(Object.entries(STATEMENT).reverse())), expected);
  assert.match(recordDigest({}), /^sha256:[0-9a-f]{64}$/);
});
