// Migration runner: applies packages/db/migrations/*.sql in order, records
// each one, and is safe to run on every start (replaces the postgres image's
// first-start init hook, which only ran on an empty volume).
//
// Rules:
//   * It connects as the owner (migration) role. It refuses to run as scs_api
//     or as any member of scs_api: the API role must never change the schema.
//   * Each migration file is exactly one transaction: a "BEGIN;" line first
//     and a "COMMIT;" line last. The runner opens that transaction itself,
//     runs the statements between, and records the migration in the same
//     transaction — so a migration is either applied and recorded, or neither.
//   * History lives in scs_migration.applied_migration (version, name, the
//     SHA-256 of the file, when, by whom, APPLIED or BASELINED). No grants:
//     scs_api cannot read or change it.
//   * Committed migrations are immutable. If an applied migration's file has
//     changed (checksum), is missing, or the history has a gap, the runner
//     fails closed and applies nothing.
//   * A database that already has SCS objects but no history (built before
//     this runner) is refused unless baselined once, explicitly, with
//     --baseline <version>: versions up to it are recorded as BASELINED
//     without being run. Only allowed while the history is empty.
//   * Runners are serialised with a session advisory lock, so concurrent
//     starts apply each migration once.
//
// Checksums are taken over the file with CRLF normalised to LF: a Windows
// checkout must not look like an edited migration.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";

export const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL("../../../db/migrations/", import.meta.url));

/** Session advisory lock key serialising runners on one database ("scs migrate"). */
export const MIGRATION_RUNNER_LOCK_KEY = 7_374_100;

const FILE_NAME = /^(\d{3})_[a-z0-9_]+\.sql$/;

export interface MigrationFile {
  /** "001", "002", … */
  readonly version: string;
  readonly name: string;
  /** SHA-256 (hex) of the LF-normalised file. */
  readonly checksum: string;
  /** The statements between the file's BEGIN; and COMMIT; lines. */
  readonly body: string;
}

export class MigrationError extends Error {
  override readonly name = "MigrationError";
}

/** Read, check and order the migration files. Throws MigrationError on any irregularity. */
export async function loadMigrations(dir: string = DEFAULT_MIGRATIONS_DIR): Promise<MigrationFile[]> {
  const names = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  if (names.length === 0) throw new MigrationError(`no migrations found in ${dir}`);
  const files: MigrationFile[] = [];
  for (const [i, name] of names.entries()) {
    const m = FILE_NAME.exec(name);
    if (m === null) throw new MigrationError(`${name}: migration file names must match NNN_lowercase_name.sql`);
    const version = m[1]!;
    const expected = String(i + 1).padStart(3, "0");
    if (version !== expected) throw new MigrationError(`${name}: expected version ${expected} next — migrations must be numbered 001, 002, … without gaps or repeats`);
    const text = (await readFile(join(dir, name), "utf8")).replace(/\r\n/g, "\n");
    files.push({ version, name, checksum: createHash("sha256").update(text).digest("hex"), body: transactionBody(name, text) });
  }
  return files;
}

/** The statements of a file that is exactly one BEGIN; … COMMIT; transaction. */
function transactionBody(name: string, text: string): string {
  const lines = text.split("\n");
  const statementLines = lines.map((l, i) => ({ l: l.trim(), i })).filter(({ l }) => l !== "" && !l.startsWith("--"));
  const begins = lines.flatMap((l, i) => (l.trim() === "BEGIN;" ? [i] : []));
  const commits = lines.flatMap((l, i) => (l.trim() === "COMMIT;" ? [i] : []));
  if (begins.length !== 1 || commits.length !== 1 || statementLines[0]?.i !== begins[0] || statementLines.at(-1)?.i !== commits[0]) {
    throw new MigrationError(`${name}: a migration must be exactly one transaction — a "BEGIN;" line first and a "COMMIT;" line last`);
  }
  return lines.slice(begins[0]! + 1, commits[0]).join("\n");
}

export interface AppliedMigration {
  readonly version: string;
  readonly name: string;
  readonly checksum: string;
  readonly method: "APPLIED" | "BASELINED";
}

export interface MigrateOptions {
  /** Record versions up to and including this one as BASELINED, without running them. Empty history only. */
  readonly baseline?: string;
  readonly log?: (line: string) => void;
}

export interface MigrateResult {
  readonly applied: string[];
  readonly baselined: string[];
  readonly alreadyApplied: string[];
}

const HISTORY_DDL = `
  CREATE SCHEMA IF NOT EXISTS scs_migration;
  REVOKE ALL ON SCHEMA scs_migration FROM PUBLIC;
  CREATE TABLE IF NOT EXISTS scs_migration.applied_migration (
    version     text        NOT NULL,
    name        text        NOT NULL,
    checksum    text        NOT NULL,
    method      text        NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now(),
    applied_by  text        NOT NULL DEFAULT current_user,
    CONSTRAINT applied_migration_pk PRIMARY KEY (version),
    CONSTRAINT applied_migration_version_ck CHECK (version ~ '^[0-9]{3}$'),
    CONSTRAINT applied_migration_checksum_ck CHECK (checksum ~ '^[0-9a-f]{64}$'),
    CONSTRAINT applied_migration_method_ck CHECK (method IN ('APPLIED', 'BASELINED'))
  );
  REVOKE ALL ON scs_migration.applied_migration FROM PUBLIC;`;

/**
 * Refuse the API role: only the owner / migration role may change the schema.
 * Membership is followed through actual role grants (pg_auth_members,
 * recursively), not pg_has_role, which reports every superuser — including
 * the owner — as a member of every role.
 */
async function assertMigrationRole(client: pg.Client): Promise<string> {
  const { rows } = await client.query<{ usr: string; api_member: boolean }>(
    `WITH RECURSIVE granted(roleid) AS (
       SELECT roleid FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       UNION
       SELECT a.roleid FROM pg_auth_members a JOIN granted g ON a.member = g.roleid
     )
     SELECT current_user AS usr,
            EXISTS (SELECT 1 FROM granted WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'scs_api')) AS api_member`,
  );
  const { usr, api_member } = rows[0]!;
  if (usr === "scs_api" || api_member) {
    throw new MigrationError(`refusing to migrate as ${usr}: migrations run as the owner (migration) role, never as scs_api or a member of it`);
  }
  return usr;
}

/** Apply every pending migration in order. Idempotent: a second run applies nothing. */
export async function migrate(client: pg.Client, migrations: readonly MigrationFile[], options: MigrateOptions = {}): Promise<MigrateResult> {
  const log = options.log ?? (() => undefined);
  const user = await assertMigrationRole(client);
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_RUNNER_LOCK_KEY]);
  try {
    await client.query(HISTORY_DDL);
    const { rows: history } = await client.query<AppliedMigration>(
      `SELECT version, name, checksum, method FROM scs_migration.applied_migration ORDER BY version`,
    );
    const byVersion = new Map(migrations.map((m) => [m.version, m]));

    // History must be a prefix of the files, unchanged
    for (const [i, h] of history.entries()) {
      const expected = String(i + 1).padStart(3, "0");
      if (h.version !== expected) throw new MigrationError(`migration history has a gap: expected ${expected}, found ${h.version}`);
      const file = byVersion.get(h.version);
      if (file === undefined) throw new MigrationError(`migration ${h.version} (${h.name}) is recorded as applied but its file is missing: this database is newer than this release`);
      if (file.checksum !== h.checksum) {
        throw new MigrationError(`migration ${h.name} has changed since it was applied (checksum ${h.checksum.slice(0, 12)}… recorded, ${file.checksum.slice(0, 12)}… on disk): committed migrations are immutable`);
      }
    }

    // Baseline: an existing database built before this runner
    const baselined: string[] = [];
    if (history.length === 0) {
      const { rows } = await client.query<{ has_scs: boolean }>(`SELECT to_regnamespace('scs') IS NOT NULL AS has_scs`);
      if (options.baseline !== undefined) {
        if (!byVersion.has(options.baseline)) throw new MigrationError(`--baseline ${options.baseline}: no such migration`);
        if (!rows[0]!.has_scs) throw new MigrationError(`--baseline ${options.baseline}: the database has no scs schema; nothing to baseline — run without --baseline`);
        for (const m of migrations.filter((x) => x.version <= options.baseline!)) {
          await client.query(`INSERT INTO scs_migration.applied_migration (version, name, checksum, method) VALUES ($1, $2, $3, 'BASELINED')`, [m.version, m.name, m.checksum]);
          baselined.push(m.version);
          log(`baselined ${m.name} (recorded, not run)`);
        }
      } else if (rows[0]!.has_scs) {
        throw new MigrationError(
          "the database has SCS objects but no migration history (it was built before the migration runner). " +
            "Confirm which migrations it already has, then run once with --baseline <version>.",
        );
      }
    } else if (options.baseline !== undefined) {
      throw new MigrationError(`--baseline is only allowed on a database with no migration history (${history.length} recorded)`);
    }

    const done = new Set([...history.map((h) => h.version), ...baselined]);
    const applied: string[] = [];
    for (const m of migrations.filter((x) => !done.has(x.version))) {
      await client.query("BEGIN");
      try {
        await client.query(m.body);
        await client.query(`INSERT INTO scs_migration.applied_migration (version, name, checksum, method) VALUES ($1, $2, $3, 'APPLIED')`, [m.version, m.name, m.checksum]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new MigrationError(`migration ${m.name} failed and was rolled back: ${(err as Error).message}`);
      }
      applied.push(m.version);
      log(`applied ${m.name} as ${user}`);
    }
    return { applied, baselined, alreadyApplied: history.map((h) => h.version) };
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_RUNNER_LOCK_KEY]).catch(() => undefined);
  }
}

/** The rules the old init script enforced for the scs_api password; returns the problem, or null. */
export function apiPasswordProblem(password: string | undefined, ownerPassword: string | undefined): string | null {
  if (password === undefined || password === "") return "SCS_API_DB_PASSWORD is not set";
  if (password.startsWith("change-me")) return "SCS_API_DB_PASSWORD is still the .env.example placeholder";
  if (password.length < 16) return "SCS_API_DB_PASSWORD must be at least 16 characters";
  if (password === ownerPassword) return "SCS_API_DB_PASSWORD must differ from the owner's password";
  return null;
}

/**
 * Set the scs_api login password (migration 004 creates the role without one;
 * passwords never live in migrations). The value is quoted by the server
 * (format %L), never interpolated into SQL text here, and never logged.
 */
export async function setApiPassword(client: pg.Client, password: string): Promise<void> {
  const { rows } = await client.query<{ sql: string }>(`SELECT format('ALTER ROLE scs_api PASSWORD %L', $1::text) AS sql`, [password]);
  await client.query(rows[0]!.sql);
}
