// Backup and restore of the object store (AAB-PLATFORM-01): every stored
// object — evidence files and PDF renditions — exported to, or imported from,
// a directory. Run inside the api image, on the stack's internal network:
//
//   node dist/ops/object-store-archive.js export <dir>   (backup credential, S3_BACKUP_*)
//   node dist/ops/object-store-archive.js import <dir>   (API credential, S3_API_*)
//
// Each runs as its own identity (amendment of 2026-09-28, section 1): export
// with the backup identity, which may read and list and nothing else; import
// with the API identity, into a bucket the setup step (objectstore-init) has
// already created and locked. Neither creates a bucket.
//
// Export writes <dir>/objects/<key> and <dir>/objects.json (key, size,
// SHA-256, media type of every object). Every key must be a SHA-256: every
// object in this store is stored under its digest, and each object is read
// through the verified read, so a changed object is refused rather than
// backed up.
//
// Import checks every file against the manifest and its key before storing
// it, stores it with the same conditional write the service uses (never
// overwriting), then reads it back through the verified read.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { objectStoreConfigFromEnv, s3ClientFor, S3ObjectStore } from "../platform/evidence-objects/object-store.js";

export interface ArchivedObject {
  readonly key: string;
  readonly size: number;
  readonly sha256: string;
  readonly contentType: string;
}

const SHA256_KEY = /^[0-9a-f]{64}$/;
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function exportObjects(dir: string): Promise<void> {
  const config = objectStoreConfigFromEnv("BACKUP");
  const client = s3ClientFor(config);
  const store = new S3ObjectStore(config);
  await mkdir(join(dir, "objects"), { recursive: true });
  const entries: ArchivedObject[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, ContinuationToken: token }));
    for (const o of page.Contents ?? []) {
      const key = o.Key!;
      if (!SHA256_KEY.test(key)) throw new Error(`object ${JSON.stringify(key)} is not stored under a SHA-256; refusing to export it`);
      const read = await store.read(key);
      if (read.state === "MISSING") throw new Error(`object ${key} was listed but could not be read; refusing to back up an incomplete store`);
      if (read.state === "CHANGED") throw new Error(`object ${key} hashes to ${read.actualSha256}: it is corrupt; refusing to back it up`);
      const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
      await writeFile(join(dir, "objects", key), read.bytes);
      entries.push({ key, size: read.bytes.length, sha256: key, contentType: head.ContentType ?? "application/octet-stream" });
    }
    token = page.IsTruncated === true ? page.NextContinuationToken : undefined;
  } while (token !== undefined);
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  await writeFile(join(dir, "objects.json"), JSON.stringify({ bucket: config.bucket, objects: entries }, null, 2) + "\n");
  console.log(JSON.stringify({ exported: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) }));
}

async function importObjects(dir: string): Promise<void> {
  const store = new S3ObjectStore(objectStoreConfigFromEnv("API"));
  const manifest = JSON.parse(await readFile(join(dir, "objects.json"), "utf8")) as { objects: ArchivedObject[] };
  let stored = 0;
  let existed = 0;
  for (const e of manifest.objects) {
    if (!SHA256_KEY.test(e.key)) throw new Error(`manifest entry ${JSON.stringify(e.key)} is not a SHA-256 key`);
    const bytes = await readFile(join(dir, "objects", e.key));
    const digest = sha256(bytes);
    if (digest !== e.sha256 || digest !== e.key || bytes.length !== e.size) {
      throw new Error(`backup file for ${e.key} hashes to ${digest} (${bytes.length} bytes), not ${e.sha256} (${e.size} bytes); refusing to restore it`);
    }
    if ((await store.putIfAbsent(e.key, bytes, e.contentType)) === "stored") stored++;
    else existed++;
    const back = await store.read(e.key);
    if (back.state !== "INTACT") throw new Error(`object ${e.key} did not read back intact after restore (${back.state})`);
  }
  console.log(JSON.stringify({ imported: manifest.objects.length, stored, alreadyPresent: existed }));
}

const [command, dir] = process.argv.slice(2);
if ((command !== "export" && command !== "import") || dir === undefined) {
  console.error("usage: node dist/ops/object-store-archive.js export|import <dir>");
  process.exit(2);
}
try {
  await (command === "export" ? exportObjects(dir) : importObjects(dir));
} catch (err) {
  console.error(`object-store-archive ${command} failed: ${(err as Error).name}: ${(err as Error).message}`);
  process.exit(1);
}
