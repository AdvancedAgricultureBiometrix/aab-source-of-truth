// AAB-PLATFORM-09 — POST /aab/v1/signing-keys/:keyId/compromises (section 8;
// second amendment). Declares that a key may be compromised, or widens a
// declared window. A compromise is its own kind of record, and final: the key
// never signs again, and every record accepted inside the window is under
// review until a person assesses it.
//
// Declaring must never be harder than it needs to be. The key holder may
// declare unsigned, since their only key is the one compromised; anyone else
// signs with their own key, never the compromised one.
//
// Order:
//   1. declarer  — a named HUMAN → KEY_COMPROMISE_NOT_AUTHORISED (403); the statement
//                  names this key, the requester, and each evidence digest once
//                  → REQUEST_VALIDATION_FAILED (400) / KEY_SIGNATURE_INVALID (422)
//   2. key       — registered in this registry → KEY_NOT_FOUND (404)
//   3. who       — the holder, a KEY_REGISTRAR or a KEY_SECURITY_OFFICER → KEY_COMPROMISE_NOT_AUTHORISED (403);
//                  unsigned only by the holder, and never signed with the compromised key
//                  → KEY_SIGNATURE_INVALID (422)
//      lock      — every write to the holder's keys is serialised; the clock is read after it
//   4. window    — from the suspected start, or the key's activeFrom when it is unknown;
//                  never before activeFrom, never after now → KEY_EXPOSURE_INVALID (422)
//   5. signature — when signed, the declarer's own key, ACTIVE now → KEY_SIGNATURE_INVALID (422)
//   6. insert the record and its evidence; receipt KEY_COMPROMISE; 201

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { platformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyCompromiseDecision, KeyCompromiseReceipt, KeyCompromiseRequest, KeyCompromiseResponse } from "../../types/key-registry.js";
import { isActor, namedHuman, verifyWithRegisteredKey, type RegistryDirectory } from "./common.js";
import { compromiseDigestOf, insertCompromise, type CompromiseRecord } from "./compromise-store.js";
import { CAPABILITY_ID, KEY_REGISTRAR_ROLE, KEY_SECURITY_OFFICER_ROLE, keyRegistryFailure } from "./errors.js";
import { exposureWindow } from "./registry.js";
import { keyRegistryReader } from "./store.js";
import { clockNow, lockActorKeys } from "./write-store.js";

export function declareCompromise(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyCompromiseRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const declarer = namedHuman(directory, ctx.actor!, null, "KEY_COMPROMISE_NOT_AUTHORISED", "Declaring a compromise");
    const s = ctx.body.compromiseStatement;
    const keyId = ctx.params["keyId"]!.toLowerCase();
    const signed = ctx.body.statementSignature !== undefined;

    // 1. The statement
    const malformed = [
      s.keyId !== keyId && `/compromiseStatement/keyId (${s.keyId}) is not the key in the path (${keyId}).`,
      (s.signingKeyId !== undefined) !== signed && "/statementSignature is present exactly when /compromiseStatement/signingKeyId is.",
      ...s.evidence.map((e) => e.digest).filter((d, i, all) => all.indexOf(d) !== i).map((d) => `/compromiseStatement/evidence: ${d} is listed more than once.`),
    ].filter((x): x is string => typeof x === "string");
    if (malformed.length > 0) throw platformFailure("REQUEST_VALIDATION_FAILED", malformed);
    if (!isActor(s.declaredBy, declarer)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The statement names ${s.declaredBy.actorId} as its declarer, not the requester ${declarer.actorId}.`]);
    }

    // 2. The key
    const reader = keyRegistryReader(tx);
    const found = await reader.keyHistory(keyId);
    if (found === null) throw keyRegistryFailure("KEY_NOT_FOUND", [`No key ${keyId} is registered in this registry.`]);
    const holderId = found.registration.actorId;

    // 3. Who may declare, and how
    const isHolder = isActor({ issuer: found.registration.issuer, actorId: holderId }, declarer);
    if (!(isHolder || holdsRole(declarer, KEY_REGISTRAR_ROLE) || holdsRole(declarer, KEY_SECURITY_OFFICER_ROLE))) {
      throw keyRegistryFailure("KEY_COMPROMISE_NOT_AUTHORISED", [`A compromise is declared by the key's holder (${holderId}), a ${KEY_REGISTRAR_ROLE} or a ${KEY_SECURITY_OFFICER_ROLE}; ${declarer.actorId} is none of them.`]);
    }
    if (!signed && !isHolder) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", ["Only the key's holder declares a compromise unsigned; anyone else signs the declaration with their own key."]);
    }
    if (signed && s.signingKeyId === keyId) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", ["A declaration is never signed with the compromised key; the holder may declare unsigned."]);
    }

    await lockActorKeys(tx, found.registration.issuer, holderId);
    const now = await clockNow(tx);
    const at = now.toISOString();
    const key = (await reader.keyHistory(keyId))!;

    // 4. The window's start
    const activeFrom = key.registration.activeFrom;
    const from = s.suspectedExposureFrom === undefined ? activeFrom : new Date(s.suspectedExposureFrom).toISOString();
    if (Date.parse(from) < Date.parse(activeFrom) || Date.parse(from) > now.getTime()) {
      throw keyRegistryFailure("KEY_EXPOSURE_INVALID", [`The suspected start (${from}) must be between the key's activeFrom (${activeFrom}) and now (${at}).`]);
    }

    // 5. A signed declaration: the declarer's own key, ACTIVE now
    let signatureAcceptance: KeyCompromiseDecision["signatureAcceptance"];
    if (signed) {
      const v = await verifyWithRegisteredKey(reader, { statement: s, signature: ctx.body.statementSignature!, signer: s.declaredBy, signingKeyId: s.signingKeyId!, acceptedAt: at });
      if (v.verification.result !== "VERIFIED") {
        throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The declaration does not verify with ${declarer.actorId}'s key ${s.signingKeyId}: ${v.verification.reason ?? v.verification.result}.`]);
      }
      signatureAcceptance = { acceptedAt: at, signingKeyId: s.signingKeyId!, publicKeyDigest: v.key!.registration.publicKeyDigest, registrationDigest: v.key!.registration.registrationDigest };
    }

    // 6. The record
    const record: CompromiseRecord = {
      compromiseId: randomUUID(),
      keyId,
      suspectedExposureFrom: from,
      exposureBasis: s.exposureBasis,
      evidence: s.evidence,
      declaredBy: declarer,
      declarationSigned: signed,
      ...(signed ? { declarationStatement: s, statementSignature: ctx.body.statementSignature!, signerKeyId: s.signingKeyId! } : {}),
      recordedAt: at,
      receiptId: randomUUID(),
    };
    const compromiseDigest = compromiseDigestOf(record);
    await insertCompromise(tx, record, compromiseDigest);
    const window = exposureWindow({ ...key, compromises: [...key.compromises, { suspectedExposureFrom: from, recordedAt: at }] })!;

    const decision: KeyCompromiseDecision = {
      decisionId: randomUUID(),
      decision: "RECORDED",
      compromiseId: record.compromiseId,
      keyId,
      declarationSigned: signed,
      exposureWindow: window,
      compromiseDigest,
      ...(signatureAcceptance === undefined ? {} : { signatureAcceptance }),
      decisionReasons: [
        `declarer: ${declarer.actorId} (${declarer.accountableName}), ${isHolder ? "the key's holder" : "a registration authority or security officer, not the key's holder"}.`,
        signed
          ? `signature: the declaration verifies with ${declarer.actorId}'s own key ${s.signingKeyId}, ACTIVE at ${at}.`
          : "signature: none. The holder's own declaration is accepted unsigned, since their only key is the one compromised; this record says so.",
        s.suspectedExposureFrom === undefined
          ? `window: the start is unknown, so it is the key's activeFrom (${activeFrom}): the key's whole life.`
          : `window: suspected from ${from} (${s.exposureBasis}).`,
        `window in effect: ${window.from} to ${window.until}, from the earliest suspected start any record gives. A later record may widen it; nothing narrows it.`,
        `Key ${keyId} is COMPROMISED from ${at}, finally: it never signs again. Every record accepted with it inside the window is under review until a person affirms or repudiates it; records accepted before the window are unaffected.`,
        ...(s.evidence.length === 0 ? ["evidence: none yet. A further record may add it, widening nothing and removing nothing."] : [`evidence: ${s.evidence.length} item(s), preserved by digest.`]),
      ],
      decidedBy: declarer,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyCompromiseReceipt, typeof CAPABILITY_ID, KeyCompromiseDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_COMPROMISE",
      subjectId: record.compromiseId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyCompromiseReceipt,
      receiptId: record.receiptId,
    });
    const body: KeyCompromiseResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
