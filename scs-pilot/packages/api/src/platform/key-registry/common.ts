// AAB-PLATFORM-09: what every registry endpoint shares — who is acting, which
// registry this is, and whether a statement is signed with a key that was
// ACTIVE when the server accepted it.

import { holdsRole } from "../../foundation/actor.js";
import type { ActorDirectory } from "../../foundation/auth.js";
import type { ActorReference, ActorReferenceV2 } from "../../types/shared.js";
import type { KeyRegistryActor, KeyRegistryIssuer } from "../../types/key-registry.js";
import { keyRegistryFailure, type KeyRegistryFailureCode } from "./errors.js";
import { verifySignedRecord, type KeyHistory, type Verification } from "./registry.js";
import type { KeyRegistryReader } from "./store.js";

/** What the registry endpoints need from the identity domain: this deployment's issuer, its actors, and accountable names. */
export type RegistryDirectory = Pick<ActorDirectory, "issuer" | "actorOf" | "accountableNameOf">;

export const sameIssuer = (a: KeyRegistryIssuer, b: KeyRegistryIssuer): boolean =>
  a.issuerType === b.issuerType && (a.countryCode ?? null) === (b.countryCode ?? null);

/** Whether a statement's actor (issuer, actorId) is this reference. */
export const isActor = (named: KeyRegistryActor, ref: ActorReference): boolean =>
  named.actorId === ref.actorId && "issuer" in ref && sameIssuer(named.issuer, ref.issuer);

export const describeIssuer = (i: KeyRegistryIssuer): string => (i.countryCode === undefined ? i.issuerType : `${i.issuerType} ${i.countryCode}`);

/**
 * The acting person, as registry records name them: a HUMAN, with an
 * accountable name in the directory, holding `role`. Otherwise `code`.
 */
export function namedHuman(directory: RegistryDirectory, actor: ActorReference, role: string | null, code: KeyRegistryFailureCode, act: string): ActorReferenceV2 {
  if (actor.actorType !== "HUMAN") throw keyRegistryFailure(code, [`${act} is a human act: actor ${actor.actorId} is a ${actor.actorType}.`]);
  if (role !== null && !holdsRole(actor, role)) throw keyRegistryFailure(code, [`${act} requires the ${role} role; actor ${actor.actorId} does not hold it.`]);
  const name = directory.accountableNameOf(actor);
  if (name === null) throw keyRegistryFailure(code, [`${act} is attributable: no accountable name is recorded for actor ${actor.actorId}.`]);
  return { ...(actor as ActorReferenceV2), accountableName: name };
}

/** A key holder of this deployment: a HUMAN with an accountable name. Otherwise KEY_HOLDER_UNKNOWN. */
export function keyHolder(directory: RegistryDirectory, actorId: string): ActorReferenceV2 {
  const holder = directory.actorOf(actorId);
  if (holder === null) throw keyRegistryFailure("KEY_HOLDER_UNKNOWN", [`No actor ${actorId} is issued by ${describeIssuer(directory.issuer)} in this deployment.`]);
  if (holder.actorType !== "HUMAN") throw keyRegistryFailure("KEY_HOLDER_UNKNOWN", [`Actor ${actorId} is a ${holder.actorType}: only a HUMAN holds a signing key.`]);
  const name = directory.accountableNameOf(holder);
  if (name === null) throw keyRegistryFailure("KEY_HOLDER_UNKNOWN", [`No accountable name is recorded for actor ${actorId}: a key's holder is named.`]);
  return { ...holder, accountableName: name };
}

/**
 * Whether `statement` is signed by `signer` with this registry's key
 * `signingKeyId`, ACTIVE at `acceptedAt` (AAB-PLATFORM-09, section 6). Returns
 * the verification and the key's history.
 */
export async function verifyWithRegisteredKey(
  reader: KeyRegistryReader,
  input: { statement: unknown; signature: string; signer: KeyRegistryActor; signingKeyId: string; acceptedAt: string },
): Promise<{ verification: Verification; key: KeyHistory | null }> {
  const key = await reader.keyHistory(input.signingKeyId);
  const verification = verifySignedRecord({
    record: { statement: input.statement, signature: input.signature, signer: { issuer: input.signer.issuer, actorId: input.signer.actorId }, acceptedAt: input.acceptedAt },
    key,
  });
  return { verification, key };
}
