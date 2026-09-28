// SCS pilot — restore of a backup into a fresh environment.
//
//   node backup/restore.mjs --backup <backup directory> --dir <scs-pilot directory> --project <compose project>
//                           [--report <file>] [--set KEY=VALUE ...]
//
// The target is a checkout of scs-pilot at the commit the backup was taken
// from, with no .env and no static actors file, and a compose project with no
// containers and no volumes: what an institution has after a disaster, a
// fresh host with the code at its recorded version. --set overrides a .env
// value for this host only (e.g. API_PORT=3001), without changing the
// restored .env.
//
// Steps, each failing closed:
//   1. the backup: every file matches SHA256SUMS and the manifest
//   2. the target: the checkout's commit is the backup's; the project is
//      empty; the committed edge configuration equals the backed-up copy
//   3. the configuration: .env and the static actors file restored
//   4. PostgreSQL and the object store started on new, empty volumes; the
//      setup step (objectstore-init) creates the evidence bucket, locked and
//      with its policy
//   5. roles restored; the empty database created at first start replaced by
//      the backed-up one (pg_restore --create: schemas, rows and
//      database-level grants)
//   6. every object imported with the API identity and read back verified
//   7. the whole stack started; the migrate service must report every
//      migration already applied (it checks each recorded checksum, and fails
//      closed on any difference)
//   8. the integrity check (dist/ops/verify-integrity.js), compared with the
//      source's report: receipts, packages, files, migrations, row counts and
//      database grants

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { git, log, parseArgs, sha256File, Stack } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), ["set"]);
if (typeof args.backup !== "string" || typeof args.dir !== "string" || typeof args.project !== "string") {
  console.error("usage: node backup/restore.mjs --backup <dir> --dir <scs-pilot directory> --project <compose project> [--report <file>] [--set KEY=VALUE ...]");
  process.exit(2);
}
const backup = resolve(args.backup);
const overrides = Object.fromEntries((args.set ?? []).map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]));
const stack = new Stack({ dir: args.dir, project: args.project, overrides });
const fail = (message) => {
  throw new Error(`restore refused: ${message}`);
};

// 1. The backup
log("checking the backup against SHA256SUMS and its manifest");
const sums = readFileSync(join(backup, "SHA256SUMS"), "utf8").trim().split("\n").map((l) => [l.slice(66), l.slice(0, 64)]);
for (const [path, sum] of sums) if (sha256File(join(backup, path)) !== sum) fail(`backup file ${path} does not match SHA256SUMS`);
const manifest = JSON.parse(readFileSync(join(backup, "manifest.json"), "utf8"));
if (manifest.format !== "scs-pilot-backup/1") fail(`unknown backup format ${manifest.format}`);
for (const f of manifest.files) if (sha256File(join(backup, f.path)) !== f.sha256) fail(`backup file ${f.path} does not match the manifest`);

// 2. The target
const commit = git(stack.dir, ["rev-parse", "HEAD"]);
if (commit !== manifest.source.commit) fail(`the target checkout is at ${commit}; the backup was taken from ${manifest.source.commit}`);
const { containers, volumes } = stack.resources();
if (containers.length > 0 || volumes.length > 0) fail(`compose project ${stack.project} is not fresh (${containers.length} containers, ${volumes.length} volumes)`);
for (const f of ["edge/nginx.conf", "edge/nginx.dev.conf"]) {
  if (sha256File(join(stack.dir, f)) !== sha256File(join(backup, "config", f))) fail(`the committed ${f} differs from the backed-up copy`);
}

// 3. The configuration
for (const [from, to] of [["config/.env", ".env"], ["config/static-actors.json", "packages/api/config/static-actors.json"]]) {
  if (existsSync(join(stack.dir, to))) fail(`${to} already exists in the target; it is never overwritten`);
  copyFileSync(join(backup, from), join(stack.dir, to));
}
const env = stack.env;

// 4. Storage on new volumes
log(`building the image and starting postgres and seaweedfs for ${stack.project}`);
stack.compose(["build"]);
stack.compose(["up", "-d", "--wait", "postgres", "seaweedfs"]);
// the evidence bucket, locked and with its policy, by the setup step and the
// admin credential: the import runs with the API's, which cannot create it
stack.compose(["run", "--rm", "--no-deps", "objectstore-init"]);

// 5. Roles and the database
log("restoring roles and the database");
const roles = readFileSync(join(backup, "database/roles.sql"), "utf8")
  .split("\n")
  // the owner already exists: the postgres image created it at first start
  .filter((line) => line.trim() !== `CREATE ROLE ${env.POSTGRES_USER};`)
  .join("\n");
stack.compose(["exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: roles });
const scsSchemas = stack.compose(["exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER, "-d", env.POSTGRES_DB, "-tAc", "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'scs%'"]).trim();
if (scsSchemas !== "0") fail(`the new database ${env.POSTGRES_DB} already has scs schemas`);
stack.compose(["exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-c", `DROP DATABASE "${env.POSTGRES_DB}"`]);
stack.compose(["exec", "-T", "postgres", "pg_restore", "-U", env.POSTGRES_USER, "-d", "postgres", "--create", "--exit-on-error"], { stdinFile: join(backup, "database/database.dump") });

// 6. Objects
log("importing the object store");
const imported = stack.runApiTool(["node", "dist/ops/object-store-archive.js", "import", "/backup"], { mounts: [`${backup}:/backup:ro`] });

// 7. The stack; migrate must find every migration already applied
log("starting the stack");
stack.compose(["up", "-d", "--wait"]);
const migrateLog = stack.compose(["logs", "--no-color", "--no-log-prefix", "migrate"]).trim().split("\n").pop();
const expected = manifest.migrations.length;
if (!new RegExp(`done: 0 applied, 0 baselined, ${expected} already applied`).test(migrateLog)) fail(`the migrate service did not report ${expected} migrations already applied: ${migrateLog}`);

// 8. Integrity, compared with the source
log("verifying the restored environment");
const verified = stack.runApiTool(["node", "dist/ops/verify-integrity.js", "--expect", "/backup/source-report.json"], { mounts: [`${backup}:/backup:ro`], passEnv: stack.verifyEnv(), check: false });
const ok = verified.status === 0;
let integrity;
try {
  integrity = JSON.parse(verified.stdout);
} catch {
  integrity = { error: verified.stderr.trim() || verified.stdout.trim() };
}
const result = { restoredAt: new Date().toISOString(), backup, project: stack.project, commit, migrateLog, objects: JSON.parse(imported.trim().split("\n").pop()), ok, integrity };
if (typeof args.report === "string") writeFileSync(resolve(args.report), JSON.stringify(result, null, 2) + "\n");
log(ok ? `restore complete and verified intact: ${stack.project}` : `restore complete but NOT intact: ${stack.project}`);
process.exit(ok ? 0 : 1);
