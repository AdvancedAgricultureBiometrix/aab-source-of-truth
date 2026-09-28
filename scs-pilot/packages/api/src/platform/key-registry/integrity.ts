// AAB-PLATFORM-09: the registry's own integrity, for the integrity verifier
// (ops/verify-integrity.ts). Every registry record is rebuilt from its row
// exactly as it was digested, and:
//   - re-digests to its recorded digest;
//   - names a receipt that exists, carrying AAB-PLATFORM-09;
//   - every signature on it verifies against the key its statement names, as
//     at the time the server accepted it (section 7), with any assessment;
//   - a proof of possession verifies with the key it registers, and the key
//     is the key its digest names;
//   - evidence and notices verify against a pinned attestation key.
//
// A signature that is NOT_VERIFIABLE is a problem. One under compromise
// review, affirmed or repudiated is not: the record is intact, and what its
// signature is worth is its verification result, which is counted and shown.

import type { Tx } from "../../foundation/db.js";
import { parseSigningPublicKey, verifyStatementSignature } from "../../foundation/signatures.js";
import { assessmentDigestOf, compromiseDigestOf, noticeDigestOf, type AssessmentRecord, type CompromiseRecord, type NoticeRecord } from "./compromise-store.js";
import { checkVerificationEvidence, publicKeyDigestOf, verifySignedRecord, type KeyVerificationEvidence, type RegistryIssuer, type VerificationResult } from "./registry.js";
import { keyRegistryReader, type KeyRegistryReader, type SignedRecordTable } from "./store.js";
import { ceremonyDigestOf, eventDigestOf, registrationDigestOf, type CeremonyRecord, type EventRecord, type RegistrationRecord } from "./write-store.js";

export interface IntegritySection {
  checked: number;
  problems: string[];
  /** How many signatures had each verification result. */
  verification: Partial<Record<VerificationResult, number>>;
}

export interface RegistryIntegrity {
  registrations: IntegritySection;
  events: IntegritySection;
  compromises: IntegritySection;
  ceremonies: IntegritySection;
  verificationEvidence: IntegritySection;
  notices: IntegritySection;
  assessments: IntegritySection;
}

type Row = Record<string, unknown>;
const iso = (d: unknown) => (d as Date).toISOString();
const issuerOf = (type: unknown, country: unknown): RegistryIssuer =>
  country === null ? { issuerType: type as RegistryIssuer["issuerType"] } : { issuerType: type as RegistryIssuer["issuerType"], countryCode: country as string };
const signerOf = (ref: unknown) => {
  const r = ref as { actorId: string; issuer: { issuerType: RegistryIssuer["issuerType"]; countryCode?: string } };
  return { issuer: issuerOf(r.issuer.issuerType, r.issuer.countryCode ?? null), actorId: r.actorId };
};
const section = (): IntegritySection => ({ checked: 0, problems: [], verification: {} });

/** Verifies one signature with this registry's key, counting its result; NOT_VERIFIABLE is a problem. */
async function signature(
  reader: KeyRegistryReader,
  s: IntegritySection,
  what: string,
  table: SignedRecordTable,
  recordId: string,
  input: { statement: unknown; signature: string; signer: ReturnType<typeof signerOf>; signingKeyId: string; acceptedAt: string; foreign?: boolean },
): Promise<void> {
  const key = input.foreign ? await reader.foreignKeyHistory(table, recordId, input.signingKeyId) : await reader.keyHistory(input.signingKeyId);
  const assessment = await reader.assessmentOf(table, recordId);
  const v = verifySignedRecord({
    record: { statement: input.statement, signature: input.signature, signer: input.signer, acceptedAt: input.acceptedAt },
    key,
    ...(assessment === undefined ? {} : { assessment }),
  });
  s.verification[v.result] = (s.verification[v.result] ?? 0) + 1;
  if (v.result === "NOT_VERIFIABLE") s.problems.push(`${what}: its signature is NOT_VERIFIABLE (${v.reason ?? "no reason"}).`);
}

export async function verifyRegistryIntegrity(tx: Tx): Promise<RegistryIntegrity> {
  const reader = keyRegistryReader(tx);
  const q = async (sql: string, values: unknown[] = []) => (await tx.query<Row>(sql, values)).rows;
  const receipts = new Set((await q("SELECT receipt_id FROM scs.decision_receipt WHERE capability_id = 'AAB-PLATFORM-09'")).map((r) => r["receipt_id"] as string));
  const receipted = (s: IntegritySection, what: string, receiptId: string) => {
    if (!receipts.has(receiptId)) s.problems.push(`${what}: no AAB-PLATFORM-09 receipt ${receiptId}.`);
  };
  const out: RegistryIntegrity = {
    registrations: section(), events: section(), compromises: section(), ceremonies: section(),
    verificationEvidence: section(), notices: section(), assessments: section(),
  };

  // Registrations
  for (const r of await q("SELECT * FROM scs.signing_key_registration ORDER BY registered_at, key_id")) {
    const s = out.registrations;
    s.checked++;
    const what = `key ${r["key_id"]}`;
    const record: RegistrationRecord = {
      keyId: r["key_id"] as string,
      issuer: issuerOf(r["issuer_type"], r["issuer_country_code"]),
      actorId: r["actor_id"] as string,
      algorithm: "Ed25519",
      publicKey: r["public_key"] as string,
      publicKeyDigest: r["public_key_digest"] as string,
      activeFrom: iso(r["active_from"]),
      registeredAt: iso(r["registered_at"]),
      challengeId: r["challenge_id"] as string,
      possessionStatement: r["possession_statement"] as RegistrationRecord["possessionStatement"],
      possessionSignature: r["possession_signature"] as string,
      registrationAuthority: r["registration_authority"] as RegistrationRecord["registrationAuthority"],
      registrationStatement: r["registration_statement"] as RegistrationRecord["registrationStatement"],
      registrationSignature: r["registration_signature"] as string,
      registrationSignerKeyId: r["registration_signer_key_id"] as string,
      ...(r["replaces_key_id"] === null ? {} : { replacesKeyId: r["replaces_key_id"] as string }),
      ...(r["bootstrap_ceremony_id"] === null ? {} : { bootstrapCeremonyId: r["bootstrap_ceremony_id"] as string }),
      receiptId: r["receipt_id"] as string,
    };
    if (registrationDigestOf(record) !== r["registration_digest"]) s.problems.push(`${what}: it does not re-digest to its registrationDigest.`);
    if (publicKeyDigestOf(record.publicKey) !== record.publicKeyDigest) s.problems.push(`${what}: its public key is not the key its digest names.`);
    let possessed = false;
    try {
      possessed = verifyStatementSignature(record.possessionStatement, record.possessionSignature, parseSigningPublicKey(record.publicKey));
    } catch { /* an unusable key proves nothing */ }
    if (!possessed) s.problems.push(`${what}: its proof of possession does not verify with the key it registers.`);
    receipted(s, what, record.receiptId);
    await signature(reader, s, what, "signing_key_registration", record.keyId, {
      statement: record.registrationStatement, signature: record.registrationSignature, signer: signerOf(record.registrationAuthority),
      signingKeyId: record.registrationSignerKeyId, acceptedAt: record.registeredAt,
    });
  }

  // Events
  for (const r of await q("SELECT * FROM scs.signing_key_event ORDER BY recorded_at, event_id")) {
    const s = out.events;
    s.checked++;
    const what = `key event ${r["event_id"]}`;
    const record: EventRecord = {
      eventId: r["event_id"] as string,
      keyId: r["key_id"] as string,
      eventType: r["event_type"] as EventRecord["eventType"],
      effectiveAt: iso(r["effective_at"]),
      reason: r["reason"] as string,
      recordedBy: r["recorded_by"] as EventRecord["recordedBy"],
      recordedAt: iso(r["recorded_at"]),
      eventStatement: r["event_statement"] as EventRecord["eventStatement"],
      statementSignature: r["statement_signature"] as string,
      signerKeyId: r["signer_key_id"] as string,
      receiptId: r["receipt_id"] as string,
    };
    if (eventDigestOf(record) !== r["event_digest"]) s.problems.push(`${what}: it does not re-digest to its eventDigest.`);
    receipted(s, what, record.receiptId);
    await signature(reader, s, what, "signing_key_event", record.eventId, {
      statement: record.eventStatement, signature: record.statementSignature, signer: signerOf(record.recordedBy), signingKeyId: record.signerKeyId, acceptedAt: record.recordedAt,
    });
  }

  // Compromises
  const evidenceRows = await q("SELECT compromise_id, evidence_digest, description FROM scs.signing_key_compromise_evidence ORDER BY compromise_id, evidence_digest");
  for (const r of await q("SELECT * FROM scs.signing_key_compromise ORDER BY recorded_at, compromise_id")) {
    const s = out.compromises;
    s.checked++;
    const what = `compromise ${r["compromise_id"]}`;
    const signed = r["declaration_signed"] as boolean;
    const record: CompromiseRecord = {
      compromiseId: r["compromise_id"] as string,
      keyId: r["key_id"] as string,
      suspectedExposureFrom: iso(r["suspected_exposure_from"]),
      exposureBasis: r["exposure_basis"] as string,
      evidence: evidenceRows.filter((e) => e["compromise_id"] === r["compromise_id"]).map((e) => ({ description: e["description"] as string, digest: e["evidence_digest"] as string })),
      declaredBy: r["declared_by"] as CompromiseRecord["declaredBy"],
      declarationSigned: signed,
      ...(signed ? {
        declarationStatement: r["declaration_statement"] as NonNullable<CompromiseRecord["declarationStatement"]>,
        statementSignature: r["statement_signature"] as string,
        signerKeyId: r["signer_key_id"] as string,
      } : {}),
      recordedAt: iso(r["recorded_at"]),
      receiptId: r["receipt_id"] as string,
    };
    if (compromiseDigestOf(record) !== r["compromise_digest"]) s.problems.push(`${what}: it does not re-digest to its compromiseDigest.`);
    receipted(s, what, record.receiptId);
    if (signed) {
      await signature(reader, s, what, "signing_key_compromise", record.compromiseId, {
        statement: record.declarationStatement, signature: record.statementSignature!, signer: signerOf(record.declaredBy), signingKeyId: record.signerKeyId!, acceptedAt: record.recordedAt,
      });
    }
  }

  // Bootstrap ceremonies
  for (const r of await q("SELECT c.*, k.public_key FROM scs.key_bootstrap_ceremony c JOIN scs.signing_key_registration k ON k.key_id = c.first_key_id ORDER BY c.recorded_at")) {
    const s = out.ceremonies;
    s.checked++;
    const what = `bootstrap ceremony ${r["ceremony_id"]}`;
    const record: CeremonyRecord = {
      ceremonyId: r["ceremony_id"] as string,
      registry: issuerOf(r["issuer_type"], r["issuer_country_code"]),
      firstKeyId: r["first_key_id"] as string,
      ceremonyStatement: r["ceremony_record"] as CeremonyRecord["ceremonyStatement"],
      holder: r["holder"] as CeremonyRecord["holder"],
      holderSignature: r["holder_signature"] as string,
      ...(r["cosigner"] === null ? {} : {
        cosigner: r["cosigner"] as NonNullable<CeremonyRecord["cosigner"]>,
        cosignerKeyId: r["cosigner_key_id"] as string,
        cosignature: r["cosignature"] as string,
      }),
      recordedAt: iso(r["recorded_at"]),
      receiptId: r["receipt_id"] as string,
    };
    if (ceremonyDigestOf(record) !== r["ceremony_digest"]) s.problems.push(`${what}: it does not re-digest to its ceremonyDigest.`);
    receipted(s, what, record.receiptId);
    await signature(reader, s, `${what} (holder)`, "key_bootstrap_ceremony", record.ceremonyId, {
      statement: record.ceremonyStatement, signature: record.holderSignature, signer: signerOf(record.holder), signingKeyId: record.firstKeyId, acceptedAt: record.recordedAt,
    });
    if (record.cosigner !== undefined) {
      await signature(reader, s, `${what} (co-signature)`, "key_bootstrap_ceremony", record.ceremonyId, {
        statement: record.ceremonyStatement, signature: record.cosignature!, signer: signerOf(record.cosigner), signingKeyId: record.cosignerKeyId!, acceptedAt: record.recordedAt, foreign: true,
      });
    }
  }

  // Cross-issuer evidence and notices, against pinned attestation keys
  const pins = await reader.pinnedAttestationKeys();
  for (const r of await q("SELECT * FROM scs.key_verification_evidence ORDER BY stored_at, evidence_id")) {
    const s = out.verificationEvidence;
    s.checked++;
    const what = `verification evidence ${r["evidence_id"]}`;
    const evidence = r["evidence"] as KeyVerificationEvidence;
    const checked = checkVerificationEvidence(evidence, pins, iso(r["stored_at"]));
    if (!checked.ok) s.problems.push(`${what}: ${checked.reason}.`);
  }
  for (const r of await q("SELECT * FROM scs.key_compromise_notice ORDER BY recorded_at, notice_id")) {
    const s = out.notices;
    s.checked++;
    const what = `compromise notice ${r["notice_id"]}`;
    const record: NoticeRecord = {
      noticeId: r["notice_id"] as string,
      notice: r["notice"] as NoticeRecord["notice"],
      attestation: r["attestation"] as string,
      recordedBy: r["recorded_by"] as NoticeRecord["recordedBy"],
      recordedAt: iso(r["recorded_at"]),
      receiptId: r["receipt_id"] as string,
    };
    if (noticeDigestOf(record) !== r["notice_digest"]) s.problems.push(`${what}: it does not re-digest to its noticeDigest.`);
    receipted(s, what, record.receiptId);
    const pin = pins.find((p) => p.attestationKeyId === record.notice.attestationKeyId);
    if (pin === undefined || !verifyStatementSignature(record.notice, record.attestation, parseSigningPublicKey(pin.publicKey))) {
      s.problems.push(`${what}: its attestation does not verify against a pinned key.`);
    }
  }

  // Assessments
  for (const r of await q("SELECT * FROM scs.key_compromise_assessment ORDER BY assessed_at, assessment_id")) {
    const s = out.assessments;
    s.checked++;
    const what = `compromise assessment ${r["assessment_id"]}`;
    const record: AssessmentRecord = {
      assessmentId: r["assessment_id"] as string,
      ...(r["compromise_id"] === null ? {} : { compromiseId: r["compromise_id"] as string }),
      ...(r["notice_id"] === null ? {} : { noticeId: r["notice_id"] as string }),
      recordTable: r["record_table"] as SignedRecordTable,
      recordId: r["record_id"] as string,
      keyHolder: { issuer: issuerOf(r["key_holder_issuer_type"], r["key_holder_issuer_country_code"]), actorId: r["key_holder_actor_id"] as string },
      outcome: r["outcome"] as AssessmentRecord["outcome"],
      reasons: r["reasons"] as string,
      evidenceConsidered: r["evidence_considered"] as AssessmentRecord["evidenceConsidered"],
      assessedBy: r["assessed_by"] as AssessmentRecord["assessedBy"],
      assessmentStatement: r["assessment_statement"] as AssessmentRecord["assessmentStatement"],
      statementSignature: r["statement_signature"] as string,
      signerKeyId: r["signer_key_id"] as string,
      assessedAt: iso(r["assessed_at"]),
      receiptId: r["receipt_id"] as string,
    };
    if (assessmentDigestOf(record) !== r["assessment_digest"]) s.problems.push(`${what}: it does not re-digest to its assessmentDigest.`);
    receipted(s, what, record.receiptId);
    await signature(reader, s, what, "key_compromise_assessment", record.assessmentId, {
      statement: record.assessmentStatement, signature: record.statementSignature, signer: signerOf(record.assessedBy), signingKeyId: record.signerKeyId, acceptedAt: record.assessedAt,
    });
  }

  return out;
}
