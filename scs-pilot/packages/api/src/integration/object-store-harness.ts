// Integration test object store: a throwaway bucket on a DISPOSABLE
// S3-compatible store (SeaweedFS in the pilot), removed afterwards.
//
// Needs SCS_TEST_S3_ENDPOINT, SCS_TEST_S3_ACCESS_KEY_ID and
// SCS_TEST_S3_SECRET_ACCESS_KEY. If they are not set the tests fail — they are
// never silently skipped. The raw client is for test set-up, inspection,
// simulated tampering and cleanup only: the service itself never overwrites or
// deletes.

import { randomBytes } from "node:crypto";

import { CreateBucketCommand, DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { S3ObjectStore, type ObjectStoreConfig } from "../platform/evidence-objects/object-store.js";

export interface TestObjectStore {
  readonly config: ObjectStoreConfig;
  readonly store: S3ObjectStore;
  readonly s3: S3Client;
  drop(): Promise<void>;
}

export async function createTestObjectStore(): Promise<TestObjectStore> {
  const need = (name: string) => {
    const v = process.env[name];
    if (v === undefined || v.trim() === "") {
      throw new Error(`${name} is not set. These tests need a DISPOSABLE S3-compatible store (SeaweedFS), e.g. SCS_TEST_S3_ENDPOINT=http://127.0.0.1:9000.`);
    }
    return v;
  };
  const config: ObjectStoreConfig = {
    endpoint: need("SCS_TEST_S3_ENDPOINT"),
    region: "us-east-1",
    bucket: `scs-test-${randomBytes(5).toString("hex")}`,
    accessKeyId: need("SCS_TEST_S3_ACCESS_KEY_ID"),
    secretAccessKey: need("SCS_TEST_S3_SECRET_ACCESS_KEY"),
  };
  const s3 = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  // An unlocked, disposable bucket for the service's own logic: the locked
  // bucket, its policy and the scoped identities are tested in
  // object-store-identities.test.ts.
  await s3.send(new CreateBucketCommand({ Bucket: config.bucket }));
  const store = new S3ObjectStore(config);
  return {
    config,
    store,
    s3,
    async drop() {
      const listed = await s3.send(new ListObjectsV2Command({ Bucket: config.bucket })).catch(() => ({ Contents: [] }));
      for (const o of listed.Contents ?? []) await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: o.Key! }));
      await s3.send(new DeleteBucketCommand({ Bucket: config.bucket })).catch(() => undefined);
    },
  };
}
