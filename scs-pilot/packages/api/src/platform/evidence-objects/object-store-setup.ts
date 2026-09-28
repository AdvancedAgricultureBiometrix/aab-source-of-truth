// The object store setup step (AAB-PLATFORM-01, amendment of 2026-09-28,
// section 5), run with the admin credential before the API starts, on every
// start of the stack:
//
//   - no evidence bucket: create it with Object Lock, set the default
//     retention (GOVERNANCE, 2,192 days) and attach the bucket policy that
//     denies the API identity lock, versioning, policy, retention and
//     legal-hold changes, every delete and the governance override;
//   - then, always: read all of it back and verify it.
//
// An existing bucket that differs is refused, never repaired (build plan,
// decision 2): a drifted lock or policy is a security incident, and an
// operator must find out what changed, and why, before anything is restored.
//
// The policy names the API by ARN. A policy naming the identity by bare name
// is accepted by the store and silently not enforced (amendment, section 7).

import {
  CreateBucketCommand,
  GetBucketPolicyCommand,
  GetBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectLockConfigurationCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

import { RETENTION_DAYS, RETENTION_MODE, s3Status } from "./object-store.js";

/** The actions the bucket policy denies the API identity (amendment, section 3). */
export const DENIED_API_ACTIONS = [
  "s3:PutBucketObjectLockConfiguration", "s3:PutBucketVersioning",
  "s3:PutBucketPolicy", "s3:DeleteBucketPolicy",
  "s3:PutObjectRetention", "s3:PutObjectLegalHold",
  "s3:DeleteObject", "s3:DeleteObjectVersion",
  "s3:BypassGovernanceRetention",
] as const;

/** The ARN the store matches a policy principal against. A bare name is not enforced. */
export const identityArn = (identityName: string) => `arn:aws:iam::000000000000:user/${identityName}`;

export function evidenceBucketPolicy(bucket: string, apiIdentityName: string) {
  return {
    Version: "2012-10-17",
    Statement: [{
      Sid: "ApiMayNotChangeRetentionOrDelete",
      Effect: "Deny",
      Principal: { AWS: [identityArn(apiIdentityName)] },
      Action: [...DENIED_API_ACTIONS],
      Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
    }],
  };
}

/**
 * A policy reduced to what it means, for comparison.
 *
 * Why not string equality: SeaweedFS 4.47 (tested 2026-09-28) does not return
 * a stored policy byte for byte. It rewrites a one-element list as a plain
 * string ("Action": ["s3:X"] comes back as "Action": "s3:X"), and may drop or
 * reorder fields. A string comparison would therefore report drift on every
 * run and refuse a correct bucket. So policies are compared by effect,
 * principals, actions, resources and conditions, each as a sorted set. A store
 * upgrade that changes this form is harmless here, and one that changes the
 * policy's meaning is caught.
 */
export function normalisePolicy(policy: unknown): string {
  const list = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)]).sort();
  const p = policy as { Version?: unknown; Statement?: unknown };
  const statements = (Array.isArray(p.Statement) ? p.Statement : p.Statement === undefined ? [] : [p.Statement]) as Array<Record<string, unknown>>;
  return JSON.stringify({
    Version: p.Version ?? null,
    Statement: statements.map((s) => {
      const principal = s["Principal"];
      const aws = principal !== null && typeof principal === "object" ? (principal as Record<string, unknown>)["AWS"] : principal;
      return { Effect: s["Effect"] ?? null, Principal: list(aws), Action: list(s["Action"]), Resource: list(s["Resource"]), Condition: s["Condition"] ?? null };
    }).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)),
  });
}

export interface SetupResult {
  readonly created: boolean;
  /** Empty when the bucket is exactly as the contract requires. */
  readonly problems: string[];
}

/** Why an existing evidence bucket differs from the contract; empty when it does not. */
export async function evidenceBucketDrift(admin: S3Client, bucket: string, apiIdentityName: string): Promise<string[]> {
  const problems: string[] = [];
  const v = await admin.send(new GetBucketVersioningCommand({ Bucket: bucket }));
  if (v.Status !== "Enabled") problems.push(`versioning is ${v.Status ?? "not enabled"}, not Enabled`);

  try {
    const lock = (await admin.send(new GetObjectLockConfigurationCommand({ Bucket: bucket }))).ObjectLockConfiguration;
    const rule = lock?.Rule?.DefaultRetention;
    if (lock?.ObjectLockEnabled !== "Enabled") problems.push("Object Lock is not enabled");
    else if (rule === undefined) problems.push("Object Lock has no default retention");
    else if (rule.Mode !== RETENTION_MODE || rule.Days !== RETENTION_DAYS || rule.Years !== undefined) {
      problems.push(`the default retention is ${rule.Mode ?? "no mode"} for ${rule.Years !== undefined ? `${rule.Years} years` : `${rule.Days ?? 0} days`}, not ${RETENTION_MODE} for ${RETENTION_DAYS} days`);
    }
  } catch (err) {
    if (s3Status(err) !== 404) throw err;
    problems.push("Object Lock is not enabled: a bucket created without it can never be locked, and is never used");
  }

  const expected = normalisePolicy(evidenceBucketPolicy(bucket, apiIdentityName));
  try {
    const got = await admin.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    if (normalisePolicy(JSON.parse(got.Policy ?? "{}")) !== expected) problems.push("the bucket policy differs from the contract's");
  } catch (err) {
    if (s3Status(err) !== 404) throw err;
    problems.push("the bucket has no policy");
  }
  return problems;
}

/**
 * Create the evidence bucket if it does not exist, then verify it. Never
 * changes an existing bucket: a bucket that differs is reported, and the
 * caller refuses to continue.
 */
export async function setUpEvidenceBucket(admin: S3Client, bucket: string, apiIdentityName: string): Promise<SetupResult> {
  let exists = true;
  try {
    await admin.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    if (s3Status(err) !== 404) throw err;
    exists = false;
  }
  if (!exists) {
    await admin.send(new CreateBucketCommand({ Bucket: bucket, ObjectLockEnabledForBucket: true }));
    await admin.send(new PutObjectLockConfigurationCommand({
      Bucket: bucket,
      ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: RETENTION_MODE, Days: RETENTION_DAYS } } },
    }));
    await admin.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(evidenceBucketPolicy(bucket, apiIdentityName)) }));
  }
  return { created: !exists, problems: await evidenceBucketDrift(admin, bucket, apiIdentityName) };
}
