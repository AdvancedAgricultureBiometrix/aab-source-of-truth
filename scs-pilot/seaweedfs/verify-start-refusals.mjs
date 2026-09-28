// The object store's start refusals (seaweedfs/start.sh), on the real image:
// AAB-PLATFORM-01, amendment of 2026-09-28, section 1, and the build plan's
// decision 1. Run from scs-pilot, with the stack's .env in place:
//
//   node seaweedfs/verify-start-refusals.mjs
//
// Each case starts a one-off seaweedfs container with one value changed and
// requires it to refuse, with its reason, before the store starts. The
// positive case, the store starting with valid credentials, is the running
// stack itself.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2]]));

/** Start seaweedfs once with the given changes; it must exit non-zero with `expected` on stderr. */
function refuses(name, { set = {}, shell = {} }, expected) {
  const args = ["compose", "run", "--rm", "--no-deps", "-T"];
  for (const [k, v] of Object.entries(set)) args.push("-e", `${k}=${v}`);
  args.push("seaweedfs");
  const r = spawnSync("docker", args, { encoding: "utf8", timeout: 120_000, env: { ...process.env, ...shell } });
  const ok = r.status !== 0 && r.status !== null && expected.test(r.stderr ?? "");
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (exit ${r.status}; stderr: ${(r.stderr ?? "").trim().split("\n").slice(-3).join(" | ")})`}`);
  return ok;
}

const results = [
  refuses("an override credential set in the container's environment", { set: { S3_OVERRIDE_ACCESS_KEY_ID: "override-key" } }, /S3_OVERRIDE_ACCESS_KEY_ID is set/),
  refuses("an override secret set where compose reads .env and the shell", { shell: { S3_OVERRIDE_SECRET_ACCESS_KEY: "override-secret-0123456789" } }, /S3_OVERRIDE_SECRET_ACCESS_KEY is set/),
  refuses("a change-me placeholder", { set: { S3_API_SECRET_ACCESS_KEY: "change-me-at-least-8-chars" } }, /S3_API still holds a change-me placeholder/),
  refuses("a secret shorter than 16 characters", { set: { S3_BACKUP_SECRET_ACCESS_KEY: "short-secret" } }, /S3_BACKUP_SECRET_ACCESS_KEY is shorter than 16 characters/),
  refuses("two identities sharing an access key", { set: { S3_BACKUP_ACCESS_KEY_ID: env.S3_API_ACCESS_KEY_ID } }, /S3_BACKUP_ACCESS_KEY_ID is the same as another identity's/),
  refuses("two identities sharing a secret", { set: { S3_API_SECRET_ACCESS_KEY: env.S3_ADMIN_SECRET_ACCESS_KEY } }, /S3_API_SECRET_ACCESS_KEY is the same as another identity's/),
  refuses("a credential with a character that could break the identity file", { set: { S3_ADMIN_SECRET_ACCESS_KEY: 'bad"secret-0123456789' } }, /S3_ADMIN holds a character outside/),
  refuses("the test identities' bucket prefix as the evidence bucket", { set: { S3_BUCKET: "scs-idt-evidence" } }, /reserved for the test identities/),
];
if (results.some((r) => !r)) {
  console.error("the object store did not refuse every case");
  process.exit(1);
}
console.log(`the object store refused all ${results.length} cases`);
