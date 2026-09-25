// SCS-PLATFORM-01 object store client: where evidence file bytes live
// (MinIO in the pilot stack; any S3-compatible store).
//
// Objects are stored under their SHA-256 and never overwritten: every write
// is conditional (If-None-Match: *), so an existing object is left exactly as
// it is and reported as already present. Nothing here deletes.
//
// Any failure to reach the store is DEPENDENCY_UNAVAILABLE (503), so the
// upload fails closed and writes nothing to the database.
//
// TODO(object-store-credentials): the pilot stack gives the api the MinIO
// root credentials. A dedicated user allowed only to create the bucket and
// put/head objects (no delete) is the production answer, together with
// bucket object locking.

import { CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client, S3ServiceException } from "@aws-sdk/client-s3";

import { platformFailure } from "../../foundation/errors.js";

export interface ObjectStore {
  readonly bucket: string;
  /** Create the bucket if it does not exist. */
  ensureBucket(): Promise<void>;
  /** Store bytes under `key` unless an object is already there. Never overwrites. */
  putIfAbsent(key: string, bytes: Buffer, mediaType: string): Promise<"stored" | "exists">;
}

export interface ObjectStoreConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

export function objectStoreConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ObjectStoreConfig {
  const required = (name: string) => {
    const v = env[name];
    if (v === undefined || v.trim() === "") throw new Error(`${name} is not set`);
    return v;
  };
  return {
    endpoint: required("S3_ENDPOINT"),
    region: env["S3_REGION"] ?? "us-east-1",
    bucket: required("S3_BUCKET"),
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
  };
}

const unavailable = (err: unknown) =>
  platformFailure("DEPENDENCY_UNAVAILABLE", [`The evidence object store is unavailable (${(err as Error).name}); nothing was stored.`]);

const status = (err: unknown) => (err instanceof S3ServiceException ? err.$metadata.httpStatusCode : undefined);

export class S3ObjectStore implements ObjectStore {
  readonly bucket: string;
  private readonly client: S3Client;

  constructor(config: ObjectStoreConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      maxAttempts: 2,
    });
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      if (status(err) !== 404) throw unavailable(err);
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (createErr) {
        // another process created it first
        if (status(createErr) !== 409) throw unavailable(createErr);
      }
    }
  }

  async putIfAbsent(key: string, bytes: Buffer, mediaType: string): Promise<"stored" | "exists"> {
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: mediaType, ContentLength: bytes.length, IfNoneMatch: "*" }));
      return "stored";
    } catch (err) {
      // 412: an object is already stored under this key; it is left untouched
      if (status(err) !== 412) throw unavailable(err);
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
}
