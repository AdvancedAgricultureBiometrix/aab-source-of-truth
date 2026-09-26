// SCS-PLATFORM-02: produce a rendition of a governed record inside the owning
// capability's transaction (contract e99ff4f/8e64e33 and a0f8c46).
//
//   1. render the document (renderer.ts): same document, same bytes;
//   2. store the bytes in the object store (SCS-PLATFORM-01) under their
//      SHA-256, never overwriting. The object store is not transactional, so
//      the bytes are written first: if the capability's transaction later
//      fails, they are an unreferenced object and harmless;
//   3. record the rendition (scs.rendition) in the capability's transaction.
//
// A stored rendition is never evidence: it gets no scs.evidence_object row.

import { createHash, randomUUID } from "node:crypto";

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { CapabilityId } from "../../foundation/errors.js";
import type { ActorReference } from "../../types/shared.js";
import type { ObjectStore } from "../evidence-objects/object-store.js";
import { renderPdf, type RenditionDocument } from "./renderer.js";

export interface RenditionRecord {
  readonly renditionId: string;
  readonly mediaType: "application/pdf";
  readonly sha256: string;
  readonly byteLength: number;
  readonly rendererVersion: string;
}

export async function produceRendition(
  tx: Tx,
  objectStore: ObjectStore,
  r: {
    readonly capabilityId: Exclude<CapabilityId, "SCS-PLATFORM">;
    readonly sourceRecordId: string;
    readonly sourceDigest: string;
    readonly sourceDigestAlgorithm: string;
    readonly rendererVersion: string;
    readonly document: RenditionDocument;
    readonly renderedAt: Date;
    readonly renderedFor: ActorReference;
  },
): Promise<RenditionRecord> {
  const bytes = await renderPdf(r.document);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await objectStore.putIfAbsent(sha256, bytes, "application/pdf");
  const renditionId = randomUUID();
  await withDatabaseErrors(r.capabilityId, () =>
    tx.query(
      `INSERT INTO scs.rendition (rendition_id, source_capability_id, source_record_id, source_digest, source_digest_algorithm, renderer_version,
         media_type, byte_length, sha256, storage_bucket, storage_key, rendered_at, rendered_for)
       VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', $7, $8, $9, $8, $10, $11)`,
      [renditionId, r.capabilityId, r.sourceRecordId, r.sourceDigest, r.sourceDigestAlgorithm, r.rendererVersion, bytes.length, sha256,
        objectStore.bucket, r.renderedAt, JSON.stringify(r.renderedFor)],
    ),
  );
  return { renditionId, mediaType: "application/pdf", sha256, byteLength: bytes.length, rendererVersion: r.rendererVersion };
}
