// AAB-PLATFORM-02 rendition download — GET /scs/v1/renditions/:renditionId
// (contract e99ff4f/8e64e33, "Retrieval").
//
//   1. authority — the actor holds a reader role of some rendering capability,
//                  else READER_NOT_AUTHORISED (403) before anything is looked up
//   2. lookup    — an unknown rendition → RENDITION_NOT_FOUND (404)
//   3. authority — the actor is one of the owning capability's readers
//                  → READER_NOT_AUTHORISED (403)
//   4. integrity — the bytes are read from the object store and re-hashed on
//                  every read; missing, or not matching the recorded SHA-256,
//                  nothing is returned (RENDITION_INTEGRITY_FAILED); the store
//                  unreachable → DEPENDENCY_UNAVAILABLE (503)
//
// The bytes are returned as they are (application/pdf), with their SHA-256 in
// Repr-Digest (RFC 9530). Nothing is recorded.
//
// Which roles may read which capability's renditions is passed in by the
// wiring (index.ts): platform code never imports a capability's code.


import { holdsRole } from "../../foundation/actor.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import { platformFailure, ScsFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import type { Route, RouteContext } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ObjectRead, ObjectStore } from "../evidence-objects/object-store.js";

/** Reader roles per owning capability, e.g. { "SCS-CAP-08": ["COMPLIANCE_OFFICER", "REGULATORY_REVIEWER"] }. */
export type RenditionReaders = Readonly<Record<string, readonly string[]>>;

interface RenditionRow { readonly sourceCapabilityId: string; readonly sourceRecordId: string; readonly sha256: string; readonly byteLength: number }

function downloadRendition(objectStore: ObjectStore, readers: RenditionReaders) {
  const anyReader = new Set(Object.values(readers).flat());
  return async (ctx: RouteContext<undefined>): Promise<OperationResult> => {
    const actor = ctx.actor!;
    if (![...anyReader].some((r) => holdsRole(actor, r))) {
      throw platformFailure("READER_NOT_AUTHORISED", [`Downloading a rendition requires a reader role of its capability; actor ${actor.actorId} holds none.`]);
    }
    const renditionId = ctx.params["renditionId"]!.toLowerCase();
    const rows = await withDatabaseErrors("SCS-PLATFORM", () =>
      ctx.tx!.query<{ source_capability_id: string; source_record_id: string; sha256: string; byte_length: string }>(
        `SELECT source_capability_id, source_record_id, sha256, byte_length FROM scs.rendition WHERE rendition_id = $1`,
        [renditionId],
      ),
    );
    const r = rows.rows[0];
    if (r === undefined) throw platformFailure("RENDITION_NOT_FOUND", [`No rendition is recorded with renditionId ${renditionId}.`]);
    const row: RenditionRow = { sourceCapabilityId: r.source_capability_id, sourceRecordId: r.source_record_id, sha256: r.sha256, byteLength: Number(r.byte_length) };
    const allowed = readers[row.sourceCapabilityId] ?? [];
    if (!allowed.some((r) => holdsRole(actor, r))) {
      throw platformFailure("READER_NOT_AUTHORISED", [
        `Renditions of ${row.sourceCapabilityId} records are for ${allowed.join(" or ") || "no role"}; actor ${actor.actorId} holds neither.`,
      ]);
    }
    let read: ObjectRead;
    try {
      read = await objectStore.read(row.sha256);
    } catch (err) {
      if (err instanceof ScsFailure && err.code === "DEPENDENCY_UNAVAILABLE") throw platformFailure("DEPENDENCY_UNAVAILABLE", ["The object store is unavailable; nothing was returned."]);
      throw err;
    }
    if (read.state === "MISSING") {
      throw platformFailure("RENDITION_INTEGRITY_FAILED", [`The bytes of rendition ${renditionId} (SHA-256 ${row.sha256}) are not in the object store; nothing was returned.`]);
    }
    const [actual, size] = read.state === "INTACT" ? [row.sha256, read.bytes.length] : [read.actualSha256, read.sizeBytes];
    if (read.state === "CHANGED" || size !== row.byteLength) {
      throw platformFailure("RENDITION_INTEGRITY_FAILED", [
        `The stored bytes of rendition ${renditionId} hash to ${actual} (${size} bytes), not the recorded ${row.sha256} (${row.byteLength} bytes); nothing was returned.`,
      ]);
    }
    const bytes = read.bytes;
    return {
      status: 200,
      body: null,
      raw: {
        bytes,
        contentType: "application/pdf",
        headers: {
          "repr-digest": `sha-256=:${Buffer.from(row.sha256, "hex").toString("base64")}:`,
          "content-disposition": `attachment; filename="${row.sourceCapabilityId.toLowerCase()}-${row.sourceRecordId}-${renditionId}.pdf"`,
        },
      },
    };
  };
}

export function renditionRoutes(objectStore: ObjectStore, readers: RenditionReaders): readonly Route<never>[] {
  const route: Route<undefined> = {
    method: "GET",
    path: "/scs/v1/renditions/:renditionId",
    capabilityId: "SCS-PLATFORM",
    auth: "required",
    transactional: true,
    idempotency: "none",
    paramsSchema: SCHEMAS.platformRenditionParams,
    handle: downloadRendition(objectStore, readers),
  };
  return [route as unknown as Route<never>];
}
