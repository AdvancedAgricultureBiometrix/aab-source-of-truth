// Signed statements: Ed25519 over canonical JSON (AAB-PLATFORM-04, "What is
// signed"; AAB-PLATFORM-03, section 4).
//
// A governance decision is signed by the named person who makes it, outside
// the server, with their own private key. The server holds only public keys,
// and only verifies. It never signs on anyone's behalf: a signature the
// server made would not be the person's.
//
//   * The signed bytes are the UTF-8 canonical JSON of the statement
//     (foundation/canonical.ts): keys sorted, no whitespace.
//   * A signature is the 64-byte Ed25519 signature in standard base64:
//     86 characters and "==".
//   * A public key is an Ed25519 key in SPKI DER form, in standard base64.
//
// Platform code: statements are opaque JSON here. What a statement contains
// is defined by the contract that uses it.
//
// This module checks one signature against one public key. Which key a
// signature is checked against, and as at when, is the public-key registry's
// (platform/key-registry, AAB-PLATFORM-09): the key the statement names, as
// registered, in the state it was in when the server accepted the record.
// Proven for rotation, restoration, compromise and cross-issuer evidence in
// governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md.

import { createPublicKey, verify, type KeyObject } from "node:crypto";

import { canonicalJson, digest } from "./canonical.js";

/** The form of an Ed25519 signature in base64: 64 bytes, 86 characters and "==". */
export const SIGNATURE_PATTERN = /^[A-Za-z0-9+/]{86}==$/;

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Parse an Ed25519 public key given as base64 SPKI DER. Throws, saying why,
 * for anything else: malformed base64, a key that does not parse, or a key of
 * another algorithm.
 */
export function parseSigningPublicKey(spkiBase64: string): KeyObject {
  if (spkiBase64.length === 0 || !BASE64.test(spkiBase64)) throw new Error("signing public key must be standard base64");
  let key: KeyObject;
  try {
    key = createPublicKey({ key: Buffer.from(spkiBase64, "base64"), format: "der", type: "spki" });
  } catch {
    throw new Error("signing public key is not a DER SPKI public key");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error(`signing public key must be Ed25519, not ${key.asymmetricKeyType ?? "unknown"}`);
  }
  return key;
}

/** The bytes a signer signs: the UTF-8 canonical JSON of the statement. */
export function statementBytes(statement: unknown): Buffer {
  return Buffer.from(canonicalJson(statement), "utf8");
}

/**
 * Whether `signature` is a valid Ed25519 signature by `key` over the
 * statement's canonical JSON. Anything that cannot be checked — a malformed
 * signature, a statement that is not plain JSON, a key of another algorithm —
 * is not valid. Never throws.
 */
export function verifyStatementSignature(statement: unknown, signature: string, key: KeyObject): boolean {
  if (!SIGNATURE_PATTERN.test(signature) || key.type !== "public" || key.asymmetricKeyType !== "ed25519") return false;
  let bytes: Buffer;
  try {
    bytes = statementBytes(statement);
  } catch {
    return false;
  }
  try {
    return verify(null, bytes, key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

/** "sha256:" and the SHA-256 of a value's canonical JSON: the form of a link or record digest. */
export function recordDigest(value: unknown): string {
  return `sha256:${digest(value)}`;
}
