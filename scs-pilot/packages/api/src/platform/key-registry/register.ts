// AAB-PLATFORM-09 — POST /aab/v1/signing-keys (section 3). Registers a key for
// another actor, with their proof of possession and the registration
// authority's signed registration.
//
// Order:
//   1. authority  — a named HUMAN holding KEY_REGISTRAR → KEY_REGISTRAR_NOT_AUTHORISED (403)
//   2. statements — the same key, actor, issuer and challenge → REQUEST_VALIDATION_FAILED (400);
//                   this registry's issuer → KEY_ISSUER_MISMATCH (422); the authority
//                   named is the requester → KEY_SIGNATURE_INVALID (422)
//   3. separation — the holder is not the authority → KEY_SELF_REGISTRATION (403);
//                   a named HUMAN of this deployment → KEY_HOLDER_UNKNOWN (422)
//      lock       — every write to the holder's keys is serialised; the clock is read after it
//   4. challenge and possession (possession.ts) → KEY_CHALLENGE_INVALID, KEY_PUBLIC_KEY_INVALID,
//                   KEY_ALREADY_REGISTERED, KEY_POSSESSION_NOT_PROVEN
//   5. signature  — the authority's own key, ACTIVE now, verifies the registration → KEY_SIGNATURE_INVALID (422)
//   6. one active key — a key still in use is named as replaced → KEY_ACTIVE_KEY_EXISTS (409);
//                   the replaced key is the holder's and still in use → KEY_REPLACEMENT_INVALID (422)
//   7. insert (active from now; a replaced key retires now), receipt KEY_REGISTRATION; 201

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyRegistrationDecision, KeyRegistrationReceipt, KeyRegistrationRequest, KeyRegistrationResponse } from "../../types/key-registry.js";
import { describeIssuer, isActor, keyHolder, namedHuman, sameIssuer, verifyWithRegisteredKey, type RegistryDirectory } from "./common.js";
import { CAPABILITY_ID, KEY_REGISTRAR_ROLE, keyRegistryFailure } from "./errors.js";
import { checkPossession, statementsAgree } from "./possession.js";
import { keyStateAt } from "./registry.js";
import { keyRegistryReader } from "./store.js";
import { clockNow, insertRegistration, lockActorKeys, registrationDigestOf, type RegistrationRecord } from "./write-store.js";

/** States in which a key is still in use: it, or its replacement, must be named. */
const IN_USE = new Set(["PENDING", "ACTIVE", "SUSPENDED"]);

export function registerKey(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyRegistrationRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const authority = namedHuman(directory, ctx.actor!, KEY_REGISTRAR_ROLE, "KEY_REGISTRAR_NOT_AUTHORISED", "Registering a key");
    const issuer = directory.issuer;
    const { possessionStatement: p, registrationStatement: r } = ctx.body;

    // 2. The statements
    statementsAgree(p, r);
    if (!sameIssuer(r.issuer, issuer)) {
      throw keyRegistryFailure("KEY_ISSUER_MISMATCH", [`This is the ${describeIssuer(issuer)} registry; the statements name ${describeIssuer(r.issuer)}. An issuer registers keys only for its own actors.`]);
    }
    if (!isActor(r.registrationAuthority, authority)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The registration names ${r.registrationAuthority.actorId} as its authority, not the requester ${authority.actorId}.`]);
    }

    // 3. Separation
    if (r.actorId === authority.actorId) {
      throw keyRegistryFailure("KEY_SELF_REGISTRATION", [`A registration authority never registers their own key: ${r.actorId} must be registered by another KEY_REGISTRAR.`]);
    }
    const holder = keyHolder(directory, r.actorId);
    await lockActorKeys(tx, issuer, holder.actorId);
    const now = await clockNow(tx);
    const at = now.toISOString();

    // 4. Challenge and possession
    await checkPossession(tx, ctx.body, { issuer, purpose: "REGISTRATION", now });

    // 5. The authority's signature, with their own key, ACTIVE now
    const reader = keyRegistryReader(tx);
    const signed = await verifyWithRegisteredKey(reader, { statement: r, signature: ctx.body.registrationSignature, signer: r.registrationAuthority, signingKeyId: r.signingKeyId, acceptedAt: at });
    if (signed.verification.result !== "VERIFIED") {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The registration does not verify with ${authority.actorId}'s key ${r.signingKeyId}: ${signed.verification.reason ?? signed.verification.result}.`]);
    }

    // 6. One active key per actor
    const inUse = (await reader.actorKeyHistories(issuer, holder.actorId)).filter((h) => IN_USE.has(keyStateAt(h, at)));
    if (r.replacesKeyId !== undefined) {
      if (!inUse.some((h) => h.registration.keyId === r.replacesKeyId)) {
        throw keyRegistryFailure("KEY_REPLACEMENT_INVALID", [`Key ${r.replacesKeyId} is not a key of ${holder.actorId} still in use; only such a key is replaced.`]);
      }
    }
    const stillInUse = inUse.filter((h) => h.registration.keyId !== r.replacesKeyId);
    if (stillInUse.length > 0) {
      throw keyRegistryFailure("KEY_ACTIVE_KEY_EXISTS", stillInUse.map((h) => `Key ${h.registration.keyId} of ${holder.actorId} is ${keyStateAt(h, at)}; name it in replacesKeyId, so that an actor has one key in use.`));
    }

    // 7. The record, active from now
    const record: RegistrationRecord = {
      keyId: r.keyId,
      issuer,
      actorId: holder.actorId,
      algorithm: "Ed25519",
      publicKey: ctx.body.publicKey,
      publicKeyDigest: r.publicKeyDigest,
      activeFrom: at,
      registeredAt: at,
      challengeId: r.challengeId,
      possessionStatement: p,
      possessionSignature: ctx.body.possessionSignature,
      registrationAuthority: authority,
      registrationStatement: r,
      registrationSignature: ctx.body.registrationSignature,
      registrationSignerKeyId: r.signingKeyId,
      ...(r.replacesKeyId === undefined ? {} : { replacesKeyId: r.replacesKeyId }),
      receiptId: randomUUID(),
    };
    const registrationDigest = registrationDigestOf(record);
    await insertRegistration(tx, record, registrationDigest);

    const decision: KeyRegistrationDecision = {
      decisionId: randomUUID(),
      decision: "REGISTERED",
      keyId: record.keyId,
      issuer,
      actorId: holder.actorId,
      publicKeyDigest: record.publicKeyDigest,
      activeFrom: at,
      ...(r.replacesKeyId === undefined ? {} : { replacesKeyId: r.replacesKeyId }),
      registrationDigest,
      signatureAcceptance: {
        acceptedAt: at,
        signingKeyId: r.signingKeyId,
        publicKeyDigest: signed.key!.registration.publicKeyDigest,
        registrationDigest: signed.key!.registration.registrationDigest,
      },
      decisionReasons: [
        `authority: ${authority.actorId} (${authority.accountableName}) holds ${KEY_REGISTRAR_ROLE}, and is not the key's holder.`,
        `holder: ${holder.actorId} (${holder.accountableName}), a named HUMAN of ${describeIssuer(issuer)}.`,
        `possession: the holder signed challenge ${r.challengeId}'s nonce with the key registered; the challenge was unused and unexpired.`,
        `signature: the registration verifies with ${authority.actorId}'s key ${r.signingKeyId}, ACTIVE at ${at}.`,
        r.replacesKeyId === undefined
          ? `one active key: ${holder.actorId} had no key in use.`
          : `one active key: replaces key ${r.replacesKeyId}, which is retired from ${at}. Records it signed while active stay valid.`,
        "Pilot limitation: the authority's role, and the holder's identity, are operator configuration (the actors file).",
      ],
      decidedBy: authority,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyRegistrationReceipt, typeof CAPABILITY_ID, KeyRegistrationDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_REGISTRATION",
      subjectId: record.keyId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyRegistrationReceipt,
      receiptId: record.receiptId,
    });
    const body: KeyRegistrationResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
