// AAB-PLATFORM-09 — POST /aab/v1/key-bootstrap-ceremonies (section 3a, with
// the amendments of 2026-09-28). Records how a registry's first key was
// registered: self-attested by its holder, the one registration made without
// separation, and disclosed as such.
//   * The Platform Owner's ceremony (the control plane's registry) declares
//     the control plane's attestation key.
//   * A country's ceremony is performed by its authorised representative, pins
//     the control plane's attestation key, and is co-signed by the Platform
//     Owner, whose key the country verifies from attested evidence, with no
//     call across the boundary. The Platform Owner never registers a country key.
//
// Order:
//   1. holder     — a named HUMAN holding KEY_REGISTRAR → KEY_REGISTRAR_NOT_AUTHORISED (403)
//   2. statements — this registry's issuer → KEY_ISSUER_MISMATCH (422); all three name the
//                   same key, holder and challenge, the holder is the requester, and the
//                   registration is self-signed → KEY_CEREMONY_INVALID (422)
//      lock       — every bootstrap and challenge of this registry is serialised
//   3. empty      — the registry has no first key → KEY_REGISTRY_ALREADY_STARTED (409)
//   4. challenge and possession (possession.ts), BOOTSTRAP
//   5. holder's signatures — registration and ceremony, with the new key → KEY_SIGNATURE_INVALID (422)
//   6. kind       — the Platform Owner's declares the attestation key and nothing else; a
//                   country's pins it, names the co-signer and carries their evidence
//                   → KEY_CEREMONY_INVALID (422); the evidence verifies against the pinned
//                   key → KEY_EVIDENCE_INVALID (422); the co-signature verifies with the
//                   evidenced key → KEY_CEREMONY_INVALID (422)
//   7. insert ceremony, pinned key, first key, evidence; receipt KEY_BOOTSTRAP; 201

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { parseSigningPublicKey, verifyStatementSignature } from "../../foundation/signatures.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyBootstrapDecision, KeyBootstrapReceipt, KeyBootstrapRequest, KeyBootstrapResponse } from "../../types/key-registry.js";
import { describeIssuer, isActor, namedHuman, sameIssuer, type RegistryDirectory } from "./common.js";
import { CAPABILITY_ID, KEY_REGISTRAR_ROLE, keyRegistryFailure } from "./errors.js";
import { checkPossession, statementsAgree } from "./possession.js";
import { checkVerificationEvidence, publicKeyDigestOf, verifySignedRecord, type KeyVerificationEvidence } from "./registry.js";
import {
  ceremonyDigestOf,
  clockNow,
  insertCeremony,
  insertPinnedAttestationKey,
  insertRegistration,
  insertVerificationEvidence,
  lockRegistry,
  registrationDigestOf,
  registryStarted,
  type CeremonyRecord,
  type RegistrationRecord,
} from "./write-store.js";

const PLATFORM = { issuerType: "PLATFORM_CONTROL_PLANE" as const };
const ceremonyFailure = (reason: string) => keyRegistryFailure("KEY_CEREMONY_INVALID", [reason]);

function usableKey(publicKey: string, what: string): void {
  try {
    parseSigningPublicKey(publicKey);
  } catch (err) {
    throw ceremonyFailure(`${what}: ${(err as Error).message}.`);
  }
}

export function bootstrapRegistry(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyBootstrapRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const holder = namedHuman(directory, ctx.actor!, KEY_REGISTRAR_ROLE, "KEY_REGISTRAR_NOT_AUTHORISED", "Performing a bootstrap ceremony");
    const registry = directory.issuer;
    const { possessionStatement: p, registrationStatement: r, ceremonyStatement: c } = ctx.body;

    // 2. The statements: this registry, one key, one holder, self-signed
    statementsAgree(p, r);
    if (!sameIssuer(c.registry, registry) || !sameIssuer(r.issuer, registry)) {
      throw keyRegistryFailure("KEY_ISSUER_MISMATCH", [`This is the ${describeIssuer(registry)} registry; the ceremony names ${describeIssuer(c.registry)}.`]);
    }
    const mismatch =
      !isActor(c.holder, holder) ? `The ceremony's holder (${c.holder.actorId}) is not the requester (${holder.actorId}): the first key's holder performs the ceremony.`
      : r.actorId !== holder.actorId ? `The registration is for ${r.actorId}, not the ceremony's holder ${holder.actorId}.`
      : !isActor(r.registrationAuthority, holder) ? "A registry's first key is self-attested: its registration authority is its holder."
      : r.signingKeyId !== r.keyId ? "A registry's first key is self-attested: the registration is signed with the key it registers."
      : r.replacesKeyId !== undefined ? "A registry's first key replaces nothing."
      : c.keyId !== r.keyId || c.challengeId !== r.challengeId || c.publicKeyDigest !== r.publicKeyDigest ? "The ceremony names another key, challenge or public key than the registration."
      : null;
    if (mismatch !== null) throw ceremonyFailure(mismatch);

    await lockRegistry(tx, registry);
    const now = await clockNow(tx);
    const at = now.toISOString();

    // 3. Only into an empty registry
    if (await registryStarted(tx, registry)) {
      throw keyRegistryFailure("KEY_REGISTRY_ALREADY_STARTED", [`The ${describeIssuer(registry)} registry already has its first key; it is bootstrapped once.`]);
    }

    // 4. Challenge and possession
    await checkPossession(tx, ctx.body, { issuer: registry, purpose: "BOOTSTRAP", now });

    // 5. The holder signed the registration and the ceremony with the new key
    const newKey = parseSigningPublicKey(ctx.body.publicKey);
    if (!verifyStatementSignature(r, ctx.body.registrationSignature, newKey)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", ["The registration does not verify with the key it registers."]);
    }
    if (!verifyStatementSignature(c, ctx.body.holderSignature, newKey)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", ["The ceremony statement does not verify with the key it registers."]);
    }

    // 6. What kind of ceremony
    let cosignatureAcceptance: KeyBootstrapDecision["cosignatureAcceptance"];
    let cosigner: CeremonyRecord["cosigner"];
    const evidence = ctx.body.cosignerKeyEvidence;
    const kindReasons: string[] = [];
    if (registry.issuerType === "PLATFORM_CONTROL_PLANE") {
      if (c.declaredAttestationKey === undefined) throw ceremonyFailure("The Platform Owner's ceremony declares the control plane's attestation key.");
      if (c.pinnedAttestationKey !== undefined || c.cosigner !== undefined || ctx.body.cosignature !== undefined || evidence !== undefined) {
        throw ceremonyFailure("The Platform Owner's ceremony pins no key and has no co-signer.");
      }
      usableKey(c.declaredAttestationKey.publicKey, "/ceremonyStatement/declaredAttestationKey/publicKey");
      kindReasons.push(`kind: the Platform Owner's ceremony; it declares attestation key ${c.declaredAttestationKey.attestationKeyId}.`);
    } else {
      if (c.declaredAttestationKey !== undefined) throw ceremonyFailure("A country's ceremony declares no attestation key; it pins the control plane's.");
      if (c.pinnedAttestationKey === undefined) throw ceremonyFailure("A country's ceremony pins the control plane's attestation key.");
      if (c.cosigner === undefined || ctx.body.cosignature === undefined || evidence === undefined) {
        throw ceremonyFailure("A country's ceremony is co-signed by the Platform Owner, with the attested evidence for their key.");
      }
      if (!sameIssuer(c.cosigner.actor.issuer, PLATFORM)) throw ceremonyFailure("The co-signer is the Platform Owner, issued by PLATFORM_CONTROL_PLANE.");
      usableKey(c.pinnedAttestationKey.publicKey, "/ceremonyStatement/pinnedAttestationKey/publicKey");
      if (evidence.keyId !== c.cosigner.signingKeyId || evidence.registration.actorId !== c.cosigner.actor.actorId) {
        throw keyRegistryFailure("KEY_EVIDENCE_INVALID", [`The evidence is for key ${evidence.keyId} of ${evidence.registration.actorId}, not the co-signer's key ${c.cosigner.signingKeyId}.`]);
      }
      const pin = { attestedIssuer: PLATFORM, attestationKeyId: c.pinnedAttestationKey.attestationKeyId, publicKey: c.pinnedAttestationKey.publicKey };
      const checked = checkVerificationEvidence(evidence as KeyVerificationEvidence, [pin], at);
      if (!checked.ok) throw keyRegistryFailure("KEY_EVIDENCE_INVALID", [checked.reason]);
      const cosigned = verifySignedRecord({
        record: { statement: c, signature: ctx.body.cosignature, signer: { issuer: PLATFORM, actorId: c.cosigner.actor.actorId }, acceptedAt: at },
        key: checked.history,
      });
      if (cosigned.result !== "VERIFIED") throw ceremonyFailure(`The Platform Owner's co-signature does not verify: ${cosigned.reason ?? cosigned.result}.`);
      cosigner = { actorId: c.cosigner.actor.actorId, issuer: PLATFORM, actorType: "HUMAN", accountableName: c.cosigner.accountableName };
      kindReasons.push(
        `kind: ${describeIssuer(registry)}'s ceremony, performed by its authorised representative, ${holder.actorId}.`,
        `pinned: the control plane's attestation key ${pin.attestationKeyId}.`,
        `co-signature: ${c.cosigner.actor.actorId} (${c.cosigner.accountableName}, the Platform Owner) co-signed with key ${evidence.keyId}, verified from evidence attested at ${evidence.attestedAt} against the pinned key, with no call outside the country. The Platform Owner witnessed; they register no country key.`,
      );
    }

    // 7. The records
    const ceremonyId = randomUUID();
    const receiptId = randomUUID();
    const ceremony: CeremonyRecord = {
      ceremonyId,
      registry,
      firstKeyId: r.keyId,
      ceremonyStatement: c,
      holder,
      holderSignature: ctx.body.holderSignature,
      ...(cosigner === undefined ? {} : { cosigner, cosignerKeyId: c.cosigner!.signingKeyId, cosignature: ctx.body.cosignature! }),
      recordedAt: at,
      receiptId,
    };
    const ceremonyDigest = ceremonyDigestOf(ceremony);
    await insertCeremony(tx, ceremony, ceremonyDigest);
    if (c.pinnedAttestationKey !== undefined) {
      await insertPinnedAttestationKey(tx, {
        attestedIssuer: PLATFORM,
        attestationKeyId: c.pinnedAttestationKey.attestationKeyId,
        publicKey: c.pinnedAttestationKey.publicKey,
        publicKeyDigest: publicKeyDigestOf(c.pinnedAttestationKey.publicKey),
        ceremonyId,
        pinnedAt: at,
      });
    }
    const registration: RegistrationRecord = {
      keyId: r.keyId,
      issuer: registry,
      actorId: holder.actorId,
      algorithm: "Ed25519",
      publicKey: ctx.body.publicKey,
      publicKeyDigest: r.publicKeyDigest,
      activeFrom: at,
      registeredAt: at,
      challengeId: r.challengeId,
      possessionStatement: p,
      possessionSignature: ctx.body.possessionSignature,
      registrationAuthority: holder,
      registrationStatement: r,
      registrationSignature: ctx.body.registrationSignature,
      registrationSignerKeyId: r.keyId,
      bootstrapCeremonyId: ceremonyId,
      receiptId,
    };
    const registrationDigest = registrationDigestOf(registration);
    await insertRegistration(tx, registration, registrationDigest);
    if (evidence !== undefined) {
      const evidenceDigest = await insertVerificationEvidence(tx, { evidenceId: randomUUID(), evidence, recordTable: "key_bootstrap_ceremony", recordId: ceremonyId, storedAt: at });
      cosignatureAcceptance = {
        acceptedAt: at,
        signingKeyId: evidence.keyId,
        publicKeyDigest: evidence.registration.publicKeyDigest,
        registrationDigest: evidence.registration.registrationDigest,
        evidenceDigest,
      };
    }

    const decision: KeyBootstrapDecision = {
      decisionId: randomUUID(),
      decision: "BOOTSTRAPPED",
      ceremonyId,
      keyId: r.keyId,
      registry,
      ceremonyDigest,
      registrationDigest,
      publicKeyDigest: r.publicKeyDigest,
      activeFrom: at,
      ...(c.pinnedAttestationKey === undefined ? {} : { pinnedAttestationKeyId: c.pinnedAttestationKey.attestationKeyId }),
      ...(cosignatureAcceptance === undefined ? {} : { cosignatureAcceptance }),
      decisionReasons: [
        `holder: ${holder.actorId} (${holder.accountableName}) holds ${KEY_REGISTRAR_ROLE} and registers the ${describeIssuer(registry)} registry's first key.`,
        `possession: the holder signed bootstrap challenge ${r.challengeId}'s nonce, the registration and the ceremony with the key registered.`,
        ...kindReasons,
        "Disclosed (AAB-PLATFORM-09, section 3a): the first key is self-attested, the one registration made without separation. The trust in it is the trust in this ceremony record and in its holder. This is a pilot position, not a production solution.",
      ],
      decidedBy: holder,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyBootstrapReceipt, typeof CAPABILITY_ID, KeyBootstrapDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_BOOTSTRAP",
      subjectId: ceremonyId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyBootstrapReceipt,
      receiptId,
    });
    const body: KeyBootstrapResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
