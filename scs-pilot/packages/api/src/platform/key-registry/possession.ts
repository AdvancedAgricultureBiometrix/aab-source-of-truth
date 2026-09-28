// AAB-PLATFORM-09 section 3: what a new key's registration must prove, for a
// registry's first key and for every other: the challenge was issued for this
// actor and key, is unused and unexpired; the public key is Ed25519 and is the
// key the statements name; and its holder signed the challenge with it.

import type { Tx } from "../../foundation/db.js";
import { parseSigningPublicKey, verifyStatementSignature } from "../../foundation/signatures.js";
import type { KeyPossessionStatement, KeyRegistrationStatement } from "../../types/key-registry.js";
import { platformFailure } from "../../foundation/errors.js";
import { sameIssuer } from "./common.js";
import { keyRegistryFailure } from "./errors.js";
import { publicKeyDigestOf, type RegistryIssuer } from "./registry.js";
import { findChallenge, publicKeyRegistered, type StoredChallenge } from "./write-store.js";

export interface PossessionInput {
  readonly publicKey: string;
  readonly possessionStatement: KeyPossessionStatement;
  readonly possessionSignature: string;
  readonly registrationStatement: KeyRegistrationStatement;
}

/** The two statements name the same key, actor, issuer and challenge. Otherwise REQUEST_VALIDATION_FAILED. */
export function statementsAgree(p: KeyPossessionStatement, r: KeyRegistrationStatement): void {
  const differ = [
    p.keyId !== r.keyId && "keyId",
    p.actorId !== r.actorId && "actorId",
    !sameIssuer(p.issuer, r.issuer) && "issuer",
    p.challengeId !== r.challengeId && "challengeId",
    p.publicKeyDigest !== r.publicKeyDigest && "publicKeyDigest",
  ].filter((x): x is string => x !== false);
  if (differ.length > 0) {
    throw platformFailure("REQUEST_VALIDATION_FAILED", differ.map((f) => `/possessionStatement/${f} and /registrationStatement/${f} must name the same value.`));
  }
}

/**
 * Checks the challenge and the proof of possession, at `now`. Returns the
 * challenge. Fails with KEY_CHALLENGE_INVALID, KEY_PUBLIC_KEY_INVALID,
 * KEY_ALREADY_REGISTERED or KEY_POSSESSION_NOT_PROVEN.
 */
export async function checkPossession(
  tx: Tx,
  input: PossessionInput,
  expected: { issuer: RegistryIssuer; purpose: StoredChallenge["purpose"]; now: Date },
): Promise<StoredChallenge> {
  const p = input.possessionStatement;
  const challenge = await findChallenge(tx, p.challengeId);
  const problem =
    challenge === null ? `No registration challenge ${p.challengeId} was issued.`
    : challenge.purpose !== expected.purpose ? `Challenge ${p.challengeId} is a ${challenge.purpose} challenge, not ${expected.purpose}.`
    : !sameIssuer(challenge.issuer, expected.issuer) || challenge.actorId !== p.actorId ? `Challenge ${p.challengeId} was issued for another actor's key.`
    : challenge.keyId !== p.keyId ? `Challenge ${p.challengeId} reserved keyId ${challenge.keyId}, not ${p.keyId}.`
    : challenge.used ? `Challenge ${p.challengeId} has already been used; a challenge is used once.`
    : expected.now.getTime() > challenge.expiresAt.getTime() ? `Challenge ${p.challengeId} expired at ${challenge.expiresAt.toISOString()}.`
    : null;
  if (problem !== null) throw keyRegistryFailure("KEY_CHALLENGE_INVALID", [problem]);

  let key;
  try {
    key = parseSigningPublicKey(input.publicKey);
  } catch (err) {
    throw keyRegistryFailure("KEY_PUBLIC_KEY_INVALID", [`/publicKey: ${(err as Error).message}.`]);
  }
  const digest = publicKeyDigestOf(input.publicKey);
  if (digest !== p.publicKeyDigest) {
    throw keyRegistryFailure("KEY_PUBLIC_KEY_INVALID", [`/publicKey has digest ${digest}; the statements name ${p.publicKeyDigest}.`]);
  }
  if (await publicKeyRegistered(tx, digest)) {
    throw keyRegistryFailure("KEY_ALREADY_REGISTERED", [`A key with digest ${digest} is already registered; a public key is registered once.`]);
  }
  if (p.nonce !== challenge!.nonce) {
    throw keyRegistryFailure("KEY_POSSESSION_NOT_PROVEN", [`The proof of possession does not sign challenge ${p.challengeId}'s nonce.`]);
  }
  if (!verifyStatementSignature(p, input.possessionSignature, key)) {
    throw keyRegistryFailure("KEY_POSSESSION_NOT_PROVEN", ["The proof of possession does not verify with the public key being registered."]);
  }
  return challenge!;
}
