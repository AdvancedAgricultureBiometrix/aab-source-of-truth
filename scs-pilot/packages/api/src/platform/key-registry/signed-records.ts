// AAB-PLATFORM-09 section 7, for the platform's signed records: a link's
// creator signature and a status record's writer signature, verified against
// the key each statement names (AAB-PLATFORM-04, third amendment: version 2
// statements), as at the time the server accepted the record — never against
// the signer's current key — with any compromise assessment of the record.
//
// A version 1 statement names no key: it is NOT_VERIFIABLE, and a record
// holding one is never relied on. Pilot deployments start from a fresh
// database under version 2 (AAB-PLATFORM-09, second amendment).

import type { ActorSubjectLink, ActorSubjectLinkStatusRecord } from "../../types/platform.js";
import type { ActorReference } from "../../types/shared.js";
import { verifySignedRecord, type RegistryIssuer, type Verification } from "./registry.js";
import type { KeyRegistryReader, SignedRecordTable } from "./store.js";

const signerOf = (ref: ActorReference): { issuer: RegistryIssuer; actorId: string } | null =>
  "issuer" in ref ? { issuer: ref.issuer as RegistryIssuer, actorId: ref.actorId } : null;

async function verify(
  reader: KeyRegistryReader,
  table: SignedRecordTable,
  recordId: string,
  statement: object,
  signature: string,
  signedBy: ActorReference,
  acceptedAt: string,
): Promise<Verification> {
  const signingKeyId = (statement as { signingKeyId?: unknown }).signingKeyId;
  if (typeof signingKeyId !== "string") return { result: "NOT_VERIFIABLE", reason: "a version 1 statement names no signing key" };
  const signer = signerOf(signedBy);
  if (signer === null) return { result: "NOT_VERIFIABLE", reason: "the signer has no version 2 reference" };
  const key = await reader.keyHistory(signingKeyId);
  const assessment = await reader.assessmentOf(table, recordId);
  return verifySignedRecord({ record: { statement, signature, signer, acceptedAt }, key, ...(assessment === undefined ? {} : { assessment }) });
}

/** A link's creator signature, as at its createdAt. */
export function verifyLinkSignature(reader: KeyRegistryReader, link: ActorSubjectLink): Promise<Verification> {
  return verify(reader, "actor_party_link", link.linkId, link.linkStatement, link.statementSignature, link.createdBy, link.createdAt);
}

/** A status record's writer signature, as at its recordedAt. */
export function verifyStatusSignature(reader: KeyRegistryReader, record: ActorSubjectLinkStatusRecord): Promise<Verification> {
  return verify(reader, "actor_party_link_status", record.statusRecordId, record.statusStatement, record.statementSignature, record.writtenBy, record.recordedAt);
}
