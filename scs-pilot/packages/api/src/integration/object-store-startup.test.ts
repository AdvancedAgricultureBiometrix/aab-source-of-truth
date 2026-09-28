// The API's startup checks (AAB-PLATFORM-01, amendment of 2026-09-28,
// section 5): src/index.ts refuses to start unless evidenceBucketProblemsForApi
// reports nothing. It must refuse without its own credential, without the
// bucket, without the lock the contract requires, with any credential but its
// scoped one, and when the bucket policy is not enforced.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { CreateBucketCommand, PutObjectLockConfigurationCommand } from "@aws-sdk/client-s3";

import { evidenceBucketProblemsForApi, objectStoreConfigFromEnv, RETENTION_DAYS } from "../platform/evidence-objects/object-store.js";
import { setUpEvidenceBucket } from "../platform/evidence-objects/object-store-setup.js";
import { type ScopedStore, scopedStore } from "./scoped-store-harness.js";

let s: ScopedStore;
let ready: string;
const buckets: string[] = [];
const fresh = () => {
  const b = s.newBucket();
  buckets.push(b);
  return b;
};

before(async () => {
  s = scopedStore();
  ready = fresh();
  assert.deepEqual((await setUpEvidenceBucket(s.client("admin"), ready, s.apiIdentity)).problems, []);
});

after(async () => {
  for (const b of buckets) await s.drop(b);
});

const has = (problems: string[], text: string) => assert.ok(problems.some((p) => p.includes(text)), `expected a problem containing ${JSON.stringify(text)}: ${JSON.stringify(problems)}`);

test("starts: the API's scoped credential, against a bucket the setup step prepared", async () => {
  assert.deepEqual(await evidenceBucketProblemsForApi(s.config("api", ready)), []);
});

test("refuses without its own credential: only S3_API_* is read", () => {
  const env = { S3_ENDPOINT: "http://127.0.0.1:1", S3_BUCKET: "b", S3_ADMIN_ACCESS_KEY_ID: "a", S3_ADMIN_SECRET_ACCESS_KEY: "a" };
  assert.throws(() => objectStoreConfigFromEnv("API", env), /S3_API_ACCESS_KEY_ID is not set/);
  assert.throws(() => objectStoreConfigFromEnv("API", { ...env, S3_API_ACCESS_KEY_ID: "k" }), /S3_API_SECRET_ACCESS_KEY is not set/);
});

test("refuses when the bucket does not exist: the API never creates it", async () => {
  has(await evidenceBucketProblemsForApi(s.config("api", s.newBucket())), "does not exist");
});

test("refuses a bucket without Object Lock", async () => {
  const bucket = fresh();
  await s.client("admin").send(new CreateBucketCommand({ Bucket: bucket }));
  has(await evidenceBucketProblemsForApi(s.config("api", bucket)), "Object Lock");
});

test("refuses a retention shorter than 2,192 days, and COMPLIANCE mode", async () => {
  const admin = s.client("admin");
  const short = fresh();
  await setUpEvidenceBucket(admin, short, s.apiIdentity);
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: short, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: RETENTION_DAYS - 1 } } } }));
  has(await evidenceBucketProblemsForApi(s.config("api", short)), `not at least ${RETENTION_DAYS} days`);

  const compliance = fresh();
  await admin.send(new CreateBucketCommand({ Bucket: compliance, ObjectLockEnabledForBucket: true }));
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: compliance, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: RETENTION_DAYS } } } }));
  has(await evidenceBucketProblemsForApi(s.config("api", compliance)), "not GOVERNANCE");
});

test("refuses the admin's or the backup's credential: a credential that can list is not the API's", async () => {
  has(await evidenceBucketProblemsForApi(s.config("admin", ready)), "not the API's scoped credential");
  has(await evidenceBucketProblemsForApi(s.config("backup", ready)), "not the API's scoped credential");
});

test("refuses when the bucket policy is not enforced against the API", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await admin.send(new CreateBucketCommand({ Bucket: bucket, ObjectLockEnabledForBucket: true }));
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: bucket, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: RETENTION_DAYS } } } }));
  // locked as required, but with no policy: the retention canary reaches the object lookup (404)
  has(await evidenceBucketProblemsForApi(s.config("api", bucket)), "bucket policy is not enforced");
});
