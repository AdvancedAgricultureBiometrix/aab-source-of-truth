// AAB-PLATFORM-01 POST /scs/v1/evidence-objects, end to end: real HTTP, real
// PostgreSQL (the API as a restricted member of scs_api) and a real
// S3-compatible object store (SeaweedFS in the pilot), in a throwaway bucket.
//
// Needs SCS_TEST_S3_ENDPOINT, SCS_TEST_S3_ACCESS_KEY_ID and
// SCS_TEST_S3_SECRET_ACCESS_KEY for a DISPOSABLE object store (the tests
// create and remove their own bucket). If they are not set the tests fail —
// they are never silently skipped.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { DeleteBucketCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { runWithCorrelation } from "../foundation/correlation.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { validate } from "../foundation/validation.js";
import { type ObjectStoreConfig, S3ObjectStore } from "../platform/evidence-objects/object-store.js";
import { ACCEPTED_MEDIA_TYPES, evidenceObjectRoutes, MAX_EVIDENCE_OBJECT_BYTES } from "../platform/evidence-objects/routes.js";
import { SCHEMAS } from "../schemas/registry.js";
import type { ScsEvidenceObject } from "../types/platform.js";
import { issuedReference } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKENS = { officer: "evobj-officer-token-0123456789abcdefgh", viewer: "evobj-viewer-token-0123456789abcdefghi" };
const actors = {
  officer: { actorId: "officer-evobj", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" },
  viewer: { actorId: "viewer-evobj", actorType: "HUMAN", roles: ["VIEWER"], authenticationMethod: "STATIC_TOKEN" },
} as const;

const UPLOAD = "/scs/v1/evidence-objects";

function s3TestConfig(bucket: string): ObjectStoreConfig {
  const need = (name: string) => {
    const v = process.env[name];
    if (v === undefined || v.trim() === "") {
      throw new Error(`${name} is not set. The evidence object tests need a DISPOSABLE S3-compatible store (SeaweedFS), e.g. SCS_TEST_S3_ENDPOINT=http://127.0.0.1:9000.`);
    }
    return v;
  };
  return {
    endpoint: need("SCS_TEST_S3_ENDPOINT"),
    region: "us-east-1",
    bucket,
    accessKeyId: need("SCS_TEST_S3_ACCESS_KEY_ID"),
    secretAccessKey: need("SCS_TEST_S3_SECRET_ACCESS_KEY"),
  };
}

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let config: ObjectStoreConfig;
let s3: S3Client;
let authenticator: StaticTokenAuthenticator;

before(async () => {
  config = s3TestConfig(`scs-test-${randomBytes(5).toString("hex")}`);
  s3 = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  authenticator = StaticTokenAuthenticator.fromConfig({
    actors: (Object.keys(TOKENS) as Array<keyof typeof TOKENS>).map((k) => ({ tokenSha256: createHash("sha256").update(TOKENS[k]).digest("hex"), actor: actors[k] })),
  }, { issuerCountry: "TH" });
  const store = new S3ObjectStore(config);
  await store.ensureBucket();
  server = createApiServer({ routes: evidenceObjectRoutes(store), authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
  // test cleanup only: the service itself never deletes
  if (s3 !== undefined) {
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: config.bucket })).catch(() => ({ Contents: [] }));
    for (const o of listed.Contents ?? []) await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: o.Key! }));
    await s3.send(new DeleteBucketCommand({ Bucket: config.bucket })).catch(() => undefined);
  }
});

async function upload(bytes: Buffer, opts: { type?: string; key?: string | null; who?: keyof typeof TOKENS | null; to?: string } = {}) {
  const headers: Record<string, string> = { "content-type": opts.type ?? "application/pdf" };
  if (opts.who !== null) headers["authorization"] = `Bearer ${TOKENS[opts.who ?? "officer"]}`;
  const key = opts.key === undefined ? `evobj-${randomUUID()}` : opts.key;
  if (key !== null) headers["idempotency-key"] = key;
  const res = await fetch((opts.to ?? base) + UPLOAD, { method: "POST", headers, body: new Uint8Array(bytes) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: JSON.parse(text) as Record<string, unknown> };
}

const pdf = () => Buffer.from(`%PDF-1.7 evidence ${randomUUID()}`);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const count = async (sql: string, values: unknown[] = []) => Number((await harness.admin.query<{ n: string }>(sql, values)).rows[0]!.n);
const rows = () => count("SELECT count(*) AS n FROM scs.evidence_object");
async function storedBytes(key: string): Promise<Buffer | null> {
  try {
    const got = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    return Buffer.from(await got.Body!.transformToByteArray());
  } catch {
    return null;
  }
}

// ── Storing ──────────────────────────────────────────────────────────────────

test("upload → 201; SCS computes the SHA-256; bytes stored under it; row recorded", async () => {
  const bytes = pdf();
  const r = await upload(bytes);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const o = r.json as unknown as ScsEvidenceObject;
  const checked = runWithCorrelation("evobj-schema", () => validate("SCS-PLATFORM", SCHEMAS.platformEvidenceObject, o));
  assert.ok(checked.ok, checked.ok ? "" : checked.envelope.reasons.join("; "));
  const digest = sha(bytes);
  assert.equal(o.objectId, digest);
  assert.equal(o.objectReference, `scs-object:sha256:${digest}`);
  assert.deepEqual(o.contentDigest, { algorithm: "SHA-256", value: digest });
  assert.equal(o.sizeBytes, bytes.length);
  assert.equal(o.mediaType, "application/pdf");
  assert.deepEqual(o.storedBy, issuedReference(actors.officer));

  assert.deepEqual(await storedBytes(digest), bytes, "the exact bytes are in the object store under their digest");
  const row = (await harness.admin.query(`SELECT * FROM scs.evidence_object WHERE content_sha256 = $1`, [digest])).rows[0] as Record<string, unknown>;
  assert.equal(row["storage_key"], digest);
  assert.equal(row["storage_bucket"], config.bucket);
  assert.equal(Number(row["size_bytes"]), bytes.length);
  assert.equal((row["stored_at"] as Date).toISOString(), o.storedAt);
});

test("the same bytes again → 200 with the existing object, as first stored; nothing rewritten", async () => {
  const bytes = pdf();
  const first = await upload(bytes);
  const before = await rows();
  const again = await upload(bytes, { type: "application/octet-stream" });
  assert.equal(again.status, 200);
  assert.equal(again.json["objectId"], first.json["objectId"]);
  assert.equal(again.json["mediaType"], "application/pdf", "the media type recorded at the first upload");
  assert.equal(again.json["storedAt"], first.json["storedAt"]);
  assert.equal(await rows(), before);
});

test("every accepted media type is stored; parameters on Content-Type are ignored", async () => {
  for (const type of ACCEPTED_MEDIA_TYPES) {
    const r = await upload(Buffer.from(`${type} ${randomUUID()}`), { type });
    assert.equal(r.status, 201, type);
    assert.equal(r.json["mediaType"], type);
  }
  assert.equal((await upload(pdf(), { type: "application/pdf; name=report.pdf" })).status, 201);
});

test("exactly 50 MB is accepted", async () => {
  const big = randomBytes(MAX_EVIDENCE_OBJECT_BYTES);
  const r = await upload(big, { type: "image/tiff" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json["sizeBytes"], 52_428_800);
});

test("any authenticated actor may upload (contract gap: no role restriction yet)", async () => {
  assert.equal((await upload(pdf(), { who: "viewer" })).status, 201);
});

// ── Refusals: nothing stored ─────────────────────────────────────────────────

async function assertNothingStored(bytes: Buffer, r: Awaited<ReturnType<typeof upload>>, status: number, error: string) {
  assert.equal(r.status, status, JSON.stringify(r.json));
  assert.equal(r.json["error"], error);
  assert.equal(r.json["capabilityId"], "SCS-PLATFORM");
  assert.equal(r.json["noWrites"], true);
  assert.equal(await count("SELECT count(*) AS n FROM scs.evidence_object WHERE content_sha256 = $1", [sha(bytes)]), 0);
  assert.equal(await storedBytes(sha(bytes)), null);
}

test("more than 50 MB → 413 EVIDENCE_OBJECT_TOO_LARGE, nothing stored", async () => {
  const tooBig = randomBytes(MAX_EVIDENCE_OBJECT_BYTES + 1);
  await assertNothingStored(tooBig, await upload(tooBig, { type: "image/tiff" }), 413, "EVIDENCE_OBJECT_TOO_LARGE");
});

test("an unsupported media type → 415 EVIDENCE_OBJECT_TYPE_UNSUPPORTED, nothing stored", async () => {
  for (const type of ["text/plain", "application/json", "image/gif", "video/mp4"]) {
    const bytes = Buffer.from(`${type} ${randomUUID()}`);
    await assertNothingStored(bytes, await upload(bytes, { type }), 415, "EVIDENCE_OBJECT_TYPE_UNSUPPORTED");
  }
});

test("an empty body → 400, nothing stored", async () => {
  const r = await upload(Buffer.alloc(0));
  assert.equal(r.status, 400);
  assert.deepEqual(r.json["reasons"], ["The request body is empty; a file is required."]);
});

test("unauthenticated → 401, nothing stored", async () => {
  const bytes = pdf();
  await assertNothingStored(bytes, await upload(bytes, { who: null }), 401, "UNAUTHENTICATED");
});

test("object store unavailable → 503 DEPENDENCY_UNAVAILABLE, nothing recorded", async () => {
  const down = createApiServer({ routes: evidenceObjectRoutes(new S3ObjectStore({ ...config, endpoint: "http://127.0.0.1:1" })), authenticator, db: api });
  await new Promise<void>((r) => down.listen(0, "127.0.0.1", r));
  try {
    const bytes = pdf();
    await assertNothingStored(bytes, await upload(bytes, { to: `http://127.0.0.1:${(down.address() as AddressInfo).port}` }), 503, "DEPENDENCY_UNAVAILABLE");
  } finally {
    await new Promise<void>((r) => down.close(() => r()));
  }
});

// ── Idempotency ──────────────────────────────────────────────────────────────

test("missing Idempotency-Key → 400; same key and bytes → byte-identical replay; same key, other bytes → 409", async () => {
  const bytes = pdf();
  assert.equal((await upload(bytes, { key: null })).status, 400);
  const key = `evobj-${randomUUID()}`;
  const first = await upload(bytes, { key });
  const second = await upload(bytes, { key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(second.text, first.text);
  const other = await upload(pdf(), { key });
  assert.equal(other.status, 409);
  assert.equal(other.json["error"], "IDEMPOTENCY_KEY_CONFLICT");
});

test("concurrent uploads of the same bytes → one 201, one 200, one row", async () => {
  const bytes = pdf();
  const results = await Promise.all([upload(bytes), upload(bytes)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
  assert.equal(await count("SELECT count(*) AS n FROM scs.evidence_object WHERE content_sha256 = $1", [sha(bytes)]), 1);
});

// ── Never overwritten, never changed ─────────────────────────────────────────

test("the object store never overwrites: an object already under a key is left as it is", async () => {
  const store = new S3ObjectStore(config);
  const key = sha(pdf());
  const original = Buffer.from("original bytes");
  assert.equal(await store.putIfAbsent(key, original, "application/pdf"), "stored");
  await assert.rejects(store.putIfAbsent(key, Buffer.from("different, longer bytes"), "application/pdf"), /object store integrity/);
  assert.equal(await store.putIfAbsent(key, Buffer.from("same length...", "utf8"), "application/pdf"), "exists");
  assert.deepEqual(await storedBytes(key), original, "unchanged");
});

test("database write fails after the bytes are stored → 500, no row; the next upload reuses the stored bytes", async () => {
  const bytes = pdf();
  await harness.admin.query(`
    CREATE FUNCTION scs.test_fail_object_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated database write failure'; END; $$;
    CREATE TRIGGER test_fail_object_insert BEFORE INSERT ON scs.evidence_object
      FOR EACH ROW EXECUTE FUNCTION scs.test_fail_object_insert();`);
  try {
    const r = await upload(bytes);
    assert.equal(r.status, 500);
    assert.ok(!JSON.stringify(r.json).includes("simulated"));
    assert.equal(await count("SELECT count(*) AS n FROM scs.evidence_object WHERE content_sha256 = $1", [sha(bytes)]), 0);
    assert.deepEqual(await storedBytes(sha(bytes)), bytes, "unreferenced but identical bytes remain");
  } finally {
    await harness.admin.query(`DROP TRIGGER test_fail_object_insert ON scs.evidence_object; DROP FUNCTION scs.test_fail_object_insert();`);
  }
  const retry = await upload(bytes);
  assert.equal(retry.status, 201, "recorded now, reusing the stored bytes");
});

test("migration 012: evidence objects are append-only — scs_api lacks the privilege; the owner is stopped by the trigger", async () => {
  const r = await upload(pdf());
  const digest = r.json["objectId"] as string;
  for (const sql of [
    `UPDATE scs.evidence_object SET media_type = 'image/png' WHERE content_sha256 = '${digest}'`,
    `DELETE FROM scs.evidence_object WHERE content_sha256 = '${digest}'`,
  ]) {
    await assert.rejects(api.transaction((tx) => tx.query(sql)), /permission denied/, `scs_api: ${sql}`);
    await assert.rejects(harness.admin.query(sql), /append-only/, `owner: ${sql}`);
  }
});

test("migration 012: the database refuses a bad digest, size or media type, and a key other than the digest", async () => {
  const insert = (o: Record<string, unknown>) =>
    harness.admin.query(
      `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, $2, $3, 'b', $4, $5)`,
      [o["sha"], o["size"], o["type"], o["key"], JSON.stringify(actors.officer)],
    );
  const d = sha(pdf());
  await assert.rejects(insert({ sha: d.toUpperCase(), size: 1, type: "application/pdf", key: d.toUpperCase() }), /evidence_object_sha256_ck/);
  await assert.rejects(insert({ sha: d, size: 0, type: "application/pdf", key: d }), /evidence_object_size_ck/);
  await assert.rejects(insert({ sha: d, size: 52_428_801, type: "application/pdf", key: d }), /evidence_object_size_ck/);
  await assert.rejects(insert({ sha: d, size: 1, type: "text/plain", key: d }), /evidence_object_media_type_ck/);
  await assert.rejects(insert({ sha: d, size: 1, type: "application/pdf", key: "elsewhere" }), /evidence_object_storage_key_ck/);
});

