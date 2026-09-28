// AAB-PLATFORM-09 — POST /aab/v1/key-compromise-notices (section 9). Records
// another issuer's compromise, as that issuer's registry exported it and its
// attestation-key holder attested it, outside any server. The notice is
// verified against a pinned attestation key, with no call outside this
// domain. From then on, this domain's own records signed with that key inside
// the window are under review. Until a notice arrives, a domain cannot know of
// a compromise elsewhere; that limit is disclosed.
//
// Order:
//   1. recorder  — a named HUMAN holding KEY_SECURITY_OFFICER → KEY_NOTICE_NOT_AUTHORISED (403)
//   2. issuer    — another issuer's key, never this registry's own → KEY_ISSUER_MISMATCH (422)
//   3. attested  — against a key pinned for that issuer; its times in order and not after now
//                  → KEY_NOTICE_INVALID (422)
//   4. insert; receipt KEY_COMPROMISE_NOTICE; 201

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { parseSigningPublicKey, verifyStatementSignature } from "../../foundation/signatures.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyNoticeDecision, KeyNoticeReceipt, KeyNoticeRequest, KeyNoticeResponse } from "../../types/key-registry.js";
import { describeIssuer, namedHuman, sameIssuer, type RegistryDirectory } from "./common.js";
import { insertNotice, noticeDigestOf, type NoticeRecord } from "./compromise-store.js";
import { CAPABILITY_ID, KEY_SECURITY_OFFICER_ROLE, keyRegistryFailure } from "./errors.js";
import { keyRegistryReader } from "./store.js";
import { clockNow } from "./write-store.js";

export function recordNotice(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyNoticeRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const recorder = namedHuman(directory, ctx.actor!, KEY_SECURITY_OFFICER_ROLE, "KEY_NOTICE_NOT_AUTHORISED", "Recording another issuer's compromise notice");
    const n = ctx.body.notice;

    // 2. Another issuer's key
    if (sameIssuer(n.issuer, directory.issuer)) {
      throw keyRegistryFailure("KEY_ISSUER_MISMATCH", [`A notice is another issuer's; a compromise of a ${describeIssuer(directory.issuer)} key is declared in this registry (POST /aab/v1/signing-keys/:keyId/compromises).`]);
    }

    // 3. Attested against a pinned key, with no call outside this domain
    const now = await clockNow(tx);
    const at = now.toISOString();
    const pin = (await keyRegistryReader(tx).pinnedAttestationKeys()).find((p) => p.attestationKeyId === n.attestationKeyId);
    const t = (s: string) => Date.parse(s);
    const problem =
      pin === undefined ? `Attestation key ${n.attestationKeyId} is not pinned in this registry.`
      : !sameIssuer(pin.attestedIssuer, n.issuer) ? `Attestation key ${n.attestationKeyId} attests ${describeIssuer(pin.attestedIssuer)}'s keys, not ${describeIssuer(n.issuer)}'s.`
      : !verifyStatementSignature(n, ctx.body.attestation, parseSigningPublicKey(pin.publicKey)) ? "The attestation does not verify against the pinned key."
      : !(t(n.suspectedExposureFrom) <= t(n.recordedAt) && t(n.recordedAt) <= t(n.attestedAt)) ? "The notice's times are out of order: suspectedExposureFrom, recordedAt and attestedAt must not decrease."
      : t(n.attestedAt) > now.getTime() ? `The notice is attested at ${n.attestedAt}, after it is recorded here (${at}).`
      : null;
    if (problem !== null) throw keyRegistryFailure("KEY_NOTICE_INVALID", [problem]);

    // 4. The record
    const record: NoticeRecord = { noticeId: randomUUID(), notice: n, attestation: ctx.body.attestation, recordedBy: recorder, recordedAt: at, receiptId: randomUUID() };
    const noticeDigest = noticeDigestOf(record);
    await insertNotice(tx, record, noticeDigest);

    const window = { from: new Date(n.suspectedExposureFrom).toISOString(), until: new Date(n.recordedAt).toISOString() };
    const decision: KeyNoticeDecision = {
      decisionId: randomUUID(),
      decision: "RECORDED",
      noticeId: record.noticeId,
      issuer: n.issuer,
      keyId: n.keyId,
      exposureWindow: window,
      noticeDigest,
      decisionReasons: [
        `recorder: ${recorder.actorId} (${recorder.accountableName}) holds ${KEY_SECURITY_OFFICER_ROLE}.`,
        `attestation: verified against pinned key ${n.attestationKeyId}, with no call outside this domain.`,
        `Key ${n.keyId} of ${n.actorId} (${describeIssuer(n.issuer)}) was declared compromised there at ${window.until}. This domain's records signed with it and accepted from ${window.from} to ${window.until} are now under review until a person assesses them.`,
        "Disclosed: until a notice arrives, a domain cannot know of a compromise elsewhere.",
      ],
      decidedBy: recorder,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyNoticeReceipt, typeof CAPABILITY_ID, KeyNoticeDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_COMPROMISE_NOTICE",
      subjectId: record.noticeId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyNoticeReceipt,
      receiptId: record.receiptId,
    });
    const body: KeyNoticeResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
