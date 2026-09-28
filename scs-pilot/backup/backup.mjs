// SCS pilot — backup of one environment.
//
//   node backup/backup.mjs --dir <scs-pilot directory> --project <compose project> --out <new empty directory>
//                          [--set KEY=VALUE ...]
//
// --set gives the compose settings the environment was started with, where
// they differ from its .env (e.g. SCS_API_IMAGE_TAG): the backup's tools run
// from the environment's own api image.
//
// A complete backup is:
//   database/roles.sql      every role (pg_dumpall --roles-only), passwords as
//                           their stored hashes
//   database/database.dump  the whole database, every schema and row, with its
//                           database-level grants (pg_dump --create, custom format)
//   objects/<sha256>        every object in the object store: evidence files and
//                           PDF renditions, each checked against its key
//   objects.json            key, size, SHA-256 and media type of every object
//   config/.env, config/static-actors.json, config/edge/nginx.conf,
//   config/edge/nginx.dev.conf
//                           the environment's configuration
//   source-report.json      the source's integrity report, taken before the dump:
//                           migrations, receipts, packages, files, row counts
//   manifest.json           what was backed up, from which commit, with the
//                           SHA-256 of every file
//   SHA256SUMS              the SHA-256 of every file, the manifest included
//
// Consistency: the API and the edge — the only writers — are stopped for the
// duration, so the database, the object store and the counts are one state.
// They are started again afterwards, also on failure.
//
// The backup holds credentials (.env: database, object store and API
// passwords; the static actors file: token digests) and country data. It must
// be kept inside the country boundary with access restricted to the
// environment's operators. It is not encrypted by this script:
// TODO(backup-encryption).

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { ensureEmptyDir, git, listFiles, log, parseArgs, sha256File, Stack } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), ["set"]);
if (typeof args.dir !== "string" || typeof args.project !== "string" || typeof args.out !== "string") {
  console.error("usage: node backup/backup.mjs --dir <scs-pilot directory> --project <compose project> --out <new empty directory>");
  process.exit(2);
}
const out = resolve(args.out);
const overrides = Object.fromEntries((args.set ?? []).map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]));
const stack = new Stack({ dir: args.dir, project: args.project, overrides });
const env = stack.env;

ensureEmptyDir(out);
for (const d of ["database", "config/edge"]) mkdirSync(join(out, d), { recursive: true });

log(`stopping the writers (api, edge) of ${stack.project}`);
stack.compose(["stop", "edge", "api"]);
try {
  log("verifying the source before backing it up");
  const verified = stack.runApiTool(["node", "dist/ops/verify-integrity.js"], { passEnv: stack.verifyEnv(), check: false });
  writeFileSync(join(out, "source-report.json"), verified.stdout);
  if (verified.status !== 0) {
    throw new Error(`the source is not intact; no backup was taken (see ${join(out, "source-report.json")}): ${verified.stderr.trim()}`);
  }
  const sourceReport = verified.stdout;

  log("dumping roles and the database");
  stack.compose(["exec", "-T", "postgres", "pg_dumpall", "-U", env.POSTGRES_USER, "--roles-only"], { stdoutFile: join(out, "database/roles.sql") });
  stack.compose(["exec", "-T", "postgres", "pg_dump", "-U", env.POSTGRES_USER, "-d", env.POSTGRES_DB, "--create", "-Fc"], { stdoutFile: join(out, "database/database.dump") });
  const postgresVersion = stack.compose(["exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER, "-d", env.POSTGRES_DB, "-tAc", "SHOW server_version"]).trim();

  // with the backup identity, which may read and list and nothing else
  // (AAB-PLATFORM-01, amendment of 2026-09-28, section 1)
  log("exporting the object store");
  const exported = stack.runApiTool(["node", "dist/ops/object-store-archive.js", "export", "/backup"], {
    mounts: [`${out}:/backup`], writable: true,
    passEnv: { S3_BACKUP_ACCESS_KEY_ID: env.S3_BACKUP_ACCESS_KEY_ID, S3_BACKUP_SECRET_ACCESS_KEY: env.S3_BACKUP_SECRET_ACCESS_KEY },
  });
  // every object the database records must be in the export: a missing or
  // hidden object fails the backup instead of being left out (section 6)
  const exportedKeys = new Set(JSON.parse(readFileSync(join(out, "objects.json"), "utf8")).objects.map((o) => o.key));
  const notExported = JSON.parse(sourceReport).storedObjectKeys.filter((k) => !exportedKeys.has(k));
  if (notExported.length > 0) throw new Error(`the export is missing ${notExported.length} object(s) the database records, e.g. ${notExported[0]}; no backup was taken`);

  log("copying the configuration");
  for (const [from, to] of [
    [".env", "config/.env"],
    ["packages/api/config/static-actors.json", "config/static-actors.json"],
    ["edge/nginx.conf", "config/edge/nginx.conf"],
    ["edge/nginx.dev.conf", "config/edge/nginx.dev.conf"],
  ]) {
    mkdirSync(dirname(join(out, to)), { recursive: true });
    copyFileSync(join(stack.dir, from), join(out, to));
  }

  const report = JSON.parse(sourceReport);
  const manifest = {
    format: "scs-pilot-backup/1",
    createdAt: new Date().toISOString(),
    source: {
      project: stack.project,
      commit: git(stack.dir, ["rev-parse", "HEAD"]),
      uncommittedChanges: git(stack.dir, ["status", "--porcelain", "--", "."]) !== "",
    },
    postgres: { version: postgresVersion, database: env.POSTGRES_DB, owner: env.POSTGRES_USER },
    migrations: report.migrations.applied,
    counts: report.counts,
    objects: JSON.parse(exported.trim().split("\n").pop()),
    files: listFiles(out).map((f) => ({ path: f, sha256: sha256File(join(out, f)) })),
  };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(out, "SHA256SUMS"), listFiles(out).filter((f) => f !== "SHA256SUMS").map((f) => `${sha256File(join(out, f))}  ${f}`).join("\n") + "\n");
  log(`backup complete: ${out} (${manifest.files.length} files, ${manifest.objects.exported} objects, commit ${manifest.source.commit.slice(0, 7)})`);
} finally {
  log(`starting the writers (api, edge) of ${stack.project} again`);
  stack.compose(["start", "api", "edge"]);
}
