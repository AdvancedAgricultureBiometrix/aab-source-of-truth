// A DISPOSABLE S3-compatible store (SeaweedFS) with the three identities of
// AAB-PLATFORM-01's amendment of 2026-09-28, for the tests of the locked
// evidence bucket, its policy and the scoped credentials:
//
//   SCS_TEST_S3_ENDPOINT
//   SCS_TEST_S3_ACCESS_KEY_ID / _SECRET_ACCESS_KEY               admin
//   SCS_TEST_S3_API_ACCESS_KEY_ID / _SECRET_ACCESS_KEY           Read and Write on scs-idt-*
//   SCS_TEST_S3_API_IDENTITY                                    that identity's name (the policy's ARN)
//   SCS_TEST_S3_BACKUP_ACCESS_KEY_ID / _SECRET_ACCESS_KEY        Read and List on scs-idt-*
//
// A scoped identity names the buckets it may use, so every bucket here is
// named scs-idt-<random>. CI's store defines these identities
// (.github/workflows/test.yml); locally, docker-compose.dev.yml does. The
// tests fail, rather than skip, when they are not set.
//
// Cleanup deletes each version with the admin credential and an explicit
// governance override: the path the contract discloses (section 4), so the
// cleanup exercises it too.

import { randomBytes } from "node:crypto";

import {
  DeleteBucketCommand,
  DeleteBucketPolicyCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { type ObjectStoreConfig, s3ClientFor } from "../platform/evidence-objects/object-store.js";

export type Who = "admin" | "api" | "backup";

export interface ScopedStore {
  readonly endpoint: string;
  readonly apiIdentity: string;
  config(who: Who, bucket: string): ObjectStoreConfig;
  client(who: Who): S3Client;
  /** A fresh bucket name the scoped identities may use. Not created. */
  newBucket(): string;
  /** Delete every version and delete marker (admin, governance override), the policy and the bucket. */
  drop(bucket: string): Promise<void>;
}

export function scopedStore(): ScopedStore {
  const need = (name: string) => {
    const v = process.env[name];
    if (v === undefined || v.trim() === "") {
      throw new Error(`${name} is not set. These tests need a DISPOSABLE SeaweedFS with the admin, API and backup test identities (see scoped-store-harness.ts).`);
    }
    return v;
  };
  const endpoint = need("SCS_TEST_S3_ENDPOINT");
  const keys: Record<Who, { accessKeyId: string; secretAccessKey: string }> = {
    admin: { accessKeyId: need("SCS_TEST_S3_ACCESS_KEY_ID"), secretAccessKey: need("SCS_TEST_S3_SECRET_ACCESS_KEY") },
    api: { accessKeyId: need("SCS_TEST_S3_API_ACCESS_KEY_ID"), secretAccessKey: need("SCS_TEST_S3_API_SECRET_ACCESS_KEY") },
    backup: { accessKeyId: need("SCS_TEST_S3_BACKUP_ACCESS_KEY_ID"), secretAccessKey: need("SCS_TEST_S3_BACKUP_SECRET_ACCESS_KEY") },
  };
  const config = (who: Who, bucket: string): ObjectStoreConfig => ({ endpoint, region: "us-east-1", bucket, ...keys[who] });
  const clients = new Map<Who, S3Client>();
  const client = (who: Who) => {
    let c = clients.get(who);
    if (c === undefined) clients.set(who, (c = s3ClientFor(config(who, "unused"))));
    return c;
  };
  return {
    endpoint,
    apiIdentity: need("SCS_TEST_S3_API_IDENTITY"),
    config,
    client,
    newBucket: () => `scs-idt-${randomBytes(6).toString("hex")}`,
    async drop(bucket) {
      const admin = client("admin");
      for (;;) {
        const page = await admin.send(new ListObjectVersionsCommand({ Bucket: bucket })).catch(() => undefined);
        const all = [...(page?.Versions ?? []), ...(page?.DeleteMarkers ?? [])];
        if (all.length === 0) break;
        for (const v of all) {
          await admin.send(new DeleteObjectCommand({ Bucket: bucket, Key: v.Key!, VersionId: v.VersionId!, BypassGovernanceRetention: true }));
        }
      }
      await admin.send(new DeleteBucketPolicyCommand({ Bucket: bucket })).catch(() => undefined);
      await admin.send(new DeleteBucketCommand({ Bucket: bucket })).catch(() => undefined);
    },
  };
}
