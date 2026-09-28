// AAB-PLATFORM-01, amendment of 2026-09-28: what each identity may do on the
// locked evidence bucket, as tested against SeaweedFS 4.47 on 2026-09-28
// (section 7). Each probe is an assertion here, so a store upgrade that
// changes any of it fails CI instead of silently weakening the guarantees.

import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { after, before, test } from "node:test";

import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketPolicyCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectLockConfigurationCommand,
  PutObjectRetentionCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

import { RETENTION_DAYS, s3Status, S3ObjectStore } from "../platform/evidence-objects/object-store.js";
import { DENIED_API_ACTIONS, setUpEvidenceBucket } from "../platform/evidence-objects/object-store-setup.js";
import { type ScopedStore, scopedStore } from "./scoped-store-harness.js";

let s: ScopedStore;
let bucket: string;
const buckets: string[] = [];
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** 200-class → "ALLOW"; otherwise the HTTP status. */
// Any S3 command; its own input and output types do not matter here.
async function outcome(client: S3Client, command: unknown): Promise<"ALLOW" | number> {
  try {
    await client.send(command as never);
    return "ALLOW";
  } catch (err) {
    return s3Status(err) ?? -1;
  }
}

async function put(who: "admin" | "api", key: string, body: Buffer | string = "evidence"): Promise<string> {
  const r = await s.client(who).send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(body), IfNoneMatch: "*" }));
  return r.VersionId!;
}

const exists = async (key: string, versionId?: string) =>
  (await outcome(s.client("admin"), new HeadObjectCommand({ Bucket: bucket, Key: key, ...(versionId === undefined ? {} : { VersionId: versionId }) }))) === "ALLOW";

before(async () => {
  s = scopedStore();
  bucket = s.newBucket();
  buckets.push(bucket);
  const setup = await setUpEvidenceBucket(s.client("admin"), bucket, s.apiIdentity);
  assert.deepEqual(setup.problems, [], "the setup step prepares a bucket the contract accepts");
});

after(async () => {
  for (const b of buckets) await s.drop(b);
});

// ── The API identity: read and write on the evidence bucket, nothing else ──

test("API identity: may put, head and get on the evidence bucket", async () => {
  const bytes = Buffer.from(`api-${randomBytes(8).toString("hex")}`);
  const key = sha(bytes);
  await put("api", key, bytes);
  assert.equal(await outcome(s.client("api"), new HeadObjectCommand({ Bucket: bucket, Key: key })), "ALLOW");
  assert.equal(await outcome(s.client("api"), new GetObjectCommand({ Bucket: bucket, Key: key })), "ALLOW");
  const read = await new S3ObjectStore(s.config("api", bucket)).read(key);
  assert.equal(read.state, "INTACT");
});

test("API identity: may not create a bucket, list the evidence bucket or reach another bucket", async () => {
  const api = s.client("api");
  const other = s.newBucket();
  assert.equal(await outcome(api, new CreateBucketCommand({ Bucket: other })), 403, "no bucket creation");
  assert.equal(await outcome(api, new ListObjectsV2Command({ Bucket: bucket })), 403, "no listing");
  const outside = `scs-outside-${randomBytes(6).toString("hex")}`;
  await s.client("admin").send(new CreateBucketCommand({ Bucket: outside }));
  try {
    assert.equal(await outcome(api, new PutObjectCommand({ Bucket: outside, Key: "k", Body: Buffer.from("x") })), 403, "no other bucket");
  } finally {
    await s.client("admin").send(new DeleteObjectCommand({ Bucket: outside, Key: "k" })).catch(() => undefined);
    await s.drop(outside);
  }
});

test("API identity: the bucket policy refuses every delete, lock, versioning, policy, retention and legal-hold change, and the governance override", async () => {
  const api = s.client("api");
  const key = `denied-${randomBytes(6).toString("hex")}`;
  const version = await put("admin", key);
  const until = new Date(Date.now() + 86_400_000);
  const refused: Array<[string, unknown]> = [
    ["delete (delete marker)", new DeleteObjectCommand({ Bucket: bucket, Key: key })],
    ["delete a version", new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId: version })],
    ["delete a version with the governance override", new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId: version, BypassGovernanceRetention: true })],
    ["weaken the default retention", new PutObjectLockConfigurationCommand({ Bucket: bucket, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: 1 } } } })],
    ["suspend versioning", new PutBucketVersioningCommand({ Bucket: bucket, VersioningConfiguration: { Status: "Suspended" } })],
    ["replace the policy", new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify({ Version: "2012-10-17", Statement: [] }) })],
    ["remove the policy", new DeleteBucketPolicyCommand({ Bucket: bucket })],
    ["shorten an object's retention", new PutObjectRetentionCommand({ Bucket: bucket, Key: key, VersionId: version, Retention: { Mode: "GOVERNANCE", RetainUntilDate: until } })],
    ["set a legal hold", new PutObjectLegalHoldCommand({ Bucket: bucket, Key: key, VersionId: version, LegalHold: { Status: "OFF" } })],
  ];
  for (const [what, command] of refused) {
    const got = await outcome(api, command);
    assert.ok(got === 403 || got === 409, `the API may not ${what}: got ${got}`);
  }
  assert.ok(await exists(key, version), "the version is still there");
  assert.ok(DENIED_API_ACTIONS.length === 9, "the policy denies the nine actions of the amendment's section 3");
});

// ── The backup identity: read and list only ──

test("backup identity: may list and get; every write and delete is refused, batch deletes key by key", async () => {
  const backup = s.client("backup");
  const key = `backup-${randomBytes(6).toString("hex")}`;
  await put("admin", key);
  assert.equal(await outcome(backup, new ListObjectsV2Command({ Bucket: bucket })), "ALLOW");
  assert.equal(await outcome(backup, new GetObjectCommand({ Bucket: bucket, Key: key })), "ALLOW");
  assert.equal(await outcome(backup, new PutObjectCommand({ Bucket: bucket, Key: `${key}-new`, Body: Buffer.from("x"), IfNoneMatch: "*" })), 403);
  assert.equal(await outcome(backup, new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from("overwrite") })), 403);
  assert.equal(await outcome(backup, new DeleteObjectCommand({ Bucket: bucket, Key: key })), 403);
  const batch = await backup.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [{ Key: key }] } }));
  assert.deepEqual(batch.Deleted ?? [], [], "nothing deleted");
  assert.equal(batch.Errors?.[0]?.Code, "AccessDenied", "the batch delete is refused for the key");
  assert.equal(await outcome(backup, new PutObjectLockConfigurationCommand({ Bucket: bucket, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: 1 } } } })), 403);
  assert.ok(await exists(key));
});

// ── Object Lock: GOVERNANCE, six years ──

test("every stored version is locked in GOVERNANCE mode for six years", async () => {
  const key = `locked-${randomBytes(6).toString("hex")}`;
  const before = Date.now();
  await put("api", key);
  const head = await s.client("admin").send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  assert.equal(head.ObjectLockMode, "GOVERNANCE");
  const days = (head.ObjectLockRetainUntilDate!.getTime() - before) / 86_400_000;
  assert.ok(days >= RETENTION_DAYS - 1 && days <= RETENTION_DAYS + 1, `locked for about ${RETENTION_DAYS} days, got ${days.toFixed(2)}`);
});

test("a plain delete of a locked version is refused for every identity, the admin included", async () => {
  const key = `plain-${randomBytes(6).toString("hex")}`;
  const version = await put("admin", key);
  for (const who of ["admin", "api", "backup"] as const) {
    assert.equal(await outcome(s.client(who), new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId: version })), 403, `${who}: refused`);
  }
  assert.ok(await exists(key, version));
});

test("disclosed: the admin, with an explicit governance override, can delete a locked version (section 4)", async () => {
  const key = `override-${randomBytes(6).toString("hex")}`;
  const version = await put("admin", key);
  assert.equal(await outcome(s.client("admin"), new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId: version, BypassGovernanceRetention: true })), "ALLOW");
  assert.equal(await exists(key, version), false, "the admin credential can override: it is as sensitive as the override credential");
});

// ── Overwrites: accepted, versioned, detected ──

test("an overwrite adds a new current version, keeps the original, and the verified read reports it CHANGED", async () => {
  const original = Buffer.from(`original-${randomBytes(8).toString("hex")}`);
  const key = sha(original);
  const store = new S3ObjectStore(s.config("api", bucket));
  assert.equal(await store.putIfAbsent(key, original, "application/octet-stream"), "stored");
  // the service never overwrites; the API's credential, used outside it, can
  await s.client("api").send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from("tampered") }));
  const read = await store.read(key);
  assert.equal(read.state, "CHANGED");
  assert.equal(read.state === "CHANGED" && read.actualSha256, sha(Buffer.from("tampered")));
  const versions = (await s.client("admin").send(new ListObjectVersionsCommand({ Bucket: bucket, Prefix: key }))).Versions ?? [];
  assert.equal(versions.length, 2, "the original version is kept");
  const kept = versions.find((v) => v.IsLatest !== true)!;
  const got = await s.client("admin").send(new GetObjectCommand({ Bucket: bucket, Key: key, VersionId: kept.VersionId! }));
  assert.equal(sha(Buffer.from(await got.Body!.transformToByteArray())), key, "and it still holds the original bytes");
});

// ── The startup check's canary: 403 with the policy, 404 without ──

test("SeaweedFS 4.47: setting retention on a missing object is 403 when the policy binds the API, 404 when it does not", async () => {
  // The API's startup check (evidenceBucketProblemsForApi) relies on exactly
  // this: the store checks the policy before it looks for the object. If an
  // upgrade reverses that order, the check could no longer tell an enforced
  // policy from a missing one, and this test fails instead of the check going
  // silently wrong.
  const canary = () => new PutObjectRetentionCommand({
    Bucket: "", Key: `canary-${randomBytes(8).toString("hex")}`,
    Retention: { Mode: "GOVERNANCE", RetainUntilDate: new Date(Date.now() + 86_400_000) },
  });
  const withPolicy = canary();
  withPolicy.input.Bucket = bucket;
  assert.equal(await outcome(s.client("api"), withPolicy), 403, "the policy refuses first");

  const unbound = s.newBucket();
  buckets.push(unbound);
  await s.client("admin").send(new CreateBucketCommand({ Bucket: unbound, ObjectLockEnabledForBucket: true }));
  await s.client("admin").send(new PutObjectLockConfigurationCommand({ Bucket: unbound, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: RETENTION_DAYS } } } }));
  const withoutPolicy = canary();
  withoutPolicy.input.Bucket = unbound;
  assert.equal(await outcome(s.client("api"), withoutPolicy), 404, "without a policy the store looks for the object and reports it missing");
});

// ── The policy must name the API by ARN ──

test("a policy naming the API by bare name is accepted by the store and not enforced", async () => {
  const bare = s.newBucket();
  buckets.push(bare);
  const admin = s.client("admin");
  await admin.send(new CreateBucketCommand({ Bucket: bare, ObjectLockEnabledForBucket: true }));
  await admin.send(new PutObjectLockConfigurationCommand({ Bucket: bare, ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: 1 } } } }));
  const policy = { Version: "2012-10-17", Statement: [{ Effect: "Deny", Principal: { AWS: [s.apiIdentity] }, Action: [...DENIED_API_ACTIONS], Resource: [`arn:aws:s3:::${bare}`, `arn:aws:s3:::${bare}/*`] }] };
  assert.equal(await outcome(admin, new PutBucketPolicyCommand({ Bucket: bare, Policy: JSON.stringify(policy) })), "ALLOW", "the store accepts it");
  await s.client("api").send(new PutObjectCommand({ Bucket: bare, Key: "k", Body: Buffer.from("x") }));
  assert.equal(await outcome(s.client("api"), new DeleteObjectCommand({ Bucket: bare, Key: "k" })), "ALLOW", "and does not enforce it: the API could delete");
});
