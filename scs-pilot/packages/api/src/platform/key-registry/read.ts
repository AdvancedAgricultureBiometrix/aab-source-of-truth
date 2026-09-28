// AAB-PLATFORM-09 — GET /aab/v1/signing-keys/:keyId. A key as registered, its
// events and compromises, and its state derived now. Nothing is written; one
// REPEATABLE READ snapshot.
//   1. reader — a KEY_REGISTRAR, a KEY_SECURITY_OFFICER, or the key's holder → KEY_READER_NOT_AUTHORISED (403)
//   2. key    — registered in this registry → KEY_NOT_FOUND (404)

import { holdsRole } from "../../foundation/actor.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import type { RouteContext } from "../../foundation/server.js";
import type { KeyRead } from "../../types/key-registry.js";
import { isActor } from "./common.js";
import { KEY_REGISTRAR_ROLE, KEY_SECURITY_OFFICER_ROLE, keyRegistryFailure } from "./errors.js";
import { exposureWindow, keyStateAt, retiredAt } from "./registry.js";
import { keyRegistryReader } from "./store.js";
import { clockNow } from "./write-store.js";

export async function readKey(ctx: RouteContext<undefined>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  const keyId = ctx.params["keyId"]!.toLowerCase();
  const key = await keyRegistryReader(tx).keyHistory(keyId);
  const mayRead = holdsRole(actor, KEY_REGISTRAR_ROLE) || holdsRole(actor, KEY_SECURITY_OFFICER_ROLE)
    || (key !== null && isActor({ issuer: key.registration.issuer, actorId: key.registration.actorId }, actor));
  if (!mayRead) {
    throw keyRegistryFailure("KEY_READER_NOT_AUTHORISED", [`Reading a key requires ${KEY_REGISTRAR_ROLE} or ${KEY_SECURITY_OFFICER_ROLE}, or being its holder.`]);
  }
  if (key === null) throw keyRegistryFailure("KEY_NOT_FOUND", [`No key ${keyId} is registered in this registry.`]);
  const now = (await clockNow(tx)).toISOString();
  const retired = retiredAt(key);
  const window = exposureWindow(key);
  const body: KeyRead = {
    registration: key.registration,
    events: [...key.events],
    compromises: [...key.compromises],
    currentState: keyStateAt(key, now),
    ...(retired === undefined ? {} : { retiredAt: retired }),
    ...(window === undefined ? {} : { exposureWindow: window }),
    readAt: now,
  };
  return { status: 200, body };
}
