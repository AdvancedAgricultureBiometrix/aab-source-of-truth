// The object store setup step (objectstore-init in docker-compose.yml):
//
//   node dist/ops/object-store-setup.js
//
// Runs with the admin credential (S3_ADMIN_*), before the API, on every start
// of the stack. Creates the evidence bucket if it does not exist, locked and
// with its policy, then verifies it (platform/evidence-objects/
// object-store-setup.ts). Exits non-zero, and the API does not start, if the
// store cannot be reached or an existing bucket differs from the contract:
// it never repairs one (build plan, decision 2).

import { IDENTITY_NAMES, objectStoreConfigFromEnv, RETENTION_DAYS, RETENTION_MODE, s3ClientFor } from "../platform/evidence-objects/object-store.js";
import { setUpEvidenceBucket } from "../platform/evidence-objects/object-store-setup.js";

try {
  const config = objectStoreConfigFromEnv("ADMIN");
  const result = await setUpEvidenceBucket(s3ClientFor(config), config.bucket, IDENTITY_NAMES.api);
  if (result.problems.length > 0) {
    console.error(`object-store-setup refused: the evidence bucket ${config.bucket} differs from AAB-PLATFORM-01 (amendment of 2026-09-28). ` +
      `Nothing was changed. A drifted lock or policy is a security incident: find out what changed, and why, before anything is restored.`);
    for (const p of result.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ bucket: config.bucket, created: result.created, retention: `${RETENTION_MODE} ${RETENTION_DAYS} days`, policy: "verified" }));
} catch (err) {
  console.error(`object-store-setup failed: ${(err as Error).name}: ${(err as Error).message}`);
  process.exit(1);
}
