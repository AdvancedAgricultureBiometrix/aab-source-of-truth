// AAB-PLATFORM-01 persistence — the scs.evidence_object rows. All functions
// take the request's transaction; database errors are mapped to canonical
// failures (foundation/db-errors.ts).

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorReference } from "../../types/shared.js";

const PLATFORM = "SCS-PLATFORM" as const;

export interface StoredObjectRow {
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly mediaType: string;
  readonly storedAt: string;
  readonly storedBy: ActorReference;
}

/** Serialise uploads of the same bytes until the transaction ends. */
export async function lockDigest(tx: Tx, sha256: string): Promise<void> {
  await withDatabaseErrors(PLATFORM, () => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`scs-evidence-object\u001f${sha256}`]));
}

export async function findObject(tx: Tx, sha256: string): Promise<StoredObjectRow | null> {
  const { rows } = await withDatabaseErrors(PLATFORM, () =>
    tx.query<{ content_sha256: string; size_bytes: string; media_type: string; stored_at: Date; stored_by: ActorReference }>(
      `SELECT content_sha256, size_bytes, media_type, stored_at, stored_by FROM scs.evidence_object WHERE content_sha256 = $1`,
      [sha256],
    ),
  );
  const r = rows[0];
  return r === undefined
    ? null
    : { sha256: r.content_sha256, sizeBytes: Number(r.size_bytes), mediaType: r.media_type, storedAt: r.stored_at.toISOString(), storedBy: r.stored_by };
}

export async function insertObject(
  tx: Tx,
  o: { readonly sha256: string; readonly sizeBytes: number; readonly mediaType: string; readonly bucket: string; readonly storedBy: ActorReference },
): Promise<StoredObjectRow> {
  const { rows } = await withDatabaseErrors(PLATFORM, () =>
    tx.query<{ stored_at: Date }>(
      `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by)
       VALUES ($1, $2, $3, $4, $1, $5)
       RETURNING stored_at`,
      [o.sha256, o.sizeBytes, o.mediaType, o.bucket, JSON.stringify(o.storedBy)],
    ),
  );
  return { sha256: o.sha256, sizeBytes: o.sizeBytes, mediaType: o.mediaType, storedAt: rows[0]!.stored_at.toISOString(), storedBy: o.storedBy };
}
