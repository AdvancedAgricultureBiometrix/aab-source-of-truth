// AAB-PLATFORM-09 — POST /aab/v1/key-registration-challenges (section 3;
// second amendment). Issues a single-use challenge, valid for 30 minutes,
// reserving the keyId for one actor's key.
//
// Order:
//   1. requester — a named HUMAN holding KEY_REGISTRAR → KEY_REGISTRAR_NOT_AUTHORISED (403)
//      lock      — every bootstrap and challenge of this registry is serialised; the clock is read after it
//   2. BOOTSTRAP — for the requester's own key → KEY_CHALLENGE_INVALID (422); only
//                  while the registry is empty → KEY_REGISTRY_ALREADY_STARTED (409)
//      REGISTRATION — for another actor's key → KEY_SELF_REGISTRATION (403); only
//                  once the registry has its first key → KEY_REGISTRY_NOT_STARTED (409);
//                  the holder a named HUMAN of this deployment → KEY_HOLDER_UNKNOWN (422)
//   3. insert, receipt KEY_REGISTRATION_CHALLENGE, same transaction; 201

import { randomBytes, randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyChallengeDecision, KeyChallengeReceipt, KeyChallengeRequest, KeyChallengeResponse } from "../../types/key-registry.js";
import { describeIssuer, keyHolder, namedHuman, type RegistryDirectory } from "./common.js";
import { CAPABILITY_ID, KEY_REGISTRAR_ROLE, keyRegistryFailure } from "./errors.js";
import { clockNow, insertChallenge, lockRegistry, registryStarted } from "./write-store.js";

export const CHALLENGE_LIFETIME_MS = 30 * 60_000;

export function issueChallenge(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyChallengeRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const requester = namedHuman(directory, ctx.actor!, KEY_REGISTRAR_ROLE, "KEY_REGISTRAR_NOT_AUTHORISED", "Issuing a registration challenge");
    const issuer = directory.issuer;
    const { purpose, actorId } = ctx.body;

    await lockRegistry(tx, issuer);
    const now = await clockNow(tx);
    const started = await registryStarted(tx, issuer);
    const reasons: string[] = [];
    if (purpose === "BOOTSTRAP") {
      if (actorId !== requester.actorId) {
        throw keyRegistryFailure("KEY_CHALLENGE_INVALID", [`A bootstrap challenge is for the first key's holder, who performs the ceremony: ${requester.actorId}, not ${actorId}.`]);
      }
      if (started) throw keyRegistryFailure("KEY_REGISTRY_ALREADY_STARTED", [`The ${describeIssuer(issuer)} registry already has its first key; it is bootstrapped once.`]);
      reasons.push(`BOOTSTRAP: the ${describeIssuer(issuer)} registry is empty, and ${actorId} will register its first key, self-attested (section 3a).`);
    } else {
      if (actorId === requester.actorId) {
        throw keyRegistryFailure("KEY_SELF_REGISTRATION", [`A registration authority never registers their own key: ${actorId} must be registered by another KEY_REGISTRAR.`]);
      }
      if (!started) throw keyRegistryFailure("KEY_REGISTRY_NOT_STARTED", [`The ${describeIssuer(issuer)} registry has no first key yet: bootstrap it first (POST /aab/v1/key-bootstrap-ceremonies).`]);
      keyHolder(directory, actorId);
      reasons.push(`REGISTRATION: ${actorId} is a named HUMAN of this deployment, and not the requester.`);
    }

    const challenge = {
      challengeId: randomUUID(),
      purpose,
      issuer,
      actorId,
      keyId: randomUUID(),
      nonce: randomBytes(32).toString("base64"),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + CHALLENGE_LIFETIME_MS),
    };
    await insertChallenge(tx, challenge, requester);

    const decision: KeyChallengeDecision = {
      decisionId: randomUUID(),
      decision: "ISSUED",
      challengeId: challenge.challengeId,
      keyId: challenge.keyId,
      purpose,
      issuer,
      actorId,
      nonce: challenge.nonce,
      issuedAt: now.toISOString(),
      expiresAt: challenge.expiresAt.toISOString(),
      decisionReasons: [
        `requester: ${requester.actorId} (${requester.accountableName}) holds ${KEY_REGISTRAR_ROLE}.`,
        ...reasons,
        `The challenge is single use and valid until ${challenge.expiresAt.toISOString()}. The keyId it reserves is named in both the proof of possession and the registration.`,
      ],
      decidedBy: requester,
      decidedAt: now.toISOString(),
    };
    const written = await writeReceipt<KeyChallengeReceipt, typeof CAPABILITY_ID, KeyChallengeDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_REGISTRATION_CHALLENGE",
      subjectId: challenge.challengeId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyChallengeReceipt,
    });
    const body: KeyChallengeResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
