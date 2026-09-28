// AAB-PLATFORM-09 — POST /aab/v1/key-compromise-assessments (section 8;
// second amendment). A person affirms or repudiates one record accepted
// inside a compromise's exposure window: an attributable human decision
// (AAB-PLATFORM-08), signed with the assessor's own key. The record is never
// removed; its verification is derived when read, from this assessment.
//
// Order:
//   1. assessor  — a named HUMAN holding KEY_SECURITY_OFFICER → KEY_ASSESSOR_NOT_AUTHORISED (403);
//                  the statement names the requester → KEY_SIGNATURE_INVALID (422)
//      lock      — assessments in this registry are serialised; the clock is read after it
//   2. record    — exists → KEY_RECORD_NOT_FOUND (404)
//   3. in review — a signature on it was accepted inside its key's exposure window, by this
//                  registry's compromise or another issuer's notice → KEY_RECORD_NOT_UNDER_REVIEW (409)
//   4. assessor  — never the compromised key's holder → KEY_ASSESSOR_NOT_AUTHORISED (403)
//   5. once      — one assessment per record → KEY_RECORD_ALREADY_ASSESSED (409)
//   6. signature — the assessor's own key, ACTIVE now → KEY_SIGNATURE_INVALID (422)
//   7. insert; receipt KEY_COMPROMISE_ASSESSMENT; 201

import { randomUUID } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyAssessmentDecision, KeyAssessmentReceipt, KeyAssessmentRequest, KeyAssessmentResponse } from "../../types/key-registry.js";
import { isActor, namedHuman, verifyWithRegisteredKey, type RegistryDirectory } from "./common.js";
import { assessmentDigestOf, assessmentExists, compromisesOf, insertAssessment, noticesOf, signaturesOf, type AssessmentRecord } from "./compromise-store.js";
import { CAPABILITY_ID, KEY_SECURITY_OFFICER_ROLE, keyRegistryFailure } from "./errors.js";
import { exposureWindow, type KeyHistory } from "./registry.js";
import { keyRegistryReader, type SignedRecordTable } from "./store.js";
import { clockNow, lockRegistry } from "./write-store.js";

export function assessRecord(directory: RegistryDirectory) {
  return async (ctx: RouteContext<KeyAssessmentRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const assessor = namedHuman(directory, ctx.actor!, KEY_SECURITY_OFFICER_ROLE, "KEY_ASSESSOR_NOT_AUTHORISED", "Assessing a record under compromise review");
    const s = ctx.body.assessmentStatement;
    if (!isActor(s.assessedBy, assessor)) {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The statement names ${s.assessedBy.actorId} as its assessor, not the requester ${assessor.actorId}.`]);
    }
    const table = s.recordTable as SignedRecordTable;
    const recordId = s.recordId;

    await lockRegistry(tx, directory.issuer);
    const now = await clockNow(tx);
    const at = now.toISOString();
    const reader = keyRegistryReader(tx);

    // 2. The record, and 3. a signature on it under review
    const signatures = await signaturesOf(tx, table, recordId);
    if (signatures.length === 0) throw keyRegistryFailure("KEY_RECORD_NOT_FOUND", [`No ${table} record ${recordId}.`]);
    let under: { key: KeyHistory; foreign: boolean; window: { from: string; until: string }; acceptedAt: string } | undefined;
    for (const sig of signatures) {
      if (sig.signingKeyId === undefined) continue;
      const key = sig.foreign ? await reader.foreignKeyHistory(table, recordId, sig.signingKeyId) : await reader.keyHistory(sig.signingKeyId);
      const window = key === null ? undefined : exposureWindow(key);
      if (key !== null && window !== undefined && Date.parse(window.from) <= Date.parse(sig.acceptedAt) && Date.parse(sig.acceptedAt) <= Date.parse(window.until)) {
        under = { key, foreign: sig.foreign, window, acceptedAt: sig.acceptedAt };
        break;
      }
    }
    if (under === undefined) {
      throw keyRegistryFailure("KEY_RECORD_NOT_UNDER_REVIEW", [`${table} record ${recordId} was not accepted inside any exposure window of a key it names; there is nothing to assess.`]);
    }

    // 4. Never the compromised key's holder
    const holder = { issuer: under.key.registration.issuer, actorId: under.key.registration.actorId };
    if (isActor(holder, assessor)) {
      throw keyRegistryFailure("KEY_ASSESSOR_NOT_AUTHORISED", [`${assessor.actorId} holds the compromised key; a record signed with it is assessed by someone else.`]);
    }

    // 5. Once
    if (await assessmentExists(tx, table, recordId)) {
      throw keyRegistryFailure("KEY_RECORD_ALREADY_ASSESSED", [`${table} record ${recordId} has already been assessed; an assessment is written once.`]);
    }

    // 6. The assessor's own key, ACTIVE now
    const v = await verifyWithRegisteredKey(reader, { statement: s, signature: ctx.body.statementSignature, signer: s.assessedBy, signingKeyId: s.signingKeyId, acceptedAt: at });
    if (v.verification.result !== "VERIFIED") {
      throw keyRegistryFailure("KEY_SIGNATURE_INVALID", [`The assessment does not verify with ${assessor.actorId}'s key ${s.signingKeyId}: ${v.verification.reason ?? v.verification.result}.`]);
    }

    // 7. The record
    const keyId = under.key.registration.keyId;
    const source = under.foreign
      ? { noticeId: (await noticesOf(tx, under.key.registration.issuer, keyId))[0]!.noticeId }
      : { compromiseId: (await compromisesOf(tx, keyId))[0]!.compromiseId };
    const record: AssessmentRecord = {
      assessmentId: randomUUID(),
      ...source,
      recordTable: table,
      recordId,
      keyHolder: holder,
      outcome: s.outcome,
      reasons: s.reasons,
      evidenceConsidered: s.evidenceConsidered,
      assessedBy: assessor,
      assessmentStatement: s,
      statementSignature: ctx.body.statementSignature,
      signerKeyId: s.signingKeyId,
      assessedAt: at,
      receiptId: randomUUID(),
    };
    const assessmentDigest = assessmentDigestOf(record);
    await insertAssessment(tx, record, assessmentDigest);

    const resultingVerification = s.outcome === "AFFIRM" ? "AFFIRMED_AFTER_COMPROMISE" : "REPUDIATED";
    const decision: KeyAssessmentDecision = {
      decisionId: randomUUID(),
      decision: "RECORDED",
      assessmentId: record.assessmentId,
      recordTable: s.recordTable,
      recordId,
      outcome: s.outcome,
      resultingVerification,
      assessmentDigest,
      signatureAcceptance: { acceptedAt: at, signingKeyId: s.signingKeyId, publicKeyDigest: v.key!.registration.publicKeyDigest, registrationDigest: v.key!.registration.registrationDigest },
      decisionReasons: [
        `assessor: ${assessor.actorId} (${assessor.accountableName}) holds ${KEY_SECURITY_OFFICER_ROLE}, and is not ${holder.actorId}, who holds the compromised key.`,
        `in review: accepted at ${under.acceptedAt}, inside key ${keyId}'s exposure window (${under.window.from} to ${under.window.until})${under.foreign ? ", known from another issuer's notice" : ""}.`,
        `outcome: ${s.outcome} — ${s.reasons}`,
        `The record is ${resultingVerification} from now. It is never removed: ${s.outcome === "AFFIRM" ? "it may be relied on again" : "it is never relied on again, and stays on the record as repudiated"}.`,
      ],
      decidedBy: assessor,
      decidedAt: at,
    };
    const written = await writeReceipt<KeyAssessmentReceipt, typeof CAPABILITY_ID, KeyAssessmentDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "KEY_COMPROMISE_ASSESSMENT",
      subjectId: record.assessmentId,
      decision,
      issuedFor: ctx.actor!,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.platformKeyAssessmentReceipt,
      receiptId: record.receiptId,
    });
    const body: KeyAssessmentResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
