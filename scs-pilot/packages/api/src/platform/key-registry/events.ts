// AAB-PLATFORM-09 — POST /aab/v1/signing-keys/:keyId/events (section 4).
// Suspends, reinstates or retires a key, by an append-only event signed by
// the recorder with their own key, ACTIVE now. The event takes effect now.
//
// Order:
//   1. recorder  — a named HUMAN → KEY_EVENT_NOT_AUTHORISED (403); the statement names
//                  this key → REQUEST_VALIDATION_FAILED (400), and the requester as its
//                  recorder → KEY_SIGNATURE_INVALID (422)
//   2. key       — registered in this registry → KEY_NOT_FOUND (404)
//   3. who       — RETIRED: the key holder or a KEY_REGISTRAR; SUSPENDED and REINSTATED:
//                  a KEY_REGISTRAR who is not the key holder → KEY_EVENT_NOT_AUTHORISED (403)
//      lock      — every write to the holder's keys is serialised; the clock is read after it
//   4. state     — SUSPENDED from ACTIVE; REINSTATED from SUSPENDED; RETIRED from PENDING,
//                  ACTIVE or SUSPENDED → KEY_STATE_NOT_PERMITTED (409)
//   5. signature — the recorder's own key, ACTIVE now → KEY_SIGNATURE_INVALID (422)
//   6. insert, receipt KEY_EVENT; 201

import { randomUUID } from "node:crypto";

import { holdsRole } from "../../foundation/actor.js";
import { platformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyEventDecision, KeyEventReceipt, KeyEventRequest, KeyEventResponse } from "../../types/key-registry.js";
import { isActor, namedHuman, verifyWithRegisteredKey, type RegistryDirectory } from "./common.js";
import { CAPABILITY_ID, KEY_REGISTRAR_ROLE, keyRegistryFailure } from "./errors.js";
import { keyStateAt, type KeyHistory, type KeyState } from "./registry.js";
import { keyRegistryReader } from "./store.js";
import { clockNow, eventDigestOf, insertEvent, lockActorKeys, type EventRecord } from "./write-store.js";

const FROM: Record<KeyEventRequest["eventStatement"]["eventType"], readonly KeyState[]> = {
  SUSPENDED: ["ACTIVE"],
  REINSTATED: ["SUSPENDED"],
  RETIRED: ["PENDING", "ACTIVE", "SUSPENDED"],
};

export function recordKeyEvent(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyEventRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const recorder = namedHuman(directory, ctx.actor!, null, "KEY_EVENT_NOT_AUTHORISED", "Recording a key event");
    const s = ctx.body.eventStatement;
    const keyId = ctx.params["keyId"]!.toLowerCase();
    if (s.keyId !== keyId) throw platformFailure("REQUEST_VALIDATION_FAILED", [`/eventStatement/keyId (${s.keyId}) is not the key in the path (${keyId}).`]);
    if (!isActor(s.recordedBy, recorder)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The statement names ${s.recordedBy.actorId} as its recorder, not the requester ${recorder.actorId}.`]);
    }

    // 2. The key
    const reader = keyRegistryReader(tx);
    const found = await reader.keyHistory(keyId);
    if (found === null) throw keyRegistryFailure("KEY_NOT_FOUND", [`No key ${keyId} is registered in this registry.`]);
    const holderId = found.registration.actorId;

    // 3. Who may record it
    const isHolder = isActor({ issuer: found.registration.issuer, actorId: holderId }, recorder);
    const isRegistrar = holdsRole(recorder, KEY_REGISTRAR_ROLE);
    if (s.eventType === "RETIRED" ? !(isHolder || isRegistrar) : !isRegistrar || isHolder) {
      throw keyRegistryFailure("KEY_EVENT_NOT_AUTHORISED", [
        s.eventType === "RETIRED"
          ? `A key is retired by its holder (${holderId}) or a ${KEY_REGISTRAR_ROLE}; ${recorder.actorId} is neither.`
          : isHolder
            ? `A key holder never ${s.eventType === "SUSPENDED" ? "suspends" : "reinstates"} their own key; a ${KEY_REGISTRAR_ROLE} does.`
            : `${s.eventType} is recorded by a ${KEY_REGISTRAR_ROLE}; ${recorder.actorId} does not hold it.`,
      ]);
    }

    await lockActorKeys(tx, found.registration.issuer, holderId);
    const now = await clockNow(tx);
    const at = now.toISOString();
    const key = (await reader.keyHistory(keyId))!;

    // 4. From which states
    const state = keyStateAt(key, at);
    if (!FROM[s.eventType].includes(state)) {
      throw keyRegistryFailure("KEY_STATE_NOT_PERMITTED", [`Key ${keyId} is ${state}; ${s.eventType} is recorded only from ${FROM[s.eventType].join(" or ")}.`]);
    }

    // 5. The recorder's signature, with their own key, ACTIVE now
    const signed = await verifyWithRegisteredKey(reader, { statement: s, signature: ctx.body.statementSignature, signer: s.recordedBy, signingKeyId: s.signingKeyId, acceptedAt: at });
    if (signed.verification.result !== "VERIFIED") {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The event does not verify with ${recorder.actorId}'s key ${s.signingKeyId}: ${signed.verification.reason ?? signed.verification.result}.`]);
    }

    // 6. The event, effective now
    const record: EventRecord = {
      eventId: randomUUID(),
      keyId,
      eventType: s.eventType,
      effectiveAt: at,
      reason: s.reason,
      recordedBy: recorder,
      recordedAt: at,
      eventStatement: s,
      statementSignature: ctx.body.statementSignature,
      signerKeyId: s.signingKeyId,
      receiptId: randomUUID(),
    };
    const eventDigest = eventDigestOf(record);
    await insertEvent(tx, record, eventDigest);
    const after: KeyHistory = { ...key, events: [...key.events, { eventType: s.eventType, effectiveAt: at, recordedAt: at }] };
    const resultingState = keyStateAt(after, at) as KeyEventDecision["resultingState"];

    const decision: KeyEventDecision = {
      decisionId: randomUUID(),
      decision: "RECORDED",
      eventId: record.eventId,
      keyId,
      eventType: s.eventType,
      effectiveAt: at,
      resultingState,
      eventDigest,
      signatureAcceptance: {
        acceptedAt: at,
        signingKeyId: s.signingKeyId,
        publicKeyDigest: signed.key!.registration.publicKeyDigest,
        registrationDigest: signed.key!.registration.registrationDigest,
      },
      decisionReasons: [
        `recorder: ${recorder.actorId} (${recorder.accountableName}), ${isHolder ? "the key's holder" : `a ${KEY_REGISTRAR_ROLE}, not the key's holder`}.`,
        `state: key ${keyId} was ${state}; ${s.eventType} makes it ${resultingState} from ${at}.`,
        `signature: the event verifies with ${recorder.actorId}'s key ${s.signingKeyId}, ACTIVE at ${at}.`,
        s.eventType === "RETIRED"
          ? "Retiring a key stops new signatures. It does not delete the key or affect any record already accepted with it."
          : "A suspension is not a finding of compromise, and does not affect records already accepted.",
      ],
      decidedBy: recorder,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyEventReceipt, typeof CAPABILITY_ID, KeyEventDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_EVENT",
      subjectId: record.eventId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyEventReceipt,
      receiptId: record.receiptId,
    });
    const body: KeyEventResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
