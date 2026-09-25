// SCS-PLATFORM-01 POST /scs/v1/evidence-objects — store one evidence file.
//
// The server layer has authenticated the actor (any authenticated actor may
// upload: contract gap, recorded), checked the media type (one of
// ACCEPTED_MEDIA_TYPES → else EVIDENCE_OBJECT_TYPE_UNSUPPORTED, 415) and size
// (1 byte to 50 MB → else EVIDENCE_OBJECT_TOO_LARGE, 413, or 400 when empty),
// checked the Idempotency-Key and opened the transaction.
//
// Then, in order:
//   1. SHA-256 of the bytes, computed here — never taken from the client
//   2. lock the digest for this transaction (concurrent identical uploads)
//   3. already recorded → 200 with the existing object, as first stored
//      (its media type and time); nothing is written
//   4. otherwise put the bytes in the object store under the digest, never
//      overwriting (an object already there — left by an earlier upload whose
//      database write failed — is identical and is reused), then record the
//      row → 201
//
// The bytes go to the object store before the row is committed. If the row
// then fails, the stored bytes remain unreferenced: harmless, because they
// are addressed by their digest and the next upload of the same file reuses
// them. No receipt: storing bytes is not a decision (contract 288bfd7); the
// receipt comes when a capability admits a record citing the object.

import { createHash } from "node:crypto";

import type { OperationResult } from "../../foundation/idempotency.js";
import type { RawBody, Route, RouteContext } from "../../foundation/server.js";
import type { ScsEvidenceObject } from "../../types/platform.js";
import type { ObjectStore } from "./object-store.js";
import { findObject, insertObject, lockDigest, type StoredObjectRow } from "./store.js";

/** 50 MB (contract 288bfd7). */
export const MAX_EVIDENCE_OBJECT_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_MEDIA_TYPES = ["image/tiff", "image/png", "image/jpeg", "application/pdf", "application/zip", "application/octet-stream"] as const;

function toEvidenceObject(row: StoredObjectRow): ScsEvidenceObject {
  return {
    objectId: row.sha256,
    objectReference: `scs-object:sha256:${row.sha256}`,
    contentDigest: { algorithm: "SHA-256", value: row.sha256 },
    sizeBytes: row.sizeBytes,
    mediaType: row.mediaType as ScsEvidenceObject["mediaType"],
    storedAt: row.storedAt,
    storedBy: row.storedBy,
  };
}

export function uploadEvidenceObject(objectStore: ObjectStore) {
  return async (ctx: RouteContext<RawBody>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const { bytes, mediaType } = ctx.body;
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    await lockDigest(tx, sha256);
    const existing = await findObject(tx, sha256);
    if (existing !== null) return { status: 200, body: toEvidenceObject(existing) };

    await objectStore.putIfAbsent(sha256, bytes, mediaType);
    const row = await insertObject(tx, { sha256, sizeBytes: bytes.length, mediaType, bucket: objectStore.bucket, storedBy: ctx.actor! });
    return { status: 201, body: toEvidenceObject(row) };
  };
}

export function evidenceObjectRoutes(objectStore: ObjectStore): readonly Route<never>[] {
  const route: Route<RawBody> = {
    method: "POST",
    path: "/scs/v1/evidence-objects",
    capabilityId: "SCS-PLATFORM",
    auth: "required",
    transactional: true,
    idempotency: "required",
    rawBody: {
      maxBytes: MAX_EVIDENCE_OBJECT_BYTES,
      mediaTypes: ACCEPTED_MEDIA_TYPES,
      tooLarge: "EVIDENCE_OBJECT_TOO_LARGE",
      unsupportedType: "EVIDENCE_OBJECT_TYPE_UNSUPPORTED",
    },
    handle: uploadEvidenceObject(objectStore),
  };
  return [route as unknown as Route<never>];
}
