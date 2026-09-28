// The object store setup step (AAB-PLATFORM-01, amendment of 2026-09-28,
// section 5): it creates the evidence bucket locked and with its policy,
// verifies it on every run, and refuses, never repairs, a bucket that differs
// (build plan, decision 2).

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  GetBucketPolicyCommand,
  GetObjectLockConfigurationCommand,
  PutBucketPolicyCommand,
  PutObjectLockConfigurationCommand,
} from "@aws-sdk/client-s3";

import { RETENTION_DAYS } from "../platform/evidence-objects/object-store.js";
import { evidenceBucketPolicy, identityArn, normalisePolicy, setUpEvidenceBucket } from "../platform/evidence-objects/object-store-setup.js";
import { type ScopedStore, scopedStore } from "./scoped-store-harness.js";

let s: ScopedStore;
const buckets: string[] = [];
const fresh = () => {
  const b = s.newBucket();
  buckets.push(b);
  return b;
};

before(() => {
  s = scopedStore();
});

after(async () => {
  for (const b of buckets) await s.drop(b);
});

test("creates the bucket locked, GOVERNANCE for 2,192 days, with the ARN policy; a second run verifies it and changes nothing", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  const first = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.deepEqual(first, { created: true, problems: [] });
  const lock = (await admin.send(new GetObjectLockConfigurationCommand({ Bucket: bucket }))).ObjectLockConfiguration!;
  assert.equal(lock.ObjectLockEnabled, "Enabled");
  assert.deepEqual({ ...lock.Rule!.DefaultRetention }, { Mode: "GOVERNANCE", Days: RETENTION_DAYS });
  const policy = JSON.parse((await admin.send(new GetBucketPolicyCommand({ Bucket: bucket }))).Policy!);
  assert.equal(normalisePolicy(policy), normalisePolicy(evidenceBucketPolicy(bucket, s.apiIdentity)));
  assert.ok(JSON.stringify(policy).includes(identityArn(s.apiIdentity)), "the principal is named by ARN");
  assert.deepEqual(await setUpEvidenceBucket(admin, bucket, s.apiIdentity), { created: false, problems: [] });
});

test("refuses an existing bucket without Object Lock", async () => {
  const bucket = fresh();
  await s.client("admin").send(new CreateBucketCommand({ Bucket: bucket }));
  const r = await setUpEvidenceBucket(s.client("admin"), bucket, s.apiIdentity);
  assert.equal(r.created, false);
  assert.ok(r.problems.some((p) => p.includes("Object Lock is not enabled")), JSON.stringify(r.problems));
});

test("refuses a weakened retention, and does not repair it", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: bucket, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: 1 } } } }));
  const r = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.ok(r.problems.some((p) => p.includes("default retention")), JSON.stringify(r.problems));
  const still = (await admin.send(new GetObjectLockConfigurationCommand({ Bucket: bucket }))).ObjectLockConfiguration!.Rule!.DefaultRetention!;
  assert.equal(still.Days, 1, "refused, not repaired: the drift is left for an operator to investigate");
});

test("refuses a COMPLIANCE-mode bucket", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await admin.send(new CreateBucketCommand({ Bucket: bucket, ObjectLockEnabledForBucket: true }));
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: bucket, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: RETENTION_DAYS } } } }));
  await admin.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(evidenceBucketPolicy(bucket, s.apiIdentity)) }));
  const r = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.ok(r.problems.some((p) => p.includes("COMPLIANCE")), JSON.stringify(r.problems));
});

test("refuses a bucket whose policy was removed", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  await admin.send(new DeleteBucketPolicyCommand({ Bucket: bucket }));
  const r = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.ok(r.problems.includes("the bucket has no policy"), JSON.stringify(r.problems));
});

test("refuses a bucket whose policy was altered", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  const weaker = evidenceBucketPolicy(bucket, s.apiIdentity);
  weaker.Statement[0]!.Action = ["s3:PutObjectRetention"];
  await admin.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(weaker) }));
  const r = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.ok(r.problems.includes("the bucket policy differs from the contract's"), JSON.stringify(r.problems));
});

test("refuses a bucket whose policy names the API by bare name", async () => {
  const bucket = fresh();
  const admin = s.client("admin");
  await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  const bare = evidenceBucketPolicy(bucket, s.apiIdentity);
  bare.Statement[0]!.Principal = { AWS: [s.apiIdentity] };
  await admin.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(bare) }));
  const r = await setUpEvidenceBucket(admin, bucket, s.apiIdentity);
  assert.ok(r.problems.includes("the bucket policy differs from the contract's"), JSON.stringify(r.problems));
});

test("normalisePolicy compares by meaning: order and one-element lists do not matter", () => {
  const p = evidenceBucketPolicy("b", "scs-api");
  const reordered = { ...p, Statement: [{ ...p.Statement[0]!, Action: [...p.Statement[0]!.Action].reverse(), Resource: [...p.Statement[0]!.Resource].reverse(), Sid: undefined }] };
  assert.equal(normalisePolicy(reordered), normalisePolicy(p));
  const single = { Version: "2012-10-17", Statement: { Effect: "Deny", Principal: { AWS: "arn:x" }, Action: "s3:A", Resource: "r" } };
  const listed = { Version: "2012-10-17", Statement: [{ Effect: "Deny", Principal: { AWS: ["arn:x"] }, Action: ["s3:A"], Resource: ["r"] }] };
  assert.equal(normalisePolicy(single), normalisePolicy(listed));
});
