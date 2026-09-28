// AAB-PLATFORM-01 object store client: where evidence file bytes live
// (SeaweedFS in the pilot stack; any S3-compatible store that honours
// conditional writes, Object Lock and bucket policies).
//
// Objects are stored under their SHA-256 and never overwritten: every write
// is conditional (If-None-Match: *), so an existing object is left exactly as
// it is and reported as already present. Nothing here deletes.
//
// Every read is verified (amendment of 2026-09-28, section 6): read() re-hashes
// the bytes against their key and says whether they are intact, missing or
// changed. There is no way to get bytes without that check.
//
// Any failure to reach the store is DEPENDENCY_UNAVAILABLE (503), so the
// upload fails closed and writes nothing to the database.
//
// Identities (amendment, section 1): the API runs with its own scoped
// credential (read and write on the evidence bucket only), the backup tool
// with the backup credential (read and list only), and only the setup step
// (object-store-setup.ts) with the admin credential. The API never creates the
// bucket: verifyEvidenceBucketForApi() refuses to start it unless the bucket
// is locked as the contract requires and its own credential is the scoped one.

import { createHash, randomBytes } from "node:crypto";

import {
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectLockConfigurationCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  PutObjectRetentionCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { platformFailure } from "../../foundation/errors.js";

/** Object Lock default retention (amendment, section 2): GOVERNANCE mode, six years. */
export const RETENTION_MODE = "GOVERNANCE";
/** Six years, covering any six calendar years, which contain at most two leap days. */
export const RETENTION_DAYS = 2192;

/** The store's identity names (amendment, section 1). The bucket policy names the API by ARN. */
export const IDENTITY_NAMES = { admin: "scs-admin", api: "scs-api", backup: "scs-backup" } as const;

export type StoreRole = "API" | "BACKUP" | "ADMIN";

const SHA256_KEY = /^[0-9a-f]{64}$/;

/** The outcome of a verified read: there is no result that carries unchecked bytes. */
export type ObjectRead =
  | { readonly state: "INTACT"; readonly bytes: Buffer }
  | { readonly state: "MISSING" }
  | { readonly state: "CHANGED"; readonly actualSha256: string; readonly sizeBytes: number };

export interface ObjectStore {
  readonly bucket: string;
  /** Store bytes under `key` unless an object is already there. Never overwrites. */
  putIfAbsent(key: string, bytes: Buffer, mediaType: string): Promise<"stored" | "exists">;
  /** The bytes stored under `key` (a SHA-256), re-hashed against it. Never modifies. */
  read(key: string): Promise<ObjectRead>;
}

export interface ObjectStoreConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/**
 * The object store settings for one identity, from S3_ENDPOINT, S3_BUCKET and
 * S3_<ROLE>_ACCESS_KEY_ID / S3_<ROLE>_SECRET_ACCESS_KEY. Each process is given
 * only the credential of the identity it runs as.
 */
export function objectStoreConfigFromEnv(role: StoreRole, env: NodeJS.ProcessEnv = process.env): ObjectStoreConfig {
  const required = (name: string) => {
    const v = env[name];
    if (v === undefined || v.trim() === "") throw new Error(`${name} is not set`);
    return v;
  };
  return {
    endpoint: required("S3_ENDPOINT"),
    region: env["S3_REGION"] ?? "us-east-1",
    bucket: required("S3_BUCKET"),
    accessKeyId: required(`S3_${role}_ACCESS_KEY_ID`),
    secretAccessKey: required(`S3_${role}_SECRET_ACCESS_KEY`),
  };
}

export function s3ClientFor(config: ObjectStoreConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    maxAttempts: 2,
  });
}

export const unavailable = (err: unknown) =>
  platformFailure("DEPENDENCY_UNAVAILABLE", [`The evidence object store is unavailable (${(err as Error).name}); nothing was stored.`]);

export const s3Status = (err: unknown) => (err instanceof S3ServiceException ? err.$metadata.httpStatusCode : undefined);

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

export class S3ObjectStore implements ObjectStore {
  readonly bucket: string;
  private readonly client: S3Client;

  constructor(config: ObjectStoreConfig) {
    this.bucket = config.bucket;
    this.client = s3ClientFor(config);
  }

  async putIfAbsent(key: string, bytes: Buffer, mediaType: string): Promise<"stored" | "exists"> {
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: mediaType, ContentLength: bytes.length, IfNoneMatch: "*" }));
      return "stored";
    } catch (err) {
      // 412: an object is already stored under this key; it is left untouched
      if (s3Status(err) !== 412) throw unavailable(err);
    }
    // The key is the digest of the bytes, so an existing object must be the same size.
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      if (head.ContentLength !== bytes.length) {
        throw new Error(`object store integrity: ${key} holds ${head.ContentLength} bytes, not ${bytes.length}`);
      }
    } catch (err) {
      if (err instanceof S3ServiceException) throw unavailable(err);
      throw err;
    }
    return "exists";
  }

  async read(key: string): Promise<ObjectRead> {
    if (!SHA256_KEY.test(key)) throw new Error(`object store: ${JSON.stringify(key)} is not a SHA-256 key`);
    let bytes: Buffer;
    try {
      const got = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      bytes = Buffer.from(await got.Body!.transformToByteArray());
    } catch (err) {
      if (s3Status(err) === 404) return { state: "MISSING" };
      throw unavailable(err);
    }
    const actual = sha256(bytes);
    return actual === key ? { state: "INTACT", bytes } : { state: "CHANGED", actualSha256: actual, sizeBytes: bytes.length };
  }
}

/**
 * The API's startup checks (amendment, section 5). Returns the reasons the API
 * must not start; an empty list means it may. A store it cannot reach throws.
 */
export async function evidenceBucketProblemsForApi(config: ObjectStoreConfig): Promise<string[]> {
  const client = s3ClientFor(config);
  const Bucket = config.bucket;
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
  } catch (err) {
    if (s3Status(err) === 404) return [`The evidence bucket ${Bucket} does not exist. It is created by the setup step (objectstore-init), never by the API.`];
    throw unavailable(err);
  }
  const problems: string[] = [];
  try {
    const v = await client.send(new GetBucketVersioningCommand({ Bucket }));
    if (v.Status !== "Enabled") problems.push(`Versioning on ${Bucket} is ${v.Status ?? "not enabled"}, not Enabled.`);
  } catch (err) {
    throw unavailable(err);
  }
  try {
    const lock = (await client.send(new GetObjectLockConfigurationCommand({ Bucket }))).ObjectLockConfiguration;
    const rule = lock?.Rule?.DefaultRetention;
    if (lock?.ObjectLockEnabled !== "Enabled") problems.push(`Object Lock is not enabled on ${Bucket}.`);
    else if (rule?.Mode !== RETENTION_MODE) problems.push(`The default retention on ${Bucket} is ${rule?.Mode ?? "not set"}, not ${RETENTION_MODE}.`);
    else if (rule.Years !== undefined || (rule.Days ?? 0) < RETENTION_DAYS) {
      problems.push(`The default retention on ${Bucket} is ${rule.Years !== undefined ? `${rule.Years} years` : `${rule.Days ?? 0} days`}, not at least ${RETENTION_DAYS} days.`);
    }
  } catch (err) {
    if (s3Status(err) === 404) problems.push(`Object Lock is not configured on ${Bucket}.`);
    else throw unavailable(err);
  }
  // Its credential must be the scoped one: the API's identity may not list.
  try {
    await client.send(new ListObjectsV2Command({ Bucket, MaxKeys: 1 }));
    problems.push("The API's object store credential can list the evidence bucket: it is not the API's scoped credential (the admin's or the backup's?).");
  } catch (err) {
    if (s3Status(err) !== 403) throw unavailable(err);
  }
  // The bucket policy must be enforced: setting retention on an object that
  // does not exist is refused by the policy (403) before the store looks for
  // the object (404). A 404 means the policy is not stopping the API.
  try {
    await client.send(new PutObjectRetentionCommand({
      Bucket, Key: `startup-canary-${randomBytes(12).toString("hex")}`,
      Retention: { Mode: RETENTION_MODE, RetainUntilDate: new Date(Date.now() + 86_400_000) },
    }));
    problems.push("The bucket policy did not stop the API setting an object's retention.");
  } catch (err) {
    const s = s3Status(err);
    if (s === 404) problems.push("The bucket policy is not enforced against the API: it may set retention, and so delete and weaken locks.");
    else if (s === undefined) throw unavailable(err);
    else if (s !== 403) problems.push(`The bucket policy could not be verified: setting retention on a missing object returned ${s}, not 403.`);
  }
  return problems;
}
