// Backup and restore of the object store (SCS-PLATFORM-01): every stored
// object — evidence files and PDF renditions — exported to, or imported from,
// a directory. Run inside the api image, on the stack's internal network, with
// the api service's object store environment (S3_*):
//
//   node dist/ops/object-store-archive.js export <dir>
//   node dist/ops/object-store-archive.js import <dir>
//
// Export writes <dir>/objects/<key> and <dir>/objects.json (key, size,
// SHA-256, media type of every object). Every key must be a SHA-256: every
// object in this store is stored under its digest, and each exported file is
// checked against its key, so a corrupt object is refused rather than backed up.
//
// Import checks every file against the manifest and its key before storing
// it, stores it with the same conditional write the service uses (never
// overwriting), then reads it back and checks it again.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { objectStoreConfigFromEnv, S3ObjectStore } from "../platform/evidence-objects/object-store.js";

export interface ArchivedObject {
  readonly key: string;
  readonly size: number;
  readonly sha256: string;
  readonly contentType: string;
}

const SHA256_KEY = /^[0-9a-f]{64}$/;
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function exportObjects(dir: string): Promise<void> {
  const config = objectStoreConfigFromEnv();
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  await mkdir(join(dir, "objects"), { recursive: true });
  const entries: ArchivedObject[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, ContinuationToken: token }));
    for (const o of page.Contents ?? []) {
      const key = o.Key!;
      if (!SHA256_KEY.test(key)) throw new Error(`object ${JSON.stringify(key)} is not stored under a SHA-256; refusing to export it`);
      const got = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
      const bytes = Buffer.from(await got.Body!.transformToByteArray());
      const digest = sha256(bytes);
      if (digest !== key) throw new Error(`object ${key} hashes to ${digest}: it is corrupt; refusing to back it up`);
      await writeFile(join(dir, "objects", key), bytes);
      entries.push({ key, size: bytes.length, sha256: digest, contentType: got.ContentType ?? "application/octet-stream" });
    }
    token = page.IsTruncated === true ? page.NextContinuationToken : undefined;
  } while (token !== undefined);
  entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  await writeFile(join(dir, "objects.json"), JSON.stringify({ bucket: config.bucket, objects: entries }, null, 2) + "\n");
  console.log(JSON.stringify({ exported: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) }));
}

async function importObjects(dir: string): Promise<void> {
  const store = new S3ObjectStore(objectStoreConfigFromEnv());
  await store.ensureBucket();
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
    const back = await store.get(e.key);
    if (back === null || sha256(back) !== e.key) throw new Error(`object ${e.key} did not read back intact after restore`);
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
  console.error(`object-store-archive ${command} failed: ${(err as Error).message}`);
  process.exit(1);
}
